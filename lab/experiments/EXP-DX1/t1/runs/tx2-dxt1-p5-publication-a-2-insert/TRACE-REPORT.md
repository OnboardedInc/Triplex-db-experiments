# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (106.182 ms, trace `7bb3dcfb489c8bcc00000000000001bf`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (88.197 ms, trace `7bb3dcfb489c8bcc00000000000004a9`); `node-14/thread-0/driver.queue.subject` (66.174 ms, trace `7bb3dcfb489c8bcc000000000000076a`); `node-14/thread-0/driver.queue.subject` (83.613 ms, trace `7bb3dcfb489c8bcc00000000000004ab`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (84.940 ms, trace `7bb3dcfb489c8bcc00000000000004aa`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-publication-a-2-insert`; source `f9af2506c70dcb8d0320436b5dee5dadd9f024d9`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6879083.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 209 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13465.851 | 285.071 | 11.325 | 308 |
| L1 | 0 | 19963.697 | 416.179 | 8.634 | 462 |
| L4 | 0 | 19971.647 | 367.564 | 9.524 | 426 |
| L16 | 0 | 19981.722 | 504.977 | 6.265 | 474 |
| L64 | 0 | 19983.225 | 425.215 | 10.995 | 610 |
| L256 | 0 | 19974.194 | 356.301 | 13.145 | 472 |
| L1024 | 0 | 19972.757 | 3694.557 | 28.189 | 12035 |
| tail | 0 | 64547.855 | 11051.454 | 92.750 | 37434 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 7bb3dcfb489c8bcc00000000000001bf | driver.queue.scheduler-dispatch | 0.075 | none | 0 / 32 |
| 7bb3dcfb489c8bcc00000000000001bf | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 7bb3dcfb489c8bcc00000000000001bf waited: []

| 7bb3dcfb489c8bcc00000000000004a9 | driver.queue.scheduler-late | 13.258 | none | 3 / 32 |
| 7bb3dcfb489c8bcc00000000000004a9 | driver.queue.scheduler-dispatch | 0.060 | none | 3 / 32 |

Observed active steps while trace 7bb3dcfb489c8bcc00000000000004a9 waited: []

| 7bb3dcfb489c8bcc000000000000076a | driver.queue.subject | 66.174 | 7bb3dcfb489c8bcc0000000000000767 | 3 / 32 |
| 7bb3dcfb489c8bcc000000000000076a | driver.queue.scheduler-late | 1.433 | none | 3 / 32 |
| 7bb3dcfb489c8bcc000000000000076a | driver.queue.scheduler-dispatch | 0.309 | none | 7 / 32 |

Observed active steps while trace 7bb3dcfb489c8bcc000000000000076a waited: [{"at":1794632918262.7834,"inFlight":5,"capacity":32,"active":[{"traceId":"7bb3dcfb489c8bcc0000000000000766","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc0000000000000767","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc0000000000000768","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc000000000000076b","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc000000000000076c","step":"client.http"}]},{"at":1794632918290.1746,"inFlight":8,"capacity":32,"active":[{"traceId":"7bb3dcfb489c8bcc0000000000000767","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc0000000000000768","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc000000000000076b","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc000000000000076c","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc000000000000076d","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc000000000000076e","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc000000000000076f","step":"client.commit-send-queue"},{"traceId":"7bb3dcfb489c8bcc0000000000000771","step":"client.commit-send-queue"}]}]

| 7bb3dcfb489c8bcc00000000000004ab | driver.queue.subject | 83.613 | 7bb3dcfb489c8bcc00000000000004a7 | 5 / 32 |
| 7bb3dcfb489c8bcc00000000000004ab | driver.queue.scheduler-late | 1.377 | none | 5 / 32 |
| 7bb3dcfb489c8bcc00000000000004ab | driver.queue.scheduler-dispatch | 0.117 | none | 2 / 32 |

Observed active steps while trace 7bb3dcfb489c8bcc00000000000004ab waited: [{"at":1794632911927.4392,"inFlight":5,"capacity":32,"active":[{"traceId":"7bb3dcfb489c8bcc00000000000004a4","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004a6","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004a7","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004a9","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004aa","step":"client.http"}]},{"at":1794632911948.3728,"inFlight":5,"capacity":32,"active":[{"traceId":"7bb3dcfb489c8bcc00000000000004a4","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004a6","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004a7","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004a9","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004aa","step":"client.http"}]},{"at":1794632911969.0837,"inFlight":4,"capacity":32,"active":[{"traceId":"7bb3dcfb489c8bcc00000000000004a6","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004a7","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004a9","step":"client.http"},{"traceId":"7bb3dcfb489c8bcc00000000000004aa","step":"client.http"}]}]

| 7bb3dcfb489c8bcc00000000000004aa | driver.queue.scheduler-late | 3.047 | none | 4 / 32 |
| 7bb3dcfb489c8bcc00000000000004aa | driver.queue.scheduler-dispatch | 0.046 | none | 4 / 32 |

Observed active steps while trace 7bb3dcfb489c8bcc00000000000004aa waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.772 | 0.363 | 0.000 | 1.267 | 4.921 | 0.014 | 0.000 | 0.184 | 1.621 | 7.054 | 0.055 | n/a | 0.409 | 15.126 | n/a | n/a | 0.057 | 5.644 | 0.185 | 0.057 |
| p99 | 106.436 | 4.175 | 0.011 | 4.462 | 14.115 | 0.597 | 2.543 | 1.361 | 2.870 | 34.544 | 0.203 | n/a | 4.818 | 91.618 | n/a | n/a | 0.556 | 15.490 | 0.409 | 0.556 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc0000000000000120 | 106.436 | 4.644 | 0.514 | 0.000 | 0.082 | 1.576 | 7.299 | 0.060 | n/a | 0.588 | 91.618 | n/a | n/a | 0.054 | 5.240 | 0.049 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000000f6 | 93.165 | 12.878 | 0.597 | 0.000 | 0.250 | 2.575 | 34.544 | 0.203 | n/a | 0.489 | 41.545 | n/a | n/a | 0.084 | 13.725 | 0.147 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000000f2 | 67.826 | 14.115 | 0.014 | 0.000 | 1.361 | 1.912 | 10.537 | 0.118 | n/a | 0.120 | 39.093 | n/a | n/a | 0.556 | 15.490 | 0.228 | 0.556 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000011a | 49.301 | 9.079 | 0.006 | 2.543 | 0.177 | 0.932 | 5.163 | 0.041 | n/a | 0.708 | 30.578 | n/a | n/a | 0.075 | 11.805 | 0.239 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000000fa | 46.696 | 6.392 | 0.400 | 0.000 | 0.046 | 2.715 | 21.940 | 0.057 | n/a | 0.797 | 14.250 | n/a | n/a | 0.100 | 6.838 | 0.146 | 0.100 | gw-w/thread-41/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc0000000000000100 | 46.478 | 5.723 | 0.340 | 0.000 | 0.071 | 2.865 | 13.389 | 0.067 | n/a | 0.104 | 23.857 | n/a | n/a | 0.061 | 6.135 | 0.132 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.170ms |
| 7bb3dcfb489c8bcc0000000000000106 | 44.022 | 7.599 | 0.307 | 0.000 | 0.100 | 1.595 | 7.519 | 0.047 | n/a | 0.573 | 26.230 | n/a | n/a | 0.053 | 8.005 | 0.182 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000000fe | 41.565 | 4.363 | 0.309 | 0.000 | 0.080 | 2.468 | 15.558 | 0.097 | n/a | 1.757 | 16.884 | n/a | n/a | 0.049 | 4.752 | 0.114 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000108 | 41.249 | 5.901 | 0.478 | 0.000 | 0.184 | 2.291 | 15.388 | 0.086 | n/a | 0.177 | 16.683 | n/a | n/a | 0.061 | 6.563 | 0.159 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000010e | 39.004 | 5.174 | 0.299 | 0.000 | 0.170 | 1.710 | 16.156 | 0.115 | n/a | 0.186 | 15.126 | n/a | n/a | 0.068 | 5.644 | 0.145 | 0.068 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000124 | 36.138 | 6.056 | 0.229 | 0.000 | 0.087 | 2.269 | 8.505 | 0.113 | n/a | 0.666 | 18.165 | n/a | n/a | 0.048 | 6.373 | 0.176 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000112 | 31.677 | 5.332 | 0.374 | 0.514 | 0.061 | 2.298 | 10.076 | 0.088 | n/a | 0.620 | 12.256 | n/a | n/a | 0.058 | 6.280 | 0.198 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000110 | 31.674 | 7.872 | 0.281 | 0.000 | 0.084 | 2.135 | 8.339 | 0.051 | n/a | 4.818 | 8.057 | n/a | n/a | 0.037 | 8.237 | 0.260 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000011c | 30.907 | 4.139 | 0.217 | 0.342 | 0.066 | 1.815 | 7.963 | 0.095 | n/a | 0.395 | 15.823 | n/a | n/a | 0.051 | 4.765 | 0.154 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000000fc | 30.772 | 4.089 | 0.005 | 0.000 | 0.554 | 0.895 | 1.417 | 0.042 | n/a | 0.147 | 23.566 | n/a | n/a | 0.057 | 4.648 | 0.151 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000000f8 | 28.845 | 4.921 | 0.006 | 0.000 | 0.970 | 1.299 | 5.227 | 0.055 | n/a | 0.197 | 16.008 | n/a | n/a | 0.163 | 5.896 | 0.204 | 0.163 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000109 | 28.328 | 7.386 | 0.008 | 1.901 | 0.316 | 1.320 | 6.413 | 0.084 | n/a | 0.524 | 10.315 | n/a | n/a | 0.063 | 9.610 | 0.339 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000012a | 27.538 | 4.190 | 0.320 | 0.000 | 0.042 | 1.621 | 8.278 | 0.043 | n/a | 0.084 | 12.926 | n/a | n/a | 0.033 | 4.552 | 0.165 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000010b | 26.905 | 4.733 | 0.005 | 0.000 | 0.535 | 1.780 | 1.271 | 0.038 | n/a | 0.483 | 18.010 | n/a | n/a | 0.050 | 5.273 | 0.196 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000118 | 24.817 | 5.304 | 0.281 | 0.000 | 0.093 | 2.128 | 7.054 | 0.050 | n/a | 0.391 | 9.470 | n/a | n/a | 0.046 | 5.678 | 0.229 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.959 | 0.493 | 0.000 | 1.620 | 3.724 | 0.005 | 0.000 | 0.970 | 1.275 | 1.438 | 0.046 | n/a | 0.197 | 11.319 | n/a | n/a | 0.057 | 4.710 | 0.205 | 0.057 |
| p99 | 30.772 | 1.234 | 0.003 | 2.380 | 4.921 | 0.006 | 0.000 | 1.163 | 2.870 | 5.227 | 0.140 | n/a | 3.896 | 23.566 | n/a | n/a | 0.163 | 5.896 | 0.409 | 0.163 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc00000000000000fc | 30.772 | 4.089 | 0.005 | 0.000 | 0.554 | 0.895 | 1.417 | 0.042 | n/a | 0.147 | 23.566 | n/a | n/a | 0.057 | 4.648 | 0.151 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000000f8 | 28.845 | 4.921 | 0.006 | 0.000 | 0.970 | 1.299 | 5.227 | 0.055 | n/a | 0.197 | 16.008 | n/a | n/a | 0.163 | 5.896 | 0.204 | 0.163 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000121 | 23.676 | 3.724 | 0.005 | 0.000 | 0.639 | 1.275 | 2.632 | 0.140 | n/a | 3.896 | 11.319 | n/a | n/a | 0.047 | 4.368 | 0.185 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000101 | 23.635 | 3.540 | 0.005 | 0.000 | 0.193 | 2.870 | 1.212 | 0.035 | n/a | 0.073 | 15.627 | n/a | n/a | 0.079 | 3.738 | 0.158 | 0.079 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000115 | 22.959 | 3.567 | 0.005 | 0.000 | 1.138 | 0.939 | 5.204 | 0.055 | n/a | 0.126 | 11.868 | n/a | n/a | 0.057 | 4.710 | 0.205 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000113 | 22.040 | 3.995 | 0.005 | 0.000 | 0.798 | 1.299 | 2.633 | 0.094 | n/a | 3.313 | 9.865 | n/a | n/a | 0.038 | 4.798 | 0.218 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000128 | 16.937 | 3.127 | 0.005 | 0.000 | 1.002 | 0.861 | 1.175 | 0.043 | n/a | 0.326 | 10.362 | n/a | n/a | 0.036 | 4.135 | 0.244 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000011d | 15.707 | 3.604 | 0.006 | 0.000 | 1.124 | 0.940 | 1.438 | 0.046 | n/a | 0.109 | 8.394 | n/a | n/a | 0.046 | 4.734 | 0.301 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000125 | 12.737 | 4.042 | 0.005 | 0.000 | 1.163 | 1.467 | 1.233 | 0.042 | n/a | 0.409 | 4.312 | n/a | n/a | 0.064 | 5.210 | 0.409 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.153 | 0.327 | 0.000 | 0.373 | 6.081 | 0.198 | 0.000 | 0.058 | 4.930 | 12.016 | 0.089 | n/a | 0.138 | 15.599 | n/a | n/a | 0.043 | 6.337 | 0.162 | 0.043 |
| p99 | 39.153 | 0.327 | 0.000 | 0.373 | 6.081 | 0.198 | 0.000 | 0.058 | 4.930 | 12.016 | 0.089 | n/a | 0.138 | 15.599 | n/a | n/a | 0.043 | 6.337 | 0.162 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc000000000000012c | 39.153 | 6.081 | 0.198 | 0.000 | 0.058 | 4.930 | 12.016 | 0.089 | n/a | 0.138 | 15.599 | n/a | n/a | 0.043 | 6.337 | 0.162 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.081 | 0.455 | 0.000 | 0.781 | 4.891 | 0.010 | 0.000 | 0.181 | 1.533 | 5.301 | 0.068 | n/a | 0.221 | 13.299 | n/a | n/a | 0.048 | 5.826 | 0.216 | 0.048 |
| p99 | 103.757 | 4.494 | 0.006 | 5.491 | 13.036 | 1.683 | 4.737 | 11.871 | 5.417 | 23.493 | 0.260 | n/a | 3.781 | 84.618 | n/a | n/a | 0.112 | 16.117 | 0.549 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc0000000000000140 | 103.757 | 4.226 | 0.239 | 0.000 | 0.084 | 1.963 | 12.387 | 0.066 | n/a | 0.127 | 84.618 | n/a | n/a | 0.045 | 4.550 | 0.044 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000158 | 57.490 | 7.908 | 0.203 | 0.000 | 0.083 | 4.088 | 23.253 | 0.102 | n/a | 1.443 | 20.364 | n/a | n/a | 0.045 | 8.195 | 0.143 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000150 | 52.749 | 10.576 | 0.006 | 4.737 | 0.799 | 0.866 | 2.014 | 0.044 | n/a | 0.659 | 32.976 | n/a | n/a | 0.072 | 16.117 | 0.306 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000014c | 47.838 | 5.602 | 0.196 | 0.000 | 0.078 | 1.966 | 20.409 | 0.260 | n/a | 1.881 | 17.390 | n/a | n/a | 0.057 | 5.875 | 0.123 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000174 | 45.959 | 4.738 | 0.311 | 0.000 | 0.076 | 5.417 | 23.493 | 0.068 | n/a | 0.160 | 11.648 | n/a | n/a | 0.047 | 5.125 | 0.112 | 0.047 | gw-w/thread-41/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc0000000000000137 | 42.581 | 4.891 | 0.284 | 0.370 | 0.083 | 1.926 | 13.109 | 0.124 | n/a | 0.723 | 21.034 | n/a | n/a | 0.037 | 5.627 | 0.132 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000016e | 40.682 | 6.829 | 0.221 | 0.000 | 0.089 | 3.266 | 12.581 | 0.112 | n/a | 0.694 | 16.845 | n/a | n/a | 0.045 | 7.140 | 0.176 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000130 | 38.676 | 4.319 | 0.345 | 0.000 | 0.070 | 4.759 | 17.509 | 0.048 | n/a | 0.348 | 11.209 | n/a | n/a | 0.068 | 4.735 | 0.122 | 0.068 | gw-w/thread-43/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc000000000000016c | 37.523 | 3.907 | 0.287 | 0.000 | 0.110 | 1.475 | 14.820 | 0.052 | n/a | 0.114 | 16.703 | n/a | n/a | 0.056 | 4.304 | 0.115 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000142 | 36.475 | 3.894 | 0.334 | 0.412 | 0.139 | 1.839 | 10.354 | 0.104 | n/a | 3.781 | 15.550 | n/a | n/a | 0.066 | 4.779 | 0.131 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000175 | 36.347 | 8.578 | 0.006 | 0.000 | 0.594 | 1.327 | 3.234 | 0.092 | n/a | 0.200 | 22.263 | n/a | n/a | 0.054 | 9.177 | 0.252 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000172 | 35.377 | 7.315 | 0.242 | 0.000 | 0.073 | 2.056 | 7.179 | 0.076 | n/a | 0.187 | 18.203 | n/a | n/a | 0.047 | 7.630 | 0.216 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000146 | 34.490 | 4.981 | 0.005 | 0.000 | 0.514 | 0.896 | 5.296 | 0.041 | n/a | 1.400 | 21.315 | n/a | n/a | 0.042 | 5.500 | 0.159 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000012e | 34.165 | 8.248 | 0.323 | 0.673 | 0.084 | 1.861 | 7.773 | 0.106 | n/a | 0.814 | 14.242 | n/a | n/a | 0.040 | 9.328 | 0.273 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000165 | 33.424 | 7.122 | 0.005 | 0.000 | 0.181 | 0.969 | 1.801 | 0.047 | n/a | 0.147 | 23.092 | n/a | n/a | 0.061 | 7.308 | 0.219 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000148 | 31.946 | 4.780 | 0.315 | 0.371 | 0.063 | 1.848 | 7.207 | 0.066 | n/a | 0.490 | 16.759 | n/a | n/a | 0.047 | 5.530 | 0.173 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000013d | 31.928 | 7.391 | 0.006 | 0.000 | 0.965 | 1.865 | 3.389 | 0.140 | n/a | 0.287 | 17.773 | n/a | n/a | 0.112 | 8.362 | 0.262 | 0.112 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000013a | 31.700 | 3.622 | 0.221 | 0.000 | 0.081 | 1.533 | 9.267 | 0.090 | n/a | 0.221 | 16.618 | n/a | n/a | 0.046 | 3.924 | 0.124 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000017c | 31.657 | 6.936 | 0.316 | 0.000 | 0.098 | 2.391 | 9.939 | 0.080 | n/a | 0.141 | 11.703 | n/a | n/a | 0.052 | 7.351 | 0.232 | 0.052 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000017e | 31.385 | 4.993 | 0.239 | 0.439 | 0.093 | 1.706 | 13.619 | 0.056 | n/a | 0.116 | 10.076 | n/a | n/a | 0.048 | 5.764 | 0.184 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.760 | 0.882 | 0.000 | 1.792 | 4.436 | 0.005 | 0.000 | 0.953 | 1.010 | 1.636 | 0.040 | n/a | 0.140 | 10.088 | n/a | n/a | 0.044 | 5.585 | 0.261 | 0.044 |
| p99 | 28.778 | 1.644 | 0.006 | 2.411 | 7.093 | 0.010 | 0.000 | 11.871 | 5.083 | 5.454 | 0.121 | n/a | 0.615 | 19.592 | n/a | n/a | 0.077 | 15.508 | 0.549 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc0000000000000135 | 28.778 | 4.436 | 0.004 | 0.000 | 1.145 | 1.010 | 1.864 | 0.073 | n/a | 0.615 | 19.592 | n/a | n/a | 0.038 | 5.585 | 0.194 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000179 | 28.242 | 3.632 | 0.005 | 0.000 | 11.871 | 0.746 | 1.636 | 0.040 | n/a | 0.147 | 10.088 | n/a | n/a | 0.077 | 15.508 | 0.549 | 0.077 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.307ms; driver.publication 2.015ms |
| 7bb3dcfb489c8bcc0000000000000170 | 25.911 | 4.529 | 0.005 | 0.000 | 0.947 | 5.083 | 1.685 | 0.101 | n/a | 0.210 | 13.299 | n/a | n/a | 0.052 | 5.481 | 0.212 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000149 | 24.898 | 5.729 | 0.009 | 0.000 | 0.371 | 1.035 | 5.454 | 0.051 | n/a | 0.095 | 12.112 | n/a | n/a | 0.042 | 6.109 | 0.245 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000138 | 23.760 | 7.093 | 0.009 | 0.000 | 0.953 | 2.455 | 5.161 | 0.121 | n/a | 0.466 | 7.446 | n/a | n/a | 0.056 | 8.055 | 0.339 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000015e | 22.859 | 4.949 | 0.010 | 0.000 | 1.011 | 2.248 | 1.139 | 0.038 | n/a | 0.140 | 13.261 | n/a | n/a | 0.061 | 5.971 | 0.261 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000162 | 12.003 | 3.887 | 0.009 | 0.000 | 1.015 | 0.806 | 1.049 | 0.038 | n/a | 0.120 | 5.050 | n/a | n/a | 0.031 | 4.911 | 0.409 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000153 | 10.480 | 3.598 | 0.005 | 0.000 | 0.258 | 0.731 | 1.193 | 0.038 | n/a | 0.115 | 4.498 | n/a | n/a | 0.044 | 3.860 | 0.368 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.253 | 0.756 | 0.000 | 0.668 | 4.809 | 0.178 | 0.000 | 0.204 | 1.382 | 4.734 | 0.053 | n/a | 0.379 | 11.486 | n/a | n/a | 0.056 | 5.398 | 0.201 | 0.056 |
| p99 | 120.930 | 4.271 | 0.015 | 4.773 | 9.392 | 1.678 | 0.488 | 1.185 | 4.698 | 36.452 | 44.616 | n/a | 3.190 | 106.182 | n/a | n/a | 0.146 | 9.929 | 0.432 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc00000000000001bf | 120.930 | 4.336 | 1.678 | 0.224 | 0.078 | 1.571 | 6.401 | 0.043 | n/a | 0.376 | 106.182 | n/a | n/a | 0.041 | 6.316 | 0.052 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.817ms |
| 7bb3dcfb489c8bcc00000000000001c0 | 104.680 | 4.160 | 0.009 | 0.000 | 0.694 | 0.778 | 0.792 | 0.040 | n/a | 0.344 | 97.813 | n/a | n/a | 0.050 | 4.863 | 0.046 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000018c | 62.887 | 3.659 | 0.006 | 0.000 | 1.058 | 1.308 | 1.840 | 44.616 | n/a | 0.254 | 10.105 | n/a | n/a | 0.040 | 4.724 | 0.075 | 0.040 | gw-w/thread-48/gateway.commit-order-wait | none observed |
| 7bb3dcfb489c8bcc0000000000000193 | 55.639 | 3.518 | 0.259 | 0.270 | 0.156 | 2.858 | 36.452 | 0.607 | n/a | 0.421 | 11.015 | n/a | n/a | 0.083 | 4.202 | 0.076 | 0.083 | gw-w/thread-43/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc0000000000000189 | 40.774 | 3.717 | 0.295 | 0.278 | 0.075 | 1.364 | 15.138 | 0.067 | n/a | 0.117 | 19.683 | n/a | n/a | 0.040 | 4.365 | 0.107 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001c3 | 39.425 | 7.585 | 0.178 | 0.272 | 0.092 | 1.513 | 8.749 | 0.052 | n/a | 0.406 | 20.526 | n/a | n/a | 0.052 | 8.126 | 0.206 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001b7 | 39.177 | 5.565 | 0.276 | 0.472 | 0.073 | 4.529 | 9.079 | 0.053 | n/a | 0.359 | 18.711 | n/a | n/a | 0.061 | 6.385 | 0.163 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000182 | 37.215 | 6.247 | 0.335 | 0.483 | 0.087 | 1.770 | 10.160 | 0.050 | n/a | 0.093 | 17.938 | n/a | n/a | 0.051 | 7.153 | 0.192 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001bb | 37.036 | 6.666 | 0.314 | 0.304 | 0.091 | 1.766 | 13.310 | 0.069 | n/a | 0.160 | 14.312 | n/a | n/a | 0.044 | 7.375 | 0.199 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000191 | 37.031 | 5.415 | 0.294 | 0.316 | 0.104 | 1.760 | 16.648 | 0.105 | n/a | 0.580 | 11.749 | n/a | n/a | 0.062 | 6.128 | 0.165 | 0.062 | gw-w/thread-47/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc0000000000000186 | 34.122 | 4.989 | 0.191 | 0.466 | 0.046 | 1.577 | 9.295 | 0.047 | n/a | 0.080 | 17.376 | n/a | n/a | 0.055 | 5.692 | 0.167 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000199 | 33.470 | 5.321 | 0.341 | 0.342 | 0.078 | 1.561 | 10.159 | 0.044 | n/a | 1.719 | 13.861 | n/a | n/a | 0.044 | 6.082 | 0.182 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001b8 | 32.966 | 9.392 | 0.007 | 0.000 | 0.530 | 1.763 | 2.795 | 0.048 | n/a | 0.163 | 18.207 | n/a | n/a | 0.060 | 9.929 | 0.301 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001a7 | 32.736 | 5.819 | 0.270 | 0.488 | 0.124 | 1.561 | 7.856 | 0.045 | n/a | 0.108 | 16.378 | n/a | n/a | 0.086 | 6.700 | 0.205 | 0.086 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000018a | 31.313 | 4.317 | 0.005 | 0.000 | 0.785 | 0.636 | 9.394 | 0.043 | n/a | 0.417 | 15.663 | n/a | n/a | 0.054 | 5.107 | 0.163 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001a5 | 30.592 | 5.302 | 0.305 | 0.434 | 0.124 | 2.019 | 10.500 | 0.062 | n/a | 0.123 | 11.662 | n/a | n/a | 0.062 | 6.164 | 0.201 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001b5 | 29.949 | 3.533 | 0.336 | 0.227 | 0.081 | 1.606 | 14.790 | 0.067 | n/a | 0.436 | 8.815 | n/a | n/a | 0.058 | 4.176 | 0.139 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001bc | 29.302 | 4.364 | 0.006 | 0.000 | 0.812 | 4.698 | 1.318 | 0.041 | n/a | 0.092 | 17.925 | n/a | n/a | 0.047 | 5.181 | 0.177 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001ab | 28.354 | 4.060 | 0.281 | 0.256 | 0.054 | 1.767 | 12.404 | 0.104 | n/a | 0.725 | 8.623 | n/a | n/a | 0.079 | 4.651 | 0.164 | 0.079 | gw-w/thread-45/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc000000000000019f | 28.253 | 4.548 | 0.253 | 0.330 | 0.204 | 1.714 | 10.050 | 0.046 | n/a | 0.307 | 10.716 | n/a | n/a | 0.086 | 5.335 | 0.189 | 0.086 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.916 | 0.829 | 0.000 | 1.958 | 4.809 | 0.009 | 0.000 | 0.717 | 0.864 | 1.734 | 0.059 | n/a | 0.379 | 8.697 | n/a | n/a | 0.050 | 5.398 | 0.266 | 0.050 |
| p99 | 104.680 | 2.265 | 0.015 | 4.773 | 7.591 | 0.012 | 0.000 | 0.975 | 1.284 | 4.689 | 3.634 | n/a | 3.190 | 97.813 | n/a | n/a | 0.080 | 8.328 | 0.430 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc00000000000001c0 | 104.680 | 4.160 | 0.009 | 0.000 | 0.694 | 0.778 | 0.792 | 0.040 | n/a | 0.344 | 97.813 | n/a | n/a | 0.050 | 4.863 | 0.046 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000018e | 23.594 | 5.318 | 0.005 | 0.000 | 0.717 | 0.824 | 1.734 | 0.054 | n/a | 3.190 | 11.715 | n/a | n/a | 0.037 | 6.041 | 0.256 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001c8 | 22.702 | 7.591 | 0.010 | 0.000 | 0.727 | 0.864 | 1.121 | 0.059 | n/a | 0.123 | 12.138 | n/a | n/a | 0.070 | 8.328 | 0.367 | 0.070 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000017f | 21.035 | 5.281 | 0.005 | 0.000 | 0.564 | 1.173 | 2.547 | 0.111 | n/a | 0.741 | 10.544 | n/a | n/a | 0.068 | 5.851 | 0.278 | 0.068 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001ca | 18.232 | 3.688 | 0.009 | 0.000 | 0.889 | 1.284 | 4.689 | 0.083 | n/a | 0.116 | 7.406 | n/a | n/a | 0.067 | 4.587 | 0.252 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001a8 | 17.916 | 4.809 | 0.012 | 0.000 | 0.916 | 1.069 | 1.802 | 3.634 | n/a | 0.096 | 5.498 | n/a | n/a | 0.080 | 5.736 | 0.320 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000197 | 17.514 | 3.285 | 0.004 | 0.000 | 0.828 | 0.403 | 1.606 | 0.042 | n/a | 0.446 | 10.869 | n/a | n/a | 0.030 | 4.117 | 0.235 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001b2 | 15.859 | 4.878 | 0.012 | 0.000 | 0.508 | 1.089 | 1.781 | 0.067 | n/a | 0.728 | 6.756 | n/a | n/a | 0.040 | 5.398 | 0.340 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000194 | 15.348 | 5.614 | 0.011 | 0.000 | 0.975 | 0.990 | 1.921 | 0.078 | n/a | 0.839 | 4.850 | n/a | n/a | 0.071 | 6.599 | 0.430 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000184 | 15.276 | 3.820 | 0.006 | 0.000 | 0.241 | 0.576 | 1.473 | 0.040 | n/a | 0.379 | 8.697 | n/a | n/a | 0.045 | 4.067 | 0.266 | 0.045 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.938 | 0.493 | 0.000 | 1.187 | 4.431 | 0.014 | 0.000 | 0.164 | 1.301 | 4.399 | 0.048 | n/a | 0.405 | 10.422 | n/a | n/a | 0.055 | 5.101 | 0.232 | 0.055 |
| p99 | 51.624 | 2.252 | 0.013 | 4.481 | 15.656 | 2.456 | 3.847 | 1.363 | 5.098 | 17.304 | 0.775 | n/a | 3.844 | 27.545 | n/a | n/a | 0.110 | 16.219 | 0.416 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc000000000000021c | 51.624 | 9.856 | 2.456 | 3.847 | 0.061 | 2.322 | 13.051 | 0.073 | n/a | 0.443 | 19.471 | n/a | n/a | 0.044 | 16.219 | 0.314 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001f1 | 51.099 | 15.656 | 0.012 | 0.000 | 0.241 | 5.096 | 17.304 | 0.277 | n/a | 1.362 | 11.106 | n/a | n/a | 0.046 | 15.909 | 0.311 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001d5 | 44.915 | 13.313 | 0.012 | 0.000 | 1.139 | 0.781 | 2.114 | 0.043 | n/a | 1.389 | 26.057 | n/a | n/a | 0.068 | 14.464 | 0.322 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.278ms |
| 7bb3dcfb489c8bcc0000000000000212 | 44.017 | 4.896 | 0.331 | 0.267 | 0.081 | 5.098 | 6.759 | 0.084 | n/a | 0.478 | 25.978 | n/a | n/a | 0.045 | 5.575 | 0.127 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001eb | 37.298 | 6.301 | 0.006 | 0.000 | 0.619 | 0.979 | 1.592 | 0.038 | n/a | 0.132 | 27.545 | n/a | n/a | 0.087 | 6.925 | 0.186 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000208 | 33.703 | 3.823 | 0.219 | 0.226 | 0.091 | 1.235 | 6.924 | 0.046 | n/a | 0.391 | 20.701 | n/a | n/a | 0.048 | 4.358 | 0.129 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000218 | 33.168 | 5.244 | 0.266 | 0.563 | 0.079 | 1.786 | 13.919 | 0.050 | n/a | 0.409 | 10.797 | n/a | n/a | 0.055 | 6.152 | 0.185 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001d9 | 32.901 | 3.900 | 0.463 | 0.409 | 0.180 | 1.449 | 9.625 | 0.050 | n/a | 0.369 | 16.382 | n/a | n/a | 0.074 | 4.952 | 0.151 | 0.074 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000020c | 32.798 | 5.653 | 0.264 | 0.460 | 0.159 | 2.123 | 13.737 | 0.064 | n/a | 0.127 | 10.147 | n/a | n/a | 0.065 | 6.535 | 0.199 | 0.065 | gw-w/thread-41/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc00000000000001dc | 32.699 | 5.458 | 0.303 | 0.399 | 0.159 | 1.787 | 5.890 | 0.049 | n/a | 0.430 | 18.144 | n/a | n/a | 0.080 | 6.319 | 0.193 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001fa | 30.013 | 3.727 | 0.238 | 0.250 | 0.168 | 1.490 | 9.299 | 0.151 | n/a | 0.709 | 13.907 | n/a | n/a | 0.074 | 4.382 | 0.146 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001e1 | 28.704 | 8.242 | 0.007 | 0.000 | 0.734 | 1.018 | 4.415 | 0.041 | n/a | 0.556 | 13.620 | n/a | n/a | 0.073 | 8.982 | 0.313 | 0.073 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001f0 | 28.240 | 6.109 | 0.212 | 0.576 | 0.084 | 1.868 | 10.633 | 0.064 | n/a | 0.407 | 8.238 | n/a | n/a | 0.048 | 6.982 | 0.247 | 0.048 | gw-w/thread-48/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc00000000000001dd | 28.095 | 3.149 | 0.005 | 0.000 | 0.150 | 0.898 | 9.777 | 0.081 | n/a | 3.844 | 10.151 | n/a | n/a | 0.041 | 3.304 | 0.118 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000204 | 27.909 | 3.407 | 0.178 | 0.261 | 0.059 | 1.301 | 11.895 | 0.052 | n/a | 0.099 | 10.615 | n/a | n/a | 0.042 | 3.905 | 0.140 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001fc | 26.134 | 3.839 | 0.293 | 0.248 | 0.083 | 1.372 | 7.046 | 0.043 | n/a | 0.112 | 13.050 | n/a | n/a | 0.047 | 4.464 | 0.171 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001e0 | 25.043 | 4.730 | 0.247 | 0.426 | 0.098 | 1.564 | 8.454 | 0.043 | n/a | 0.580 | 8.847 | n/a | n/a | 0.054 | 5.501 | 0.220 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000210 | 24.191 | 4.431 | 0.197 | 0.427 | 0.082 | 1.346 | 10.122 | 0.043 | n/a | 0.331 | 7.170 | n/a | n/a | 0.041 | 5.137 | 0.212 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001d4 | 23.652 | 4.844 | 0.007 | 0.000 | 0.628 | 1.602 | 1.123 | 0.038 | n/a | 1.516 | 13.821 | n/a | n/a | 0.073 | 5.479 | 0.232 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001f4 | 23.263 | 5.227 | 0.320 | 0.426 | 0.078 | 1.385 | 10.151 | 0.048 | n/a | 0.104 | 5.435 | n/a | n/a | 0.088 | 6.052 | 0.260 | 0.088 | gw-w/thread-47/gateway.admitted-work | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.159 | 0.696 | 0.000 | 1.731 | 3.858 | 0.007 | 0.000 | 0.620 | 0.948 | 1.277 | 0.045 | n/a | 0.351 | 10.151 | n/a | n/a | 0.052 | 4.242 | 0.232 | 0.052 |
| p99 | 37.298 | 2.053 | 0.005 | 3.907 | 6.301 | 0.014 | 0.000 | 1.363 | 1.602 | 9.777 | 0.157 | n/a | 3.844 | 27.545 | n/a | n/a | 0.087 | 6.925 | 0.416 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc00000000000001eb | 37.298 | 6.301 | 0.006 | 0.000 | 0.619 | 0.979 | 1.592 | 0.038 | n/a | 0.132 | 27.545 | n/a | n/a | 0.087 | 6.925 | 0.186 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001dd | 28.095 | 3.149 | 0.005 | 0.000 | 0.150 | 0.898 | 9.777 | 0.081 | n/a | 3.844 | 10.151 | n/a | n/a | 0.041 | 3.304 | 0.118 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001d4 | 23.652 | 4.844 | 0.007 | 0.000 | 0.628 | 1.602 | 1.123 | 0.038 | n/a | 1.516 | 13.821 | n/a | n/a | 0.073 | 5.479 | 0.232 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001e4 | 22.848 | 4.475 | 0.007 | 0.000 | 0.620 | 1.200 | 4.399 | 0.157 | n/a | 0.997 | 10.944 | n/a | n/a | 0.048 | 5.101 | 0.223 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000201 | 19.104 | 4.180 | 0.006 | 0.000 | 1.363 | 0.813 | 1.099 | 0.035 | n/a | 0.081 | 11.494 | n/a | n/a | 0.033 | 5.549 | 0.290 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001f7 | 18.851 | 3.164 | 0.007 | 0.000 | 0.798 | 0.682 | 1.277 | 0.037 | n/a | 0.108 | 12.719 | n/a | n/a | 0.059 | 3.969 | 0.211 | 0.059 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000213 | 18.571 | 3.404 | 0.007 | 0.000 | 0.783 | 0.924 | 2.454 | 0.048 | n/a | 0.475 | 10.422 | n/a | n/a | 0.055 | 4.194 | 0.226 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000020d | 17.159 | 2.842 | 0.009 | 0.000 | 1.112 | 1.545 | 1.407 | 0.064 | n/a | 0.187 | 9.950 | n/a | n/a | 0.042 | 3.964 | 0.231 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000209 | 17.118 | 3.611 | 0.007 | 0.000 | 0.844 | 0.997 | 2.307 | 0.091 | n/a | 0.180 | 9.028 | n/a | n/a | 0.052 | 4.462 | 0.261 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000205 | 16.764 | 4.030 | 0.005 | 0.000 | 0.207 | 0.664 | 1.595 | 0.037 | n/a | 0.089 | 10.095 | n/a | n/a | 0.042 | 4.242 | 0.253 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001d0 | 16.707 | 3.858 | 0.005 | 0.000 | 0.312 | 0.948 | 1.090 | 0.052 | n/a | 0.110 | 10.284 | n/a | n/a | 0.047 | 4.176 | 0.250 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001e7 | 15.439 | 3.287 | 0.006 | 0.000 | 0.151 | 0.726 | 1.071 | 0.038 | n/a | 0.405 | 9.708 | n/a | n/a | 0.048 | 3.444 | 0.223 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001e9 | 14.936 | 4.871 | 0.014 | 0.000 | 0.882 | 1.053 | 1.208 | 0.045 | n/a | 0.461 | 6.333 | n/a | n/a | 0.069 | 5.767 | 0.386 | 0.069 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000021d | 12.060 | 4.490 | 0.010 | 0.000 | 0.518 | 1.086 | 1.082 | 0.036 | n/a | 0.566 | 4.186 | n/a | n/a | 0.085 | 5.018 | 0.416 | 0.085 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000001ce | 10.441 | 3.182 | 0.006 | 0.000 | 0.207 | 0.677 | 0.945 | 0.047 | n/a | 0.351 | 4.974 | n/a | n/a | 0.053 | 3.394 | 0.325 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.025 | 0.463 | 0.000 | 1.613 | 4.628 | 0.010 | 0.000 | 0.239 | 1.255 | 4.128 | 0.046 | n/a | 0.432 | 9.491 | n/a | n/a | 0.055 | 5.088 | 0.247 | 0.055 |
| p99 | 81.235 | 2.328 | 0.010 | 5.624 | 8.919 | 0.595 | 0.270 | 1.113 | 6.684 | 50.939 | 0.209 | n/a | 31.961 | 62.059 | n/a | n/a | 0.146 | 9.303 | 0.486 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc0000000000000236 | 81.235 | 5.435 | 0.231 | 0.000 | 0.095 | 2.585 | 50.287 | 0.065 | n/a | 0.485 | 21.987 | n/a | n/a | 0.064 | 5.761 | 0.071 | 0.064 | gw-w/thread-46/gateway.admitted-work | driver.publication 1.727ms |
| 7bb3dcfb489c8bcc0000000000000223 | 75.670 | 3.285 | 0.190 | 0.000 | 0.081 | 1.364 | 8.500 | 0.072 | n/a | 0.078 | 62.059 | n/a | n/a | 0.041 | 3.556 | 0.047 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000234 | 73.971 | 5.616 | 0.316 | 0.000 | 0.091 | 1.993 | 50.939 | 0.056 | n/a | 0.472 | 14.401 | n/a | n/a | 0.087 | 6.022 | 0.081 | 0.087 | gw-w/thread-43/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc0000000000000279 | 55.585 | 8.066 | 0.595 | 0.000 | 0.081 | 2.554 | 18.780 | 0.046 | n/a | 0.393 | 25.007 | n/a | n/a | 0.063 | 8.743 | 0.157 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000237 | 53.453 | 4.661 | 0.005 | 0.000 | 0.422 | 0.705 | 1.170 | 0.052 | n/a | 31.961 | 14.416 | n/a | n/a | 0.062 | 5.088 | 0.095 | 0.062 | gw-w/thread-45/d/transact-async | none observed |
| 7bb3dcfb489c8bcc000000000000024a | 44.963 | 5.181 | 0.008 | 0.000 | 0.443 | 3.796 | 1.072 | 0.024 | n/a | 0.047 | 34.348 | n/a | n/a | 0.045 | 5.632 | 0.125 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.767ms |
| 7bb3dcfb489c8bcc0000000000000273 | 36.662 | 3.563 | 0.302 | 0.000 | 0.073 | 1.630 | 8.641 | 0.038 | n/a | 0.263 | 22.097 | n/a | n/a | 0.055 | 3.938 | 0.107 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000248 | 35.977 | 4.370 | 0.297 | 0.000 | 0.083 | 6.684 | 8.413 | 0.075 | n/a | 1.654 | 14.335 | n/a | n/a | 0.067 | 4.750 | 0.132 | 0.067 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000249 | 34.485 | 7.157 | 0.018 | 0.000 | 1.089 | 1.085 | 1.670 | 0.039 | n/a | 6.108 | 17.250 | n/a | n/a | 0.068 | 8.264 | 0.240 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000022d | 34.348 | 5.302 | 0.274 | 0.000 | 0.101 | 1.756 | 8.477 | 0.050 | n/a | 0.357 | 17.975 | n/a | n/a | 0.057 | 5.677 | 0.165 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000025a | 33.769 | 8.919 | 0.323 | 0.000 | 0.060 | 3.532 | 12.982 | 0.096 | n/a | 0.155 | 7.656 | n/a | n/a | 0.044 | 9.303 | 0.275 | 0.044 | gw-w/thread-44/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc0000000000000240 | 31.580 | 4.628 | 0.242 | 0.000 | 0.074 | 1.628 | 9.152 | 0.063 | n/a | 0.671 | 15.070 | n/a | n/a | 0.052 | 4.944 | 0.157 | 0.052 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000026d | 31.056 | 3.578 | 0.239 | 0.000 | 0.062 | 4.435 | 13.906 | 0.045 | n/a | 0.115 | 8.630 | n/a | n/a | 0.046 | 3.879 | 0.125 | 0.046 | gw-w/thread-45/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc0000000000000244 | 30.558 | 3.995 | 0.353 | 0.000 | 0.144 | 1.859 | 13.511 | 0.071 | n/a | 0.985 | 9.494 | n/a | n/a | 0.146 | 4.492 | 0.147 | 0.146 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000260 | 29.709 | 3.605 | 0.167 | 0.000 | 0.015 | 1.658 | 8.384 | 0.057 | n/a | 0.374 | 15.415 | n/a | n/a | 0.035 | 3.787 | 0.127 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.504ms |
| 7bb3dcfb489c8bcc0000000000000246 | 27.860 | 5.176 | 0.286 | 0.000 | 0.064 | 1.773 | 6.858 | 0.042 | n/a | 0.379 | 13.235 | n/a | n/a | 0.046 | 5.526 | 0.198 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000025b | 27.860 | 6.377 | 0.006 | 0.000 | 0.354 | 0.728 | 7.144 | 0.037 | n/a | 0.079 | 13.091 | n/a | n/a | 0.044 | 6.738 | 0.242 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000250 | 27.545 | 4.462 | 0.358 | 0.000 | 0.050 | 1.419 | 10.356 | 0.070 | n/a | 0.635 | 10.126 | n/a | n/a | 0.070 | 4.869 | 0.177 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000285 | 26.803 | 5.450 | 0.219 | 0.000 | 0.053 | 2.525 | 7.170 | 0.047 | n/a | 0.148 | 11.146 | n/a | n/a | 0.044 | 5.722 | 0.213 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000026b | 25.933 | 6.557 | 0.236 | 0.000 | 0.134 | 1.520 | 7.250 | 0.039 | n/a | 0.432 | 9.695 | n/a | n/a | 0.071 | 6.927 | 0.267 | 0.071 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.158 | 0.655 | 0.000 | 1.747 | 4.243 | 0.005 | 0.000 | 0.534 | 1.078 | 1.817 | 0.052 | n/a | 0.446 | 6.219 | n/a | n/a | 0.044 | 4.897 | 0.258 | 0.044 |
| p99 | 53.453 | 1.627 | 0.005 | 5.624 | 7.791 | 0.010 | 0.000 | 1.113 | 4.729 | 8.550 | 0.131 | n/a | 31.961 | 34.348 | n/a | n/a | 0.100 | 8.825 | 0.439 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc0000000000000237 | 53.453 | 4.661 | 0.005 | 0.000 | 0.422 | 0.705 | 1.170 | 0.052 | n/a | 31.961 | 14.416 | n/a | n/a | 0.062 | 5.088 | 0.095 | 0.062 | gw-w/thread-45/d/transact-async | none observed |
| 7bb3dcfb489c8bcc000000000000024a | 44.963 | 5.181 | 0.008 | 0.000 | 0.443 | 3.796 | 1.072 | 0.024 | n/a | 0.047 | 34.348 | n/a | n/a | 0.045 | 5.632 | 0.125 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.767ms |
| 7bb3dcfb489c8bcc000000000000022f | 24.890 | 3.914 | 0.005 | 0.000 | 1.071 | 1.078 | 1.686 | 0.060 | n/a | 3.400 | 13.639 | n/a | n/a | 0.037 | 4.990 | 0.200 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000265 | 22.873 | 7.791 | 0.008 | 0.000 | 1.027 | 0.716 | 0.948 | 0.033 | n/a | 0.406 | 11.890 | n/a | n/a | 0.053 | 8.825 | 0.386 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000269 | 19.831 | 4.391 | 0.006 | 0.000 | 0.500 | 3.436 | 8.550 | 0.072 | n/a | 0.501 | 2.331 | n/a | n/a | 0.045 | 4.897 | 0.247 | 0.045 | node-14/thread-0/driver.execute | none observed |
| 7bb3dcfb489c8bcc000000000000025e | 19.251 | 3.615 | 0.004 | 0.000 | 0.274 | 1.036 | 5.525 | 0.131 | n/a | 0.788 | 7.844 | n/a | n/a | 0.034 | 3.893 | 0.202 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000222 | 16.400 | 4.243 | 0.004 | 0.000 | 0.534 | 4.729 | 3.843 | 0.094 | n/a | 0.146 | 2.753 | n/a | n/a | 0.052 | 4.781 | 0.292 | 0.052 | node-14/thread-0/socket.wait-first-byte | none observed |
| 7bb3dcfb489c8bcc000000000000026e | 16.280 | 5.125 | 0.010 | 0.000 | 0.747 | 1.108 | 1.936 | 0.055 | n/a | 0.725 | 6.513 | n/a | n/a | 0.062 | 5.882 | 0.361 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000022a | 16.158 | 3.640 | 0.006 | 0.000 | 0.530 | 1.621 | 1.732 | 0.033 | n/a | 0.600 | 7.952 | n/a | n/a | 0.043 | 4.176 | 0.258 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000226 | 16.011 | 3.260 | 0.006 | 0.000 | 0.459 | 1.082 | 2.621 | 0.120 | n/a | 0.794 | 7.628 | n/a | n/a | 0.041 | 3.725 | 0.233 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000254 | 14.850 | 3.375 | 0.005 | 0.000 | 0.427 | 0.768 | 4.128 | 0.043 | n/a | 0.446 | 5.617 | n/a | n/a | 0.041 | 3.807 | 0.256 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000261 | 14.703 | 5.541 | 0.004 | 0.000 | 0.908 | 0.686 | 0.912 | 0.029 | n/a | 1.087 | 5.509 | n/a | n/a | 0.027 | 6.453 | 0.439 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000280 | 14.679 | 4.586 | 0.009 | 0.000 | 1.113 | 1.361 | 1.817 | 0.057 | n/a | 0.177 | 5.500 | n/a | n/a | 0.059 | 5.708 | 0.389 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000027c | 13.814 | 3.620 | 0.005 | 0.000 | 0.646 | 2.218 | 2.065 | 0.076 | n/a | 0.371 | 4.773 | n/a | n/a | 0.042 | 4.270 | 0.309 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000283 | 13.276 | 3.257 | 0.005 | 0.000 | 0.110 | 0.581 | 4.491 | 0.031 | n/a | 0.132 | 4.625 | n/a | n/a | 0.044 | 3.372 | 0.254 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000276 | 12.419 | 4.394 | 0.010 | 0.000 | 0.873 | 0.834 | 1.230 | 0.035 | n/a | 0.219 | 4.724 | n/a | n/a | 0.100 | 5.277 | 0.425 | 0.100 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000241 | 12.292 | 3.263 | 0.004 | 0.000 | 0.621 | 0.617 | 1.141 | 0.031 | n/a | 0.364 | 6.219 | n/a | n/a | 0.034 | 3.888 | 0.316 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.413 | 0.424 | 0.000 | 0.695 | 3.881 | 0.011 | 0.000 | 0.179 | 1.186 | 3.199 | 0.044 | n/a | 0.363 | 8.924 | n/a | n/a | 0.052 | 4.363 | 0.249 | 0.052 |
| p99 | 65.239 | 2.036 | 0.015 | 5.587 | 10.248 | n/a | 0.000 | 1.073 | 4.902 | 34.004 | 0.118 | n/a | 3.265 | 56.157 | n/a | n/a | 0.095 | 10.587 | 0.485 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc000000000000028f | 65.239 | 6.084 | 0.006 | 0.000 | 0.240 | 0.838 | 1.281 | 0.035 | n/a | 0.503 | 56.157 | n/a | n/a | 0.095 | 6.329 | 0.097 | 0.095 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000029a | 51.303 | 3.495 | 0.252 | 0.000 | 0.153 | 1.168 | 34.004 | 0.042 | n/a | 1.045 | 11.066 | n/a | n/a | 0.078 | 3.900 | 0.076 | 0.078 | gw-w/thread-41/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc00000000000002be | 46.038 | 5.300 | 0.294 | 0.000 | 0.078 | 2.171 | 23.417 | 0.062 | n/a | 0.726 | 13.934 | n/a | n/a | 0.056 | 5.672 | 0.123 | 0.056 | gw-w/thread-44/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc00000000000002b6 | 35.890 | 10.248 | 0.271 | 0.000 | 0.068 | 1.848 | 7.752 | 0.066 | n/a | 3.265 | 12.277 | n/a | n/a | 0.094 | 10.587 | 0.295 | 0.094 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000294 | 31.877 | 4.091 | 0.170 | 0.000 | 0.046 | 1.235 | 8.748 | 0.056 | n/a | 0.382 | 17.110 | n/a | n/a | 0.041 | 4.306 | 0.135 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002aa | 28.980 | 3.403 | 0.337 | 0.000 | 0.047 | 1.535 | 9.871 | 0.076 | n/a | 2.485 | 11.184 | n/a | n/a | 0.042 | 3.787 | 0.131 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000289 | 28.427 | 3.443 | 0.218 | 0.000 | 0.085 | 4.666 | 10.957 | 0.084 | n/a | 0.159 | 8.761 | n/a | n/a | 0.054 | 3.746 | 0.132 | 0.054 | gw-w/thread-45/gateway.admitted-work | none observed |
| 7bb3dcfb489c8bcc00000000000002c2 | 28.187 | 3.627 | 0.303 | 0.000 | 0.138 | 1.474 | 8.116 | 0.037 | n/a | 0.098 | 14.325 | n/a | n/a | 0.070 | 4.068 | 0.144 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002bf | 27.331 | 3.881 | 0.005 | 0.000 | 1.015 | 0.811 | 1.359 | 0.045 | n/a | 0.375 | 19.806 | n/a | n/a | 0.034 | 4.901 | 0.179 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000028d | 27.287 | 6.559 | 0.335 | 0.000 | 0.123 | 1.857 | 4.772 | 0.040 | n/a | 0.265 | 13.241 | n/a | n/a | 0.094 | 7.017 | 0.257 | 0.094 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000291 | 25.929 | 6.411 | 0.011 | 0.000 | 0.713 | 1.214 | 6.282 | 0.072 | n/a | 0.191 | 10.973 | n/a | n/a | 0.061 | 7.135 | 0.275 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002d9 | 25.528 | 5.120 | 0.268 | 0.000 | 0.114 | 1.407 | 4.084 | 0.046 | n/a | 0.454 | 13.945 | n/a | n/a | 0.090 | 5.501 | 0.215 | 0.090 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002ae | 25.023 | 3.758 | 0.363 | 0.000 | 0.121 | 1.245 | 8.726 | 0.038 | n/a | 0.357 | 10.353 | n/a | n/a | 0.062 | 4.242 | 0.170 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002d3 | 24.845 | 3.357 | 0.183 | 0.000 | 0.039 | 4.660 | 4.481 | 0.043 | n/a | 0.102 | 11.943 | n/a | n/a | 0.037 | 3.579 | 0.144 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000029c | 24.376 | 3.872 | 0.381 | 0.000 | 0.072 | 1.754 | 7.087 | 0.118 | n/a | 0.138 | 10.907 | n/a | n/a | 0.047 | 4.325 | 0.177 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002a6 | 23.320 | 4.578 | 0.281 | 0.000 | 0.068 | 1.835 | 8.371 | 0.049 | n/a | 0.100 | 7.992 | n/a | n/a | 0.046 | 4.927 | 0.211 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002cc | 23.251 | 3.334 | 0.188 | 0.000 | 0.050 | 4.902 | 3.656 | 0.039 | n/a | 0.094 | 10.948 | n/a | n/a | 0.040 | 3.573 | 0.154 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000297 | 22.439 | 9.032 | 0.006 | 0.000 | 0.390 | 1.186 | 2.164 | 0.079 | n/a | 1.051 | 8.459 | n/a | n/a | 0.072 | 9.429 | 0.420 | 0.072 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002b1 | 21.707 | 5.659 | 0.009 | 0.000 | 0.637 | 0.846 | 1.331 | 0.033 | n/a | 0.155 | 12.965 | n/a | n/a | 0.070 | 6.305 | 0.290 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000028a | 21.223 | 3.808 | 0.006 | 0.000 | 0.179 | 0.837 | 1.843 | 0.042 | n/a | 0.111 | 14.356 | n/a | n/a | 0.042 | 3.993 | 0.188 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.380 | 0.519 | 0.000 | 1.607 | 3.789 | 0.005 | 0.000 | 0.626 | 0.794 | 1.359 | 0.044 | n/a | 0.363 | 5.310 | n/a | n/a | 0.041 | 4.420 | 0.297 | 0.041 |
| p99 | 27.331 | 1.325 | 0.000 | 2.907 | 5.014 | n/a | 0.000 | 1.073 | 2.475 | 9.978 | 0.068 | n/a | 0.553 | 19.806 | n/a | n/a | 0.089 | 6.099 | 0.485 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc00000000000002bf | 27.331 | 3.881 | 0.005 | 0.000 | 1.015 | 0.811 | 1.359 | 0.045 | n/a | 0.375 | 19.806 | n/a | n/a | 0.034 | 4.901 | 0.179 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002c3 | 17.758 | 4.796 | 0.009 | 0.000 | 0.478 | 2.475 | 1.266 | 0.037 | n/a | 0.363 | 8.260 | n/a | n/a | 0.075 | 5.283 | 0.297 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002bb | 17.103 | 4.743 | 0.006 | 0.000 | 0.289 | 0.949 | 1.195 | 0.037 | n/a | 0.476 | 9.365 | n/a | n/a | 0.043 | 5.038 | 0.295 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002c9 | 16.593 | 2.938 | 0.005 | 0.000 | 0.491 | 0.784 | 3.199 | 0.068 | n/a | 0.147 | 8.925 | n/a | n/a | 0.035 | 3.435 | 0.207 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002a7 | 15.943 | 4.167 | 0.007 | 0.000 | 0.303 | 0.667 | 5.334 | 0.059 | n/a | 0.179 | 5.169 | n/a | n/a | 0.058 | 4.477 | 0.281 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000286 | 15.826 | 4.120 | 0.005 | 0.000 | 0.727 | 1.221 | 2.433 | 0.064 | n/a | 0.531 | 6.664 | n/a | n/a | 0.060 | 4.853 | 0.307 | 0.060 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002cd | 14.802 | 2.745 | n/a | 0.000 | 0.201 | 1.734 | 9.978 | 0.017 | n/a | 0.038 | 0.000 | n/a | n/a | 0.089 | 2.946 | 0.199 | 0.089 | gw-w/thread-41/gateway /v1/db/{db}/release | none observed |
| 7bb3dcfb489c8bcc00000000000002af | 14.380 | 3.374 | 0.005 | 0.000 | 0.910 | 0.797 | 2.002 | 0.059 | n/a | 0.553 | 6.642 | n/a | n/a | 0.038 | 4.289 | 0.298 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002a3 | 13.529 | 2.937 | 0.005 | 0.000 | 0.972 | 0.810 | 1.514 | 0.056 | n/a | 0.514 | 6.686 | n/a | n/a | 0.035 | 3.914 | 0.289 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002b7 | 12.571 | 5.014 | 0.011 | 0.000 | 1.073 | 0.794 | 1.231 | 0.044 | n/a | 0.363 | 3.966 | n/a | n/a | 0.074 | 6.099 | 0.485 | 0.074 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000029f | 12.056 | 3.789 | 0.010 | 0.000 | 0.621 | 0.755 | 1.105 | 0.050 | n/a | 0.352 | 5.310 | n/a | n/a | 0.063 | 4.420 | 0.367 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000029d | 11.923 | 3.700 | 0.006 | 0.000 | 0.626 | 0.783 | 1.702 | 0.035 | n/a | 0.125 | 4.906 | n/a | n/a | 0.041 | 4.332 | 0.363 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000002c7 | 10.379 | 2.798 | 0.004 | 0.000 | 0.715 | 0.613 | 0.945 | 0.034 | n/a | 0.116 | 5.125 | n/a | n/a | 0.030 | 3.517 | 0.339 | 0.030 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000295 | 10.350 | 3.911 | 0.005 | 0.000 | 0.857 | 0.590 | 0.938 | 0.041 | n/a | 0.406 | 3.565 | n/a | n/a | 0.035 | 4.773 | 0.461 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.189 | 0.757 | 0.000 | 1.600 | 3.662 | 0.005 | 0.000 | 0.729 | 0.772 | 1.176 | 0.035 | n/a | 0.149 | 6.631 | n/a | n/a | 0.038 | 4.597 | 0.317 | 0.038 |
| p99 | 87.972 | 3.170 | 0.041 | 4.677 | 10.590 | 3.480 | 0.000 | 22.269 | 14.148 | 10.120 | 4.035 | n/a | 3.922 | 46.370 | n/a | n/a | 0.104 | 38.265 | 0.677 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc00000000000004a9 | 119.368 | 7.431 | 0.019 | 0.000 | 13.317 | 7.212 | 2.932 | 0.084 | n/a | 0.113 | 88.197 | n/a | n/a | 0.061 | 20.768 | 0.174 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 5.321ms; driver.expected-state.bind-receipt 1.720ms; driver.publication 1.223ms; driver.expected-state.bind-receipt 1.093ms; driver.publication 1.015ms |
| 7bb3dcfb489c8bcc000000000000076a | 117.639 | 9.279 | 11.330 | 0.000 | 67.916 | 3.841 | 4.106 | 6.225 | n/a | 0.233 | 14.639 | n/a | n/a | 0.071 | 88.525 | 0.753 | 0.071 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 4.226ms; driver.publication 2.336ms; driver.publication 2.040ms; driver.publication 1.621ms; driver.publication 1.357ms |
| 7bb3dcfb489c8bcc00000000000004ab | 110.412 | 3.612 | 0.004 | 0.000 | 85.107 | 0.440 | 1.864 | 0.059 | n/a | 0.110 | 19.181 | n/a | n/a | 0.035 | 88.723 | 0.804 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 1.223ms; driver.publication 1.209ms; driver.expected-state.bind-receipt 1.093ms; driver.publication 1.015ms |
| 7bb3dcfb489c8bcc00000000000004aa | 110.212 | 9.958 | 0.206 | 0.000 | 3.093 | 10.778 | 1.069 | 0.037 | n/a | 0.098 | 84.940 | n/a | n/a | 0.031 | 13.257 | 0.120 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.295ms; driver.publication 1.223ms; driver.expected-state.bind-receipt 1.093ms; driver.publication 1.015ms |
| 7bb3dcfb489c8bcc00000000000004a6 | 104.783 | 3.124 | 0.005 | 0.000 | 0.139 | 0.481 | 0.918 | 0.034 | n/a | 0.058 | 99.989 | n/a | n/a | 0.035 | 3.268 | 0.031 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 5.321ms; driver.expected-state.bind-receipt 1.720ms; driver.publication 1.223ms |
| 7bb3dcfb489c8bcc00000000000004a7 | 98.963 | 6.247 | 0.008 | 0.000 | 0.687 | 0.709 | 2.349 | 0.106 | n/a | 0.181 | 88.623 | n/a | n/a | 0.054 | 6.942 | 0.070 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.321ms; driver.expected-state.bind-receipt 1.720ms; driver.publication 1.223ms; driver.publication 1.015ms |
| 7bb3dcfb489c8bcc0000000000000766 | 92.989 | 26.086 | 0.126 | 0.000 | 5.204 | 0.789 | 10.120 | 0.033 | n/a | 1.093 | 49.443 | n/a | n/a | 0.095 | 31.416 | 0.338 | 0.095 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 3.518ms; driver.publication 3.257ms; driver.expected-state.bind-receipt 1.123ms |
| 7bb3dcfb489c8bcc00000000000004a4 | 90.028 | 4.317 | 0.004 | 0.000 | 2.410 | 0.613 | 2.085 | 0.053 | n/a | 0.079 | 80.437 | n/a | n/a | 0.029 | 6.731 | 0.075 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 5.321ms; driver.publication 1.721ms; driver.expected-state.bind-receipt 1.720ms |
| 7bb3dcfb489c8bcc0000000000000767 | 87.972 | 9.944 | 0.006 | 0.000 | 2.908 | 19.594 | 1.714 | 1.835 | n/a | 0.165 | 51.669 | n/a | n/a | 0.136 | 12.858 | 0.146 | 0.136 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.226ms; driver.publication 3.257ms; driver.publication 2.040ms; driver.expected-state.bind-receipt 1.123ms |
| 7bb3dcfb489c8bcc0000000000000768 | 83.847 | 5.342 | 0.007 | 0.000 | 1.043 | 26.093 | 1.318 | 0.032 | n/a | 0.397 | 49.550 | n/a | n/a | 0.065 | 6.392 | 0.076 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.226ms; driver.publication 3.257ms; driver.publication 2.040ms; driver.publication 1.621ms; driver.expected-state.bind-receipt 1.123ms |
| 7bb3dcfb489c8bcc0000000000000772 | 81.472 | 3.925 | 0.003 | 0.000 | 66.658 | 0.563 | 1.181 | 0.026 | n/a | 0.104 | 8.962 | n/a | n/a | 0.050 | 70.586 | 0.866 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 2.336ms; driver.publication 1.621ms; driver.publication 1.357ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc000000000000076b | 77.539 | 8.336 | 0.006 | 0.000 | 0.715 | 18.474 | 2.499 | 0.069 | n/a | 0.976 | 46.370 | n/a | n/a | 0.094 | 9.057 | 0.117 | 0.094 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.226ms; driver.publication 2.336ms; driver.publication 2.040ms; driver.publication 1.621ms |
| 7bb3dcfb489c8bcc000000000000076f | 72.455 | 5.613 | 40.789 | 0.000 | 1.708 | 0.454 | 1.142 | 7.583 | n/a | 0.085 | 15.043 | n/a | n/a | 0.037 | 48.110 | 0.664 | 0.037 | node-14/thread-0/client.commit-send-queue | driver.expected-state.bind-receipt 4.226ms; driver.publication 2.336ms; driver.publication 2.040ms; driver.publication 1.621ms; driver.publication 1.357ms |
| 7bb3dcfb489c8bcc000000000000076e | 71.582 | 8.599 | 3.480 | 0.000 | 1.174 | 40.659 | 3.541 | 0.019 | n/a | 5.794 | 8.261 | n/a | n/a | 0.056 | 13.253 | 0.185 | 0.056 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 4.226ms; driver.publication 2.336ms; driver.publication 2.040ms; driver.publication 1.621ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc0000000000000548 | 69.913 | 8.299 | 1.855 | 0.000 | 0.091 | 2.647 | 14.134 | 0.155 | n/a | 0.345 | 42.345 | n/a | n/a | 0.042 | 10.245 | 0.147 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.269ms; driver.publication 1.267ms; driver.publication 1.129ms; driver.publication 1.065ms; driver.publication 1.055ms |
| 7bb3dcfb489c8bcc0000000000000771 | 66.127 | 5.286 | 26.242 | 0.000 | 8.780 | 1.909 | 1.442 | 6.151 | n/a | 0.012 | 16.262 | n/a | n/a | 0.043 | 40.308 | 0.610 | 0.043 | node-14/thread-0/client.commit-send-queue | driver.expected-state.bind-receipt 4.226ms; driver.publication 2.336ms; driver.publication 1.621ms; driver.publication 1.357ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc000000000000081f | 65.420 | 10.669 | 0.013 | 0.000 | 3.409 | 13.771 | 4.453 | 3.749 | n/a | 0.874 | 28.444 | n/a | n/a | 0.039 | 14.091 | 0.215 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.904ms; driver.publication 1.660ms; driver.publication 1.420ms; driver.publication 1.338ms; driver.publication 1.261ms |
| 7bb3dcfb489c8bcc00000000000004b0 | 62.943 | 4.846 | 0.010 | 0.000 | 42.925 | 0.705 | 1.608 | 0.140 | n/a | 0.541 | 12.138 | n/a | n/a | 0.029 | 47.782 | 0.759 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.530ms; driver.publication 1.429ms; driver.expected-state.bind-receipt 1.268ms; driver.publication 1.258ms; driver.publication 1.209ms |
| 7bb3dcfb489c8bcc00000000000004b5 | 61.321 | 3.330 | 0.005 | 0.000 | 47.896 | 0.719 | 1.392 | 0.044 | n/a | 0.167 | 7.723 | n/a | n/a | 0.043 | 51.231 | 0.835 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 1.569ms; driver.publication 1.530ms; driver.publication 1.429ms; driver.expected-state.bind-receipt 1.268ms |
| 7bb3dcfb489c8bcc00000000000004ad | 61.248 | 5.357 | 0.005 | 0.000 | 33.609 | 0.843 | 1.734 | 0.059 | n/a | 0.433 | 19.179 | n/a | n/a | 0.029 | 38.971 | 0.636 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.429ms; driver.expected-state.bind-receipt 1.268ms; driver.publication 1.258ms; driver.publication 1.209ms; driver.expected-state.bind-receipt 1.093ms |

## P2 / L1024 / commit / 5-10 facts (492 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.773 | 0.636 | 0.000 | 1.433 | 3.153 | 0.004 | 0.000 | 0.755 | 0.774 | 1.025 | 0.035 | n/a | 0.136 | 5.972 | n/a | n/a | 0.037 | 4.009 | 0.307 | 0.037 |
| p99 | 81.472 | 2.222 | 0.039 | 4.325 | 8.630 | 0.261 | 0.000 | 22.269 | 16.646 | 7.030 | 4.352 | n/a | 3.968 | 35.803 | n/a | n/a | 0.105 | 34.203 | 0.699 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc00000000000004a9 | 119.368 | 7.431 | 0.019 | 0.000 | 13.317 | 7.212 | 2.932 | 0.084 | n/a | 0.113 | 88.197 | n/a | n/a | 0.061 | 20.768 | 0.174 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 5.321ms; driver.expected-state.bind-receipt 1.720ms; driver.publication 1.223ms; driver.expected-state.bind-receipt 1.093ms; driver.publication 1.015ms |
| 7bb3dcfb489c8bcc00000000000004aa | 110.212 | 9.958 | 0.206 | 0.000 | 3.093 | 10.778 | 1.069 | 0.037 | n/a | 0.098 | 84.940 | n/a | n/a | 0.031 | 13.257 | 0.120 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.295ms; driver.publication 1.223ms; driver.expected-state.bind-receipt 1.093ms; driver.publication 1.015ms |
| 7bb3dcfb489c8bcc0000000000000767 | 87.972 | 9.944 | 0.006 | 0.000 | 2.908 | 19.594 | 1.714 | 1.835 | n/a | 0.165 | 51.669 | n/a | n/a | 0.136 | 12.858 | 0.146 | 0.136 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.226ms; driver.publication 3.257ms; driver.publication 2.040ms; driver.expected-state.bind-receipt 1.123ms |
| 7bb3dcfb489c8bcc0000000000000768 | 83.847 | 5.342 | 0.007 | 0.000 | 1.043 | 26.093 | 1.318 | 0.032 | n/a | 0.397 | 49.550 | n/a | n/a | 0.065 | 6.392 | 0.076 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.226ms; driver.publication 3.257ms; driver.publication 2.040ms; driver.publication 1.621ms; driver.expected-state.bind-receipt 1.123ms |
| 7bb3dcfb489c8bcc0000000000000772 | 81.472 | 3.925 | 0.003 | 0.000 | 66.658 | 0.563 | 1.181 | 0.026 | n/a | 0.104 | 8.962 | n/a | n/a | 0.050 | 70.586 | 0.866 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 2.336ms; driver.publication 1.621ms; driver.publication 1.357ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc000000000000076e | 71.582 | 8.599 | 3.480 | 0.000 | 1.174 | 40.659 | 3.541 | 0.019 | n/a | 5.794 | 8.261 | n/a | n/a | 0.056 | 13.253 | 0.185 | 0.056 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 4.226ms; driver.publication 2.336ms; driver.publication 2.040ms; driver.publication 1.621ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc0000000000000771 | 66.127 | 5.286 | 26.242 | 0.000 | 8.780 | 1.909 | 1.442 | 6.151 | n/a | 0.012 | 16.262 | n/a | n/a | 0.043 | 40.308 | 0.610 | 0.043 | node-14/thread-0/client.commit-send-queue | driver.expected-state.bind-receipt 4.226ms; driver.publication 2.336ms; driver.publication 1.621ms; driver.publication 1.357ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc00000000000004b0 | 62.943 | 4.846 | 0.010 | 0.000 | 42.925 | 0.705 | 1.608 | 0.140 | n/a | 0.541 | 12.138 | n/a | n/a | 0.029 | 47.782 | 0.759 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.530ms; driver.publication 1.429ms; driver.expected-state.bind-receipt 1.268ms; driver.publication 1.258ms; driver.publication 1.209ms |
| 7bb3dcfb489c8bcc00000000000004b5 | 61.321 | 3.330 | 0.005 | 0.000 | 47.896 | 0.719 | 1.392 | 0.044 | n/a | 0.167 | 7.723 | n/a | n/a | 0.043 | 51.231 | 0.835 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 1.569ms; driver.publication 1.530ms; driver.publication 1.429ms; driver.expected-state.bind-receipt 1.268ms |
| 7bb3dcfb489c8bcc000000000000081a | 60.034 | 4.117 | 0.007 | 0.000 | 30.080 | 0.990 | 1.434 | 0.029 | n/a | 1.258 | 22.079 | n/a | n/a | 0.040 | 34.203 | 0.570 | 0.040 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.904ms; driver.publication 1.660ms; driver.publication 1.338ms; driver.publication 1.204ms; driver.publication 1.182ms |
| 7bb3dcfb489c8bcc000000000000076c | 55.934 | 4.801 | 0.006 | 0.000 | 1.194 | 16.646 | 2.230 | 0.077 | n/a | 0.102 | 30.798 | n/a | n/a | 0.079 | 6.002 | 0.107 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.226ms; driver.publication 2.336ms; driver.publication 2.040ms; driver.publication 1.621ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc000000000000076d | 51.992 | 6.418 | 0.019 | 0.000 | 1.148 | 14.148 | 1.424 | 0.044 | n/a | 0.069 | 28.661 | n/a | n/a | 0.063 | 7.584 | 0.146 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.226ms; driver.publication 2.336ms; driver.publication 2.040ms; driver.publication 1.621ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc000000000000066f | 46.532 | 5.428 | 0.005 | 0.000 | 0.736 | 0.751 | 3.558 | 0.052 | n/a | 0.241 | 35.675 | n/a | n/a | 0.087 | 6.169 | 0.133 | 0.087 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.590ms; driver.expected-state.bind-receipt 1.964ms |
| 7bb3dcfb489c8bcc0000000000000765 | 45.883 | 14.379 | 0.014 | 0.000 | 9.161 | 8.288 | 1.673 | 0.065 | n/a | 0.139 | 12.071 | n/a | n/a | 0.094 | 23.553 | 0.513 | 0.094 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 7.777ms |
| 7bb3dcfb489c8bcc000000000000054b | 44.918 | 4.398 | 0.009 | 0.000 | 9.696 | 1.579 | 0.953 | 0.066 | n/a | 0.084 | 28.067 | n/a | n/a | 0.066 | 14.103 | 0.314 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.269ms; driver.publication 1.267ms; driver.publication 1.055ms |
| 7bb3dcfb489c8bcc0000000000000672 | 44.425 | 3.683 | 0.005 | 0.000 | 0.291 | 2.619 | 1.740 | 0.080 | n/a | 0.141 | 35.803 | n/a | n/a | 0.063 | 3.979 | 0.090 | 0.063 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.424ms; driver.publication 1.328ms |
| 7bb3dcfb489c8bcc0000000000000872 | 44.008 | 3.664 | 0.003 | 0.000 | 4.934 | 0.830 | 1.041 | 0.029 | n/a | 0.089 | 33.381 | n/a | n/a | 0.037 | 8.602 | 0.195 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc0000000000000671 | 42.902 | 4.099 | 0.006 | 0.000 | 3.810 | 0.980 | 1.977 | 0.052 | n/a | 0.336 | 31.596 | n/a | n/a | 0.044 | 7.915 | 0.184 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.964ms; driver.publication 1.424ms; driver.publication 0.543ms |
| 7bb3dcfb489c8bcc00000000000003d7 | 40.623 | 2.815 | 0.004 | 0.000 | 0.197 | 5.261 | 22.036 | 0.037 | n/a | 0.080 | 10.150 | n/a | n/a | 0.042 | 3.016 | 0.074 | 0.042 | gw-w/thread-47/commit.prepare-and-validate | driver.publication 1.412ms |
| 7bb3dcfb489c8bcc000000000000033d | 39.920 | 8.215 | 0.008 | 0.000 | 4.842 | 2.100 | 1.327 | 0.040 | n/a | 0.895 | 22.464 | n/a | n/a | 0.030 | 13.065 | 0.327 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.124ms |

## P2/P4 / read-your-own-write / read (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.380 | n/a | n/a | n/a | 28.833 | 4.566 | 3.423 | 0.000 | 0.454 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.962 | 58.635 | 0.802 | 10.962 |
| p99 | 261.682 | n/a | n/a | n/a | 132.115 | 70.250 | 15.913 | 0.000 | 27.015 | 59.681 | 2.605 | n/a | 0.019 | 0.000 | n/a | n/a | 93.188 | 181.240 | 1.000 | 93.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc0000000000001959 | 261.682 | 132.115 | 36.560 | 12.565 | 0.000 | 27.015 | 50.813 | 2.605 | n/a | 0.003 | 0.000 | n/a | n/a | 0.006 | 181.240 | 0.693 | 0.006 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 2.389ms; driver.publication 2.342ms; driver.publication 1.219ms; driver.publication 1.205ms; driver.publication 1.153ms |
| 7bb3dcfb489c8bcc0000000000001080 | 128.691 | 63.794 | 40.124 | 13.212 | 0.000 | 0.598 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.962 | 117.130 | 0.910 | 10.962 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.141ms; driver.publication 1.088ms; driver.publication 1.060ms; driver.publication 1.051ms |
| 7bb3dcfb489c8bcc00000000000002ff | 128.493 | 58.280 | 0.588 | 8.297 | 0.000 | 1.605 | 59.681 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.019 | 67.164 | 0.523 | 0.019 | gw-r/thread-47/gateway.admitted-work | driver.publication 1.042ms; driver.publication 1.039ms |
| 7bb3dcfb489c8bcc000000000000195b | 118.650 | 46.731 | 22.075 | 3.895 | 0.000 | 0.477 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.473 | 72.700 | 0.613 | 45.473 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.219ms; driver.publication 1.205ms; driver.publication 1.153ms |
| 7bb3dcfb489c8bcc0000000000001b4b | 107.501 | 13.541 | 0.302 | 0.000 | 0.000 | 0.469 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 93.188 | 13.843 | 0.129 | 93.188 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.622ms; driver.publication 1.126ms; driver.publication 1.113ms |
| 7bb3dcfb489c8bcc0000000000001b47 | 106.354 | 54.847 | 4.566 | 4.933 | 0.000 | 0.434 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.573 | 64.346 | 0.605 | 41.573 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.622ms; driver.publication 1.126ms; driver.publication 1.113ms; driver.publication 1.025ms |
| 7bb3dcfb489c8bcc0000000000001b56 | 105.999 | 18.612 | 70.250 | 0.000 | 0.000 | 0.218 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.919 | 88.862 | 0.838 | 16.919 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.622ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc0000000000001b54 | 104.847 | 22.112 | 59.718 | 0.000 | 0.000 | 0.289 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.728 | 81.830 | 0.780 | 22.728 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.622ms; driver.publication 1.126ms; driver.publication 1.113ms |
| 7bb3dcfb489c8bcc0000000000000956 | 104.578 | 73.708 | 4.110 | 6.015 | 0.000 | 0.879 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.867 | 83.832 | 0.802 | 19.867 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.580ms; driver.publication 1.299ms |
| 7bb3dcfb489c8bcc0000000000001958 | 101.292 | 58.105 | 37.437 | 2.961 | 0.000 | 0.873 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.916 | 98.503 | 0.972 | 1.916 | node-14/thread-0/rpc.replica.observe | driver.publication 1.219ms; driver.publication 1.205ms; driver.publication 1.153ms; driver.publication 1.039ms |
| 7bb3dcfb489c8bcc000000000000169c | 99.637 | 61.385 | 0.280 | 9.237 | 0.000 | 0.328 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.407 | 70.902 | 0.712 | 28.407 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 2.617ms; driver.publication 1.223ms; driver.publication 1.057ms |
| 7bb3dcfb489c8bcc0000000000001b4d | 96.126 | 17.490 | 0.787 | 0.000 | 0.000 | 0.595 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.253 | 18.277 | 0.190 | 77.253 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.622ms; driver.publication 1.126ms; driver.publication 1.113ms |
| 7bb3dcfb489c8bcc0000000000000959 | 92.751 | 21.830 | 69.277 | 0.000 | 0.000 | 0.421 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.224 | 91.107 | 0.982 | 1.224 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.299ms; driver.publication 1.294ms |
| 7bb3dcfb489c8bcc0000000000001b57 | 90.702 | 18.836 | 66.653 | 1.471 | 0.000 | 0.260 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.482 | 86.960 | 0.959 | 3.482 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.622ms; driver.publication 1.126ms |
| 7bb3dcfb489c8bcc0000000000001b4f | 86.929 | 10.988 | 1.397 | 0.000 | 0.000 | 1.236 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 73.309 | 12.385 | 0.142 | 73.309 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.622ms; driver.publication 1.126ms; driver.publication 1.113ms |
| 7bb3dcfb489c8bcc00000000000018f7 | 86.889 | 45.348 | 11.604 | 4.192 | 0.000 | 0.437 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.308 | 61.145 | 0.704 | 25.308 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 2.284ms; driver.publication 1.485ms; driver.publication 1.093ms |
| 7bb3dcfb489c8bcc00000000000013fe | 85.630 | 18.308 | 9.852 | 0.000 | 0.000 | 0.365 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 57.106 | 28.160 | 0.329 | 57.106 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.295ms |
| 7bb3dcfb489c8bcc0000000000000e39 | 79.380 | 63.879 | 0.188 | 5.952 | 0.000 | 0.519 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.843 | 70.019 | 0.882 | 8.843 | node-14/thread-3/client.reach-decode-and-cache | none observed |
| 7bb3dcfb489c8bcc0000000000001955 | 77.627 | 16.603 | 61.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 77.619 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | driver.publication 1.577ms; driver.publication 1.303ms; driver.publication 1.039ms |
| 7bb3dcfb489c8bcc0000000000000b66 | 76.815 | 28.833 | 0.119 | 3.985 | 0.000 | 0.268 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.610 | 32.937 | 0.429 | 43.610 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.175ms; driver.publication 1.170ms; driver.publication 1.095ms; driver.publication 1.025ms |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.090 | 0.701 | 0.000 | 1.592 | 3.523 | 0.004 | 0.000 | 0.721 | 0.690 | 1.047 | 0.026 | n/a | 0.096 | 5.292 | n/a | n/a | 0.032 | 4.508 | 0.361 | 0.032 |
| p99 | 52.909 | 2.857 | 0.041 | 4.595 | 9.728 | 0.492 | 0.000 | 15.018 | 10.961 | 7.909 | 1.173 | n/a | 2.947 | 35.711 | n/a | n/a | 0.088 | 20.939 | 0.722 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc0000000000001148 | 78.193 | 22.396 | 0.008 | 0.000 | 37.726 | 5.656 | 2.475 | 0.141 | n/a | 0.145 | 9.526 | n/a | n/a | 0.120 | 60.130 | 0.769 | 0.120 | node-14/thread-0/driver.queue.subject | driver.publication 1.979ms; driver.publication 1.442ms; driver.publication 1.269ms; driver.expected-state.bind-receipt 1.067ms |
| 7bb3dcfb489c8bcc0000000000000b1b | 73.103 | 5.285 | 0.004 | 0.000 | 43.393 | 0.552 | 4.235 | 0.030 | n/a | 0.086 | 19.463 | n/a | n/a | 0.055 | 48.682 | 0.666 | 0.055 | node-14/thread-0/driver.queue.subject | driver.publication 1.311ms; driver.publication 1.174ms; driver.publication 1.086ms; driver.publication 1.022ms |
| 7bb3dcfb489c8bcc0000000000001900 | 71.385 | 8.100 | 0.008 | 0.000 | 0.462 | 10.272 | 2.738 | 0.081 | n/a | 0.165 | 49.521 | n/a | n/a | 0.040 | 8.570 | 0.120 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.672ms; driver.publication 1.239ms; driver.publication 1.148ms; driver.publication 1.098ms |
| 7bb3dcfb489c8bcc0000000000000f5f | 70.903 | 13.594 | 0.012 | 0.000 | 1.330 | 7.167 | 5.439 | 0.066 | n/a | 0.232 | 43.040 | n/a | n/a | 0.021 | 14.937 | 0.211 | 0.021 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.067ms |
| 7bb3dcfb489c8bcc0000000000000b1f | 70.813 | 4.820 | 0.003 | 0.000 | 40.347 | 13.887 | 0.771 | 0.030 | n/a | 0.296 | 10.617 | n/a | n/a | 0.042 | 45.170 | 0.638 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 1.311ms; driver.publication 1.097ms; driver.expected-state.bind-receipt 1.092ms; driver.publication 1.086ms; driver.publication 1.022ms |
| 7bb3dcfb489c8bcc00000000000009d9 | 70.004 | 8.821 | 0.009 | 0.000 | 1.316 | 9.029 | 2.510 | 0.048 | n/a | 0.481 | 47.752 | n/a | n/a | 0.039 | 10.146 | 0.145 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.583ms; driver.expected-state.bind-receipt 1.644ms; driver.publication 1.382ms; driver.publication 1.330ms; driver.publication 1.093ms |
| 7bb3dcfb489c8bcc000000000000124a | 69.419 | 8.072 | 0.004 | 0.000 | 0.283 | 0.807 | 2.444 | 0.031 | n/a | 0.073 | 57.668 | n/a | n/a | 0.038 | 8.358 | 0.120 | 0.038 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000009d8 | 66.130 | 4.845 | 0.002 | 0.000 | 2.436 | 4.236 | 0.904 | 0.814 | n/a | 0.012 | 52.841 | n/a | n/a | 0.040 | 7.283 | 0.110 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.583ms; driver.expected-state.bind-receipt 1.644ms; driver.publication 1.330ms; driver.publication 1.093ms |
| 7bb3dcfb489c8bcc0000000000000f61 | 60.906 | 4.990 | 0.007 | 0.000 | 2.486 | 10.052 | 1.485 | 0.017 | n/a | 0.315 | 41.539 | n/a | n/a | 0.015 | 7.482 | 0.123 | 0.015 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 4.565ms; driver.publication 1.067ms |
| 7bb3dcfb489c8bcc0000000000001157 | 60.814 | 16.697 | 0.014 | 0.000 | 23.024 | 5.488 | 6.678 | 0.187 | n/a | 0.991 | 7.684 | n/a | n/a | 0.053 | 39.735 | 0.653 | 0.053 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.631ms; driver.publication 1.200ms; driver.publication 1.194ms; driver.publication 1.111ms |
| 7bb3dcfb489c8bcc00000000000009db | 60.426 | 6.939 | 0.007 | 0.000 | 0.491 | 5.180 | 3.106 | 0.058 | n/a | 0.146 | 44.458 | n/a | n/a | 0.041 | 7.437 | 0.123 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.644ms; driver.expected-state.bind-receipt 1.450ms; driver.publication 1.382ms; driver.publication 1.330ms; driver.publication 1.234ms |
| 7bb3dcfb489c8bcc0000000000000f60 | 59.558 | 4.192 | 0.064 | 0.000 | 0.389 | 9.254 | 1.871 | 0.987 | n/a | 0.403 | 42.379 | n/a | n/a | 0.019 | 4.646 | 0.078 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 4.565ms |
| 7bb3dcfb489c8bcc00000000000018ff | 58.441 | 2.914 | 0.004 | 0.000 | 0.737 | 5.726 | 0.577 | 0.022 | n/a | 0.053 | 48.377 | n/a | n/a | 0.031 | 3.656 | 0.063 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 3.672ms |
| 7bb3dcfb489c8bcc00000000000018fe | 58.125 | 6.292 | 0.005 | 0.000 | 0.638 | 0.675 | 1.067 | 0.029 | n/a | 0.087 | 49.280 | n/a | n/a | 0.052 | 6.935 | 0.119 | 0.052 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000009d7 | 57.770 | 6.360 | 0.002 | 0.000 | 0.804 | 0.871 | 2.467 | 0.018 | n/a | 0.069 | 47.132 | n/a | n/a | 0.048 | 7.166 | 0.124 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.583ms; driver.publication 1.330ms |
| 7bb3dcfb489c8bcc0000000000000b24 | 57.096 | 7.781 | 0.009 | 0.000 | 36.881 | 0.717 | 1.290 | 0.026 | n/a | 0.379 | 9.978 | n/a | n/a | 0.036 | 44.671 | 0.782 | 0.036 | node-14/thread-0/driver.queue.subject | driver.publication 2.442ms; driver.publication 1.401ms; driver.publication 1.311ms; driver.publication 1.097ms; driver.expected-state.bind-receipt 1.092ms |
| 7bb3dcfb489c8bcc000000000000124e | 56.682 | 4.723 | 0.067 | 0.000 | 0.803 | 0.496 | 0.527 | 0.010 | n/a | 0.016 | 49.969 | n/a | n/a | 0.073 | 5.593 | 0.099 | 0.073 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 2.374ms; driver.expected-state.bind-receipt 1.901ms; driver.expected-state.bind-receipt 1.322ms; driver.publication 1.262ms; driver.publication 1.216ms |
| 7bb3dcfb489c8bcc000000000000141f | 56.514 | 4.162 | 0.003 | 0.000 | 0.718 | 1.955 | 1.603 | 0.042 | n/a | 0.393 | 47.608 | n/a | n/a | 0.031 | 4.882 | 0.086 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000010b4 | 56.503 | 2.802 | 0.005 | 0.000 | 46.585 | 0.600 | 1.245 | 0.037 | n/a | 0.288 | 4.883 | n/a | n/a | 0.058 | 49.392 | 0.874 | 0.058 | node-14/thread-0/driver.queue.subject | driver.publication 3.745ms; driver.publication 1.763ms; driver.publication 1.389ms; driver.publication 1.282ms; driver.publication 1.217ms |
| 7bb3dcfb489c8bcc00000000000010af | 54.823 | 6.477 | 0.010 | 0.000 | 0.760 | 0.969 | 1.046 | 0.031 | n/a | 0.426 | 45.034 | n/a | n/a | 0.071 | 7.247 | 0.132 | 0.071 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.745ms; driver.publication 1.389ms |

## P2 / tail / commit / 5-10 facts (1556 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.663 | 0.584 | 0.000 | 1.470 | 3.085 | 0.004 | 0.000 | 0.726 | 0.680 | 0.905 | 0.026 | n/a | 0.097 | 4.809 | n/a | n/a | 0.032 | 3.955 | 0.353 | 0.032 |
| p99 | 49.546 | 2.202 | 0.048 | 4.371 | 8.072 | 0.169 | 0.000 | 15.018 | 10.384 | 4.622 | 1.435 | n/a | 2.393 | 35.711 | n/a | n/a | 0.091 | 18.449 | 0.737 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7bb3dcfb489c8bcc0000000000001148 | 78.193 | 22.396 | 0.008 | 0.000 | 37.726 | 5.656 | 2.475 | 0.141 | n/a | 0.145 | 9.526 | n/a | n/a | 0.120 | 60.130 | 0.769 | 0.120 | node-14/thread-0/driver.queue.subject | driver.publication 1.979ms; driver.publication 1.442ms; driver.publication 1.269ms; driver.expected-state.bind-receipt 1.067ms |
| 7bb3dcfb489c8bcc0000000000001900 | 71.385 | 8.100 | 0.008 | 0.000 | 0.462 | 10.272 | 2.738 | 0.081 | n/a | 0.165 | 49.521 | n/a | n/a | 0.040 | 8.570 | 0.120 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.672ms; driver.publication 1.239ms; driver.publication 1.148ms; driver.publication 1.098ms |
| 7bb3dcfb489c8bcc0000000000000b1f | 70.813 | 4.820 | 0.003 | 0.000 | 40.347 | 13.887 | 0.771 | 0.030 | n/a | 0.296 | 10.617 | n/a | n/a | 0.042 | 45.170 | 0.638 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 1.311ms; driver.publication 1.097ms; driver.expected-state.bind-receipt 1.092ms; driver.publication 1.086ms; driver.publication 1.022ms |
| 7bb3dcfb489c8bcc00000000000009d8 | 66.130 | 4.845 | 0.002 | 0.000 | 2.436 | 4.236 | 0.904 | 0.814 | n/a | 0.012 | 52.841 | n/a | n/a | 0.040 | 7.283 | 0.110 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.583ms; driver.expected-state.bind-receipt 1.644ms; driver.publication 1.330ms; driver.publication 1.093ms |
| 7bb3dcfb489c8bcc00000000000018ff | 58.441 | 2.914 | 0.004 | 0.000 | 0.737 | 5.726 | 0.577 | 0.022 | n/a | 0.053 | 48.377 | n/a | n/a | 0.031 | 3.656 | 0.063 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 3.672ms |
| 7bb3dcfb489c8bcc00000000000018fe | 58.125 | 6.292 | 0.005 | 0.000 | 0.638 | 0.675 | 1.067 | 0.029 | n/a | 0.087 | 49.280 | n/a | n/a | 0.052 | 6.935 | 0.119 | 0.052 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc000000000000124e | 56.682 | 4.723 | 0.067 | 0.000 | 0.803 | 0.496 | 0.527 | 0.010 | n/a | 0.016 | 49.969 | n/a | n/a | 0.073 | 5.593 | 0.099 | 0.073 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 2.374ms; driver.expected-state.bind-receipt 1.901ms; driver.expected-state.bind-receipt 1.322ms; driver.publication 1.262ms; driver.publication 1.216ms |
| 7bb3dcfb489c8bcc000000000000141f | 56.514 | 4.162 | 0.003 | 0.000 | 0.718 | 1.955 | 1.603 | 0.042 | n/a | 0.393 | 47.608 | n/a | n/a | 0.031 | 4.882 | 0.086 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7bb3dcfb489c8bcc00000000000010b4 | 56.503 | 2.802 | 0.005 | 0.000 | 46.585 | 0.600 | 1.245 | 0.037 | n/a | 0.288 | 4.883 | n/a | n/a | 0.058 | 49.392 | 0.874 | 0.058 | node-14/thread-0/driver.queue.subject | driver.publication 3.745ms; driver.publication 1.763ms; driver.publication 1.389ms; driver.publication 1.282ms; driver.publication 1.217ms |
| 7bb3dcfb489c8bcc00000000000010af | 54.823 | 6.477 | 0.010 | 0.000 | 0.760 | 0.969 | 1.046 | 0.031 | n/a | 0.426 | 45.034 | n/a | n/a | 0.071 | 7.247 | 0.132 | 0.071 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.745ms; driver.publication 1.389ms |
| 7bb3dcfb489c8bcc00000000000009de | 54.658 | 6.781 | 0.011 | 0.000 | 0.857 | 1.091 | 1.881 | 0.051 | n/a | 0.124 | 43.815 | n/a | n/a | 0.047 | 7.650 | 0.140 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.644ms; driver.expected-state.bind-receipt 1.450ms; driver.publication 1.382ms; driver.publication 1.234ms; driver.publication 1.217ms |
| 7bb3dcfb489c8bcc000000000000124d | 53.934 | 4.365 | 0.004 | 0.000 | 1.202 | 0.730 | 0.656 | 0.015 | n/a | 0.031 | 46.903 | n/a | n/a | 0.029 | 5.572 | 0.103 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 2.374ms; driver.expected-state.bind-receipt 1.901ms; driver.expected-state.bind-receipt 1.322ms; driver.publication 1.262ms; driver.publication 1.137ms |
| 7bb3dcfb489c8bcc0000000000000f62 | 53.794 | 2.428 | 0.004 | 0.000 | 1.064 | 10.572 | 1.134 | 0.054 | n/a | 0.314 | 38.192 | n/a | n/a | 0.032 | 3.496 | 0.065 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.565ms; driver.publication 1.067ms |
| 7bb3dcfb489c8bcc000000000000120e | 52.909 | 3.682 | 0.005 | 0.000 | 1.832 | 2.437 | 1.635 | 26.142 | n/a | 0.164 | 16.983 | n/a | n/a | 0.029 | 5.519 | 0.104 | 0.029 | gw-w/thread-46/gateway.commit-order-wait | driver.expected-state.bind-receipt 2.097ms; driver.publication 1.525ms |
| 7bb3dcfb489c8bcc00000000000009dd | 52.475 | 2.735 | 0.005 | 0.000 | 1.030 | 1.201 | 1.077 | 0.023 | n/a | 0.272 | 46.102 | n/a | n/a | 0.029 | 3.770 | 0.072 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.644ms; driver.expected-state.bind-receipt 1.450ms; driver.publication 1.382ms; driver.publication 1.234ms; driver.publication 1.217ms |
| 7bb3dcfb489c8bcc00000000000011b7 | 49.546 | 2.468 | 0.003 | 0.000 | 35.026 | 5.861 | 0.669 | 0.039 | n/a | 0.094 | 5.362 | n/a | n/a | 0.027 | 37.496 | 0.757 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 2.969ms; driver.publication 2.131ms; driver.expected-state.bind-receipt 1.177ms; driver.publication 1.125ms; driver.expected-state.bind-receipt 1.013ms |
| 7bb3dcfb489c8bcc00000000000010b0 | 49.077 | 6.270 | 0.011 | 0.000 | 0.391 | 3.783 | 3.544 | 0.019 | n/a | 0.277 | 34.704 | n/a | n/a | 0.078 | 6.673 | 0.136 | 0.078 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 3.745ms; driver.publication 1.763ms; driver.publication 1.389ms |
| 7bb3dcfb489c8bcc0000000000000dbb | 47.539 | 3.970 | 0.055 | 0.000 | 0.881 | 0.383 | 0.715 | 0.328 | n/a | 0.395 | 40.784 | n/a | n/a | 0.028 | 4.906 | 0.103 | 0.028 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 3.345ms; driver.publication 0.301ms |
| 7bb3dcfb489c8bcc0000000000000dbc | 47.371 | 2.748 | 0.001 | 0.000 | 0.134 | 2.578 | 0.376 | 0.282 | n/a | 0.148 | 41.079 | n/a | n/a | 0.024 | 2.883 | 0.061 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.345ms; driver.publication 1.198ms |
| 7bb3dcfb489c8bcc000000000000114f | 47.095 | 6.799 | 0.005 | 0.000 | 2.541 | 6.632 | 3.933 | 0.594 | n/a | 0.208 | 26.271 | n/a | n/a | 0.111 | 9.345 | 0.198 | 0.111 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 17.373ms; driver.publication 2.853ms; driver.publication 1.571ms; driver.expected-state.bind-receipt 1.149ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.116 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 200.597 | 0.011 | n/a | 0.034 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 |
| p99 | 390.147 | n/a | n/a | n/a | 19.287 | n/a | 2.341 | 0.000 | 7.580 | 376.162 | 0.193 | n/a | 0.219 | 0.000 | n/a | n/a | 41.726 | 21.627 | 0.252 | 41.726 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf800000000000000002 | 390.147 | 7.058 | n/a | 0.000 | 0.000 | 6.232 | 376.162 | 0.193 | n/a | 0.124 | 0.000 | n/a | n/a | 0.379 | 7.058 | 0.018 | 0.379 | gw-r/thread-47/gateway.admitted-work | none observed |
| 987b0c44214a5a150000000000000007 | 204.865 | 0.000 | n/a | 0.000 | 0.000 | 1.164 | 203.070 | 0.077 | n/a | 0.219 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000006 | 204.431 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 202.906 | 0.013 | n/a | 0.132 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000005 | 202.862 | 0.000 | n/a | 0.000 | 0.000 | 0.790 | 201.439 | 0.028 | n/a | 0.144 | 0.000 | n/a | n/a | 0.461 | 0.000 | 0.000 | 0.461 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000f2d | 201.551 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 200.643 | 0.012 | n/a | 0.044 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000f2e | 201.116 | 0.000 | n/a | 0.000 | 0.000 | 0.399 | 200.597 | 0.009 | n/a | 0.034 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000f2c | 201.055 | 0.000 | n/a | 0.000 | 0.000 | 0.402 | 200.476 | 0.011 | n/a | 0.024 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000f31 | 88.331 | 19.287 | n/a | 2.341 | 0.000 | 5.112 | 61.401 | 0.004 | n/a | 0.004 | 0.000 | n/a | n/a | 0.182 | 21.627 | 0.245 | 0.182 | gw-r/thread-45/gateway.admitted-work | none observed |
| 987b0c44214a5a150000000000000f33 | 62.239 | 14.069 | n/a | 1.602 | 0.000 | 4.842 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.726 | 15.671 | 0.252 | 41.726 | node-14/thread-4/socket.wait-first-byte | none observed |
| 987b0c44214a5a150000000000000f32 | 62.036 | 14.730 | n/a | 0.000 | 0.000 | 7.580 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.727 | 14.730 | 0.237 | 39.727 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 872.263 | n/a | n/a | n/a | 0.316 | n/a | 0.000 | 0.000 | 1.166 | 832.978 | 0.012 | n/a | 0.122 | 0.000 | n/a | n/a | 0.703 | 0.316 | 0.000 | 0.703 |
| p99 | 1004.974 | n/a | n/a | n/a | 37.277 | n/a | 0.000 | 0.000 | 1.800 | 1000.912 | 0.017 | n/a | 0.588 | 0.000 | n/a | n/a | 1.345 | 37.277 | 0.043 | 1.345 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf8000000000000000a4 | 1004.974 | 0.316 | n/a | 0.000 | 0.000 | 1.800 | 1000.912 | 0.012 | n/a | 0.588 | 0.000 | n/a | n/a | 1.345 | 0.316 | 0.000 | 1.345 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000a5 | 872.263 | 37.277 | n/a | 0.000 | 0.000 | 1.166 | 832.978 | 0.017 | n/a | 0.122 | 0.000 | n/a | n/a | 0.703 | 37.277 | 0.043 | 0.703 | gw-r/thread-61/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 407.312 | n/a | n/a | n/a | 3.521 | n/a | 0.000 | 0.000 | 0.783 | 402.230 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 0.113 | 3.521 | 0.007 | 0.113 |
| p99 | 1009.716 | n/a | n/a | n/a | 9.064 | n/a | 0.000 | 0.000 | 5.176 | 1002.341 | 0.089 | n/a | 0.163 | 0.000 | n/a | n/a | 4.653 | 9.064 | 0.351 | 4.653 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf8000000000000000cf | 1009.716 | 6.185 | n/a | 0.000 | 0.000 | 0.943 | 1002.341 | 0.019 | n/a | 0.136 | 0.000 | n/a | n/a | 0.092 | 6.185 | 0.006 | 0.092 | gw-r/thread-44/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000b4 | 1002.434 | 5.589 | n/a | 0.000 | 0.000 | 1.057 | 995.449 | 0.015 | n/a | 0.106 | 0.000 | n/a | n/a | 0.219 | 5.589 | 0.006 | 0.219 | gw-r/thread-44/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000bb | 997.906 | 2.591 | n/a | 0.000 | 0.000 | 5.176 | 989.939 | 0.018 | n/a | 0.092 | 0.000 | n/a | n/a | 0.090 | 2.591 | 0.003 | 0.090 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000ba | 994.520 | 7.414 | n/a | 0.000 | 0.000 | 0.721 | 986.120 | 0.011 | n/a | 0.100 | 0.000 | n/a | n/a | 0.154 | 7.414 | 0.007 | 0.154 | gw-r/thread-44/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000ae | 987.878 | 2.568 | n/a | 0.000 | 0.000 | 0.559 | 984.488 | 0.015 | n/a | 0.093 | 0.000 | n/a | n/a | 0.156 | 2.568 | 0.003 | 0.156 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000ab | 812.406 | 5.296 | n/a | 0.000 | 0.000 | 0.783 | 806.020 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.208 | 5.296 | 0.007 | 0.208 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000c1 | 776.355 | 9.064 | n/a | 0.000 | 0.000 | 0.892 | 766.101 | 0.023 | n/a | 0.129 | 0.000 | n/a | n/a | 0.147 | 9.064 | 0.012 | 0.147 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000a8 | 739.550 | 3.561 | n/a | 0.000 | 0.000 | 1.073 | 734.622 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.205 | 3.561 | 0.005 | 0.205 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000b3 | 707.237 | 2.864 | n/a | 0.000 | 0.000 | 3.656 | 700.541 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.078 | 2.864 | 0.004 | 0.078 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000c5 | 674.919 | 2.332 | n/a | 0.000 | 0.000 | 0.533 | 671.902 | 0.013 | n/a | 0.066 | 0.000 | n/a | n/a | 0.074 | 2.332 | 0.003 | 0.074 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000c9 | 646.958 | 2.718 | n/a | 0.000 | 0.000 | 0.892 | 643.143 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.078 | 2.718 | 0.004 | 0.078 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000ca | 613.598 | 4.212 | n/a | 0.000 | 0.000 | 0.736 | 608.473 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.087 | 4.212 | 0.007 | 0.087 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000c0 | 611.497 | 5.030 | n/a | 0.000 | 0.000 | 3.078 | 603.126 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.186 | 5.030 | 0.008 | 0.186 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000b6 | 439.184 | 2.710 | n/a | 0.000 | 0.000 | 0.738 | 435.496 | 0.089 | n/a | 0.064 | 0.000 | n/a | n/a | 0.087 | 2.710 | 0.006 | 0.087 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000a7 | 407.312 | 3.649 | n/a | 0.000 | 0.000 | 1.115 | 402.230 | 0.020 | n/a | 0.155 | 0.000 | n/a | n/a | 0.143 | 3.649 | 0.009 | 0.143 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000c4 | 390.572 | 2.283 | n/a | 0.000 | 0.000 | 0.626 | 387.476 | 0.042 | n/a | 0.067 | 0.000 | n/a | n/a | 0.077 | 2.283 | 0.006 | 0.077 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000b8 | 370.394 | 2.539 | n/a | 0.000 | 0.000 | 0.522 | 367.168 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.081 | 2.539 | 0.007 | 0.081 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000b1 | 288.695 | 5.276 | n/a | 0.000 | 0.000 | 0.546 | 282.588 | 0.036 | n/a | 0.136 | 0.000 | n/a | n/a | 0.113 | 5.276 | 0.018 | 0.113 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000c7 | 284.612 | 3.521 | n/a | 0.000 | 0.000 | 1.599 | 279.276 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.136 | 3.521 | 0.012 | 0.136 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000cb | 280.788 | 2.556 | n/a | 0.000 | 0.000 | 0.662 | 277.327 | 0.027 | n/a | 0.139 | 0.000 | n/a | n/a | 0.076 | 2.556 | 0.009 | 0.076 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 436.590 | n/a | n/a | n/a | 3.751 | n/a | 0.590 | 0.000 | 0.883 | 431.395 | 0.013 | n/a | 0.070 | 0.000 | n/a | n/a | 0.128 | 4.344 | 0.014 | 0.128 |
| p99 | 1003.315 | n/a | n/a | n/a | 15.206 | n/a | 2.053 | 0.000 | 4.031 | 1001.119 | 0.042 | n/a | 0.162 | 0.000 | n/a | n/a | 49.151 | 16.070 | 0.507 | 49.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf800000000000000103 | 1003.315 | 0.199 | n/a | 0.000 | 0.000 | 0.688 | 1001.119 | 0.042 | n/a | 0.116 | 0.000 | n/a | n/a | 1.151 | 0.199 | 0.000 | 1.151 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000d0 | 1000.407 | 13.458 | n/a | 0.874 | 0.000 | 1.011 | 984.796 | 0.018 | n/a | 0.101 | 0.000 | n/a | n/a | 0.149 | 14.332 | 0.014 | 0.149 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000ff | 999.719 | 3.089 | n/a | 0.000 | 0.000 | 0.859 | 995.505 | 0.030 | n/a | 0.161 | 0.000 | n/a | n/a | 0.076 | 3.089 | 0.003 | 0.076 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf80000000000000010c | 998.939 | 3.537 | n/a | 0.000 | 0.000 | 0.958 | 994.286 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.071 | 3.537 | 0.004 | 0.071 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000d7 | 997.194 | 7.755 | n/a | 0.790 | 0.000 | 1.064 | 987.291 | 0.014 | n/a | 0.055 | 0.000 | n/a | n/a | 0.224 | 8.545 | 0.009 | 0.224 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000d1 | 996.541 | 5.002 | n/a | 0.691 | 0.000 | 0.623 | 990.037 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.101 | 5.693 | 0.006 | 0.101 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000dd | 991.925 | 3.311 | n/a | 0.523 | 0.000 | 1.056 | 986.828 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.126 | 3.834 | 0.004 | 0.126 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000d8 | 991.690 | 3.751 | n/a | 0.592 | 0.000 | 0.888 | 986.255 | 0.015 | n/a | 0.095 | 0.000 | n/a | n/a | 0.094 | 4.344 | 0.004 | 0.094 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000fc | 953.636 | 7.961 | n/a | 0.842 | 0.000 | 1.012 | 943.569 | 0.038 | n/a | 0.085 | 0.000 | n/a | n/a | 0.129 | 8.803 | 0.009 | 0.129 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000dc | 902.807 | 3.117 | n/a | 0.622 | 0.000 | 0.686 | 898.218 | 0.015 | n/a | 0.068 | 0.000 | n/a | n/a | 0.081 | 3.739 | 0.004 | 0.081 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000e3 | 854.115 | 3.517 | n/a | 1.958 | 0.000 | 1.052 | 847.407 | 0.016 | n/a | 0.087 | 0.000 | n/a | n/a | 0.078 | 5.475 | 0.006 | 0.078 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000de | 784.407 | 4.248 | n/a | 0.525 | 0.000 | 0.782 | 778.641 | 0.016 | n/a | 0.090 | 0.000 | n/a | n/a | 0.104 | 4.773 | 0.006 | 0.104 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf800000000000000100 | 766.257 | 4.022 | n/a | 0.837 | 0.000 | 0.624 | 760.458 | 0.019 | n/a | 0.110 | 0.000 | n/a | n/a | 0.187 | 4.859 | 0.006 | 0.187 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000da | 632.299 | 3.302 | n/a | 0.664 | 0.000 | 3.010 | 625.172 | 0.012 | n/a | 0.064 | 0.000 | n/a | n/a | 0.075 | 3.965 | 0.006 | 0.075 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000e9 | 627.729 | 5.591 | n/a | 0.696 | 0.000 | 0.572 | 620.672 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.136 | 6.286 | 0.010 | 0.136 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000e6 | 604.542 | 8.889 | n/a | 1.883 | 0.000 | 0.997 | 592.508 | 0.021 | n/a | 0.132 | 0.000 | n/a | n/a | 0.114 | 10.772 | 0.018 | 0.114 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000f9 | 572.757 | 4.574 | n/a | 0.000 | 0.000 | 4.031 | 563.950 | 0.030 | n/a | 0.087 | 0.000 | n/a | n/a | 0.085 | 4.574 | 0.008 | 0.085 | gw-r/thread-44/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000d9 | 475.812 | 6.336 | n/a | 1.265 | 0.000 | 3.094 | 464.896 | 0.013 | n/a | 0.070 | 0.000 | n/a | n/a | 0.137 | 7.600 | 0.016 | 0.137 | gw-r/thread-44/journal/page | none observed |
| c69fb3eea3a5bf800000000000000106 | 463.437 | 15.206 | n/a | 0.864 | 0.000 | 1.330 | 445.728 | 0.015 | n/a | 0.125 | 0.000 | n/a | n/a | 0.169 | 16.070 | 0.035 | 0.169 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000000d4 | 441.518 | 6.134 | n/a | 0.741 | 0.000 | 0.804 | 433.579 | 0.034 | n/a | 0.119 | 0.000 | n/a | n/a | 0.106 | 6.876 | 0.016 | 0.106 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 394.673 | n/a | n/a | n/a | 3.703 | n/a | 0.000 | 0.000 | 0.749 | 387.759 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.111 | 3.742 | 0.011 | 0.111 |
| p99 | 1004.278 | n/a | n/a | n/a | 14.575 | n/a | 1.034 | 0.000 | 3.689 | 1001.113 | 0.043 | n/a | 0.245 | 0.000 | n/a | n/a | 47.394 | 15.426 | 0.501 | 47.394 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf800000000000000113 | 1004.278 | 3.131 | n/a | 0.611 | 0.000 | 0.410 | 999.958 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.104 | 3.742 | 0.004 | 0.104 | gw-r/thread-44/journal/page | none observed |
| c69fb3eea3a5bf800000000000000137 | 1003.288 | 0.147 | n/a | 0.000 | 0.000 | 0.819 | 1001.113 | 0.043 | n/a | 0.056 | 0.000 | n/a | n/a | 1.111 | 0.147 | 0.000 | 1.111 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf800000000000000129 | 1002.964 | 0.171 | n/a | 0.000 | 0.000 | 0.784 | 1000.767 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 1.153 | 0.171 | 0.000 | 1.153 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf80000000000000011b | 1002.427 | 0.122 | n/a | 0.000 | 0.000 | 0.422 | 1000.681 | 0.020 | n/a | 0.077 | 0.000 | n/a | n/a | 1.105 | 0.122 | 0.000 | 1.105 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000000125 | 1001.279 | 3.494 | n/a | 0.000 | 0.000 | 1.302 | 996.090 | 0.008 | n/a | 0.245 | 0.000 | n/a | n/a | 0.140 | 3.494 | 0.003 | 0.140 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf80000000000000012b | 997.520 | 3.629 | n/a | 0.000 | 0.000 | 0.685 | 993.032 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.099 | 3.629 | 0.004 | 0.099 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000000141 | 907.493 | 3.829 | n/a | 0.000 | 0.000 | 0.684 | 902.785 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.108 | 3.829 | 0.004 | 0.108 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf80000000000000013d | 855.550 | 5.830 | n/a | 0.000 | 0.000 | 0.803 | 848.647 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.195 | 5.830 | 0.007 | 0.195 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf800000000000000110 | 791.013 | 4.947 | n/a | 0.955 | 0.000 | 0.782 | 784.077 | 0.030 | n/a | 0.115 | 0.000 | n/a | n/a | 0.107 | 5.902 | 0.007 | 0.107 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf800000000000000149 | 767.485 | 6.675 | n/a | 0.000 | 0.000 | 1.281 | 759.197 | 0.024 | n/a | 0.075 | 0.000 | n/a | n/a | 0.232 | 6.675 | 0.009 | 0.232 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf800000000000000133 | 731.287 | 5.443 | n/a | 0.000 | 0.000 | 0.924 | 724.689 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.169 | 5.443 | 0.007 | 0.169 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000000126 | 721.946 | 9.384 | n/a | 0.000 | 0.000 | 0.898 | 711.391 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.194 | 9.384 | 0.013 | 0.194 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000000123 | 710.058 | 4.164 | n/a | 0.000 | 0.000 | 1.337 | 704.299 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.189 | 4.164 | 0.006 | 0.189 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf80000000000000011d | 686.131 | 3.314 | n/a | 0.000 | 0.000 | 1.347 | 681.269 | 0.015 | n/a | 0.111 | 0.000 | n/a | n/a | 0.076 | 3.314 | 0.005 | 0.076 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf80000000000000012d | 675.606 | 2.748 | n/a | 0.000 | 0.000 | 0.525 | 672.170 | 0.015 | n/a | 0.076 | 0.000 | n/a | n/a | 0.073 | 2.748 | 0.004 | 0.073 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000000134 | 655.851 | 2.421 | n/a | 0.000 | 0.000 | 0.835 | 652.453 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.073 | 2.421 | 0.004 | 0.073 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf80000000000000010d | 647.477 | 2.986 | n/a | 0.660 | 0.000 | 1.633 | 642.035 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.094 | 3.647 | 0.006 | 0.094 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000000142 | 587.397 | 7.059 | n/a | 0.905 | 0.000 | 1.137 | 578.078 | 0.015 | n/a | 0.082 | 0.000 | n/a | n/a | 0.121 | 7.964 | 0.014 | 0.121 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000000139 | 534.753 | 14.575 | n/a | 0.851 | 0.000 | 0.749 | 518.286 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.216 | 15.426 | 0.029 | 0.216 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf80000000000000013a | 461.871 | 2.975 | n/a | 0.000 | 0.000 | 3.430 | 455.329 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.068 | 2.975 | 0.006 | 0.068 | gw-r/thread-61/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 368.586 | n/a | n/a | n/a | 2.814 | n/a | 0.000 | 0.000 | 0.736 | 365.537 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.095 | 2.842 | 0.009 | 0.095 |
| p99 | 1004.480 | n/a | n/a | n/a | 8.430 | n/a | 2.952 | 0.000 | 5.515 | 1001.359 | 0.152 | n/a | 0.127 | 0.000 | n/a | n/a | 31.829 | 8.430 | 0.448 | 31.829 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf80000000000000017e | 1004.480 | 0.147 | n/a | 0.000 | 0.000 | 1.896 | 1001.243 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 1.109 | 0.147 | 0.000 | 1.109 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000000164 | 1003.233 | 0.119 | n/a | 0.000 | 0.000 | 0.525 | 1001.359 | 0.010 | n/a | 0.127 | 0.000 | n/a | n/a | 1.092 | 0.119 | 0.000 | 1.092 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000000186 | 1002.229 | 0.104 | n/a | 0.000 | 0.000 | 0.361 | 1000.618 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 1.096 | 0.104 | 0.000 | 1.096 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf800000000000000154 | 1001.808 | 3.663 | n/a | 0.000 | 0.000 | 2.195 | 995.755 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.095 | 3.663 | 0.004 | 0.095 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf80000000000000016e | 999.991 | 2.442 | n/a | 2.952 | 0.000 | 0.741 | 993.696 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.089 | 5.395 | 0.005 | 0.089 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000000174 | 992.213 | 2.574 | n/a | 0.000 | 0.000 | 2.470 | 987.025 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.083 | 2.574 | 0.003 | 0.083 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf800000000000000185 | 987.429 | 2.799 | n/a | 0.000 | 0.000 | 2.165 | 982.325 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.063 | 2.799 | 0.003 | 0.063 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000000159 | 856.824 | 6.237 | n/a | 0.000 | 0.000 | 0.672 | 849.660 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.191 | 6.237 | 0.007 | 0.191 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf800000000000000179 | 830.677 | 3.925 | n/a | 0.000 | 0.000 | 0.736 | 825.899 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.076 | 3.925 | 0.005 | 0.076 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000000155 | 710.624 | 2.381 | n/a | 0.000 | 0.000 | 0.771 | 707.281 | 0.031 | n/a | 0.080 | 0.000 | n/a | n/a | 0.080 | 2.381 | 0.003 | 0.080 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf80000000000000016d | 663.735 | 2.532 | n/a | 0.000 | 0.000 | 0.777 | 660.296 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.073 | 2.532 | 0.004 | 0.073 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000000184 | 662.152 | 4.079 | n/a | 0.000 | 0.000 | 0.516 | 657.405 | 0.018 | n/a | 0.066 | 0.000 | n/a | n/a | 0.069 | 4.079 | 0.006 | 0.069 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf800000000000000176 | 637.069 | 2.350 | n/a | 0.000 | 0.000 | 0.798 | 633.761 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.068 | 2.350 | 0.004 | 0.068 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf800000000000000189 | 627.915 | 7.040 | n/a | 0.712 | 0.000 | 0.488 | 619.454 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 0.156 | 7.753 | 0.012 | 0.156 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000000171 | 611.957 | 5.135 | n/a | 0.000 | 0.000 | 0.961 | 605.603 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.189 | 5.135 | 0.008 | 0.189 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf80000000000000017c | 609.721 | 2.565 | n/a | 0.000 | 0.000 | 0.442 | 606.486 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.169 | 2.565 | 0.004 | 0.169 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf80000000000000014f | 569.301 | 3.339 | n/a | 0.000 | 0.000 | 0.511 | 565.300 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.092 | 3.339 | 0.006 | 0.092 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000000166 | 505.449 | 6.909 | n/a | 0.000 | 0.000 | 0.746 | 497.535 | 0.019 | n/a | 0.037 | 0.000 | n/a | n/a | 0.203 | 6.909 | 0.014 | 0.203 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000000167 | 487.090 | 3.647 | n/a | 0.000 | 0.000 | 1.560 | 481.731 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.079 | 3.647 | 0.007 | 0.079 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000000152 | 413.384 | 2.629 | n/a | 0.000 | 0.000 | 0.856 | 409.673 | 0.028 | n/a | 0.121 | 0.000 | n/a | n/a | 0.077 | 2.629 | 0.006 | 0.077 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 326.481 | n/a | n/a | n/a | 3.812 | n/a | 0.000 | 0.000 | 0.585 | 318.716 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.120 | 3.812 | 0.010 | 0.120 |
| p99 | 1005.593 | n/a | n/a | n/a | 12.429 | n/a | 0.807 | 0.000 | 3.361 | 1001.470 | 0.331 | n/a | 4.174 | 0.000 | n/a | n/a | 42.965 | 12.429 | 0.335 | 42.965 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf8000000000000001c5 | 1005.593 | 3.356 | n/a | 0.000 | 0.000 | 0.585 | 1001.470 | 0.012 | n/a | 0.062 | 0.000 | n/a | n/a | 0.107 | 3.356 | 0.003 | 0.107 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001a7 | 1003.361 | 4.504 | n/a | 0.000 | 0.000 | 0.795 | 997.791 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.207 | 4.504 | 0.004 | 0.207 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf80000000000000018b | 1003.163 | 0.184 | n/a | 0.000 | 0.000 | 0.575 | 1001.160 | 0.016 | n/a | 0.071 | 0.000 | n/a | n/a | 1.156 | 0.184 | 0.000 | 1.156 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001a8 | 1000.901 | 2.827 | n/a | 0.000 | 0.000 | 0.560 | 997.382 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.086 | 2.827 | 0.003 | 0.086 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf80000000000000019b | 987.544 | 2.585 | n/a | 0.000 | 0.000 | 2.121 | 982.649 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.139 | 2.585 | 0.003 | 0.139 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001c4 | 984.889 | 6.281 | n/a | 0.000 | 0.000 | 0.743 | 977.565 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.257 | 6.281 | 0.006 | 0.257 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001a6 | 969.285 | 6.525 | n/a | 0.000 | 0.000 | 1.041 | 961.456 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.186 | 6.525 | 0.007 | 0.186 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001c2 | 845.279 | 5.468 | n/a | 0.000 | 0.000 | 0.868 | 838.692 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.182 | 5.468 | 0.006 | 0.182 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf80000000000000019e | 782.395 | 4.855 | n/a | 0.000 | 0.000 | 0.622 | 776.742 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.127 | 4.855 | 0.006 | 0.127 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001d5 | 713.172 | 2.193 | n/a | 0.000 | 0.000 | 0.648 | 710.160 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 0.099 | 2.193 | 0.003 | 0.099 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001b7 | 705.776 | 4.948 | n/a | 0.000 | 0.000 | 0.528 | 700.050 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.203 | 4.948 | 0.007 | 0.203 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001cf | 641.295 | 4.429 | n/a | 0.000 | 0.000 | 0.388 | 636.241 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.173 | 4.429 | 0.007 | 0.173 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001a1 | 608.549 | 5.807 | n/a | 0.000 | 0.000 | 2.244 | 600.341 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.100 | 5.807 | 0.010 | 0.100 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001ba | 590.859 | 3.812 | n/a | 0.000 | 0.000 | 0.533 | 586.308 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.148 | 3.812 | 0.006 | 0.148 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001c6 | 565.726 | 3.730 | n/a | 0.000 | 0.000 | 0.538 | 561.298 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.104 | 3.730 | 0.007 | 0.104 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf80000000000000019a | 564.964 | 4.239 | n/a | 0.000 | 0.000 | 0.695 | 559.798 | 0.016 | n/a | 0.081 | 0.000 | n/a | n/a | 0.135 | 4.239 | 0.008 | 0.135 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001b0 | 551.766 | 4.595 | n/a | 0.000 | 0.000 | 0.800 | 546.212 | 0.015 | n/a | 0.049 | 0.000 | n/a | n/a | 0.095 | 4.595 | 0.008 | 0.095 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001d1 | 545.671 | 2.932 | n/a | 0.000 | 0.000 | 0.295 | 542.250 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.097 | 2.932 | 0.005 | 0.097 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001a9 | 538.667 | 4.567 | n/a | 0.000 | 0.000 | 2.066 | 531.861 | 0.013 | n/a | 0.047 | 0.000 | n/a | n/a | 0.112 | 4.567 | 0.008 | 0.112 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001c7 | 402.781 | 10.977 | n/a | 0.807 | 0.000 | 0.698 | 390.008 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.240 | 11.784 | 0.029 | 0.240 | gw-r/thread-42/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 394.639 | n/a | n/a | n/a | 2.742 | n/a | 0.000 | 0.000 | 0.670 | 389.171 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.093 | 2.742 | 0.009 | 0.093 |
| p99 | 1002.979 | n/a | n/a | n/a | 10.682 | n/a | 0.000 | 0.000 | 2.971 | 1000.855 | 2.230 | n/a | 0.342 | 0.000 | n/a | n/a | 24.498 | 10.682 | 0.406 | 24.498 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf800000000000000219 | 1002.979 | 2.477 | n/a | 0.000 | 0.000 | 0.467 | 999.885 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.110 | 2.477 | 0.002 | 0.110 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001fe | 1002.523 | 0.110 | n/a | 0.000 | 0.000 | 0.395 | 1000.855 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 1.098 | 0.110 | 0.000 | 1.098 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000000217 | 1002.401 | 0.118 | n/a | 0.000 | 0.000 | 0.344 | 1000.782 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.108 | 0.118 | 0.000 | 1.108 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf800000000000000212 | 987.978 | 5.045 | n/a | 0.000 | 0.000 | 0.669 | 981.966 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.270 | 5.045 | 0.005 | 0.270 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf800000000000000216 | 987.388 | 2.742 | n/a | 0.000 | 0.000 | 1.615 | 982.922 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.077 | 2.742 | 0.003 | 0.077 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001ea | 984.043 | 3.515 | n/a | 0.000 | 0.000 | 0.670 | 979.710 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.082 | 3.515 | 0.004 | 0.082 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf800000000000000213 | 983.266 | 10.682 | n/a | 0.000 | 0.000 | 0.557 | 971.724 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.271 | 10.682 | 0.011 | 0.271 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf800000000000000207 | 977.186 | 2.612 | n/a | 0.000 | 0.000 | 0.682 | 973.772 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.064 | 2.612 | 0.003 | 0.064 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001f7 | 874.468 | 2.327 | n/a | 0.000 | 0.000 | 0.850 | 871.128 | 0.005 | n/a | 0.073 | 0.000 | n/a | n/a | 0.085 | 2.327 | 0.003 | 0.085 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001f4 | 748.746 | 2.489 | n/a | 0.000 | 0.000 | 0.979 | 745.145 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.085 | 2.489 | 0.003 | 0.085 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf800000000000000200 | 745.478 | 4.512 | n/a | 0.000 | 0.000 | 0.762 | 739.999 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.155 | 4.512 | 0.006 | 0.155 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001e8 | 736.008 | 2.673 | n/a | 0.000 | 0.000 | 0.544 | 732.624 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.111 | 2.673 | 0.004 | 0.111 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf800000000000000203 | 704.450 | 4.587 | n/a | 0.000 | 0.000 | 0.720 | 698.971 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.131 | 4.587 | 0.007 | 0.131 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001f0 | 676.390 | 3.978 | n/a | 0.000 | 0.000 | 1.258 | 670.980 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.152 | 3.978 | 0.006 | 0.152 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001dd | 674.252 | 3.243 | n/a | 0.000 | 0.000 | 2.971 | 667.884 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.094 | 3.243 | 0.005 | 0.094 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001da | 574.671 | 4.097 | n/a | 0.000 | 0.000 | 0.695 | 569.732 | 0.011 | n/a | 0.051 | 0.000 | n/a | n/a | 0.085 | 4.097 | 0.007 | 0.085 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf800000000000000210 | 549.289 | 5.599 | n/a | 0.000 | 0.000 | 0.744 | 542.741 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.161 | 5.599 | 0.010 | 0.161 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001ef | 518.257 | 2.361 | n/a | 0.000 | 0.000 | 0.425 | 515.349 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.078 | 2.361 | 0.005 | 0.078 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001f9 | 484.830 | 5.490 | n/a | 0.000 | 0.000 | 2.243 | 476.924 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.114 | 5.490 | 0.011 | 0.114 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf8000000000000001e1 | 432.168 | 3.877 | n/a | 0.000 | 0.000 | 0.933 | 427.166 | 0.016 | n/a | 0.068 | 0.000 | n/a | n/a | 0.108 | 3.877 | 0.009 | 0.108 | gw-r/thread-43/journal/page | none observed |

## P3 / L1024 / internal (760 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.768 | n/a | n/a | n/a | 3.271 | n/a | 0.000 | 0.000 | 0.252 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.643 | 3.271 | 0.257 | 7.643 |
| p99 | 172.397 | n/a | n/a | n/a | 14.429 | n/a | 1.201 | 0.000 | 1.281 | 169.171 | 0.011 | n/a | 0.048 | 0.000 | n/a | n/a | 47.052 | 14.728 | 0.831 | 47.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf800000000000000225 | 982.784 | 2.577 | n/a | 0.000 | 0.000 | 0.531 | 979.495 | 0.012 | n/a | 0.064 | 0.000 | n/a | n/a | 0.104 | 2.577 | 0.003 | 0.104 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf80000000000000021a | 817.767 | 2.497 | n/a | 0.000 | 0.000 | 0.443 | 814.711 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.073 | 2.497 | 0.003 | 0.073 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000000226 | 805.698 | 2.311 | n/a | 0.000 | 0.000 | 0.568 | 802.647 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.082 | 2.311 | 0.003 | 0.082 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000000222 | 703.605 | 4.798 | n/a | 0.000 | 0.000 | 1.276 | 697.361 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.130 | 4.798 | 0.007 | 0.130 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf80000000000000021d | 667.476 | 2.021 | n/a | 0.000 | 0.000 | 0.329 | 665.034 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.057 | 2.021 | 0.003 | 0.057 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf800000000000000223 | 306.238 | 3.079 | n/a | 0.000 | 0.000 | 0.669 | 302.379 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.070 | 3.079 | 0.010 | 0.070 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf80000000000000021e | 253.301 | 2.027 | n/a | 0.000 | 0.000 | 1.281 | 249.858 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.070 | 2.027 | 0.008 | 0.070 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf80000000000000021b | 172.397 | 2.329 | n/a | 0.000 | 0.000 | 0.772 | 169.171 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.101 | 2.329 | 0.014 | 0.101 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf8000000000000004ec | 122.249 | 12.612 | n/a | 1.112 | 0.000 | 1.021 | 107.285 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.183 | 13.723 | 0.112 | 0.183 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000000311 | 99.588 | 2.332 | n/a | 0.000 | 0.000 | 0.847 | 96.311 | 0.008 | n/a | 0.019 | 0.000 | n/a | n/a | 0.071 | 2.332 | 0.023 | 0.071 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf80000000000000063c | 98.495 | 8.710 | n/a | 2.103 | 0.000 | 0.680 | 86.777 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.207 | 10.813 | 0.110 | 0.207 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000007a2 | 91.168 | 4.344 | n/a | 0.000 | 0.000 | 0.720 | 85.908 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.159 | 4.344 | 0.048 | 0.159 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf800000000000000220 | 88.890 | 4.503 | n/a | 0.000 | 0.000 | 0.625 | 83.612 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.082 | 4.503 | 0.051 | 0.082 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf80000000000000075d | 86.955 | 2.524 | n/a | 0.000 | 0.000 | 0.302 | 83.957 | 0.107 | n/a | 0.006 | 0.000 | n/a | n/a | 0.058 | 2.524 | 0.029 | 0.058 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf8000000000000005f2 | 86.787 | 4.276 | n/a | 0.000 | 0.000 | 0.621 | 81.800 | 0.002 | n/a | 0.017 | 0.000 | n/a | n/a | 0.071 | 4.276 | 0.049 | 0.071 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf80000000000000046d | 86.645 | 5.430 | n/a | 0.000 | 0.000 | 0.552 | 80.576 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.069 | 5.430 | 0.063 | 0.069 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf8000000000000004f3 | 86.144 | 4.612 | n/a | 0.000 | 0.000 | 0.730 | 80.579 | 0.008 | n/a | 0.022 | 0.000 | n/a | n/a | 0.192 | 4.612 | 0.054 | 0.192 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf8000000000000002f5 | 84.625 | 6.321 | n/a | 0.000 | 0.000 | 0.648 | 77.489 | 0.002 | n/a | 0.027 | 0.000 | n/a | n/a | 0.137 | 6.321 | 0.075 | 0.137 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf80000000000000078f | 79.701 | 8.722 | n/a | 0.000 | 0.000 | 0.478 | 70.339 | 0.003 | n/a | 0.013 | 0.000 | n/a | n/a | 0.146 | 8.722 | 0.109 | 0.146 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000000561 | 76.219 | 9.230 | n/a | 0.000 | 0.000 | 0.547 | 66.285 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.103 | 9.230 | 0.121 | 0.103 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / internal (2293 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.573 | n/a | n/a | n/a | 4.103 | n/a | 0.000 | 0.000 | 0.235 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.329 | 4.126 | 0.337 | 6.329 |
| p99 | 343.383 | n/a | n/a | n/a | 16.605 | n/a | 1.596 | 0.000 | 1.309 | 341.044 | 0.011 | n/a | 0.034 | 0.000 | n/a | n/a | 47.740 | 17.846 | 0.852 | 47.740 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c69fb3eea3a5bf800000000000001aa2 | 1003.324 | 0.094 | n/a | 0.000 | 0.000 | 0.287 | 1001.754 | 0.011 | n/a | 0.045 | 0.000 | n/a | n/a | 1.134 | 0.094 | 0.000 | 1.134 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf800000000000001ae5 | 1002.506 | 0.162 | n/a | 0.000 | 0.000 | 0.456 | 1000.691 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 1.135 | 0.162 | 0.000 | 1.135 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000001a98 | 1002.242 | 0.132 | n/a | 0.000 | 0.000 | 0.362 | 1000.594 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 1.110 | 0.132 | 0.000 | 1.110 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf800000000000001ae1 | 994.138 | 4.325 | n/a | 0.000 | 0.000 | 0.377 | 989.239 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.160 | 4.325 | 0.004 | 0.160 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000001abc | 992.221 | 3.552 | n/a | 0.000 | 0.000 | 0.466 | 988.097 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.069 | 3.552 | 0.004 | 0.069 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf800000000000001add | 980.120 | 3.075 | n/a | 0.000 | 0.000 | 3.670 | 973.264 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.080 | 3.075 | 0.003 | 0.080 | gw-r/thread-42/journal/page | none observed |
| c69fb3eea3a5bf800000000000001a97 | 972.190 | 2.129 | n/a | 0.000 | 0.000 | 0.275 | 969.701 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.056 | 2.129 | 0.002 | 0.056 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000001aad | 927.774 | 6.994 | n/a | 0.000 | 0.000 | 1.589 | 918.845 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.292 | 6.994 | 0.008 | 0.292 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000001a9d | 905.419 | 3.655 | n/a | 0.000 | 0.000 | 0.469 | 901.127 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.136 | 3.655 | 0.004 | 0.136 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000001a9a | 823.995 | 12.319 | n/a | 0.000 | 0.000 | 0.483 | 810.892 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.266 | 12.319 | 0.015 | 0.266 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000001abe | 823.976 | 2.426 | n/a | 0.000 | 0.000 | 0.407 | 821.041 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 0.068 | 2.426 | 0.003 | 0.068 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf800000000000001ade | 738.381 | 5.648 | n/a | 0.000 | 0.000 | 0.579 | 731.908 | 0.014 | n/a | 0.052 | 0.000 | n/a | n/a | 0.180 | 5.648 | 0.008 | 0.180 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf800000000000001ab8 | 709.383 | 1.942 | n/a | 0.000 | 0.000 | 0.343 | 706.994 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.073 | 1.942 | 0.003 | 0.073 | gw-r/thread-61/journal/page | none observed |
| c69fb3eea3a5bf800000000000001ab3 | 660.437 | 3.623 | n/a | 0.000 | 0.000 | 0.484 | 656.240 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.061 | 3.623 | 0.005 | 0.061 | gw-r/thread-40/journal/page | none observed |
| c69fb3eea3a5bf800000000000001aa4 | 562.169 | 3.549 | n/a | 0.000 | 0.000 | 0.522 | 557.979 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.088 | 3.549 | 0.006 | 0.088 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000001ad6 | 558.504 | 2.675 | n/a | 0.000 | 0.000 | 0.382 | 555.351 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.064 | 2.675 | 0.005 | 0.064 | gw-r/thread-43/journal/page | none observed |
| c69fb3eea3a5bf800000000000001ad8 | 551.539 | 3.312 | n/a | 0.000 | 0.000 | 0.687 | 547.403 | 0.008 | n/a | 0.017 | 0.000 | n/a | n/a | 0.112 | 3.312 | 0.006 | 0.112 | gw-r/thread-45/journal/page | none observed |
| c69fb3eea3a5bf800000000000001ac0 | 535.465 | 8.840 | n/a | 1.233 | 0.000 | 0.667 | 524.416 | 0.011 | n/a | 0.034 | 0.000 | n/a | n/a | 0.263 | 10.073 | 0.019 | 0.263 | gw-r/thread-46/journal/page | none observed |
| c69fb3eea3a5bf800000000000001acc | 480.788 | 5.010 | n/a | 0.000 | 0.000 | 0.525 | 475.100 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.123 | 5.010 | 0.010 | 0.123 | gw-r/thread-47/journal/page | none observed |
| c69fb3eea3a5bf800000000000001ad9 | 464.480 | 3.891 | n/a | 0.000 | 0.000 | 0.746 | 459.155 | 0.531 | n/a | 0.040 | 0.000 | n/a | n/a | 0.117 | 3.891 | 0.008 | 0.117 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.625 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 201.174 | 0.016 | n/a | 0.132 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 208.361 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.047 | 207.476 | 5.385 | n/a | 0.349 | 0.000 | n/a | n/a | 0.360 | 0.000 | 0.000 | 0.360 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 987b0c44214a5a150000000000000011 | 208.361 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 207.476 | 0.019 | n/a | 0.129 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000008 | 207.528 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 205.163 | 1.051 | n/a | 0.132 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000058 | 207.488 | 0.000 | n/a | 0.000 | 0.000 | 4.635 | 202.485 | 0.069 | n/a | 0.188 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a15000000000000000f | 207.119 | 0.000 | n/a | 0.000 | 0.000 | 0.892 | 205.888 | 0.030 | n/a | 0.183 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a15000000000000002a | 207.112 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 205.986 | 0.024 | n/a | 0.102 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000019 | 205.997 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 204.677 | 0.012 | n/a | 0.164 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a15000000000000001a | 205.574 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 204.305 | 0.047 | n/a | 0.349 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a15000000000000004c | 205.498 | 0.000 | n/a | 0.000 | 0.000 | 2.331 | 202.892 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000026 | 205.385 | 0.000 | n/a | 0.000 | 0.000 | 1.371 | 203.674 | 0.061 | n/a | 0.165 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000031 | 205.328 | 0.000 | n/a | 0.000 | 0.000 | 1.117 | 203.858 | 0.013 | n/a | 0.134 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a150000000000000009 | 205.242 | 0.000 | n/a | 0.000 | 0.000 | 2.059 | 202.664 | 0.022 | n/a | 0.137 | 0.000 | n/a | n/a | 0.360 | 0.000 | 0.000 | 0.360 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a15000000000000002c | 205.067 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 203.735 | 0.061 | n/a | 0.283 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000035 | 204.993 | 0.000 | n/a | 0.000 | 0.000 | 2.278 | 202.341 | 0.019 | n/a | 0.153 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000042 | 204.945 | 0.000 | n/a | 0.000 | 0.000 | 1.168 | 203.468 | 0.021 | n/a | 0.154 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000012 | 204.714 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 203.420 | 0.030 | n/a | 0.230 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000018 | 204.393 | 0.000 | n/a | 0.000 | 0.000 | 2.254 | 201.712 | 0.018 | n/a | 0.263 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 987b0c44214a5a15000000000000003b | 204.290 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 202.992 | 0.020 | n/a | 0.130 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-44/journal/page | none observed |
| 987b0c44214a5a150000000000000044 | 204.036 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 203.167 | 0.015 | n/a | 0.135 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000056 | 203.606 | 0.000 | n/a | 0.000 | 0.000 | 1.190 | 201.885 | 0.030 | n/a | 0.265 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000025 | 203.595 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 202.383 | 0.059 | n/a | 0.177 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-40/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.312 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 201.036 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |
| p99 | 208.323 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.439 | 204.959 | 35.032 | n/a | 2.491 | 0.000 | n/a | n/a | 0.427 | 0.000 | 0.000 | 0.427 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 987b0c44214a5a1500000000000000be | 208.323 | 0.000 | n/a | 0.000 | 0.000 | 3.877 | 204.124 | 0.017 | n/a | 0.172 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a1500000000000000ba | 207.582 | 0.000 | n/a | 0.000 | 0.000 | 2.234 | 204.959 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.333 | 0.000 | 0.000 | 0.333 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000099 | 207.390 | 0.000 | n/a | 0.000 | 0.000 | 5.108 | 201.954 | 0.041 | n/a | 0.146 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a1500000000000000bd | 206.690 | 0.000 | n/a | 0.000 | 0.000 | 5.439 | 200.990 | 0.010 | n/a | 0.119 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a1500000000000000bf | 205.840 | 0.000 | n/a | 0.000 | 0.000 | 1.413 | 201.874 | 0.028 | n/a | 2.387 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a15000000000000005d | 205.837 | 0.000 | n/a | 0.000 | 0.000 | 4.176 | 201.374 | 0.014 | n/a | 0.126 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-44/journal/page | none observed |
| 987b0c44214a5a15000000000000007d | 205.476 | 0.000 | n/a | 0.000 | 0.000 | 0.574 | 204.679 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a150000000000000088 | 205.293 | 0.000 | n/a | 0.000 | 0.000 | 0.993 | 203.983 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-44/journal/page | none observed |
| 987b0c44214a5a150000000000000080 | 204.703 | 0.000 | n/a | 0.000 | 0.000 | 1.655 | 202.718 | 0.012 | n/a | 0.191 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a1500000000000000b4 | 204.461 | 0.000 | n/a | 0.000 | 0.000 | 2.986 | 201.190 | 0.014 | n/a | 0.129 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a15000000000000008c | 204.320 | 0.000 | n/a | 0.000 | 0.000 | 1.303 | 202.578 | 0.026 | n/a | 0.250 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a1500000000000000b3 | 204.197 | 0.000 | n/a | 0.000 | 0.000 | 1.395 | 202.181 | 0.022 | n/a | 0.171 | 0.000 | n/a | n/a | 0.427 | 0.000 | 0.000 | 0.427 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000077 | 204.191 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 202.767 | 0.037 | n/a | 0.136 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000091 | 204.031 | 0.000 | n/a | 0.000 | 0.000 | 2.377 | 201.259 | 0.075 | n/a | 0.131 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a15000000000000007c | 203.882 | 0.000 | n/a | 0.000 | 0.000 | 2.535 | 201.036 | 0.012 | n/a | 0.153 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 987b0c44214a5a1500000000000000b7 | 203.627 | 0.000 | n/a | 0.000 | 0.000 | 2.180 | 201.066 | 0.010 | n/a | 0.122 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a1500000000000000b9 | 203.457 | 0.000 | n/a | 0.000 | 0.000 | 2.060 | 200.996 | 0.031 | n/a | 0.143 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000075 | 203.418 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 202.440 | 0.026 | n/a | 0.190 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000062 | 203.415 | 0.000 | n/a | 0.000 | 0.000 | 1.098 | 201.906 | 0.014 | n/a | 0.220 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a1500000000000000b5 | 203.410 | 0.000 | n/a | 0.000 | 0.000 | 1.058 | 201.867 | 0.018 | n/a | 0.188 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.234 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 200.994 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 209.189 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.980 | 207.990 | 5.726 | n/a | 0.222 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 987b0c44214a5a1500000000000000da | 209.189 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 207.990 | 0.227 | n/a | 0.115 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-44/journal/page | none observed |
| 987b0c44214a5a1500000000000000d1 | 208.892 | 0.000 | n/a | 0.000 | 0.000 | 5.980 | 202.683 | 0.018 | n/a | 0.089 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000119 | 206.734 | 0.000 | n/a | 0.000 | 0.000 | 5.263 | 201.134 | 0.008 | n/a | 0.121 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a1500000000000000cd | 206.455 | 0.000 | n/a | 0.000 | 0.000 | 4.122 | 202.023 | 0.020 | n/a | 0.149 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000124 | 205.352 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 204.071 | 0.016 | n/a | 0.169 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a1500000000000000f7 | 204.831 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 204.059 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a1500000000000000dd | 204.451 | 0.000 | n/a | 0.000 | 0.000 | 3.050 | 200.993 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-44/journal/page | none observed |
| 987b0c44214a5a1500000000000000fa | 204.417 | 0.000 | n/a | 0.000 | 0.000 | 1.814 | 202.357 | 0.013 | n/a | 0.133 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a1500000000000000c9 | 204.355 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 202.922 | 0.017 | n/a | 0.108 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a1500000000000000c2 | 204.223 | 0.000 | n/a | 0.000 | 0.000 | 2.720 | 201.198 | 0.015 | n/a | 0.159 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000108 | 204.124 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 203.010 | 0.014 | n/a | 0.107 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a1500000000000000ea | 203.712 | 0.000 | n/a | 0.000 | 0.000 | 2.766 | 200.683 | 0.023 | n/a | 0.105 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a1500000000000000c3 | 203.648 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 202.145 | 0.015 | n/a | 0.205 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a1500000000000000f3 | 203.580 | 0.000 | n/a | 0.000 | 0.000 | 0.703 | 200.994 | 1.632 | n/a | 0.119 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000126 | 203.390 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 202.081 | 0.050 | n/a | 0.215 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000113 | 203.376 | 0.000 | n/a | 0.000 | 0.000 | 1.080 | 202.073 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a1500000000000000f6 | 203.311 | 0.000 | n/a | 0.000 | 0.000 | 1.114 | 201.490 | 0.424 | n/a | 0.177 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a1500000000000000f1 | 203.161 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 201.899 | 0.022 | n/a | 0.145 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a1500000000000000f5 | 203.108 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 202.063 | 0.038 | n/a | 0.209 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a1500000000000000ff | 203.037 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 201.694 | 0.034 | n/a | 0.221 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.878 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 200.849 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 207.420 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.311 | 205.511 | 5.958 | n/a | 1.623 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 987b0c44214a5a15000000000000013d | 207.420 | 0.000 | n/a | 0.000 | 0.000 | 1.591 | 205.511 | 0.008 | n/a | 0.120 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000137 | 205.934 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 204.773 | 0.021 | n/a | 0.160 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000152 | 205.922 | 0.000 | n/a | 0.000 | 0.000 | 4.311 | 201.262 | 0.017 | n/a | 0.188 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a15000000000000012c | 205.903 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 204.753 | 0.032 | n/a | 0.137 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000175 | 205.579 | 0.000 | n/a | 0.000 | 0.000 | 4.237 | 201.096 | 0.026 | n/a | 0.071 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000128 | 205.177 | 0.000 | n/a | 0.000 | 0.000 | 3.271 | 201.522 | 0.017 | n/a | 0.135 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000139 | 205.029 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 204.315 | 0.025 | n/a | 0.061 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a15000000000000012e | 204.897 | 0.000 | n/a | 0.000 | 0.000 | 0.545 | 204.079 | 0.042 | n/a | 0.089 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000166 | 204.679 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 203.545 | 0.015 | n/a | 0.095 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a15000000000000013b | 204.532 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 203.405 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000181 | 204.338 | 0.000 | n/a | 0.000 | 0.000 | 1.891 | 201.861 | 0.015 | n/a | 0.136 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000155 | 203.153 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.958 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000188 | 203.130 | 0.000 | n/a | 0.000 | 0.000 | 1.208 | 201.435 | 0.018 | n/a | 0.098 | 0.000 | n/a | n/a | 0.371 | 0.000 | 0.000 | 0.371 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a15000000000000013a | 203.027 | 0.000 | n/a | 0.000 | 0.000 | 1.051 | 201.676 | 0.016 | n/a | 0.152 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a15000000000000012f | 202.855 | 0.000 | n/a | 0.000 | 0.000 | 1.197 | 201.413 | 0.008 | n/a | 0.117 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000136 | 202.817 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 201.461 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000134 | 202.710 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 200.025 | 0.009 | n/a | 1.623 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a15000000000000018d | 202.670 | 0.000 | n/a | 0.000 | 0.000 | 1.038 | 201.327 | 0.031 | n/a | 0.065 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a150000000000000182 | 202.659 | 0.000 | n/a | 0.000 | 0.000 | 1.272 | 201.146 | 0.015 | n/a | 0.078 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000170 | 202.600 | 0.000 | n/a | 0.000 | 0.000 | 1.260 | 201.056 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / read (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.727 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 200.805 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 206.576 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.326 | 203.348 | 5.447 | n/a | 0.170 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 987b0c44214a5a15000000000000019b | 206.701 | 0.000 | n/a | 0.000 | 0.000 | 5.144 | 201.180 | 0.041 | n/a | 0.155 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a1500000000000001d4 | 206.576 | 0.000 | n/a | 0.000 | 0.000 | 5.326 | 201.045 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a1500000000000001b3 | 205.362 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 204.400 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a1500000000000001a4 | 204.627 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 203.348 | 0.008 | n/a | 0.093 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a1500000000000001b5 | 203.317 | 0.000 | n/a | 0.000 | 0.000 | 1.090 | 201.863 | 0.020 | n/a | 0.094 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000201 | 203.175 | 0.000 | n/a | 0.000 | 0.000 | 2.318 | 200.692 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a1500000000000001e9 | 203.090 | 0.000 | n/a | 0.000 | 0.000 | 1.657 | 201.232 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000196 | 203.046 | 0.000 | n/a | 0.000 | 0.000 | 1.927 | 200.931 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a1500000000000001ce | 202.907 | 0.000 | n/a | 0.000 | 0.000 | 1.396 | 201.269 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a1500000000000001bd | 202.819 | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 201.240 | 0.008 | n/a | 0.104 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a1500000000000001fe | 202.697 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 200.799 | 0.010 | n/a | 0.954 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000191 | 202.666 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 201.225 | 0.012 | n/a | 0.090 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a1500000000000001a3 | 202.655 | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 201.755 | 0.016 | n/a | 0.170 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a1500000000000001a1 | 202.650 | 0.000 | n/a | 0.000 | 0.000 | 0.632 | 201.761 | 0.016 | n/a | 0.071 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a1500000000000001c6 | 202.544 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 201.514 | 0.056 | n/a | 0.109 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a1500000000000001e8 | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 201.123 | 0.017 | n/a | 0.082 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a1500000000000001c9 | 202.428 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 201.312 | 0.009 | n/a | 0.114 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a1500000000000001ba | 202.374 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.189 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a15000000000000019f | 202.328 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 201.213 | 0.017 | n/a | 0.076 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000190 | 202.201 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 201.275 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-61/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.642 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 200.783 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 206.038 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.825 | 204.887 | 1.538 | n/a | 0.105 | 0.000 | n/a | n/a | 0.272 | 0.000 | 0.000 | 0.272 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 987b0c44214a5a150000000000000213 | 212.801 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 211.811 | 0.009 | n/a | 0.105 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000260 | 206.038 | 0.000 | n/a | 0.000 | 0.000 | 0.910 | 204.887 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a150000000000000219 | 205.864 | 0.000 | n/a | 0.000 | 0.000 | 0.885 | 204.655 | 0.007 | n/a | 0.103 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000240 | 205.180 | 0.000 | n/a | 0.000 | 0.000 | 3.842 | 201.133 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000209 | 204.016 | 0.000 | n/a | 0.000 | 0.000 | 2.502 | 201.278 | 0.013 | n/a | 0.092 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000207 | 203.668 | 0.000 | n/a | 0.000 | 0.000 | 2.493 | 200.874 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000208 | 203.534 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 202.559 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a15000000000000025b | 203.350 | 0.000 | n/a | 0.000 | 0.000 | 2.411 | 200.759 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a150000000000000275 | 203.109 | 0.000 | n/a | 0.000 | 0.000 | 1.375 | 201.435 | 0.007 | n/a | 0.096 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000218 | 202.528 | 0.000 | n/a | 0.000 | 0.000 | 1.325 | 201.019 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000236 | 202.522 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 201.605 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000244 | 202.508 | 0.000 | n/a | 0.000 | 0.000 | 1.118 | 201.029 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.272 | 0.000 | 0.000 | 0.272 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a15000000000000020a | 202.471 | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 200.963 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000221 | 202.447 | 0.000 | n/a | 0.000 | 0.000 | 1.620 | 200.674 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000235 | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 1.029 | 201.040 | 0.005 | n/a | 0.078 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a15000000000000023a | 202.128 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 200.946 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000228 | 202.111 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 201.015 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a15000000000000026b | 202.101 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 201.207 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a15000000000000022e | 202.100 | 0.000 | n/a | 0.000 | 0.000 | 0.367 | 200.999 | 0.011 | n/a | 0.626 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a15000000000000026e | 202.094 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 201.219 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (61 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.558 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 80.781 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 207.469 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.087 | 206.383 | 8.303 | n/a | 0.084 | 0.000 | n/a | n/a | 50.082 | 0.000 | 0.000 | 50.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 987b0c44214a5a150000000000000287 | 207.469 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 206.383 | 0.021 | n/a | 0.056 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a150000000000000283 | 205.018 | 0.000 | n/a | 0.000 | 0.000 | 4.087 | 200.733 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a15000000000000027d | 202.228 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 201.106 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a15000000000000028e | 201.896 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.890 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a15000000000000028f | 201.891 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 200.917 | 0.015 | n/a | 0.058 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000285 | 201.890 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 200.867 | 0.005 | n/a | 0.083 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a15000000000000028c | 201.871 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 200.844 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a15000000000000027e | 201.867 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 200.798 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000289 | 201.815 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 201.043 | 0.013 | n/a | 0.084 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a15000000000000027c | 201.766 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 200.798 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a150000000000000284 | 201.760 | 0.000 | n/a | 0.000 | 0.000 | 0.710 | 200.854 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a150000000000000277 | 201.704 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 201.006 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000290 | 201.474 | 0.000 | n/a | 0.000 | 0.000 | 0.512 | 200.787 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000279 | 201.471 | 0.000 | n/a | 0.000 | 0.000 | 0.574 | 200.688 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000280 | 201.461 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 200.767 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 987b0c44214a5a15000000000000028a | 201.418 | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 200.730 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000278 | 201.353 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 200.641 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a15000000000000028b | 201.325 | 0.000 | n/a | 0.000 | 0.000 | 0.487 | 200.694 | 0.012 | n/a | 0.036 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a15000000000000027b | 168.709 | 0.000 | n/a | 0.000 | 0.000 | 0.382 | 168.149 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a15000000000000027a | 149.780 | 0.000 | n/a | 0.000 | 0.000 | 2.581 | 147.018 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / read (221 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.368 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 84.409 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 204.148 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.282 | 201.385 | 2.152 | n/a | 0.113 | 0.000 | n/a | n/a | 49.889 | 0.000 | 0.000 | 49.889 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 987b0c44214a5a150000000000000ee4 | 206.379 | 0.000 | n/a | 0.000 | 0.000 | 5.115 | 201.073 | 0.015 | n/a | 0.065 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000f19 | 204.729 | 0.000 | n/a | 0.000 | 0.000 | 0.403 | 204.096 | 0.029 | n/a | 0.064 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000f04 | 204.148 | 0.000 | n/a | 0.000 | 0.000 | 3.056 | 200.914 | 0.015 | n/a | 0.058 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000f1a | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 201.918 | 0.011 | n/a | 0.044 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-45/journal/page | none observed |
| 987b0c44214a5a150000000000000f14 | 202.530 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 201.287 | 0.017 | n/a | 0.138 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000ec2 | 202.358 | 0.000 | n/a | 0.000 | 0.000 | 1.371 | 200.788 | 0.015 | n/a | 0.061 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000f23 | 202.345 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 201.332 | 0.016 | n/a | 0.113 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000f25 | 202.326 | 0.000 | n/a | 0.000 | 0.000 | 1.281 | 200.842 | 0.013 | n/a | 0.061 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000f13 | 202.264 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 201.354 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000ecf | 202.255 | 0.000 | n/a | 0.000 | 0.000 | 1.420 | 200.692 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-43/journal/page | none observed |
| 987b0c44214a5a150000000000000ec4 | 202.187 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 201.076 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000f0e | 202.139 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 201.304 | 0.012 | n/a | 0.081 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000f17 | 202.084 | 0.000 | n/a | 0.000 | 0.000 | 0.533 | 201.385 | 0.012 | n/a | 0.042 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000ed6 | 202.052 | 0.000 | n/a | 0.000 | 0.000 | 1.591 | 200.341 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000ec3 | 201.971 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.957 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-42/journal/page | none observed |
| 987b0c44214a5a150000000000000ef1 | 201.953 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 200.692 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000eb4 | 201.950 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 201.116 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-40/journal/page | none observed |
| 987b0c44214a5a150000000000000ee0 | 201.870 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 200.810 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-61/journal/page | none observed |
| 987b0c44214a5a150000000000000ee8 | 201.837 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 200.870 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| 987b0c44214a5a150000000000000ebf | 201.806 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 200.835 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-42/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

# Trace report

The slowest observed commits spent their largest exclusive interval in `node-13/thread-0/driver.queue.subject` (224.087 ms, trace `d114345e3dc2299800000000000011ba`); `node-13/thread-0/socket.wait-first-byte` (77.161 ms, trace `d114345e3dc2299800000000000011b8`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (141.189 ms, trace `d114345e3dc229980000000000001476`); `node-13/thread-0/driver.queue.subject` (131.803 ms, trace `d114345e3dc2299800000000000011c1`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (72.771 ms, trace `d114345e3dc2299800000000000011bf`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-publication-a-4-baseline`; source `f9af2506c70dcb8d0320436b5dee5dadd9f024d9`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3708/3711 (99.919%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6885226.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 211 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13416.172 | 286.229 | 8.074 | 308 |
| L1 | 0 | 19970.420 | 413.656 | 6.720 | 462 |
| L4 | 0 | 19945.276 | 382.032 | 9.335 | 426 |
| L16 | 0 | 19977.479 | 552.658 | 7.639 | 474 |
| L64 | 0 | 19910.597 | 417.363 | 12.207 | 596 |
| L256 | 0 | 19956.699 | 349.684 | 21.537 | 486 |
| L1024 | 0 | 19971.250 | 3599.006 | 30.406 | 12000 |
| tail | 0 | 64613.851 | 11835.318 | 93.235 | 37443 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| d114345e3dc2299800000000000011ba | driver.queue.subject | 224.087 | d114345e3dc2299800000000000011b8 | 4 / 32 |
| d114345e3dc2299800000000000011ba | driver.queue.scheduler-late | 1.630 | none | 4 / 32 |
| d114345e3dc2299800000000000011ba | driver.queue.scheduler-dispatch | 0.128 | none | 4 / 32 |

Observed active steps while trace d114345e3dc2299800000000000011ba waited: [{"at":1794633677021.2644,"inFlight":4,"capacity":32,"active":[{"traceId":"d114345e3dc2299800000000000011b7","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011b8","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011b9","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bb","step":"client.http"}]},{"at":1794633677063.5469,"inFlight":5,"capacity":32,"active":[{"traceId":"d114345e3dc2299800000000000011b8","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011b9","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bb","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bd","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bf","step":"client.http"}]},{"at":1794633677129.44,"inFlight":4,"capacity":32,"active":[{"traceId":"d114345e3dc2299800000000000011b8","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bd","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bf","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011c0","step":"client.http"}]},{"at":1794633677167.7275,"inFlight":4,"capacity":32,"active":[{"traceId":"d114345e3dc2299800000000000011b8","step":"triplex.transact"},{"traceId":"d114345e3dc2299800000000000011bf","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011c0","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011c6","step":"client.http"}]},{"at":1794633677209.6028,"inFlight":6,"capacity":32,"active":[{"traceId":"d114345e3dc2299800000000000011b8","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011c6","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011c1","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011c9","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011ca","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011cb","step":"client.http"}]}]

| d114345e3dc2299800000000000011b8 | driver.queue.scheduler-late | 2.160 | none | 2 / 32 |
| d114345e3dc2299800000000000011b8 | driver.queue.scheduler-dispatch | 0.042 | none | 2 / 32 |

Observed active steps while trace d114345e3dc2299800000000000011b8 waited: []

| d114345e3dc229980000000000001476 | driver.queue.subject | 6.335 | d114345e3dc229980000000000001475 | 1 / 32 |
| d114345e3dc229980000000000001476 | driver.queue.scheduler-late | 0.060 | none | 1 / 32 |
| d114345e3dc229980000000000001476 | driver.queue.scheduler-dispatch | 0.056 | none | 1 / 32 |

Observed active steps while trace d114345e3dc229980000000000001476 waited: []

| d114345e3dc2299800000000000011c1 | driver.queue.subject | 131.803 | d114345e3dc2299800000000000011c0 | 5 / 32 |
| d114345e3dc2299800000000000011c1 | driver.queue.scheduler-late | 15.151 | none | 5 / 32 |
| d114345e3dc2299800000000000011c1 | driver.queue.scheduler-dispatch | 0.439 | none | 2 / 32 |

Observed active steps while trace d114345e3dc2299800000000000011c1 waited: [{"at":1794633677063.5469,"inFlight":5,"capacity":32,"active":[{"traceId":"d114345e3dc2299800000000000011b8","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011b9","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bb","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bd","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bf","step":"client.http"}]},{"at":1794633677129.44,"inFlight":4,"capacity":32,"active":[{"traceId":"d114345e3dc2299800000000000011b8","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bd","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011bf","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011c0","step":"client.http"}]},{"at":1794633677167.7275,"inFlight":4,"capacity":32,"active":[{"traceId":"d114345e3dc2299800000000000011b8","step":"triplex.transact"},{"traceId":"d114345e3dc2299800000000000011bf","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011c0","step":"client.http"},{"traceId":"d114345e3dc2299800000000000011c6","step":"client.http"}]}]

| d114345e3dc2299800000000000011bf | driver.queue.scheduler-late | 32.948 | none | 4 / 32 |
| d114345e3dc2299800000000000011bf | driver.queue.scheduler-dispatch | 0.025 | none | 4 / 32 |

Observed active steps while trace d114345e3dc2299800000000000011bf waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.616 | 0.438 | 0.000 | 1.030 | 5.659 | 0.046 | 0.000 | 0.166 | 1.579 | 8.624 | 0.059 | n/a | 0.415 | 14.142 | n/a | n/a | 0.059 | 6.244 | 0.200 | 0.059 |
| p99 | 82.509 | 4.485 | 0.097 | 5.636 | 18.749 | 0.636 | 2.874 | 1.206 | 4.074 | 27.355 | 4.292 | n/a | 3.279 | 32.468 | n/a | n/a | 0.301 | 19.468 | 0.512 | 0.301 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc2299800000000000000f4 | 82.509 | 18.749 | 0.636 | 0.000 | 0.083 | 2.675 | 27.355 | 0.188 | n/a | 0.278 | 32.468 | n/a | n/a | 0.077 | 19.468 | 0.236 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000000f1 | 52.615 | 11.325 | 0.012 | 0.000 | 0.586 | 1.579 | 12.635 | 0.123 | n/a | 0.157 | 25.897 | n/a | n/a | 0.301 | 11.924 | 0.227 | 0.301 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000110 | 50.531 | 7.916 | 0.374 | 0.910 | 0.156 | 2.602 | 16.347 | 0.088 | n/a | 0.124 | 21.937 | n/a | n/a | 0.077 | 9.356 | 0.185 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000127 | 49.575 | 4.918 | 0.377 | 0.000 | 0.100 | 4.074 | 16.425 | 0.100 | n/a | 0.148 | 23.368 | n/a | n/a | 0.064 | 5.396 | 0.109 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.587ms |
| d114345e3dc229980000000000000104 | 43.909 | 8.749 | 0.215 | 0.000 | 0.076 | 1.776 | 14.266 | 4.292 | n/a | 3.279 | 11.196 | n/a | n/a | 0.061 | 9.040 | 0.206 | 0.061 | gw-w/thread-46/gateway.admitted-work | none observed |
| d114345e3dc2299800000000000000f8 | 42.878 | 6.493 | 0.307 | 0.000 | 0.197 | 2.035 | 19.543 | 0.048 | n/a | 0.793 | 13.365 | n/a | n/a | 0.098 | 6.996 | 0.163 | 0.098 | gw-w/thread-43/gateway.admitted-work | none observed |
| d114345e3dc2299800000000000000fa | 42.686 | 5.143 | 0.006 | 0.000 | 1.113 | 1.025 | 5.797 | 0.041 | n/a | 1.792 | 27.705 | n/a | n/a | 0.064 | 6.262 | 0.147 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000010c | 42.005 | 5.595 | 0.243 | 0.000 | 0.067 | 1.932 | 16.684 | 0.146 | n/a | 0.189 | 17.106 | n/a | n/a | 0.043 | 5.905 | 0.141 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000102 | 41.062 | 11.344 | 0.010 | 0.000 | 0.565 | 1.504 | 2.548 | 0.098 | n/a | 0.266 | 24.649 | n/a | n/a | 0.076 | 11.920 | 0.290 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000000fc | 39.253 | 10.078 | 0.347 | 0.000 | 0.117 | 2.265 | 11.189 | 0.050 | n/a | 2.697 | 12.427 | n/a | n/a | 0.083 | 10.542 | 0.269 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000116 | 38.086 | 6.997 | 0.537 | 0.000 | 0.081 | 1.966 | 9.301 | 0.091 | n/a | 0.599 | 18.455 | n/a | n/a | 0.059 | 7.615 | 0.200 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000011a | 37.381 | 3.572 | 0.181 | 0.445 | 0.054 | 3.289 | 14.580 | 0.069 | n/a | 0.119 | 15.036 | n/a | n/a | 0.037 | 4.252 | 0.114 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000106 | 36.097 | 4.544 | 0.196 | 0.000 | 0.213 | 1.754 | 11.958 | 0.073 | n/a | 0.133 | 17.182 | n/a | n/a | 0.044 | 4.953 | 0.137 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000011e | 36.027 | 6.377 | 0.216 | 0.000 | 0.059 | 1.795 | 12.565 | 0.061 | n/a | 0.102 | 14.811 | n/a | n/a | 0.042 | 6.652 | 0.185 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000118 | 35.616 | 7.131 | 0.006 | 2.874 | 0.652 | 1.828 | 2.791 | 0.052 | n/a | 1.415 | 18.828 | n/a | n/a | 0.040 | 10.663 | 0.299 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000000fe | 33.607 | 4.209 | 0.220 | 0.000 | 0.061 | 2.268 | 8.624 | 0.059 | n/a | 0.184 | 17.929 | n/a | n/a | 0.053 | 4.490 | 0.134 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000010e | 31.480 | 5.659 | 0.469 | 0.000 | 0.116 | 2.697 | 14.014 | 0.059 | n/a | 0.397 | 8.008 | n/a | n/a | 0.061 | 6.244 | 0.198 | 0.061 | gw-w/thread-44/gateway.admitted-work | none observed |
| d114345e3dc229980000000000000122 | 28.558 | 4.011 | 0.176 | 0.570 | 0.056 | 1.293 | 9.429 | 0.052 | n/a | 0.432 | 12.503 | n/a | n/a | 0.034 | 4.813 | 0.169 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000000f6 | 23.647 | 5.770 | 0.005 | 0.000 | 0.301 | 1.043 | 1.703 | 0.048 | n/a | 0.465 | 14.142 | n/a | n/a | 0.170 | 6.076 | 0.257 | 0.170 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000108 | 23.171 | 8.488 | 0.011 | 1.528 | 0.150 | 0.943 | 3.665 | 0.103 | n/a | 1.001 | 7.228 | n/a | n/a | 0.054 | 10.177 | 0.439 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.264 | 0.892 | 0.000 | 2.043 | 4.038 | 0.005 | 0.000 | 0.409 | 0.922 | 1.703 | 0.049 | n/a | 0.525 | 9.758 | n/a | n/a | 0.061 | 4.288 | 0.254 | 0.061 |
| p99 | 42.686 | 2.051 | 0.097 | 3.601 | 8.131 | 0.046 | 0.000 | 1.206 | 1.234 | 5.797 | 0.073 | n/a | 1.792 | 27.705 | n/a | n/a | 0.170 | 9.347 | 0.512 | 0.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc2299800000000000000fa | 42.686 | 5.143 | 0.006 | 0.000 | 1.113 | 1.025 | 5.797 | 0.041 | n/a | 1.792 | 27.705 | n/a | n/a | 0.064 | 6.262 | 0.147 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000000f6 | 23.647 | 5.770 | 0.005 | 0.000 | 0.301 | 1.043 | 1.703 | 0.048 | n/a | 0.465 | 14.142 | n/a | n/a | 0.170 | 6.076 | 0.257 | 0.170 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000120 | 22.921 | 3.238 | 0.004 | 0.000 | 0.166 | 0.723 | 4.268 | 0.052 | n/a | 0.125 | 14.302 | n/a | n/a | 0.042 | 3.409 | 0.149 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000114 | 20.648 | 3.153 | 0.005 | 0.000 | 0.914 | 0.922 | 1.771 | 0.039 | n/a | 0.415 | 13.392 | n/a | n/a | 0.038 | 4.071 | 0.197 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000126 | 18.264 | 8.131 | 0.046 | 0.000 | 1.171 | 1.234 | 1.683 | 0.056 | n/a | 0.909 | 4.912 | n/a | n/a | 0.123 | 9.347 | 0.512 | 0.123 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000011c | 17.796 | 5.795 | 0.006 | 0.000 | 1.206 | 0.829 | 1.681 | 0.044 | n/a | 0.525 | 7.632 | n/a | n/a | 0.079 | 7.006 | 0.394 | 0.079 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000111 | 16.718 | 4.038 | 0.004 | 0.000 | 0.246 | 0.761 | 1.214 | 0.049 | n/a | 0.586 | 9.758 | n/a | n/a | 0.061 | 4.288 | 0.256 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000124 | 14.303 | 3.385 | 0.006 | 0.000 | 0.249 | 1.028 | 1.465 | 0.049 | n/a | 0.731 | 7.352 | n/a | n/a | 0.040 | 3.640 | 0.254 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000000ff | 12.516 | 2.686 | 0.004 | 0.000 | 0.409 | 0.905 | 2.000 | 0.073 | n/a | 0.200 | 6.184 | n/a | n/a | 0.056 | 3.099 | 0.248 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.921 | 0.195 | 0.000 | 0.613 | 4.386 | 0.263 | 0.000 | 0.108 | 2.324 | 14.914 | 0.135 | n/a | 0.135 | 10.594 | n/a | n/a | 0.063 | 4.758 | 0.145 | 0.063 |
| p99 | 32.921 | 0.195 | 0.000 | 0.613 | 4.386 | 0.263 | 0.000 | 0.108 | 2.324 | 14.914 | 0.135 | n/a | 0.135 | 10.594 | n/a | n/a | 0.063 | 4.758 | 0.145 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc22998000000000000012a | 32.921 | 4.386 | 0.263 | 0.000 | 0.108 | 2.324 | 14.914 | 0.135 | n/a | 0.135 | 10.594 | n/a | n/a | 0.063 | 4.758 | 0.145 | 0.063 | gw-w/thread-45/gateway.admitted-work | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.391 | 0.501 | 0.000 | 0.785 | 4.594 | 0.011 | 0.000 | 0.169 | 1.351 | 5.582 | 0.058 | n/a | 0.459 | 12.639 | n/a | n/a | 0.054 | 5.152 | 0.186 | 0.054 |
| p99 | 115.992 | 2.430 | 0.019 | 4.754 | 9.007 | 1.211 | 0.589 | 12.880 | 6.277 | 46.588 | 0.198 | n/a | 5.076 | 85.698 | n/a | n/a | 0.103 | 16.274 | 0.511 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc22998000000000000013e | 115.992 | 6.193 | 0.252 | 0.000 | 0.072 | 2.287 | 20.944 | 0.089 | n/a | 0.401 | 85.698 | n/a | n/a | 0.057 | 6.517 | 0.056 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000168 | 71.955 | 4.157 | 0.194 | 0.000 | 0.076 | 1.794 | 46.588 | 0.054 | n/a | 0.146 | 18.902 | n/a | n/a | 0.042 | 4.428 | 0.062 | 0.042 | gw-w/thread-41/gateway.admitted-work | driver.publication 2.661ms |
| d114345e3dc22998000000000000017c | 56.029 | 4.638 | 0.208 | 0.000 | 0.077 | 1.958 | 40.080 | 0.060 | n/a | 0.514 | 8.449 | n/a | n/a | 0.045 | 4.923 | 0.088 | 0.045 | gw-w/thread-46/gateway.admitted-work | none observed |
| d114345e3dc229980000000000000140 | 49.117 | 5.193 | 0.195 | 0.589 | 0.104 | 1.634 | 11.867 | 0.098 | n/a | 0.518 | 28.860 | n/a | n/a | 0.060 | 6.081 | 0.124 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000012e | 47.931 | 4.056 | 0.347 | 0.000 | 0.066 | 1.351 | 8.744 | 0.066 | n/a | 0.485 | 32.779 | n/a | n/a | 0.037 | 4.469 | 0.093 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000012c | 42.693 | 4.227 | 0.253 | 0.406 | 0.131 | 2.089 | 21.243 | 0.146 | n/a | 4.088 | 10.047 | n/a | n/a | 0.063 | 5.017 | 0.118 | 0.063 | gw-w/thread-47/gateway.admitted-work | none observed |
| d114345e3dc229980000000000000170 | 42.155 | 7.331 | 0.206 | 0.383 | 0.119 | 1.248 | 13.301 | 0.057 | n/a | 0.490 | 18.968 | n/a | n/a | 0.054 | 8.038 | 0.191 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000016c | 41.557 | 5.774 | 0.176 | 0.364 | 0.059 | 3.996 | 8.959 | 0.116 | n/a | 1.191 | 20.881 | n/a | n/a | 0.042 | 6.372 | 0.153 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000138 | 41.527 | 4.416 | 0.377 | 0.000 | 0.091 | 3.175 | 13.169 | 0.139 | n/a | 0.142 | 19.959 | n/a | n/a | 0.058 | 4.883 | 0.118 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000146 | 40.576 | 3.582 | 0.204 | 0.445 | 0.067 | 1.258 | 11.258 | 0.049 | n/a | 0.173 | 23.484 | n/a | n/a | 0.058 | 4.297 | 0.106 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000142 | 35.863 | 5.181 | 0.366 | 0.000 | 0.169 | 2.156 | 14.686 | 0.093 | n/a | 0.490 | 12.639 | n/a | n/a | 0.083 | 5.716 | 0.159 | 0.083 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000135 | 34.612 | 4.594 | 0.232 | 0.549 | 0.135 | 1.443 | 7.953 | 0.057 | n/a | 4.094 | 15.503 | n/a | n/a | 0.053 | 5.510 | 0.159 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000014e | 33.598 | 3.847 | 0.176 | 0.488 | 0.059 | 4.914 | 10.322 | 0.048 | n/a | 1.830 | 11.867 | n/a | n/a | 0.048 | 4.570 | 0.136 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000013c | 33.018 | 8.888 | 0.010 | 0.000 | 0.690 | 1.066 | 4.982 | 0.053 | n/a | 0.136 | 17.130 | n/a | n/a | 0.062 | 9.588 | 0.290 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000176 | 31.982 | 6.437 | 0.005 | 0.000 | 0.091 | 3.985 | 8.014 | 0.175 | n/a | 3.176 | 10.051 | n/a | n/a | 0.048 | 6.533 | 0.204 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000177 | 31.834 | 3.388 | 0.007 | 0.000 | 12.880 | 1.656 | 1.437 | 0.050 | n/a | 0.357 | 12.002 | n/a | n/a | 0.059 | 16.274 | 0.511 | 0.059 | node-13/thread-0/driver.queue.subject | driver.publication 1.367ms; driver.expected-state.bind-receipt 1.160ms |
| d114345e3dc229980000000000000131 | 31.586 | 5.203 | 0.005 | 0.000 | 1.810 | 0.912 | 1.514 | 0.039 | n/a | 0.428 | 21.598 | n/a | n/a | 0.078 | 7.018 | 0.222 | 0.078 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000144 | 31.048 | 5.334 | 0.007 | 0.000 | 0.250 | 0.918 | 2.437 | 0.052 | n/a | 1.022 | 20.974 | n/a | n/a | 0.054 | 5.591 | 0.180 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000014a | 29.759 | 3.926 | 0.187 | 0.000 | 0.058 | 1.271 | 9.843 | 0.059 | n/a | 0.106 | 14.269 | n/a | n/a | 0.040 | 4.170 | 0.140 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000014c | 28.852 | 5.865 | 0.008 | 0.000 | 0.602 | 1.221 | 2.494 | 0.069 | n/a | 1.080 | 17.454 | n/a | n/a | 0.060 | 6.475 | 0.224 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.026 | 0.939 | 0.000 | 1.596 | 3.807 | 0.005 | 0.000 | 0.409 | 1.595 | 1.568 | 0.050 | n/a | 0.358 | 6.279 | n/a | n/a | 0.047 | 6.402 | 0.271 | 0.047 |
| p99 | 31.834 | 2.227 | 0.000 | 4.754 | 8.382 | 0.010 | 0.000 | 12.880 | 5.500 | 5.582 | 0.142 | n/a | 1.010 | 17.575 | n/a | n/a | 0.103 | 16.274 | 0.511 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc229980000000000000177 | 31.834 | 3.388 | 0.007 | 0.000 | 12.880 | 1.656 | 1.437 | 0.050 | n/a | 0.357 | 12.002 | n/a | n/a | 0.059 | 16.274 | 0.511 | 0.059 | node-13/thread-0/driver.queue.subject | driver.publication 1.367ms; driver.expected-state.bind-receipt 1.160ms |
| d114345e3dc229980000000000000133 | 28.391 | 5.353 | 0.005 | 0.000 | 1.045 | 0.961 | 2.340 | 0.097 | n/a | 0.930 | 17.575 | n/a | n/a | 0.086 | 6.402 | 0.226 | 0.086 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000015c | 25.494 | 6.534 | 0.005 | 0.000 | 0.177 | 1.595 | 1.568 | 0.048 | n/a | 0.358 | 15.170 | n/a | n/a | 0.039 | 6.717 | 0.263 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000137 | 24.302 | 8.382 | 0.005 | 0.000 | 0.437 | 3.897 | 5.582 | 0.085 | n/a | 0.672 | 5.183 | n/a | n/a | 0.058 | 8.823 | 0.363 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000147 | 24.026 | 3.509 | 0.006 | 0.000 | 0.128 | 5.500 | 1.134 | 0.044 | n/a | 0.074 | 13.587 | n/a | n/a | 0.043 | 3.643 | 0.152 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000152 | 20.958 | 7.639 | 0.010 | 0.000 | 0.684 | 2.494 | 2.597 | 0.142 | n/a | 1.010 | 6.279 | n/a | n/a | 0.103 | 8.333 | 0.398 | 0.103 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000160 | 12.548 | 3.082 | 0.005 | 0.000 | 0.311 | 0.794 | 1.994 | 0.070 | n/a | 0.176 | 6.070 | n/a | n/a | 0.047 | 3.398 | 0.271 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000016e | 10.980 | 3.807 | 0.005 | 0.000 | 0.409 | 0.777 | 1.308 | 0.041 | n/a | 0.459 | 4.128 | n/a | n/a | 0.047 | 4.221 | 0.384 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.708 | 0.438 | 0.000 | 0.757 | 4.164 | 0.171 | 0.000 | 0.170 | 1.390 | 6.658 | 0.058 | n/a | 0.178 | 12.282 | n/a | n/a | 0.055 | 4.943 | 0.190 | 0.055 |
| p99 | 111.024 | 4.125 | 0.034 | 5.528 | 9.623 | 1.042 | 0.479 | 1.101 | 4.631 | 20.937 | 3.413 | n/a | 4.137 | 97.405 | n/a | n/a | 0.176 | 10.552 | 0.368 | 0.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc2299800000000000001b7 | 111.024 | 9.479 | 0.006 | 0.000 | 1.067 | 0.896 | 1.990 | 0.041 | n/a | 0.086 | 97.405 | n/a | n/a | 0.055 | 10.552 | 0.095 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001a3 | 45.186 | 4.969 | 0.215 | 0.400 | 0.073 | 1.777 | 16.014 | 0.104 | n/a | 0.178 | 21.396 | n/a | n/a | 0.059 | 5.657 | 0.125 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000019b | 41.534 | 4.192 | 0.378 | 0.324 | 0.131 | 1.885 | 20.937 | 0.069 | n/a | 0.136 | 13.401 | n/a | n/a | 0.081 | 5.025 | 0.121 | 0.081 | gw-w/thread-44/gateway.admitted-work | none observed |
| d114345e3dc2299800000000000001aa | 38.096 | 9.623 | 0.007 | 0.000 | 0.415 | 0.927 | 2.623 | 0.049 | n/a | 0.111 | 24.289 | n/a | n/a | 0.052 | 10.045 | 0.264 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000197 | 36.066 | 4.678 | 0.386 | 0.315 | 0.135 | 1.868 | 13.928 | 0.062 | n/a | 0.101 | 14.526 | n/a | n/a | 0.067 | 5.515 | 0.153 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001a5 | 35.703 | 3.844 | 0.262 | 0.249 | 0.201 | 1.761 | 14.466 | 0.093 | n/a | 0.167 | 14.565 | n/a | n/a | 0.094 | 4.557 | 0.128 | 0.094 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000191 | 35.695 | 4.119 | 0.354 | 0.000 | 0.137 | 1.976 | 11.554 | 0.109 | n/a | 0.122 | 17.253 | n/a | n/a | 0.072 | 4.610 | 0.129 | 0.072 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001a9 | 35.559 | 3.681 | 0.344 | 0.390 | 0.160 | 3.511 | 13.055 | 0.054 | n/a | 0.107 | 14.190 | n/a | n/a | 0.067 | 4.575 | 0.129 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001b9 | 35.120 | 4.859 | 0.218 | 0.285 | 0.167 | 1.390 | 9.598 | 0.049 | n/a | 0.104 | 18.381 | n/a | n/a | 0.070 | 5.529 | 0.157 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001ba | 33.481 | 3.819 | 0.005 | 0.000 | 0.932 | 1.434 | 4.954 | 0.039 | n/a | 0.095 | 22.157 | n/a | n/a | 0.045 | 4.757 | 0.142 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000199 | 33.217 | 9.259 | 0.011 | 0.000 | 0.166 | 0.897 | 3.212 | 0.115 | n/a | 0.243 | 19.271 | n/a | n/a | 0.041 | 9.437 | 0.284 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000184 | 32.553 | 4.164 | 0.315 | 0.000 | 0.059 | 1.358 | 5.625 | 0.043 | n/a | 4.137 | 16.802 | n/a | n/a | 0.051 | 4.538 | 0.139 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000019d | 32.451 | 3.680 | 0.259 | 0.238 | 0.142 | 1.594 | 12.360 | 0.089 | n/a | 0.649 | 13.351 | n/a | n/a | 0.090 | 4.318 | 0.133 | 0.090 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001c1 | 31.224 | 4.851 | 0.238 | 0.401 | 0.108 | 1.695 | 8.866 | 0.056 | n/a | 0.089 | 14.854 | n/a | n/a | 0.067 | 5.597 | 0.179 | 0.067 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001b3 | 30.917 | 3.442 | 0.214 | 0.253 | 0.177 | 1.264 | 8.403 | 0.061 | n/a | 0.119 | 16.909 | n/a | n/a | 0.074 | 4.087 | 0.132 | 0.074 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001a1 | 30.827 | 3.799 | 0.277 | 0.279 | 0.071 | 1.557 | 13.198 | 0.063 | n/a | 0.182 | 11.359 | n/a | n/a | 0.044 | 4.425 | 0.144 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000018f | 30.319 | 3.893 | 0.285 | 0.000 | 0.166 | 4.585 | 9.199 | 0.083 | n/a | 0.799 | 11.230 | n/a | n/a | 0.080 | 4.344 | 0.143 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000018b | 29.316 | 3.135 | 0.005 | 0.000 | 0.966 | 0.702 | 8.685 | 0.035 | n/a | 0.377 | 15.371 | n/a | n/a | 0.039 | 4.106 | 0.140 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001b5 | 28.977 | 4.066 | 1.042 | 0.312 | 0.072 | 1.664 | 7.270 | 0.060 | n/a | 3.019 | 11.418 | n/a | n/a | 0.055 | 5.491 | 0.190 | 0.055 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001bd | 28.708 | 5.418 | 0.376 | 0.479 | 0.110 | 2.603 | 9.750 | 0.079 | n/a | 0.114 | 9.727 | n/a | n/a | 0.053 | 6.383 | 0.222 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.768 | 0.607 | 0.000 | 1.856 | 3.636 | 0.005 | 0.000 | 0.655 | 0.754 | 1.300 | 0.046 | n/a | 0.178 | 8.935 | n/a | n/a | 0.044 | 4.343 | 0.261 | 0.044 |
| p99 | 24.586 | 1.988 | 0.006 | 2.672 | 5.895 | 0.011 | 0.000 | 1.101 | 4.631 | 4.928 | 3.413 | n/a | 0.473 | 14.797 | n/a | n/a | 0.096 | 6.189 | 0.356 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc22998000000000000017e | 24.586 | 3.501 | 0.006 | 0.000 | 0.124 | 4.631 | 1.300 | 0.046 | n/a | 0.131 | 14.797 | n/a | n/a | 0.049 | 3.632 | 0.148 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000193 | 21.972 | 4.728 | 0.010 | 0.000 | 0.655 | 2.138 | 3.212 | 3.413 | n/a | 0.178 | 7.556 | n/a | n/a | 0.082 | 5.393 | 0.245 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001c6 | 21.411 | 3.513 | 0.005 | 0.000 | 0.678 | 0.779 | 4.928 | 0.050 | n/a | 0.089 | 11.331 | n/a | n/a | 0.038 | 4.196 | 0.196 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001b1 | 18.221 | 5.895 | 0.007 | 0.000 | 0.287 | 0.754 | 1.981 | 0.050 | n/a | 0.216 | 8.935 | n/a | n/a | 0.096 | 6.189 | 0.340 | 0.096 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000195 | 18.087 | 4.793 | 0.006 | 0.000 | 0.324 | 0.732 | 1.373 | 0.046 | n/a | 0.342 | 10.416 | n/a | n/a | 0.055 | 5.124 | 0.283 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000018d | 17.768 | 2.916 | 0.005 | 0.000 | 0.864 | 0.750 | 1.130 | 0.035 | n/a | 0.411 | 11.613 | n/a | n/a | 0.043 | 3.785 | 0.213 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000182 | 17.159 | 5.316 | 0.011 | 0.000 | 0.789 | 1.365 | 1.273 | 0.044 | n/a | 0.473 | 7.795 | n/a | n/a | 0.093 | 6.116 | 0.356 | 0.093 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001c8 | 16.659 | 3.944 | 0.005 | 0.000 | 0.395 | 1.063 | 1.270 | 0.042 | n/a | 0.391 | 9.512 | n/a | n/a | 0.038 | 4.343 | 0.261 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001a7 | 14.801 | 3.636 | 0.005 | 0.000 | 0.703 | 0.735 | 1.359 | 0.048 | n/a | 0.107 | 8.164 | n/a | n/a | 0.044 | 4.344 | 0.294 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001be | 11.680 | 2.809 | 0.005 | 0.000 | 1.101 | 0.633 | 1.146 | 0.039 | n/a | 0.073 | 5.834 | n/a | n/a | 0.040 | 3.915 | 0.335 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.587 | 0.486 | 0.000 | 1.275 | 3.998 | 0.021 | 0.000 | 0.162 | 1.285 | 4.065 | 0.059 | n/a | 0.172 | 12.319 | n/a | n/a | 0.053 | 4.708 | 0.203 | 0.053 |
| p99 | 90.768 | 2.111 | 0.011 | 6.594 | 21.114 | 0.428 | 0.489 | 1.617 | 4.088 | 41.128 | 21.147 | n/a | 4.078 | 69.214 | n/a | n/a | 0.138 | 22.218 | 0.515 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc22998000000000000021e | 90.768 | 3.594 | 0.315 | 0.000 | 0.055 | 1.264 | 16.090 | 0.096 | n/a | 0.090 | 69.214 | n/a | n/a | 0.051 | 3.964 | 0.044 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001f0 | 78.949 | 21.114 | 0.020 | 0.000 | 1.083 | 4.088 | 41.128 | 0.123 | n/a | 0.242 | 11.106 | n/a | n/a | 0.045 | 22.218 | 0.281 | 0.045 | gw-w/thread-43/storage/begin-command! | none observed |
| d114345e3dc2299800000000000001de | 47.471 | 7.000 | 0.428 | 0.329 | 0.065 | 1.541 | 19.213 | 0.104 | n/a | 0.429 | 18.308 | n/a | n/a | 0.053 | 7.823 | 0.165 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001d4 | 40.215 | 6.223 | 0.004 | 0.000 | 0.792 | 0.995 | 3.704 | 0.051 | n/a | 0.752 | 27.667 | n/a | n/a | 0.028 | 7.019 | 0.175 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.118ms |
| d114345e3dc2299800000000000001df | 40.176 | 7.296 | 0.006 | 0.000 | 0.845 | 1.612 | 6.574 | 0.069 | n/a | 0.172 | 23.560 | n/a | n/a | 0.042 | 8.147 | 0.203 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001d7 | 39.086 | 4.322 | 0.319 | 0.351 | 0.083 | 1.892 | 15.213 | 0.076 | n/a | 2.262 | 14.502 | n/a | n/a | 0.065 | 5.076 | 0.130 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001fc | 38.597 | 6.330 | 0.005 | 0.000 | 1.017 | 0.886 | 1.691 | 0.049 | n/a | 0.080 | 28.476 | n/a | n/a | 0.063 | 7.353 | 0.190 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001cd | 36.936 | 9.103 | 0.021 | 0.000 | 1.617 | 3.026 | 4.524 | 0.122 | n/a | 0.983 | 17.402 | n/a | n/a | 0.138 | 10.740 | 0.291 | 0.138 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001da | 34.502 | 4.412 | 0.257 | 0.489 | 0.128 | 1.970 | 13.257 | 0.052 | n/a | 0.864 | 13.011 | n/a | n/a | 0.062 | 5.286 | 0.153 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001f8 | 33.648 | 4.384 | 0.201 | 0.281 | 0.076 | 2.245 | 11.603 | 0.132 | n/a | 0.814 | 13.824 | n/a | n/a | 0.087 | 4.942 | 0.147 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000210 | 33.034 | 3.724 | 0.196 | 0.000 | 0.074 | 1.843 | 10.501 | 0.111 | n/a | 0.183 | 16.360 | n/a | n/a | 0.043 | 3.995 | 0.121 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000021c | 31.285 | 3.524 | 0.009 | 0.000 | 0.525 | 0.797 | 1.034 | 21.147 | n/a | 0.133 | 4.077 | n/a | n/a | 0.038 | 4.057 | 0.130 | 0.038 | gw-w/thread-48/gateway.commit-order-wait | none observed |
| d114345e3dc2299800000000000001fa | 30.862 | 3.849 | 0.228 | 0.248 | 0.133 | 1.285 | 10.828 | 0.049 | n/a | 0.075 | 14.104 | n/a | n/a | 0.062 | 4.459 | 0.144 | 0.062 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000206 | 30.587 | 3.420 | 0.196 | 0.000 | 0.069 | 2.833 | 6.426 | 0.090 | n/a | 0.857 | 16.654 | n/a | n/a | 0.043 | 3.685 | 0.120 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001d1 | 28.815 | 3.998 | 0.270 | 0.301 | 0.140 | 1.393 | 9.258 | 0.081 | n/a | 0.119 | 13.186 | n/a | n/a | 0.069 | 4.708 | 0.163 | 0.069 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001ee | 28.805 | 3.934 | 0.218 | 0.260 | 0.090 | 1.710 | 8.022 | 0.060 | n/a | 0.355 | 14.109 | n/a | n/a | 0.046 | 4.502 | 0.156 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000216 | 27.443 | 4.336 | 0.246 | 0.000 | 0.109 | 1.538 | 6.942 | 0.059 | n/a | 0.138 | 14.021 | n/a | n/a | 0.055 | 4.691 | 0.171 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000202 | 27.249 | 5.836 | 0.237 | 0.400 | 0.059 | 1.648 | 7.552 | 0.049 | n/a | 0.117 | 11.282 | n/a | n/a | 0.068 | 6.532 | 0.240 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000020e | 26.146 | 3.519 | 0.189 | 0.000 | 0.155 | 1.209 | 4.065 | 0.053 | n/a | 0.088 | 16.768 | n/a | n/a | 0.100 | 3.863 | 0.148 | 0.100 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000020a | 25.844 | 5.287 | 0.268 | 0.000 | 0.067 | 1.791 | 9.062 | 0.050 | n/a | 0.080 | 9.196 | n/a | n/a | 0.043 | 5.622 | 0.218 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.886 | 0.714 | 0.000 | 1.888 | 4.290 | 0.006 | 0.000 | 0.815 | 0.823 | 1.262 | 0.043 | n/a | 0.166 | 9.562 | n/a | n/a | 0.053 | 5.202 | 0.273 | 0.053 |
| p99 | 36.936 | 1.566 | 0.011 | 6.594 | 9.103 | 0.021 | 0.000 | 1.617 | 3.026 | 4.524 | 21.147 | n/a | 4.078 | 17.402 | n/a | n/a | 0.138 | 10.740 | 0.515 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc2299800000000000001cd | 36.936 | 9.103 | 0.021 | 0.000 | 1.617 | 3.026 | 4.524 | 0.122 | n/a | 0.983 | 17.402 | n/a | n/a | 0.138 | 10.740 | 0.291 | 0.138 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000021c | 31.285 | 3.524 | 0.009 | 0.000 | 0.525 | 0.797 | 1.034 | 21.147 | n/a | 0.133 | 4.077 | n/a | n/a | 0.038 | 4.057 | 0.130 | 0.038 | gw-w/thread-48/gateway.commit-order-wait | none observed |
| d114345e3dc2299800000000000001cf | 25.231 | 7.321 | 0.017 | 0.000 | 0.318 | 0.823 | 1.760 | 0.041 | n/a | 0.123 | 14.757 | n/a | n/a | 0.071 | 7.656 | 0.303 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001d3 | 22.167 | 3.151 | 0.005 | 0.000 | 0.804 | 0.628 | 3.775 | 0.042 | n/a | 0.865 | 12.844 | n/a | n/a | 0.053 | 3.961 | 0.179 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001e3 | 21.285 | 4.814 | 0.010 | 0.000 | 0.819 | 1.394 | 2.922 | 0.099 | n/a | 0.721 | 10.454 | n/a | n/a | 0.052 | 5.643 | 0.265 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001ea | 20.529 | 4.934 | 0.009 | 0.000 | 0.361 | 0.803 | 1.262 | 0.045 | n/a | 0.316 | 12.739 | n/a | n/a | 0.060 | 5.304 | 0.258 | 0.060 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000211 | 20.397 | 5.097 | 0.009 | 0.000 | 0.309 | 1.091 | 1.172 | 0.037 | n/a | 0.283 | 12.319 | n/a | n/a | 0.080 | 5.415 | 0.265 | 0.080 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001f6 | 19.886 | 3.590 | 0.006 | 0.000 | 1.109 | 0.712 | 1.070 | 0.036 | n/a | 4.078 | 9.234 | n/a | n/a | 0.051 | 4.705 | 0.237 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000204 | 18.140 | 4.290 | 0.005 | 0.000 | 0.907 | 2.085 | 1.132 | 0.037 | n/a | 0.074 | 9.562 | n/a | n/a | 0.048 | 5.202 | 0.287 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001e5 | 17.963 | 3.090 | 0.006 | 0.000 | 1.376 | 0.773 | 1.410 | 0.043 | n/a | 0.116 | 11.109 | n/a | n/a | 0.041 | 4.471 | 0.249 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000207 | 17.857 | 8.378 | 0.006 | 0.000 | 0.815 | 1.075 | 1.928 | 0.093 | n/a | 0.166 | 5.359 | n/a | n/a | 0.037 | 9.199 | 0.515 | 0.037 | node-13/thread-0/driver.publication | none observed |
| d114345e3dc2299800000000000001dc | 16.704 | 4.844 | 0.006 | 0.000 | 0.896 | 0.857 | 2.380 | 0.044 | n/a | 0.125 | 7.468 | n/a | n/a | 0.083 | 5.746 | 0.344 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001e8 | 15.768 | 3.931 | 0.005 | 0.000 | 0.681 | 0.763 | 1.233 | 0.038 | n/a | 0.148 | 8.907 | n/a | n/a | 0.062 | 4.617 | 0.293 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000001ff | 15.071 | 3.310 | 0.005 | 0.000 | 0.800 | 0.632 | 1.115 | 0.102 | n/a | 0.248 | 8.742 | n/a | n/a | 0.117 | 4.115 | 0.273 | 0.117 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000020c | 13.709 | 3.734 | 0.010 | 0.000 | 1.127 | 0.830 | 1.226 | 0.037 | n/a | 0.102 | 6.593 | n/a | n/a | 0.053 | 4.870 | 0.355 | 0.053 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.987 | 0.493 | 0.000 | 1.510 | 3.997 | 0.010 | 0.000 | 0.218 | 1.080 | 2.274 | 0.050 | n/a | 0.326 | 8.839 | n/a | n/a | 0.044 | 4.556 | 0.246 | 0.044 |
| p99 | 46.999 | 3.240 | 0.009 | 4.873 | 9.157 | 3.206 | 0.000 | 1.109 | 4.604 | 31.393 | 3.434 | n/a | 4.644 | 26.494 | n/a | n/a | 0.099 | 9.537 | 0.490 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc229980000000000000281 | 46.999 | 4.236 | 0.334 | 0.000 | 0.159 | 1.554 | 31.393 | 0.040 | n/a | 0.081 | 9.121 | n/a | n/a | 0.081 | 4.729 | 0.101 | 0.081 | gw-w/thread-41/gateway.admitted-work | none observed |
| d114345e3dc229980000000000000242 | 41.545 | 5.476 | 0.520 | 0.000 | 0.163 | 2.504 | 12.190 | 0.063 | n/a | 3.001 | 17.554 | n/a | n/a | 0.073 | 6.159 | 0.148 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000234 | 40.365 | 4.266 | 0.237 | 0.000 | 0.095 | 2.176 | 14.586 | 0.103 | n/a | 4.644 | 14.198 | n/a | n/a | 0.061 | 4.597 | 0.114 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000252 | 37.499 | 5.406 | 3.206 | 0.000 | 0.053 | 2.011 | 8.393 | 0.113 | n/a | 0.878 | 17.387 | n/a | n/a | 0.052 | 8.665 | 0.231 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.360ms |
| d114345e3dc229980000000000000249 | 36.204 | 3.997 | 0.005 | 0.000 | 0.568 | 0.633 | 0.926 | 3.434 | n/a | 0.063 | 26.494 | n/a | n/a | 0.083 | 4.570 | 0.126 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.365ms |
| d114345e3dc229980000000000000232 | 35.853 | 3.534 | 0.319 | 0.000 | 0.083 | 1.413 | 14.987 | 0.073 | n/a | 0.103 | 15.296 | n/a | n/a | 0.045 | 3.936 | 0.110 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000022b | 34.922 | 4.547 | 0.182 | 0.000 | 0.075 | 1.718 | 5.767 | 0.046 | n/a | 0.767 | 21.778 | n/a | n/a | 0.041 | 4.805 | 0.138 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000027d | 33.052 | 4.587 | 0.170 | 0.000 | 0.061 | 4.417 | 16.856 | 0.055 | n/a | 0.095 | 6.770 | n/a | n/a | 0.040 | 4.818 | 0.146 | 0.040 | gw-w/thread-43/gateway.admitted-work | none observed |
| d114345e3dc229980000000000000268 | 32.250 | 5.422 | 0.011 | 0.000 | 1.088 | 4.604 | 16.765 | 0.084 | n/a | 0.144 | 4.033 | n/a | n/a | 0.099 | 6.521 | 0.202 | 0.099 | gw-w/thread-47/storage/begin-command! | none observed |
| d114345e3dc229980000000000000221 | 31.959 | 4.339 | 0.167 | 0.000 | 0.029 | 2.920 | 11.046 | 0.053 | n/a | 0.332 | 13.032 | n/a | n/a | 0.041 | 4.535 | 0.142 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000025c | 31.326 | 3.523 | 0.191 | 0.000 | 0.058 | 1.582 | 11.215 | 0.062 | n/a | 0.149 | 14.507 | n/a | n/a | 0.039 | 3.771 | 0.120 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000258 | 29.842 | 4.083 | 0.399 | 0.000 | 0.074 | 1.655 | 12.335 | 0.097 | n/a | 0.139 | 11.009 | n/a | n/a | 0.050 | 4.556 | 0.153 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000025a | 27.157 | 6.937 | 0.005 | 0.000 | 1.050 | 0.955 | 3.016 | 0.069 | n/a | 0.234 | 14.849 | n/a | n/a | 0.042 | 7.992 | 0.294 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000244 | 26.365 | 3.582 | 0.220 | 0.000 | 0.066 | 1.743 | 7.830 | 0.050 | n/a | 0.391 | 12.434 | n/a | n/a | 0.049 | 3.868 | 0.147 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000023e | 26.145 | 3.237 | 0.200 | 0.000 | 0.068 | 1.521 | 6.342 | 0.038 | n/a | 0.399 | 14.296 | n/a | n/a | 0.044 | 3.505 | 0.134 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000277 | 26.135 | 6.550 | 0.314 | 0.000 | 0.056 | 2.538 | 6.853 | 0.086 | n/a | 0.308 | 9.390 | n/a | n/a | 0.039 | 6.920 | 0.265 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000024e | 25.060 | 3.403 | 0.160 | 0.000 | 0.044 | 1.641 | 8.856 | 0.070 | n/a | 0.674 | 10.171 | n/a | n/a | 0.041 | 3.607 | 0.144 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000227 | 24.413 | 4.858 | 0.005 | 0.000 | 1.109 | 1.008 | 1.853 | 0.042 | n/a | 0.091 | 15.390 | n/a | n/a | 0.058 | 5.972 | 0.245 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000253 | 24.034 | 6.475 | 0.006 | 0.000 | 0.034 | 0.632 | 0.867 | 0.030 | n/a | 0.326 | 15.635 | n/a | n/a | 0.030 | 6.515 | 0.271 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000230 | 22.926 | 4.509 | 0.006 | 0.000 | 0.449 | 0.927 | 4.684 | 0.037 | n/a | 0.933 | 11.325 | n/a | n/a | 0.055 | 4.964 | 0.217 | 0.055 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.118 | 0.830 | 0.000 | 1.677 | 3.463 | 0.005 | 0.000 | 0.560 | 0.805 | 1.206 | 0.039 | n/a | 0.146 | 6.459 | n/a | n/a | 0.044 | 4.025 | 0.271 | 0.044 |
| p99 | 36.204 | 2.462 | 0.009 | 4.873 | 6.475 | 0.011 | 0.000 | 1.089 | 4.604 | 16.765 | 3.434 | n/a | 3.884 | 26.494 | n/a | n/a | 0.099 | 6.521 | 0.417 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc229980000000000000249 | 36.204 | 3.997 | 0.005 | 0.000 | 0.568 | 0.633 | 0.926 | 3.434 | n/a | 0.063 | 26.494 | n/a | n/a | 0.083 | 4.570 | 0.126 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.365ms |
| d114345e3dc229980000000000000268 | 32.250 | 5.422 | 0.011 | 0.000 | 1.088 | 4.604 | 16.765 | 0.084 | n/a | 0.144 | 4.033 | n/a | n/a | 0.099 | 6.521 | 0.202 | 0.099 | gw-w/thread-47/storage/begin-command! | none observed |
| d114345e3dc229980000000000000253 | 24.034 | 6.475 | 0.006 | 0.000 | 0.034 | 0.632 | 0.867 | 0.030 | n/a | 0.326 | 15.635 | n/a | n/a | 0.030 | 6.515 | 0.271 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000229 | 21.855 | 3.463 | 0.004 | 0.000 | 0.277 | 0.567 | 1.094 | 0.033 | n/a | 0.103 | 16.261 | n/a | n/a | 0.052 | 3.745 | 0.171 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000225 | 21.445 | 5.264 | 0.010 | 0.000 | 0.546 | 1.042 | 1.925 | 0.042 | n/a | 0.142 | 12.407 | n/a | n/a | 0.068 | 5.820 | 0.271 | 0.068 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000022d | 19.651 | 3.417 | 0.005 | 0.000 | 1.041 | 1.353 | 2.379 | 0.096 | n/a | 0.146 | 11.155 | n/a | n/a | 0.060 | 4.462 | 0.227 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000220 | 18.831 | 5.501 | 0.007 | 0.000 | 0.731 | 2.992 | 5.985 | 0.157 | n/a | 0.913 | 2.465 | n/a | n/a | 0.080 | 6.239 | 0.331 | 0.080 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| d114345e3dc22998000000000000025d | 16.099 | 3.387 | 0.004 | 0.000 | 0.425 | 0.824 | 1.043 | 0.034 | n/a | 3.884 | 6.459 | n/a | n/a | 0.040 | 3.815 | 0.237 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000235 | 14.118 | 3.051 | 0.005 | 0.000 | 0.375 | 0.845 | 1.307 | 0.032 | n/a | 1.053 | 7.410 | n/a | n/a | 0.040 | 3.430 | 0.243 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000275 | 13.282 | 2.858 | 0.005 | 0.000 | 1.021 | 0.659 | 1.431 | 0.067 | n/a | 0.157 | 7.049 | n/a | n/a | 0.037 | 3.883 | 0.292 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000027b | 12.958 | 3.570 | 0.006 | 0.000 | 0.449 | 0.927 | 1.215 | 0.044 | n/a | 0.134 | 6.569 | n/a | n/a | 0.044 | 4.025 | 0.311 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000026d | 12.038 | 3.801 | 0.005 | 0.000 | 0.457 | 0.852 | 1.797 | 0.057 | n/a | 0.606 | 4.423 | n/a | n/a | 0.040 | 4.263 | 0.354 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000027f | 11.134 | 3.156 | 0.006 | 0.000 | 0.560 | 0.805 | 1.206 | 0.039 | n/a | 0.138 | 5.179 | n/a | n/a | 0.044 | 3.722 | 0.334 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000023f | 10.051 | 3.519 | 0.005 | 0.000 | 0.671 | 0.771 | 0.890 | 0.034 | n/a | 0.398 | 3.710 | n/a | n/a | 0.052 | 4.195 | 0.417 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000263 | 9.457 | 2.681 | 0.004 | 0.000 | 1.089 | 0.575 | 0.955 | 0.034 | n/a | 0.110 | 3.974 | n/a | n/a | 0.035 | 3.774 | 0.399 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000025f | 8.534 | 2.683 | 0.004 | 0.000 | 0.735 | 0.593 | 0.985 | 0.033 | n/a | 0.392 | 3.080 | n/a | n/a | 0.028 | 3.423 | 0.401 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.751 | n/a | n/a | n/a | 37.855 | 14.550 | 2.143 | 0.000 | 0.370 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.048 | 59.891 | 0.906 | 8.048 |
| p99 | 221.774 | n/a | n/a | n/a | 150.619 | 141.627 | 34.833 | 0.000 | 110.889 | 51.002 | 0.007 | n/a | 0.013 | 0.000 | n/a | n/a | 145.760 | 213.239 | 1.000 | 145.760 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc229980000000000001a5f | 221.774 | 150.619 | 27.787 | 34.833 | 0.000 | 0.832 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.703 | 213.239 | 0.962 | 7.703 | node-13/thread-3/worker.gateway-observer.observe | driver.expected-state.bind-receipt 6.258ms; driver.publication 5.036ms; driver.publication 2.728ms; driver.publication 1.989ms; driver.publication 1.901ms |
| d114345e3dc229980000000000001d4b | 207.135 | 40.684 | 15.525 | 4.676 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 145.760 | 60.885 | 0.294 | 145.760 | node-13/thread-3/socket.wait-first-byte | driver.publication 2.169ms; driver.publication 1.569ms; driver.publication 1.541ms; driver.publication 1.482ms; driver.publication 1.433ms |
| d114345e3dc2299800000000000011d9 | 197.419 | 49.880 | 7.087 | 5.051 | 0.000 | 110.889 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.513 | 62.018 | 0.314 | 24.513 | node-13/thread-3/socket.queue-and-write | driver.publication 1.767ms; driver.publication 1.431ms; driver.publication 1.377ms; driver.publication 1.344ms; driver.publication 1.326ms |
| d114345e3dc2299800000000000011dd | 186.550 | 88.265 | 80.763 | 5.882 | 0.000 | 0.351 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.289 | 174.911 | 0.938 | 11.289 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 1.431ms; driver.publication 1.377ms; driver.publication 1.344ms; driver.publication 1.326ms; driver.publication 1.290ms |
| d114345e3dc229980000000000001d51 | 186.130 | 67.737 | 0.447 | 5.532 | 0.000 | 0.612 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 111.802 | 73.716 | 0.396 | 111.802 | node-13/thread-3/socket.wait-first-byte | driver.publication 2.169ms; driver.publication 1.569ms; driver.publication 1.541ms; driver.publication 1.482ms; driver.publication 1.433ms |
| d114345e3dc229980000000000001d4a | 158.830 | 29.070 | 21.810 | 2.980 | 0.000 | 0.720 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 104.250 | 53.860 | 0.339 | 104.250 | node-13/thread-3/socket.wait-first-byte | driver.publication 2.169ms; driver.publication 1.569ms; driver.publication 1.541ms; driver.publication 1.482ms; driver.publication 1.393ms |
| d114345e3dc229980000000000001ae1 | 152.250 | 49.161 | 93.497 | 0.000 | 0.000 | 0.431 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.160 | 142.659 | 0.937 | 9.160 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 1.986ms; driver.publication 1.531ms; driver.publication 1.397ms; driver.publication 1.387ms; driver.publication 1.276ms |
| d114345e3dc229980000000000000ee7 | 151.793 | 99.823 | 5.518 | 16.592 | 0.000 | 0.806 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.054 | 121.932 | 0.803 | 29.054 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 1.508ms; driver.publication 1.268ms; driver.publication 1.190ms; driver.publication 1.150ms; driver.publication 1.131ms |
| d114345e3dc2299800000000000011c2 | 149.011 | 7.362 | 141.627 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 148.990 | 1.000 | 0.022 | node-13/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 8.355ms; client.encode 6.811ms; driver.publication 6.189ms; driver.publication 4.857ms; driver.publication 2.648ms |
| d114345e3dc2299800000000000011d6 | 147.959 | 40.910 | 17.768 | 2.450 | 0.000 | 0.434 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.396 | 61.129 | 0.413 | 86.396 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 2.469ms; driver.publication 1.930ms; driver.publication 1.767ms; driver.publication 1.452ms; driver.publication 1.431ms |
| d114345e3dc229980000000000001d49 | 143.489 | 82.464 | 0.845 | 8.122 | 0.000 | 1.023 | 51.002 | 0.007 | n/a | 0.013 | 0.000 | n/a | n/a | 0.012 | 91.431 | 0.637 | 0.012 | gw-r/thread-48/gateway.admitted-work | driver.publication 1.569ms; driver.publication 1.541ms; driver.publication 1.501ms; driver.publication 1.482ms; driver.publication 1.393ms |
| d114345e3dc2299800000000000011c4 | 138.032 | 37.194 | 99.455 | 1.340 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.043 | 137.989 | 1.000 | 0.043 | node-13/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 8.355ms; client.encode 6.811ms; driver.publication 2.648ms; driver.expected-state.bind-receipt 2.469ms; client.parse 2.382ms |
| d114345e3dc2299800000000000011cf | 136.344 | 86.195 | 22.055 | 7.762 | 0.000 | 5.580 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.752 | 116.012 | 0.851 | 14.752 | node-13/thread-2/replica.pull-at | client.encode 6.811ms; driver.expected-state.bind-receipt 2.469ms; driver.publication 1.930ms; driver.publication 1.918ms; driver.publication 1.767ms |
| d114345e3dc22998000000000000161d | 135.761 | 74.922 | 0.460 | 7.057 | 0.000 | 0.474 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.848 | 82.439 | 0.607 | 52.848 | node-13/thread-3/socket.wait-first-byte | driver.publication 1.313ms; driver.publication 1.169ms; driver.publication 1.140ms; driver.publication 1.088ms |
| d114345e3dc2299800000000000011dc | 133.260 | 42.135 | 40.276 | 0.832 | 0.000 | 0.507 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.510 | 83.243 | 0.625 | 49.510 | node-13/thread-3/socket.wait-first-byte | driver.publication 1.431ms; driver.publication 1.377ms; driver.publication 1.344ms; driver.publication 1.326ms; driver.publication 1.312ms |
| d114345e3dc2299800000000000011c3 | 129.186 | 2.520 | 126.643 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 129.163 | 1.000 | 0.023 | node-13/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 8.355ms; client.encode 6.811ms; driver.publication 6.189ms; driver.publication 2.648ms; client.parse 2.382ms |
| d114345e3dc229980000000000000548 | 121.369 | 38.820 | 26.208 | 4.926 | 0.000 | 0.322 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.093 | 69.954 | 0.576 | 51.093 | node-13/thread-3/socket.wait-first-byte | driver.publication 1.570ms; driver.publication 1.359ms; driver.expected-state.bind-receipt 1.117ms; driver.publication 1.093ms |
| d114345e3dc2299800000000000011d7 | 118.522 | 37.855 | 14.550 | 3.191 | 0.000 | 0.448 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 62.478 | 55.596 | 0.469 | 62.478 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 2.469ms; driver.publication 1.767ms; driver.publication 1.452ms; driver.publication 1.431ms; driver.publication 1.377ms |
| d114345e3dc229980000000000001822 | 118.244 | 53.695 | 3.206 | 5.933 | 0.000 | 1.500 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 53.910 | 62.834 | 0.531 | 53.910 | node-13/thread-3/socket.wait-first-byte | driver.publication 1.635ms; driver.publication 1.306ms; driver.publication 1.246ms; driver.publication 1.104ms; driver.publication 1.030ms |
| d114345e3dc229980000000000001ae0 | 115.759 | 70.936 | 0.505 | 12.500 | 0.000 | 0.526 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.291 | 83.941 | 0.725 | 31.291 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 1.420ms; driver.publication 1.397ms; driver.publication 1.387ms; driver.publication 1.276ms; driver.publication 1.203ms |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.347 | 0.584 | 0.000 | 1.435 | 4.043 | 0.018 | 0.000 | 0.185 | 1.149 | 2.295 | 0.046 | n/a | 0.133 | 8.924 | n/a | n/a | 0.052 | 4.528 | 0.251 | 0.052 |
| p99 | 54.132 | 2.052 | 0.011 | 3.864 | 6.512 | n/a | 0.000 | 1.156 | 8.292 | 27.424 | 2.951 | n/a | 0.857 | 28.104 | n/a | n/a | 0.110 | 6.896 | 0.431 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc229980000000000000292 | 54.132 | 3.621 | 0.196 | 0.000 | 0.057 | 1.548 | 20.180 | 0.121 | n/a | 0.252 | 28.104 | n/a | n/a | 0.051 | 3.875 | 0.072 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002d7 | 43.032 | 4.043 | 0.253 | 0.000 | 0.185 | 1.502 | 27.424 | 0.044 | n/a | 0.103 | 9.405 | n/a | n/a | 0.072 | 4.481 | 0.104 | 0.072 | gw-w/thread-41/gateway.admitted-work | none observed |
| d114345e3dc229980000000000000298 | 36.775 | 5.730 | 0.300 | 0.000 | 0.052 | 1.466 | 9.772 | 0.046 | n/a | 0.120 | 19.246 | n/a | n/a | 0.042 | 6.082 | 0.165 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002cf | 33.641 | 5.600 | 0.277 | 0.000 | 0.075 | 2.858 | 10.863 | 0.059 | n/a | 0.159 | 13.690 | n/a | n/a | 0.060 | 5.952 | 0.177 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002d5 | 32.552 | 3.756 | 0.319 | 0.000 | 0.074 | 1.493 | 8.479 | 0.066 | n/a | 0.471 | 17.837 | n/a | n/a | 0.058 | 4.149 | 0.127 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002a8 | 30.635 | 3.390 | 0.283 | 0.000 | 0.071 | 1.734 | 13.034 | 0.094 | n/a | 0.526 | 11.461 | n/a | n/a | 0.042 | 3.743 | 0.122 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000029a | 30.446 | 4.221 | 0.401 | 0.000 | 0.172 | 5.301 | 8.904 | 0.044 | n/a | 0.078 | 11.237 | n/a | n/a | 0.087 | 4.794 | 0.157 | 0.087 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002b4 | 27.342 | 5.722 | 0.218 | 0.000 | 0.079 | 2.774 | 8.491 | 0.111 | n/a | 0.191 | 9.705 | n/a | n/a | 0.051 | 6.020 | 0.220 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002b2 | 27.148 | 4.349 | 0.146 | 0.000 | 0.032 | 1.531 | 5.412 | 0.037 | n/a | 0.065 | 15.542 | n/a | n/a | 0.033 | 4.528 | 0.167 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000287 | 25.974 | 3.959 | 0.326 | 0.000 | 0.066 | 1.676 | 7.781 | 0.054 | n/a | 0.121 | 11.947 | n/a | n/a | 0.043 | 4.351 | 0.168 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002c5 | 25.342 | 3.553 | 0.005 | 0.000 | 0.159 | 0.782 | 1.860 | 2.951 | n/a | 0.098 | 15.851 | n/a | n/a | 0.082 | 3.717 | 0.147 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002c0 | 25.314 | 3.268 | 0.197 | 0.000 | 0.069 | 1.497 | 9.762 | 0.070 | n/a | 0.129 | 10.271 | n/a | n/a | 0.052 | 3.534 | 0.140 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002ca | 24.904 | 3.756 | 0.251 | 0.000 | 0.098 | 1.869 | 8.146 | 0.077 | n/a | 0.535 | 10.128 | n/a | n/a | 0.045 | 4.104 | 0.165 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002a4 | 24.661 | 4.848 | 0.184 | 0.000 | 0.061 | 1.717 | 7.627 | 0.039 | n/a | 0.354 | 9.790 | n/a | n/a | 0.041 | 5.093 | 0.207 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000289 | 22.346 | 4.060 | 0.005 | 0.000 | 0.069 | 0.772 | 1.104 | 0.037 | n/a | 0.102 | 16.145 | n/a | n/a | 0.052 | 4.134 | 0.185 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002cc | 21.655 | 2.130 | n/a | 0.000 | 0.797 | 8.292 | 10.311 | 0.012 | n/a | 0.034 | 0.000 | n/a | n/a | 0.079 | 2.927 | 0.135 | 0.079 | node-13/thread-0/socket.wait-first-byte | none observed |
| d114345e3dc22998000000000000028d | 21.605 | 4.855 | 0.005 | 0.000 | 0.833 | 0.881 | 2.295 | 0.066 | n/a | 0.158 | 12.462 | n/a | n/a | 0.051 | 5.692 | 0.263 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002bc | 21.299 | 4.814 | 0.317 | 0.000 | 0.131 | 1.635 | 5.442 | 0.040 | n/a | 0.103 | 8.740 | n/a | n/a | 0.077 | 5.263 | 0.247 | 0.077 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002b0 | 20.857 | 4.981 | 0.011 | 0.000 | 1.078 | 0.865 | 1.121 | 0.034 | n/a | 0.083 | 12.619 | n/a | n/a | 0.066 | 6.070 | 0.291 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002ac | 20.690 | 3.693 | 0.201 | 0.000 | 0.073 | 1.723 | 6.022 | 0.054 | n/a | 0.137 | 8.742 | n/a | n/a | 0.045 | 3.967 | 0.192 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.526 | 0.882 | 0.000 | 1.774 | 3.751 | 0.005 | 0.000 | 0.545 | 1.025 | 1.688 | 0.064 | n/a | 0.230 | 6.401 | n/a | n/a | 0.063 | 4.174 | 0.309 | 0.063 |
| p99 | 25.342 | 1.980 | 0.005 | 3.864 | 6.512 | n/a | 0.000 | 0.832 | 8.292 | 10.311 | 2.951 | n/a | 0.857 | 15.851 | n/a | n/a | 0.110 | 6.896 | 0.431 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc2299800000000000002c5 | 25.342 | 3.553 | 0.005 | 0.000 | 0.159 | 0.782 | 1.860 | 2.951 | n/a | 0.098 | 15.851 | n/a | n/a | 0.082 | 3.717 | 0.147 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002cc | 21.655 | 2.130 | n/a | 0.000 | 0.797 | 8.292 | 10.311 | 0.012 | n/a | 0.034 | 0.000 | n/a | n/a | 0.079 | 2.927 | 0.135 | 0.079 | node-13/thread-0/socket.wait-first-byte | none observed |
| d114345e3dc2299800000000000002bd | 18.704 | 6.512 | 0.008 | 0.000 | 0.376 | 0.853 | 1.871 | 0.077 | n/a | 0.230 | 8.714 | n/a | n/a | 0.063 | 6.896 | 0.369 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002b6 | 17.325 | 3.593 | 0.009 | 0.000 | 0.545 | 1.149 | 1.360 | 0.044 | n/a | 0.114 | 10.461 | n/a | n/a | 0.051 | 4.146 | 0.239 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000282 | 16.608 | 3.681 | 0.005 | 0.000 | 0.489 | 0.725 | 1.688 | 0.090 | n/a | 0.607 | 9.278 | n/a | n/a | 0.046 | 4.174 | 0.251 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002ba | 16.425 | 5.773 | 0.018 | 0.000 | 0.780 | 1.352 | 2.225 | 0.087 | n/a | 0.344 | 5.737 | n/a | n/a | 0.110 | 6.571 | 0.400 | 0.110 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000029e | 15.545 | 3.960 | 0.008 | 0.000 | 0.832 | 0.970 | 1.506 | 0.090 | n/a | 0.435 | 7.678 | n/a | n/a | 0.066 | 4.800 | 0.309 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002a5 | 15.526 | 4.384 | 0.005 | 0.000 | 0.498 | 1.026 | 2.218 | 0.070 | n/a | 0.857 | 6.401 | n/a | n/a | 0.066 | 4.888 | 0.315 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc22998000000000000029b | 15.193 | 5.782 | 0.006 | 0.000 | 0.757 | 1.025 | 1.028 | 0.034 | n/a | 0.397 | 6.099 | n/a | n/a | 0.063 | 6.546 | 0.431 | 0.063 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002c1 | 14.753 | 3.751 | 0.006 | 0.000 | 0.263 | 0.915 | 1.121 | 0.039 | n/a | 0.086 | 8.525 | n/a | n/a | 0.048 | 4.019 | 0.272 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000285 | 14.395 | 4.309 | 0.005 | 0.000 | 0.518 | 1.069 | 2.052 | 0.083 | n/a | 0.167 | 6.118 | n/a | n/a | 0.074 | 4.832 | 0.336 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002ae | 13.824 | 4.471 | 0.005 | 0.000 | 0.563 | 1.034 | 1.663 | 0.064 | n/a | 0.127 | 5.853 | n/a | n/a | 0.044 | 5.039 | 0.364 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002c8 | 12.975 | 2.893 | 0.004 | 0.000 | 0.705 | 0.687 | 2.680 | 0.043 | n/a | 0.694 | 5.232 | n/a | n/a | 0.036 | 3.603 | 0.278 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000002a2 | 12.549 | 3.058 | 0.005 | 0.000 | 0.302 | 0.776 | 1.040 | 0.040 | n/a | 0.406 | 6.872 | n/a | n/a | 0.050 | 3.365 | 0.268 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000293 | 10.657 | 2.917 | 0.005 | 0.000 | 0.731 | 1.374 | 1.168 | 0.041 | n/a | 0.133 | 4.251 | n/a | n/a | 0.038 | 3.653 | 0.343 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.837 | 0.792 | 0.000 | 1.620 | 3.658 | 0.004 | 0.000 | 0.718 | 0.813 | 1.219 | 0.035 | n/a | 0.127 | 6.901 | n/a | n/a | 0.036 | 4.596 | 0.316 | 0.036 |
| p99 | 67.380 | 3.264 | 0.040 | 6.197 | 11.025 | 5.083 | 0.000 | 17.898 | 9.492 | 8.713 | 3.694 | n/a | 3.808 | 47.366 | n/a | n/a | 0.106 | 28.118 | 0.690 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc2299800000000000004a4 | 80.369 | 3.908 | 0.006 | 0.000 | 9.356 | 0.684 | 1.097 | 0.040 | n/a | 0.106 | 65.139 | n/a | n/a | 0.031 | 13.271 | 0.165 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.790ms; driver.publication 2.052ms; driver.publication 1.867ms; driver.publication 1.281ms |
| d114345e3dc2299800000000000004a7 | 80.217 | 7.758 | 0.344 | 0.000 | 6.203 | 7.538 | 1.233 | 3.870 | n/a | 0.201 | 53.035 | n/a | n/a | 0.036 | 14.304 | 0.178 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.790ms; driver.publication 1.867ms; driver.publication 1.515ms; driver.publication 1.345ms; driver.publication 1.281ms |
| d114345e3dc2299800000000000004a2 | 77.759 | 9.272 | 0.154 | 0.000 | 3.100 | 0.938 | 1.160 | 2.107 | n/a | 0.025 | 60.971 | n/a | n/a | 0.031 | 12.525 | 0.161 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.790ms; driver.publication 2.052ms; driver.publication 1.867ms; driver.publication 0.657ms |
| d114345e3dc2299800000000000004a9 | 75.032 | 3.504 | 0.006 | 0.000 | 60.441 | 1.663 | 1.252 | 0.091 | n/a | 0.132 | 7.911 | n/a | n/a | 0.031 | 63.951 | 0.852 | 0.031 | node-13/thread-0/driver.queue.subject | driver.publication 1.867ms; driver.publication 1.515ms; driver.publication 1.345ms; driver.publication 1.281ms; driver.publication 1.230ms |
| d114345e3dc2299800000000000004a6 | 74.336 | 5.922 | 0.012 | 0.000 | 5.640 | 3.344 | 2.696 | 0.106 | n/a | 7.721 | 48.374 | n/a | n/a | 0.522 | 11.574 | 0.156 | 0.522 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 2.790ms; driver.publication 1.867ms; driver.publication 1.345ms; driver.publication 1.281ms |
| d114345e3dc229980000000000000357 | 71.276 | 4.501 | 0.005 | 0.000 | 0.546 | 30.917 | 2.172 | 0.036 | n/a | 0.050 | 33.018 | n/a | n/a | 0.031 | 5.052 | 0.071 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 16.333ms; driver.publication 5.553ms; client.encode 3.442ms; driver.publication 1.281ms |
| d114345e3dc229980000000000000363 | 68.792 | 5.148 | 0.005 | 0.000 | 42.346 | 3.757 | 4.222 | 0.055 | n/a | 0.114 | 13.118 | n/a | n/a | 0.029 | 47.499 | 0.690 | 0.029 | node-13/thread-0/driver.queue.subject | driver.publication 6.768ms; driver.publication 2.652ms; driver.publication 2.179ms; driver.publication 1.943ms; driver.publication 1.376ms |
| d114345e3dc2299800000000000004a8 | 67.453 | 4.166 | 0.010 | 0.000 | 2.618 | 1.745 | 1.053 | 5.411 | n/a | 0.025 | 52.362 | n/a | n/a | 0.062 | 6.794 | 0.101 | 0.062 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.867ms; driver.publication 1.345ms; driver.publication 1.281ms; driver.publication 1.230ms |
| d114345e3dc22998000000000000035a | 67.380 | 5.292 | 0.008 | 0.000 | 7.313 | 2.885 | 7.464 | 0.114 | n/a | 3.404 | 40.874 | n/a | n/a | 0.027 | 12.612 | 0.187 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 16.333ms; driver.publication 5.553ms; client.encode 3.442ms; driver.publication 1.943ms |
| d114345e3dc22998000000000000036c | 67.220 | 3.038 | 0.008 | 0.000 | 50.876 | 0.590 | 2.757 | 0.045 | n/a | 0.110 | 9.764 | n/a | n/a | 0.033 | 53.921 | 0.802 | 0.033 | node-13/thread-0/driver.queue.subject | driver.publication 2.955ms; driver.publication 2.652ms; driver.plan-and-encode-command 1.709ms; driver.publication 1.342ms; driver.publication 1.280ms |
| d114345e3dc229980000000000000473 | 67.012 | 5.221 | 0.005 | 0.000 | 1.009 | 5.013 | 1.674 | 0.046 | n/a | 0.072 | 53.933 | n/a | n/a | 0.039 | 6.235 | 0.093 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.357ms; driver.expected-state.bind-receipt 1.272ms; driver.publication 1.159ms; driver.publication 1.063ms |
| d114345e3dc2299800000000000002e6 | 66.122 | 3.116 | 0.178 | 0.000 | 0.040 | 2.204 | 8.713 | 0.104 | n/a | 0.231 | 51.489 | n/a | n/a | 0.046 | 3.334 | 0.050 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc2299800000000000004a1 | 64.404 | 9.301 | 0.019 | 0.000 | 4.546 | 4.538 | 2.432 | 0.132 | n/a | 0.099 | 43.289 | n/a | n/a | 0.048 | 13.866 | 0.215 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.790ms; driver.publication 2.052ms; driver.publication 1.199ms |
| d114345e3dc2299800000000000003a7 | 63.666 | 4.926 | 0.006 | 0.000 | 0.560 | 5.262 | 4.569 | 0.110 | n/a | 0.821 | 47.366 | n/a | n/a | 0.046 | 5.492 | 0.086 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.523ms; driver.publication 1.460ms |
| d114345e3dc22998000000000000035f | 63.406 | 15.253 | 20.848 | 0.000 | 2.666 | 1.965 | 1.589 | 0.027 | n/a | 0.721 | 20.168 | n/a | n/a | 0.168 | 38.768 | 0.611 | 0.168 | node-13/thread-0/client.commit-send-queue | driver.publication 6.768ms; client.encode 3.442ms; driver.publication 2.179ms; driver.publication 1.943ms; driver.publication 1.367ms |
| d114345e3dc229980000000000000822 | 60.573 | 2.452 | 0.004 | 0.000 | 42.824 | 3.010 | 0.774 | 1.332 | n/a | 0.060 | 10.091 | n/a | n/a | 0.026 | 45.280 | 0.748 | 0.026 | node-13/thread-0/driver.queue.subject | driver.publication 3.330ms; driver.publication 2.347ms; driver.publication 1.313ms; driver.publication 1.228ms; driver.publication 1.199ms |
| d114345e3dc22998000000000000035e | 60.053 | 14.773 | 7.178 | 3.033 | 3.296 | 10.222 | 1.529 | 0.042 | n/a | 0.061 | 19.896 | n/a | n/a | 0.023 | 28.281 | 0.471 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 6.768ms; driver.publication 1.943ms; driver.publication 1.855ms; driver.publication 1.367ms; driver.publication 1.031ms |
| d114345e3dc2299800000000000003a3 | 58.292 | 5.593 | 0.016 | 0.000 | 0.580 | 0.803 | 1.099 | 0.044 | n/a | 0.392 | 49.672 | n/a | n/a | 0.094 | 6.189 | 0.106 | 0.094 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.356ms; driver.publication 1.309ms |
| d114345e3dc229980000000000000827 | 57.501 | 8.912 | 0.111 | 0.000 | 2.346 | 10.666 | 3.380 | 0.655 | n/a | 0.148 | 31.248 | n/a | n/a | 0.034 | 11.370 | 0.198 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.347ms; driver.publication 1.313ms; driver.publication 1.228ms; driver.publication 1.199ms; driver.publication 1.070ms |
| d114345e3dc2299800000000000003a6 | 56.700 | 7.633 | 0.013 | 0.000 | 5.000 | 2.460 | 2.433 | 0.086 | n/a | 1.032 | 38.009 | n/a | n/a | 0.034 | 12.646 | 0.223 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.460ms; driver.publication 1.309ms; driver.publication 0.888ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.853 | 0.645 | 0.000 | 1.487 | 3.164 | 0.004 | 0.000 | 0.720 | 0.768 | 1.018 | 0.034 | n/a | 0.121 | 6.182 | n/a | n/a | 0.035 | 4.117 | 0.309 | 0.035 |
| p99 | 60.573 | 2.178 | 0.063 | 6.257 | 8.641 | 3.099 | 0.000 | 15.466 | 7.859 | 6.649 | 3.997 | n/a | 3.817 | 42.501 | n/a | n/a | 0.116 | 19.513 | 0.685 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc2299800000000000004a7 | 80.217 | 7.758 | 0.344 | 0.000 | 6.203 | 7.538 | 1.233 | 3.870 | n/a | 0.201 | 53.035 | n/a | n/a | 0.036 | 14.304 | 0.178 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.790ms; driver.publication 1.867ms; driver.publication 1.515ms; driver.publication 1.345ms; driver.publication 1.281ms |
| d114345e3dc2299800000000000004a8 | 67.453 | 4.166 | 0.010 | 0.000 | 2.618 | 1.745 | 1.053 | 5.411 | n/a | 0.025 | 52.362 | n/a | n/a | 0.062 | 6.794 | 0.101 | 0.062 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.867ms; driver.publication 1.345ms; driver.publication 1.281ms; driver.publication 1.230ms |
| d114345e3dc22998000000000000035a | 67.380 | 5.292 | 0.008 | 0.000 | 7.313 | 2.885 | 7.464 | 0.114 | n/a | 3.404 | 40.874 | n/a | n/a | 0.027 | 12.612 | 0.187 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 16.333ms; driver.publication 5.553ms; client.encode 3.442ms; driver.publication 1.943ms |
| d114345e3dc22998000000000000036c | 67.220 | 3.038 | 0.008 | 0.000 | 50.876 | 0.590 | 2.757 | 0.045 | n/a | 0.110 | 9.764 | n/a | n/a | 0.033 | 53.921 | 0.802 | 0.033 | node-13/thread-0/driver.queue.subject | driver.publication 2.955ms; driver.publication 2.652ms; driver.plan-and-encode-command 1.709ms; driver.publication 1.342ms; driver.publication 1.280ms |
| d114345e3dc229980000000000000822 | 60.573 | 2.452 | 0.004 | 0.000 | 42.824 | 3.010 | 0.774 | 1.332 | n/a | 0.060 | 10.091 | n/a | n/a | 0.026 | 45.280 | 0.748 | 0.026 | node-13/thread-0/driver.queue.subject | driver.publication 3.330ms; driver.publication 2.347ms; driver.publication 1.313ms; driver.publication 1.228ms; driver.publication 1.199ms |
| d114345e3dc2299800000000000003a3 | 58.292 | 5.593 | 0.016 | 0.000 | 0.580 | 0.803 | 1.099 | 0.044 | n/a | 0.392 | 49.672 | n/a | n/a | 0.094 | 6.189 | 0.106 | 0.094 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.356ms; driver.publication 1.309ms |
| d114345e3dc229980000000000000366 | 54.357 | 3.075 | 3.099 | 0.000 | 0.486 | 6.121 | 0.906 | 0.720 | n/a | 0.024 | 39.905 | n/a | n/a | 0.022 | 6.660 | 0.123 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 6.768ms; driver.publication 2.652ms; driver.publication 2.179ms; driver.publication 1.376ms; driver.expected-state.bind-receipt 1.286ms |
| d114345e3dc22998000000000000035d | 53.137 | 16.793 | 6.639 | 0.000 | 3.247 | 1.052 | 4.125 | 0.045 | n/a | 0.332 | 20.876 | n/a | n/a | 0.029 | 26.679 | 0.502 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | client.encode 3.442ms; driver.publication 1.943ms; driver.publication 1.926ms; driver.publication 1.367ms; driver.publication 1.031ms |
| d114345e3dc229980000000000000365 | 52.419 | 3.351 | 2.860 | 0.000 | 0.356 | 2.744 | 1.650 | 2.260 | n/a | 0.033 | 39.130 | n/a | n/a | 0.035 | 6.567 | 0.125 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 6.768ms; driver.publication 2.652ms; driver.publication 2.179ms; driver.publication 1.376ms; driver.expected-state.bind-receipt 1.286ms |
| d114345e3dc22998000000000000035c | 50.903 | 5.691 | 0.030 | 0.000 | 11.693 | 9.667 | 2.088 | 0.081 | n/a | 0.735 | 20.885 | n/a | n/a | 0.033 | 17.414 | 0.342 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 10.712ms; client.encode 3.442ms; driver.publication 1.943ms; driver.publication 1.367ms |
| d114345e3dc229980000000000000777 | 49.462 | 3.965 | 0.007 | 0.000 | 1.321 | 0.701 | 0.820 | 0.026 | n/a | 0.083 | 42.501 | n/a | n/a | 0.040 | 5.293 | 0.107 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000778 | 48.411 | 2.710 | 0.004 | 0.000 | 0.122 | 4.543 | 1.105 | 0.049 | n/a | 0.092 | 39.740 | n/a | n/a | 0.047 | 2.835 | 0.059 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.077ms; driver.publication 1.024ms |
| d114345e3dc229980000000000000677 | 48.123 | 2.429 | 0.002 | 0.000 | 0.545 | 0.389 | 0.730 | 0.023 | n/a | 0.685 | 43.292 | n/a | n/a | 0.026 | 2.976 | 0.062 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 2.133ms |
| d114345e3dc229980000000000000498 | 47.516 | 5.922 | 0.005 | 0.000 | 13.146 | 9.492 | 1.667 | 0.130 | n/a | 0.172 | 16.951 | n/a | n/a | 0.031 | 19.074 | 0.401 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.974ms; driver.publication 1.838ms; driver.publication 1.419ms; driver.publication 1.216ms; driver.publication 1.199ms |
| d114345e3dc229980000000000000779 | 46.476 | 2.041 | 0.002 | 0.000 | 1.203 | 4.322 | 0.868 | 0.045 | n/a | 0.164 | 37.811 | n/a | n/a | 0.021 | 3.245 | 0.070 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.024ms |
| d114345e3dc229980000000000000370 | 45.400 | 3.351 | 0.006 | 0.000 | 0.125 | 5.095 | 1.242 | 0.034 | n/a | 0.069 | 35.448 | n/a | n/a | 0.031 | 3.481 | 0.077 | 0.031 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.955ms; driver.publication 1.342ms; driver.publication 1.113ms |
| d114345e3dc229980000000000000362 | 44.986 | 3.194 | 7.538 | 0.000 | 7.778 | 3.558 | 1.029 | 5.252 | n/a | 0.068 | 16.553 | n/a | n/a | 0.015 | 18.511 | 0.411 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 6.768ms; driver.publication 2.652ms; driver.publication 2.179ms; driver.publication 1.943ms; driver.publication 1.376ms |
| d114345e3dc2299800000000000002e0 | 44.962 | 10.268 | 0.020 | 0.000 | 1.067 | 2.836 | 5.919 | 0.113 | n/a | 0.453 | 24.250 | n/a | n/a | 0.036 | 11.354 | 0.253 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d114345e3dc229980000000000000679 | 44.737 | 5.249 | 0.003 | 0.000 | 0.632 | 0.636 | 1.558 | 0.046 | n/a | 0.536 | 36.033 | n/a | n/a | 0.043 | 5.884 | 0.132 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.116ms |
| d114345e3dc229980000000000000356 | 44.247 | 18.320 | 0.006 | 0.000 | 0.209 | 1.634 | 1.125 | 0.038 | n/a | 0.099 | 22.772 | n/a | n/a | 0.046 | 18.534 | 0.419 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 5.553ms; driver.publication 1.281ms |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.947 | 0.817 | 0.000 | 1.676 | 3.691 | 0.005 | 0.000 | 0.761 | 0.713 | 1.114 | 0.029 | n/a | 0.109 | 5.566 | n/a | n/a | 0.034 | 4.709 | 0.361 | 0.034 |
| p99 | 88.547 | 3.198 | 0.059 | 5.545 | 12.045 | 1.780 | 0.000 | 28.625 | 18.712 | 8.781 | 1.797 | n/a | 2.996 | 40.366 | n/a | n/a | 0.111 | 35.646 | 0.743 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc2299800000000000011ba | 271.276 | 2.690 | 0.006 | 0.000 | 225.845 | 4.540 | 0.921 | 0.032 | n/a | 0.302 | 36.902 | n/a | n/a | 0.038 | 228.541 | 0.842 | 0.038 | node-13/thread-0/driver.queue.subject | driver.publication 8.383ms; driver.expected-state.bind-receipt 8.355ms; client.encode 6.811ms; driver.publication 6.189ms; driver.publication 5.390ms |
| d114345e3dc2299800000000000011b8 | 229.125 | 63.437 | 0.026 | 0.000 | 2.202 | 79.500 | 13.031 | 1.240 | n/a | 3.375 | 66.270 | n/a | n/a | 0.044 | 65.665 | 0.287 | 0.044 | node-13/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 8.355ms; driver.publication 6.189ms; driver.publication 5.390ms; driver.publication 5.199ms; driver.publication 4.857ms |
| d114345e3dc229980000000000001476 | 218.245 | 10.193 | 27.467 | 0.000 | 6.451 | 22.539 | 5.126 | 5.115 | n/a | 0.126 | 141.189 | n/a | n/a | 0.040 | 44.110 | 0.202 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | client.encode 4.087ms; driver.publication 2.910ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.489ms |
| d114345e3dc2299800000000000011c1 | 184.035 | 8.143 | 0.011 | 0.000 | 147.392 | 7.336 | 8.479 | 0.062 | n/a | 0.152 | 12.382 | n/a | n/a | 0.080 | 155.546 | 0.845 | 0.080 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 8.355ms; driver.publication 6.189ms; driver.publication 5.390ms; driver.publication 4.857ms; driver.expected-state.bind-receipt 2.957ms |
| d114345e3dc2299800000000000011bf | 158.562 | 20.148 | 0.006 | 0.000 | 32.973 | 16.912 | 8.766 | 0.080 | n/a | 6.859 | 72.771 | n/a | n/a | 0.047 | 53.127 | 0.335 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 8.383ms; driver.publication 6.189ms; driver.publication 5.390ms; driver.publication 4.857ms; driver.expected-state.bind-receipt 2.957ms |
| d114345e3dc2299800000000000011c0 | 154.063 | 17.571 | 0.008 | 0.000 | 57.326 | 20.593 | 7.738 | 0.057 | n/a | 0.142 | 50.588 | n/a | n/a | 0.041 | 74.905 | 0.486 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 8.355ms; driver.publication 6.767ms; driver.publication 6.189ms; driver.publication 5.390ms; driver.publication 4.857ms |
| d114345e3dc229980000000000001479 | 144.330 | 6.844 | 0.006 | 0.000 | 0.959 | 19.873 | 38.565 | 2.618 | n/a | 0.502 | 74.874 | n/a | n/a | 0.089 | 7.809 | 0.054 | 0.089 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.910ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.485ms |
| d114345e3dc229980000000000001477 | 142.108 | 8.296 | 0.005 | 0.000 | 1.110 | 0.785 | 2.973 | 0.041 | n/a | 0.073 | 128.665 | n/a | n/a | 0.158 | 9.411 | 0.066 | 0.158 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.200ms |
| d114345e3dc22998000000000000147e | 141.333 | 8.728 | 7.285 | 0.000 | 84.698 | 4.346 | 1.716 | 3.119 | n/a | 0.018 | 31.360 | n/a | n/a | 0.061 | 100.712 | 0.713 | 0.061 | node-13/thread-0/driver.queue.subject | client.encode 4.087ms; driver.publication 2.910ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.489ms |
| d114345e3dc2299800000000000011c5 | 139.816 | 11.090 | 0.010 | 6.469 | 87.387 | 2.574 | 4.035 | 0.055 | n/a | 0.157 | 27.983 | n/a | n/a | 0.055 | 104.957 | 0.751 | 0.055 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 8.355ms; driver.publication 3.731ms; driver.publication 2.648ms; client.parse 2.382ms; driver.expected-state.bind-receipt 2.205ms |
| d114345e3dc22998000000000000147c | 130.468 | 4.876 | 0.008 | 0.000 | 0.671 | 24.632 | 9.222 | 2.123 | n/a | 0.018 | 88.863 | n/a | n/a | 0.056 | 5.555 | 0.043 | 0.056 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.910ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.485ms; driver.publication 1.471ms |
| d114345e3dc22998000000000000147a | 129.605 | 4.739 | 0.006 | 0.000 | 1.396 | 24.344 | 19.822 | 2.318 | n/a | 1.130 | 75.794 | n/a | n/a | 0.058 | 6.141 | 0.047 | 0.058 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.910ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.485ms; driver.publication 1.471ms; driver.expected-state.bind-receipt 1.280ms |
| d114345e3dc22998000000000000147f | 129.542 | 5.045 | 5.234 | 0.000 | 82.402 | 3.447 | 0.960 | 1.374 | n/a | 0.014 | 31.020 | n/a | n/a | 0.047 | 92.681 | 0.715 | 0.047 | node-13/thread-0/driver.queue.subject | client.encode 4.087ms; driver.publication 2.910ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.489ms |
| d114345e3dc2299800000000000011bd | 128.658 | 21.169 | 0.013 | 0.000 | 3.594 | 47.097 | 8.509 | 0.061 | n/a | 1.276 | 46.833 | n/a | n/a | 0.104 | 24.777 | 0.193 | 0.104 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 8.383ms; driver.publication 5.390ms; driver.publication 4.857ms; driver.expected-state.bind-receipt 2.957ms; driver.expected-state.bind-receipt 2.613ms |
| d114345e3dc22998000000000000147b | 123.513 | 6.819 | 0.009 | 0.000 | 0.880 | 16.521 | 2.506 | 10.835 | n/a | 0.083 | 85.712 | n/a | n/a | 0.148 | 7.708 | 0.062 | 0.148 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.910ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.485ms; driver.publication 1.471ms; driver.expected-state.bind-receipt 1.280ms |
| d114345e3dc2299800000000000011bb | 118.748 | 23.543 | 0.014 | 0.000 | 3.472 | 52.566 | 2.692 | 0.061 | n/a | 3.887 | 32.126 | n/a | n/a | 0.386 | 27.030 | 0.228 | 0.386 | node-13/thread-0/socket.wait-first-byte | driver.publication 8.383ms; driver.publication 5.390ms; driver.publication 5.199ms; driver.expected-state.bind-receipt 2.957ms; driver.publication 2.462ms |
| d114345e3dc229980000000000001488 | 113.304 | 3.915 | 0.007 | 0.000 | 88.285 | 0.700 | 1.319 | 0.034 | n/a | 0.095 | 18.918 | n/a | n/a | 0.031 | 92.207 | 0.814 | 0.031 | node-13/thread-0/driver.queue.subject | client.encode 4.087ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.751ms; driver.publication 1.489ms; driver.publication 1.485ms |
| d114345e3dc229980000000000001b64 | 102.500 | 14.365 | 5.225 | 0.000 | 64.934 | 3.791 | 1.211 | 1.469 | n/a | 0.011 | 11.454 | n/a | n/a | 0.039 | 84.525 | 0.825 | 0.039 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 11.030ms; driver.publication 1.516ms; driver.expected-state.bind-receipt 1.286ms; driver.publication 1.224ms |
| d114345e3dc229980000000000001b63 | 101.831 | 14.728 | 0.050 | 0.000 | 65.586 | 6.820 | 3.820 | 0.017 | n/a | 0.072 | 10.686 | n/a | n/a | 0.054 | 80.363 | 0.789 | 0.054 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 11.030ms; driver.publication 1.516ms; driver.expected-state.bind-receipt 1.286ms |
| d114345e3dc22998000000000000165b | 100.504 | 25.030 | 0.392 | 0.000 | 2.043 | 47.631 | 2.474 | 0.056 | n/a | 0.345 | 22.513 | n/a | n/a | 0.021 | 27.465 | 0.273 | 0.021 | node-13/thread-0/socket.wait-first-byte | driver.publication 6.493ms; driver.publication 3.615ms; driver.publication 2.669ms; driver.publication 1.698ms; driver.publication 1.554ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.337 | 0.683 | 0.000 | 1.526 | 3.209 | 0.005 | 0.000 | 0.769 | 0.708 | 0.955 | 0.029 | n/a | 0.108 | 5.085 | n/a | n/a | 0.033 | 4.146 | 0.349 | 0.033 |
| p99 | 90.024 | 2.316 | 0.045 | 5.462 | 10.259 | 0.674 | 0.000 | 29.525 | 19.276 | 4.873 | 2.318 | n/a | 2.656 | 39.541 | n/a | n/a | 0.111 | 43.939 | 0.743 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d114345e3dc2299800000000000011ba | 271.276 | 2.690 | 0.006 | 0.000 | 225.845 | 4.540 | 0.921 | 0.032 | n/a | 0.302 | 36.902 | n/a | n/a | 0.038 | 228.541 | 0.842 | 0.038 | node-13/thread-0/driver.queue.subject | driver.publication 8.383ms; driver.expected-state.bind-receipt 8.355ms; client.encode 6.811ms; driver.publication 6.189ms; driver.publication 5.390ms |
| d114345e3dc2299800000000000011b8 | 229.125 | 63.437 | 0.026 | 0.000 | 2.202 | 79.500 | 13.031 | 1.240 | n/a | 3.375 | 66.270 | n/a | n/a | 0.044 | 65.665 | 0.287 | 0.044 | node-13/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 8.355ms; driver.publication 6.189ms; driver.publication 5.390ms; driver.publication 5.199ms; driver.publication 4.857ms |
| d114345e3dc229980000000000001476 | 218.245 | 10.193 | 27.467 | 0.000 | 6.451 | 22.539 | 5.126 | 5.115 | n/a | 0.126 | 141.189 | n/a | n/a | 0.040 | 44.110 | 0.202 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | client.encode 4.087ms; driver.publication 2.910ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.489ms |
| d114345e3dc2299800000000000011c0 | 154.063 | 17.571 | 0.008 | 0.000 | 57.326 | 20.593 | 7.738 | 0.057 | n/a | 0.142 | 50.588 | n/a | n/a | 0.041 | 74.905 | 0.486 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 8.355ms; driver.publication 6.767ms; driver.publication 6.189ms; driver.publication 5.390ms; driver.publication 4.857ms |
| d114345e3dc22998000000000000147c | 130.468 | 4.876 | 0.008 | 0.000 | 0.671 | 24.632 | 9.222 | 2.123 | n/a | 0.018 | 88.863 | n/a | n/a | 0.056 | 5.555 | 0.043 | 0.056 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.910ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.485ms; driver.publication 1.471ms |
| d114345e3dc22998000000000000147a | 129.605 | 4.739 | 0.006 | 0.000 | 1.396 | 24.344 | 19.822 | 2.318 | n/a | 1.130 | 75.794 | n/a | n/a | 0.058 | 6.141 | 0.047 | 0.058 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.910ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.485ms; driver.publication 1.471ms; driver.expected-state.bind-receipt 1.280ms |
| d114345e3dc22998000000000000147f | 129.542 | 5.045 | 5.234 | 0.000 | 82.402 | 3.447 | 0.960 | 1.374 | n/a | 0.014 | 31.020 | n/a | n/a | 0.047 | 92.681 | 0.715 | 0.047 | node-13/thread-0/driver.queue.subject | client.encode 4.087ms; driver.publication 2.910ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.489ms |
| d114345e3dc22998000000000000147b | 123.513 | 6.819 | 0.009 | 0.000 | 0.880 | 16.521 | 2.506 | 10.835 | n/a | 0.083 | 85.712 | n/a | n/a | 0.148 | 7.708 | 0.062 | 0.148 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.910ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.485ms; driver.publication 1.471ms; driver.expected-state.bind-receipt 1.280ms |
| d114345e3dc229980000000000001488 | 113.304 | 3.915 | 0.007 | 0.000 | 88.285 | 0.700 | 1.319 | 0.034 | n/a | 0.095 | 18.918 | n/a | n/a | 0.031 | 92.207 | 0.814 | 0.031 | node-13/thread-0/driver.queue.subject | client.encode 4.087ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.751ms; driver.publication 1.489ms; driver.publication 1.485ms |
| d114345e3dc229980000000000001b64 | 102.500 | 14.365 | 5.225 | 0.000 | 64.934 | 3.791 | 1.211 | 1.469 | n/a | 0.011 | 11.454 | n/a | n/a | 0.039 | 84.525 | 0.825 | 0.039 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 11.030ms; driver.publication 1.516ms; driver.expected-state.bind-receipt 1.286ms; driver.publication 1.224ms |
| d114345e3dc22998000000000000165b | 100.504 | 25.030 | 0.392 | 0.000 | 2.043 | 47.631 | 2.474 | 0.056 | n/a | 0.345 | 22.513 | n/a | n/a | 0.021 | 27.465 | 0.273 | 0.021 | node-13/thread-0/socket.wait-first-byte | driver.publication 6.493ms; driver.publication 3.615ms; driver.publication 2.669ms; driver.publication 1.698ms; driver.publication 1.554ms |
| d114345e3dc22998000000000000147d | 95.678 | 6.499 | 0.021 | 0.000 | 0.810 | 19.276 | 4.277 | 0.080 | n/a | 0.206 | 64.440 | n/a | n/a | 0.069 | 7.330 | 0.077 | 0.069 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 2.910ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.566ms; driver.publication 1.485ms; driver.publication 1.471ms |
| d114345e3dc22998000000000000148e | 95.235 | 5.245 | 0.010 | 0.000 | 77.329 | 3.741 | 1.433 | 0.032 | n/a | 0.402 | 6.933 | n/a | n/a | 0.111 | 82.583 | 0.867 | 0.111 | node-13/thread-0/driver.queue.subject | client.encode 4.087ms; driver.expected-state.bind-receipt 1.751ms; driver.publication 1.489ms; driver.expected-state.bind-receipt 1.477ms; driver.publication 1.411ms |
| d114345e3dc229980000000000001b61 | 91.247 | 36.307 | 0.007 | 0.000 | 0.798 | 12.183 | 3.135 | 0.051 | n/a | 0.651 | 38.085 | n/a | n/a | 0.031 | 37.112 | 0.407 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 11.030ms; driver.expected-state.bind-receipt 1.286ms |
| d114345e3dc229980000000000001487 | 90.612 | 3.314 | 0.004 | 0.000 | 67.961 | 8.684 | 1.117 | 0.033 | n/a | 0.353 | 9.107 | n/a | n/a | 0.038 | 71.279 | 0.787 | 0.038 | node-13/thread-0/driver.queue.subject | client.encode 4.087ms; driver.publication 1.989ms; driver.expected-state.bind-receipt 1.751ms; driver.publication 1.489ms; driver.publication 1.485ms |
| d114345e3dc2299800000000000011ca | 90.024 | 12.868 | 0.733 | 0.000 | 31.406 | 4.140 | 0.695 | 0.014 | n/a | 0.594 | 39.541 | n/a | n/a | 0.033 | 45.007 | 0.500 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 8.355ms; client.encode 6.811ms; driver.publication 2.648ms; driver.publication 2.190ms; driver.publication 1.918ms |
| d114345e3dc229980000000000001b67 | 88.180 | 19.115 | 2.311 | 0.000 | 44.082 | 2.615 | 0.841 | 0.920 | n/a | 0.004 | 18.267 | n/a | n/a | 0.024 | 65.509 | 0.743 | 0.024 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 11.030ms; driver.publication 1.516ms; driver.publication 1.308ms; driver.expected-state.bind-receipt 1.286ms; driver.publication 1.224ms |
| d114345e3dc229980000000000001b5d | 85.379 | 23.728 | 0.005 | 0.000 | 4.971 | 43.635 | 1.003 | 0.026 | n/a | 0.040 | 11.910 | n/a | n/a | 0.062 | 28.703 | 0.336 | 0.062 | node-13/thread-0/socket.wait-first-byte | driver.publication 1.609ms; driver.publication 1.052ms; driver.publication 1.001ms |
| d114345e3dc2299800000000000011c9 | 83.600 | 12.000 | 0.021 | 0.000 | 31.918 | 18.899 | 1.039 | 0.016 | n/a | 0.303 | 19.364 | n/a | n/a | 0.039 | 43.939 | 0.526 | 0.039 | node-13/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 8.355ms; client.encode 6.811ms; driver.publication 2.648ms; driver.publication 2.190ms; driver.publication 1.401ms |
| d114345e3dc2299800000000000011cb | 75.664 | 13.934 | 1.199 | 0.000 | 11.566 | 0.722 | 0.772 | 0.041 | n/a | 0.014 | 47.300 | n/a | n/a | 0.116 | 26.698 | 0.353 | 0.116 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 6.811ms; driver.publication 1.918ms; driver.publication 1.401ms; driver.publication 1.345ms; driver.publication 1.322ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.931 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.147 | 200.694 | 0.019 | n/a | 0.033 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 |
| p99 | 585.657 | n/a | n/a | n/a | 17.800 | n/a | 2.604 | 0.000 | 4.446 | 578.270 | 0.351 | n/a | 0.869 | 0.000 | n/a | n/a | 0.692 | 19.280 | 0.261 | 0.692 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc0000000000000002 | 585.657 | 3.285 | n/a | 0.000 | 0.000 | 2.936 | 578.270 | 0.351 | n/a | 0.123 | 0.000 | n/a | n/a | 0.692 | 3.285 | 0.006 | 0.692 | gw-r/thread-42/gateway.admitted-work | none observed |
| 8ec5710be30457230000000000000005 | 207.124 | 0.000 | n/a | 0.000 | 0.000 | 1.006 | 205.256 | 0.067 | n/a | 0.410 | 0.000 | n/a | n/a | 0.386 | 0.000 | 0.000 | 0.386 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000006 | 203.221 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 200.892 | 0.019 | n/a | 0.869 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000f20 | 202.055 | 0.000 | n/a | 0.000 | 0.000 | 1.147 | 200.694 | 0.012 | n/a | 0.032 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000f21 | 201.931 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 200.822 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000f1f | 201.085 | 0.000 | n/a | 0.000 | 0.000 | 0.382 | 200.569 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000f24 | 100.923 | 15.537 | n/a | 0.000 | 0.000 | 4.446 | 80.724 | 0.027 | n/a | 0.013 | 0.000 | n/a | n/a | 0.176 | 15.537 | 0.154 | 0.176 | gw-r/thread-45/gateway.admitted-work | none observed |
| 8ec5710be30457230000000000000f25 | 81.054 | 17.800 | n/a | 0.000 | 0.000 | 4.189 | 58.698 | 0.028 | n/a | 0.031 | 0.000 | n/a | n/a | 0.309 | 17.800 | 0.220 | 0.309 | gw-r/thread-46/gateway.admitted-work | none observed |
| 8ec5710be30457230000000000000f26 | 73.875 | 16.677 | n/a | 2.604 | 0.000 | 2.304 | 51.950 | 0.013 | n/a | 0.015 | 0.000 | n/a | n/a | 0.313 | 19.280 | 0.261 | 0.313 | gw-r/thread-47/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 827.505 | n/a | n/a | n/a | 4.398 | n/a | 0.000 | 0.000 | 3.172 | 803.019 | 0.015 | n/a | 0.347 | 0.000 | n/a | n/a | 1.288 | 4.398 | 0.025 | 1.288 |
| p99 | 1006.734 | n/a | n/a | n/a | 20.655 | n/a | 0.000 | 0.000 | 3.340 | 1001.514 | 0.018 | n/a | 0.412 | 0.000 | n/a | n/a | 12.672 | 20.655 | 0.254 | 12.672 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc00000000000000a4 | 1006.734 | 0.229 | n/a | 0.000 | 0.000 | 3.340 | 1001.514 | 0.015 | n/a | 0.347 | 0.000 | n/a | n/a | 1.288 | 0.229 | 0.000 | 1.288 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000a5 | 827.505 | 20.655 | n/a | 0.000 | 0.000 | 3.172 | 803.019 | 0.018 | n/a | 0.412 | 0.000 | n/a | n/a | 0.229 | 20.655 | 0.025 | 0.229 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc000000000000081c | 17.333 | 4.398 | n/a | 0.000 | 0.000 | 0.263 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.672 | 4.398 | 0.254 | 12.672 | node-13/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 435.068 | n/a | n/a | n/a | 2.792 | n/a | 0.000 | 0.000 | 0.754 | 431.566 | 0.015 | n/a | 0.088 | 0.000 | n/a | n/a | 0.102 | 2.792 | 0.006 | 0.102 |
| p99 | 1002.841 | n/a | n/a | n/a | 8.484 | n/a | 0.000 | 0.000 | 5.037 | 1000.430 | 0.375 | n/a | 0.677 | 0.000 | n/a | n/a | 41.145 | 8.484 | 0.236 | 41.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc00000000000000bb | 1002.841 | 0.132 | n/a | 0.000 | 0.000 | 0.469 | 1000.430 | 0.016 | n/a | 0.677 | 0.000 | n/a | n/a | 1.117 | 0.132 | 0.000 | 1.117 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000ba | 995.412 | 2.520 | n/a | 0.000 | 0.000 | 2.063 | 990.570 | 0.023 | n/a | 0.115 | 0.000 | n/a | n/a | 0.121 | 2.520 | 0.003 | 0.121 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000ae | 994.891 | 2.897 | n/a | 0.000 | 0.000 | 0.934 | 990.809 | 0.017 | n/a | 0.150 | 0.000 | n/a | n/a | 0.085 | 2.897 | 0.003 | 0.085 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000b4 | 994.724 | 4.830 | n/a | 0.000 | 0.000 | 0.839 | 988.862 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.097 | 4.830 | 0.005 | 0.097 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000d0 | 988.030 | 3.399 | n/a | 0.000 | 0.000 | 5.037 | 979.253 | 0.024 | n/a | 0.090 | 0.000 | n/a | n/a | 0.228 | 3.399 | 0.003 | 0.228 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000ab | 888.858 | 3.009 | n/a | 0.000 | 0.000 | 0.574 | 884.966 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.262 | 3.009 | 0.003 | 0.262 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000c2 | 827.124 | 5.678 | n/a | 0.000 | 0.000 | 0.652 | 820.651 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.103 | 5.678 | 0.007 | 0.103 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000a8 | 824.734 | 3.350 | n/a | 0.000 | 0.000 | 4.336 | 816.840 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.103 | 3.350 | 0.004 | 0.103 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000cb | 698.134 | 2.329 | n/a | 0.000 | 0.000 | 0.561 | 695.038 | 0.034 | n/a | 0.100 | 0.000 | n/a | n/a | 0.071 | 2.329 | 0.003 | 0.071 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000b3 | 618.099 | 2.783 | n/a | 0.000 | 0.000 | 2.933 | 612.200 | 0.016 | n/a | 0.088 | 0.000 | n/a | n/a | 0.078 | 2.783 | 0.005 | 0.078 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000ca | 565.827 | 2.263 | n/a | 0.000 | 0.000 | 0.791 | 562.590 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.069 | 2.263 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000c1 | 554.635 | 3.604 | n/a | 0.000 | 0.000 | 0.439 | 550.388 | 0.015 | n/a | 0.104 | 0.000 | n/a | n/a | 0.085 | 3.604 | 0.006 | 0.085 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000c7 | 527.821 | 2.962 | n/a | 0.000 | 0.000 | 1.006 | 523.653 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.076 | 2.962 | 0.006 | 0.076 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000c5 | 463.123 | 2.792 | n/a | 0.000 | 0.000 | 0.778 | 459.318 | 0.023 | n/a | 0.109 | 0.000 | n/a | n/a | 0.104 | 2.792 | 0.006 | 0.104 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000b7 | 435.068 | 2.517 | n/a | 0.000 | 0.000 | 0.754 | 431.566 | 0.059 | n/a | 0.100 | 0.000 | n/a | n/a | 0.071 | 2.517 | 0.006 | 0.071 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000c8 | 425.943 | 2.490 | n/a | 0.000 | 0.000 | 0.515 | 422.728 | 0.047 | n/a | 0.070 | 0.000 | n/a | n/a | 0.094 | 2.490 | 0.006 | 0.094 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000a7 | 362.652 | 2.531 | n/a | 0.000 | 0.000 | 2.430 | 357.404 | 0.057 | n/a | 0.130 | 0.000 | n/a | n/a | 0.102 | 2.531 | 0.007 | 0.102 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000b0 | 334.478 | 4.960 | n/a | 0.000 | 0.000 | 0.496 | 328.766 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.158 | 4.960 | 0.015 | 0.158 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000b9 | 303.944 | 2.618 | n/a | 0.000 | 0.000 | 0.878 | 300.267 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.092 | 2.618 | 0.009 | 0.092 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000cd | 276.069 | 2.152 | n/a | 0.000 | 0.000 | 0.521 | 273.247 | 0.014 | n/a | 0.055 | 0.000 | n/a | n/a | 0.081 | 2.152 | 0.008 | 0.081 | gw-r/thread-42/journal/page | none observed |

## P3 / L1 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 436.129 | n/a | n/a | n/a | 4.154 | n/a | 0.526 | 0.000 | 0.773 | 429.820 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.122 | 4.693 | 0.013 | 0.122 |
| p99 | 1004.645 | n/a | n/a | n/a | 14.497 | n/a | 5.402 | 0.000 | 7.479 | 1002.026 | 0.105 | n/a | 0.142 | 0.000 | n/a | n/a | 36.592 | 15.135 | 0.743 | 36.592 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc00000000000000d9 | 1004.645 | 0.204 | n/a | 0.000 | 0.000 | 1.146 | 1002.026 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 1.160 | 0.204 | 0.000 | 1.160 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000d1 | 1004.249 | 0.173 | n/a | 0.000 | 0.000 | 1.765 | 1001.069 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 1.141 | 0.173 | 0.000 | 1.141 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000ff | 1003.662 | 0.152 | n/a | 0.000 | 0.000 | 1.400 | 1000.885 | 0.014 | n/a | 0.086 | 0.000 | n/a | n/a | 1.124 | 0.152 | 0.000 | 1.124 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc000000000000010f | 1003.165 | 0.181 | n/a | 0.000 | 0.000 | 0.606 | 1001.163 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 1.133 | 0.181 | 0.000 | 1.133 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000e0 | 999.536 | 6.786 | n/a | 0.654 | 0.000 | 0.795 | 991.031 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.193 | 7.439 | 0.007 | 0.193 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000d3 | 997.928 | 4.492 | n/a | 0.600 | 0.000 | 0.656 | 991.986 | 0.016 | n/a | 0.073 | 0.000 | n/a | n/a | 0.104 | 5.092 | 0.005 | 0.104 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000107 | 992.043 | 4.432 | n/a | 0.741 | 0.000 | 0.894 | 985.790 | 0.042 | n/a | 0.065 | 0.000 | n/a | n/a | 0.079 | 5.173 | 0.005 | 0.079 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000db | 983.823 | 4.876 | n/a | 0.641 | 0.000 | 2.905 | 975.189 | 0.023 | n/a | 0.092 | 0.000 | n/a | n/a | 0.098 | 5.517 | 0.006 | 0.098 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000103 | 966.499 | 5.980 | n/a | 0.000 | 0.000 | 1.028 | 959.181 | 0.017 | n/a | 0.100 | 0.000 | n/a | n/a | 0.194 | 5.980 | 0.006 | 0.194 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000df | 922.135 | 4.145 | n/a | 0.495 | 0.000 | 0.626 | 916.681 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.119 | 4.640 | 0.005 | 0.119 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000e1 | 842.280 | 5.112 | n/a | 0.624 | 0.000 | 0.469 | 835.878 | 0.019 | n/a | 0.092 | 0.000 | n/a | n/a | 0.086 | 5.736 | 0.007 | 0.086 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000104 | 813.895 | 2.614 | n/a | 0.531 | 0.000 | 0.748 | 809.841 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.088 | 3.146 | 0.004 | 0.088 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000e5 | 758.034 | 3.126 | n/a | 0.525 | 0.000 | 0.486 | 753.745 | 0.013 | n/a | 0.065 | 0.000 | n/a | n/a | 0.073 | 3.651 | 0.005 | 0.073 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000ec | 677.013 | 5.455 | n/a | 5.402 | 0.000 | 3.038 | 662.901 | 0.013 | n/a | 0.058 | 0.000 | n/a | n/a | 0.146 | 10.857 | 0.016 | 0.146 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000fc | 628.446 | 4.566 | n/a | 0.000 | 0.000 | 7.479 | 616.244 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.074 | 4.566 | 0.007 | 0.074 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000e9 | 562.736 | 4.211 | n/a | 0.694 | 0.000 | 0.886 | 556.670 | 0.023 | n/a | 0.133 | 0.000 | n/a | n/a | 0.120 | 4.905 | 0.009 | 0.120 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000dc | 553.811 | 6.303 | n/a | 1.052 | 0.000 | 3.435 | 542.832 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.122 | 7.355 | 0.013 | 0.122 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000de | 539.592 | 3.039 | n/a | 0.530 | 0.000 | 3.391 | 532.448 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.084 | 3.569 | 0.007 | 0.084 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000109 | 477.908 | 11.157 | n/a | 1.936 | 0.000 | 1.492 | 463.127 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.134 | 13.094 | 0.027 | 0.134 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000000d4 | 450.021 | 4.216 | n/a | 0.477 | 0.000 | 2.180 | 442.985 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.086 | 4.693 | 0.010 | 0.086 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 362.605 | n/a | n/a | n/a | 3.511 | n/a | 0.000 | 0.000 | 0.766 | 351.932 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.082 | 3.511 | 0.010 | 0.082 |
| p99 | 1011.193 | n/a | n/a | n/a | 15.185 | n/a | 0.972 | 0.000 | 4.264 | 1006.847 | 5.464 | n/a | 0.098 | 0.000 | n/a | n/a | 47.515 | 15.185 | 0.166 | 47.515 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc000000000000012c | 1011.193 | 3.281 | n/a | 0.000 | 0.000 | 0.908 | 1006.847 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.072 | 3.281 | 0.003 | 0.072 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc000000000000011f | 1004.268 | 5.153 | n/a | 0.680 | 0.000 | 0.824 | 997.286 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.274 | 5.833 | 0.006 | 0.274 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000117 | 998.176 | 8.150 | n/a | 0.753 | 0.000 | 1.034 | 988.072 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.117 | 8.903 | 0.009 | 0.117 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000139 | 996.267 | 2.894 | n/a | 0.000 | 0.000 | 0.502 | 992.741 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.060 | 2.894 | 0.003 | 0.060 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc000000000000012d | 990.506 | 4.324 | n/a | 0.000 | 0.000 | 0.814 | 985.246 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.074 | 4.324 | 0.004 | 0.074 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000128 | 986.554 | 3.511 | n/a | 0.000 | 0.000 | 0.595 | 982.323 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.078 | 3.511 | 0.004 | 0.078 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000142 | 930.886 | 3.633 | n/a | 0.000 | 0.000 | 0.518 | 926.621 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.071 | 3.633 | 0.004 | 0.071 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000114 | 878.125 | 2.683 | n/a | 0.638 | 0.000 | 0.511 | 874.120 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.101 | 3.321 | 0.004 | 0.101 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000129 | 794.971 | 10.940 | n/a | 0.972 | 0.000 | 0.730 | 782.128 | 0.031 | n/a | 0.048 | 0.000 | n/a | n/a | 0.123 | 11.912 | 0.015 | 0.123 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000120 | 782.992 | 4.865 | n/a | 0.000 | 0.000 | 0.971 | 776.997 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.097 | 4.865 | 0.006 | 0.097 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000136 | 730.846 | 3.261 | n/a | 0.000 | 0.000 | 0.518 | 726.956 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.063 | 3.261 | 0.004 | 0.063 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000111 | 696.437 | 4.066 | n/a | 0.908 | 0.000 | 0.730 | 690.587 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.095 | 4.973 | 0.007 | 0.095 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000149 | 692.505 | 2.793 | n/a | 0.000 | 0.000 | 1.341 | 688.238 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.082 | 2.793 | 0.004 | 0.082 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc000000000000013a | 690.315 | 9.451 | n/a | 0.603 | 0.000 | 2.278 | 677.818 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.110 | 10.054 | 0.015 | 0.110 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc000000000000013e | 678.506 | 3.038 | n/a | 0.000 | 0.000 | 1.117 | 674.215 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.063 | 3.038 | 0.004 | 0.063 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000143 | 663.694 | 4.990 | n/a | 0.688 | 0.000 | 2.521 | 655.328 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.124 | 5.678 | 0.009 | 0.124 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000135 | 651.910 | 2.826 | n/a | 0.000 | 0.000 | 0.942 | 648.035 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.066 | 2.826 | 0.004 | 0.066 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000127 | 642.965 | 4.018 | n/a | 0.000 | 0.000 | 2.938 | 635.805 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.116 | 4.018 | 0.006 | 0.116 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc000000000000012f | 607.218 | 3.556 | n/a | 0.000 | 0.000 | 0.583 | 602.943 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.082 | 3.556 | 0.006 | 0.082 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc000000000000012e | 394.390 | 6.663 | n/a | 0.845 | 0.000 | 0.996 | 385.614 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.186 | 7.508 | 0.019 | 0.186 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 444.313 | n/a | n/a | n/a | 3.262 | n/a | 0.000 | 0.000 | 0.695 | 440.953 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.078 | 3.262 | 0.008 | 0.078 |
| p99 | 1009.310 | n/a | n/a | n/a | 17.830 | n/a | 4.657 | 0.000 | 5.994 | 1002.765 | 0.131 | n/a | 0.074 | 0.000 | n/a | n/a | 22.059 | 18.817 | 0.275 | 22.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc000000000000017f | 1009.310 | 5.682 | n/a | 0.000 | 0.000 | 0.638 | 1002.765 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.166 | 5.682 | 0.006 | 0.166 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000165 | 1002.805 | 0.217 | n/a | 0.000 | 0.000 | 0.733 | 1000.640 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 1.165 | 0.217 | 0.000 | 1.165 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000155 | 998.425 | 3.661 | n/a | 0.000 | 0.000 | 1.880 | 992.750 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.087 | 3.661 | 0.004 | 0.087 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc000000000000016f | 998.411 | 3.518 | n/a | 0.000 | 0.000 | 0.628 | 994.134 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.069 | 3.518 | 0.004 | 0.069 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000186 | 997.670 | 2.890 | n/a | 0.000 | 0.000 | 0.559 | 994.112 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.068 | 2.890 | 0.003 | 0.068 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000185 | 997.664 | 2.457 | n/a | 0.000 | 0.000 | 2.615 | 992.454 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.061 | 2.457 | 0.002 | 0.061 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000174 | 923.585 | 3.094 | n/a | 0.000 | 0.000 | 1.113 | 919.229 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.067 | 3.094 | 0.003 | 0.067 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc000000000000015a | 771.588 | 3.065 | n/a | 0.000 | 0.000 | 0.686 | 767.698 | 0.013 | n/a | 0.058 | 0.000 | n/a | n/a | 0.068 | 3.065 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000156 | 765.348 | 2.509 | n/a | 0.000 | 0.000 | 0.695 | 762.020 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.078 | 2.509 | 0.003 | 0.078 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc000000000000017a | 755.023 | 4.437 | n/a | 0.000 | 0.000 | 0.646 | 749.834 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.074 | 4.437 | 0.006 | 0.074 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000150 | 635.512 | 4.625 | n/a | 0.000 | 0.000 | 0.802 | 629.900 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.123 | 4.625 | 0.007 | 0.123 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc000000000000016e | 602.445 | 3.352 | n/a | 0.000 | 0.000 | 0.565 | 598.424 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.067 | 3.352 | 0.006 | 0.067 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000188 | 598.377 | 4.417 | n/a | 4.657 | 0.000 | 0.481 | 588.684 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.104 | 9.074 | 0.015 | 0.104 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000183 | 589.987 | 3.000 | n/a | 0.000 | 0.000 | 1.178 | 585.669 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.073 | 3.000 | 0.005 | 0.073 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000167 | 579.428 | 7.421 | n/a | 0.000 | 0.000 | 1.196 | 570.631 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.134 | 7.421 | 0.013 | 0.134 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000177 | 558.068 | 2.703 | n/a | 0.000 | 0.000 | 0.762 | 554.477 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.072 | 2.703 | 0.005 | 0.072 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc000000000000017d | 544.580 | 2.759 | n/a | 0.000 | 0.000 | 0.575 | 541.061 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.113 | 2.759 | 0.005 | 0.113 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000171 | 519.414 | 4.050 | n/a | 0.000 | 0.000 | 0.653 | 514.564 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.079 | 4.050 | 0.008 | 0.079 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000187 | 476.745 | 5.627 | n/a | 0.000 | 0.000 | 0.714 | 470.243 | 0.019 | n/a | 0.039 | 0.000 | n/a | n/a | 0.104 | 5.627 | 0.012 | 0.104 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000170 | 465.240 | 5.188 | n/a | 0.000 | 0.000 | 3.808 | 455.139 | 0.011 | n/a | 0.054 | 0.000 | n/a | n/a | 1.040 | 5.188 | 0.011 | 1.040 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 334.447 | n/a | n/a | n/a | 3.373 | n/a | 0.000 | 0.000 | 0.668 | 330.776 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.096 | 3.373 | 0.010 | 0.096 |
| p99 | 1008.563 | n/a | n/a | n/a | 11.743 | n/a | 0.000 | 0.000 | 5.484 | 1001.198 | 0.510 | n/a | 0.402 | 0.000 | n/a | n/a | 46.800 | 11.743 | 0.310 | 46.800 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc00000000000001c3 | 1008.563 | 3.301 | n/a | 0.000 | 0.000 | 3.914 | 1001.198 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.088 | 3.301 | 0.003 | 0.088 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000199 | 1001.204 | 3.388 | n/a | 0.000 | 0.000 | 3.652 | 993.962 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.139 | 3.388 | 0.003 | 0.139 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001c2 | 999.661 | 3.068 | n/a | 0.000 | 0.000 | 0.454 | 995.992 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.093 | 3.068 | 0.003 | 0.093 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001a6 | 992.399 | 3.049 | n/a | 0.000 | 0.000 | 0.693 | 988.164 | 0.010 | n/a | 0.402 | 0.000 | n/a | n/a | 0.081 | 3.049 | 0.003 | 0.081 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001a5 | 980.678 | 2.858 | n/a | 0.000 | 0.000 | 1.493 | 976.151 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.088 | 2.858 | 0.003 | 0.088 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc000000000000018a | 935.612 | 3.017 | n/a | 0.000 | 0.000 | 2.216 | 930.264 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.073 | 3.017 | 0.003 | 0.073 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001a4 | 907.509 | 4.293 | n/a | 0.000 | 0.000 | 0.501 | 902.425 | 0.013 | n/a | 0.056 | 0.000 | n/a | n/a | 0.222 | 4.293 | 0.005 | 0.222 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc000000000000019b | 842.618 | 5.140 | n/a | 0.000 | 0.000 | 0.499 | 836.788 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.118 | 5.140 | 0.006 | 0.118 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001d3 | 779.144 | 1.835 | n/a | 0.000 | 0.000 | 0.683 | 776.424 | 0.015 | n/a | 0.125 | 0.000 | n/a | n/a | 0.061 | 1.835 | 0.002 | 0.061 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001c1 | 750.774 | 4.748 | n/a | 0.000 | 0.000 | 2.619 | 743.253 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.083 | 4.748 | 0.006 | 0.083 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc000000000000019f | 674.603 | 4.401 | n/a | 0.000 | 0.000 | 0.630 | 669.429 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.089 | 4.401 | 0.007 | 0.089 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001c4 | 651.492 | 5.017 | n/a | 0.000 | 0.000 | 1.030 | 645.197 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.189 | 5.017 | 0.008 | 0.189 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001b4 | 637.514 | 3.583 | n/a | 0.000 | 0.000 | 0.535 | 633.235 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.114 | 3.583 | 0.006 | 0.114 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001ae | 616.728 | 5.911 | n/a | 0.000 | 0.000 | 3.776 | 606.866 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.121 | 5.911 | 0.010 | 0.121 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001a7 | 615.526 | 3.826 | n/a | 0.000 | 0.000 | 3.881 | 607.652 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.096 | 3.826 | 0.006 | 0.096 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001b7 | 555.157 | 3.336 | n/a | 0.000 | 0.000 | 0.994 | 550.683 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.094 | 3.336 | 0.006 | 0.094 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001cf | 544.222 | 3.015 | n/a | 0.000 | 0.000 | 0.422 | 540.642 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.107 | 3.015 | 0.006 | 0.107 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001cc | 530.795 | 2.481 | n/a | 0.000 | 0.000 | 0.514 | 527.668 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.073 | 2.481 | 0.005 | 0.073 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000198 | 451.259 | 4.038 | n/a | 0.000 | 0.000 | 1.063 | 446.003 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.115 | 4.038 | 0.009 | 0.115 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001b6 | 448.330 | 11.743 | n/a | 0.000 | 0.000 | 0.820 | 435.583 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.137 | 11.743 | 0.026 | 0.137 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 326.704 | n/a | n/a | n/a | 2.826 | n/a | 0.000 | 0.000 | 0.524 | 323.468 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.085 | 2.826 | 0.008 | 0.085 |
| p99 | 1004.243 | n/a | n/a | n/a | 10.531 | n/a | 0.000 | 0.000 | 4.349 | 1000.939 | 0.720 | n/a | 0.096 | 0.000 | n/a | n/a | 28.460 | 10.531 | 0.330 | 28.460 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc0000000000000217 | 1004.243 | 3.838 | n/a | 0.000 | 0.000 | 0.838 | 999.321 | 0.023 | n/a | 0.056 | 0.000 | n/a | n/a | 0.169 | 3.838 | 0.004 | 0.169 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000215 | 1002.988 | 0.190 | n/a | 0.000 | 0.000 | 0.703 | 1000.857 | 0.013 | n/a | 0.055 | 0.000 | n/a | n/a | 1.170 | 0.190 | 0.000 | 1.170 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000210 | 1002.604 | 0.125 | n/a | 0.000 | 0.000 | 0.362 | 1000.939 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 1.108 | 0.125 | 0.000 | 1.108 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001e8 | 999.684 | 2.331 | n/a | 0.000 | 0.000 | 1.061 | 996.180 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.057 | 2.331 | 0.002 | 0.057 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001fc | 998.955 | 2.964 | n/a | 0.000 | 0.000 | 0.473 | 995.324 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.123 | 2.964 | 0.003 | 0.123 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc000000000000020f | 991.040 | 6.510 | n/a | 0.000 | 0.000 | 0.848 | 983.451 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.185 | 6.510 | 0.007 | 0.185 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000213 | 939.766 | 3.429 | n/a | 0.000 | 0.000 | 0.507 | 935.707 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.077 | 3.429 | 0.004 | 0.077 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000204 | 905.504 | 4.820 | n/a | 0.000 | 0.000 | 0.989 | 899.559 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.086 | 4.820 | 0.005 | 0.086 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001fd | 829.839 | 2.124 | n/a | 0.000 | 0.000 | 0.592 | 826.979 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.091 | 2.124 | 0.003 | 0.091 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001f5 | 795.704 | 2.309 | n/a | 0.000 | 0.000 | 1.598 | 791.659 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.074 | 2.309 | 0.003 | 0.074 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000200 | 775.414 | 2.270 | n/a | 0.000 | 0.000 | 0.492 | 772.530 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.074 | 2.270 | 0.003 | 0.074 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001db | 755.692 | 2.887 | n/a | 0.000 | 0.000 | 3.669 | 749.007 | 0.003 | n/a | 0.049 | 0.000 | n/a | n/a | 0.077 | 2.887 | 0.004 | 0.077 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001ee | 753.527 | 2.150 | n/a | 0.000 | 0.000 | 1.305 | 749.891 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.071 | 2.150 | 0.003 | 0.071 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001f2 | 675.835 | 2.826 | n/a | 0.000 | 0.000 | 0.757 | 672.122 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.071 | 2.826 | 0.004 | 0.071 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001e6 | 638.314 | 2.645 | n/a | 0.000 | 0.000 | 0.406 | 635.091 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.111 | 2.645 | 0.004 | 0.111 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001d7 | 612.687 | 1.897 | n/a | 0.000 | 0.000 | 0.323 | 610.364 | 0.012 | n/a | 0.036 | 0.000 | n/a | n/a | 0.055 | 1.897 | 0.003 | 0.055 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001f7 | 555.863 | 2.471 | n/a | 0.000 | 0.000 | 1.228 | 552.056 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.058 | 2.471 | 0.004 | 0.058 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc000000000000020d | 474.385 | 3.261 | n/a | 0.000 | 0.000 | 0.445 | 470.576 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.061 | 3.261 | 0.007 | 0.061 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001df | 465.664 | 3.823 | n/a | 0.000 | 0.000 | 0.590 | 461.142 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.068 | 3.823 | 0.008 | 0.068 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc00000000000001ed | 433.986 | 3.398 | n/a | 0.000 | 0.000 | 0.524 | 429.926 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.106 | 3.398 | 0.008 | 0.106 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / internal (737 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.188 | n/a | n/a | n/a | 3.310 | n/a | 0.000 | 0.000 | 0.245 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.587 | 3.310 | 0.261 | 7.587 |
| p99 | 108.479 | n/a | n/a | n/a | 15.631 | n/a | 0.966 | 0.000 | 1.118 | 100.491 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 47.172 | 16.513 | 0.813 | 47.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc0000000000000223 | 942.415 | 2.620 | n/a | 0.000 | 0.000 | 0.629 | 939.045 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.086 | 2.620 | 0.003 | 0.086 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000224 | 892.375 | 2.182 | n/a | 0.000 | 0.000 | 0.597 | 889.460 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.082 | 2.182 | 0.002 | 0.082 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000218 | 874.117 | 1.842 | n/a | 0.000 | 0.000 | 0.418 | 871.725 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.067 | 1.842 | 0.002 | 0.067 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc000000000000021f | 766.414 | 2.545 | n/a | 0.000 | 0.000 | 0.567 | 763.172 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.069 | 2.545 | 0.003 | 0.069 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc000000000000021b | 746.772 | 2.044 | n/a | 0.000 | 0.000 | 0.606 | 744.020 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.057 | 2.044 | 0.003 | 0.057 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000221 | 274.984 | 6.000 | n/a | 0.000 | 0.000 | 0.758 | 265.636 | 2.297 | n/a | 0.114 | 0.000 | n/a | n/a | 0.179 | 6.000 | 0.022 | 0.179 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc000000000000021c | 259.477 | 2.417 | n/a | 0.000 | 0.000 | 0.458 | 256.482 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.081 | 2.417 | 0.009 | 0.081 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000309 | 108.479 | 6.824 | n/a | 0.000 | 0.000 | 0.937 | 100.491 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.179 | 6.824 | 0.063 | 0.179 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc00000000000004dd | 105.833 | 7.822 | n/a | 0.000 | 0.000 | 0.544 | 97.137 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.283 | 7.822 | 0.074 | 0.283 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc00000000000005de | 96.284 | 3.450 | n/a | 0.000 | 0.000 | 0.979 | 91.739 | 0.002 | n/a | 0.038 | 0.000 | n/a | n/a | 0.075 | 3.450 | 0.036 | 0.075 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc00000000000002ed | 95.812 | 11.447 | n/a | 0.000 | 0.000 | 0.486 | 83.758 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.083 | 11.447 | 0.119 | 0.083 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc000000000000021a | 92.287 | 2.745 | n/a | 0.000 | 0.000 | 0.589 | 88.812 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.094 | 2.745 | 0.030 | 0.094 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000745 | 89.968 | 3.510 | n/a | 0.000 | 0.000 | 0.518 | 85.854 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.070 | 3.510 | 0.039 | 0.070 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000789 | 87.929 | 2.379 | n/a | 0.000 | 0.000 | 0.412 | 85.035 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.076 | 2.379 | 0.027 | 0.076 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc000000000000045f | 86.772 | 3.659 | n/a | 0.000 | 0.000 | 0.638 | 82.357 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.081 | 3.659 | 0.042 | 0.081 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000627 | 84.199 | 4.345 | n/a | 0.000 | 0.000 | 0.726 | 79.052 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.064 | 4.345 | 0.052 | 0.064 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000487 | 82.788 | 5.555 | n/a | 0.000 | 0.000 | 0.402 | 76.757 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.063 | 5.555 | 0.067 | 0.063 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000578 | 82.475 | 7.580 | n/a | 0.000 | 0.000 | 0.400 | 74.068 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.390 | 7.580 | 0.092 | 0.390 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc0000000000000776 | 80.845 | 11.450 | n/a | 0.000 | 0.000 | 0.873 | 68.326 | 0.009 | n/a | 0.019 | 0.000 | n/a | n/a | 0.169 | 11.450 | 0.142 | 0.169 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc00000000000004e6 | 79.836 | 2.393 | n/a | 0.000 | 0.000 | 0.782 | 76.522 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 0.096 | 2.393 | 0.030 | 0.096 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / internal (2248 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.820 | n/a | n/a | n/a | 4.262 | n/a | 0.000 | 0.000 | 0.242 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.095 | 4.298 | 0.367 | 6.095 |
| p99 | 372.043 | n/a | n/a | n/a | 20.954 | n/a | 1.609 | 0.000 | 2.482 | 369.786 | 0.012 | n/a | 0.035 | 0.000 | n/a | n/a | 48.289 | 22.082 | 0.854 | 48.289 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb25d6d2a479c9cc0000000000001aa0 | 1002.385 | 0.199 | n/a | 0.000 | 0.000 | 0.543 | 1000.482 | 0.013 | n/a | 0.030 | 0.000 | n/a | n/a | 1.117 | 0.199 | 0.000 | 1.117 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a55 | 997.851 | 2.535 | n/a | 0.000 | 0.000 | 0.320 | 994.896 | 0.008 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.535 | 0.003 | 0.063 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a9c | 992.677 | 2.483 | n/a | 0.000 | 0.000 | 2.652 | 987.428 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.081 | 2.483 | 0.003 | 0.081 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a59 | 988.679 | 9.657 | n/a | 0.000 | 0.000 | 0.570 | 978.203 | 0.013 | n/a | 0.031 | 0.000 | n/a | n/a | 0.206 | 9.657 | 0.010 | 0.206 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a5e | 978.529 | 3.698 | n/a | 0.000 | 0.000 | 0.496 | 974.181 | 0.011 | n/a | 0.046 | 0.000 | n/a | n/a | 0.096 | 3.698 | 0.004 | 0.096 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a76 | 973.756 | 4.433 | n/a | 0.000 | 0.000 | 0.642 | 968.490 | 0.008 | n/a | 0.024 | 0.000 | n/a | n/a | 0.158 | 4.433 | 0.005 | 0.158 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a68 | 959.975 | 2.990 | n/a | 0.000 | 0.000 | 0.344 | 956.522 | 0.011 | n/a | 0.017 | 0.000 | n/a | n/a | 0.090 | 2.990 | 0.003 | 0.090 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a97 | 919.413 | 2.249 | n/a | 0.000 | 0.000 | 0.495 | 916.499 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.090 | 2.249 | 0.002 | 0.090 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a56 | 912.084 | 13.691 | n/a | 0.963 | 0.000 | 0.720 | 896.412 | 0.007 | n/a | 0.020 | 0.000 | n/a | n/a | 0.271 | 14.654 | 0.016 | 0.271 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a53 | 911.053 | 2.408 | n/a | 0.000 | 0.000 | 0.235 | 908.313 | 0.012 | n/a | 0.032 | 0.000 | n/a | n/a | 0.053 | 2.408 | 0.003 | 0.053 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a99 | 805.530 | 2.000 | n/a | 0.000 | 0.000 | 0.514 | 802.872 | 0.012 | n/a | 0.055 | 0.000 | n/a | n/a | 0.077 | 2.000 | 0.002 | 0.077 | gw-r/thread-45/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a7a | 732.853 | 4.735 | n/a | 0.000 | 0.000 | 1.175 | 726.770 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.109 | 4.735 | 0.006 | 0.109 | gw-r/thread-47/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a73 | 676.025 | 5.554 | n/a | 0.000 | 0.000 | 0.539 | 669.778 | 0.006 | n/a | 0.013 | 0.000 | n/a | n/a | 0.135 | 5.554 | 0.008 | 0.135 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a5f | 632.448 | 2.594 | n/a | 0.000 | 0.000 | 0.382 | 629.306 | 0.010 | n/a | 0.026 | 0.000 | n/a | n/a | 0.129 | 2.594 | 0.004 | 0.129 | gw-r/thread-44/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a93 | 624.998 | 3.278 | n/a | 0.000 | 0.000 | 1.214 | 620.263 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.198 | 3.278 | 0.005 | 0.198 | gw-r/thread-49/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a7b | 614.980 | 8.815 | n/a | 0.000 | 0.000 | 3.270 | 602.583 | 0.011 | n/a | 0.030 | 0.000 | n/a | n/a | 0.271 | 8.815 | 0.014 | 0.271 | gw-r/thread-48/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a6e | 587.661 | 3.965 | n/a | 0.000 | 0.000 | 0.382 | 583.155 | 0.012 | n/a | 0.025 | 0.000 | n/a | n/a | 0.122 | 3.965 | 0.007 | 0.122 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a89 | 510.213 | 4.752 | n/a | 0.000 | 0.000 | 0.437 | 504.832 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.143 | 4.752 | 0.009 | 0.143 | gw-r/thread-46/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a91 | 488.743 | 4.548 | n/a | 0.000 | 0.000 | 0.610 | 483.408 | 0.009 | n/a | 0.024 | 0.000 | n/a | n/a | 0.145 | 4.548 | 0.009 | 0.145 | gw-r/thread-42/journal/page | none observed |
| fb25d6d2a479c9cc0000000000001a8e | 484.171 | 5.612 | n/a | 0.000 | 0.000 | 0.722 | 477.701 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.095 | 5.612 | 0.012 | 0.095 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.464 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 201.075 | 0.017 | n/a | 0.125 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 206.854 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.680 | 205.770 | 7.980 | n/a | 3.822 | 0.000 | n/a | n/a | 0.692 | 0.000 | 0.000 | 0.692 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8ec5710be30457230000000000000025 | 206.854 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 201.812 | 0.024 | n/a | 3.822 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000013 | 206.626 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 205.770 | 0.060 | n/a | 0.110 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000014 | 206.353 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 205.224 | 0.020 | n/a | 0.180 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000030 | 206.282 | 0.000 | n/a | 0.000 | 0.000 | 4.680 | 201.266 | 0.019 | n/a | 0.138 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be3045723000000000000000d | 206.144 | 0.000 | n/a | 0.000 | 0.000 | 1.313 | 204.323 | 0.041 | n/a | 0.220 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000007 | 205.733 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 204.514 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be3045723000000000000000f | 205.658 | 0.000 | n/a | 0.000 | 0.000 | 0.944 | 204.349 | 0.048 | n/a | 0.207 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000035 | 205.613 | 0.000 | n/a | 0.000 | 0.000 | 4.132 | 201.146 | 0.019 | n/a | 0.153 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000057 | 204.963 | 0.000 | n/a | 0.000 | 0.000 | 3.580 | 201.087 | 0.013 | n/a | 0.151 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be3045723000000000000004c | 204.827 | 0.000 | n/a | 0.000 | 0.000 | 3.227 | 201.209 | 0.017 | n/a | 0.184 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000018 | 204.724 | 0.000 | n/a | 0.000 | 0.000 | 1.157 | 202.782 | 0.113 | n/a | 0.485 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be3045723000000000000002a | 204.717 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 203.600 | 0.042 | n/a | 0.212 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000058 | 204.605 | 0.000 | n/a | 0.000 | 0.000 | 1.871 | 202.214 | 0.029 | n/a | 0.292 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be3045723000000000000001a | 204.492 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 202.549 | 0.046 | n/a | 0.762 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000009 | 204.297 | 0.000 | n/a | 0.000 | 0.000 | 2.518 | 200.946 | 0.014 | n/a | 0.126 | 0.000 | n/a | n/a | 0.692 | 0.000 | 0.000 | 0.692 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000020 | 204.165 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 202.966 | 0.024 | n/a | 0.286 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000015 | 204.107 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 202.780 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000039 | 203.945 | 0.000 | n/a | 0.000 | 0.000 | 2.697 | 200.977 | 0.014 | n/a | 0.102 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000052 | 203.832 | 0.000 | n/a | 0.000 | 0.000 | 2.297 | 201.173 | 0.023 | n/a | 0.135 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000050 | 203.821 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 202.587 | 0.041 | n/a | 0.170 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.368 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.106 | 0.014 | n/a | 0.106 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 207.766 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.858 | 206.717 | 8.625 | n/a | 4.061 | 0.000 | n/a | n/a | 0.332 | 0.000 | 0.000 | 0.332 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8ec5710be3045723000000000000008e | 207.766 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 206.717 | 0.033 | n/a | 0.180 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be304572300000000000000b3 | 207.470 | 0.000 | n/a | 0.000 | 0.000 | 4.858 | 202.071 | 0.023 | n/a | 0.309 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000078 | 206.466 | 0.000 | n/a | 0.000 | 0.000 | 1.387 | 204.817 | 0.013 | n/a | 0.133 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be304572300000000000000ab | 206.113 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 205.053 | 0.018 | n/a | 0.149 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000090 | 205.919 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 204.780 | 0.127 | n/a | 0.218 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000062 | 205.844 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 204.843 | 0.017 | n/a | 0.126 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000070 | 205.536 | 0.000 | n/a | 0.000 | 0.000 | 4.043 | 201.110 | 0.017 | n/a | 0.130 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000075 | 205.417 | 0.000 | n/a | 0.000 | 0.000 | 3.943 | 201.176 | 0.026 | n/a | 0.141 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be304572300000000000000c1 | 205.132 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 203.975 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000094 | 205.054 | 0.000 | n/a | 0.000 | 0.000 | 3.617 | 201.157 | 0.022 | n/a | 0.137 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be304572300000000000000c0 | 204.854 | 0.000 | n/a | 0.000 | 0.000 | 3.780 | 200.850 | 0.009 | n/a | 0.112 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be3045723000000000000005c | 204.788 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 203.881 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be304572300000000000000a7 | 204.272 | 0.000 | n/a | 0.000 | 0.000 | 3.081 | 200.971 | 0.041 | n/a | 0.076 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000082 | 203.851 | 0.000 | n/a | 0.000 | 0.000 | 2.122 | 201.355 | 0.019 | n/a | 0.182 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be3045723000000000000007b | 203.648 | 0.000 | n/a | 0.000 | 0.000 | 2.028 | 201.146 | 0.015 | n/a | 0.127 | 0.000 | n/a | n/a | 0.332 | 0.000 | 0.000 | 0.332 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be3045723000000000000008d | 203.624 | 0.000 | n/a | 0.000 | 0.000 | 1.976 | 201.324 | 0.022 | n/a | 0.135 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be304572300000000000000a1 | 203.572 | 0.000 | n/a | 0.000 | 0.000 | 1.745 | 201.528 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000061 | 203.518 | 0.000 | n/a | 0.000 | 0.000 | 0.988 | 202.266 | 0.011 | n/a | 0.126 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be304572300000000000000a6 | 203.158 | 0.000 | n/a | 0.000 | 0.000 | 1.736 | 201.167 | 0.010 | n/a | 0.122 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be3045723000000000000006e | 203.082 | 0.000 | n/a | 0.000 | 0.000 | 1.284 | 201.521 | 0.011 | n/a | 0.120 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.976 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 200.941 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 207.948 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.280 | 205.462 | 3.917 | n/a | 0.220 | 0.000 | n/a | n/a | 0.561 | 0.000 | 0.000 | 0.561 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8ec5710be304572300000000000000e1 | 207.948 | 0.000 | n/a | 0.000 | 0.000 | 1.711 | 205.462 | 0.022 | n/a | 0.193 | 0.000 | n/a | n/a | 0.561 | 0.000 | 0.000 | 0.561 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000108 | 206.601 | 0.000 | n/a | 0.000 | 0.000 | 2.486 | 203.897 | 0.007 | n/a | 0.096 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be304572300000000000000d2 | 205.732 | 0.000 | n/a | 0.000 | 0.000 | 4.280 | 201.170 | 0.010 | n/a | 0.116 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000112 | 205.448 | 0.000 | n/a | 0.000 | 0.000 | 1.004 | 204.171 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be304572300000000000000e2 | 204.607 | 0.000 | n/a | 0.000 | 0.000 | 1.718 | 202.554 | 0.009 | n/a | 0.120 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be304572300000000000000c5 | 204.299 | 0.000 | n/a | 0.000 | 0.000 | 2.214 | 201.870 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000120 | 204.161 | 0.000 | n/a | 0.000 | 0.000 | 2.962 | 200.979 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be304572300000000000000cd | 203.924 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 200.828 | 1.805 | n/a | 0.081 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be3045723000000000000010d | 203.917 | 0.000 | n/a | 0.000 | 0.000 | 2.885 | 200.795 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be304572300000000000000cb | 203.582 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 202.414 | 0.116 | n/a | 0.102 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be304572300000000000000de | 203.571 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 202.146 | 0.025 | n/a | 0.220 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000115 | 203.522 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 202.027 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be304572300000000000000d6 | 203.444 | 0.000 | n/a | 0.000 | 0.000 | 0.679 | 202.492 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be304572300000000000000fc | 203.332 | 0.000 | n/a | 0.000 | 0.000 | 1.497 | 201.630 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be3045723000000000000011e | 203.270 | 0.000 | n/a | 0.000 | 0.000 | 1.291 | 201.589 | 0.009 | n/a | 0.216 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be304572300000000000000f7 | 203.084 | 0.000 | n/a | 0.000 | 0.000 | 1.075 | 201.805 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be304572300000000000000e0 | 203.035 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 201.814 | 0.007 | n/a | 0.112 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be304572300000000000000fe | 202.982 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 202.025 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be304572300000000000000cc | 202.953 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 201.549 | 0.011 | n/a | 0.123 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be304572300000000000000c6 | 202.894 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.560 | 0.011 | n/a | 0.100 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.781 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 200.844 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 206.985 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.458 | 204.815 | 1.626 | n/a | 0.850 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8ec5710be30457230000000000000190 | 206.985 | 0.000 | n/a | 0.000 | 0.000 | 3.246 | 203.518 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000142 | 206.550 | 0.000 | n/a | 0.000 | 0.000 | 4.458 | 201.924 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be3045723000000000000012f | 206.017 | 0.000 | n/a | 0.000 | 0.000 | 0.932 | 204.815 | 0.026 | n/a | 0.099 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000179 | 204.992 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 203.977 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000169 | 204.952 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 203.693 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000152 | 203.814 | 0.000 | n/a | 0.000 | 0.000 | 1.863 | 201.523 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be3045723000000000000012d | 203.548 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 202.540 | 0.069 | n/a | 0.107 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000151 | 203.255 | 0.000 | n/a | 0.000 | 0.000 | 0.680 | 202.309 | 0.022 | n/a | 0.127 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000189 | 203.007 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 202.186 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be3045723000000000000018e | 202.974 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 201.844 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be3045723000000000000016f | 202.960 | 0.000 | n/a | 0.000 | 0.000 | 1.392 | 201.352 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000165 | 202.936 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 201.960 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be3045723000000000000013c | 202.874 | 0.000 | n/a | 0.000 | 0.000 | 1.193 | 201.431 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be3045723000000000000012c | 202.857 | 0.000 | n/a | 0.000 | 0.000 | 0.605 | 202.011 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000158 | 202.780 | 0.000 | n/a | 0.000 | 0.000 | 1.662 | 200.833 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be3045723000000000000016c | 202.604 | 0.000 | n/a | 0.000 | 0.000 | 1.753 | 200.625 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be3045723000000000000016e | 202.515 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 201.385 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be3045723000000000000013e | 202.487 | 0.000 | n/a | 0.000 | 0.000 | 1.270 | 201.016 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be3045723000000000000015b | 202.480 | 0.000 | n/a | 0.000 | 0.000 | 1.169 | 201.136 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000168 | 202.473 | 0.000 | n/a | 0.000 | 0.000 | 1.118 | 201.043 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.797 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 200.898 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 205.037 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.233 | 203.528 | 4.559 | n/a | 0.111 | 0.000 | n/a | n/a | 0.392 | 0.000 | 0.000 | 0.392 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8ec5710be304572300000000000001c2 | 206.552 | 0.000 | n/a | 0.000 | 0.000 | 1.941 | 204.398 | 0.007 | n/a | 0.086 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be304572300000000000001ee | 205.037 | 0.000 | n/a | 0.000 | 0.000 | 3.561 | 201.174 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be304572300000000000001a2 | 204.694 | 0.000 | n/a | 0.000 | 0.000 | 3.233 | 201.218 | 0.033 | n/a | 0.092 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be304572300000000000001de | 204.198 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 203.528 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be304572300000000000001e5 | 203.754 | 0.000 | n/a | 0.000 | 0.000 | 2.610 | 200.938 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be304572300000000000001bd | 203.467 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 202.026 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000198 | 202.950 | 0.000 | n/a | 0.000 | 0.000 | 1.079 | 201.608 | 0.022 | n/a | 0.095 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be304572300000000000001ef | 202.937 | 0.000 | n/a | 0.000 | 0.000 | 1.527 | 201.181 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000197 | 202.918 | 0.000 | n/a | 0.000 | 0.000 | 1.216 | 201.423 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be304572300000000000001a5 | 202.872 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 201.731 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.392 | 0.000 | 0.000 | 0.392 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be304572300000000000001d8 | 202.860 | 0.000 | n/a | 0.000 | 0.000 | 1.938 | 200.671 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000206 | 202.775 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 201.690 | 0.008 | n/a | 0.097 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be304572300000000000001e9 | 202.634 | 0.000 | n/a | 0.000 | 0.000 | 1.088 | 201.342 | 0.017 | n/a | 0.088 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be304572300000000000001c5 | 202.633 | 0.000 | n/a | 0.000 | 0.000 | 0.901 | 201.526 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be304572300000000000001c0 | 202.619 | 0.000 | n/a | 0.000 | 0.000 | 1.508 | 200.886 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be304572300000000000001b7 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.212 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be304572300000000000001d6 | 202.486 | 0.000 | n/a | 0.000 | 0.000 | 1.191 | 201.012 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be304572300000000000001bf | 202.327 | 0.000 | n/a | 0.000 | 0.000 | 0.680 | 201.433 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be304572300000000000001e7 | 202.305 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 201.142 | 0.014 | n/a | 0.075 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be304572300000000000001d1 | 202.283 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.243 | 0.012 | n/a | 0.055 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-42/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.719 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.832 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 205.312 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.408 | 204.318 | 3.376 | n/a | 0.141 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8ec5710be30457230000000000000240 | 205.665 | 0.000 | n/a | 0.000 | 0.000 | 1.333 | 204.064 | 0.011 | n/a | 0.122 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be3045723000000000000021c | 205.312 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 204.318 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000254 | 205.066 | 0.000 | n/a | 0.000 | 0.000 | 0.523 | 204.372 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000231 | 204.620 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 203.600 | 0.016 | n/a | 0.071 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be3045723000000000000024c | 204.583 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 203.611 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000259 | 204.556 | 0.000 | n/a | 0.000 | 0.000 | 0.790 | 203.524 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be3045723000000000000023c | 204.363 | 0.000 | n/a | 0.000 | 0.000 | 3.361 | 200.809 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000233 | 203.580 | 0.000 | n/a | 0.000 | 0.000 | 1.881 | 201.450 | 0.013 | n/a | 0.123 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000279 | 203.061 | 0.000 | n/a | 0.000 | 0.000 | 1.729 | 201.076 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000262 | 202.948 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 201.127 | 0.012 | n/a | 0.761 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000249 | 202.806 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 201.881 | 0.016 | n/a | 0.124 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000277 | 202.626 | 0.000 | n/a | 0.000 | 0.000 | 1.024 | 201.137 | 0.015 | n/a | 0.091 | 0.000 | n/a | n/a | 0.359 | 0.000 | 0.000 | 0.359 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000248 | 202.572 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 201.480 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be3045723000000000000021a | 202.518 | 0.000 | n/a | 0.000 | 0.000 | 0.936 | 201.308 | 0.009 | n/a | 0.122 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000265 | 202.495 | 0.000 | n/a | 0.000 | 0.000 | 0.836 | 201.455 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be3045723000000000000024d | 202.430 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 201.503 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be3045723000000000000027b | 202.387 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 201.131 | 0.008 | n/a | 0.092 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000261 | 202.373 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 201.036 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be3045723000000000000020d | 202.325 | 0.000 | n/a | 0.000 | 0.000 | 1.491 | 200.688 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be3045723000000000000026a | 202.273 | 0.000 | n/a | 0.000 | 0.000 | 0.977 | 201.079 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.400 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.593 | 71.915 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 205.998 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.678 | 203.211 | 0.026 | n/a | 0.122 | 0.000 | n/a | n/a | 54.189 | 0.000 | 0.000 | 54.189 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8ec5710be3045723000000000000028f | 205.998 | 0.000 | n/a | 0.000 | 0.000 | 2.603 | 203.211 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be3045723000000000000028b | 202.839 | 0.000 | n/a | 0.000 | 0.000 | 1.530 | 201.017 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000284 | 202.605 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.324 | 0.025 | n/a | 0.122 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be3045723000000000000028c | 202.467 | 0.000 | n/a | 0.000 | 0.000 | 1.335 | 200.950 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000292 | 202.290 | 0.000 | n/a | 0.000 | 0.000 | 1.006 | 201.020 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000291 | 202.270 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 200.722 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000293 | 202.198 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 201.214 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000296 | 202.173 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 201.002 | 0.020 | n/a | 0.115 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be3045723000000000000027e | 202.045 | 0.000 | n/a | 0.000 | 0.000 | 0.470 | 201.335 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000280 | 201.996 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 201.200 | 0.015 | n/a | 0.101 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000285 | 201.940 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 201.056 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000281 | 201.806 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.967 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be3045723000000000000028d | 201.770 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 200.913 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000297 | 201.760 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 200.763 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be3045723000000000000027f | 201.740 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 200.778 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000298 | 201.609 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 200.800 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000286 | 201.594 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.748 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000299 | 201.526 | 0.000 | n/a | 0.000 | 0.000 | 0.499 | 200.838 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000294 | 201.509 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 200.602 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000288 | 201.407 | 0.000 | n/a | 0.000 | 0.000 | 0.407 | 200.813 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (214 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.286 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 86.651 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 202.713 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.476 | 201.296 | 0.877 | n/a | 0.092 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8ec5710be30457230000000000000eb9 | 203.198 | 0.000 | n/a | 0.000 | 0.000 | 1.330 | 201.500 | 0.032 | n/a | 0.137 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000edf | 203.188 | 0.000 | n/a | 0.000 | 0.000 | 1.577 | 201.317 | 0.016 | n/a | 0.092 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000ea9 | 202.713 | 0.000 | n/a | 0.000 | 0.000 | 1.626 | 200.885 | 0.011 | n/a | 0.051 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000ed1 | 202.482 | 0.000 | n/a | 0.000 | 0.000 | 1.675 | 200.645 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000ebe | 202.457 | 0.000 | n/a | 0.000 | 0.000 | 1.508 | 200.782 | 0.028 | n/a | 0.038 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000f0a | 202.298 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 201.296 | 0.018 | n/a | 0.067 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000efa | 202.192 | 0.000 | n/a | 0.000 | 0.000 | 1.205 | 200.814 | 0.029 | n/a | 0.056 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000f1b | 202.099 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 201.256 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000ec1 | 202.086 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 201.085 | 0.018 | n/a | 0.104 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000eba | 202.064 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 200.952 | 0.013 | n/a | 0.057 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000f19 | 202.011 | 0.000 | n/a | 0.000 | 0.000 | 1.136 | 200.567 | 0.014 | n/a | 0.047 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000f0b | 201.870 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 200.902 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 8ec5710be30457230000000000000ed9 | 201.848 | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 200.883 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-48/journal/page | none observed |
| 8ec5710be30457230000000000000f17 | 201.839 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 200.784 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000ec6 | 201.814 | 0.000 | n/a | 0.000 | 0.000 | 0.556 | 201.064 | 0.024 | n/a | 0.065 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 8ec5710be30457230000000000000f11 | 201.785 | 0.000 | n/a | 0.000 | 0.000 | 0.557 | 201.012 | 0.015 | n/a | 0.082 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-42/journal/page | none observed |
| 8ec5710be30457230000000000000ecb | 201.728 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 201.027 | 0.014 | n/a | 0.054 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 8ec5710be30457230000000000000f05 | 201.726 | 0.000 | n/a | 0.000 | 0.000 | 0.621 | 200.934 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 8ec5710be30457230000000000000ee0 | 201.687 | 0.000 | n/a | 0.000 | 0.000 | 0.526 | 200.948 | 0.021 | n/a | 0.061 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 8ec5710be30457230000000000000ee7 | 201.673 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 200.945 | 0.015 | n/a | 0.047 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

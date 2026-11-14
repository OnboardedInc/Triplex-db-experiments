# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (93.547 ms, trace `843962c5e22ccb770000000000000056`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (114.062 ms, trace `843962c5e22ccb77000000000000005b`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (75.141 ms, trace `843962c5e22ccb770000000000000052`); `node-14/thread-0/driver.queue.subject` (37.279 ms, trace `843962c5e22ccb770000000000000764`); `node-14/thread-0/driver.queue.subject` (51.978 ms, trace `843962c5e22ccb770000000000000763`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-cache-smoke-b`; source `9ac79685c6286ce7a20f3d06be5556d314817f42`; subjects 1000; tracing full.

Recorders: gateway, node, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 16944141.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 214 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1292.254 | 148.129 | 5.878 | 55 |
| L1 | 1 | 1969.989 | 134.040 | 0.810 | 44 |
| L4 | 4 | 1944.197 | 241.427 | 6.399 | 64 |
| L16 | 16 | 1963.879 | 162.834 | 3.509 | 64 |
| tail | 0 | 191675.726 | 15529.720 | 153.246 | 73549 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 843962c5e22ccb770000000000000056 | driver.queue.scheduler-dispatch | 0.066 | none | 0 / 32 |
| 843962c5e22ccb770000000000000056 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 843962c5e22ccb770000000000000056 waited: []

| 843962c5e22ccb77000000000000005b | driver.queue.scheduler-dispatch | 0.040 | none | 0 / 32 |
| 843962c5e22ccb77000000000000005b | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 843962c5e22ccb77000000000000005b waited: []

| 843962c5e22ccb770000000000000052 | driver.queue.scheduler-late | 1.231 | none | 0 / 32 |
| 843962c5e22ccb770000000000000052 | driver.queue.scheduler-dispatch | 0.048 | none | 0 / 32 |

Observed active steps while trace 843962c5e22ccb770000000000000052 waited: []

| 843962c5e22ccb770000000000000764 | driver.queue.subject | 37.279 | 843962c5e22ccb770000000000000762 | 4 / 32 |
| 843962c5e22ccb770000000000000764 | driver.queue.scheduler-late | 0.770 | none | 4 / 32 |
| 843962c5e22ccb770000000000000764 | driver.queue.scheduler-dispatch | 0.057 | none | 3 / 32 |

Observed active steps while trace 843962c5e22ccb770000000000000764 waited: [{"at":1794661682442.4226,"inFlight":4,"capacity":32,"active":[{"traceId":"843962c5e22ccb77000000000000075e","step":"client.http"},{"traceId":"843962c5e22ccb77000000000000075f","step":"client.http"},{"traceId":"843962c5e22ccb770000000000000762","step":"client.http"},{"traceId":"843962c5e22ccb770000000000000766","step":"client.http"}]}]

| 843962c5e22ccb770000000000000763 | driver.queue.subject | 51.978 | 843962c5e22ccb770000000000000760 | 4 / 32 |
| 843962c5e22ccb770000000000000763 | driver.queue.scheduler-late | 3.907 | none | 4 / 32 |
| 843962c5e22ccb770000000000000763 | driver.queue.scheduler-dispatch | 0.144 | none | 2 / 32 |

Observed active steps while trace 843962c5e22ccb770000000000000763 waited: [{"at":1794661682442.4226,"inFlight":4,"capacity":32,"active":[{"traceId":"843962c5e22ccb77000000000000075e","step":"client.http"},{"traceId":"843962c5e22ccb77000000000000075f","step":"client.http"},{"traceId":"843962c5e22ccb770000000000000762","step":"client.http"},{"traceId":"843962c5e22ccb770000000000000766","step":"client.http"}]},{"at":1794661682462.5083,"inFlight":3,"capacity":32,"active":[{"traceId":"843962c5e22ccb770000000000000760","step":"client.http"},{"traceId":"843962c5e22ccb770000000000000769","step":"client.http"},{"traceId":"843962c5e22ccb770000000000000764","step":"client.http"}]}]

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.559 | 0.410 | 0.000 | 0.679 | 4.755 | 0.379 | 0.000 | 0.076 | 1.526 | 3.411 | 0.062 | n/a | 2.318 | 11.774 | 1.628 | n/a | 0.031 | 5.067 | 0.223 | 0.031 |
| p99 | 57.893 | 2.000 | 0.006 | 4.116 | 14.540 | n/a | 0.000 | 1.167 | 3.926 | 12.629 | 0.125 | n/a | 3.636 | 18.107 | 5.817 | n/a | 0.398 | 15.690 | 0.359 | 0.398 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb770000000000000037 | 57.893 | 14.524 | n/a | 0.000 | 1.167 | 1.526 | 12.629 | 0.090 | n/a | 3.636 | 18.107 | 5.817 | n/a | 0.398 | 15.690 | 0.271 | 0.398 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb77000000000000003b | 41.782 | 14.540 | 0.379 | 0.000 | 0.076 | 3.926 | 6.993 | 0.125 | n/a | 2.318 | 11.774 | 1.628 | n/a | 0.024 | 14.995 | 0.359 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb77000000000000003f | 31.559 | 4.755 | 0.252 | 0.000 | 0.060 | 1.929 | 3.411 | 0.062 | n/a | 1.066 | 17.681 | 2.311 | n/a | 0.031 | 5.067 | 0.161 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb77000000000000003d | 20.496 | 3.646 | n/a | 0.000 | 0.929 | 1.516 | 1.604 | 0.021 | n/a | 2.326 | 9.747 | 0.651 | n/a | 0.056 | 4.574 | 0.223 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (86 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.270 | n/a | n/a | n/a | 41.430 | 4.459 | 2.437 | 0.000 | 7.204 | 4.273 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.007 | 56.407 | 0.791 | 0.007 |
| p99 | 206.140 | n/a | n/a | n/a | 109.178 | 98.506 | 21.145 | 0.000 | 162.251 | 73.701 | 8.734 | n/a | 0.052 | 0.000 | n/a | n/a | 0.049 | 166.963 | 1.000 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb770000000000001c60 | 206.140 | 62.969 | 29.471 | 4.718 | 0.000 | 102.729 | 6.232 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.008 | 97.157 | 0.471 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.808ms; driver.expected-state.bind-receipt 1.627ms; driver.publication.persist-deferred 0.975ms; driver.publication.persist-deferred 0.945ms; driver.publication.persist-deferred 0.906ms |
| 843962c5e22ccb7700000000000015ba | 201.027 | 46.092 | 70.169 | 4.198 | 0.000 | 76.083 | 4.471 | 0.002 | n/a | 0.003 | 0.000 | n/a | n/a | 0.009 | 120.459 | 0.599 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.634ms; driver.expected-state.bind-receipt 1.311ms; driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 1.141ms; driver.expected-state.bind-receipt 1.094ms |
| 843962c5e22ccb7700000000000005e6 | 200.887 | 35.835 | 2.840 | 3.107 | 0.000 | 110.388 | 41.633 | 7.052 | n/a | 0.022 | 0.000 | n/a | n/a | 0.009 | 41.783 | 0.208 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.241ms; driver.publication.persist-deferred 1.229ms; driver.publication.persist-deferred 1.176ms; driver.publication.persist-deferred 1.144ms; driver.publication.persist-deferred 1.141ms |
| 843962c5e22ccb7700000000000015cc | 193.436 | 66.107 | 98.506 | 2.351 | 0.000 | 23.916 | 2.541 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.006 | 166.963 | 0.863 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.634ms; driver.expected-state.bind-receipt 1.311ms; driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 0.974ms; driver.publication.persist-deferred 0.945ms |
| 843962c5e22ccb7700000000000005ef | 185.522 | 25.361 | 40.387 | 0.587 | 0.000 | 118.045 | 1.104 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.017 | 66.335 | 0.358 | 0.017 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.241ms; driver.publication.persist-deferred 1.176ms; driver.publication.persist-deferred 1.144ms; driver.publication.persist-deferred 1.141ms; driver.publication.persist-deferred 1.125ms |
| 843962c5e22ccb7700000000000005ec | 183.589 | 14.427 | 2.334 | 0.000 | 0.000 | 162.251 | 0.564 | 3.982 | n/a | 0.013 | 0.000 | n/a | n/a | 0.018 | 16.761 | 0.091 | 0.018 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.241ms; driver.publication.persist-deferred 1.229ms; driver.publication.persist-deferred 1.176ms; driver.publication.persist-deferred 1.144ms; driver.publication.persist-deferred 1.141ms |
| 843962c5e22ccb7700000000000015c9 | 178.821 | 53.901 | 74.781 | 0.837 | 0.000 | 41.633 | 0.897 | 6.747 | n/a | 0.017 | 0.000 | n/a | n/a | 0.008 | 129.519 | 0.724 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.634ms; driver.expected-state.bind-receipt 1.311ms; driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 0.974ms; driver.publication.persist-deferred 0.933ms |
| 843962c5e22ccb7700000000000015c8 | 177.634 | 60.451 | 75.059 | 0.837 | 0.000 | 39.121 | 2.140 | 0.006 | n/a | 0.015 | 0.000 | n/a | n/a | 0.005 | 136.347 | 0.768 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.634ms; driver.expected-state.bind-receipt 1.311ms; driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 0.974ms; driver.publication.persist-deferred 0.933ms |
| 843962c5e22ccb7700000000000015ce | 174.454 | 62.448 | 58.865 | 2.289 | 0.000 | 38.224 | 12.607 | 0.005 | n/a | 0.010 | 0.000 | n/a | n/a | 0.006 | 123.602 | 0.709 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.634ms; driver.expected-state.bind-receipt 1.311ms; driver.publication.persist-deferred 0.974ms; driver.publication.persist-deferred 0.933ms; driver.publication.persist-deferred 0.930ms |
| 843962c5e22ccb770000000000001c5c | 173.551 | 60.434 | 28.578 | 2.794 | 0.000 | 66.377 | 8.535 | 6.820 | n/a | 0.007 | 0.000 | n/a | n/a | 0.005 | 91.806 | 0.529 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.808ms; driver.expected-state.bind-receipt 1.627ms; driver.publication.persist-deferred 0.975ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.945ms |
| 843962c5e22ccb7700000000000005e7 | 167.326 | 81.826 | 0.725 | 12.269 | 0.000 | 20.438 | 43.302 | 8.734 | n/a | 0.025 | 0.000 | n/a | n/a | 0.007 | 94.820 | 0.567 | 0.007 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.241ms; driver.publication.persist-deferred 1.229ms; driver.publication.persist-deferred 1.176ms; driver.publication.persist-deferred 1.144ms; driver.publication.persist-deferred 1.141ms |
| 843962c5e22ccb770000000000001c26 | 153.096 | 63.676 | 5.100 | 8.481 | 0.000 | 64.319 | 11.501 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.008 | 77.257 | 0.505 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.129ms; driver.publication.persist-deferred 1.005ms; driver.publication.persist-deferred 0.960ms; driver.publication.persist-deferred 0.933ms; driver.publication.persist-deferred 0.885ms |
| 843962c5e22ccb770000000000000038 | 147.746 | 109.178 | 4.459 | 21.145 | 0.000 | 3.295 | 9.591 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.049 | 134.782 | 0.912 | 0.049 | node-14/thread-3/worker.gateway-observer.observe | driver.publication.persist-deferred 4.139ms |
| 843962c5e22ccb7700000000000015c0 | 146.353 | 55.240 | 34.317 | 10.620 | 0.000 | 44.766 | 1.377 | 0.013 | n/a | 0.006 | 0.000 | n/a | n/a | 0.013 | 100.178 | 0.684 | 0.013 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.634ms; driver.expected-state.bind-receipt 1.311ms; driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 1.141ms; driver.publication.persist-deferred 0.974ms |
| 843962c5e22ccb770000000000001c57 | 136.327 | 61.098 | 44.810 | 4.373 | 0.000 | 14.844 | 11.187 | 0.004 | n/a | 0.008 | 0.000 | n/a | n/a | 0.004 | 110.280 | 0.809 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.808ms; driver.expected-state.bind-receipt 1.627ms; driver.publication.persist-deferred 0.975ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.945ms |
| 843962c5e22ccb770000000000001282 | 135.636 | 29.921 | 95.865 | 6.544 | 0.000 | 0.550 | 2.732 | 0.006 | n/a | 0.015 | 0.000 | n/a | n/a | 0.003 | 132.330 | 0.976 | 0.003 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.059ms; driver.publication.persist-deferred 0.788ms; driver.publication.persist-deferred 0.778ms; driver.publication.persist-deferred 0.759ms; driver.publication.persist-deferred 0.726ms |
| 843962c5e22ccb7700000000000015b9 | 127.784 | 45.235 | 70.800 | 2.767 | 0.000 | 3.087 | 5.872 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.008 | 118.802 | 0.930 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.634ms; driver.expected-state.bind-receipt 1.311ms; driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 1.141ms; driver.expected-state.bind-receipt 1.094ms |
| 843962c5e22ccb770000000000001b63 | 122.796 | 61.340 | 0.111 | 8.192 | 0.000 | 38.874 | 9.939 | 4.324 | n/a | 0.011 | 0.000 | n/a | n/a | 0.005 | 69.643 | 0.567 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.282ms; driver.publication.persist-deferred 1.187ms; driver.publication.persist-deferred 1.099ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.834ms |
| 843962c5e22ccb770000000000001280 | 118.656 | 60.301 | 0.257 | 3.850 | 0.000 | 46.134 | 8.101 | 0.003 | n/a | 0.005 | 0.000 | n/a | n/a | 0.006 | 64.407 | 0.543 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 0.988ms; driver.publication.persist-deferred 0.788ms; driver.publication.persist-deferred 0.778ms; driver.publication.persist-deferred 0.759ms; driver.publication.persist-deferred 0.726ms |
| 843962c5e22ccb7700000000000019e7 | 118.200 | 24.527 | 1.820 | 0.000 | 0.000 | 85.857 | 4.701 | 1.282 | n/a | 0.006 | 0.000 | n/a | n/a | 0.008 | 26.347 | 0.223 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.127ms; driver.publication.persist-deferred 1.123ms; driver.publication.persist-deferred 0.948ms; driver.publication.persist-deferred 0.918ms; driver.publication.persist-deferred 0.877ms |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.496 | 0.410 | 0.000 | 0.776 | 3.646 | n/a | 0.000 | 0.929 | 1.516 | 1.604 | 0.021 | n/a | 2.326 | 9.747 | 0.651 | n/a | 0.056 | 4.574 | 0.223 | 0.056 |
| p99 | 20.496 | 0.410 | 0.000 | 0.776 | 3.646 | n/a | 0.000 | 0.929 | 1.516 | 1.604 | 0.021 | n/a | 2.326 | 9.747 | 0.651 | n/a | 0.056 | 4.574 | 0.223 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb77000000000000003d | 20.496 | 3.646 | n/a | 0.000 | 0.929 | 1.516 | 1.604 | 0.021 | n/a | 2.326 | 9.747 | 0.651 | n/a | 0.056 | 4.574 | 0.223 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.662 | 0.000 | 0.000 | 0.396 | 4.134 | 0.181 | 0.000 | 0.078 | 2.535 | 4.389 | 0.033 | n/a | 0.182 | 20.123 | 0.648 | n/a | 0.025 | 4.665 | 0.125 | 0.025 |
| p99 | 55.582 | 0.196 | 0.000 | 0.551 | 5.170 | n/a | 0.000 | 0.531 | 2.963 | 12.234 | 0.073 | n/a | 1.320 | 44.433 | 1.119 | n/a | 0.028 | 5.349 | 0.194 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb770000000000000046 | 55.582 | 3.870 | 0.181 | 0.000 | 0.078 | 2.535 | 3.595 | 0.033 | n/a | 0.182 | 44.433 | 0.648 | n/a | 0.028 | 4.128 | 0.074 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb770000000000000043 | 42.662 | 5.170 | 0.143 | 0.000 | 0.036 | 2.963 | 12.234 | 0.073 | n/a | 1.320 | 20.123 | 0.585 | n/a | 0.015 | 5.349 | 0.125 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb770000000000000041 | 24.012 | 4.134 | n/a | 0.000 | 0.531 | 0.794 | 4.389 | 0.021 | n/a | 0.159 | 12.839 | 1.119 | n/a | 0.025 | 4.665 | 0.194 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.012 | 0.000 | 0.000 | 0.551 | 4.134 | n/a | 0.000 | 0.531 | 0.794 | 4.389 | 0.021 | n/a | 0.159 | 12.839 | 1.119 | n/a | 0.025 | 4.665 | 0.194 | 0.025 |
| p99 | 24.012 | 0.000 | 0.000 | 0.551 | 4.134 | n/a | 0.000 | 0.531 | 0.794 | 4.389 | 0.021 | n/a | 0.159 | 12.839 | 1.119 | n/a | 0.025 | 4.665 | 0.194 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb770000000000000041 | 24.012 | 4.134 | n/a | 0.000 | 0.531 | 0.794 | 4.389 | 0.021 | n/a | 0.159 | 12.839 | 1.119 | n/a | 0.025 | 4.665 | 0.194 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.643 | 0.417 | 0.000 | 0.701 | 3.274 | 0.260 | 0.000 | 0.089 | 1.211 | 5.831 | 0.036 | n/a | 0.240 | 17.167 | 2.250 | n/a | 0.025 | 4.245 | 0.116 | 0.025 |
| p99 | 71.826 | 1.122 | 0.000 | 1.016 | 8.151 | n/a | 0.000 | 0.971 | 3.333 | 7.076 | 0.066 | n/a | 3.651 | 57.284 | 5.350 | n/a | 0.047 | 8.499 | 0.255 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb770000000000000047 | 71.826 | 2.979 | n/a | 0.000 | 0.900 | 1.211 | 6.180 | 0.066 | n/a | 0.165 | 57.284 | 2.994 | n/a | 0.047 | 3.879 | 0.054 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb77000000000000004f | 36.675 | 4.082 | 0.197 | 0.000 | 0.072 | 2.326 | 5.831 | 0.036 | n/a | 0.240 | 22.227 | 1.645 | n/a | 0.020 | 4.350 | 0.119 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb770000000000000049 | 36.643 | 3.274 | n/a | 0.000 | 0.971 | 1.136 | 5.049 | 0.020 | n/a | 3.651 | 17.167 | 5.350 | n/a | 0.025 | 4.245 | 0.116 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb77000000000000004c | 33.291 | 8.151 | 0.260 | 0.000 | 0.089 | 3.333 | 7.076 | 0.042 | n/a | 1.084 | 10.975 | 2.250 | n/a | 0.031 | 8.499 | 0.255 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.826 | 1.002 | 0.000 | 0.758 | 2.979 | n/a | 0.000 | 0.900 | 1.211 | 6.180 | 0.066 | n/a | 0.165 | 57.284 | 2.994 | n/a | 0.047 | 3.879 | 0.054 | 0.047 |
| p99 | 71.826 | 1.002 | 0.000 | 0.758 | 2.979 | n/a | 0.000 | 0.900 | 1.211 | 6.180 | 0.066 | n/a | 0.165 | 57.284 | 2.994 | n/a | 0.047 | 3.879 | 0.054 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb770000000000000047 | 71.826 | 2.979 | n/a | 0.000 | 0.900 | 1.211 | 6.180 | 0.066 | n/a | 0.165 | 57.284 | 2.994 | n/a | 0.047 | 3.879 | 0.054 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.000 | 0.755 | 0.000 | 0.570 | 3.827 | 2.094 | 0.000 | 0.093 | 1.475 | 12.781 | 0.035 | n/a | 0.294 | 12.931 | 8.248 | n/a | 0.022 | 4.349 | 0.044 | 0.022 |
| p99 | 214.955 | 0.977 | 0.000 | 1.063 | 9.092 | n/a | 0.000 | 1.279 | 1.936 | 48.566 | 0.130 | n/a | 0.802 | 93.547 | 60.588 | n/a | 0.032 | 9.385 | 0.159 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb770000000000000056 | 214.955 | 9.092 | 0.225 | 0.000 | 0.068 | 1.916 | 48.566 | 0.130 | n/a | 0.802 | 93.547 | 60.588 | n/a | 0.022 | 9.385 | 0.044 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb770000000000000052 | 134.447 | 2.237 | n/a | 0.000 | 1.279 | 0.695 | 25.048 | 0.031 | n/a | 0.107 | 75.141 | 29.882 | n/a | 0.030 | 3.515 | 0.026 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb770000000000000059 | 41.000 | 4.314 | 2.094 | 0.000 | 0.093 | 1.936 | 12.781 | 0.035 | n/a | 0.462 | 11.005 | 8.248 | n/a | 0.032 | 6.501 | 0.159 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb770000000000000050 | 33.105 | 3.827 | n/a | 0.000 | 0.521 | 1.475 | 7.670 | 0.103 | n/a | 0.294 | 12.931 | 6.264 | n/a | 0.019 | 4.349 | 0.131 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3696 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.814 | 0.288 | 0.000 | 0.483 | 2.144 | n/a | 0.000 | 0.702 | 0.608 | 0.997 | 0.011 | n/a | 0.112 | 4.789 | 0.588 | n/a | 0.014 | 3.109 | 0.275 | 0.014 |
| p99 | 40.542 | 2.006 | 0.035 | 1.975 | 7.098 | n/a | 0.453 | 17.975 | 7.137 | 8.176 | 0.090 | n/a | 3.309 | 20.291 | 7.509 | n/a | 0.055 | 19.809 | 0.699 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb77000000000000005b | 171.873 | 5.143 | 0.145 | 0.000 | 0.041 | 2.551 | 26.151 | 0.056 | n/a | 0.460 | 114.062 | 23.251 | n/a | 0.014 | 5.329 | 0.031 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb770000000000000764 | 95.692 | 10.190 | n/a | 1.215 | 38.105 | 21.125 | 2.430 | 0.025 | n/a | 0.097 | 22.053 | 0.444 | n/a | 0.008 | 49.510 | 0.517 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.454ms; driver.expected-state.bind-receipt 1.499ms; driver.publication.persist-deferred 1.250ms; driver.publication.persist-deferred 1.181ms; driver.publication.persist-deferred 1.106ms |
| 843962c5e22ccb770000000000000763 | 79.181 | 7.250 | n/a | 0.000 | 56.029 | 0.693 | 1.451 | 0.012 | n/a | 0.064 | 12.100 | 1.560 | n/a | 0.022 | 63.278 | 0.799 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.454ms; driver.publication.persist-deferred 1.250ms; driver.publication.persist-deferred 1.106ms; driver.publication.persist-deferred 1.089ms; driver.publication.persist-deferred 0.917ms |
| 843962c5e22ccb770000000000000354 | 69.694 | 1.190 | n/a | 0.000 | 52.184 | 6.029 | 0.611 | 0.011 | n/a | 0.313 | 8.970 | 0.378 | n/a | 0.008 | 53.374 | 0.766 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.159ms; driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.182ms; driver.expected-state.bind-receipt 1.154ms; driver.publication.persist-deferred 1.094ms |
| 843962c5e22ccb7700000000000001ce | 64.262 | 5.644 | 0.328 | 0.458 | 0.061 | 2.305 | 50.820 | 0.045 | n/a | 0.140 | 3.944 | 0.495 | n/a | 0.023 | 6.491 | 0.101 | 0.023 | gw-w/thread-44/gateway.admitted-work | none observed |
| 843962c5e22ccb770000000000000062 | 64.031 | 7.899 | n/a | 0.000 | 0.543 | 1.787 | 11.451 | 0.126 | n/a | 0.412 | 19.636 | 22.092 | n/a | 0.085 | 8.442 | 0.132 | 0.085 | tx/thread-83/transactor.triplex-function | none observed |
| 843962c5e22ccb770000000000000760 | 61.950 | 2.207 | n/a | 0.000 | 45.943 | 0.589 | 5.325 | 0.013 | n/a | 0.078 | 7.395 | 0.389 | n/a | 0.012 | 48.150 | 0.777 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.454ms; driver.publication.persist-deferred 1.106ms; driver.publication.persist-deferred 1.089ms; driver.publication.persist-deferred 0.917ms; driver.publication.persist-deferred 0.888ms |
| 843962c5e22ccb770000000000000094 | 60.262 | 3.432 | 0.219 | 0.000 | 0.067 | 3.018 | 6.076 | 0.027 | n/a | 0.086 | 39.802 | 7.511 | n/a | 0.024 | 3.717 | 0.062 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb770000000000000353 | 53.370 | 1.255 | n/a | 0.000 | 24.605 | 5.403 | 0.688 | 0.018 | n/a | 0.366 | 20.595 | 0.429 | n/a | 0.010 | 25.860 | 0.485 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.159ms; driver.publication.persist-deferred 1.094ms; driver.publication.persist-deferred 1.025ms; driver.publication.persist-deferred 1.024ms; driver.publication.persist-deferred 0.049ms |
| 843962c5e22ccb770000000000000450 | 50.951 | 3.248 | n/a | 0.000 | 22.334 | 0.521 | 1.032 | 0.015 | n/a | 0.329 | 22.875 | 0.578 | n/a | 0.019 | 25.582 | 0.502 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.187ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.925ms |
| 843962c5e22ccb770000000000000082 | 48.284 | 3.545 | 0.187 | 0.000 | 0.103 | 3.174 | 12.438 | 0.052 | n/a | 0.167 | 19.887 | 8.702 | n/a | 0.031 | 3.834 | 0.079 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 843962c5e22ccb7700000000000000ec | 47.781 | 5.847 | 0.262 | 0.248 | 0.116 | 2.939 | 4.772 | 0.050 | n/a | 2.584 | 8.676 | 22.240 | n/a | 0.045 | 6.474 | 0.135 | 0.045 | tx/thread-83/transactor.triplex-function | none observed |
| 843962c5e22ccb7700000000000002ac | 47.728 | 1.966 | n/a | 0.000 | 26.135 | 2.004 | 1.557 | 0.026 | n/a | 2.959 | 12.505 | 0.565 | n/a | 0.011 | 28.101 | 0.589 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.138ms; driver.publication.persist-deferred 1.111ms; driver.publication.persist-deferred 1.083ms; driver.publication.persist-deferred 1.065ms; driver.publication.persist-deferred 0.985ms |
| 843962c5e22ccb770000000000000762 | 47.183 | 2.106 | n/a | 0.000 | 7.050 | 9.998 | 0.862 | 0.007 | n/a | 1.170 | 25.530 | 0.442 | n/a | 0.019 | 9.156 | 0.194 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.454ms; driver.publication.persist-deferred 1.106ms; driver.publication.persist-deferred 1.089ms; driver.publication.persist-deferred 0.917ms |
| 843962c5e22ccb770000000000000298 | 47.081 | 2.182 | n/a | 0.000 | 0.547 | 0.396 | 1.084 | 0.010 | n/a | 0.052 | 40.145 | 2.618 | n/a | 0.046 | 2.729 | 0.058 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.250ms; driver.publication.persist-deferred 1.085ms |
| 843962c5e22ccb770000000000000456 | 46.734 | 2.773 | n/a | 0.000 | 23.277 | 3.078 | 1.053 | 0.016 | n/a | 0.103 | 15.254 | 1.168 | n/a | 0.012 | 26.050 | 0.557 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 0.912ms |
| 843962c5e22ccb770000000000000455 | 46.523 | 4.277 | n/a | 0.000 | 1.133 | 0.436 | 1.235 | 0.013 | n/a | 0.097 | 31.830 | 7.488 | n/a | 0.016 | 5.409 | 0.116 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 0.925ms |
| 843962c5e22ccb77000000000000075f | 46.327 | 2.743 | n/a | 0.000 | 6.768 | 8.052 | 1.044 | 0.010 | n/a | 0.053 | 27.267 | 0.368 | n/a | 0.021 | 9.511 | 0.205 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.454ms; driver.publication.persist-deferred 1.106ms; driver.publication.persist-deferred 1.089ms |
| 843962c5e22ccb770000000000000459 | 46.279 | 1.745 | n/a | 0.000 | 36.222 | 3.842 | 0.798 | 0.015 | n/a | 0.239 | 2.936 | 0.468 | n/a | 0.013 | 37.968 | 0.820 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.458ms; driver.expected-state.bind-receipt 1.097ms; driver.publication.persist-deferred 1.016ms; driver.publication.persist-deferred 1.006ms; driver.publication.persist-deferred 0.912ms |
| 843962c5e22ccb770000000000000358 | 46.050 | 4.100 | n/a | 0.000 | 29.420 | 0.505 | 1.417 | 0.020 | n/a | 0.134 | 9.318 | 1.120 | n/a | 0.014 | 33.521 | 0.728 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.025ms; driver.publication.persist-deferred 1.024ms; driver.publication.persist-deferred 0.869ms |

## P2 / tail / commit / 5-10 facts (2118 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.335 | 0.000 | 0.000 | 0.388 | 1.678 | n/a | 0.000 | 0.742 | 0.583 | 0.832 | 0.011 | n/a | 0.110 | 4.358 | 0.466 | n/a | 0.014 | 2.576 | 0.263 | 0.014 |
| p99 | 31.789 | 1.715 | 0.022 | 0.871 | 4.844 | n/a | 0.000 | 15.872 | 6.563 | 5.104 | 0.067 | n/a | 3.220 | 19.431 | 3.807 | n/a | 0.052 | 17.162 | 0.690 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 843962c5e22ccb770000000000000354 | 69.694 | 1.190 | n/a | 0.000 | 52.184 | 6.029 | 0.611 | 0.011 | n/a | 0.313 | 8.970 | 0.378 | n/a | 0.008 | 53.374 | 0.766 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.159ms; driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.182ms; driver.expected-state.bind-receipt 1.154ms; driver.publication.persist-deferred 1.094ms |
| 843962c5e22ccb770000000000000760 | 61.950 | 2.207 | n/a | 0.000 | 45.943 | 0.589 | 5.325 | 0.013 | n/a | 0.078 | 7.395 | 0.389 | n/a | 0.012 | 48.150 | 0.777 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.454ms; driver.publication.persist-deferred 1.106ms; driver.publication.persist-deferred 1.089ms; driver.publication.persist-deferred 0.917ms; driver.publication.persist-deferred 0.888ms |
| 843962c5e22ccb770000000000000353 | 53.370 | 1.255 | n/a | 0.000 | 24.605 | 5.403 | 0.688 | 0.018 | n/a | 0.366 | 20.595 | 0.429 | n/a | 0.010 | 25.860 | 0.485 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.159ms; driver.publication.persist-deferred 1.094ms; driver.publication.persist-deferred 1.025ms; driver.publication.persist-deferred 1.024ms; driver.publication.persist-deferred 0.049ms |
| 843962c5e22ccb770000000000000298 | 47.081 | 2.182 | n/a | 0.000 | 0.547 | 0.396 | 1.084 | 0.010 | n/a | 0.052 | 40.145 | 2.618 | n/a | 0.046 | 2.729 | 0.058 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.250ms; driver.publication.persist-deferred 1.085ms |
| 843962c5e22ccb77000000000000075f | 46.327 | 2.743 | n/a | 0.000 | 6.768 | 8.052 | 1.044 | 0.010 | n/a | 0.053 | 27.267 | 0.368 | n/a | 0.021 | 9.511 | 0.205 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.454ms; driver.publication.persist-deferred 1.106ms; driver.publication.persist-deferred 1.089ms |
| 843962c5e22ccb770000000000000459 | 46.279 | 1.745 | n/a | 0.000 | 36.222 | 3.842 | 0.798 | 0.015 | n/a | 0.239 | 2.936 | 0.468 | n/a | 0.013 | 37.968 | 0.820 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.458ms; driver.expected-state.bind-receipt 1.097ms; driver.publication.persist-deferred 1.016ms; driver.publication.persist-deferred 1.006ms; driver.publication.persist-deferred 0.912ms |
| 843962c5e22ccb7700000000000014aa | 45.975 | 1.827 | n/a | 0.000 | 29.839 | 0.722 | 0.666 | 0.009 | n/a | 0.219 | 12.233 | 0.444 | n/a | 0.015 | 31.666 | 0.689 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.556ms; driver.publication.persist-deferred 0.951ms; driver.publication.persist-deferred 0.899ms; driver.publication.persist-deferred 0.865ms; driver.publication.persist-deferred 0.630ms |
| 843962c5e22ccb770000000000001104 | 44.040 | 1.025 | n/a | 0.000 | 30.072 | 3.111 | 0.547 | 0.039 | n/a | 0.056 | 8.358 | 0.824 | n/a | 0.008 | 31.097 | 0.706 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 0.843ms; driver.publication.persist-deferred 0.817ms; driver.publication.persist-deferred 0.763ms; driver.publication.persist-deferred 0.728ms |
| 843962c5e22ccb770000000000000458 | 42.518 | 2.415 | n/a | 0.000 | 20.691 | 0.797 | 4.509 | 0.039 | n/a | 0.107 | 13.521 | 0.420 | n/a | 0.020 | 23.106 | 0.543 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.458ms; driver.publication.persist-deferred 0.912ms |
| 843962c5e22ccb7700000000000003d9 | 41.973 | 2.315 | n/a | 0.000 | 17.975 | 0.522 | 2.039 | 0.045 | n/a | 5.587 | 12.986 | 0.485 | n/a | 0.019 | 20.290 | 0.483 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.301ms; driver.publication.persist-deferred 1.172ms; driver.publication.persist-deferred 1.145ms; driver.publication.persist-deferred 1.132ms; driver.publication.persist-deferred 1.115ms |
| 843962c5e22ccb77000000000000005e | 40.542 | 3.459 | n/a | 0.000 | 0.836 | 1.905 | 3.172 | 0.072 | n/a | 0.802 | 14.518 | 15.738 | n/a | 0.040 | 4.295 | 0.106 | 0.040 | tx/thread-83/transactor.triplex-function | none observed |
| 843962c5e22ccb770000000000000e61 | 40.299 | 1.318 | n/a | 0.000 | 25.453 | 2.125 | 0.664 | 0.023 | n/a | 0.544 | 9.792 | 0.369 | n/a | 0.011 | 26.771 | 0.664 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.856ms; driver.publication.persist-deferred 0.591ms |
| 843962c5e22ccb770000000000001c68 | 40.267 | 1.824 | n/a | 0.000 | 8.944 | 3.366 | 0.646 | 0.009 | n/a | 0.525 | 7.716 | 17.230 | n/a | 0.008 | 10.768 | 0.267 | 0.008 | tx/thread-83/transactor.triplex-function | driver.publication.persist-deferred 2.808ms; driver.publication.persist-deferred 0.975ms; driver.publication.persist-deferred 0.945ms |
| 843962c5e22ccb770000000000000ea1 | 39.884 | 1.409 | n/a | 0.000 | 22.828 | 0.405 | 0.638 | 0.006 | n/a | 0.030 | 13.548 | 1.013 | n/a | 0.008 | 24.238 | 0.608 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.128ms; driver.publication.persist-deferred 0.879ms |
| 843962c5e22ccb770000000000000dc4 | 37.321 | 1.063 | n/a | 0.000 | 10.369 | 5.422 | 0.362 | 0.007 | n/a | 0.031 | 19.773 | 0.286 | n/a | 0.009 | 11.432 | 0.306 | 0.009 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.902ms; driver.publication.persist-deferred 0.815ms; driver.publication.persist-deferred 0.533ms |
| 843962c5e22ccb7700000000000002b6 | 36.085 | 1.123 | n/a | 0.000 | 21.892 | 1.766 | 2.451 | 0.259 | n/a | 0.342 | 7.905 | 0.336 | n/a | 0.010 | 23.015 | 0.638 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.974ms; driver.publication.persist-deferred 0.886ms; driver.publication.persist-deferred 0.880ms |
| 843962c5e22ccb770000000000000320 | 35.889 | 7.837 | n/a | 0.000 | 0.266 | 6.251 | 4.569 | 0.057 | n/a | 0.230 | 16.005 | 0.635 | n/a | 0.040 | 8.102 | 0.226 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.136ms |
| 843962c5e22ccb7700000000000000c0 | 35.225 | 1.722 | n/a | 0.000 | 22.379 | 0.540 | 1.648 | 0.127 | n/a | 0.119 | 6.870 | 1.805 | n/a | 0.015 | 24.101 | 0.684 | 0.015 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.125ms; driver.publication.persist-deferred 1.215ms |
| 843962c5e22ccb770000000000000257 | 33.391 | 1.798 | n/a | 0.000 | 9.714 | 0.657 | 1.189 | 0.019 | n/a | 6.646 | 13.063 | 0.290 | n/a | 0.015 | 11.512 | 0.345 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.182ms; driver.publication.persist-deferred 1.118ms; driver.publication.persist-deferred 1.098ms |
| 843962c5e22ccb77000000000000029b | 32.705 | 2.259 | n/a | 0.000 | 1.438 | 2.460 | 1.130 | 0.016 | n/a | 0.124 | 24.922 | 0.330 | n/a | 0.026 | 3.697 | 0.113 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.250ms; driver.publication.persist-deferred 1.085ms; driver.publication.persist-deferred 1.080ms; driver.publication.persist-deferred 1.017ms |

## P1 / warmup / read (234 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.017 | n/a | n/a | n/a | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.015 | 0.917 | 0.001 |
| p99 | 306.669 | n/a | n/a | n/a | 54.712 | n/a | 7.625 | 306.640 | 63.105 | 5.992 | 10.948 | n/a | 0.035 | 0.000 | n/a | n/a | 0.006 | 306.667 | 1.000 | 0.006 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3668bcb03f2e0b4f0000000000002c38 | 306.948 | 0.457 | n/a | 0.000 | 306.489 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.946 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f0000000000002c3c | 306.678 | 0.014 | n/a | 0.000 | 306.662 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.677 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f0000000000002c39 | 306.669 | 0.048 | n/a | 0.000 | 306.620 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.667 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f0000000000002c3b | 306.668 | 0.015 | n/a | 0.000 | 306.652 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.667 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f0000000000002c3a | 306.658 | 0.017 | n/a | 0.000 | 306.640 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.657 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000000315e | 305.820 | 0.540 | n/a | 0.000 | 305.279 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 305.818 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f00000000000033a1 | 305.722 | 0.015 | n/a | 0.000 | 305.706 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.722 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000000339d | 305.721 | 0.247 | n/a | 0.000 | 305.472 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 305.719 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f00000000000033a0 | 305.718 | 0.016 | n/a | 0.000 | 305.701 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.717 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000000339f | 305.706 | 0.018 | n/a | 0.000 | 305.687 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.705 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000000339e | 305.697 | 0.034 | n/a | 0.000 | 305.662 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.696 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe10000000000003163 | 305.508 | 0.015 | n/a | 0.000 | 305.492 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.507 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe10000000000003162 | 305.499 | 0.015 | n/a | 0.000 | 305.483 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.498 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe10000000000003161 | 305.493 | 0.015 | n/a | 0.000 | 305.477 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.492 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000000315f | 305.485 | 0.042 | n/a | 0.000 | 305.441 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.484 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe10000000000003160 | 305.482 | 0.018 | n/a | 0.000 | 305.463 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.481 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000000f2b8 | 270.000 | 0.016 | n/a | 0.000 | 269.982 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.999 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000000f2b7 | 269.994 | 0.094 | n/a | 0.000 | 269.900 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.994 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000000f2b6 | 269.923 | 0.040 | n/a | 0.000 | 269.882 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.922 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000000f2b5 | 269.911 | 0.046 | n/a | 0.000 | 269.864 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.910 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1 / read (134 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.929 | 0.001 |
| p99 | 273.766 | n/a | n/a | n/a | 1.766 | n/a | 0.000 | 273.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.763 | 1.000 | 0.003 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7e88eb5ef3973fe10000000000027aa6 | 321.235 | 0.161 | n/a | 0.000 | 321.071 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 321.233 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 7e88eb5ef3973fe1000000000001ab62 | 273.766 | 0.242 | n/a | 0.000 | 273.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.763 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000000fad2 | 4.534 | 2.531 | n/a | 0.000 | 0.000 | 0.832 | 1.140 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.002 | 2.531 | 0.558 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 7e88eb5ef3973fe10000000000012466 | 1.767 | 1.766 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.766 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000001fd4b | 0.415 | 0.413 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.413 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe100000000000249d6 | 0.380 | 0.378 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.378 | 0.995 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000001cd8c | 0.368 | 0.365 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.365 | 0.993 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe10000000000027206 | 0.310 | 0.309 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.309 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe10000000000019f22 | 0.305 | 0.304 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.304 | 0.995 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000001ab66 | 0.295 | 0.293 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.293 | 0.994 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe100000000000243b1 | 0.288 | 0.287 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.287 | 0.997 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe10000000000018bd0 | 0.279 | 0.278 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.278 | 0.994 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000001f67a | 0.273 | 0.271 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.271 | 0.994 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe10000000000014d16 | 0.264 | 0.262 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.262 | 0.994 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe10000000000025aeb | 0.263 | 0.262 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.262 | 0.998 | 0.000 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000001a01f | 0.259 | 0.258 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.258 | 0.995 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe10000000000010989 | 0.254 | 0.252 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.252 | 0.993 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000001f62f | 0.245 | 0.243 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.243 | 0.993 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000001f719 | 0.245 | 0.243 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.243 | 0.994 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe10000000000027aa2 | 0.241 | 0.239 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.239 | 0.993 | 0.002 | node-14/thread-4/replica.pull-at | none observed |

## P1 / L4 / read (283 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.011 | 0.932 | 0.001 |
| p99 | 260.332 | n/a | n/a | n/a | 3.082 | n/a | 0.000 | 260.122 | 3.630 | 2.246 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.020 | 260.328 | 1.000 | 0.020 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d6aeb782d7b073f000000000000f79b | 260.409 | 0.485 | n/a | 0.000 | 259.915 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 260.399 | 1.000 | 0.010 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe10000000000027ac7 | 260.346 | 0.221 | n/a | 0.000 | 260.122 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 260.343 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f000000000000f33c | 260.332 | 0.183 | n/a | 0.000 | 260.145 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 260.328 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe10000000000027ac8 | 260.288 | 0.047 | n/a | 0.000 | 260.240 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 260.287 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f000000000000f333 | 222.848 | 0.132 | n/a | 0.000 | 222.714 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 222.846 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 7d6aeb782d7b073f000000000000f793 | 222.479 | 0.286 | n/a | 0.000 | 222.183 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 222.469 | 1.000 | 0.010 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 7e88eb5ef3973fe10000000000027aa9 | 222.245 | 0.080 | n/a | 0.000 | 222.162 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 222.242 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 7d6aeb782d7b073f000000000000f79c | 38.933 | 29.509 | n/a | 1.300 | 0.000 | 5.817 | 2.246 | 0.018 | n/a | 0.033 | 0.000 | n/a | n/a | 0.010 | 30.809 | 0.791 | 0.010 | node-14/thread-6/reader.execute | replica.apply-delta 0.072ms |
| 3668bcb03f2e0b4f000000000000f36d | 12.896 | 3.082 | n/a | 0.000 | 0.000 | 6.137 | 3.623 | 0.017 | n/a | 0.034 | 0.000 | n/a | n/a | 0.003 | 3.082 | 0.239 | 0.003 | node-14/thread-5/socket.wait-first-byte | replica.apply-delta 0.078ms |
| 7e88eb5ef3973fe10000000000027b56 | 8.984 | 2.480 | n/a | 0.000 | 0.000 | 3.630 | 2.818 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.003 | 2.480 | 0.276 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 3668bcb03f2e0b4f0000000000020266 | 6.123 | 6.123 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 6.123 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000002894a | 3.124 | 0.003 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.121 | 0.003 | 0.001 | 3.121 | uncovered | none observed |
| 3668bcb03f2e0b4f000000000000f886 | 3.058 | 3.055 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.055 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 3668bcb03f2e0b4f0000000000012454 | 2.382 | 2.381 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.381 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 3668bcb03f2e0b4f00000000000202c1 | 1.569 | 1.566 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.566 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 7d6aeb782d7b073f0000000000016114 | 1.296 | 1.295 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.295 | 0.999 | 0.001 | node-14/thread-6/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000003d027 | 1.011 | 1.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.010 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 3668bcb03f2e0b4f000000000000fd91 | 0.955 | 0.953 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.953 | 0.998 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 7e88eb5ef3973fe10000000000027bbd | 0.917 | 0.908 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.908 | 0.991 | 0.009 | node-14/thread-4/replica.pull-at | none observed |
| 7d6aeb782d7b073f0000000000016159 | 0.899 | 0.897 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.897 | 0.998 | 0.002 | node-14/thread-6/replica.pull-at | none observed |

## P1 / L16 / read (251 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | n/a | n/a | n/a | 0.017 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.021 | 0.940 | 0.001 |
| p99 | 384.592 | n/a | n/a | n/a | 37.315 | n/a | 2.510 | 384.571 | 48.262 | 17.032 | 131.988 | n/a | 0.020 | 0.000 | n/a | n/a | 0.012 | 384.591 | 1.000 | 0.012 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d6aeb782d7b073f0000000000023609 | 384.607 | 0.034 | n/a | 0.000 | 384.571 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 384.605 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000002360a | 384.598 | 0.020 | n/a | 0.000 | 384.576 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 384.597 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000002360b | 384.592 | 0.017 | n/a | 0.000 | 384.574 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 384.591 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f000000000002360c | 384.583 | 0.017 | n/a | 0.000 | 384.565 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 384.582 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7d6aeb782d7b073f0000000000023608 | 384.580 | 0.088 | n/a | 0.000 | 384.489 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 384.577 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f00000000000221eb | 383.691 | 0.013 | n/a | 0.000 | 383.677 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 383.690 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f00000000000221ea | 383.668 | 0.012 | n/a | 0.000 | 383.655 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 383.667 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f00000000000221e9 | 383.664 | 0.021 | n/a | 0.000 | 383.641 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 383.663 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f00000000000221e8 | 383.656 | 0.031 | n/a | 0.000 | 383.625 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 383.655 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3668bcb03f2e0b4f00000000000221e7 | 383.627 | 0.120 | n/a | 0.000 | 383.505 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 383.625 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003f825 | 383.594 | 0.013 | n/a | 0.000 | 383.580 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 383.593 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003f824 | 383.581 | 0.014 | n/a | 0.000 | 383.566 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 383.580 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003f823 | 383.558 | 0.013 | n/a | 0.000 | 383.545 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 383.558 | 1.000 | 0.000 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003f822 | 383.552 | 0.017 | n/a | 0.000 | 383.534 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 383.551 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003f821 | 383.546 | 0.029 | n/a | 0.000 | 383.517 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 383.546 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003f820 | 383.513 | 0.101 | n/a | 0.000 | 383.411 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 383.511 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003d7b6 | 282.158 | 0.083 | n/a | 0.000 | 282.073 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.157 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003d7b5 | 282.127 | 0.298 | n/a | 0.000 | 281.826 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.125 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003d7fc | 281.150 | 0.014 | n/a | 0.000 | 281.135 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.150 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7e88eb5ef3973fe1000000000003d7fb | 281.142 | 0.032 | n/a | 0.000 | 281.109 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.142 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / tail / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | n/a | n/a | n/a | 0.016 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.016 | 0.914 | 0.001 |
| p99 | 0.048 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.045 | 0.945 | 0.004 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3668bcb03f2e0b4f000000000002f4fb | 0.048 | 0.045 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.045 | 0.934 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 3668bcb03f2e0b4f000000000002f4f9 | 0.048 | 0.044 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.044 | 0.924 | 0.004 | node-14/thread-5/reader.execute | none observed |
| 7e88eb5ef3973fe1000000000004cadc | 0.038 | 0.034 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.034 | 0.909 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 7d6aeb782d7b073f000000000002fefa | 0.035 | 0.032 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.032 | 0.923 | 0.003 | node-14/thread-6/reader.execute | none observed |
| 3668bcb03f2e0b4f000000000002f4fa | 0.023 | 0.021 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.021 | 0.914 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 7d6aeb782d7b073f000000000002fefd | 0.021 | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.019 | 0.929 | 0.001 | node-14/thread-6/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000004cadd | 0.018 | 0.017 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.017 | 0.945 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7d6aeb782d7b073f000000000002fefe | 0.018 | 0.016 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.016 | 0.903 | 0.002 | node-14/thread-6/replica.pull-at | none observed |
| 7d6aeb782d7b073f000000000002fefb | 0.012 | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.011 | 0.863 | 0.002 | node-14/thread-6/replica.pull-at | none observed |
| 7d6aeb782d7b073f000000000002fefc | 0.010 | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.846 | 0.001 | node-14/thread-6/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000004cadf | 0.009 | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.008 | 0.944 | 0.000 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000004cade | 0.008 | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.912 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000004cae0 | 0.008 | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.912 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7e88eb5ef3973fe1000000000004cae1 | 0.008 | 0.007 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.007 | 0.938 | 0.000 | node-14/thread-4/replica.pull-at | none observed |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.831 | n/a | n/a | n/a | 0.110 | n/a | 0.000 | 0.000 | 1.646 | 200.331 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.154 | 0.110 | 0.001 | 0.154 |
| p99 | 205.649 | n/a | n/a | n/a | 20.594 | n/a | 1.097 | 0.000 | 2.705 | 202.563 | 0.111 | n/a | 0.152 | 0.000 | n/a | n/a | 0.224 | 20.594 | 0.322 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08aa1133fc9426180000000000000006 | 205.649 | 0.110 | n/a | 0.000 | 0.000 | 2.705 | 202.563 | 0.013 | n/a | 0.143 | 0.000 | n/a | n/a | 0.114 | 0.110 | 0.001 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 08aa1133fc9426180000000000000005 | 204.338 | 0.068 | n/a | 0.000 | 0.000 | 2.421 | 201.440 | 0.065 | n/a | 0.152 | 0.000 | n/a | n/a | 0.192 | 0.068 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 08aa1133fc9426180000000000000007 | 202.287 | 0.033 | n/a | 0.000 | 0.000 | 1.072 | 200.928 | 0.013 | n/a | 0.108 | 0.000 | n/a | n/a | 0.133 | 0.033 | 0.000 | 0.133 | gw-r/thread-46/journal/page | none observed |
| 08aa1133fc9426180000000000000f3b | 200.985 | 0.040 | n/a | 0.000 | 0.000 | 0.430 | 200.391 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.092 | 0.040 | 0.000 | 0.092 | gw-r/thread-69/journal/page | none observed |
| 08aa1133fc9426180000000000000f3c | 200.866 | 0.032 | n/a | 0.000 | 0.000 | 0.387 | 200.336 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.081 | 0.032 | 0.000 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 08aa1133fc9426180000000000000f3a | 200.831 | 0.032 | n/a | 0.000 | 0.000 | 0.388 | 200.331 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.058 | 0.032 | 0.000 | 0.058 | gw-r/thread-44/journal/page | none observed |
| 08aa1133fc9426180000000000000f3f | 81.684 | 15.680 | n/a | 0.000 | 0.000 | 2.297 | 63.546 | 0.004 | n/a | 0.003 | 0.000 | n/a | n/a | 0.154 | 15.680 | 0.192 | 0.154 | gw-r/thread-69/gateway.admitted-work | none observed |
| 08aa1133fc9426180000000000000f41 | 81.541 | 18.609 | n/a | 1.097 | 0.000 | 1.898 | 59.765 | 0.004 | n/a | 0.007 | 0.000 | n/a | n/a | 0.162 | 19.706 | 0.242 | 0.162 | gw-r/thread-65/gateway.admitted-work | none observed |
| 08aa1133fc9426180000000000000f40 | 63.974 | 20.594 | n/a | 0.000 | 0.000 | 2.578 | 40.614 | 0.006 | n/a | 0.010 | 0.000 | n/a | n/a | 0.172 | 20.594 | 0.322 | 0.172 | gw-r/thread-72/gateway.admitted-work | none observed |
| 08aa1133fc9426180000000000000f42 | 62.901 | 9.054 | n/a | 0.000 | 0.000 | 0.633 | 53.031 | 0.005 | n/a | 0.009 | 0.000 | n/a | n/a | 0.169 | 9.054 | 0.144 | 0.169 | gw-r/thread-43/gateway.admitted-work | none observed |
| 4ef490f598831f380000000000000002 | 52.094 | 0.177 | n/a | 0.000 | 0.000 | 1.646 | 49.860 | 0.111 | n/a | 0.077 | 0.000 | n/a | n/a | 0.224 | 0.177 | 0.003 | 0.224 | gw-r/thread-46/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1017.538 | n/a | n/a | n/a | 0.312 | n/a | 0.000 | 0.000 | 2.142 | 1001.780 | 0.020 | n/a | 0.178 | 0.000 | n/a | n/a | 1.105 | 0.312 | 0.000 | 1.105 |
| p99 | 1020.675 | n/a | n/a | n/a | 37.057 | n/a | 0.000 | 0.000 | 3.250 | 1016.474 | 0.054 | n/a | 0.329 | 0.000 | n/a | n/a | 1.364 | 37.057 | 0.036 | 1.364 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4ef490f598831f380000000000000017 | 1020.675 | 0.312 | n/a | 0.000 | 0.000 | 2.142 | 1016.474 | 0.054 | n/a | 0.329 | 0.000 | n/a | n/a | 1.364 | 0.312 | 0.000 | 1.364 | gw-r/thread-47/journal/page | none observed |
| 4ef490f598831f380000000000000019 | 1017.538 | 37.057 | n/a | 0.000 | 0.000 | 3.250 | 976.818 | 0.013 | n/a | 0.139 | 0.000 | n/a | n/a | 0.260 | 37.057 | 0.036 | 0.260 | gw-r/thread-41/journal/page | none observed |
| 4ef490f598831f380000000000000018 | 1004.037 | 0.157 | n/a | 0.000 | 0.000 | 0.796 | 1001.780 | 0.020 | n/a | 0.178 | 0.000 | n/a | n/a | 1.105 | 0.157 | 0.000 | 1.105 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 239.865 | n/a | n/a | n/a | 2.394 | n/a | 0.000 | 0.000 | 0.806 | 223.416 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.181 | 2.394 | 0.049 | 0.181 |
| p99 | 920.893 | n/a | n/a | n/a | 15.563 | n/a | 0.000 | 0.000 | 1.795 | 916.826 | 0.021 | n/a | 0.136 | 0.000 | n/a | n/a | 0.286 | 15.563 | 0.065 | 0.286 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4ef490f598831f38000000000000001c | 920.893 | 2.083 | n/a | 0.000 | 0.000 | 1.795 | 916.826 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.086 | 2.083 | 0.002 | 0.086 | gw-r/thread-66/journal/page | none observed |
| 4ef490f598831f38000000000000001b | 239.865 | 15.563 | n/a | 0.000 | 0.000 | 0.484 | 223.416 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.286 | 15.563 | 0.065 | 0.286 | gw-r/thread-61/journal/page | none observed |
| 4ef490f598831f38000000000000001e | 48.613 | 2.394 | n/a | 0.000 | 0.000 | 0.806 | 45.075 | 0.021 | n/a | 0.136 | 0.000 | n/a | n/a | 0.181 | 2.394 | 0.049 | 0.181 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 967.028 | n/a | n/a | n/a | 3.711 | n/a | 0.000 | 0.000 | 1.142 | 958.075 | 0.017 | n/a | 0.097 | 0.000 | n/a | n/a | 0.500 | 3.711 | 0.005 | 0.500 |
| p99 | 1003.194 | n/a | n/a | n/a | 4.455 | n/a | 0.000 | 0.000 | 3.891 | 1001.149 | 0.024 | n/a | 0.129 | 0.000 | n/a | n/a | 1.102 | 4.455 | 0.082 | 1.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4ef490f598831f380000000000000022 | 1003.194 | 0.133 | n/a | 0.000 | 0.000 | 0.664 | 1001.149 | 0.017 | n/a | 0.129 | 0.000 | n/a | n/a | 1.102 | 0.133 | 0.000 | 1.102 | gw-r/thread-65/journal/page | none observed |
| 4ef490f598831f38000000000000001f | 967.028 | 4.455 | n/a | 0.000 | 0.000 | 3.891 | 958.075 | 0.024 | n/a | 0.083 | 0.000 | n/a | n/a | 0.500 | 4.455 | 0.005 | 0.500 | gw-r/thread-44/journal/page | none observed |
| 4ef490f598831f380000000000000020 | 45.097 | 3.711 | n/a | 0.000 | 0.000 | 1.142 | 40.034 | 0.016 | n/a | 0.097 | 0.000 | n/a | n/a | 0.097 | 3.711 | 0.082 | 0.097 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 269.025 | n/a | n/a | n/a | 2.312 | n/a | 0.000 | 0.000 | 2.034 | 261.026 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.132 | 2.312 | 0.010 | 0.132 |
| p99 | 1015.305 | n/a | n/a | n/a | 5.701 | n/a | 0.000 | 0.000 | 4.357 | 1002.578 | 0.016 | n/a | 0.119 | 0.000 | n/a | n/a | 6.120 | 5.701 | 0.369 | 6.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4ef490f598831f380000000000000029 | 1015.305 | 2.299 | n/a | 0.000 | 0.000 | 4.229 | 1002.578 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 6.120 | 2.299 | 0.002 | 6.120 | gw-r/thread-63/journal/page | none observed |
| 4ef490f598831f380000000000000028 | 538.292 | 2.312 | n/a | 0.000 | 0.000 | 1.043 | 534.725 | 0.013 | n/a | 0.119 | 0.000 | n/a | n/a | 0.081 | 2.312 | 0.004 | 0.081 | gw-r/thread-62/journal/page | none observed |
| 4ef490f598831f380000000000000025 | 269.025 | 5.701 | n/a | 0.000 | 0.000 | 2.034 | 261.026 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.132 | 5.701 | 0.021 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 4ef490f598831f380000000000000024 | 167.278 | 1.660 | n/a | 0.000 | 0.000 | 4.357 | 161.013 | 0.016 | n/a | 0.104 | 0.000 | n/a | n/a | 0.128 | 1.660 | 0.010 | 0.128 | gw-r/thread-45/journal/page | none observed |
| 4ef490f598831f380000000000000023 | 13.242 | 4.890 | n/a | 0.000 | 0.000 | 1.189 | 6.947 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.151 | 4.890 | 0.369 | 0.151 | gw-r/thread-61/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 341.436 | n/a | n/a | n/a | 2.791 | n/a | 0.000 | 0.000 | 1.807 | 328.993 | 0.018 | n/a | 0.110 | 0.000 | n/a | n/a | 0.088 | 2.791 | 0.004 | 0.088 |
| p99 | 832.398 | n/a | n/a | n/a | 10.087 | n/a | 0.000 | 0.000 | 2.980 | 826.166 | 0.097 | n/a | 0.173 | 0.000 | n/a | n/a | 0.147 | 10.087 | 0.030 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4ef490f598831f38000000000000002f | 832.398 | 3.039 | n/a | 0.000 | 0.000 | 2.980 | 826.166 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.088 | 3.039 | 0.004 | 0.088 | gw-r/thread-66/journal/page | none observed |
| 4ef490f598831f38000000000000002c | 622.283 | 2.582 | n/a | 0.000 | 0.000 | 0.909 | 618.479 | 0.097 | n/a | 0.129 | 0.000 | n/a | n/a | 0.088 | 2.582 | 0.004 | 0.088 | gw-r/thread-46/journal/page | none observed |
| 4ef490f598831f38000000000000002a | 341.436 | 10.087 | n/a | 0.000 | 0.000 | 2.013 | 328.993 | 0.022 | n/a | 0.173 | 0.000 | n/a | n/a | 0.147 | 10.087 | 0.030 | 0.147 | gw-r/thread-64/journal/page | none observed |
| 4ef490f598831f38000000000000002e | 200.925 | 2.791 | n/a | 0.000 | 0.000 | 1.807 | 196.173 | 0.018 | n/a | 0.052 | 0.000 | n/a | n/a | 0.084 | 2.791 | 0.014 | 0.084 | gw-r/thread-65/journal/page | none observed |

## P3 / tail / internal (3241 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.241 | n/a | n/a | n/a | 4.077 | n/a | 0.000 | 0.000 | 0.526 | 9.139 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.099 | 4.094 | 0.306 | 0.099 |
| p99 | 991.625 | n/a | n/a | n/a | 18.269 | n/a | 1.406 | 0.000 | 4.232 | 986.125 | 0.020 | n/a | 0.082 | 0.000 | n/a | n/a | 1.514 | 19.195 | 0.842 | 1.514 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4ef490f598831f3800000000000019e2 | 1009.191 | 16.653 | n/a | 0.756 | 0.000 | 0.696 | 990.497 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.539 | 17.409 | 0.017 | 0.539 | gw-r/thread-65/journal/page | none observed |
| 4ef490f598831f380000000000000046 | 1008.214 | 2.146 | n/a | 0.000 | 0.000 | 0.471 | 1005.429 | 0.014 | n/a | 0.079 | 0.000 | n/a | n/a | 0.075 | 2.146 | 0.002 | 0.075 | gw-r/thread-70/journal/page | none observed |
| 4ef490f598831f380000000000000030 | 1007.407 | 0.137 | n/a | 0.000 | 0.000 | 0.689 | 1005.345 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 1.099 | 0.137 | 0.000 | 1.099 | gw-r/thread-70/journal/page | none observed |
| 4ef490f598831f380000000000000093 | 1005.453 | 2.572 | n/a | 0.432 | 0.000 | 2.412 | 999.906 | 0.013 | n/a | 0.059 | 0.000 | n/a | n/a | 0.060 | 3.004 | 0.003 | 0.060 | gw-r/thread-74/journal/page | none observed |
| 4ef490f598831f380000000000000100 | 1005.365 | 3.678 | n/a | 0.000 | 0.000 | 0.712 | 1000.867 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 3.678 | 0.004 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 4ef490f598831f38000000000000018b | 1005.171 | 3.797 | n/a | 0.000 | 0.000 | 0.754 | 1000.518 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.064 | 3.797 | 0.004 | 0.064 | gw-r/thread-64/journal/page | none observed |
| 4ef490f598831f380000000000000172 | 1005.000 | 2.517 | n/a | 0.000 | 0.000 | 1.249 | 1001.097 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.089 | 2.517 | 0.003 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 4ef490f598831f38000000000000011c | 1004.604 | 2.368 | n/a | 0.000 | 0.000 | 0.374 | 1001.736 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.052 | 2.368 | 0.002 | 0.052 | gw-r/thread-41/journal/page | none observed |
| 4ef490f598831f380000000000001a2d | 1004.430 | 0.126 | n/a | 0.000 | 0.000 | 2.811 | 1000.386 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 1.087 | 0.126 | 0.000 | 1.087 | gw-r/thread-64/journal/page | none observed |
| 4ef490f598831f3800000000000000a0 | 1004.224 | 0.118 | n/a | 0.000 | 0.000 | 2.319 | 1000.612 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 1.105 | 0.118 | 0.000 | 1.105 | gw-r/thread-61/journal/page | none observed |
| 4ef490f598831f38000000000000008a | 1004.055 | 0.106 | n/a | 0.000 | 0.000 | 2.080 | 1000.663 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 1.144 | 0.106 | 0.000 | 1.144 | gw-r/thread-48/journal/page | none observed |
| 4ef490f598831f380000000000000083 | 1003.675 | 2.334 | n/a | 0.000 | 0.000 | 1.872 | 999.337 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.051 | 2.334 | 0.002 | 0.051 | gw-r/thread-74/journal/page | none observed |
| 4ef490f598831f38000000000000015e | 1003.573 | 2.177 | n/a | 0.000 | 0.000 | 0.506 | 1000.769 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.057 | 2.177 | 0.002 | 0.057 | gw-r/thread-73/journal/page | none observed |
| 4ef490f598831f380000000000000047 | 1003.449 | 0.145 | n/a | 0.000 | 0.000 | 0.864 | 1001.227 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 1.100 | 0.145 | 0.000 | 1.100 | gw-r/thread-61/journal/page | none observed |
| 4ef490f598831f38000000000000004e | 1003.257 | 0.159 | n/a | 0.000 | 0.000 | 0.726 | 1001.108 | 0.018 | n/a | 0.140 | 0.000 | n/a | n/a | 1.106 | 0.159 | 0.000 | 1.106 | gw-r/thread-74/journal/page | none observed |
| 4ef490f598831f3800000000000000fa | 1002.817 | 0.117 | n/a | 0.000 | 0.000 | 0.441 | 1001.115 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.096 | 0.117 | 0.000 | 1.096 | gw-r/thread-46/journal/page | none observed |
| 4ef490f598831f380000000000000186 | 1002.567 | 0.176 | n/a | 0.000 | 0.000 | 0.617 | 1000.574 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 1.152 | 0.176 | 0.000 | 1.152 | gw-r/thread-62/journal/page | none observed |
| 4ef490f598831f3800000000000000ca | 1002.548 | 0.098 | n/a | 0.000 | 0.000 | 0.732 | 1000.576 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 1.096 | 0.098 | 0.000 | 1.096 | gw-r/thread-71/journal/page | none observed |
| 4ef490f598831f3800000000000000ae | 1001.795 | 2.444 | n/a | 0.000 | 0.000 | 0.413 | 998.822 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.054 | 2.444 | 0.002 | 0.054 | gw-r/thread-74/journal/page | none observed |
| 4ef490f598831f38000000000000010f | 1001.640 | 2.131 | n/a | 0.000 | 0.000 | 0.698 | 998.687 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.052 | 2.131 | 0.002 | 0.052 | gw-r/thread-73/journal/page | none observed |

## P3 / warmup / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.723 | n/a | n/a | n/a | 0.033 | n/a | 0.000 | 0.000 | 1.042 | 200.873 | 0.014 | n/a | 0.141 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 |
| p99 | 206.460 | n/a | n/a | n/a | 0.136 | n/a | 0.000 | 0.000 | 3.383 | 205.475 | 14.998 | n/a | 0.212 | 0.000 | n/a | n/a | 0.279 | 0.136 | 0.001 | 0.279 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08aa1133fc942618000000000000000b | 206.460 | 0.032 | n/a | 0.000 | 0.000 | 0.640 | 205.475 | 0.033 | n/a | 0.212 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 08aa1133fc9426180000000000000008 | 204.537 | 0.051 | n/a | 0.000 | 0.000 | 3.383 | 200.843 | 0.012 | n/a | 0.118 | 0.000 | n/a | n/a | 0.129 | 0.051 | 0.000 | 0.129 | gw-r/thread-43/journal/page | none observed |
| 08aa1133fc9426180000000000000009 | 204.524 | 0.039 | n/a | 0.000 | 0.000 | 3.052 | 200.983 | 0.013 | n/a | 0.157 | 0.000 | n/a | n/a | 0.279 | 0.039 | 0.000 | 0.279 | gw-r/thread-48/journal/page | none observed |
| 08aa1133fc942618000000000000000e | 204.431 | 0.033 | n/a | 0.000 | 0.000 | 1.250 | 202.861 | 0.021 | n/a | 0.197 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-64/journal/page | none observed |
| 08aa1133fc942618000000000000000d | 202.723 | 0.032 | n/a | 0.000 | 0.000 | 0.703 | 201.768 | 0.015 | n/a | 0.141 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-62/journal/page | none observed |
| 08aa1133fc942618000000000000000f | 202.236 | 0.045 | n/a | 0.000 | 0.000 | 1.042 | 200.873 | 0.014 | n/a | 0.161 | 0.000 | n/a | n/a | 0.101 | 0.045 | 0.000 | 0.101 | gw-r/thread-63/journal/page | none observed |
| 08aa1133fc9426180000000000000010 | 201.867 | 0.031 | n/a | 0.000 | 0.000 | 0.768 | 200.843 | 0.012 | n/a | 0.139 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-65/journal/page | none observed |
| 08aa1133fc942618000000000000000a | 117.635 | 0.136 | n/a | 0.000 | 0.000 | 1.063 | 101.146 | 14.998 | n/a | 0.120 | 0.000 | n/a | n/a | 0.173 | 0.136 | 0.001 | 0.173 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.351 | n/a | n/a | n/a | 0.033 | n/a | 0.000 | 0.000 | 1.365 | 201.309 | 0.025 | n/a | 0.187 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 |
| p99 | 206.529 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 3.281 | 205.354 | 1.035 | n/a | 0.652 | 0.000 | n/a | n/a | 0.135 | 0.048 | 0.001 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08aa1133fc9426180000000000000013 | 206.529 | 0.033 | n/a | 0.000 | 0.000 | 0.860 | 205.354 | 0.025 | n/a | 0.187 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-43/journal/page | none observed |
| 08aa1133fc9426180000000000000014 | 204.290 | 0.048 | n/a | 0.000 | 0.000 | 2.990 | 200.962 | 0.014 | n/a | 0.142 | 0.000 | n/a | n/a | 0.135 | 0.048 | 0.000 | 0.135 | gw-r/thread-62/journal/page | none observed |
| 08aa1133fc9426180000000000000015 | 203.351 | 0.031 | n/a | 0.000 | 0.000 | 1.028 | 201.531 | 0.044 | n/a | 0.652 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-64/journal/page | none observed |
| 08aa1133fc9426180000000000000016 | 202.992 | 0.031 | n/a | 0.000 | 0.000 | 1.365 | 201.309 | 0.017 | n/a | 0.197 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-63/journal/page | none observed |
| 08aa1133fc9426180000000000000017 | 57.700 | 0.042 | n/a | 0.000 | 0.000 | 3.281 | 53.247 | 1.035 | n/a | 0.037 | 0.000 | n/a | n/a | 0.059 | 0.042 | 0.001 | 0.059 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / read (826 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.254 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.623 | 200.568 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.072 | 0.041 | 0.000 | 0.072 |
| p99 | 206.971 | n/a | n/a | n/a | 0.105 | n/a | 0.000 | 0.000 | 4.434 | 204.624 | 3.095 | n/a | 0.239 | 0.000 | n/a | n/a | 0.216 | 0.105 | 0.001 | 0.216 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08aa1133fc94261800000000000001ee | 231.107 | 0.037 | n/a | 0.000 | 0.000 | 22.219 | 208.714 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.079 | 0.037 | 0.000 | 0.079 | gw-r/thread-66/journal/page | none observed |
| 08aa1133fc9426180000000000000168 | 216.260 | 0.039 | n/a | 0.000 | 0.000 | 12.798 | 203.285 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.065 | 0.039 | 0.000 | 0.065 | gw-r/thread-63/journal/page | none observed |
| 08aa1133fc94261800000000000001f0 | 211.829 | 0.073 | n/a | 0.000 | 0.000 | 10.673 | 200.771 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.239 | 0.073 | 0.000 | 0.239 | gw-r/thread-63/journal/page | none observed |
| 08aa1133fc9426180000000000000234 | 211.027 | 0.037 | n/a | 0.000 | 0.000 | 0.442 | 210.426 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 08aa1133fc9426180000000000000058 | 209.315 | 0.031 | n/a | 0.000 | 0.000 | 8.246 | 200.857 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 08aa1133fc94261800000000000000e8 | 209.054 | 0.030 | n/a | 0.000 | 0.000 | 0.547 | 208.190 | 0.025 | n/a | 0.196 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-73/journal/page | none observed |
| 08aa1133fc9426180000000000000235 | 208.768 | 0.061 | n/a | 0.000 | 0.000 | 4.434 | 204.109 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.095 | 0.061 | 0.000 | 0.095 | gw-r/thread-72/journal/page | none observed |
| 08aa1133fc9426180000000000000026 | 207.306 | 0.058 | n/a | 0.000 | 0.000 | 0.959 | 205.875 | 0.038 | n/a | 0.208 | 0.000 | n/a | n/a | 0.167 | 0.058 | 0.000 | 0.167 | gw-r/thread-68/journal/page | none observed |
| 08aa1133fc9426180000000000000060 | 206.971 | 0.033 | n/a | 0.000 | 0.000 | 3.979 | 202.706 | 0.021 | n/a | 0.164 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-43/journal/page | none observed |
| 08aa1133fc9426180000000000000178 | 206.877 | 0.059 | n/a | 0.000 | 0.000 | 1.020 | 205.530 | 0.043 | n/a | 0.110 | 0.000 | n/a | n/a | 0.116 | 0.059 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 08aa1133fc9426180000000000000224 | 206.652 | 0.042 | n/a | 0.000 | 0.000 | 4.910 | 201.482 | 0.013 | n/a | 0.120 | 0.000 | n/a | n/a | 0.086 | 0.042 | 0.000 | 0.086 | gw-r/thread-63/journal/page | none observed |
| 08aa1133fc9426180000000000000065 | 206.285 | 0.057 | n/a | 0.000 | 0.000 | 1.097 | 204.861 | 0.021 | n/a | 0.163 | 0.000 | n/a | n/a | 0.086 | 0.057 | 0.000 | 0.086 | gw-r/thread-68/journal/page | none observed |
| 08aa1133fc94261800000000000000c2 | 206.183 | 0.048 | n/a | 0.000 | 0.000 | 3.617 | 202.287 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 0.132 | 0.048 | 0.000 | 0.132 | gw-r/thread-69/journal/page | none observed |
| 08aa1133fc94261800000000000000e6 | 205.977 | 0.049 | n/a | 0.000 | 0.000 | 1.132 | 204.624 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.063 | 0.049 | 0.000 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 08aa1133fc942618000000000000012b | 205.827 | 0.025 | n/a | 0.000 | 0.000 | 0.919 | 204.642 | 0.036 | n/a | 0.144 | 0.000 | n/a | n/a | 0.060 | 0.025 | 0.000 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 08aa1133fc94261800000000000000ce | 205.607 | 0.049 | n/a | 0.000 | 0.000 | 4.335 | 200.949 | 0.024 | n/a | 0.123 | 0.000 | n/a | n/a | 0.126 | 0.049 | 0.000 | 0.126 | gw-r/thread-61/journal/page | none observed |
| 08aa1133fc9426180000000000000186 | 205.565 | 0.034 | n/a | 0.000 | 0.000 | 0.592 | 204.743 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.094 | 0.034 | 0.000 | 0.094 | gw-r/thread-72/journal/page | none observed |
| 08aa1133fc94261800000000000000f0 | 205.547 | 0.057 | n/a | 0.000 | 0.000 | 0.873 | 204.349 | 0.011 | n/a | 0.118 | 0.000 | n/a | n/a | 0.140 | 0.057 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| 08aa1133fc942618000000000000014d | 205.465 | 0.062 | n/a | 0.000 | 0.000 | 4.280 | 200.880 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.154 | 0.062 | 0.000 | 0.154 | gw-r/thread-71/journal/page | none observed |
| 08aa1133fc94261800000000000001aa | 205.428 | 0.052 | n/a | 0.000 | 0.000 | 4.557 | 200.659 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.099 | 0.052 | 0.000 | 0.099 | gw-r/thread-65/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

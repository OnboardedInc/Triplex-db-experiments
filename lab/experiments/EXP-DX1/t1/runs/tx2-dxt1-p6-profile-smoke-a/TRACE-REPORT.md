# Trace report

The slowest observed commits spent their largest exclusive interval in `node-13/thread-0/driver.queue.subject` (97.215 ms, trace `208037e2d975faa000000000000008de`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (110.438 ms, trace `208037e2d975faa0000000000000005c`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (103.784 ms, trace `208037e2d975faa0000000000000005b`); `node-13/thread-0/driver.queue.subject` (80.095 ms, trace `208037e2d975faa000000000000008cb`); `node-13/thread-0/driver.queue.subject` (116.898 ms, trace `208037e2d975faa000000000000008d3`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-profile-smoke-a`; source `cc62564266eec40d6d486510e3399a08e0a76ed8`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 32715172.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 230 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1281.816 | 164.861 | 34.082 | 52 |
| L1 | 1 | 1975.305 | 135.394 | 23.167 | 64 |
| L4 | 4 | 1977.022 | 288.214 | 50.986 | 64 |
| L16 | 16 | 1930.922 | 251.825 | 57.450 | 44 |
| tail | 0 | 191264.358 | 19377.682 | 2206.314 | 73549 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 208037e2d975faa000000000000008de | driver.queue.subject | 97.215 | 208037e2d975faa000000000000008d3 | 4 / 32 |
| 208037e2d975faa000000000000008de | driver.queue.scheduler-late | 4.578 | none | 4 / 32 |
| 208037e2d975faa000000000000008de | driver.queue.scheduler-dispatch | 0.129 | none | 4 / 32 |

Observed active steps while trace 208037e2d975faa000000000000008de waited: [{"at":1794656976743.4812,"inFlight":4,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008c9","step":"client.http"},{"traceId":"208037e2d975faa000000000000008cc","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d7","step":"client.http"},{"traceId":"208037e2d975faa000000000000008dc","step":"client.http"}]},{"at":1794656976780.5566,"inFlight":5,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008d7","step":"client.http"},{"traceId":"208037e2d975faa000000000000008dc","step":"client.http"},{"traceId":"208037e2d975faa000000000000008cb","step":"client.http"},{"traceId":"208037e2d975faa000000000000008e0","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d6","step":"client.http"}]},{"at":1794656976803.752,"inFlight":4,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008cb","step":"client.http"},{"traceId":"208037e2d975faa000000000000008e0","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d6","step":"client.http"},{"traceId":"208037e2d975faa000000000000008e2","step":"client.http"}]},{"at":1794656976830.6597,"inFlight":4,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008e2","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d3","step":"client.http"},{"traceId":"208037e2d975faa000000000000008dd","step":"client.http"},{"traceId":"208037e2d975faa000000000000008e9","step":"rpc.probe.transact"}]}]

| 208037e2d975faa0000000000000005c | driver.queue.scheduler-dispatch | 0.109 | none | 1 / 32 |
| 208037e2d975faa0000000000000005c | driver.queue.scheduler-late | 0.004 | none | 1 / 32 |

Observed active steps while trace 208037e2d975faa0000000000000005c waited: []

| 208037e2d975faa0000000000000005b | driver.queue.scheduler-late | 0.304 | none | 0 / 32 |
| 208037e2d975faa0000000000000005b | driver.queue.scheduler-dispatch | 0.145 | none | 0 / 32 |

Observed active steps while trace 208037e2d975faa0000000000000005b waited: []

| 208037e2d975faa000000000000008cb | driver.queue.subject | 80.095 | 208037e2d975faa000000000000008c9 | 5 / 32 |
| 208037e2d975faa000000000000008cb | driver.queue.scheduler-late | 4.068 | none | 5 / 32 |
| 208037e2d975faa000000000000008cb | driver.queue.scheduler-dispatch | 0.935 | none | 3 / 32 |

Observed active steps while trace 208037e2d975faa000000000000008cb waited: [{"at":1794656976683.4114,"inFlight":5,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008c5","step":"client.http"},{"traceId":"208037e2d975faa000000000000008c6","step":"client.http"},{"traceId":"208037e2d975faa000000000000008c0","step":"client.http"},{"traceId":"208037e2d975faa000000000000008c8","step":"client.http"},{"traceId":"208037e2d975faa000000000000008ce","step":"client.http"}]},{"at":1794656976703.526,"inFlight":4,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008c8","step":"client.http"},{"traceId":"208037e2d975faa000000000000008ce","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d4","step":"client.http"},{"traceId":"208037e2d975faa000000000000008c9","step":"client.http"}]},{"at":1794656976723.5815,"inFlight":3,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008c9","step":"client.http"},{"traceId":"208037e2d975faa000000000000008cc","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d7","step":"client.http"}]},{"at":1794656976743.4812,"inFlight":4,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008c9","step":"client.http"},{"traceId":"208037e2d975faa000000000000008cc","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d7","step":"client.http"},{"traceId":"208037e2d975faa000000000000008dc","step":"client.http"}]}]

| 208037e2d975faa000000000000008d3 | driver.queue.subject | 116.898 | 208037e2d975faa000000000000008cb | 3 / 32 |
| 208037e2d975faa000000000000008d3 | driver.queue.scheduler-late | 2.199 | none | 3 / 32 |
| 208037e2d975faa000000000000008d3 | driver.queue.scheduler-dispatch | 0.231 | none | 3 / 32 |

Observed active steps while trace 208037e2d975faa000000000000008d3 waited: [{"at":1794656976703.526,"inFlight":4,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008c8","step":"client.http"},{"traceId":"208037e2d975faa000000000000008ce","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d4","step":"client.http"},{"traceId":"208037e2d975faa000000000000008c9","step":"client.http"}]},{"at":1794656976723.5815,"inFlight":3,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008c9","step":"client.http"},{"traceId":"208037e2d975faa000000000000008cc","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d7","step":"client.http"}]},{"at":1794656976743.4812,"inFlight":4,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008c9","step":"client.http"},{"traceId":"208037e2d975faa000000000000008cc","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d7","step":"client.http"},{"traceId":"208037e2d975faa000000000000008dc","step":"client.http"}]},{"at":1794656976780.5566,"inFlight":5,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008d7","step":"client.http"},{"traceId":"208037e2d975faa000000000000008dc","step":"client.http"},{"traceId":"208037e2d975faa000000000000008cb","step":"client.http"},{"traceId":"208037e2d975faa000000000000008e0","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d6","step":"client.http"}]},{"at":1794656976803.752,"inFlight":4,"capacity":32,"active":[{"traceId":"208037e2d975faa000000000000008cb","step":"client.http"},{"traceId":"208037e2d975faa000000000000008e0","step":"client.http"},{"traceId":"208037e2d975faa000000000000008d6","step":"client.http"},{"traceId":"208037e2d975faa000000000000008e2","step":"client.http"}]}]

## Writer stacks during late scheduler offers

Sample points are verified against two guest boot-clock brackets. Counts are samples, not continuous CPU time. Gaps over 3 ms are unknown execution state; they are not charged to the sampled function.

| trace | phase | late ms | samples | top sampled functions | long gaps |
| --- | --- | ---: | ---: | --- | ---: |
| 208037e2d975faa000000000000019d0 | tail | 24.660 | 12 | persistCaptured (6); (garbage collector) (2); encode (1); runMicrotasks (1); encodeTyped (1); emit (1) | 1 |
| 208037e2d975faa000000000000008fc | tail | 20.489 | 19 | persistCaptured (3); randomFillSync (2); (anonymous) (2); writev (2); makePrimitiveProto (1); invalidValue (1); Socket.connect (1); decodeValueColumns (1) | 0 |

## P2 / warmup / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.381 | 1.876 | 0.000 | 1.242 | 14.727 | n/a | 0.000 | 0.308 | 1.772 | 12.665 | 0.047 | 0.000 | 0.718 | 19.073 | 2.468 | n/a | 0.099 | 16.243 | 0.283 | 0.099 |
| p99 | 74.538 | 2.248 | 0.204 | 3.086 | 26.098 | n/a | 0.000 | 1.515 | 10.347 | 13.618 | 0.414 | 0.000 | 2.258 | 20.921 | 5.065 | n/a | 0.283 | 26.964 | 0.362 | 0.283 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa0000000000000003c | 74.538 | 26.098 | 0.720 | 0.000 | 0.146 | 10.347 | 12.665 | 0.414 | 0.000 | 0.718 | 20.921 | 2.468 | n/a | 0.041 | 26.964 | 0.362 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa00000000000000038 | 57.381 | 14.727 | n/a | 0.000 | 1.515 | 1.447 | 13.618 | 0.043 | 0.000 | 2.258 | 18.425 | 5.065 | n/a | 0.283 | 16.243 | 0.283 | 0.283 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa0000000000000003d | 31.855 | 3.598 | n/a | 0.000 | 0.308 | 1.772 | 5.437 | 0.047 | 0.000 | 0.335 | 19.073 | 1.186 | n/a | 0.099 | 3.906 | 0.123 | 0.099 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (209 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 105.021 | n/a | n/a | n/a | 39.023 | 23.072 | 2.347 | 0.000 | 11.198 | 3.548 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.009 | 72.759 | 0.861 | 0.009 |
| p99 | 979.064 | n/a | n/a | n/a | 135.329 | 901.220 | 24.346 | 0.000 | 199.054 | 30.833 | 39.009 | 13.606 | 0.040 | 0.000 | n/a | n/a | 0.107 | 931.573 | 1.000 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa00000000000001a0a | 1034.426 | 53.989 | 901.220 | 3.589 | 0.000 | 47.076 | 20.253 | 8.281 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.010 | 958.797 | 0.927 | 0.010 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.300ms; driver.publication.persist-deferred 2.218ms; driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms |
| 208037e2d975faa00000000000001a1f | 998.137 | 23.885 | 958.961 | 2.234 | 0.000 | 9.594 | 3.438 | 0.004 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.008 | 985.080 | 0.987 | 0.008 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms; driver.publication.persist-deferred 1.831ms |
| 208037e2d975faa00000000000001a2d | 979.064 | 56.329 | 862.774 | 6.762 | 0.000 | 45.596 | 7.536 | 0.005 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.046 | 925.865 | 0.946 | 0.046 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.722ms; driver.publication.persist-deferred 2.652ms; driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms |
| 208037e2d975faa00000000000001a20 | 966.443 | 22.097 | 834.854 | 0.000 | 0.000 | 88.354 | 5.989 | 15.092 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.034 | 856.951 | 0.887 | 0.034 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms; driver.publication.persist-deferred 1.831ms; driver.publication.persist-deferred 1.813ms |
| 208037e2d975faa00000000000001a2a | 957.190 | 21.094 | 910.479 | 0.000 | 0.000 | 19.018 | 6.567 | 0.006 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.007 | 931.573 | 0.973 | 0.007 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.652ms; driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms; driver.publication.persist-deferred 1.831ms |
| 208037e2d975faa00000000000001a01 | 955.855 | 32.953 | 757.934 | 1.533 | 0.000 | 162.128 | 1.292 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.006 | 792.419 | 0.829 | 0.006 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.300ms; driver.publication.persist-deferred 2.218ms; driver.publication.persist-deferred 2.201ms; driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 2.182ms |
| 208037e2d975faa00000000000001a32 | 944.749 | 16.691 | 874.813 | 0.000 | 0.000 | 52.345 | 0.880 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.008 | 891.503 | 0.944 | 0.008 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.722ms; driver.publication.persist-deferred 2.652ms; driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms |
| 208037e2d975faa00000000000001a0b | 924.551 | 17.732 | 818.825 | 0.000 | 0.000 | 86.713 | 1.249 | 0.007 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.015 | 836.557 | 0.905 | 0.015 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.300ms; driver.publication.persist-deferred 2.218ms; driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms |
| 208037e2d975faa00000000000001a39 | 911.561 | 31.801 | 871.030 | 1.475 | 0.000 | 5.160 | 2.065 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.019 | 904.305 | 0.992 | 0.019 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.722ms; driver.publication.persist-deferred 2.652ms; driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms |
| 208037e2d975faa000000000000019f3 | 893.718 | 14.545 | 693.201 | 0.000 | 0.000 | 184.108 | 1.833 | 0.008 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.014 | 707.746 | 0.792 | 0.014 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.300ms; driver.publication.persist-deferred 2.218ms; driver.publication.persist-deferred 2.201ms; driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 2.177ms |
| 208037e2d975faa00000000000001a03 | 871.720 | 39.841 | 670.109 | 1.533 | 0.000 | 157.309 | 2.900 | 0.008 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.007 | 711.482 | 0.816 | 0.007 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.300ms; driver.publication.persist-deferred 2.218ms; driver.publication.persist-deferred 2.201ms; driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 2.177ms |
| 208037e2d975faa00000000000001a40 | 858.007 | 32.134 | 814.889 | 1.708 | 0.000 | 7.705 | 1.543 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.015 | 848.731 | 0.989 | 0.015 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.722ms; driver.publication.persist-deferred 2.652ms; driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms |
| 208037e2d975faa000000000000019f6 | 801.968 | 159.355 | 447.873 | 12.054 | 0.000 | 162.764 | 19.874 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.016 | 619.281 | 0.772 | 0.016 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.300ms; driver.publication.persist-deferred 2.218ms; driver.publication.persist-deferred 2.201ms; driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 2.177ms |
| 208037e2d975faa000000000000019ed | 736.420 | 53.168 | 516.776 | 5.533 | 0.000 | 155.978 | 4.945 | 0.004 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.010 | 575.477 | 0.781 | 0.010 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.381ms; driver.publication.persist-deferred 3.319ms; driver.publication.persist-deferred 2.300ms; driver.publication.persist-deferred 2.218ms; driver.publication.persist-deferred 2.201ms |
| 208037e2d975faa00000000000001a26 | 716.449 | 54.836 | 625.781 | 7.707 | 0.000 | 23.012 | 5.079 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.010 | 688.324 | 0.961 | 0.010 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms; driver.publication.persist-deferred 1.831ms; driver.publication.persist-deferred 1.797ms; driver.publication.persist-deferred 1.794ms |
| 208037e2d975faa00000000000001a30 | 706.103 | 58.012 | 608.137 | 5.938 | 0.000 | 28.901 | 5.092 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.008 | 672.087 | 0.952 | 0.008 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms; driver.publication.persist-deferred 1.831ms; driver.publication.persist-deferred 1.813ms |
| 208037e2d975faa00000000000001a3e | 693.289 | 85.376 | 575.764 | 6.713 | 0.000 | 7.568 | 17.845 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.007 | 667.854 | 0.963 | 0.007 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.182ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms; driver.publication.persist-deferred 1.831ms; driver.publication.persist-deferred 1.813ms |
| 208037e2d975faa00000000000001a1d | 676.850 | 61.441 | 536.955 | 6.052 | 0.000 | 67.425 | 4.952 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.010 | 604.448 | 0.893 | 0.010 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 2.177ms; driver.publication.persist-deferred 2.053ms; driver.publication.persist-deferred 1.831ms; driver.publication.persist-deferred 1.797ms |
| 208037e2d975faa00000000000001a07 | 626.744 | 36.027 | 496.497 | 1.533 | 0.000 | 83.166 | 9.499 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.007 | 534.057 | 0.852 | 0.007 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.300ms; driver.publication.persist-deferred 2.218ms; driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 2.053ms; driver.publication.persist-deferred 1.831ms |
| 208037e2d975faa000000000000019d8 | 620.326 | 63.949 | 344.575 | 8.936 | 0.000 | 160.846 | 21.021 | 0.006 | 20.922 | 0.018 | 0.000 | n/a | n/a | 0.053 | 417.460 | 0.673 | 0.053 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.381ms; driver.publication.persist-deferred 3.319ms; driver.expected-state.bind-receipt 2.802ms; driver.publication.persist-deferred 2.698ms; driver.publication.persist-deferred 2.632ms |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.855 | 1.876 | 0.000 | 1.242 | 3.598 | n/a | 0.000 | 0.308 | 1.772 | 5.437 | 0.047 | 0.000 | 0.335 | 19.073 | 1.186 | n/a | 0.099 | 3.906 | 0.123 | 0.099 |
| p99 | 31.855 | 1.876 | 0.000 | 1.242 | 3.598 | n/a | 0.000 | 0.308 | 1.772 | 5.437 | 0.047 | 0.000 | 0.335 | 19.073 | 1.186 | n/a | 0.099 | 3.906 | 0.123 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa0000000000000003d | 31.855 | 3.598 | n/a | 0.000 | 0.308 | 1.772 | 5.437 | 0.047 | 0.000 | 0.335 | 19.073 | 1.186 | n/a | 0.099 | 3.906 | 0.123 | 0.099 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.741 | 0.228 | 0.000 | 0.574 | 6.599 | 0.342 | 0.000 | 0.118 | 1.949 | 3.294 | 0.047 | 0.000 | 0.195 | 11.883 | 1.262 | n/a | 0.050 | 7.060 | 0.274 | 0.050 |
| p99 | 25.741 | 0.228 | 0.000 | 0.574 | 6.599 | 0.342 | 0.000 | 0.118 | 1.949 | 3.294 | 0.047 | 0.000 | 0.195 | 11.883 | 1.262 | n/a | 0.050 | 7.060 | 0.274 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa00000000000000040 | 25.741 | 6.599 | 0.342 | 0.000 | 0.118 | 1.949 | 3.294 | 0.047 | 0.000 | 0.195 | 11.883 | 1.262 | n/a | 0.050 | 7.060 | 0.274 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.849 | 0.892 | 0.000 | 0.805 | 3.269 | 0.238 | 0.000 | 0.095 | 0.980 | 2.634 | 0.039 | 0.000 | 0.277 | 14.965 | 0.634 | n/a | 0.037 | 3.819 | 0.160 | 0.037 |
| p99 | 40.523 | 1.329 | 0.383 | 1.326 | 8.597 | n/a | 0.000 | 0.619 | 3.166 | 8.742 | 0.095 | 0.000 | 0.632 | 22.680 | 1.363 | n/a | 0.146 | 8.905 | 0.233 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa00000000000000049 | 40.523 | 5.329 | 0.229 | 0.000 | 0.095 | 3.166 | 7.807 | 0.095 | 0.000 | 0.277 | 22.680 | 0.802 | n/a | 0.043 | 5.653 | 0.139 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa00000000000000044 | 38.155 | 8.597 | 0.238 | 0.000 | 0.071 | 3.035 | 8.742 | 0.078 | 0.000 | 0.596 | 16.143 | 0.631 | n/a | 0.025 | 8.905 | 0.233 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa00000000000000047 | 23.849 | 3.269 | n/a | 0.000 | 0.550 | 0.980 | 2.634 | 0.039 | 0.000 | 0.632 | 14.965 | 0.634 | n/a | 0.146 | 3.819 | 0.160 | 0.146 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa00000000000000041 | 19.415 | 2.856 | n/a | 0.000 | 0.619 | 0.858 | 1.932 | 0.023 | 0.000 | 0.155 | 11.572 | 1.363 | n/a | 0.037 | 3.475 | 0.179 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.415 | 0.130 | 0.000 | 0.805 | 2.856 | n/a | 0.000 | 0.550 | 0.858 | 1.932 | 0.023 | 0.000 | 0.155 | 11.572 | 0.634 | n/a | 0.037 | 3.475 | 0.160 | 0.037 |
| p99 | 23.849 | 1.329 | 0.383 | 1.326 | 3.269 | n/a | 0.000 | 0.619 | 0.980 | 2.634 | 0.039 | 0.000 | 0.632 | 14.965 | 1.363 | n/a | 0.146 | 3.819 | 0.179 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa00000000000000047 | 23.849 | 3.269 | n/a | 0.000 | 0.550 | 0.980 | 2.634 | 0.039 | 0.000 | 0.632 | 14.965 | 0.634 | n/a | 0.146 | 3.819 | 0.160 | 0.146 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa00000000000000041 | 19.415 | 2.856 | n/a | 0.000 | 0.619 | 0.858 | 1.932 | 0.023 | 0.000 | 0.155 | 11.572 | 1.363 | n/a | 0.037 | 3.475 | 0.179 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.994 | 0.154 | 0.000 | 0.414 | 4.267 | 0.816 | 0.000 | 0.130 | 0.860 | 5.581 | 0.049 | 0.000 | 0.536 | 17.806 | 1.997 | n/a | 0.031 | 4.960 | 0.158 | 0.031 |
| p99 | 69.690 | 1.114 | 0.000 | 1.143 | 8.274 | n/a | 0.000 | 0.900 | 2.399 | 7.077 | 0.077 | 0.000 | 2.652 | 46.359 | 9.703 | n/a | 0.037 | 9.210 | 0.241 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa00000000000000052 | 69.690 | 4.963 | 0.197 | 0.000 | 0.130 | 2.399 | 5.581 | 0.049 | 0.000 | 2.652 | 46.359 | 7.331 | n/a | 0.030 | 5.289 | 0.076 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa0000000000000004d | 38.213 | 8.274 | 0.816 | 0.000 | 0.120 | 2.274 | 7.077 | 0.077 | 0.000 | 0.536 | 17.806 | 1.196 | n/a | 0.037 | 9.210 | 0.241 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa00000000000000050 | 29.994 | 4.267 | n/a | 0.000 | 0.694 | 0.721 | 2.372 | 0.021 | 0.000 | 0.124 | 19.762 | 1.997 | n/a | 0.037 | 4.960 | 0.165 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa0000000000000004a | 28.449 | 3.600 | n/a | 0.000 | 0.900 | 0.860 | 5.668 | 0.069 | 0.000 | 1.234 | 6.383 | 9.703 | n/a | 0.031 | 4.500 | 0.158 | 0.031 | tx/thread-87/transactor.triplex-function | none observed |

## P2 / L16 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.801 | 0.283 | 0.000 | 0.422 | 5.114 | 0.216 | 0.000 | 0.094 | 2.125 | 3.409 | 0.043 | 0.000 | 0.825 | 17.531 | 0.649 | n/a | 0.049 | 5.961 | 0.220 | 0.049 |
| p99 | 49.405 | 0.362 | 0.014 | 0.681 | 10.671 | n/a | 0.537 | 0.286 | 5.524 | 4.986 | 0.053 | 0.000 | 3.927 | 28.985 | 1.529 | n/a | 0.052 | 10.891 | 0.258 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa00000000000000056 | 49.405 | 10.671 | 0.158 | 0.000 | 0.063 | 2.125 | 4.986 | 0.043 | 0.000 | 0.825 | 28.985 | 1.529 | n/a | 0.021 | 10.891 | 0.220 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa00000000000000053 | 28.801 | 3.832 | n/a | 0.000 | 0.286 | 1.110 | 1.392 | 0.021 | 0.000 | 3.927 | 17.531 | 0.649 | n/a | 0.052 | 4.118 | 0.143 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa00000000000000059 | 23.084 | 5.114 | 0.216 | 0.537 | 0.094 | 5.524 | 3.409 | 0.053 | 0.000 | 0.231 | 7.233 | 0.624 | n/a | 0.049 | 5.961 | 0.258 | 0.049 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3696 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.286 | 0.558 | 0.000 | 0.604 | 2.780 | n/a | 0.000 | 0.785 | 0.849 | 1.250 | 0.016 | 0.000 | 0.126 | 5.920 | 0.732 | n/a | 0.020 | 4.061 | 0.281 | 0.020 |
| p99 | 76.080 | 2.543 | 0.490 | 2.700 | 10.152 | n/a | 0.450 | 33.292 | 14.065 | 9.042 | 0.093 | 0.000 | 3.612 | 35.261 | 10.292 | n/a | 0.086 | 38.428 | 0.750 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa000000000000008de | 174.236 | 5.229 | n/a | 0.000 | 101.921 | 26.974 | 1.632 | 0.028 | 0.000 | 2.092 | 25.032 | 11.302 | n/a | 0.026 | 107.151 | 0.615 | 0.026 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.698ms; driver.publication.persist-deferred 3.029ms; driver.publication.persist-deferred 1.763ms; driver.publication.persist-deferred 1.644ms; driver.publication.persist-deferred 1.545ms |
| 208037e2d975faa0000000000000005c | 164.510 | 7.574 | 0.263 | 0.000 | 0.113 | 2.597 | 18.923 | 0.059 | 0.000 | 2.503 | 110.438 | 22.000 | n/a | 0.039 | 7.950 | 0.048 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.402ms |
| 208037e2d975faa0000000000000005b | 153.389 | 3.984 | n/a | 0.000 | 0.449 | 1.433 | 12.418 | 0.120 | 0.000 | 0.388 | 103.784 | 30.770 | n/a | 0.042 | 4.433 | 0.029 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa000000000000008cb | 147.762 | 11.458 | n/a | 0.000 | 85.098 | 1.471 | 2.654 | 0.051 | 0.000 | 4.762 | 39.381 | 2.824 | n/a | 0.063 | 96.556 | 0.653 | 0.063 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.698ms; driver.publication.persist-deferred 3.029ms; driver.publication.persist-deferred 1.678ms; driver.publication.persist-deferred 1.472ms; driver.publication.persist-deferred 1.431ms |
| 208037e2d975faa000000000000008d3 | 144.933 | 4.888 | n/a | 0.000 | 119.328 | 2.988 | 2.416 | 0.030 | 0.000 | 0.836 | 13.917 | 0.500 | n/a | 0.029 | 124.217 | 0.857 | 0.029 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.698ms; driver.publication.persist-deferred 3.029ms; driver.publication.persist-deferred 1.763ms; driver.publication.persist-deferred 1.545ms; driver.publication.persist-deferred 1.486ms |
| 208037e2d975faa000000000000008dd | 139.230 | 5.987 | n/a | 0.000 | 86.993 | 4.509 | 1.159 | 0.014 | 0.000 | 0.158 | 28.039 | 12.348 | n/a | 0.023 | 92.980 | 0.668 | 0.023 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.698ms; driver.publication.persist-deferred 3.029ms; driver.publication.persist-deferred 1.763ms; driver.publication.persist-deferred 1.545ms; driver.publication.persist-deferred 1.486ms |
| 208037e2d975faa000000000000008d6 | 124.056 | 3.539 | n/a | 0.000 | 74.637 | 9.761 | 1.016 | 0.019 | 0.000 | 0.464 | 33.994 | 0.596 | n/a | 0.030 | 78.176 | 0.630 | 0.030 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.698ms; driver.publication.persist-deferred 3.029ms; driver.publication.persist-deferred 1.486ms; driver.publication.persist-deferred 1.472ms; driver.publication.persist-deferred 1.431ms |
| 208037e2d975faa00000000000000852 | 114.598 | 4.136 | n/a | 0.000 | 52.568 | 2.512 | 1.696 | 0.023 | 0.000 | 0.607 | 49.929 | 3.116 | n/a | 0.011 | 56.704 | 0.495 | 0.011 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 12.597ms; driver.publication.persist-deferred 8.544ms; driver.publication.persist-deferred 5.405ms; driver.publication.persist-deferred 2.085ms; driver.expected-state.bind-receipt 1.507ms |
| 208037e2d975faa000000000000008fc | 110.851 | 2.092 | n/a | 0.000 | 78.321 | 5.906 | 1.646 | 0.024 | 0.000 | 0.105 | 22.361 | 0.376 | n/a | 0.019 | 80.413 | 0.725 | 0.019 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.850ms; driver.expected-state.bind-receipt 2.715ms; driver.expected-state.bind-receipt 2.616ms; driver.publication.persist-deferred 2.460ms; driver.expected-state.bind-receipt 2.397ms |
| 208037e2d975faa000000000000008ac | 107.183 | 5.000 | n/a | 0.000 | 80.873 | 1.399 | 1.464 | 0.034 | 0.000 | 0.804 | 12.745 | 4.845 | n/a | 0.018 | 85.873 | 0.801 | 0.018 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.039ms; driver.publication.persist-deferred 1.917ms; driver.publication.persist-deferred 1.628ms; driver.publication.persist-deferred 1.533ms; driver.publication.persist-deferred 1.487ms |
| 208037e2d975faa000000000000008aa | 106.947 | 1.974 | n/a | 0.000 | 83.809 | 2.668 | 2.584 | 0.015 | 0.000 | 0.888 | 12.381 | 2.562 | n/a | 0.066 | 85.782 | 0.802 | 0.066 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.917ms; driver.publication.persist-deferred 1.628ms; driver.publication.persist-deferred 1.533ms; driver.publication.persist-deferred 1.487ms; driver.publication.persist-deferred 1.273ms |
| 208037e2d975faa00000000000001129 | 106.768 | 2.818 | n/a | 0.000 | 85.506 | 1.175 | 2.011 | 0.050 | 0.000 | 0.122 | 14.042 | 1.031 | n/a | 0.013 | 88.323 | 0.827 | 0.013 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 8.911ms; driver.publication.persist-deferred 3.902ms; driver.publication.persist-deferred 2.832ms; driver.publication.persist-deferred 2.518ms; driver.expected-state.bind-receipt 2.154ms |
| 208037e2d975faa000000000000008a6 | 106.511 | 4.863 | n/a | 0.000 | 63.708 | 3.538 | 2.506 | 0.032 | 0.000 | 0.127 | 25.620 | 6.102 | n/a | 0.014 | 68.572 | 0.644 | 0.014 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.628ms; driver.publication.persist-deferred 1.487ms; driver.publication.persist-deferred 1.378ms; driver.publication.persist-deferred 1.293ms; driver.publication.persist-deferred 1.246ms |
| 208037e2d975faa000000000000008f0 | 102.046 | 8.118 | n/a | 0.000 | 0.169 | 50.417 | 1.884 | 0.014 | 0.000 | 0.486 | 29.705 | 11.230 | n/a | 0.022 | 8.288 | 0.081 | 0.022 | node-13/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 3.850ms; driver.publication.persist-deferred 2.460ms; driver.publication.persist-deferred 1.896ms; driver.publication.persist-deferred 1.644ms; driver.publication.persist-deferred 1.511ms |
| 208037e2d975faa000000000000008f8 | 99.411 | 15.790 | n/a | 0.000 | 5.846 | 24.462 | 4.552 | 0.008 | 0.000 | 3.898 | 37.139 | 7.711 | n/a | 0.005 | 21.636 | 0.218 | 0.005 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.850ms; driver.expected-state.bind-receipt 2.715ms; driver.expected-state.bind-receipt 2.616ms; driver.publication.persist-deferred 2.460ms; driver.publication.persist-deferred 1.949ms |
| 208037e2d975faa0000000000000035a | 98.046 | 1.421 | n/a | 0.000 | 70.193 | 6.390 | 1.155 | 0.014 | 0.000 | 0.078 | 15.585 | 3.201 | n/a | 0.010 | 71.614 | 0.730 | 0.010 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.471ms; driver.publication.persist-deferred 1.427ms; driver.publication.persist-deferred 1.312ms; driver.publication.persist-deferred 1.141ms; driver.publication.persist-deferred 1.129ms |
| 208037e2d975faa000000000000008cc | 96.906 | 5.281 | n/a | 0.000 | 32.201 | 2.715 | 3.180 | 0.014 | 0.000 | 0.133 | 52.639 | 0.714 | n/a | 0.030 | 37.481 | 0.387 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.472ms; driver.publication.persist-deferred 1.431ms; driver.publication.persist-deferred 1.417ms; driver.publication.persist-deferred 1.417ms; driver.publication.persist-deferred 1.393ms |
| 208037e2d975faa000000000000008f6 | 96.361 | 6.843 | n/a | 2.125 | 11.932 | 33.564 | 1.184 | 0.013 | 0.000 | 0.069 | 31.141 | 9.479 | n/a | 0.011 | 20.899 | 0.217 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.850ms; driver.expected-state.bind-receipt 2.616ms; driver.publication.persist-deferred 2.460ms; driver.publication.persist-deferred 1.949ms; driver.publication.persist-deferred 1.896ms |
| 208037e2d975faa000000000000008f7 | 95.521 | 9.141 | n/a | 0.000 | 8.544 | 34.719 | 0.709 | 0.005 | 0.000 | 0.018 | 41.903 | 0.470 | n/a | 0.010 | 17.686 | 0.185 | 0.010 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.850ms; driver.expected-state.bind-receipt 2.715ms; driver.expected-state.bind-receipt 2.616ms; driver.publication.persist-deferred 2.460ms; driver.publication.persist-deferred 1.949ms |
| 208037e2d975faa000000000000008c9 | 93.703 | 3.579 | n/a | 0.000 | 42.661 | 0.927 | 1.026 | 0.011 | 0.000 | 0.267 | 43.449 | 1.770 | n/a | 0.013 | 46.240 | 0.493 | 0.013 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.678ms; driver.publication.persist-deferred 1.472ms; driver.publication.persist-deferred 1.431ms; driver.publication.persist-deferred 1.417ms; driver.publication.persist-deferred 1.417ms |

## P2 / tail / commit / 5-10 facts (2118 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.488 | 0.400 | 0.000 | 0.476 | 2.209 | n/a | 0.000 | 0.828 | 0.801 | 1.064 | 0.015 | 0.000 | 0.126 | 5.480 | 0.547 | n/a | 0.019 | 3.346 | 0.267 | 0.019 |
| p99 | 74.134 | 1.861 | 0.376 | 1.435 | 7.436 | n/a | 0.000 | 35.384 | 15.023 | 5.073 | 0.084 | 0.000 | 3.062 | 35.089 | 6.413 | n/a | 0.089 | 38.428 | 0.754 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 208037e2d975faa000000000000008de | 174.236 | 5.229 | n/a | 0.000 | 101.921 | 26.974 | 1.632 | 0.028 | 0.000 | 2.092 | 25.032 | 11.302 | n/a | 0.026 | 107.151 | 0.615 | 0.026 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.698ms; driver.publication.persist-deferred 3.029ms; driver.publication.persist-deferred 1.763ms; driver.publication.persist-deferred 1.644ms; driver.publication.persist-deferred 1.545ms |
| 208037e2d975faa0000000000000005b | 153.389 | 3.984 | n/a | 0.000 | 0.449 | 1.433 | 12.418 | 0.120 | 0.000 | 0.388 | 103.784 | 30.770 | n/a | 0.042 | 4.433 | 0.029 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 208037e2d975faa000000000000008d3 | 144.933 | 4.888 | n/a | 0.000 | 119.328 | 2.988 | 2.416 | 0.030 | 0.000 | 0.836 | 13.917 | 0.500 | n/a | 0.029 | 124.217 | 0.857 | 0.029 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.698ms; driver.publication.persist-deferred 3.029ms; driver.publication.persist-deferred 1.763ms; driver.publication.persist-deferred 1.545ms; driver.publication.persist-deferred 1.486ms |
| 208037e2d975faa000000000000008d6 | 124.056 | 3.539 | n/a | 0.000 | 74.637 | 9.761 | 1.016 | 0.019 | 0.000 | 0.464 | 33.994 | 0.596 | n/a | 0.030 | 78.176 | 0.630 | 0.030 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.698ms; driver.publication.persist-deferred 3.029ms; driver.publication.persist-deferred 1.486ms; driver.publication.persist-deferred 1.472ms; driver.publication.persist-deferred 1.431ms |
| 208037e2d975faa00000000000000852 | 114.598 | 4.136 | n/a | 0.000 | 52.568 | 2.512 | 1.696 | 0.023 | 0.000 | 0.607 | 49.929 | 3.116 | n/a | 0.011 | 56.704 | 0.495 | 0.011 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 12.597ms; driver.publication.persist-deferred 8.544ms; driver.publication.persist-deferred 5.405ms; driver.publication.persist-deferred 2.085ms; driver.expected-state.bind-receipt 1.507ms |
| 208037e2d975faa000000000000008fc | 110.851 | 2.092 | n/a | 0.000 | 78.321 | 5.906 | 1.646 | 0.024 | 0.000 | 0.105 | 22.361 | 0.376 | n/a | 0.019 | 80.413 | 0.725 | 0.019 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.850ms; driver.expected-state.bind-receipt 2.715ms; driver.expected-state.bind-receipt 2.616ms; driver.publication.persist-deferred 2.460ms; driver.expected-state.bind-receipt 2.397ms |
| 208037e2d975faa000000000000008ac | 107.183 | 5.000 | n/a | 0.000 | 80.873 | 1.399 | 1.464 | 0.034 | 0.000 | 0.804 | 12.745 | 4.845 | n/a | 0.018 | 85.873 | 0.801 | 0.018 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.039ms; driver.publication.persist-deferred 1.917ms; driver.publication.persist-deferred 1.628ms; driver.publication.persist-deferred 1.533ms; driver.publication.persist-deferred 1.487ms |
| 208037e2d975faa000000000000008aa | 106.947 | 1.974 | n/a | 0.000 | 83.809 | 2.668 | 2.584 | 0.015 | 0.000 | 0.888 | 12.381 | 2.562 | n/a | 0.066 | 85.782 | 0.802 | 0.066 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.917ms; driver.publication.persist-deferred 1.628ms; driver.publication.persist-deferred 1.533ms; driver.publication.persist-deferred 1.487ms; driver.publication.persist-deferred 1.273ms |
| 208037e2d975faa00000000000001129 | 106.768 | 2.818 | n/a | 0.000 | 85.506 | 1.175 | 2.011 | 0.050 | 0.000 | 0.122 | 14.042 | 1.031 | n/a | 0.013 | 88.323 | 0.827 | 0.013 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 8.911ms; driver.publication.persist-deferred 3.902ms; driver.publication.persist-deferred 2.832ms; driver.publication.persist-deferred 2.518ms; driver.expected-state.bind-receipt 2.154ms |
| 208037e2d975faa0000000000000035a | 98.046 | 1.421 | n/a | 0.000 | 70.193 | 6.390 | 1.155 | 0.014 | 0.000 | 0.078 | 15.585 | 3.201 | n/a | 0.010 | 71.614 | 0.730 | 0.010 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.471ms; driver.publication.persist-deferred 1.427ms; driver.publication.persist-deferred 1.312ms; driver.publication.persist-deferred 1.141ms; driver.publication.persist-deferred 1.129ms |
| 208037e2d975faa000000000000008cc | 96.906 | 5.281 | n/a | 0.000 | 32.201 | 2.715 | 3.180 | 0.014 | 0.000 | 0.133 | 52.639 | 0.714 | n/a | 0.030 | 37.481 | 0.387 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.472ms; driver.publication.persist-deferred 1.431ms; driver.publication.persist-deferred 1.417ms; driver.publication.persist-deferred 1.417ms; driver.publication.persist-deferred 1.393ms |
| 208037e2d975faa000000000000008f6 | 96.361 | 6.843 | n/a | 2.125 | 11.932 | 33.564 | 1.184 | 0.013 | 0.000 | 0.069 | 31.141 | 9.479 | n/a | 0.011 | 20.899 | 0.217 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.850ms; driver.expected-state.bind-receipt 2.616ms; driver.publication.persist-deferred 2.460ms; driver.publication.persist-deferred 1.949ms; driver.publication.persist-deferred 1.896ms |
| 208037e2d975faa000000000000008f7 | 95.521 | 9.141 | n/a | 0.000 | 8.544 | 34.719 | 0.709 | 0.005 | 0.000 | 0.018 | 41.903 | 0.470 | n/a | 0.010 | 17.686 | 0.185 | 0.010 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.850ms; driver.expected-state.bind-receipt 2.715ms; driver.expected-state.bind-receipt 2.616ms; driver.publication.persist-deferred 2.460ms; driver.publication.persist-deferred 1.949ms |
| 208037e2d975faa000000000000008c9 | 93.703 | 3.579 | n/a | 0.000 | 42.661 | 0.927 | 1.026 | 0.011 | 0.000 | 0.267 | 43.449 | 1.770 | n/a | 0.013 | 46.240 | 0.493 | 0.013 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.678ms; driver.publication.persist-deferred 1.472ms; driver.publication.persist-deferred 1.431ms; driver.publication.persist-deferred 1.417ms; driver.publication.persist-deferred 1.417ms |
| 208037e2d975faa000000000000008c0 | 92.834 | 5.697 | n/a | 0.000 | 40.825 | 4.236 | 7.100 | 0.018 | 0.000 | 0.184 | 31.945 | 2.806 | n/a | 0.022 | 46.522 | 0.501 | 0.022 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.391ms; driver.publication.persist-deferred 1.764ms; driver.publication.persist-deferred 1.678ms; driver.expected-state.bind-receipt 1.570ms; driver.publication.persist-deferred 1.444ms |
| 208037e2d975faa000000000000019bf | 91.212 | 3.534 | n/a | 0.000 | 49.201 | 21.260 | 0.823 | 0.031 | 0.000 | 0.054 | 15.739 | 0.544 | n/a | 0.027 | 52.735 | 0.578 | 0.027 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 10.080ms; driver.publication.persist-deferred 9.153ms; driver.publication.persist-deferred 5.411ms; driver.publication.persist-deferred 3.002ms; driver.publication.persist-deferred 2.447ms |
| 208037e2d975faa000000000000019c1 | 91.105 | 1.990 | n/a | 0.000 | 78.473 | 1.622 | 0.892 | 0.024 | 0.000 | 0.020 | 7.424 | 0.647 | n/a | 0.013 | 80.463 | 0.883 | 0.013 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 10.080ms; driver.publication.persist-deferred 5.411ms; driver.publication.persist-deferred 5.127ms; driver.publication.persist-deferred 3.002ms; driver.publication.persist-deferred 2.313ms |
| 208037e2d975faa000000000000008e5 | 85.539 | 2.900 | n/a | 0.000 | 32.828 | 15.606 | 1.351 | 0.034 | 0.000 | 0.459 | 31.714 | 0.626 | n/a | 0.022 | 35.728 | 0.418 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.763ms; driver.publication.persist-deferred 1.545ms; driver.publication.persist-deferred 1.486ms; driver.publication.persist-deferred 1.484ms; driver.publication.persist-deferred 1.401ms |
| 208037e2d975faa000000000000008fd | 78.259 | 1.412 | n/a | 0.000 | 28.873 | 3.269 | 1.854 | 0.028 | 0.000 | 1.904 | 40.313 | 0.583 | n/a | 0.022 | 30.284 | 0.387 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.850ms; driver.expected-state.bind-receipt 2.715ms; driver.expected-state.bind-receipt 2.616ms; driver.publication.persist-deferred 2.460ms; driver.publication.persist-deferred 1.949ms |
| 208037e2d975faa0000000000000112f | 78.252 | 4.671 | n/a | 0.000 | 64.833 | 1.124 | 1.924 | 0.025 | 0.000 | 0.078 | 4.669 | 0.908 | n/a | 0.020 | 69.504 | 0.888 | 0.020 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 8.911ms; driver.publication.persist-deferred 3.902ms; driver.publication.persist-deferred 2.832ms; driver.publication.persist-deferred 2.705ms; driver.ack-and-subject-state 1.723ms |

## P1 / warmup / read (195 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.031 | n/a | n/a | n/a | 0.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.030 | 0.926 | 0.002 |
| p99 | 305.453 | n/a | n/a | n/a | 52.065 | n/a | 12.596 | 305.207 | 100.597 | 35.220 | 42.415 | 18.908 | 0.058 | 0.000 | n/a | n/a | 0.011 | 305.450 | 1.000 | 0.011 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b88a93cbae3d48f9000000000000008d | 305.503 | 0.292 | n/a | 0.000 | 305.207 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 305.499 | 1.000 | 0.004 | node-13/thread-6/reader.straddle-await-ack | client.reach-decode-and-cache 4.679ms |
| b88a93cbae3d48f9000000000000008e | 305.453 | 0.047 | n/a | 0.000 | 305.403 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 305.450 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | client.reach-decode-and-cache 4.679ms |
| b88a93cbae3d48f900000000000000a0 | 304.270 | 0.067 | n/a | 0.000 | 304.199 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 304.266 | 1.000 | 0.004 | node-13/thread-6/reader.straddle-await-ack | client.reach-decode-and-cache 4.679ms |
| b88a93cbae3d48f900000000000000a1 | 304.236 | 0.029 | n/a | 0.000 | 304.204 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 304.233 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | client.reach-decode-and-cache 4.679ms |
| 8edec715ad4502a10000000000000072 | 303.796 | 0.349 | n/a | 0.000 | 303.442 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 303.791 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 6.018ms |
| 8edec715ad4502a1000000000000008a | 300.131 | 0.124 | n/a | 0.000 | 299.993 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 300.117 | 1.000 | 0.014 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 6.018ms |
| 8edec715ad4502a1000000000000008b | 300.028 | 0.059 | n/a | 0.000 | 299.962 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 300.021 | 1.000 | 0.007 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 6.018ms |
| 8edec715ad4502a1000000000000008c | 300.005 | 0.050 | n/a | 0.000 | 299.949 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 299.999 | 1.000 | 0.007 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 6.018ms |
| 8edec715ad4502a100000000000000a2 | 297.403 | 0.058 | n/a | 0.000 | 297.341 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 297.398 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 6.018ms |
| 8edec715ad4502a1000000000000553d | 280.843 | 0.022 | n/a | 0.000 | 280.818 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 280.839 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000000553f | 280.842 | 0.014 | n/a | 0.000 | 280.827 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.841 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000000553e | 280.837 | 0.016 | n/a | 0.000 | 280.820 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.836 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000000553c | 280.828 | 0.137 | n/a | 0.000 | 280.691 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.827 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000000553b | 280.692 | 0.036 | n/a | 0.000 | 280.654 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.691 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000000553a | 280.634 | 0.142 | n/a | 0.000 | 280.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.632 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f90000000000005ccb | 280.565 | 0.224 | n/a | 0.000 | 280.338 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.562 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f90000000000005ce1 | 280.009 | 0.126 | n/a | 0.000 | 279.881 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.007 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f90000000000005ce2 | 280.003 | 0.023 | n/a | 0.000 | 279.979 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.002 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f90000000000005cdf | 279.912 | 0.051 | n/a | 0.000 | 279.860 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.910 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f90000000000005ce0 | 279.903 | 0.027 | n/a | 0.000 | 279.874 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.901 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1 / read (84 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.933 | 0.001 |
| p99 | 277.829 | n/a | n/a | n/a | 4.124 | n/a | 0.000 | 277.671 | 2.584 | 0.815 | 0.007 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.016 | 277.826 | 1.000 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8edec715ad4502a10000000000019657 | 277.829 | 0.155 | n/a | 0.000 | 277.671 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.826 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 8edec715ad4502a100000000000193b4 | 271.889 | 0.122 | n/a | 0.000 | 271.763 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.885 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000000dfce | 266.841 | 0.340 | n/a | 0.000 | 266.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 266.830 | 1.000 | 0.011 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000000a615 | 7.556 | 4.124 | n/a | 0.000 | 0.000 | 2.584 | 0.815 | 0.007 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.002 | 4.124 | 0.546 | 0.002 | node-13/thread-4/reader.execute | none observed |
| 8edec715ad4502a10000000000013ea2 | 0.818 | 0.816 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.816 | 0.998 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a100000000000101b1 | 0.508 | 0.506 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.506 | 0.997 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a1000000000000ace9 | 0.486 | 0.470 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.470 | 0.967 | 0.016 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a1000000000001010d | 0.479 | 0.475 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.475 | 0.993 | 0.003 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a1000000000000a786 | 0.458 | 0.455 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.455 | 0.995 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a100000000000131a1 | 0.449 | 0.448 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.448 | 0.998 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a1000000000000b3b8 | 0.445 | 0.445 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.445 | 0.998 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a100000000000194b6 | 0.416 | 0.414 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.414 | 0.995 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a10000000000010167 | 0.385 | 0.384 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.384 | 0.995 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a1000000000000b221 | 0.356 | 0.355 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.355 | 0.997 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a10000000000013dd7 | 0.344 | 0.342 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.342 | 0.995 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a100000000000176c7 | 0.318 | 0.317 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.317 | 0.998 | 0.000 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a10000000000014278 | 0.303 | 0.301 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.301 | 0.994 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a1000000000000b559 | 0.299 | 0.298 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.298 | 0.997 | 0.001 | node-13/thread-4/reader.execute | none observed |
| 8edec715ad4502a1000000000000acf3 | 0.293 | 0.291 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.291 | 0.992 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a1000000000000f84f | 0.291 | 0.290 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.290 | 0.996 | 0.001 | node-13/thread-4/replica.pull-at | none observed |

## P1 / L4 / read (241 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.013 | 0.938 | 0.001 |
| p99 | 279.262 | n/a | n/a | n/a | 6.015 | n/a | 0.000 | 279.074 | 1.034 | 0.773 | 0.005 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.682 | 279.259 | 1.000 | 0.682 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08af4fb3291a5ea6000000000001a670 | 279.379 | 0.175 | n/a | 0.000 | 279.201 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.376 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000002c67b | 279.368 | 0.033 | n/a | 0.000 | 279.334 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.367 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000002c67a | 279.262 | 0.185 | n/a | 0.000 | 279.074 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.259 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f9000000000001a50e | 279.169 | 0.136 | n/a | 0.000 | 279.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.167 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f9000000000000b5b4 | 44.441 | 0.517 | n/a | 0.000 | 43.911 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 44.428 | 1.000 | 0.014 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 08af4fb3291a5ea6000000000000b0fa | 43.565 | 0.195 | n/a | 0.000 | 43.367 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 43.563 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 8edec715ad4502a1000000000001965a | 42.330 | 0.113 | n/a | 0.000 | 42.207 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 42.320 | 1.000 | 0.010 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 08af4fb3291a5ea6000000000000b134 | 14.422 | 2.919 | n/a | 0.000 | 0.000 | 1.034 | 10.366 | 0.041 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.004 | 2.919 | 0.202 | 0.004 | gw-r/thread-66/gateway.route | replica.apply-delta 0.100ms |
| b88a93cbae3d48f9000000000000b5bd | 12.874 | 7.791 | n/a | 0.000 | 0.000 | 4.285 | 0.773 | 0.005 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.004 | 7.791 | 0.605 | 0.004 | node-13/thread-6/reader.execute | none observed |
| b88a93cbae3d48f9000000000000b762 | 7.028 | 7.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 7.026 | 1.000 | 0.002 | node-13/thread-6/replica.pull-at | none observed |
| 8edec715ad4502a10000000000019688 | 6.500 | 1.679 | n/a | 0.000 | 0.000 | 2.897 | 1.881 | 0.007 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.001 | 1.679 | 0.258 | 0.001 | node-13/thread-4/socket.wait-first-byte | replica.apply-delta 0.107ms |
| b88a93cbae3d48f9000000000001431f | 6.016 | 6.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 6.015 | 1.000 | 0.001 | node-13/thread-6/replica.pull-at | replica.apply-delta 0.039ms |
| 8edec715ad4502a1000000000001a27f | 3.740 | 3.739 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.739 | 1.000 | 0.001 | node-13/thread-4/reader.execute | none observed |
| b88a93cbae3d48f9000000000000c16d | 3.573 | 0.028 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.545 | 0.028 | 0.008 | 3.545 | uncovered | none observed |
| b88a93cbae3d48f9000000000000b67c | 3.273 | 3.272 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.272 | 1.000 | 0.001 | node-13/thread-6/replica.pull-at | none observed |
| 8edec715ad4502a100000000000263a6 | 3.139 | 3.133 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 3.133 | 0.998 | 0.006 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a10000000000020e1f | 3.135 | 3.132 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.132 | 0.999 | 0.003 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a10000000000019af0 | 2.956 | 2.955 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.955 | 1.000 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| 08af4fb3291a5ea600000000000144dd | 2.909 | 2.905 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.905 | 0.998 | 0.005 | node-13/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| 8edec715ad4502a1000000000002496b | 2.684 | 2.682 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.682 | 0.999 | 0.002 | node-13/thread-4/replica.pull-at | replica.apply-delta 0.032ms |

## P1 / L16 / read (279 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.021 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.023 | 0.951 | 0.001 |
| p99 | 280.297 | n/a | n/a | n/a | 6.102 | n/a | 0.000 | 280.207 | 1.468 | 0.656 | 0.008 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.024 | 280.295 | 1.000 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08af4fb3291a5ea6000000000001bb7e | 280.364 | 0.155 | n/a | 0.000 | 280.207 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.361 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 08af4fb3291a5ea6000000000001bb7f | 280.328 | 0.044 | n/a | 0.000 | 280.282 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.326 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 08af4fb3291a5ea6000000000001bb80 | 280.297 | 0.024 | n/a | 0.000 | 280.271 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.295 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 08af4fb3291a5ea6000000000001bb9a | 279.719 | 0.026 | n/a | 0.000 | 279.692 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.718 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 08af4fb3291a5ea6000000000001bb9b | 279.702 | 0.018 | n/a | 0.000 | 279.682 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.700 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000002dfa2 | 278.730 | 0.014 | n/a | 0.000 | 278.715 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.729 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000002dfa1 | 278.718 | 0.013 | n/a | 0.000 | 278.704 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.717 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000002dfa0 | 278.709 | 0.013 | n/a | 0.000 | 278.695 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.708 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000002df9f | 278.702 | 0.016 | n/a | 0.000 | 278.685 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.701 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000002df9e | 278.690 | 0.022 | n/a | 0.000 | 278.667 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.689 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000002df9d | 278.676 | 0.110 | n/a | 0.000 | 278.563 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.673 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f9000000000001b9e4 | 277.543 | 0.023 | n/a | 0.000 | 277.519 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.542 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f9000000000001b9e3 | 277.531 | 0.014 | n/a | 0.000 | 277.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.530 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f9000000000001b9e2 | 277.513 | 0.015 | n/a | 0.000 | 277.498 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.513 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f9000000000001b9e1 | 277.501 | 0.031 | n/a | 0.000 | 277.470 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.500 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b88a93cbae3d48f9000000000001b9e0 | 277.460 | 0.096 | n/a | 0.000 | 277.362 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.458 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 8edec715ad4502a1000000000002d4cf | 29.911 | 21.972 | n/a | 4.792 | 0.000 | 1.468 | 1.640 | 0.008 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.003 | 26.764 | 0.895 | 0.003 | node-13/thread-4/reader.execute | none observed |
| b88a93cbae3d48f9000000000001ae5c | 16.947 | 5.156 | n/a | 0.000 | 0.000 | 11.104 | 0.656 | 0.008 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.002 | 5.156 | 0.304 | 0.002 | node-13/thread-6/socket.wait-first-byte | none observed |
| 08af4fb3291a5ea6000000000001ada9 | 11.866 | 2.818 | n/a | 0.000 | 0.000 | 7.780 | 1.230 | 0.009 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.002 | 2.818 | 0.237 | 0.002 | node-13/thread-5/socket.wait-first-byte | none observed |
| b88a93cbae3d48f9000000000001ba3f | 6.130 | 6.126 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 6.126 | 0.999 | 0.004 | node-13/thread-6/reader.execute | none observed |

## P1 / tail / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.021 | n/a | n/a | n/a | 0.020 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.020 | 0.961 | 0.002 |
| p99 | 0.060 | n/a | n/a | n/a | 0.058 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.058 | 0.968 | 0.002 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8edec715ad4502a10000000000041d8d | 0.060 | 0.058 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.058 | 0.967 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a10000000000041d8c | 0.051 | 0.049 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.049 | 0.961 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| b88a93cbae3d48f9000000000002f0c3 | 0.030 | 0.029 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.029 | 0.968 | 0.001 | node-13/thread-6/replica.pull-at | none observed |
| 8edec715ad4502a10000000000041d8e | 0.021 | 0.020 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.020 | 0.920 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8edec715ad4502a10000000000041d8f | 0.021 | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.019 | 0.905 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| b88a93cbae3d48f9000000000002f0c2 | 0.020 | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.019 | 0.963 | 0.001 | node-13/thread-6/reader.execute | none observed |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.472 | n/a | n/a | n/a | 0.077 | n/a | 0.000 | 0.000 | 1.162 | 200.739 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.165 | 0.077 | 0.000 | 0.165 |
| p99 | 204.709 | n/a | n/a | n/a | 22.383 | n/a | 1.639 | 0.000 | 4.850 | 203.647 | 0.125 | 12.433 | 0.144 | 0.000 | n/a | n/a | 0.269 | 22.383 | 0.269 | 0.269 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9502eae5266e433c0000000000000f0c | 204.709 | 0.052 | n/a | 0.000 | 0.000 | 0.768 | 203.647 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.193 | 0.052 | 0.000 | 0.193 | gw-r/thread-65/journal/page | none observed |
| 9502eae5266e433c0000000000000006 | 203.698 | 0.130 | n/a | 0.000 | 0.000 | 2.301 | 201.004 | 0.013 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.106 | 0.130 | 0.001 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 9502eae5266e433c0000000000000007 | 202.972 | 0.039 | n/a | 0.000 | 0.000 | 1.477 | 201.123 | 0.016 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.174 | 0.039 | 0.000 | 0.174 | gw-r/thread-46/journal/page | none observed |
| 9502eae5266e433c0000000000000005 | 202.477 | 0.077 | n/a | 0.000 | 0.000 | 1.162 | 200.870 | 0.012 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.242 | 0.077 | 0.000 | 0.242 | gw-r/thread-64/journal/page | none observed |
| 9502eae5266e433c0000000000000f0b | 201.837 | 0.035 | n/a | 0.000 | 0.000 | 0.873 | 200.803 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 9502eae5266e433c0000000000000f0d | 201.472 | 0.035 | n/a | 0.000 | 0.000 | 0.568 | 200.739 | 0.009 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.073 | 0.035 | 0.000 | 0.073 | gw-r/thread-71/journal/page | none observed |
| 9502eae5266e433c0000000000000f0e | 201.100 | 0.030 | n/a | 0.000 | 0.000 | 0.468 | 200.510 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.059 | 0.030 | 0.000 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 9502eae5266e433c0000000000000f11 | 95.167 | 17.260 | n/a | 1.495 | 0.000 | 2.179 | 61.643 | 0.023 | 12.433 | 0.004 | 0.000 | n/a | n/a | 0.131 | 18.754 | 0.197 | 0.131 | gw-r/thread-69/gateway.admitted-work | none observed |
| 9502eae5266e433c0000000000000f12 | 83.190 | 22.383 | n/a | 0.000 | 0.000 | 3.182 | 57.437 | 0.009 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.165 | 22.383 | 0.269 | 0.165 | gw-r/thread-65/gateway.admitted-work | none observed |
| 9502eae5266e433c0000000000000f13 | 72.689 | 16.411 | n/a | 1.639 | 0.000 | 4.850 | 41.595 | 0.003 | 8.017 | 0.004 | 0.000 | n/a | n/a | 0.168 | 18.050 | 0.248 | 0.168 | gw-r/thread-52/gateway.admitted-work | none observed |
| 4a25876327cca9ea0000000000000002 | 54.398 | 0.176 | n/a | 0.000 | 0.000 | 1.033 | 52.716 | 0.125 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.269 | 0.176 | 0.003 | 0.269 | gw-r/thread-48/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1005.461 | n/a | n/a | n/a | 0.132 | n/a | 0.000 | 0.000 | 3.218 | 1001.219 | 0.015 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.336 | 0.132 | 0.000 | 0.336 |
| p99 | 1007.851 | n/a | n/a | n/a | 31.442 | n/a | 9.049 | 0.000 | 3.765 | 1002.179 | 0.815 | 0.000 | 0.326 | 0.000 | n/a | n/a | 1.503 | 40.492 | 0.089 | 1.503 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4a25876327cca9ea0000000000000018 | 1007.851 | 0.130 | n/a | 0.000 | 0.000 | 3.726 | 1002.179 | 0.029 | 0.000 | 0.285 | 0.000 | n/a | n/a | 1.503 | 0.130 | 0.000 | 1.503 | gw-r/thread-53/journal/page | none observed |
| 4a25876327cca9ea0000000000000019 | 1005.461 | 0.132 | n/a | 0.000 | 0.000 | 3.218 | 1001.219 | 0.013 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.734 | 0.132 | 0.000 | 0.734 | gw-r/thread-53/journal/page | none observed |
| 4a25876327cca9ea0000000000000017 | 1005.461 | 0.186 | n/a | 0.000 | 0.000 | 1.644 | 1002.153 | 0.815 | 0.000 | 0.326 | 0.000 | n/a | n/a | 0.336 | 0.186 | 0.000 | 0.336 | gw-r/thread-53/journal/page | none observed |
| 4a25876327cca9ea000000000000001a | 457.399 | 31.442 | n/a | 9.049 | 0.000 | 3.765 | 412.740 | 0.015 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.289 | 40.492 | 0.089 | 0.289 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 493.866 | n/a | n/a | n/a | 3.141 | n/a | 0.000 | 0.000 | 3.864 | 482.362 | 0.013 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.130 | 3.141 | 0.005 | 0.130 |
| p99 | 672.921 | n/a | n/a | n/a | 7.269 | n/a | 0.000 | 0.000 | 12.479 | 656.974 | 0.083 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.215 | 7.269 | 0.015 | 0.215 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4a25876327cca9ea000000000000001c | 672.921 | 3.141 | n/a | 0.000 | 0.000 | 12.479 | 656.974 | 0.083 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.130 | 3.141 | 0.005 | 0.130 | gw-r/thread-67/journal/page | none observed |
| 4a25876327cca9ea000000000000001d | 493.866 | 7.269 | n/a | 0.000 | 0.000 | 3.864 | 482.362 | 0.009 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.215 | 7.269 | 0.015 | 0.215 | gw-r/thread-53/journal/page | none observed |
| 4a25876327cca9ea000000000000001f | 455.071 | 2.394 | n/a | 0.000 | 0.000 | 1.166 | 451.311 | 0.013 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.117 | 2.394 | 0.005 | 0.117 | gw-r/thread-52/journal/page | none observed |

## P3 / L1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 470.430 | n/a | n/a | n/a | 2.708 | n/a | 0.000 | 0.000 | 0.725 | 466.522 | 0.015 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.160 | 2.708 | 0.005 | 0.160 |
| p99 | 717.952 | n/a | n/a | n/a | 3.224 | n/a | 0.000 | 0.000 | 4.729 | 714.060 | 0.077 | 0.000 | 0.239 | 0.000 | n/a | n/a | 0.236 | 3.224 | 0.011 | 0.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4a25876327cca9ea0000000000000023 | 717.952 | 2.708 | n/a | 0.000 | 0.000 | 0.708 | 714.060 | 0.077 | 0.000 | 0.239 | 0.000 | n/a | n/a | 0.160 | 2.708 | 0.004 | 0.160 | gw-r/thread-69/journal/page | none observed |
| 4a25876327cca9ea0000000000000020 | 536.113 | 2.502 | n/a | 0.000 | 0.000 | 0.725 | 532.551 | 0.020 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.236 | 2.502 | 0.005 | 0.236 | gw-r/thread-71/journal/page | none observed |
| 4a25876327cca9ea0000000000000022 | 470.430 | 2.928 | n/a | 0.000 | 0.000 | 0.761 | 466.522 | 0.015 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.096 | 2.928 | 0.006 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 4a25876327cca9ea0000000000000025 | 283.822 | 3.224 | n/a | 0.000 | 0.000 | 4.729 | 275.591 | 0.011 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.171 | 3.224 | 0.011 | 0.171 | gw-r/thread-64/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 110.518 | n/a | n/a | n/a | 4.652 | n/a | 0.000 | 0.000 | 1.635 | 102.685 | 0.012 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.098 | 4.652 | 0.016 | 0.098 |
| p99 | 984.005 | n/a | n/a | n/a | 14.481 | n/a | 0.000 | 0.000 | 4.042 | 975.922 | 0.019 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.111 | 14.481 | 0.253 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4a25876327cca9ea0000000000000027 | 984.005 | 4.652 | n/a | 0.000 | 0.000 | 3.177 | 975.922 | 0.018 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.086 | 4.652 | 0.005 | 0.086 | gw-r/thread-50/journal/page | none observed |
| 4a25876327cca9ea0000000000000029 | 921.738 | 14.481 | n/a | 0.000 | 0.000 | 1.239 | 905.780 | 0.012 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.098 | 14.481 | 0.016 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 4a25876327cca9ea000000000000002b | 110.518 | 5.974 | n/a | 0.000 | 0.000 | 1.635 | 102.685 | 0.019 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.111 | 5.974 | 0.054 | 0.111 | gw-r/thread-49/journal/page | none observed |
| 4a25876327cca9ea0000000000000026 | 18.370 | 4.640 | n/a | 0.000 | 0.000 | 4.042 | 9.508 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.103 | 4.640 | 0.253 | 0.103 | gw-r/thread-50/journal/page | none observed |

## P3 / L16 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 646.403 | n/a | n/a | n/a | 2.559 | n/a | 0.000 | 0.000 | 2.303 | 641.328 | 0.015 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.092 | 2.559 | 0.004 | 0.092 |
| p99 | 980.303 | n/a | n/a | n/a | 5.909 | n/a | 0.000 | 0.000 | 2.587 | 975.735 | 0.024 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.278 | 5.909 | 0.018 | 0.278 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4a25876327cca9ea000000000000002f | 980.303 | 2.392 | n/a | 0.000 | 0.000 | 1.914 | 975.735 | 0.024 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.078 | 2.392 | 0.002 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 4a25876327cca9ea000000000000002e | 646.403 | 2.559 | n/a | 0.000 | 0.000 | 2.303 | 641.328 | 0.015 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.092 | 2.559 | 0.004 | 0.092 | gw-r/thread-69/journal/page | none observed |
| 4a25876327cca9ea000000000000002c | 322.389 | 5.909 | n/a | 0.000 | 0.000 | 2.587 | 313.513 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.278 | 5.909 | 0.018 | 0.278 | gw-r/thread-70/journal/page | none observed |

## P3 / tail / internal (3148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.184 | n/a | n/a | n/a | 4.644 | n/a | 0.000 | 0.000 | 0.650 | 8.295 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.128 | 4.664 | 0.354 | 0.128 |
| p99 | 999.944 | n/a | n/a | n/a | 25.281 | n/a | 1.870 | 0.000 | 4.543 | 995.372 | 0.029 | 10.491 | 0.106 | 0.000 | n/a | n/a | 2.144 | 26.571 | 0.853 | 2.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4a25876327cca9ea0000000000000030 | 1080.007 | 2.353 | n/a | 0.000 | 0.000 | 1.290 | 1076.162 | 0.035 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.079 | 2.353 | 0.002 | 0.079 | gw-r/thread-65/journal/page | none observed |
| 4a25876327cca9ea0000000000000092 | 1011.156 | 2.248 | n/a | 0.000 | 0.000 | 0.665 | 993.525 | 0.012 | 14.593 | 0.052 | 0.000 | n/a | n/a | 0.063 | 2.248 | 0.002 | 0.063 | gw-r/thread-69/journal/page | none observed |
| 4a25876327cca9ea0000000000000045 | 1009.905 | 2.279 | n/a | 0.000 | 0.000 | 0.865 | 1006.577 | 0.014 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.085 | 2.279 | 0.002 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 4a25876327cca9ea00000000000000ea | 1006.264 | 5.423 | n/a | 0.000 | 0.000 | 0.725 | 999.973 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.089 | 5.423 | 0.005 | 0.089 | gw-r/thread-69/journal/page | none observed |
| 4a25876327cca9ea000000000000019a | 1005.417 | 2.648 | n/a | 0.000 | 0.000 | 0.576 | 1002.082 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.065 | 2.648 | 0.003 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 4a25876327cca9ea000000000000004c | 1005.306 | 0.157 | n/a | 0.000 | 0.000 | 0.912 | 1002.961 | 0.023 | 0.000 | 0.207 | 0.000 | n/a | n/a | 1.045 | 0.157 | 0.000 | 1.045 | gw-r/thread-68/journal/page | none observed |
| 4a25876327cca9ea0000000000000059 | 1004.661 | 2.274 | n/a | 0.000 | 0.000 | 0.817 | 1001.389 | 0.016 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.086 | 2.274 | 0.002 | 0.086 | gw-r/thread-71/journal/page | none observed |
| 4a25876327cca9ea00000000000000fb | 1004.147 | 2.285 | n/a | 0.000 | 0.000 | 0.737 | 1000.942 | 0.009 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.121 | 2.285 | 0.002 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 4a25876327cca9ea00000000000000b6 | 1003.921 | 2.528 | n/a | 0.000 | 0.000 | 0.551 | 1000.729 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.067 | 2.528 | 0.003 | 0.067 | gw-r/thread-68/journal/page | none observed |
| 4a25876327cca9ea0000000000000089 | 1003.476 | 0.202 | n/a | 0.000 | 0.000 | 0.831 | 1000.835 | 0.020 | 0.000 | 0.087 | 0.000 | n/a | n/a | 1.501 | 0.202 | 0.000 | 1.501 | gw-r/thread-49/journal/page | none observed |
| 4a25876327cca9ea00000000000000ad | 1003.177 | 2.220 | n/a | 0.000 | 0.000 | 1.720 | 999.139 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.060 | 2.220 | 0.002 | 0.060 | gw-r/thread-66/journal/page | none observed |
| 4a25876327cca9ea0000000000001983 | 1003.088 | 2.721 | n/a | 0.000 | 0.000 | 0.456 | 999.754 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.125 | 2.721 | 0.003 | 0.125 | gw-r/thread-67/journal/page | none observed |
| 4a25876327cca9ea0000000000000075 | 1002.963 | 4.491 | n/a | 0.000 | 0.000 | 0.512 | 997.762 | 0.012 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.121 | 4.491 | 0.004 | 0.121 | gw-r/thread-67/journal/page | none observed |
| 4a25876327cca9ea0000000000000119 | 1002.949 | 0.254 | n/a | 0.000 | 0.000 | 1.025 | 1000.979 | 0.021 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.529 | 0.254 | 0.000 | 0.529 | gw-r/thread-65/journal/page | none observed |
| 4a25876327cca9ea000000000000009f | 1002.863 | 0.164 | n/a | 0.000 | 0.000 | 0.671 | 1000.744 | 0.011 | 0.000 | 0.084 | 0.000 | n/a | n/a | 1.188 | 0.164 | 0.000 | 1.188 | gw-r/thread-50/journal/page | none observed |
| 4a25876327cca9ea0000000000000081 | 1002.819 | 0.213 | n/a | 0.000 | 0.000 | 0.645 | 1001.011 | 0.025 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.806 | 0.213 | 0.000 | 0.806 | gw-r/thread-46/journal/page | none observed |
| 4a25876327cca9ea00000000000000c9 | 1002.776 | 0.121 | n/a | 0.000 | 0.000 | 0.756 | 1001.129 | 0.009 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.684 | 0.121 | 0.000 | 0.684 | gw-r/thread-51/journal/page | none observed |
| 4a25876327cca9ea000000000000018c | 1002.648 | 0.130 | n/a | 0.000 | 0.000 | 0.846 | 1000.521 | 0.010 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.106 | 0.130 | 0.000 | 1.106 | gw-r/thread-48/journal/page | none observed |
| 4a25876327cca9ea00000000000019cf | 1002.620 | 0.193 | n/a | 0.000 | 0.000 | 0.514 | 1000.550 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.329 | 0.193 | 0.000 | 1.329 | gw-r/thread-68/journal/page | none observed |
| 4a25876327cca9ea00000000000000e3 | 1002.583 | 0.117 | n/a | 0.000 | 0.000 | 0.661 | 1000.918 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.816 | 0.117 | 0.000 | 0.816 | gw-r/thread-52/journal/page | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.022 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 2.790 | 201.473 | 0.017 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.138 | 0.047 | 0.000 | 0.138 |
| p99 | 214.234 | n/a | n/a | n/a | 0.140 | n/a | 0.000 | 0.000 | 11.833 | 203.432 | 16.469 | 0.000 | 0.282 | 0.000 | n/a | n/a | 1.091 | 0.140 | 0.001 | 1.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9502eae5266e433c000000000000000a | 214.234 | 0.088 | n/a | 0.000 | 0.000 | 11.833 | 201.971 | 0.017 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.201 | 0.088 | 0.000 | 0.201 | gw-r/thread-49/journal/page | none observed |
| 9502eae5266e433c000000000000000c | 208.558 | 0.049 | n/a | 0.000 | 0.000 | 5.095 | 194.119 | 9.115 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.082 | 0.049 | 0.000 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 9502eae5266e433c0000000000000008 | 207.552 | 0.047 | n/a | 0.000 | 0.000 | 2.789 | 203.432 | 0.013 | 0.000 | 0.180 | 0.000 | n/a | n/a | 1.091 | 0.047 | 0.000 | 1.091 | gw-r/thread-52/journal/page | none observed |
| 9502eae5266e433c0000000000000010 | 207.154 | 0.038 | n/a | 0.000 | 0.000 | 4.473 | 202.336 | 0.013 | 0.000 | 0.223 | 0.000 | n/a | n/a | 0.071 | 0.038 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 9502eae5266e433c0000000000000011 | 204.022 | 0.038 | n/a | 0.000 | 0.000 | 2.790 | 200.961 | 0.015 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.080 | 0.038 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 9502eae5266e433c000000000000000d | 203.414 | 0.043 | n/a | 0.000 | 0.000 | 1.194 | 201.845 | 0.021 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.100 | 0.043 | 0.000 | 0.100 | gw-r/thread-51/journal/page | none observed |
| 9502eae5266e433c000000000000000e | 203.344 | 0.055 | n/a | 0.000 | 0.000 | 1.349 | 201.473 | 0.035 | 0.000 | 0.282 | 0.000 | n/a | n/a | 0.150 | 0.055 | 0.000 | 0.150 | gw-r/thread-69/journal/page | none observed |
| 9502eae5266e433c000000000000000b | 202.119 | 0.046 | n/a | 0.000 | 0.000 | 0.779 | 201.011 | 0.013 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.138 | 0.046 | 0.000 | 0.138 | gw-r/thread-70/journal/page | none observed |
| 9502eae5266e433c0000000000000009 | 113.927 | 0.140 | n/a | 0.000 | 0.000 | 3.237 | 93.153 | 16.469 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.770 | 0.140 | 0.001 | 0.770 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / read (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.796 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.860 | 201.635 | 0.114 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.094 | 0.042 | 0.000 | 0.094 |
| p99 | 206.713 | n/a | n/a | n/a | 0.076 | n/a | 0.000 | 0.000 | 1.002 | 205.242 | 0.697 | 0.000 | 0.332 | 0.000 | n/a | n/a | 0.143 | 0.076 | 0.001 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9502eae5266e433c0000000000000014 | 206.713 | 0.042 | n/a | 0.000 | 0.000 | 1.002 | 205.242 | 0.114 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.094 | 0.042 | 0.000 | 0.094 | gw-r/thread-65/journal/page | none observed |
| 9502eae5266e433c0000000000000013 | 202.796 | 0.037 | n/a | 0.000 | 0.000 | 0.651 | 201.635 | 0.073 | 0.000 | 0.332 | 0.000 | n/a | n/a | 0.067 | 0.037 | 0.000 | 0.067 | gw-r/thread-68/journal/page | none observed |
| 9502eae5266e433c0000000000000015 | 75.700 | 0.076 | n/a | 0.000 | 0.000 | 0.860 | 73.880 | 0.697 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.143 | 0.076 | 0.001 | 0.143 | gw-r/thread-67/journal/page | none observed |

## P3 / tail / read (813 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.365 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 0.710 | 200.625 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.079 | 0.045 | 0.000 | 0.079 |
| p99 | 206.037 | n/a | n/a | n/a | 0.116 | n/a | 0.000 | 0.000 | 4.827 | 204.404 | 6.437 | 0.000 | 0.250 | 0.000 | n/a | n/a | 0.227 | 0.116 | 0.002 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9502eae5266e433c000000000000023b | 213.346 | 0.037 | n/a | 0.000 | 0.000 | 0.843 | 212.292 | 0.010 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 9502eae5266e433c0000000000000027 | 207.829 | 0.047 | n/a | 0.000 | 0.000 | 4.896 | 202.383 | 0.064 | 0.000 | 0.338 | 0.000 | n/a | n/a | 0.101 | 0.047 | 0.000 | 0.101 | gw-r/thread-53/journal/page | none observed |
| 9502eae5266e433c0000000000000070 | 207.572 | 0.036 | n/a | 0.000 | 0.000 | 5.418 | 201.844 | 0.047 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 9502eae5266e433c00000000000000e1 | 207.120 | 0.037 | n/a | 0.000 | 0.000 | 5.532 | 201.289 | 0.015 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.086 | 0.037 | 0.000 | 0.086 | gw-r/thread-68/journal/page | none observed |
| 9502eae5266e433c000000000000004d | 207.021 | 0.071 | n/a | 0.000 | 0.000 | 0.921 | 202.865 | 2.979 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.134 | 0.071 | 0.000 | 0.134 | gw-r/thread-52/journal/page | none observed |
| 9502eae5266e433c00000000000001ef | 206.967 | 0.064 | n/a | 0.000 | 0.000 | 4.109 | 202.554 | 0.007 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.157 | 0.064 | 0.000 | 0.157 | gw-r/thread-49/journal/page | none observed |
| 9502eae5266e433c000000000000015a | 206.810 | 0.073 | n/a | 0.000 | 0.000 | 4.713 | 201.436 | 0.040 | 0.000 | 0.407 | 0.000 | n/a | n/a | 0.142 | 0.073 | 0.000 | 0.142 | gw-r/thread-50/journal/page | none observed |
| 9502eae5266e433c000000000000002c | 206.359 | 0.037 | n/a | 0.000 | 0.000 | 0.766 | 205.229 | 0.045 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.081 | 0.037 | 0.000 | 0.081 | gw-r/thread-46/journal/page | none observed |
| 9502eae5266e433c000000000000002e | 206.037 | 0.034 | n/a | 0.000 | 0.000 | 1.257 | 204.504 | 0.016 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.081 | 0.034 | 0.000 | 0.081 | gw-r/thread-66/journal/page | none observed |
| 9502eae5266e433c00000000000000ed | 206.008 | 0.031 | n/a | 0.000 | 0.000 | 0.673 | 205.091 | 0.009 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-69/journal/page | none observed |
| 9502eae5266e433c0000000000000079 | 205.984 | 0.044 | n/a | 0.000 | 0.000 | 1.441 | 204.209 | 0.042 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.075 | 0.044 | 0.000 | 0.075 | gw-r/thread-65/journal/page | none observed |
| 9502eae5266e433c00000000000001ec | 205.843 | 0.107 | n/a | 0.000 | 0.000 | 4.295 | 201.035 | 0.012 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.319 | 0.107 | 0.001 | 0.319 | gw-r/thread-48/journal/page | none observed |
| 9502eae5266e433c00000000000000f8 | 205.649 | 0.027 | n/a | 0.000 | 0.000 | 0.764 | 204.736 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.059 | 0.027 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 9502eae5266e433c000000000000004c | 205.616 | 0.046 | n/a | 0.000 | 0.000 | 0.830 | 204.522 | 0.014 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.087 | 0.046 | 0.000 | 0.087 | gw-r/thread-66/journal/page | none observed |
| 9502eae5266e433c00000000000000f2 | 205.604 | 0.055 | n/a | 0.000 | 0.000 | 0.917 | 204.404 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.153 | 0.055 | 0.000 | 0.153 | gw-r/thread-70/journal/page | none observed |
| 9502eae5266e433c00000000000001e6 | 205.586 | 0.037 | n/a | 0.000 | 0.000 | 0.676 | 204.677 | 0.011 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.082 | 0.037 | 0.000 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 9502eae5266e433c0000000000000171 | 205.575 | 0.046 | n/a | 0.000 | 0.000 | 0.684 | 204.655 | 0.009 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.110 | 0.046 | 0.000 | 0.110 | gw-r/thread-64/journal/page | none observed |
| 9502eae5266e433c00000000000000f1 | 205.371 | 0.057 | n/a | 0.000 | 0.000 | 0.898 | 204.219 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.133 | 0.057 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 9502eae5266e433c000000000000009f | 205.324 | 0.042 | n/a | 0.000 | 0.000 | 3.942 | 201.116 | 0.012 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.093 | 0.042 | 0.000 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 9502eae5266e433c000000000000022d | 205.307 | 0.042 | n/a | 0.000 | 0.000 | 3.814 | 201.257 | 0.009 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.102 | 0.042 | 0.000 | 0.102 | gw-r/thread-51/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

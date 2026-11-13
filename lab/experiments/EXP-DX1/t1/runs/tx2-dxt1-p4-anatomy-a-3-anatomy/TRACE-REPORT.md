# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (181.073 ms, trace `0302ed3e02af441a00000000000010a3`); `node-14/thread-0/driver.queue.scheduler-late` (165.833 ms, trace `0302ed3e02af441a00000000000010a5`); `node-14/thread-0/driver.queue.scheduler-late` (132.111 ms, trace `0302ed3e02af441a00000000000010a8`); `node-14/thread-0/driver.queue.scheduler-late` (188.387 ms, trace `0302ed3e02af441a00000000000010a2`); `node-14/thread-0/driver.queue.scheduler-late` (189.178 ms, trace `0302ed3e02af441a00000000000010a1`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-anatomy-a-3-anatomy`; source `104497f6e3b6a182fb121c4260b92b22642ec370`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 38376423.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 202 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13366.570 | 501.251 | 82.721 | 308 |
| L1 | 0 | 19975.799 | 393.769 | 27.443 | 462 |
| L4 | 0 | 19968.992 | 336.820 | 12.334 | 426 |
| L16 | 0 | 19975.226 | 347.917 | 8.059 | 474 |
| L64 | 0 | 19978.908 | 388.754 | 18.563 | 596 |
| L256 | 0 | 19978.225 | 456.393 | 13.462 | 486 |
| L1024 | 0 | 19975.613 | 3473.809 | 97.424 | 11941 |
| tail | 0 | 64643.820 | 11138.353 | 494.338 | 37480 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 0302ed3e02af441a00000000000010a3 | driver.queue.scheduler-late | 181.073 | none | 3 / 32 |
| 0302ed3e02af441a00000000000010a3 | driver.queue.scheduler-dispatch | 0.005 | none | 3 / 32 |

Observed active steps while trace 0302ed3e02af441a00000000000010a3 waited: []

| 0302ed3e02af441a00000000000010a5 | driver.queue.scheduler-late | 165.833 | none | 5 / 32 |
| 0302ed3e02af441a00000000000010a5 | driver.queue.subject | 56.860 | 0302ed3e02af441a00000000000010a1 | 5 / 32 |
| 0302ed3e02af441a00000000000010a5 | driver.queue.scheduler-dispatch | 0.113 | none | 8 / 32 |

Observed active steps while trace 0302ed3e02af441a00000000000010a5 waited: [{"at":1794582812580.6262,"inFlight":9,"capacity":32,"active":[{"traceId":"0302ed3e02af441a00000000000010a1","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a2","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a3","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a4","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a6","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a7","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010ab","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010ae","step":"client.commit-send-queue"},{"traceId":"0302ed3e02af441a00000000000010af","step":"client.commit-send-queue"}]}]

| 0302ed3e02af441a00000000000010a8 | driver.queue.scheduler-late | 132.111 | none | 7 / 32 |
| 0302ed3e02af441a00000000000010a8 | driver.queue.subject | 107.471 | 0302ed3e02af441a00000000000010a5 | 7 / 32 |
| 0302ed3e02af441a00000000000010a8 | driver.queue.scheduler-dispatch | 0.100 | none | 3 / 32 |

Observed active steps while trace 0302ed3e02af441a00000000000010a8 waited: [{"at":1794582812580.6262,"inFlight":9,"capacity":32,"active":[{"traceId":"0302ed3e02af441a00000000000010a1","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a2","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a3","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a4","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a6","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a7","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010ab","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010ae","step":"client.commit-send-queue"},{"traceId":"0302ed3e02af441a00000000000010af","step":"client.commit-send-queue"}]},{"at":1794582812601.2983,"inFlight":7,"capacity":32,"active":[{"traceId":"0302ed3e02af441a00000000000010a3","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010ab","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010ae","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010af","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a5","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010aa","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010b5","step":"client.http"}]},{"at":1794582812620.6218,"inFlight":7,"capacity":32,"active":[{"traceId":"0302ed3e02af441a00000000000010a3","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010ab","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010ae","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010af","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010a5","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010aa","step":"client.http"},{"traceId":"0302ed3e02af441a00000000000010b5","step":"client.http"}]}]

| 0302ed3e02af441a00000000000010a2 | driver.queue.scheduler-late | 188.387 | none | 2 / 32 |
| 0302ed3e02af441a00000000000010a2 | driver.queue.scheduler-dispatch | 0.008 | none | 2 / 32 |

Observed active steps while trace 0302ed3e02af441a00000000000010a2 waited: []

| 0302ed3e02af441a00000000000010a1 | driver.queue.scheduler-late | 189.178 | none | 1 / 32 |
| 0302ed3e02af441a00000000000010a1 | driver.queue.scheduler-dispatch | 0.043 | none | 1 / 32 |

Observed active steps while trace 0302ed3e02af441a00000000000010a1 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.691 | 0.451 | 0.000 | 0.926 | 4.358 | 0.021 | 0.000 | 0.149 | 1.050 | 5.288 | 0.034 | 0.000 | 0.475 | 11.141 | n/a | n/a | 0.040 | 5.233 | 0.212 | 0.040 |
| p99 | 52.609 | 5.544 | 1.042 | 5.941 | 12.443 | 3.924 | 5.032 | 1.115 | 4.378 | 23.690 | 0.188 | 0.000 | 1.096 | 25.740 | n/a | n/a | 0.392 | 13.047 | 0.451 | 0.392 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000424 | 52.609 | 12.443 | 0.527 | 0.000 | 0.076 | 2.296 | 23.690 | 0.167 | 0.000 | 0.676 | 12.686 | n/a | n/a | 0.047 | 13.047 | 0.248 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000044a | 49.570 | 5.530 | 0.262 | 0.375 | 0.055 | 1.280 | 16.027 | 0.032 | 0.000 | 0.476 | 25.501 | n/a | n/a | 0.031 | 6.222 | 0.126 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000434 | 38.692 | 4.331 | 0.312 | 0.000 | 0.081 | 2.814 | 18.777 | 0.052 | 0.000 | 0.846 | 11.427 | n/a | n/a | 0.054 | 4.723 | 0.122 | 0.054 | gw-w/thread-47/gateway.admitted-work | none observed |
| 0302ed3e02af441a000000000000042c | 38.093 | 8.249 | 0.281 | 0.000 | 0.091 | 4.378 | 8.504 | 0.031 | 0.000 | 0.473 | 16.028 | n/a | n/a | 0.058 | 8.621 | 0.226 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000422 | 37.615 | 9.418 | 0.021 | 0.000 | 1.068 | 0.791 | 2.450 | 0.031 | 0.000 | 0.170 | 23.275 | n/a | n/a | 0.392 | 10.507 | 0.279 | 0.392 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000044e | 37.417 | 3.381 | 0.201 | 0.000 | 0.062 | 1.050 | 6.412 | 0.034 | 0.000 | 0.501 | 25.740 | n/a | n/a | 0.035 | 3.645 | 0.097 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000440 | 37.348 | 5.425 | 3.924 | 0.000 | 0.069 | 1.862 | 8.559 | 0.031 | 0.000 | 0.472 | 16.953 | n/a | n/a | 0.055 | 9.417 | 0.252 | 0.055 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000448 | 34.353 | 7.184 | 0.005 | 5.032 | 0.506 | 0.960 | 1.746 | 0.027 | 0.000 | 0.672 | 18.185 | n/a | n/a | 0.036 | 12.727 | 0.370 | 0.036 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000446 | 33.143 | 5.007 | 0.609 | 0.000 | 0.068 | 1.109 | 15.554 | 0.037 | 0.000 | 0.314 | 10.395 | n/a | n/a | 0.052 | 5.683 | 0.171 | 0.052 | gw-w/thread-50/gateway.admitted-work | none observed |
| 0302ed3e02af441a000000000000042e | 31.964 | 4.468 | 0.195 | 0.000 | 0.059 | 1.883 | 14.812 | 0.034 | 0.000 | 0.525 | 9.941 | n/a | n/a | 0.049 | 4.721 | 0.148 | 0.049 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000043c | 30.861 | 5.297 | 0.333 | 0.000 | 0.062 | 1.800 | 9.632 | 0.038 | 0.000 | 0.192 | 13.476 | n/a | n/a | 0.031 | 5.692 | 0.184 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000443 | 28.564 | 4.117 | 0.005 | 0.000 | 1.112 | 0.948 | 5.224 | 0.028 | 0.000 | 0.223 | 16.870 | n/a | n/a | 0.038 | 5.233 | 0.183 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000043a | 28.405 | 3.907 | 0.004 | 0.000 | 0.815 | 0.694 | 1.977 | 0.050 | 0.000 | 0.353 | 20.566 | n/a | n/a | 0.037 | 4.727 | 0.166 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000431 | 26.980 | 4.358 | 0.005 | 0.000 | 1.115 | 0.741 | 5.783 | 0.036 | 0.000 | 0.613 | 14.278 | n/a | n/a | 0.052 | 5.478 | 0.203 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000456 | 24.691 | 4.758 | 2.373 | 0.000 | 0.056 | 1.174 | 6.417 | 0.061 | 0.000 | 0.655 | 9.166 | n/a | n/a | 0.030 | 7.188 | 0.291 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000436 | 24.691 | 5.093 | 0.321 | 0.000 | 0.161 | 1.536 | 5.756 | 0.031 | 0.000 | 0.613 | 11.141 | n/a | n/a | 0.040 | 5.574 | 0.226 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000452 | 23.195 | 3.652 | 0.229 | 0.323 | 0.061 | 1.061 | 7.101 | 0.034 | 0.000 | 0.360 | 10.335 | n/a | n/a | 0.039 | 4.265 | 0.184 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000426 | 22.413 | 3.250 | 0.006 | 0.000 | 0.823 | 3.635 | 3.107 | 0.025 | 0.000 | 0.404 | 11.092 | n/a | n/a | 0.073 | 4.078 | 0.182 | 0.073 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000043e | 21.005 | 3.896 | 0.344 | 0.000 | 0.053 | 1.028 | 5.288 | 0.035 | 0.000 | 0.195 | 10.134 | n/a | n/a | 0.033 | 4.293 | 0.204 | 0.033 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000437 | 20.592 | 5.405 | 0.005 | 0.000 | 0.466 | 0.894 | 3.062 | 0.045 | 0.000 | 1.096 | 9.572 | n/a | n/a | 0.046 | 5.876 | 0.285 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.566 | 0.778 | 0.000 | 1.637 | 3.756 | 0.005 | 0.000 | 0.347 | 0.948 | 1.474 | 0.028 | 0.000 | 0.404 | 10.615 | n/a | n/a | 0.040 | 4.078 | 0.226 | 0.040 |
| p99 | 28.564 | 2.439 | 1.042 | 3.009 | 5.214 | 0.012 | 3.263 | 1.112 | 3.635 | 5.224 | 0.188 | 0.000 | 0.822 | 16.870 | n/a | n/a | 0.081 | 8.645 | 0.451 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000443 | 28.564 | 4.117 | 0.005 | 0.000 | 1.112 | 0.948 | 5.224 | 0.028 | 0.000 | 0.223 | 16.870 | n/a | n/a | 0.038 | 5.233 | 0.183 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000426 | 22.413 | 3.250 | 0.006 | 0.000 | 0.823 | 3.635 | 3.107 | 0.025 | 0.000 | 0.404 | 11.092 | n/a | n/a | 0.073 | 4.078 | 0.182 | 0.073 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000042a | 19.750 | 3.830 | 0.005 | 0.000 | 0.347 | 0.704 | 1.202 | 0.023 | 0.000 | 0.495 | 13.093 | n/a | n/a | 0.051 | 4.182 | 0.212 | 0.051 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000441 | 19.188 | 5.214 | 0.009 | 3.263 | 0.159 | 1.158 | 2.033 | 0.188 | 0.000 | 0.822 | 6.305 | n/a | n/a | 0.037 | 8.645 | 0.451 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000042f | 17.566 | 3.196 | 0.004 | 0.000 | 0.238 | 0.654 | 0.968 | 0.022 | 0.000 | 0.209 | 12.194 | n/a | n/a | 0.081 | 3.438 | 0.196 | 0.081 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000044f | 16.861 | 3.203 | 0.005 | 0.000 | 0.603 | 0.598 | 1.093 | 0.024 | 0.000 | 0.688 | 10.615 | n/a | n/a | 0.032 | 3.811 | 0.226 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000457 | 15.583 | 3.756 | 0.009 | 0.000 | 0.149 | 0.972 | 1.474 | 0.043 | 0.000 | 0.220 | 8.919 | n/a | n/a | 0.042 | 3.913 | 0.251 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000044b | 13.619 | 3.751 | 0.012 | 0.000 | 0.352 | 0.993 | 2.371 | 0.048 | 0.000 | 0.789 | 5.265 | n/a | n/a | 0.040 | 4.115 | 0.302 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000454 | 10.853 | 3.756 | 0.005 | 0.000 | 0.186 | 0.781 | 0.981 | 0.028 | 0.000 | 0.192 | 4.886 | n/a | n/a | 0.038 | 3.947 | 0.364 | 0.038 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.823 | 0.000 | 0.000 | 0.539 | 3.749 | 0.262 | 0.000 | 0.074 | 5.261 | 8.209 | 0.029 | 0.000 | 0.179 | 11.696 | n/a | n/a | 0.039 | 4.393 | 0.170 | 0.039 |
| p99 | 33.533 | 0.255 | 0.000 | 1.561 | 5.126 | 0.799 | 0.307 | 0.792 | 5.426 | 13.655 | 0.031 | 0.000 | 0.399 | 12.650 | n/a | n/a | 0.053 | 5.962 | 0.178 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000c8b | 33.533 | 5.126 | 0.799 | 0.000 | 0.037 | 5.426 | 13.655 | 0.029 | 0.000 | 0.399 | 8.034 | n/a | n/a | 0.030 | 5.962 | 0.178 | 0.030 | gw-w/thread-68/gateway.admitted-work | driver.publication 1.474ms; driver.publication 1.385ms; driver.publication 1.372ms; driver.publication 1.076ms |
| 0302ed3e02af441a000000000000045a | 25.823 | 3.749 | 0.262 | 0.307 | 0.074 | 1.263 | 8.209 | 0.031 | 0.000 | 0.179 | 11.696 | n/a | n/a | 0.053 | 4.393 | 0.170 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000c8c | 22.272 | 2.921 | 0.005 | 0.000 | 0.792 | 5.261 | 0.551 | 0.014 | 0.000 | 0.040 | 12.650 | n/a | n/a | 0.039 | 3.717 | 0.167 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.474ms; driver.publication 1.385ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.691 | 0.433 | 0.000 | 0.647 | 3.792 | 0.013 | 0.000 | 0.112 | 1.095 | 2.541 | 0.031 | 0.000 | 0.319 | 11.485 | n/a | n/a | 0.043 | 4.737 | 0.226 | 0.043 |
| p99 | 87.600 | 2.638 | 0.007 | 5.941 | 11.573 | 2.683 | 1.789 | 2.035 | 4.101 | 17.414 | 0.120 | 23.947 | 4.136 | 63.123 | n/a | n/a | 0.094 | 13.841 | 0.507 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a000000000000046e | 87.600 | 4.806 | 0.271 | 0.000 | 0.077 | 1.618 | 17.414 | 0.046 | 0.000 | 0.190 | 63.123 | n/a | n/a | 0.056 | 5.154 | 0.059 | 0.056 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000465 | 68.214 | 3.792 | 0.261 | 0.000 | 0.070 | 1.169 | 14.556 | 0.048 | 0.000 | 0.199 | 48.067 | n/a | n/a | 0.051 | 4.124 | 0.060 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000468 | 65.753 | 3.608 | 0.208 | 0.000 | 0.066 | 1.332 | 14.308 | 0.037 | 23.947 | 0.809 | 21.406 | n/a | n/a | 0.033 | 3.882 | 0.059 | 0.033 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 0302ed3e02af441a000000000000045c | 55.312 | 3.720 | 0.196 | 0.000 | 0.065 | 1.149 | 13.122 | 0.030 | 22.198 | 0.163 | 14.634 | n/a | n/a | 0.035 | 3.980 | 0.072 | 0.035 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 0302ed3e02af441a000000000000048e | 40.614 | 2.822 | 0.005 | 0.000 | 0.460 | 0.621 | 1.322 | 0.052 | 0.000 | 0.504 | 34.808 | n/a | n/a | 0.021 | 3.286 | 0.081 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000470 | 38.712 | 3.584 | 0.243 | 0.000 | 0.067 | 1.205 | 14.169 | 0.047 | 0.000 | 0.214 | 19.136 | n/a | n/a | 0.046 | 3.894 | 0.101 | 0.046 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000045e | 34.515 | 4.255 | 0.187 | 0.000 | 0.062 | 2.926 | 7.089 | 0.054 | 0.000 | 0.280 | 19.629 | n/a | n/a | 0.033 | 4.504 | 0.130 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004ac | 32.385 | 5.649 | 0.323 | 0.458 | 0.100 | 3.354 | 9.789 | 0.052 | 0.000 | 0.319 | 12.261 | n/a | n/a | 0.080 | 6.530 | 0.202 | 0.080 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000498 | 31.609 | 3.448 | 0.247 | 0.222 | 0.054 | 1.176 | 10.098 | 0.028 | 0.000 | 0.479 | 15.788 | n/a | n/a | 0.069 | 3.971 | 0.126 | 0.069 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000466 | 31.535 | 9.745 | 0.008 | 0.000 | 1.170 | 4.101 | 8.156 | 0.080 | 0.000 | 1.977 | 6.204 | n/a | n/a | 0.094 | 10.923 | 0.346 | 0.094 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000047b | 29.844 | 8.303 | 0.006 | 1.687 | 0.865 | 0.788 | 1.195 | 0.031 | 0.000 | 0.556 | 16.372 | n/a | n/a | 0.041 | 10.862 | 0.364 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000047e | 28.740 | 3.395 | 0.182 | 0.214 | 0.048 | 1.073 | 14.770 | 0.041 | 0.000 | 0.499 | 8.481 | n/a | n/a | 0.037 | 3.840 | 0.134 | 0.037 | gw-w/thread-54/gateway.admitted-work | none observed |
| 0302ed3e02af441a00000000000004a0 | 27.576 | 3.658 | 0.269 | 0.218 | 0.043 | 0.967 | 5.854 | 0.030 | 0.000 | 0.285 | 16.208 | n/a | n/a | 0.045 | 4.187 | 0.152 | 0.045 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000046b | 27.533 | 7.339 | 0.005 | 1.543 | 0.417 | 0.826 | 1.199 | 0.026 | 0.000 | 0.604 | 15.507 | n/a | n/a | 0.066 | 9.304 | 0.338 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000047f | 27.318 | 11.573 | 0.013 | 1.789 | 0.466 | 0.728 | 1.432 | 0.025 | 0.000 | 0.155 | 11.054 | n/a | n/a | 0.083 | 13.841 | 0.507 | 0.083 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000047a | 27.111 | 4.352 | 0.176 | 0.284 | 0.061 | 1.197 | 5.355 | 0.045 | 0.000 | 0.851 | 14.740 | n/a | n/a | 0.051 | 4.873 | 0.180 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000472 | 26.394 | 3.401 | 0.240 | 0.000 | 0.064 | 1.152 | 9.813 | 0.031 | 0.000 | 0.163 | 11.485 | n/a | n/a | 0.045 | 3.705 | 0.140 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000496 | 26.205 | 3.633 | 0.230 | 0.214 | 0.060 | 1.178 | 8.544 | 0.055 | 0.000 | 0.811 | 11.445 | n/a | n/a | 0.035 | 4.138 | 0.158 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000049c | 26.015 | 3.540 | 0.177 | 0.225 | 0.057 | 1.143 | 9.298 | 0.048 | 0.000 | 0.450 | 11.041 | n/a | n/a | 0.037 | 3.999 | 0.154 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000486 | 25.626 | 5.769 | 0.265 | 0.233 | 0.095 | 1.031 | 5.097 | 0.029 | 0.000 | 0.190 | 12.862 | n/a | n/a | 0.055 | 6.362 | 0.248 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.377 | 0.628 | 0.000 | 1.336 | 3.306 | 0.005 | 0.000 | 0.546 | 0.828 | 0.939 | 0.024 | 0.000 | 0.439 | 10.085 | n/a | n/a | 0.036 | 4.419 | 0.285 | 0.036 |
| p99 | 31.535 | 1.778 | 0.000 | 2.061 | 9.745 | 0.010 | 1.335 | 2.035 | 4.101 | 8.156 | 0.120 | 0.000 | 1.977 | 13.548 | n/a | n/a | 0.094 | 10.923 | 0.346 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000466 | 31.535 | 9.745 | 0.008 | 0.000 | 1.170 | 4.101 | 8.156 | 0.080 | 0.000 | 1.977 | 6.204 | n/a | n/a | 0.094 | 10.923 | 0.346 | 0.094 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000463 | 20.458 | 3.306 | 0.004 | 0.000 | 1.108 | 0.687 | 0.977 | 0.024 | 0.000 | 0.772 | 13.548 | n/a | n/a | 0.031 | 4.419 | 0.216 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000477 | 18.980 | 2.905 | 0.004 | 1.335 | 0.546 | 0.627 | 0.900 | 0.023 | 0.000 | 0.439 | 12.170 | n/a | n/a | 0.029 | 4.791 | 0.252 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004a8 | 18.473 | 3.758 | 0.008 | 0.000 | 2.035 | 0.828 | 1.438 | 0.045 | 0.000 | 0.242 | 10.085 | n/a | n/a | 0.034 | 5.801 | 0.314 | 0.034 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 0.655ms |
| 0302ed3e02af441a000000000000049e | 18.377 | 4.250 | 0.006 | 0.000 | 0.112 | 0.945 | 2.146 | 0.120 | 0.000 | 0.555 | 10.193 | n/a | n/a | 0.049 | 4.369 | 0.238 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000048c | 17.784 | 4.250 | 0.010 | 0.000 | 0.801 | 0.887 | 0.909 | 0.024 | 0.000 | 0.506 | 10.358 | n/a | n/a | 0.040 | 5.061 | 0.285 | 0.040 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000491 | 10.377 | 2.695 | 0.005 | 0.000 | 0.355 | 1.162 | 0.813 | 0.024 | 0.000 | 0.190 | 5.069 | n/a | n/a | 0.063 | 3.055 | 0.294 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000482 | 9.991 | 2.951 | 0.005 | 0.000 | 0.235 | 0.737 | 0.939 | 0.030 | 0.000 | 0.174 | 4.884 | n/a | n/a | 0.036 | 3.191 | 0.319 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.935 | 0.388 | 0.000 | 0.644 | 3.816 | 0.170 | 0.000 | 0.119 | 1.187 | 4.626 | 0.032 | 0.000 | 0.271 | 10.509 | n/a | n/a | 0.050 | 4.317 | 0.223 | 0.050 |
| p99 | 50.031 | 2.774 | 1.973 | 5.989 | 9.995 | 0.695 | 3.927 | 1.354 | 1.952 | 18.553 | 0.071 | 0.000 | 3.840 | 25.802 | n/a | n/a | 0.130 | 11.086 | 0.500 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a00000000000004d3 | 50.031 | 3.528 | 0.190 | 0.307 | 0.066 | 1.143 | 18.553 | 0.028 | 0.000 | 0.377 | 25.802 | n/a | n/a | 0.037 | 4.091 | 0.082 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004b0 | 34.664 | 3.481 | 0.259 | 0.229 | 0.052 | 1.614 | 16.840 | 0.062 | 0.000 | 3.006 | 9.082 | n/a | n/a | 0.039 | 4.021 | 0.116 | 0.039 | gw-w/thread-50/gateway.admitted-work | none observed |
| 0302ed3e02af441a00000000000004d1 | 30.945 | 5.412 | 0.338 | 0.233 | 0.075 | 1.448 | 9.886 | 0.030 | 0.000 | 0.177 | 13.296 | n/a | n/a | 0.048 | 6.059 | 0.196 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004b8 | 30.465 | 6.313 | 0.011 | 1.507 | 1.354 | 1.087 | 7.583 | 0.059 | 0.000 | 0.261 | 12.234 | n/a | n/a | 0.057 | 9.185 | 0.301 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004cb | 30.234 | 3.164 | 0.203 | 0.334 | 0.062 | 1.262 | 12.720 | 0.037 | 0.000 | 0.185 | 12.229 | n/a | n/a | 0.037 | 3.763 | 0.124 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004b7 | 30.200 | 4.935 | 0.208 | 0.235 | 0.070 | 1.952 | 10.630 | 0.040 | 0.000 | 0.391 | 11.702 | n/a | n/a | 0.037 | 5.448 | 0.180 | 0.037 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004d5 | 29.824 | 3.481 | 0.204 | 0.313 | 0.063 | 1.287 | 11.373 | 0.041 | 0.000 | 0.201 | 12.823 | n/a | n/a | 0.037 | 4.062 | 0.136 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004bc | 29.688 | 3.970 | 0.006 | 0.000 | 1.152 | 0.894 | 3.258 | 0.042 | 0.000 | 0.387 | 19.929 | n/a | n/a | 0.050 | 5.128 | 0.173 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004e6 | 29.101 | 9.995 | 0.006 | 0.000 | 1.085 | 0.812 | 1.657 | 0.024 | 0.000 | 0.183 | 15.274 | n/a | n/a | 0.065 | 11.086 | 0.381 | 0.065 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004d9 | 28.830 | 4.971 | 0.304 | 0.409 | 0.071 | 1.760 | 10.302 | 0.053 | 0.000 | 0.400 | 10.508 | n/a | n/a | 0.050 | 5.755 | 0.200 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004df | 28.483 | 3.487 | 0.261 | 0.000 | 0.116 | 1.750 | 9.198 | 0.066 | 0.000 | 0.285 | 13.255 | n/a | n/a | 0.065 | 3.864 | 0.136 | 0.065 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004bf | 28.020 | 3.982 | 0.267 | 0.337 | 0.063 | 1.682 | 10.963 | 0.051 | 0.000 | 0.227 | 10.407 | n/a | n/a | 0.041 | 4.649 | 0.166 | 0.041 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004f1 | 26.686 | 3.940 | 0.298 | 0.000 | 0.078 | 1.580 | 9.543 | 0.046 | 0.000 | 0.271 | 10.890 | n/a | n/a | 0.039 | 4.317 | 0.162 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004cd | 26.656 | 3.514 | 0.310 | 0.211 | 0.133 | 1.187 | 12.172 | 0.042 | 0.000 | 0.234 | 8.769 | n/a | n/a | 0.084 | 4.168 | 0.156 | 0.084 | gw-w/thread-49/gateway.admitted-work | none observed |
| 0302ed3e02af441a00000000000004fb | 26.527 | 3.667 | 0.274 | 0.000 | 0.113 | 1.545 | 6.088 | 0.046 | 0.000 | 3.840 | 10.898 | n/a | n/a | 0.055 | 4.054 | 0.153 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004c8 | 24.360 | 5.394 | 0.006 | 3.927 | 1.100 | 0.708 | 1.320 | 0.024 | 0.000 | 0.172 | 11.601 | n/a | n/a | 0.108 | 10.426 | 0.428 | 0.108 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004c7 | 23.639 | 4.895 | 0.182 | 0.383 | 0.057 | 1.475 | 7.711 | 0.027 | 0.000 | 0.148 | 8.723 | n/a | n/a | 0.036 | 5.517 | 0.233 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004ea | 23.113 | 4.571 | 0.010 | 0.000 | 0.283 | 0.830 | 1.225 | 0.028 | 0.000 | 0.182 | 15.923 | n/a | n/a | 0.061 | 4.864 | 0.210 | 0.061 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004f6 | 22.021 | 3.969 | 0.013 | 0.000 | 0.920 | 0.890 | 2.637 | 0.026 | 0.000 | 0.212 | 13.297 | n/a | n/a | 0.057 | 4.902 | 0.223 | 0.057 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004f2 | 21.935 | 6.552 | 0.011 | 0.000 | 0.395 | 1.077 | 1.807 | 0.046 | 0.000 | 0.198 | 11.767 | n/a | n/a | 0.082 | 6.958 | 0.317 | 0.082 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.898 | 0.770 | 0.000 | 1.618 | 3.490 | 0.005 | 0.000 | 0.646 | 0.696 | 1.218 | 0.025 | 0.000 | 0.412 | 8.568 | n/a | n/a | 0.050 | 4.171 | 0.245 | 0.050 |
| p99 | 29.688 | 2.415 | 0.004 | 4.516 | 6.208 | 0.013 | 0.000 | 1.152 | 1.441 | 3.258 | 0.042 | 0.000 | 0.488 | 19.929 | n/a | n/a | 0.060 | 7.075 | 0.500 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a00000000000004bc | 29.688 | 3.970 | 0.006 | 0.000 | 1.152 | 0.894 | 3.258 | 0.042 | 0.000 | 0.387 | 19.929 | n/a | n/a | 0.050 | 5.128 | 0.173 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004f6 | 22.021 | 3.969 | 0.013 | 0.000 | 0.920 | 0.890 | 2.637 | 0.026 | 0.000 | 0.212 | 13.297 | n/a | n/a | 0.057 | 4.902 | 0.223 | 0.057 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004ee | 17.260 | 3.516 | 0.009 | 0.000 | 0.646 | 0.588 | 1.439 | 0.025 | 0.000 | 0.468 | 10.509 | n/a | n/a | 0.060 | 4.171 | 0.242 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004c5 | 17.251 | 6.208 | 0.005 | 0.000 | 0.863 | 0.799 | 1.494 | 0.038 | 0.000 | 0.251 | 7.542 | n/a | n/a | 0.052 | 7.075 | 0.410 | 0.052 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004e1 | 15.203 | 3.490 | 0.006 | 0.000 | 0.311 | 0.627 | 0.939 | 0.024 | 0.000 | 0.412 | 9.342 | n/a | n/a | 0.052 | 3.807 | 0.250 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004d6 | 14.898 | 3.116 | 0.005 | 0.000 | 0.525 | 0.578 | 1.218 | 0.024 | 0.000 | 0.426 | 8.961 | n/a | n/a | 0.044 | 3.646 | 0.245 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004b2 | 14.758 | 3.266 | 0.004 | 0.000 | 1.068 | 0.878 | 1.167 | 0.027 | 0.000 | 0.416 | 7.898 | n/a | n/a | 0.033 | 4.339 | 0.294 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004ae | 14.047 | 3.205 | 0.005 | 0.000 | 0.101 | 0.673 | 0.946 | 0.025 | 0.000 | 0.488 | 8.568 | n/a | n/a | 0.036 | 3.311 | 0.236 | 0.036 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004c3 | 12.278 | 5.318 | 0.005 | 0.000 | 0.810 | 0.696 | 1.407 | 0.027 | 0.000 | 0.217 | 3.744 | n/a | n/a | 0.054 | 6.133 | 0.500 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004f8 | 10.305 | 2.736 | 0.005 | 0.000 | 0.308 | 1.441 | 0.847 | 0.024 | 0.000 | 0.468 | 4.438 | n/a | n/a | 0.037 | 3.049 | 0.296 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.509 | 0.448 | 0.000 | 1.287 | 3.677 | 0.012 | 0.000 | 0.114 | 1.026 | 3.993 | 0.032 | 0.000 | 0.435 | 10.721 | n/a | n/a | 0.041 | 4.453 | 0.215 | 0.041 |
| p99 | 69.567 | 3.725 | 0.014 | 4.317 | 12.766 | 3.318 | 1.611 | 1.092 | 5.258 | 13.567 | 0.131 | 0.000 | 2.349 | 60.534 | n/a | n/a | 0.102 | 14.751 | 0.391 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000503 | 69.567 | 5.188 | 0.003 | 0.000 | 0.402 | 1.180 | 1.965 | 0.046 | 0.000 | 0.223 | 60.534 | n/a | n/a | 0.027 | 5.594 | 0.080 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.277ms |
| 0302ed3e02af441a0000000000000520 | 50.023 | 12.766 | 0.010 | 1.611 | 0.364 | 5.258 | 13.030 | 0.131 | 0.000 | 1.904 | 14.909 | n/a | n/a | 0.041 | 14.751 | 0.295 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000501 | 36.759 | 4.702 | 0.280 | 0.000 | 0.114 | 2.742 | 13.312 | 0.032 | 0.000 | 0.224 | 15.302 | n/a | n/a | 0.052 | 5.096 | 0.139 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000050e | 32.585 | 3.217 | 0.171 | 0.000 | 0.065 | 1.494 | 12.156 | 0.046 | 0.000 | 0.505 | 14.892 | n/a | n/a | 0.039 | 3.453 | 0.106 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000507 | 31.592 | 2.996 | 0.172 | 0.000 | 0.057 | 1.344 | 12.654 | 0.031 | 0.000 | 0.677 | 13.623 | n/a | n/a | 0.037 | 3.226 | 0.102 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000541 | 30.057 | 3.333 | 0.312 | 0.000 | 0.080 | 1.496 | 8.160 | 0.054 | 0.000 | 0.743 | 15.841 | n/a | n/a | 0.040 | 3.724 | 0.124 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000547 | 28.479 | 4.039 | 0.202 | 0.000 | 0.063 | 1.522 | 13.567 | 0.035 | 0.000 | 0.176 | 8.834 | n/a | n/a | 0.039 | 4.305 | 0.151 | 0.039 | gw-w/thread-52/gateway.admitted-work | none observed |
| 0302ed3e02af441a0000000000000537 | 27.535 | 4.196 | 0.296 | 0.000 | 0.061 | 1.288 | 7.313 | 0.027 | 0.000 | 0.386 | 13.932 | n/a | n/a | 0.037 | 4.553 | 0.165 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000523 | 27.316 | 4.221 | 0.175 | 0.000 | 0.057 | 1.614 | 8.965 | 0.043 | 0.000 | 0.221 | 11.985 | n/a | n/a | 0.035 | 4.453 | 0.163 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000549 | 27.003 | 4.438 | 0.271 | 0.000 | 0.058 | 1.256 | 9.205 | 0.034 | 0.000 | 0.439 | 11.264 | n/a | n/a | 0.039 | 4.767 | 0.177 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000533 | 26.064 | 3.567 | 0.194 | 0.000 | 0.070 | 1.202 | 5.685 | 0.090 | 0.000 | 0.978 | 14.237 | n/a | n/a | 0.041 | 3.831 | 0.147 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000054b | 25.902 | 4.470 | 0.194 | 0.000 | 0.060 | 1.263 | 6.154 | 0.032 | 0.000 | 0.775 | 12.917 | n/a | n/a | 0.038 | 4.724 | 0.182 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000051f | 25.733 | 4.233 | 0.370 | 0.000 | 0.070 | 1.712 | 7.677 | 0.050 | 0.000 | 0.693 | 10.887 | n/a | n/a | 0.041 | 4.674 | 0.182 | 0.041 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000050f | 25.689 | 6.835 | 0.012 | 0.000 | 0.557 | 0.813 | 4.724 | 0.033 | 0.000 | 0.222 | 12.420 | n/a | n/a | 0.072 | 7.405 | 0.288 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000053f | 23.467 | 4.180 | 0.285 | 0.000 | 0.106 | 1.178 | 5.245 | 0.028 | 0.000 | 0.442 | 11.901 | n/a | n/a | 0.102 | 4.572 | 0.195 | 0.102 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000052b | 23.342 | 4.875 | 0.349 | 0.000 | 0.062 | 3.537 | 4.895 | 0.029 | 0.000 | 0.433 | 9.110 | n/a | n/a | 0.054 | 5.285 | 0.226 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000512 | 22.903 | 3.518 | 0.213 | 0.000 | 0.122 | 1.513 | 5.049 | 0.033 | 0.000 | 0.404 | 11.991 | n/a | n/a | 0.059 | 3.853 | 0.168 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000053b | 22.701 | 3.236 | 0.201 | 0.000 | 0.062 | 1.159 | 9.277 | 0.041 | 0.000 | 0.427 | 8.260 | n/a | n/a | 0.038 | 3.499 | 0.154 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000054f | 22.290 | 4.515 | 0.203 | 0.000 | 0.070 | 1.250 | 4.880 | 0.031 | 0.000 | 0.465 | 10.838 | n/a | n/a | 0.037 | 4.788 | 0.215 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000530 | 20.534 | 4.755 | 0.012 | 0.000 | 0.705 | 0.825 | 4.954 | 0.026 | 0.000 | 0.174 | 9.033 | n/a | n/a | 0.050 | 5.472 | 0.266 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.977 | 0.546 | 0.000 | 1.528 | 3.170 | 0.005 | 0.000 | 0.646 | 0.696 | 1.066 | 0.026 | 0.000 | 0.415 | 9.033 | n/a | n/a | 0.043 | 3.713 | 0.236 | 0.043 |
| p99 | 20.534 | 1.452 | 0.005 | 1.764 | 4.755 | 0.012 | 0.000 | 1.092 | 1.318 | 4.954 | 0.042 | 0.000 | 2.349 | 13.341 | n/a | n/a | 0.078 | 5.472 | 0.362 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000530 | 20.534 | 4.755 | 0.012 | 0.000 | 0.705 | 0.825 | 4.954 | 0.026 | 0.000 | 0.174 | 9.033 | n/a | n/a | 0.050 | 5.472 | 0.266 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000534 | 20.509 | 3.334 | 0.005 | 0.000 | 0.674 | 0.903 | 1.522 | 0.042 | 0.000 | 0.646 | 13.336 | n/a | n/a | 0.046 | 4.014 | 0.196 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000502 | 19.666 | 3.170 | 0.005 | 0.000 | 0.538 | 0.700 | 0.916 | 0.024 | 0.000 | 2.349 | 11.920 | n/a | n/a | 0.042 | 3.713 | 0.189 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004fc | 19.187 | 3.218 | 0.005 | 0.000 | 0.646 | 0.613 | 0.877 | 0.023 | 0.000 | 0.415 | 13.341 | n/a | n/a | 0.050 | 3.868 | 0.202 | 0.050 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000004ff | 16.757 | 3.753 | 0.009 | 0.000 | 0.992 | 0.795 | 1.462 | 0.037 | 0.000 | 0.320 | 9.339 | n/a | n/a | 0.052 | 4.754 | 0.284 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000526 | 16.361 | 2.981 | 0.006 | 0.000 | 0.607 | 0.684 | 1.066 | 0.027 | 0.000 | 0.228 | 10.721 | n/a | n/a | 0.043 | 3.594 | 0.220 | 0.043 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000517 | 16.216 | 3.044 | 0.005 | 0.000 | 0.785 | 0.696 | 1.162 | 0.026 | 0.000 | 0.226 | 10.231 | n/a | n/a | 0.041 | 3.835 | 0.236 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000050c | 15.977 | 3.702 | 0.008 | 0.000 | 0.262 | 0.936 | 1.877 | 0.023 | 0.000 | 0.658 | 8.438 | n/a | n/a | 0.073 | 3.972 | 0.249 | 0.073 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000515 | 15.962 | 2.698 | 0.006 | 0.000 | 0.605 | 0.675 | 1.365 | 0.042 | 0.000 | 0.388 | 10.145 | n/a | n/a | 0.040 | 3.308 | 0.207 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000542 | 14.917 | 3.567 | 0.005 | 0.000 | 1.092 | 0.566 | 1.078 | 0.024 | 0.000 | 0.227 | 8.280 | n/a | n/a | 0.078 | 4.664 | 0.313 | 0.078 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000051a | 14.192 | 3.013 | 0.005 | 0.000 | 0.119 | 0.677 | 0.931 | 0.023 | 0.000 | 0.473 | 8.919 | n/a | n/a | 0.033 | 3.136 | 0.221 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000513 | 13.308 | 2.884 | 0.005 | 0.000 | 0.075 | 0.568 | 0.881 | 0.028 | 0.000 | 0.206 | 8.627 | n/a | n/a | 0.034 | 2.963 | 0.223 | 0.034 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000054c | 11.960 | 3.198 | 0.006 | 0.000 | 0.095 | 0.728 | 0.960 | 0.027 | 0.000 | 0.535 | 6.353 | n/a | n/a | 0.058 | 3.299 | 0.276 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000538 | 11.178 | 2.590 | 0.005 | 0.000 | 0.821 | 0.537 | 0.991 | 0.024 | 0.000 | 0.462 | 5.711 | n/a | n/a | 0.037 | 3.416 | 0.306 | 0.037 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000053c | 9.656 | 2.815 | 0.004 | 0.000 | 0.674 | 1.318 | 0.860 | 0.024 | 0.000 | 0.513 | 3.405 | n/a | n/a | 0.042 | 3.493 | 0.362 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.078 | 0.515 | 0.000 | 1.417 | 3.592 | 0.007 | 0.000 | 0.375 | 0.961 | 2.557 | 0.032 | 0.000 | 0.304 | 8.356 | n/a | n/a | 0.045 | 4.197 | 0.249 | 0.045 |
| p99 | 64.703 | 2.133 | 1.311 | 3.365 | 7.816 | 1.059 | 0.000 | 1.344 | 4.575 | 15.937 | 0.086 | 40.331 | 4.035 | 32.159 | n/a | n/a | 0.094 | 8.878 | 0.502 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000576 | 64.703 | 3.088 | 0.183 | 0.000 | 0.055 | 1.557 | 10.043 | 0.036 | 40.331 | 0.222 | 9.151 | n/a | n/a | 0.036 | 3.326 | 0.051 | 0.036 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 0302ed3e02af441a000000000000056c | 49.021 | 4.848 | 0.417 | 0.000 | 0.134 | 1.387 | 9.568 | 0.028 | 0.000 | 0.385 | 32.159 | n/a | n/a | 0.094 | 5.400 | 0.110 | 0.094 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000584 | 44.661 | 3.821 | 0.287 | 0.000 | 0.067 | 2.322 | 13.760 | 0.044 | 13.513 | 0.247 | 10.548 | n/a | n/a | 0.053 | 4.174 | 0.093 | 0.053 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 0302ed3e02af441a0000000000000561 | 38.450 | 7.816 | 0.067 | 0.000 | 0.995 | 0.658 | 14.023 | 0.041 | 0.000 | 0.169 | 14.618 | n/a | n/a | 0.063 | 8.878 | 0.231 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000055d | 34.696 | 3.858 | 0.289 | 0.000 | 0.105 | 1.943 | 5.945 | 0.048 | 0.000 | 4.035 | 18.424 | n/a | n/a | 0.049 | 4.251 | 0.123 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000551 | 34.268 | 3.269 | 0.269 | 0.000 | 0.074 | 1.847 | 15.937 | 0.028 | 0.000 | 0.197 | 12.600 | n/a | n/a | 0.047 | 3.611 | 0.105 | 0.047 | gw-w/thread-53/gateway.admitted-work | none observed |
| 0302ed3e02af441a0000000000000578 | 30.245 | 5.227 | 0.201 | 0.000 | 0.057 | 1.676 | 8.279 | 0.036 | 0.000 | 0.415 | 14.319 | n/a | n/a | 0.035 | 5.484 | 0.181 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000570 | 29.120 | 3.118 | 0.213 | 0.000 | 0.064 | 1.293 | 13.044 | 0.047 | 0.000 | 0.663 | 10.637 | n/a | n/a | 0.041 | 3.395 | 0.117 | 0.041 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005af | 28.895 | 3.201 | 0.220 | 0.000 | 0.128 | 1.536 | 12.655 | 0.036 | 0.000 | 0.282 | 10.781 | n/a | n/a | 0.056 | 3.549 | 0.123 | 0.056 | gw-w/thread-54/gateway.admitted-work | none observed |
| 0302ed3e02af441a00000000000005a1 | 28.431 | 3.232 | 1.059 | 0.000 | 0.058 | 1.205 | 8.152 | 0.030 | 0.000 | 0.252 | 14.408 | n/a | n/a | 0.035 | 4.350 | 0.153 | 0.035 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000564 | 28.189 | 3.471 | 0.210 | 0.000 | 0.077 | 1.334 | 11.016 | 0.031 | 0.000 | 0.167 | 11.838 | n/a | n/a | 0.045 | 3.759 | 0.133 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000058b | 25.117 | 5.889 | 0.005 | 0.000 | 1.088 | 1.013 | 2.328 | 0.035 | 0.000 | 0.250 | 14.467 | n/a | n/a | 0.041 | 6.983 | 0.278 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000552 | 23.461 | 5.530 | 0.005 | 0.000 | 0.953 | 4.575 | 4.985 | 0.043 | 0.000 | 0.171 | 7.133 | n/a | n/a | 0.067 | 6.488 | 0.277 | 0.067 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000058e | 23.281 | 3.645 | 0.278 | 0.000 | 0.113 | 0.985 | 5.104 | 0.029 | 0.000 | 0.429 | 12.634 | n/a | n/a | 0.064 | 4.036 | 0.173 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005b3 | 23.102 | 5.111 | 0.295 | 0.000 | 0.070 | 1.744 | 5.857 | 0.073 | 0.000 | 0.368 | 9.531 | n/a | n/a | 0.053 | 5.476 | 0.237 | 0.053 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000055f | 22.935 | 3.038 | 0.006 | 0.000 | 0.847 | 0.704 | 0.999 | 0.037 | 0.000 | 0.519 | 16.744 | n/a | n/a | 0.040 | 3.890 | 0.170 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000580 | 22.660 | 3.972 | 0.267 | 0.000 | 0.062 | 1.286 | 5.059 | 0.032 | 0.000 | 0.173 | 11.754 | n/a | n/a | 0.056 | 4.300 | 0.190 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000574 | 22.354 | 3.489 | 0.230 | 0.000 | 0.070 | 1.549 | 7.346 | 0.036 | 0.000 | 0.250 | 9.340 | n/a | n/a | 0.044 | 3.789 | 0.169 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000057a | 22.275 | 4.247 | 0.015 | 0.000 | 1.045 | 0.642 | 1.452 | 0.054 | 0.000 | 0.751 | 14.011 | n/a | n/a | 0.058 | 5.306 | 0.238 | 0.058 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.507ms |
| 0302ed3e02af441a0000000000000598 | 21.895 | 3.880 | 0.282 | 0.000 | 0.064 | 1.376 | 5.022 | 0.030 | 0.000 | 0.380 | 10.823 | n/a | n/a | 0.040 | 4.226 | 0.193 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.641 | 0.539 | 0.000 | 1.525 | 3.348 | 0.005 | 0.000 | 0.469 | 0.696 | 1.168 | 0.029 | 0.000 | 0.304 | 6.054 | n/a | n/a | 0.043 | 3.826 | 0.258 | 0.043 |
| p99 | 23.461 | 1.734 | 0.008 | 2.940 | 5.530 | 0.015 | 0.000 | 1.344 | 4.575 | 6.142 | 0.065 | 0.000 | 1.541 | 16.744 | n/a | n/a | 0.083 | 6.500 | 0.502 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000552 | 23.461 | 5.530 | 0.005 | 0.000 | 0.953 | 4.575 | 4.985 | 0.043 | 0.000 | 0.171 | 7.133 | n/a | n/a | 0.067 | 6.488 | 0.277 | 0.067 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000055f | 22.935 | 3.038 | 0.006 | 0.000 | 0.847 | 0.704 | 0.999 | 0.037 | 0.000 | 0.519 | 16.744 | n/a | n/a | 0.040 | 3.890 | 0.170 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000057a | 22.275 | 4.247 | 0.015 | 0.000 | 1.045 | 0.642 | 1.452 | 0.054 | 0.000 | 0.751 | 14.011 | n/a | n/a | 0.058 | 5.306 | 0.238 | 0.058 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.507ms |
| 0302ed3e02af441a0000000000000567 | 16.069 | 3.372 | 0.009 | 0.000 | 0.233 | 0.783 | 4.689 | 0.065 | 0.000 | 0.321 | 6.550 | n/a | n/a | 0.048 | 3.613 | 0.225 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000058f | 15.124 | 3.505 | 0.005 | 0.000 | 0.433 | 3.751 | 1.450 | 0.041 | 0.000 | 0.304 | 5.588 | n/a | n/a | 0.045 | 3.943 | 0.261 | 0.045 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000059e | 14.709 | 3.176 | 0.005 | 0.000 | 0.607 | 0.696 | 0.866 | 0.022 | 0.000 | 0.229 | 9.065 | n/a | n/a | 0.043 | 3.789 | 0.258 | 0.043 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000599 | 14.627 | 3.631 | 0.005 | 0.000 | 0.189 | 1.551 | 6.142 | 0.041 | 0.000 | 0.233 | 2.789 | n/a | n/a | 0.045 | 3.826 | 0.262 | 0.045 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000555 | 13.940 | 3.103 | 0.005 | 0.000 | 0.469 | 0.920 | 1.603 | 0.043 | 0.000 | 0.545 | 7.212 | n/a | n/a | 0.041 | 3.577 | 0.257 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000055b | 13.641 | 3.062 | 0.005 | 0.000 | 0.384 | 0.717 | 0.884 | 0.023 | 0.000 | 0.180 | 8.356 | n/a | n/a | 0.030 | 3.451 | 0.253 | 0.030 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000585 | 12.941 | 5.152 | 0.005 | 0.000 | 1.344 | 0.512 | 0.788 | 0.023 | 0.000 | 1.535 | 3.528 | n/a | n/a | 0.053 | 6.500 | 0.502 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005b1 | 12.274 | 3.547 | 0.006 | 0.000 | 0.703 | 0.598 | 2.557 | 0.028 | 0.000 | 0.205 | 4.562 | n/a | n/a | 0.068 | 4.256 | 0.347 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000571 | 11.935 | 2.736 | 0.006 | 0.000 | 1.058 | 0.650 | 0.933 | 0.029 | 0.000 | 0.271 | 6.219 | n/a | n/a | 0.033 | 3.800 | 0.318 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000595 | 11.817 | 2.717 | 0.005 | 0.000 | 0.225 | 0.895 | 1.422 | 0.052 | 0.000 | 0.408 | 6.054 | n/a | n/a | 0.039 | 2.946 | 0.249 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000591 | 11.770 | 2.768 | 0.004 | 0.000 | 0.213 | 0.495 | 0.946 | 0.023 | 0.000 | 1.541 | 5.751 | n/a | n/a | 0.028 | 2.986 | 0.254 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005a6 | 11.413 | 3.592 | 0.005 | 0.000 | 0.389 | 0.652 | 1.168 | 0.026 | 0.000 | 0.718 | 4.826 | n/a | n/a | 0.036 | 3.986 | 0.349 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005ac | 10.659 | 3.348 | 0.005 | 0.000 | 0.644 | 0.651 | 0.851 | 0.023 | 0.000 | 0.152 | 4.902 | n/a | n/a | 0.083 | 3.997 | 0.375 | 0.083 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.014 | n/a | n/a | n/a | 27.889 | 17.210 | 1.958 | 0.000 | 0.899 | 12.486 | 0.005 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.009 | 50.846 | 0.744 | 0.009 |
| p99 | 356.805 | n/a | n/a | n/a | 133.510 | 225.088 | 33.391 | 0.000 | 226.694 | 85.919 | 96.255 | 10.329 | 0.539 | 0.000 | n/a | n/a | 0.026 | 229.662 | 1.000 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000001092 | 356.805 | 17.846 | 5.816 | 2.406 | 0.000 | 226.694 | 7.768 | 96.255 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.009 | 26.068 | 0.073 | 0.009 | node-14/thread-0/socket.wait-first-byte | client.parse 6.510ms; driver.publication 1.766ms; driver.publication 1.420ms; driver.publication 1.311ms; driver.publication 1.118ms |
| 0302ed3e02af441a0000000000001091 | 342.012 | 20.378 | 9.672 | 0.000 | 0.000 | 210.500 | 15.167 | 86.274 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.011 | 30.051 | 0.088 | 0.011 | node-14/thread-0/socket.wait-first-byte | client.parse 6.510ms; driver.publication 1.766ms; driver.publication 1.420ms; driver.publication 1.311ms; driver.publication 1.118ms |
| 0302ed3e02af441a000000000000108f | 312.153 | 133.510 | 57.535 | 33.391 | 0.000 | 1.769 | 85.919 | 0.006 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.010 | 224.437 | 0.719 | 0.010 | node-14/thread-0/client.reach | driver.publication 1.420ms; driver.publication 1.311ms; driver.publication 1.118ms; driver.publication 1.072ms; driver.publication 1.052ms |
| 0302ed3e02af441a00000000000010a0 | 229.688 | 4.574 | 225.088 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 229.662 | 1.000 | 0.026 | node-14/thread-0/rpc.replica.observe | client.parse 6.510ms |
| 0302ed3e02af441a0000000000001caf | 140.008 | 27.889 | 28.866 | 2.249 | 0.000 | 68.489 | 12.486 | 0.005 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.014 | 59.005 | 0.421 | 0.014 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0302ed3e02af441a000000000000190b | 119.859 | 31.808 | 61.271 | 0.786 | 0.000 | 0.899 | 25.075 | 0.005 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.007 | 93.865 | 0.783 | 0.007 | node-14/thread-0/rpc.replica.observe | driver.publication 2.441ms; driver.publication 1.992ms; driver.publication 1.244ms |
| 0302ed3e02af441a0000000000000eb7 | 112.386 | 29.200 | 12.062 | 2.372 | 0.000 | 1.165 | 53.404 | 14.167 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.010 | 43.634 | 0.388 | 0.010 | gw-w/thread-51/gateway.admitted-work | driver.publication 1.135ms; driver.publication 1.059ms |
| 0302ed3e02af441a0000000000001cb1 | 107.659 | 29.139 | 34.052 | 2.479 | 0.000 | 39.017 | 2.954 | 0.004 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.007 | 65.671 | 0.610 | 0.007 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0302ed3e02af441a0000000000001772 | 102.024 | 40.960 | 31.427 | 5.990 | 0.000 | 0.503 | 12.797 | 0.004 | 10.329 | 0.006 | 0.000 | n/a | n/a | 0.007 | 78.377 | 0.768 | 0.007 | node-14/thread-0/rpc.replica.observe | none observed |
| 0302ed3e02af441a0000000000001ca9 | 92.162 | 28.491 | 21.941 | 0.000 | 0.000 | 15.271 | 18.964 | 6.946 | 0.000 | 0.539 | 0.000 | n/a | n/a | 0.009 | 50.432 | 0.547 | 0.009 | node-14/thread-0/rpc.replica.observe | none observed |
| 0302ed3e02af441a0000000000001ae1 | 87.869 | 20.670 | 13.999 | 1.828 | 0.000 | 39.242 | 12.105 | 0.004 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.010 | 36.497 | 0.415 | 0.010 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0302ed3e02af441a0000000000001615 | 78.014 | 39.635 | 23.332 | 1.958 | 0.000 | 0.726 | 12.322 | 0.011 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.006 | 64.924 | 0.832 | 0.006 | node-14/thread-0/client.reach | none observed |
| 0302ed3e02af441a0000000000001df2 | 76.607 | 39.406 | 18.599 | 2.815 | 0.000 | 0.569 | 15.184 | 0.008 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.008 | 60.820 | 0.794 | 0.008 | node-14/thread-0/client.reach | none observed |
| 0302ed3e02af441a0000000000001908 | 74.943 | 32.105 | 16.562 | 2.179 | 0.000 | 4.155 | 19.910 | 0.008 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.008 | 50.846 | 0.678 | 0.008 | gw-w/thread-51/gateway.admitted-work | none observed |
| 0302ed3e02af441a00000000000012a1 | 73.114 | 31.613 | 20.081 | 2.701 | 0.000 | 2.200 | 16.493 | 0.005 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.006 | 54.395 | 0.744 | 0.006 | node-14/thread-0/rpc.replica.observe | driver.publication 1.205ms |
| 0302ed3e02af441a0000000000001ae0 | 66.067 | 37.531 | 17.210 | 2.514 | 0.000 | 0.707 | 8.080 | 0.005 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.007 | 57.255 | 0.867 | 0.007 | node-14/thread-0/client.reach | none observed |
| 0302ed3e02af441a0000000000000559 | 61.454 | 19.090 | 6.929 | 1.504 | 0.000 | 0.899 | 32.989 | 0.005 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.021 | 27.524 | 0.448 | 0.021 | gw-w/thread-54/gateway.admitted-work | none observed |
| 0302ed3e02af441a000000000000165a | 58.411 | 25.614 | 32.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 58.391 | 1.000 | 0.020 | node-14/thread-0/rpc.replica.observe | driver.publication 3.377ms |
| 0302ed3e02af441a0000000000001cab | 49.827 | 20.477 | 15.000 | 2.779 | 0.000 | 2.638 | 8.739 | 0.005 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.007 | 38.256 | 0.768 | 0.007 | node-14/thread-0/rpc.replica.observe | none observed |
| 0302ed3e02af441a000000000000051b | 42.370 | 13.671 | 1.600 | 0.000 | 0.000 | 0.758 | 26.127 | 0.008 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.011 | 15.271 | 0.360 | 0.011 | gw-w/thread-53/gateway.admitted-work | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.200 | 0.551 | 0.000 | 1.183 | 3.541 | 0.010 | 0.000 | 0.193 | 0.930 | 1.963 | 0.031 | 0.000 | 0.254 | 7.617 | n/a | n/a | 0.044 | 3.946 | 0.261 | 0.044 |
| p99 | 55.737 | 2.057 | 0.009 | 3.280 | 5.873 | n/a | 0.000 | 1.085 | 2.299 | 12.756 | 0.992 | 16.023 | 1.144 | 46.002 | n/a | n/a | 0.104 | 6.550 | 0.478 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a00000000000005d6 | 55.737 | 3.074 | 0.202 | 0.000 | 0.063 | 0.998 | 5.152 | 0.028 | 0.000 | 0.176 | 46.002 | n/a | n/a | 0.043 | 3.339 | 0.060 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000609 | 41.087 | 3.906 | 0.180 | 0.000 | 0.058 | 1.046 | 9.001 | 0.029 | 16.023 | 0.427 | 10.383 | n/a | n/a | 0.036 | 4.144 | 0.101 | 0.036 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 0302ed3e02af441a00000000000005c4 | 34.368 | 3.599 | 0.205 | 0.000 | 0.067 | 1.118 | 9.027 | 0.026 | 0.000 | 0.395 | 19.889 | n/a | n/a | 0.042 | 3.872 | 0.113 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005b9 | 31.573 | 3.280 | 0.327 | 0.000 | 0.064 | 1.302 | 10.292 | 0.031 | 0.000 | 0.165 | 16.064 | n/a | n/a | 0.046 | 3.671 | 0.116 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005ee | 29.735 | 4.323 | 0.265 | 0.000 | 0.070 | 1.678 | 12.756 | 0.043 | 0.000 | 0.449 | 10.091 | n/a | n/a | 0.059 | 4.658 | 0.157 | 0.059 | gw-w/thread-54/gateway.admitted-work | none observed |
| 0302ed3e02af441a00000000000005e4 | 28.989 | 3.842 | 0.181 | 0.000 | 0.057 | 1.127 | 12.469 | 0.035 | 0.000 | 0.192 | 11.044 | n/a | n/a | 0.043 | 4.080 | 0.141 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000601 | 27.372 | 3.463 | 0.212 | 0.000 | 0.122 | 1.610 | 6.383 | 0.028 | 0.000 | 0.173 | 15.317 | n/a | n/a | 0.064 | 3.797 | 0.139 | 0.064 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005cc | 26.195 | 4.198 | 0.296 | 0.000 | 0.076 | 1.911 | 5.679 | 0.056 | 0.000 | 0.323 | 13.617 | n/a | n/a | 0.040 | 4.570 | 0.174 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a0000000000000607 | 25.604 | 3.337 | 0.270 | 0.000 | 0.060 | 1.380 | 8.516 | 0.115 | 0.000 | 0.168 | 11.664 | n/a | n/a | 0.093 | 3.667 | 0.143 | 0.093 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005e6 | 25.366 | 4.246 | 0.228 | 0.000 | 0.109 | 1.480 | 4.564 | 0.030 | 0.000 | 0.382 | 14.273 | n/a | n/a | 0.054 | 4.583 | 0.181 | 0.054 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005bf | 23.365 | 5.311 | 0.005 | 0.000 | 0.600 | 0.980 | 1.824 | 0.085 | 0.000 | 1.144 | 13.350 | n/a | n/a | 0.065 | 5.916 | 0.253 | 0.065 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005ca | 22.862 | 3.300 | 0.215 | 0.000 | 0.064 | 1.081 | 9.431 | 0.042 | 0.000 | 0.205 | 8.485 | n/a | n/a | 0.040 | 3.579 | 0.157 | 0.040 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005ba | 22.850 | 3.430 | 0.005 | 0.000 | 1.085 | 0.728 | 4.781 | 0.026 | 0.000 | 0.165 | 12.587 | n/a | n/a | 0.043 | 4.520 | 0.198 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005f2 | 19.531 | 3.299 | 0.217 | 0.000 | 0.065 | 0.960 | 4.709 | 0.051 | 0.000 | 0.353 | 9.838 | n/a | n/a | 0.039 | 3.582 | 0.183 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005bd | 19.196 | 3.764 | 0.283 | 0.000 | 0.069 | 1.538 | 5.182 | 0.031 | 0.000 | 0.465 | 7.825 | n/a | n/a | 0.039 | 4.116 | 0.214 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005fc | 18.477 | 3.474 | 0.280 | 0.000 | 0.060 | 1.113 | 5.608 | 0.027 | 0.000 | 0.155 | 7.710 | n/a | n/a | 0.049 | 3.815 | 0.206 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005da | 18.271 | 3.284 | 0.209 | 0.000 | 0.067 | 1.067 | 5.516 | 0.033 | 0.000 | 0.495 | 7.547 | n/a | n/a | 0.053 | 3.560 | 0.195 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005de | 18.115 | 3.576 | 0.356 | 0.000 | 0.121 | 1.022 | 4.845 | 0.030 | 0.000 | 0.412 | 7.676 | n/a | n/a | 0.077 | 4.052 | 0.224 | 0.077 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005f9 | 17.270 | 5.300 | 0.006 | 0.000 | 0.785 | 0.809 | 2.437 | 0.053 | 0.000 | 0.674 | 7.162 | n/a | n/a | 0.043 | 6.091 | 0.353 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005c1 | 16.548 | 4.559 | 0.006 | 0.000 | 0.939 | 0.783 | 1.963 | 0.043 | 0.000 | 0.966 | 7.247 | n/a | n/a | 0.041 | 5.504 | 0.333 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.380 | 0.593 | 0.000 | 1.621 | 3.204 | 0.005 | 0.000 | 0.447 | 0.660 | 1.220 | 0.034 | 0.000 | 0.226 | 5.988 | n/a | n/a | 0.041 | 3.875 | 0.318 | 0.041 |
| p99 | 17.270 | 1.895 | 0.008 | 2.944 | 5.300 | n/a | 0.000 | 1.074 | 2.299 | 5.191 | 0.992 | 0.000 | 0.674 | 10.384 | n/a | n/a | 0.104 | 6.091 | 0.401 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a00000000000005f9 | 17.270 | 5.300 | 0.006 | 0.000 | 0.785 | 0.809 | 2.437 | 0.053 | 0.000 | 0.674 | 7.162 | n/a | n/a | 0.043 | 6.091 | 0.353 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005ef | 16.200 | 4.340 | 0.009 | 0.000 | 0.809 | 0.871 | 0.889 | 0.992 | 0.000 | 0.224 | 8.011 | n/a | n/a | 0.055 | 5.158 | 0.318 | 0.055 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005d3 | 16.029 | 2.802 | 0.005 | 0.000 | 0.294 | 0.839 | 1.399 | 0.065 | 0.000 | 0.199 | 10.384 | n/a | n/a | 0.041 | 3.101 | 0.193 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005d7 | 14.858 | 3.204 | 0.005 | 0.000 | 0.666 | 0.528 | 0.897 | 0.023 | 0.000 | 0.196 | 9.299 | n/a | n/a | 0.040 | 3.875 | 0.261 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005f3 | 13.478 | 3.323 | 0.005 | 0.000 | 1.074 | 0.598 | 0.904 | 0.036 | 0.000 | 0.226 | 7.276 | n/a | n/a | 0.036 | 4.402 | 0.327 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005cf | 12.596 | 3.451 | 0.005 | 0.000 | 0.437 | 0.990 | 1.437 | 0.034 | 0.000 | 0.202 | 5.975 | n/a | n/a | 0.065 | 3.893 | 0.309 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005b6 | 12.424 | 2.901 | 0.005 | 0.000 | 1.040 | 0.930 | 1.269 | 0.034 | 0.000 | 0.388 | 5.815 | n/a | n/a | 0.041 | 3.946 | 0.318 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005cd | 12.380 | 2.769 | 0.005 | 0.000 | 0.404 | 0.694 | 1.455 | 0.044 | 0.000 | 0.277 | 6.694 | n/a | n/a | 0.038 | 3.177 | 0.257 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005eb | 12.229 | 4.448 | 0.008 | 0.000 | 0.443 | 0.655 | 1.220 | 0.022 | 0.000 | 0.442 | 4.929 | n/a | n/a | 0.061 | 4.899 | 0.401 | 0.061 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005c5 | 11.804 | 2.966 | 0.005 | 0.000 | 0.648 | 0.660 | 1.398 | 0.042 | 0.000 | 0.290 | 5.758 | n/a | n/a | 0.037 | 3.619 | 0.307 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005df | 11.696 | 3.405 | 0.009 | 0.000 | 0.409 | 0.591 | 0.837 | 0.024 | 0.000 | 0.394 | 5.988 | n/a | n/a | 0.038 | 3.823 | 0.327 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005b4 | 11.001 | 3.029 | 0.005 | 0.000 | 0.180 | 0.617 | 0.878 | 0.023 | 0.000 | 0.176 | 6.057 | n/a | n/a | 0.038 | 3.214 | 0.292 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005e8 | 10.909 | 3.710 | 0.005 | 0.000 | 0.447 | 0.645 | 0.854 | 0.023 | 0.000 | 0.465 | 4.712 | n/a | n/a | 0.049 | 4.161 | 0.381 | 0.049 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000005fd | 10.414 | 2.323 | n/a | 0.000 | 0.489 | 2.299 | 5.191 | 0.020 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.056 | 2.812 | 0.270 | 0.056 | gw-w/thread-47/storage/begin-command! | none observed |
| 0302ed3e02af441a00000000000005f7 | 8.915 | 2.695 | 0.005 | 0.000 | 0.149 | 0.608 | 0.852 | 0.022 | 0.000 | 0.204 | 4.275 | n/a | n/a | 0.104 | 2.849 | 0.320 | 0.104 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (842 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.188 | 0.756 | 0.000 | 1.606 | 3.427 | 0.005 | 0.000 | 0.738 | 0.781 | 1.148 | 0.028 | 0.000 | 0.271 | 6.863 | n/a | n/a | 0.036 | 4.468 | 0.300 | 0.036 |
| p99 | 56.915 | 2.770 | 2.265 | 4.578 | 8.787 | 0.802 | 0.000 | 19.016 | 10.808 | 8.592 | 4.292 | 0.000 | 4.147 | 41.410 | n/a | n/a | 0.087 | 23.641 | 0.689 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000b47 | 86.797 | 11.365 | 0.017 | 0.000 | 0.354 | 8.873 | 6.774 | 0.101 | 0.000 | 2.914 | 56.359 | n/a | n/a | 0.041 | 11.735 | 0.135 | 0.041 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.613ms; driver.publication 1.522ms; driver.publication 1.368ms; driver.publication 1.341ms; driver.publication 1.261ms |
| 0302ed3e02af441a0000000000000b43 | 76.441 | 4.567 | 0.008 | 0.000 | 48.035 | 2.431 | 0.938 | 0.031 | 0.000 | 1.355 | 19.045 | n/a | n/a | 0.032 | 52.610 | 0.688 | 0.032 | node-14/thread-0/driver.queue.subject | driver.publication 1.613ms; driver.publication 1.522ms; driver.publication 1.341ms; driver.publication 1.261ms; driver.publication 1.230ms |
| 0302ed3e02af441a0000000000000b46 | 75.324 | 5.171 | 0.005 | 0.000 | 46.754 | 4.151 | 7.322 | 0.051 | 0.000 | 0.196 | 11.645 | n/a | n/a | 0.029 | 51.930 | 0.689 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.613ms; driver.publication 1.522ms; driver.publication 1.368ms; driver.publication 1.341ms; driver.publication 1.261ms |
| 0302ed3e02af441a0000000000000644 | 68.482 | 6.426 | 0.023 | 0.000 | 0.317 | 2.826 | 0.941 | 0.034 | 0.000 | 2.942 | 54.911 | n/a | n/a | 0.061 | 6.767 | 0.099 | 0.061 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.110ms |
| 0302ed3e02af441a0000000000000645 | 65.642 | 5.268 | 0.013 | 0.000 | 0.884 | 4.779 | 3.672 | 0.047 | 0.000 | 0.536 | 50.411 | n/a | n/a | 0.033 | 6.165 | 0.094 | 0.033 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.169ms; driver.publication 1.110ms |
| 0302ed3e02af441a0000000000000b4c | 61.582 | 2.844 | 0.004 | 0.000 | 29.016 | 0.482 | 8.255 | 5.655 | 0.000 | 0.512 | 14.783 | n/a | n/a | 0.030 | 31.865 | 0.517 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.522ms; driver.publication 1.368ms; driver.publication 1.341ms; driver.publication 1.170ms; driver.publication 1.129ms |
| 0302ed3e02af441a00000000000006d4 | 57.722 | 3.429 | 0.004 | 0.000 | 1.254 | 0.988 | 0.942 | 0.028 | 0.000 | 0.479 | 50.571 | n/a | n/a | 0.026 | 4.688 | 0.081 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 0.729ms |
| 0302ed3e02af441a00000000000006d5 | 57.095 | 6.193 | 0.006 | 0.000 | 0.536 | 4.505 | 2.206 | 0.047 | 0.000 | 1.678 | 41.876 | n/a | n/a | 0.047 | 6.736 | 0.118 | 0.047 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.481ms |
| 0302ed3e02af441a000000000000065d | 56.915 | 2.648 | 0.004 | 0.000 | 29.978 | 0.511 | 1.672 | 2.143 | 0.000 | 1.014 | 18.908 | n/a | n/a | 0.037 | 32.630 | 0.573 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 1.208ms; driver.publication 1.137ms; driver.publication 1.017ms; driver.publication 1.007ms |
| 0302ed3e02af441a0000000000000b45 | 56.120 | 4.524 | 0.080 | 0.000 | 0.147 | 5.576 | 1.073 | 1.206 | 0.000 | 0.027 | 43.456 | n/a | n/a | 0.031 | 4.751 | 0.085 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.613ms; driver.publication 1.522ms; driver.publication 1.261ms; driver.publication 1.230ms |
| 0302ed3e02af441a0000000000000834 | 53.854 | 5.883 | 0.006 | 0.000 | 1.027 | 0.661 | 1.682 | 0.039 | 0.000 | 0.429 | 44.068 | n/a | n/a | 0.060 | 6.916 | 0.128 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a000000000000087f | 53.187 | 17.460 | 0.016 | 0.000 | 0.576 | 18.724 | 4.411 | 0.071 | 0.000 | 0.400 | 11.467 | n/a | n/a | 0.062 | 18.052 | 0.339 | 0.062 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.408ms; driver.publication 1.035ms |
| 0302ed3e02af441a0000000000000b44 | 52.772 | 3.113 | 0.003 | 0.000 | 2.662 | 9.704 | 0.565 | 0.648 | 0.000 | 0.025 | 36.028 | n/a | n/a | 0.024 | 5.778 | 0.109 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.613ms; driver.publication 1.261ms; driver.publication 1.230ms |
| 0302ed3e02af441a0000000000000b40 | 50.311 | 4.511 | 0.004 | 0.000 | 1.027 | 1.014 | 1.549 | 0.079 | 0.000 | 0.606 | 41.410 | n/a | n/a | 0.111 | 5.543 | 0.110 | 0.111 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 0302ed3e02af441a00000000000006d6 | 50.137 | 3.410 | 0.004 | 0.000 | 0.096 | 2.646 | 1.943 | 0.025 | 0.000 | 0.286 | 41.697 | n/a | n/a | 0.030 | 3.511 | 0.070 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 2.423ms; driver.publication 1.481ms; driver.expected-state.bind-receipt 1.212ms |
| 0302ed3e02af441a0000000000000b41 | 50.097 | 4.288 | 0.003 | 0.000 | 1.193 | 3.281 | 0.834 | 0.019 | 0.000 | 0.094 | 40.328 | n/a | n/a | 0.058 | 5.484 | 0.109 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.230ms |
| 0302ed3e02af441a0000000000000b48 | 49.716 | 6.793 | 0.010 | 0.000 | 0.354 | 2.282 | 2.459 | 0.052 | 0.000 | 0.214 | 37.488 | n/a | n/a | 0.066 | 7.156 | 0.144 | 0.066 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.613ms; driver.publication 1.522ms; driver.publication 1.341ms; driver.publication 1.261ms; driver.publication 1.230ms |
| 0302ed3e02af441a0000000000000649 | 49.615 | 2.905 | 0.005 | 0.000 | 0.767 | 5.947 | 0.752 | 0.047 | 0.000 | 3.386 | 35.777 | n/a | n/a | 0.030 | 3.677 | 0.074 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.307ms; driver.publication 1.169ms |
| 0302ed3e02af441a0000000000000b42 | 48.284 | 5.296 | 0.004 | 0.000 | 0.568 | 4.070 | 8.222 | 0.019 | 0.000 | 0.155 | 29.911 | n/a | n/a | 0.040 | 5.868 | 0.122 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.613ms; driver.publication 1.230ms |
| 0302ed3e02af441a0000000000000697 | 47.204 | 3.463 | 0.005 | 0.000 | 26.490 | 2.402 | 1.417 | 0.028 | 0.000 | 0.198 | 13.172 | n/a | n/a | 0.030 | 29.957 | 0.635 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 2.476ms; driver.publication 1.770ms; driver.publication 1.635ms; driver.publication 1.548ms; driver.publication 1.503ms |

## P2 / L1024 / commit / 5-10 facts (489 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.505 | 0.650 | 0.000 | 1.483 | 3.059 | 0.005 | 0.000 | 0.738 | 0.765 | 0.976 | 0.028 | 0.000 | 0.302 | 6.428 | n/a | n/a | 0.035 | 3.917 | 0.288 | 0.035 |
| p99 | 52.772 | 2.179 | 0.342 | 4.051 | 6.531 | 0.118 | 0.000 | 25.709 | 8.782 | 8.152 | 5.655 | 0.000 | 4.391 | 35.777 | n/a | n/a | 0.078 | 29.048 | 0.688 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000b43 | 76.441 | 4.567 | 0.008 | 0.000 | 48.035 | 2.431 | 0.938 | 0.031 | 0.000 | 1.355 | 19.045 | n/a | n/a | 0.032 | 52.610 | 0.688 | 0.032 | node-14/thread-0/driver.queue.subject | driver.publication 1.613ms; driver.publication 1.522ms; driver.publication 1.341ms; driver.publication 1.261ms; driver.publication 1.230ms |
| 0302ed3e02af441a0000000000000b4c | 61.582 | 2.844 | 0.004 | 0.000 | 29.016 | 0.482 | 8.255 | 5.655 | 0.000 | 0.512 | 14.783 | n/a | n/a | 0.030 | 31.865 | 0.517 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.522ms; driver.publication 1.368ms; driver.publication 1.341ms; driver.publication 1.170ms; driver.publication 1.129ms |
| 0302ed3e02af441a00000000000006d4 | 57.722 | 3.429 | 0.004 | 0.000 | 1.254 | 0.988 | 0.942 | 0.028 | 0.000 | 0.479 | 50.571 | n/a | n/a | 0.026 | 4.688 | 0.081 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 0.729ms |
| 0302ed3e02af441a000000000000065d | 56.915 | 2.648 | 0.004 | 0.000 | 29.978 | 0.511 | 1.672 | 2.143 | 0.000 | 1.014 | 18.908 | n/a | n/a | 0.037 | 32.630 | 0.573 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 1.208ms; driver.publication 1.137ms; driver.publication 1.017ms; driver.publication 1.007ms |
| 0302ed3e02af441a0000000000000b44 | 52.772 | 3.113 | 0.003 | 0.000 | 2.662 | 9.704 | 0.565 | 0.648 | 0.000 | 0.025 | 36.028 | n/a | n/a | 0.024 | 5.778 | 0.109 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.613ms; driver.publication 1.261ms; driver.publication 1.230ms |
| 0302ed3e02af441a0000000000000649 | 49.615 | 2.905 | 0.005 | 0.000 | 0.767 | 5.947 | 0.752 | 0.047 | 0.000 | 3.386 | 35.777 | n/a | n/a | 0.030 | 3.677 | 0.074 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.307ms; driver.publication 1.169ms |
| 0302ed3e02af441a000000000000064a | 47.159 | 2.925 | 0.006 | 0.000 | 0.532 | 0.738 | 1.668 | 0.067 | 0.000 | 0.453 | 40.703 | n/a | n/a | 0.066 | 3.464 | 0.073 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.307ms; driver.publication 1.191ms; driver.publication 1.169ms |
| 0302ed3e02af441a000000000000073e | 45.035 | 3.335 | 0.004 | 0.000 | 25.709 | 1.885 | 0.974 | 0.028 | 0.000 | 1.074 | 11.985 | n/a | n/a | 0.041 | 29.048 | 0.645 | 0.041 | node-14/thread-0/driver.queue.subject | driver.publication 1.394ms; driver.publication 1.362ms; driver.expected-state.bind-receipt 1.087ms; driver.publication 1.033ms; driver.publication 1.027ms |
| 0302ed3e02af441a0000000000000835 | 44.560 | 4.807 | 0.012 | 0.000 | 0.377 | 0.905 | 1.654 | 0.039 | 0.000 | 0.324 | 36.380 | n/a | n/a | 0.061 | 5.196 | 0.117 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.551ms |
| 0302ed3e02af441a000000000000079b | 44.354 | 4.111 | 0.094 | 0.000 | 0.893 | 2.078 | 0.782 | 1.728 | 0.000 | 0.076 | 34.558 | n/a | n/a | 0.034 | 5.098 | 0.115 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 2.009ms; driver.publication 1.762ms |
| 0302ed3e02af441a0000000000000837 | 42.111 | 3.063 | 0.005 | 0.000 | 26.584 | 0.550 | 1.209 | 0.046 | 0.000 | 1.470 | 9.144 | n/a | n/a | 0.041 | 29.651 | 0.704 | 0.041 | node-14/thread-0/driver.queue.subject | driver.publication 1.551ms; driver.publication 1.545ms; driver.publication 1.242ms |
| 0302ed3e02af441a0000000000000b52 | 39.095 | 2.506 | 0.002 | 0.000 | 3.628 | 0.894 | 1.241 | 11.495 | 0.000 | 1.420 | 17.881 | n/a | n/a | 0.028 | 6.136 | 0.157 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.291ms; driver.publication 1.094ms; driver.publication 1.036ms |
| 0302ed3e02af441a0000000000000b53 | 38.962 | 2.570 | 0.064 | 0.000 | 2.199 | 3.301 | 4.959 | 6.820 | 0.000 | 0.090 | 18.944 | n/a | n/a | 0.015 | 4.833 | 0.124 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.094ms; driver.publication 1.036ms |
| 0302ed3e02af441a000000000000071c | 38.281 | 7.388 | 0.059 | 0.000 | 0.780 | 2.743 | 12.014 | 0.083 | 0.000 | 2.919 | 12.242 | n/a | n/a | 0.052 | 8.226 | 0.215 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.291ms |
| 0302ed3e02af441a000000000000083d | 36.292 | 2.283 | 0.002 | 0.000 | 0.847 | 0.937 | 0.697 | 0.661 | 0.000 | 0.164 | 30.681 | n/a | n/a | 0.021 | 3.132 | 0.086 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.096ms; driver.publication 1.032ms |
| 0302ed3e02af441a0000000000000a71 | 36.277 | 4.255 | n/a | 0.000 | 1.133 | 15.335 | 15.457 | 0.018 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.047 | 5.388 | 0.149 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.476ms; driver.publication 1.292ms; driver.publication 1.160ms; driver.publication 1.016ms; driver.expected-state.bind-receipt 1.007ms |
| 0302ed3e02af441a0000000000000691 | 36.234 | 5.396 | 0.007 | 0.000 | 0.894 | 2.267 | 5.139 | 0.068 | 0.000 | 2.143 | 20.265 | n/a | n/a | 0.054 | 6.297 | 0.174 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.727ms |
| 0302ed3e02af441a0000000000000c0d | 35.985 | 3.763 | 0.003 | 0.000 | 5.456 | 8.602 | 0.754 | 0.020 | 0.000 | 0.308 | 17.051 | n/a | n/a | 0.029 | 9.222 | 0.256 | 0.029 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.668ms; driver.publication 1.252ms; driver.publication 1.061ms |
| 0302ed3e02af441a000000000000073f | 35.360 | 2.947 | 0.004 | 0.000 | 15.350 | 5.108 | 0.854 | 0.027 | 0.000 | 0.145 | 10.894 | n/a | n/a | 0.031 | 18.302 | 0.518 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 1.362ms; driver.publication 1.033ms; driver.publication 1.027ms |
| 0302ed3e02af441a000000000000065b | 35.036 | 3.908 | 0.009 | 0.000 | 0.501 | 0.751 | 1.074 | 0.023 | 0.000 | 4.890 | 23.832 | n/a | n/a | 0.047 | 4.418 | 0.126 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.272 | 0.255 | 0.000 | 1.561 | 2.921 | 0.005 | 0.000 | 0.792 | 5.261 | 0.551 | 0.014 | 0.000 | 0.040 | 12.650 | n/a | n/a | 0.039 | 3.717 | 0.167 | 0.039 |
| p99 | 22.272 | 0.255 | 0.000 | 1.561 | 2.921 | 0.005 | 0.000 | 0.792 | 5.261 | 0.551 | 0.014 | 0.000 | 0.040 | 12.650 | n/a | n/a | 0.039 | 3.717 | 0.167 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a0000000000000c8c | 22.272 | 2.921 | 0.005 | 0.000 | 0.792 | 5.261 | 0.551 | 0.014 | 0.000 | 0.040 | 12.650 | n/a | n/a | 0.039 | 3.717 | 0.167 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.474ms; driver.publication 1.385ms |

## P2 / tail / commit (2624 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.457 | 0.705 | 0.000 | 1.598 | 3.457 | 0.005 | 0.000 | 0.756 | 0.670 | 1.090 | 0.027 | 0.000 | 0.197 | 6.021 | n/a | n/a | 0.031 | 4.414 | 0.336 | 0.031 |
| p99 | 77.853 | 2.736 | 2.146 | 5.007 | 9.239 | 1.470 | 0.000 | 30.855 | 20.532 | 8.050 | 2.988 | 0.000 | 3.232 | 24.671 | n/a | n/a | 0.085 | 40.071 | 0.729 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a00000000000010a3 | 305.971 | 16.375 | 11.367 | 1.080 | 181.078 | 45.962 | 2.164 | 23.843 | 0.000 | 0.399 | 23.683 | n/a | n/a | 0.021 | 209.901 | 0.686 | 0.021 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.891ms; driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a5 | 273.437 | 3.112 | 12.078 | 0.000 | 222.807 | 4.730 | 1.002 | 20.097 | 0.000 | 0.224 | 9.348 | n/a | n/a | 0.039 | 237.996 | 0.870 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a8 | 250.492 | 3.843 | 0.007 | 0.000 | 239.682 | 1.003 | 1.433 | 0.032 | 0.000 | 0.449 | 4.013 | n/a | n/a | 0.030 | 243.532 | 0.972 | 0.030 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.891ms; driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a2 | 247.771 | 7.235 | 2.085 | 1.080 | 188.395 | 31.659 | 0.812 | 2.749 | 0.000 | 0.677 | 13.061 | n/a | n/a | 0.018 | 198.795 | 0.802 | 0.018 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a1 | 246.583 | 8.015 | 0.009 | 0.000 | 189.221 | 33.594 | 2.664 | 0.011 | 0.000 | 1.173 | 11.855 | n/a | n/a | 0.042 | 197.245 | 0.800 | 0.042 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms |
| 0302ed3e02af441a00000000000010a4 | 243.106 | 7.865 | 2.313 | 1.080 | 180.261 | 34.464 | 0.671 | 1.502 | 0.000 | 0.073 | 14.862 | n/a | n/a | 0.014 | 191.519 | 0.788 | 0.014 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.060ms |
| 0302ed3e02af441a000000000000109f | 241.779 | 6.189 | 0.009 | 0.000 | 0.477 | 221.595 | 1.352 | 0.028 | 0.000 | 0.668 | 11.420 | n/a | n/a | 0.041 | 6.675 | 0.028 | 0.041 | node-14/thread-0/socket.wait-first-byte | client.parse 6.510ms; driver.publication 1.311ms |
| 0302ed3e02af441a00000000000010a6 | 207.841 | 8.216 | 2.294 | 1.080 | 143.632 | 33.458 | 0.453 | 3.010 | 0.000 | 0.068 | 15.617 | n/a | n/a | 0.011 | 155.223 | 0.747 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a7 | 199.254 | 8.132 | 2.323 | 1.080 | 134.045 | 35.009 | 0.443 | 2.052 | 0.000 | 0.334 | 15.828 | n/a | n/a | 0.009 | 145.580 | 0.731 | 0.009 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a9 | 190.118 | 2.248 | 0.004 | 0.000 | 181.023 | 1.387 | 1.740 | 0.026 | 0.000 | 0.278 | 3.384 | n/a | n/a | 0.028 | 183.275 | 0.964 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 1.891ms; driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010aa | 170.126 | 2.318 | 10.783 | 0.000 | 117.093 | 9.636 | 0.560 | 20.162 | 0.000 | 0.238 | 9.314 | n/a | n/a | 0.022 | 130.194 | 0.765 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010ab | 156.787 | 10.023 | 2.090 | 1.080 | 55.600 | 58.278 | 1.420 | 0.012 | 0.000 | 1.441 | 26.824 | n/a | n/a | 0.019 | 68.793 | 0.439 | 0.019 | node-14/thread-0/socket.queue-and-write | driver.publication 1.766ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010ac | 155.533 | 2.177 | 0.003 | 0.000 | 145.365 | 0.881 | 0.956 | 0.032 | 0.000 | 0.890 | 5.207 | n/a | n/a | 0.023 | 147.544 | 0.949 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication 1.891ms; driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.181ms; driver.publication 1.110ms |
| 0302ed3e02af441a0000000000001cb6 | 115.255 | 2.487 | 0.006 | 0.000 | 39.823 | 64.679 | 1.625 | 0.015 | 0.000 | 0.696 | 5.901 | n/a | n/a | 0.024 | 42.316 | 0.367 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0302ed3e02af441a0000000000001cb2 | 109.000 | 2.546 | 0.004 | 0.000 | 26.746 | 64.637 | 0.800 | 0.025 | 0.000 | 3.232 | 10.980 | n/a | n/a | 0.029 | 29.296 | 0.269 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0302ed3e02af441a0000000000001773 | 108.547 | 9.553 | 0.006 | 0.000 | 0.821 | 65.268 | 4.534 | 0.021 | 0.000 | 0.094 | 28.201 | n/a | n/a | 0.050 | 10.380 | 0.096 | 0.050 | node-14/thread-0/socket.wait-first-byte | client.parse 1.608ms |
| 0302ed3e02af441a0000000000001dfb | 106.221 | 4.322 | 0.008 | 0.000 | 3.025 | 0.775 | 2.586 | 0.065 | 0.000 | 0.574 | 94.826 | n/a | n/a | 0.040 | 7.354 | 0.069 | 0.040 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.323ms; driver.publication 1.032ms |
| 0302ed3e02af441a0000000000001775 | 103.983 | 3.017 | 0.004 | 0.000 | 0.377 | 91.806 | 1.970 | 0.076 | 0.000 | 6.670 | 0.028 | n/a | n/a | 0.035 | 3.398 | 0.033 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.002ms; driver.expected-state.bind-receipt 1.689ms; client.parse 1.608ms |
| 0302ed3e02af441a0000000000001776 | 101.821 | 3.637 | 0.006 | 0.000 | 0.573 | 89.436 | 1.069 | 2.151 | 0.000 | 0.372 | 4.549 | n/a | n/a | 0.029 | 4.215 | 0.041 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.002ms; driver.expected-state.bind-receipt 1.689ms; client.parse 1.608ms; driver.publication 1.274ms |
| 0302ed3e02af441a0000000000001cb9 | 101.634 | 6.728 | 0.010 | 0.000 | 81.355 | 0.734 | 6.460 | 0.018 | 0.000 | 0.397 | 5.903 | n/a | n/a | 0.029 | 88.093 | 0.867 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.279ms; driver.publication 1.021ms |

## P2 / tail / commit / 5-10 facts (1558 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.078 | 0.603 | 0.000 | 1.462 | 3.039 | 0.005 | 0.000 | 0.758 | 0.666 | 0.923 | 0.026 | 0.000 | 0.197 | 5.560 | n/a | n/a | 0.031 | 3.918 | 0.327 | 0.031 |
| p99 | 76.011 | 2.171 | 1.843 | 4.810 | 8.132 | 0.812 | 0.000 | 29.474 | 20.101 | 4.906 | 3.369 | 0.000 | 3.568 | 24.284 | n/a | n/a | 0.087 | 34.140 | 0.747 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0302ed3e02af441a00000000000010a8 | 250.492 | 3.843 | 0.007 | 0.000 | 239.682 | 1.003 | 1.433 | 0.032 | 0.000 | 0.449 | 4.013 | n/a | n/a | 0.030 | 243.532 | 0.972 | 0.030 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.891ms; driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a2 | 247.771 | 7.235 | 2.085 | 1.080 | 188.395 | 31.659 | 0.812 | 2.749 | 0.000 | 0.677 | 13.061 | n/a | n/a | 0.018 | 198.795 | 0.802 | 0.018 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a4 | 243.106 | 7.865 | 2.313 | 1.080 | 180.261 | 34.464 | 0.671 | 1.502 | 0.000 | 0.073 | 14.862 | n/a | n/a | 0.014 | 191.519 | 0.788 | 0.014 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a6 | 207.841 | 8.216 | 2.294 | 1.080 | 143.632 | 33.458 | 0.453 | 3.010 | 0.000 | 0.068 | 15.617 | n/a | n/a | 0.011 | 155.223 | 0.747 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a7 | 199.254 | 8.132 | 2.323 | 1.080 | 134.045 | 35.009 | 0.443 | 2.052 | 0.000 | 0.334 | 15.828 | n/a | n/a | 0.009 | 145.580 | 0.731 | 0.009 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010a9 | 190.118 | 2.248 | 0.004 | 0.000 | 181.023 | 1.387 | 1.740 | 0.026 | 0.000 | 0.278 | 3.384 | n/a | n/a | 0.028 | 183.275 | 0.964 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 1.891ms; driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010aa | 170.126 | 2.318 | 10.783 | 0.000 | 117.093 | 9.636 | 0.560 | 20.162 | 0.000 | 0.238 | 9.314 | n/a | n/a | 0.022 | 130.194 | 0.765 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a00000000000010ac | 155.533 | 2.177 | 0.003 | 0.000 | 145.365 | 0.881 | 0.956 | 0.032 | 0.000 | 0.890 | 5.207 | n/a | n/a | 0.023 | 147.544 | 0.949 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication 1.891ms; driver.publication 1.766ms; driver.publication 1.335ms; driver.publication 1.181ms; driver.publication 1.110ms |
| 0302ed3e02af441a0000000000001cb6 | 115.255 | 2.487 | 0.006 | 0.000 | 39.823 | 64.679 | 1.625 | 0.015 | 0.000 | 0.696 | 5.901 | n/a | n/a | 0.024 | 42.316 | 0.367 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0302ed3e02af441a0000000000001cb2 | 109.000 | 2.546 | 0.004 | 0.000 | 26.746 | 64.637 | 0.800 | 0.025 | 0.000 | 3.232 | 10.980 | n/a | n/a | 0.029 | 29.296 | 0.269 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0302ed3e02af441a0000000000001dfb | 106.221 | 4.322 | 0.008 | 0.000 | 3.025 | 0.775 | 2.586 | 0.065 | 0.000 | 0.574 | 94.826 | n/a | n/a | 0.040 | 7.354 | 0.069 | 0.040 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.323ms; driver.publication 1.032ms |
| 0302ed3e02af441a0000000000001775 | 103.983 | 3.017 | 0.004 | 0.000 | 0.377 | 91.806 | 1.970 | 0.076 | 0.000 | 6.670 | 0.028 | n/a | n/a | 0.035 | 3.398 | 0.033 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.002ms; driver.expected-state.bind-receipt 1.689ms; client.parse 1.608ms |
| 0302ed3e02af441a00000000000010ae | 96.706 | 4.311 | 16.005 | 0.000 | 44.491 | 0.850 | 0.600 | 1.839 | 0.000 | 0.771 | 27.794 | n/a | n/a | 0.046 | 64.807 | 0.670 | 0.046 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.766ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a0000000000001cb7 | 91.978 | 3.148 | 0.609 | 0.000 | 15.251 | 62.975 | 1.362 | 1.290 | 0.000 | 0.338 | 6.981 | n/a | n/a | 0.025 | 19.008 | 0.207 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0302ed3e02af441a0000000000001cbb | 87.980 | 2.747 | 0.006 | 0.000 | 69.586 | 6.449 | 3.210 | 0.012 | 0.000 | 0.343 | 5.602 | n/a | n/a | 0.025 | 72.339 | 0.822 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.021ms |
| 0302ed3e02af441a0000000000001778 | 76.011 | 5.989 | 1.222 | 2.282 | 38.144 | 15.213 | 0.577 | 0.026 | 0.000 | 0.104 | 12.416 | n/a | n/a | 0.038 | 47.637 | 0.627 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.002ms; driver.expected-state.bind-receipt 1.788ms; driver.expected-state.bind-receipt 1.689ms; driver.publication 1.511ms; driver.publication 1.501ms |
| 0302ed3e02af441a00000000000010af | 68.280 | 3.573 | 15.951 | 0.000 | 14.616 | 3.478 | 0.321 | 20.786 | 0.000 | 0.281 | 9.251 | n/a | n/a | 0.023 | 34.140 | 0.500 | 0.023 | gw-w/thread-50/gateway.commit-order-wait | driver.publication 1.335ms; driver.publication 1.110ms; driver.publication 1.060ms |
| 0302ed3e02af441a0000000000001dfe | 67.261 | 2.520 | 0.006 | 0.000 | 1.102 | 4.509 | 0.557 | 0.017 | 0.000 | 0.068 | 58.459 | n/a | n/a | 0.024 | 3.627 | 0.054 | 0.024 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.380ms; driver.publication 1.188ms |
| 0302ed3e02af441a000000000000153f | 62.838 | 4.337 | 0.006 | 0.000 | 0.714 | 22.370 | 2.652 | 2.145 | 0.000 | 1.912 | 28.665 | n/a | n/a | 0.038 | 5.057 | 0.080 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.475ms; driver.publication 1.272ms |
| 0302ed3e02af441a0000000000001785 | 62.401 | 9.195 | 0.014 | 0.000 | 13.828 | 11.835 | 2.999 | 0.077 | 0.000 | 1.028 | 23.393 | n/a | n/a | 0.032 | 23.038 | 0.369 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.445ms; driver.publication 1.279ms; driver.publication 1.269ms; driver.publication 1.137ms; driver.publication 1.084ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.335 | n/a | n/a | n/a | 0.055 | n/a | 0.000 | 0.000 | 0.831 | 200.617 | 0.009 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.118 | 0.055 | 0.000 | 0.118 |
| p99 | 202.667 | n/a | n/a | n/a | 19.380 | n/a | 1.165 | 0.000 | 5.480 | 201.200 | 0.102 | 47.153 | 0.142 | 0.000 | n/a | n/a | 0.407 | 19.380 | 0.291 | 0.407 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71ddfc02e8e5c7790000000000000007 | 202.667 | 0.052 | n/a | 0.000 | 0.000 | 1.091 | 201.200 | 0.014 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.168 | 0.052 | 0.000 | 0.168 | gw-r/thread-47/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000005 | 202.176 | 0.055 | n/a | 0.000 | 0.000 | 0.808 | 201.102 | 0.014 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.091 | 0.055 | 0.000 | 0.091 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f3a | 201.859 | 0.040 | n/a | 0.000 | 0.000 | 0.655 | 200.969 | 0.004 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.118 | 0.040 | 0.000 | 0.118 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000006 | 201.778 | 0.113 | n/a | 0.000 | 0.000 | 0.831 | 200.700 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.090 | 0.113 | 0.001 | 0.090 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f39 | 201.633 | 0.038 | n/a | 0.000 | 0.000 | 0.682 | 200.760 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.081 | 0.038 | 0.000 | 0.081 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f38 | 201.335 | 0.047 | n/a | 0.000 | 0.000 | 0.512 | 200.617 | 0.010 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.106 | 0.047 | 0.000 | 0.106 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd0000000000000002 | 173.480 | 1.946 | n/a | 0.000 | 0.000 | 1.384 | 152.554 | 0.102 | 17.008 | 0.079 | 0.000 | n/a | n/a | 0.407 | 1.946 | 0.011 | 0.407 | gw-r/thread-52/gateway.admitted-work | none observed |
| 71ddfc02e8e5c7790000000000000f3d | 134.857 | 19.380 | n/a | 0.000 | 0.000 | 5.480 | 62.634 | 0.004 | 47.153 | 0.003 | 0.000 | n/a | n/a | 0.202 | 19.380 | 0.144 | 0.202 | gw-r/thread-48/gateway.admitted-work | none observed |
| 71ddfc02e8e5c7790000000000000f3e | 67.023 | 17.292 | n/a | 0.000 | 0.000 | 4.241 | 45.139 | 0.014 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.314 | 17.292 | 0.258 | 0.314 | gw-r/thread-53/gateway.admitted-work | none observed |
| 71ddfc02e8e5c7790000000000000f3f | 63.087 | 17.189 | n/a | 1.165 | 0.000 | 2.908 | 41.631 | 0.003 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.186 | 18.354 | 0.291 | 0.186 | gw-r/thread-54/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 798.528 | n/a | n/a | n/a | 0.221 | n/a | 0.000 | 0.000 | 0.879 | 782.744 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.644 | 0.221 | 0.000 | 0.644 |
| p99 | 1005.111 | n/a | n/a | n/a | 10.325 | n/a | 3.850 | 0.000 | 1.373 | 1001.594 | 0.024 | 0.000 | 0.515 | 0.000 | n/a | n/a | 1.384 | 14.176 | 0.018 | 1.384 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1d6601045783b2bd00000000000000a4 | 1005.111 | 0.221 | n/a | 0.000 | 0.000 | 1.373 | 1001.594 | 0.024 | 0.000 | 0.515 | 0.000 | n/a | n/a | 1.384 | 0.221 | 0.000 | 1.384 | gw-r/thread-47/journal/page | none observed |
| 1d6601045783b2bd00000000000000a5 | 798.528 | 10.325 | n/a | 3.850 | 0.000 | 0.879 | 782.744 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.644 | 14.176 | 0.018 | 0.644 | gw-r/thread-53/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 446.427 | n/a | n/a | n/a | 2.644 | n/a | 0.000 | 0.000 | 0.731 | 441.114 | 0.012 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.084 | 2.644 | 0.008 | 0.084 |
| p99 | 1003.044 | n/a | n/a | n/a | 7.694 | n/a | 1.181 | 0.000 | 2.993 | 1000.930 | 0.522 | 0.000 | 0.277 | 0.000 | n/a | n/a | 1.115 | 7.694 | 0.553 | 1.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1d6601045783b2bd00000000000000bb | 1003.044 | 0.121 | n/a | 0.000 | 0.000 | 0.731 | 1000.930 | 0.025 | 0.000 | 0.122 | 0.000 | n/a | n/a | 1.115 | 0.121 | 0.000 | 1.115 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd00000000000000ae | 998.096 | 2.644 | n/a | 0.000 | 0.000 | 2.416 | 992.864 | 0.010 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.076 | 2.644 | 0.003 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 1d6601045783b2bd00000000000000d0 | 995.377 | 2.212 | n/a | 0.000 | 0.000 | 0.523 | 992.439 | 0.017 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.082 | 2.212 | 0.002 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 1d6601045783b2bd00000000000000ba | 994.650 | 7.694 | n/a | 0.000 | 0.000 | 0.792 | 985.895 | 0.030 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.140 | 7.694 | 0.008 | 0.140 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd00000000000000b4 | 983.880 | 2.450 | n/a | 0.000 | 0.000 | 0.648 | 980.608 | 0.015 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.085 | 2.450 | 0.002 | 0.085 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd00000000000000ab | 929.821 | 4.510 | n/a | 0.000 | 0.000 | 0.910 | 923.991 | 0.021 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.289 | 4.510 | 0.005 | 0.289 | gw-r/thread-47/journal/page | none observed |
| 1d6601045783b2bd00000000000000a8 | 881.907 | 1.897 | n/a | 0.000 | 0.000 | 0.574 | 879.246 | 0.011 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.107 | 1.897 | 0.002 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000000c2 | 854.721 | 5.992 | n/a | 0.000 | 0.000 | 1.599 | 846.943 | 0.010 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.112 | 5.992 | 0.007 | 0.112 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd00000000000000cb | 730.197 | 2.773 | n/a | 0.000 | 0.000 | 0.525 | 726.508 | 0.191 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.081 | 2.773 | 0.004 | 0.081 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000000b2 | 608.113 | 2.316 | n/a | 0.000 | 0.000 | 0.421 | 605.154 | 0.012 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.069 | 2.316 | 0.004 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd00000000000000c9 | 538.806 | 2.832 | n/a | 0.000 | 0.000 | 0.764 | 535.067 | 0.010 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.073 | 2.832 | 0.005 | 0.073 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000000c7 | 505.276 | 2.753 | n/a | 0.000 | 0.000 | 0.790 | 501.520 | 0.050 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.082 | 2.753 | 0.005 | 0.082 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000000c0 | 504.261 | 2.287 | n/a | 0.000 | 0.000 | 1.250 | 500.514 | 0.011 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.076 | 2.287 | 0.005 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000000c5 | 485.051 | 2.655 | n/a | 0.000 | 0.000 | 0.508 | 481.673 | 0.038 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.072 | 2.655 | 0.005 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000000c8 | 446.427 | 4.253 | n/a | 0.000 | 0.000 | 0.815 | 441.114 | 0.009 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.118 | 4.253 | 0.010 | 0.118 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd00000000000000b6 | 444.888 | 3.262 | n/a | 0.000 | 0.000 | 0.625 | 440.852 | 0.010 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.078 | 3.262 | 0.007 | 0.078 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd00000000000000a7 | 331.827 | 2.783 | n/a | 0.000 | 0.000 | 0.733 | 328.104 | 0.014 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.111 | 2.783 | 0.008 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 1d6601045783b2bd00000000000000b0 | 305.454 | 4.085 | n/a | 0.000 | 0.000 | 0.521 | 300.447 | 0.014 | 0.000 | 0.277 | 0.000 | n/a | n/a | 0.110 | 4.085 | 0.013 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000000b5 | 300.786 | 5.674 | n/a | 1.181 | 0.000 | 1.144 | 292.566 | 0.012 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.089 | 6.854 | 0.023 | 0.089 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000000cd | 268.639 | 2.372 | n/a | 0.000 | 0.000 | 0.989 | 265.128 | 0.012 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.082 | 2.372 | 0.009 | 0.082 | gw-r/thread-51/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 465.232 | n/a | n/a | n/a | 3.503 | n/a | 0.606 | 0.000 | 0.706 | 452.226 | 0.012 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.090 | 3.699 | 0.012 | 0.090 |
| p99 | 1005.776 | n/a | n/a | n/a | 15.805 | n/a | 1.388 | 0.000 | 3.503 | 1001.625 | 3.207 | 0.000 | 0.296 | 0.000 | n/a | n/a | 1.130 | 16.760 | 0.625 | 1.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1d6601045783b2bd00000000000000fe | 1005.776 | 2.605 | n/a | 0.627 | 0.000 | 0.578 | 1001.625 | 0.032 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.098 | 3.233 | 0.003 | 0.098 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd000000000000010d | 1003.475 | 0.125 | n/a | 0.000 | 0.000 | 1.508 | 1000.619 | 0.010 | 0.000 | 0.084 | 0.000 | n/a | n/a | 1.130 | 0.125 | 0.000 | 1.130 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd00000000000000d1 | 1002.725 | 0.138 | n/a | 0.000 | 0.000 | 0.613 | 1000.762 | 0.013 | 0.000 | 0.098 | 0.000 | n/a | n/a | 1.102 | 0.138 | 0.000 | 1.102 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd00000000000000d9 | 1001.081 | 5.134 | n/a | 0.662 | 0.000 | 0.889 | 993.925 | 0.028 | 0.000 | 0.296 | 0.000 | n/a | n/a | 0.146 | 5.797 | 0.006 | 0.146 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd0000000000000105 | 998.005 | 2.970 | n/a | 0.599 | 0.000 | 0.510 | 993.770 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.090 | 3.569 | 0.004 | 0.090 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000000df | 985.892 | 2.745 | n/a | 0.606 | 0.000 | 0.944 | 980.564 | 0.781 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.110 | 3.351 | 0.003 | 0.110 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000000d3 | 967.536 | 3.492 | n/a | 0.611 | 0.000 | 0.670 | 962.050 | 0.500 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.090 | 4.103 | 0.004 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd00000000000000de | 950.857 | 5.427 | n/a | 0.813 | 0.000 | 0.965 | 943.424 | 0.033 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.104 | 6.239 | 0.007 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd0000000000000100 | 947.482 | 3.503 | n/a | 0.000 | 0.000 | 0.887 | 942.889 | 0.012 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.070 | 3.503 | 0.004 | 0.070 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd00000000000000da | 943.322 | 4.021 | n/a | 0.647 | 0.000 | 0.990 | 934.302 | 3.207 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.080 | 4.668 | 0.005 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd00000000000000e0 | 878.409 | 7.285 | n/a | 0.790 | 0.000 | 0.625 | 869.558 | 0.008 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.108 | 8.075 | 0.009 | 0.108 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000000102 | 866.030 | 2.544 | n/a | 0.825 | 0.000 | 0.625 | 861.849 | 0.012 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.098 | 3.370 | 0.004 | 0.098 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd00000000000000e4 | 732.578 | 2.959 | n/a | 0.616 | 0.000 | 0.510 | 728.340 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.074 | 3.575 | 0.005 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000000eb | 670.654 | 4.599 | n/a | 1.067 | 0.000 | 0.711 | 664.046 | 0.010 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.165 | 5.666 | 0.008 | 0.165 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd00000000000000fb | 665.432 | 8.611 | n/a | 0.000 | 0.000 | 0.706 | 655.908 | 0.019 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.081 | 8.611 | 0.013 | 0.081 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd00000000000000db | 589.103 | 7.194 | n/a | 1.388 | 0.000 | 1.067 | 579.271 | 0.010 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.113 | 8.582 | 0.015 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000000e7 | 522.527 | 2.789 | n/a | 0.570 | 0.000 | 0.658 | 518.333 | 0.012 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.086 | 3.358 | 0.006 | 0.086 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000000dc | 487.413 | 3.902 | n/a | 0.709 | 0.000 | 3.503 | 476.398 | 2.739 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.084 | 4.611 | 0.009 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000000d4 | 481.753 | 3.984 | n/a | 0.721 | 0.000 | 0.594 | 476.180 | 0.137 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.082 | 4.705 | 0.010 | 0.082 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000000e6 | 480.398 | 6.047 | n/a | 0.645 | 0.000 | 0.969 | 472.561 | 0.015 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.093 | 6.692 | 0.014 | 0.093 | gw-r/thread-51/journal/page | none observed |

## P3 / L4 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 398.175 | n/a | n/a | n/a | 3.058 | n/a | 0.000 | 0.000 | 0.667 | 386.542 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.085 | 3.472 | 0.010 | 0.085 |
| p99 | 1004.563 | n/a | n/a | n/a | 13.292 | n/a | 1.582 | 0.000 | 3.911 | 1000.618 | 5.662 | 0.000 | 0.112 | 0.000 | n/a | n/a | 1.093 | 14.138 | 0.379 | 1.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1d6601045783b2bd0000000000000115 | 1004.563 | 3.037 | n/a | 0.778 | 0.000 | 0.986 | 999.577 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.123 | 3.815 | 0.004 | 0.123 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd000000000000012a | 1002.293 | 0.100 | n/a | 0.000 | 0.000 | 0.424 | 1000.618 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.093 | 0.100 | 0.000 | 1.093 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000000138 | 998.588 | 2.490 | n/a | 0.000 | 0.000 | 0.688 | 995.265 | 0.013 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.063 | 2.490 | 0.002 | 0.063 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd000000000000011d | 996.479 | 3.240 | n/a | 0.615 | 0.000 | 0.710 | 991.710 | 0.004 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.129 | 3.856 | 0.004 | 0.129 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000000126 | 992.926 | 4.441 | n/a | 0.000 | 0.000 | 0.810 | 987.532 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.069 | 4.441 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 1d6601045783b2bd000000000000012c | 977.814 | 5.716 | n/a | 0.000 | 0.000 | 0.694 | 971.020 | 0.183 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.164 | 5.716 | 0.006 | 0.164 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000000112 | 895.548 | 2.367 | n/a | 0.643 | 0.000 | 0.550 | 891.816 | 0.006 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.073 | 3.010 | 0.003 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd0000000000000141 | 888.767 | 2.382 | n/a | 0.000 | 0.000 | 0.442 | 885.808 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.068 | 2.382 | 0.003 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd0000000000000127 | 820.015 | 4.448 | n/a | 0.836 | 0.000 | 0.422 | 812.868 | 1.289 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.102 | 5.283 | 0.006 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 1d6601045783b2bd000000000000011e | 816.889 | 3.652 | n/a | 0.000 | 0.000 | 0.697 | 812.306 | 0.120 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.073 | 3.652 | 0.004 | 0.073 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd0000000000000135 | 752.820 | 2.918 | n/a | 0.650 | 0.000 | 0.360 | 748.524 | 0.250 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.065 | 3.568 | 0.005 | 0.065 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd000000000000010f | 742.065 | 3.132 | n/a | 0.659 | 0.000 | 0.479 | 737.633 | 0.006 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.090 | 3.791 | 0.005 | 0.090 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000000142 | 697.426 | 5.343 | n/a | 0.793 | 0.000 | 0.549 | 690.186 | 0.358 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.135 | 6.136 | 0.009 | 0.135 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd0000000000000148 | 678.969 | 2.361 | n/a | 1.500 | 0.000 | 0.675 | 674.268 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.096 | 3.861 | 0.006 | 0.096 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000000139 | 649.938 | 13.292 | n/a | 0.846 | 0.000 | 0.677 | 634.930 | 0.013 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.132 | 14.138 | 0.022 | 0.132 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd000000000000013d | 646.220 | 2.826 | n/a | 0.000 | 0.000 | 0.676 | 642.548 | 0.005 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.071 | 2.826 | 0.004 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd0000000000000133 | 635.504 | 3.063 | n/a | 0.000 | 0.000 | 0.452 | 631.600 | 0.152 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.159 | 3.063 | 0.005 | 0.159 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd0000000000000124 | 616.153 | 6.072 | n/a | 0.000 | 0.000 | 0.913 | 608.977 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.151 | 6.072 | 0.010 | 0.151 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd000000000000012e | 568.186 | 2.773 | n/a | 0.000 | 0.000 | 0.700 | 564.584 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.068 | 2.773 | 0.005 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd000000000000012d | 430.065 | 4.665 | n/a | 0.000 | 0.000 | 2.625 | 422.612 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.139 | 4.665 | 0.011 | 0.139 | gw-r/thread-54/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 478.425 | n/a | n/a | n/a | 2.660 | n/a | 0.000 | 0.000 | 0.638 | 473.198 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.073 | 2.697 | 0.007 | 0.073 |
| p99 | 1003.263 | n/a | n/a | n/a | 9.008 | n/a | 1.142 | 0.000 | 2.246 | 1001.165 | 0.697 | 16.022 | 0.176 | 0.000 | n/a | n/a | 1.109 | 10.150 | 0.725 | 1.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1d6601045783b2bd000000000000017e | 1003.263 | 0.162 | n/a | 0.000 | 0.000 | 0.703 | 1001.165 | 0.005 | 0.000 | 0.126 | 0.000 | n/a | n/a | 1.102 | 0.162 | 0.000 | 1.102 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd000000000000016d | 1002.761 | 0.119 | n/a | 0.000 | 0.000 | 0.498 | 1000.971 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.109 | 0.119 | 0.000 | 1.109 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd0000000000000164 | 1002.684 | 2.554 | n/a | 0.000 | 0.000 | 0.878 | 999.011 | 0.085 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.073 | 2.554 | 0.003 | 0.073 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000000186 | 1001.896 | 2.882 | n/a | 0.000 | 0.000 | 0.675 | 998.081 | 0.017 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.066 | 2.882 | 0.003 | 0.066 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd0000000000000185 | 992.974 | 3.072 | n/a | 0.000 | 0.000 | 1.873 | 987.912 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.071 | 3.072 | 0.003 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd0000000000000154 | 986.548 | 2.394 | n/a | 0.000 | 0.000 | 2.246 | 981.793 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.073 | 2.394 | 0.002 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd0000000000000173 | 888.003 | 5.582 | n/a | 0.000 | 0.000 | 0.723 | 881.510 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.142 | 5.582 | 0.006 | 0.142 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd0000000000000155 | 819.002 | 2.808 | n/a | 0.000 | 0.000 | 0.513 | 815.532 | 0.017 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.073 | 2.808 | 0.003 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000000159 | 758.950 | 2.697 | n/a | 0.000 | 0.000 | 0.753 | 755.259 | 0.126 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.066 | 2.697 | 0.004 | 0.066 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000000179 | 725.506 | 5.543 | n/a | 0.000 | 0.000 | 0.593 | 719.216 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.105 | 5.543 | 0.008 | 0.105 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd000000000000014f | 647.039 | 1.902 | n/a | 0.000 | 0.000 | 0.599 | 644.400 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.084 | 1.902 | 0.003 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd0000000000000165 | 619.949 | 6.687 | n/a | 0.000 | 0.000 | 1.780 | 611.279 | 0.010 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.135 | 6.687 | 0.011 | 0.135 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd0000000000000183 | 571.530 | 2.358 | n/a | 0.000 | 0.000 | 0.604 | 568.404 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.078 | 2.358 | 0.004 | 0.078 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd000000000000016b | 558.333 | 3.757 | n/a | 0.000 | 0.000 | 0.682 | 553.787 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.064 | 3.757 | 0.007 | 0.064 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd0000000000000176 | 519.731 | 3.777 | n/a | 0.000 | 0.000 | 0.677 | 515.115 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.135 | 3.777 | 0.007 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd0000000000000188 | 515.229 | 2.261 | n/a | 0.731 | 0.000 | 0.780 | 511.102 | 0.221 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.094 | 2.992 | 0.006 | 0.094 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd000000000000017c | 513.442 | 2.445 | n/a | 0.000 | 0.000 | 0.466 | 510.390 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.099 | 2.445 | 0.005 | 0.099 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd0000000000000171 | 505.208 | 2.700 | n/a | 0.000 | 0.000 | 0.581 | 501.707 | 0.121 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.063 | 2.700 | 0.005 | 0.063 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd000000000000016f | 487.809 | 4.715 | n/a | 0.659 | 0.000 | 1.960 | 480.340 | 0.015 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.066 | 5.375 | 0.011 | 0.066 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd000000000000017b | 482.227 | 1.695 | n/a | 0.000 | 0.000 | 0.636 | 479.790 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.061 | 1.695 | 0.004 | 0.061 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 310.244 | n/a | n/a | n/a | 2.548 | n/a | 0.000 | 0.000 | 0.586 | 306.849 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.067 | 2.548 | 0.011 | 0.067 |
| p99 | 1003.653 | n/a | n/a | n/a | 8.345 | n/a | 0.000 | 0.000 | 2.586 | 1001.127 | 2.156 | 16.671 | 0.505 | 0.000 | n/a | n/a | 1.119 | 8.345 | 0.369 | 1.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1d6601045783b2bd000000000000018a | 1003.653 | 0.102 | n/a | 0.000 | 0.000 | 1.510 | 1000.878 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.101 | 0.102 | 0.000 | 1.101 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000001a6 | 1003.018 | 0.152 | n/a | 0.000 | 0.000 | 0.549 | 1001.127 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 1.119 | 0.152 | 0.000 | 1.119 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd00000000000001c5 | 997.674 | 2.354 | n/a | 0.000 | 0.000 | 0.440 | 994.761 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.059 | 2.354 | 0.002 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000001c4 | 997.556 | 2.405 | n/a | 0.000 | 0.000 | 0.958 | 994.053 | 0.018 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.066 | 2.405 | 0.002 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd000000000000019a | 986.530 | 2.377 | n/a | 0.000 | 0.000 | 1.638 | 982.414 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.062 | 2.377 | 0.002 | 0.062 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000001a8 | 963.662 | 2.269 | n/a | 0.000 | 0.000 | 0.696 | 960.172 | 0.392 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.067 | 2.269 | 0.002 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000001a4 | 854.469 | 2.591 | n/a | 0.000 | 0.000 | 0.481 | 851.186 | 0.109 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.066 | 2.591 | 0.003 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd000000000000019c | 833.570 | 3.721 | n/a | 0.000 | 0.000 | 0.479 | 829.264 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.073 | 3.721 | 0.004 | 0.073 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd00000000000001d5 | 810.174 | 1.919 | n/a | 0.000 | 0.000 | 0.419 | 807.706 | 0.018 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.079 | 1.919 | 0.002 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000001c2 | 725.909 | 3.883 | n/a | 0.000 | 0.000 | 0.586 | 720.866 | 0.003 | 0.000 | 0.505 | 0.000 | n/a | n/a | 0.066 | 3.883 | 0.005 | 0.066 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd00000000000001c6 | 688.662 | 5.122 | n/a | 0.000 | 0.000 | 0.691 | 682.610 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.183 | 5.122 | 0.007 | 0.183 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000001a0 | 669.388 | 3.982 | n/a | 0.000 | 0.000 | 0.803 | 664.503 | 0.004 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.083 | 3.982 | 0.006 | 0.083 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd00000000000001b0 | 651.615 | 3.956 | n/a | 0.000 | 0.000 | 0.352 | 647.199 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.063 | 3.956 | 0.006 | 0.063 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd00000000000001a9 | 634.831 | 4.836 | n/a | 0.000 | 0.000 | 2.586 | 626.642 | 0.510 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.195 | 4.836 | 0.008 | 0.195 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000001b6 | 593.576 | 2.413 | n/a | 0.000 | 0.000 | 0.360 | 590.698 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.063 | 2.413 | 0.004 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000001d1 | 546.257 | 4.830 | n/a | 0.000 | 0.000 | 0.435 | 540.500 | 0.304 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.146 | 4.830 | 0.009 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000001ba | 517.286 | 2.450 | n/a | 0.000 | 0.000 | 0.497 | 514.232 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.062 | 2.450 | 0.005 | 0.062 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000001ce | 500.503 | 2.208 | n/a | 0.000 | 0.000 | 0.480 | 497.680 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.076 | 2.208 | 0.004 | 0.076 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000001b8 | 484.688 | 8.345 | n/a | 0.000 | 0.000 | 1.755 | 474.455 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.097 | 8.345 | 0.017 | 0.097 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd0000000000000195 | 404.744 | 1.911 | n/a | 0.000 | 0.000 | 2.520 | 400.216 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.057 | 1.911 | 0.005 | 0.057 | gw-r/thread-54/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 321.430 | n/a | n/a | n/a | 2.788 | n/a | 0.000 | 0.000 | 0.548 | 318.792 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.072 | 2.788 | 0.007 | 0.072 |
| p99 | 1002.567 | n/a | n/a | n/a | 6.892 | n/a | 0.000 | 0.000 | 3.950 | 1000.777 | 2.036 | 0.000 | 0.111 | 0.000 | n/a | n/a | 1.109 | 6.892 | 0.290 | 1.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1d6601045783b2bd0000000000000217 | 1002.567 | 0.113 | n/a | 0.000 | 0.000 | 0.509 | 1000.777 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.106 | 0.113 | 0.000 | 1.106 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd0000000000000219 | 1002.298 | 0.095 | n/a | 0.000 | 0.000 | 0.359 | 1000.680 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.109 | 0.095 | 0.000 | 1.109 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd0000000000000212 | 1002.233 | 0.104 | n/a | 0.000 | 0.000 | 0.396 | 1000.587 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.099 | 0.104 | 0.000 | 1.099 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000001ea | 1002.076 | 2.179 | n/a | 0.000 | 0.000 | 0.460 | 999.340 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.060 | 2.179 | 0.002 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd00000000000001fe | 994.460 | 2.254 | n/a | 0.000 | 0.000 | 0.718 | 991.389 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.063 | 2.254 | 0.002 | 0.063 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd0000000000000211 | 994.013 | 2.220 | n/a | 0.000 | 0.000 | 0.467 | 991.202 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.070 | 2.220 | 0.002 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd0000000000000215 | 915.916 | 2.918 | n/a | 0.000 | 0.000 | 0.406 | 912.184 | 0.294 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.064 | 2.918 | 0.003 | 0.064 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000000206 | 865.317 | 2.316 | n/a | 0.000 | 0.000 | 0.528 | 862.348 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.063 | 2.316 | 0.003 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000001ff | 859.168 | 2.175 | n/a | 0.000 | 0.000 | 0.679 | 856.200 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.072 | 2.175 | 0.003 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000000202 | 809.633 | 3.619 | n/a | 0.000 | 0.000 | 0.635 | 805.277 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.074 | 3.619 | 0.004 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000001f0 | 787.907 | 2.040 | n/a | 0.000 | 0.000 | 1.731 | 784.035 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.061 | 2.040 | 0.003 | 0.061 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd00000000000001dd | 784.438 | 2.788 | n/a | 0.000 | 0.000 | 2.884 | 778.653 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.059 | 2.788 | 0.004 | 0.059 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000001f7 | 768.253 | 6.053 | n/a | 0.000 | 0.000 | 0.567 | 761.373 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.207 | 6.053 | 0.008 | 0.207 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000001f4 | 633.184 | 2.684 | n/a | 0.000 | 0.000 | 0.533 | 629.698 | 0.144 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.064 | 2.684 | 0.004 | 0.064 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd00000000000001da | 611.315 | 3.125 | n/a | 0.000 | 0.000 | 0.593 | 607.456 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.101 | 3.125 | 0.005 | 0.101 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd00000000000001e8 | 605.705 | 2.279 | n/a | 0.000 | 0.000 | 0.567 | 602.732 | 0.005 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.067 | 2.279 | 0.004 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000001f9 | 591.395 | 4.146 | n/a | 0.000 | 0.000 | 3.950 | 583.122 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.143 | 4.146 | 0.007 | 0.143 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd00000000000001e1 | 461.708 | 3.963 | n/a | 0.000 | 0.000 | 0.553 | 456.670 | 0.389 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.079 | 3.963 | 0.009 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd000000000000020f | 428.591 | 2.548 | n/a | 0.000 | 0.000 | 0.419 | 425.534 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.064 | 2.548 | 0.006 | 0.064 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd00000000000001ee | 407.695 | 2.204 | n/a | 0.000 | 0.000 | 0.612 | 404.756 | 0.009 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.064 | 2.204 | 0.005 | 0.064 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / internal (774 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.873 | n/a | n/a | n/a | 2.974 | n/a | 0.000 | 0.000 | 0.544 | 8.948 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.076 | 2.974 | 0.265 | 0.076 |
| p99 | 105.905 | n/a | n/a | n/a | 11.312 | n/a | 1.270 | 0.000 | 3.642 | 97.969 | 0.423 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.496 | 12.299 | 0.819 | 0.496 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1d6601045783b2bd0000000000000226 | 990.176 | 2.229 | n/a | 0.000 | 0.000 | 0.441 | 987.106 | 0.272 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.076 | 2.229 | 0.002 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000000227 | 916.584 | 3.377 | n/a | 0.000 | 0.000 | 0.704 | 912.389 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.070 | 3.377 | 0.004 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd000000000000021b | 903.663 | 3.418 | n/a | 0.000 | 0.000 | 0.748 | 899.337 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.117 | 3.418 | 0.004 | 0.117 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd0000000000000222 | 788.194 | 2.179 | n/a | 0.000 | 0.000 | 0.679 | 785.226 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.072 | 2.179 | 0.003 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd000000000000021e | 766.058 | 1.937 | n/a | 0.000 | 0.000 | 0.510 | 763.165 | 0.342 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.066 | 1.937 | 0.003 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd000000000000021f | 233.302 | 2.228 | n/a | 0.000 | 0.000 | 0.533 | 230.206 | 0.215 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.061 | 2.228 | 0.010 | 0.061 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000000224 | 197.345 | 2.501 | n/a | 0.000 | 0.000 | 3.551 | 191.186 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.057 | 2.501 | 0.013 | 0.057 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd00000000000004f4 | 105.905 | 5.961 | n/a | 1.083 | 0.000 | 0.704 | 97.969 | 0.012 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.128 | 7.044 | 0.067 | 0.128 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000007b2 | 98.276 | 2.315 | n/a | 0.000 | 0.000 | 0.352 | 95.166 | 0.274 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.099 | 2.315 | 0.024 | 0.099 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd000000000000076c | 93.136 | 3.125 | n/a | 0.000 | 0.000 | 1.067 | 88.822 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.091 | 3.125 | 0.034 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd00000000000005fc | 92.718 | 4.318 | n/a | 0.000 | 0.000 | 0.372 | 87.921 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.075 | 4.318 | 0.047 | 0.075 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000000314 | 92.444 | 2.410 | n/a | 0.000 | 0.000 | 0.514 | 89.451 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.058 | 2.410 | 0.026 | 0.058 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd0000000000000478 | 88.689 | 3.642 | n/a | 0.000 | 0.000 | 0.467 | 84.506 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.061 | 3.642 | 0.041 | 0.061 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd00000000000002f7 | 87.923 | 6.939 | n/a | 0.000 | 0.000 | 1.554 | 79.143 | 0.167 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.075 | 6.939 | 0.079 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd000000000000021c | 79.611 | 5.323 | n/a | 0.000 | 0.000 | 0.696 | 73.360 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.192 | 5.323 | 0.067 | 0.192 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd0000000000000837 | 78.838 | 6.049 | n/a | 0.000 | 0.000 | 0.494 | 72.112 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.152 | 6.049 | 0.077 | 0.152 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd0000000000000647 | 77.719 | 3.496 | n/a | 0.000 | 0.000 | 0.397 | 73.459 | 0.244 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.066 | 3.496 | 0.045 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd00000000000004ff | 75.383 | 2.287 | n/a | 0.000 | 0.000 | 0.593 | 72.370 | 0.037 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.076 | 2.287 | 0.030 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd000000000000079f | 74.297 | 7.082 | n/a | 0.000 | 0.000 | 0.444 | 66.599 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.127 | 7.082 | 0.095 | 0.127 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd00000000000006c5 | 73.541 | 3.192 | n/a | 0.000 | 0.000 | 0.521 | 69.705 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.093 | 3.192 | 0.043 | 0.093 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / internal (2338 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.180 | n/a | n/a | n/a | 3.989 | n/a | 0.000 | 0.000 | 0.492 | 7.478 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.092 | 4.001 | 0.331 | 0.092 |
| p99 | 340.610 | n/a | n/a | n/a | 15.187 | n/a | 1.429 | 0.000 | 3.883 | 338.017 | 0.274 | 0.000 | 0.075 | 0.000 | n/a | n/a | 1.131 | 16.025 | 0.851 | 1.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1d6601045783b2bd0000000000001b20 | 1002.485 | 0.141 | n/a | 0.000 | 0.000 | 0.337 | 1000.817 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.116 | 0.141 | 0.000 | 1.116 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd0000000000001ad4 | 1002.162 | 0.096 | n/a | 0.000 | 0.000 | 0.384 | 1000.539 | 0.003 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.099 | 0.096 | 0.000 | 1.099 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000001ad9 | 995.380 | 3.340 | n/a | 0.000 | 0.000 | 0.277 | 991.609 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.128 | 3.340 | 0.003 | 0.128 | gw-r/thread-71/journal/page | none observed |
| 1d6601045783b2bd0000000000001b1c | 990.077 | 4.635 | n/a | 0.000 | 0.000 | 0.297 | 984.990 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.122 | 4.635 | 0.005 | 0.122 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd0000000000001add | 961.205 | 2.138 | n/a | 0.000 | 0.000 | 0.316 | 958.659 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.066 | 2.138 | 0.002 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd0000000000001af6 | 941.421 | 5.303 | n/a | 0.000 | 0.000 | 0.557 | 935.309 | 0.065 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.128 | 5.303 | 0.006 | 0.128 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd0000000000001ad6 | 939.654 | 12.335 | n/a | 0.000 | 0.000 | 1.137 | 925.689 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.466 | 12.335 | 0.013 | 0.466 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd0000000000001ae7 | 933.035 | 2.139 | n/a | 0.000 | 0.000 | 0.422 | 930.373 | 0.003 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.064 | 2.139 | 0.002 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd0000000000001b17 | 891.483 | 2.391 | n/a | 0.000 | 0.000 | 0.336 | 888.593 | 0.004 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.073 | 2.391 | 0.003 | 0.073 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000001ad2 | 872.602 | 2.324 | n/a | 0.000 | 0.000 | 0.272 | 869.888 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.074 | 2.324 | 0.003 | 0.074 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd0000000000001b19 | 836.199 | 1.835 | n/a | 0.000 | 0.000 | 0.444 | 833.701 | 0.101 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.079 | 1.835 | 0.002 | 0.079 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000001afa | 700.612 | 2.640 | n/a | 0.000 | 0.000 | 0.677 | 697.079 | 0.100 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.082 | 2.640 | 0.004 | 0.082 | gw-r/thread-51/journal/page | none observed |
| 1d6601045783b2bd0000000000001adf | 669.521 | 3.104 | n/a | 0.000 | 0.000 | 0.593 | 665.630 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.147 | 3.104 | 0.005 | 0.147 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000001b13 | 662.854 | 1.883 | n/a | 0.000 | 0.000 | 0.358 | 660.492 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.073 | 1.883 | 0.003 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 1d6601045783b2bd0000000000001afb | 647.574 | 11.988 | n/a | 0.000 | 0.000 | 0.566 | 634.486 | 0.153 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.351 | 11.988 | 0.019 | 0.351 | gw-r/thread-53/journal/page | none observed |
| 1d6601045783b2bd0000000000001af3 | 641.237 | 2.210 | n/a | 0.000 | 0.000 | 0.337 | 638.601 | 0.008 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.051 | 2.210 | 0.003 | 0.051 | gw-r/thread-50/journal/page | none observed |
| 1d6601045783b2bd0000000000001b09 | 550.071 | 2.247 | n/a | 0.000 | 0.000 | 0.416 | 547.308 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.061 | 2.247 | 0.004 | 0.061 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000001aee | 542.133 | 2.311 | n/a | 0.000 | 0.000 | 0.435 | 539.205 | 0.098 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.065 | 2.311 | 0.004 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 1d6601045783b2bd0000000000001b0e | 523.272 | 2.432 | n/a | 0.000 | 0.000 | 0.367 | 520.293 | 0.066 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.066 | 2.432 | 0.005 | 0.066 | gw-r/thread-54/journal/page | none observed |
| 1d6601045783b2bd0000000000001b12 | 448.814 | 2.392 | n/a | 0.000 | 0.000 | 0.567 | 445.624 | 0.116 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.093 | 2.392 | 0.005 | 0.093 | gw-r/thread-71/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.958 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.757 | 200.923 | 0.016 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.081 | 0.041 | 0.000 | 0.081 |
| p99 | 204.059 | n/a | n/a | n/a | 0.149 | n/a | 0.000 | 0.000 | 2.666 | 201.647 | 7.513 | 0.000 | 0.263 | 0.000 | n/a | n/a | 0.354 | 0.149 | 0.002 | 0.354 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71ddfc02e8e5c7790000000000000037 | 204.059 | 0.031 | n/a | 0.000 | 0.000 | 2.666 | 201.174 | 0.011 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.069 | 0.031 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000009 | 203.522 | 0.038 | n/a | 0.000 | 0.000 | 1.507 | 201.423 | 0.018 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.354 | 0.038 | 0.000 | 0.354 | gw-r/thread-47/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000038 | 203.146 | 0.049 | n/a | 0.000 | 0.000 | 1.331 | 201.495 | 0.011 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.122 | 0.049 | 0.000 | 0.122 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000008 | 203.133 | 0.054 | n/a | 0.000 | 0.000 | 1.301 | 201.458 | 0.019 | 0.000 | 0.192 | 0.000 | n/a | n/a | 0.109 | 0.054 | 0.000 | 0.109 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000013 | 202.931 | 0.043 | n/a | 0.000 | 0.000 | 1.370 | 201.235 | 0.014 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.106 | 0.043 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000032 | 202.833 | 0.050 | n/a | 0.000 | 0.000 | 1.177 | 201.323 | 0.024 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.102 | 0.050 | 0.000 | 0.102 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c779000000000000001b | 202.782 | 0.043 | n/a | 0.000 | 0.000 | 1.026 | 201.256 | 0.096 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.243 | 0.043 | 0.000 | 0.243 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c779000000000000003e | 202.707 | 0.037 | n/a | 0.000 | 0.000 | 1.208 | 201.231 | 0.011 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.087 | 0.037 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000014 | 202.683 | 0.062 | n/a | 0.000 | 0.000 | 0.749 | 201.353 | 0.126 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.215 | 0.062 | 0.000 | 0.215 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000031 | 202.593 | 0.031 | n/a | 0.000 | 0.000 | 0.682 | 201.647 | 0.019 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000010 | 202.520 | 0.046 | n/a | 0.000 | 0.000 | 0.781 | 201.430 | 0.028 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.089 | 0.046 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000019 | 202.385 | 0.049 | n/a | 0.000 | 0.000 | 1.059 | 201.032 | 0.012 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.099 | 0.049 | 0.000 | 0.099 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c779000000000000000e | 202.330 | 0.034 | n/a | 0.000 | 0.000 | 0.779 | 201.234 | 0.016 | 0.000 | 0.189 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c779000000000000005c | 202.305 | 0.048 | n/a | 0.000 | 0.000 | 0.906 | 201.021 | 0.027 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.135 | 0.048 | 0.000 | 0.135 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c779000000000000003a | 202.270 | 0.042 | n/a | 0.000 | 0.000 | 1.167 | 200.836 | 0.011 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.110 | 0.042 | 0.000 | 0.110 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000030 | 202.269 | 0.041 | n/a | 0.000 | 0.000 | 0.616 | 201.361 | 0.019 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.083 | 0.041 | 0.000 | 0.083 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000036 | 202.262 | 0.031 | n/a | 0.000 | 0.000 | 0.829 | 201.195 | 0.012 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000026 | 202.239 | 0.048 | n/a | 0.000 | 0.000 | 0.983 | 200.962 | 0.013 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.118 | 0.048 | 0.000 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c779000000000000004a | 202.228 | 0.054 | n/a | 0.000 | 0.000 | 0.992 | 200.868 | 0.044 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.170 | 0.054 | 0.000 | 0.170 | gw-r/thread-47/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000029 | 202.227 | 0.036 | n/a | 0.000 | 0.000 | 0.547 | 201.380 | 0.020 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-71/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.790 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.737 | 200.833 | 0.013 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.080 | 0.041 | 0.000 | 0.080 |
| p99 | 209.821 | n/a | n/a | n/a | 0.078 | n/a | 0.000 | 0.000 | 1.184 | 208.323 | 3.758 | 0.000 | 0.467 | 0.000 | n/a | n/a | 0.150 | 0.078 | 0.001 | 0.150 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71ddfc02e8e5c779000000000000007c | 209.821 | 0.050 | n/a | 0.000 | 0.000 | 1.184 | 208.323 | 0.021 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.147 | 0.050 | 0.000 | 0.147 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000c1 | 203.474 | 0.032 | n/a | 0.000 | 0.000 | 0.934 | 201.948 | 0.018 | 0.000 | 0.467 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000079 | 203.025 | 0.048 | n/a | 0.000 | 0.000 | 0.989 | 201.718 | 0.018 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.119 | 0.048 | 0.000 | 0.119 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000b2 | 202.912 | 0.032 | n/a | 0.000 | 0.000 | 0.854 | 201.700 | 0.055 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000071 | 202.777 | 0.035 | n/a | 0.000 | 0.000 | 0.891 | 201.604 | 0.031 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.075 | 0.035 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000074 | 202.731 | 0.051 | n/a | 0.000 | 0.000 | 1.001 | 201.373 | 0.029 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.112 | 0.051 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000063 | 202.495 | 0.047 | n/a | 0.000 | 0.000 | 1.140 | 201.046 | 0.012 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.120 | 0.047 | 0.000 | 0.120 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c779000000000000009c | 202.492 | 0.032 | n/a | 0.000 | 0.000 | 0.774 | 201.465 | 0.019 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.074 | 0.032 | 0.000 | 0.074 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000b4 | 202.456 | 0.043 | n/a | 0.000 | 0.000 | 0.737 | 201.357 | 0.036 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.129 | 0.043 | 0.000 | 0.129 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c779000000000000006b | 202.449 | 0.036 | n/a | 0.000 | 0.000 | 0.794 | 201.413 | 0.012 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.099 | 0.036 | 0.000 | 0.099 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c779000000000000009d | 202.416 | 0.042 | n/a | 0.000 | 0.000 | 1.062 | 201.122 | 0.011 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.089 | 0.042 | 0.000 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000082 | 202.379 | 0.040 | n/a | 0.000 | 0.000 | 1.049 | 201.083 | 0.015 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c779000000000000006c | 202.342 | 0.043 | n/a | 0.000 | 0.000 | 1.001 | 201.090 | 0.014 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.091 | 0.043 | 0.000 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000bb | 202.328 | 0.036 | n/a | 0.000 | 0.000 | 0.681 | 201.347 | 0.016 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.102 | 0.036 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000bc | 202.285 | 0.041 | n/a | 0.000 | 0.000 | 0.569 | 201.399 | 0.016 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.090 | 0.041 | 0.000 | 0.090 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c779000000000000005f | 202.230 | 0.031 | n/a | 0.000 | 0.000 | 0.614 | 201.210 | 0.020 | 0.000 | 0.280 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000ac | 202.218 | 0.036 | n/a | 0.000 | 0.000 | 0.655 | 201.184 | 0.012 | 0.000 | 0.248 | 0.000 | n/a | n/a | 0.083 | 0.036 | 0.000 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000076 | 202.176 | 0.054 | n/a | 0.000 | 0.000 | 0.964 | 200.926 | 0.011 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.130 | 0.054 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000061 | 202.155 | 0.048 | n/a | 0.000 | 0.000 | 0.861 | 201.057 | 0.011 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.083 | 0.048 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000070 | 202.155 | 0.043 | n/a | 0.000 | 0.000 | 0.813 | 201.075 | 0.013 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.119 | 0.043 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.713 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.679 | 200.790 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.077 | 0.042 | 0.000 | 0.077 |
| p99 | 207.443 | n/a | n/a | n/a | 0.084 | n/a | 0.000 | 0.000 | 1.211 | 206.685 | 2.477 | 0.000 | 0.497 | 0.000 | n/a | n/a | 0.346 | 0.084 | 0.001 | 0.346 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71ddfc02e8e5c7790000000000000103 | 207.443 | 0.029 | n/a | 0.000 | 0.000 | 0.599 | 206.685 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000db | 204.561 | 0.033 | n/a | 0.000 | 0.000 | 0.543 | 203.404 | 0.013 | 0.000 | 0.497 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c779000000000000010f | 202.999 | 0.031 | n/a | 0.000 | 0.000 | 0.376 | 202.404 | 0.012 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c779000000000000012f | 202.648 | 0.041 | n/a | 0.000 | 0.000 | 1.173 | 201.273 | 0.005 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.069 | 0.041 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000d1 | 202.627 | 0.032 | n/a | 0.000 | 0.000 | 0.907 | 201.481 | 0.021 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000f8 | 202.502 | 0.033 | n/a | 0.000 | 0.000 | 0.679 | 201.573 | 0.026 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.082 | 0.033 | 0.000 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000123 | 202.497 | 0.040 | n/a | 0.000 | 0.000 | 0.824 | 201.450 | 0.006 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.093 | 0.040 | 0.000 | 0.093 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000f5 | 202.463 | 0.046 | n/a | 0.000 | 0.000 | 0.688 | 201.282 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.346 | 0.046 | 0.000 | 0.346 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000dd | 202.438 | 0.036 | n/a | 0.000 | 0.000 | 0.861 | 201.357 | 0.014 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000102 | 202.331 | 0.035 | n/a | 0.000 | 0.000 | 0.616 | 201.463 | 0.012 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000ce | 202.303 | 0.042 | n/a | 0.000 | 0.000 | 1.211 | 200.794 | 0.006 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.106 | 0.042 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000e8 | 202.249 | 0.049 | n/a | 0.000 | 0.000 | 0.882 | 201.100 | 0.008 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.135 | 0.049 | 0.000 | 0.135 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000cb | 202.203 | 0.042 | n/a | 0.000 | 0.000 | 0.787 | 201.125 | 0.019 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.119 | 0.042 | 0.000 | 0.119 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000e5 | 202.192 | 0.036 | n/a | 0.000 | 0.000 | 0.852 | 201.133 | 0.007 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.080 | 0.036 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000114 | 202.189 | 0.056 | n/a | 0.000 | 0.000 | 1.159 | 200.789 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.124 | 0.056 | 0.000 | 0.124 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000e9 | 202.188 | 0.033 | n/a | 0.000 | 0.000 | 0.667 | 201.328 | 0.009 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c779000000000000012a | 202.176 | 0.053 | n/a | 0.000 | 0.000 | 1.174 | 200.803 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.081 | 0.053 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000d2 | 202.174 | 0.040 | n/a | 0.000 | 0.000 | 0.861 | 201.066 | 0.006 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.121 | 0.040 | 0.000 | 0.121 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c77900000000000000e3 | 202.173 | 0.078 | n/a | 0.000 | 0.000 | 0.728 | 201.038 | 0.007 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.242 | 0.078 | 0.000 | 0.242 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c779000000000000010a | 202.167 | 0.043 | n/a | 0.000 | 0.000 | 0.842 | 201.024 | 0.006 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.169 | 0.043 | 0.000 | 0.169 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.726 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.655 | 200.815 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.079 | 0.042 | 0.000 | 0.079 |
| p99 | 211.408 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 0.000 | 3.355 | 203.218 | 2.807 | 16.022 | 0.167 | 0.000 | n/a | n/a | 0.195 | 0.088 | 0.001 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71ddfc02e8e5c7790000000000000154 | 211.408 | 0.037 | n/a | 0.000 | 0.000 | 0.733 | 194.487 | 0.006 | 16.022 | 0.053 | 0.000 | n/a | n/a | 0.070 | 0.037 | 0.000 | 0.070 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000145 | 203.864 | 0.035 | n/a | 0.000 | 0.000 | 0.488 | 203.218 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.066 | 0.035 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000133 | 202.670 | 0.054 | n/a | 0.000 | 0.000 | 1.202 | 201.126 | 0.018 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.152 | 0.054 | 0.000 | 0.152 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000175 | 202.520 | 0.051 | n/a | 0.000 | 0.000 | 0.838 | 201.442 | 0.013 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.080 | 0.051 | 0.000 | 0.080 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c779000000000000013b | 202.371 | 0.046 | n/a | 0.000 | 0.000 | 1.186 | 200.986 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.100 | 0.046 | 0.000 | 0.100 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000170 | 202.364 | 0.085 | n/a | 0.000 | 0.000 | 0.805 | 201.224 | 0.009 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.108 | 0.085 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c779000000000000015f | 202.318 | 0.033 | n/a | 0.000 | 0.000 | 0.595 | 201.506 | 0.009 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000141 | 202.274 | 0.050 | n/a | 0.000 | 0.000 | 0.700 | 201.307 | 0.010 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.121 | 0.050 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c779000000000000014e | 202.151 | 0.052 | n/a | 0.000 | 0.000 | 0.897 | 200.994 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.132 | 0.052 | 0.000 | 0.132 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c779000000000000019b | 202.139 | 0.041 | n/a | 0.000 | 0.000 | 0.640 | 201.306 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.102 | 0.041 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000168 | 202.130 | 0.033 | n/a | 0.000 | 0.000 | 0.557 | 201.377 | 0.009 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c779000000000000016d | 202.106 | 0.033 | n/a | 0.000 | 0.000 | 0.686 | 201.229 | 0.012 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000185 | 202.103 | 0.047 | n/a | 0.000 | 0.000 | 0.558 | 201.197 | 0.010 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.195 | 0.047 | 0.000 | 0.195 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000179 | 202.091 | 0.035 | n/a | 0.000 | 0.000 | 0.856 | 201.017 | 0.007 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.085 | 0.035 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000139 | 202.051 | 0.046 | n/a | 0.000 | 0.000 | 0.680 | 201.133 | 0.012 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.108 | 0.046 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000195 | 202.048 | 0.030 | n/a | 0.000 | 0.000 | 0.711 | 201.076 | 0.013 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.140 | 0.030 | 0.000 | 0.140 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c779000000000000017e | 202.027 | 0.053 | n/a | 0.000 | 0.000 | 0.738 | 201.048 | 0.009 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.111 | 0.053 | 0.000 | 0.111 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000180 | 202.009 | 0.041 | n/a | 0.000 | 0.000 | 0.660 | 201.056 | 0.009 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.078 | 0.041 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c779000000000000013a | 201.999 | 0.031 | n/a | 0.000 | 0.000 | 0.433 | 201.313 | 0.009 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c779000000000000014d | 201.993 | 0.042 | n/a | 0.000 | 0.000 | 0.680 | 201.063 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.124 | 0.042 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.488 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.633 | 200.723 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.000 | 0.072 |
| p99 | 203.166 | n/a | n/a | n/a | 0.098 | n/a | 0.000 | 0.000 | 1.479 | 201.584 | 3.220 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.138 | 0.098 | 0.001 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71ddfc02e8e5c77900000000000001b5 | 203.375 | 0.048 | n/a | 0.000 | 0.000 | 2.094 | 200.994 | 0.006 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.110 | 0.048 | 0.000 | 0.110 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001ef | 203.166 | 0.064 | n/a | 0.000 | 0.000 | 1.479 | 201.403 | 0.010 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.121 | 0.064 | 0.000 | 0.121 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001ac | 202.899 | 0.045 | n/a | 0.000 | 0.000 | 1.082 | 201.584 | 0.012 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.101 | 0.045 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001f1 | 202.558 | 0.042 | n/a | 0.000 | 0.000 | 0.993 | 201.349 | 0.009 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.081 | 0.042 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001b4 | 202.408 | 0.037 | n/a | 0.000 | 0.000 | 0.399 | 201.827 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.093 | 0.037 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001c2 | 202.275 | 0.092 | n/a | 0.000 | 0.000 | 0.908 | 201.039 | 0.009 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.160 | 0.092 | 0.000 | 0.160 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001c6 | 202.213 | 0.044 | n/a | 0.000 | 0.000 | 0.655 | 201.253 | 0.054 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.106 | 0.044 | 0.000 | 0.106 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001e4 | 202.207 | 0.033 | n/a | 0.000 | 0.000 | 1.089 | 200.950 | 0.005 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.066 | 0.033 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001ba | 202.117 | 0.046 | n/a | 0.000 | 0.000 | 0.948 | 200.969 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.092 | 0.046 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001c1 | 202.098 | 0.034 | n/a | 0.000 | 0.000 | 0.818 | 201.081 | 0.006 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.070 | 0.034 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001bb | 202.059 | 0.031 | n/a | 0.000 | 0.000 | 0.738 | 201.132 | 0.009 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001dc | 202.014 | 0.048 | n/a | 0.000 | 0.000 | 0.707 | 201.071 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.105 | 0.048 | 0.000 | 0.105 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001ec | 202.004 | 0.043 | n/a | 0.000 | 0.000 | 0.768 | 201.003 | 0.005 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.123 | 0.043 | 0.000 | 0.123 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000200 | 201.937 | 0.032 | n/a | 0.000 | 0.000 | 0.797 | 200.964 | 0.008 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001cc | 201.906 | 0.032 | n/a | 0.000 | 0.000 | 0.779 | 200.961 | 0.005 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.064 | 0.032 | 0.000 | 0.064 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001c0 | 201.904 | 0.042 | n/a | 0.000 | 0.000 | 0.516 | 201.186 | 0.010 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.064 | 0.042 | 0.000 | 0.064 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001ed | 201.900 | 0.031 | n/a | 0.000 | 0.000 | 0.655 | 201.081 | 0.005 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001b6 | 201.895 | 0.082 | n/a | 0.000 | 0.000 | 0.704 | 200.926 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.121 | 0.082 | 0.000 | 0.121 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c779000000000000019e | 201.876 | 0.036 | n/a | 0.000 | 0.000 | 0.642 | 201.045 | 0.006 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.070 | 0.036 | 0.000 | 0.070 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c77900000000000001fd | 201.859 | 0.034 | n/a | 0.000 | 0.000 | 0.577 | 201.102 | 0.009 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.061 | 0.034 | 0.000 | 0.061 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.469 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.607 | 200.700 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.069 | 0.043 | 0.000 | 0.069 |
| p99 | 203.073 | n/a | n/a | n/a | 0.083 | n/a | 0.000 | 0.000 | 1.052 | 202.112 | 0.862 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.150 | 0.083 | 0.001 | 0.150 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71ddfc02e8e5c7790000000000000214 | 206.027 | 0.044 | n/a | 0.000 | 0.000 | 0.953 | 204.853 | 0.006 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.094 | 0.044 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000223 | 203.073 | 0.050 | n/a | 0.000 | 0.000 | 0.739 | 202.112 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.121 | 0.050 | 0.000 | 0.121 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000252 | 202.302 | 0.052 | n/a | 0.000 | 0.000 | 1.127 | 200.904 | 0.009 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.148 | 0.052 | 0.000 | 0.148 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000270 | 202.167 | 0.034 | n/a | 0.000 | 0.000 | 0.777 | 201.201 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000245 | 202.092 | 0.030 | n/a | 0.000 | 0.000 | 0.621 | 201.289 | 0.008 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.063 | 0.030 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000247 | 202.028 | 0.042 | n/a | 0.000 | 0.000 | 0.915 | 200.851 | 0.008 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.069 | 0.042 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c779000000000000027b | 201.989 | 0.043 | n/a | 0.000 | 0.000 | 0.942 | 200.838 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.104 | 0.043 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000219 | 201.981 | 0.039 | n/a | 0.000 | 0.000 | 0.609 | 201.135 | 0.006 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.078 | 0.039 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000213 | 201.968 | 0.044 | n/a | 0.000 | 0.000 | 0.785 | 200.968 | 0.005 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.098 | 0.044 | 0.000 | 0.098 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000281 | 201.966 | 0.036 | n/a | 0.000 | 0.000 | 0.607 | 201.169 | 0.008 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.060 | 0.036 | 0.000 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000238 | 201.957 | 0.051 | n/a | 0.000 | 0.000 | 0.996 | 200.734 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.126 | 0.051 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000241 | 201.929 | 0.079 | n/a | 0.000 | 0.000 | 0.886 | 200.775 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.131 | 0.079 | 0.000 | 0.131 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000275 | 201.926 | 0.040 | n/a | 0.000 | 0.000 | 0.750 | 200.941 | 0.005 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.084 | 0.040 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c779000000000000026f | 201.882 | 0.050 | n/a | 0.000 | 0.000 | 0.953 | 200.700 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.123 | 0.050 | 0.000 | 0.123 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000264 | 201.861 | 0.045 | n/a | 0.000 | 0.000 | 0.696 | 200.965 | 0.006 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.076 | 0.045 | 0.000 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000243 | 201.835 | 0.033 | n/a | 0.000 | 0.000 | 0.610 | 201.069 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.066 | 0.033 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000244 | 201.826 | 0.030 | n/a | 0.000 | 0.000 | 0.508 | 201.052 | 0.012 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.062 | 0.030 | 0.000 | 0.062 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000236 | 201.823 | 0.032 | n/a | 0.000 | 0.000 | 0.828 | 200.828 | 0.006 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000218 | 201.819 | 0.030 | n/a | 0.000 | 0.000 | 0.423 | 201.063 | 0.010 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.063 | 0.030 | 0.000 | 0.063 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c779000000000000026e | 201.805 | 0.058 | n/a | 0.000 | 0.000 | 0.820 | 200.745 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.121 | 0.058 | 0.000 | 0.121 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (71 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.881 | n/a | n/a | n/a | 0.049 | n/a | 0.000 | 0.000 | 0.554 | 69.401 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.065 | 0.049 | 0.001 | 0.065 |
| p99 | 202.173 | n/a | n/a | n/a | 0.107 | n/a | 0.000 | 0.000 | 2.396 | 201.104 | 11.282 | 7.462 | 0.163 | 0.000 | n/a | n/a | 0.216 | 0.107 | 0.044 | 0.216 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71ddfc02e8e5c7790000000000000283 | 202.173 | 0.064 | n/a | 0.000 | 0.000 | 0.794 | 201.021 | 0.008 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.216 | 0.064 | 0.000 | 0.216 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000295 | 202.082 | 0.051 | n/a | 0.000 | 0.000 | 0.779 | 201.022 | 0.010 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.117 | 0.051 | 0.000 | 0.117 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000296 | 202.054 | 0.064 | n/a | 0.000 | 0.000 | 0.962 | 200.819 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.151 | 0.064 | 0.000 | 0.151 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000290 | 202.023 | 0.030 | n/a | 0.000 | 0.000 | 0.729 | 201.104 | 0.009 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.058 | 0.030 | 0.000 | 0.058 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000285 | 201.873 | 0.044 | n/a | 0.000 | 0.000 | 0.732 | 200.938 | 0.008 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.081 | 0.044 | 0.000 | 0.081 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000284 | 201.792 | 0.043 | n/a | 0.000 | 0.000 | 0.696 | 200.885 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.102 | 0.043 | 0.000 | 0.102 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000292 | 201.679 | 0.042 | n/a | 0.000 | 0.000 | 0.777 | 200.707 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.100 | 0.042 | 0.000 | 0.100 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c779000000000000029c | 201.678 | 0.047 | n/a | 0.000 | 0.000 | 0.716 | 200.700 | 0.020 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.147 | 0.047 | 0.000 | 0.147 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000298 | 201.677 | 0.030 | n/a | 0.000 | 0.000 | 0.640 | 200.875 | 0.005 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000291 | 201.673 | 0.048 | n/a | 0.000 | 0.000 | 0.695 | 200.790 | 0.005 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.080 | 0.048 | 0.000 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000297 | 201.655 | 0.033 | n/a | 0.000 | 0.000 | 0.509 | 200.874 | 0.009 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c779000000000000029d | 201.639 | 0.034 | n/a | 0.000 | 0.000 | 0.489 | 200.968 | 0.010 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c779000000000000028d | 201.541 | 0.037 | n/a | 0.000 | 0.000 | 0.500 | 200.866 | 0.006 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.067 | 0.037 | 0.000 | 0.067 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c779000000000000028a | 201.485 | 0.033 | n/a | 0.000 | 0.000 | 0.549 | 200.769 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c779000000000000029a | 201.382 | 0.035 | n/a | 0.000 | 0.000 | 0.446 | 200.770 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.066 | 0.035 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c779000000000000029b | 201.371 | 0.030 | n/a | 0.000 | 0.000 | 0.424 | 200.737 | 0.059 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000286 | 201.368 | 0.030 | n/a | 0.000 | 0.000 | 0.456 | 200.761 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.063 | 0.030 | 0.000 | 0.063 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c779000000000000028b | 201.329 | 0.032 | n/a | 0.000 | 0.000 | 0.506 | 200.669 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000289 | 201.267 | 0.038 | n/a | 0.000 | 0.000 | 0.495 | 200.620 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.064 | 0.038 | 0.000 | 0.064 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000294 | 190.215 | 0.040 | n/a | 0.000 | 0.000 | 1.182 | 184.103 | 4.802 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.053 | 0.040 | 0.000 | 0.053 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.553 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.493 | 82.810 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.065 | 0.039 | 0.001 | 0.065 |
| p99 | 202.341 | n/a | n/a | n/a | 0.094 | n/a | 0.000 | 0.000 | 1.580 | 201.204 | 1.254 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.136 | 0.094 | 0.005 | 0.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71ddfc02e8e5c7790000000000000f01 | 202.759 | 0.047 | n/a | 0.000 | 0.000 | 1.910 | 200.638 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.104 | 0.047 | 0.000 | 0.104 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f12 | 202.456 | 0.032 | n/a | 0.000 | 0.000 | 1.756 | 200.524 | 0.009 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.090 | 0.032 | 0.000 | 0.090 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000eea | 202.341 | 0.025 | n/a | 0.000 | 0.000 | 1.580 | 200.618 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.060 | 0.025 | 0.000 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000ef9 | 202.293 | 0.047 | n/a | 0.000 | 0.000 | 0.836 | 201.192 | 0.012 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.118 | 0.047 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000ef2 | 202.168 | 0.093 | n/a | 0.000 | 0.000 | 0.691 | 201.186 | 0.007 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.100 | 0.093 | 0.000 | 0.100 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000ef8 | 202.148 | 0.041 | n/a | 0.000 | 0.000 | 0.641 | 201.206 | 0.041 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.096 | 0.041 | 0.000 | 0.096 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f15 | 202.142 | 0.038 | n/a | 0.000 | 0.000 | 0.712 | 201.204 | 0.007 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.093 | 0.038 | 0.000 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f2e | 202.116 | 0.027 | n/a | 0.000 | 0.000 | 0.651 | 201.234 | 0.010 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.073 | 0.027 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f37 | 201.990 | 0.041 | n/a | 0.000 | 0.000 | 0.672 | 201.021 | 0.035 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.108 | 0.041 | 0.000 | 0.108 | gw-r/thread-54/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000ee4 | 201.977 | 0.038 | n/a | 0.000 | 0.000 | 0.856 | 200.882 | 0.004 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.116 | 0.038 | 0.000 | 0.116 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f2f | 201.868 | 0.035 | n/a | 0.000 | 0.000 | 0.580 | 201.071 | 0.009 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.098 | 0.035 | 0.000 | 0.098 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000ee6 | 201.780 | 0.031 | n/a | 0.000 | 0.000 | 0.501 | 201.089 | 0.025 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f16 | 201.698 | 0.033 | n/a | 0.000 | 0.000 | 0.593 | 200.910 | 0.008 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-71/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000efd | 201.684 | 0.032 | n/a | 0.000 | 0.000 | 0.561 | 200.924 | 0.007 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000ed6 | 201.679 | 0.040 | n/a | 0.000 | 0.000 | 0.567 | 200.909 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.102 | 0.040 | 0.000 | 0.102 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000ed0 | 201.651 | 0.032 | n/a | 0.000 | 0.000 | 0.639 | 200.852 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f25 | 201.602 | 0.028 | n/a | 0.000 | 0.000 | 0.578 | 200.865 | 0.005 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.068 | 0.028 | 0.000 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f02 | 201.584 | 0.077 | n/a | 0.000 | 0.000 | 0.430 | 200.888 | 0.024 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.097 | 0.077 | 0.000 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f34 | 201.569 | 0.058 | n/a | 0.000 | 0.000 | 0.718 | 200.638 | 0.004 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.087 | 0.058 | 0.000 | 0.087 | gw-r/thread-53/journal/page | none observed |
| 71ddfc02e8e5c7790000000000000f26 | 201.568 | 0.024 | n/a | 0.000 | 0.000 | 0.428 | 200.934 | 0.019 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.057 | 0.024 | 0.000 | 0.057 | gw-r/thread-71/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

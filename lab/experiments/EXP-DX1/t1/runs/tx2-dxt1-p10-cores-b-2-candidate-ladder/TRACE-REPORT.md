# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (129.148 ms, trace `5658dadf3076658c0000000000000422`); `node-14/thread-0/driver.queue.subject` (158.181 ms, trace `5658dadf3076658c0000000000000420`); `node-14/thread-0/driver.queue.subject` (153.851 ms, trace `5658dadf3076658c0000000000000421`); `node-14/thread-0/driver.queue.scheduler-late` (122.201 ms, trace `5658dadf3076658c0000000000000423`); `node-14/thread-0/socket.wait-first-byte` (135.354 ms, trace `5658dadf3076658c000000000000041d`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-cores-b-2-candidate-ladder`; source `d709fd769d271992b6a87841489c90665585e919`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4259/4259 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 19106737.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 403 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 13386.486 | 1020.357 | 29.741 | 454 |
| L1 | 1 | 44957.158 | 2051.646 | 46.558 | 1476 |
| L4 | 4 | 44982.072 | 3215.097 | 87.816 | 1762 |
| L16 | 16 | 44968.996 | 10019.690 | 129.191 | 34266 |
| L64 | 64 | 44548.732 | 10979.153 | 181.268 | 35833 |
| L256 | 256 | 44769.424 | 2712.457 | 83.769 | 1560 |
| L1024 | 1024 | 44033.636 | 3499.231 | 111.974 | 1598 |
| tail | 0 | 164370.284 | 4123.039 | 103.478 | 6128 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 5658dadf3076658c0000000000000422 | driver.queue.scheduler-late | 129.148 | none | 4 / 32 |
| 5658dadf3076658c0000000000000422 | driver.queue.scheduler-dispatch | 0.040 | none | 4 / 32 |

Observed active steps while trace 5658dadf3076658c0000000000000422 waited: []

| 5658dadf3076658c0000000000000420 | driver.queue.subject | 158.181 | 5658dadf3076658c000000000000041f | 4 / 32 |
| 5658dadf3076658c0000000000000420 | driver.queue.scheduler-dispatch | 0.064 | none | 7 / 32 |
| 5658dadf3076658c0000000000000420 | driver.queue.scheduler-late | 0.045 | none | 4 / 32 |

Observed active steps while trace 5658dadf3076658c0000000000000420 waited: [{"at":1794809944205.3967,"inFlight":9,"capacity":32,"active":[{"traceId":"5658dadf3076658c000000000000041c","step":"client.http"},{"traceId":"5658dadf3076658c000000000000041d","step":"client.http"},{"traceId":"5658dadf3076658c000000000000041e","step":"client.http"},{"traceId":"5658dadf3076658c000000000000041f","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000422","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000423","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000424","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000425","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000429","step":"client.http"}]}]

| 5658dadf3076658c0000000000000421 | driver.queue.subject | 153.851 | 5658dadf3076658c000000000000041e | 4 / 32 |
| 5658dadf3076658c0000000000000421 | driver.queue.scheduler-dispatch | 0.086 | none | 8 / 32 |
| 5658dadf3076658c0000000000000421 | driver.queue.scheduler-late | 0.004 | none | 4 / 32 |

Observed active steps while trace 5658dadf3076658c0000000000000421 waited: [{"at":1794809944205.3967,"inFlight":9,"capacity":32,"active":[{"traceId":"5658dadf3076658c000000000000041c","step":"client.http"},{"traceId":"5658dadf3076658c000000000000041d","step":"client.http"},{"traceId":"5658dadf3076658c000000000000041e","step":"client.http"},{"traceId":"5658dadf3076658c000000000000041f","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000422","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000423","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000424","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000425","step":"client.http"},{"traceId":"5658dadf3076658c0000000000000429","step":"client.http"}]}]

| 5658dadf3076658c0000000000000423 | driver.queue.scheduler-late | 122.201 | none | 5 / 32 |
| 5658dadf3076658c0000000000000423 | driver.queue.scheduler-dispatch | 0.011 | none | 5 / 32 |

Observed active steps while trace 5658dadf3076658c0000000000000423 waited: []

| 5658dadf3076658c000000000000041d | driver.queue.scheduler-late | 2.659 | none | 1 / 32 |
| 5658dadf3076658c000000000000041d | driver.queue.scheduler-dispatch | 0.028 | none | 1 / 32 |

Observed active steps while trace 5658dadf3076658c000000000000041d waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.269 | 0.489 | 0.000 | 0.489 | 4.956 | 4.772 | 0.000 | 0.091 | 1.386 | 4.066 | 0.030 | n/a | 0.346 | 15.716 | n/a | n/a | 0.033 | 5.230 | 0.194 | 0.033 |
| p99 | 92.867 | 3.608 | 0.000 | 4.556 | 30.515 | n/a | 0.459 | 0.533 | 8.662 | 34.262 | 0.410 | n/a | 6.547 | 71.010 | n/a | n/a | 0.143 | 31.166 | 0.512 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000000105 | 92.867 | 30.515 | 0.569 | 0.000 | 0.081 | 3.936 | 32.663 | 0.410 | n/a | 6.547 | 18.119 | n/a | n/a | 0.026 | 31.166 | 0.336 | 0.026 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.037ms |
| 5658dadf3076658c0000000000000133 | 92.764 | 7.268 | 0.186 | 0.274 | 0.097 | 1.592 | 11.398 | 0.386 | n/a | 0.516 | 71.010 | n/a | n/a | 0.036 | 7.826 | 0.084 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| 5658dadf3076658c0000000000000121 | 62.782 | 6.464 | 0.253 | 0.271 | 0.103 | 2.307 | 34.262 | 0.029 | n/a | 0.084 | 18.966 | n/a | n/a | 0.044 | 7.091 | 0.113 | 0.044 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.072ms |
| 5658dadf3076658c0000000000000127 | 56.680 | 23.606 | 4.772 | 0.313 | 0.092 | 2.337 | 11.221 | 0.061 | n/a | 0.509 | 13.735 | n/a | n/a | 0.033 | 28.784 | 0.508 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 5658dadf3076658c0000000000000109 | 47.923 | 11.605 | 0.211 | 0.000 | 0.073 | 8.662 | 13.000 | 0.044 | n/a | 0.417 | 13.873 | n/a | n/a | 0.039 | 11.889 | 0.248 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 5658dadf3076658c0000000000000101 | 47.608 | 12.509 | n/a | 0.000 | 0.228 | 1.159 | 13.620 | 0.045 | n/a | 0.149 | 19.756 | n/a | n/a | 0.143 | 12.736 | 0.268 | 0.143 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000011d | 45.353 | 5.853 | 0.224 | 0.000 | 0.063 | 3.859 | 15.855 | 0.045 | n/a | 0.109 | 19.322 | n/a | n/a | 0.023 | 6.140 | 0.135 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 5658dadf3076658c000000000000010d | 44.519 | 15.794 | 0.182 | 0.000 | 0.118 | 4.852 | 8.523 | 0.032 | n/a | 0.123 | 14.847 | n/a | n/a | 0.047 | 16.094 | 0.362 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 5658dadf3076658c000000000000012f | 40.331 | 6.427 | 0.149 | 0.000 | 0.064 | 1.605 | 7.292 | 0.055 | n/a | 0.322 | 24.391 | n/a | n/a | 0.025 | 6.641 | 0.165 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 5658dadf3076658c0000000000000115 | 39.001 | 4.344 | 0.162 | 0.000 | 0.082 | 4.406 | 13.782 | 0.030 | n/a | 0.450 | 15.716 | n/a | n/a | 0.030 | 4.588 | 0.118 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 5658dadf3076658c0000000000000117 | 37.933 | 8.792 | 0.297 | 0.000 | 0.113 | 1.950 | 8.044 | 0.038 | n/a | 0.499 | 18.167 | n/a | n/a | 0.034 | 9.201 | 0.243 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 5658dadf3076658c000000000000012b | 37.111 | 4.466 | 0.375 | 0.298 | 0.091 | 1.532 | 9.232 | 0.042 | n/a | 0.438 | 20.601 | n/a | n/a | 0.037 | 5.230 | 0.141 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 5658dadf3076658c0000000000000137 | 35.930 | 5.752 | 0.172 | 0.254 | 0.113 | 1.128 | 10.521 | 0.030 | n/a | 0.437 | 17.481 | n/a | n/a | 0.042 | 6.291 | 0.175 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.080ms; driver.reader-basis.broadcast 0.069ms; driver.publication.persist-deferred 0.018ms |
| 5658dadf3076658c000000000000010f | 35.242 | 6.438 | 0.301 | 0.000 | 0.132 | 2.686 | 6.461 | 0.030 | n/a | 0.090 | 19.049 | n/a | n/a | 0.054 | 6.872 | 0.195 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 5658dadf3076658c000000000000011a | 28.269 | 4.129 | n/a | 0.000 | 0.072 | 1.087 | 3.177 | 0.026 | n/a | 2.162 | 17.587 | n/a | n/a | 0.029 | 4.201 | 0.149 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000118 | 28.076 | 10.371 | n/a | 0.000 | 0.136 | 3.275 | 1.821 | 0.022 | n/a | 0.098 | 12.300 | n/a | n/a | 0.053 | 10.508 | 0.374 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000129 | 25.818 | 4.956 | n/a | 0.000 | 0.045 | 1.304 | 2.304 | 0.032 | n/a | 0.638 | 16.515 | n/a | n/a | 0.024 | 5.001 | 0.194 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000124 | 24.339 | 3.801 | n/a | 0.000 | 0.123 | 1.005 | 1.302 | 0.024 | n/a | 0.489 | 17.552 | n/a | n/a | 0.044 | 3.924 | 0.161 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000112 | 23.103 | 4.166 | n/a | 0.000 | 0.063 | 0.765 | 1.552 | 0.023 | n/a | 0.090 | 16.417 | n/a | n/a | 0.026 | 4.229 | 0.183 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.685ms |
| 5658dadf3076658c000000000000011f | 21.071 | 9.265 | 0.945 | 0.459 | 0.114 | 1.428 | 2.331 | 0.031 | n/a | 0.439 | 6.014 | n/a | n/a | 0.046 | 10.782 | 0.512 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |

## P2/P4 / read-your-own-write / read (309 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.519 | n/a | n/a | n/a | 37.707 | 28.313 | 2.450 | 0.000 | 0.158 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.908 | 67.783 | 0.971 | 1.908 |
| p99 | 552.834 | n/a | n/a | n/a | 126.268 | 417.374 | 20.889 | 0.000 | 30.261 | 0.807 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 154.466 | 478.492 | 1.000 | 154.466 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000001a49 | 605.286 | 42.188 | 417.374 | 1.595 | 0.000 | 0.295 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 143.833 | 461.158 | 0.762 | 143.833 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.329ms; driver.reader-basis.broadcast 0.313ms; driver.reader-basis.broadcast 0.313ms |
| 5658dadf3076658c0000000000001a3e | 584.407 | 83.994 | 386.584 | 7.914 | 0.000 | 0.387 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 105.528 | 478.492 | 0.819 | 105.528 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.329ms; driver.reader-basis.broadcast 0.313ms |
| 5658dadf3076658c0000000000001a4b | 580.693 | 39.772 | 484.794 | 0.000 | 0.000 | 0.442 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 55.685 | 524.566 | 0.903 | 55.685 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.329ms; driver.reader-basis.broadcast 0.313ms; driver.reader-basis.broadcast 0.313ms |
| 5658dadf3076658c0000000000001a54 | 552.834 | 36.744 | 512.917 | 0.000 | 0.000 | 0.238 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.935 | 549.661 | 0.994 | 2.935 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.329ms; driver.reader-basis.broadcast 0.313ms; driver.reader-basis.broadcast 0.313ms |
| 5658dadf3076658c0000000000001a5d | 528.773 | 51.818 | 469.580 | 0.919 | 0.000 | 0.145 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.311 | 522.317 | 0.988 | 6.311 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.329ms; driver.reader-basis.broadcast 0.313ms; driver.reader-basis.broadcast 0.313ms |
| 5658dadf3076658c0000000000001a28 | 503.544 | 29.908 | 351.133 | 6.593 | 0.000 | 0.282 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 115.627 | 387.634 | 0.770 | 115.627 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.335ms; driver.reader-basis.broadcast 0.295ms |
| 5658dadf3076658c0000000000001a3d | 493.674 | 35.405 | 388.107 | 3.770 | 0.000 | 0.193 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.199 | 427.282 | 0.866 | 66.199 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.313ms; driver.reader-basis.broadcast 0.295ms |
| 5658dadf3076658c0000000000001a32 | 493.542 | 30.102 | 330.521 | 0.000 | 0.000 | 0.252 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 132.667 | 360.623 | 0.731 | 132.667 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.335ms; driver.reader-basis.broadcast 0.295ms |
| 5658dadf3076658c0000000000001a37 | 471.280 | 40.468 | 363.572 | 0.000 | 0.000 | 0.243 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.997 | 404.040 | 0.857 | 66.997 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.313ms; driver.reader-basis.broadcast 0.295ms |
| 5658dadf3076658c0000000000001a1c | 450.719 | 79.570 | 241.722 | 11.931 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 117.256 | 333.223 | 0.739 | 117.256 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.335ms; driver.reader-basis.broadcast 0.306ms; driver.reader-basis.broadcast 0.295ms |
| 5658dadf3076658c0000000000001a25 | 445.005 | 41.320 | 270.120 | 3.839 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 129.485 | 315.279 | 0.708 | 129.485 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.335ms; driver.reader-basis.broadcast 0.295ms; driver.publication.readback 0.240ms |
| 5658dadf3076658c0000000000001a17 | 437.994 | 47.348 | 195.631 | 7.254 | 0.000 | 0.265 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 187.496 | 250.232 | 0.571 | 187.496 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.335ms; driver.reader-basis.broadcast 0.306ms; driver.reader-basis.broadcast 0.295ms; driver.publication.readback 0.240ms |
| 5658dadf3076658c0000000000001a39 | 435.274 | 37.341 | 328.195 | 0.000 | 0.000 | 0.282 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 69.456 | 365.536 | 0.840 | 69.456 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.295ms; driver.publication.readback 0.240ms |
| 5658dadf3076658c0000000000001a41 | 417.721 | 54.857 | 349.876 | 2.572 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.176 | 407.306 | 0.975 | 10.176 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.295ms; driver.publication.readback 0.240ms |
| 5658dadf3076658c0000000000001a31 | 414.655 | 63.828 | 295.508 | 2.811 | 0.000 | 0.474 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.034 | 362.147 | 0.873 | 52.034 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.335ms; driver.reader-basis.broadcast 0.295ms |
| 5658dadf3076658c0000000000001a1b | 402.801 | 88.566 | 201.580 | 11.298 | 0.000 | 3.346 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 98.012 | 301.444 | 0.748 | 98.012 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.335ms; driver.reader-basis.broadcast 0.306ms; driver.reader-basis.broadcast 0.295ms; driver.publication.readback 0.240ms |
| 5658dadf3076658c0000000000001a40 | 399.055 | 84.478 | 231.165 | 9.926 | 0.000 | 3.577 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 69.909 | 325.569 | 0.816 | 69.909 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.695ms; driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.295ms; driver.publication.readback 0.240ms |
| 5658dadf3076658c0000000000001a53 | 385.906 | 35.333 | 303.709 | 0.000 | 0.000 | 0.264 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.600 | 339.043 | 0.879 | 46.600 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.338ms; driver.reader-basis.broadcast 0.313ms; driver.reader-basis.broadcast 0.295ms; driver.publication.readback 0.140ms |
| 5658dadf3076658c00000000000019d6 | 379.837 | 108.209 | 104.490 | 12.381 | 0.000 | 0.292 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 154.466 | 225.080 | 0.593 | 154.466 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 2.439ms; driver.reader-basis.broadcast 0.810ms; driver.reader-basis.broadcast 0.615ms; driver.publication.readback 0.515ms; driver.reader-basis.broadcast 0.354ms |
| 5658dadf3076658c0000000000001a6f | 378.963 | 16.887 | 334.756 | 8.534 | 0.000 | 0.212 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.575 | 360.177 | 0.950 | 18.575 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.554ms; driver.reader-basis.broadcast 0.329ms; driver.reader-basis.broadcast 0.313ms; driver.reader-basis.broadcast 0.313ms; driver.publication.readback 0.170ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.965 | 0.942 | 0.000 | 0.614 | 3.106 | n/a | 0.000 | 0.077 | 1.005 | 1.331 | 0.021 | n/a | 0.334 | 10.211 | n/a | n/a | 0.031 | 3.144 | 0.198 | 0.031 |
| p99 | 24.339 | 1.002 | 0.000 | 0.959 | 3.850 | n/a | 0.000 | 0.533 | 1.386 | 4.066 | 0.043 | n/a | 0.489 | 17.552 | n/a | n/a | 0.068 | 3.983 | 0.288 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000000124 | 24.339 | 3.801 | n/a | 0.000 | 0.123 | 1.005 | 1.302 | 0.024 | n/a | 0.489 | 17.552 | n/a | n/a | 0.044 | 3.924 | 0.161 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000010b | 19.186 | 3.263 | n/a | 0.000 | 0.533 | 1.104 | 1.572 | 0.023 | n/a | 0.375 | 12.291 | n/a | n/a | 0.024 | 3.796 | 0.198 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 5658dadf3076658c0000000000000138 | 19.083 | 3.106 | n/a | 0.000 | 0.033 | 1.184 | 0.906 | 0.019 | n/a | 0.213 | 13.605 | n/a | n/a | 0.016 | 3.139 | 0.165 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 5658dadf3076658c0000000000000130 | 18.110 | 2.226 | n/a | 0.000 | 0.056 | 0.819 | 3.794 | 0.021 | n/a | 0.094 | 11.074 | n/a | n/a | 0.024 | 2.281 | 0.126 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000134 | 16.965 | 3.850 | n/a | 0.000 | 0.133 | 1.036 | 1.290 | 0.043 | n/a | 0.346 | 10.211 | n/a | n/a | 0.056 | 3.983 | 0.235 | 0.056 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000110 | 13.877 | 2.999 | n/a | 0.000 | 0.145 | 0.873 | 4.066 | 0.020 | n/a | 0.077 | 5.630 | n/a | n/a | 0.068 | 3.144 | 0.227 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000107 | 13.427 | 2.382 | n/a | 0.000 | 0.064 | 0.710 | 1.592 | 0.021 | n/a | 0.163 | 8.464 | n/a | n/a | 0.031 | 2.446 | 0.182 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.111ms |
| 5658dadf3076658c000000000000012c | 12.133 | 3.421 | n/a | 0.000 | 0.077 | 1.386 | 1.331 | 0.022 | n/a | 0.334 | 5.531 | n/a | n/a | 0.031 | 3.498 | 0.288 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000122 | 11.128 | 2.239 | n/a | 0.000 | 0.062 | 0.777 | 1.237 | 0.021 | n/a | 0.429 | 6.335 | n/a | n/a | 0.027 | 2.300 | 0.207 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.907 | 0.000 | 0.000 | 0.315 | 5.046 | 10.333 | 0.345 | 0.053 | 1.594 | 10.096 | 0.061 | n/a | 0.436 | 14.918 | n/a | n/a | 0.026 | 15.776 | 0.368 | 0.026 |
| p99 | 42.907 | 0.000 | 0.000 | 0.315 | 5.046 | 10.333 | 0.345 | 0.053 | 1.594 | 10.096 | 0.061 | n/a | 0.436 | 14.918 | n/a | n/a | 0.026 | 15.776 | 0.368 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c000000000000013b | 42.907 | 5.046 | 10.333 | 0.345 | 0.053 | 1.594 | 10.096 | 0.061 | n/a | 0.436 | 14.918 | n/a | n/a | 0.026 | 15.776 | 0.368 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |

## P2 / L1 / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.825 | 0.221 | 0.000 | 0.529 | 3.533 | n/a | 0.000 | 0.064 | 1.199 | 5.690 | 0.031 | n/a | 0.317 | 11.736 | n/a | n/a | 0.028 | 3.879 | 0.176 | 0.028 |
| p99 | 83.285 | 2.001 | 0.038 | 2.162 | 10.080 | n/a | 0.462 | 5.227 | 7.585 | 27.019 | 0.595 | n/a | 5.556 | 66.490 | n/a | n/a | 0.072 | 10.341 | 0.493 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c000000000000014c | 83.285 | 5.104 | n/a | 0.000 | 0.059 | 1.358 | 9.815 | 0.033 | n/a | 0.396 | 66.490 | n/a | n/a | 0.031 | 5.163 | 0.062 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| 5658dadf3076658c000000000000019a | 52.319 | 2.324 | n/a | 0.000 | 0.052 | 0.778 | 2.314 | 0.025 | n/a | 0.104 | 46.695 | n/a | n/a | 0.027 | 2.376 | 0.045 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.119ms |
| 5658dadf3076658c0000000000000195 | 49.349 | 8.768 | 0.203 | 0.000 | 0.107 | 1.757 | 9.885 | 0.034 | n/a | 0.927 | 27.623 | n/a | n/a | 0.045 | 9.077 | 0.184 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 5658dadf3076658c0000000000000197 | 42.387 | 6.605 | 0.231 | 0.000 | 0.054 | 2.314 | 17.940 | 0.029 | n/a | 0.181 | 15.008 | n/a | n/a | 0.023 | 6.891 | 0.163 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.082ms |
| 5658dadf3076658c00000000000001bf | 39.659 | 3.215 | 0.138 | 0.211 | 0.053 | 0.933 | 27.019 | 0.034 | n/a | 0.100 | 7.930 | n/a | n/a | 0.026 | 3.617 | 0.091 | 0.026 | gw-w/thread-45/gateway.request-parse | driver.reader-basis.broadcast 0.043ms |
| 5658dadf3076658c0000000000000179 | 39.190 | 3.138 | 0.145 | 0.408 | 0.057 | 4.581 | 16.580 | 0.033 | n/a | 0.128 | 14.097 | n/a | n/a | 0.023 | 3.748 | 0.096 | 0.023 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.073ms |
| 5658dadf3076658c0000000000000151 | 38.097 | 3.980 | 0.231 | 0.268 | 0.096 | 1.560 | 15.642 | 0.039 | n/a | 0.099 | 16.132 | n/a | n/a | 0.050 | 4.574 | 0.120 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| 5658dadf3076658c000000000000013d | 36.750 | 6.990 | 0.152 | 0.000 | 0.056 | 3.150 | 9.832 | 0.030 | n/a | 0.380 | 16.136 | n/a | n/a | 0.023 | 7.199 | 0.196 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.083ms |
| 5658dadf3076658c00000000000001c9 | 36.552 | 7.530 | 0.195 | 0.000 | 0.058 | 1.322 | 7.315 | 0.030 | n/a | 0.273 | 19.801 | n/a | n/a | 0.028 | 7.783 | 0.213 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 5658dadf3076658c0000000000000146 | 34.283 | 4.364 | 0.175 | 0.000 | 0.067 | 4.642 | 12.695 | 0.054 | n/a | 0.093 | 12.159 | n/a | n/a | 0.034 | 4.605 | 0.134 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 5658dadf3076658c000000000000014b | 32.925 | 6.755 | 0.264 | 0.317 | 0.079 | 1.864 | 3.934 | 0.124 | n/a | 5.556 | 14.005 | n/a | n/a | 0.027 | 7.415 | 0.225 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 5658dadf3076658c00000000000001ad | 32.543 | 3.616 | 0.196 | 0.000 | 0.058 | 1.409 | 13.123 | 0.067 | n/a | 0.733 | 13.314 | n/a | n/a | 0.028 | 3.869 | 0.119 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| 5658dadf3076658c0000000000000149 | 32.151 | 3.570 | 0.222 | 0.000 | 0.073 | 4.930 | 13.204 | 0.030 | n/a | 0.126 | 9.967 | n/a | n/a | 0.028 | 3.865 | 0.120 | 0.028 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.093ms |
| 5658dadf3076658c0000000000000177 | 31.869 | 5.197 | 0.230 | 0.000 | 0.104 | 4.906 | 6.598 | 0.061 | n/a | 0.440 | 14.287 | n/a | n/a | 0.046 | 5.531 | 0.174 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 5658dadf3076658c00000000000001e7 | 31.246 | 3.079 | 0.140 | 0.275 | 0.055 | 1.007 | 10.549 | 0.027 | n/a | 0.580 | 15.509 | n/a | n/a | 0.025 | 3.550 | 0.114 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 5658dadf3076658c00000000000001c3 | 30.930 | 3.339 | 0.199 | 0.220 | 0.091 | 7.585 | 11.166 | 0.038 | n/a | 0.115 | 8.135 | n/a | n/a | 0.041 | 3.849 | 0.124 | 0.041 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.044ms |
| 5658dadf3076658c0000000000000167 | 30.803 | 3.485 | 0.184 | 0.000 | 0.066 | 1.369 | 11.146 | 0.063 | n/a | 0.434 | 14.027 | n/a | n/a | 0.030 | 3.735 | 0.121 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| 5658dadf3076658c00000000000001db | 30.641 | 3.593 | 0.230 | 0.228 | 0.089 | 2.847 | 12.041 | 0.039 | n/a | 0.094 | 11.456 | n/a | n/a | 0.024 | 4.141 | 0.135 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 5658dadf3076658c000000000000013f | 30.442 | 4.116 | 0.180 | 0.000 | 0.060 | 1.499 | 9.322 | 0.040 | n/a | 0.412 | 14.789 | n/a | n/a | 0.025 | 4.356 | 0.143 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms |
| 5658dadf3076658c000000000000015b | 30.026 | 3.770 | 0.225 | 0.000 | 0.078 | 1.223 | 10.211 | 0.045 | n/a | 0.098 | 14.349 | n/a | n/a | 0.028 | 4.073 | 0.136 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.713 | 0.000 | 0.000 | 0.454 | 2.448 | n/a | 0.000 | 0.067 | 0.806 | 1.344 | 0.021 | n/a | 0.345 | 9.680 | n/a | n/a | 0.030 | 2.585 | 0.181 | 0.030 |
| p99 | 29.330 | 1.002 | 0.000 | 0.874 | 5.021 | n/a | 0.000 | 5.227 | 1.939 | 7.563 | 0.595 | n/a | 3.165 | 23.760 | n/a | n/a | 0.066 | 6.756 | 0.493 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c00000000000001dc | 29.330 | 2.486 | n/a | 0.000 | 0.099 | 0.833 | 1.446 | 0.021 | n/a | 0.621 | 23.760 | n/a | n/a | 0.063 | 2.585 | 0.088 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000147 | 28.075 | 5.021 | n/a | 0.000 | 0.059 | 1.939 | 7.563 | 0.046 | n/a | 0.277 | 13.143 | n/a | n/a | 0.028 | 5.080 | 0.181 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000018e | 22.895 | 2.012 | n/a | 0.000 | 0.050 | 0.536 | 3.364 | 0.021 | n/a | 0.110 | 16.778 | n/a | n/a | 0.025 | 2.062 | 0.090 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000144 | 21.375 | 2.299 | n/a | 0.000 | 0.056 | 0.750 | 1.535 | 0.021 | n/a | 1.927 | 14.762 | n/a | n/a | 0.026 | 2.354 | 0.110 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000017f | 19.787 | 2.284 | n/a | 0.000 | 0.137 | 1.700 | 5.176 | 0.076 | n/a | 0.684 | 9.680 | n/a | n/a | 0.049 | 2.422 | 0.122 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000158 | 18.371 | 3.503 | n/a | 0.000 | 0.123 | 0.832 | 1.809 | 0.022 | n/a | 0.409 | 11.624 | n/a | n/a | 0.049 | 3.627 | 0.197 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000193 | 18.110 | 2.184 | n/a | 0.000 | 0.058 | 0.908 | 1.344 | 0.030 | n/a | 0.369 | 13.195 | n/a | n/a | 0.024 | 2.241 | 0.124 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000019c | 17.435 | 3.080 | n/a | 0.000 | 0.067 | 0.816 | 1.061 | 0.021 | n/a | 0.317 | 12.016 | n/a | n/a | 0.056 | 3.147 | 0.181 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000016d | 16.948 | 1.771 | n/a | 0.000 | 0.052 | 0.567 | 1.133 | 0.023 | n/a | 0.151 | 13.228 | n/a | n/a | 0.022 | 1.824 | 0.108 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001de | 16.948 | 2.620 | n/a | 0.000 | 0.070 | 0.936 | 1.102 | 0.021 | n/a | 0.426 | 11.736 | n/a | n/a | 0.038 | 2.689 | 0.159 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001a5 | 16.235 | 3.942 | n/a | 0.000 | 0.097 | 0.655 | 1.149 | 0.021 | n/a | 0.345 | 9.989 | n/a | n/a | 0.038 | 4.039 | 0.249 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001ea | 15.713 | 3.261 | n/a | 0.000 | 0.134 | 0.991 | 5.576 | 0.595 | n/a | 0.792 | 4.297 | n/a | n/a | 0.066 | 3.395 | 0.216 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001d6 | 15.476 | 2.448 | n/a | 0.000 | 0.064 | 0.693 | 1.050 | 0.021 | n/a | 0.144 | 11.027 | n/a | n/a | 0.027 | 2.513 | 0.162 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001e2 | 15.187 | 3.011 | n/a | 0.000 | 0.116 | 0.806 | 1.357 | 0.021 | n/a | 0.393 | 9.427 | n/a | n/a | 0.056 | 3.127 | 0.206 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000188 | 13.711 | 1.529 | n/a | 0.000 | 5.227 | 0.474 | 0.923 | 0.019 | n/a | 0.110 | 5.409 | n/a | n/a | 0.021 | 6.756 | 0.493 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.018ms |
| 5658dadf3076658c00000000000001c0 | 13.261 | 2.588 | n/a | 0.000 | 0.048 | 0.822 | 4.648 | 0.021 | n/a | 0.415 | 4.683 | n/a | n/a | 0.036 | 2.636 | 0.199 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001a2 | 12.249 | 3.465 | n/a | 0.000 | 0.151 | 0.715 | 1.472 | 0.042 | n/a | 0.187 | 6.151 | n/a | n/a | 0.066 | 3.615 | 0.295 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 5658dadf3076658c0000000000000172 | 11.390 | 1.491 | n/a | 0.000 | 0.017 | 1.330 | 1.384 | 0.043 | n/a | 3.165 | 3.950 | n/a | n/a | 0.010 | 1.508 | 0.132 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001b6 | 10.701 | 2.659 | n/a | 0.000 | 0.133 | 0.759 | 1.152 | 0.022 | n/a | 0.106 | 5.814 | n/a | n/a | 0.056 | 2.792 | 0.261 | 0.056 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001d8 | 9.252 | 1.477 | n/a | 0.000 | 0.056 | 0.656 | 1.075 | 0.021 | n/a | 0.105 | 5.836 | n/a | n/a | 0.026 | 1.533 | 0.166 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.629 | 0.196 | 0.000 | 0.461 | 3.603 | n/a | 0.000 | 0.057 | 1.112 | 4.370 | 0.032 | n/a | 0.230 | 9.670 | n/a | n/a | 0.024 | 3.895 | 0.190 | 0.024 |
| p99 | 98.241 | 1.998 | 0.000 | 1.547 | 13.286 | n/a | 1.021 | 1.773 | 9.965 | 23.874 | 1.066 | n/a | 3.829 | 80.792 | n/a | n/a | 0.080 | 14.001 | 0.435 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000000297 | 140.527 | 3.000 | n/a | 0.000 | 0.047 | 0.789 | 1.278 | 0.034 | n/a | 0.116 | 135.234 | n/a | n/a | 0.029 | 3.047 | 0.022 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.121ms |
| 5658dadf3076658c00000000000002b2 | 98.241 | 4.591 | 0.293 | 0.000 | 0.063 | 1.748 | 10.575 | 0.042 | n/a | 0.102 | 80.792 | n/a | n/a | 0.035 | 4.947 | 0.050 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| 5658dadf3076658c00000000000001f2 | 69.049 | 3.730 | n/a | 0.000 | 0.097 | 0.918 | 1.058 | 0.020 | n/a | 0.104 | 63.079 | n/a | n/a | 0.042 | 3.827 | 0.055 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.141ms |
| 5658dadf3076658c00000000000001ff | 62.244 | 11.016 | n/a | 0.000 | 0.064 | 5.863 | 16.085 | 0.113 | n/a | 0.370 | 28.707 | n/a | n/a | 0.027 | 11.080 | 0.178 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 5658dadf3076658c0000000000000255 | 59.230 | 9.605 | 0.131 | 0.242 | 0.058 | 1.191 | 39.659 | 0.041 | n/a | 0.145 | 8.135 | n/a | n/a | 0.023 | 10.037 | 0.169 | 0.023 | gw-w/thread-43/commit.prepare-and-validate | driver.reader-basis.broadcast 0.049ms |
| 5658dadf3076658c0000000000000208 | 53.600 | 7.275 | 0.155 | 0.372 | 0.054 | 2.427 | 23.874 | 0.040 | n/a | 2.037 | 17.346 | n/a | n/a | 0.021 | 7.856 | 0.147 | 0.021 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.045ms |
| 5658dadf3076658c000000000000023c | 50.883 | 2.780 | n/a | 0.000 | 0.103 | 1.146 | 4.810 | 0.020 | n/a | 0.106 | 41.888 | n/a | n/a | 0.031 | 2.882 | 0.057 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.171ms |
| 5658dadf3076658c0000000000000286 | 48.528 | 3.977 | 0.177 | 0.226 | 0.064 | 1.173 | 18.909 | 0.040 | n/a | 0.235 | 23.703 | n/a | n/a | 0.024 | 4.444 | 0.092 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.149ms |
| 5658dadf3076658c00000000000002af | 44.920 | 5.781 | n/a | 0.000 | 0.160 | 2.360 | 2.782 | 0.081 | n/a | 1.025 | 32.627 | n/a | n/a | 0.104 | 5.942 | 0.132 | 0.104 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000212 | 44.132 | 11.421 | 0.163 | 0.273 | 0.080 | 1.548 | 13.057 | 0.052 | n/a | 0.549 | 16.954 | n/a | n/a | 0.034 | 11.937 | 0.270 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 5658dadf3076658c0000000000000231 | 41.123 | 3.781 | 1.883 | 0.273 | 0.027 | 1.522 | 7.464 | 0.041 | n/a | 0.157 | 25.957 | n/a | n/a | 0.018 | 5.964 | 0.145 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 5658dadf3076658c0000000000000220 | 41.100 | 10.827 | 0.253 | 0.921 | 0.094 | 1.517 | 7.600 | 0.032 | n/a | 0.435 | 19.380 | n/a | n/a | 0.040 | 12.095 | 0.294 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 5658dadf3076658c000000000000024d | 40.640 | 4.563 | 0.162 | 0.357 | 0.069 | 1.534 | 13.531 | 0.059 | n/a | 0.440 | 19.901 | n/a | n/a | 0.024 | 5.151 | 0.127 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms |
| 5658dadf3076658c0000000000000241 | 40.318 | 8.617 | 0.139 | 0.265 | 0.059 | 12.163 | 9.196 | 0.035 | n/a | 0.099 | 9.722 | n/a | n/a | 0.022 | 9.080 | 0.225 | 0.022 | node-14/thread-9/socket.wait-first-byte | driver.reader-basis.broadcast 0.040ms |
| 5658dadf3076658c000000000000022e | 40.175 | 4.150 | 0.200 | 0.279 | 0.078 | 1.451 | 18.723 | 0.034 | n/a | 3.829 | 11.397 | n/a | n/a | 0.034 | 4.707 | 0.117 | 0.034 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.042ms |
| 5658dadf3076658c000000000000020a | 39.827 | 13.286 | 0.154 | 0.479 | 0.083 | 5.269 | 6.487 | 0.030 | n/a | 0.427 | 13.577 | n/a | n/a | 0.037 | 14.001 | 0.352 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 5658dadf3076658c00000000000002ba | 39.810 | 12.672 | 0.211 | 0.000 | 0.058 | 1.663 | 7.644 | 0.044 | n/a | 3.592 | 13.904 | n/a | n/a | 0.023 | 12.941 | 0.325 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.102ms |
| 5658dadf3076658c000000000000021a | 37.971 | 6.825 | 0.164 | 0.260 | 0.048 | 7.089 | 8.339 | 0.056 | n/a | 0.277 | 14.892 | n/a | n/a | 0.021 | 7.298 | 0.192 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 5658dadf3076658c0000000000000267 | 37.939 | 10.978 | 0.190 | 0.278 | 0.059 | 2.207 | 13.846 | 0.038 | n/a | 0.108 | 10.212 | n/a | n/a | 0.024 | 11.504 | 0.303 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 5658dadf3076658c00000000000002c0 | 36.832 | 7.548 | 0.131 | 0.000 | 0.056 | 9.616 | 7.881 | 0.048 | n/a | 0.600 | 10.926 | n/a | n/a | 0.025 | 7.735 | 0.210 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.220 | 0.559 | 0.000 | 0.461 | 2.343 | n/a | 0.000 | 0.059 | 0.841 | 1.685 | 0.021 | n/a | 0.201 | 7.764 | n/a | n/a | 0.026 | 2.569 | 0.171 | 0.026 |
| p99 | 69.049 | 1.628 | 0.000 | 1.013 | 5.781 | n/a | 0.000 | 3.117 | 7.047 | 9.197 | 3.132 | n/a | 3.331 | 63.079 | n/a | n/a | 0.104 | 5.942 | 0.435 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c00000000000001f2 | 69.049 | 3.730 | n/a | 0.000 | 0.097 | 0.918 | 1.058 | 0.020 | n/a | 0.104 | 63.079 | n/a | n/a | 0.042 | 3.827 | 0.055 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.141ms |
| 5658dadf3076658c000000000000023c | 50.883 | 2.780 | n/a | 0.000 | 0.103 | 1.146 | 4.810 | 0.020 | n/a | 0.106 | 41.888 | n/a | n/a | 0.031 | 2.882 | 0.057 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.171ms |
| 5658dadf3076658c00000000000002af | 44.920 | 5.781 | n/a | 0.000 | 0.160 | 2.360 | 2.782 | 0.081 | n/a | 1.025 | 32.627 | n/a | n/a | 0.104 | 5.942 | 0.132 | 0.104 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001f8 | 29.064 | 2.909 | n/a | 0.000 | 0.122 | 0.774 | 7.379 | 0.042 | n/a | 0.104 | 17.670 | n/a | n/a | 0.064 | 3.031 | 0.104 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000230 | 26.944 | 5.112 | n/a | 0.000 | 0.093 | 7.047 | 9.197 | 3.132 | n/a | 0.503 | 1.818 | n/a | n/a | 0.041 | 5.205 | 0.193 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |
| 5658dadf3076658c0000000000000257 | 24.627 | 1.641 | n/a | 0.000 | 0.024 | 1.708 | 1.087 | 0.012 | n/a | 0.044 | 20.099 | n/a | n/a | 0.014 | 1.665 | 0.068 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.016ms |
| 5658dadf3076658c0000000000000221 | 22.980 | 3.042 | n/a | 0.000 | 0.059 | 0.938 | 4.845 | 0.094 | n/a | 0.215 | 13.758 | n/a | n/a | 0.029 | 3.101 | 0.135 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000205 | 20.736 | 1.687 | n/a | 0.000 | 0.039 | 1.588 | 1.765 | 0.048 | n/a | 0.189 | 15.399 | n/a | n/a | 0.020 | 1.726 | 0.083 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000262 | 20.592 | 1.809 | n/a | 0.000 | 0.846 | 0.580 | 1.068 | 0.016 | n/a | 3.207 | 13.050 | n/a | n/a | 0.015 | 2.656 | 0.129 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001f4 | 18.160 | 1.772 | n/a | 0.000 | 0.051 | 0.543 | 1.270 | 0.019 | n/a | 3.331 | 11.147 | n/a | n/a | 0.027 | 1.823 | 0.100 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000027b | 17.915 | 2.082 | n/a | 0.000 | 0.059 | 0.612 | 1.306 | 0.018 | n/a | 0.205 | 13.609 | n/a | n/a | 0.025 | 2.140 | 0.119 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000024e | 16.803 | 1.786 | n/a | 0.000 | 0.041 | 4.102 | 1.054 | 0.016 | n/a | 0.135 | 9.644 | n/a | n/a | 0.026 | 1.827 | 0.109 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000238 | 16.700 | 2.528 | n/a | 0.000 | 0.042 | 3.757 | 1.766 | 0.031 | n/a | 0.591 | 7.964 | n/a | n/a | 0.022 | 2.570 | 0.154 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000001f6 | 15.415 | 2.178 | n/a | 0.000 | 0.042 | 0.781 | 1.713 | 0.042 | n/a | 0.183 | 10.453 | n/a | n/a | 0.024 | 2.220 | 0.144 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000002bb | 15.269 | 2.764 | n/a | 0.000 | 0.050 | 1.116 | 2.478 | 0.055 | n/a | 0.201 | 8.579 | n/a | n/a | 0.025 | 2.814 | 0.184 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000289 | 15.144 | 3.614 | n/a | 0.000 | 0.128 | 0.841 | 4.689 | 0.019 | n/a | 0.402 | 5.395 | n/a | n/a | 0.057 | 3.741 | 0.247 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000021b | 14.587 | 1.663 | n/a | 0.000 | 0.043 | 0.676 | 4.643 | 0.022 | n/a | 0.082 | 7.436 | n/a | n/a | 0.022 | 1.706 | 0.117 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000276 | 14.220 | 3.082 | n/a | 0.000 | 0.052 | 1.526 | 5.247 | 0.040 | n/a | 1.121 | 3.126 | n/a | n/a | 0.026 | 3.134 | 0.220 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000217 | 13.776 | 2.284 | n/a | 0.000 | 0.076 | 1.033 | 1.914 | 0.052 | n/a | 0.626 | 7.764 | n/a | n/a | 0.028 | 2.360 | 0.171 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000244 | 13.504 | 2.582 | n/a | 0.000 | 0.104 | 0.940 | 5.067 | 0.037 | n/a | 0.123 | 4.571 | n/a | n/a | 0.080 | 2.686 | 0.199 | 0.080 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1702 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.818 | 0.475 | 0.000 | 0.531 | 2.343 | n/a | 0.000 | 0.048 | 0.667 | 1.103 | 0.014 | n/a | 0.115 | 5.650 | n/a | n/a | 0.019 | 2.729 | 0.244 | 0.019 |
| p99 | 93.486 | 2.722 | 0.068 | 2.224 | 7.581 | n/a | 0.000 | 39.534 | 9.749 | 10.015 | 0.083 | n/a | 4.139 | 39.466 | n/a | n/a | 0.057 | 42.150 | 0.716 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000000422 | 203.200 | 5.411 | n/a | 0.000 | 129.188 | 6.356 | 18.351 | 0.042 | n/a | 3.772 | 40.014 | n/a | n/a | 0.065 | 134.599 | 0.662 | 0.065 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms; driver.publication.readback 0.061ms |
| 5658dadf3076658c0000000000000420 | 194.785 | 1.493 | n/a | 0.000 | 158.290 | 2.268 | 5.684 | 0.027 | n/a | 3.032 | 23.980 | n/a | n/a | 0.011 | 159.783 | 0.820 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms |
| 5658dadf3076658c0000000000000421 | 190.031 | 1.911 | n/a | 0.000 | 153.942 | 6.344 | 1.759 | 0.035 | n/a | 0.088 | 25.940 | n/a | n/a | 0.013 | 155.852 | 0.820 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms |
| 5658dadf3076658c0000000000000423 | 179.063 | 5.959 | n/a | 0.000 | 122.212 | 13.736 | 2.992 | 0.045 | n/a | 0.104 | 34.008 | n/a | n/a | 0.006 | 128.170 | 0.716 | 0.006 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.061ms; driver.publication.readback 0.050ms |
| 5658dadf3076658c000000000000041d | 174.988 | 3.240 | n/a | 0.000 | 2.686 | 136.757 | 1.724 | 0.032 | n/a | 0.062 | 30.472 | n/a | n/a | 0.017 | 5.926 | 0.034 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.074ms |
| 5658dadf3076658c000000000000041c | 171.792 | 3.469 | n/a | 0.000 | 0.068 | 132.127 | 1.324 | 0.023 | n/a | 0.128 | 34.625 | n/a | n/a | 0.027 | 3.538 | 0.021 | 0.027 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.074ms |
| 5658dadf3076658c000000000000041e | 171.128 | 3.997 | n/a | 0.000 | 0.886 | 134.180 | 1.573 | 0.037 | n/a | 0.108 | 30.334 | n/a | n/a | 0.011 | 4.884 | 0.029 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.074ms |
| 5658dadf3076658c0000000000000424 | 168.044 | 6.397 | n/a | 0.000 | 113.871 | 25.240 | 0.794 | 0.036 | n/a | 0.049 | 21.652 | n/a | n/a | 0.005 | 120.269 | 0.716 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.049ms |
| 5658dadf3076658c000000000000041f | 167.647 | 4.748 | n/a | 0.000 | 0.100 | 130.797 | 2.669 | 0.035 | n/a | 0.266 | 29.009 | n/a | n/a | 0.023 | 4.847 | 0.029 | 0.023 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.074ms |
| 5658dadf3076658c0000000000000426 | 146.693 | 2.227 | n/a | 0.000 | 111.731 | 2.280 | 1.239 | 0.023 | n/a | 0.290 | 28.880 | n/a | n/a | 0.023 | 113.958 | 0.777 | 0.023 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms; driver.publication.readback 0.061ms |
| 5658dadf3076658c0000000000000428 | 142.829 | 2.581 | n/a | 0.000 | 110.289 | 2.205 | 1.642 | 0.024 | n/a | 5.246 | 20.829 | n/a | n/a | 0.012 | 112.870 | 0.790 | 0.012 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms; driver.publication.readback 0.061ms |
| 5658dadf3076658c000000000000042a | 131.820 | 1.316 | n/a | 0.000 | 116.037 | 1.376 | 1.160 | 1.264 | n/a | 1.495 | 9.157 | n/a | n/a | 0.013 | 117.353 | 0.890 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.324ms; driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.074ms |
| 5658dadf3076658c0000000000000425 | 130.350 | 7.048 | n/a | 0.000 | 75.303 | 25.164 | 1.076 | 0.013 | n/a | 0.046 | 21.695 | n/a | n/a | 0.004 | 82.351 | 0.632 | 0.004 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.061ms; driver.publication.readback 0.050ms |
| 5658dadf3076658c000000000000042b | 125.026 | 1.626 | n/a | 0.000 | 112.888 | 0.438 | 1.138 | 0.023 | n/a | 0.078 | 8.823 | n/a | n/a | 0.012 | 114.514 | 0.916 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.324ms; driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.098ms |
| 5658dadf3076658c0000000000000432 | 112.406 | 2.559 | n/a | 0.000 | 99.329 | 2.247 | 1.328 | 0.044 | n/a | 0.190 | 6.693 | n/a | n/a | 0.016 | 101.888 | 0.906 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.324ms; driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.publication.readback 0.139ms; driver.publication.readback 0.106ms |
| 5658dadf3076658c0000000000000429 | 101.207 | 7.581 | n/a | 0.000 | 47.906 | 24.498 | 0.628 | 0.009 | n/a | 0.021 | 20.559 | n/a | n/a | 0.005 | 55.487 | 0.548 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.049ms |
| 5658dadf3076658c0000000000000427 | 99.685 | 2.804 | n/a | 0.000 | 69.474 | 0.755 | 1.514 | 0.056 | n/a | 4.080 | 20.983 | n/a | n/a | 0.018 | 72.279 | 0.725 | 0.018 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms; driver.publication.readback 0.033ms; driver.publication.persist-deferred 0.028ms |
| 5658dadf3076658c0000000000000f16 | 93.486 | 5.065 | n/a | 0.000 | 0.051 | 0.829 | 2.113 | 0.021 | n/a | 0.095 | 85.287 | n/a | n/a | 0.026 | 5.115 | 0.055 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.220ms |
| 5658dadf3076658c0000000000000f18 | 90.725 | 2.764 | n/a | 0.000 | 75.012 | 0.807 | 1.978 | 0.047 | n/a | 0.136 | 9.941 | n/a | n/a | 0.039 | 77.776 | 0.857 | 0.039 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.014ms; driver.reader-basis.broadcast 0.214ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.039ms |
| 5658dadf3076658c0000000000000f17 | 82.387 | 3.319 | n/a | 0.000 | 1.740 | 2.122 | 0.865 | 0.010 | n/a | 0.102 | 74.213 | n/a | n/a | 0.015 | 5.060 | 0.061 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.014ms; driver.publication.persist-deferred 0.039ms |

## P2 / L16 / commit / 5-10 facts (990 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.550 | 0.000 | 0.000 | 0.425 | 1.913 | n/a | 0.000 | 0.050 | 0.657 | 0.953 | 0.014 | n/a | 0.114 | 5.120 | n/a | n/a | 0.018 | 2.255 | 0.227 | 0.018 |
| p99 | 101.207 | 2.002 | 0.041 | 1.063 | 4.629 | n/a | 0.000 | 69.474 | 9.096 | 7.301 | 0.085 | n/a | 4.080 | 40.790 | n/a | n/a | 0.057 | 72.279 | 0.732 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000000420 | 194.785 | 1.493 | n/a | 0.000 | 158.290 | 2.268 | 5.684 | 0.027 | n/a | 3.032 | 23.980 | n/a | n/a | 0.011 | 159.783 | 0.820 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms |
| 5658dadf3076658c0000000000000421 | 190.031 | 1.911 | n/a | 0.000 | 153.942 | 6.344 | 1.759 | 0.035 | n/a | 0.088 | 25.940 | n/a | n/a | 0.013 | 155.852 | 0.820 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms |
| 5658dadf3076658c000000000000041e | 171.128 | 3.997 | n/a | 0.000 | 0.886 | 134.180 | 1.573 | 0.037 | n/a | 0.108 | 30.334 | n/a | n/a | 0.011 | 4.884 | 0.029 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.074ms |
| 5658dadf3076658c0000000000000424 | 168.044 | 6.397 | n/a | 0.000 | 113.871 | 25.240 | 0.794 | 0.036 | n/a | 0.049 | 21.652 | n/a | n/a | 0.005 | 120.269 | 0.716 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.049ms |
| 5658dadf3076658c0000000000000426 | 146.693 | 2.227 | n/a | 0.000 | 111.731 | 2.280 | 1.239 | 0.023 | n/a | 0.290 | 28.880 | n/a | n/a | 0.023 | 113.958 | 0.777 | 0.023 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms; driver.publication.readback 0.061ms |
| 5658dadf3076658c000000000000042a | 131.820 | 1.316 | n/a | 0.000 | 116.037 | 1.376 | 1.160 | 1.264 | n/a | 1.495 | 9.157 | n/a | n/a | 0.013 | 117.353 | 0.890 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.324ms; driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.074ms |
| 5658dadf3076658c0000000000000425 | 130.350 | 7.048 | n/a | 0.000 | 75.303 | 25.164 | 1.076 | 0.013 | n/a | 0.046 | 21.695 | n/a | n/a | 0.004 | 82.351 | 0.632 | 0.004 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.061ms; driver.publication.readback 0.050ms |
| 5658dadf3076658c000000000000042b | 125.026 | 1.626 | n/a | 0.000 | 112.888 | 0.438 | 1.138 | 0.023 | n/a | 0.078 | 8.823 | n/a | n/a | 0.012 | 114.514 | 0.916 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.324ms; driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.098ms |
| 5658dadf3076658c0000000000000432 | 112.406 | 2.559 | n/a | 0.000 | 99.329 | 2.247 | 1.328 | 0.044 | n/a | 0.190 | 6.693 | n/a | n/a | 0.016 | 101.888 | 0.906 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.324ms; driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.publication.readback 0.139ms; driver.publication.readback 0.106ms |
| 5658dadf3076658c0000000000000429 | 101.207 | 7.581 | n/a | 0.000 | 47.906 | 24.498 | 0.628 | 0.009 | n/a | 0.021 | 20.559 | n/a | n/a | 0.005 | 55.487 | 0.548 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.049ms |
| 5658dadf3076658c0000000000000427 | 99.685 | 2.804 | n/a | 0.000 | 69.474 | 0.755 | 1.514 | 0.056 | n/a | 4.080 | 20.983 | n/a | n/a | 0.018 | 72.279 | 0.725 | 0.018 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.050ms; driver.publication.readback 0.033ms; driver.publication.persist-deferred 0.028ms |
| 5658dadf3076658c0000000000000f18 | 90.725 | 2.764 | n/a | 0.000 | 75.012 | 0.807 | 1.978 | 0.047 | n/a | 0.136 | 9.941 | n/a | n/a | 0.039 | 77.776 | 0.857 | 0.039 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.014ms; driver.reader-basis.broadcast 0.214ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.039ms |
| 5658dadf3076658c0000000000000430 | 76.297 | 1.722 | n/a | 0.000 | 11.949 | 6.931 | 14.484 | 0.022 | n/a | 0.388 | 40.790 | n/a | n/a | 0.012 | 13.671 | 0.179 | 0.012 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms; driver.publication.readback 0.061ms |
| 5658dadf3076658c0000000000000cae | 74.446 | 2.536 | n/a | 0.000 | 0.099 | 1.045 | 1.431 | 0.019 | n/a | 0.302 | 68.982 | n/a | n/a | 0.032 | 2.635 | 0.035 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.159ms |
| 5658dadf3076658c0000000000000cb2 | 70.857 | 1.206 | n/a | 0.000 | 1.038 | 0.562 | 0.573 | 0.004 | n/a | 0.015 | 67.451 | n/a | n/a | 0.008 | 2.244 | 0.032 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.159ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.008ms |
| 5658dadf3076658c0000000000000431 | 69.991 | 2.024 | n/a | 0.000 | 3.686 | 15.339 | 4.073 | 0.013 | n/a | 0.356 | 44.493 | n/a | n/a | 0.008 | 5.710 | 0.082 | 0.008 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.230ms; driver.publication.readback 0.207ms; driver.publication.readback 0.069ms; driver.publication.readback 0.061ms; driver.publication.readback 0.058ms |
| 5658dadf3076658c0000000000000f1a | 67.593 | 1.564 | n/a | 0.000 | 59.700 | 1.232 | 0.867 | 0.013 | n/a | 0.104 | 4.101 | n/a | n/a | 0.011 | 61.264 | 0.906 | 0.011 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.014ms; driver.reader-basis.broadcast 0.214ms; driver.publication.persist-deferred 0.141ms; driver.publication.readback 0.078ms; driver.publication.readback 0.071ms |
| 5658dadf3076658c0000000000000834 | 59.385 | 2.616 | n/a | 0.000 | 39.534 | 0.752 | 0.958 | 0.013 | n/a | 0.060 | 15.438 | n/a | n/a | 0.014 | 42.150 | 0.710 | 0.014 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.133ms; driver.publication.readback 0.130ms; driver.publication.readback 0.114ms; driver.publication.readback 0.076ms; driver.publication.readback 0.068ms |
| 5658dadf3076658c0000000000000308 | 57.373 | 3.088 | n/a | 0.000 | 0.059 | 0.701 | 1.029 | 0.016 | n/a | 0.367 | 52.080 | n/a | n/a | 0.034 | 3.146 | 0.055 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000000640 | 52.463 | 1.613 | n/a | 0.000 | 0.036 | 2.080 | 0.542 | 0.008 | n/a | 0.314 | 47.854 | n/a | n/a | 0.016 | 1.649 | 0.031 | 0.016 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.134ms; driver.publication.persist-deferred 0.021ms |

## P2 / L64 / commit (1775 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.755 | 0.493 | 0.000 | 0.546 | 2.473 | n/a | 0.000 | 0.044 | 0.632 | 1.032 | 0.014 | n/a | 0.097 | 5.450 | n/a | n/a | 0.017 | 2.825 | 0.261 | 0.017 |
| p99 | 40.400 | 2.571 | 0.080 | 2.313 | 8.482 | n/a | 0.000 | 15.611 | 11.033 | 9.547 | 0.053 | n/a | 3.590 | 29.338 | n/a | n/a | 0.049 | 18.354 | 0.675 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c00000000000011ff | 108.152 | 2.386 | n/a | 0.000 | 96.696 | 0.491 | 1.148 | 0.028 | n/a | 2.008 | 5.372 | n/a | n/a | 0.021 | 99.082 | 0.916 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.343ms; driver.expected-state.bind-receipt 1.173ms; driver.expected-state.bind-receipt 1.039ms; driver.reader-basis.broadcast 0.341ms; driver.publication.readback 0.246ms |
| 5658dadf3076658c00000000000011fc | 99.932 | 17.211 | n/a | 0.000 | 4.146 | 17.141 | 32.460 | 0.038 | n/a | 3.388 | 25.531 | n/a | n/a | 0.018 | 21.357 | 0.214 | 0.018 | gw-w/thread-46/gateway.admitted-work | driver.expected-state.bind-receipt 1.343ms; driver.expected-state.bind-receipt 1.173ms; driver.reader-basis.broadcast 0.341ms; driver.publication.readback 0.246ms; driver.publication.readback 0.143ms |
| 5658dadf3076658c000000000000116f | 57.787 | 2.614 | n/a | 0.000 | 0.363 | 0.548 | 0.832 | 0.013 | n/a | 3.097 | 50.305 | n/a | n/a | 0.014 | 2.977 | 0.052 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.244ms; driver.publication.readback 0.056ms; driver.publication.readback 0.053ms; driver.publication.readback 0.033ms; driver.publication.persist-deferred 0.028ms |
| 5658dadf3076658c0000000000001209 | 51.137 | 6.720 | n/a | 0.000 | 6.306 | 4.637 | 4.372 | 0.017 | n/a | 0.103 | 28.921 | n/a | n/a | 0.061 | 13.026 | 0.255 | 0.061 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.173ms; driver.reader-basis.broadcast 0.341ms; driver.publication.readback 0.246ms; driver.publication.readback 0.076ms; driver.publication.readback 0.066ms |
| 5658dadf3076658c0000000000001173 | 50.310 | 3.833 | n/a | 0.000 | 0.021 | 1.017 | 8.754 | 0.042 | n/a | 0.141 | 36.485 | n/a | n/a | 0.016 | 3.854 | 0.077 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.035ms |
| 5658dadf3076658c00000000000011fb | 46.897 | 8.025 | n/a | 0.000 | 11.334 | 11.836 | 0.984 | 0.008 | n/a | 0.778 | 13.911 | n/a | n/a | 0.021 | 19.359 | 0.413 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.034ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.024ms |
| 5658dadf3076658c00000000000018c3 | 46.876 | 8.872 | n/a | 0.000 | 20.567 | 3.021 | 2.619 | 0.043 | n/a | 1.377 | 10.366 | n/a | n/a | 0.011 | 29.439 | 0.628 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.338ms; driver.publication.readback 0.083ms; driver.publication.persist-deferred 0.017ms |
| 5658dadf3076658c00000000000017b9 | 46.371 | 2.559 | n/a | 0.000 | 0.032 | 0.373 | 0.813 | 0.012 | n/a | 0.054 | 42.514 | n/a | n/a | 0.015 | 2.591 | 0.056 | 0.015 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.101ms; driver.publication.persist-deferred 0.038ms |
| 5658dadf3076658c0000000000001595 | 44.823 | 2.371 | n/a | 0.000 | 36.700 | 0.462 | 0.649 | 0.010 | n/a | 0.033 | 4.584 | n/a | n/a | 0.013 | 39.071 | 0.872 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 1.697ms; driver.publication.readback 0.055ms; driver.publication.readback 0.052ms; driver.publication.readback 0.051ms; driver.publication.readback 0.045ms |
| 5658dadf3076658c00000000000017bb | 44.634 | 4.914 | n/a | 0.000 | 5.515 | 0.445 | 0.929 | 0.014 | n/a | 0.106 | 32.696 | n/a | n/a | 0.015 | 10.429 | 0.234 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.101ms; driver.publication.persist-deferred 0.038ms; driver.publication.persist-deferred 0.028ms |
| 5658dadf3076658c00000000000016c2 | 44.622 | 3.335 | n/a | 0.000 | 0.372 | 1.035 | 0.644 | 0.006 | n/a | 3.590 | 35.634 | n/a | n/a | 0.007 | 3.707 | 0.083 | 0.007 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.258ms; driver.publication.readback 0.137ms; driver.publication.readback 0.082ms; driver.publication.readback 0.053ms; driver.publication.readback 0.047ms |
| 5658dadf3076658c0000000000001428 | 42.292 | 13.750 | 0.805 | 0.248 | 0.035 | 2.543 | 8.544 | 0.024 | n/a | 0.079 | 16.248 | n/a | n/a | 0.017 | 14.838 | 0.351 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.158ms; driver.publication.readback 0.134ms; driver.publication.readback 0.094ms; driver.publication.readback 0.085ms; driver.publication.readback 0.083ms |
| 5658dadf3076658c0000000000001525 | 42.210 | 2.753 | n/a | 0.000 | 0.028 | 3.898 | 1.288 | 0.026 | n/a | 0.081 | 34.118 | n/a | n/a | 0.018 | 2.781 | 0.066 | 0.018 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.047ms |
| 5658dadf3076658c0000000000001b88 | 41.642 | 3.186 | n/a | 0.000 | 0.029 | 0.555 | 2.859 | 0.029 | n/a | 0.064 | 34.904 | n/a | n/a | 0.016 | 3.214 | 0.077 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001e61 | 41.063 | 4.345 | 1.140 | 0.000 | 0.040 | 8.684 | 8.736 | 0.020 | n/a | 0.052 | 18.027 | n/a | n/a | 0.020 | 5.525 | 0.135 | 0.020 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.360ms |
| 5658dadf3076658c0000000000001240 | 40.681 | 6.163 | n/a | 0.000 | 0.084 | 2.148 | 3.943 | 0.053 | n/a | 4.206 | 24.046 | n/a | n/a | 0.039 | 6.246 | 0.154 | 0.039 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.085ms; driver.publication.readback 0.071ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.017ms |
| 5658dadf3076658c0000000000001645 | 40.410 | 5.536 | n/a | 0.000 | 21.728 | 4.913 | 1.975 | 0.023 | n/a | 0.119 | 6.102 | n/a | n/a | 0.013 | 27.264 | 0.675 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.077ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.022ms |
| 5658dadf3076658c0000000000001456 | 40.400 | 1.306 | n/a | 0.000 | 0.020 | 0.285 | 3.001 | 0.007 | n/a | 0.034 | 35.732 | n/a | n/a | 0.014 | 1.326 | 0.033 | 0.014 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.033ms |
| 5658dadf3076658c00000000000016c4 | 39.601 | 1.618 | n/a | 0.000 | 0.036 | 0.673 | 1.255 | 0.026 | n/a | 0.080 | 35.897 | n/a | n/a | 0.015 | 1.655 | 0.042 | 0.015 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.258ms; driver.publication.readback 0.137ms; driver.publication.readback 0.082ms; driver.publication.readback 0.058ms; driver.publication.readback 0.053ms |
| 5658dadf3076658c0000000000001092 | 39.339 | 7.750 | 5.697 | 0.000 | 0.025 | 4.616 | 8.574 | 0.021 | n/a | 0.069 | 12.566 | n/a | n/a | 0.021 | 13.472 | 0.342 | 0.021 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.132ms; driver.publication.readback 0.088ms; driver.publication.readback 0.067ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.026ms |

## P2 / L64 / commit / 5-10 facts (1060 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.972 | 0.000 | 0.000 | 0.417 | 1.995 | n/a | 0.000 | 0.043 | 0.620 | 0.898 | 0.014 | n/a | 0.092 | 4.863 | n/a | n/a | 0.017 | 2.263 | 0.237 | 0.017 |
| p99 | 38.367 | 2.002 | 0.056 | 1.111 | 6.118 | n/a | 0.000 | 15.128 | 11.365 | 5.496 | 0.053 | n/a | 4.163 | 29.338 | n/a | n/a | 0.048 | 17.677 | 0.666 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c00000000000011ff | 108.152 | 2.386 | n/a | 0.000 | 96.696 | 0.491 | 1.148 | 0.028 | n/a | 2.008 | 5.372 | n/a | n/a | 0.021 | 99.082 | 0.916 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.343ms; driver.expected-state.bind-receipt 1.173ms; driver.expected-state.bind-receipt 1.039ms; driver.reader-basis.broadcast 0.341ms; driver.publication.readback 0.246ms |
| 5658dadf3076658c00000000000011fc | 99.932 | 17.211 | n/a | 0.000 | 4.146 | 17.141 | 32.460 | 0.038 | n/a | 3.388 | 25.531 | n/a | n/a | 0.018 | 21.357 | 0.214 | 0.018 | gw-w/thread-46/gateway.admitted-work | driver.expected-state.bind-receipt 1.343ms; driver.expected-state.bind-receipt 1.173ms; driver.reader-basis.broadcast 0.341ms; driver.publication.readback 0.246ms; driver.publication.readback 0.143ms |
| 5658dadf3076658c0000000000001595 | 44.823 | 2.371 | n/a | 0.000 | 36.700 | 0.462 | 0.649 | 0.010 | n/a | 0.033 | 4.584 | n/a | n/a | 0.013 | 39.071 | 0.872 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 1.697ms; driver.publication.readback 0.055ms; driver.publication.readback 0.052ms; driver.publication.readback 0.051ms; driver.publication.readback 0.045ms |
| 5658dadf3076658c0000000000001525 | 42.210 | 2.753 | n/a | 0.000 | 0.028 | 3.898 | 1.288 | 0.026 | n/a | 0.081 | 34.118 | n/a | n/a | 0.018 | 2.781 | 0.066 | 0.018 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.047ms |
| 5658dadf3076658c0000000000001240 | 40.681 | 6.163 | n/a | 0.000 | 0.084 | 2.148 | 3.943 | 0.053 | n/a | 4.206 | 24.046 | n/a | n/a | 0.039 | 6.246 | 0.154 | 0.039 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.085ms; driver.publication.readback 0.071ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.017ms |
| 5658dadf3076658c0000000000001456 | 40.400 | 1.306 | n/a | 0.000 | 0.020 | 0.285 | 3.001 | 0.007 | n/a | 0.034 | 35.732 | n/a | n/a | 0.014 | 1.326 | 0.033 | 0.014 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.033ms |
| 5658dadf3076658c00000000000016c4 | 39.601 | 1.618 | n/a | 0.000 | 0.036 | 0.673 | 1.255 | 0.026 | n/a | 0.080 | 35.897 | n/a | n/a | 0.015 | 1.655 | 0.042 | 0.015 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.258ms; driver.publication.readback 0.137ms; driver.publication.readback 0.082ms; driver.publication.readback 0.058ms; driver.publication.readback 0.053ms |
| 5658dadf3076658c00000000000016c0 | 39.109 | 2.626 | n/a | 0.000 | 5.033 | 1.993 | 0.898 | 0.012 | n/a | 1.667 | 26.857 | n/a | n/a | 0.022 | 7.659 | 0.196 | 0.022 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.082ms; driver.publication.persist-deferred 0.021ms |
| 5658dadf3076658c00000000000019ab | 38.877 | 2.518 | n/a | 0.000 | 0.025 | 0.383 | 0.711 | 0.013 | n/a | 0.234 | 34.979 | n/a | n/a | 0.014 | 2.543 | 0.065 | 0.014 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms |
| 5658dadf3076658c0000000000001526 | 38.667 | 2.154 | n/a | 0.000 | 0.010 | 2.724 | 1.094 | 0.018 | n/a | 0.033 | 32.626 | n/a | n/a | 0.007 | 2.164 | 0.056 | 0.007 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.047ms |
| 5658dadf3076658c000000000000125e | 38.367 | 1.515 | n/a | 0.000 | 24.825 | 0.457 | 0.932 | 0.015 | n/a | 0.098 | 10.511 | n/a | n/a | 0.014 | 26.340 | 0.687 | 0.014 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.251ms; driver.publication.readback 0.085ms; driver.publication.readback 0.067ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.023ms |
| 5658dadf3076658c0000000000001174 | 37.248 | 2.006 | n/a | 0.000 | 0.036 | 4.164 | 1.068 | 0.022 | n/a | 4.878 | 25.053 | n/a | n/a | 0.022 | 2.042 | 0.055 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.215ms; driver.publication.persist-deferred 0.035ms |
| 5658dadf3076658c00000000000017bc | 36.940 | 2.383 | n/a | 0.000 | 0.024 | 3.346 | 0.571 | 0.010 | n/a | 0.131 | 30.461 | n/a | n/a | 0.014 | 2.407 | 0.065 | 0.014 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.425ms; driver.publication.readback 0.101ms; driver.publication.persist-deferred 0.037ms; driver.publication.persist-deferred 0.028ms |
| 5658dadf3076658c00000000000010f2 | 36.778 | 2.614 | n/a | 0.000 | 24.886 | 0.784 | 0.837 | 0.014 | n/a | 0.230 | 7.389 | n/a | n/a | 0.023 | 27.500 | 0.748 | 0.023 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.005ms; driver.publication.readback 0.283ms; driver.publication.readback 0.075ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.033ms |
| 5658dadf3076658c000000000000124e | 36.535 | 1.488 | n/a | 0.000 | 18.230 | 10.176 | 0.681 | 0.013 | n/a | 0.044 | 5.887 | n/a | n/a | 0.015 | 19.718 | 0.540 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.127ms; driver.publication.readback 0.081ms; driver.publication.readback 0.067ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.030ms |
| 5658dadf3076658c0000000000001b89 | 36.337 | 1.538 | n/a | 0.000 | 0.023 | 3.496 | 0.619 | 0.010 | n/a | 0.169 | 30.469 | n/a | n/a | 0.013 | 1.561 | 0.043 | 0.013 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.021ms |
| 5658dadf3076658c00000000000016c3 | 36.155 | 2.135 | n/a | 0.000 | 0.024 | 0.325 | 0.606 | 0.006 | n/a | 0.014 | 33.029 | n/a | n/a | 0.015 | 2.159 | 0.060 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.258ms; driver.publication.readback 0.137ms; driver.publication.readback 0.082ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.021ms |
| 5658dadf3076658c0000000000001527 | 36.107 | 2.083 | n/a | 0.000 | 0.097 | 1.506 | 0.790 | 0.005 | n/a | 0.017 | 31.602 | n/a | n/a | 0.006 | 2.181 | 0.060 | 0.006 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000016c1 | 36.090 | 2.442 | n/a | 0.000 | 0.824 | 2.460 | 0.953 | 0.011 | n/a | 0.042 | 29.338 | n/a | n/a | 0.020 | 3.266 | 0.091 | 0.020 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.082ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.017ms |
| 5658dadf3076658c0000000000001543 | 35.586 | 2.497 | n/a | 0.000 | 0.021 | 1.349 | 1.728 | 0.018 | n/a | 5.768 | 24.195 | n/a | n/a | 0.010 | 2.518 | 0.071 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.691ms; driver.publication.readback 0.202ms; driver.publication.persist-deferred 0.170ms; driver.publication.readback 0.138ms; driver.publication.readback 0.130ms |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.705 | 0.000 | 0.000 | 0.447 | 3.651 | n/a | 0.000 | 0.041 | 0.774 | 1.759 | 0.020 | n/a | 0.090 | 6.354 | n/a | n/a | 0.018 | 3.871 | 0.286 | 0.018 |
| p99 | 107.206 | 2.002 | 0.020 | 1.340 | 15.353 | n/a | 0.471 | 1.734 | 9.313 | 32.240 | 0.063 | n/a | 2.887 | 93.188 | n/a | n/a | 0.070 | 15.595 | 0.538 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000001eec | 107.206 | 5.399 | 0.177 | 0.000 | 0.031 | 1.158 | 6.839 | 0.024 | n/a | 0.370 | 93.188 | n/a | n/a | 0.020 | 5.607 | 0.052 | 0.020 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.862ms |
| 5658dadf3076658c0000000000001f1a | 50.877 | 6.767 | 0.206 | 0.000 | 0.059 | 0.937 | 1.525 | 0.020 | n/a | 0.086 | 41.255 | n/a | n/a | 0.022 | 7.031 | 0.138 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.364ms |
| 5658dadf3076658c0000000000001e96 | 43.876 | 4.275 | 0.189 | 0.000 | 0.057 | 1.012 | 32.240 | 0.029 | n/a | 0.057 | 5.993 | n/a | n/a | 0.023 | 4.521 | 0.103 | 0.023 | gw-w/thread-64/gateway.request-parse | driver.reader-basis.broadcast 0.399ms |
| 5658dadf3076658c0000000000001e7a | 37.517 | 13.813 | 0.153 | 0.000 | 0.035 | 1.468 | 12.147 | 0.026 | n/a | 0.081 | 9.769 | n/a | n/a | 0.025 | 14.000 | 0.373 | 0.025 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.831ms |
| 5658dadf3076658c0000000000001e6d | 33.704 | 15.353 | 0.203 | 0.000 | 0.040 | 7.982 | 5.427 | 0.038 | n/a | 0.071 | 4.574 | n/a | n/a | 0.017 | 15.595 | 0.463 | 0.017 | node-14/thread-9/socket.wait-first-byte | driver.reader-basis.broadcast 0.351ms |
| 5658dadf3076658c0000000000001eac | 31.477 | 10.169 | 0.202 | 0.000 | 0.037 | 1.583 | 11.774 | 0.024 | n/a | 0.188 | 7.483 | n/a | n/a | 0.017 | 10.408 | 0.331 | 0.017 | gw-w/thread-67/gateway.admitted-work | driver.reader-basis.broadcast 0.324ms |
| 5658dadf3076658c0000000000001f02 | 31.448 | 9.508 | 0.216 | 0.000 | 0.115 | 2.264 | 7.234 | 0.041 | n/a | 0.594 | 11.458 | n/a | n/a | 0.018 | 9.839 | 0.313 | 0.018 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.836ms |
| 5658dadf3076658c0000000000001e9c | 31.408 | 8.420 | 0.140 | 0.000 | 0.039 | 4.808 | 9.724 | 0.029 | n/a | 0.086 | 8.145 | n/a | n/a | 0.016 | 8.599 | 0.274 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.344ms |
| 5658dadf3076658c0000000000001f0c | 30.685 | 8.739 | 2.772 | 0.000 | 0.047 | 9.313 | 5.966 | 0.019 | n/a | 0.069 | 3.746 | n/a | n/a | 0.015 | 11.558 | 0.377 | 0.015 | node-14/thread-9/socket.wait-first-byte | driver.reader-basis.broadcast 0.822ms |
| 5658dadf3076658c0000000000001ed0 | 30.105 | 8.014 | 0.695 | 0.000 | 0.083 | 1.401 | 10.943 | 0.028 | n/a | 0.072 | 8.843 | n/a | n/a | 0.025 | 8.792 | 0.292 | 0.025 | gw-w/thread-66/gateway.admitted-work | driver.reader-basis.broadcast 0.347ms |
| 5658dadf3076658c0000000000001f10 | 29.722 | 6.905 | 0.761 | 0.000 | 0.061 | 1.264 | 6.906 | 0.023 | n/a | 0.099 | 13.682 | n/a | n/a | 0.021 | 7.728 | 0.260 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.902ms |
| 5658dadf3076658c0000000000001ec6 | 29.556 | 13.858 | 0.257 | 0.000 | 0.041 | 1.507 | 8.290 | 0.019 | n/a | 0.347 | 5.219 | n/a | n/a | 0.018 | 14.155 | 0.479 | 0.018 | node-14/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.343ms |
| 5658dadf3076658c0000000000001e7c | 28.854 | 10.581 | 0.462 | 0.000 | 0.083 | 2.450 | 2.973 | 0.063 | n/a | 0.192 | 11.998 | n/a | n/a | 0.052 | 11.126 | 0.386 | 0.052 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.533ms |
| 5658dadf3076658c0000000000001ee6 | 28.574 | 6.970 | 1.388 | 0.000 | 0.041 | 1.522 | 6.208 | 0.055 | n/a | 0.096 | 12.277 | n/a | n/a | 0.017 | 8.399 | 0.294 | 0.017 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.819ms |
| 5658dadf3076658c0000000000001ee0 | 27.672 | 3.984 | 0.185 | 0.000 | 0.070 | 1.395 | 9.276 | 0.032 | n/a | 0.131 | 12.576 | n/a | n/a | 0.023 | 4.239 | 0.153 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.864ms |
| 5658dadf3076658c0000000000001e8e | 27.194 | 5.660 | 0.179 | 0.443 | 0.071 | 5.812 | 6.585 | 0.020 | n/a | 2.887 | 5.513 | n/a | n/a | 0.024 | 6.352 | 0.234 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.339ms |
| 5658dadf3076658c0000000000001eda | 26.361 | 8.955 | 0.202 | 0.000 | 0.044 | 1.450 | 6.428 | 0.035 | n/a | 0.457 | 8.772 | n/a | n/a | 0.017 | 9.201 | 0.349 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.345ms |
| 5658dadf3076658c0000000000001e9a | 25.798 | 3.191 | n/a | 0.000 | 0.084 | 0.635 | 1.220 | 0.015 | n/a | 0.321 | 20.299 | n/a | n/a | 0.032 | 3.275 | 0.127 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001ea6 | 25.096 | 6.069 | 0.199 | 0.000 | 0.033 | 2.437 | 3.546 | 0.019 | n/a | 0.252 | 12.516 | n/a | n/a | 0.025 | 6.301 | 0.251 | 0.025 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.339ms |
| 5658dadf3076658c0000000000001efa | 24.544 | 3.582 | 0.225 | 0.000 | 0.065 | 1.095 | 5.751 | 0.020 | n/a | 0.099 | 13.682 | n/a | n/a | 0.026 | 3.871 | 0.158 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.344ms |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.493 | 0.000 | 0.000 | 0.480 | 2.708 | n/a | 0.000 | 0.044 | 0.618 | 1.006 | 0.016 | n/a | 0.117 | 5.395 | n/a | n/a | 0.019 | 2.792 | 0.247 | 0.019 |
| p99 | 25.798 | 2.002 | 0.000 | 1.146 | 4.309 | n/a | 0.000 | 1.201 | 1.311 | 3.566 | 0.035 | n/a | 0.516 | 20.299 | n/a | n/a | 0.070 | 4.633 | 0.417 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000001e9a | 25.798 | 3.191 | n/a | 0.000 | 0.084 | 0.635 | 1.220 | 0.015 | n/a | 0.321 | 20.299 | n/a | n/a | 0.032 | 3.275 | 0.127 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001e7e | 22.268 | 2.757 | n/a | 0.000 | 0.034 | 0.666 | 2.816 | 0.021 | n/a | 0.062 | 15.892 | n/a | n/a | 0.018 | 2.792 | 0.125 | 0.018 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001e90 | 19.312 | 4.309 | n/a | 0.000 | 0.070 | 0.767 | 0.914 | 0.014 | n/a | 0.323 | 12.885 | n/a | n/a | 0.031 | 4.378 | 0.227 | 0.031 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001e84 | 18.305 | 3.159 | n/a | 0.000 | 0.033 | 0.438 | 1.972 | 0.016 | n/a | 0.238 | 12.437 | n/a | n/a | 0.012 | 3.192 | 0.174 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.638ms |
| 5658dadf3076658c0000000000001ebc | 15.194 | 3.408 | n/a | 0.000 | 0.083 | 0.698 | 0.987 | 0.014 | n/a | 0.117 | 9.840 | n/a | n/a | 0.048 | 3.491 | 0.230 | 0.048 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001ef4 | 15.132 | 3.451 | n/a | 0.000 | 0.112 | 0.857 | 1.944 | 0.029 | n/a | 0.152 | 8.533 | n/a | n/a | 0.055 | 3.563 | 0.235 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.308ms |
| 5658dadf3076658c0000000000001eae | 14.859 | 3.216 | n/a | 0.000 | 0.032 | 0.618 | 1.331 | 0.024 | n/a | 0.323 | 9.289 | n/a | n/a | 0.026 | 3.249 | 0.219 | 0.026 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.904ms |
| 5658dadf3076658c0000000000001f22 | 14.439 | 4.143 | n/a | 0.000 | 0.489 | 1.311 | 3.566 | 0.019 | n/a | 0.081 | 4.760 | n/a | n/a | 0.070 | 4.633 | 0.321 | 0.070 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f28 | 14.133 | 1.961 | n/a | 0.000 | 0.036 | 0.628 | 1.335 | 0.024 | n/a | 0.141 | 9.992 | n/a | n/a | 0.016 | 1.997 | 0.141 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001eaa | 13.062 | 2.822 | n/a | 0.000 | 0.056 | 0.672 | 1.740 | 0.024 | n/a | 0.379 | 7.343 | n/a | n/a | 0.025 | 2.878 | 0.220 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001ee8 | 12.317 | 2.437 | n/a | 0.000 | 1.201 | 0.649 | 0.870 | 0.013 | n/a | 0.055 | 7.078 | n/a | n/a | 0.014 | 3.638 | 0.295 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.186ms |
| 5658dadf3076658c0000000000001e80 | 12.208 | 3.851 | n/a | 0.000 | 0.070 | 0.661 | 0.914 | 0.013 | n/a | 0.254 | 6.409 | n/a | n/a | 0.036 | 3.921 | 0.321 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f2a | 11.819 | 2.082 | n/a | 0.000 | 0.038 | 0.462 | 1.281 | 0.016 | n/a | 0.052 | 7.873 | n/a | n/a | 0.015 | 2.119 | 0.179 | 0.015 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001e86 | 11.652 | 2.708 | n/a | 0.000 | 0.057 | 0.722 | 1.390 | 0.023 | n/a | 0.095 | 6.627 | n/a | n/a | 0.029 | 2.765 | 0.237 | 0.029 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001edc | 11.307 | 2.080 | n/a | 0.000 | 0.055 | 0.518 | 0.814 | 0.018 | n/a | 0.074 | 7.731 | n/a | n/a | 0.017 | 2.135 | 0.189 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f08 | 10.849 | 3.716 | n/a | 0.000 | 0.031 | 0.610 | 0.997 | 0.015 | n/a | 0.070 | 5.395 | n/a | n/a | 0.016 | 3.747 | 0.345 | 0.016 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001e78 | 10.807 | 2.362 | n/a | 0.000 | 0.044 | 0.565 | 0.935 | 0.016 | n/a | 0.086 | 6.781 | n/a | n/a | 0.019 | 2.406 | 0.223 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f00 | 10.493 | 3.490 | n/a | 0.000 | 0.072 | 0.636 | 0.883 | 0.012 | n/a | 0.076 | 5.294 | n/a | n/a | 0.030 | 3.562 | 0.339 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001e9e | 10.452 | 3.054 | n/a | 0.000 | 0.037 | 0.365 | 1.706 | 0.013 | n/a | 0.319 | 4.937 | n/a | n/a | 0.020 | 3.091 | 0.296 | 0.020 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001ec0 | 10.308 | 1.700 | n/a | 0.000 | 0.036 | 0.435 | 1.006 | 0.013 | n/a | 0.060 | 7.043 | n/a | n/a | 0.014 | 1.736 | 0.168 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.105 | 0.083 | 0.000 | 0.503 | 4.485 | n/a | 0.000 | 0.042 | 1.021 | 1.805 | 0.020 | n/a | 0.093 | 5.978 | n/a | n/a | 0.020 | 5.007 | 0.324 | 0.020 |
| p99 | 68.479 | 2.487 | 0.496 | 2.396 | 12.295 | n/a | 1.768 | 2.047 | 17.894 | 30.192 | 0.081 | n/a | 1.666 | 62.513 | n/a | n/a | 0.051 | 12.530 | 0.504 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000001f4e | 68.479 | 3.887 | n/a | 0.000 | 0.047 | 0.634 | 1.269 | 0.022 | n/a | 0.087 | 62.513 | n/a | n/a | 0.020 | 3.934 | 0.057 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f58 | 54.985 | 3.647 | 0.190 | 0.000 | 0.042 | 0.973 | 3.887 | 0.019 | n/a | 0.322 | 45.888 | n/a | n/a | 0.017 | 3.880 | 0.071 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.852ms |
| 5658dadf3076658c0000000000001f87 | 45.472 | 6.882 | 0.150 | 0.000 | 0.040 | 1.449 | 30.192 | 0.021 | n/a | 0.098 | 6.625 | n/a | n/a | 0.017 | 7.072 | 0.156 | 0.017 | gw-w/thread-65/gateway.admitted-work | driver.reader-basis.broadcast 0.337ms |
| 5658dadf3076658c0000000000001f46 | 44.163 | 4.590 | 1.004 | 0.000 | 0.071 | 17.894 | 6.638 | 0.034 | n/a | 0.126 | 13.782 | n/a | n/a | 0.025 | 5.664 | 0.128 | 0.025 | node-14/thread-9/socket.wait-first-byte | driver.reader-basis.broadcast 1.037ms |
| 5658dadf3076658c0000000000001f41 | 42.029 | 5.328 | 0.184 | 0.000 | 0.065 | 8.213 | 9.236 | 0.022 | n/a | 0.688 | 18.266 | n/a | n/a | 0.027 | 5.577 | 0.133 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.812ms |
| 5658dadf3076658c0000000000001f39 | 36.742 | 5.565 | 3.376 | 0.000 | 0.037 | 8.570 | 8.697 | 0.021 | n/a | 0.087 | 10.373 | n/a | n/a | 0.016 | 8.978 | 0.244 | 0.016 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.665ms |
| 5658dadf3076658c0000000000001f45 | 35.881 | 4.975 | n/a | 0.000 | 0.043 | 4.923 | 21.273 | 0.046 | n/a | 0.327 | 4.271 | n/a | n/a | 0.022 | 5.018 | 0.140 | 0.022 | gw-w/thread-47/storage/begin-command! | driver.reader-basis.broadcast 0.875ms |
| 5658dadf3076658c0000000000001feb | 33.491 | 3.819 | 0.207 | 0.000 | 0.069 | 5.902 | 7.514 | 0.020 | n/a | 1.666 | 14.246 | n/a | n/a | 0.050 | 4.094 | 0.122 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f7b | 32.980 | 10.314 | 0.184 | 0.000 | 0.066 | 1.747 | 9.215 | 0.032 | n/a | 0.615 | 10.768 | n/a | n/a | 0.040 | 10.564 | 0.320 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.346ms |
| 5658dadf3076658c0000000000001fdf | 32.682 | 3.570 | n/a | 0.000 | 0.053 | 0.620 | 1.381 | 0.023 | n/a | 0.081 | 26.918 | n/a | n/a | 0.035 | 3.624 | 0.111 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f8f | 28.697 | 6.680 | 1.711 | 0.000 | 0.038 | 2.031 | 5.684 | 0.019 | n/a | 0.052 | 12.465 | n/a | n/a | 0.016 | 8.429 | 0.294 | 0.016 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.808ms |
| 5658dadf3076658c0000000000001fcb | 28.517 | 11.203 | 0.142 | 0.000 | 0.044 | 1.127 | 4.503 | 0.020 | n/a | 0.315 | 11.132 | n/a | n/a | 0.031 | 11.389 | 0.399 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f71 | 28.072 | 2.591 | n/a | 0.000 | 1.110 | 0.551 | 1.093 | 0.013 | n/a | 0.265 | 22.436 | n/a | n/a | 0.013 | 3.701 | 0.132 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f6f | 27.912 | 6.051 | 0.180 | 0.000 | 0.060 | 5.362 | 5.489 | 0.016 | n/a | 0.331 | 10.402 | n/a | n/a | 0.022 | 6.291 | 0.225 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.437ms |
| 5658dadf3076658c0000000000001f7f | 27.626 | 10.230 | 0.211 | 0.000 | 0.040 | 1.609 | 10.902 | 0.033 | n/a | 0.080 | 4.506 | n/a | n/a | 0.016 | 10.481 | 0.379 | 0.016 | node-14/thread-9/client.persist-and-resolve | none observed |
| 5658dadf3076658c0000000000001f97 | 26.607 | 12.295 | 0.165 | 0.000 | 0.070 | 1.397 | 3.885 | 0.028 | n/a | 0.427 | 8.315 | n/a | n/a | 0.025 | 12.530 | 0.471 | 0.025 | node-14/thread-9/client.persist-and-resolve | none observed |
| 5658dadf3076658c0000000000001fcd | 26.310 | 8.307 | 0.167 | 0.000 | 0.063 | 1.342 | 6.212 | 0.034 | n/a | 0.439 | 9.695 | n/a | n/a | 0.050 | 8.537 | 0.324 | 0.050 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f64 | 25.942 | 6.615 | 0.144 | 0.000 | 0.032 | 1.134 | 11.920 | 0.031 | n/a | 0.073 | 5.978 | n/a | n/a | 0.015 | 6.791 | 0.262 | 0.015 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.328ms |
| 5658dadf3076658c0000000000001f75 | 25.268 | 9.026 | 0.822 | 0.000 | 0.042 | 3.005 | 4.377 | 0.018 | n/a | 0.064 | 7.898 | n/a | n/a | 0.017 | 9.891 | 0.391 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001fbd | 25.072 | 6.635 | 0.165 | 0.000 | 0.042 | 6.816 | 2.418 | 0.039 | n/a | 1.441 | 7.501 | n/a | n/a | 0.014 | 6.841 | 0.273 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.413 | 0.000 | 0.000 | 0.503 | 3.417 | n/a | 0.000 | 0.044 | 0.593 | 0.986 | 0.014 | n/a | 0.087 | 5.288 | n/a | n/a | 0.020 | 3.728 | 0.294 | 0.020 |
| p99 | 68.479 | 2.487 | 0.496 | 2.396 | 4.977 | n/a | 1.768 | 2.047 | 4.923 | 21.273 | 0.046 | n/a | 0.471 | 62.513 | n/a | n/a | 0.049 | 6.402 | 0.493 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000001f4e | 68.479 | 3.887 | n/a | 0.000 | 0.047 | 0.634 | 1.269 | 0.022 | n/a | 0.087 | 62.513 | n/a | n/a | 0.020 | 3.934 | 0.057 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f45 | 35.881 | 4.975 | n/a | 0.000 | 0.043 | 4.923 | 21.273 | 0.046 | n/a | 0.327 | 4.271 | n/a | n/a | 0.022 | 5.018 | 0.140 | 0.022 | gw-w/thread-47/storage/begin-command! | driver.reader-basis.broadcast 0.875ms |
| 5658dadf3076658c0000000000001fdf | 32.682 | 3.570 | n/a | 0.000 | 0.053 | 0.620 | 1.381 | 0.023 | n/a | 0.081 | 26.918 | n/a | n/a | 0.035 | 3.624 | 0.111 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f71 | 28.072 | 2.591 | n/a | 0.000 | 1.110 | 0.551 | 1.093 | 0.013 | n/a | 0.265 | 22.436 | n/a | n/a | 0.013 | 3.701 | 0.132 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f6c | 19.003 | 2.703 | n/a | 0.000 | 0.030 | 0.437 | 4.049 | 0.016 | n/a | 0.049 | 11.704 | n/a | n/a | 0.016 | 2.733 | 0.144 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f6e | 18.120 | 4.615 | n/a | 0.000 | 0.041 | 1.997 | 9.763 | 0.034 | n/a | 0.411 | 1.242 | n/a | n/a | 0.017 | 4.656 | 0.257 | 0.017 | gw-w/thread-48/gateway.route | none observed |
| 5658dadf3076658c0000000000001fd7 | 14.114 | 4.418 | n/a | 0.000 | 0.030 | 0.510 | 0.767 | 0.013 | n/a | 0.045 | 8.301 | n/a | n/a | 0.030 | 4.448 | 0.315 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f62 | 13.714 | 2.736 | n/a | 0.000 | 0.038 | 0.448 | 1.108 | 0.013 | n/a | 0.252 | 9.105 | n/a | n/a | 0.014 | 2.774 | 0.202 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f5c | 13.714 | 2.523 | n/a | 0.000 | 0.036 | 0.501 | 0.905 | 0.014 | n/a | 0.064 | 9.654 | n/a | n/a | 0.018 | 2.559 | 0.187 | 0.018 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f73 | 13.540 | 3.689 | n/a | 0.000 | 0.039 | 0.697 | 0.986 | 0.014 | n/a | 0.256 | 7.840 | n/a | n/a | 0.019 | 3.728 | 0.275 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001fc2 | 13.194 | 1.718 | n/a | 0.000 | 1.703 | 3.026 | 1.573 | 0.021 | n/a | 0.061 | 5.085 | n/a | n/a | 0.008 | 3.421 | 0.259 | 0.008 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.034ms |
| 5658dadf3076658c0000000000001fda | 13.138 | 4.388 | n/a | 0.000 | 1.087 | 0.834 | 1.121 | 0.015 | n/a | 0.067 | 5.601 | n/a | n/a | 0.025 | 5.475 | 0.417 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001fc9 | 13.036 | 4.551 | n/a | 1.768 | 0.083 | 0.606 | 1.401 | 0.020 | n/a | 0.070 | 4.489 | n/a | n/a | 0.049 | 6.402 | 0.491 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001fbb | 12.436 | 2.581 | n/a | 0.000 | 0.037 | 0.636 | 1.386 | 0.023 | n/a | 0.354 | 7.401 | n/a | n/a | 0.018 | 2.618 | 0.211 | 0.018 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f56 | 12.434 | 3.472 | n/a | 0.000 | 1.969 | 0.593 | 0.840 | 0.012 | n/a | 0.042 | 5.483 | n/a | n/a | 0.023 | 5.441 | 0.438 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f85 | 11.711 | 3.417 | n/a | 0.000 | 0.070 | 0.468 | 0.911 | 0.014 | n/a | 0.223 | 6.581 | n/a | n/a | 0.028 | 3.487 | 0.298 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f3b | 11.645 | 3.839 | n/a | 0.000 | 0.028 | 0.627 | 2.148 | 0.031 | n/a | 0.122 | 4.835 | n/a | n/a | 0.015 | 3.867 | 0.332 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f7d | 11.413 | 4.207 | n/a | 0.000 | 0.028 | 0.496 | 0.869 | 0.014 | n/a | 0.199 | 5.580 | n/a | n/a | 0.020 | 4.235 | 0.371 | 0.020 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f36 | 11.406 | 3.129 | n/a | 0.000 | 2.047 | 0.669 | 0.928 | 0.014 | n/a | 0.204 | 4.376 | n/a | n/a | 0.039 | 5.176 | 0.454 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000001f2e | 11.268 | 2.704 | n/a | 0.000 | 0.036 | 0.451 | 1.099 | 0.013 | n/a | 0.332 | 6.617 | n/a | n/a | 0.016 | 2.740 | 0.243 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (366 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.461 | 0.117 | 0.000 | 0.490 | 3.336 | n/a | 0.000 | 0.042 | 0.816 | 1.433 | 0.019 | n/a | 0.087 | 5.409 | n/a | n/a | 0.030 | 3.600 | 0.290 | 0.030 |
| p99 | 43.718 | 2.761 | 0.000 | 2.106 | 7.023 | n/a | 1.548 | 1.785 | 3.824 | 11.429 | 0.059 | n/a | 1.724 | 29.552 | n/a | n/a | 0.128 | 7.526 | 0.549 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c000000000000202e | 50.367 | 4.212 | 0.211 | 0.468 | 0.073 | 1.466 | 8.857 | 0.025 | n/a | 0.399 | 34.620 | n/a | n/a | 0.036 | 4.965 | 0.099 | 0.036 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000020d7 | 48.503 | 5.938 | n/a | 0.000 | 3.012 | 0.797 | 3.405 | 0.032 | n/a | 0.119 | 35.170 | n/a | n/a | 0.029 | 8.950 | 0.185 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000021f3 | 44.258 | 4.375 | 0.158 | 0.000 | 0.038 | 2.383 | 1.478 | 0.020 | n/a | 0.057 | 35.717 | n/a | n/a | 0.032 | 4.572 | 0.103 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.462ms |
| 5658dadf3076658c0000000000002250 | 43.718 | 3.354 | n/a | 0.000 | 0.032 | 0.949 | 32.437 | 0.028 | n/a | 2.106 | 4.783 | n/a | n/a | 0.029 | 3.385 | 0.077 | 0.029 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 1.094ms |
| 5658dadf3076658c00000000000022ba | 36.564 | 3.224 | 0.128 | 0.000 | 0.014 | 0.654 | 2.968 | 0.010 | n/a | 0.031 | 29.523 | n/a | n/a | 0.012 | 3.366 | 0.092 | 0.012 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.103ms; driver.publication.readback 0.143ms; driver.publication.persist-deferred 0.040ms |
| 5658dadf3076658c000000000000210a | 35.636 | 4.230 | n/a | 0.000 | 0.084 | 0.633 | 1.013 | 0.013 | n/a | 0.056 | 29.552 | n/a | n/a | 0.054 | 4.314 | 0.121 | 0.054 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.451ms |
| 5658dadf3076658c00000000000020f6 | 33.764 | 3.556 | 0.215 | 0.000 | 0.038 | 0.899 | 20.963 | 0.019 | n/a | 0.223 | 7.825 | n/a | n/a | 0.025 | 3.809 | 0.113 | 0.025 | gw-w/thread-64/gateway.admitted-work | none observed |
| 5658dadf3076658c0000000000002252 | 33.263 | 4.760 | n/a | 0.000 | 1.588 | 0.558 | 7.559 | 0.031 | n/a | 0.092 | 18.646 | n/a | n/a | 0.031 | 6.348 | 0.191 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.983ms |
| 5658dadf3076658c0000000000001ff5 | 27.926 | 3.510 | 0.167 | 0.000 | 0.055 | 3.049 | 6.792 | 0.019 | n/a | 0.049 | 14.248 | n/a | n/a | 0.037 | 3.732 | 0.134 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002007 | 27.222 | 2.056 | n/a | 0.000 | 0.034 | 0.506 | 1.066 | 0.016 | n/a | 0.322 | 23.183 | n/a | n/a | 0.038 | 2.090 | 0.077 | 0.038 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002042 | 26.765 | 2.967 | n/a | 0.000 | 0.039 | 0.705 | 1.403 | 0.016 | n/a | 0.353 | 21.258 | n/a | n/a | 0.024 | 3.006 | 0.112 | 0.024 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002234 | 25.753 | 4.552 | 0.300 | 0.000 | 0.043 | 1.627 | 2.189 | 0.034 | n/a | 0.116 | 16.854 | n/a | n/a | 0.038 | 4.895 | 0.190 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.394ms |
| 5658dadf3076658c0000000000002289 | 24.818 | 3.323 | 0.248 | 0.000 | 0.078 | 1.102 | 10.524 | 0.023 | n/a | 0.288 | 9.183 | n/a | n/a | 0.049 | 3.649 | 0.147 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002295 | 24.378 | 2.835 | 0.145 | 0.000 | 0.030 | 0.766 | 1.325 | 0.017 | n/a | 0.060 | 19.179 | n/a | n/a | 0.021 | 3.010 | 0.123 | 0.021 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000229b | 23.655 | 4.135 | 0.205 | 0.000 | 0.041 | 1.134 | 4.597 | 0.017 | n/a | 0.047 | 13.455 | n/a | n/a | 0.024 | 4.381 | 0.185 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002104 | 23.555 | 6.015 | 0.200 | 0.000 | 0.042 | 1.097 | 4.738 | 0.034 | n/a | 0.090 | 11.315 | n/a | n/a | 0.023 | 6.257 | 0.266 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000225a | 23.529 | 4.320 | 0.183 | 0.000 | 0.041 | 1.798 | 8.608 | 0.030 | n/a | 0.243 | 8.275 | n/a | n/a | 0.030 | 4.544 | 0.193 | 0.030 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002083 | 23.502 | 4.146 | 0.167 | 0.000 | 0.034 | 1.357 | 7.380 | 0.023 | n/a | 0.085 | 10.287 | n/a | n/a | 0.023 | 4.347 | 0.185 | 0.023 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c000000000000202c | 23.258 | 3.160 | 2.992 | 0.272 | 0.093 | 3.325 | 5.269 | 0.018 | n/a | 0.292 | 7.709 | n/a | n/a | 0.127 | 6.517 | 0.280 | 0.127 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002123 | 23.124 | 6.954 | n/a | 0.000 | 0.049 | 2.823 | 5.323 | 0.059 | n/a | 1.027 | 6.859 | n/a | n/a | 0.031 | 7.003 | 0.303 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.088 | 0.171 | 0.000 | 0.482 | 2.564 | n/a | 0.000 | 0.047 | 0.639 | 1.029 | 0.017 | n/a | 0.103 | 5.349 | n/a | n/a | 0.032 | 2.652 | 0.262 | 0.032 |
| p99 | 27.222 | 2.179 | 0.000 | 1.271 | 6.498 | n/a | 0.000 | 1.829 | 2.823 | 6.898 | 0.059 | n/a | 1.757 | 14.593 | n/a | n/a | 0.128 | 7.003 | 0.486 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5658dadf3076658c0000000000002250 | 43.718 | 3.354 | n/a | 0.000 | 0.032 | 0.949 | 32.437 | 0.028 | n/a | 2.106 | 4.783 | n/a | n/a | 0.029 | 3.385 | 0.077 | 0.029 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 1.094ms |
| 5658dadf3076658c0000000000002007 | 27.222 | 2.056 | n/a | 0.000 | 0.034 | 0.506 | 1.066 | 0.016 | n/a | 0.322 | 23.183 | n/a | n/a | 0.038 | 2.090 | 0.077 | 0.038 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002123 | 23.124 | 6.954 | n/a | 0.000 | 0.049 | 2.823 | 5.323 | 0.059 | n/a | 1.027 | 6.859 | n/a | n/a | 0.031 | 7.003 | 0.303 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002183 | 19.156 | 2.384 | n/a | 0.000 | 0.036 | 0.734 | 1.313 | 0.017 | n/a | 0.050 | 14.593 | n/a | n/a | 0.029 | 2.419 | 0.126 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000022be | 18.788 | 2.632 | n/a | 0.000 | 2.983 | 0.583 | 4.043 | 0.018 | n/a | 0.078 | 8.422 | n/a | n/a | 0.029 | 5.615 | 0.299 | 0.029 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.371ms |
| 5658dadf3076658c0000000000002253 | 18.267 | 2.698 | n/a | 0.000 | 0.083 | 0.589 | 1.356 | 0.018 | n/a | 1.757 | 11.719 | n/a | n/a | 0.047 | 2.780 | 0.152 | 0.047 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.983ms; driver.publication.persist-deferred 0.031ms |
| 5658dadf3076658c000000000000221b | 18.092 | 2.791 | n/a | 0.000 | 0.037 | 0.969 | 5.136 | 0.034 | n/a | 0.118 | 8.972 | n/a | n/a | 0.034 | 2.828 | 0.156 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002011 | 17.208 | 2.968 | n/a | 0.000 | 0.043 | 1.126 | 1.743 | 0.030 | n/a | 0.135 | 11.119 | n/a | n/a | 0.044 | 3.010 | 0.175 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.908ms |
| 5658dadf3076658c0000000000002043 | 16.663 | 2.170 | n/a | 0.000 | 0.035 | 1.129 | 1.077 | 0.014 | n/a | 0.262 | 11.950 | n/a | n/a | 0.026 | 2.204 | 0.132 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.022ms |
| 5658dadf3076658c0000000000002074 | 16.376 | 4.660 | n/a | 0.000 | 0.042 | 1.781 | 6.898 | 0.052 | n/a | 0.112 | 2.801 | n/a | n/a | 0.029 | 4.702 | 0.287 | 0.029 | gw-w/thread-41/gateway.response-write | none observed |
| 5658dadf3076658c000000000000219b | 16.090 | 2.730 | n/a | 0.000 | 1.496 | 3.191 | 1.906 | 0.034 | n/a | 0.118 | 6.574 | n/a | n/a | 0.040 | 4.226 | 0.263 | 0.040 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000020a5 | 16.018 | 6.498 | n/a | 0.000 | 0.255 | 0.754 | 0.806 | 0.013 | n/a | 0.051 | 7.542 | n/a | n/a | 0.099 | 6.753 | 0.422 | 0.099 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000020c3 | 15.087 | 2.860 | n/a | 0.000 | 0.078 | 0.576 | 1.066 | 0.014 | n/a | 0.065 | 10.374 | n/a | n/a | 0.054 | 2.938 | 0.195 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002060 | 14.945 | 3.347 | n/a | 0.000 | 0.114 | 0.746 | 0.955 | 0.016 | n/a | 0.239 | 9.468 | n/a | n/a | 0.061 | 3.461 | 0.232 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000021a7 | 14.934 | 4.379 | n/a | 2.825 | 0.054 | 1.083 | 1.098 | 0.022 | n/a | 0.131 | 5.260 | n/a | n/a | 0.081 | 7.259 | 0.486 | 0.081 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000021f0 | 14.535 | 2.861 | n/a | 0.000 | 0.062 | 0.959 | 0.810 | 0.013 | n/a | 0.046 | 9.729 | n/a | n/a | 0.054 | 2.923 | 0.201 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000022a3 | 14.238 | 2.491 | n/a | 0.000 | 0.075 | 0.646 | 0.970 | 0.014 | n/a | 0.081 | 9.917 | n/a | n/a | 0.044 | 2.566 | 0.180 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002145 | 14.090 | 2.883 | n/a | 0.000 | 0.100 | 0.642 | 0.906 | 0.016 | n/a | 0.335 | 9.148 | n/a | n/a | 0.060 | 2.982 | 0.212 | 0.060 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c0000000000002069 | 14.062 | 2.189 | n/a | 0.000 | 0.080 | 0.546 | 1.628 | 0.023 | n/a | 0.096 | 9.455 | n/a | n/a | 0.043 | 2.269 | 0.161 | 0.043 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5658dadf3076658c00000000000020ea | 13.515 | 2.078 | n/a | 0.000 | 0.056 | 0.712 | 1.510 | 0.037 | n/a | 0.518 | 8.571 | n/a | n/a | 0.034 | 2.135 | 0.158 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (1164 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.050 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.000 | 0.000 | 0.021 |
| p99 | 292.037 | n/a | n/a | n/a | 12.039 | n/a | 0.000 | 291.996 | 0.599 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.375 | 292.035 | 1.000 | 35.375 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c2419d6862154bf30000000000000b4f | 293.691 | 0.031 | n/a | 0.000 | 293.658 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.689 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf30000000000000b4e | 293.658 | 0.033 | n/a | 0.000 | 293.623 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.656 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf30000000000000b4d | 293.623 | 0.037 | n/a | 0.000 | 293.584 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.621 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000000a28 | 293.596 | 0.035 | n/a | 0.000 | 293.559 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 293.594 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c2419d6862154bf30000000000000b4c | 293.582 | 0.075 | n/a | 0.000 | 293.504 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 293.579 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000000a27 | 293.563 | 0.058 | n/a | 0.000 | 293.501 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 293.560 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000000a26 | 293.556 | 0.439 | n/a | 0.000 | 293.113 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 293.552 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c2419d6862154bf30000000000000b4b | 293.504 | 0.386 | n/a | 0.000 | 293.113 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 293.499 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000000a36 | 293.275 | 0.030 | n/a | 0.000 | 293.242 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.273 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000000a35 | 293.245 | 0.034 | n/a | 0.000 | 293.209 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.243 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000006b9 | 292.071 | 0.269 | n/a | 0.000 | 291.800 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.069 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000006ba | 292.037 | 0.039 | n/a | 0.000 | 291.996 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.035 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000006bb | 292.036 | 0.020 | n/a | 0.000 | 292.013 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.033 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000006d8 | 290.974 | 0.021 | n/a | 0.000 | 290.951 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.972 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000006e0 | 290.641 | 0.017 | n/a | 0.000 | 290.623 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.640 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000006df | 290.641 | 0.020 | n/a | 0.000 | 290.618 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.638 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000218a8 | 280.084 | 0.367 | n/a | 0.000 | 279.714 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 280.081 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000218bb | 278.659 | 0.055 | n/a | 0.000 | 278.602 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.657 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000218bc | 278.640 | 0.200 | n/a | 0.000 | 278.438 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.638 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000218d2 | 277.380 | 0.045 | n/a | 0.000 | 277.333 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.378 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (1000 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 272.608 | n/a | n/a | n/a | 0.184 | n/a | 0.000 | 272.421 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.193 | 272.605 | 1.000 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d2f43478761c4e200000000000720da | 333.534 | 0.324 | n/a | 0.000 | 333.207 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 333.531 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000139eb5 | 318.547 | 0.103 | n/a | 0.000 | 318.442 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 318.545 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 4d2f43478761c4e20000000000136174 | 279.431 | 0.106 | n/a | 0.000 | 279.323 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.429 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| 4d2f43478761c4e20000000000124901 | 278.825 | 0.120 | n/a | 0.000 | 278.702 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.822 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 4d2f43478761c4e2000000000010e928 | 277.576 | 0.174 | n/a | 0.000 | 277.401 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.575 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000090569 | 277.094 | 0.086 | n/a | 0.000 | 277.006 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.092 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| 4d2f43478761c4e200000000000cc215 | 274.524 | 0.081 | n/a | 0.000 | 274.442 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.522 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000873b8 | 273.615 | 0.104 | n/a | 0.000 | 273.509 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.613 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000b33c4 | 273.402 | 0.088 | n/a | 0.000 | 273.312 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.400 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e2000000000011d9fb | 273.086 | 0.133 | n/a | 0.000 | 272.950 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.083 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000be1ee | 272.608 | 0.184 | n/a | 0.000 | 272.421 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.605 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000b1e87 | 271.774 | 0.246 | n/a | 0.000 | 271.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.771 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000062472 | 271.191 | 0.156 | n/a | 0.000 | 271.031 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.188 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000097441 | 270.248 | 0.163 | n/a | 0.000 | 270.082 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.245 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000a8f93 | 269.833 | 0.099 | n/a | 0.000 | 269.732 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.832 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000fc808 | 269.010 | 0.100 | n/a | 0.000 | 268.908 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.008 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000087fc4 | 268.946 | 0.138 | n/a | 0.000 | 268.805 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.943 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.064ms |
| 4d2f43478761c4e2000000000008e3d8 | 268.343 | 0.170 | n/a | 0.000 | 268.169 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.339 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000da6e4 | 268.288 | 0.211 | n/a | 0.000 | 268.074 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.285 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000000e87bf | 267.916 | 0.114 | n/a | 0.000 | 267.800 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.913 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L4 / read (2388 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 |
| p99 | 274.173 | n/a | n/a | n/a | 0.250 | n/a | 0.000 | 273.887 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.191 | 274.168 | 1.000 | 0.191 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d2f43478761c4e200000000001ddec6 | 390.345 | 0.118 | n/a | 0.000 | 390.224 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 390.343 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000001ddecd | 389.964 | 0.026 | n/a | 0.000 | 389.937 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 389.962 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000000e2f5a | 389.873 | 0.090 | n/a | 0.000 | 389.781 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 389.870 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 5635c827b621cab400000000000e7d2c | 389.632 | 0.100 | n/a | 0.000 | 389.530 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 389.630 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000000560d0 | 313.645 | 0.117 | n/a | 0.000 | 313.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 313.642 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.071ms |
| 4d2f43478761c4e20000000000143731 | 312.689 | 0.026 | n/a | 0.000 | 312.662 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.688 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.074ms |
| 4d2f43478761c4e20000000000143730 | 312.684 | 0.103 | n/a | 0.000 | 312.576 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 312.679 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.074ms |
| 5635c827b621cab40000000000059824 | 311.253 | 0.151 | n/a | 0.000 | 311.099 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 311.250 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| c2419d6862154bf3000000000009449c | 300.092 | 0.132 | n/a | 0.000 | 299.956 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 300.088 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000098c8a | 298.587 | 0.103 | n/a | 0.000 | 298.482 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.584 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e2000000000018818f | 298.157 | 0.109 | n/a | 0.000 | 298.044 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 298.153 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000188191 | 298.093 | 0.034 | n/a | 0.000 | 298.056 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 298.090 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5635c827b621cab400000000000fa491 | 297.139 | 0.184 | n/a | 0.000 | 296.952 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.136 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000000f4ee1 | 294.436 | 0.165 | n/a | 0.000 | 294.267 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 294.433 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000001f1470 | 293.821 | 0.043 | n/a | 0.000 | 293.776 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.819 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000001f146f | 293.737 | 0.184 | n/a | 0.000 | 293.551 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.735 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c2419d6862154bf30000000000060f3f | 275.588 | 0.202 | n/a | 0.000 | 275.383 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 275.584 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000000ff5aa | 275.210 | 0.151 | n/a | 0.000 | 275.054 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 275.205 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000104853 | 275.204 | 0.111 | n/a | 0.000 | 275.091 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.202 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e2000000000014fc5e | 275.020 | 0.018 | n/a | 0.000 | 275.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.019 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L16 / read (2879 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 55.459 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 54.242 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 54.662 | 1.000 | 0.003 |
| p99 | 278.678 | n/a | n/a | n/a | 40.760 | n/a | 4.393 | 278.651 | 0.635 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.685 | 278.677 | 1.000 | 42.685 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d2f43478761c4e20000000000206de6 | 288.934 | 0.035 | n/a | 0.000 | 288.898 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.933 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000206de5 | 288.927 | 0.236 | n/a | 0.000 | 288.689 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.925 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000206e09 | 287.932 | 0.074 | n/a | 0.000 | 287.856 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.931 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000206e07 | 287.896 | 0.022 | n/a | 0.000 | 287.873 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.896 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000206e08 | 287.892 | 0.014 | n/a | 0.000 | 287.877 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.892 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000010ed7c | 287.672 | 0.025 | n/a | 0.000 | 287.646 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.672 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000010ed7b | 287.647 | 0.051 | n/a | 0.000 | 287.595 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.646 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000010ed7a | 287.591 | 0.046 | n/a | 0.000 | 287.544 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.590 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000010ed79 | 287.487 | 0.177 | n/a | 0.000 | 287.307 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.484 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000010ed87 | 287.301 | 0.032 | n/a | 0.000 | 287.267 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.300 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e20000000000206e2b | 287.192 | 0.050 | n/a | 0.000 | 287.141 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.191 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001098c8 | 285.577 | 0.024 | n/a | 0.000 | 285.551 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.576 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001098c7 | 285.568 | 0.022 | n/a | 0.000 | 285.546 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.567 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001098c6 | 285.547 | 0.029 | n/a | 0.000 | 285.518 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.546 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001098c5 | 285.518 | 0.024 | n/a | 0.000 | 285.493 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.517 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001098c4 | 285.469 | 0.103 | n/a | 0.000 | 285.363 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 285.465 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 5635c827b621cab400000000001133cd | 280.996 | 0.013 | n/a | 0.000 | 280.982 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.996 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.025ms |
| 5635c827b621cab400000000001133cc | 280.989 | 0.014 | n/a | 0.000 | 280.974 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.988 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.025ms |
| 5635c827b621cab400000000001133cb | 280.980 | 0.021 | n/a | 0.000 | 280.958 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.979 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.025ms |
| 5635c827b621cab400000000001133ca | 280.964 | 0.112 | n/a | 0.000 | 280.850 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.961 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.025ms |

## P1 / L64 / read (6329 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.149 | n/a | n/a | n/a | 0.108 | n/a | 0.000 | 53.793 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 60.272 | 1.000 | 0.003 |
| p99 | 567.843 | n/a | n/a | n/a | 181.164 | n/a | 34.749 | 265.470 | 74.705 | 0.362 | 131.587 | n/a | 0.002 | 0.000 | n/a | n/a | 361.172 | 274.398 | 1.000 | 361.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5635c827b621cab40000000000175a31 | 985.731 | 271.026 | n/a | 54.135 | 0.000 | 1.021 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 659.550 | 325.161 | 0.330 | 659.550 | node-14/thread-5/socket.wait-first-byte | client.reach-decode-and-cache 246.813ms; reader.observe 38.757ms; client.parse 23.456ms; reader.observe 22.695ms; reader.observe 20.217ms |
| c2419d6862154bf30000000000170922 | 984.876 | 330.843 | n/a | 90.490 | 123.920 | 1.233 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 438.391 | 545.253 | 0.554 | 438.391 | node-14/thread-6/socket.wait-first-byte | client.reach-decode-and-cache 40.460ms; reader.observe 39.021ms; reader.observe 14.547ms; client.reach-decode-and-cache 14.434ms; replica.apply-delta 9.563ms |
| 5635c827b621cab40000000000175a29 | 977.570 | 432.341 | n/a | 86.316 | 198.418 | 6.732 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 253.762 | 717.075 | 0.734 | 253.762 | node-14/thread-5/socket.wait-first-byte | reader.observe 38.757ms; reader.observe 22.695ms; reader.observe 20.217ms; reader.observe 19.501ms; reader.observe 13.973ms |
| 5635c827b621cab40000000000175a32 | 943.355 | 252.968 | n/a | 38.612 | 0.000 | 0.435 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 651.340 | 291.581 | 0.309 | 651.340 | node-14/thread-5/socket.wait-first-byte | client.reach-decode-and-cache 246.813ms; reader.observe 38.757ms; client.parse 23.456ms; reader.observe 22.695ms; reader.observe 20.217ms |
| 5635c827b621cab40000000000175a30 | 934.967 | 26.570 | n/a | 0.000 | 205.121 | 0.137 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 703.139 | 231.690 | 0.248 | 703.139 | node-14/thread-5/socket.wait-first-byte | client.reach-decode-and-cache 246.813ms; reader.observe 38.757ms; client.parse 23.456ms; reader.observe 22.695ms; reader.observe 20.217ms |
| 5635c827b621cab40000000000175a2f | 933.478 | 23.561 | n/a | 0.000 | 215.633 | 0.163 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 694.122 | 239.194 | 0.256 | 694.122 | node-14/thread-5/socket.wait-first-byte | client.reach-decode-and-cache 246.813ms; reader.observe 38.757ms; client.parse 23.456ms; reader.observe 22.695ms; reader.observe 20.217ms |
| 4d2f43478761c4e2000000000025cdb3 | 903.092 | 64.369 | n/a | 1.642 | 0.000 | 334.792 | 0.427 | 140.513 | n/a | 0.002 | 0.000 | n/a | n/a | 361.346 | 66.011 | 0.073 | 361.346 | node-14/thread-4/socket.wait-first-byte | reader.observe 68.783ms; reader.observe 28.559ms; reader.observe 27.200ms; reader.observe 27.161ms; replica.apply-delta 22.392ms |
| 4d2f43478761c4e2000000000025cdac | 891.562 | 71.140 | n/a | 3.126 | 0.000 | 314.507 | 0.415 | 141.200 | n/a | 0.002 | 0.000 | n/a | n/a | 361.172 | 74.266 | 0.083 | 361.172 | node-14/thread-4/socket.wait-first-byte | reader.observe 68.783ms; reader.observe 28.559ms; reader.observe 27.200ms; reader.observe 27.161ms; replica.apply-delta 22.392ms |
| c2419d6862154bf30000000000170923 | 887.211 | 350.124 | n/a | 103.563 | 105.006 | 74.593 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 253.925 | 558.693 | 0.630 | 253.925 | node-14/thread-6/socket.wait-first-byte | client.reach-decode-and-cache 40.460ms; reader.observe 39.021ms; client.reach-decode-and-cache 36.140ms; reader.observe 14.547ms; client.reach-decode-and-cache 14.434ms |
| 4d2f43478761c4e2000000000026f09a | 873.606 | 69.880 | n/a | 12.544 | 4.187 | 0.608 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 786.387 | 86.611 | 0.099 | 786.387 | node-14/thread-4/socket.wait-first-byte | reader.observe 25.751ms; reader.observe 12.170ms; reader.observe 4.748ms; reader.observe 3.808ms; reader.observe 3.385ms |
| 4d2f43478761c4e2000000000025cdba | 859.503 | 205.968 | n/a | 47.149 | 0.000 | 81.082 | 0.327 | 150.251 | n/a | 0.004 | 0.000 | n/a | n/a | 374.721 | 253.117 | 0.294 | 374.721 | node-14/thread-4/socket.wait-first-byte | reader.observe 68.783ms; reader.observe 28.559ms; reader.observe 27.200ms; reader.observe 27.161ms; replica.apply-delta 22.392ms |
| 4d2f43478761c4e2000000000025cdb8 | 853.544 | 73.367 | n/a | 5.813 | 0.000 | 394.922 | 0.578 | 148.249 | n/a | 0.005 | 0.000 | n/a | n/a | 230.611 | 79.179 | 0.093 | 230.611 | node-14/thread-4/socket.wait-first-byte | reader.observe 68.783ms; reader.observe 27.200ms; reader.observe 27.161ms; replica.apply-delta 22.392ms; reader.observe 21.479ms |
| 4d2f43478761c4e2000000000026f099 | 801.018 | 79.390 | n/a | 13.303 | 8.572 | 0.384 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 699.369 | 101.265 | 0.126 | 699.369 | node-14/thread-4/socket.wait-first-byte | reader.observe 25.751ms; reader.observe 12.170ms; reader.observe 4.748ms; reader.observe 3.385ms; client.parse 3.369ms |
| 5635c827b621cab400000000001622ee | 799.118 | 54.230 | n/a | 9.805 | 35.768 | 472.902 | 77.780 | 148.625 | n/a | 0.005 | 0.000 | n/a | n/a | 0.002 | 99.803 | 0.125 | 0.002 | node-14/thread-5/socket.wait-first-byte | client.reach-decode-and-cache 40.335ms; reader.observe 37.016ms; reader.observe 35.765ms; reader.observe 22.763ms; reader.observe 17.820ms |
| 4d2f43478761c4e2000000000026f09c | 791.313 | 367.051 | n/a | 82.494 | 0.000 | 1.104 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 340.663 | 449.545 | 0.568 | 340.663 | node-14/thread-4/socket.wait-first-byte | reader.observe 25.751ms; reader.observe 12.170ms; reader.observe 3.385ms; client.parse 3.369ms; client.reach-decode-and-cache 3.305ms |
| 5635c827b621cab400000000001622ed | 784.484 | 58.376 | n/a | 12.407 | 35.543 | 448.126 | 45.125 | 184.896 | n/a | 0.009 | 0.000 | n/a | n/a | 0.002 | 106.327 | 0.136 | 0.002 | node-14/thread-5/socket.wait-first-byte | client.reach-decode-and-cache 40.335ms; reader.observe 37.016ms; reader.observe 35.765ms; reader.observe 22.763ms; reader.observe 17.820ms |
| 4d2f43478761c4e2000000000026f09e | 781.889 | 242.636 | n/a | 41.993 | 0.000 | 0.787 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 496.473 | 284.629 | 0.364 | 496.473 | node-14/thread-4/socket.wait-first-byte | reader.observe 25.751ms; reader.observe 12.170ms; reader.observe 3.385ms; client.parse 3.369ms; client.reach-decode-and-cache 3.305ms |
| 4d2f43478761c4e2000000000026f0a0 | 778.739 | 238.236 | n/a | 41.993 | 37.853 | 0.066 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 460.592 | 318.082 | 0.408 | 460.592 | node-14/thread-4/socket.wait-first-byte | reader.observe 25.751ms; reader.observe 12.170ms; reader.observe 3.385ms; client.parse 3.369ms; client.reach-decode-and-cache 3.305ms |
| 5635c827b621cab40000000000175a2e | 777.000 | 48.037 | n/a | 14.229 | 0.000 | 0.296 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 714.438 | 62.266 | 0.080 | 714.438 | node-14/thread-5/socket.wait-first-byte | client.reach-decode-and-cache 246.813ms; reader.observe 38.757ms; client.parse 23.456ms; reader.observe 22.695ms; reader.observe 20.217ms |
| 4d2f43478761c4e2000000000025cdae | 760.406 | 95.693 | n/a | 15.927 | 110.739 | 36.612 | 0.401 | 139.605 | n/a | 0.002 | 0.000 | n/a | n/a | 361.427 | 222.359 | 0.292 | 361.427 | node-14/thread-4/socket.wait-first-byte | reader.observe 68.783ms; reader.observe 27.200ms; reader.observe 27.161ms; reader.observe 21.479ms; reader.observe 20.395ms |

## P1 / L256 / read (14137 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 232.600 | n/a | n/a | n/a | 0.027 | n/a | 0.000 | 232.491 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 232.599 | 1.000 | 0.001 |
| p99 | 263.436 | n/a | n/a | n/a | 3.638 | n/a | 0.000 | 263.361 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.282 | 263.435 | 1.000 | 0.282 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5635c827b621cab400000000001ca705 | 273.385 | 0.026 | n/a | 0.000 | 273.357 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.384 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab400000000001ca704 | 273.361 | 0.012 | n/a | 0.000 | 273.348 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.360 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab400000000001ca703 | 273.357 | 0.013 | n/a | 0.000 | 273.343 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.356 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab400000000001ca702 | 273.349 | 0.015 | n/a | 0.000 | 273.333 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.348 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab400000000001ca701 | 273.304 | 0.018 | n/a | 0.000 | 273.285 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.303 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab400000000001ca700 | 273.273 | 0.087 | n/a | 0.000 | 273.183 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.270 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d2f43478761c4e200000000002c8103 | 272.131 | 0.182 | n/a | 0.000 | 271.946 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.128 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c36a6 | 270.474 | 0.018 | n/a | 0.000 | 270.454 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.472 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c36a5 | 270.463 | 0.016 | n/a | 0.000 | 270.446 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.461 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c36a4 | 270.453 | 0.015 | n/a | 0.000 | 270.438 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.452 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c36a3 | 270.444 | 0.013 | n/a | 0.000 | 270.430 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.443 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c36a2 | 270.437 | 0.017 | n/a | 0.000 | 270.418 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.436 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c36a0 | 270.433 | 0.016 | n/a | 0.000 | 270.416 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.432 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c36a1 | 270.429 | 0.013 | n/a | 0.000 | 270.415 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.428 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c369f | 270.424 | 0.017 | n/a | 0.000 | 270.406 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.423 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c369e | 270.414 | 0.019 | n/a | 0.000 | 270.394 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.413 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c369c | 270.414 | 0.130 | n/a | 0.000 | 270.278 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 270.408 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c369d | 270.407 | 0.026 | n/a | 0.000 | 270.379 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.405 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c0239 | 269.546 | 0.047 | n/a | 0.000 | 269.498 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.544 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c2419d6862154bf300000000001c0238 | 269.542 | 0.151 | n/a | 0.000 | 269.388 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 269.539 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (46450 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 158.684 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 158.593 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 158.683 | 1.000 | 0.001 |
| p99 | 258.093 | n/a | n/a | n/a | 46.275 | n/a | 6.962 | 258.059 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.370 | 258.092 | 1.000 | 0.370 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d2f43478761c4e2000000000035fd34 | 306.617 | 0.496 | n/a | 0.000 | 306.113 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 306.610 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261628 | 304.249 | 0.859 | n/a | 0.000 | 303.387 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 304.247 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261629 | 303.971 | 0.144 | n/a | 0.000 | 303.821 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 303.965 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000026162a | 303.902 | 0.225 | n/a | 0.000 | 303.675 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.900 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261627 | 303.865 | 0.361 | n/a | 0.000 | 303.501 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 303.862 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261626 | 303.782 | 0.551 | n/a | 0.000 | 303.227 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 303.778 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000026162b | 303.705 | 0.024 | n/a | 0.000 | 303.678 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.703 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000026162c | 303.689 | 0.027 | n/a | 0.000 | 303.658 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 303.685 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000026162d | 303.661 | 0.029 | n/a | 0.000 | 303.628 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 303.657 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000026162e | 303.635 | 0.024 | n/a | 0.000 | 303.608 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.633 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000026162f | 303.620 | 0.024 | n/a | 0.000 | 303.591 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 303.615 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261630 | 303.612 | 0.207 | n/a | 0.000 | 303.401 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 303.608 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261631 | 303.426 | 0.020 | n/a | 0.000 | 303.404 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.424 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261632 | 303.417 | 0.017 | n/a | 0.000 | 303.399 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.416 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261633 | 303.409 | 0.023 | n/a | 0.000 | 303.384 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.407 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261634 | 303.393 | 0.018 | n/a | 0.000 | 303.373 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.391 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261635 | 303.379 | 0.021 | n/a | 0.000 | 303.356 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.377 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261636 | 303.367 | 0.021 | n/a | 0.000 | 303.344 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.365 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab4000000000026163a | 303.355 | 0.013 | n/a | 0.000 | 303.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 303.354 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5635c827b621cab40000000000261637 | 303.352 | 0.016 | n/a | 0.000 | 303.335 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.350 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / tail / read (52 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.031 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 0.000 | 0.000 | 0.031 |
| p99 | 0.156 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d2f43478761c4e20000000000404e10 | 0.156 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | uncovered | none observed |
| 4d2f43478761c4e20000000000404e0e | 0.148 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | uncovered | none observed |
| c2419d6862154bf300000000002f974a | 0.146 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | uncovered | none observed |
| 5635c827b621cab40000000000306035 | 0.128 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | uncovered | none observed |
| 4d2f43478761c4e20000000000404e12 | 0.119 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | uncovered | none observed |
| 5635c827b621cab40000000000306039 | 0.118 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | uncovered | none observed |
| 4d2f43478761c4e20000000000404e11 | 0.099 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | uncovered | none observed |
| c2419d6862154bf300000000002f974f | 0.084 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | uncovered | none observed |
| 5635c827b621cab40000000000306033 | 0.076 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | uncovered | none observed |
| 4d2f43478761c4e20000000000404e14 | 0.070 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.070 | 0.000 | 0.000 | 0.070 | uncovered | none observed |
| c2419d6862154bf300000000002f974c | 0.070 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.070 | 0.000 | 0.000 | 0.070 | uncovered | none observed |
| c2419d6862154bf300000000002f974d | 0.067 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.067 | 0.000 | 0.000 | 0.067 | uncovered | none observed |
| 5635c827b621cab4000000000030603e | 0.065 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.065 | 0.000 | 0.000 | 0.065 | uncovered | none observed |
| 5635c827b621cab4000000000030603c | 0.063 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.063 | 0.000 | 0.000 | 0.063 | uncovered | none observed |
| c2419d6862154bf300000000002f9748 | 0.062 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.062 | 0.000 | 0.000 | 0.062 | uncovered | none observed |
| 4d2f43478761c4e20000000000404e16 | 0.055 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.055 | 0.000 | 0.000 | 0.055 | uncovered | none observed |
| 5635c827b621cab4000000000030603b | 0.051 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.051 | 0.000 | 0.000 | 0.051 | uncovered | none observed |
| c2419d6862154bf300000000002f9754 | 0.050 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.050 | 0.000 | 0.000 | 0.050 | uncovered | none observed |
| 5635c827b621cab4000000000030602c | 0.050 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.050 | 0.000 | 0.000 | 0.050 | uncovered | none observed |
| 5635c827b621cab4000000000030602e | 0.038 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.038 | 0.000 | 0.000 | 0.038 | uncovered | none observed |

## P3 / outside-phases / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.325 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 200.609 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 |
| p99 | 372.935 | n/a | n/a | n/a | 21.790 | n/a | 1.066 | 0.000 | 5.784 | 363.418 | 1.637 | n/a | 0.290 | 0.000 | n/a | n/a | 0.372 | 22.856 | 0.299 | 0.372 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f994660000000000000002 | 372.935 | 2.679 | n/a | 0.000 | 0.000 | 4.735 | 363.418 | 1.637 | n/a | 0.094 | 0.000 | n/a | n/a | 0.372 | 2.679 | 0.007 | 0.372 | gw-r/thread-47/gateway.admitted-work | none observed |
| 98d840ab91d0eacc0000000000000006 | 204.241 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 202.517 | 0.050 | n/a | 0.290 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-45/journal/page | none observed |
| 98d840ab91d0eacc0000000000000007 | 203.219 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 202.133 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-44/journal/page | none observed |
| 98d840ab91d0eacc0000000000000005 | 203.091 | 0.000 | n/a | 0.000 | 0.000 | 1.351 | 201.232 | 0.014 | n/a | 0.123 | 0.000 | n/a | n/a | 0.371 | 0.000 | 0.000 | 0.371 | gw-r/thread-49/journal/page | none observed |
| 98d840ab91d0eacc0000000000001346 | 201.468 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 200.609 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-102/journal/page | none observed |
| 98d840ab91d0eacc0000000000001348 | 201.458 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 200.835 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-84/journal/page | none observed |
| 98d840ab91d0eacc0000000000001347 | 201.325 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 200.600 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-130/journal/page | none observed |
| 98d840ab91d0eacc0000000000001345 | 201.297 | 0.000 | n/a | 0.000 | 0.000 | 0.312 | 200.844 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-109/journal/page | none observed |
| 98d840ab91d0eacc0000000000001349 | 200.986 | 0.000 | n/a | 0.000 | 0.000 | 0.367 | 200.509 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-120/journal/page | none observed |
| 98d840ab91d0eacc000000000000134e | 80.285 | 14.940 | n/a | 0.000 | 0.000 | 5.784 | 59.399 | 0.004 | n/a | 0.006 | 0.000 | n/a | n/a | 0.153 | 14.940 | 0.186 | 0.153 | gw-r/thread-64/gateway.admitted-work | none observed |
| 98d840ab91d0eacc000000000000134f | 79.539 | 15.780 | n/a | 0.000 | 0.000 | 4.588 | 58.961 | 0.005 | n/a | 0.006 | 0.000 | n/a | n/a | 0.199 | 15.780 | 0.198 | 0.199 | gw-r/thread-69/gateway.admitted-work | none observed |
| 98d840ab91d0eacc000000000000134c | 76.548 | 21.790 | n/a | 1.066 | 0.000 | 2.669 | 50.898 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.119 | 22.856 | 0.299 | 0.119 | gw-r/thread-79/gateway.admitted-work | none observed |
| 98d840ab91d0eacc000000000000134d | 74.308 | 21.383 | n/a | 0.000 | 0.000 | 2.073 | 50.652 | 0.003 | n/a | 0.006 | 0.000 | n/a | n/a | 0.192 | 21.383 | 0.288 | 0.192 | gw-r/thread-97/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1006.594 | n/a | n/a | n/a | 0.149 | n/a | 0.000 | 0.000 | 3.614 | 1001.481 | 0.014 | n/a | 0.176 | 0.000 | n/a | n/a | 1.096 | 0.149 | 0.000 | 1.096 |
| p99 | 16530.266 | n/a | n/a | n/a | 0.189 | n/a | 0.000 | 0.000 | 15527.383 | 1001.920 | 0.020 | n/a | 0.268 | 0.000 | n/a | n/a | 1.154 | 0.189 | 0.000 | 1.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f9946600000000000000a4 | 16530.266 | 0.189 | n/a | 0.000 | 0.000 | 15527.383 | 1001.920 | 0.014 | n/a | 0.268 | 0.000 | n/a | n/a | 0.491 | 0.189 | 0.000 | 0.491 | node-14/thread-2/socket.wait-first-byte | none observed |
| 688ce1bed7f9946600000000000000a5 | 1006.594 | 0.149 | n/a | 0.000 | 0.000 | 3.614 | 1001.481 | 0.020 | n/a | 0.176 | 0.000 | n/a | n/a | 1.154 | 0.149 | 0.000 | 1.154 | gw-r/thread-47/journal/page | none observed |
| 688ce1bed7f9946600000000000000a6 | 1003.039 | 0.131 | n/a | 0.000 | 0.000 | 0.738 | 1000.953 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 1.096 | 0.131 | 0.000 | 1.096 | gw-r/thread-64/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 424.779 | n/a | n/a | n/a | 5.146 | n/a | 0.759 | 0.000 | 1.030 | 420.797 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 0.130 | 7.622 | 0.019 | 0.130 |
| p99 | 1005.503 | n/a | n/a | n/a | 45.706 | n/a | 20.590 | 0.000 | 11.313 | 1001.176 | 2.042 | n/a | 0.277 | 0.000 | n/a | n/a | 20.176 | 66.296 | 0.347 | 20.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f9946600000000000000bd | 1005.503 | 0.107 | n/a | 0.000 | 0.000 | 2.983 | 1001.176 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 1.102 | 0.107 | 0.000 | 1.102 | gw-r/thread-48/journal/page | none observed |
| 688ce1bed7f9946600000000000000d2 | 990.045 | 3.602 | n/a | 0.708 | 0.000 | 0.647 | 984.909 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.108 | 4.311 | 0.004 | 0.108 | gw-r/thread-70/journal/page | none observed |
| 688ce1bed7f9946600000000000000b0 | 987.370 | 3.360 | n/a | 0.533 | 0.000 | 0.472 | 982.817 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.085 | 3.893 | 0.004 | 0.085 | gw-r/thread-64/journal/page | none observed |
| 688ce1bed7f9946600000000000000b6 | 982.817 | 4.834 | n/a | 1.834 | 0.000 | 3.852 | 972.019 | 0.044 | n/a | 0.129 | 0.000 | n/a | n/a | 0.104 | 6.669 | 0.007 | 0.104 | gw-r/thread-66/journal/page | none observed |
| 688ce1bed7f9946600000000000000bc | 973.644 | 6.113 | n/a | 4.178 | 0.000 | 8.064 | 955.066 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.113 | 10.292 | 0.011 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 688ce1bed7f9946600000000000000ad | 865.373 | 6.968 | n/a | 5.173 | 0.000 | 2.424 | 850.456 | 0.014 | n/a | 0.108 | 0.000 | n/a | n/a | 0.229 | 12.141 | 0.014 | 0.229 | gw-r/thread-48/journal/page | none observed |
| 688ce1bed7f9946600000000000000c4 | 836.551 | 21.475 | n/a | 4.005 | 0.000 | 0.517 | 810.333 | 0.014 | n/a | 0.069 | 0.000 | n/a | n/a | 0.138 | 25.480 | 0.030 | 0.138 | gw-r/thread-67/journal/page | none observed |
| 688ce1bed7f9946600000000000000aa | 836.242 | 3.642 | n/a | 6.688 | 0.000 | 0.895 | 824.643 | 0.022 | n/a | 0.150 | 0.000 | n/a | n/a | 0.203 | 10.329 | 0.012 | 0.203 | gw-r/thread-44/journal/page | none observed |
| 688ce1bed7f9946600000000000000cd | 650.194 | 7.622 | n/a | 0.000 | 0.000 | 1.004 | 641.390 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.089 | 7.622 | 0.012 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 688ce1bed7f9946600000000000000cc | 620.072 | 10.983 | n/a | 0.000 | 0.000 | 3.509 | 604.084 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 1.403 | 10.983 | 0.018 | 1.403 | gw-r/thread-47/journal/page | none observed |
| 688ce1bed7f9946600000000000000b5 | 618.612 | 5.552 | n/a | 0.602 | 0.000 | 1.030 | 603.340 | 0.031 | n/a | 0.130 | 0.000 | n/a | n/a | 7.927 | 6.155 | 0.010 | 7.927 | gw-r/thread-42/journal/page | none observed |
| 688ce1bed7f9946600000000000000c3 | 546.757 | 4.744 | n/a | 0.759 | 0.000 | 2.150 | 538.875 | 0.012 | n/a | 0.080 | 0.000 | n/a | n/a | 0.136 | 5.504 | 0.010 | 0.136 | gw-r/thread-44/journal/page | none observed |
| 688ce1bed7f9946600000000000000c9 | 534.211 | 5.146 | n/a | 9.863 | 0.000 | 2.811 | 516.178 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.109 | 15.009 | 0.028 | 0.109 | gw-r/thread-66/journal/page | none observed |
| 688ce1bed7f9946600000000000000c7 | 475.630 | 2.977 | n/a | 0.000 | 0.000 | 0.632 | 471.860 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.072 | 2.977 | 0.006 | 0.072 | gw-r/thread-72/journal/page | none observed |
| 688ce1bed7f9946600000000000000b9 | 440.123 | 7.386 | n/a | 1.411 | 0.000 | 7.029 | 424.026 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.200 | 8.797 | 0.020 | 0.200 | gw-r/thread-67/journal/page | none observed |
| 688ce1bed7f9946600000000000000ca | 424.779 | 3.037 | n/a | 0.000 | 0.000 | 0.695 | 420.797 | 0.035 | n/a | 0.135 | 0.000 | n/a | n/a | 0.080 | 3.037 | 0.007 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 688ce1bed7f9946600000000000000b2 | 327.505 | 13.378 | n/a | 1.033 | 0.000 | 0.883 | 311.960 | 0.016 | n/a | 0.085 | 0.000 | n/a | n/a | 0.150 | 14.411 | 0.044 | 0.150 | gw-r/thread-67/journal/page | none observed |
| 688ce1bed7f9946600000000000000a9 | 304.112 | 10.605 | n/a | 1.154 | 0.000 | 6.329 | 285.759 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.173 | 11.759 | 0.039 | 0.173 | gw-r/thread-68/journal/page | none observed |
| 688ce1bed7f9946600000000000000ba | 298.870 | 5.882 | n/a | 1.801 | 0.000 | 11.313 | 279.678 | 0.015 | n/a | 0.085 | 0.000 | n/a | n/a | 0.097 | 7.682 | 0.026 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 688ce1bed7f9946600000000000000ce | 286.494 | 8.271 | n/a | 3.737 | 0.000 | 0.428 | 273.698 | 0.025 | n/a | 0.139 | 0.000 | n/a | n/a | 0.194 | 12.008 | 0.042 | 0.194 | gw-r/thread-66/journal/page | none observed |

## P3 / L1 / internal (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 419.698 | n/a | n/a | n/a | 2.912 | n/a | 0.000 | 0.000 | 0.746 | 412.015 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.083 | 3.154 | 0.009 | 0.083 |
| p99 | 1007.773 | n/a | n/a | n/a | 12.893 | n/a | 2.785 | 0.000 | 12.060 | 1002.165 | 0.944 | n/a | 3.041 | 0.000 | n/a | n/a | 49.328 | 13.658 | 0.603 | 49.328 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f99466000000000000011e | 1007.773 | 2.595 | n/a | 0.576 | 0.000 | 2.342 | 1002.096 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.088 | 3.171 | 0.003 | 0.088 | gw-r/thread-42/journal/page | none observed |
| 688ce1bed7f994660000000000000127 | 1005.395 | 2.616 | n/a | 0.000 | 0.000 | 0.484 | 1002.165 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.063 | 2.616 | 0.003 | 0.063 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f9946600000000000000df | 1004.168 | 0.162 | n/a | 0.000 | 0.000 | 0.782 | 1001.907 | 0.021 | n/a | 0.170 | 0.000 | n/a | n/a | 1.125 | 0.162 | 0.000 | 1.125 | gw-r/thread-45/journal/page | none observed |
| 688ce1bed7f994660000000000000107 | 1001.911 | 3.046 | n/a | 0.666 | 0.000 | 1.106 | 996.922 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.104 | 3.712 | 0.004 | 0.104 | gw-r/thread-71/journal/page | none observed |
| 688ce1bed7f99466000000000000010f | 1001.192 | 5.386 | n/a | 0.000 | 0.000 | 0.818 | 994.815 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.145 | 5.386 | 0.005 | 0.145 | gw-r/thread-49/journal/page | none observed |
| 688ce1bed7f9946600000000000000da | 1001.179 | 4.704 | n/a | 0.000 | 0.000 | 0.600 | 995.606 | 0.018 | n/a | 0.118 | 0.000 | n/a | n/a | 0.132 | 4.704 | 0.005 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 688ce1bed7f99466000000000000012b | 1000.962 | 2.279 | n/a | 0.000 | 0.000 | 1.472 | 997.085 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.063 | 2.279 | 0.002 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 688ce1bed7f9946600000000000000db | 1000.762 | 9.990 | n/a | 0.976 | 0.000 | 0.770 | 988.709 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.228 | 10.967 | 0.011 | 0.228 | gw-r/thread-68/journal/page | none observed |
| 688ce1bed7f994660000000000000100 | 1000.474 | 2.321 | n/a | 0.000 | 0.000 | 0.392 | 996.900 | 0.755 | n/a | 0.045 | 0.000 | n/a | n/a | 0.061 | 2.321 | 0.002 | 0.061 | gw-r/thread-71/journal/page | none observed |
| 688ce1bed7f994660000000000000154 | 998.887 | 2.404 | n/a | 0.000 | 0.000 | 0.486 | 995.887 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.067 | 2.404 | 0.002 | 0.067 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f99466000000000000012c | 997.462 | 2.368 | n/a | 0.000 | 0.000 | 0.527 | 994.423 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.061 | 2.368 | 0.002 | 0.061 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f994660000000000000138 | 996.130 | 2.410 | n/a | 0.000 | 0.000 | 0.557 | 993.058 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.057 | 2.410 | 0.002 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 688ce1bed7f9946600000000000000d4 | 995.328 | 3.440 | n/a | 0.901 | 0.000 | 0.885 | 989.909 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.105 | 4.341 | 0.004 | 0.105 | gw-r/thread-71/journal/page | none observed |
| 688ce1bed7f9946600000000000000d3 | 995.190 | 5.953 | n/a | 0.000 | 0.000 | 0.691 | 988.271 | 0.014 | n/a | 0.058 | 0.000 | n/a | n/a | 0.204 | 5.953 | 0.006 | 0.204 | gw-r/thread-49/journal/page | none observed |
| 688ce1bed7f9946600000000000000e1 | 991.508 | 3.046 | n/a | 0.588 | 0.000 | 0.888 | 986.757 | 0.046 | n/a | 0.079 | 0.000 | n/a | n/a | 0.104 | 3.634 | 0.004 | 0.104 | gw-r/thread-67/journal/page | none observed |
| 688ce1bed7f994660000000000000116 | 987.905 | 2.291 | n/a | 0.000 | 0.000 | 3.084 | 982.386 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.064 | 2.291 | 0.002 | 0.064 | gw-r/thread-70/journal/page | none observed |
| 688ce1bed7f994660000000000000103 | 943.180 | 2.524 | n/a | 0.000 | 0.000 | 0.694 | 939.815 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.071 | 2.524 | 0.003 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 688ce1bed7f994660000000000000141 | 901.187 | 2.357 | n/a | 0.000 | 0.000 | 0.494 | 898.232 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.064 | 2.357 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 688ce1bed7f994660000000000000113 | 890.810 | 2.208 | n/a | 0.612 | 0.000 | 0.643 | 887.166 | 0.017 | n/a | 0.080 | 0.000 | n/a | n/a | 0.084 | 2.820 | 0.003 | 0.084 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f9946600000000000000e2 | 870.054 | 4.934 | n/a | 0.000 | 0.000 | 0.769 | 864.183 | 0.017 | n/a | 0.078 | 0.000 | n/a | n/a | 0.074 | 4.934 | 0.006 | 0.074 | gw-r/thread-65/journal/page | none observed |

## P3 / L4 / internal (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 341.308 | n/a | n/a | n/a | 2.896 | n/a | 0.000 | 0.000 | 0.880 | 329.917 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.071 | 2.896 | 0.010 | 0.071 |
| p99 | 1006.326 | n/a | n/a | n/a | 9.172 | n/a | 0.000 | 0.000 | 8.617 | 1000.903 | 0.902 | n/a | 0.082 | 0.000 | n/a | n/a | 32.563 | 9.172 | 0.352 | 32.563 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f9946600000000000001e9 | 1013.197 | 3.620 | n/a | 0.000 | 0.000 | 8.617 | 1000.832 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.063 | 3.620 | 0.004 | 0.063 | gw-r/thread-42/journal/page | none observed |
| 688ce1bed7f9946600000000000001c4 | 1006.326 | 2.303 | n/a | 0.000 | 0.000 | 11.313 | 992.619 | 0.002 | n/a | 0.025 | 0.000 | n/a | n/a | 0.064 | 2.303 | 0.002 | 0.064 | gw-r/thread-64/journal/page | none observed |
| 688ce1bed7f994660000000000000164 | 1003.065 | 0.109 | n/a | 0.000 | 0.000 | 0.800 | 1000.977 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 1.117 | 0.109 | 0.000 | 1.117 | gw-r/thread-46/journal/page | none observed |
| 688ce1bed7f9946600000000000001a6 | 1003.002 | 0.160 | n/a | 0.000 | 0.000 | 0.748 | 1000.896 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 1.128 | 0.160 | 0.000 | 1.128 | gw-r/thread-44/journal/page | none observed |
| 688ce1bed7f99466000000000000017e | 1002.814 | 0.115 | n/a | 0.000 | 0.000 | 0.626 | 1000.903 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 1.115 | 0.115 | 0.000 | 1.115 | gw-r/thread-67/journal/page | none observed |
| 688ce1bed7f994660000000000000185 | 1000.797 | 8.015 | n/a | 0.000 | 0.000 | 1.655 | 990.907 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.149 | 8.015 | 0.008 | 0.149 | gw-r/thread-71/journal/page | none observed |
| 688ce1bed7f994660000000000000186 | 998.572 | 3.632 | n/a | 0.000 | 0.000 | 0.855 | 993.875 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.149 | 3.632 | 0.004 | 0.149 | gw-r/thread-72/journal/page | none observed |
| 688ce1bed7f994660000000000000199 | 994.276 | 2.403 | n/a | 0.000 | 0.000 | 1.171 | 990.583 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.070 | 2.403 | 0.002 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 688ce1bed7f9946600000000000001c3 | 994.253 | 2.236 | n/a | 0.000 | 0.000 | 2.039 | 989.874 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.060 | 2.236 | 0.002 | 0.060 | gw-r/thread-46/journal/page | none observed |
| 688ce1bed7f99466000000000000018a | 994.011 | 2.446 | n/a | 0.000 | 0.000 | 0.680 | 990.777 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.061 | 2.446 | 0.002 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 688ce1bed7f9946600000000000001a5 | 986.832 | 5.216 | n/a | 0.000 | 0.000 | 4.720 | 976.781 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.063 | 5.216 | 0.005 | 0.063 | gw-r/thread-72/journal/page | none observed |
| 688ce1bed7f99466000000000000016e | 981.266 | 3.354 | n/a | 0.000 | 0.000 | 1.802 | 975.952 | 0.013 | n/a | 0.060 | 0.000 | n/a | n/a | 0.086 | 3.354 | 0.003 | 0.086 | gw-r/thread-64/journal/page | none observed |
| 688ce1bed7f994660000000000000174 | 917.301 | 6.565 | n/a | 0.000 | 0.000 | 4.721 | 905.818 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.144 | 6.565 | 0.007 | 0.144 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f9946600000000000001dc | 892.158 | 5.145 | n/a | 0.000 | 0.000 | 1.083 | 885.794 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.074 | 5.145 | 0.006 | 0.074 | gw-r/thread-69/journal/page | none observed |
| 688ce1bed7f9946600000000000001a4 | 869.210 | 2.809 | n/a | 0.000 | 0.000 | 3.554 | 862.738 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.059 | 2.809 | 0.003 | 0.059 | gw-r/thread-66/journal/page | none observed |
| 688ce1bed7f99466000000000000019c | 837.913 | 6.232 | n/a | 0.000 | 0.000 | 1.413 | 830.163 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.073 | 6.232 | 0.007 | 0.073 | gw-r/thread-70/journal/page | none observed |
| 688ce1bed7f9946600000000000001d4 | 809.394 | 2.609 | n/a | 0.000 | 0.000 | 1.370 | 805.308 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.071 | 2.609 | 0.003 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 688ce1bed7f9946600000000000001ef | 799.593 | 7.234 | n/a | 0.000 | 0.000 | 1.269 | 790.706 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.328 | 7.234 | 0.009 | 0.328 | gw-r/thread-48/journal/page | none observed |
| 688ce1bed7f9946600000000000001f7 | 772.418 | 5.154 | n/a | 0.000 | 0.000 | 1.625 | 765.531 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.068 | 5.154 | 0.007 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 688ce1bed7f9946600000000000001c1 | 743.665 | 3.851 | n/a | 0.000 | 0.000 | 6.417 | 733.266 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.063 | 3.851 | 0.005 | 0.063 | gw-r/thread-71/journal/page | none observed |

## P3 / L16 / internal (1460 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.417 | n/a | n/a | n/a | 3.589 | n/a | 0.000 | 0.000 | 0.252 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.196 | 3.598 | 0.285 | 7.196 |
| p99 | 441.279 | n/a | n/a | n/a | 19.569 | n/a | 2.262 | 0.000 | 3.942 | 435.575 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 48.195 | 20.927 | 0.824 | 48.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f994660000000000000216 | 1005.175 | 0.195 | n/a | 0.000 | 0.000 | 0.657 | 1001.274 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 2.983 | 0.195 | 0.000 | 2.983 | gw-r/thread-44/journal/page | none observed |
| 688ce1bed7f994660000000000000211 | 1002.840 | 0.119 | n/a | 0.000 | 0.000 | 0.553 | 1000.987 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 1.117 | 0.119 | 0.000 | 1.117 | gw-r/thread-49/journal/page | none observed |
| 688ce1bed7f994660000000000000224 | 997.574 | 2.786 | n/a | 0.000 | 0.000 | 2.373 | 992.272 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.082 | 2.786 | 0.003 | 0.082 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f994660000000000000210 | 997.349 | 2.339 | n/a | 0.000 | 0.000 | 1.087 | 993.811 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.064 | 2.339 | 0.002 | 0.064 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f994660000000000000218 | 992.673 | 2.613 | n/a | 0.000 | 0.000 | 0.768 | 989.115 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.096 | 2.613 | 0.003 | 0.096 | gw-r/thread-71/journal/page | none observed |
| 688ce1bed7f9946600000000000001fd | 980.728 | 6.725 | n/a | 0.000 | 0.000 | 1.182 | 972.684 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.092 | 6.725 | 0.007 | 0.092 | gw-r/thread-66/journal/page | none observed |
| 688ce1bed7f994660000000000000214 | 925.802 | 4.593 | n/a | 0.000 | 0.000 | 0.532 | 920.561 | 0.013 | n/a | 0.036 | 0.000 | n/a | n/a | 0.067 | 4.593 | 0.005 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 688ce1bed7f994660000000000000219 | 908.638 | 3.375 | n/a | 0.000 | 0.000 | 0.883 | 904.233 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.101 | 3.375 | 0.004 | 0.101 | gw-r/thread-71/journal/page | none observed |
| 688ce1bed7f994660000000000000225 | 908.380 | 2.730 | n/a | 0.000 | 0.000 | 0.632 | 904.895 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.072 | 2.730 | 0.003 | 0.072 | gw-r/thread-71/journal/page | none observed |
| 688ce1bed7f9946600000000000001fe | 872.998 | 2.342 | n/a | 0.000 | 0.000 | 0.647 | 869.861 | 0.027 | n/a | 0.043 | 0.000 | n/a | n/a | 0.078 | 2.342 | 0.003 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 688ce1bed7f994660000000000000206 | 855.937 | 2.377 | n/a | 0.000 | 0.000 | 4.156 | 849.290 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.061 | 2.377 | 0.003 | 0.061 | gw-r/thread-42/journal/page | none observed |
| 688ce1bed7f994660000000000000201 | 790.965 | 4.776 | n/a | 0.000 | 0.000 | 2.295 | 783.767 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.081 | 4.776 | 0.006 | 0.081 | gw-r/thread-72/journal/page | none observed |
| 688ce1bed7f994660000000000000220 | 785.777 | 6.567 | n/a | 0.000 | 0.000 | 0.813 | 778.269 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.079 | 6.567 | 0.008 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 688ce1bed7f99466000000000000021c | 761.393 | 2.525 | n/a | 0.000 | 0.000 | 0.883 | 757.860 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.071 | 2.525 | 0.003 | 0.071 | gw-r/thread-69/journal/page | none observed |
| 688ce1bed7f99466000000000000020f | 441.279 | 4.675 | n/a | 0.000 | 0.000 | 0.926 | 435.575 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.064 | 4.675 | 0.011 | 0.064 | gw-r/thread-69/journal/page | none observed |
| 688ce1bed7f99466000000000000021d | 243.465 | 3.795 | n/a | 0.000 | 0.000 | 4.041 | 235.502 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.087 | 3.795 | 0.016 | 0.087 | gw-r/thread-72/journal/page | none observed |
| 688ce1bed7f99466000000000000020d | 229.205 | 2.290 | n/a | 0.000 | 0.000 | 2.143 | 224.610 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.079 | 2.290 | 0.010 | 0.079 | gw-r/thread-71/journal/page | none observed |
| 688ce1bed7f994660000000000000202 | 212.720 | 6.101 | n/a | 0.000 | 0.000 | 0.896 | 205.504 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.181 | 6.101 | 0.029 | 0.181 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f994660000000000000222 | 203.842 | 2.478 | n/a | 0.000 | 0.000 | 5.616 | 195.630 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.069 | 2.478 | 0.012 | 0.069 | gw-r/thread-69/journal/page | none observed |
| 688ce1bed7f994660000000000000207 | 192.687 | 2.278 | n/a | 0.000 | 0.000 | 0.436 | 189.851 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.080 | 2.278 | 0.012 | 0.080 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (1321 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.914 | n/a | n/a | n/a | 5.762 | n/a | 0.000 | 0.000 | 0.295 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.603 | 5.868 | 0.423 | 6.603 |
| p99 | 498.886 | n/a | n/a | n/a | 42.784 | n/a | 8.115 | 0.000 | 5.695 | 492.833 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 46.235 | 47.166 | 0.906 | 46.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f994660000000000001983 | 1004.104 | 6.555 | n/a | 0.000 | 0.000 | 1.064 | 996.364 | 0.003 | n/a | 0.054 | 0.000 | n/a | n/a | 0.064 | 6.555 | 0.007 | 0.064 | gw-r/thread-105/journal/page | none observed |
| 688ce1bed7f99466000000000000197e | 1002.458 | 0.106 | n/a | 0.000 | 0.000 | 0.627 | 1000.590 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.095 | 0.106 | 0.000 | 1.095 | gw-r/thread-96/journal/page | none observed |
| 688ce1bed7f994660000000000001988 | 976.898 | 9.248 | n/a | 0.000 | 0.000 | 0.720 | 966.841 | 0.002 | n/a | 0.014 | 0.000 | n/a | n/a | 0.074 | 9.248 | 0.009 | 0.074 | gw-r/thread-70/journal/page | none observed |
| 688ce1bed7f9946600000000000019a0 | 954.863 | 2.162 | n/a | 0.000 | 0.000 | 2.785 | 949.827 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.052 | 2.162 | 0.002 | 0.052 | gw-r/thread-131/journal/page | none observed |
| 688ce1bed7f994660000000000001991 | 944.779 | 2.781 | n/a | 0.000 | 0.000 | 0.416 | 941.384 | 0.125 | n/a | 0.016 | 0.000 | n/a | n/a | 0.057 | 2.781 | 0.003 | 0.057 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f994660000000000001980 | 916.956 | 10.187 | n/a | 0.000 | 0.000 | 0.573 | 905.923 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.243 | 10.187 | 0.011 | 0.243 | gw-r/thread-85/journal/page | none observed |
| 688ce1bed7f99466000000000000197c | 877.346 | 3.330 | n/a | 0.000 | 0.000 | 3.047 | 870.867 | 0.002 | n/a | 0.015 | 0.000 | n/a | n/a | 0.083 | 3.330 | 0.004 | 0.083 | gw-r/thread-100/journal/page | none observed |
| 688ce1bed7f9946600000000000019a4 | 704.742 | 2.867 | n/a | 0.000 | 0.000 | 15.034 | 686.755 | 0.002 | n/a | 0.024 | 0.000 | n/a | n/a | 0.061 | 2.867 | 0.004 | 0.061 | gw-r/thread-91/journal/page | none observed |
| 688ce1bed7f99466000000000000199d | 656.971 | 2.297 | n/a | 0.000 | 0.000 | 0.426 | 654.165 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.063 | 2.297 | 0.003 | 0.063 | gw-r/thread-109/journal/page | none observed |
| 688ce1bed7f994660000000000001989 | 647.068 | 4.124 | n/a | 0.000 | 0.000 | 0.738 | 641.993 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.159 | 4.124 | 0.006 | 0.159 | gw-r/thread-127/journal/page | none observed |
| 688ce1bed7f9946600000000000019a5 | 632.241 | 15.159 | n/a | 1.891 | 0.000 | 0.477 | 614.409 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.275 | 17.050 | 0.027 | 0.275 | gw-r/thread-112/journal/page | none observed |
| 688ce1bed7f994660000000000001998 | 557.422 | 2.319 | n/a | 0.000 | 0.000 | 0.375 | 554.634 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.052 | 2.319 | 0.004 | 0.052 | gw-r/thread-66/journal/page | none observed |
| 688ce1bed7f9946600000000000019b3 | 514.908 | 5.820 | n/a | 0.000 | 0.000 | 0.614 | 508.326 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.108 | 5.820 | 0.011 | 0.108 | gw-r/thread-81/journal/page | none observed |
| 688ce1bed7f9946600000000000019b8 | 498.886 | 5.278 | n/a | 0.000 | 0.000 | 0.547 | 492.833 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.192 | 5.278 | 0.011 | 0.192 | gw-r/thread-82/journal/page | none observed |
| 688ce1bed7f9946600000000000019bc | 471.676 | 4.127 | n/a | 0.000 | 0.000 | 2.539 | 464.912 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.063 | 4.127 | 0.009 | 0.063 | gw-r/thread-120/journal/page | none observed |
| 688ce1bed7f9946600000000000019b2 | 407.967 | 8.865 | n/a | 0.000 | 0.000 | 6.681 | 392.314 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.083 | 8.865 | 0.022 | 0.083 | gw-r/thread-69/journal/page | none observed |
| 688ce1bed7f994660000000000001997 | 361.654 | 1.955 | n/a | 0.000 | 0.000 | 0.725 | 358.864 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.063 | 1.955 | 0.005 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 688ce1bed7f9946600000000000019b4 | 344.970 | 4.404 | n/a | 0.000 | 0.000 | 0.644 | 339.745 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.138 | 4.404 | 0.013 | 0.138 | gw-r/thread-82/journal/page | none observed |
| 688ce1bed7f9946600000000000019af | 310.026 | 6.226 | n/a | 0.000 | 0.000 | 1.026 | 302.652 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.079 | 6.226 | 0.020 | 0.079 | gw-r/thread-130/journal/page | none observed |
| 688ce1bed7f9946600000000000019a2 | 295.719 | 24.083 | n/a | 5.943 | 0.000 | 2.831 | 262.538 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.272 | 30.026 | 0.102 | 0.272 | gw-r/thread-97/journal/page | none observed |

## P3 / L256 / internal (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 336.900 | n/a | n/a | n/a | 3.311 | n/a | 0.000 | 0.000 | 0.881 | 332.053 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.073 | 3.311 | 0.011 | 0.073 |
| p99 | 1017.455 | n/a | n/a | n/a | 23.710 | n/a | 6.212 | 0.000 | 5.205 | 1002.249 | 0.086 | n/a | 0.062 | 0.000 | n/a | n/a | 48.111 | 23.710 | 0.299 | 48.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f9946600000000000019c6 | 1017.455 | 23.710 | n/a | 0.000 | 0.000 | 4.654 | 988.882 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.144 | 23.710 | 0.023 | 0.144 | gw-r/thread-111/journal/page | none observed |
| 688ce1bed7f994660000000000001a0f | 1006.689 | 5.013 | n/a | 0.000 | 0.000 | 0.441 | 1001.155 | 0.006 | n/a | 0.015 | 0.000 | n/a | n/a | 0.058 | 5.013 | 0.005 | 0.058 | gw-r/thread-106/journal/page | none observed |
| 688ce1bed7f994660000000000001a1d | 1003.957 | 0.093 | n/a | 0.000 | 0.000 | 0.465 | 1002.249 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 1.092 | 0.093 | 0.000 | 1.092 | gw-r/thread-45/journal/page | none observed |
| 688ce1bed7f994660000000000001a02 | 1003.514 | 2.919 | n/a | 0.000 | 0.000 | 0.541 | 999.724 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.292 | 2.919 | 0.003 | 0.292 | gw-r/thread-80/journal/page | none observed |
| 688ce1bed7f994660000000000001a14 | 1002.767 | 0.102 | n/a | 0.000 | 0.000 | 0.985 | 1000.534 | 0.003 | n/a | 0.050 | 0.000 | n/a | n/a | 1.093 | 0.102 | 0.000 | 1.093 | gw-r/thread-66/journal/page | none observed |
| 688ce1bed7f994660000000000001a10 | 999.396 | 2.951 | n/a | 0.000 | 0.000 | 1.091 | 995.255 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.068 | 2.951 | 0.003 | 0.068 | gw-r/thread-118/journal/page | none observed |
| 688ce1bed7f994660000000000001a06 | 996.781 | 2.278 | n/a | 0.000 | 0.000 | 0.525 | 993.891 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.056 | 2.278 | 0.002 | 0.056 | gw-r/thread-108/journal/page | none observed |
| 688ce1bed7f994660000000000001a30 | 993.286 | 3.092 | n/a | 0.000 | 0.000 | 0.435 | 989.663 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.072 | 3.092 | 0.003 | 0.072 | gw-r/thread-77/journal/page | none observed |
| 688ce1bed7f994660000000000001a43 | 991.602 | 2.315 | n/a | 0.000 | 0.000 | 0.468 | 988.717 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.063 | 2.315 | 0.002 | 0.063 | gw-r/thread-121/journal/page | none observed |
| 688ce1bed7f994660000000000001a3e | 984.302 | 2.194 | n/a | 0.000 | 0.000 | 0.524 | 981.492 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.058 | 2.194 | 0.002 | 0.058 | gw-r/thread-81/journal/page | none observed |
| 688ce1bed7f994660000000000001a28 | 980.995 | 5.697 | n/a | 0.000 | 0.000 | 1.451 | 973.689 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.110 | 5.697 | 0.006 | 0.110 | gw-r/thread-129/journal/page | none observed |
| 688ce1bed7f994660000000000001a16 | 980.180 | 3.010 | n/a | 0.000 | 0.000 | 1.095 | 975.974 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.056 | 3.010 | 0.003 | 0.056 | gw-r/thread-77/journal/page | none observed |
| 688ce1bed7f994660000000000001a41 | 980.068 | 9.048 | n/a | 0.000 | 0.000 | 0.881 | 970.031 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.068 | 9.048 | 0.009 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 688ce1bed7f994660000000000001a42 | 963.021 | 4.899 | n/a | 0.000 | 0.000 | 1.391 | 956.633 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.073 | 4.899 | 0.005 | 0.073 | gw-r/thread-76/journal/page | none observed |
| 688ce1bed7f9946600000000000019d5 | 959.392 | 2.258 | n/a | 0.000 | 0.000 | 1.533 | 955.515 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.061 | 2.258 | 0.002 | 0.061 | gw-r/thread-92/journal/page | none observed |
| 688ce1bed7f994660000000000001a2d | 921.578 | 2.565 | n/a | 0.000 | 0.000 | 0.569 | 918.337 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.080 | 2.565 | 0.003 | 0.080 | gw-r/thread-88/journal/page | none observed |
| 688ce1bed7f9946600000000000019c1 | 906.039 | 5.040 | n/a | 0.000 | 0.000 | 0.544 | 899.596 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.831 | 5.040 | 0.006 | 0.831 | gw-r/thread-102/journal/page | none observed |
| 688ce1bed7f994660000000000001a1a | 898.026 | 2.367 | n/a | 0.000 | 0.000 | 0.494 | 895.084 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.058 | 2.367 | 0.003 | 0.058 | gw-r/thread-104/journal/page | none observed |
| 688ce1bed7f994660000000000001a11 | 875.760 | 1.856 | n/a | 0.000 | 0.000 | 3.194 | 870.625 | 0.006 | n/a | 0.014 | 0.000 | n/a | n/a | 0.064 | 1.856 | 0.002 | 0.064 | gw-r/thread-95/journal/page | none observed |
| 688ce1bed7f994660000000000001a3b | 865.965 | 3.311 | n/a | 0.000 | 0.000 | 0.517 | 862.059 | 0.002 | n/a | 0.019 | 0.000 | n/a | n/a | 0.057 | 3.311 | 0.004 | 0.057 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 376.422 | n/a | n/a | n/a | 3.320 | n/a | 0.000 | 0.000 | 0.975 | 367.615 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.075 | 3.320 | 0.012 | 0.075 |
| p99 | 1007.064 | n/a | n/a | n/a | 12.555 | n/a | 4.844 | 0.000 | 10.096 | 1001.071 | 0.232 | n/a | 0.080 | 0.000 | n/a | n/a | 50.808 | 14.986 | 0.719 | 50.808 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f994660000000000001a9c | 1007.064 | 0.090 | n/a | 0.000 | 0.000 | 4.164 | 1000.723 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 2.039 | 0.090 | 0.000 | 2.039 | gw-r/thread-78/journal/page | none observed |
| 688ce1bed7f994660000000000001aad | 1006.491 | 7.978 | n/a | 0.000 | 0.000 | 0.653 | 997.701 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.116 | 7.978 | 0.008 | 0.116 | gw-r/thread-86/journal/page | none observed |
| 688ce1bed7f994660000000000001ac9 | 1005.070 | 3.313 | n/a | 0.000 | 0.000 | 0.577 | 1001.071 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.069 | 3.313 | 0.003 | 0.069 | gw-r/thread-92/journal/page | none observed |
| 688ce1bed7f994660000000000001a7f | 1000.727 | 2.173 | n/a | 0.000 | 0.000 | 0.697 | 997.766 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.057 | 2.173 | 0.002 | 0.057 | gw-r/thread-76/journal/page | none observed |
| 688ce1bed7f994660000000000001ab3 | 1000.613 | 4.673 | n/a | 0.000 | 0.000 | 1.044 | 994.776 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.069 | 4.673 | 0.005 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 688ce1bed7f994660000000000001acf | 998.365 | 2.237 | n/a | 0.000 | 0.000 | 0.465 | 995.584 | 0.002 | n/a | 0.020 | 0.000 | n/a | n/a | 0.058 | 2.237 | 0.002 | 0.058 | gw-r/thread-109/journal/page | none observed |
| 688ce1bed7f994660000000000001aac | 997.457 | 9.296 | n/a | 0.000 | 0.000 | 0.896 | 987.092 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.137 | 9.296 | 0.009 | 0.137 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f994660000000000001aa5 | 994.805 | 2.305 | n/a | 0.000 | 0.000 | 0.416 | 991.989 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.065 | 2.305 | 0.002 | 0.065 | gw-r/thread-77/journal/page | none observed |
| 688ce1bed7f994660000000000001ae1 | 993.355 | 2.162 | n/a | 0.000 | 0.000 | 0.368 | 990.746 | 0.002 | n/a | 0.024 | 0.000 | n/a | n/a | 0.053 | 2.162 | 0.002 | 0.053 | gw-r/thread-103/journal/page | none observed |
| 688ce1bed7f994660000000000001ab4 | 991.254 | 2.496 | n/a | 0.000 | 0.000 | 2.109 | 986.546 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.060 | 2.496 | 0.003 | 0.060 | gw-r/thread-107/journal/page | none observed |
| 688ce1bed7f994660000000000001aa4 | 989.040 | 2.946 | n/a | 0.000 | 0.000 | 1.619 | 984.383 | 0.002 | n/a | 0.022 | 0.000 | n/a | n/a | 0.069 | 2.946 | 0.003 | 0.069 | gw-r/thread-114/journal/page | none observed |
| 688ce1bed7f994660000000000001ac5 | 987.145 | 2.584 | n/a | 0.000 | 0.000 | 1.686 | 982.777 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.064 | 2.584 | 0.003 | 0.064 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f994660000000000001aa1 | 949.479 | 9.984 | n/a | 0.000 | 0.000 | 1.260 | 937.693 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.510 | 9.984 | 0.011 | 0.510 | gw-r/thread-123/journal/page | none observed |
| 688ce1bed7f994660000000000001a7c | 938.463 | 3.325 | n/a | 0.000 | 0.000 | 0.397 | 934.656 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.058 | 3.325 | 0.004 | 0.058 | gw-r/thread-81/journal/page | none observed |
| 688ce1bed7f994660000000000001ab9 | 934.968 | 6.036 | n/a | 0.000 | 0.000 | 1.422 | 927.406 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.063 | 6.036 | 0.006 | 0.063 | gw-r/thread-128/journal/page | none observed |
| 688ce1bed7f994660000000000001ad4 | 930.440 | 8.068 | n/a | 0.000 | 0.000 | 0.496 | 921.764 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.061 | 8.068 | 0.009 | 0.061 | gw-r/thread-71/journal/page | none observed |
| 688ce1bed7f994660000000000001adf | 873.861 | 2.158 | n/a | 0.000 | 0.000 | 1.501 | 870.094 | 0.002 | n/a | 0.031 | 0.000 | n/a | n/a | 0.075 | 2.158 | 0.002 | 0.075 | gw-r/thread-65/journal/page | none observed |
| 688ce1bed7f994660000000000001a79 | 831.498 | 2.614 | n/a | 0.000 | 0.000 | 0.670 | 828.119 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.064 | 2.614 | 0.003 | 0.064 | gw-r/thread-124/journal/page | none observed |
| 688ce1bed7f994660000000000001a50 | 822.194 | 7.096 | n/a | 0.000 | 0.000 | 0.482 | 814.485 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.102 | 7.096 | 0.009 | 0.102 | gw-r/thread-89/journal/page | none observed |
| 688ce1bed7f994660000000000001aab | 804.943 | 2.947 | n/a | 0.000 | 0.000 | 1.173 | 800.730 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.064 | 2.947 | 0.004 | 0.064 | gw-r/thread-130/journal/page | none observed |

## P3 / tail / internal (368 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 343.789 | n/a | n/a | n/a | 3.494 | n/a | 0.000 | 0.000 | 0.503 | 334.393 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.108 | 3.555 | 0.012 | 0.108 |
| p99 | 1004.642 | n/a | n/a | n/a | 15.035 | n/a | 1.719 | 0.000 | 3.362 | 1000.971 | 0.100 | n/a | 0.063 | 0.000 | n/a | n/a | 47.072 | 16.315 | 0.717 | 47.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 688ce1bed7f994660000000000001d06 | 1017.948 | 15.395 | n/a | 1.373 | 0.000 | 0.530 | 1000.433 | 0.016 | n/a | 0.035 | 0.000 | n/a | n/a | 0.166 | 16.768 | 0.016 | 0.166 | gw-r/thread-77/journal/page | none observed |
| 688ce1bed7f994660000000000001b34 | 1006.775 | 6.080 | n/a | 0.763 | 0.000 | 1.386 | 998.342 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.167 | 6.843 | 0.007 | 0.167 | gw-r/thread-132/journal/page | none observed |
| 688ce1bed7f994660000000000001c4c | 1006.581 | 4.592 | n/a | 0.000 | 0.000 | 1.104 | 1000.739 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.123 | 4.592 | 0.005 | 0.123 | gw-r/thread-121/journal/page | none observed |
| 688ce1bed7f994660000000000001b11 | 1004.642 | 7.627 | n/a | 0.000 | 0.000 | 0.481 | 996.404 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.095 | 7.627 | 0.008 | 0.095 | gw-r/thread-118/journal/page | none observed |
| 688ce1bed7f994660000000000001ba8 | 1004.320 | 5.312 | n/a | 0.000 | 0.000 | 0.688 | 998.143 | 0.010 | n/a | 0.031 | 0.000 | n/a | n/a | 0.136 | 5.312 | 0.005 | 0.136 | gw-r/thread-132/journal/page | none observed |
| 688ce1bed7f994660000000000001ca3 | 1004.244 | 3.154 | n/a | 0.000 | 0.000 | 0.740 | 1000.242 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.078 | 3.154 | 0.003 | 0.078 | gw-r/thread-89/journal/page | none observed |
| 688ce1bed7f994660000000000001c41 | 1004.105 | 4.767 | n/a | 0.000 | 0.000 | 0.462 | 998.746 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.104 | 4.767 | 0.005 | 0.104 | gw-r/thread-108/journal/page | none observed |
| 688ce1bed7f994660000000000001b90 | 1004.052 | 0.108 | n/a | 0.000 | 0.000 | 1.373 | 1001.404 | 0.012 | n/a | 0.051 | 0.000 | n/a | n/a | 1.104 | 0.108 | 0.000 | 1.104 | gw-r/thread-101/journal/page | none observed |
| 688ce1bed7f994660000000000001d0b | 1003.323 | 10.338 | n/a | 5.462 | 0.000 | 1.257 | 986.101 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.135 | 15.800 | 0.016 | 0.135 | gw-r/thread-47/journal/page | none observed |
| 688ce1bed7f994660000000000001b6a | 1003.237 | 0.131 | n/a | 0.000 | 0.000 | 0.342 | 1001.629 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 1.101 | 0.131 | 0.000 | 1.101 | gw-r/thread-96/journal/page | none observed |
| 688ce1bed7f994660000000000001c88 | 1003.212 | 2.267 | n/a | 0.000 | 0.000 | 1.224 | 999.606 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.067 | 2.267 | 0.002 | 0.067 | gw-r/thread-117/journal/page | none observed |
| 688ce1bed7f994660000000000001afb | 1002.937 | 0.216 | n/a | 0.000 | 0.000 | 0.589 | 1000.971 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 1.102 | 0.216 | 0.000 | 1.102 | gw-r/thread-84/journal/page | none observed |
| 688ce1bed7f994660000000000001bda | 1002.933 | 3.082 | n/a | 0.000 | 0.000 | 0.622 | 999.122 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.072 | 3.082 | 0.003 | 0.072 | gw-r/thread-97/journal/page | none observed |
| 688ce1bed7f994660000000000001c3d | 1002.905 | 4.723 | n/a | 0.000 | 0.000 | 0.667 | 997.362 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.110 | 4.723 | 0.005 | 0.110 | gw-r/thread-98/journal/page | none observed |
| 688ce1bed7f994660000000000001d10 | 1002.887 | 0.134 | n/a | 0.000 | 0.000 | 0.540 | 1001.027 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 1.095 | 0.134 | 0.000 | 1.095 | gw-r/thread-101/journal/page | none observed |
| 688ce1bed7f994660000000000001b07 | 1002.781 | 2.455 | n/a | 0.000 | 0.000 | 0.299 | 999.925 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.057 | 2.455 | 0.002 | 0.057 | gw-r/thread-128/journal/page | none observed |
| 688ce1bed7f994660000000000001b12 | 1002.695 | 0.161 | n/a | 0.000 | 0.000 | 0.401 | 1000.927 | 0.012 | n/a | 0.090 | 0.000 | n/a | n/a | 1.104 | 0.161 | 0.000 | 1.104 | gw-r/thread-103/journal/page | none observed |
| 688ce1bed7f994660000000000001bb8 | 1002.665 | 0.139 | n/a | 0.000 | 0.000 | 1.035 | 1000.362 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 1.101 | 0.139 | 0.000 | 1.101 | gw-r/thread-115/journal/page | none observed |
| 688ce1bed7f994660000000000001ae6 | 1002.478 | 0.189 | n/a | 0.000 | 0.000 | 0.572 | 1000.563 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 1.118 | 0.189 | 0.000 | 1.118 | gw-r/thread-100/journal/page | none observed |
| 688ce1bed7f994660000000000001b48 | 1002.444 | 2.562 | n/a | 0.000 | 0.000 | 0.399 | 999.375 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.060 | 2.562 | 0.003 | 0.060 | gw-r/thread-106/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.608 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 201.184 | 0.016 | n/a | 0.117 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 217.431 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 13.799 | 204.699 | 9.013 | n/a | 2.622 | 0.000 | n/a | n/a | 54.027 | 0.000 | 0.000 | 54.027 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98d840ab91d0eacc0000000000000030 | 217.431 | 0.000 | n/a | 0.000 | 0.000 | 13.799 | 203.380 | 0.014 | n/a | 0.120 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-72/journal/page | none observed |
| 98d840ab91d0eacc0000000000000057 | 210.406 | 0.000 | n/a | 0.000 | 0.000 | 9.000 | 201.177 | 0.014 | n/a | 0.117 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-68/journal/page | none observed |
| 98d840ab91d0eacc0000000000000036 | 208.889 | 0.000 | n/a | 0.000 | 0.000 | 7.372 | 201.238 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-45/journal/page | none observed |
| 98d840ab91d0eacc0000000000000033 | 208.130 | 0.000 | n/a | 0.000 | 0.000 | 6.536 | 201.246 | 0.056 | n/a | 0.174 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 98d840ab91d0eacc000000000000001a | 206.853 | 0.000 | n/a | 0.000 | 0.000 | 2.733 | 201.374 | 0.036 | n/a | 2.622 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 98d840ab91d0eacc0000000000000008 | 206.583 | 0.000 | n/a | 0.000 | 0.000 | 4.459 | 201.763 | 0.013 | n/a | 0.146 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-42/journal/page | none observed |
| 98d840ab91d0eacc000000000000000b | 206.240 | 0.000 | n/a | 0.000 | 0.000 | 4.462 | 201.411 | 0.017 | n/a | 0.184 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-45/journal/page | none observed |
| 98d840ab91d0eacc0000000000000023 | 206.168 | 0.000 | n/a | 0.000 | 0.000 | 2.481 | 203.310 | 0.039 | n/a | 0.191 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 98d840ab91d0eacc000000000000003e | 205.933 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 204.699 | 0.015 | n/a | 0.136 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-45/journal/page | none observed |
| 98d840ab91d0eacc000000000000001f | 205.870 | 0.000 | n/a | 0.000 | 0.000 | 1.117 | 204.507 | 0.019 | n/a | 0.120 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 98d840ab91d0eacc0000000000000027 | 205.143 | 0.000 | n/a | 0.000 | 0.000 | 3.259 | 201.475 | 0.017 | n/a | 0.203 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-65/journal/page | none observed |
| 98d840ab91d0eacc000000000000004c | 205.098 | 0.000 | n/a | 0.000 | 0.000 | 3.475 | 201.301 | 0.014 | n/a | 0.144 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-48/journal/page | none observed |
| 98d840ab91d0eacc0000000000000044 | 204.941 | 0.000 | n/a | 0.000 | 0.000 | 3.742 | 200.948 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-70/journal/page | none observed |
| 98d840ab91d0eacc0000000000000035 | 204.846 | 0.000 | n/a | 0.000 | 0.000 | 1.289 | 203.335 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-67/journal/page | none observed |
| 98d840ab91d0eacc000000000000003c | 204.836 | 0.000 | n/a | 0.000 | 0.000 | 1.293 | 203.271 | 0.017 | n/a | 0.139 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-46/journal/page | none observed |
| 98d840ab91d0eacc0000000000000009 | 204.414 | 0.000 | n/a | 0.000 | 0.000 | 1.639 | 202.307 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.358 | 0.000 | 0.000 | 0.358 | gw-r/thread-45/journal/page | none observed |
| 98d840ab91d0eacc000000000000004e | 204.397 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 202.815 | 0.023 | n/a | 0.160 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-65/journal/page | none observed |
| 98d840ab91d0eacc000000000000003f | 204.113 | 0.000 | n/a | 0.000 | 0.000 | 1.686 | 202.193 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-71/journal/page | none observed |
| 98d840ab91d0eacc000000000000003b | 204.042 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 202.873 | 0.015 | n/a | 0.167 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-65/journal/page | none observed |
| 98d840ab91d0eacc000000000000002f | 203.709 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 202.306 | 0.019 | n/a | 0.124 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-71/journal/page | none observed |

## P3 / L1 / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.808 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.828 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 205.955 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.879 | 204.957 | 7.691 | n/a | 0.400 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98d840ab91d0eacc0000000000000074 | 208.867 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 207.759 | 0.044 | n/a | 0.127 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-69/journal/page | none observed |
| 98d840ab91d0eacc0000000000000075 | 208.673 | 0.000 | n/a | 0.000 | 0.000 | 1.051 | 207.375 | 0.011 | n/a | 0.129 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-72/journal/page | none observed |
| 98d840ab91d0eacc000000000000006b | 205.955 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 204.957 | 0.059 | n/a | 0.175 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 98d840ab91d0eacc00000000000000ba | 205.899 | 0.000 | n/a | 0.000 | 0.000 | 4.644 | 201.044 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-42/journal/page | none observed |
| 98d840ab91d0eacc000000000000006d | 205.724 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 204.709 | 0.010 | n/a | 0.119 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-65/journal/page | none observed |
| 98d840ab91d0eacc00000000000000e5 | 205.669 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 204.717 | 0.014 | n/a | 0.114 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-48/journal/page | none observed |
| 98d840ab91d0eacc0000000000000085 | 205.503 | 0.000 | n/a | 0.000 | 0.000 | 3.890 | 201.333 | 0.009 | n/a | 0.134 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-70/journal/page | none observed |
| 98d840ab91d0eacc000000000000005c | 205.491 | 0.000 | n/a | 0.000 | 0.000 | 0.878 | 204.338 | 0.020 | n/a | 0.164 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 98d840ab91d0eacc00000000000000d0 | 205.385 | 0.000 | n/a | 0.000 | 0.000 | 0.383 | 204.823 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 98d840ab91d0eacc0000000000000080 | 205.382 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 204.225 | 0.033 | n/a | 0.113 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-72/journal/page | none observed |
| 98d840ab91d0eacc00000000000000ab | 205.369 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 204.302 | 0.013 | n/a | 0.119 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 98d840ab91d0eacc00000000000000bb | 205.353 | 0.000 | n/a | 0.000 | 0.000 | 0.885 | 204.262 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-72/journal/page | none observed |
| 98d840ab91d0eacc000000000000007e | 205.176 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 204.214 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-68/journal/page | none observed |
| 98d840ab91d0eacc00000000000000bc | 205.160 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 204.172 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-64/journal/page | none observed |
| 98d840ab91d0eacc0000000000000103 | 205.110 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 201.302 | 2.487 | n/a | 0.139 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-64/journal/page | none observed |
| 98d840ab91d0eacc0000000000000136 | 205.033 | 0.000 | n/a | 0.000 | 0.000 | 0.528 | 204.311 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 98d840ab91d0eacc00000000000000b9 | 204.885 | 0.000 | n/a | 0.000 | 0.000 | 3.879 | 200.789 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-65/journal/page | none observed |
| 98d840ab91d0eacc00000000000000ed | 204.885 | 0.000 | n/a | 0.000 | 0.000 | 3.807 | 200.884 | 0.009 | n/a | 0.094 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-67/journal/page | none observed |
| 98d840ab91d0eacc0000000000000113 | 204.837 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 204.065 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-66/journal/page | none observed |
| 98d840ab91d0eacc0000000000000060 | 204.651 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 203.688 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.704 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 200.774 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 208.029 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.183 | 204.739 | 3.854 | n/a | 0.116 | 0.000 | n/a | n/a | 0.357 | 0.000 | 0.000 | 0.357 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98d840ab91d0eacc000000000000015e | 211.007 | 0.000 | n/a | 0.000 | 0.000 | 10.055 | 200.762 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 98d840ab91d0eacc0000000000000193 | 208.087 | 0.000 | n/a | 0.000 | 0.000 | 3.175 | 204.739 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 98d840ab91d0eacc0000000000000232 | 208.029 | 0.000 | n/a | 0.000 | 0.000 | 3.900 | 203.878 | 0.026 | n/a | 0.053 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-69/journal/page | none observed |
| 98d840ab91d0eacc00000000000001fa | 206.714 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 205.441 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 98d840ab91d0eacc00000000000001f0 | 206.024 | 0.000 | n/a | 0.000 | 0.000 | 1.037 | 204.763 | 0.029 | n/a | 0.095 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 98d840ab91d0eacc00000000000001bb | 205.484 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 204.425 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-69/journal/page | none observed |
| 98d840ab91d0eacc000000000000020c | 205.396 | 0.000 | n/a | 0.000 | 0.000 | 4.471 | 200.746 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 98d840ab91d0eacc0000000000000160 | 205.362 | 0.000 | n/a | 0.000 | 0.000 | 0.570 | 204.562 | 0.019 | n/a | 0.068 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-72/journal/page | none observed |
| 98d840ab91d0eacc00000000000001d1 | 205.357 | 0.000 | n/a | 0.000 | 0.000 | 1.372 | 203.725 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-70/journal/page | none observed |
| 98d840ab91d0eacc00000000000001c6 | 205.079 | 0.000 | n/a | 0.000 | 0.000 | 3.794 | 201.121 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-70/journal/page | none observed |
| 98d840ab91d0eacc00000000000001cd | 205.050 | 0.000 | n/a | 0.000 | 0.000 | 1.033 | 203.836 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-71/journal/page | none observed |
| 98d840ab91d0eacc0000000000000180 | 204.997 | 0.000 | n/a | 0.000 | 0.000 | 4.179 | 200.668 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-69/journal/page | none observed |
| 98d840ab91d0eacc000000000000024e | 204.876 | 0.000 | n/a | 0.000 | 0.000 | 3.821 | 200.885 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| 98d840ab91d0eacc000000000000023b | 204.612 | 0.000 | n/a | 0.000 | 0.000 | 1.138 | 203.201 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-71/journal/page | none observed |
| 98d840ab91d0eacc00000000000001ff | 204.550 | 0.000 | n/a | 0.000 | 0.000 | 3.621 | 200.724 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-42/journal/page | none observed |
| 98d840ab91d0eacc0000000000000200 | 204.523 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 203.668 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-49/journal/page | none observed |
| 98d840ab91d0eacc0000000000000240 | 204.494 | 0.000 | n/a | 0.000 | 0.000 | 3.252 | 200.997 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-66/journal/page | none observed |
| 98d840ab91d0eacc0000000000000189 | 204.390 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 203.417 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-71/journal/page | none observed |
| 98d840ab91d0eacc00000000000001ba | 204.369 | 0.000 | n/a | 0.000 | 0.000 | 3.043 | 201.090 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-65/journal/page | none observed |
| 98d840ab91d0eacc000000000000015f | 204.089 | 0.000 | n/a | 0.000 | 0.000 | 2.900 | 201.000 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 76.801 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 76.378 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 205.934 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.167 | 204.402 | 6.706 | n/a | 0.102 | 0.000 | n/a | n/a | 50.937 | 0.000 | 0.000 | 50.937 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98d840ab91d0eacc0000000000000268 | 207.266 | 0.000 | n/a | 0.000 | 0.000 | 2.638 | 204.402 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-66/journal/page | none observed |
| 98d840ab91d0eacc000000000000027b | 205.934 | 0.000 | n/a | 0.000 | 0.000 | 3.949 | 201.835 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-65/journal/page | none observed |
| 98d840ab91d0eacc000000000000027a | 205.852 | 0.000 | n/a | 0.000 | 0.000 | 0.968 | 204.695 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 98d840ab91d0eacc0000000000000281 | 205.367 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 204.303 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-64/journal/page | none observed |
| 98d840ab91d0eacc0000000000000278 | 203.995 | 0.000 | n/a | 0.000 | 0.000 | 2.414 | 201.360 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-67/journal/page | none observed |
| 98d840ab91d0eacc0000000000000261 | 203.575 | 0.000 | n/a | 0.000 | 0.000 | 2.657 | 200.767 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-69/journal/page | none observed |
| 98d840ab91d0eacc0000000000000275 | 203.549 | 0.000 | n/a | 0.000 | 0.000 | 1.469 | 201.791 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-72/journal/page | none observed |
| 98d840ab91d0eacc000000000000025c | 203.509 | 0.000 | n/a | 0.000 | 0.000 | 2.315 | 201.008 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 98d840ab91d0eacc000000000000028d | 203.135 | 0.000 | n/a | 0.000 | 0.000 | 2.107 | 200.835 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-44/journal/page | none observed |
| 98d840ab91d0eacc000000000000026d | 203.063 | 0.000 | n/a | 0.000 | 0.000 | 1.648 | 201.169 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-67/journal/page | none observed |
| 98d840ab91d0eacc0000000000000293 | 202.660 | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 201.302 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-70/journal/page | none observed |
| 98d840ab91d0eacc0000000000000253 | 202.618 | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 201.410 | 0.015 | n/a | 0.056 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-67/journal/page | none observed |
| 98d840ab91d0eacc0000000000000254 | 202.524 | 0.000 | n/a | 0.000 | 0.000 | 1.357 | 200.984 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-65/journal/page | none observed |
| 98d840ab91d0eacc0000000000000274 | 202.406 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.326 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-71/journal/page | none observed |
| 98d840ab91d0eacc0000000000000280 | 202.387 | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 201.314 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 98d840ab91d0eacc0000000000000296 | 202.354 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 201.575 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| 98d840ab91d0eacc0000000000000262 | 202.317 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 201.052 | 0.009 | n/a | 0.165 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-64/journal/page | none observed |
| 98d840ab91d0eacc000000000000026e | 202.311 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 201.528 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 98d840ab91d0eacc0000000000000285 | 202.229 | 0.000 | n/a | 0.000 | 0.000 | 1.379 | 200.635 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-47/journal/page | none observed |
| 98d840ab91d0eacc000000000000026f | 202.212 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 201.223 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-70/journal/page | none observed |

## P3 / L64 / read (122 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 128.640 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.628 | 124.905 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 206.728 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.042 | 201.883 | 1.785 | n/a | 0.071 | 0.000 | n/a | n/a | 51.738 | 0.000 | 0.000 | 51.738 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98d840ab91d0eacc0000000000000d52 | 207.257 | 0.000 | n/a | 0.000 | 0.000 | 6.636 | 200.490 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-89/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d55 | 206.728 | 0.000 | n/a | 0.000 | 0.000 | 6.118 | 200.468 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-132/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d5a | 205.936 | 0.000 | n/a | 0.000 | 0.000 | 4.794 | 200.982 | 0.015 | n/a | 0.064 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-86/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d41 | 204.015 | 0.000 | n/a | 0.000 | 0.000 | 3.054 | 200.805 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-94/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d38 | 203.808 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 203.145 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-102/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d39 | 203.544 | 0.000 | n/a | 0.000 | 0.000 | 2.647 | 200.755 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-80/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d36 | 203.137 | 0.000 | n/a | 0.000 | 0.000 | 2.190 | 200.711 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-99/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d46 | 202.588 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 201.883 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-64/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d79 | 202.468 | 0.000 | n/a | 0.000 | 0.000 | 1.620 | 200.663 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-98/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d3d | 202.427 | 0.000 | n/a | 0.000 | 0.000 | 0.499 | 201.767 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-123/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d3c | 202.236 | 0.000 | n/a | 0.000 | 0.000 | 0.474 | 201.619 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-107/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d4e | 202.093 | 0.000 | n/a | 0.000 | 0.000 | 0.756 | 201.131 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-130/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d88 | 202.040 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 201.136 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-126/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d71 | 201.958 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 200.809 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-98/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d8a | 201.829 | 0.000 | n/a | 0.000 | 0.000 | 1.111 | 200.530 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-49/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d53 | 201.778 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 200.880 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-71/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d37 | 201.749 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 201.051 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-76/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d64 | 201.734 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 200.845 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-115/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d67 | 201.725 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 200.568 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-102/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d5b | 201.705 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 200.673 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-92/journal/page | none observed |

## P3 / L256 / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.261 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 200.562 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 204.879 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.970 | 203.895 | 2.538 | n/a | 0.067 | 0.000 | n/a | n/a | 1.247 | 0.000 | 0.000 | 1.247 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98d840ab91d0eacc0000000000000dd5 | 207.130 | 0.000 | n/a | 0.000 | 0.000 | 6.564 | 200.431 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-72/journal/page | none observed |
| 98d840ab91d0eacc0000000000000da9 | 205.185 | 0.000 | n/a | 0.000 | 0.000 | 2.474 | 202.549 | 0.003 | n/a | 0.060 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e77 | 204.879 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 204.109 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-78/journal/page | none observed |
| 98d840ab91d0eacc0000000000000db7 | 204.846 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 203.895 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-106/journal/page | none observed |
| 98d840ab91d0eacc0000000000000db9 | 204.763 | 0.000 | n/a | 0.000 | 0.000 | 4.004 | 200.564 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-82/journal/page | none observed |
| 98d840ab91d0eacc0000000000000dbb | 204.599 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 203.913 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-129/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d9b | 204.268 | 0.000 | n/a | 0.000 | 0.000 | 0.513 | 203.573 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-77/journal/page | none observed |
| 98d840ab91d0eacc0000000000000da7 | 203.886 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 202.794 | 0.015 | n/a | 0.140 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-90/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e51 | 203.487 | 0.000 | n/a | 0.000 | 0.000 | 2.721 | 200.597 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-79/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e24 | 203.124 | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 202.390 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-88/journal/page | none observed |
| 98d840ab91d0eacc0000000000000db1 | 203.065 | 0.000 | n/a | 0.000 | 0.000 | 2.253 | 200.663 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-81/journal/page | none observed |
| 98d840ab91d0eacc0000000000000df9 | 202.769 | 0.000 | n/a | 0.000 | 0.000 | 0.376 | 200.921 | 0.016 | n/a | 0.049 | 0.000 | n/a | n/a | 1.406 | 0.000 | 0.000 | 1.406 | gw-r/thread-96/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e54 | 202.760 | 0.000 | n/a | 0.000 | 0.000 | 2.046 | 200.539 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-100/journal/page | none observed |
| 98d840ab91d0eacc0000000000000d94 | 202.737 | 0.000 | n/a | 0.000 | 0.000 | 0.513 | 202.053 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-119/journal/page | none observed |
| 98d840ab91d0eacc0000000000000de4 | 202.508 | 0.000 | n/a | 0.000 | 0.000 | 0.470 | 201.905 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-83/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e76 | 202.507 | 0.000 | n/a | 0.000 | 0.000 | 1.700 | 200.640 | 0.003 | n/a | 0.038 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-92/journal/page | none observed |
| 98d840ab91d0eacc0000000000000db8 | 202.403 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 201.597 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-65/journal/page | none observed |
| 98d840ab91d0eacc0000000000000dff | 202.383 | 0.000 | n/a | 0.000 | 0.000 | 1.641 | 200.615 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-93/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e4b | 202.357 | 0.000 | n/a | 0.000 | 0.000 | 1.483 | 200.727 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-118/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e66 | 202.297 | 0.000 | n/a | 0.000 | 0.000 | 0.966 | 201.128 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-89/journal/page | none observed |

## P3 / L1024 / read (229 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.316 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 200.585 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 208.936 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.317 | 204.309 | 2.268 | n/a | 0.077 | 0.000 | n/a | n/a | 0.594 | 0.000 | 0.000 | 0.594 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98d840ab91d0eacc0000000000000ea6 | 219.459 | 0.000 | n/a | 0.000 | 0.000 | 5.745 | 213.548 | 0.021 | n/a | 0.053 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-116/journal/page | none observed |
| 98d840ab91d0eacc0000000000000ebe | 219.296 | 0.000 | n/a | 0.000 | 0.000 | 18.611 | 200.559 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-126/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e99 | 208.936 | 0.000 | n/a | 0.000 | 0.000 | 5.304 | 203.482 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-110/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f8f | 208.434 | 0.000 | n/a | 0.000 | 0.000 | 7.682 | 200.608 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-99/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e93 | 207.933 | 0.000 | n/a | 0.000 | 0.000 | 7.317 | 200.449 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-87/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f17 | 205.473 | 0.000 | n/a | 0.000 | 0.000 | 3.937 | 201.351 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-127/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f20 | 205.272 | 0.000 | n/a | 0.000 | 0.000 | 0.578 | 204.556 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-70/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f4c | 205.167 | 0.000 | n/a | 0.000 | 0.000 | 4.616 | 200.415 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-113/journal/page | none observed |
| 98d840ab91d0eacc0000000000000e95 | 205.061 | 0.000 | n/a | 0.000 | 0.000 | 2.084 | 202.823 | 0.031 | n/a | 0.033 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-70/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f56 | 204.909 | 0.000 | n/a | 0.000 | 0.000 | 0.467 | 204.309 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f5c | 204.735 | 0.000 | n/a | 0.000 | 0.000 | 0.440 | 204.112 | 0.021 | n/a | 0.033 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-129/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f44 | 204.707 | 0.000 | n/a | 0.000 | 0.000 | 3.810 | 200.739 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-72/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f8e | 204.548 | 0.000 | n/a | 0.000 | 0.000 | 2.942 | 201.465 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-119/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f3e | 204.424 | 0.000 | n/a | 0.000 | 0.000 | 1.688 | 202.543 | 0.011 | n/a | 0.035 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-100/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f8a | 204.068 | 2.425 | n/a | 0.000 | 0.000 | 0.635 | 200.811 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.137 | 2.425 | 0.012 | 0.137 | gw-r/thread-106/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f28 | 204.038 | 0.000 | n/a | 0.000 | 0.000 | 3.217 | 200.663 | 0.017 | n/a | 0.045 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-120/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f04 | 204.004 | 0.000 | n/a | 0.000 | 0.000 | 3.228 | 200.589 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-66/journal/page | none observed |
| 98d840ab91d0eacc0000000000000edb | 203.949 | 0.000 | n/a | 0.000 | 0.000 | 0.461 | 203.366 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-121/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f82 | 203.713 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 202.917 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-110/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f1e | 203.712 | 0.000 | n/a | 0.000 | 0.000 | 1.938 | 200.655 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 1.078 | 0.000 | 0.000 | 1.078 | gw-r/thread-87/journal/page | none observed |

## P3 / tail / read (847 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.134 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.461 | 200.526 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 203.294 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.133 | 201.573 | 1.236 | n/a | 0.110 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98d840ab91d0eacc000000000000107f | 208.418 | 0.000 | n/a | 0.000 | 0.000 | 0.371 | 207.894 | 0.024 | n/a | 0.038 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-79/journal/page | none observed |
| 98d840ab91d0eacc0000000000001205 | 205.686 | 0.000 | n/a | 0.000 | 0.000 | 4.221 | 201.207 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 98d840ab91d0eacc0000000000000f98 | 204.499 | 0.000 | n/a | 0.000 | 0.000 | 3.658 | 200.644 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-121/journal/page | none observed |
| 98d840ab91d0eacc0000000000001042 | 204.369 | 0.000 | n/a | 0.000 | 0.000 | 0.422 | 203.768 | 0.018 | n/a | 0.051 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 98d840ab91d0eacc00000000000012e4 | 203.962 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 202.664 | 0.004 | n/a | 0.111 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-96/journal/page | none observed |
| 98d840ab91d0eacc0000000000000ffd | 203.695 | 0.000 | n/a | 0.000 | 0.000 | 0.435 | 203.115 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-131/journal/page | none observed |
| 98d840ab91d0eacc0000000000001291 | 203.672 | 0.000 | n/a | 0.000 | 0.000 | 2.839 | 200.686 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-80/journal/page | none observed |
| 98d840ab91d0eacc0000000000000ffe | 203.382 | 0.000 | n/a | 0.000 | 0.000 | 2.469 | 200.751 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-114/journal/page | none observed |
| 98d840ab91d0eacc000000000000103d | 203.294 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 202.460 | 0.014 | n/a | 0.062 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-47/journal/page | none observed |
| 98d840ab91d0eacc000000000000111e | 203.080 | 0.000 | n/a | 0.000 | 0.000 | 2.087 | 200.773 | 0.004 | n/a | 0.058 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-86/journal/page | none observed |
| 98d840ab91d0eacc0000000000000fd7 | 203.054 | 0.000 | n/a | 0.000 | 0.000 | 2.539 | 200.417 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-71/journal/page | none observed |
| 98d840ab91d0eacc0000000000001212 | 202.973 | 0.000 | n/a | 0.000 | 0.000 | 1.899 | 200.915 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-129/journal/page | none observed |
| 98d840ab91d0eacc000000000000109d | 202.875 | 0.000 | n/a | 0.000 | 0.000 | 0.305 | 202.403 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-81/journal/page | none observed |
| 98d840ab91d0eacc0000000000001285 | 202.874 | 0.000 | n/a | 0.000 | 0.000 | 1.844 | 200.870 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-70/journal/page | none observed |
| 98d840ab91d0eacc0000000000001318 | 202.872 | 0.000 | n/a | 0.000 | 0.000 | 0.440 | 202.258 | 0.014 | n/a | 0.054 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-109/journal/page | none observed |
| 98d840ab91d0eacc00000000000010ea | 202.853 | 0.000 | n/a | 0.000 | 0.000 | 1.871 | 200.826 | 0.004 | n/a | 0.054 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-87/journal/page | none observed |
| 98d840ab91d0eacc0000000000001139 | 202.763 | 0.000 | n/a | 0.000 | 0.000 | 2.133 | 200.469 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-80/journal/page | none observed |
| 98d840ab91d0eacc000000000000132f | 202.712 | 0.000 | n/a | 0.000 | 0.000 | 1.938 | 200.542 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-83/journal/page | none observed |
| 98d840ab91d0eacc0000000000001026 | 202.659 | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 201.573 | 0.036 | n/a | 0.097 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-100/journal/page | none observed |
| 98d840ab91d0eacc000000000000101f | 202.636 | 0.000 | n/a | 0.000 | 0.000 | 1.669 | 200.752 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3707 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/5.489 ms; post-ACK p50/p99: 0.444/2.241 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.738 | 11.136 | 10.793 | reported |
| All-primary p99 ms | 62.244 | 61.483 | 56.181 | <=50 |
| L256 5-10 p50Ms | 10.815 | 9.855 | 9.855 | <=10 |
| L256 5-10 p99Ms | 25.798 | 25.272 | 25.267 | <=50 |
| L256 11-25 p50Ms | 12.543 | 11.711 | 11.711 | <=10 |
| L256 11-25 p99Ms | 16.717 | 16.043 | 16.042 | <=50 |
| L256 26-50 p50Ms | 13.119 | 11.839 | 11.391 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 17.018 | 15.899 | 15.125 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 10.239 | 9.791 | 9.535 | <=10 |
| Burst 11-25 p50 ms | 12.415 | 11.711 | 11.391 | <=10 |
| L256 writer p99 ratio | 0.724 | 0.716 | 0.716 | <=1.25 |
| L256 writer maximum ms | 25.798 | 25.272 | 25.267 | <=2000 |
| L1024 writer p99 ratio | 3.542 | 3.526 | 3.526 | <=2 |
| L1024 writer maximum ms | 68.479 | 66.526 | 66.525 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 47.380/47.380 | 43.705 | 19.906 | 79.142 | 0.663/0.111 |
| 5-10 | 250-1000 | 134 | 11.781/50.780 | 11.046 | 6.372 | 15.650 | 0.069/0.022 |
| 5-10 | 50-100 | 76 | 8.851/68.952 | 8.555 | 4.731 | 11.740 | 0.051/0.019 |
| 11-25 | 250-1000 | 81 | 12.789/140.480 | 11.974 | 6.482 | 16.586 | 0.072/0.023 |
| 26-50 | 100-250 | 13 | 14.486/31.676 | 13.656 | 7.716 | 20.024 | 0.098/0.022 |
| 5-10 | 100-250 | 69 | 10.013/30.459 | 9.264 | 5.354 | 13.336 | 0.066/0.020 |
| 26-50 | 250-1000 | 21 | 17.326/62.180 | 15.881 | 7.177 | 19.498 | 0.089/0.027 |
| 5-10 | overlap | 906 | 11.521/51.367 | 11.198 | 6.737 | 15.388 | 0.040/0.018 |
| 26-50 | 0-50 | 189 | 15.145/58.690 | 13.850 | 7.470 | 19.055 | 0.068/0.021 |
| 11-25 | 100-250 | 29 | 12.352/52.267 | 11.585 | 6.449 | 15.998 | 0.077/0.021 |
| 11-25 | 0-50 | 514 | 10.865/33.092 | 10.272 | 5.401 | 13.520 | 0.053/0.019 |
| 5-10 | 0-50 | 1047 | 8.628/30.924 | 8.248 | 4.495 | 11.170 | 0.046/0.019 |
| 26-50 | overlap | 160 | 17.250/77.135 | 16.147 | 9.080 | 22.487 | 0.059/0.020 |
| 11-25 | 50-100 | 40 | 11.896/28.827 | 10.912 | 5.505 | 13.831 | 0.065/0.019 |
| 26-50 | 50-100 | 15 | 16.543/21.425 | 15.063 | 7.530 | 18.704 | 0.071/0.021 |
| 11-25 | overlap | 412 | 13.500/69.537 | 12.820 | 7.501 | 17.394 | 0.045/0.020 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1845 | 8 | 571.400 |
| burst | 1862 | 47 | 4643.144 |

## Writer heap, GC and scheduler stalls

Source d709fd769d271992b6a87841489c90665585e919; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 498.656 / 588.301 |
| GC events / total duration / maximum ms | 934 / 2693.712 / 132.551 |
| GC events >50 ms / total duration ms | 2 / 205.270 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":920,"4":7,"8":7} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 7 / 624.285 |
| Union stall episodes / duration ms | 1 / 129.993 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 62.244 / 55 / 5214.544 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

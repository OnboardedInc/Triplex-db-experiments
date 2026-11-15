# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (140.521 ms, trace `e928ffe8711c845a0000000000000062`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (75.010 ms, trace `e928ffe8711c845a000000000000007c`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (56.665 ms, trace `e928ffe8711c845a000000000000006c`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (68.719 ms, trace `e928ffe8711c845a000000000000004b`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (29.932 ms, trace `e928ffe8711c845a0000000000000066`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p9-smoke-b`; source `afee00b0110100d344595e184670aff7f12ba05f`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 187/187 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 187/187. Raw trace bytes: 5322199.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 3274 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 4351.087 | 510.581 | 34.712 | 151 |
| L1 | 1 | 4915.243 | 313.816 | 12.595 | 140 |
| L4 | 4 | 4965.934 | 530.543 | 28.645 | 160 |
| L16 | 16 | 4942.387 | 536.523 | 40.139 | 124 |
| tail | 0 | 69465.064 | 1257.366 | 60.506 | 2495 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| e928ffe8711c845a0000000000000062 | driver.queue.scheduler-dispatch | 0.051 | none | 0 / 32 |
| e928ffe8711c845a0000000000000062 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace e928ffe8711c845a0000000000000062 waited: []

| e928ffe8711c845a000000000000007c | driver.queue.scheduler-late | 0.144 | none | 0 / 32 |
| e928ffe8711c845a000000000000007c | driver.queue.scheduler-dispatch | 0.056 | none | 0 / 32 |

Observed active steps while trace e928ffe8711c845a000000000000007c waited: []

| e928ffe8711c845a000000000000006c | driver.queue.scheduler-late | 0.894 | none | 0 / 32 |
| e928ffe8711c845a000000000000006c | driver.queue.scheduler-dispatch | 0.095 | none | 0 / 32 |

Observed active steps while trace e928ffe8711c845a000000000000006c waited: []

| e928ffe8711c845a000000000000004b | driver.queue.scheduler-dispatch | 0.070 | none | 0 / 32 |
| e928ffe8711c845a000000000000004b | driver.queue.scheduler-late | 0.006 | none | 0 / 32 |

Observed active steps while trace e928ffe8711c845a000000000000004b waited: []

| e928ffe8711c845a0000000000000066 | driver.queue.scheduler-dispatch | 0.059 | none | 0 / 32 |
| e928ffe8711c845a0000000000000066 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace e928ffe8711c845a0000000000000066 waited: []

## P2 / warmup / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.080 | 0.364 | 0.000 | 0.666 | 5.636 | 0.401 | 0.000 | 0.107 | 1.666 | 2.673 | 0.022 | 0.000 | 0.579 | 10.439 | 0.780 | n/a | 0.028 | 5.919 | 0.212 | 0.028 |
| p99 | 86.204 | 2.004 | 0.000 | 2.187 | 20.359 | n/a | 0.000 | 1.186 | 13.793 | 7.268 | 0.255 | 0.000 | 6.565 | 68.719 | 2.323 | n/a | 0.165 | 20.830 | 0.314 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a000000000000004b | 86.204 | 9.812 | 0.184 | 0.000 | 0.076 | 1.715 | 4.402 | 0.187 | 0.000 | 0.539 | 68.719 | 0.542 | n/a | 0.028 | 10.072 | 0.117 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| e928ffe8711c845a000000000000003b | 66.275 | 20.359 | 0.401 | 0.000 | 0.069 | 13.793 | 7.268 | 0.255 | 0.000 | 3.277 | 18.924 | 1.906 | n/a | 0.023 | 20.830 | 0.314 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| e928ffe8711c845a0000000000000037 | 41.584 | 7.239 | n/a | 0.000 | 1.186 | 0.820 | 6.839 | 0.022 | 0.000 | 6.565 | 16.424 | 2.323 | n/a | 0.165 | 8.425 | 0.203 | 0.165 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000003f | 30.124 | 7.782 | 0.219 | 0.000 | 0.113 | 2.234 | 2.673 | 0.031 | 0.000 | 5.806 | 10.439 | 0.780 | n/a | 0.047 | 8.115 | 0.269 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| e928ffe8711c845a0000000000000043 | 26.526 | 7.426 | 0.172 | 0.000 | 0.107 | 2.589 | 3.774 | 0.039 | 0.000 | 0.579 | 11.221 | 0.580 | n/a | 0.039 | 7.705 | 0.290 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| e928ffe8711c845a0000000000000045 | 26.080 | 5.636 | 0.229 | 0.000 | 0.054 | 2.561 | 5.854 | 0.034 | 0.000 | 0.653 | 9.811 | 1.214 | n/a | 0.035 | 5.919 | 0.227 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| e928ffe8711c845a000000000000003c | 20.169 | 2.757 | n/a | 0.000 | 1.063 | 1.225 | 2.525 | 0.022 | 0.000 | 0.282 | 10.732 | 1.431 | n/a | 0.130 | 3.820 | 0.189 | 0.130 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| e928ffe8711c845a0000000000000048 | 16.300 | 3.369 | n/a | 0.000 | 0.083 | 1.013 | 2.436 | 0.021 | 0.000 | 0.671 | 7.909 | 0.771 | n/a | 0.026 | 3.452 | 0.212 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000046 | 15.889 | 1.622 | n/a | 0.000 | 0.929 | 1.666 | 2.139 | 0.020 | 0.000 | 0.480 | 7.997 | 1.008 | n/a | 0.027 | 2.551 | 0.161 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000041 | 13.871 | 3.247 | n/a | 0.000 | 0.436 | 0.614 | 1.361 | 0.021 | 0.000 | 0.455 | 7.127 | 0.592 | n/a | 0.019 | 3.683 | 0.266 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.702 | n/a | n/a | n/a | 10.581 | 0.106 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 11.690 | 0.999 | 0.010 |
| p99 | 146.837 | n/a | n/a | n/a | 121.770 | 11.862 | 12.917 | 0.000 | 14.737 | 14.969 | 4.186 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.026 | 137.060 | 0.999 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a0000000000000038 | 146.837 | 121.770 | 3.930 | 11.361 | 0.000 | 4.468 | 5.254 | 0.006 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.026 | 137.060 | 0.933 | 0.026 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.readback 0.392ms; driver.publication.persist-deferred 0.070ms; driver.reader-basis.broadcast 0.040ms; driver.reader-basis.broadcast 0.037ms |
| e928ffe8711c845a000000000000007a | 98.802 | 66.520 | 7.288 | 12.917 | 0.000 | 2.784 | 9.258 | 0.007 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.010 | 86.724 | 0.878 | 0.010 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.readback 0.131ms; driver.reader-basis.broadcast 0.065ms; driver.publication.persist-deferred 0.013ms |
| e928ffe8711c845a00000000000000a7 | 50.445 | 19.118 | 0.446 | 1.146 | 0.000 | 14.737 | 14.969 | 0.006 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.009 | 20.710 | 0.411 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.074ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.015ms |
| e928ffe8711c845a000000000000007f | 39.961 | 18.366 | 0.410 | 2.234 | 0.000 | 4.921 | 13.984 | 0.007 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.022 | 21.011 | 0.526 | 0.022 | gw-r/thread-49/gateway.admitted-work | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.035ms |
| e928ffe8711c845a00000000000000aa | 35.283 | 14.524 | 0.321 | 0.602 | 0.000 | 10.323 | 5.301 | 4.186 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.010 | 15.447 | 0.438 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.015ms |
| e928ffe8711c845a000000000000006d | 12.255 | 12.153 | 0.086 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 12.239 | 0.999 | 0.016 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.134ms; driver.publication.persist-deferred 0.028ms |
| e928ffe8711c845a000000000000008f | 12.120 | 12.039 | 0.071 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 12.110 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.063ms; driver.reader-basis.broadcast 0.040ms; driver.publication.persist-deferred 0.013ms |
| e928ffe8711c845a00000000000000c4 | 12.115 | 0.244 | 11.862 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 12.105 | 0.999 | 0.010 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.075ms; driver.publication.persist-deferred 0.019ms |
| e928ffe8711c845a0000000000000157 | 11.907 | 10.938 | 0.069 | 0.890 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 11.897 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.131ms; driver.publication.persist-deferred 0.018ms |
| e928ffe8711c845a0000000000000064 | 11.848 | 11.760 | 0.079 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 11.838 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.017ms |
| e928ffe8711c845a000000000000003e | 11.702 | 8.924 | 2.766 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 11.690 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.129ms; driver.publication.persist-deferred 0.036ms |
| e928ffe8711c845a000000000000009b | 11.560 | 0.142 | 11.407 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 11.549 | 0.999 | 0.010 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.017ms |
| e928ffe8711c845a000000000000010f | 10.994 | 10.879 | 0.106 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 10.985 | 0.999 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.124ms; driver.publication.persist-deferred 0.014ms |
| e928ffe8711c845a0000000000000147 | 10.679 | 10.581 | 0.084 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 10.665 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.026ms |
| e928ffe8711c845a00000000000000b7 | 10.387 | 10.271 | 0.108 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 10.379 | 0.999 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.014ms |
| e928ffe8711c845a00000000000000a3 | 10.366 | 9.355 | 0.075 | 0.927 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 10.357 | 0.999 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.013ms |
| e928ffe8711c845a00000000000001a4 | 10.113 | 0.313 | 9.789 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 10.102 | 0.999 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.131ms; driver.publication.persist-deferred 0.023ms |
| e928ffe8711c845a0000000000000087 | 9.452 | 9.346 | 0.087 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 9.433 | 0.998 | 0.019 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.031ms |
| e928ffe8711c845a0000000000000060 | 8.955 | 8.196 | 0.098 | 0.646 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.941 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.152ms; driver.publication.persist-deferred 0.038ms |
| e928ffe8711c845a00000000000000cf | 8.922 | 8.803 | 0.104 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.907 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.124ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.028ms |

## P2 / warmup / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.889 | 1.000 | 0.000 | 0.865 | 2.757 | n/a | 0.000 | 0.929 | 1.225 | 2.139 | 0.021 | 0.000 | 0.455 | 7.997 | 1.008 | n/a | 0.027 | 3.683 | 0.189 | 0.027 |
| p99 | 20.169 | 1.004 | 0.000 | 1.138 | 3.247 | n/a | 0.000 | 1.063 | 1.666 | 2.525 | 0.022 | 0.000 | 0.480 | 10.732 | 1.431 | n/a | 0.130 | 3.820 | 0.266 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a000000000000003c | 20.169 | 2.757 | n/a | 0.000 | 1.063 | 1.225 | 2.525 | 0.022 | 0.000 | 0.282 | 10.732 | 1.431 | n/a | 0.130 | 3.820 | 0.189 | 0.130 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| e928ffe8711c845a0000000000000046 | 15.889 | 1.622 | n/a | 0.000 | 0.929 | 1.666 | 2.139 | 0.020 | 0.000 | 0.480 | 7.997 | 1.008 | n/a | 0.027 | 2.551 | 0.161 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000041 | 13.871 | 3.247 | n/a | 0.000 | 0.436 | 0.614 | 1.361 | 0.021 | 0.000 | 0.455 | 7.127 | 0.592 | n/a | 0.019 | 3.683 | 0.266 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.924 | 0.000 | 0.000 | 0.381 | 5.188 | 0.214 | 0.000 | 0.184 | 1.875 | 5.768 | 0.050 | 0.000 | 0.221 | 11.312 | 0.611 | n/a | 0.024 | 5.500 | 0.181 | 0.024 |
| p99 | 42.782 | 3.001 | 0.000 | 2.683 | 8.431 | n/a | 0.449 | 0.908 | 4.840 | 9.613 | 0.290 | 0.000 | 1.231 | 28.127 | 4.164 | n/a | 0.043 | 8.811 | 0.315 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a0000000000000058 | 42.782 | 5.188 | 0.214 | 0.000 | 0.098 | 2.479 | 5.877 | 0.028 | 0.000 | 0.129 | 28.127 | 0.611 | n/a | 0.031 | 5.500 | 0.129 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| e928ffe8711c845a0000000000000053 | 34.049 | 6.495 | 0.188 | 0.000 | 0.051 | 4.840 | 9.613 | 0.077 | 0.000 | 1.231 | 10.904 | 0.632 | n/a | 0.017 | 6.734 | 0.198 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| e928ffe8711c845a000000000000005e | 33.823 | 5.916 | 0.161 | 0.449 | 0.055 | 2.201 | 4.340 | 0.290 | 0.000 | 0.201 | 19.612 | 0.582 | n/a | 0.017 | 6.581 | 0.195 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| e928ffe8711c845a000000000000004e | 27.998 | 8.431 | n/a | 0.000 | 0.380 | 1.864 | 5.904 | 0.031 | 0.000 | 0.148 | 10.215 | 0.980 | n/a | 0.043 | 8.811 | 0.315 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000004d | 25.924 | 3.740 | 0.149 | 0.000 | 0.184 | 1.142 | 8.568 | 0.062 | 0.000 | 0.202 | 11.312 | 0.546 | n/a | 0.020 | 4.073 | 0.157 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| e928ffe8711c845a0000000000000056 | 25.381 | 5.238 | 0.198 | 0.000 | 0.083 | 1.875 | 5.092 | 0.031 | 0.000 | 0.347 | 9.530 | 2.962 | n/a | 0.027 | 5.518 | 0.217 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| e928ffe8711c845a0000000000000059 | 23.044 | 2.393 | n/a | 0.000 | 0.406 | 1.198 | 2.083 | 0.050 | 0.000 | 0.672 | 12.055 | 4.164 | n/a | 0.024 | 2.799 | 0.121 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000050 | 21.165 | 2.328 | n/a | 0.000 | 0.480 | 1.958 | 5.768 | 0.038 | 0.000 | 1.078 | 8.912 | 0.582 | n/a | 0.021 | 2.808 | 0.133 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000005b | 19.661 | 2.657 | n/a | 0.000 | 0.908 | 1.357 | 2.004 | 0.062 | 0.000 | 0.221 | 11.960 | 0.467 | n/a | 0.025 | 3.565 | 0.181 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.661 | 0.000 | 0.000 | 0.512 | 2.393 | n/a | 0.000 | 0.406 | 1.198 | 2.004 | 0.050 | 0.000 | 0.221 | 11.960 | 0.467 | n/a | 0.024 | 2.799 | 0.121 | 0.024 |
| p99 | 23.044 | 1.004 | 0.000 | 0.711 | 2.657 | n/a | 0.000 | 0.908 | 1.357 | 2.083 | 0.062 | 0.000 | 0.672 | 12.055 | 4.164 | n/a | 0.025 | 3.565 | 0.181 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a0000000000000059 | 23.044 | 2.393 | n/a | 0.000 | 0.406 | 1.198 | 2.083 | 0.050 | 0.000 | 0.672 | 12.055 | 4.164 | n/a | 0.024 | 2.799 | 0.121 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000005b | 19.661 | 2.657 | n/a | 0.000 | 0.908 | 1.357 | 2.004 | 0.062 | 0.000 | 0.221 | 11.960 | 0.467 | n/a | 0.025 | 3.565 | 0.181 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.121 | 0.385 | 0.000 | 0.490 | 4.640 | 0.425 | 0.000 | 0.064 | 2.129 | 7.038 | 0.052 | 0.000 | 0.331 | 15.457 | 8.804 | n/a | 0.022 | 5.130 | 0.096 | 0.022 |
| p99 | 279.242 | 2.007 | 0.006 | 2.033 | 11.809 | n/a | 0.475 | 0.990 | 9.141 | 46.585 | 0.287 | 0.000 | 3.708 | 140.521 | 76.396 | n/a | 0.036 | 12.677 | 0.268 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a0000000000000062 | 279.242 | 5.569 | 0.240 | 0.475 | 0.052 | 9.141 | 46.585 | 0.091 | 0.000 | 0.152 | 140.521 | 76.396 | n/a | 0.019 | 6.337 | 0.023 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms; driver.reader-basis.broadcast 0.033ms; driver.reader-basis.broadcast 0.032ms |
| e928ffe8711c845a000000000000006c | 93.879 | 3.583 | n/a | 0.000 | 0.990 | 1.027 | 7.038 | 0.021 | 0.000 | 0.103 | 56.665 | 24.416 | n/a | 0.036 | 4.573 | 0.049 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| e928ffe8711c845a0000000000000066 | 82.759 | 4.640 | 0.150 | 0.280 | 0.060 | 6.616 | 28.636 | 0.073 | 0.000 | 0.752 | 29.932 | 11.591 | n/a | 0.027 | 5.130 | 0.062 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| e928ffe8711c845a000000000000006f | 65.493 | 8.518 | 0.143 | 0.000 | 0.055 | 2.486 | 18.708 | 0.071 | 0.000 | 3.708 | 27.350 | 4.430 | n/a | 0.021 | 8.717 | 0.133 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.worker-message 0.507ms; driver.reader-basis.broadcast 0.107ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.031ms |
| e928ffe8711c845a0000000000000073 | 58.310 | 11.809 | 0.425 | 0.379 | 0.064 | 1.715 | 17.105 | 0.052 | 0.000 | 1.419 | 15.099 | 10.220 | n/a | 0.022 | 12.677 | 0.217 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| e928ffe8711c845a0000000000000068 | 57.121 | 2.904 | n/a | 0.000 | 0.497 | 0.945 | 5.473 | 0.036 | 0.000 | 0.331 | 31.613 | 15.298 | n/a | 0.024 | 3.401 | 0.060 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000006b | 46.104 | 6.819 | 0.165 | 0.453 | 0.055 | 2.863 | 11.325 | 0.287 | 0.000 | 0.172 | 15.144 | 8.804 | n/a | 0.018 | 7.491 | 0.162 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| e928ffe8711c845a000000000000005f | 30.945 | 7.479 | n/a | 0.000 | 0.817 | 3.085 | 2.738 | 0.056 | 0.000 | 0.291 | 15.457 | 0.990 | n/a | 0.033 | 8.296 | 0.268 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000063 | 24.955 | 1.911 | n/a | 0.000 | 0.480 | 1.988 | 2.303 | 0.020 | 0.000 | 0.510 | 10.539 | 7.175 | n/a | 0.030 | 2.392 | 0.096 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| e928ffe8711c845a0000000000000070 | 21.322 | 2.185 | n/a | 0.000 | 0.608 | 2.129 | 1.276 | 0.019 | 0.000 | 1.016 | 13.408 | 0.675 | n/a | 0.007 | 2.793 | 0.131 | 0.007 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.107ms |

## P2 / L4 / commit / 5-10 facts (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.955 | 0.000 | 0.000 | 0.474 | 2.185 | n/a | 0.000 | 0.497 | 1.027 | 2.303 | 0.020 | 0.000 | 0.331 | 13.408 | 7.175 | n/a | 0.024 | 2.793 | 0.060 | 0.024 |
| p99 | 93.879 | 1.006 | 0.006 | 0.892 | 3.583 | n/a | 0.000 | 0.990 | 2.129 | 7.038 | 0.036 | 0.000 | 1.016 | 56.665 | 24.416 | n/a | 0.036 | 4.573 | 0.131 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a000000000000006c | 93.879 | 3.583 | n/a | 0.000 | 0.990 | 1.027 | 7.038 | 0.021 | 0.000 | 0.103 | 56.665 | 24.416 | n/a | 0.036 | 4.573 | 0.049 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| e928ffe8711c845a0000000000000068 | 57.121 | 2.904 | n/a | 0.000 | 0.497 | 0.945 | 5.473 | 0.036 | 0.000 | 0.331 | 31.613 | 15.298 | n/a | 0.024 | 3.401 | 0.060 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000063 | 24.955 | 1.911 | n/a | 0.000 | 0.480 | 1.988 | 2.303 | 0.020 | 0.000 | 0.510 | 10.539 | 7.175 | n/a | 0.030 | 2.392 | 0.096 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| e928ffe8711c845a0000000000000070 | 21.322 | 2.185 | n/a | 0.000 | 0.608 | 2.129 | 1.276 | 0.019 | 0.000 | 1.016 | 13.408 | 0.675 | n/a | 0.007 | 2.793 | 0.131 | 0.007 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.107ms |

## P2 / L16 / commit (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.870 | 0.000 | 0.000 | 0.347 | 5.164 | 0.218 | 0.000 | 0.100 | 2.422 | 9.944 | 0.053 | 0.000 | 1.513 | 15.333 | 8.177 | n/a | 0.029 | 5.705 | 0.108 | 0.029 |
| p99 | 102.992 | 0.996 | 0.000 | 1.202 | 8.869 | n/a | 0.389 | 0.264 | 5.315 | 13.975 | 0.102 | 0.000 | 5.788 | 75.010 | 11.607 | n/a | 0.042 | 9.503 | 0.267 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a000000000000007c | 102.992 | 3.297 | n/a | 0.000 | 0.200 | 1.107 | 9.944 | 0.074 | 0.000 | 1.720 | 75.010 | 11.607 | n/a | 0.033 | 3.497 | 0.034 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| e928ffe8711c845a0000000000000075 | 52.716 | 6.033 | 0.218 | 0.000 | 0.060 | 5.315 | 13.975 | 0.053 | 0.000 | 3.883 | 15.333 | 7.819 | n/a | 0.027 | 6.311 | 0.120 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| e928ffe8711c845a0000000000000077 | 52.611 | 5.164 | 0.161 | 0.313 | 0.067 | 5.037 | 11.618 | 0.082 | 0.000 | 1.513 | 19.564 | 9.070 | n/a | 0.021 | 5.705 | 0.108 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| e928ffe8711c845a000000000000007e | 50.351 | 4.095 | 0.175 | 0.000 | 0.100 | 1.401 | 11.151 | 0.038 | 0.000 | 5.788 | 18.528 | 9.038 | n/a | 0.036 | 4.371 | 0.087 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.reader-basis.broadcast 0.065ms; driver.publication.persist-deferred 0.035ms |
| e928ffe8711c845a0000000000000083 | 41.870 | 8.869 | 0.189 | 0.389 | 0.056 | 2.422 | 10.893 | 0.031 | 0.000 | 1.783 | 9.041 | 8.177 | n/a | 0.021 | 9.503 | 0.227 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| e928ffe8711c845a0000000000000079 | 36.838 | 2.758 | n/a | 0.000 | 0.264 | 0.726 | 2.190 | 0.023 | 0.000 | 0.906 | 18.587 | 11.348 | n/a | 0.038 | 3.021 | 0.082 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| e928ffe8711c845a0000000000000085 | 30.392 | 6.380 | 0.223 | 0.000 | 0.108 | 3.406 | 2.690 | 0.102 | 0.000 | 0.331 | 14.390 | 2.719 | n/a | 0.042 | 6.712 | 0.221 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms |
| e928ffe8711c845a0000000000000081 | 27.333 | 7.121 | n/a | 0.000 | 0.175 | 4.353 | 9.209 | 0.081 | 0.000 | 1.075 | 4.453 | 0.836 | n/a | 0.029 | 7.295 | 0.267 | 0.029 | node-14/thread-0/driver.execute | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.333 | 0.000 | 0.000 | 0.223 | 3.297 | n/a | 0.000 | 0.175 | 1.107 | 9.209 | 0.074 | 0.000 | 1.075 | 4.453 | 0.836 | n/a | 0.029 | 3.497 | 0.034 | 0.029 |
| p99 | 102.992 | 0.996 | 0.000 | 1.202 | 7.121 | n/a | 0.000 | 0.200 | 4.353 | 9.944 | 0.081 | 0.000 | 1.720 | 75.010 | 11.607 | n/a | 0.033 | 7.295 | 0.267 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a000000000000007c | 102.992 | 3.297 | n/a | 0.000 | 0.200 | 1.107 | 9.944 | 0.074 | 0.000 | 1.720 | 75.010 | 11.607 | n/a | 0.033 | 3.497 | 0.034 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| e928ffe8711c845a0000000000000081 | 27.333 | 7.121 | n/a | 0.000 | 0.175 | 4.353 | 9.209 | 0.081 | 0.000 | 1.075 | 4.453 | 0.836 | n/a | 0.029 | 7.295 | 0.267 | 0.029 | node-14/thread-0/driver.execute | none observed |

## P2 / tail / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.333 | 0.172 | 0.000 | 0.534 | 3.621 | n/a | 0.000 | 0.230 | 1.313 | 2.977 | 0.031 | 0.000 | 0.226 | 7.737 | 0.938 | n/a | 0.029 | 4.178 | 0.217 | 0.029 |
| p99 | 45.409 | 2.338 | 0.000 | 2.281 | 13.713 | n/a | 0.934 | 2.127 | 4.969 | 14.926 | 0.417 | 0.000 | 3.584 | 34.639 | 11.557 | n/a | 0.074 | 15.253 | 0.416 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a0000000000000108 | 58.860 | 14.696 | 0.283 | 0.857 | 0.212 | 1.461 | 4.019 | 0.036 | 0.000 | 0.899 | 35.777 | 0.559 | n/a | 0.062 | 16.047 | 0.273 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.083ms |
| e928ffe8711c845a000000000000013a | 45.409 | 13.713 | n/a | 0.623 | 0.917 | 3.309 | 9.158 | 0.157 | 0.000 | 3.282 | 11.069 | 3.142 | n/a | 0.039 | 15.253 | 0.336 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000011f | 44.061 | 3.681 | n/a | 0.672 | 0.445 | 2.121 | 4.454 | 0.073 | 0.000 | 1.572 | 29.585 | 1.448 | n/a | 0.010 | 4.797 | 0.109 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.016ms |
| e928ffe8711c845a00000000000000f2 | 42.798 | 2.947 | n/a | 0.000 | 0.278 | 1.030 | 2.917 | 0.023 | 0.000 | 0.356 | 34.639 | 0.570 | n/a | 0.038 | 3.225 | 0.075 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000008b | 40.952 | 5.108 | 0.170 | 0.408 | 0.071 | 1.420 | 14.070 | 0.032 | 0.000 | 0.133 | 13.175 | 6.338 | n/a | 0.027 | 5.758 | 0.141 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| e928ffe8711c845a00000000000000e4 | 40.855 | 5.109 | n/a | 0.000 | 0.322 | 0.913 | 2.018 | 0.024 | 0.000 | 0.678 | 28.963 | 2.796 | n/a | 0.034 | 5.431 | 0.133 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000008e | 40.848 | 2.996 | n/a | 0.000 | 0.327 | 1.660 | 2.950 | 0.029 | 0.000 | 0.774 | 25.648 | 6.419 | n/a | 0.044 | 3.323 | 0.081 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a00000000000000ca | 40.197 | 2.066 | n/a | 0.000 | 0.759 | 0.876 | 1.417 | 0.021 | 0.000 | 0.521 | 7.992 | 26.518 | n/a | 0.028 | 2.825 | 0.070 | 0.028 | tx/thread-87/transactor.triplex-function | none observed |
| e928ffe8711c845a0000000000000124 | 39.755 | 4.355 | 0.353 | 0.000 | 0.084 | 1.919 | 11.390 | 0.038 | 0.000 | 3.553 | 11.254 | 6.769 | n/a | 0.040 | 4.792 | 0.121 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000095 | 38.947 | 3.867 | 0.359 | 0.000 | 0.043 | 1.737 | 14.653 | 0.050 | 0.000 | 0.141 | 10.947 | 7.132 | n/a | 0.020 | 4.269 | 0.110 | 0.020 | gw-w/thread-50/gateway.admitted-work | driver.reader-basis.broadcast 0.109ms |
| e928ffe8711c845a0000000000000128 | 36.139 | 6.030 | 0.198 | 0.409 | 0.052 | 1.259 | 7.936 | 0.032 | 0.000 | 0.450 | 12.918 | 6.829 | n/a | 0.026 | 6.688 | 0.185 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000091 | 36.008 | 3.935 | 0.225 | 0.283 | 0.101 | 1.043 | 10.339 | 0.030 | 0.000 | 0.088 | 13.768 | 6.160 | n/a | 0.036 | 4.543 | 0.126 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| e928ffe8711c845a00000000000000ad | 35.461 | 5.404 | 0.145 | 0.331 | 0.079 | 1.786 | 11.842 | 0.050 | 0.000 | 0.160 | 12.826 | 2.813 | n/a | 0.024 | 5.959 | 0.168 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.014ms |
| e928ffe8711c845a0000000000000089 | 35.448 | 3.621 | 0.158 | 0.000 | 0.045 | 2.113 | 9.237 | 0.054 | 0.000 | 0.424 | 8.217 | 11.557 | n/a | 0.022 | 3.825 | 0.108 | 0.022 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.060ms |
| e928ffe8711c845a0000000000000099 | 35.265 | 3.923 | 0.217 | 0.304 | 0.082 | 1.273 | 9.486 | 0.093 | 0.000 | 1.665 | 11.375 | 6.814 | n/a | 0.033 | 4.527 | 0.128 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms |
| e928ffe8711c845a00000000000000b5 | 35.247 | 3.487 | 0.162 | 0.298 | 0.068 | 2.682 | 14.388 | 0.037 | 0.000 | 0.133 | 6.840 | 7.129 | n/a | 0.022 | 4.015 | 0.114 | 0.022 | gw-w/thread-50/gateway.admitted-work | driver.reader-basis.broadcast 0.136ms |
| e928ffe8711c845a00000000000000bf | 34.515 | 4.083 | 0.275 | 0.000 | 0.135 | 2.686 | 12.674 | 0.055 | 0.000 | 0.943 | 9.513 | 4.108 | n/a | 0.042 | 4.493 | 0.130 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.084ms |
| e928ffe8711c845a0000000000000096 | 34.313 | 2.523 | n/a | 0.000 | 0.668 | 1.354 | 3.359 | 0.071 | 0.000 | 1.201 | 20.442 | 4.667 | n/a | 0.029 | 3.191 | 0.093 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a00000000000000bd | 33.797 | 3.612 | 0.153 | 0.370 | 0.036 | 1.316 | 19.220 | 0.030 | 0.000 | 0.571 | 3.856 | 4.617 | n/a | 0.016 | 4.170 | 0.123 | 0.016 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.055ms |
| e928ffe8711c845a00000000000000f0 | 32.416 | 3.889 | 0.227 | 0.242 | 0.050 | 1.542 | 10.884 | 0.033 | 0.000 | 0.503 | 10.169 | 4.850 | n/a | 0.027 | 4.407 | 0.136 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |

## P2 / tail / commit / 5-10 facts (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.663 | 0.000 | 0.000 | 0.478 | 2.216 | n/a | 0.000 | 0.759 | 1.030 | 1.541 | 0.023 | 0.000 | 0.356 | 6.367 | 0.581 | n/a | 0.029 | 3.010 | 0.212 | 0.029 |
| p99 | 42.798 | 2.004 | 0.000 | 0.918 | 6.384 | n/a | 0.000 | 9.287 | 4.477 | 5.349 | 0.090 | 0.000 | 3.357 | 34.639 | 26.518 | n/a | 0.077 | 11.368 | 0.484 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e928ffe8711c845a00000000000000f2 | 42.798 | 2.947 | n/a | 0.000 | 0.278 | 1.030 | 2.917 | 0.023 | 0.000 | 0.356 | 34.639 | 0.570 | n/a | 0.038 | 3.225 | 0.075 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a00000000000000ca | 40.197 | 2.066 | n/a | 0.000 | 0.759 | 0.876 | 1.417 | 0.021 | 0.000 | 0.521 | 7.992 | 26.518 | n/a | 0.028 | 2.825 | 0.070 | 0.028 | tx/thread-87/transactor.triplex-function | none observed |
| e928ffe8711c845a00000000000000ba | 28.373 | 4.108 | n/a | 0.000 | 0.519 | 1.369 | 5.349 | 0.028 | 0.000 | 0.173 | 15.738 | 1.013 | n/a | 0.077 | 4.627 | 0.163 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000017f | 25.212 | 1.685 | n/a | 0.000 | 0.605 | 0.864 | 1.984 | 0.051 | 0.000 | 1.475 | 17.675 | 0.835 | n/a | 0.037 | 2.291 | 0.091 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000092 | 24.284 | 2.989 | n/a | 0.000 | 0.397 | 1.458 | 1.579 | 0.023 | 0.000 | 1.067 | 11.946 | 4.778 | n/a | 0.048 | 3.385 | 0.139 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a00000000000000c3 | 23.478 | 2.081 | n/a | 0.000 | 9.287 | 1.118 | 1.499 | 0.025 | 0.000 | 0.121 | 8.779 | 0.550 | n/a | 0.017 | 11.368 | 0.484 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.075ms; driver.publication.persist-deferred 0.019ms |
| e928ffe8711c845a00000000000000ce | 20.950 | 2.361 | n/a | 0.000 | 0.702 | 1.383 | 2.284 | 0.052 | 0.000 | 0.875 | 10.262 | 3.003 | n/a | 0.027 | 3.064 | 0.146 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000011e | 20.800 | 2.070 | n/a | 0.000 | 0.347 | 1.772 | 2.822 | 0.090 | 0.000 | 0.879 | 11.576 | 1.210 | n/a | 0.034 | 2.417 | 0.116 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a0000000000000173 | 20.708 | 2.044 | n/a | 0.000 | 0.626 | 1.030 | 2.175 | 0.047 | 0.000 | 3.290 | 10.166 | 1.307 | n/a | 0.024 | 2.670 | 0.129 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.096ms |
| e928ffe8711c845a0000000000000134 | 20.523 | 2.106 | n/a | 0.000 | 0.348 | 0.888 | 4.669 | 0.021 | 0.000 | 2.959 | 8.978 | 0.530 | n/a | 0.025 | 2.454 | 0.120 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a00000000000000de | 19.214 | 1.813 | n/a | 0.000 | 0.860 | 1.384 | 3.426 | 0.024 | 0.000 | 0.451 | 6.957 | 4.266 | n/a | 0.032 | 2.674 | 0.139 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.343ms |
| e928ffe8711c845a000000000000016a | 18.934 | 6.384 | n/a | 0.000 | 0.802 | 3.604 | 3.656 | 0.041 | 0.000 | 0.167 | 3.893 | 0.356 | n/a | 0.031 | 7.186 | 0.380 | 0.031 | node-14/thread-0/driver.execute | none observed |
| e928ffe8711c845a0000000000000192 | 18.800 | 2.285 | n/a | 0.000 | 1.053 | 0.610 | 4.217 | 0.018 | 0.000 | 3.357 | 6.032 | 1.208 | n/a | 0.022 | 3.338 | 0.178 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.017ms |
| e928ffe8711c845a0000000000000118 | 18.188 | 3.363 | n/a | 0.000 | 1.008 | 1.343 | 1.956 | 0.023 | 0.000 | 2.354 | 7.045 | 1.053 | n/a | 0.043 | 4.371 | 0.240 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.103ms |
| e928ffe8711c845a00000000000000ae | 17.572 | 2.210 | n/a | 0.000 | 0.800 | 0.596 | 1.145 | 0.018 | 0.000 | 0.075 | 11.695 | 1.017 | n/a | 0.016 | 3.010 | 0.171 | 0.016 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| e928ffe8711c845a00000000000000fc | 17.292 | 4.532 | n/a | 0.000 | 0.957 | 1.768 | 2.064 | 0.031 | 0.000 | 0.199 | 6.995 | 0.673 | n/a | 0.074 | 5.489 | 0.317 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000015c | 17.038 | 2.340 | n/a | 0.000 | 0.558 | 0.940 | 1.829 | 0.028 | 0.000 | 0.142 | 9.921 | 1.248 | n/a | 0.032 | 2.898 | 0.170 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.132ms |
| e928ffe8711c845a0000000000000132 | 16.870 | 1.968 | n/a | 0.000 | 0.992 | 4.477 | 1.379 | 0.022 | 0.000 | 0.107 | 7.394 | 0.497 | n/a | 0.035 | 2.959 | 0.175 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000009c | 16.852 | 3.009 | n/a | 0.000 | 0.567 | 2.815 | 1.320 | 0.018 | 0.000 | 0.387 | 8.122 | 0.581 | n/a | 0.032 | 3.576 | 0.212 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e928ffe8711c845a000000000000011a | 16.252 | 2.907 | n/a | 0.000 | 0.462 | 1.205 | 5.339 | 0.051 | 0.000 | 0.854 | 4.862 | 0.546 | n/a | 0.026 | 3.369 | 0.207 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (675 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.923 | 0.001 |
| p99 | 290.503 | n/a | n/a | n/a | 20.544 | n/a | 0.000 | 289.973 | 68.550 | 0.948 | 0.007 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.005 | 290.502 | 1.000 | 0.005 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f4b75ee9011a8cf000000000000228e | 290.777 | 0.455 | n/a | 0.000 | 290.319 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.774 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb0000000000001fea | 290.646 | 2.355 | n/a | 0.000 | 288.288 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.643 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf0000000000002293 | 290.528 | 0.015 | n/a | 0.000 | 290.513 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 290.528 | 1.000 | 0.000 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf0000000000002292 | 290.520 | 0.016 | n/a | 0.000 | 290.503 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.519 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf0000000000002291 | 290.510 | 0.016 | n/a | 0.000 | 290.494 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.510 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf000000000000228f | 290.506 | 0.044 | n/a | 0.000 | 290.461 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.505 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf0000000000002290 | 290.503 | 0.019 | n/a | 0.000 | 290.483 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.502 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000001f08 | 290.182 | 0.340 | n/a | 0.000 | 289.838 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 290.178 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000001f09 | 290.021 | 0.046 | n/a | 0.000 | 289.973 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.019 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000001f11 | 289.798 | 0.041 | n/a | 0.000 | 289.755 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.796 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000001f12 | 289.771 | 0.038 | n/a | 0.000 | 289.732 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 289.770 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000001f13 | 289.746 | 0.021 | n/a | 0.000 | 289.723 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 289.744 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb0000000000001feb | 288.707 | 0.086 | n/a | 0.000 | 288.616 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 288.703 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb0000000000002014 | 287.598 | 0.037 | n/a | 0.000 | 287.559 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.596 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb0000000000002013 | 287.597 | 0.056 | n/a | 0.000 | 287.539 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.595 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb0000000000002027 | 287.013 | 0.056 | n/a | 0.000 | 286.955 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.011 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf000000000000dfa6 | 269.072 | 0.152 | n/a | 0.000 | 268.917 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 269.069 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb000000000000dddf | 268.987 | 0.259 | n/a | 0.000 | 268.725 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.984 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb000000000000dde0 | 268.953 | 0.105 | n/a | 0.000 | 268.845 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.950 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf000000000000dfca | 268.923 | 0.014 | n/a | 0.000 | 268.908 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.921 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (233 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.929 | 0.001 |
| p99 | 270.915 | n/a | n/a | n/a | 2.507 | n/a | 0.000 | 270.721 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.912 | 1.000 | 0.003 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f4b75ee9011a8cf00000000000403f0 | 275.947 | 0.144 | n/a | 0.000 | 275.801 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.944 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf000000000005e6e2 | 272.683 | 0.131 | n/a | 0.000 | 272.550 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.681 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 1f4b75ee9011a8cf0000000000042512 | 270.915 | 0.190 | n/a | 0.000 | 270.721 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.912 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf000000000005e6f7 | 244.534 | 0.098 | n/a | 0.000 | 244.434 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 244.532 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| 1f4b75ee9011a8cf0000000000032beb | 10.389 | 8.611 | n/a | 0.000 | 0.000 | 0.871 | 0.877 | 0.007 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.003 | 8.611 | 0.829 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 1f4b75ee9011a8cf00000000000403ff | 5.983 | 5.980 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 5.980 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.032ms |
| 1f4b75ee9011a8cf00000000000520ea | 2.510 | 2.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.507 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf0000000000035672 | 0.629 | 0.627 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.627 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf0000000000045e35 | 0.604 | 0.602 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.602 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf000000000003b87e | 0.568 | 0.567 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.567 | 0.998 | 0.001 | node-14/thread-4/reader.execute | none observed |
| 1f4b75ee9011a8cf0000000000062ec2 | 0.537 | 0.535 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.535 | 0.997 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf000000000003ae66 | 0.521 | 0.520 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.520 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf0000000000057dc0 | 0.515 | 0.514 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.514 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf000000000004b694 | 0.472 | 0.471 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.471 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf0000000000036c69 | 0.467 | 0.465 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.465 | 0.997 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf000000000003c463 | 0.434 | 0.433 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.433 | 0.997 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf0000000000055086 | 0.400 | 0.399 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.399 | 0.996 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf00000000000567a6 | 0.390 | 0.389 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.389 | 0.997 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf00000000000515ed | 0.355 | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.340 | 0.015 | 0.043 | 0.340 | uncovered | none observed |
| 1f4b75ee9011a8cf000000000004e2f4 | 0.351 | 0.350 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.350 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P1 / L4 / read (522 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.930 | 0.001 |
| p99 | 306.349 | n/a | n/a | n/a | 3.802 | n/a | 0.000 | 306.228 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 306.347 | 1.000 | 0.013 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d078cb9f34596fb000000000004c1e4 | 343.259 | 0.141 | n/a | 0.000 | 343.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 343.257 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 845bf7530129c583000000000004affa | 343.137 | 0.180 | n/a | 0.000 | 342.954 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 343.134 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000856f2 | 342.578 | 0.028 | n/a | 0.000 | 342.549 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 342.576 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000856f1 | 342.551 | 0.155 | n/a | 0.000 | 342.393 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 342.548 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000041539 | 306.936 | 0.196 | n/a | 0.000 | 306.737 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 306.932 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb0000000000041bc8 | 306.349 | 0.118 | n/a | 0.000 | 306.228 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.347 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf000000000007954b | 292.397 | 0.031 | n/a | 0.000 | 292.365 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.396 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf000000000007954a | 292.344 | 0.157 | n/a | 0.000 | 292.179 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 292.336 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb0000000000036fef | 279.520 | 0.148 | n/a | 0.000 | 279.369 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.517 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000037025 | 279.293 | 0.282 | n/a | 0.000 | 279.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.291 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf000000000006bdcd | 279.228 | 0.215 | n/a | 0.000 | 279.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.226 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf000000000006bdce | 279.168 | 0.031 | n/a | 0.000 | 279.137 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.167 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb000000000003ad87 | 274.757 | 0.194 | n/a | 0.000 | 274.560 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.754 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 845bf7530129c583000000000003abd0 | 274.666 | 0.171 | n/a | 0.000 | 274.493 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.664 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 1f4b75ee9011a8cf0000000000070c48 | 274.247 | 0.020 | n/a | 0.000 | 274.226 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.246 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 1f4b75ee9011a8cf0000000000070c47 | 274.216 | 0.144 | n/a | 0.000 | 274.070 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.214 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 1f4b75ee9011a8cf0000000000085709 | 202.401 | 0.190 | n/a | 0.000 | 202.210 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 202.400 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.061ms; replica.apply-delta 0.033ms |
| 1f4b75ee9011a8cf0000000000085708 | 202.336 | 0.242 | n/a | 0.000 | 202.091 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 202.334 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.061ms; replica.apply-delta 0.033ms |
| 4d078cb9f34596fb000000000004c1eb | 202.173 | 0.104 | n/a | 0.000 | 202.066 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 202.169 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.030ms |
| 845bf7530129c583000000000004b00e | 202.122 | 0.087 | n/a | 0.000 | 202.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 202.119 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.028ms |

## P1 / L16 / read (692 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.017 | n/a | n/a | n/a | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.016 | 0.942 | 0.001 |
| p99 | 349.954 | n/a | n/a | n/a | 6.524 | n/a | 0.000 | 349.938 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 349.953 | 1.000 | 0.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d078cb9f34596fb000000000007416c | 354.641 | 2.956 | n/a | 0.000 | 351.683 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 354.639 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb000000000007416b | 351.690 | 0.016 | n/a | 0.000 | 351.672 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.689 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb000000000007416a | 351.689 | 0.036 | n/a | 0.000 | 351.652 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.688 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb0000000000074169 | 351.672 | 0.031 | n/a | 0.000 | 351.640 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.671 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4d078cb9f34596fb0000000000074168 | 351.619 | 0.099 | n/a | 0.000 | 351.518 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 351.617 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000072773 | 350.391 | 0.165 | n/a | 0.000 | 350.223 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 350.388 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000af932 | 349.954 | 0.014 | n/a | 0.000 | 349.938 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.953 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000af931 | 349.944 | 0.015 | n/a | 0.000 | 349.929 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.943 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000072784 | 349.942 | 0.019 | n/a | 0.000 | 349.922 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.941 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000072783 | 349.942 | 0.022 | n/a | 0.000 | 349.918 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.940 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000072782 | 349.940 | 0.036 | n/a | 0.000 | 349.903 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.939 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000af930 | 349.936 | 0.023 | n/a | 0.000 | 349.913 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 349.935 | 1.000 | 0.000 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000af92f | 349.924 | 0.021 | n/a | 0.000 | 349.902 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.923 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000af92e | 349.911 | 0.019 | n/a | 0.000 | 349.891 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.910 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 845bf7530129c5830000000000072781 | 349.893 | 0.034 | n/a | 0.000 | 349.857 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 349.891 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000af92d | 349.887 | 0.084 | n/a | 0.000 | 349.801 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 349.885 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000ae05c | 287.438 | 0.293 | n/a | 0.000 | 287.138 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 287.431 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000ae05d | 287.303 | 0.062 | n/a | 0.000 | 287.240 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.301 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000ae05e | 287.267 | 0.053 | n/a | 0.000 | 287.212 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.265 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1f4b75ee9011a8cf00000000000ae082 | 286.032 | 0.024 | n/a | 0.000 | 286.005 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.030 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / tail / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.015 | 0.951 | 0.001 |
| p99 | 0.078 | n/a | n/a | n/a | 0.076 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.076 | 0.981 | 0.003 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 845bf7530129c583000000000008b10b | 0.078 | 0.076 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.076 | 0.981 | 0.001 | node-14/thread-6/replica.pull-at | none observed |
| 1f4b75ee9011a8cf00000000000c8119 | 0.036 | 0.033 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.033 | 0.912 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 1f4b75ee9011a8cf00000000000c811a | 0.027 | 0.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.026 | 0.964 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf00000000000c811c | 0.020 | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.019 | 0.951 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf00000000000c811e | 0.016 | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.015 | 0.954 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 845bf7530129c583000000000008b10c | 0.015 | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.013 | 0.917 | 0.001 | node-14/thread-6/replica.pull-at | none observed |
| 1f4b75ee9011a8cf00000000000c811b | 0.014 | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.013 | 0.964 | 0.000 | node-14/thread-4/replica.pull-at | none observed |
| 1f4b75ee9011a8cf00000000000c811d | 0.011 | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.935 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1011.461 | n/a | n/a | n/a | 0.220 | n/a | 0.000 | 0.000 | 2.652 | 1000.840 | 0.017 | 0.000 | 0.092 | 0.000 | n/a | n/a | 1.099 | 0.220 | 0.000 | 1.099 |
| p99 | 1029.413 | n/a | n/a | n/a | 58.388 | n/a | 0.000 | 0.000 | 4.632 | 1005.061 | 0.035 | 0.000 | 0.289 | 0.000 | n/a | n/a | 1.224 | 58.388 | 0.057 | 1.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c1a95a84c1aaa2b80000000000000019 | 1029.413 | 58.388 | n/a | 0.000 | 0.000 | 2.652 | 968.006 | 0.017 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.258 | 58.388 | 0.057 | 0.258 | gw-r/thread-51/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000017 | 1011.461 | 0.220 | n/a | 0.000 | 0.000 | 4.632 | 1005.061 | 0.035 | 0.000 | 0.289 | 0.000 | n/a | n/a | 1.224 | 0.220 | 0.000 | 1.224 | gw-r/thread-45/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000018 | 1003.182 | 0.125 | n/a | 0.000 | 0.000 | 1.051 | 1000.840 | 0.010 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.099 | 0.125 | 0.000 | 1.099 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 304.657 | n/a | n/a | n/a | 4.200 | n/a | 0.000 | 0.000 | 3.647 | 294.077 | 0.012 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.144 | 4.200 | 0.014 | 0.144 |
| p99 | 1007.003 | n/a | n/a | n/a | 7.418 | n/a | 0.000 | 0.000 | 7.191 | 1000.230 | 0.020 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.538 | 7.418 | 0.050 | 0.538 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c1a95a84c1aaa2b80000000000000022 | 1007.003 | 4.795 | n/a | 0.000 | 0.000 | 1.738 | 1000.230 | 0.012 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.136 | 4.795 | 0.005 | 0.136 | gw-r/thread-52/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000001f | 886.626 | 3.050 | n/a | 0.000 | 0.000 | 3.647 | 879.328 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.538 | 3.050 | 0.003 | 0.538 | gw-r/thread-51/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000001c | 863.383 | 7.418 | n/a | 0.000 | 0.000 | 2.679 | 852.989 | 0.013 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.170 | 7.418 | 0.009 | 0.170 | gw-r/thread-47/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000027 | 673.845 | 2.917 | n/a | 0.000 | 0.000 | 2.225 | 668.406 | 0.011 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.184 | 2.917 | 0.004 | 0.184 | gw-r/thread-47/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000024 | 304.657 | 4.200 | n/a | 0.000 | 0.000 | 6.196 | 294.077 | 0.011 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.083 | 4.200 | 0.014 | 0.083 | gw-r/thread-48/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000001b | 300.391 | 5.856 | n/a | 0.000 | 0.000 | 7.086 | 287.175 | 0.020 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.120 | 5.856 | 0.019 | 0.120 | gw-r/thread-51/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000001e | 113.053 | 2.431 | n/a | 0.000 | 0.000 | 7.191 | 103.118 | 0.015 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.207 | 2.431 | 0.022 | 0.207 | gw-r/thread-52/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000020 | 96.317 | 4.840 | n/a | 0.000 | 0.000 | 4.635 | 86.629 | 0.015 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.095 | 4.840 | 0.050 | 0.095 | gw-r/thread-45/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000023 | 77.437 | 1.581 | n/a | 0.000 | 0.000 | 0.655 | 75.017 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.144 | 1.581 | 0.020 | 0.144 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 294.874 | n/a | n/a | n/a | 2.372 | n/a | 0.000 | 0.000 | 0.916 | 286.124 | 0.013 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.085 | 2.372 | 0.008 | 0.085 |
| p99 | 1002.983 | n/a | n/a | n/a | 7.984 | n/a | 0.000 | 0.000 | 4.350 | 1000.994 | 0.030 | 0.000 | 0.195 | 0.000 | n/a | n/a | 1.109 | 7.984 | 0.378 | 1.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c1a95a84c1aaa2b8000000000000002f | 1002.983 | 0.135 | n/a | 0.000 | 0.000 | 0.531 | 1000.994 | 0.020 | 0.000 | 0.195 | 0.000 | n/a | n/a | 1.109 | 0.135 | 0.000 | 1.109 | gw-r/thread-48/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000002e | 996.779 | 2.211 | n/a | 0.000 | 0.000 | 3.494 | 990.834 | 0.030 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.085 | 2.211 | 0.002 | 0.085 | gw-r/thread-45/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000028 | 933.360 | 2.372 | n/a | 0.000 | 0.000 | 1.925 | 928.892 | 0.010 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.083 | 2.372 | 0.003 | 0.083 | gw-r/thread-65/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000035 | 538.978 | 7.984 | n/a | 0.000 | 0.000 | 4.350 | 526.383 | 0.013 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.151 | 7.984 | 0.015 | 0.151 | gw-r/thread-50/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000002b | 433.728 | 2.907 | n/a | 0.000 | 0.000 | 0.916 | 429.751 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.082 | 2.907 | 0.007 | 0.082 | gw-r/thread-62/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000029 | 294.874 | 5.106 | n/a | 0.000 | 0.000 | 3.394 | 286.124 | 0.022 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.098 | 5.106 | 0.017 | 0.098 | gw-r/thread-45/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000002d | 281.703 | 6.093 | n/a | 0.000 | 0.000 | 1.250 | 274.049 | 0.019 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.138 | 6.093 | 0.022 | 0.138 | gw-r/thread-65/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000033 | 242.929 | 1.828 | n/a | 0.000 | 0.000 | 0.643 | 240.270 | 0.021 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.078 | 1.828 | 0.008 | 0.078 | gw-r/thread-51/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000031 | 217.469 | 3.544 | n/a | 0.000 | 0.000 | 0.607 | 213.106 | 0.011 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.112 | 3.544 | 0.016 | 0.112 | gw-r/thread-49/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000030 | 6.113 | 2.313 | n/a | 0.000 | 0.000 | 0.616 | 3.018 | 0.011 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.078 | 2.313 | 0.378 | 0.078 | gw-r/thread-52/journal/page | none observed |

## P3 / L4 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 432.874 | n/a | n/a | n/a | 2.292 | n/a | 0.000 | 0.000 | 1.079 | 426.143 | 0.014 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.091 | 2.292 | 0.009 | 0.091 |
| p99 | 1016.610 | n/a | n/a | n/a | 10.229 | n/a | 0.646 | 0.000 | 9.400 | 994.093 | 0.021 | 11.102 | 0.203 | 0.000 | n/a | n/a | 0.151 | 10.229 | 0.098 | 0.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c1a95a84c1aaa2b80000000000000044 | 1016.610 | 10.229 | n/a | 0.000 | 0.000 | 0.975 | 994.093 | 0.015 | 11.102 | 0.059 | 0.000 | n/a | n/a | 0.137 | 10.229 | 0.010 | 0.137 | gw-r/thread-45/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000036 | 834.863 | 6.138 | n/a | 0.646 | 0.000 | 1.254 | 826.605 | 0.010 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.132 | 6.785 | 0.008 | 0.132 | gw-r/thread-47/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000003f | 766.484 | 2.231 | n/a | 0.000 | 0.000 | 0.702 | 763.332 | 0.021 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.078 | 2.231 | 0.003 | 0.078 | gw-r/thread-51/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000003b | 549.268 | 2.292 | n/a | 0.000 | 0.000 | 2.869 | 543.933 | 0.014 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.081 | 2.292 | 0.004 | 0.081 | gw-r/thread-47/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000003e | 547.077 | 8.484 | n/a | 0.000 | 0.000 | 9.400 | 528.931 | 0.013 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.091 | 8.484 | 0.016 | 0.091 | gw-r/thread-65/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000038 | 432.874 | 5.366 | n/a | 0.000 | 0.000 | 1.079 | 426.143 | 0.017 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.151 | 5.366 | 0.012 | 0.151 | gw-r/thread-52/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000003c | 428.118 | 2.074 | n/a | 0.000 | 0.000 | 6.211 | 419.582 | 0.014 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.141 | 2.074 | 0.005 | 0.141 | gw-r/thread-47/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000039 | 229.230 | 2.283 | n/a | 0.000 | 0.000 | 4.124 | 222.640 | 0.011 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.087 | 2.283 | 0.010 | 0.087 | gw-r/thread-65/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000041 | 187.311 | 1.747 | n/a | 0.000 | 0.000 | 0.669 | 184.716 | 0.013 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.072 | 1.747 | 0.009 | 0.072 | gw-r/thread-49/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000042 | 52.601 | 5.131 | n/a | 0.000 | 0.000 | 0.670 | 46.438 | 0.014 | 0.000 | 0.203 | 0.000 | n/a | n/a | 0.146 | 5.131 | 0.098 | 0.146 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 966.298 | n/a | n/a | n/a | 3.427 | n/a | 0.000 | 0.000 | 0.758 | 962.509 | 0.012 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.089 | 3.427 | 0.004 | 0.089 |
| p99 | 1002.329 | n/a | n/a | n/a | 10.090 | n/a | 0.000 | 0.000 | 1.195 | 999.269 | 0.021 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.186 | 10.090 | 0.461 | 0.186 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c1a95a84c1aaa2b8000000000000004d | 1002.329 | 2.218 | n/a | 0.000 | 0.000 | 0.662 | 999.269 | 0.014 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.074 | 2.218 | 0.002 | 0.074 | gw-r/thread-48/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000046 | 996.208 | 2.411 | n/a | 0.000 | 0.000 | 0.906 | 992.660 | 0.021 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.083 | 2.411 | 0.002 | 0.083 | gw-r/thread-51/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000045 | 969.206 | 3.427 | n/a | 0.000 | 0.000 | 0.651 | 964.932 | 0.012 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.088 | 3.427 | 0.004 | 0.088 | gw-r/thread-65/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000004c | 966.298 | 2.379 | n/a | 0.000 | 0.000 | 1.195 | 962.509 | 0.012 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.089 | 2.379 | 0.002 | 0.089 | gw-r/thread-50/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000049 | 507.652 | 10.090 | n/a | 0.000 | 0.000 | 0.975 | 496.351 | 0.012 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.105 | 10.090 | 0.020 | 0.105 | gw-r/thread-65/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000047 | 501.287 | 6.674 | n/a | 0.000 | 0.000 | 0.758 | 493.620 | 0.019 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.119 | 6.674 | 0.013 | 0.119 | gw-r/thread-62/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000004b | 11.572 | 5.337 | n/a | 0.000 | 0.000 | 0.590 | 5.432 | 0.009 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.186 | 5.337 | 0.461 | 0.186 | gw-r/thread-52/gateway.admitted-work | none observed |

## P3 / tail / internal (156 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 373.324 | n/a | n/a | n/a | 2.453 | n/a | 0.000 | 0.000 | 0.710 | 370.450 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.069 | 2.453 | 0.007 | 0.069 |
| p99 | 1005.484 | n/a | n/a | n/a | 11.326 | n/a | 0.573 | 0.000 | 4.847 | 1001.274 | 0.047 | 6.643 | 0.167 | 0.000 | n/a | n/a | 1.128 | 11.326 | 0.387 | 1.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c1a95a84c1aaa2b8000000000000009f | 1007.214 | 0.118 | n/a | 0.000 | 0.000 | 5.128 | 1000.774 | 0.009 | 0.000 | 0.089 | 0.000 | n/a | n/a | 1.095 | 0.118 | 0.000 | 1.095 | gw-r/thread-65/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000011c | 1005.484 | 4.358 | n/a | 0.000 | 0.000 | 1.128 | 999.856 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.107 | 4.358 | 0.004 | 0.107 | gw-r/thread-48/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000051 | 1004.128 | 3.692 | n/a | 0.000 | 0.000 | 0.628 | 999.644 | 0.011 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.085 | 3.692 | 0.004 | 0.085 | gw-r/thread-48/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000081 | 1003.612 | 0.140 | n/a | 0.000 | 0.000 | 0.512 | 1001.670 | 0.042 | 0.000 | 0.128 | 0.000 | n/a | n/a | 1.118 | 0.140 | 0.000 | 1.118 | gw-r/thread-52/journal/page | none observed |
| c1a95a84c1aaa2b800000000000000fa | 1003.457 | 0.143 | n/a | 0.000 | 0.000 | 0.818 | 1001.274 | 0.011 | 0.000 | 0.097 | 0.000 | n/a | n/a | 1.113 | 0.143 | 0.000 | 1.113 | gw-r/thread-45/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000071 | 1003.246 | 0.180 | n/a | 0.000 | 0.000 | 0.577 | 1001.253 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 1.128 | 0.180 | 0.000 | 1.128 | gw-r/thread-50/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000089 | 1003.174 | 0.105 | n/a | 0.000 | 0.000 | 1.140 | 1000.754 | 0.012 | 0.000 | 0.070 | 0.000 | n/a | n/a | 1.094 | 0.105 | 0.000 | 1.094 | gw-r/thread-48/journal/page | none observed |
| c1a95a84c1aaa2b800000000000000e3 | 1003.107 | 0.181 | n/a | 0.000 | 0.000 | 1.082 | 1000.643 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.146 | 0.181 | 0.000 | 1.146 | gw-r/thread-49/journal/page | none observed |
| c1a95a84c1aaa2b800000000000000c9 | 1002.607 | 0.096 | n/a | 0.000 | 0.000 | 0.496 | 1000.837 | 0.024 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.094 | 0.096 | 0.000 | 1.094 | gw-r/thread-52/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000138 | 1002.546 | 0.118 | n/a | 0.000 | 0.000 | 0.516 | 1000.749 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 1.096 | 0.118 | 0.000 | 1.096 | gw-r/thread-50/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000079 | 998.610 | 2.933 | n/a | 0.000 | 0.000 | 0.633 | 994.752 | 0.012 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.206 | 2.933 | 0.003 | 0.206 | gw-r/thread-45/journal/page | none observed |
| c1a95a84c1aaa2b800000000000000f4 | 997.339 | 3.504 | n/a | 0.000 | 0.000 | 0.881 | 992.841 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.065 | 3.504 | 0.004 | 0.065 | gw-r/thread-51/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000092 | 996.741 | 2.160 | n/a | 0.000 | 0.000 | 0.509 | 993.937 | 0.011 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.057 | 2.160 | 0.002 | 0.057 | gw-r/thread-49/journal/page | none observed |
| c1a95a84c1aaa2b800000000000000da | 996.564 | 2.143 | n/a | 0.000 | 0.000 | 0.540 | 993.778 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.062 | 2.143 | 0.002 | 0.062 | gw-r/thread-50/journal/page | none observed |
| c1a95a84c1aaa2b800000000000000ad | 996.463 | 2.855 | n/a | 0.000 | 0.000 | 0.519 | 992.979 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.063 | 2.855 | 0.003 | 0.063 | gw-r/thread-50/journal/page | none observed |
| c1a95a84c1aaa2b800000000000000a1 | 995.686 | 2.091 | n/a | 0.000 | 0.000 | 0.466 | 992.980 | 0.011 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.059 | 2.091 | 0.002 | 0.059 | gw-r/thread-49/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000100 | 994.704 | 2.377 | n/a | 0.000 | 0.000 | 0.370 | 991.851 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.065 | 2.377 | 0.002 | 0.065 | gw-r/thread-50/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000010f | 994.177 | 2.417 | n/a | 0.000 | 0.000 | 0.484 | 991.155 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.076 | 2.417 | 0.002 | 0.076 | gw-r/thread-45/journal/page | none observed |
| c1a95a84c1aaa2b8000000000000011b | 991.714 | 2.749 | n/a | 0.000 | 0.000 | 1.026 | 987.819 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.070 | 2.749 | 0.003 | 0.070 | gw-r/thread-49/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000052 | 990.099 | 3.208 | n/a | 0.000 | 0.000 | 1.397 | 985.324 | 0.014 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.079 | 3.208 | 0.003 | 0.079 | gw-r/thread-52/journal/page | none observed |

## P3 / outside-phases / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.414 | n/a | n/a | n/a | 0.118 | n/a | 0.000 | 0.000 | 1.151 | 200.906 | 0.015 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.130 | 0.118 | 0.001 | 0.130 |
| p99 | 207.016 | n/a | n/a | n/a | 0.173 | n/a | 0.000 | 0.000 | 4.686 | 202.119 | 0.098 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.275 | 0.173 | 0.004 | 0.275 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fed19601c66920b50000000000000007 | 207.016 | 0.029 | n/a | 0.000 | 0.000 | 4.686 | 202.119 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.130 | 0.029 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b50000000000000005 | 203.397 | 0.132 | n/a | 0.000 | 0.000 | 1.820 | 200.957 | 0.044 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.275 | 0.132 | 0.001 | 0.275 | gw-r/thread-48/journal/page | none observed |
| fed19601c66920b50000000000000006 | 202.414 | 0.118 | n/a | 0.000 | 0.000 | 1.151 | 200.906 | 0.015 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.092 | 0.118 | 0.001 | 0.092 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b500000000000001eb | 201.519 | 0.032 | n/a | 0.000 | 0.000 | 0.727 | 200.639 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-62/journal/page | none observed |
| c1a95a84c1aaa2b80000000000000002 | 40.605 | 0.173 | n/a | 0.000 | 0.000 | 1.060 | 38.995 | 0.098 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.197 | 0.173 | 0.004 | 0.197 | gw-r/thread-48/gateway.admitted-work | none observed |

## P3 / warmup / read (26 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.724 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 1.704 | 201.124 | 0.014 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.088 | 0.044 | 0.000 | 0.088 |
| p99 | 216.092 | n/a | n/a | n/a | 0.086 | n/a | 0.000 | 0.000 | 12.003 | 204.468 | 9.274 | 0.000 | 0.352 | 0.000 | n/a | n/a | 0.301 | 0.086 | 0.001 | 0.301 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fed19601c66920b50000000000000021 | 216.092 | 0.035 | n/a | 0.000 | 0.000 | 12.003 | 203.725 | 0.045 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.087 | 0.035 | 0.000 | 0.087 | gw-r/thread-52/journal/page | none observed |
| fed19601c66920b50000000000000018 | 208.683 | 0.039 | n/a | 0.000 | 0.000 | 7.239 | 201.124 | 0.016 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.103 | 0.039 | 0.000 | 0.103 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b50000000000000009 | 207.401 | 0.086 | n/a | 0.000 | 0.000 | 4.984 | 201.741 | 0.027 | 0.000 | 0.262 | 0.000 | n/a | n/a | 0.301 | 0.086 | 0.000 | 0.301 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b50000000000000020 | 205.833 | 0.047 | n/a | 0.000 | 0.000 | 1.014 | 204.468 | 0.048 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.105 | 0.047 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b50000000000000008 | 205.579 | 0.037 | n/a | 0.000 | 0.000 | 4.167 | 201.144 | 0.012 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.088 | 0.037 | 0.000 | 0.088 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b5000000000000001a | 204.778 | 0.029 | n/a | 0.000 | 0.000 | 3.730 | 200.824 | 0.012 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| fed19601c66920b50000000000000014 | 204.671 | 0.032 | n/a | 0.000 | 0.000 | 1.395 | 203.023 | 0.013 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| fed19601c66920b50000000000000013 | 204.207 | 0.042 | n/a | 0.000 | 0.000 | 1.352 | 202.515 | 0.024 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.099 | 0.042 | 0.000 | 0.099 | gw-r/thread-65/journal/page | none observed |
| fed19601c66920b50000000000000015 | 204.137 | 0.049 | n/a | 0.000 | 0.000 | 3.041 | 200.807 | 0.013 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.106 | 0.049 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b5000000000000000e | 203.933 | 0.061 | n/a | 0.000 | 0.000 | 2.447 | 201.147 | 0.012 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.110 | 0.061 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| fed19601c66920b5000000000000000f | 203.265 | 0.040 | n/a | 0.000 | 0.000 | 1.505 | 201.415 | 0.022 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.071 | 0.040 | 0.000 | 0.071 | gw-r/thread-65/journal/page | none observed |
| fed19601c66920b5000000000000000b | 203.181 | 0.035 | n/a | 0.000 | 0.000 | 0.985 | 201.738 | 0.221 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.073 | 0.035 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b50000000000000019 | 203.125 | 0.030 | n/a | 0.000 | 0.000 | 1.704 | 201.147 | 0.014 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.068 | 0.030 | 0.000 | 0.068 | gw-r/thread-65/journal/page | none observed |
| fed19601c66920b5000000000000000d | 202.724 | 0.072 | n/a | 0.000 | 0.000 | 1.065 | 201.200 | 0.034 | 0.000 | 0.239 | 0.000 | n/a | n/a | 0.114 | 0.072 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b5000000000000001b | 202.289 | 0.031 | n/a | 0.000 | 0.000 | 0.793 | 201.258 | 0.017 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b50000000000000012 | 202.231 | 0.046 | n/a | 0.000 | 0.000 | 0.642 | 201.232 | 0.023 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.096 | 0.046 | 0.000 | 0.096 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b5000000000000001e | 201.687 | 0.041 | n/a | 0.000 | 0.000 | 0.670 | 200.651 | 0.013 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.198 | 0.041 | 0.000 | 0.198 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b50000000000000022 | 199.364 | 0.048 | n/a | 0.000 | 0.000 | 2.544 | 196.627 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.086 | 0.048 | 0.000 | 0.086 | gw-r/thread-51/journal/page | none observed |
| fed19601c66920b50000000000000010 | 176.470 | 0.044 | n/a | 0.000 | 0.000 | 2.724 | 173.510 | 0.010 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.070 | 0.044 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b50000000000000011 | 97.807 | 0.052 | n/a | 0.000 | 0.000 | 7.652 | 89.673 | 0.010 | 0.000 | 0.352 | 0.000 | n/a | n/a | 0.068 | 0.052 | 0.001 | 0.068 | gw-r/thread-50/journal/page | none observed |

## P3 / L1 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.895 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.893 | 200.938 | 0.012 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.082 | 0.037 | 0.000 | 0.082 |
| p99 | 203.205 | n/a | n/a | n/a | 0.089 | n/a | 0.000 | 0.000 | 1.641 | 201.626 | 5.905 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.188 | 0.089 | 0.002 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fed19601c66920b50000000000000031 | 203.205 | 0.043 | n/a | 0.000 | 0.000 | 1.235 | 201.626 | 0.018 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.097 | 0.043 | 0.000 | 0.097 | gw-r/thread-51/journal/page | none observed |
| fed19601c66920b50000000000000032 | 202.824 | 0.049 | n/a | 0.000 | 0.000 | 1.453 | 201.119 | 0.011 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.082 | 0.049 | 0.000 | 0.082 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b50000000000000028 | 202.777 | 0.044 | n/a | 0.000 | 0.000 | 0.944 | 201.451 | 0.026 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.128 | 0.044 | 0.000 | 0.128 | gw-r/thread-52/journal/page | none observed |
| fed19601c66920b50000000000000024 | 202.719 | 0.037 | n/a | 0.000 | 0.000 | 1.641 | 200.844 | 0.011 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.074 | 0.037 | 0.000 | 0.074 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b50000000000000025 | 202.525 | 0.030 | n/a | 0.000 | 0.000 | 0.859 | 201.417 | 0.014 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.066 | 0.030 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| fed19601c66920b5000000000000002d | 202.414 | 0.036 | n/a | 0.000 | 0.000 | 0.717 | 201.438 | 0.011 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.091 | 0.036 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b50000000000000026 | 202.257 | 0.035 | n/a | 0.000 | 0.000 | 1.025 | 200.975 | 0.012 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b5000000000000002a | 201.895 | 0.042 | n/a | 0.000 | 0.000 | 0.460 | 201.153 | 0.011 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.112 | 0.042 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| fed19601c66920b50000000000000023 | 201.879 | 0.033 | n/a | 0.000 | 0.000 | 0.715 | 200.925 | 0.020 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.069 | 0.033 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b50000000000000030 | 201.876 | 0.029 | n/a | 0.000 | 0.000 | 0.697 | 200.938 | 0.012 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b5000000000000002f | 201.856 | 0.065 | n/a | 0.000 | 0.000 | 0.893 | 200.619 | 0.012 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.146 | 0.065 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b5000000000000002b | 201.754 | 0.036 | n/a | 0.000 | 0.000 | 0.724 | 200.781 | 0.015 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.082 | 0.036 | 0.000 | 0.082 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b50000000000000033 | 100.500 | 0.045 | n/a | 0.000 | 0.000 | 1.125 | 93.289 | 5.905 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.065 | 0.045 | 0.000 | 0.065 | gw-r/thread-65/journal/page | none observed |
| fed19601c66920b50000000000000029 | 57.823 | 0.089 | n/a | 0.000 | 0.000 | 1.359 | 51.002 | 5.068 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.188 | 0.089 | 0.002 | 0.188 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.557 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 1.131 | 201.077 | 0.021 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 |
| p99 | 222.259 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 13.419 | 220.787 | 26.528 | 0.000 | 2.178 | 0.000 | n/a | n/a | 0.110 | 0.050 | 0.000 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fed19601c66920b5000000000000003b | 222.259 | 0.034 | n/a | 0.000 | 0.000 | 1.131 | 220.787 | 0.057 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.068 | 0.034 | 0.000 | 0.068 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b50000000000000037 | 206.807 | 0.040 | n/a | 0.000 | 0.000 | 3.693 | 202.765 | 0.021 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.088 | 0.040 | 0.000 | 0.088 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b50000000000000040 | 205.639 | 0.042 | n/a | 0.000 | 0.000 | 1.339 | 203.988 | 0.013 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.103 | 0.042 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b5000000000000003f | 204.085 | 0.040 | n/a | 0.000 | 0.000 | 1.594 | 202.206 | 0.032 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| fed19601c66920b5000000000000003d | 203.566 | 0.040 | n/a | 0.000 | 0.000 | 1.055 | 200.562 | 0.014 | 0.000 | 1.783 | 0.000 | n/a | n/a | 0.110 | 0.040 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b50000000000000048 | 202.579 | 0.048 | n/a | 0.000 | 0.000 | 0.745 | 201.618 | 0.011 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.083 | 0.048 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| fed19601c66920b50000000000000042 | 202.557 | 0.032 | n/a | 0.000 | 0.000 | 0.717 | 201.553 | 0.023 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| fed19601c66920b50000000000000047 | 202.433 | 0.037 | n/a | 0.000 | 0.000 | 1.202 | 200.984 | 0.013 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.066 | 0.037 | 0.000 | 0.066 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b50000000000000038 | 202.024 | 0.032 | n/a | 0.000 | 0.000 | 0.710 | 201.077 | 0.011 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b50000000000000039 | 201.747 | 0.029 | n/a | 0.000 | 0.000 | 0.656 | 200.869 | 0.011 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.070 | 0.029 | 0.000 | 0.070 | gw-r/thread-48/journal/page | none observed |
| fed19601c66920b50000000000000043 | 182.510 | 0.041 | n/a | 0.000 | 0.000 | 1.267 | 172.245 | 8.841 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.068 | 0.041 | 0.000 | 0.068 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b5000000000000003c | 180.290 | 0.050 | n/a | 0.000 | 0.000 | 0.770 | 152.105 | 26.528 | 0.000 | 0.762 | 0.000 | n/a | n/a | 0.075 | 0.050 | 0.000 | 0.075 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b50000000000000041 | 109.364 | 0.050 | n/a | 0.000 | 0.000 | 13.419 | 83.690 | 9.952 | 0.000 | 2.178 | 0.000 | n/a | n/a | 0.074 | 0.050 | 0.000 | 0.074 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.066 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 1.242 | 200.970 | 0.016 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.074 | 0.039 | 0.000 | 0.074 |
| p99 | 216.749 | n/a | n/a | n/a | 0.061 | n/a | 0.000 | 0.000 | 9.946 | 206.571 | 11.473 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.149 | 0.061 | 0.001 | 0.149 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fed19601c66920b5000000000000005a | 216.749 | 0.034 | n/a | 0.000 | 0.000 | 9.946 | 206.571 | 0.012 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-51/journal/page | none observed |
| fed19601c66920b50000000000000051 | 205.812 | 0.031 | n/a | 0.000 | 0.000 | 0.693 | 204.874 | 0.017 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| fed19601c66920b5000000000000004d | 203.881 | 0.039 | n/a | 0.000 | 0.000 | 1.525 | 202.029 | 0.021 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.103 | 0.039 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| fed19601c66920b5000000000000004c | 203.700 | 0.049 | n/a | 0.000 | 0.000 | 2.298 | 201.031 | 0.016 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.149 | 0.049 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| fed19601c66920b5000000000000004b | 203.492 | 0.031 | n/a | 0.000 | 0.000 | 1.379 | 201.830 | 0.030 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.077 | 0.031 | 0.000 | 0.077 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b5000000000000004a | 202.804 | 0.043 | n/a | 0.000 | 0.000 | 1.242 | 201.217 | 0.031 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.102 | 0.043 | 0.000 | 0.102 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b50000000000000054 | 202.072 | 0.047 | n/a | 0.000 | 0.000 | 0.936 | 200.873 | 0.013 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.076 | 0.047 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| fed19601c66920b50000000000000052 | 202.066 | 0.031 | n/a | 0.000 | 0.000 | 0.839 | 200.992 | 0.013 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| fed19601c66920b50000000000000050 | 202.035 | 0.033 | n/a | 0.000 | 0.000 | 0.977 | 200.829 | 0.012 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b50000000000000055 | 202.001 | 0.040 | n/a | 0.000 | 0.000 | 0.742 | 200.970 | 0.014 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.111 | 0.040 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |
| fed19601c66920b5000000000000004f | 201.727 | 0.033 | n/a | 0.000 | 0.000 | 0.616 | 200.882 | 0.016 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b5000000000000005b | 165.037 | 0.061 | n/a | 0.000 | 0.000 | 1.330 | 151.957 | 11.473 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.101 | 0.061 | 0.000 | 0.101 | gw-r/thread-52/journal/page | none observed |
| fed19601c66920b50000000000000053 | 98.602 | 0.040 | n/a | 0.000 | 0.000 | 4.942 | 88.440 | 5.018 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.059 | 0.040 | 0.000 | 0.059 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b5000000000000004e | 70.664 | 0.049 | n/a | 0.000 | 0.000 | 4.412 | 58.914 | 7.164 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.074 | 0.049 | 0.001 | 0.074 | gw-r/thread-52/journal/page | none observed |

## P3 / tail / read (358 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.678 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.730 | 200.764 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.078 | 0.043 | 0.000 | 0.078 |
| p99 | 208.050 | n/a | n/a | n/a | 0.095 | n/a | 0.000 | 0.000 | 4.220 | 204.869 | 4.966 | 0.000 | 0.220 | 0.000 | n/a | n/a | 0.197 | 0.095 | 0.001 | 0.197 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fed19601c66920b500000000000000de | 209.460 | 0.043 | n/a | 0.000 | 0.000 | 3.657 | 205.524 | 0.022 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.069 | 0.043 | 0.000 | 0.069 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b5000000000000006f | 209.255 | 0.094 | n/a | 0.000 | 0.000 | 1.335 | 200.375 | 7.310 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.078 | 0.094 | 0.000 | 0.078 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b500000000000001bf | 208.892 | 0.045 | n/a | 0.000 | 0.000 | 4.615 | 204.033 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.113 | 0.045 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b500000000000001d0 | 208.050 | 0.055 | n/a | 0.000 | 0.000 | 0.889 | 206.982 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.072 | 0.055 | 0.000 | 0.072 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b5000000000000006a | 207.670 | 0.039 | n/a | 0.000 | 0.000 | 2.249 | 205.099 | 0.019 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.105 | 0.039 | 0.000 | 0.105 | gw-r/thread-51/journal/page | none observed |
| fed19601c66920b50000000000000114 | 206.484 | 0.037 | n/a | 0.000 | 0.000 | 4.220 | 201.975 | 0.015 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.077 | 0.037 | 0.000 | 0.077 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b50000000000000104 | 206.242 | 0.065 | n/a | 0.000 | 0.000 | 4.662 | 201.282 | 0.010 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.124 | 0.065 | 0.000 | 0.124 | gw-r/thread-65/journal/page | none observed |
| fed19601c66920b500000000000000f0 | 205.866 | 0.043 | n/a | 0.000 | 0.000 | 0.693 | 204.869 | 0.042 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.146 | 0.043 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b500000000000000ba | 205.566 | 0.037 | n/a | 0.000 | 0.000 | 4.302 | 201.056 | 0.011 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.070 | 0.037 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b5000000000000007b | 205.487 | 0.033 | n/a | 0.000 | 0.000 | 0.565 | 204.616 | 0.015 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b500000000000000eb | 205.396 | 0.067 | n/a | 0.000 | 0.000 | 1.176 | 203.841 | 0.010 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.186 | 0.067 | 0.000 | 0.186 | gw-r/thread-62/journal/page | none observed |
| fed19601c66920b500000000000000cc | 205.077 | 0.031 | n/a | 0.000 | 0.000 | 0.726 | 204.097 | 0.035 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-51/journal/page | none observed |
| fed19601c66920b500000000000001e5 | 205.034 | 0.044 | n/a | 0.000 | 0.000 | 4.035 | 200.794 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.092 | 0.044 | 0.000 | 0.092 | gw-r/thread-47/journal/page | none observed |
| fed19601c66920b50000000000000129 | 205.025 | 0.054 | n/a | 0.000 | 0.000 | 0.541 | 204.213 | 0.010 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.149 | 0.054 | 0.000 | 0.149 | gw-r/thread-65/journal/page | none observed |
| fed19601c66920b5000000000000009d | 204.936 | 0.053 | n/a | 0.000 | 0.000 | 3.479 | 201.136 | 0.031 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.069 | 0.053 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| fed19601c66920b500000000000000f9 | 204.826 | 0.031 | n/a | 0.000 | 0.000 | 0.667 | 203.982 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| fed19601c66920b50000000000000145 | 204.703 | 0.043 | n/a | 0.000 | 0.000 | 0.610 | 203.873 | 0.011 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.076 | 0.043 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| fed19601c66920b50000000000000174 | 204.503 | 0.032 | n/a | 0.000 | 0.000 | 0.684 | 203.626 | 0.007 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| fed19601c66920b50000000000000068 | 204.440 | 0.034 | n/a | 0.000 | 0.000 | 3.138 | 201.065 | 0.013 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |
| fed19601c66920b50000000000000107 | 204.429 | 0.039 | n/a | 0.000 | 0.000 | 0.573 | 203.632 | 0.011 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.080 | 0.039 | 0.000 | 0.080 | gw-r/thread-62/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

## Writer heap, GC and scheduler stalls

Source afee00b0110100d344595e184670aff7f12ba05f; 95 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 227.902 / 243.501 |
| GC events / total duration / maximum ms | 75 / 109.965 / 14.548 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":69,"4":3,"8":3} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 102.992 / 3 / 253.991 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (144.527 ms, trace `b64bc2be1b200d270000000000001055`); `node-14/thread-0/driver.queue.scheduler-late` (129.968 ms, trace `b64bc2be1b200d27000000000000105d`); `node-14/thread-0/driver.queue.scheduler-late` (109.441 ms, trace `b64bc2be1b200d270000000000001060`); `node-14/thread-0/driver.queue.scheduler-late` (119.057 ms, trace `b64bc2be1b200d27000000000000105e`); `node-14/thread-0/driver.queue.subject` (91.534 ms, trace `b64bc2be1b200d270000000000001062`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p4-anatomy-a-2-anatomy`; source `104497f6e3b6a182fb121c4260b92b22642ec370`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 38498774.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 186 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14392.831 | 550.852 | 71.745 | 311 |
| L1 | 0 | 19939.685 | 412.529 | 14.438 | 462 |
| L4 | 0 | 19976.054 | 351.882 | 8.699 | 426 |
| L16 | 0 | 19975.993 | 363.381 | 13.590 | 474 |
| L64 | 0 | 19963.326 | 403.997 | 21.351 | 596 |
| L256 | 0 | 19978.354 | 424.663 | 33.136 | 486 |
| L1024 | 0 | 19982.944 | 3582.164 | 93.029 | 12016 |
| tail | 0 | 64580.931 | 10830.407 | 384.644 | 37429 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| b64bc2be1b200d270000000000001055 | driver.queue.subject | 144.527 | b64bc2be1b200d270000000000001053 | 4 / 32 |
| b64bc2be1b200d270000000000001055 | driver.queue.scheduler-late | 18.589 | none | 4 / 32 |
| b64bc2be1b200d270000000000001055 | driver.queue.scheduler-dispatch | 0.048 | none | 7 / 32 |

Observed active steps while trace b64bc2be1b200d270000000000001055 waited: [{"at":1794582427102.4048,"inFlight":9,"capacity":32,"active":[{"traceId":"b64bc2be1b200d270000000000001053","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001054","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001056","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001057","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001058","step":"rpc.probe.transact"},{"traceId":"b64bc2be1b200d27000000000000105f","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001061","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001063","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001064","step":"client.http"}]}]

| b64bc2be1b200d27000000000000105d | driver.queue.scheduler-late | 129.968 | none | 5 / 32 |
| b64bc2be1b200d27000000000000105d | driver.queue.subject | 15.434 | b64bc2be1b200d270000000000001056 | 5 / 32 |
| b64bc2be1b200d27000000000000105d | driver.queue.scheduler-dispatch | 0.049 | none | 6 / 32 |

Observed active steps while trace b64bc2be1b200d27000000000000105d waited: [{"at":1794582427102.4048,"inFlight":9,"capacity":32,"active":[{"traceId":"b64bc2be1b200d270000000000001053","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001054","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001056","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001057","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001058","step":"rpc.probe.transact"},{"traceId":"b64bc2be1b200d27000000000000105f","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001061","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001063","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001064","step":"client.http"}]}]

| b64bc2be1b200d270000000000001060 | driver.queue.scheduler-late | 109.441 | none | 6 / 32 |
| b64bc2be1b200d270000000000001060 | driver.queue.subject | 76.065 | b64bc2be1b200d27000000000000105d | 6 / 32 |
| b64bc2be1b200d270000000000001060 | driver.queue.scheduler-dispatch | 0.053 | none | 2 / 32 |

Observed active steps while trace b64bc2be1b200d270000000000001060 waited: [{"at":1794582427102.4048,"inFlight":9,"capacity":32,"active":[{"traceId":"b64bc2be1b200d270000000000001053","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001054","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001056","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001057","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001058","step":"rpc.probe.transact"},{"traceId":"b64bc2be1b200d27000000000000105f","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001061","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001063","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001064","step":"client.http"}]},{"at":1794582427144.4163,"inFlight":8,"capacity":32,"active":[{"traceId":"b64bc2be1b200d27000000000000105f","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001061","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001063","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001064","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001055","step":"client.commit-send-queue"},{"traceId":"b64bc2be1b200d27000000000000105d","step":"client.commit-send-queue"},{"traceId":"b64bc2be1b200d27000000000000105e","step":"client.commit-send-queue"},{"traceId":"b64bc2be1b200d27000000000000106c","step":"client.commit-send-queue"}]},{"at":1794582427164.619,"inFlight":5,"capacity":32,"active":[{"traceId":"b64bc2be1b200d270000000000001064","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001055","step":"client.http"},{"traceId":"b64bc2be1b200d27000000000000105d","step":"client.http"},{"traceId":"b64bc2be1b200d27000000000000105e","step":"client.http"},{"traceId":"b64bc2be1b200d27000000000000106c","step":"client.http"}]}]

| b64bc2be1b200d27000000000000105e | driver.queue.scheduler-late | 119.057 | none | 5 / 32 |
| b64bc2be1b200d27000000000000105e | driver.queue.subject | 18.515 | b64bc2be1b200d270000000000001057 | 5 / 32 |
| b64bc2be1b200d27000000000000105e | driver.queue.scheduler-dispatch | 0.046 | none | 6 / 32 |

Observed active steps while trace b64bc2be1b200d27000000000000105e waited: [{"at":1794582427102.4048,"inFlight":9,"capacity":32,"active":[{"traceId":"b64bc2be1b200d270000000000001053","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001054","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001056","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001057","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001058","step":"rpc.probe.transact"},{"traceId":"b64bc2be1b200d27000000000000105f","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001061","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001063","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001064","step":"client.http"}]}]

| b64bc2be1b200d270000000000001062 | driver.queue.subject | 91.534 | b64bc2be1b200d270000000000001060 | 7 / 32 |
| b64bc2be1b200d270000000000001062 | driver.queue.scheduler-late | 89.171 | none | 7 / 32 |
| b64bc2be1b200d270000000000001062 | driver.queue.scheduler-dispatch | 0.067 | none | 1 / 32 |

Observed active steps while trace b64bc2be1b200d270000000000001062 waited: [{"at":1794582427102.4048,"inFlight":9,"capacity":32,"active":[{"traceId":"b64bc2be1b200d270000000000001053","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001054","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001056","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001057","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001058","step":"rpc.probe.transact"},{"traceId":"b64bc2be1b200d27000000000000105f","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001061","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001063","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001064","step":"client.http"}]},{"at":1794582427144.4163,"inFlight":8,"capacity":32,"active":[{"traceId":"b64bc2be1b200d27000000000000105f","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001061","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001063","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001064","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001055","step":"client.commit-send-queue"},{"traceId":"b64bc2be1b200d27000000000000105d","step":"client.commit-send-queue"},{"traceId":"b64bc2be1b200d27000000000000105e","step":"client.commit-send-queue"},{"traceId":"b64bc2be1b200d27000000000000106c","step":"client.commit-send-queue"}]},{"at":1794582427164.619,"inFlight":5,"capacity":32,"active":[{"traceId":"b64bc2be1b200d270000000000001064","step":"client.http"},{"traceId":"b64bc2be1b200d270000000000001055","step":"client.http"},{"traceId":"b64bc2be1b200d27000000000000105d","step":"client.http"},{"traceId":"b64bc2be1b200d27000000000000105e","step":"client.http"},{"traceId":"b64bc2be1b200d27000000000000106c","step":"client.http"}]},{"at":1794582427187.32,"inFlight":1,"capacity":32,"active":[{"traceId":"b64bc2be1b200d270000000000001060","step":"client.http"}]}]

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.486 | 0.483 | 0.000 | 1.354 | 4.824 | 0.177 | 0.000 | 0.194 | 1.290 | 7.246 | 0.037 | 0.000 | 0.479 | 11.968 | n/a | n/a | 0.052 | 5.359 | 0.199 | 0.052 |
| p99 | 86.065 | 5.037 | 1.570 | 4.854 | 14.207 | 0.868 | 3.472 | 1.151 | 2.799 | 27.647 | 1.581 | 25.647 | 3.257 | 43.070 | n/a | n/a | 0.441 | 15.151 | 0.417 | 0.441 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d270000000000000425 | 86.065 | 14.207 | 0.868 | 0.000 | 0.075 | 2.147 | 27.647 | 1.234 | 0.000 | 0.760 | 39.053 | n/a | n/a | 0.073 | 15.151 | 0.176 | 0.073 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000045b | 63.857 | 3.720 | 0.177 | 0.223 | 0.059 | 1.410 | 14.821 | 0.060 | 0.000 | 0.280 | 43.070 | n/a | n/a | 0.037 | 4.179 | 0.065 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000429 | 62.627 | 8.910 | 0.291 | 0.000 | 0.066 | 1.709 | 14.006 | 0.045 | 0.000 | 0.204 | 37.339 | n/a | n/a | 0.058 | 9.267 | 0.148 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000441 | 49.693 | 8.305 | 0.382 | 0.000 | 0.051 | 2.457 | 18.408 | 0.038 | 0.000 | 0.488 | 19.531 | n/a | n/a | 0.033 | 8.738 | 0.176 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000459 | 49.050 | 3.631 | 0.266 | 0.324 | 0.122 | 1.212 | 8.994 | 0.029 | 25.647 | 0.165 | 8.612 | n/a | n/a | 0.048 | 4.343 | 0.089 | 0.048 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b64bc2be1b200d27000000000000044f | 48.764 | 3.883 | 0.229 | 0.236 | 0.096 | 1.211 | 17.054 | 0.029 | 0.000 | 0.385 | 25.583 | n/a | n/a | 0.057 | 4.445 | 0.091 | 0.057 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000435 | 47.142 | 4.962 | 0.285 | 0.000 | 0.090 | 1.436 | 25.023 | 0.035 | 0.000 | 0.183 | 15.054 | n/a | n/a | 0.075 | 5.337 | 0.113 | 0.075 | gw-w/thread-52/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000422 | 41.226 | 12.945 | 0.044 | 0.000 | 0.769 | 1.837 | 10.888 | 0.213 | 0.000 | 2.122 | 11.968 | n/a | n/a | 0.441 | 13.758 | 0.334 | 0.441 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000044b | 40.187 | 4.508 | 0.270 | 0.271 | 0.062 | 1.432 | 21.044 | 0.049 | 0.000 | 1.915 | 10.568 | n/a | n/a | 0.068 | 5.111 | 0.127 | 0.068 | gw-w/thread-49/gateway.admitted-work | none observed |
| b64bc2be1b200d27000000000000043d | 38.288 | 5.875 | 0.264 | 0.000 | 0.050 | 1.441 | 18.543 | 0.039 | 0.000 | 0.479 | 11.555 | n/a | n/a | 0.042 | 6.190 | 0.162 | 0.042 | gw-w/thread-53/gateway.admitted-work | none observed |
| b64bc2be1b200d27000000000000042f | 37.916 | 5.008 | 0.281 | 0.000 | 0.069 | 2.563 | 12.572 | 0.030 | 0.000 | 1.277 | 16.037 | n/a | n/a | 0.078 | 5.359 | 0.141 | 0.078 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000449 | 37.249 | 5.351 | 0.005 | 1.544 | 0.502 | 0.658 | 4.812 | 0.026 | 0.000 | 0.166 | 24.132 | n/a | n/a | 0.053 | 7.402 | 0.199 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000432 | 36.308 | 8.424 | 0.007 | 3.472 | 0.233 | 1.105 | 2.969 | 0.056 | 0.000 | 0.920 | 18.991 | n/a | n/a | 0.130 | 12.137 | 0.334 | 0.130 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000042d | 32.371 | 4.154 | 0.284 | 0.000 | 0.066 | 1.860 | 14.973 | 0.066 | 0.000 | 0.688 | 10.235 | n/a | n/a | 0.046 | 4.504 | 0.139 | 0.046 | gw-w/thread-46/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000437 | 31.486 | 4.836 | 0.471 | 0.000 | 0.194 | 1.397 | 7.246 | 0.043 | 0.000 | 3.257 | 13.987 | n/a | n/a | 0.056 | 5.501 | 0.175 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000453 | 28.576 | 3.671 | 0.210 | 0.248 | 0.060 | 1.088 | 8.451 | 0.036 | 0.000 | 0.245 | 14.525 | n/a | n/a | 0.040 | 4.190 | 0.147 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000042b | 28.238 | 5.292 | 0.006 | 1.502 | 0.559 | 0.681 | 1.369 | 1.581 | 0.000 | 0.871 | 16.318 | n/a | n/a | 0.060 | 7.359 | 0.261 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000447 | 26.279 | 4.173 | 0.363 | 0.260 | 0.065 | 1.436 | 8.747 | 0.035 | 0.000 | 0.198 | 10.967 | n/a | n/a | 0.036 | 4.860 | 0.185 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000430 | 23.632 | 5.893 | 0.044 | 0.000 | 0.897 | 2.799 | 5.176 | 0.049 | 0.000 | 0.345 | 8.370 | n/a | n/a | 0.057 | 6.835 | 0.289 | 0.057 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000444 | 22.471 | 3.390 | 0.005 | 0.000 | 1.067 | 0.620 | 1.097 | 0.024 | 0.000 | 0.606 | 15.623 | n/a | n/a | 0.038 | 4.462 | 0.199 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (26 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.466 | n/a | n/a | n/a | 16.494 | 11.807 | 0.000 | 0.000 | 0.409 | 8.253 | 0.006 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.010 | 28.501 | 0.686 | 0.010 |
| p99 | 275.655 | n/a | n/a | n/a | 52.766 | 120.453 | 8.937 | 0.000 | 180.095 | 66.442 | 54.815 | 15.312 | 1.132 | 0.000 | n/a | n/a | 0.043 | 130.676 | 1.000 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d270000000000001052 | 275.655 | 25.115 | 62.047 | 0.000 | 0.000 | 172.113 | 16.328 | 0.016 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.016 | 87.162 | 0.316 | 0.016 | node-14/thread-0/socket.queue-and-write | driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d27000000000000104d | 270.234 | 41.431 | 87.162 | 2.083 | 0.000 | 99.406 | 24.730 | 15.401 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.009 | 130.676 | 0.484 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.400ms; driver.publication 3.281ms; driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms |
| b64bc2be1b200d270000000000001046 | 235.879 | 19.875 | 7.004 | 0.000 | 0.000 | 175.164 | 8.253 | 25.559 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.015 | 26.879 | 0.114 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.400ms; driver.publication 3.281ms; driver.publication 2.264ms; client.parse 2.244ms; driver.publication 1.657ms |
| b64bc2be1b200d270000000000001042 | 234.773 | 52.766 | 53.154 | 3.863 | 0.000 | 81.162 | 14.918 | 28.895 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.009 | 109.783 | 0.468 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.400ms; driver.publication 3.519ms; driver.publication 3.281ms; driver.publication 2.264ms; driver.publication 1.657ms |
| b64bc2be1b200d270000000000001049 | 234.247 | 13.326 | 5.644 | 0.000 | 0.000 | 180.095 | 8.855 | 26.298 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.011 | 18.970 | 0.081 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.400ms; driver.publication 3.281ms; driver.publication 2.264ms; client.parse 2.244ms; driver.publication 1.657ms |
| b64bc2be1b200d270000000000000adf | 135.788 | 43.324 | 33.669 | 2.372 | 0.000 | 0.835 | 55.553 | 0.006 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.014 | 79.365 | 0.584 | 0.014 | gw-w/thread-67/gateway.admitted-work | driver.publication 1.044ms; driver.publication 1.034ms; driver.publication 1.018ms |
| b64bc2be1b200d270000000000001041 | 126.531 | 52.395 | 28.027 | 8.937 | 0.000 | 8.568 | 28.567 | 0.010 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.010 | 89.359 | 0.706 | 0.010 | node-14/thread-0/client.reach | driver.publication 4.400ms; driver.publication 3.519ms; driver.publication 3.427ms; driver.publication 3.281ms; driver.publication 2.264ms |
| b64bc2be1b200d27000000000000105b | 120.788 | 0.321 | 120.453 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 120.774 | 1.000 | 0.015 | node-14/thread-0/rpc.replica.observe | client.parse 2.244ms; driver.publication 1.477ms |
| b64bc2be1b200d2700000000000008e0 | 107.021 | 14.389 | 2.075 | 0.000 | 0.000 | 1.332 | 34.391 | 54.815 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.010 | 16.464 | 0.154 | 0.010 | gw-w/thread-48/gateway.admission-wait | driver.publication 1.191ms; driver.publication 1.083ms; driver.publication 1.050ms |
| b64bc2be1b200d27000000000000202d | 97.032 | 35.027 | 22.205 | 2.556 | 0.000 | 0.250 | 21.659 | 0.004 | 15.312 | 0.009 | 0.000 | n/a | n/a | 0.011 | 59.788 | 0.616 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.publication 1.092ms |
| b64bc2be1b200d270000000000001050 | 89.627 | 22.670 | 66.949 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 89.619 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | driver.publication 3.281ms; client.parse 1.239ms |
| b64bc2be1b200d2700000000000014b3 | 88.399 | 38.240 | 20.207 | 2.173 | 0.000 | 0.409 | 15.945 | 0.006 | 11.399 | 0.011 | 0.000 | n/a | n/a | 0.010 | 60.620 | 0.686 | 0.010 | node-14/thread-0/client.reach | none observed |
| b64bc2be1b200d270000000000000423 | 86.980 | 16.230 | 3.385 | 0.000 | 0.000 | 0.599 | 66.442 | 0.094 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.043 | 19.616 | 0.226 | 0.043 | gw-w/thread-52/gateway.admitted-work | none observed |
| b64bc2be1b200d27000000000000047d | 86.466 | 17.214 | 5.533 | 1.699 | 0.000 | 0.595 | 61.389 | 0.006 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.011 | 24.446 | 0.283 | 0.011 | gw-w/thread-48/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000008df | 80.908 | 16.494 | 4.188 | 0.000 | 0.000 | 2.381 | 56.682 | 0.009 | 0.000 | 1.132 | 0.000 | n/a | n/a | 0.023 | 20.682 | 0.256 | 0.023 | gw-w/thread-53/gateway.admitted-work | driver.publication 1.191ms; driver.publication 1.083ms; driver.publication 1.032ms |
| b64bc2be1b200d270000000000001cb1 | 65.735 | 34.209 | 20.889 | 2.155 | 0.000 | 0.653 | 7.811 | 0.005 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.006 | 57.253 | 0.871 | 0.006 | node-14/thread-0/rpc.replica.observe | driver.publication 1.417ms |
| b64bc2be1b200d270000000000000764 | 62.193 | 18.842 | 7.523 | 2.136 | 0.000 | 0.557 | 33.101 | 0.007 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.011 | 28.501 | 0.458 | 0.011 | gw-w/thread-46/gateway.admitted-work | driver.publication 1.190ms |
| b64bc2be1b200d270000000000001cb2 | 60.899 | 12.674 | 47.176 | 1.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 60.887 | 1.000 | 0.012 | node-14/thread-0/rpc.replica.observe | driver.publication 1.417ms |
| b64bc2be1b200d270000000000001787 | 60.259 | 29.686 | 18.065 | 2.495 | 0.000 | 0.268 | 6.580 | 3.152 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.007 | 50.245 | 0.834 | 0.007 | node-14/thread-0/rpc.replica.observe | none observed |
| b64bc2be1b200d270000000000000428 | 50.240 | 4.051 | 46.161 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 50.212 | 0.999 | 0.028 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.695 | 0.676 | 0.000 | 1.703 | 4.382 | 0.006 | 0.000 | 0.897 | 0.761 | 1.412 | 0.032 | 0.000 | 0.417 | 8.963 | n/a | n/a | 0.049 | 5.534 | 0.301 | 0.049 |
| p99 | 28.238 | 2.143 | 0.000 | 2.778 | 7.731 | 0.044 | 1.502 | 1.146 | 2.799 | 5.176 | 1.581 | 0.000 | 0.933 | 16.318 | n/a | n/a | 0.116 | 8.682 | 0.417 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d27000000000000042b | 28.238 | 5.292 | 0.006 | 1.502 | 0.559 | 0.681 | 1.369 | 1.581 | 0.000 | 0.871 | 16.318 | n/a | n/a | 0.060 | 7.359 | 0.261 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000430 | 23.632 | 5.893 | 0.044 | 0.000 | 0.897 | 2.799 | 5.176 | 0.049 | 0.000 | 0.345 | 8.370 | n/a | n/a | 0.057 | 6.835 | 0.289 | 0.057 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000444 | 22.471 | 3.390 | 0.005 | 0.000 | 1.067 | 0.620 | 1.097 | 0.024 | 0.000 | 0.606 | 15.623 | n/a | n/a | 0.038 | 4.462 | 0.199 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000044c | 22.194 | 4.824 | 0.010 | 0.000 | 1.031 | 0.888 | 2.628 | 0.053 | 0.000 | 0.933 | 11.749 | n/a | n/a | 0.077 | 5.866 | 0.264 | 0.077 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000427 | 21.695 | 7.731 | 0.022 | 0.000 | 0.928 | 1.548 | 1.870 | 0.032 | 0.000 | 0.484 | 8.963 | n/a | n/a | 0.116 | 8.682 | 0.400 | 0.116 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000450 | 18.383 | 4.382 | 0.007 | 0.000 | 1.146 | 0.693 | 0.939 | 0.024 | 0.000 | 0.260 | 10.884 | n/a | n/a | 0.049 | 5.534 | 0.301 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000442 | 11.547 | 4.247 | 0.006 | 0.000 | 0.558 | 0.761 | 1.412 | 0.024 | 0.000 | 0.417 | 4.073 | n/a | n/a | 0.047 | 4.811 | 0.417 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000457 | 11.218 | 3.244 | 0.004 | 0.000 | 0.315 | 0.745 | 1.496 | 0.037 | 0.000 | 0.322 | 5.012 | n/a | n/a | 0.042 | 3.564 | 0.318 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000455 | 9.970 | 2.865 | 0.005 | 0.000 | 0.796 | 0.815 | 0.909 | 0.025 | 0.000 | 0.262 | 4.259 | n/a | n/a | 0.035 | 3.666 | 0.368 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.310 | 0.353 | 0.000 | 0.712 | 4.268 | 0.013 | 0.000 | 0.127 | 1.147 | 7.216 | 0.032 | 0.000 | 0.427 | 11.776 | n/a | n/a | 0.048 | 5.007 | 0.202 | 0.048 |
| p99 | 83.680 | 2.145 | 1.707 | 5.727 | 9.464 | 1.464 | 1.622 | 1.503 | 5.919 | 29.268 | 0.072 | 0.000 | 3.604 | 49.248 | n/a | n/a | 0.123 | 10.972 | 0.459 | 0.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d27000000000000046f | 83.680 | 3.399 | 0.168 | 0.246 | 0.048 | 1.045 | 29.268 | 0.037 | 0.000 | 0.182 | 49.248 | n/a | n/a | 0.039 | 3.862 | 0.046 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000049a | 53.729 | 4.547 | 0.280 | 0.233 | 0.101 | 4.271 | 18.501 | 0.040 | 0.000 | 0.848 | 24.858 | n/a | n/a | 0.050 | 5.161 | 0.096 | 0.050 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.111ms |
| b64bc2be1b200d270000000000000466 | 49.808 | 4.803 | 0.200 | 0.428 | 0.122 | 1.392 | 18.092 | 0.030 | 0.000 | 3.433 | 21.247 | n/a | n/a | 0.062 | 5.553 | 0.111 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000045f | 44.423 | 3.550 | 0.173 | 0.269 | 0.060 | 1.143 | 15.130 | 0.036 | 0.000 | 0.180 | 23.843 | n/a | n/a | 0.039 | 4.052 | 0.091 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000045d | 38.939 | 4.904 | 0.150 | 0.000 | 0.057 | 1.849 | 9.494 | 0.038 | 0.000 | 0.185 | 22.222 | n/a | n/a | 0.039 | 5.111 | 0.131 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000049e | 38.135 | 5.781 | 0.331 | 0.512 | 0.102 | 1.676 | 15.938 | 0.052 | 0.000 | 0.979 | 12.689 | n/a | n/a | 0.075 | 6.726 | 0.176 | 0.075 | gw-w/thread-53/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000471 | 37.946 | 3.280 | 0.178 | 0.230 | 0.048 | 1.225 | 20.281 | 0.036 | 0.000 | 0.483 | 12.147 | n/a | n/a | 0.038 | 3.736 | 0.098 | 0.038 | gw-w/thread-53/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000473 | 37.544 | 4.024 | 0.181 | 0.286 | 0.057 | 1.383 | 18.743 | 0.044 | 0.000 | 1.784 | 10.987 | n/a | n/a | 0.055 | 4.548 | 0.121 | 0.055 | gw-w/thread-50/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000480 | 36.200 | 6.319 | 0.005 | 1.622 | 0.163 | 0.689 | 1.496 | 0.024 | 0.000 | 1.323 | 24.515 | n/a | n/a | 0.044 | 8.109 | 0.224 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000467 | 36.089 | 9.464 | 0.006 | 0.000 | 1.503 | 5.919 | 10.327 | 0.072 | 0.000 | 0.816 | 7.859 | n/a | n/a | 0.123 | 10.972 | 0.304 | 0.123 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000481 | 35.299 | 3.488 | 1.464 | 0.239 | 0.017 | 0.869 | 11.351 | 0.030 | 0.000 | 0.467 | 17.349 | n/a | n/a | 0.025 | 5.208 | 0.148 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.175ms |
| b64bc2be1b200d270000000000000494 | 33.562 | 3.881 | 0.215 | 0.257 | 0.104 | 1.602 | 16.472 | 0.050 | 0.000 | 0.427 | 10.504 | n/a | n/a | 0.051 | 4.457 | 0.133 | 0.051 | gw-w/thread-51/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000004a2 | 33.127 | 4.192 | 0.300 | 0.000 | 0.069 | 1.381 | 11.439 | 0.050 | 0.000 | 0.289 | 15.371 | n/a | n/a | 0.037 | 4.562 | 0.138 | 0.037 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000046b | 31.894 | 4.049 | 0.197 | 0.222 | 0.056 | 1.585 | 5.635 | 0.032 | 0.000 | 1.227 | 18.845 | n/a | n/a | 0.046 | 4.525 | 0.142 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000469 | 29.816 | 3.723 | 0.195 | 0.238 | 0.069 | 1.519 | 9.980 | 0.043 | 0.000 | 2.209 | 11.798 | n/a | n/a | 0.041 | 4.225 | 0.142 | 0.041 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000046d | 28.355 | 7.734 | 0.012 | 1.513 | 0.649 | 1.587 | 1.436 | 0.022 | 0.000 | 0.511 | 14.834 | n/a | n/a | 0.058 | 9.907 | 0.349 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000488 | 27.873 | 4.998 | 0.191 | 0.451 | 0.058 | 1.641 | 9.549 | 0.040 | 0.000 | 0.487 | 10.423 | n/a | n/a | 0.035 | 5.698 | 0.204 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000049b | 27.367 | 3.903 | 0.005 | 0.000 | 0.734 | 0.827 | 4.532 | 0.056 | 0.000 | 0.255 | 17.004 | n/a | n/a | 0.051 | 4.642 | 0.170 | 0.051 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000047b | 26.481 | 5.160 | 0.391 | 0.413 | 0.059 | 1.217 | 7.862 | 0.030 | 0.000 | 0.361 | 10.948 | n/a | n/a | 0.041 | 6.023 | 0.227 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004a5 | 26.362 | 6.619 | 0.010 | 0.000 | 0.436 | 1.150 | 1.843 | 0.049 | 0.000 | 0.304 | 15.884 | n/a | n/a | 0.067 | 7.065 | 0.268 | 0.067 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.481 | 0.464 | 0.000 | 1.554 | 3.232 | 0.005 | 0.000 | 0.725 | 0.767 | 0.966 | 0.024 | 0.000 | 0.410 | 7.005 | n/a | n/a | 0.049 | 3.809 | 0.273 | 0.049 |
| p99 | 36.089 | 1.555 | 0.000 | 2.446 | 9.464 | 0.013 | 0.000 | 1.503 | 5.919 | 10.327 | 0.072 | 0.000 | 3.604 | 12.450 | n/a | n/a | 0.123 | 10.972 | 0.442 | 0.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d270000000000000467 | 36.089 | 9.464 | 0.006 | 0.000 | 1.503 | 5.919 | 10.327 | 0.072 | 0.000 | 0.816 | 7.859 | n/a | n/a | 0.123 | 10.972 | 0.304 | 0.123 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000464 | 21.302 | 3.536 | 0.005 | 0.000 | 0.725 | 0.767 | 1.031 | 0.024 | 0.000 | 2.724 | 12.450 | n/a | n/a | 0.039 | 4.267 | 0.200 | 0.039 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000478 | 18.290 | 3.232 | 0.005 | 0.000 | 0.453 | 1.040 | 0.854 | 0.024 | 0.000 | 0.410 | 12.224 | n/a | n/a | 0.049 | 3.690 | 0.202 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004aa | 16.362 | 4.741 | 0.013 | 0.000 | 1.288 | 2.118 | 0.966 | 0.024 | 0.000 | 0.177 | 7.005 | n/a | n/a | 0.030 | 6.042 | 0.369 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000048e | 14.481 | 3.046 | 0.005 | 0.000 | 0.550 | 0.837 | 1.116 | 0.026 | 0.000 | 0.740 | 8.120 | n/a | n/a | 0.040 | 3.601 | 0.249 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000484 | 13.956 | 3.426 | 0.005 | 0.000 | 0.378 | 0.490 | 1.085 | 0.024 | 0.000 | 3.604 | 4.881 | n/a | n/a | 0.064 | 3.809 | 0.273 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004a0 | 9.705 | 3.185 | 0.005 | 0.000 | 1.097 | 0.646 | 0.868 | 0.022 | 0.000 | 0.199 | 3.634 | n/a | n/a | 0.049 | 4.286 | 0.442 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000492 | 9.399 | 2.670 | 0.005 | 0.000 | 0.912 | 0.532 | 0.831 | 0.024 | 0.000 | 0.250 | 4.111 | n/a | n/a | 0.065 | 3.587 | 0.382 | 0.065 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.263 | 0.419 | 0.000 | 0.566 | 3.593 | 0.179 | 0.000 | 0.104 | 1.057 | 4.035 | 0.031 | 0.000 | 0.282 | 11.778 | n/a | n/a | 0.043 | 4.344 | 0.212 | 0.043 |
| p99 | 64.172 | 2.873 | 0.074 | 4.919 | 9.071 | 1.410 | 0.369 | 1.072 | 2.193 | 18.508 | 0.060 | 0.000 | 3.952 | 54.979 | n/a | n/a | 0.098 | 9.870 | 0.401 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d2700000000000004ba | 64.172 | 5.703 | 0.005 | 0.000 | 0.431 | 0.682 | 2.134 | 0.023 | 0.000 | 0.161 | 54.979 | n/a | n/a | 0.053 | 6.140 | 0.096 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004b9 | 43.043 | 3.196 | 0.187 | 0.000 | 0.058 | 1.322 | 8.882 | 0.053 | 0.000 | 0.254 | 29.050 | n/a | n/a | 0.041 | 3.441 | 0.080 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004c2 | 37.299 | 4.001 | 0.266 | 0.355 | 0.053 | 1.267 | 18.508 | 0.031 | 0.000 | 0.437 | 12.339 | n/a | n/a | 0.042 | 4.676 | 0.125 | 0.042 | gw-w/thread-49/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000004e6 | 33.812 | 5.926 | 0.294 | 0.000 | 0.100 | 1.651 | 12.408 | 0.030 | 0.000 | 0.282 | 13.051 | n/a | n/a | 0.071 | 6.320 | 0.187 | 0.071 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004b2 | 33.791 | 4.052 | 0.235 | 0.000 | 0.057 | 1.019 | 12.773 | 0.033 | 0.000 | 0.237 | 15.333 | n/a | n/a | 0.053 | 4.344 | 0.129 | 0.053 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004ec | 33.787 | 5.101 | 0.203 | 0.000 | 0.071 | 2.193 | 13.464 | 0.060 | 0.000 | 0.673 | 11.980 | n/a | n/a | 0.043 | 5.375 | 0.159 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004ca | 31.633 | 8.257 | 0.341 | 0.000 | 0.100 | 1.656 | 6.843 | 0.036 | 0.000 | 0.398 | 13.932 | n/a | n/a | 0.071 | 8.698 | 0.275 | 0.071 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004d8 | 31.387 | 4.686 | 0.218 | 0.000 | 0.090 | 1.701 | 11.712 | 0.056 | 0.000 | 0.349 | 12.514 | n/a | n/a | 0.061 | 4.994 | 0.159 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004c4 | 31.358 | 4.998 | 0.189 | 0.000 | 0.060 | 1.708 | 13.507 | 0.041 | 0.000 | 0.510 | 10.301 | n/a | n/a | 0.043 | 5.248 | 0.167 | 0.043 | gw-w/thread-51/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000004e8 | 30.810 | 5.132 | 0.279 | 0.000 | 0.071 | 1.809 | 12.958 | 0.031 | 0.000 | 0.247 | 10.240 | n/a | n/a | 0.043 | 5.482 | 0.178 | 0.043 | gw-w/thread-51/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000004d6 | 29.773 | 3.551 | 0.272 | 0.000 | 0.096 | 1.601 | 8.453 | 0.031 | 0.000 | 0.172 | 15.534 | n/a | n/a | 0.062 | 3.919 | 0.132 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004e2 | 29.141 | 3.463 | 0.188 | 0.000 | 0.053 | 1.099 | 6.477 | 0.030 | 0.000 | 0.172 | 17.619 | n/a | n/a | 0.041 | 3.704 | 0.127 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004dc | 28.190 | 3.421 | 1.410 | 0.000 | 0.058 | 1.268 | 8.625 | 0.033 | 0.000 | 0.205 | 13.128 | n/a | n/a | 0.042 | 4.889 | 0.173 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004d4 | 26.470 | 3.488 | 0.203 | 0.353 | 0.072 | 1.057 | 7.912 | 0.027 | 0.000 | 0.153 | 13.148 | n/a | n/a | 0.058 | 4.115 | 0.155 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004dd | 26.254 | 7.728 | 0.005 | 0.000 | 0.923 | 0.726 | 2.316 | 0.049 | 0.000 | 0.280 | 14.191 | n/a | n/a | 0.035 | 8.656 | 0.330 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004ce | 25.689 | 3.593 | 0.216 | 0.000 | 0.106 | 1.078 | 7.924 | 0.035 | 0.000 | 1.165 | 11.506 | n/a | n/a | 0.066 | 3.915 | 0.152 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004fe | 25.540 | 3.566 | 0.179 | 0.000 | 0.055 | 0.945 | 5.026 | 0.036 | 0.000 | 3.952 | 11.741 | n/a | n/a | 0.040 | 3.800 | 0.149 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004bd | 25.352 | 4.469 | 0.009 | 0.000 | 1.006 | 1.015 | 4.035 | 0.042 | 0.000 | 0.904 | 13.817 | n/a | n/a | 0.055 | 5.484 | 0.216 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004cb | 24.587 | 9.071 | 0.011 | 0.000 | 0.788 | 1.070 | 1.337 | 0.024 | 0.000 | 0.590 | 11.599 | n/a | n/a | 0.098 | 9.870 | 0.401 | 0.098 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004c0 | 24.263 | 3.055 | 0.005 | 0.000 | 0.227 | 0.667 | 4.972 | 0.035 | 0.000 | 0.344 | 14.919 | n/a | n/a | 0.038 | 3.288 | 0.135 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.487 | 0.705 | 0.000 | 1.566 | 3.188 | 0.005 | 0.000 | 0.669 | 0.600 | 0.964 | 0.023 | 0.000 | 0.444 | 9.070 | n/a | n/a | 0.042 | 4.127 | 0.264 | 0.042 |
| p99 | 24.263 | 1.800 | 0.000 | 2.024 | 4.775 | 0.010 | 0.000 | 1.072 | 1.824 | 4.972 | 0.045 | 0.000 | 2.448 | 14.919 | n/a | n/a | 0.069 | 5.211 | 0.366 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d2700000000000004c0 | 24.263 | 3.055 | 0.005 | 0.000 | 0.227 | 0.667 | 4.972 | 0.035 | 0.000 | 0.344 | 14.919 | n/a | n/a | 0.038 | 3.288 | 0.135 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004f9 | 21.585 | 3.188 | 0.005 | 0.000 | 0.934 | 0.645 | 1.086 | 0.023 | 0.000 | 2.448 | 13.208 | n/a | n/a | 0.047 | 4.127 | 0.191 | 0.047 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004b4 | 19.308 | 4.111 | 0.010 | 0.000 | 0.972 | 0.580 | 1.306 | 0.027 | 0.000 | 0.456 | 11.778 | n/a | n/a | 0.069 | 5.093 | 0.264 | 0.069 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004b0 | 16.800 | 3.212 | 0.005 | 0.000 | 1.072 | 0.600 | 1.081 | 0.023 | 0.000 | 0.170 | 10.598 | n/a | n/a | 0.038 | 4.290 | 0.255 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004c8 | 16.338 | 4.775 | 0.010 | 0.000 | 0.425 | 0.652 | 0.885 | 0.025 | 0.000 | 0.444 | 9.070 | n/a | n/a | 0.051 | 5.211 | 0.319 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004f1 | 15.487 | 3.030 | 0.006 | 0.000 | 0.319 | 0.551 | 0.964 | 0.022 | 0.000 | 0.710 | 9.829 | n/a | n/a | 0.056 | 3.355 | 0.217 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004e4 | 14.132 | 3.451 | 0.005 | 0.000 | 0.832 | 0.570 | 0.918 | 0.022 | 0.000 | 0.246 | 8.023 | n/a | n/a | 0.065 | 4.289 | 0.303 | 0.065 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004d9 | 13.526 | 3.925 | 0.005 | 0.000 | 0.669 | 1.824 | 0.939 | 0.024 | 0.000 | 0.172 | 5.929 | n/a | n/a | 0.040 | 4.599 | 0.340 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004fb | 11.122 | 2.421 | 0.005 | 0.000 | 0.930 | 0.658 | 1.646 | 0.045 | 0.000 | 0.851 | 4.523 | n/a | n/a | 0.042 | 3.356 | 0.302 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004c6 | 9.702 | 2.983 | 0.005 | 0.000 | 0.561 | 0.540 | 0.788 | 0.022 | 0.000 | 0.465 | 4.298 | n/a | n/a | 0.041 | 3.549 | 0.366 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.751 | 0.402 | 0.000 | 1.261 | 3.770 | 0.017 | 0.000 | 0.104 | 1.039 | 4.792 | 0.032 | 0.000 | 0.258 | 11.107 | n/a | n/a | 0.054 | 4.306 | 0.223 | 0.054 |
| p99 | 62.297 | 2.752 | 2.940 | 4.923 | 17.265 | 2.783 | 0.000 | 2.234 | 4.004 | 20.964 | 0.097 | 33.876 | 1.456 | 37.188 | n/a | n/a | 0.277 | 18.276 | 0.418 | 0.277 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d270000000000000539 | 62.297 | 3.430 | 0.185 | 0.000 | 0.061 | 1.406 | 11.801 | 0.035 | 33.876 | 0.179 | 11.282 | n/a | n/a | 0.042 | 3.676 | 0.059 | 0.042 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b64bc2be1b200d270000000000000511 | 56.954 | 4.023 | 0.256 | 0.000 | 0.055 | 1.629 | 13.403 | 0.052 | 0.000 | 0.293 | 37.188 | n/a | n/a | 0.054 | 4.334 | 0.076 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000522 | 52.157 | 17.265 | 0.017 | 0.000 | 0.995 | 4.004 | 15.621 | 0.097 | 0.000 | 1.087 | 13.014 | n/a | n/a | 0.057 | 18.276 | 0.350 | 0.057 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000551 | 39.781 | 3.103 | 0.217 | 0.000 | 0.052 | 1.270 | 10.688 | 0.034 | 16.033 | 0.181 | 8.162 | n/a | n/a | 0.042 | 3.372 | 0.085 | 0.042 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b64bc2be1b200d270000000000000541 | 39.697 | 5.090 | 2.783 | 0.000 | 0.055 | 1.550 | 20.964 | 0.032 | 0.000 | 0.178 | 8.993 | n/a | n/a | 0.052 | 7.928 | 0.200 | 0.052 | gw-w/thread-48/gateway.admitted-work | none observed |
| b64bc2be1b200d27000000000000052d | 35.852 | 4.440 | 0.202 | 0.000 | 0.104 | 1.877 | 12.329 | 0.043 | 0.000 | 0.295 | 16.514 | n/a | n/a | 0.049 | 4.746 | 0.132 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000054b | 35.124 | 3.840 | 1.855 | 0.000 | 0.051 | 1.169 | 15.857 | 0.067 | 0.000 | 0.258 | 11.972 | n/a | n/a | 0.054 | 5.746 | 0.164 | 0.054 | gw-w/thread-52/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000504 | 33.732 | 3.085 | 0.212 | 0.000 | 0.101 | 0.984 | 10.883 | 0.057 | 0.000 | 0.798 | 17.553 | n/a | n/a | 0.059 | 3.398 | 0.101 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000507 | 32.462 | 6.999 | 0.005 | 0.000 | 2.234 | 1.079 | 3.888 | 0.022 | 0.000 | 0.469 | 17.726 | n/a | n/a | 0.041 | 9.238 | 0.285 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.002ms |
| b64bc2be1b200d27000000000000050a | 32.435 | 3.539 | 0.347 | 0.000 | 0.115 | 1.387 | 15.452 | 0.042 | 0.000 | 0.195 | 11.297 | n/a | n/a | 0.062 | 4.001 | 0.123 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000543 | 31.625 | 3.069 | 0.247 | 0.000 | 0.071 | 1.421 | 14.097 | 0.047 | 0.000 | 1.456 | 11.175 | n/a | n/a | 0.042 | 3.386 | 0.107 | 0.042 | gw-w/thread-53/gateway.admitted-work | none observed |
| b64bc2be1b200d27000000000000051f | 29.655 | 3.928 | 0.325 | 0.000 | 0.052 | 1.465 | 10.909 | 0.037 | 0.000 | 0.539 | 12.338 | n/a | n/a | 0.061 | 4.306 | 0.145 | 0.061 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000549 | 27.592 | 3.821 | 0.170 | 0.000 | 0.054 | 1.146 | 12.476 | 0.031 | 0.000 | 0.194 | 9.654 | n/a | n/a | 0.045 | 4.046 | 0.147 | 0.045 | gw-w/thread-51/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000546 | 27.214 | 5.318 | 0.007 | 0.000 | 1.217 | 1.874 | 1.090 | 0.028 | 0.000 | 0.228 | 17.377 | n/a | n/a | 0.077 | 6.542 | 0.240 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000052e | 25.933 | 8.441 | 0.006 | 0.000 | 0.244 | 0.724 | 1.206 | 0.024 | 0.000 | 0.175 | 15.028 | n/a | n/a | 0.085 | 8.691 | 0.335 | 0.085 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000050d | 25.894 | 3.199 | 0.193 | 0.000 | 0.057 | 1.352 | 8.990 | 0.031 | 0.000 | 0.394 | 11.639 | n/a | n/a | 0.039 | 3.450 | 0.133 | 0.039 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000004ff | 25.458 | 3.458 | 0.005 | 0.000 | 0.082 | 0.703 | 0.982 | 0.024 | 0.000 | 0.469 | 19.689 | n/a | n/a | 0.047 | 3.545 | 0.139 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000536 | 25.055 | 4.618 | 0.010 | 0.000 | 0.895 | 1.562 | 0.861 | 0.024 | 0.000 | 0.161 | 16.849 | n/a | n/a | 0.076 | 5.523 | 0.220 | 0.076 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000054d | 24.970 | 4.424 | 0.946 | 0.000 | 0.053 | 2.233 | 8.205 | 0.027 | 0.000 | 0.143 | 8.876 | n/a | n/a | 0.063 | 5.423 | 0.217 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000525 | 24.535 | 3.416 | 0.251 | 0.000 | 0.058 | 0.909 | 8.675 | 0.029 | 0.000 | 0.149 | 10.992 | n/a | n/a | 0.057 | 3.724 | 0.152 | 0.057 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.309 | 0.588 | 0.000 | 1.635 | 3.667 | 0.006 | 0.000 | 0.825 | 0.812 | 1.167 | 0.032 | 0.000 | 0.323 | 11.046 | n/a | n/a | 0.057 | 4.306 | 0.258 | 0.057 |
| p99 | 25.458 | 1.849 | 0.012 | 3.343 | 5.208 | 0.011 | 0.000 | 1.133 | 1.562 | 4.792 | 0.062 | 0.000 | 1.256 | 19.689 | n/a | n/a | 0.076 | 6.067 | 0.418 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d2700000000000004ff | 25.458 | 3.458 | 0.005 | 0.000 | 0.082 | 0.703 | 0.982 | 0.024 | 0.000 | 0.469 | 19.689 | n/a | n/a | 0.047 | 3.545 | 0.139 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000536 | 25.055 | 4.618 | 0.010 | 0.000 | 0.895 | 1.562 | 0.861 | 0.024 | 0.000 | 0.161 | 16.849 | n/a | n/a | 0.076 | 5.523 | 0.220 | 0.076 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000544 | 21.543 | 4.312 | 0.009 | 0.000 | 0.966 | 0.810 | 1.006 | 0.023 | 0.000 | 0.185 | 14.172 | n/a | n/a | 0.061 | 5.287 | 0.245 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000050f | 20.757 | 5.208 | 0.005 | 0.000 | 0.854 | 0.634 | 1.680 | 0.022 | 0.000 | 0.323 | 11.974 | n/a | n/a | 0.057 | 6.067 | 0.292 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000528 | 19.083 | 3.612 | 0.005 | 0.000 | 0.689 | 0.968 | 0.908 | 0.023 | 0.000 | 1.256 | 11.561 | n/a | n/a | 0.061 | 4.306 | 0.226 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000051d | 19.033 | 4.493 | 0.009 | 0.000 | 1.133 | 0.808 | 1.482 | 0.039 | 0.000 | 0.289 | 10.714 | n/a | n/a | 0.067 | 5.635 | 0.296 | 0.067 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000506 | 18.779 | 4.259 | 0.011 | 0.000 | 0.585 | 0.950 | 1.279 | 0.051 | 0.000 | 0.529 | 11.046 | n/a | n/a | 0.069 | 4.855 | 0.259 | 0.069 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000518 | 18.309 | 3.667 | 0.008 | 0.000 | 0.536 | 0.876 | 1.167 | 0.032 | 0.000 | 0.395 | 11.572 | n/a | n/a | 0.056 | 4.211 | 0.230 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000532 | 18.002 | 3.770 | 0.009 | 0.000 | 0.629 | 0.688 | 0.893 | 0.032 | 0.000 | 0.454 | 11.488 | n/a | n/a | 0.039 | 4.408 | 0.245 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000502 | 17.078 | 2.875 | 0.005 | 0.000 | 1.098 | 0.812 | 1.513 | 0.041 | 0.000 | 0.839 | 9.855 | n/a | n/a | 0.041 | 3.977 | 0.233 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000054e | 14.129 | 2.918 | 0.005 | 0.000 | 0.952 | 0.908 | 4.792 | 0.042 | 0.000 | 0.208 | 4.245 | n/a | n/a | 0.059 | 3.875 | 0.274 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000516 | 12.752 | 3.350 | 0.006 | 0.000 | 0.256 | 0.492 | 1.129 | 0.024 | 0.000 | 0.442 | 7.007 | n/a | n/a | 0.046 | 3.611 | 0.283 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000053a | 11.707 | 3.897 | 0.009 | 0.000 | 0.987 | 0.908 | 0.808 | 0.024 | 0.000 | 0.202 | 4.814 | n/a | n/a | 0.057 | 4.894 | 0.418 | 0.057 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000053e | 11.586 | 2.944 | 0.005 | 0.000 | 0.825 | 0.868 | 1.317 | 0.062 | 0.000 | 0.261 | 5.249 | n/a | n/a | 0.054 | 3.774 | 0.326 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000051a | 10.304 | 2.582 | 0.005 | 0.000 | 0.070 | 0.738 | 1.257 | 0.050 | 0.000 | 0.319 | 5.240 | n/a | n/a | 0.042 | 2.657 | 0.258 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.779 | 0.468 | 0.000 | 1.250 | 3.716 | 0.010 | 0.000 | 0.252 | 1.015 | 3.512 | 0.031 | 0.000 | 0.402 | 8.161 | n/a | n/a | 0.052 | 4.209 | 0.225 | 0.052 |
| p99 | 45.115 | 2.379 | 0.008 | 3.518 | 7.720 | 4.471 | 0.000 | 1.635 | 4.357 | 23.364 | 0.108 | 0.000 | 1.578 | 18.229 | n/a | n/a | 0.112 | 8.700 | 0.496 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d2700000000000005a2 | 45.115 | 3.257 | 4.471 | 0.000 | 0.068 | 1.144 | 23.364 | 0.031 | 0.000 | 0.402 | 12.339 | n/a | n/a | 0.040 | 7.795 | 0.173 | 0.040 | gw-w/thread-50/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000565 | 39.648 | 3.359 | 0.223 | 0.000 | 0.070 | 1.155 | 18.011 | 0.061 | 0.000 | 0.328 | 16.401 | n/a | n/a | 0.041 | 3.652 | 0.092 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000059c | 32.444 | 4.457 | 0.191 | 0.000 | 0.070 | 1.642 | 8.235 | 0.050 | 0.000 | 0.825 | 16.927 | n/a | n/a | 0.047 | 4.719 | 0.145 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000058c | 31.443 | 6.406 | 0.009 | 0.000 | 0.600 | 1.834 | 3.512 | 0.066 | 0.000 | 0.675 | 18.229 | n/a | n/a | 0.112 | 7.015 | 0.223 | 0.112 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000058b | 31.260 | 3.771 | 0.347 | 0.000 | 0.060 | 1.507 | 11.092 | 0.060 | 0.000 | 0.297 | 14.062 | n/a | n/a | 0.064 | 4.178 | 0.134 | 0.064 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000587 | 28.887 | 3.203 | 0.160 | 0.000 | 0.012 | 1.208 | 12.173 | 0.031 | 0.000 | 0.355 | 11.716 | n/a | n/a | 0.028 | 3.376 | 0.117 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005ab | 27.807 | 2.963 | 0.189 | 0.000 | 0.063 | 3.493 | 11.207 | 0.034 | 0.000 | 0.418 | 9.399 | n/a | n/a | 0.041 | 3.215 | 0.116 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000560 | 27.635 | 4.916 | 0.011 | 0.000 | 1.284 | 1.044 | 1.530 | 0.046 | 0.000 | 0.893 | 17.836 | n/a | n/a | 0.075 | 6.212 | 0.225 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000058f | 26.935 | 3.420 | 0.257 | 0.000 | 0.057 | 1.302 | 12.777 | 0.029 | 0.000 | 0.192 | 8.849 | n/a | n/a | 0.052 | 3.734 | 0.139 | 0.052 | gw-w/thread-51/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000599 | 26.557 | 3.716 | 0.281 | 0.000 | 0.067 | 1.506 | 11.261 | 0.032 | 0.000 | 0.512 | 9.139 | n/a | n/a | 0.043 | 4.064 | 0.153 | 0.043 | gw-w/thread-51/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000571 | 26.231 | 3.637 | 0.273 | 0.000 | 0.064 | 1.220 | 12.043 | 0.034 | 0.000 | 0.188 | 8.713 | n/a | n/a | 0.057 | 3.974 | 0.152 | 0.057 | gw-w/thread-53/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000579 | 26.052 | 3.852 | 0.328 | 0.000 | 0.061 | 1.448 | 7.684 | 0.029 | 0.000 | 0.209 | 12.396 | n/a | n/a | 0.046 | 4.240 | 0.163 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005b5 | 25.833 | 3.208 | 3.057 | 0.000 | 0.100 | 0.967 | 8.084 | 0.030 | 0.000 | 0.419 | 9.916 | n/a | n/a | 0.052 | 6.365 | 0.246 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000581 | 25.534 | 4.101 | 0.217 | 0.000 | 0.099 | 4.357 | 7.766 | 0.045 | 0.000 | 0.284 | 8.610 | n/a | n/a | 0.055 | 4.417 | 0.173 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000554 | 24.821 | 3.558 | 0.310 | 0.000 | 0.085 | 1.183 | 8.159 | 0.027 | 0.000 | 0.394 | 11.045 | n/a | n/a | 0.060 | 3.953 | 0.159 | 0.060 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000575 | 24.819 | 3.075 | 0.190 | 0.000 | 0.056 | 1.015 | 12.087 | 0.035 | 0.000 | 0.201 | 8.116 | n/a | n/a | 0.043 | 3.321 | 0.134 | 0.043 | gw-w/thread-48/gateway.admitted-work | none observed |
| b64bc2be1b200d27000000000000056d | 24.177 | 3.254 | 0.194 | 0.000 | 0.053 | 1.143 | 9.422 | 0.044 | 0.000 | 0.235 | 9.793 | n/a | n/a | 0.039 | 3.501 | 0.145 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000059a | 23.513 | 5.211 | 0.009 | 0.000 | 1.099 | 2.209 | 11.823 | 0.042 | 0.000 | 0.495 | 2.567 | n/a | n/a | 0.057 | 6.320 | 0.269 | 0.057 | gw-w/thread-46/storage/begin-command! | none observed |
| b64bc2be1b200d2700000000000005a6 | 23.162 | 3.647 | 0.006 | 0.000 | 1.004 | 0.779 | 1.401 | 0.032 | 0.000 | 0.406 | 15.846 | n/a | n/a | 0.040 | 4.657 | 0.201 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005b1 | 21.960 | 3.152 | 0.211 | 0.000 | 0.106 | 1.144 | 8.210 | 0.027 | 0.000 | 0.413 | 8.625 | n/a | n/a | 0.072 | 3.469 | 0.158 | 0.072 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.139 | 0.492 | 0.000 | 1.425 | 3.361 | 0.005 | 0.000 | 0.559 | 0.807 | 1.099 | 0.025 | 0.000 | 0.432 | 4.803 | n/a | n/a | 0.043 | 3.844 | 0.310 | 0.043 |
| p99 | 27.635 | 2.379 | 0.000 | 2.452 | 5.594 | 0.011 | 0.000 | 1.635 | 3.774 | 11.823 | 0.108 | 0.000 | 1.578 | 17.836 | n/a | n/a | 0.075 | 6.320 | 0.465 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d270000000000000560 | 27.635 | 4.916 | 0.011 | 0.000 | 1.284 | 1.044 | 1.530 | 0.046 | 0.000 | 0.893 | 17.836 | n/a | n/a | 0.075 | 6.212 | 0.225 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000059a | 23.513 | 5.211 | 0.009 | 0.000 | 1.099 | 2.209 | 11.823 | 0.042 | 0.000 | 0.495 | 2.567 | n/a | n/a | 0.057 | 6.320 | 0.269 | 0.057 | gw-w/thread-46/storage/begin-command! | none observed |
| b64bc2be1b200d27000000000000055c | 21.638 | 2.853 | 0.005 | 0.000 | 1.083 | 0.748 | 1.447 | 0.041 | 0.000 | 0.246 | 15.178 | n/a | n/a | 0.038 | 3.941 | 0.182 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005a8 | 18.357 | 2.896 | 0.006 | 0.000 | 0.529 | 0.807 | 5.503 | 0.108 | 0.000 | 0.273 | 8.196 | n/a | n/a | 0.041 | 3.430 | 0.187 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000553 | 18.185 | 5.594 | 0.005 | 0.000 | 0.447 | 3.649 | 5.236 | 0.041 | 0.000 | 0.381 | 2.774 | n/a | n/a | 0.058 | 6.046 | 0.333 | 0.058 | gw-w/thread-51/commit.prepare-and-validate | none observed |
| b64bc2be1b200d270000000000000557 | 17.204 | 5.525 | 0.010 | 0.000 | 0.131 | 0.868 | 0.992 | 0.025 | 0.000 | 0.468 | 9.117 | n/a | n/a | 0.067 | 5.666 | 0.329 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000057b | 14.060 | 2.867 | 0.005 | 0.000 | 0.164 | 0.428 | 0.643 | 0.019 | 0.000 | 0.147 | 9.740 | n/a | n/a | 0.047 | 3.036 | 0.216 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.163ms |
| b64bc2be1b200d270000000000000596 | 13.694 | 2.815 | 0.005 | 0.000 | 0.606 | 3.774 | 0.837 | 0.023 | 0.000 | 0.153 | 5.436 | n/a | n/a | 0.043 | 3.427 | 0.250 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000572 | 12.139 | 3.361 | 0.006 | 0.000 | 0.398 | 0.629 | 1.489 | 0.039 | 0.000 | 0.375 | 5.780 | n/a | n/a | 0.061 | 3.766 | 0.310 | 0.061 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005a0 | 12.111 | 3.990 | 0.009 | 0.000 | 1.635 | 0.561 | 0.673 | 0.022 | 0.000 | 1.578 | 3.602 | n/a | n/a | 0.042 | 5.633 | 0.465 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000568 | 11.536 | 2.482 | 0.005 | 0.000 | 0.814 | 1.877 | 1.268 | 0.036 | 0.000 | 0.493 | 4.524 | n/a | n/a | 0.039 | 3.300 | 0.286 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000590 | 11.277 | 2.790 | 0.004 | 0.000 | 1.049 | 0.748 | 1.491 | 0.047 | 0.000 | 0.315 | 4.803 | n/a | n/a | 0.029 | 3.844 | 0.341 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005af | 11.181 | 4.420 | 0.007 | 0.000 | 0.478 | 0.617 | 0.833 | 0.024 | 0.000 | 0.432 | 4.297 | n/a | n/a | 0.073 | 4.905 | 0.439 | 0.073 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000592 | 11.180 | 3.402 | 0.005 | 0.000 | 0.419 | 0.811 | 1.099 | 0.024 | 0.000 | 0.936 | 4.453 | n/a | n/a | 0.034 | 3.825 | 0.342 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005b3 | 10.799 | 2.583 | 0.005 | 0.000 | 0.915 | 0.605 | 0.963 | 0.025 | 0.000 | 0.459 | 5.201 | n/a | n/a | 0.043 | 3.503 | 0.324 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000585 | 10.702 | 3.729 | 0.009 | 0.000 | 0.559 | 1.037 | 0.857 | 0.023 | 0.000 | 0.447 | 4.000 | n/a | n/a | 0.041 | 4.297 | 0.401 | 0.041 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.089 | 0.359 | 0.000 | 1.203 | 3.404 | 0.011 | 0.000 | 0.118 | 0.969 | 2.793 | 0.037 | 0.000 | 0.247 | 8.191 | n/a | n/a | 0.046 | 4.140 | 0.218 | 0.046 |
| p99 | 57.599 | 2.090 | 0.042 | 3.247 | 5.996 | n/a | 0.000 | 1.094 | 3.428 | 22.272 | 1.718 | 16.443 | 1.374 | 32.058 | n/a | n/a | 0.107 | 8.152 | 0.441 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d2700000000000005c6 | 57.599 | 3.404 | 0.226 | 0.000 | 0.100 | 1.275 | 22.272 | 0.042 | 16.443 | 0.210 | 13.566 | n/a | n/a | 0.061 | 3.730 | 0.065 | 0.061 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b64bc2be1b200d2700000000000005c1 | 41.485 | 5.996 | 0.011 | 0.000 | 0.975 | 0.707 | 1.186 | 0.023 | 0.000 | 0.488 | 32.058 | n/a | n/a | 0.041 | 6.982 | 0.168 | 0.041 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005f0 | 40.139 | 4.112 | 0.191 | 0.000 | 0.091 | 1.396 | 21.658 | 0.045 | 0.000 | 1.262 | 11.331 | n/a | n/a | 0.052 | 4.394 | 0.109 | 0.052 | gw-w/thread-49/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000005bb | 35.467 | 3.393 | 0.311 | 0.000 | 0.053 | 1.871 | 18.915 | 0.057 | 0.000 | 0.532 | 10.295 | n/a | n/a | 0.040 | 3.757 | 0.106 | 0.040 | gw-w/thread-53/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000609 | 34.893 | 3.464 | 0.240 | 0.000 | 0.062 | 1.677 | 15.234 | 0.052 | 0.000 | 1.374 | 12.743 | n/a | n/a | 0.046 | 3.767 | 0.108 | 0.046 | gw-w/thread-46/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000005fe | 30.979 | 3.369 | 0.182 | 0.000 | 0.064 | 1.086 | 10.214 | 0.043 | 0.000 | 0.760 | 15.208 | n/a | n/a | 0.052 | 3.615 | 0.117 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005cc | 29.454 | 3.042 | 0.186 | 0.000 | 0.068 | 1.375 | 13.394 | 0.055 | 0.000 | 0.305 | 10.987 | n/a | n/a | 0.043 | 3.296 | 0.112 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005ec | 28.536 | 3.195 | 0.230 | 0.000 | 0.064 | 1.122 | 16.998 | 0.036 | 0.000 | 0.172 | 6.670 | n/a | n/a | 0.049 | 3.489 | 0.122 | 0.049 | gw-w/thread-51/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000005ce | 27.929 | 4.701 | 0.235 | 0.000 | 0.098 | 1.460 | 11.889 | 0.029 | 0.000 | 0.222 | 9.232 | n/a | n/a | 0.062 | 5.034 | 0.180 | 0.062 | gw-w/thread-50/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000601 | 27.294 | 3.882 | 0.348 | 0.000 | 0.070 | 1.500 | 12.187 | 0.040 | 0.000 | 0.549 | 8.661 | n/a | n/a | 0.058 | 4.299 | 0.158 | 0.058 | gw-w/thread-46/gateway.admitted-work | none observed |
| b64bc2be1b200d270000000000000603 | 27.165 | 3.157 | 4.892 | 0.000 | 0.104 | 1.087 | 7.811 | 0.040 | 0.000 | 0.390 | 9.627 | n/a | n/a | 0.056 | 8.152 | 0.300 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005e4 | 25.665 | 3.344 | 0.005 | 0.000 | 0.792 | 0.470 | 1.199 | 0.023 | 0.000 | 0.237 | 19.543 | n/a | n/a | 0.052 | 4.140 | 0.161 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005e6 | 25.395 | 2.897 | 0.195 | 0.000 | 0.118 | 0.961 | 11.959 | 0.028 | 0.000 | 0.204 | 8.976 | n/a | n/a | 0.055 | 3.210 | 0.126 | 0.055 | gw-w/thread-50/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000005d8 | 23.281 | 3.003 | 0.190 | 0.000 | 0.061 | 1.115 | 8.158 | 0.052 | 0.000 | 0.247 | 10.411 | n/a | n/a | 0.046 | 3.253 | 0.140 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005dc | 23.183 | 3.783 | 0.198 | 0.000 | 0.063 | 1.944 | 8.024 | 0.049 | 0.000 | 0.270 | 8.800 | n/a | n/a | 0.053 | 4.044 | 0.174 | 0.053 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005e0 | 22.800 | 3.903 | 0.201 | 0.000 | 0.060 | 1.246 | 8.291 | 0.047 | 0.000 | 0.162 | 8.836 | n/a | n/a | 0.053 | 4.164 | 0.183 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000060b | 22.574 | 4.643 | 0.208 | 0.000 | 0.061 | 1.456 | 7.241 | 0.033 | 0.000 | 0.161 | 8.725 | n/a | n/a | 0.047 | 4.912 | 0.218 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005e8 | 21.388 | 3.901 | 0.297 | 0.000 | 0.063 | 1.452 | 7.074 | 0.028 | 0.000 | 0.337 | 8.191 | n/a | n/a | 0.043 | 4.261 | 0.199 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005f1 | 21.244 | 3.220 | 0.005 | 0.000 | 1.051 | 0.779 | 1.350 | 1.718 | 0.000 | 0.272 | 12.814 | n/a | n/a | 0.035 | 4.276 | 0.201 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005f4 | 20.752 | 3.191 | 0.193 | 0.000 | 0.060 | 0.969 | 7.341 | 0.048 | 0.000 | 0.338 | 8.567 | n/a | n/a | 0.044 | 3.444 | 0.166 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.994 | 0.509 | 0.000 | 1.502 | 3.324 | 0.005 | 0.000 | 0.737 | 0.750 | 1.063 | 0.027 | 0.000 | 0.238 | 6.384 | n/a | n/a | 0.042 | 4.110 | 0.320 | 0.042 |
| p99 | 21.244 | 1.226 | 0.000 | 3.247 | 4.730 | n/a | 0.000 | 1.094 | 1.105 | 10.914 | 1.718 | 0.000 | 0.789 | 12.814 | n/a | n/a | 0.107 | 5.819 | 0.441 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d2700000000000005f1 | 21.244 | 3.220 | 0.005 | 0.000 | 1.051 | 0.779 | 1.350 | 1.718 | 0.000 | 0.272 | 12.814 | n/a | n/a | 0.035 | 4.276 | 0.201 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005f5 | 15.643 | 4.730 | 0.008 | 0.000 | 1.081 | 0.750 | 0.840 | 0.037 | 0.000 | 0.167 | 7.924 | n/a | n/a | 0.107 | 5.819 | 0.372 | 0.107 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005d9 | 15.003 | 4.662 | 0.005 | 0.000 | 0.821 | 0.584 | 1.063 | 0.027 | 0.000 | 0.170 | 7.633 | n/a | n/a | 0.037 | 5.489 | 0.366 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005b8 | 14.408 | 2.518 | 0.005 | 0.000 | 0.248 | 0.574 | 1.407 | 0.038 | 0.000 | 0.789 | 8.789 | n/a | n/a | 0.039 | 2.771 | 0.192 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000600 | 13.715 | 1.494 | n/a | 0.000 | 0.090 | 1.105 | 10.914 | 0.026 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.042 | 1.584 | 0.116 | 0.042 | gw-w/thread-49/gateway.admitted-work | none observed |
| b64bc2be1b200d2700000000000005e1 | 13.691 | 3.441 | 0.005 | 0.000 | 0.900 | 0.816 | 1.395 | 0.045 | 0.000 | 0.412 | 6.640 | n/a | n/a | 0.037 | 4.346 | 0.317 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005fb | 13.313 | 3.324 | 0.004 | 0.000 | 1.094 | 0.662 | 1.342 | 0.040 | 0.000 | 0.247 | 6.519 | n/a | n/a | 0.081 | 4.422 | 0.332 | 0.081 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005c7 | 12.994 | 3.021 | 0.007 | 0.000 | 0.671 | 0.817 | 1.702 | 0.041 | 0.000 | 0.283 | 6.384 | n/a | n/a | 0.067 | 3.699 | 0.285 | 0.067 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005d6 | 12.748 | 3.179 | 0.005 | 0.000 | 0.437 | 0.725 | 0.912 | 0.024 | 0.000 | 0.232 | 7.183 | n/a | n/a | 0.051 | 3.621 | 0.284 | 0.051 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005cf | 12.519 | 3.406 | 0.004 | 0.000 | 0.548 | 0.718 | 1.362 | 0.040 | 0.000 | 0.319 | 6.053 | n/a | n/a | 0.068 | 3.959 | 0.316 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005ea | 11.964 | 3.200 | 0.004 | 0.000 | 0.622 | 0.858 | 0.949 | 0.025 | 0.000 | 0.190 | 6.075 | n/a | n/a | 0.041 | 3.826 | 0.320 | 0.041 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005ee | 11.595 | 3.368 | 0.005 | 0.000 | 0.737 | 0.755 | 1.009 | 0.023 | 0.000 | 0.169 | 5.490 | n/a | n/a | 0.039 | 4.110 | 0.354 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005d1 | 10.425 | 2.550 | 0.005 | 0.000 | 0.905 | 0.596 | 0.809 | 0.025 | 0.000 | 0.238 | 5.254 | n/a | n/a | 0.042 | 3.460 | 0.332 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005f9 | 10.067 | 3.594 | 0.008 | 0.000 | 0.836 | 0.786 | 0.757 | 0.022 | 0.000 | 0.270 | 3.742 | n/a | n/a | 0.052 | 4.438 | 0.441 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000005b6 | 9.757 | 4.166 | 0.010 | 0.000 | 0.099 | 0.602 | 0.874 | 0.027 | 0.000 | 0.146 | 3.783 | n/a | n/a | 0.050 | 4.275 | 0.438 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.562 | 0.741 | 0.000 | 1.600 | 3.508 | 0.006 | 0.000 | 0.707 | 0.759 | 1.202 | 0.028 | 0.000 | 0.272 | 7.177 | n/a | n/a | 0.039 | 4.453 | 0.303 | 0.039 |
| p99 | 68.102 | 2.701 | 1.168 | 5.038 | 10.114 | 2.049 | 0.000 | 21.238 | 10.423 | 12.014 | 4.341 | 0.000 | 4.306 | 40.282 | n/a | n/a | 0.097 | 23.589 | 0.712 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d2700000000000008e4 | 111.288 | 2.031 | n/a | 0.000 | 0.674 | 18.274 | 8.143 | 82.079 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.053 | 2.706 | 0.024 | 0.053 | gw-w/thread-52/gateway.admission-wait | driver.publication 1.191ms; driver.publication 1.174ms; driver.publication 1.158ms; driver.publication 1.083ms; driver.publication 1.050ms |
| b64bc2be1b200d270000000000000ae7 | 88.094 | 9.463 | 0.008 | 2.054 | 0.205 | 68.547 | 1.472 | 0.024 | 0.000 | 0.671 | 5.577 | n/a | n/a | 0.073 | 11.730 | 0.133 | 0.073 | node-14/thread-0/socket.wait-first-byte | client.parse 1.595ms |
| b64bc2be1b200d270000000000000ae9 | 84.806 | 5.949 | 0.925 | 0.000 | 61.739 | 0.496 | 0.550 | 2.821 | 0.000 | 0.124 | 12.163 | n/a | n/a | 0.039 | 68.614 | 0.809 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 3.702ms; driver.publication 1.584ms; driver.publication 1.359ms |
| b64bc2be1b200d270000000000000ae8 | 84.518 | 4.583 | 0.010 | 0.000 | 64.338 | 4.036 | 1.056 | 0.033 | 0.000 | 0.673 | 9.734 | n/a | n/a | 0.055 | 68.931 | 0.816 | 0.055 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 3.702ms; driver.publication 1.584ms |
| b64bc2be1b200d2700000000000007d8 | 76.510 | 3.404 | 0.006 | 0.000 | 51.084 | 1.096 | 4.234 | 0.047 | 0.000 | 1.564 | 15.045 | n/a | n/a | 0.030 | 54.493 | 0.712 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.767ms; driver.publication 1.489ms; driver.publication 1.470ms; driver.publication 1.448ms; driver.publication 1.175ms |
| b64bc2be1b200d2700000000000007d6 | 71.729 | 8.356 | 0.325 | 0.000 | 1.766 | 2.286 | 0.816 | 0.016 | 0.000 | 4.012 | 54.114 | n/a | n/a | 0.038 | 10.447 | 0.146 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.470ms; driver.publication 1.448ms; driver.publication 1.175ms |
| b64bc2be1b200d2700000000000007d4 | 70.313 | 3.047 | 0.005 | 0.000 | 3.729 | 1.483 | 2.914 | 0.055 | 0.000 | 2.069 | 56.979 | n/a | n/a | 0.030 | 6.782 | 0.096 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.470ms; driver.publication 1.448ms; driver.publication 1.030ms |
| b64bc2be1b200d2700000000000007d7 | 70.232 | 3.496 | 0.005 | 0.000 | 0.997 | 4.282 | 7.860 | 0.028 | 0.000 | 0.140 | 53.373 | n/a | n/a | 0.051 | 4.498 | 0.064 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.489ms; driver.publication 1.470ms; driver.publication 1.448ms; driver.publication 1.175ms |
| b64bc2be1b200d2700000000000007d0 | 68.102 | 7.397 | 0.224 | 0.000 | 2.739 | 1.507 | 3.811 | 0.042 | 0.000 | 0.380 | 51.977 | n/a | n/a | 0.024 | 10.360 | 0.152 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.448ms; driver.publication 1.386ms; driver.publication 1.336ms; driver.publication 1.030ms |
| b64bc2be1b200d2700000000000007d5 | 64.976 | 7.555 | 0.012 | 0.000 | 1.060 | 1.760 | 2.037 | 0.085 | 0.000 | 0.272 | 52.133 | n/a | n/a | 0.063 | 8.626 | 0.133 | 0.063 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.470ms; driver.publication 1.448ms; driver.publication 1.175ms |
| b64bc2be1b200d2700000000000006f0 | 57.859 | 3.008 | 0.004 | 0.000 | 0.436 | 0.443 | 5.427 | 0.039 | 0.000 | 0.195 | 48.251 | n/a | n/a | 0.054 | 3.448 | 0.060 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d27000000000000062d | 56.601 | 3.127 | 1.030 | 0.000 | 0.012 | 1.108 | 31.797 | 0.039 | 0.000 | 0.346 | 19.120 | n/a | n/a | 0.022 | 4.169 | 0.074 | 0.022 | gw-w/thread-53/gateway.admitted-work | driver.publication 2.230ms; driver.publication 1.190ms; driver.publication 1.141ms |
| b64bc2be1b200d2700000000000006d0 | 53.845 | 7.748 | 0.092 | 0.000 | 1.765 | 2.883 | 0.947 | 0.015 | 0.000 | 0.070 | 40.282 | n/a | n/a | 0.042 | 9.605 | 0.178 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.308ms |
| b64bc2be1b200d270000000000000a74 | 52.153 | 1.740 | n/a | 0.000 | 0.473 | 15.810 | 34.026 | 0.024 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.046 | 2.212 | 0.042 | 0.046 | gw-w/thread-49/gateway.admitted-work | driver.publication 1.762ms; driver.publication 1.293ms; driver.publication 1.086ms; driver.publication 1.059ms; driver.publication 1.039ms |
| b64bc2be1b200d270000000000000b4b | 51.423 | 8.064 | 0.008 | 0.000 | 0.212 | 9.617 | 5.077 | 1.187 | 0.000 | 0.428 | 26.780 | n/a | n/a | 0.049 | 8.285 | 0.161 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.582ms; driver.publication 1.216ms; driver.publication 1.198ms; driver.publication 1.101ms; driver.publication 1.087ms |
| b64bc2be1b200d2700000000000007cf | 51.276 | 5.008 | 0.007 | 0.000 | 4.575 | 2.847 | 2.062 | 0.025 | 0.000 | 0.115 | 36.605 | n/a | n/a | 0.031 | 9.591 | 0.187 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.386ms; driver.publication 1.336ms; driver.publication 1.030ms; driver.publication 0.854ms |
| b64bc2be1b200d270000000000000b4a | 51.166 | 5.709 | 0.004 | 0.000 | 22.070 | 0.473 | 2.884 | 0.041 | 0.000 | 0.648 | 19.294 | n/a | n/a | 0.043 | 27.783 | 0.543 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 1.216ms; driver.publication 1.198ms; driver.publication 1.101ms; driver.publication 1.087ms |
| b64bc2be1b200d270000000000000669 | 50.663 | 3.068 | 0.011 | 0.000 | 0.842 | 0.585 | 0.987 | 0.025 | 0.000 | 0.226 | 44.885 | n/a | n/a | 0.034 | 3.920 | 0.077 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000006cf | 49.913 | 4.521 | 0.007 | 0.000 | 1.779 | 1.502 | 0.836 | 0.026 | 0.000 | 0.156 | 41.046 | n/a | n/a | 0.039 | 6.307 | 0.126 | 0.039 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 0.350ms |
| b64bc2be1b200d2700000000000007f9 | 49.881 | 5.231 | 0.005 | 0.000 | 3.642 | 0.943 | 1.624 | 0.030 | 0.000 | 0.202 | 38.171 | n/a | n/a | 0.032 | 8.879 | 0.178 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.704ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.918 | 0.613 | 0.000 | 1.467 | 3.080 | 0.005 | 0.000 | 0.756 | 0.738 | 0.991 | 0.027 | 0.000 | 0.260 | 6.729 | n/a | n/a | 0.038 | 4.027 | 0.299 | 0.038 |
| p99 | 57.859 | 2.245 | 1.938 | 4.385 | 6.995 | 0.886 | 0.000 | 23.844 | 10.770 | 8.176 | 2.879 | 0.000 | 4.306 | 41.046 | n/a | n/a | 0.090 | 26.662 | 0.762 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d270000000000000ae9 | 84.806 | 5.949 | 0.925 | 0.000 | 61.739 | 0.496 | 0.550 | 2.821 | 0.000 | 0.124 | 12.163 | n/a | n/a | 0.039 | 68.614 | 0.809 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 3.702ms; driver.publication 1.584ms; driver.publication 1.359ms |
| b64bc2be1b200d270000000000000ae8 | 84.518 | 4.583 | 0.010 | 0.000 | 64.338 | 4.036 | 1.056 | 0.033 | 0.000 | 0.673 | 9.734 | n/a | n/a | 0.055 | 68.931 | 0.816 | 0.055 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 3.702ms; driver.publication 1.584ms |
| b64bc2be1b200d2700000000000007d6 | 71.729 | 8.356 | 0.325 | 0.000 | 1.766 | 2.286 | 0.816 | 0.016 | 0.000 | 4.012 | 54.114 | n/a | n/a | 0.038 | 10.447 | 0.146 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.470ms; driver.publication 1.448ms; driver.publication 1.175ms |
| b64bc2be1b200d2700000000000007d7 | 70.232 | 3.496 | 0.005 | 0.000 | 0.997 | 4.282 | 7.860 | 0.028 | 0.000 | 0.140 | 53.373 | n/a | n/a | 0.051 | 4.498 | 0.064 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.489ms; driver.publication 1.470ms; driver.publication 1.448ms; driver.publication 1.175ms |
| b64bc2be1b200d2700000000000006f0 | 57.859 | 3.008 | 0.004 | 0.000 | 0.436 | 0.443 | 5.427 | 0.039 | 0.000 | 0.195 | 48.251 | n/a | n/a | 0.054 | 3.448 | 0.060 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000a74 | 52.153 | 1.740 | n/a | 0.000 | 0.473 | 15.810 | 34.026 | 0.024 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.046 | 2.212 | 0.042 | 0.046 | gw-w/thread-49/gateway.admitted-work | driver.publication 1.762ms; driver.publication 1.293ms; driver.publication 1.086ms; driver.publication 1.059ms; driver.publication 1.039ms |
| b64bc2be1b200d270000000000000669 | 50.663 | 3.068 | 0.011 | 0.000 | 0.842 | 0.585 | 0.987 | 0.025 | 0.000 | 0.226 | 44.885 | n/a | n/a | 0.034 | 3.920 | 0.077 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000006cf | 49.913 | 4.521 | 0.007 | 0.000 | 1.779 | 1.502 | 0.836 | 0.026 | 0.000 | 0.156 | 41.046 | n/a | n/a | 0.039 | 6.307 | 0.126 | 0.039 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 0.350ms |
| b64bc2be1b200d27000000000000066a | 46.789 | 2.760 | 0.005 | 0.000 | 0.695 | 0.441 | 5.485 | 0.033 | 0.000 | 1.006 | 36.329 | n/a | n/a | 0.036 | 3.459 | 0.074 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d270000000000000b47 | 45.947 | 2.815 | 0.003 | 0.000 | 23.844 | 0.404 | 0.771 | 0.023 | 0.000 | 2.803 | 15.255 | n/a | n/a | 0.030 | 26.662 | 0.580 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.216ms; driver.publication 1.198ms; driver.publication 1.087ms |
| b64bc2be1b200d2700000000000006a3 | 44.104 | 4.130 | 0.008 | 0.000 | 32.288 | 0.721 | 0.835 | 0.025 | 0.000 | 0.456 | 5.577 | n/a | n/a | 0.064 | 36.426 | 0.826 | 0.064 | node-14/thread-0/driver.queue.subject | driver.publication 2.394ms; driver.publication 1.336ms; driver.publication 1.288ms; driver.publication 1.139ms; driver.publication 1.038ms |
| b64bc2be1b200d2700000000000006d1 | 42.171 | 3.000 | 0.009 | 0.000 | 0.916 | 5.552 | 1.310 | 0.042 | 0.000 | 0.261 | 31.035 | n/a | n/a | 0.046 | 3.925 | 0.093 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.768ms; driver.publication 1.308ms; driver.publication 1.110ms |
| b64bc2be1b200d2700000000000008e9 | 41.895 | 2.314 | 0.005 | 0.000 | 7.884 | 10.770 | 2.850 | 0.050 | 0.000 | 2.607 | 15.352 | n/a | n/a | 0.064 | 10.202 | 0.244 | 0.064 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.158ms; driver.publication 1.050ms |
| b64bc2be1b200d27000000000000079c | 41.559 | 6.081 | 0.003 | 0.000 | 1.138 | 7.418 | 2.657 | 0.805 | 0.000 | 0.564 | 22.872 | n/a | n/a | 0.021 | 7.222 | 0.174 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.441ms; client.encode 1.131ms; driver.publication 1.107ms; driver.publication 1.015ms |
| b64bc2be1b200d2700000000000008d7 | 41.257 | 2.712 | 0.005 | 0.000 | 31.428 | 0.490 | 0.900 | 0.025 | 0.000 | 0.619 | 5.037 | n/a | n/a | 0.041 | 34.145 | 0.828 | 0.041 | node-14/thread-0/driver.queue.subject | driver.publication 8.999ms |
| b64bc2be1b200d270000000000000aea | 41.229 | 5.450 | 1.252 | 0.000 | 15.381 | 0.624 | 3.799 | 0.050 | 0.000 | 0.757 | 13.893 | n/a | n/a | 0.024 | 22.083 | 0.536 | 0.024 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 3.702ms; driver.publication 1.584ms; driver.publication 1.359ms; driver.publication 1.213ms |
| b64bc2be1b200d27000000000000062c | 40.979 | 2.802 | 0.004 | 0.000 | 0.348 | 1.840 | 1.372 | 0.044 | 0.000 | 0.350 | 34.190 | n/a | n/a | 0.029 | 3.155 | 0.077 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b64bc2be1b200d2700000000000007c8 | 40.082 | 2.351 | 0.005 | 0.000 | 5.970 | 12.510 | 0.749 | 2.390 | 0.000 | 0.060 | 16.019 | n/a | n/a | 0.028 | 8.326 | 0.208 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.556ms; driver.publication 1.386ms; driver.publication 1.375ms; driver.publication 1.336ms |
| b64bc2be1b200d27000000000000071d | 39.604 | 5.756 | 0.033 | 0.000 | 0.599 | 4.100 | 12.014 | 0.081 | 0.000 | 4.610 | 12.372 | n/a | n/a | 0.040 | 6.388 | 0.161 | 0.040 | gw-w/thread-51/gateway.admitted-work | driver.publication 1.195ms |
| b64bc2be1b200d2700000000000009b7 | 36.137 | 2.521 | 0.006 | 0.000 | 1.088 | 0.561 | 0.762 | 0.024 | 0.000 | 0.169 | 30.967 | n/a | n/a | 0.038 | 3.615 | 0.100 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.099 | 0.691 | 0.000 | 1.549 | 3.373 | 0.005 | 0.000 | 0.717 | 0.657 | 1.079 | 0.027 | 0.000 | 0.189 | 5.987 | n/a | n/a | 0.033 | 4.325 | 0.333 | 0.033 |
| p99 | 69.922 | 2.702 | 1.595 | 4.631 | 9.930 | 1.774 | 0.000 | 25.626 | 12.120 | 10.110 | 2.702 | 0.000 | 3.058 | 26.691 | n/a | n/a | 0.086 | 32.233 | 0.734 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d270000000000001055 | 229.116 | 3.750 | 44.734 | 0.000 | 163.164 | 4.769 | 5.299 | 0.015 | 0.000 | 0.952 | 6.402 | n/a | n/a | 0.031 | 211.649 | 0.924 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d27000000000000105d | 206.399 | 2.688 | 39.208 | 0.000 | 145.451 | 1.088 | 3.175 | 4.015 | 0.000 | 0.267 | 10.481 | n/a | n/a | 0.025 | 187.347 | 0.908 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d270000000000001060 | 201.129 | 2.616 | 0.004 | 0.000 | 185.560 | 3.833 | 0.718 | 0.030 | 0.000 | 0.146 | 8.194 | n/a | n/a | 0.029 | 188.179 | 0.936 | 0.029 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.198ms; driver.publication 1.098ms; driver.publication 1.078ms |
| b64bc2be1b200d27000000000000105e | 198.755 | 3.532 | 36.414 | 0.000 | 137.618 | 3.903 | 0.745 | 4.742 | 0.000 | 0.047 | 11.727 | n/a | n/a | 0.028 | 177.564 | 0.893 | 0.028 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d270000000000001062 | 193.023 | 2.928 | 0.009 | 0.000 | 180.772 | 0.543 | 0.851 | 0.028 | 0.000 | 0.487 | 7.376 | n/a | n/a | 0.028 | 183.709 | 0.952 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.276ms; driver.publication 1.198ms; driver.publication 1.193ms |
| b64bc2be1b200d270000000000001051 | 189.062 | 4.108 | 0.005 | 0.000 | 1.462 | 167.007 | 0.904 | 0.029 | 0.000 | 0.115 | 15.386 | n/a | n/a | 0.047 | 5.575 | 0.029 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.281ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; client.parse 1.239ms |
| b64bc2be1b200d270000000000001053 | 181.499 | 7.057 | 0.018 | 0.000 | 36.030 | 121.495 | 5.238 | 0.045 | 0.000 | 2.061 | 9.530 | n/a | n/a | 0.026 | 43.105 | 0.237 | 0.026 | node-14/thread-0/socket.wait-first-byte | client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d270000000000001054 | 171.231 | 11.917 | 1.774 | 0.000 | 21.152 | 107.767 | 3.743 | 0.076 | 0.000 | 7.079 | 17.687 | n/a | n/a | 0.036 | 34.843 | 0.203 | 0.036 | node-14/thread-0/socket.wait-first-byte | client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d270000000000001056 | 160.703 | 9.494 | 2.091 | 0.000 | 9.382 | 107.530 | 1.247 | 11.560 | 0.000 | 0.188 | 19.192 | n/a | n/a | 0.020 | 20.967 | 0.130 | 0.020 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d270000000000001057 | 158.611 | 14.409 | 1.719 | 0.000 | 4.306 | 105.063 | 4.476 | 6.815 | 0.000 | 0.105 | 21.700 | n/a | n/a | 0.017 | 20.434 | 0.129 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d27000000000000105f | 157.739 | 2.955 | 0.006 | 0.000 | 110.188 | 33.061 | 0.582 | 0.020 | 0.000 | 0.119 | 10.775 | n/a | n/a | 0.033 | 113.149 | 0.717 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.069ms |
| b64bc2be1b200d270000000000001061 | 148.033 | 3.774 | 0.613 | 0.000 | 99.101 | 31.480 | 0.843 | 0.585 | 0.000 | 0.032 | 11.577 | n/a | n/a | 0.028 | 103.488 | 0.699 | 0.028 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.069ms |
| b64bc2be1b200d270000000000001065 | 142.330 | 3.174 | 0.003 | 0.000 | 132.944 | 0.355 | 1.137 | 0.025 | 0.000 | 0.164 | 4.495 | n/a | n/a | 0.031 | 136.122 | 0.956 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.276ms; driver.publication 1.198ms; driver.publication 1.193ms |
| b64bc2be1b200d27000000000000106b | 140.189 | 4.056 | 0.005 | 0.000 | 127.875 | 0.448 | 1.997 | 0.015 | 0.000 | 0.375 | 5.379 | n/a | n/a | 0.039 | 131.936 | 0.941 | 0.039 | node-14/thread-0/driver.queue.subject | driver.publication 2.797ms; driver.publication 1.276ms; driver.publication 1.198ms; driver.publication 1.193ms; driver.publication 1.140ms |
| b64bc2be1b200d270000000000001066 | 136.879 | 2.447 | 0.003 | 0.000 | 121.422 | 0.617 | 4.813 | 0.061 | 0.000 | 0.240 | 7.241 | n/a | n/a | 0.033 | 123.873 | 0.905 | 0.033 | node-14/thread-0/driver.queue.subject | driver.publication 2.797ms; driver.publication 1.276ms; driver.publication 1.198ms; driver.publication 1.193ms; driver.publication 1.140ms |
| b64bc2be1b200d270000000000001058 | 128.008 | 7.073 | 72.919 | 0.000 | 0.025 | 1.592 | 19.689 | 0.034 | 0.000 | 0.147 | 26.504 | n/a | n/a | 0.025 | 80.017 | 0.625 | 0.025 | node-14/thread-0/rpc.probe.transact | client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d27000000000000104e | 113.957 | 7.961 | 0.006 | 0.000 | 2.747 | 87.274 | 2.756 | 0.026 | 0.000 | 0.100 | 13.044 | n/a | n/a | 0.043 | 10.714 | 0.094 | 0.043 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.400ms; driver.publication 3.281ms; driver.publication 1.710ms; client.parse 1.239ms |
| b64bc2be1b200d270000000000001064 | 104.084 | 4.189 | 0.789 | 0.000 | 35.826 | 51.071 | 2.384 | 0.039 | 0.000 | 0.901 | 8.854 | n/a | n/a | 0.030 | 40.805 | 0.392 | 0.030 | node-14/thread-0/socket.queue-and-write | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.069ms; driver.publication 1.005ms |
| b64bc2be1b200d270000000000001063 | 97.390 | 4.085 | 0.754 | 0.000 | 46.515 | 36.067 | 0.463 | 0.015 | 0.000 | 0.586 | 8.878 | n/a | n/a | 0.026 | 51.354 | 0.527 | 0.026 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.069ms |
| b64bc2be1b200d270000000000002043 | 96.692 | 3.042 | 0.004 | 0.000 | 67.457 | 0.411 | 1.186 | 0.029 | 0.000 | 0.657 | 23.869 | n/a | n/a | 0.037 | 70.503 | 0.729 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 1.224ms; client.parse 1.218ms; driver.publication 1.167ms; driver.publication 1.014ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.626 | 0.572 | 0.000 | 1.417 | 2.988 | 0.005 | 0.000 | 0.719 | 0.635 | 0.893 | 0.027 | 0.000 | 0.189 | 5.489 | n/a | n/a | 0.033 | 3.807 | 0.328 | 0.033 |
| p99 | 73.740 | 2.154 | 1.579 | 4.411 | 8.212 | 0.223 | 0.000 | 29.648 | 14.350 | 4.915 | 3.629 | 0.000 | 3.162 | 23.472 | n/a | n/a | 0.086 | 32.837 | 0.734 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b64bc2be1b200d270000000000001055 | 229.116 | 3.750 | 44.734 | 0.000 | 163.164 | 4.769 | 5.299 | 0.015 | 0.000 | 0.952 | 6.402 | n/a | n/a | 0.031 | 211.649 | 0.924 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d27000000000000105d | 206.399 | 2.688 | 39.208 | 0.000 | 145.451 | 1.088 | 3.175 | 4.015 | 0.000 | 0.267 | 10.481 | n/a | n/a | 0.025 | 187.347 | 0.908 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d270000000000001060 | 201.129 | 2.616 | 0.004 | 0.000 | 185.560 | 3.833 | 0.718 | 0.030 | 0.000 | 0.146 | 8.194 | n/a | n/a | 0.029 | 188.179 | 0.936 | 0.029 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.198ms; driver.publication 1.098ms; driver.publication 1.078ms |
| b64bc2be1b200d270000000000001062 | 193.023 | 2.928 | 0.009 | 0.000 | 180.772 | 0.543 | 0.851 | 0.028 | 0.000 | 0.487 | 7.376 | n/a | n/a | 0.028 | 183.709 | 0.952 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.276ms; driver.publication 1.198ms; driver.publication 1.193ms |
| b64bc2be1b200d270000000000001051 | 189.062 | 4.108 | 0.005 | 0.000 | 1.462 | 167.007 | 0.904 | 0.029 | 0.000 | 0.115 | 15.386 | n/a | n/a | 0.047 | 5.575 | 0.029 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.281ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; client.parse 1.239ms |
| b64bc2be1b200d270000000000001056 | 160.703 | 9.494 | 2.091 | 0.000 | 9.382 | 107.530 | 1.247 | 11.560 | 0.000 | 0.188 | 19.192 | n/a | n/a | 0.020 | 20.967 | 0.130 | 0.020 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.797ms; client.parse 2.244ms; driver.publication 1.657ms; driver.expected-state.bind-receipt 1.612ms; driver.publication 1.477ms |
| b64bc2be1b200d27000000000000105f | 157.739 | 2.955 | 0.006 | 0.000 | 110.188 | 33.061 | 0.582 | 0.020 | 0.000 | 0.119 | 10.775 | n/a | n/a | 0.033 | 113.149 | 0.717 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.069ms |
| b64bc2be1b200d270000000000001061 | 148.033 | 3.774 | 0.613 | 0.000 | 99.101 | 31.480 | 0.843 | 0.585 | 0.000 | 0.032 | 11.577 | n/a | n/a | 0.028 | 103.488 | 0.699 | 0.028 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.069ms |
| b64bc2be1b200d270000000000001066 | 136.879 | 2.447 | 0.003 | 0.000 | 121.422 | 0.617 | 4.813 | 0.061 | 0.000 | 0.240 | 7.241 | n/a | n/a | 0.033 | 123.873 | 0.905 | 0.033 | node-14/thread-0/driver.queue.subject | driver.publication 2.797ms; driver.publication 1.276ms; driver.publication 1.198ms; driver.publication 1.193ms; driver.publication 1.140ms |
| b64bc2be1b200d270000000000001064 | 104.084 | 4.189 | 0.789 | 0.000 | 35.826 | 51.071 | 2.384 | 0.039 | 0.000 | 0.901 | 8.854 | n/a | n/a | 0.030 | 40.805 | 0.392 | 0.030 | node-14/thread-0/socket.queue-and-write | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.069ms; driver.publication 1.005ms |
| b64bc2be1b200d270000000000001063 | 97.390 | 4.085 | 0.754 | 0.000 | 46.515 | 36.067 | 0.463 | 0.015 | 0.000 | 0.586 | 8.878 | n/a | n/a | 0.026 | 51.354 | 0.527 | 0.026 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.797ms; driver.publication 1.477ms; driver.publication 1.069ms |
| b64bc2be1b200d270000000000002043 | 96.692 | 3.042 | 0.004 | 0.000 | 67.457 | 0.411 | 1.186 | 0.029 | 0.000 | 0.657 | 23.869 | n/a | n/a | 0.037 | 70.503 | 0.729 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 1.224ms; client.parse 1.218ms; driver.publication 1.167ms; driver.publication 1.014ms |
| b64bc2be1b200d270000000000002031 | 89.373 | 2.628 | 0.005 | 0.000 | 0.104 | 44.408 | 1.319 | 0.034 | 15.312 | 5.130 | 20.398 | n/a | n/a | 0.034 | 2.737 | 0.031 | 0.034 | node-14/thread-0/socket.wait-first-byte | client.parse 1.028ms |
| b64bc2be1b200d270000000000002035 | 74.256 | 3.325 | 0.007 | 0.000 | 32.653 | 0.783 | 0.852 | 0.026 | 0.000 | 0.312 | 36.275 | n/a | n/a | 0.024 | 35.984 | 0.485 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.374ms; driver.publication 1.242ms; driver.publication 1.167ms; driver.publication 1.164ms; driver.publication 1.094ms |
| b64bc2be1b200d270000000000002032 | 73.977 | 2.986 | 0.006 | 0.000 | 0.164 | 52.404 | 2.107 | 5.911 | 0.000 | 1.144 | 9.217 | n/a | n/a | 0.039 | 3.156 | 0.043 | 0.039 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.164ms; client.parse 1.028ms |
| b64bc2be1b200d270000000000002033 | 73.740 | 2.413 | 0.002 | 0.000 | 0.739 | 54.473 | 2.440 | 3.629 | 0.000 | 0.500 | 9.511 | n/a | n/a | 0.034 | 3.154 | 0.043 | 0.034 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.164ms; driver.publication 1.080ms; client.parse 1.028ms |
| b64bc2be1b200d270000000000002037 | 73.397 | 5.354 | 0.010 | 0.000 | 26.869 | 0.836 | 1.185 | 0.032 | 0.000 | 0.171 | 38.899 | n/a | n/a | 0.041 | 32.233 | 0.439 | 0.041 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.374ms; driver.publication 1.242ms; driver.publication 1.224ms; driver.publication 1.167ms; driver.publication 1.164ms |
| b64bc2be1b200d270000000000002042 | 69.922 | 2.318 | 0.005 | 0.000 | 57.202 | 0.407 | 2.917 | 0.033 | 0.000 | 0.100 | 6.906 | n/a | n/a | 0.034 | 59.525 | 0.851 | 0.034 | node-14/thread-0/driver.queue.subject | driver.publication 1.224ms; client.parse 1.218ms; driver.publication 1.167ms; driver.publication 1.014ms |
| b64bc2be1b200d2700000000000014b5 | 66.735 | 3.922 | 0.004 | 0.000 | 1.001 | 52.660 | 1.210 | 0.038 | 0.000 | 0.160 | 7.681 | n/a | n/a | 0.058 | 4.927 | 0.074 | 0.058 | node-14/thread-0/socket.wait-first-byte | client.parse 1.240ms |
| b64bc2be1b200d270000000000000cd6 | 63.834 | 11.424 | 2.756 | 0.000 | 12.894 | 14.258 | 5.302 | 0.032 | 0.000 | 1.954 | 15.171 | n/a | n/a | 0.044 | 27.073 | 0.424 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.879ms; driver.expected-state.bind-receipt 1.545ms; driver.publication 1.354ms; driver.publication 1.341ms; driver.publication 1.278ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.354 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.846 | 200.703 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.162 | 0.047 | 0.000 | 0.162 |
| p99 | 202.771 | n/a | n/a | n/a | 18.083 | n/a | 1.171 | 0.000 | 3.505 | 201.309 | 0.097 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.286 | 19.254 | 0.263 | 0.286 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 341a8068165cf9070000000000000007 | 202.771 | 0.041 | n/a | 0.000 | 0.000 | 1.073 | 201.309 | 0.035 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.162 | 0.041 | 0.000 | 0.162 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf9070000000000000005 | 202.451 | 0.047 | n/a | 0.000 | 0.000 | 0.846 | 201.251 | 0.013 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.190 | 0.047 | 0.000 | 0.190 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000006 | 202.327 | 0.115 | n/a | 0.000 | 0.000 | 0.722 | 201.200 | 0.020 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.094 | 0.115 | 0.001 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000f38 | 201.505 | 0.033 | n/a | 0.000 | 0.000 | 0.535 | 200.793 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.087 | 0.033 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf9070000000000000f37 | 201.354 | 0.028 | n/a | 0.000 | 0.000 | 0.511 | 200.703 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.064 | 0.028 | 0.000 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf9070000000000000f36 | 201.091 | 0.035 | n/a | 0.000 | 0.000 | 0.439 | 200.483 | 0.003 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.098 | 0.035 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000002 | 94.514 | 1.079 | n/a | 0.000 | 0.000 | 0.988 | 92.032 | 0.097 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.228 | 1.079 | 0.011 | 0.228 | gw-r/thread-54/gateway.admitted-work | none observed |
| 341a8068165cf9070000000000000f3b | 73.225 | 18.083 | n/a | 1.171 | 0.000 | 1.101 | 52.579 | 0.003 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.286 | 19.254 | 0.263 | 0.286 | gw-r/thread-51/gateway.admitted-work | none observed |
| 341a8068165cf9070000000000000f3c | 64.346 | 16.789 | n/a | 0.000 | 0.000 | 3.505 | 43.854 | 0.003 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.188 | 16.789 | 0.261 | 0.188 | gw-r/thread-50/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 801.574 | n/a | n/a | n/a | 0.244 | n/a | 0.000 | 0.000 | 0.430 | 790.759 | 0.010 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.308 | 0.244 | 0.000 | 0.308 |
| p99 | 1005.282 | n/a | n/a | n/a | 9.985 | n/a | 0.000 | 0.000 | 1.326 | 1001.781 | 0.030 | 0.000 | 0.363 | 0.000 | n/a | n/a | 1.538 | 9.985 | 0.012 | 1.538 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3c76e06b3277f6a00000000000000a4 | 1005.282 | 0.244 | n/a | 0.000 | 0.000 | 1.326 | 1001.781 | 0.030 | 0.000 | 0.363 | 0.000 | n/a | n/a | 1.538 | 0.244 | 0.000 | 1.538 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000000a5 | 801.574 | 9.985 | n/a | 0.000 | 0.000 | 0.430 | 790.759 | 0.010 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.308 | 9.985 | 0.012 | 0.308 | gw-r/thread-52/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 440.259 | n/a | n/a | n/a | 2.788 | n/a | 0.000 | 0.000 | 0.658 | 436.747 | 0.014 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.094 | 2.788 | 0.007 | 0.094 |
| p99 | 1004.473 | n/a | n/a | n/a | 9.545 | n/a | 0.000 | 0.000 | 3.486 | 1001.345 | 1.012 | 0.000 | 0.188 | 0.000 | n/a | n/a | 1.101 | 9.545 | 0.308 | 1.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3c76e06b3277f6a00000000000000ae | 1004.473 | 2.440 | n/a | 0.000 | 0.000 | 0.530 | 1001.290 | 0.050 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.088 | 2.440 | 0.002 | 0.088 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a00000000000000bb | 1003.286 | 0.106 | n/a | 0.000 | 0.000 | 0.544 | 1001.345 | 0.021 | 0.000 | 0.168 | 0.000 | n/a | n/a | 1.101 | 0.106 | 0.000 | 1.101 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000000d0 | 1002.680 | 0.116 | n/a | 0.000 | 0.000 | 0.530 | 1000.839 | 0.011 | 0.000 | 0.086 | 0.000 | n/a | n/a | 1.098 | 0.116 | 0.000 | 1.098 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000000b4 | 982.920 | 2.788 | n/a | 0.000 | 0.000 | 0.501 | 979.467 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.093 | 2.788 | 0.003 | 0.093 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a00000000000000ba | 982.427 | 2.541 | n/a | 0.000 | 0.000 | 0.403 | 978.287 | 1.012 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.089 | 2.541 | 0.003 | 0.089 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a00000000000000ab | 835.090 | 3.656 | n/a | 0.000 | 0.000 | 0.940 | 830.265 | 0.013 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.126 | 3.656 | 0.004 | 0.126 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000000c2 | 811.641 | 9.545 | n/a | 0.000 | 0.000 | 0.773 | 801.029 | 0.014 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.204 | 9.545 | 0.012 | 0.204 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000000a8 | 788.839 | 2.837 | n/a | 0.000 | 0.000 | 2.136 | 783.535 | 0.014 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.130 | 2.837 | 0.004 | 0.130 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a00000000000000cb | 666.130 | 3.566 | n/a | 0.000 | 0.000 | 0.635 | 661.776 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.076 | 3.566 | 0.005 | 0.076 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000000b2 | 660.870 | 2.839 | n/a | 0.000 | 0.000 | 2.313 | 655.504 | 0.030 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.075 | 2.839 | 0.004 | 0.075 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a00000000000000ca | 596.703 | 2.273 | n/a | 0.000 | 0.000 | 0.627 | 593.653 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.073 | 2.273 | 0.004 | 0.073 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000000c6 | 569.730 | 4.122 | n/a | 0.000 | 0.000 | 0.915 | 564.134 | 0.121 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.324 | 4.122 | 0.007 | 0.324 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a00000000000000c1 | 566.633 | 2.294 | n/a | 0.000 | 0.000 | 0.565 | 563.614 | 0.016 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.079 | 2.294 | 0.004 | 0.079 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000000c5 | 443.177 | 2.862 | n/a | 0.000 | 0.000 | 0.622 | 439.523 | 0.013 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.078 | 2.862 | 0.006 | 0.078 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000000b6 | 440.259 | 2.695 | n/a | 0.000 | 0.000 | 0.646 | 436.747 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.094 | 2.695 | 0.006 | 0.094 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000000a7 | 426.567 | 8.699 | n/a | 0.000 | 0.000 | 1.896 | 415.669 | 0.022 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.125 | 8.699 | 0.020 | 0.125 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000000c8 | 378.194 | 2.261 | n/a | 0.000 | 0.000 | 3.486 | 372.258 | 0.025 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.078 | 2.261 | 0.006 | 0.078 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a00000000000000b8 | 331.766 | 2.349 | n/a | 0.000 | 0.000 | 0.771 | 328.343 | 0.146 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.083 | 2.349 | 0.007 | 0.083 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a00000000000000b0 | 308.902 | 4.573 | n/a | 0.000 | 0.000 | 0.771 | 303.133 | 0.209 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.140 | 4.573 | 0.015 | 0.140 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000000cc | 274.419 | 2.027 | n/a | 0.000 | 0.000 | 0.727 | 271.236 | 0.239 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.067 | 2.027 | 0.007 | 0.067 | gw-r/thread-53/journal/page | none observed |

## P3 / L1 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 411.167 | n/a | n/a | n/a | 3.426 | n/a | 0.747 | 0.000 | 0.735 | 407.596 | 0.017 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.094 | 3.842 | 0.016 | 0.094 |
| p99 | 1003.745 | n/a | n/a | n/a | 15.859 | n/a | 3.623 | 0.000 | 2.481 | 1001.315 | 1.814 | 14.268 | 0.159 | 0.000 | n/a | n/a | 1.102 | 17.446 | 0.713 | 1.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3c76e06b3277f6a00000000000000ff | 1003.745 | 0.117 | n/a | 0.000 | 0.000 | 1.095 | 1001.315 | 0.020 | 0.000 | 0.097 | 0.000 | n/a | n/a | 1.102 | 0.117 | 0.000 | 1.102 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000000d3 | 1002.809 | 0.121 | n/a | 0.000 | 0.000 | 0.663 | 1000.817 | 0.020 | 0.000 | 0.119 | 0.000 | n/a | n/a | 1.069 | 0.121 | 0.000 | 1.069 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a000000000000010f | 1000.190 | 2.876 | n/a | 0.852 | 0.000 | 0.562 | 995.705 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.112 | 3.728 | 0.004 | 0.112 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a00000000000000db | 998.711 | 2.547 | n/a | 0.000 | 0.000 | 0.633 | 995.317 | 0.026 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.083 | 2.547 | 0.003 | 0.083 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a00000000000000e0 | 998.418 | 3.362 | n/a | 0.000 | 0.000 | 0.577 | 994.077 | 0.010 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.332 | 3.362 | 0.003 | 0.332 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a0000000000000107 | 989.867 | 2.867 | n/a | 0.000 | 0.000 | 1.027 | 985.822 | 0.015 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.057 | 2.867 | 0.003 | 0.057 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a00000000000000da | 989.437 | 4.440 | n/a | 0.000 | 0.000 | 0.879 | 983.804 | 0.123 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.096 | 4.440 | 0.004 | 0.096 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000103 | 981.860 | 3.615 | n/a | 0.812 | 0.000 | 0.640 | 976.573 | 0.020 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.100 | 4.427 | 0.005 | 0.100 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000000d2 | 973.356 | 2.407 | n/a | 0.000 | 0.000 | 0.507 | 970.130 | 0.163 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.073 | 2.407 | 0.002 | 0.073 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000000df | 951.519 | 3.708 | n/a | 0.000 | 0.000 | 0.831 | 946.705 | 0.010 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.177 | 3.708 | 0.004 | 0.177 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a00000000000000e1 | 822.771 | 15.859 | n/a | 1.587 | 0.000 | 1.910 | 803.098 | 0.044 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.130 | 17.446 | 0.021 | 0.130 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a0000000000000104 | 793.022 | 3.430 | n/a | 0.000 | 0.000 | 0.760 | 788.673 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.087 | 3.430 | 0.004 | 0.087 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a00000000000000e5 | 789.112 | 4.086 | n/a | 0.766 | 0.000 | 0.794 | 783.271 | 0.017 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.072 | 4.853 | 0.006 | 0.072 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000000ec | 645.813 | 2.507 | n/a | 0.766 | 0.000 | 0.693 | 641.680 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.087 | 3.273 | 0.005 | 0.087 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000000fc | 591.902 | 6.652 | n/a | 0.953 | 0.000 | 0.672 | 583.393 | 0.059 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.080 | 7.605 | 0.013 | 0.080 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000000e9 | 573.319 | 10.882 | n/a | 1.692 | 0.000 | 0.549 | 559.845 | 0.013 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.269 | 12.573 | 0.022 | 0.269 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000000dd | 544.734 | 2.419 | n/a | 0.000 | 0.000 | 0.954 | 541.147 | 0.017 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.085 | 2.419 | 0.004 | 0.085 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a00000000000000dc | 509.481 | 4.471 | n/a | 0.000 | 0.000 | 0.571 | 504.131 | 0.026 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.153 | 4.471 | 0.009 | 0.153 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a000000000000010a | 456.555 | 15.235 | n/a | 1.964 | 0.000 | 1.202 | 437.801 | 0.101 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.189 | 17.198 | 0.038 | 0.189 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000000d6 | 445.848 | 5.351 | n/a | 0.000 | 0.000 | 0.882 | 439.329 | 0.011 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.195 | 5.351 | 0.012 | 0.195 | gw-r/thread-50/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 376.066 | n/a | n/a | n/a | 3.697 | n/a | 0.000 | 0.000 | 0.622 | 368.168 | 0.014 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.091 | 3.899 | 0.010 | 0.091 |
| p99 | 1004.869 | n/a | n/a | n/a | 9.417 | n/a | 2.133 | 0.000 | 2.182 | 1002.228 | 2.874 | 0.000 | 0.242 | 0.000 | n/a | n/a | 1.143 | 11.550 | 0.146 | 1.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3c76e06b3277f6a000000000000012c | 1004.869 | 3.227 | n/a | 0.000 | 0.000 | 0.702 | 1000.784 | 0.015 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.074 | 3.227 | 0.003 | 0.074 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a0000000000000116 | 1004.693 | 0.167 | n/a | 0.000 | 0.000 | 1.065 | 1002.228 | 0.009 | 0.000 | 0.081 | 0.000 | n/a | n/a | 1.143 | 0.167 | 0.000 | 1.143 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000139 | 998.361 | 2.607 | n/a | 0.000 | 0.000 | 0.850 | 994.664 | 0.125 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.066 | 2.607 | 0.003 | 0.066 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a0000000000000128 | 997.348 | 3.836 | n/a | 0.000 | 0.000 | 0.850 | 992.495 | 0.013 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.066 | 3.836 | 0.004 | 0.066 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a000000000000012d | 995.981 | 3.697 | n/a | 0.000 | 0.000 | 0.830 | 991.315 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.065 | 3.697 | 0.004 | 0.065 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a000000000000011f | 991.031 | 5.946 | n/a | 0.000 | 0.000 | 0.566 | 984.226 | 0.009 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.222 | 5.946 | 0.006 | 0.222 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000141 | 943.501 | 2.815 | n/a | 0.000 | 0.000 | 0.738 | 939.762 | 0.009 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.117 | 2.815 | 0.003 | 0.117 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000113 | 845.563 | 2.403 | n/a | 0.000 | 0.000 | 0.466 | 842.273 | 0.115 | 0.000 | 0.242 | 0.000 | n/a | n/a | 0.064 | 2.403 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a0000000000000129 | 769.160 | 5.865 | n/a | 0.838 | 0.000 | 0.772 | 761.264 | 0.283 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.091 | 6.703 | 0.009 | 0.091 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000120 | 747.987 | 2.276 | n/a | 0.866 | 0.000 | 0.800 | 743.625 | 0.246 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.115 | 3.142 | 0.004 | 0.115 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000149 | 732.584 | 2.461 | n/a | 0.000 | 0.000 | 0.451 | 726.668 | 2.874 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.073 | 2.461 | 0.003 | 0.073 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a000000000000013e | 708.878 | 4.646 | n/a | 0.000 | 0.000 | 0.564 | 703.475 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.120 | 4.646 | 0.007 | 0.120 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000110 | 694.768 | 2.916 | n/a | 0.000 | 0.000 | 2.182 | 689.375 | 0.177 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.062 | 2.916 | 0.004 | 0.062 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a0000000000000134 | 692.253 | 2.666 | n/a | 0.000 | 0.000 | 0.615 | 688.733 | 0.116 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.062 | 2.666 | 0.004 | 0.062 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a0000000000000136 | 690.482 | 2.640 | n/a | 0.000 | 0.000 | 0.516 | 687.194 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.067 | 2.640 | 0.004 | 0.067 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000126 | 662.165 | 5.904 | n/a | 0.972 | 0.000 | 0.577 | 654.488 | 0.014 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.135 | 6.876 | 0.010 | 0.135 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a0000000000000143 | 645.656 | 5.212 | n/a | 0.000 | 0.000 | 0.664 | 639.626 | 0.014 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.086 | 5.212 | 0.008 | 0.086 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000130 | 623.107 | 3.881 | n/a | 1.461 | 0.000 | 0.797 | 616.748 | 0.011 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.146 | 5.342 | 0.009 | 0.146 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a000000000000013a | 573.461 | 8.066 | n/a | 0.000 | 0.000 | 1.279 | 563.277 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.776 | 8.066 | 0.014 | 0.776 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a000000000000013b | 429.908 | 5.315 | n/a | 0.000 | 0.000 | 0.633 | 423.756 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.135 | 5.315 | 0.012 | 0.135 | gw-r/thread-51/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 428.786 | n/a | n/a | n/a | 2.874 | n/a | 0.000 | 0.000 | 0.662 | 425.075 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.076 | 2.874 | 0.007 | 0.076 |
| p99 | 1008.990 | n/a | n/a | n/a | 8.260 | n/a | 0.942 | 0.000 | 4.197 | 1000.961 | 1.021 | 15.180 | 0.110 | 0.000 | n/a | n/a | 1.106 | 8.260 | 0.705 | 1.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3c76e06b3277f6a0000000000000165 | 1008.990 | 2.398 | n/a | 0.000 | 0.000 | 1.204 | 990.102 | 0.005 | 15.180 | 0.044 | 0.000 | n/a | n/a | 0.057 | 2.398 | 0.002 | 0.057 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a000000000000016e | 1002.881 | 0.149 | n/a | 0.000 | 0.000 | 0.583 | 1000.961 | 0.009 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.106 | 0.149 | 0.000 | 1.106 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a0000000000000185 | 1002.607 | 0.116 | n/a | 0.000 | 0.000 | 1.719 | 1000.664 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.056 | 0.116 | 0.000 | 0.056 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000155 | 997.392 | 2.953 | n/a | 0.000 | 0.000 | 1.495 | 992.822 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.077 | 2.953 | 0.003 | 0.077 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a000000000000017f | 996.176 | 2.260 | n/a | 0.000 | 0.000 | 0.401 | 993.341 | 0.008 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.057 | 2.260 | 0.002 | 0.057 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a0000000000000187 | 990.709 | 4.028 | n/a | 0.000 | 0.000 | 0.586 | 985.985 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.063 | 4.028 | 0.004 | 0.063 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a0000000000000174 | 943.878 | 3.446 | n/a | 0.000 | 0.000 | 0.859 | 939.294 | 0.130 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.064 | 3.446 | 0.004 | 0.064 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a000000000000015b | 820.749 | 2.979 | n/a | 0.000 | 0.000 | 0.434 | 817.229 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.070 | 2.979 | 0.004 | 0.070 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a000000000000017a | 779.699 | 4.509 | n/a | 0.000 | 0.000 | 0.490 | 774.475 | 0.002 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.188 | 4.509 | 0.006 | 0.188 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a0000000000000156 | 759.888 | 2.062 | n/a | 0.000 | 0.000 | 2.097 | 755.574 | 0.009 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.071 | 2.062 | 0.003 | 0.071 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a000000000000016d | 612.238 | 4.940 | n/a | 0.000 | 0.000 | 0.817 | 606.206 | 0.006 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.165 | 4.940 | 0.008 | 0.165 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a0000000000000183 | 611.936 | 2.840 | n/a | 0.000 | 0.000 | 0.698 | 608.284 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.065 | 2.840 | 0.005 | 0.065 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a0000000000000177 | 609.896 | 2.518 | n/a | 0.000 | 0.000 | 0.508 | 606.766 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.061 | 2.518 | 0.004 | 0.061 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a0000000000000150 | 604.305 | 4.205 | n/a | 0.000 | 0.000 | 0.598 | 599.187 | 0.008 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.209 | 4.205 | 0.007 | 0.209 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000189 | 587.349 | 3.500 | n/a | 0.942 | 0.000 | 0.685 | 582.069 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.113 | 4.442 | 0.008 | 0.113 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a000000000000017d | 581.485 | 2.801 | n/a | 0.000 | 0.000 | 0.749 | 577.673 | 0.120 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.097 | 2.801 | 0.005 | 0.097 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000171 | 560.065 | 4.081 | n/a | 0.000 | 0.000 | 0.638 | 555.073 | 0.013 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.183 | 4.081 | 0.007 | 0.183 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a0000000000000166 | 555.365 | 6.852 | n/a | 0.000 | 0.000 | 4.197 | 544.167 | 0.011 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.078 | 6.852 | 0.012 | 0.078 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000167 | 430.364 | 2.495 | n/a | 0.000 | 0.000 | 0.534 | 427.209 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.084 | 2.495 | 0.006 | 0.084 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000176 | 430.127 | 2.497 | n/a | 0.000 | 0.000 | 0.395 | 427.113 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.067 | 2.497 | 0.006 | 0.067 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 338.217 | n/a | n/a | n/a | 2.841 | n/a | 0.000 | 0.000 | 0.630 | 333.034 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.069 | 2.841 | 0.010 | 0.069 |
| p99 | 1004.314 | n/a | n/a | n/a | 10.250 | n/a | 1.025 | 0.000 | 4.972 | 1001.169 | 1.400 | 7.709 | 0.419 | 0.000 | n/a | n/a | 1.165 | 10.250 | 0.833 | 1.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3c76e06b3277f6a00000000000001a7 | 1004.314 | 2.376 | n/a | 0.000 | 0.000 | 0.644 | 1001.169 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.070 | 2.376 | 0.002 | 0.070 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000001c3 | 1002.961 | 0.170 | n/a | 0.000 | 0.000 | 0.575 | 1000.976 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.165 | 0.170 | 0.000 | 1.165 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a00000000000001a6 | 994.864 | 2.693 | n/a | 0.000 | 0.000 | 0.491 | 991.572 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.060 | 2.693 | 0.003 | 0.060 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a000000000000018b | 983.767 | 2.930 | n/a | 0.000 | 0.000 | 1.303 | 979.287 | 0.133 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.068 | 2.930 | 0.003 | 0.068 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a000000000000019a | 980.007 | 2.470 | n/a | 0.000 | 0.000 | 1.815 | 975.629 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.063 | 2.470 | 0.003 | 0.063 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a00000000000001c5 | 979.508 | 5.023 | n/a | 0.000 | 0.000 | 0.692 | 973.595 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.165 | 5.023 | 0.005 | 0.165 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000001a4 | 911.954 | 2.445 | n/a | 0.000 | 0.000 | 0.453 | 908.946 | 0.011 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.445 | 0.003 | 0.063 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a000000000000019c | 838.520 | 4.999 | n/a | 0.000 | 0.000 | 0.668 | 832.592 | 0.125 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.096 | 4.999 | 0.006 | 0.096 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a00000000000001c1 | 783.515 | 3.383 | n/a | 0.000 | 0.000 | 0.421 | 779.386 | 0.211 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.073 | 3.383 | 0.004 | 0.073 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a00000000000001d5 | 763.263 | 3.616 | n/a | 0.000 | 0.000 | 2.510 | 756.463 | 0.113 | 0.000 | 0.419 | 0.000 | n/a | n/a | 0.142 | 3.616 | 0.005 | 0.142 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000001b5 | 666.250 | 2.841 | n/a | 0.000 | 0.000 | 0.487 | 662.821 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.060 | 2.841 | 0.004 | 0.060 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000001a0 | 640.211 | 3.731 | n/a | 0.000 | 0.000 | 0.659 | 635.706 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.063 | 3.731 | 0.006 | 0.063 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a00000000000001c6 | 629.490 | 2.427 | n/a | 0.000 | 0.000 | 0.581 | 626.360 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.068 | 2.427 | 0.004 | 0.068 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000001af | 599.256 | 5.623 | n/a | 0.000 | 0.000 | 0.637 | 592.691 | 0.200 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.068 | 5.623 | 0.009 | 0.068 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000001a8 | 580.134 | 3.062 | n/a | 0.000 | 0.000 | 2.968 | 573.982 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.070 | 3.062 | 0.005 | 0.070 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000001b9 | 569.697 | 2.839 | n/a | 0.000 | 0.000 | 0.751 | 566.005 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.064 | 2.839 | 0.005 | 0.064 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000001ce | 558.346 | 2.541 | n/a | 0.000 | 0.000 | 0.443 | 555.155 | 0.095 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.064 | 2.541 | 0.005 | 0.064 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a00000000000001d1 | 542.146 | 2.542 | n/a | 0.000 | 0.000 | 0.398 | 539.083 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.068 | 2.542 | 0.005 | 0.068 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000198 | 477.078 | 2.243 | n/a | 0.000 | 0.000 | 0.523 | 472.800 | 1.400 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.061 | 2.243 | 0.005 | 0.061 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000001b7 | 424.835 | 10.250 | n/a | 0.000 | 0.000 | 2.744 | 411.704 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.099 | 10.250 | 0.024 | 0.099 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 369.875 | n/a | n/a | n/a | 2.549 | n/a | 0.000 | 0.000 | 0.564 | 366.858 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.068 | 2.549 | 0.007 | 0.068 |
| p99 | 1003.935 | n/a | n/a | n/a | 7.430 | n/a | 0.000 | 0.000 | 3.323 | 1000.606 | 0.198 | 0.000 | 0.126 | 0.000 | n/a | n/a | 1.081 | 7.430 | 0.628 | 1.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3c76e06b3277f6a0000000000000211 | 1003.935 | 3.813 | n/a | 0.000 | 0.000 | 3.323 | 996.667 | 0.014 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.075 | 3.813 | 0.004 | 0.075 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a0000000000000216 | 1002.250 | 0.110 | n/a | 0.000 | 0.000 | 0.401 | 1000.606 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.081 | 0.110 | 0.000 | 1.081 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a00000000000001ea | 999.000 | 2.472 | n/a | 0.000 | 0.000 | 0.561 | 995.868 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.062 | 2.472 | 0.002 | 0.062 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a00000000000001fe | 996.500 | 3.235 | n/a | 0.000 | 0.000 | 0.633 | 992.525 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.063 | 3.235 | 0.003 | 0.063 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000212 | 994.065 | 3.995 | n/a | 0.000 | 0.000 | 0.549 | 989.408 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.065 | 3.995 | 0.004 | 0.065 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a0000000000000218 | 988.926 | 2.331 | n/a | 0.000 | 0.000 | 1.730 | 984.640 | 0.005 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.095 | 2.331 | 0.002 | 0.095 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000214 | 970.667 | 2.215 | n/a | 0.000 | 0.000 | 0.586 | 967.769 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.053 | 2.215 | 0.002 | 0.053 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000000206 | 922.602 | 2.783 | n/a | 0.000 | 0.000 | 0.392 | 919.116 | 0.194 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.067 | 2.783 | 0.003 | 0.067 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000001f7 | 823.966 | 2.358 | n/a | 0.000 | 0.000 | 0.464 | 821.030 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.070 | 2.358 | 0.003 | 0.070 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000001ff | 807.603 | 5.263 | n/a | 0.000 | 0.000 | 0.571 | 801.488 | 0.117 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.129 | 5.263 | 0.007 | 0.129 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000202 | 735.495 | 2.549 | n/a | 0.000 | 0.000 | 0.590 | 732.246 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.068 | 2.549 | 0.003 | 0.068 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000001f0 | 726.873 | 2.024 | n/a | 0.000 | 0.000 | 0.511 | 724.230 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.062 | 2.024 | 0.003 | 0.062 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000001dd | 713.632 | 3.858 | n/a | 0.000 | 0.000 | 0.651 | 709.013 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.067 | 3.858 | 0.005 | 0.067 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a00000000000001f4 | 691.622 | 3.841 | n/a | 0.000 | 0.000 | 0.488 | 687.194 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.072 | 3.841 | 0.006 | 0.072 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a00000000000001e8 | 667.591 | 3.091 | n/a | 0.000 | 0.000 | 0.416 | 663.975 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.085 | 3.091 | 0.005 | 0.085 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000001da | 618.173 | 3.429 | n/a | 0.000 | 0.000 | 0.362 | 614.179 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.187 | 3.429 | 0.006 | 0.187 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a00000000000001f9 | 530.225 | 1.995 | n/a | 0.000 | 0.000 | 0.641 | 527.481 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.063 | 1.995 | 0.004 | 0.063 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a000000000000020f | 504.126 | 2.230 | n/a | 0.000 | 0.000 | 0.470 | 501.299 | 0.003 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.087 | 2.230 | 0.004 | 0.087 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a00000000000001ee | 466.153 | 2.233 | n/a | 0.000 | 0.000 | 0.595 | 463.225 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.056 | 2.233 | 0.005 | 0.056 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a00000000000001e1 | 447.233 | 3.898 | n/a | 0.000 | 0.000 | 0.835 | 442.362 | 0.005 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.065 | 3.898 | 0.009 | 0.065 | gw-r/thread-52/journal/page | none observed |

## P3 / L1024 / internal (763 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.376 | n/a | n/a | n/a | 3.313 | n/a | 0.000 | 0.000 | 0.569 | 8.571 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.082 | 3.313 | 0.287 | 0.082 |
| p99 | 135.154 | n/a | n/a | n/a | 13.771 | n/a | 1.153 | 0.000 | 4.261 | 131.568 | 0.406 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.516 | 14.184 | 0.832 | 0.516 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3c76e06b3277f6a0000000000000224 | 972.519 | 2.701 | n/a | 0.000 | 0.000 | 0.474 | 968.906 | 0.317 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.079 | 2.701 | 0.003 | 0.079 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000000219 | 868.469 | 1.899 | n/a | 0.000 | 0.000 | 0.333 | 866.163 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.062 | 1.899 | 0.002 | 0.062 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a0000000000000225 | 862.990 | 2.287 | n/a | 0.000 | 0.000 | 0.492 | 860.083 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.082 | 2.287 | 0.003 | 0.082 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a0000000000000221 | 744.403 | 1.876 | n/a | 0.000 | 0.000 | 0.492 | 741.936 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.061 | 1.876 | 0.003 | 0.061 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a000000000000021c | 727.655 | 2.366 | n/a | 0.000 | 0.000 | 0.625 | 724.566 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.055 | 2.366 | 0.003 | 0.055 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a0000000000000222 | 271.647 | 4.734 | n/a | 0.000 | 0.000 | 0.499 | 266.204 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.171 | 4.734 | 0.017 | 0.171 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a000000000000021d | 230.709 | 4.154 | n/a | 0.000 | 0.000 | 0.443 | 225.942 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.121 | 4.154 | 0.018 | 0.121 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a000000000000021a | 135.154 | 2.723 | n/a | 0.000 | 0.000 | 0.544 | 131.568 | 0.116 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.075 | 2.723 | 0.020 | 0.075 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a00000000000004e9 | 101.059 | 5.919 | n/a | 0.819 | 0.000 | 0.594 | 93.545 | 0.003 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.132 | 6.739 | 0.067 | 0.132 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a000000000000046e | 96.044 | 10.593 | n/a | 0.000 | 0.000 | 3.312 | 81.916 | 0.122 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.067 | 10.593 | 0.110 | 0.067 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a0000000000000312 | 95.046 | 3.272 | n/a | 0.000 | 0.000 | 0.686 | 91.001 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.069 | 3.272 | 0.034 | 0.069 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a00000000000005ed | 89.000 | 6.182 | n/a | 0.000 | 0.000 | 0.369 | 82.356 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.067 | 6.182 | 0.069 | 0.067 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a00000000000004f2 | 80.584 | 4.118 | n/a | 0.000 | 0.000 | 0.588 | 75.648 | 0.077 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.135 | 4.118 | 0.051 | 0.135 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a00000000000007a2 | 79.824 | 3.301 | n/a | 0.000 | 0.000 | 0.694 | 75.350 | 0.340 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.102 | 3.301 | 0.041 | 0.102 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a0000000000000638 | 79.553 | 3.482 | n/a | 0.000 | 0.000 | 0.447 | 75.547 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.063 | 3.482 | 0.044 | 0.063 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a000000000000066b | 77.249 | 4.148 | n/a | 0.000 | 0.000 | 0.458 | 72.223 | 0.330 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.075 | 4.148 | 0.054 | 0.075 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a000000000000078f | 76.158 | 11.080 | n/a | 0.000 | 0.000 | 0.865 | 63.871 | 0.175 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.141 | 11.080 | 0.145 | 0.141 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a0000000000000826 | 75.945 | 4.888 | n/a | 0.000 | 0.000 | 0.634 | 70.097 | 0.179 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.136 | 4.888 | 0.064 | 0.136 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a00000000000006a8 | 75.481 | 2.140 | n/a | 0.000 | 0.000 | 0.616 | 72.617 | 0.003 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.078 | 2.140 | 0.028 | 0.078 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a00000000000005ce | 75.404 | 7.029 | n/a | 0.000 | 0.000 | 0.764 | 67.413 | 0.017 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.145 | 7.029 | 0.093 | 0.145 | gw-r/thread-53/journal/page | none observed |

## P3 / tail / internal (2342 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.937 | n/a | n/a | n/a | 4.003 | n/a | 0.000 | 0.000 | 0.494 | 7.361 | 0.005 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.089 | 4.035 | 0.337 | 0.089 |
| p99 | 342.809 | n/a | n/a | n/a | 14.526 | n/a | 1.481 | 0.000 | 4.012 | 337.958 | 0.274 | 0.000 | 0.071 | 0.000 | n/a | n/a | 1.109 | 15.094 | 0.848 | 1.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3c76e06b3277f6a0000000000001ad6 | 1002.677 | 2.400 | n/a | 0.000 | 0.000 | 0.339 | 999.832 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.059 | 2.400 | 0.002 | 0.059 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a0000000000001b18 | 1002.259 | 0.110 | n/a | 0.000 | 0.000 | 0.348 | 1000.658 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 1.092 | 0.110 | 0.000 | 1.092 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a0000000000001acc | 1001.993 | 0.086 | n/a | 0.000 | 0.000 | 0.314 | 1000.463 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.091 | 0.086 | 0.000 | 1.091 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000001aef | 998.154 | 4.812 | n/a | 0.000 | 0.000 | 0.580 | 992.623 | 0.003 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.099 | 4.812 | 0.005 | 0.099 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a0000000000001b0f | 989.898 | 2.784 | n/a | 0.000 | 0.000 | 0.334 | 986.703 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.050 | 2.784 | 0.003 | 0.050 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a0000000000001b14 | 985.659 | 3.015 | n/a | 0.000 | 0.000 | 0.540 | 981.981 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.079 | 3.015 | 0.003 | 0.079 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a0000000000001aca | 965.340 | 2.277 | n/a | 0.000 | 0.000 | 0.269 | 962.628 | 0.076 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.071 | 2.277 | 0.002 | 0.071 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a0000000000001ae0 | 936.056 | 5.023 | n/a | 0.000 | 0.000 | 0.352 | 930.495 | 0.002 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.161 | 5.023 | 0.005 | 0.161 | gw-r/thread-50/journal/page | none observed |
| a3c76e06b3277f6a0000000000001ad1 | 895.891 | 5.834 | n/a | 0.000 | 0.000 | 0.595 | 889.317 | 0.002 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.123 | 5.834 | 0.007 | 0.123 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000001ace | 841.604 | 12.287 | n/a | 1.529 | 0.000 | 0.611 | 826.589 | 0.081 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.473 | 13.816 | 0.016 | 0.473 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000001af1 | 829.405 | 2.533 | n/a | 0.000 | 0.000 | 0.430 | 826.352 | 0.003 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.055 | 2.533 | 0.003 | 0.055 | gw-r/thread-54/journal/page | none observed |
| a3c76e06b3277f6a0000000000001b11 | 735.704 | 2.460 | n/a | 0.000 | 0.000 | 0.625 | 732.523 | 0.003 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.070 | 2.460 | 0.003 | 0.070 | gw-r/thread-49/journal/page | none observed |
| a3c76e06b3277f6a0000000000001aeb | 705.878 | 2.309 | n/a | 0.000 | 0.000 | 0.459 | 703.005 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.086 | 2.309 | 0.003 | 0.086 | gw-r/thread-51/journal/page | none observed |
| a3c76e06b3277f6a0000000000001ae6 | 655.064 | 2.760 | n/a | 0.000 | 0.000 | 0.420 | 651.812 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.053 | 2.760 | 0.004 | 0.053 | gw-r/thread-52/journal/page | none observed |
| a3c76e06b3277f6a0000000000001b0b | 576.712 | 2.328 | n/a | 0.000 | 0.000 | 0.510 | 573.733 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.113 | 2.328 | 0.004 | 0.113 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000001ad7 | 569.443 | 1.656 | n/a | 0.000 | 0.000 | 0.432 | 567.232 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.090 | 1.656 | 0.003 | 0.090 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000001b09 | 551.277 | 2.558 | n/a | 0.000 | 0.000 | 0.344 | 539.723 | 0.003 | 8.571 | 0.022 | 0.000 | n/a | n/a | 0.055 | 2.558 | 0.005 | 0.055 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a0000000000001af3 | 531.705 | 10.467 | n/a | 0.000 | 0.000 | 0.428 | 520.479 | 0.003 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.301 | 10.467 | 0.020 | 0.301 | gw-r/thread-47/journal/page | none observed |
| a3c76e06b3277f6a0000000000001aff | 471.974 | 2.627 | n/a | 0.000 | 0.000 | 0.372 | 468.642 | 0.243 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.053 | 2.627 | 0.006 | 0.053 | gw-r/thread-53/journal/page | none observed |
| a3c76e06b3277f6a0000000000001b01 | 451.225 | 2.207 | n/a | 0.000 | 0.000 | 0.565 | 448.352 | 0.006 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.066 | 2.207 | 0.005 | 0.066 | gw-r/thread-54/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.891 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.819 | 200.860 | 0.012 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 |
| p99 | 204.260 | n/a | n/a | n/a | 0.109 | n/a | 0.000 | 0.000 | 1.961 | 201.575 | 2.432 | 0.000 | 0.305 | 0.000 | n/a | n/a | 0.806 | 0.109 | 0.001 | 0.806 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 341a8068165cf9070000000000000009 | 204.260 | 0.060 | n/a | 0.000 | 0.000 | 1.877 | 201.330 | 0.041 | 0.000 | 0.252 | 0.000 | n/a | n/a | 0.699 | 0.060 | 0.000 | 0.699 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf9070000000000000048 | 203.160 | 0.044 | n/a | 0.000 | 0.000 | 1.961 | 200.940 | 0.011 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.112 | 0.044 | 0.000 | 0.112 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf907000000000000000f | 202.934 | 0.040 | n/a | 0.000 | 0.000 | 1.062 | 201.575 | 0.011 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.085 | 0.040 | 0.000 | 0.085 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf907000000000000000b | 202.886 | 0.034 | n/a | 0.000 | 0.000 | 0.893 | 201.548 | 0.023 | 0.000 | 0.305 | 0.000 | n/a | n/a | 0.083 | 0.034 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000013 | 202.850 | 0.038 | n/a | 0.000 | 0.000 | 1.177 | 201.343 | 0.018 | 0.000 | 0.189 | 0.000 | n/a | n/a | 0.086 | 0.038 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000035 | 202.733 | 0.041 | n/a | 0.000 | 0.000 | 0.934 | 201.314 | 0.023 | 0.000 | 0.303 | 0.000 | n/a | n/a | 0.118 | 0.041 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000000d | 202.611 | 0.045 | n/a | 0.000 | 0.000 | 0.897 | 201.336 | 0.021 | 0.000 | 0.208 | 0.000 | n/a | n/a | 0.103 | 0.045 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000025 | 202.574 | 0.043 | n/a | 0.000 | 0.000 | 0.994 | 201.280 | 0.015 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.090 | 0.043 | 0.000 | 0.090 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000014 | 202.570 | 0.053 | n/a | 0.000 | 0.000 | 0.982 | 201.264 | 0.020 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.121 | 0.053 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf907000000000000000e | 202.560 | 0.031 | n/a | 0.000 | 0.000 | 0.979 | 201.281 | 0.013 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf907000000000000003d | 202.505 | 0.034 | n/a | 0.000 | 0.000 | 0.819 | 201.415 | 0.018 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf907000000000000001f | 202.437 | 0.032 | n/a | 0.000 | 0.000 | 1.007 | 201.155 | 0.021 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000008 | 202.411 | 0.053 | n/a | 0.000 | 0.000 | 1.098 | 200.972 | 0.010 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.102 | 0.053 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000031 | 202.405 | 0.038 | n/a | 0.000 | 0.000 | 0.944 | 201.166 | 0.012 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.084 | 0.038 | 0.000 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf9070000000000000021 | 202.385 | 0.047 | n/a | 0.000 | 0.000 | 0.879 | 201.213 | 0.013 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.103 | 0.047 | 0.000 | 0.103 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000047 | 202.347 | 0.057 | n/a | 0.000 | 0.000 | 1.235 | 200.820 | 0.010 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.131 | 0.057 | 0.000 | 0.131 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000020 | 202.332 | 0.042 | n/a | 0.000 | 0.000 | 0.929 | 201.102 | 0.013 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000050 | 202.331 | 0.034 | n/a | 0.000 | 0.000 | 0.778 | 201.283 | 0.032 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000051 | 202.315 | 0.033 | n/a | 0.000 | 0.000 | 0.721 | 201.344 | 0.047 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000032 | 202.303 | 0.030 | n/a | 0.000 | 0.000 | 0.698 | 201.362 | 0.011 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |

## P3 / L1 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.752 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.719 | 200.831 | 0.012 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 |
| p99 | 217.646 | n/a | n/a | n/a | 0.185 | n/a | 0.000 | 0.000 | 1.562 | 204.693 | 20.409 | 0.000 | 0.217 | 0.000 | n/a | n/a | 0.179 | 0.185 | 0.002 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 341a8068165cf9070000000000000091 | 217.646 | 0.047 | n/a | 0.000 | 0.000 | 0.624 | 196.454 | 20.409 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.076 | 0.047 | 0.000 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000078 | 206.312 | 0.052 | n/a | 0.000 | 0.000 | 1.356 | 204.693 | 0.015 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.102 | 0.052 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000005d | 203.045 | 0.044 | n/a | 0.000 | 0.000 | 0.842 | 201.959 | 0.025 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.076 | 0.044 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf9070000000000000086 | 202.822 | 0.042 | n/a | 0.000 | 0.000 | 0.870 | 201.641 | 0.018 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.118 | 0.042 | 0.000 | 0.118 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf907000000000000007d | 202.756 | 0.044 | n/a | 0.000 | 0.000 | 1.166 | 201.270 | 0.034 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.089 | 0.044 | 0.000 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf9070000000000000071 | 202.718 | 0.070 | n/a | 0.000 | 0.000 | 0.855 | 201.476 | 0.017 | 0.000 | 0.211 | 0.000 | n/a | n/a | 0.089 | 0.070 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf90700000000000000a0 | 202.692 | 0.050 | n/a | 0.000 | 0.000 | 1.562 | 200.801 | 0.012 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.179 | 0.050 | 0.000 | 0.179 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf90700000000000000a6 | 202.654 | 0.086 | n/a | 0.000 | 0.000 | 1.010 | 201.220 | 0.076 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.138 | 0.086 | 0.000 | 0.138 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf907000000000000007b | 202.559 | 0.030 | n/a | 0.000 | 0.000 | 1.225 | 201.102 | 0.016 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000068 | 202.487 | 0.034 | n/a | 0.000 | 0.000 | 0.936 | 201.242 | 0.012 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.096 | 0.034 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000006c | 202.479 | 0.044 | n/a | 0.000 | 0.000 | 1.161 | 201.042 | 0.013 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.115 | 0.044 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000005c | 202.406 | 0.041 | n/a | 0.000 | 0.000 | 0.882 | 201.223 | 0.018 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.116 | 0.041 | 0.000 | 0.116 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000065 | 202.329 | 0.052 | n/a | 0.000 | 0.000 | 1.044 | 201.020 | 0.011 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.086 | 0.052 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000073 | 202.296 | 0.045 | n/a | 0.000 | 0.000 | 0.856 | 201.097 | 0.019 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.082 | 0.045 | 0.000 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf90700000000000000b5 | 202.290 | 0.040 | n/a | 0.000 | 0.000 | 0.891 | 200.995 | 0.024 | 0.000 | 0.212 | 0.000 | n/a | n/a | 0.127 | 0.040 | 0.000 | 0.127 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000075 | 202.289 | 0.035 | n/a | 0.000 | 0.000 | 1.186 | 200.884 | 0.012 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf907000000000000007c | 202.286 | 0.033 | n/a | 0.000 | 0.000 | 0.950 | 201.106 | 0.014 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf90700000000000000a8 | 202.266 | 0.035 | n/a | 0.000 | 0.000 | 0.805 | 201.200 | 0.014 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.072 | 0.035 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000061 | 202.228 | 0.029 | n/a | 0.000 | 0.000 | 0.783 | 201.236 | 0.011 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.069 | 0.029 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000082 | 202.226 | 0.040 | n/a | 0.000 | 0.000 | 0.895 | 201.078 | 0.010 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.105 | 0.040 | 0.000 | 0.105 | gw-r/thread-53/journal/page | none observed |

## P3 / L4 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.633 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.682 | 200.764 | 0.010 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 |
| p99 | 202.679 | n/a | n/a | n/a | 0.134 | n/a | 0.000 | 0.000 | 1.900 | 201.457 | 4.393 | 0.000 | 0.217 | 0.000 | n/a | n/a | 0.243 | 0.134 | 0.002 | 0.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 341a8068165cf907000000000000011b | 202.679 | 0.042 | n/a | 0.000 | 0.000 | 0.942 | 201.457 | 0.009 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.083 | 0.042 | 0.000 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf907000000000000010d | 202.659 | 0.041 | n/a | 0.000 | 0.000 | 1.011 | 201.343 | 0.014 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.083 | 0.041 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf90700000000000000e4 | 202.546 | 0.080 | n/a | 0.000 | 0.000 | 0.808 | 201.394 | 0.013 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.110 | 0.080 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf90700000000000000e0 | 202.432 | 0.042 | n/a | 0.000 | 0.000 | 0.770 | 201.356 | 0.024 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.117 | 0.042 | 0.000 | 0.117 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf90700000000000000c4 | 202.384 | 0.039 | n/a | 0.000 | 0.000 | 1.018 | 201.084 | 0.015 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.095 | 0.039 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000011a | 202.346 | 0.042 | n/a | 0.000 | 0.000 | 0.750 | 201.325 | 0.014 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.097 | 0.042 | 0.000 | 0.097 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf90700000000000000cb | 202.309 | 0.063 | n/a | 0.000 | 0.000 | 0.936 | 201.002 | 0.014 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.185 | 0.063 | 0.000 | 0.185 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf90700000000000000db | 202.291 | 0.033 | n/a | 0.000 | 0.000 | 0.944 | 201.098 | 0.009 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf90700000000000000ed | 202.256 | 0.029 | n/a | 0.000 | 0.000 | 1.078 | 200.924 | 0.056 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf90700000000000000d1 | 202.231 | 0.032 | n/a | 0.000 | 0.000 | 0.790 | 201.224 | 0.010 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf9070000000000000114 | 202.222 | 0.032 | n/a | 0.000 | 0.000 | 0.638 | 201.296 | 0.012 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf90700000000000000df | 202.202 | 0.038 | n/a | 0.000 | 0.000 | 0.795 | 201.123 | 0.015 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.090 | 0.038 | 0.000 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf907000000000000010c | 202.192 | 0.030 | n/a | 0.000 | 0.000 | 0.580 | 201.368 | 0.019 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf90700000000000000fb | 202.175 | 0.028 | n/a | 0.000 | 0.000 | 0.725 | 201.169 | 0.014 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.107 | 0.028 | 0.000 | 0.107 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf90700000000000000ec | 202.158 | 0.033 | n/a | 0.000 | 0.000 | 0.748 | 201.088 | 0.026 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf90700000000000000d7 | 202.113 | 0.031 | n/a | 0.000 | 0.000 | 0.682 | 201.193 | 0.010 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf907000000000000011f | 202.106 | 0.031 | n/a | 0.000 | 0.000 | 0.749 | 201.029 | 0.010 | 0.000 | 0.217 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf90700000000000000dc | 202.099 | 0.026 | n/a | 0.000 | 0.000 | 0.615 | 201.254 | 0.015 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.064 | 0.026 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf90700000000000000cf | 202.037 | 0.031 | n/a | 0.000 | 0.000 | 0.797 | 201.002 | 0.010 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.081 | 0.031 | 0.000 | 0.081 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf90700000000000000f1 | 201.998 | 0.066 | n/a | 0.000 | 0.000 | 0.917 | 200.795 | 0.009 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.120 | 0.066 | 0.000 | 0.120 | gw-r/thread-51/journal/page | none observed |

## P3 / L16 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.525 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.622 | 200.725 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.000 | 0.072 |
| p99 | 206.371 | n/a | n/a | n/a | 0.094 | n/a | 0.000 | 0.000 | 3.206 | 202.981 | 15.690 | 0.000 | 0.264 | 0.000 | n/a | n/a | 0.234 | 0.094 | 0.001 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 341a8068165cf907000000000000013a | 206.371 | 0.032 | n/a | 0.000 | 0.000 | 3.206 | 202.981 | 0.020 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.062 | 0.032 | 0.000 | 0.062 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000143 | 203.179 | 0.038 | n/a | 0.000 | 0.000 | 2.259 | 200.724 | 0.010 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.085 | 0.038 | 0.000 | 0.085 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf907000000000000013c | 202.420 | 0.046 | n/a | 0.000 | 0.000 | 0.971 | 201.184 | 0.010 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.110 | 0.046 | 0.000 | 0.110 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000175 | 202.275 | 0.043 | n/a | 0.000 | 0.000 | 0.794 | 201.282 | 0.012 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.068 | 0.043 | 0.000 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000141 | 202.159 | 0.033 | n/a | 0.000 | 0.000 | 0.725 | 201.250 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.066 | 0.033 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf907000000000000013b | 202.153 | 0.056 | n/a | 0.000 | 0.000 | 0.852 | 201.010 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.150 | 0.056 | 0.000 | 0.150 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000185 | 202.118 | 0.033 | n/a | 0.000 | 0.000 | 0.807 | 201.122 | 0.009 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000155 | 202.065 | 0.043 | n/a | 0.000 | 0.000 | 0.604 | 201.171 | 0.009 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.116 | 0.043 | 0.000 | 0.116 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000147 | 202.030 | 0.055 | n/a | 0.000 | 0.000 | 1.044 | 200.753 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.120 | 0.055 | 0.000 | 0.120 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf907000000000000016b | 202.002 | 0.037 | n/a | 0.000 | 0.000 | 0.678 | 201.113 | 0.008 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.069 | 0.037 | 0.000 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf907000000000000015b | 201.977 | 0.042 | n/a | 0.000 | 0.000 | 1.129 | 200.659 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.091 | 0.042 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf9070000000000000133 | 201.967 | 0.061 | n/a | 0.000 | 0.000 | 0.818 | 200.935 | 0.008 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.077 | 0.061 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf907000000000000012d | 201.961 | 0.043 | n/a | 0.000 | 0.000 | 0.667 | 201.067 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.095 | 0.043 | 0.000 | 0.095 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf9070000000000000172 | 201.952 | 0.029 | n/a | 0.000 | 0.000 | 0.597 | 201.176 | 0.008 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf907000000000000013e | 201.946 | 0.045 | n/a | 0.000 | 0.000 | 0.698 | 201.027 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.101 | 0.045 | 0.000 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf907000000000000018a | 201.934 | 0.032 | n/a | 0.000 | 0.000 | 0.671 | 201.070 | 0.008 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000161 | 201.890 | 0.043 | n/a | 0.000 | 0.000 | 0.944 | 200.743 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.105 | 0.043 | 0.000 | 0.105 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf907000000000000012b | 201.875 | 0.046 | n/a | 0.000 | 0.000 | 0.611 | 201.028 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.103 | 0.046 | 0.000 | 0.103 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf9070000000000000130 | 201.847 | 0.043 | n/a | 0.000 | 0.000 | 0.771 | 200.855 | 0.006 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.104 | 0.043 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000153 | 201.847 | 0.031 | n/a | 0.000 | 0.000 | 0.763 | 200.905 | 0.006 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.433 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.626 | 200.663 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.079 | 0.043 | 0.000 | 0.079 |
| p99 | 202.327 | n/a | n/a | n/a | 0.102 | n/a | 0.000 | 0.000 | 1.039 | 201.694 | 2.895 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.152 | 0.102 | 0.001 | 0.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 341a8068165cf90700000000000001ac | 205.262 | 0.044 | n/a | 0.000 | 0.000 | 0.590 | 204.470 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.107 | 0.044 | 0.000 | 0.107 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf90700000000000001a1 | 202.327 | 0.032 | n/a | 0.000 | 0.000 | 0.470 | 201.694 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.064 | 0.032 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf90700000000000001c1 | 202.262 | 0.044 | n/a | 0.000 | 0.000 | 0.813 | 201.227 | 0.008 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.094 | 0.044 | 0.000 | 0.094 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000195 | 202.100 | 0.048 | n/a | 0.000 | 0.000 | 0.837 | 201.032 | 0.006 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.111 | 0.048 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf90700000000000001e0 | 202.074 | 0.034 | n/a | 0.000 | 0.000 | 0.649 | 201.238 | 0.011 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.066 | 0.034 | 0.000 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf90700000000000001f8 | 202.026 | 0.036 | n/a | 0.000 | 0.000 | 0.826 | 201.015 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf90700000000000001b6 | 202.014 | 0.060 | n/a | 0.000 | 0.000 | 0.797 | 200.953 | 0.019 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.126 | 0.060 | 0.000 | 0.126 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000192 | 201.982 | 0.041 | n/a | 0.000 | 0.000 | 0.593 | 201.156 | 0.036 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf90700000000000001cc | 201.942 | 0.035 | n/a | 0.000 | 0.000 | 0.819 | 200.943 | 0.006 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.075 | 0.035 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf90700000000000001a6 | 201.926 | 0.032 | n/a | 0.000 | 0.000 | 0.716 | 201.027 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf90700000000000001fc | 201.893 | 0.031 | n/a | 0.000 | 0.000 | 0.822 | 200.905 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.069 | 0.031 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf90700000000000001b7 | 201.885 | 0.033 | n/a | 0.000 | 0.000 | 0.639 | 201.047 | 0.006 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.085 | 0.033 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000204 | 201.883 | 0.076 | n/a | 0.000 | 0.000 | 0.890 | 200.710 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.152 | 0.076 | 0.000 | 0.152 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf90700000000000001b2 | 201.881 | 0.045 | n/a | 0.000 | 0.000 | 0.635 | 201.034 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.101 | 0.045 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf90700000000000001b0 | 201.867 | 0.067 | n/a | 0.000 | 0.000 | 0.826 | 200.787 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.118 | 0.067 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf90700000000000001ab | 201.851 | 0.048 | n/a | 0.000 | 0.000 | 0.810 | 200.797 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.141 | 0.048 | 0.000 | 0.141 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf907000000000000019a | 201.841 | 0.043 | n/a | 0.000 | 0.000 | 0.775 | 200.859 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.098 | 0.043 | 0.000 | 0.098 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf90700000000000001bf | 201.831 | 0.041 | n/a | 0.000 | 0.000 | 1.013 | 200.649 | 0.014 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.071 | 0.041 | 0.000 | 0.071 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf90700000000000001c2 | 201.827 | 0.039 | n/a | 0.000 | 0.000 | 0.730 | 200.923 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.066 | 0.039 | 0.000 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf90700000000000001e6 | 201.813 | 0.046 | n/a | 0.000 | 0.000 | 0.798 | 200.795 | 0.017 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.107 | 0.046 | 0.000 | 0.107 | gw-r/thread-53/journal/page | none observed |

## P3 / L256 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.419 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.589 | 200.697 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.069 | 0.041 | 0.000 | 0.069 |
| p99 | 202.364 | n/a | n/a | n/a | 0.091 | n/a | 0.000 | 0.000 | 0.999 | 201.268 | 2.639 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.126 | 0.091 | 0.001 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 341a8068165cf9070000000000000244 | 205.577 | 0.041 | n/a | 0.000 | 0.000 | 0.883 | 204.500 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.093 | 0.041 | 0.000 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000234 | 202.364 | 0.050 | n/a | 0.000 | 0.000 | 0.836 | 201.268 | 0.010 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.120 | 0.050 | 0.000 | 0.120 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000243 | 202.189 | 0.030 | n/a | 0.000 | 0.000 | 0.999 | 201.011 | 0.009 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.072 | 0.030 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000272 | 202.011 | 0.035 | n/a | 0.000 | 0.000 | 0.773 | 201.063 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.075 | 0.035 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf907000000000000022c | 201.923 | 0.042 | n/a | 0.000 | 0.000 | 0.710 | 200.961 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.135 | 0.042 | 0.000 | 0.135 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf907000000000000021d | 201.903 | 0.052 | n/a | 0.000 | 0.000 | 0.768 | 200.910 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.106 | 0.052 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf9070000000000000266 | 201.885 | 0.048 | n/a | 0.000 | 0.000 | 0.710 | 200.953 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.116 | 0.048 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000271 | 201.884 | 0.042 | n/a | 0.000 | 0.000 | 0.767 | 200.932 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.081 | 0.042 | 0.000 | 0.081 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf907000000000000021b | 201.865 | 0.034 | n/a | 0.000 | 0.000 | 0.682 | 201.020 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.063 | 0.034 | 0.000 | 0.063 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf9070000000000000229 | 201.838 | 0.033 | n/a | 0.000 | 0.000 | 0.658 | 201.005 | 0.005 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf907000000000000024d | 201.829 | 0.030 | n/a | 0.000 | 0.000 | 0.629 | 201.032 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000268 | 201.817 | 0.052 | n/a | 0.000 | 0.000 | 0.820 | 200.778 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.108 | 0.052 | 0.000 | 0.108 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000254 | 201.816 | 0.030 | n/a | 0.000 | 0.000 | 0.577 | 201.022 | 0.006 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.068 | 0.030 | 0.000 | 0.068 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000214 | 201.807 | 0.049 | n/a | 0.000 | 0.000 | 0.712 | 200.884 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.103 | 0.049 | 0.000 | 0.103 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000233 | 201.800 | 0.150 | n/a | 0.000 | 0.000 | 0.646 | 200.824 | 0.008 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.112 | 0.150 | 0.001 | 0.112 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000231 | 201.780 | 0.035 | n/a | 0.000 | 0.000 | 0.619 | 200.977 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.068 | 0.035 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000261 | 201.774 | 0.044 | n/a | 0.000 | 0.000 | 0.701 | 200.841 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.126 | 0.044 | 0.000 | 0.126 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000245 | 201.759 | 0.032 | n/a | 0.000 | 0.000 | 0.741 | 200.852 | 0.006 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000235 | 201.747 | 0.032 | n/a | 0.000 | 0.000 | 0.563 | 200.989 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.089 | 0.032 | 0.000 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf907000000000000022d | 201.734 | 0.036 | n/a | 0.000 | 0.000 | 0.745 | 200.824 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.068 | 0.036 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / read (69 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.770 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.547 | 69.877 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.067 | 0.047 | 0.001 | 0.067 |
| p99 | 203.372 | n/a | n/a | n/a | 0.134 | n/a | 0.000 | 0.000 | 5.433 | 202.537 | 1.037 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.137 | 0.134 | 0.008 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 341a8068165cf907000000000000028a | 203.372 | 0.031 | n/a | 0.000 | 0.000 | 0.685 | 202.537 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.060 | 0.031 | 0.000 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000028e | 202.342 | 0.042 | n/a | 0.000 | 0.000 | 1.041 | 200.984 | 0.030 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.107 | 0.042 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000027d | 201.999 | 0.052 | n/a | 0.000 | 0.000 | 1.035 | 200.778 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.086 | 0.052 | 0.000 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000287 | 201.885 | 0.042 | n/a | 0.000 | 0.000 | 0.749 | 200.893 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.137 | 0.042 | 0.000 | 0.137 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000281 | 201.824 | 0.046 | n/a | 0.000 | 0.000 | 0.656 | 200.919 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.130 | 0.046 | 0.000 | 0.130 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000288 | 201.772 | 0.035 | n/a | 0.000 | 0.000 | 0.490 | 201.094 | 0.010 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000286 | 201.715 | 0.050 | n/a | 0.000 | 0.000 | 0.722 | 200.781 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.104 | 0.050 | 0.000 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf907000000000000028c | 201.590 | 0.031 | n/a | 0.000 | 0.000 | 0.424 | 200.993 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000027f | 201.584 | 0.050 | n/a | 0.000 | 0.000 | 0.647 | 200.730 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.108 | 0.050 | 0.000 | 0.108 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000292 | 201.565 | 0.029 | n/a | 0.000 | 0.000 | 0.635 | 200.783 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.064 | 0.029 | 0.000 | 0.064 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf9070000000000000293 | 201.535 | 0.039 | n/a | 0.000 | 0.000 | 0.662 | 200.703 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.076 | 0.039 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000028d | 201.491 | 0.037 | n/a | 0.000 | 0.000 | 0.644 | 200.663 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.093 | 0.037 | 0.000 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf907000000000000027c | 201.449 | 0.038 | n/a | 0.000 | 0.000 | 0.632 | 200.656 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.070 | 0.038 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf907000000000000028f | 201.429 | 0.029 | n/a | 0.000 | 0.000 | 0.409 | 200.864 | 0.018 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000283 | 201.408 | 0.041 | n/a | 0.000 | 0.000 | 0.678 | 200.551 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.091 | 0.041 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000280 | 201.372 | 0.032 | n/a | 0.000 | 0.000 | 0.491 | 200.716 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.074 | 0.032 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf907000000000000027a | 201.265 | 0.031 | n/a | 0.000 | 0.000 | 0.425 | 200.689 | 0.013 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.058 | 0.031 | 0.000 | 0.058 | gw-r/thread-50/journal/page | none observed |
| 341a8068165cf9070000000000000291 | 201.188 | 0.033 | n/a | 0.000 | 0.000 | 0.522 | 200.529 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.055 | 0.033 | 0.000 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf907000000000000027b | 201.167 | 0.028 | n/a | 0.000 | 0.000 | 0.452 | 200.577 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.065 | 0.028 | 0.000 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000294 | 197.778 | 0.057 | n/a | 0.000 | 0.000 | 0.562 | 197.052 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.087 | 0.057 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / read (211 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 89.993 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.473 | 89.465 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.064 | 0.039 | 0.000 | 0.064 |
| p99 | 202.112 | n/a | n/a | n/a | 0.111 | n/a | 0.000 | 0.000 | 1.844 | 200.826 | 1.613 | 0.219 | 0.102 | 0.000 | n/a | n/a | 0.182 | 0.111 | 0.002 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 341a8068165cf9070000000000000efc | 202.504 | 0.036 | n/a | 0.000 | 0.000 | 1.321 | 201.017 | 0.014 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.061 | 0.036 | 0.000 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000f16 | 202.249 | 0.049 | n/a | 0.000 | 0.000 | 0.509 | 181.088 | 0.002 | 20.503 | 0.016 | 0.000 | n/a | n/a | 0.082 | 0.049 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000f2e | 202.112 | 0.028 | n/a | 0.000 | 0.000 | 1.329 | 200.633 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.077 | 0.028 | 0.000 | 0.077 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000ec1 | 201.708 | 0.032 | n/a | 0.000 | 0.000 | 0.484 | 201.051 | 0.012 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 341a8068165cf9070000000000000ed6 | 201.676 | 0.039 | n/a | 0.000 | 0.000 | 0.660 | 200.826 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.094 | 0.039 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000f0f | 201.626 | 0.040 | n/a | 0.000 | 0.000 | 0.580 | 200.734 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.217 | 0.040 | 0.000 | 0.217 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000ef9 | 201.606 | 0.036 | n/a | 0.000 | 0.000 | 0.749 | 200.709 | 0.003 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000ee3 | 201.559 | 0.047 | n/a | 0.000 | 0.000 | 0.665 | 200.683 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.113 | 0.047 | 0.000 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000eca | 201.548 | 0.039 | n/a | 0.000 | 0.000 | 0.676 | 200.707 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000ee4 | 201.496 | 0.049 | n/a | 0.000 | 0.000 | 0.705 | 200.623 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.073 | 0.049 | 0.000 | 0.073 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000ecf | 201.487 | 0.035 | n/a | 0.000 | 0.000 | 0.487 | 200.806 | 0.022 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.088 | 0.035 | 0.000 | 0.088 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000f0b | 201.474 | 0.031 | n/a | 0.000 | 0.000 | 0.558 | 200.757 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.090 | 0.031 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 341a8068165cf9070000000000000f03 | 201.450 | 0.036 | n/a | 0.000 | 0.000 | 0.591 | 200.683 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.099 | 0.036 | 0.000 | 0.099 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000f0c | 201.437 | 0.030 | n/a | 0.000 | 0.000 | 0.485 | 200.800 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.067 | 0.030 | 0.000 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000ec6 | 201.361 | 0.031 | n/a | 0.000 | 0.000 | 0.452 | 200.758 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 341a8068165cf9070000000000000ef6 | 201.349 | 0.040 | n/a | 0.000 | 0.000 | 0.533 | 200.660 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000ec5 | 201.341 | 0.031 | n/a | 0.000 | 0.000 | 0.559 | 200.605 | 0.004 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 341a8068165cf9070000000000000ef8 | 201.328 | 0.040 | n/a | 0.000 | 0.000 | 0.632 | 200.517 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.098 | 0.040 | 0.000 | 0.098 | gw-r/thread-51/journal/page | none observed |
| 341a8068165cf9070000000000000ecd | 201.322 | 0.032 | n/a | 0.000 | 0.000 | 0.678 | 200.513 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.061 | 0.032 | 0.000 | 0.061 | gw-r/thread-54/journal/page | none observed |
| 341a8068165cf9070000000000000ebf | 201.318 | 0.040 | n/a | 0.000 | 0.000 | 0.563 | 200.603 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.071 | 0.040 | 0.000 | 0.071 | gw-r/thread-53/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (29.691 ms, trace `590490e5f639f24600000000000000f1`); `tx/thread-83/transactor.triplex-function` (35.003 ms, trace `590490e5f639f246000000000000025d`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (14.335 ms, trace `590490e5f639f24600000000000000f3`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (19.008 ms, trace `590490e5f639f2460000000000000237`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (21.918 ms, trace `590490e5f639f24600000000000000f2`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-idle-b-1-plain`; source `a0785bcf96f7afea3965b3028db2e27f4fbef6a9`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 1250/1250 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 1250/1250. Raw trace bytes: 18764045.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 4068 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 6001.366 | 1266.036 | 11.825 | 4049 |
| idle-10 | 0 | 2496.440 | 687.924 | 6.809 | 3042 |
| idle-25 | 0 | 4740.699 | 762.465 | 6.904 | 3034 |
| idle-50 | 0 | 8462.178 | 831.932 | 5.580 | 3034 |
| idle-100 | 0 | 15911.278 | 916.866 | 10.510 | 3034 |
| idle-250 | 0 | 38266.532 | 1231.333 | 17.739 | 3030 |
| idle-500 | 0 | 75510.187 | 1799.493 | 41.501 | 3034 |
| idle-1000 | 0 | 148015.131 | 2632.714 | 92.100 | 3012 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 590490e5f639f24600000000000000f1 | driver.queue.scheduler-dispatch | 0.153 | none | 0 / 32 |
| 590490e5f639f24600000000000000f1 | driver.queue.scheduler-late | 0.036 | none | 0 / 32 |

Observed active steps while trace 590490e5f639f24600000000000000f1 waited: []

| 590490e5f639f246000000000000025d | driver.queue.scheduler-dispatch | 0.036 | none | 0 / 32 |
| 590490e5f639f246000000000000025d | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 590490e5f639f246000000000000025d waited: []

| 590490e5f639f24600000000000000f3 | driver.queue.scheduler-dispatch | 0.158 | none | 2 / 32 |
| 590490e5f639f24600000000000000f3 | driver.queue.scheduler-late | 0.006 | none | 2 / 32 |

Observed active steps while trace 590490e5f639f24600000000000000f3 waited: []

| 590490e5f639f2460000000000000237 | driver.queue.scheduler-dispatch | 0.032 | none | 0 / 32 |
| 590490e5f639f2460000000000000237 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 590490e5f639f2460000000000000237 waited: []

| 590490e5f639f24600000000000000f2 | driver.queue.scheduler-late | 1.216 | none | 1 / 32 |
| 590490e5f639f24600000000000000f2 | driver.queue.scheduler-dispatch | 0.072 | none | 1 / 32 |

Observed active steps while trace 590490e5f639f24600000000000000f2 waited: []

## P2 / warmup / commit (201 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.054 | 0.743 | 0.000 | 0.523 | 2.278 | n/a | 0.000 | 0.046 | 0.814 | 1.406 | 0.020 | 0.000 | 0.280 | 5.745 | 0.572 | n/a | 0.022 | 2.366 | 0.188 | 0.022 |
| p99 | 42.890 | 2.003 | 0.021 | 1.252 | 5.255 | n/a | 0.000 | 2.155 | 4.527 | 6.020 | 0.133 | 0.000 | 3.778 | 19.008 | 10.271 | n/a | 0.080 | 6.963 | 0.397 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f24600000000000000f1 | 61.310 | 8.483 | n/a | 1.479 | 0.189 | 4.527 | 8.677 | 0.053 | 0.000 | 0.177 | 29.691 | 7.873 | n/a | 0.160 | 10.151 | 0.166 | 0.160 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 590490e5f639f246000000000000025d | 46.495 | 2.122 | n/a | 0.000 | 0.038 | 0.868 | 1.083 | 0.017 | 0.000 | 0.086 | 7.255 | 35.003 | n/a | 0.022 | 2.160 | 0.046 | 0.022 | tx/thread-83/transactor.triplex-function | none observed |
| 590490e5f639f24600000000000000f3 | 42.890 | 4.285 | n/a | 1.683 | 0.164 | 14.366 | 1.760 | 0.020 | 0.000 | 1.435 | 14.335 | 4.780 | n/a | 0.062 | 6.132 | 0.143 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 1.788ms; driver.expected-state.bind-receipt 1.113ms; driver.publication.readback 0.158ms; driver.publication.persist-deferred 0.125ms; driver.publication.persist-deferred 0.022ms |
| 590490e5f639f2460000000000000237 | 40.822 | 3.134 | n/a | 0.000 | 0.036 | 2.611 | 1.252 | 0.019 | 0.000 | 0.691 | 19.008 | 14.048 | n/a | 0.023 | 3.170 | 0.078 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.040ms |
| 590490e5f639f24600000000000000f2 | 40.509 | 5.255 | n/a | 0.000 | 1.287 | 4.517 | 2.075 | 0.020 | 0.000 | 3.378 | 21.918 | 2.025 | n/a | 0.033 | 6.542 | 0.161 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.113ms; driver.publication.persist-deferred 0.125ms |
| 590490e5f639f2460000000000000238 | 31.519 | 3.428 | n/a | 0.000 | 0.106 | 1.691 | 1.127 | 0.021 | 0.000 | 0.137 | 14.657 | 10.271 | n/a | 0.080 | 3.534 | 0.112 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.049ms |
| 590490e5f639f2460000000000000267 | 28.472 | 2.781 | n/a | 0.000 | 0.252 | 14.281 | 2.589 | 0.133 | 0.000 | 0.207 | 7.734 | 0.468 | n/a | 0.026 | 3.034 | 0.107 | 0.026 | node-13/thread-0/socket.wait-first-byte | none observed |
| 590490e5f639f24600000000000001fa | 24.228 | 2.627 | n/a | 0.000 | 0.038 | 0.907 | 1.738 | 0.039 | 0.000 | 4.845 | 5.160 | 8.854 | n/a | 0.020 | 2.665 | 0.110 | 0.020 | tx/thread-83/transactor.triplex-function | driver.reader-basis.broadcast 0.066ms |
| 590490e5f639f246000000000000025e | 22.724 | 3.438 | n/a | 0.000 | 0.094 | 1.119 | 1.247 | 0.025 | 0.000 | 0.447 | 15.552 | 0.744 | n/a | 0.058 | 3.532 | 0.155 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.016ms |
| 590490e5f639f2460000000000000235 | 22.557 | 3.124 | n/a | 0.000 | 0.097 | 0.747 | 1.735 | 0.015 | 0.000 | 3.020 | 13.109 | 0.654 | n/a | 0.057 | 3.220 | 0.143 | 0.057 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000152 | 21.215 | 2.250 | n/a | 0.000 | 0.063 | 0.697 | 1.241 | 0.018 | 0.000 | 3.404 | 12.291 | 1.230 | n/a | 0.022 | 2.313 | 0.109 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000276 | 21.063 | 4.165 | n/a | 0.000 | 3.386 | 0.881 | 1.059 | 0.018 | 0.000 | 0.111 | 10.865 | 0.551 | n/a | 0.029 | 7.550 | 0.358 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000011b | 20.777 | 2.303 | n/a | 0.000 | 0.056 | 0.940 | 6.854 | 0.058 | 0.000 | 0.126 | 9.051 | 1.368 | n/a | 0.022 | 2.359 | 0.114 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000012c | 19.907 | 3.732 | n/a | 0.000 | 0.085 | 0.882 | 3.803 | 0.020 | 0.000 | 0.682 | 9.543 | 1.130 | n/a | 0.030 | 3.817 | 0.192 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000109 | 19.818 | 5.010 | n/a | 0.000 | 0.241 | 1.391 | 2.167 | 0.057 | 0.000 | 3.778 | 6.425 | 0.677 | n/a | 0.073 | 5.251 | 0.265 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000111 | 19.769 | 4.588 | n/a | 0.000 | 0.965 | 0.963 | 1.538 | 0.019 | 0.000 | 0.158 | 8.329 | 3.175 | n/a | 0.034 | 5.553 | 0.281 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000107 | 19.761 | 3.312 | n/a | 0.000 | 0.434 | 0.772 | 2.152 | 0.021 | 0.000 | 0.125 | 11.547 | 1.379 | n/a | 0.020 | 3.746 | 0.190 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 590490e5f639f246000000000000010f | 19.721 | 2.425 | n/a | 0.000 | 0.538 | 1.018 | 2.546 | 0.059 | 0.000 | 0.752 | 11.397 | 0.965 | n/a | 0.022 | 2.962 | 0.150 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 590490e5f639f2460000000000000263 | 19.649 | 3.815 | n/a | 0.000 | 0.329 | 4.125 | 1.697 | 0.054 | 0.000 | 0.112 | 8.965 | 0.510 | n/a | 0.042 | 4.144 | 0.211 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.171ms |
| 590490e5f639f2460000000000000121 | 19.584 | 2.934 | n/a | 0.000 | 0.076 | 0.884 | 4.923 | 0.063 | 0.000 | 2.797 | 7.289 | 0.588 | n/a | 0.030 | 3.009 | 0.154 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (201 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.054 | 0.743 | 0.000 | 0.523 | 2.278 | n/a | 0.000 | 0.046 | 0.814 | 1.406 | 0.020 | 0.000 | 0.280 | 5.745 | 0.572 | n/a | 0.022 | 2.366 | 0.188 | 0.022 |
| p99 | 42.890 | 2.003 | 0.021 | 1.252 | 5.255 | n/a | 0.000 | 2.155 | 4.527 | 6.020 | 0.133 | 0.000 | 3.778 | 19.008 | 10.271 | n/a | 0.080 | 6.963 | 0.397 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f24600000000000000f1 | 61.310 | 8.483 | n/a | 1.479 | 0.189 | 4.527 | 8.677 | 0.053 | 0.000 | 0.177 | 29.691 | 7.873 | n/a | 0.160 | 10.151 | 0.166 | 0.160 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 590490e5f639f246000000000000025d | 46.495 | 2.122 | n/a | 0.000 | 0.038 | 0.868 | 1.083 | 0.017 | 0.000 | 0.086 | 7.255 | 35.003 | n/a | 0.022 | 2.160 | 0.046 | 0.022 | tx/thread-83/transactor.triplex-function | none observed |
| 590490e5f639f24600000000000000f3 | 42.890 | 4.285 | n/a | 1.683 | 0.164 | 14.366 | 1.760 | 0.020 | 0.000 | 1.435 | 14.335 | 4.780 | n/a | 0.062 | 6.132 | 0.143 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 1.788ms; driver.expected-state.bind-receipt 1.113ms; driver.publication.readback 0.158ms; driver.publication.persist-deferred 0.125ms; driver.publication.persist-deferred 0.022ms |
| 590490e5f639f2460000000000000237 | 40.822 | 3.134 | n/a | 0.000 | 0.036 | 2.611 | 1.252 | 0.019 | 0.000 | 0.691 | 19.008 | 14.048 | n/a | 0.023 | 3.170 | 0.078 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.040ms |
| 590490e5f639f24600000000000000f2 | 40.509 | 5.255 | n/a | 0.000 | 1.287 | 4.517 | 2.075 | 0.020 | 0.000 | 3.378 | 21.918 | 2.025 | n/a | 0.033 | 6.542 | 0.161 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.113ms; driver.publication.persist-deferred 0.125ms |
| 590490e5f639f2460000000000000238 | 31.519 | 3.428 | n/a | 0.000 | 0.106 | 1.691 | 1.127 | 0.021 | 0.000 | 0.137 | 14.657 | 10.271 | n/a | 0.080 | 3.534 | 0.112 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.049ms |
| 590490e5f639f2460000000000000267 | 28.472 | 2.781 | n/a | 0.000 | 0.252 | 14.281 | 2.589 | 0.133 | 0.000 | 0.207 | 7.734 | 0.468 | n/a | 0.026 | 3.034 | 0.107 | 0.026 | node-13/thread-0/socket.wait-first-byte | none observed |
| 590490e5f639f24600000000000001fa | 24.228 | 2.627 | n/a | 0.000 | 0.038 | 0.907 | 1.738 | 0.039 | 0.000 | 4.845 | 5.160 | 8.854 | n/a | 0.020 | 2.665 | 0.110 | 0.020 | tx/thread-83/transactor.triplex-function | driver.reader-basis.broadcast 0.066ms |
| 590490e5f639f246000000000000025e | 22.724 | 3.438 | n/a | 0.000 | 0.094 | 1.119 | 1.247 | 0.025 | 0.000 | 0.447 | 15.552 | 0.744 | n/a | 0.058 | 3.532 | 0.155 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.016ms |
| 590490e5f639f2460000000000000235 | 22.557 | 3.124 | n/a | 0.000 | 0.097 | 0.747 | 1.735 | 0.015 | 0.000 | 3.020 | 13.109 | 0.654 | n/a | 0.057 | 3.220 | 0.143 | 0.057 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000152 | 21.215 | 2.250 | n/a | 0.000 | 0.063 | 0.697 | 1.241 | 0.018 | 0.000 | 3.404 | 12.291 | 1.230 | n/a | 0.022 | 2.313 | 0.109 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000276 | 21.063 | 4.165 | n/a | 0.000 | 3.386 | 0.881 | 1.059 | 0.018 | 0.000 | 0.111 | 10.865 | 0.551 | n/a | 0.029 | 7.550 | 0.358 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000011b | 20.777 | 2.303 | n/a | 0.000 | 0.056 | 0.940 | 6.854 | 0.058 | 0.000 | 0.126 | 9.051 | 1.368 | n/a | 0.022 | 2.359 | 0.114 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000012c | 19.907 | 3.732 | n/a | 0.000 | 0.085 | 0.882 | 3.803 | 0.020 | 0.000 | 0.682 | 9.543 | 1.130 | n/a | 0.030 | 3.817 | 0.192 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000109 | 19.818 | 5.010 | n/a | 0.000 | 0.241 | 1.391 | 2.167 | 0.057 | 0.000 | 3.778 | 6.425 | 0.677 | n/a | 0.073 | 5.251 | 0.265 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000111 | 19.769 | 4.588 | n/a | 0.000 | 0.965 | 0.963 | 1.538 | 0.019 | 0.000 | 0.158 | 8.329 | 3.175 | n/a | 0.034 | 5.553 | 0.281 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000107 | 19.761 | 3.312 | n/a | 0.000 | 0.434 | 0.772 | 2.152 | 0.021 | 0.000 | 0.125 | 11.547 | 1.379 | n/a | 0.020 | 3.746 | 0.190 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 590490e5f639f246000000000000010f | 19.721 | 2.425 | n/a | 0.000 | 0.538 | 1.018 | 2.546 | 0.059 | 0.000 | 0.752 | 11.397 | 0.965 | n/a | 0.022 | 2.962 | 0.150 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 590490e5f639f2460000000000000263 | 19.649 | 3.815 | n/a | 0.000 | 0.329 | 4.125 | 1.697 | 0.054 | 0.000 | 0.112 | 8.965 | 0.510 | n/a | 0.042 | 4.144 | 0.211 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.171ms |
| 590490e5f639f2460000000000000121 | 19.584 | 2.934 | n/a | 0.000 | 0.076 | 0.884 | 4.923 | 0.063 | 0.000 | 2.797 | 7.289 | 0.588 | n/a | 0.030 | 3.009 | 0.154 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.969 | n/a | n/a | n/a | 12.314 | 2.565 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 13.582 | 0.998 | 0.009 |
| p99 | 70.132 | n/a | n/a | n/a | 33.702 | 23.700 | 1.851 | 0.000 | 27.971 | 30.748 | 6.755 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.046 | 37.079 | 1.000 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f24600000000000000fa | 70.132 | 14.159 | 22.635 | 0.258 | 0.000 | 2.290 | 30.748 | 0.021 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.007 | 37.053 | 0.528 | 0.007 | gw-r/thread-49/gateway.route | driver.publication.persist-deferred 0.336ms; driver.publication.readback 0.138ms; driver.publication.readback 0.120ms; driver.publication.readback 0.118ms; driver.publication.readback 0.085ms |
| 590490e5f639f24600000000000000f4 | 63.521 | 33.702 | 1.526 | 1.851 | 0.000 | 5.071 | 21.220 | 0.045 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.046 | 37.079 | 0.584 | 0.046 | gw-r/thread-50/gateway.admitted-work | driver.publication.readback 1.788ms; driver.publication.persist-deferred 0.336ms; driver.publication.readback 0.158ms; driver.publication.persist-deferred 0.125ms; driver.publication.readback 0.120ms |
| 590490e5f639f24600000000000000f5 | 62.618 | 12.314 | 2.565 | 0.172 | 0.000 | 27.971 | 12.762 | 6.755 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.011 | 15.051 | 0.240 | 0.011 | node-13/thread-3/socket.wait-first-byte | driver.publication.readback 1.788ms; driver.publication.persist-deferred 0.336ms; driver.publication.readback 0.158ms; driver.publication.readback 0.120ms; driver.publication.readback 0.118ms |
| 590490e5f639f24600000000000000f9 | 39.133 | 12.980 | 23.700 | 0.210 | 0.000 | 0.824 | 1.367 | 0.015 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.010 | 36.891 | 0.943 | 0.010 | node-13/thread-0/rpc.replica.observe | driver.publication.persist-deferred 0.336ms; driver.publication.readback 0.120ms; driver.publication.readback 0.118ms; driver.publication.readback 0.085ms; driver.reader-basis.broadcast 0.055ms |
| 590490e5f639f2460000000000000101 | 38.950 | 14.188 | 14.397 | 0.470 | 0.000 | 8.952 | 0.916 | 0.006 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.011 | 29.055 | 0.746 | 0.011 | node-13/thread-2/replica.pull-at | driver.publication.readback 0.138ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.023ms |
| 590490e5f639f2460000000000000a45 | 35.853 | 18.152 | 0.577 | 1.178 | 0.000 | 14.102 | 1.824 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.010 | 19.907 | 0.555 | 0.010 | node-13/thread-3/socket.wait-first-byte | driver.publication.readback 0.157ms; driver.publication.persist-deferred 0.018ms |
| 590490e5f639f24600000000000000fc | 30.224 | 11.548 | 0.428 | 0.537 | 0.000 | 16.383 | 1.286 | 0.006 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.016 | 12.513 | 0.414 | 0.016 | node-13/thread-3/socket.wait-first-byte | driver.publication.readback 0.138ms; driver.publication.readback 0.085ms; driver.publication.persist-deferred 0.044ms; driver.publication.persist-deferred 0.023ms |
| 590490e5f639f2460000000000000adf | 25.556 | 14.266 | 0.400 | 0.677 | 0.000 | 5.390 | 4.801 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.010 | 15.343 | 0.600 | 0.010 | node-13/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.132ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.016ms |
| 590490e5f639f2460000000000000301 | 25.422 | 15.838 | 3.402 | 1.445 | 0.000 | 3.936 | 0.781 | 0.003 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.009 | 20.686 | 0.814 | 0.009 | node-13/thread-2/replica.pull-at | driver.publication.readback 0.060ms; driver.publication.readback 0.059ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f2460000000000000302 | 23.984 | 14.122 | 1.439 | 0.428 | 0.000 | 7.052 | 0.925 | 0.003 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.008 | 15.989 | 0.667 | 0.008 | node-13/thread-2/replica.pull-at | driver.publication.readback 0.059ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.014ms; driver.publication.persist-deferred 0.013ms |
| 590490e5f639f2460000000000000104 | 22.011 | 16.309 | 5.693 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 22.002 | 1.000 | 0.009 | node-13/thread-2/replica.pull-at | driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.028ms |
| 590490e5f639f246000000000000035e | 13.969 | 9.461 | 4.497 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 13.958 | 0.999 | 0.011 | node-13/thread-2/replica.pull-at | driver.publication.readback 0.048ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f2460000000000000260 | 13.590 | 3.093 | 10.488 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 13.582 | 0.999 | 0.008 | node-13/thread-0/rpc.replica.observe | driver.publication.readback 0.162ms; driver.publication.readback 0.023ms; driver.publication.persist-deferred 0.007ms |
| 590490e5f639f246000000000000035f | 13.404 | 9.539 | 3.860 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 13.398 | 1.000 | 0.006 | node-13/thread-2/replica.pull-at | driver.publication.readback 0.048ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f24600000000000005c2 | 13.062 | 13.000 | 0.053 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 13.053 | 0.999 | 0.009 | node-13/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.063ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f24600000000000001f3 | 12.610 | 12.559 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 12.601 | 0.999 | 0.009 | node-13/thread-2/replica.pull-at | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.015ms |
| 590490e5f639f2460000000000000307 | 12.458 | 4.808 | 7.641 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 12.449 | 0.999 | 0.009 | node-13/thread-0/rpc.replica.observe | driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f24600000000000002ff | 12.294 | 10.820 | 1.467 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 12.286 | 0.999 | 0.008 | node-13/thread-2/replica.pull-at | driver.publication.readback 0.071ms; driver.publication.readback 0.060ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.009ms |
| 590490e5f639f24600000000000002a3 | 12.060 | 0.276 | 11.773 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 12.050 | 0.999 | 0.010 | node-13/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.092ms; driver.publication.readback 0.087ms; driver.publication.persist-deferred 0.019ms |
| 590490e5f639f2460000000000000940 | 11.911 | 10.378 | 0.074 | 1.446 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 11.898 | 0.999 | 0.013 | node-13/thread-2/replica.pull-at | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.015ms |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.017 | 0.000 | 0.000 | 0.387 | 1.936 | n/a | 0.000 | 0.060 | 3.976 | 1.055 | 0.020 | 0.000 | 0.073 | 5.327 | 0.548 | n/a | 0.024 | 1.995 | 0.153 | 0.024 |
| p99 | 13.017 | 0.000 | 0.000 | 0.387 | 1.936 | n/a | 0.000 | 0.060 | 3.976 | 1.055 | 0.020 | 0.000 | 0.073 | 5.327 | 0.548 | n/a | 0.024 | 1.995 | 0.153 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f246000000000000028e | 13.017 | 1.936 | n/a | 0.000 | 0.060 | 3.976 | 1.055 | 0.020 | 0.000 | 0.073 | 5.327 | 0.548 | n/a | 0.024 | 1.995 | 0.153 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.119ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.017ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.017 | 0.000 | 0.000 | 0.387 | 1.936 | n/a | 0.000 | 0.060 | 3.976 | 1.055 | 0.020 | 0.000 | 0.073 | 5.327 | 0.548 | n/a | 0.024 | 1.995 | 0.153 | 0.024 |
| p99 | 13.017 | 0.000 | 0.000 | 0.387 | 1.936 | n/a | 0.000 | 0.060 | 3.976 | 1.055 | 0.020 | 0.000 | 0.073 | 5.327 | 0.548 | n/a | 0.024 | 1.995 | 0.153 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f246000000000000028e | 13.017 | 1.936 | n/a | 0.000 | 0.060 | 3.976 | 1.055 | 0.020 | 0.000 | 0.073 | 5.327 | 0.548 | n/a | 0.024 | 1.995 | 0.153 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.119ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.017ms |

## P2 / idle-10 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.659 | 0.608 | 0.000 | 0.479 | 2.025 | n/a | 0.000 | 0.049 | 0.741 | 1.401 | 0.020 | 0.000 | 0.230 | 6.338 | 0.512 | n/a | 0.020 | 2.210 | 0.173 | 0.020 |
| p99 | 26.961 | 2.013 | 0.048 | 0.962 | 3.720 | n/a | 0.000 | 3.281 | 5.057 | 4.992 | 0.834 | 0.000 | 4.449 | 18.046 | 2.599 | n/a | 0.072 | 5.368 | 0.375 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f2460000000000000333 | 28.698 | 3.356 | n/a | 0.000 | 0.091 | 8.696 | 2.095 | 0.046 | 0.000 | 0.105 | 13.451 | 0.795 | n/a | 0.062 | 3.448 | 0.120 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f2460000000000000332 | 26.961 | 1.542 | n/a | 0.000 | 0.139 | 0.615 | 1.411 | 0.015 | 0.000 | 0.099 | 22.367 | 0.761 | n/a | 0.012 | 1.681 | 0.062 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f24600000000000002c7 | 25.924 | 2.542 | n/a | 0.000 | 0.984 | 5.057 | 2.287 | 0.017 | 0.000 | 0.109 | 13.887 | 1.018 | n/a | 0.024 | 3.526 | 0.136 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.146ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.037ms |
| 590490e5f639f24600000000000002ac | 24.428 | 2.067 | n/a | 0.000 | 0.103 | 0.978 | 1.723 | 0.048 | 0.000 | 0.135 | 18.046 | 1.262 | n/a | 0.067 | 2.170 | 0.089 | 0.067 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.016ms |
| 590490e5f639f2460000000000000355 | 22.802 | 1.609 | n/a | 0.000 | 0.014 | 0.749 | 2.274 | 0.041 | 0.000 | 5.096 | 12.479 | 0.530 | n/a | 0.010 | 1.622 | 0.071 | 0.010 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.020ms |
| 590490e5f639f2460000000000000353 | 22.040 | 1.656 | n/a | 0.000 | 0.034 | 1.097 | 2.869 | 0.032 | 0.000 | 0.381 | 15.435 | 0.490 | n/a | 0.046 | 1.691 | 0.077 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f246000000000000036f | 20.586 | 2.663 | n/a | 0.000 | 0.092 | 0.952 | 2.294 | 0.044 | 0.000 | 0.123 | 13.846 | 0.509 | n/a | 0.063 | 2.755 | 0.134 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.015ms |
| 590490e5f639f24600000000000002fb | 20.540 | 1.677 | n/a | 0.000 | 0.603 | 0.808 | 6.224 | 0.020 | 0.000 | 3.247 | 6.834 | 1.115 | n/a | 0.012 | 2.281 | 0.111 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.103ms; driver.publication.persist-deferred 0.018ms |
| 590490e5f639f24600000000000002f0 | 20.407 | 2.724 | n/a | 0.000 | 0.037 | 0.776 | 1.160 | 0.020 | 0.000 | 3.763 | 11.258 | 0.648 | n/a | 0.023 | 2.760 | 0.135 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.115ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f2460000000000000358 | 19.790 | 2.027 | n/a | 0.000 | 0.048 | 1.383 | 1.914 | 0.033 | 0.000 | 1.761 | 12.088 | 0.513 | n/a | 0.024 | 2.075 | 0.105 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.reader-basis.broadcast 0.138ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.037ms; driver.publication.persist-deferred 0.021ms |
| 590490e5f639f2460000000000000334 | 19.788 | 1.408 | n/a | 0.000 | 0.029 | 2.449 | 1.585 | 0.021 | 0.000 | 0.071 | 13.573 | 0.635 | n/a | 0.016 | 1.437 | 0.073 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f24600000000000002ee | 19.639 | 1.877 | n/a | 0.000 | 0.056 | 0.573 | 4.142 | 0.043 | 0.000 | 0.086 | 11.677 | 1.161 | n/a | 0.025 | 1.933 | 0.098 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f2460000000000000351 | 19.536 | 1.746 | n/a | 0.000 | 0.024 | 0.559 | 2.762 | 0.016 | 0.000 | 0.362 | 12.959 | 1.087 | n/a | 0.021 | 1.770 | 0.091 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.016ms |
| 590490e5f639f246000000000000035b | 19.340 | 2.087 | n/a | 0.000 | 3.281 | 0.574 | 1.439 | 0.016 | 0.000 | 2.826 | 8.593 | 0.503 | n/a | 0.020 | 5.368 | 0.278 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f2460000000000000356 | 19.272 | 2.484 | n/a | 0.000 | 0.039 | 0.690 | 2.866 | 0.057 | 0.000 | 3.176 | 7.763 | 2.175 | n/a | 0.023 | 2.523 | 0.131 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.138ms; driver.publication.readback 0.062ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.020ms |
| 590490e5f639f2460000000000000294 | 19.259 | 2.886 | n/a | 0.000 | 0.068 | 0.663 | 0.920 | 0.021 | 0.000 | 0.598 | 12.626 | 1.445 | n/a | 0.033 | 2.954 | 0.153 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f2460000000000000339 | 19.041 | 2.532 | n/a | 0.000 | 0.014 | 0.980 | 4.992 | 0.031 | 0.000 | 0.820 | 9.167 | 0.491 | n/a | 0.014 | 2.546 | 0.134 | 0.014 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f24600000000000002d8 | 18.958 | 2.200 | n/a | 0.000 | 0.694 | 0.732 | 1.445 | 0.015 | 0.000 | 0.046 | 13.273 | 0.535 | n/a | 0.018 | 2.894 | 0.153 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f24600000000000002de | 18.475 | 1.949 | n/a | 0.000 | 0.042 | 0.898 | 1.676 | 0.046 | 0.000 | 0.121 | 12.383 | 1.339 | n/a | 0.022 | 1.991 | 0.108 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.115ms; driver.publication.readback 0.109ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f2460000000000000296 | 18.424 | 3.618 | n/a | 0.000 | 0.084 | 3.215 | 1.446 | 0.017 | 0.000 | 0.065 | 9.393 | 0.548 | n/a | 0.037 | 3.703 | 0.201 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.053ms |

## P2 / idle-10 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.659 | 0.608 | 0.000 | 0.479 | 2.025 | n/a | 0.000 | 0.049 | 0.741 | 1.401 | 0.020 | 0.000 | 0.230 | 6.338 | 0.512 | n/a | 0.020 | 2.210 | 0.173 | 0.020 |
| p99 | 26.961 | 2.013 | 0.048 | 0.962 | 3.720 | n/a | 0.000 | 3.281 | 5.057 | 4.992 | 0.834 | 0.000 | 4.449 | 18.046 | 2.599 | n/a | 0.072 | 5.368 | 0.375 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f2460000000000000333 | 28.698 | 3.356 | n/a | 0.000 | 0.091 | 8.696 | 2.095 | 0.046 | 0.000 | 0.105 | 13.451 | 0.795 | n/a | 0.062 | 3.448 | 0.120 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f2460000000000000332 | 26.961 | 1.542 | n/a | 0.000 | 0.139 | 0.615 | 1.411 | 0.015 | 0.000 | 0.099 | 22.367 | 0.761 | n/a | 0.012 | 1.681 | 0.062 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f24600000000000002c7 | 25.924 | 2.542 | n/a | 0.000 | 0.984 | 5.057 | 2.287 | 0.017 | 0.000 | 0.109 | 13.887 | 1.018 | n/a | 0.024 | 3.526 | 0.136 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.146ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.037ms |
| 590490e5f639f24600000000000002ac | 24.428 | 2.067 | n/a | 0.000 | 0.103 | 0.978 | 1.723 | 0.048 | 0.000 | 0.135 | 18.046 | 1.262 | n/a | 0.067 | 2.170 | 0.089 | 0.067 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.016ms |
| 590490e5f639f2460000000000000355 | 22.802 | 1.609 | n/a | 0.000 | 0.014 | 0.749 | 2.274 | 0.041 | 0.000 | 5.096 | 12.479 | 0.530 | n/a | 0.010 | 1.622 | 0.071 | 0.010 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.020ms |
| 590490e5f639f2460000000000000353 | 22.040 | 1.656 | n/a | 0.000 | 0.034 | 1.097 | 2.869 | 0.032 | 0.000 | 0.381 | 15.435 | 0.490 | n/a | 0.046 | 1.691 | 0.077 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f246000000000000036f | 20.586 | 2.663 | n/a | 0.000 | 0.092 | 0.952 | 2.294 | 0.044 | 0.000 | 0.123 | 13.846 | 0.509 | n/a | 0.063 | 2.755 | 0.134 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.015ms |
| 590490e5f639f24600000000000002fb | 20.540 | 1.677 | n/a | 0.000 | 0.603 | 0.808 | 6.224 | 0.020 | 0.000 | 3.247 | 6.834 | 1.115 | n/a | 0.012 | 2.281 | 0.111 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.103ms; driver.publication.persist-deferred 0.018ms |
| 590490e5f639f24600000000000002f0 | 20.407 | 2.724 | n/a | 0.000 | 0.037 | 0.776 | 1.160 | 0.020 | 0.000 | 3.763 | 11.258 | 0.648 | n/a | 0.023 | 2.760 | 0.135 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.115ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f2460000000000000358 | 19.790 | 2.027 | n/a | 0.000 | 0.048 | 1.383 | 1.914 | 0.033 | 0.000 | 1.761 | 12.088 | 0.513 | n/a | 0.024 | 2.075 | 0.105 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.reader-basis.broadcast 0.138ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.037ms; driver.publication.persist-deferred 0.021ms |
| 590490e5f639f2460000000000000334 | 19.788 | 1.408 | n/a | 0.000 | 0.029 | 2.449 | 1.585 | 0.021 | 0.000 | 0.071 | 13.573 | 0.635 | n/a | 0.016 | 1.437 | 0.073 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f24600000000000002ee | 19.639 | 1.877 | n/a | 0.000 | 0.056 | 0.573 | 4.142 | 0.043 | 0.000 | 0.086 | 11.677 | 1.161 | n/a | 0.025 | 1.933 | 0.098 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f2460000000000000351 | 19.536 | 1.746 | n/a | 0.000 | 0.024 | 0.559 | 2.762 | 0.016 | 0.000 | 0.362 | 12.959 | 1.087 | n/a | 0.021 | 1.770 | 0.091 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.016ms |
| 590490e5f639f246000000000000035b | 19.340 | 2.087 | n/a | 0.000 | 3.281 | 0.574 | 1.439 | 0.016 | 0.000 | 2.826 | 8.593 | 0.503 | n/a | 0.020 | 5.368 | 0.278 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f2460000000000000356 | 19.272 | 2.484 | n/a | 0.000 | 0.039 | 0.690 | 2.866 | 0.057 | 0.000 | 3.176 | 7.763 | 2.175 | n/a | 0.023 | 2.523 | 0.131 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.138ms; driver.publication.readback 0.062ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.020ms |
| 590490e5f639f2460000000000000294 | 19.259 | 2.886 | n/a | 0.000 | 0.068 | 0.663 | 0.920 | 0.021 | 0.000 | 0.598 | 12.626 | 1.445 | n/a | 0.033 | 2.954 | 0.153 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f2460000000000000339 | 19.041 | 2.532 | n/a | 0.000 | 0.014 | 0.980 | 4.992 | 0.031 | 0.000 | 0.820 | 9.167 | 0.491 | n/a | 0.014 | 2.546 | 0.134 | 0.014 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.017ms |
| 590490e5f639f24600000000000002d8 | 18.958 | 2.200 | n/a | 0.000 | 0.694 | 0.732 | 1.445 | 0.015 | 0.000 | 0.046 | 13.273 | 0.535 | n/a | 0.018 | 2.894 | 0.153 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f24600000000000002de | 18.475 | 1.949 | n/a | 0.000 | 0.042 | 0.898 | 1.676 | 0.046 | 0.000 | 0.121 | 12.383 | 1.339 | n/a | 0.022 | 1.991 | 0.108 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.115ms; driver.publication.readback 0.109ms; driver.publication.persist-deferred 0.014ms |
| 590490e5f639f2460000000000000296 | 18.424 | 3.618 | n/a | 0.000 | 0.084 | 3.215 | 1.446 | 0.017 | 0.000 | 0.065 | 9.393 | 0.548 | n/a | 0.037 | 3.703 | 0.201 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.053ms |

## P2 / idle-25 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.123 | 0.629 | 0.000 | 0.469 | 1.857 | n/a | 0.000 | 0.039 | 0.641 | 1.224 | 0.015 | 0.000 | 0.155 | 4.449 | 0.472 | n/a | 0.019 | 1.928 | 0.209 | 0.019 |
| p99 | 21.962 | 2.757 | 0.019 | 0.928 | 3.645 | n/a | 0.000 | 1.698 | 4.302 | 5.469 | 0.056 | 0.000 | 3.514 | 11.462 | 3.105 | n/a | 0.065 | 3.850 | 0.389 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f246000000000000044d | 33.169 | 3.040 | n/a | 0.000 | 0.082 | 1.892 | 1.863 | 0.033 | 0.000 | 0.172 | 5.821 | 20.231 | n/a | 0.036 | 3.122 | 0.094 | 0.036 | tx/thread-83/transactor.triplex-function | none observed |
| 590490e5f639f246000000000000047c | 21.962 | 2.175 | n/a | 0.000 | 0.073 | 0.707 | 4.424 | 0.024 | 0.000 | 0.496 | 13.115 | 0.920 | n/a | 0.029 | 2.248 | 0.102 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004c1 | 17.856 | 2.998 | n/a | 0.000 | 0.074 | 1.086 | 4.736 | 0.023 | 0.000 | 0.092 | 8.342 | 0.470 | n/a | 0.035 | 3.072 | 0.172 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004b0 | 17.284 | 2.000 | n/a | 0.000 | 0.889 | 0.484 | 1.224 | 0.011 | 0.000 | 0.279 | 11.462 | 0.918 | n/a | 0.015 | 2.889 | 0.167 | 0.015 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003d6 | 16.852 | 1.676 | n/a | 0.000 | 0.032 | 2.703 | 3.180 | 0.027 | 0.000 | 3.040 | 5.669 | 0.509 | n/a | 0.016 | 1.708 | 0.101 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 590490e5f639f2460000000000000470 | 16.266 | 2.742 | n/a | 0.000 | 0.065 | 0.634 | 4.827 | 0.042 | 0.000 | 0.128 | 7.329 | 0.470 | n/a | 0.028 | 2.807 | 0.173 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004ee | 15.696 | 1.924 | n/a | 0.000 | 0.061 | 0.515 | 1.342 | 0.014 | 0.000 | 0.356 | 10.310 | 1.149 | n/a | 0.027 | 1.984 | 0.126 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003e6 | 15.688 | 1.772 | n/a | 0.000 | 0.051 | 0.669 | 2.834 | 0.029 | 0.000 | 0.789 | 8.643 | 0.875 | n/a | 0.026 | 1.823 | 0.116 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000045b | 15.390 | 2.354 | n/a | 0.000 | 0.039 | 0.587 | 7.557 | 0.047 | 0.000 | 0.099 | 3.930 | 0.757 | n/a | 0.021 | 2.393 | 0.155 | 0.021 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| 590490e5f639f24600000000000004c9 | 15.249 | 1.632 | n/a | 0.000 | 0.027 | 0.480 | 0.979 | 0.012 | 0.000 | 0.375 | 10.789 | 0.939 | n/a | 0.016 | 1.659 | 0.109 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000049c | 15.241 | 1.789 | n/a | 0.000 | 0.046 | 0.652 | 1.632 | 0.019 | 0.000 | 0.589 | 10.014 | 0.477 | n/a | 0.024 | 1.835 | 0.120 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003da | 15.089 | 1.700 | n/a | 0.000 | 0.028 | 4.454 | 1.887 | 0.026 | 0.000 | 0.638 | 5.862 | 0.479 | n/a | 0.015 | 1.728 | 0.115 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004d1 | 15.004 | 1.589 | n/a | 0.000 | 0.028 | 0.468 | 5.420 | 0.020 | 0.000 | 0.113 | 6.909 | 0.443 | n/a | 0.014 | 1.617 | 0.108 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004c5 | 14.573 | 2.645 | n/a | 0.000 | 0.117 | 0.806 | 1.601 | 0.023 | 0.000 | 3.698 | 5.155 | 0.465 | n/a | 0.065 | 2.762 | 0.190 | 0.065 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000455 | 14.017 | 2.389 | n/a | 0.000 | 0.035 | 0.623 | 0.975 | 0.017 | 0.000 | 0.334 | 9.169 | 0.458 | n/a | 0.016 | 2.424 | 0.173 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004dd | 13.474 | 3.645 | n/a | 0.000 | 0.149 | 4.115 | 0.848 | 0.011 | 0.000 | 0.058 | 4.134 | 0.479 | n/a | 0.036 | 3.794 | 0.282 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000486 | 13.472 | 1.844 | n/a | 0.000 | 0.059 | 0.705 | 5.347 | 0.025 | 0.000 | 0.168 | 4.820 | 0.478 | n/a | 0.026 | 1.903 | 0.141 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003c8 | 13.465 | 1.676 | n/a | 0.000 | 0.037 | 0.555 | 1.546 | 0.034 | 0.000 | 3.412 | 5.233 | 0.955 | n/a | 0.018 | 1.712 | 0.127 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000048a | 13.454 | 2.983 | n/a | 0.000 | 0.073 | 0.829 | 1.900 | 0.020 | 0.000 | 0.152 | 7.022 | 0.445 | n/a | 0.030 | 3.057 | 0.227 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003e4 | 13.424 | 2.764 | n/a | 0.000 | 0.086 | 0.665 | 1.007 | 0.015 | 0.000 | 0.135 | 7.659 | 1.058 | n/a | 0.034 | 2.851 | 0.212 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-25 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.123 | 0.629 | 0.000 | 0.469 | 1.857 | n/a | 0.000 | 0.039 | 0.641 | 1.224 | 0.015 | 0.000 | 0.155 | 4.449 | 0.472 | n/a | 0.019 | 1.928 | 0.209 | 0.019 |
| p99 | 21.962 | 2.757 | 0.019 | 0.928 | 3.645 | n/a | 0.000 | 1.698 | 4.302 | 5.469 | 0.056 | 0.000 | 3.514 | 11.462 | 3.105 | n/a | 0.065 | 3.850 | 0.389 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f246000000000000044d | 33.169 | 3.040 | n/a | 0.000 | 0.082 | 1.892 | 1.863 | 0.033 | 0.000 | 0.172 | 5.821 | 20.231 | n/a | 0.036 | 3.122 | 0.094 | 0.036 | tx/thread-83/transactor.triplex-function | none observed |
| 590490e5f639f246000000000000047c | 21.962 | 2.175 | n/a | 0.000 | 0.073 | 0.707 | 4.424 | 0.024 | 0.000 | 0.496 | 13.115 | 0.920 | n/a | 0.029 | 2.248 | 0.102 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004c1 | 17.856 | 2.998 | n/a | 0.000 | 0.074 | 1.086 | 4.736 | 0.023 | 0.000 | 0.092 | 8.342 | 0.470 | n/a | 0.035 | 3.072 | 0.172 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004b0 | 17.284 | 2.000 | n/a | 0.000 | 0.889 | 0.484 | 1.224 | 0.011 | 0.000 | 0.279 | 11.462 | 0.918 | n/a | 0.015 | 2.889 | 0.167 | 0.015 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003d6 | 16.852 | 1.676 | n/a | 0.000 | 0.032 | 2.703 | 3.180 | 0.027 | 0.000 | 3.040 | 5.669 | 0.509 | n/a | 0.016 | 1.708 | 0.101 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 590490e5f639f2460000000000000470 | 16.266 | 2.742 | n/a | 0.000 | 0.065 | 0.634 | 4.827 | 0.042 | 0.000 | 0.128 | 7.329 | 0.470 | n/a | 0.028 | 2.807 | 0.173 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004ee | 15.696 | 1.924 | n/a | 0.000 | 0.061 | 0.515 | 1.342 | 0.014 | 0.000 | 0.356 | 10.310 | 1.149 | n/a | 0.027 | 1.984 | 0.126 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003e6 | 15.688 | 1.772 | n/a | 0.000 | 0.051 | 0.669 | 2.834 | 0.029 | 0.000 | 0.789 | 8.643 | 0.875 | n/a | 0.026 | 1.823 | 0.116 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000045b | 15.390 | 2.354 | n/a | 0.000 | 0.039 | 0.587 | 7.557 | 0.047 | 0.000 | 0.099 | 3.930 | 0.757 | n/a | 0.021 | 2.393 | 0.155 | 0.021 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| 590490e5f639f24600000000000004c9 | 15.249 | 1.632 | n/a | 0.000 | 0.027 | 0.480 | 0.979 | 0.012 | 0.000 | 0.375 | 10.789 | 0.939 | n/a | 0.016 | 1.659 | 0.109 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000049c | 15.241 | 1.789 | n/a | 0.000 | 0.046 | 0.652 | 1.632 | 0.019 | 0.000 | 0.589 | 10.014 | 0.477 | n/a | 0.024 | 1.835 | 0.120 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003da | 15.089 | 1.700 | n/a | 0.000 | 0.028 | 4.454 | 1.887 | 0.026 | 0.000 | 0.638 | 5.862 | 0.479 | n/a | 0.015 | 1.728 | 0.115 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004d1 | 15.004 | 1.589 | n/a | 0.000 | 0.028 | 0.468 | 5.420 | 0.020 | 0.000 | 0.113 | 6.909 | 0.443 | n/a | 0.014 | 1.617 | 0.108 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004c5 | 14.573 | 2.645 | n/a | 0.000 | 0.117 | 0.806 | 1.601 | 0.023 | 0.000 | 3.698 | 5.155 | 0.465 | n/a | 0.065 | 2.762 | 0.190 | 0.065 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000455 | 14.017 | 2.389 | n/a | 0.000 | 0.035 | 0.623 | 0.975 | 0.017 | 0.000 | 0.334 | 9.169 | 0.458 | n/a | 0.016 | 2.424 | 0.173 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000004dd | 13.474 | 3.645 | n/a | 0.000 | 0.149 | 4.115 | 0.848 | 0.011 | 0.000 | 0.058 | 4.134 | 0.479 | n/a | 0.036 | 3.794 | 0.282 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000486 | 13.472 | 1.844 | n/a | 0.000 | 0.059 | 0.705 | 5.347 | 0.025 | 0.000 | 0.168 | 4.820 | 0.478 | n/a | 0.026 | 1.903 | 0.141 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003c8 | 13.465 | 1.676 | n/a | 0.000 | 0.037 | 0.555 | 1.546 | 0.034 | 0.000 | 3.412 | 5.233 | 0.955 | n/a | 0.018 | 1.712 | 0.127 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000048a | 13.454 | 2.983 | n/a | 0.000 | 0.073 | 0.829 | 1.900 | 0.020 | 0.000 | 0.152 | 7.022 | 0.445 | n/a | 0.030 | 3.057 | 0.227 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000003e4 | 13.424 | 2.764 | n/a | 0.000 | 0.086 | 0.665 | 1.007 | 0.015 | 0.000 | 0.135 | 7.659 | 1.058 | n/a | 0.034 | 2.851 | 0.212 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.335 | 0.663 | 0.000 | 0.501 | 2.180 | n/a | 0.000 | 0.048 | 0.655 | 0.973 | 0.011 | 0.000 | 0.118 | 3.861 | 0.466 | n/a | 0.022 | 2.240 | 0.250 | 0.022 |
| p99 | 16.231 | 2.011 | 0.000 | 0.990 | 3.963 | n/a | 0.000 | 1.685 | 3.821 | 4.772 | 0.032 | 0.000 | 0.760 | 8.824 | 1.136 | n/a | 0.113 | 4.615 | 0.428 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f246000000000000058c | 17.111 | 3.316 | n/a | 0.000 | 0.093 | 0.771 | 4.772 | 0.012 | 0.000 | 0.063 | 7.122 | 0.924 | n/a | 0.038 | 3.408 | 0.199 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000601 | 16.231 | 3.440 | n/a | 0.000 | 1.615 | 0.668 | 3.959 | 0.010 | 0.000 | 0.057 | 5.982 | 0.471 | n/a | 0.030 | 5.056 | 0.311 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000057a | 14.914 | 2.181 | n/a | 0.000 | 0.030 | 2.351 | 1.552 | 0.021 | 0.000 | 0.505 | 7.807 | 0.452 | n/a | 0.016 | 2.210 | 0.148 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000052c | 14.454 | 2.268 | n/a | 0.000 | 0.057 | 3.821 | 0.933 | 0.012 | 0.000 | 0.097 | 6.319 | 0.921 | n/a | 0.025 | 2.325 | 0.161 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000513 | 14.229 | 2.011 | n/a | 0.000 | 0.076 | 0.555 | 1.572 | 0.020 | 0.000 | 0.102 | 8.824 | 1.035 | n/a | 0.035 | 2.087 | 0.147 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000571 | 14.157 | 3.046 | n/a | 0.000 | 0.101 | 0.728 | 4.763 | 0.011 | 0.000 | 0.491 | 4.406 | 0.457 | n/a | 0.154 | 3.147 | 0.222 | 0.154 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000596 | 14.112 | 1.946 | n/a | 0.000 | 0.055 | 0.705 | 5.237 | 0.021 | 0.000 | 0.545 | 4.635 | 0.944 | n/a | 0.024 | 2.001 | 0.142 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000534 | 13.935 | 1.853 | n/a | 0.000 | 0.082 | 0.585 | 0.909 | 0.010 | 0.000 | 0.257 | 9.277 | 0.924 | n/a | 0.037 | 1.934 | 0.139 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005d6 | 13.677 | 1.784 | n/a | 0.000 | 0.035 | 4.275 | 0.964 | 0.011 | 0.000 | 0.061 | 6.053 | 0.476 | n/a | 0.017 | 1.819 | 0.133 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005c1 | 13.440 | 2.662 | n/a | 0.000 | 0.086 | 0.577 | 4.204 | 0.013 | 0.000 | 0.061 | 4.881 | 0.918 | n/a | 0.038 | 2.748 | 0.204 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000561 | 13.366 | 2.597 | n/a | 0.000 | 0.046 | 0.553 | 2.085 | 0.013 | 0.000 | 0.077 | 7.508 | 0.466 | n/a | 0.022 | 2.642 | 0.198 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005dc | 13.200 | 2.916 | n/a | 0.000 | 0.089 | 0.859 | 1.674 | 0.028 | 0.000 | 0.150 | 6.435 | 0.938 | n/a | 0.113 | 3.005 | 0.228 | 0.113 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005d0 | 13.184 | 2.034 | n/a | 0.000 | 0.091 | 0.657 | 1.668 | 0.019 | 0.000 | 0.095 | 7.594 | 0.991 | n/a | 0.034 | 2.125 | 0.161 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000532 | 13.141 | 1.750 | n/a | 0.000 | 0.041 | 0.542 | 0.964 | 0.010 | 0.000 | 0.109 | 8.776 | 0.916 | n/a | 0.033 | 1.792 | 0.136 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005bd | 13.110 | 2.508 | n/a | 0.000 | 1.685 | 0.874 | 0.837 | 0.010 | 0.000 | 0.304 | 6.396 | 0.477 | n/a | 0.020 | 4.193 | 0.320 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005f2 | 13.005 | 2.877 | n/a | 0.000 | 1.738 | 1.318 | 0.917 | 0.011 | 0.000 | 0.324 | 5.338 | 0.464 | n/a | 0.018 | 4.615 | 0.355 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000057c | 12.964 | 4.000 | n/a | 0.000 | 0.080 | 0.736 | 0.963 | 0.010 | 0.000 | 0.095 | 6.632 | 0.414 | n/a | 0.033 | 4.080 | 0.315 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000559 | 12.918 | 1.665 | n/a | 0.000 | 0.036 | 0.401 | 1.058 | 0.010 | 0.000 | 0.050 | 8.762 | 0.917 | n/a | 0.020 | 1.700 | 0.132 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000553 | 12.311 | 3.082 | n/a | 0.000 | 0.038 | 0.816 | 0.983 | 0.010 | 0.000 | 0.063 | 6.849 | 0.448 | n/a | 0.021 | 3.120 | 0.253 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000598 | 12.278 | 2.920 | n/a | 0.000 | 0.084 | 0.692 | 1.140 | 0.011 | 0.000 | 0.514 | 6.409 | 0.469 | n/a | 0.038 | 3.005 | 0.245 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.335 | 0.663 | 0.000 | 0.501 | 2.180 | n/a | 0.000 | 0.048 | 0.655 | 0.973 | 0.011 | 0.000 | 0.118 | 3.861 | 0.466 | n/a | 0.022 | 2.240 | 0.250 | 0.022 |
| p99 | 16.231 | 2.011 | 0.000 | 0.990 | 3.963 | n/a | 0.000 | 1.685 | 3.821 | 4.772 | 0.032 | 0.000 | 0.760 | 8.824 | 1.136 | n/a | 0.113 | 4.615 | 0.428 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f246000000000000058c | 17.111 | 3.316 | n/a | 0.000 | 0.093 | 0.771 | 4.772 | 0.012 | 0.000 | 0.063 | 7.122 | 0.924 | n/a | 0.038 | 3.408 | 0.199 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000601 | 16.231 | 3.440 | n/a | 0.000 | 1.615 | 0.668 | 3.959 | 0.010 | 0.000 | 0.057 | 5.982 | 0.471 | n/a | 0.030 | 5.056 | 0.311 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000057a | 14.914 | 2.181 | n/a | 0.000 | 0.030 | 2.351 | 1.552 | 0.021 | 0.000 | 0.505 | 7.807 | 0.452 | n/a | 0.016 | 2.210 | 0.148 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000052c | 14.454 | 2.268 | n/a | 0.000 | 0.057 | 3.821 | 0.933 | 0.012 | 0.000 | 0.097 | 6.319 | 0.921 | n/a | 0.025 | 2.325 | 0.161 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000513 | 14.229 | 2.011 | n/a | 0.000 | 0.076 | 0.555 | 1.572 | 0.020 | 0.000 | 0.102 | 8.824 | 1.035 | n/a | 0.035 | 2.087 | 0.147 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000571 | 14.157 | 3.046 | n/a | 0.000 | 0.101 | 0.728 | 4.763 | 0.011 | 0.000 | 0.491 | 4.406 | 0.457 | n/a | 0.154 | 3.147 | 0.222 | 0.154 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000596 | 14.112 | 1.946 | n/a | 0.000 | 0.055 | 0.705 | 5.237 | 0.021 | 0.000 | 0.545 | 4.635 | 0.944 | n/a | 0.024 | 2.001 | 0.142 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000534 | 13.935 | 1.853 | n/a | 0.000 | 0.082 | 0.585 | 0.909 | 0.010 | 0.000 | 0.257 | 9.277 | 0.924 | n/a | 0.037 | 1.934 | 0.139 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005d6 | 13.677 | 1.784 | n/a | 0.000 | 0.035 | 4.275 | 0.964 | 0.011 | 0.000 | 0.061 | 6.053 | 0.476 | n/a | 0.017 | 1.819 | 0.133 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005c1 | 13.440 | 2.662 | n/a | 0.000 | 0.086 | 0.577 | 4.204 | 0.013 | 0.000 | 0.061 | 4.881 | 0.918 | n/a | 0.038 | 2.748 | 0.204 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000561 | 13.366 | 2.597 | n/a | 0.000 | 0.046 | 0.553 | 2.085 | 0.013 | 0.000 | 0.077 | 7.508 | 0.466 | n/a | 0.022 | 2.642 | 0.198 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005dc | 13.200 | 2.916 | n/a | 0.000 | 0.089 | 0.859 | 1.674 | 0.028 | 0.000 | 0.150 | 6.435 | 0.938 | n/a | 0.113 | 3.005 | 0.228 | 0.113 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005d0 | 13.184 | 2.034 | n/a | 0.000 | 0.091 | 0.657 | 1.668 | 0.019 | 0.000 | 0.095 | 7.594 | 0.991 | n/a | 0.034 | 2.125 | 0.161 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000532 | 13.141 | 1.750 | n/a | 0.000 | 0.041 | 0.542 | 0.964 | 0.010 | 0.000 | 0.109 | 8.776 | 0.916 | n/a | 0.033 | 1.792 | 0.136 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005bd | 13.110 | 2.508 | n/a | 0.000 | 1.685 | 0.874 | 0.837 | 0.010 | 0.000 | 0.304 | 6.396 | 0.477 | n/a | 0.020 | 4.193 | 0.320 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000005f2 | 13.005 | 2.877 | n/a | 0.000 | 1.738 | 1.318 | 0.917 | 0.011 | 0.000 | 0.324 | 5.338 | 0.464 | n/a | 0.018 | 4.615 | 0.355 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000057c | 12.964 | 4.000 | n/a | 0.000 | 0.080 | 0.736 | 0.963 | 0.010 | 0.000 | 0.095 | 6.632 | 0.414 | n/a | 0.033 | 4.080 | 0.315 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000559 | 12.918 | 1.665 | n/a | 0.000 | 0.036 | 0.401 | 1.058 | 0.010 | 0.000 | 0.050 | 8.762 | 0.917 | n/a | 0.020 | 1.700 | 0.132 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000553 | 12.311 | 3.082 | n/a | 0.000 | 0.038 | 0.816 | 0.983 | 0.010 | 0.000 | 0.063 | 6.849 | 0.448 | n/a | 0.021 | 3.120 | 0.253 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000598 | 12.278 | 2.920 | n/a | 0.000 | 0.084 | 0.692 | 1.140 | 0.011 | 0.000 | 0.514 | 6.409 | 0.469 | n/a | 0.038 | 3.005 | 0.245 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.197 | 0.593 | 0.000 | 0.500 | 2.085 | n/a | 0.000 | 0.048 | 0.666 | 1.079 | 0.012 | 0.000 | 0.121 | 4.581 | 0.485 | n/a | 0.024 | 2.171 | 0.233 | 0.024 |
| p99 | 19.459 | 1.995 | 0.000 | 1.041 | 4.072 | n/a | 0.000 | 2.193 | 2.169 | 4.988 | 0.033 | 0.000 | 0.670 | 11.352 | 4.225 | n/a | 0.169 | 5.488 | 0.400 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f2460000000000000681 | 28.829 | 4.066 | n/a | 0.000 | 0.094 | 0.969 | 1.007 | 0.011 | 0.000 | 0.113 | 22.017 | 0.498 | n/a | 0.054 | 4.160 | 0.144 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006a9 | 19.459 | 3.583 | n/a | 0.000 | 2.193 | 4.383 | 0.974 | 0.011 | 0.000 | 0.080 | 7.747 | 0.456 | n/a | 0.033 | 5.777 | 0.297 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000064f | 19.164 | 1.652 | n/a | 0.000 | 0.032 | 0.448 | 5.858 | 0.013 | 0.000 | 0.102 | 6.786 | 4.256 | n/a | 0.016 | 1.684 | 0.088 | 0.016 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000655 | 17.471 | 3.033 | n/a | 0.000 | 0.083 | 0.687 | 1.207 | 0.012 | 0.000 | 0.068 | 11.352 | 0.991 | n/a | 0.038 | 3.116 | 0.178 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000066e | 16.122 | 2.952 | n/a | 0.000 | 0.082 | 0.993 | 1.722 | 0.021 | 0.000 | 0.145 | 9.218 | 0.952 | n/a | 0.038 | 3.033 | 0.188 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000744 | 15.941 | 2.639 | n/a | 0.000 | 0.058 | 0.758 | 1.913 | 0.016 | 0.000 | 0.118 | 9.374 | 1.042 | n/a | 0.025 | 2.697 | 0.169 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000683 | 15.693 | 2.105 | n/a | 0.000 | 0.062 | 0.593 | 1.005 | 0.011 | 0.000 | 0.067 | 11.226 | 0.595 | n/a | 0.028 | 2.167 | 0.138 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006ec | 14.876 | 3.205 | n/a | 0.000 | 2.283 | 0.755 | 0.949 | 0.011 | 0.000 | 0.154 | 7.021 | 0.467 | n/a | 0.032 | 5.488 | 0.369 | 0.032 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000653 | 14.810 | 1.712 | n/a | 0.000 | 0.041 | 1.136 | 4.988 | 0.011 | 0.000 | 0.074 | 6.344 | 0.482 | n/a | 0.022 | 1.753 | 0.118 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006e6 | 14.718 | 2.136 | n/a | 0.000 | 0.106 | 0.515 | 1.179 | 0.011 | 0.000 | 0.064 | 9.758 | 0.882 | n/a | 0.067 | 2.242 | 0.152 | 0.067 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006fb | 14.322 | 2.169 | n/a | 0.000 | 0.052 | 0.543 | 2.778 | 0.011 | 0.000 | 0.123 | 7.535 | 1.083 | n/a | 0.026 | 2.222 | 0.155 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000696 | 14.311 | 1.838 | n/a | 0.000 | 0.046 | 0.770 | 1.687 | 0.021 | 0.000 | 0.112 | 9.350 | 0.462 | n/a | 0.026 | 1.884 | 0.132 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000708 | 14.040 | 2.175 | n/a | 0.000 | 0.031 | 0.545 | 1.376 | 0.021 | 0.000 | 0.107 | 9.307 | 0.461 | n/a | 0.017 | 2.207 | 0.157 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006f5 | 14.014 | 2.709 | n/a | 0.000 | 0.042 | 0.880 | 3.703 | 0.028 | 0.000 | 0.171 | 5.517 | 0.942 | n/a | 0.022 | 2.751 | 0.196 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000692 | 13.794 | 1.808 | n/a | 0.000 | 0.045 | 0.528 | 0.933 | 0.012 | 0.000 | 0.132 | 6.087 | 4.225 | n/a | 0.024 | 1.853 | 0.134 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000668 | 13.759 | 3.514 | n/a | 0.000 | 0.305 | 0.638 | 0.957 | 0.012 | 0.000 | 0.453 | 6.583 | 1.087 | n/a | 0.210 | 3.819 | 0.278 | 0.210 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000066a | 13.363 | 2.085 | n/a | 0.000 | 0.087 | 0.797 | 4.849 | 0.031 | 0.000 | 0.739 | 4.250 | 0.468 | n/a | 0.057 | 2.171 | 0.162 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000714 | 13.269 | 3.673 | n/a | 0.000 | 1.411 | 0.655 | 0.924 | 0.011 | 0.000 | 0.093 | 6.026 | 0.444 | n/a | 0.031 | 5.085 | 0.383 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000664 | 13.091 | 3.119 | n/a | 0.000 | 0.068 | 0.588 | 3.954 | 0.012 | 0.000 | 0.080 | 4.786 | 0.455 | n/a | 0.030 | 3.187 | 0.243 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000716 | 12.912 | 1.821 | n/a | 0.000 | 0.048 | 0.707 | 1.551 | 0.022 | 0.000 | 0.104 | 7.666 | 0.970 | n/a | 0.023 | 1.869 | 0.145 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.197 | 0.593 | 0.000 | 0.500 | 2.085 | n/a | 0.000 | 0.048 | 0.666 | 1.079 | 0.012 | 0.000 | 0.121 | 4.581 | 0.485 | n/a | 0.024 | 2.171 | 0.233 | 0.024 |
| p99 | 19.459 | 1.995 | 0.000 | 1.041 | 4.072 | n/a | 0.000 | 2.193 | 2.169 | 4.988 | 0.033 | 0.000 | 0.670 | 11.352 | 4.225 | n/a | 0.169 | 5.488 | 0.400 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f2460000000000000681 | 28.829 | 4.066 | n/a | 0.000 | 0.094 | 0.969 | 1.007 | 0.011 | 0.000 | 0.113 | 22.017 | 0.498 | n/a | 0.054 | 4.160 | 0.144 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006a9 | 19.459 | 3.583 | n/a | 0.000 | 2.193 | 4.383 | 0.974 | 0.011 | 0.000 | 0.080 | 7.747 | 0.456 | n/a | 0.033 | 5.777 | 0.297 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000064f | 19.164 | 1.652 | n/a | 0.000 | 0.032 | 0.448 | 5.858 | 0.013 | 0.000 | 0.102 | 6.786 | 4.256 | n/a | 0.016 | 1.684 | 0.088 | 0.016 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000655 | 17.471 | 3.033 | n/a | 0.000 | 0.083 | 0.687 | 1.207 | 0.012 | 0.000 | 0.068 | 11.352 | 0.991 | n/a | 0.038 | 3.116 | 0.178 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000066e | 16.122 | 2.952 | n/a | 0.000 | 0.082 | 0.993 | 1.722 | 0.021 | 0.000 | 0.145 | 9.218 | 0.952 | n/a | 0.038 | 3.033 | 0.188 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000744 | 15.941 | 2.639 | n/a | 0.000 | 0.058 | 0.758 | 1.913 | 0.016 | 0.000 | 0.118 | 9.374 | 1.042 | n/a | 0.025 | 2.697 | 0.169 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000683 | 15.693 | 2.105 | n/a | 0.000 | 0.062 | 0.593 | 1.005 | 0.011 | 0.000 | 0.067 | 11.226 | 0.595 | n/a | 0.028 | 2.167 | 0.138 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006ec | 14.876 | 3.205 | n/a | 0.000 | 2.283 | 0.755 | 0.949 | 0.011 | 0.000 | 0.154 | 7.021 | 0.467 | n/a | 0.032 | 5.488 | 0.369 | 0.032 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000653 | 14.810 | 1.712 | n/a | 0.000 | 0.041 | 1.136 | 4.988 | 0.011 | 0.000 | 0.074 | 6.344 | 0.482 | n/a | 0.022 | 1.753 | 0.118 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006e6 | 14.718 | 2.136 | n/a | 0.000 | 0.106 | 0.515 | 1.179 | 0.011 | 0.000 | 0.064 | 9.758 | 0.882 | n/a | 0.067 | 2.242 | 0.152 | 0.067 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006fb | 14.322 | 2.169 | n/a | 0.000 | 0.052 | 0.543 | 2.778 | 0.011 | 0.000 | 0.123 | 7.535 | 1.083 | n/a | 0.026 | 2.222 | 0.155 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000696 | 14.311 | 1.838 | n/a | 0.000 | 0.046 | 0.770 | 1.687 | 0.021 | 0.000 | 0.112 | 9.350 | 0.462 | n/a | 0.026 | 1.884 | 0.132 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000708 | 14.040 | 2.175 | n/a | 0.000 | 0.031 | 0.545 | 1.376 | 0.021 | 0.000 | 0.107 | 9.307 | 0.461 | n/a | 0.017 | 2.207 | 0.157 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000006f5 | 14.014 | 2.709 | n/a | 0.000 | 0.042 | 0.880 | 3.703 | 0.028 | 0.000 | 0.171 | 5.517 | 0.942 | n/a | 0.022 | 2.751 | 0.196 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000692 | 13.794 | 1.808 | n/a | 0.000 | 0.045 | 0.528 | 0.933 | 0.012 | 0.000 | 0.132 | 6.087 | 4.225 | n/a | 0.024 | 1.853 | 0.134 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000668 | 13.759 | 3.514 | n/a | 0.000 | 0.305 | 0.638 | 0.957 | 0.012 | 0.000 | 0.453 | 6.583 | 1.087 | n/a | 0.210 | 3.819 | 0.278 | 0.210 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000066a | 13.363 | 2.085 | n/a | 0.000 | 0.087 | 0.797 | 4.849 | 0.031 | 0.000 | 0.739 | 4.250 | 0.468 | n/a | 0.057 | 2.171 | 0.162 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000714 | 13.269 | 3.673 | n/a | 0.000 | 1.411 | 0.655 | 0.924 | 0.011 | 0.000 | 0.093 | 6.026 | 0.444 | n/a | 0.031 | 5.085 | 0.383 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000664 | 13.091 | 3.119 | n/a | 0.000 | 0.068 | 0.588 | 3.954 | 0.012 | 0.000 | 0.080 | 4.786 | 0.455 | n/a | 0.030 | 3.187 | 0.243 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000716 | 12.912 | 1.821 | n/a | 0.000 | 0.048 | 0.707 | 1.551 | 0.022 | 0.000 | 0.104 | 7.666 | 0.970 | n/a | 0.023 | 1.869 | 0.145 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.574 | 0.572 | 0.000 | 0.522 | 2.365 | n/a | 0.000 | 0.056 | 0.710 | 1.120 | 0.014 | 0.000 | 0.158 | 4.673 | 0.531 | n/a | 0.029 | 2.431 | 0.239 | 0.029 |
| p99 | 20.454 | 1.996 | 0.000 | 1.532 | 4.205 | n/a | 0.000 | 2.173 | 1.885 | 5.360 | 0.038 | 0.000 | 1.410 | 10.885 | 2.584 | n/a | 0.082 | 4.919 | 0.438 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f24600000000000007ab | 33.248 | 3.546 | n/a | 0.000 | 0.123 | 0.840 | 6.940 | 0.016 | 13.225 | 0.479 | 6.969 | 1.039 | n/a | 0.073 | 3.669 | 0.110 | 0.073 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 590490e5f639f2460000000000000837 | 20.454 | 2.510 | n/a | 0.000 | 0.050 | 0.766 | 5.157 | 0.013 | 0.000 | 0.449 | 11.007 | 0.471 | n/a | 0.030 | 2.560 | 0.125 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000076a | 17.944 | 3.480 | n/a | 0.000 | 0.171 | 0.946 | 2.187 | 0.031 | 0.000 | 0.817 | 9.009 | 1.242 | n/a | 0.062 | 3.651 | 0.203 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000834 | 17.494 | 2.646 | n/a | 0.000 | 0.157 | 0.802 | 5.360 | 0.038 | 0.000 | 3.152 | 4.730 | 0.553 | n/a | 0.056 | 2.803 | 0.160 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007fc | 17.405 | 2.477 | n/a | 0.000 | 0.125 | 0.809 | 1.792 | 0.022 | 0.000 | 0.151 | 10.879 | 1.074 | n/a | 0.074 | 2.603 | 0.150 | 0.074 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| 590490e5f639f24600000000000008b1 | 16.542 | 2.480 | n/a | 0.000 | 0.058 | 0.865 | 1.535 | 0.019 | 0.000 | 0.141 | 10.885 | 0.534 | n/a | 0.026 | 2.538 | 0.153 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007c8 | 16.341 | 3.516 | n/a | 0.000 | 0.127 | 0.882 | 4.766 | 0.016 | 0.000 | 0.133 | 5.780 | 1.042 | n/a | 0.078 | 3.644 | 0.223 | 0.078 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007ea | 15.927 | 3.644 | n/a | 0.000 | 0.155 | 0.687 | 1.040 | 0.014 | 0.000 | 0.418 | 8.777 | 1.138 | n/a | 0.054 | 3.799 | 0.239 | 0.054 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.095ms |
| 590490e5f639f246000000000000085d | 15.594 | 2.595 | n/a | 0.000 | 0.063 | 1.550 | 2.064 | 0.037 | 0.000 | 0.769 | 7.086 | 1.399 | n/a | 0.030 | 2.658 | 0.170 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000810 | 15.095 | 3.399 | n/a | 0.000 | 0.156 | 0.972 | 1.127 | 0.014 | 0.000 | 0.128 | 8.179 | 1.058 | n/a | 0.062 | 3.555 | 0.236 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000873 | 15.040 | 2.232 | n/a | 0.000 | 0.051 | 0.614 | 1.276 | 0.014 | 0.000 | 0.090 | 10.250 | 0.485 | n/a | 0.027 | 2.284 | 0.152 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007b6 | 14.984 | 3.694 | n/a | 0.000 | 1.057 | 0.830 | 1.548 | 0.021 | 0.000 | 0.553 | 6.660 | 0.601 | n/a | 0.020 | 4.750 | 0.317 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007bf | 14.585 | 2.541 | n/a | 0.000 | 0.062 | 1.117 | 1.776 | 0.028 | 0.000 | 0.253 | 8.240 | 0.531 | n/a | 0.037 | 2.603 | 0.178 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000008a5 | 14.583 | 3.273 | n/a | 0.000 | 0.124 | 0.945 | 1.069 | 0.015 | 0.000 | 0.179 | 7.827 | 1.076 | n/a | 0.074 | 3.397 | 0.233 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000084b | 14.366 | 3.766 | n/a | 0.000 | 0.119 | 0.610 | 1.393 | 0.014 | 0.000 | 0.156 | 7.162 | 1.077 | n/a | 0.070 | 3.885 | 0.270 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007ef | 14.248 | 2.836 | n/a | 0.000 | 0.051 | 0.621 | 1.019 | 0.011 | 0.000 | 0.064 | 8.650 | 0.971 | n/a | 0.025 | 2.887 | 0.203 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.100ms |
| 590490e5f639f2460000000000000830 | 14.190 | 3.342 | n/a | 0.000 | 0.056 | 0.882 | 1.031 | 0.013 | 0.000 | 0.159 | 7.575 | 1.104 | n/a | 0.030 | 3.397 | 0.239 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007e1 | 14.091 | 1.998 | n/a | 0.000 | 0.049 | 0.771 | 4.913 | 0.019 | 0.000 | 0.092 | 5.261 | 0.964 | n/a | 0.024 | 2.047 | 0.145 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.219ms |
| 590490e5f639f246000000000000080e | 14.067 | 2.056 | n/a | 0.000 | 0.054 | 0.598 | 4.043 | 0.012 | 0.000 | 0.106 | 6.192 | 0.977 | n/a | 0.028 | 2.110 | 0.150 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000008a7 | 13.985 | 3.843 | n/a | 0.000 | 0.051 | 1.052 | 2.814 | 0.018 | 0.000 | 0.140 | 5.515 | 0.526 | n/a | 0.026 | 3.894 | 0.278 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.574 | 0.572 | 0.000 | 0.522 | 2.365 | n/a | 0.000 | 0.056 | 0.710 | 1.120 | 0.014 | 0.000 | 0.158 | 4.673 | 0.531 | n/a | 0.029 | 2.431 | 0.239 | 0.029 |
| p99 | 20.454 | 1.996 | 0.000 | 1.532 | 4.205 | n/a | 0.000 | 2.173 | 1.885 | 5.360 | 0.038 | 0.000 | 1.410 | 10.885 | 2.584 | n/a | 0.082 | 4.919 | 0.438 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f24600000000000007ab | 33.248 | 3.546 | n/a | 0.000 | 0.123 | 0.840 | 6.940 | 0.016 | 13.225 | 0.479 | 6.969 | 1.039 | n/a | 0.073 | 3.669 | 0.110 | 0.073 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 590490e5f639f2460000000000000837 | 20.454 | 2.510 | n/a | 0.000 | 0.050 | 0.766 | 5.157 | 0.013 | 0.000 | 0.449 | 11.007 | 0.471 | n/a | 0.030 | 2.560 | 0.125 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000076a | 17.944 | 3.480 | n/a | 0.000 | 0.171 | 0.946 | 2.187 | 0.031 | 0.000 | 0.817 | 9.009 | 1.242 | n/a | 0.062 | 3.651 | 0.203 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000834 | 17.494 | 2.646 | n/a | 0.000 | 0.157 | 0.802 | 5.360 | 0.038 | 0.000 | 3.152 | 4.730 | 0.553 | n/a | 0.056 | 2.803 | 0.160 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007fc | 17.405 | 2.477 | n/a | 0.000 | 0.125 | 0.809 | 1.792 | 0.022 | 0.000 | 0.151 | 10.879 | 1.074 | n/a | 0.074 | 2.603 | 0.150 | 0.074 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| 590490e5f639f24600000000000008b1 | 16.542 | 2.480 | n/a | 0.000 | 0.058 | 0.865 | 1.535 | 0.019 | 0.000 | 0.141 | 10.885 | 0.534 | n/a | 0.026 | 2.538 | 0.153 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007c8 | 16.341 | 3.516 | n/a | 0.000 | 0.127 | 0.882 | 4.766 | 0.016 | 0.000 | 0.133 | 5.780 | 1.042 | n/a | 0.078 | 3.644 | 0.223 | 0.078 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007ea | 15.927 | 3.644 | n/a | 0.000 | 0.155 | 0.687 | 1.040 | 0.014 | 0.000 | 0.418 | 8.777 | 1.138 | n/a | 0.054 | 3.799 | 0.239 | 0.054 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.095ms |
| 590490e5f639f246000000000000085d | 15.594 | 2.595 | n/a | 0.000 | 0.063 | 1.550 | 2.064 | 0.037 | 0.000 | 0.769 | 7.086 | 1.399 | n/a | 0.030 | 2.658 | 0.170 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000810 | 15.095 | 3.399 | n/a | 0.000 | 0.156 | 0.972 | 1.127 | 0.014 | 0.000 | 0.128 | 8.179 | 1.058 | n/a | 0.062 | 3.555 | 0.236 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000873 | 15.040 | 2.232 | n/a | 0.000 | 0.051 | 0.614 | 1.276 | 0.014 | 0.000 | 0.090 | 10.250 | 0.485 | n/a | 0.027 | 2.284 | 0.152 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007b6 | 14.984 | 3.694 | n/a | 0.000 | 1.057 | 0.830 | 1.548 | 0.021 | 0.000 | 0.553 | 6.660 | 0.601 | n/a | 0.020 | 4.750 | 0.317 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007bf | 14.585 | 2.541 | n/a | 0.000 | 0.062 | 1.117 | 1.776 | 0.028 | 0.000 | 0.253 | 8.240 | 0.531 | n/a | 0.037 | 2.603 | 0.178 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000008a5 | 14.583 | 3.273 | n/a | 0.000 | 0.124 | 0.945 | 1.069 | 0.015 | 0.000 | 0.179 | 7.827 | 1.076 | n/a | 0.074 | 3.397 | 0.233 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000084b | 14.366 | 3.766 | n/a | 0.000 | 0.119 | 0.610 | 1.393 | 0.014 | 0.000 | 0.156 | 7.162 | 1.077 | n/a | 0.070 | 3.885 | 0.270 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007ef | 14.248 | 2.836 | n/a | 0.000 | 0.051 | 0.621 | 1.019 | 0.011 | 0.000 | 0.064 | 8.650 | 0.971 | n/a | 0.025 | 2.887 | 0.203 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.100ms |
| 590490e5f639f2460000000000000830 | 14.190 | 3.342 | n/a | 0.000 | 0.056 | 0.882 | 1.031 | 0.013 | 0.000 | 0.159 | 7.575 | 1.104 | n/a | 0.030 | 3.397 | 0.239 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000007e1 | 14.091 | 1.998 | n/a | 0.000 | 0.049 | 0.771 | 4.913 | 0.019 | 0.000 | 0.092 | 5.261 | 0.964 | n/a | 0.024 | 2.047 | 0.145 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.219ms |
| 590490e5f639f246000000000000080e | 14.067 | 2.056 | n/a | 0.000 | 0.054 | 0.598 | 4.043 | 0.012 | 0.000 | 0.106 | 6.192 | 0.977 | n/a | 0.028 | 2.110 | 0.150 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000008a7 | 13.985 | 3.843 | n/a | 0.000 | 0.051 | 1.052 | 2.814 | 0.018 | 0.000 | 0.140 | 5.515 | 0.526 | n/a | 0.026 | 3.894 | 0.278 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.501 | 0.290 | 0.000 | 0.518 | 2.616 | n/a | 0.000 | 0.059 | 0.755 | 1.073 | 0.013 | 0.000 | 0.176 | 4.739 | 0.511 | n/a | 0.032 | 2.674 | 0.246 | 0.032 |
| p99 | 19.565 | 2.009 | 0.000 | 1.105 | 4.312 | n/a | 0.000 | 3.454 | 1.828 | 3.756 | 0.040 | 0.000 | 3.875 | 11.894 | 1.229 | n/a | 0.116 | 6.143 | 0.459 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f24600000000000008d4 | 31.788 | 3.443 | n/a | 0.000 | 0.052 | 0.801 | 1.083 | 0.013 | 0.000 | 3.969 | 21.889 | 0.511 | n/a | 0.026 | 3.495 | 0.110 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000999 | 19.565 | 4.011 | n/a | 0.000 | 0.200 | 0.939 | 1.138 | 0.017 | 0.000 | 0.093 | 11.894 | 1.179 | n/a | 0.093 | 4.212 | 0.215 | 0.093 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009b0 | 17.493 | 1.857 | n/a | 0.000 | 0.047 | 4.139 | 0.921 | 0.011 | 0.000 | 0.071 | 9.949 | 0.471 | n/a | 0.025 | 1.905 | 0.109 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a16 | 16.625 | 3.578 | n/a | 0.000 | 0.201 | 1.181 | 1.916 | 0.025 | 0.000 | 0.999 | 8.094 | 0.536 | n/a | 0.093 | 3.780 | 0.227 | 0.093 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000008e6 | 16.082 | 3.825 | n/a | 0.000 | 0.183 | 0.615 | 3.756 | 0.032 | 0.000 | 0.248 | 6.816 | 0.542 | n/a | 0.066 | 4.008 | 0.249 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000098f | 15.943 | 4.384 | n/a | 0.000 | 0.125 | 0.702 | 4.550 | 0.015 | 0.000 | 0.096 | 5.455 | 0.523 | n/a | 0.095 | 4.508 | 0.283 | 0.095 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009da | 15.800 | 2.113 | n/a | 0.000 | 0.055 | 0.600 | 1.247 | 0.014 | 0.000 | 0.487 | 10.223 | 1.031 | n/a | 0.030 | 2.168 | 0.137 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009ce | 15.789 | 3.767 | n/a | 0.000 | 0.111 | 1.095 | 1.945 | 0.031 | 0.000 | 3.875 | 4.389 | 0.506 | n/a | 0.071 | 3.877 | 0.246 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009ee | 15.512 | 4.102 | n/a | 0.000 | 0.183 | 1.090 | 1.614 | 0.020 | 0.000 | 3.456 | 4.431 | 0.524 | n/a | 0.092 | 4.285 | 0.276 | 0.092 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000008dc | 15.289 | 3.601 | n/a | 0.000 | 0.096 | 1.139 | 1.023 | 0.013 | 0.000 | 0.948 | 7.825 | 0.583 | n/a | 0.062 | 3.697 | 0.242 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009a3 | 15.081 | 3.335 | n/a | 0.000 | 0.076 | 1.122 | 1.512 | 0.019 | 0.000 | 0.493 | 7.963 | 0.516 | n/a | 0.045 | 3.412 | 0.226 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009fd | 14.902 | 2.872 | n/a | 0.000 | 0.075 | 0.836 | 1.580 | 0.020 | 0.000 | 0.251 | 8.158 | 1.064 | n/a | 0.045 | 2.948 | 0.198 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000912 | 14.669 | 2.334 | n/a | 0.000 | 3.565 | 0.839 | 1.597 | 0.025 | 0.000 | 0.758 | 5.032 | 0.487 | n/a | 0.032 | 5.898 | 0.402 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000935 | 14.452 | 3.336 | n/a | 0.000 | 0.202 | 0.789 | 1.062 | 0.015 | 0.000 | 0.131 | 7.610 | 1.120 | n/a | 0.188 | 3.538 | 0.245 | 0.188 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000093a | 14.399 | 3.138 | n/a | 0.000 | 2.659 | 0.885 | 1.298 | 0.014 | 0.000 | 0.138 | 5.776 | 0.454 | n/a | 0.038 | 5.797 | 0.403 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009c6 | 14.329 | 3.117 | n/a | 0.000 | 2.801 | 1.232 | 1.024 | 0.012 | 0.000 | 0.108 | 5.536 | 0.466 | n/a | 0.035 | 5.917 | 0.413 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000974 | 14.289 | 2.490 | n/a | 0.000 | 0.045 | 0.625 | 2.239 | 0.012 | 0.000 | 0.103 | 7.790 | 0.955 | n/a | 0.029 | 2.534 | 0.177 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000095d | 14.219 | 4.312 | n/a | 0.000 | 0.195 | 1.347 | 1.599 | 0.015 | 0.000 | 0.141 | 5.983 | 0.529 | n/a | 0.097 | 4.507 | 0.317 | 0.097 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009b7 | 14.216 | 3.012 | n/a | 0.000 | 0.069 | 0.974 | 1.219 | 0.014 | 0.000 | 3.276 | 5.065 | 0.538 | n/a | 0.051 | 3.081 | 0.217 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a1b | 14.128 | 3.036 | n/a | 0.000 | 3.454 | 0.634 | 0.904 | 0.011 | 0.000 | 0.320 | 5.282 | 0.453 | n/a | 0.034 | 6.490 | 0.459 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.501 | 0.290 | 0.000 | 0.518 | 2.616 | n/a | 0.000 | 0.059 | 0.755 | 1.073 | 0.013 | 0.000 | 0.176 | 4.739 | 0.511 | n/a | 0.032 | 2.674 | 0.246 | 0.032 |
| p99 | 19.565 | 2.009 | 0.000 | 1.105 | 4.312 | n/a | 0.000 | 3.454 | 1.828 | 3.756 | 0.040 | 0.000 | 3.875 | 11.894 | 1.229 | n/a | 0.116 | 6.143 | 0.459 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f24600000000000008d4 | 31.788 | 3.443 | n/a | 0.000 | 0.052 | 0.801 | 1.083 | 0.013 | 0.000 | 3.969 | 21.889 | 0.511 | n/a | 0.026 | 3.495 | 0.110 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000999 | 19.565 | 4.011 | n/a | 0.000 | 0.200 | 0.939 | 1.138 | 0.017 | 0.000 | 0.093 | 11.894 | 1.179 | n/a | 0.093 | 4.212 | 0.215 | 0.093 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009b0 | 17.493 | 1.857 | n/a | 0.000 | 0.047 | 4.139 | 0.921 | 0.011 | 0.000 | 0.071 | 9.949 | 0.471 | n/a | 0.025 | 1.905 | 0.109 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a16 | 16.625 | 3.578 | n/a | 0.000 | 0.201 | 1.181 | 1.916 | 0.025 | 0.000 | 0.999 | 8.094 | 0.536 | n/a | 0.093 | 3.780 | 0.227 | 0.093 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000008e6 | 16.082 | 3.825 | n/a | 0.000 | 0.183 | 0.615 | 3.756 | 0.032 | 0.000 | 0.248 | 6.816 | 0.542 | n/a | 0.066 | 4.008 | 0.249 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000098f | 15.943 | 4.384 | n/a | 0.000 | 0.125 | 0.702 | 4.550 | 0.015 | 0.000 | 0.096 | 5.455 | 0.523 | n/a | 0.095 | 4.508 | 0.283 | 0.095 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009da | 15.800 | 2.113 | n/a | 0.000 | 0.055 | 0.600 | 1.247 | 0.014 | 0.000 | 0.487 | 10.223 | 1.031 | n/a | 0.030 | 2.168 | 0.137 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009ce | 15.789 | 3.767 | n/a | 0.000 | 0.111 | 1.095 | 1.945 | 0.031 | 0.000 | 3.875 | 4.389 | 0.506 | n/a | 0.071 | 3.877 | 0.246 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009ee | 15.512 | 4.102 | n/a | 0.000 | 0.183 | 1.090 | 1.614 | 0.020 | 0.000 | 3.456 | 4.431 | 0.524 | n/a | 0.092 | 4.285 | 0.276 | 0.092 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000008dc | 15.289 | 3.601 | n/a | 0.000 | 0.096 | 1.139 | 1.023 | 0.013 | 0.000 | 0.948 | 7.825 | 0.583 | n/a | 0.062 | 3.697 | 0.242 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009a3 | 15.081 | 3.335 | n/a | 0.000 | 0.076 | 1.122 | 1.512 | 0.019 | 0.000 | 0.493 | 7.963 | 0.516 | n/a | 0.045 | 3.412 | 0.226 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009fd | 14.902 | 2.872 | n/a | 0.000 | 0.075 | 0.836 | 1.580 | 0.020 | 0.000 | 0.251 | 8.158 | 1.064 | n/a | 0.045 | 2.948 | 0.198 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000912 | 14.669 | 2.334 | n/a | 0.000 | 3.565 | 0.839 | 1.597 | 0.025 | 0.000 | 0.758 | 5.032 | 0.487 | n/a | 0.032 | 5.898 | 0.402 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000935 | 14.452 | 3.336 | n/a | 0.000 | 0.202 | 0.789 | 1.062 | 0.015 | 0.000 | 0.131 | 7.610 | 1.120 | n/a | 0.188 | 3.538 | 0.245 | 0.188 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000093a | 14.399 | 3.138 | n/a | 0.000 | 2.659 | 0.885 | 1.298 | 0.014 | 0.000 | 0.138 | 5.776 | 0.454 | n/a | 0.038 | 5.797 | 0.403 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009c6 | 14.329 | 3.117 | n/a | 0.000 | 2.801 | 1.232 | 1.024 | 0.012 | 0.000 | 0.108 | 5.536 | 0.466 | n/a | 0.035 | 5.917 | 0.413 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000974 | 14.289 | 2.490 | n/a | 0.000 | 0.045 | 0.625 | 2.239 | 0.012 | 0.000 | 0.103 | 7.790 | 0.955 | n/a | 0.029 | 2.534 | 0.177 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f246000000000000095d | 14.219 | 4.312 | n/a | 0.000 | 0.195 | 1.347 | 1.599 | 0.015 | 0.000 | 0.141 | 5.983 | 0.529 | n/a | 0.097 | 4.507 | 0.317 | 0.097 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f24600000000000009b7 | 14.216 | 3.012 | n/a | 0.000 | 0.069 | 0.974 | 1.219 | 0.014 | 0.000 | 3.276 | 5.065 | 0.538 | n/a | 0.051 | 3.081 | 0.217 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a1b | 14.128 | 3.036 | n/a | 0.000 | 3.454 | 0.634 | 0.904 | 0.011 | 0.000 | 0.320 | 5.282 | 0.453 | n/a | 0.034 | 6.490 | 0.459 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.113 | 0.441 | 0.000 | 0.542 | 2.550 | n/a | 0.000 | 0.078 | 0.815 | 1.304 | 0.017 | 0.000 | 0.174 | 5.805 | 0.565 | n/a | 0.036 | 2.679 | 0.237 | 0.036 |
| p99 | 20.581 | 2.006 | 0.000 | 1.033 | 4.830 | n/a | 0.000 | 2.212 | 2.123 | 3.103 | 0.052 | 0.000 | 2.535 | 12.942 | 2.482 | n/a | 0.086 | 5.155 | 0.390 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f2460000000000000b9f | 27.085 | 3.469 | n/a | 0.000 | 0.116 | 0.798 | 1.009 | 0.012 | 0.000 | 0.137 | 20.490 | 0.986 | n/a | 0.067 | 3.585 | 0.132 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000aa8 | 20.581 | 4.801 | n/a | 0.000 | 0.218 | 1.158 | 1.567 | 0.020 | 0.000 | 0.202 | 11.269 | 1.270 | n/a | 0.075 | 5.019 | 0.244 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a7e | 18.758 | 2.725 | n/a | 0.000 | 2.147 | 0.737 | 1.029 | 0.013 | 0.000 | 0.143 | 10.833 | 1.108 | n/a | 0.023 | 4.872 | 0.260 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.137ms |
| 590490e5f639f2460000000000000ac3 | 18.490 | 4.037 | n/a | 0.000 | 0.193 | 0.853 | 1.618 | 0.019 | 0.000 | 0.389 | 10.044 | 1.260 | n/a | 0.076 | 4.231 | 0.229 | 0.076 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b09 | 18.329 | 2.384 | n/a | 0.000 | 0.091 | 1.170 | 2.786 | 0.199 | 0.000 | 0.257 | 10.117 | 1.270 | n/a | 0.055 | 2.475 | 0.135 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a87 | 18.281 | 2.062 | n/a | 0.000 | 0.080 | 0.683 | 1.271 | 0.011 | 0.000 | 0.140 | 12.942 | 1.054 | n/a | 0.036 | 2.142 | 0.117 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.298ms |
| 590490e5f639f2460000000000000b9c | 17.671 | 2.971 | n/a | 0.000 | 0.071 | 0.916 | 1.358 | 0.021 | 0.000 | 0.224 | 10.733 | 1.336 | n/a | 0.042 | 3.042 | 0.172 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b1b | 17.257 | 3.917 | n/a | 0.000 | 0.212 | 0.954 | 1.607 | 0.020 | 0.000 | 0.221 | 9.609 | 0.643 | n/a | 0.074 | 4.129 | 0.239 | 0.074 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a57 | 17.038 | 3.472 | n/a | 0.000 | 0.122 | 0.974 | 1.533 | 0.025 | 0.000 | 0.711 | 9.127 | 0.992 | n/a | 0.082 | 3.595 | 0.211 | 0.082 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b0c | 16.986 | 4.723 | n/a | 0.000 | 0.277 | 1.765 | 2.448 | 0.034 | 0.000 | 0.279 | 6.706 | 0.667 | n/a | 0.088 | 5.001 | 0.294 | 0.088 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000ab7 | 16.718 | 4.830 | n/a | 0.000 | 0.207 | 1.021 | 1.583 | 0.021 | 0.000 | 0.150 | 8.193 | 0.636 | n/a | 0.076 | 5.037 | 0.301 | 0.076 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b1e | 16.665 | 2.839 | n/a | 0.000 | 2.168 | 1.125 | 1.075 | 0.016 | 0.000 | 0.393 | 8.480 | 0.536 | n/a | 0.033 | 5.007 | 0.300 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a6f | 16.510 | 4.260 | n/a | 0.000 | 0.209 | 1.594 | 2.561 | 0.032 | 0.000 | 0.211 | 6.493 | 1.068 | n/a | 0.082 | 4.469 | 0.271 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.597ms |
| 590490e5f639f2460000000000000ac6 | 16.419 | 4.386 | n/a | 0.000 | 0.196 | 0.829 | 1.579 | 0.019 | 0.000 | 0.221 | 7.817 | 1.297 | n/a | 0.077 | 4.582 | 0.279 | 0.077 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b30 | 16.315 | 4.469 | n/a | 0.000 | 0.224 | 1.654 | 2.303 | 0.034 | 0.000 | 0.257 | 6.618 | 0.669 | n/a | 0.086 | 4.693 | 0.288 | 0.086 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000bb1 | 16.204 | 4.940 | n/a | 0.000 | 0.193 | 1.446 | 2.043 | 0.034 | 0.000 | 0.763 | 6.052 | 0.651 | n/a | 0.083 | 5.133 | 0.317 | 0.083 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a9c | 16.087 | 2.736 | n/a | 0.000 | 0.073 | 0.707 | 0.964 | 0.012 | 0.000 | 0.139 | 10.275 | 1.151 | n/a | 0.031 | 2.809 | 0.175 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000bd2 | 16.049 | 2.427 | n/a | 0.000 | 0.055 | 1.104 | 2.481 | 0.040 | 0.000 | 0.432 | 8.239 | 1.246 | n/a | 0.025 | 2.481 | 0.155 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000bc6 | 16.023 | 3.667 | n/a | 0.000 | 0.124 | 1.178 | 1.811 | 0.028 | 0.000 | 0.199 | 7.838 | 1.105 | n/a | 0.073 | 3.791 | 0.237 | 0.073 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b69 | 15.965 | 3.045 | n/a | 0.000 | 0.080 | 1.262 | 2.292 | 0.041 | 0.000 | 0.454 | 7.445 | 1.305 | n/a | 0.041 | 3.125 | 0.196 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.113 | 0.441 | 0.000 | 0.542 | 2.550 | n/a | 0.000 | 0.078 | 0.815 | 1.304 | 0.017 | 0.000 | 0.174 | 5.805 | 0.565 | n/a | 0.036 | 2.679 | 0.237 | 0.036 |
| p99 | 20.581 | 2.006 | 0.000 | 1.033 | 4.830 | n/a | 0.000 | 2.212 | 2.123 | 3.103 | 0.052 | 0.000 | 2.535 | 12.942 | 2.482 | n/a | 0.086 | 5.155 | 0.390 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 590490e5f639f2460000000000000b9f | 27.085 | 3.469 | n/a | 0.000 | 0.116 | 0.798 | 1.009 | 0.012 | 0.000 | 0.137 | 20.490 | 0.986 | n/a | 0.067 | 3.585 | 0.132 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000aa8 | 20.581 | 4.801 | n/a | 0.000 | 0.218 | 1.158 | 1.567 | 0.020 | 0.000 | 0.202 | 11.269 | 1.270 | n/a | 0.075 | 5.019 | 0.244 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a7e | 18.758 | 2.725 | n/a | 0.000 | 2.147 | 0.737 | 1.029 | 0.013 | 0.000 | 0.143 | 10.833 | 1.108 | n/a | 0.023 | 4.872 | 0.260 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.137ms |
| 590490e5f639f2460000000000000ac3 | 18.490 | 4.037 | n/a | 0.000 | 0.193 | 0.853 | 1.618 | 0.019 | 0.000 | 0.389 | 10.044 | 1.260 | n/a | 0.076 | 4.231 | 0.229 | 0.076 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b09 | 18.329 | 2.384 | n/a | 0.000 | 0.091 | 1.170 | 2.786 | 0.199 | 0.000 | 0.257 | 10.117 | 1.270 | n/a | 0.055 | 2.475 | 0.135 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a87 | 18.281 | 2.062 | n/a | 0.000 | 0.080 | 0.683 | 1.271 | 0.011 | 0.000 | 0.140 | 12.942 | 1.054 | n/a | 0.036 | 2.142 | 0.117 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.298ms |
| 590490e5f639f2460000000000000b9c | 17.671 | 2.971 | n/a | 0.000 | 0.071 | 0.916 | 1.358 | 0.021 | 0.000 | 0.224 | 10.733 | 1.336 | n/a | 0.042 | 3.042 | 0.172 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b1b | 17.257 | 3.917 | n/a | 0.000 | 0.212 | 0.954 | 1.607 | 0.020 | 0.000 | 0.221 | 9.609 | 0.643 | n/a | 0.074 | 4.129 | 0.239 | 0.074 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a57 | 17.038 | 3.472 | n/a | 0.000 | 0.122 | 0.974 | 1.533 | 0.025 | 0.000 | 0.711 | 9.127 | 0.992 | n/a | 0.082 | 3.595 | 0.211 | 0.082 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b0c | 16.986 | 4.723 | n/a | 0.000 | 0.277 | 1.765 | 2.448 | 0.034 | 0.000 | 0.279 | 6.706 | 0.667 | n/a | 0.088 | 5.001 | 0.294 | 0.088 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000ab7 | 16.718 | 4.830 | n/a | 0.000 | 0.207 | 1.021 | 1.583 | 0.021 | 0.000 | 0.150 | 8.193 | 0.636 | n/a | 0.076 | 5.037 | 0.301 | 0.076 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b1e | 16.665 | 2.839 | n/a | 0.000 | 2.168 | 1.125 | 1.075 | 0.016 | 0.000 | 0.393 | 8.480 | 0.536 | n/a | 0.033 | 5.007 | 0.300 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a6f | 16.510 | 4.260 | n/a | 0.000 | 0.209 | 1.594 | 2.561 | 0.032 | 0.000 | 0.211 | 6.493 | 1.068 | n/a | 0.082 | 4.469 | 0.271 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.597ms |
| 590490e5f639f2460000000000000ac6 | 16.419 | 4.386 | n/a | 0.000 | 0.196 | 0.829 | 1.579 | 0.019 | 0.000 | 0.221 | 7.817 | 1.297 | n/a | 0.077 | 4.582 | 0.279 | 0.077 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b30 | 16.315 | 4.469 | n/a | 0.000 | 0.224 | 1.654 | 2.303 | 0.034 | 0.000 | 0.257 | 6.618 | 0.669 | n/a | 0.086 | 4.693 | 0.288 | 0.086 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000bb1 | 16.204 | 4.940 | n/a | 0.000 | 0.193 | 1.446 | 2.043 | 0.034 | 0.000 | 0.763 | 6.052 | 0.651 | n/a | 0.083 | 5.133 | 0.317 | 0.083 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000a9c | 16.087 | 2.736 | n/a | 0.000 | 0.073 | 0.707 | 0.964 | 0.012 | 0.000 | 0.139 | 10.275 | 1.151 | n/a | 0.031 | 2.809 | 0.175 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000bd2 | 16.049 | 2.427 | n/a | 0.000 | 0.055 | 1.104 | 2.481 | 0.040 | 0.000 | 0.432 | 8.239 | 1.246 | n/a | 0.025 | 2.481 | 0.155 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000bc6 | 16.023 | 3.667 | n/a | 0.000 | 0.124 | 1.178 | 1.811 | 0.028 | 0.000 | 0.199 | 7.838 | 1.105 | n/a | 0.073 | 3.791 | 0.237 | 0.073 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 590490e5f639f2460000000000000b69 | 15.965 | 3.045 | n/a | 0.000 | 0.080 | 1.262 | 2.292 | 0.041 | 0.000 | 0.454 | 7.445 | 1.305 | n/a | 0.041 | 3.125 | 0.196 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.708 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 0.000 | 0.680 | 200.943 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.081 | 0.032 | 0.000 | 0.081 |
| p99 | 422.917 | n/a | n/a | n/a | 13.184 | n/a | 1.977 | 0.000 | 3.014 | 394.955 | 0.296 | 19.798 | 0.184 | 0.000 | n/a | n/a | 0.514 | 15.161 | 0.181 | 0.514 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f70000000000000002 | 422.917 | 4.566 | n/a | 0.000 | 0.000 | 2.605 | 394.955 | 0.296 | 19.798 | 0.184 | 0.000 | n/a | n/a | 0.514 | 4.566 | 0.011 | 0.514 | gw-r/thread-52/gateway.admitted-work | none observed |
| 4f251cccdf6e1f370000000000000005 | 202.871 | 0.049 | n/a | 0.000 | 0.000 | 0.868 | 201.680 | 0.089 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.087 | 0.049 | 0.000 | 0.087 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f37000000000000091f | 201.972 | 0.032 | n/a | 0.000 | 0.000 | 0.656 | 201.123 | 0.007 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.081 | 0.032 | 0.000 | 0.081 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f370000000000000920 | 201.761 | 0.023 | n/a | 0.000 | 0.000 | 0.680 | 200.943 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.057 | 0.023 | 0.000 | 0.057 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f37000000000000091e | 201.708 | 0.029 | n/a | 0.000 | 0.000 | 0.410 | 201.120 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.071 | 0.029 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f370000000000000921 | 201.030 | 0.022 | n/a | 0.000 | 0.000 | 0.377 | 200.527 | 0.012 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.055 | 0.022 | 0.000 | 0.055 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000006 | 191.030 | 0.292 | n/a | 0.000 | 0.000 | 1.171 | 189.265 | 0.011 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.206 | 0.292 | 0.002 | 0.206 | gw-r/thread-52/journal/page | none observed |
| 4f251cccdf6e1f370000000000000924 | 83.560 | 13.184 | n/a | 1.977 | 0.000 | 3.014 | 65.214 | 0.003 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.164 | 15.161 | 0.181 | 0.164 | gw-r/thread-51/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 45.796 | n/a | n/a | n/a | 1.960 | n/a | 0.000 | 0.000 | 0.388 | 43.349 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.067 | 1.960 | 0.043 | 0.067 |
| p99 | 1010.695 | n/a | n/a | n/a | 2.349 | n/a | 0.000 | 0.000 | 1.877 | 1003.505 | 0.030 | 0.000 | 1.830 | 0.000 | n/a | n/a | 3.161 | 2.349 | 0.081 | 3.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f700000000000000a4 | 1010.695 | 0.292 | n/a | 0.000 | 0.000 | 1.877 | 1003.505 | 0.030 | 0.000 | 1.830 | 0.000 | n/a | n/a | 3.161 | 0.292 | 0.000 | 3.161 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f70000000000000487 | 45.796 | 1.960 | n/a | 0.000 | 0.000 | 0.388 | 43.349 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.056 | 1.960 | 0.043 | 0.056 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f7000000000000035b | 29.082 | 2.349 | n/a | 0.000 | 0.000 | 0.317 | 26.321 | 0.006 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.067 | 2.349 | 0.081 | 0.067 | gw-r/thread-52/journal/page | none observed |

## P3 / warmup / internal (199 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.675 | n/a | n/a | n/a | 2.423 | n/a | 0.000 | 0.000 | 0.698 | 20.684 | 0.009 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.065 | 2.423 | 0.107 | 0.065 |
| p99 | 101.102 | n/a | n/a | n/a | 10.188 | n/a | 0.000 | 0.000 | 7.610 | 67.522 | 1.189 | 0.000 | 0.502 | 0.000 | n/a | n/a | 0.402 | 10.188 | 0.305 | 0.402 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f70000000000000232 | 1002.628 | 0.119 | n/a | 0.000 | 0.000 | 0.546 | 1000.722 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.181 | 0.119 | 0.000 | 1.181 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000000a5 | 101.102 | 21.383 | n/a | 0.000 | 0.000 | 1.069 | 67.522 | 10.561 | 0.000 | 0.277 | 0.000 | n/a | n/a | 0.291 | 21.383 | 0.211 | 0.291 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000203 | 61.307 | 2.909 | n/a | 0.000 | 0.000 | 1.106 | 57.170 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.055 | 2.909 | 0.047 | 0.055 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f700000000000001de | 39.921 | 2.230 | n/a | 0.000 | 0.000 | 3.036 | 34.521 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.055 | 2.230 | 0.056 | 0.055 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f700000000000001db | 38.612 | 2.352 | n/a | 0.000 | 0.000 | 1.045 | 34.970 | 0.137 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.059 | 2.352 | 0.061 | 0.059 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f700000000000000a8 | 36.791 | 10.188 | n/a | 0.000 | 0.000 | 2.131 | 24.098 | 0.043 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.291 | 10.188 | 0.277 | 0.291 | gw-r/thread-50/gateway.admitted-work | none observed |
| 31be63825a5168f7000000000000019a | 36.163 | 4.478 | n/a | 0.000 | 0.000 | 0.685 | 30.817 | 0.010 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.139 | 4.478 | 0.124 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f70000000000000228 | 35.762 | 3.920 | n/a | 0.000 | 0.000 | 0.601 | 31.139 | 0.003 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.069 | 3.920 | 0.110 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f7000000000000021c | 35.680 | 2.765 | n/a | 0.000 | 0.000 | 1.067 | 31.717 | 0.014 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.053 | 2.765 | 0.077 | 0.053 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f7000000000000020a | 34.104 | 4.053 | n/a | 0.000 | 0.000 | 5.155 | 24.703 | 0.009 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.090 | 4.053 | 0.119 | 0.090 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f7000000000000011c | 34.045 | 4.215 | n/a | 0.000 | 0.000 | 0.713 | 28.910 | 0.069 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.108 | 4.215 | 0.124 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f70000000000000136 | 33.922 | 2.440 | n/a | 0.000 | 0.000 | 5.666 | 25.709 | 0.012 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.063 | 2.440 | 0.072 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f7000000000000010d | 33.897 | 2.155 | n/a | 0.000 | 0.000 | 0.551 | 31.062 | 0.013 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.058 | 2.155 | 0.064 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f700000000000000fc | 33.386 | 3.095 | n/a | 0.000 | 0.000 | 3.262 | 26.875 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.116 | 3.095 | 0.093 | 0.116 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f70000000000000149 | 32.684 | 2.598 | n/a | 0.000 | 0.000 | 1.006 | 28.910 | 0.022 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.054 | 2.598 | 0.079 | 0.054 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000001f3 | 32.566 | 2.747 | n/a | 0.000 | 0.000 | 0.785 | 28.896 | 0.015 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.056 | 2.747 | 0.084 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f700000000000001ec | 32.375 | 2.248 | n/a | 0.000 | 0.000 | 0.566 | 29.441 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.053 | 2.248 | 0.069 | 0.053 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f7000000000000012d | 32.359 | 5.057 | n/a | 0.000 | 0.000 | 1.855 | 25.227 | 0.011 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.146 | 5.057 | 0.156 | 0.146 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f700000000000000ee | 32.130 | 3.396 | n/a | 0.000 | 0.000 | 1.062 | 27.407 | 0.016 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.168 | 3.396 | 0.106 | 0.168 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f7000000000000017c | 32.065 | 2.129 | n/a | 0.000 | 0.000 | 3.438 | 26.282 | 0.140 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.055 | 2.129 | 0.066 | 0.055 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-10 / internal (144 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.775 | n/a | n/a | n/a | 2.480 | n/a | 0.000 | 0.000 | 0.667 | 5.311 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.064 | 2.480 | 0.280 | 0.064 |
| p99 | 22.109 | n/a | n/a | n/a | 7.479 | n/a | 0.000 | 0.000 | 8.826 | 18.348 | 0.623 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.220 | 7.479 | 0.764 | 0.220 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f70000000000000359 | 1003.470 | 2.501 | n/a | 0.000 | 0.000 | 1.320 | 999.551 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.501 | 0.002 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f700000000000002a3 | 22.109 | 7.479 | n/a | 0.000 | 0.000 | 13.567 | 0.833 | 0.003 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.220 | 7.479 | 0.338 | 0.220 | node-13/thread-2/socket.wait-first-byte | none observed |
| 31be63825a5168f7000000000000026b | 22.029 | 3.734 | n/a | 0.000 | 0.000 | 0.534 | 17.663 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.063 | 3.734 | 0.170 | 0.063 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f7000000000000029e | 21.124 | 2.071 | n/a | 0.000 | 0.000 | 0.552 | 18.348 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.070 | 2.071 | 0.098 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f700000000000002d3 | 21.073 | 3.695 | n/a | 0.000 | 0.000 | 0.819 | 16.457 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.072 | 3.695 | 0.175 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000337 | 20.709 | 4.082 | n/a | 0.000 | 0.000 | 0.576 | 15.832 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.180 | 4.082 | 0.197 | 0.180 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000299 | 19.386 | 4.523 | n/a | 0.000 | 0.000 | 0.299 | 14.334 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.189 | 4.523 | 0.233 | 0.189 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f700000000000002f4 | 19.180 | 4.609 | n/a | 0.000 | 0.000 | 0.402 | 14.024 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.108 | 4.609 | 0.240 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f700000000000002e4 | 18.877 | 2.224 | n/a | 0.000 | 0.000 | 0.718 | 15.865 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.060 | 2.224 | 0.118 | 0.060 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f7000000000000024f | 18.790 | 4.587 | n/a | 0.000 | 0.000 | 1.301 | 12.707 | 0.005 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.111 | 4.587 | 0.244 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f700000000000002f8 | 18.113 | 5.492 | n/a | 0.000 | 0.000 | 2.301 | 10.114 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.136 | 5.492 | 0.303 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f70000000000000247 | 17.392 | 7.426 | n/a | 0.000 | 0.000 | 5.015 | 4.796 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.125 | 7.426 | 0.427 | 0.125 | node-13/thread-2/replica.fetch-feed | none observed |
| 31be63825a5168f70000000000000350 | 17.321 | 4.364 | n/a | 0.000 | 0.000 | 0.609 | 12.185 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.129 | 4.364 | 0.252 | 0.129 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f70000000000000357 | 17.089 | 2.057 | n/a | 0.000 | 0.000 | 0.568 | 14.354 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.060 | 2.057 | 0.120 | 0.060 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f7000000000000031f | 16.769 | 2.029 | n/a | 0.000 | 0.000 | 0.360 | 14.270 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.054 | 2.029 | 0.121 | 0.054 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000287 | 16.734 | 3.071 | n/a | 0.000 | 0.000 | 0.361 | 13.128 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.120 | 3.071 | 0.183 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000301 | 16.340 | 4.371 | n/a | 0.000 | 0.000 | 0.983 | 10.809 | 0.003 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.143 | 4.371 | 0.268 | 0.143 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f700000000000002b1 | 16.107 | 3.820 | n/a | 0.000 | 0.000 | 0.731 | 11.112 | 0.335 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.101 | 3.820 | 0.237 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f7000000000000027c | 16.071 | 3.513 | n/a | 0.000 | 0.000 | 0.740 | 11.676 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.067 | 3.513 | 0.219 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f7000000000000031a | 15.697 | 2.514 | n/a | 0.000 | 0.000 | 0.318 | 12.742 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.061 | 2.514 | 0.160 | 0.061 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-25 / internal (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.031 | n/a | n/a | n/a | 2.279 | n/a | 0.000 | 0.000 | 0.502 | 21.537 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.057 | 2.279 | 0.094 | 0.057 |
| p99 | 50.939 | n/a | n/a | n/a | 5.240 | n/a | 0.000 | 0.000 | 3.648 | 44.477 | 0.121 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.137 | 5.240 | 0.238 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f70000000000000484 | 1002.343 | 0.102 | n/a | 0.000 | 0.000 | 0.442 | 1000.635 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.102 | 0.102 | 0.000 | 1.102 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f700000000000003e7 | 50.939 | 5.605 | n/a | 0.000 | 0.000 | 0.650 | 44.477 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.137 | 5.605 | 0.110 | 0.137 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000415 | 33.954 | 1.850 | n/a | 0.000 | 0.000 | 0.303 | 31.746 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.044 | 1.850 | 0.054 | 0.044 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f70000000000000461 | 33.882 | 2.937 | n/a | 0.000 | 0.000 | 0.714 | 30.127 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.094 | 2.937 | 0.087 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000366 | 33.349 | 5.240 | n/a | 0.000 | 0.000 | 1.667 | 26.289 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.100 | 5.240 | 0.157 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f70000000000000459 | 32.844 | 2.020 | n/a | 0.000 | 0.000 | 1.748 | 28.992 | 0.004 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.061 | 2.020 | 0.062 | 0.061 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000448 | 31.517 | 2.371 | n/a | 0.000 | 0.000 | 0.867 | 28.204 | 0.002 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.056 | 2.371 | 0.075 | 0.056 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f70000000000000374 | 31.419 | 2.659 | n/a | 0.000 | 0.000 | 2.689 | 25.967 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.065 | 2.659 | 0.085 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f70000000000000408 | 30.958 | 4.074 | n/a | 0.000 | 0.000 | 0.662 | 26.081 | 0.014 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.119 | 4.074 | 0.132 | 0.119 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f7000000000000047a | 30.873 | 1.920 | n/a | 0.000 | 0.000 | 3.648 | 25.216 | 0.003 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.055 | 1.920 | 0.062 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f70000000000000434 | 30.719 | 1.899 | n/a | 0.000 | 0.000 | 0.447 | 28.297 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.047 | 1.899 | 0.062 | 0.047 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f70000000000000486 | 30.481 | 2.025 | n/a | 0.000 | 0.000 | 0.466 | 27.867 | 0.002 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.107 | 2.025 | 0.066 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f700000000000003d2 | 30.469 | 3.650 | n/a | 0.000 | 0.000 | 0.719 | 26.010 | 0.002 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.061 | 3.650 | 0.120 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f7000000000000039e | 30.204 | 2.347 | n/a | 0.000 | 0.000 | 1.764 | 25.972 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.061 | 2.347 | 0.078 | 0.061 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f7000000000000042e | 30.006 | 1.974 | n/a | 0.000 | 0.000 | 0.413 | 27.497 | 0.011 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.049 | 1.974 | 0.066 | 0.049 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f70000000000000370 | 29.865 | 2.121 | n/a | 0.000 | 0.000 | 0.440 | 27.224 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.054 | 2.121 | 0.071 | 0.054 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f7000000000000037b | 29.463 | 2.408 | n/a | 0.000 | 0.000 | 0.562 | 26.421 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.048 | 2.408 | 0.082 | 0.048 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f700000000000003f3 | 29.461 | 2.031 | n/a | 0.000 | 0.000 | 2.402 | 24.918 | 0.009 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.046 | 2.031 | 0.069 | 0.046 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f700000000000003d7 | 28.412 | 4.505 | n/a | 0.000 | 0.000 | 3.497 | 20.290 | 0.008 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.091 | 4.505 | 0.159 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f7000000000000038e | 28.387 | 2.392 | n/a | 0.000 | 0.000 | 0.673 | 25.199 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.059 | 2.392 | 0.084 | 0.059 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-50 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.841 | n/a | n/a | n/a | 2.222 | n/a | 0.000 | 0.000 | 0.506 | 46.686 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.058 | 2.222 | 0.045 | 0.058 |
| p99 | 97.582 | n/a | n/a | n/a | 4.726 | n/a | 0.000 | 0.000 | 2.179 | 94.023 | 0.212 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.134 | 4.726 | 0.096 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f700000000000005b1 | 1002.748 | 0.186 | n/a | 0.000 | 0.000 | 0.676 | 1000.701 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.145 | 0.186 | 0.000 | 1.145 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f700000000000005b5 | 97.582 | 2.292 | n/a | 0.000 | 0.000 | 1.161 | 94.023 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.062 | 2.292 | 0.023 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f70000000000000553 | 66.279 | 4.663 | n/a | 0.000 | 0.000 | 0.522 | 60.948 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.092 | 4.663 | 0.070 | 0.092 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000004f6 | 58.602 | 3.901 | n/a | 0.000 | 0.000 | 0.698 | 53.903 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.088 | 3.901 | 0.067 | 0.088 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f7000000000000051f | 56.789 | 4.045 | n/a | 0.000 | 0.000 | 0.611 | 52.012 | 0.003 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.100 | 4.045 | 0.071 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f700000000000004c1 | 56.619 | 2.011 | n/a | 0.000 | 0.000 | 0.401 | 54.102 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.056 | 2.011 | 0.036 | 0.056 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f700000000000004a9 | 56.421 | 5.313 | n/a | 0.000 | 0.000 | 0.557 | 50.395 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.107 | 5.313 | 0.094 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f7000000000000057b | 56.248 | 2.973 | n/a | 0.000 | 0.000 | 0.759 | 52.396 | 0.003 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.077 | 2.973 | 0.053 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f700000000000004d4 | 55.427 | 4.508 | n/a | 0.000 | 0.000 | 0.411 | 50.351 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.119 | 4.508 | 0.081 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f70000000000000584 | 55.355 | 3.328 | n/a | 0.000 | 0.000 | 0.450 | 51.448 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.093 | 3.328 | 0.060 | 0.093 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f70000000000000592 | 55.207 | 2.091 | n/a | 0.000 | 0.000 | 0.330 | 52.716 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.052 | 2.091 | 0.038 | 0.052 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f700000000000004b1 | 54.753 | 1.943 | n/a | 0.000 | 0.000 | 0.424 | 52.296 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.055 | 1.943 | 0.035 | 0.055 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000005b3 | 54.444 | 3.970 | n/a | 0.000 | 0.000 | 0.950 | 49.394 | 0.002 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.079 | 3.970 | 0.073 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000004dd | 54.278 | 3.177 | n/a | 0.000 | 0.000 | 0.517 | 50.463 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.059 | 3.177 | 0.059 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f70000000000000491 | 54.265 | 3.745 | n/a | 0.000 | 0.000 | 0.662 | 49.708 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.108 | 3.745 | 0.069 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f70000000000000527 | 54.210 | 4.726 | n/a | 0.000 | 0.000 | 0.390 | 48.942 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.094 | 4.726 | 0.087 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000005a3 | 54.096 | 4.049 | n/a | 0.000 | 0.000 | 0.584 | 49.351 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.101 | 4.049 | 0.075 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f700000000000004fd | 54.076 | 2.322 | n/a | 0.000 | 0.000 | 0.443 | 51.218 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.056 | 2.322 | 0.043 | 0.056 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f70000000000000532 | 53.585 | 3.037 | n/a | 0.000 | 0.000 | 0.606 | 49.832 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.051 | 3.037 | 0.057 | 0.051 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000567 | 53.412 | 1.871 | n/a | 0.000 | 0.000 | 0.269 | 51.206 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.051 | 1.871 | 0.035 | 0.051 | gw-r/thread-66/journal/page | none observed |

## P3 / idle-100 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 99.680 | n/a | n/a | n/a | 2.263 | n/a | 0.000 | 0.000 | 0.533 | 96.349 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.068 | 2.263 | 0.023 | 0.068 |
| p99 | 248.823 | n/a | n/a | n/a | 5.511 | n/a | 0.000 | 0.000 | 4.219 | 246.280 | 0.190 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.167 | 5.511 | 0.054 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f700000000000006de | 1002.425 | 0.108 | n/a | 0.000 | 0.000 | 0.481 | 1000.663 | 0.005 | 0.000 | 0.065 | 0.000 | n/a | n/a | 1.104 | 0.108 | 0.000 | 1.104 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000006e1 | 248.823 | 2.030 | n/a | 0.000 | 0.000 | 0.385 | 246.280 | 0.018 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.060 | 2.030 | 0.008 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f7000000000000060c | 119.560 | 4.476 | n/a | 0.000 | 0.000 | 0.661 | 114.302 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.083 | 4.476 | 0.037 | 0.083 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f70000000000000632 | 109.652 | 2.447 | n/a | 0.000 | 0.000 | 1.114 | 105.968 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.068 | 2.447 | 0.022 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f700000000000006c7 | 107.629 | 2.186 | n/a | 0.000 | 0.000 | 0.359 | 104.935 | 0.007 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.055 | 2.186 | 0.020 | 0.055 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f7000000000000064e | 107.280 | 5.511 | n/a | 0.000 | 0.000 | 0.711 | 100.859 | 0.004 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.130 | 5.511 | 0.051 | 0.130 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f700000000000005e2 | 107.066 | 2.103 | n/a | 0.000 | 0.000 | 0.386 | 104.476 | 0.003 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.065 | 2.103 | 0.020 | 0.065 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f700000000000005fb | 106.791 | 4.532 | n/a | 0.000 | 0.000 | 0.597 | 101.581 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.071 | 4.532 | 0.042 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f70000000000000673 | 106.255 | 2.336 | n/a | 0.000 | 0.000 | 1.059 | 102.753 | 0.002 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.090 | 2.336 | 0.022 | 0.090 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f700000000000005dc | 106.242 | 1.943 | n/a | 0.000 | 0.000 | 0.337 | 103.877 | 0.001 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.075 | 1.943 | 0.018 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f7000000000000067f | 105.175 | 4.116 | n/a | 0.000 | 0.000 | 0.815 | 100.071 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.124 | 4.116 | 0.039 | 0.124 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000648 | 105.049 | 2.125 | n/a | 0.000 | 0.000 | 0.431 | 102.379 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.060 | 2.125 | 0.020 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f7000000000000068c | 104.961 | 2.572 | n/a | 0.000 | 0.000 | 0.820 | 101.443 | 0.015 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.068 | 2.572 | 0.024 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f70000000000000640 | 104.932 | 5.477 | n/a | 0.000 | 0.000 | 0.781 | 98.487 | 0.003 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.131 | 5.477 | 0.052 | 0.131 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f700000000000006cc | 104.869 | 4.259 | n/a | 0.000 | 0.000 | 0.436 | 99.986 | 0.004 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.129 | 4.259 | 0.041 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f70000000000000620 | 104.823 | 1.948 | n/a | 0.000 | 0.000 | 0.521 | 102.266 | 0.003 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.052 | 1.948 | 0.019 | 0.052 | gw-r/thread-52/journal/page | none observed |
| 31be63825a5168f700000000000006a6 | 104.303 | 7.489 | n/a | 0.000 | 0.000 | 0.815 | 95.848 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.097 | 7.489 | 0.072 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000612 | 103.909 | 2.000 | n/a | 0.000 | 0.000 | 0.359 | 101.436 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.058 | 2.000 | 0.019 | 0.058 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f7000000000000063b | 103.675 | 3.347 | n/a | 0.000 | 0.000 | 0.475 | 99.711 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.099 | 3.347 | 0.032 | 0.099 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000005c2 | 103.552 | 3.892 | n/a | 0.000 | 0.000 | 0.705 | 98.840 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.069 | 3.892 | 0.038 | 0.069 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-250 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 249.760 | n/a | n/a | n/a | 2.426 | n/a | 0.000 | 0.000 | 0.604 | 246.298 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.071 | 2.426 | 0.010 | 0.071 |
| p99 | 499.530 | n/a | n/a | n/a | 5.428 | n/a | 0.000 | 0.000 | 2.902 | 494.292 | 0.018 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.347 | 5.428 | 0.021 | 0.347 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f7000000000000080b | 1002.802 | 0.185 | n/a | 0.000 | 0.000 | 0.643 | 1000.789 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.127 | 0.185 | 0.000 | 1.127 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f7000000000000080e | 499.530 | 4.355 | n/a | 0.000 | 0.000 | 0.714 | 494.292 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.105 | 4.355 | 0.009 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f7000000000000079d | 259.090 | 2.043 | n/a | 0.000 | 0.000 | 0.495 | 256.437 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.063 | 2.043 | 0.008 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000006e9 | 258.400 | 3.729 | n/a | 0.000 | 0.000 | 0.857 | 253.696 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.069 | 3.729 | 0.014 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f700000000000007cd | 257.921 | 5.085 | n/a | 0.000 | 0.000 | 0.771 | 251.887 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.133 | 5.085 | 0.020 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f7000000000000077b | 256.816 | 2.198 | n/a | 0.000 | 0.000 | 0.651 | 253.847 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.071 | 2.198 | 0.009 | 0.071 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f700000000000007f3 | 256.026 | 2.939 | n/a | 0.000 | 0.000 | 0.512 | 252.451 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.079 | 2.939 | 0.011 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f700000000000007c1 | 255.751 | 4.861 | n/a | 0.000 | 0.000 | 0.945 | 249.768 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.120 | 4.861 | 0.019 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f70000000000000753 | 255.635 | 2.619 | n/a | 0.000 | 0.000 | 1.969 | 250.907 | 0.004 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.071 | 2.619 | 0.010 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f7000000000000072d | 255.554 | 2.781 | n/a | 0.000 | 0.000 | 0.526 | 252.078 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.114 | 2.781 | 0.011 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f700000000000007b1 | 255.506 | 3.962 | n/a | 0.000 | 0.000 | 0.738 | 250.707 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.064 | 3.962 | 0.016 | 0.064 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f70000000000000739 | 255.322 | 1.982 | n/a | 0.000 | 0.000 | 2.147 | 251.060 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.058 | 1.982 | 0.008 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f7000000000000071c | 255.270 | 4.098 | n/a | 0.000 | 0.000 | 0.662 | 250.303 | 0.009 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.113 | 4.098 | 0.016 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000734 | 255.234 | 4.256 | n/a | 0.000 | 0.000 | 1.556 | 249.184 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.156 | 4.256 | 0.017 | 0.156 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f70000000000000800 | 255.213 | 4.275 | n/a | 0.000 | 0.000 | 0.623 | 250.157 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.110 | 4.275 | 0.017 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f700000000000007d5 | 255.102 | 2.044 | n/a | 0.000 | 0.000 | 0.572 | 252.337 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.114 | 2.044 | 0.008 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f7000000000000073d | 255.023 | 5.248 | n/a | 0.000 | 0.000 | 0.514 | 249.078 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.148 | 5.248 | 0.021 | 0.148 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f70000000000000702 | 254.570 | 2.001 | n/a | 0.000 | 0.000 | 0.382 | 252.050 | 0.014 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.057 | 2.001 | 0.008 | 0.057 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f7000000000000080a | 254.495 | 4.506 | n/a | 0.000 | 0.000 | 0.798 | 249.022 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.125 | 4.506 | 0.018 | 0.125 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f700000000000006ee | 254.394 | 4.144 | n/a | 0.000 | 0.000 | 0.604 | 249.537 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.066 | 4.144 | 0.016 | 0.066 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-500 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 500.094 | n/a | n/a | n/a | 2.836 | n/a | 0.000 | 0.000 | 0.586 | 495.747 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.073 | 3.091 | 0.006 | 0.073 |
| p99 | 1002.973 | n/a | n/a | n/a | 6.677 | n/a | 1.135 | 0.000 | 4.274 | 1000.869 | 0.024 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.560 | 7.812 | 0.015 | 0.560 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f7000000000000093c | 1004.627 | 2.784 | n/a | 0.000 | 0.000 | 0.359 | 1001.356 | 0.009 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.080 | 2.784 | 0.003 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000938 | 1002.973 | 0.154 | n/a | 0.000 | 0.000 | 0.769 | 1000.869 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.122 | 0.154 | 0.000 | 1.122 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000829 | 518.836 | 2.084 | n/a | 0.000 | 0.000 | 0.375 | 516.256 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.069 | 2.084 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f70000000000000926 | 508.358 | 4.382 | n/a | 0.723 | 0.000 | 0.527 | 502.578 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.094 | 5.105 | 0.010 | 0.094 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f7000000000000087f | 508.307 | 8.083 | n/a | 1.008 | 0.000 | 1.012 | 497.594 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.560 | 9.090 | 0.018 | 0.560 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f700000000000008ea | 507.724 | 5.307 | n/a | 0.000 | 0.000 | 0.362 | 501.865 | 0.009 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.142 | 5.307 | 0.010 | 0.142 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f700000000000008c7 | 507.573 | 2.842 | n/a | 0.000 | 0.000 | 1.151 | 503.454 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.073 | 2.842 | 0.006 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000842 | 507.303 | 4.104 | n/a | 0.000 | 0.000 | 0.570 | 502.475 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.119 | 4.104 | 0.008 | 0.119 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f7000000000000090a | 506.827 | 2.562 | n/a | 0.000 | 0.000 | 0.470 | 503.698 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.065 | 2.562 | 0.005 | 0.065 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000917 | 506.635 | 2.467 | n/a | 0.000 | 0.000 | 0.368 | 503.681 | 0.009 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.065 | 2.467 | 0.005 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f700000000000008d9 | 506.147 | 2.646 | n/a | 0.000 | 0.000 | 0.397 | 502.974 | 0.011 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.066 | 2.646 | 0.005 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f700000000000008f0 | 505.995 | 3.078 | n/a | 0.716 | 0.000 | 0.454 | 501.638 | 0.024 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.070 | 3.794 | 0.007 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f70000000000000836 | 505.640 | 2.318 | n/a | 0.000 | 0.000 | 0.424 | 502.803 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.066 | 2.318 | 0.005 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f700000000000008ae | 505.553 | 3.718 | n/a | 0.891 | 0.000 | 1.897 | 498.930 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.084 | 4.609 | 0.009 | 0.084 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f700000000000008b3 | 505.395 | 3.510 | n/a | 0.750 | 0.000 | 0.665 | 500.351 | 0.010 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.070 | 4.260 | 0.008 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 31be63825a5168f70000000000000922 | 505.131 | 2.431 | n/a | 0.000 | 0.000 | 0.323 | 502.263 | 0.009 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.062 | 2.431 | 0.005 | 0.062 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000876 | 504.976 | 2.247 | n/a | 0.000 | 0.000 | 0.907 | 501.702 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.069 | 2.247 | 0.004 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f7000000000000091b | 504.560 | 5.540 | n/a | 0.000 | 0.000 | 1.687 | 497.180 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.120 | 5.540 | 0.011 | 0.120 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000932 | 504.534 | 2.241 | n/a | 0.000 | 0.000 | 0.473 | 501.738 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.062 | 2.241 | 0.004 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f7000000000000092a | 504.523 | 3.967 | n/a | 0.000 | 0.000 | 0.711 | 499.734 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.084 | 3.967 | 0.008 | 0.084 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-1000 / internal (158 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 999.708 | n/a | n/a | n/a | 3.133 | n/a | 0.000 | 0.000 | 0.658 | 994.729 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.079 | 3.387 | 0.003 | 0.079 |
| p99 | 1018.426 | n/a | n/a | n/a | 7.476 | n/a | 1.074 | 0.000 | 4.105 | 1002.176 | 0.030 | 15.862 | 0.069 | 0.000 | n/a | n/a | 1.305 | 8.215 | 0.803 | 1.305 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 31be63825a5168f7000000000000094b | 1028.540 | 3.643 | n/a | 0.000 | 0.000 | 0.453 | 1000.094 | 0.010 | 24.228 | 0.038 | 0.000 | n/a | n/a | 0.073 | 3.643 | 0.004 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000009b4 | 1018.426 | 2.878 | n/a | 0.000 | 0.000 | 0.590 | 998.948 | 0.010 | 15.862 | 0.035 | 0.000 | n/a | n/a | 0.103 | 2.878 | 0.003 | 0.103 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f70000000000000996 | 1012.112 | 7.893 | n/a | 0.903 | 0.000 | 0.756 | 1002.299 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.183 | 8.796 | 0.009 | 0.183 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f700000000000009a8 | 1007.840 | 5.291 | n/a | 0.614 | 0.000 | 0.840 | 1000.979 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.080 | 5.905 | 0.006 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 31be63825a5168f70000000000000971 | 1007.158 | 0.099 | n/a | 0.000 | 0.000 | 3.492 | 1002.176 | 0.027 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.305 | 0.099 | 0.000 | 1.305 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000958 | 1006.466 | 4.737 | n/a | 0.000 | 0.000 | 0.773 | 1000.797 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.121 | 4.737 | 0.005 | 0.121 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000a13 | 1006.366 | 5.155 | n/a | 0.000 | 0.000 | 0.598 | 1000.417 | 0.010 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.142 | 5.155 | 0.005 | 0.142 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f70000000000000a19 | 1005.567 | 3.540 | n/a | 0.000 | 0.000 | 1.294 | 1000.564 | 0.008 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.132 | 3.540 | 0.004 | 0.132 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f70000000000000a42 | 1005.177 | 5.723 | n/a | 0.000 | 0.000 | 0.748 | 998.539 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.130 | 5.723 | 0.006 | 0.130 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f700000000000009de | 1005.154 | 3.158 | n/a | 0.000 | 0.000 | 2.001 | 999.899 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.061 | 3.158 | 0.003 | 0.061 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f700000000000009be | 1005.153 | 0.200 | n/a | 0.000 | 0.000 | 3.232 | 1000.535 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.148 | 0.200 | 0.000 | 1.148 | gw-r/thread-49/journal/page | none observed |
| 31be63825a5168f7000000000000099b | 1005.079 | 6.803 | n/a | 0.655 | 0.000 | 0.616 | 996.845 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.124 | 7.458 | 0.007 | 0.124 | gw-r/thread-51/journal/page | none observed |
| 31be63825a5168f700000000000009ae | 1004.923 | 5.824 | n/a | 0.000 | 0.000 | 0.674 | 998.259 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.130 | 5.824 | 0.006 | 0.130 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f700000000000009b8 | 1004.841 | 2.819 | n/a | 0.000 | 0.000 | 0.632 | 1001.273 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.062 | 2.819 | 0.003 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 31be63825a5168f700000000000009a2 | 1004.761 | 4.244 | n/a | 0.000 | 0.000 | 1.057 | 999.346 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.078 | 4.244 | 0.004 | 0.078 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f7000000000000098f | 1004.727 | 0.098 | n/a | 0.000 | 0.000 | 1.649 | 1001.895 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.031 | 0.098 | 0.000 | 1.031 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f70000000000000a4e | 1004.543 | 2.974 | n/a | 0.000 | 0.000 | 4.232 | 997.236 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.067 | 2.974 | 0.003 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000951 | 1004.394 | 2.264 | n/a | 0.885 | 0.000 | 0.452 | 1000.667 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.095 | 3.149 | 0.003 | 0.095 | gw-r/thread-66/journal/page | none observed |
| 31be63825a5168f70000000000000987 | 1004.249 | 3.073 | n/a | 0.493 | 0.000 | 1.612 | 998.953 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.074 | 3.566 | 0.004 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 31be63825a5168f70000000000000a27 | 1004.244 | 2.448 | n/a | 0.000 | 0.000 | 0.500 | 1001.147 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.096 | 2.448 | 0.002 | 0.096 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.957 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.782 | 200.993 | 0.008 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.093 | 0.041 | 0.000 | 0.093 |
| p99 | 202.680 | n/a | n/a | n/a | 0.069 | n/a | 0.000 | 0.000 | 1.911 | 201.371 | 0.013 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.164 | 0.069 | 0.001 | 0.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f251cccdf6e1f3700000000000000cd | 202.680 | 0.038 | n/a | 0.000 | 0.000 | 1.126 | 201.333 | 0.008 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.084 | 0.038 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 4f251cccdf6e1f3700000000000000ce | 202.560 | 0.043 | n/a | 0.000 | 0.000 | 0.933 | 201.371 | 0.008 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.104 | 0.043 | 0.000 | 0.104 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f3700000000000000cc | 202.001 | 0.034 | n/a | 0.000 | 0.000 | 0.782 | 200.993 | 0.008 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.093 | 0.034 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f3700000000000000cb | 201.957 | 0.052 | n/a | 0.000 | 0.000 | 0.573 | 201.068 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.164 | 0.052 | 0.000 | 0.164 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f3700000000000000cf | 132.771 | 0.069 | n/a | 0.000 | 0.000 | 1.911 | 130.579 | 0.013 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.132 | 0.069 | 0.001 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000000b4 | 57.323 | 0.041 | n/a | 0.000 | 0.000 | 0.477 | 56.710 | 0.003 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.070 | 0.041 | 0.001 | 0.070 | gw-r/thread-66/journal/page | none observed |

## P3 / idle-10 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.662 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.502 | 200.991 | 0.008 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.101 | 0.039 | 0.000 | 0.101 |
| p99 | 203.389 | n/a | n/a | n/a | 0.052 | n/a | 0.000 | 0.000 | 0.698 | 203.000 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.122 | 0.052 | 0.000 | 0.122 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f251cccdf6e1f370000000000000161 | 203.389 | 0.039 | n/a | 0.000 | 0.000 | 0.193 | 203.000 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.101 | 0.039 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f370000000000000162 | 201.986 | 0.041 | n/a | 0.000 | 0.000 | 0.622 | 201.138 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.112 | 0.041 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f370000000000000164 | 201.662 | 0.029 | n/a | 0.000 | 0.000 | 0.502 | 200.991 | 0.008 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f370000000000000163 | 201.633 | 0.030 | n/a | 0.000 | 0.000 | 0.495 | 200.962 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.072 | 0.030 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f370000000000000165 | 111.141 | 0.052 | n/a | 0.000 | 0.000 | 0.698 | 110.247 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.122 | 0.052 | 0.000 | 0.122 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-25 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.276 | n/a | n/a | n/a | 0.029 | n/a | 0.000 | 0.000 | 0.703 | 200.672 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 |
| p99 | 201.953 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.738 | 201.053 | 0.005 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.070 | 0.044 | 0.000 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f251cccdf6e1f3700000000000001fd | 201.953 | 0.028 | n/a | 0.000 | 0.000 | 0.738 | 201.053 | 0.005 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.067 | 0.028 | 0.000 | 0.067 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f3700000000000001fc | 201.870 | 0.029 | n/a | 0.000 | 0.000 | 0.703 | 201.000 | 0.005 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f3700000000000001fe | 201.276 | 0.031 | n/a | 0.000 | 0.000 | 0.447 | 200.672 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f3700000000000001fb | 201.078 | 0.029 | n/a | 0.000 | 0.000 | 0.412 | 200.522 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.059 | 0.029 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000001ff | 143.118 | 0.044 | n/a | 0.000 | 0.000 | 0.705 | 142.246 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.065 | 0.044 | 0.000 | 0.065 | gw-r/thread-66/journal/page | none observed |

## P3 / idle-50 / read (26 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.309 | n/a | n/a | n/a | 0.046 | n/a | 0.000 | 0.000 | 0.517 | 50.811 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.063 | 0.046 | 0.001 | 0.063 |
| p99 | 203.785 | n/a | n/a | n/a | 0.071 | n/a | 0.000 | 0.000 | 3.867 | 201.703 | 2.539 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.127 | 0.071 | 0.001 | 0.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f251cccdf6e1f370000000000000295 | 203.785 | 0.035 | n/a | 0.000 | 0.000 | 2.987 | 200.625 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.085 | 0.035 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f370000000000000298 | 202.536 | 0.046 | n/a | 0.000 | 0.000 | 0.559 | 201.703 | 0.009 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.109 | 0.046 | 0.000 | 0.109 | gw-r/thread-52/journal/page | none observed |
| 4f251cccdf6e1f370000000000000297 | 201.752 | 0.056 | n/a | 0.000 | 0.000 | 0.689 | 200.811 | 0.005 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.127 | 0.056 | 0.000 | 0.127 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f370000000000000296 | 201.746 | 0.029 | n/a | 0.000 | 0.000 | 0.448 | 201.119 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.069 | 0.029 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f370000000000000299 | 159.934 | 0.052 | n/a | 0.000 | 0.000 | 0.898 | 158.861 | 0.003 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.076 | 0.052 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f37000000000000029a | 95.311 | 0.071 | n/a | 0.000 | 0.000 | 0.476 | 94.611 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.100 | 0.071 | 0.001 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f370000000000000266 | 55.949 | 0.039 | n/a | 0.000 | 0.000 | 0.471 | 54.626 | 0.729 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.053 | 0.039 | 0.001 | 0.053 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f370000000000000285 | 54.276 | 0.042 | n/a | 0.000 | 0.000 | 0.422 | 53.694 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.061 | 0.042 | 0.001 | 0.061 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f37000000000000021d | 53.766 | 0.035 | n/a | 0.000 | 0.000 | 1.257 | 52.359 | 0.029 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.046 | 0.035 | 0.001 | 0.046 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000215 | 52.947 | 0.065 | n/a | 0.000 | 0.000 | 0.434 | 52.336 | 0.005 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.088 | 0.065 | 0.001 | 0.088 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f37000000000000027a | 52.133 | 0.040 | n/a | 0.000 | 0.000 | 1.092 | 50.895 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.054 | 0.040 | 0.001 | 0.054 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f37000000000000027e | 51.826 | 0.049 | n/a | 0.000 | 0.000 | 0.417 | 51.277 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.061 | 0.049 | 0.001 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f370000000000000270 | 51.569 | 0.046 | n/a | 0.000 | 0.000 | 0.562 | 50.853 | 0.009 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.064 | 0.046 | 0.001 | 0.064 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f37000000000000028e | 51.309 | 0.040 | n/a | 0.000 | 0.000 | 0.372 | 50.811 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.052 | 0.040 | 0.001 | 0.052 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f370000000000000218 | 51.292 | 0.048 | n/a | 0.000 | 0.000 | 3.867 | 47.305 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.058 | 0.048 | 0.001 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f37000000000000024c | 51.213 | 0.043 | n/a | 0.000 | 0.000 | 3.503 | 47.562 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.075 | 0.043 | 0.001 | 0.075 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000237 | 50.884 | 0.058 | n/a | 0.000 | 0.000 | 0.544 | 50.159 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.081 | 0.058 | 0.001 | 0.081 | gw-r/thread-52/journal/page | none observed |
| 4f251cccdf6e1f37000000000000022b | 50.815 | 0.047 | n/a | 0.000 | 0.000 | 0.436 | 50.248 | 0.005 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.062 | 0.047 | 0.001 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f370000000000000243 | 50.805 | 0.059 | n/a | 0.000 | 0.000 | 0.478 | 50.166 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.088 | 0.059 | 0.001 | 0.088 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f370000000000000220 | 50.774 | 0.049 | n/a | 0.000 | 0.000 | 0.389 | 50.258 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.051 | 0.049 | 0.001 | 0.051 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-100 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.748 | n/a | n/a | n/a | 0.046 | n/a | 0.000 | 0.000 | 0.545 | 95.935 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.063 | 0.046 | 0.000 | 0.063 |
| p99 | 201.917 | n/a | n/a | n/a | 0.116 | n/a | 0.000 | 0.000 | 4.156 | 200.933 | 1.167 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.173 | 0.116 | 0.001 | 0.173 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f251cccdf6e1f370000000000000332 | 206.443 | 0.032 | n/a | 0.000 | 0.000 | 0.979 | 205.257 | 0.006 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f370000000000000331 | 201.917 | 0.045 | n/a | 0.000 | 0.000 | 0.777 | 200.933 | 0.005 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.086 | 0.045 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 4f251cccdf6e1f370000000000000333 | 201.727 | 0.033 | n/a | 0.000 | 0.000 | 0.728 | 200.835 | 0.004 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f37000000000000032f | 201.482 | 0.033 | n/a | 0.000 | 0.000 | 0.482 | 200.837 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.065 | 0.033 | 0.000 | 0.065 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f370000000000000330 | 201.354 | 0.031 | n/a | 0.000 | 0.000 | 0.463 | 200.716 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002c6 | 115.129 | 0.049 | n/a | 0.000 | 0.000 | 1.249 | 113.744 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.070 | 0.049 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f370000000000000323 | 107.158 | 0.052 | n/a | 0.000 | 0.000 | 0.532 | 106.460 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.068 | 0.052 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002d9 | 106.197 | 0.042 | n/a | 0.000 | 0.000 | 0.435 | 105.635 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.058 | 0.042 | 0.000 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002ae | 104.468 | 0.055 | n/a | 0.000 | 0.000 | 0.603 | 103.685 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.088 | 0.055 | 0.001 | 0.088 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002f9 | 104.147 | 0.045 | n/a | 0.000 | 0.000 | 1.394 | 102.598 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.059 | 0.045 | 0.000 | 0.059 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002ce | 103.457 | 0.052 | n/a | 0.000 | 0.000 | 0.446 | 102.884 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.064 | 0.052 | 0.000 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002bd | 102.394 | 0.051 | n/a | 0.000 | 0.000 | 0.640 | 101.591 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.064 | 0.051 | 0.001 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002c9 | 101.916 | 0.042 | n/a | 0.000 | 0.000 | 0.306 | 101.489 | 0.004 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.055 | 0.042 | 0.000 | 0.055 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002e4 | 101.568 | 0.041 | n/a | 0.000 | 0.000 | 0.346 | 101.110 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.054 | 0.041 | 0.000 | 0.054 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002d0 | 101.208 | 0.047 | n/a | 0.000 | 0.000 | 0.416 | 100.666 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.067 | 0.047 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002bf | 101.191 | 0.060 | n/a | 0.000 | 0.000 | 0.823 | 100.189 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.096 | 0.060 | 0.001 | 0.096 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000309 | 100.944 | 0.038 | n/a | 0.000 | 0.000 | 0.326 | 100.486 | 0.016 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.049 | 0.038 | 0.000 | 0.049 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002e7 | 100.928 | 0.042 | n/a | 0.000 | 0.000 | 0.518 | 100.293 | 0.002 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.055 | 0.042 | 0.000 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002ff | 100.385 | 0.038 | n/a | 0.000 | 0.000 | 0.341 | 99.888 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.047 | 0.038 | 0.000 | 0.047 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f3700000000000002b7 | 100.139 | 0.042 | n/a | 0.000 | 0.000 | 0.479 | 99.505 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.054 | 0.042 | 0.000 | 0.054 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-250 / read (156 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.562 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.523 | 200.744 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.071 | 0.037 | 0.000 | 0.071 |
| p99 | 205.463 | n/a | n/a | n/a | 0.081 | n/a | 0.000 | 0.000 | 4.045 | 204.004 | 0.034 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.159 | 0.081 | 0.000 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f251cccdf6e1f370000000000000395 | 205.563 | 0.057 | n/a | 0.000 | 0.000 | 4.045 | 201.233 | 0.010 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.127 | 0.057 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f3700000000000003c1 | 205.463 | 0.030 | n/a | 0.000 | 0.000 | 0.438 | 204.801 | 0.009 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.059 | 0.030 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f370000000000000337 | 205.243 | 0.051 | n/a | 0.000 | 0.000 | 4.376 | 200.673 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.081 | 0.051 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000397 | 204.900 | 0.045 | n/a | 0.000 | 0.000 | 3.961 | 200.737 | 0.005 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.085 | 0.045 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f3700000000000003e5 | 204.743 | 0.044 | n/a | 0.000 | 0.000 | 0.534 | 204.004 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.111 | 0.044 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f370000000000000441 | 204.711 | 0.043 | n/a | 0.000 | 0.000 | 3.309 | 201.182 | 0.026 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.077 | 0.043 | 0.000 | 0.077 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f3700000000000003d1 | 204.233 | 0.031 | n/a | 0.000 | 0.000 | 2.791 | 201.175 | 0.034 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000003bd | 203.816 | 0.035 | n/a | 0.000 | 0.000 | 2.915 | 200.752 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.065 | 0.035 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000003d7 | 203.590 | 0.033 | n/a | 0.000 | 0.000 | 0.610 | 202.814 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000462 | 203.246 | 0.068 | n/a | 0.000 | 0.000 | 1.008 | 201.866 | 0.013 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.151 | 0.068 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f370000000000000361 | 203.120 | 0.059 | n/a | 0.000 | 0.000 | 0.931 | 201.873 | 0.020 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.132 | 0.059 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f37000000000000034b | 203.060 | 0.053 | n/a | 0.000 | 0.000 | 2.120 | 200.679 | 0.005 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.132 | 0.053 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f3700000000000003f7 | 202.950 | 0.035 | n/a | 0.000 | 0.000 | 2.028 | 200.771 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.065 | 0.035 | 0.000 | 0.065 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000409 | 202.862 | 0.031 | n/a | 0.000 | 0.000 | 0.676 | 202.013 | 0.014 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f3700000000000003b5 | 202.802 | 0.044 | n/a | 0.000 | 0.000 | 0.495 | 201.696 | 0.008 | 0.000 | 0.477 | 0.000 | n/a | n/a | 0.083 | 0.044 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000003a7 | 202.456 | 0.033 | n/a | 0.000 | 0.000 | 1.253 | 200.979 | 0.013 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000437 | 202.434 | 0.051 | n/a | 0.000 | 0.000 | 1.508 | 200.688 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.133 | 0.051 | 0.000 | 0.133 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f3700000000000003ef | 202.430 | 0.035 | n/a | 0.000 | 0.000 | 1.091 | 201.133 | 0.009 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.066 | 0.035 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f370000000000000365 | 202.358 | 0.054 | n/a | 0.000 | 0.000 | 0.897 | 201.204 | 0.011 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.128 | 0.054 | 0.000 | 0.128 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f37000000000000035f | 202.288 | 0.036 | n/a | 0.000 | 0.000 | 1.410 | 200.691 | 0.010 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.071 | 0.036 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-500 / read (414 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.529 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.628 | 200.727 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.073 | 0.042 | 0.000 | 0.073 |
| p99 | 204.626 | n/a | n/a | n/a | 0.098 | n/a | 0.000 | 0.000 | 2.707 | 201.678 | 0.025 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.179 | 0.098 | 0.001 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f251cccdf6e1f3700000000000004a8 | 206.311 | 0.055 | n/a | 0.000 | 0.000 | 0.864 | 205.127 | 0.006 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.118 | 0.055 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f3700000000000005b9 | 205.729 | 0.033 | n/a | 0.000 | 0.000 | 4.638 | 200.935 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.059 | 0.033 | 0.000 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f37000000000000051c | 205.478 | 0.031 | n/a | 0.000 | 0.000 | 4.385 | 200.933 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f37000000000000051f | 204.972 | 0.028 | n/a | 0.000 | 0.000 | 0.405 | 204.420 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.060 | 0.028 | 0.000 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f3700000000000005e2 | 204.626 | 0.054 | n/a | 0.000 | 0.000 | 0.489 | 203.979 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.062 | 0.054 | 0.000 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f370000000000000555 | 204.323 | 0.064 | n/a | 0.000 | 0.000 | 3.137 | 200.924 | 0.006 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.130 | 0.064 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000513 | 204.229 | 0.041 | n/a | 0.000 | 0.000 | 2.898 | 201.122 | 0.005 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.104 | 0.041 | 0.000 | 0.104 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f3700000000000004c3 | 203.677 | 0.057 | n/a | 0.000 | 0.000 | 2.707 | 200.732 | 0.012 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.113 | 0.057 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f370000000000000612 | 203.545 | 0.051 | n/a | 0.000 | 0.000 | 2.264 | 201.023 | 0.011 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.109 | 0.051 | 0.000 | 0.109 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000495 | 203.082 | 0.033 | n/a | 0.000 | 0.000 | 2.331 | 200.604 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.062 | 0.033 | 0.000 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000005d0 | 202.834 | 0.046 | n/a | 0.000 | 0.000 | 1.185 | 201.430 | 0.009 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.091 | 0.046 | 0.000 | 0.091 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f370000000000000552 | 202.824 | 0.039 | n/a | 0.000 | 0.000 | 0.593 | 202.041 | 0.007 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.079 | 0.039 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f3700000000000004f6 | 202.821 | 0.067 | n/a | 0.000 | 0.000 | 0.796 | 201.668 | 0.031 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.101 | 0.067 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f370000000000000550 | 202.813 | 0.051 | n/a | 0.000 | 0.000 | 0.896 | 201.658 | 0.015 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.081 | 0.051 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f3700000000000005d9 | 202.796 | 0.031 | n/a | 0.000 | 0.000 | 1.231 | 201.378 | 0.009 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.057 | 0.031 | 0.000 | 0.057 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f3700000000000005ef | 202.794 | 0.032 | n/a | 0.000 | 0.000 | 1.624 | 200.978 | 0.009 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.062 | 0.032 | 0.000 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f3700000000000005ad | 202.748 | 0.059 | n/a | 0.000 | 0.000 | 1.043 | 201.443 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.116 | 0.059 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f3700000000000004fc | 202.614 | 0.098 | n/a | 0.000 | 0.000 | 0.655 | 201.589 | 0.014 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.145 | 0.098 | 0.000 | 0.145 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000531 | 202.605 | 0.051 | n/a | 0.000 | 0.000 | 1.467 | 200.897 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.127 | 0.051 | 0.000 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f3700000000000004d1 | 202.599 | 0.051 | n/a | 0.000 | 0.000 | 1.741 | 200.649 | 0.011 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.110 | 0.051 | 0.000 | 0.110 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-1000 / read (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.595 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.645 | 200.778 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.085 | 0.041 | 0.000 | 0.085 |
| p99 | 204.596 | n/a | n/a | n/a | 0.094 | n/a | 0.000 | 0.000 | 3.359 | 202.200 | 0.032 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.191 | 0.094 | 0.001 | 0.191 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f251cccdf6e1f370000000000000830 | 205.583 | 0.083 | n/a | 0.000 | 0.000 | 3.522 | 201.764 | 0.012 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.100 | 0.083 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f3700000000000007f8 | 205.470 | 0.039 | n/a | 0.000 | 0.000 | 0.590 | 204.707 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f370000000000000677 | 205.313 | 0.087 | n/a | 0.000 | 0.000 | 0.957 | 201.073 | 0.008 | 0.000 | 3.020 | 0.000 | n/a | n/a | 0.169 | 0.087 | 0.000 | 0.169 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f37000000000000074b | 205.252 | 0.030 | n/a | 0.000 | 0.000 | 0.704 | 204.376 | 0.010 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.075 | 0.030 | 0.000 | 0.075 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f3700000000000006b2 | 204.962 | 0.036 | n/a | 0.000 | 0.000 | 3.359 | 201.420 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.083 | 0.036 | 0.000 | 0.083 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f3700000000000008b5 | 204.852 | 0.022 | n/a | 0.000 | 0.000 | 3.919 | 200.722 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.148 | 0.022 | 0.000 | 0.148 | gw-r/thread-50/journal/page | none observed |
| 4f251cccdf6e1f37000000000000075c | 204.662 | 0.075 | n/a | 0.000 | 0.000 | 3.772 | 200.700 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.071 | 0.075 | 0.000 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 4f251cccdf6e1f370000000000000821 | 204.596 | 0.044 | n/a | 0.000 | 0.000 | 0.605 | 203.793 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.109 | 0.044 | 0.000 | 0.109 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f370000000000000745 | 204.413 | 0.072 | n/a | 0.000 | 0.000 | 3.196 | 200.957 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.126 | 0.072 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000007e4 | 204.386 | 0.053 | n/a | 0.000 | 0.000 | 0.606 | 203.558 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.118 | 0.053 | 0.000 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000679 | 204.383 | 0.055 | n/a | 0.000 | 0.000 | 3.400 | 200.744 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.124 | 0.055 | 0.000 | 0.124 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f370000000000000632 | 204.371 | 0.033 | n/a | 0.000 | 0.000 | 0.451 | 203.722 | 0.008 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000006a3 | 204.234 | 0.049 | n/a | 0.000 | 0.000 | 3.322 | 200.702 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.109 | 0.049 | 0.000 | 0.109 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f370000000000000903 | 203.869 | 0.129 | n/a | 0.000 | 0.000 | 1.401 | 201.929 | 0.023 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.291 | 0.129 | 0.001 | 0.291 | gw-r/thread-51/journal/page | none observed |
| 4f251cccdf6e1f37000000000000066a | 203.835 | 0.031 | n/a | 0.000 | 0.000 | 3.031 | 200.667 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-66/journal/page | none observed |
| 4f251cccdf6e1f3700000000000006d6 | 203.796 | 0.036 | n/a | 0.000 | 0.000 | 0.623 | 202.987 | 0.008 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.071 | 0.036 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 4f251cccdf6e1f370000000000000786 | 203.658 | 0.065 | n/a | 0.000 | 0.000 | 1.226 | 202.067 | 0.012 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.170 | 0.065 | 0.000 | 0.170 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f3700000000000007b8 | 203.541 | 0.059 | n/a | 0.000 | 0.000 | 2.010 | 201.281 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.115 | 0.059 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 4f251cccdf6e1f370000000000000735 | 203.468 | 0.097 | n/a | 0.000 | 0.000 | 2.211 | 200.979 | 0.007 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.107 | 0.097 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 4f251cccdf6e1f3700000000000008e2 | 203.385 | 0.032 | n/a | 0.000 | 0.000 | 1.849 | 201.342 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.092 | 0.032 | 0.000 | 0.092 | gw-r/thread-47/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 1250 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/2.214 ms; post-ACK p50/p99: 0.338/0.806 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.823 | 10.460 | 10.348 | reported |
| All-primary p99 ms | 27.085 | 26.747 | 26.742 | <=50 |
| L256 5-10 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 5-10 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 11-25 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 11-25 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 26-50 p50Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| L256 26-50 p99Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| Burst 5-10 p50 ms | unavailable | unavailable | unavailable | <=10 |
| Burst 11-25 p50 ms | unavailable | unavailable | unavailable | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | unavailable | unavailable | unavailable | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | unavailable | unavailable | unavailable | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5-10 | >=1000 | 7 | 14.705/61.121 | 14.360 | 8.560 | 19.732 | 0.070/0.017 |
| 5-10 | overlap | 109 | 14.549/39.221 | 14.191 | 8.906 | 22.698 | 0.061/0.015 |
| 5-10 | 0-50 | 537 | 10.500/24.940 | 10.080 | 5.871 | 15.168 | 0.055/0.016 |
| 5-10 | 250-1000 | 299 | 11.104/20.363 | 10.639 | 6.274 | 15.250 | 0.092/0.019 |
| 5-10 | 50-100 | 149 | 9.912/19.132 | 9.535 | 5.464 | 13.996 | 0.061/0.017 |
| 5-10 | 100-250 | 149 | 10.390/20.404 | 9.961 | 5.504 | 14.063 | 0.072/0.017 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1250 | 1 | 61.310 |

## Writer heap, GC and scheduler stalls

Source a0785bcf96f7afea3965b3028db2e27f4fbef6a9; 1250 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 370.477 / 400.408 |
| GC events / total duration / maximum ms | 246 / 544.038 / 23.066 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":242,"4":2,"8":2} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 27.085 / 1 / 61.310 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

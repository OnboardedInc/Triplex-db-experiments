# Trace report

No commit traces were observed; the cause of slow commits is not established.

Run `tx2-dxt1-p9-smoke-a`; source `e0ccfa297e43cc0c1ad3df1702b7d95b7a0513e8`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 0/0 (n/a%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 1186626.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: legacy wall anchors; cross-process timing may be skewed.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-14-1.jsonl.gz: unexpected end of file; node-14-2.jsonl.gz: unexpected end of file; node-14-3.jsonl.gz: unexpected end of file; node-14-4.jsonl.gz: unexpected end of file; node-14-5.jsonl.gz: unexpected end of file; node-14-6.jsonl.gz: unexpected end of file; Writer Linux boot-clock binding missing; Writer file absent: cannot establish complete commit denominator; No commit traces. Oracle: see ns-report.json; not certified by tracing.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
## P1 / outside-phases / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.954 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 1.842 | 1.651 | 0.000 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.114 | 0.039 | 0.001 | 0.114 |
| p99 | 481.622 | n/a | n/a | n/a | 0.232 | n/a | 0.000 | 0.000 | 85.050 | 272.609 | 0.000 | 0.000 | 0.416 | 181.973 | n/a | n/a | 1.667 | 0.232 | 0.019 | 1.667 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3196005883dac40d0000000000000001 | 481.622 | 0.232 | n/a | 0.000 | 0.000 | 24.835 | 272.609 | 0.000 | 0.000 | 0.307 | 181.973 | n/a | n/a | 1.667 | 0.232 | 0.000 | 1.667 | gw-w/thread-46/gateway.route | none observed |
| 3196005883dac40d000000000000002f | 86.910 | 0.022 | n/a | 0.000 | 0.000 | 85.050 | 1.344 | 0.000 | 0.000 | 0.416 | 0.000 | n/a | n/a | 0.079 | 0.022 | 0.000 | 0.079 | node-14/thread-0/socket.queue-and-write | none observed |
| 3196005883dac40d0000000000000006 | 63.425 | 0.066 | n/a | 0.000 | 0.000 | 2.580 | 49.251 | 0.000 | 0.000 | 0.047 | 11.145 | n/a | n/a | 0.335 | 0.066 | 0.001 | 0.335 | gw-w/thread-48/gateway.route | none observed |
| 3196005883dac40d0000000000000004 | 52.187 | 0.046 | n/a | 0.000 | 0.000 | 1.925 | 36.888 | 0.000 | 0.000 | 0.035 | 13.194 | n/a | n/a | 0.098 | 0.046 | 0.001 | 0.098 | gw-w/thread-49/gateway.route | none observed |
| 3196005883dac40d0000000000000003 | 45.086 | 0.135 | n/a | 0.000 | 0.000 | 1.842 | 25.687 | 0.000 | 0.000 | 0.047 | 17.086 | n/a | n/a | 0.290 | 0.135 | 0.003 | 0.290 | gw-w/thread-51/gateway.route | none observed |
| 3196005883dac40d0000000000000002 | 44.783 | 0.039 | n/a | 0.000 | 0.000 | 2.054 | 27.216 | 0.000 | 0.000 | 0.041 | 15.300 | n/a | n/a | 0.134 | 0.039 | 0.001 | 0.134 | gw-w/thread-50/gateway.route | none observed |
| 3196005883dac40d0000000000000005 | 42.954 | 0.060 | n/a | 0.000 | 0.000 | 2.946 | 26.007 | 0.000 | 0.000 | 0.038 | 13.570 | n/a | n/a | 0.334 | 0.060 | 0.001 | 0.334 | gw-w/thread-52/gateway.route | none observed |
| 3196005883dac40d0000000000000031 | 3.079 | 0.059 | n/a | 0.000 | 0.000 | 1.215 | 1.651 | 0.000 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.119 | 0.059 | 0.019 | 0.119 | gw-w/thread-51/gateway.route | none observed |
| 3196005883dac40d0000000000000034 | 2.008 | 0.034 | n/a | 0.000 | 0.000 | 1.185 | 0.633 | 0.000 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.114 | 0.034 | 0.017 | 0.114 | node-14/thread-0/socket.wait-first-byte | none observed |
| 3196005883dac40d0000000000000032 | 1.840 | 0.018 | n/a | 0.000 | 0.000 | 0.843 | 0.885 | 0.000 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.058 | 0.018 | 0.010 | 0.058 | node-14/thread-0/socket.wait-first-byte | none observed |
| 3196005883dac40d0000000000000033 | 1.704 | 0.017 | n/a | 0.000 | 0.000 | 0.995 | 0.589 | 0.000 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.062 | 0.017 | 0.010 | 0.062 | node-14/thread-0/socket.wait-first-byte | none observed |
| 3196005883dac40d0000000000000030 | 1.390 | 0.020 | n/a | 0.000 | 0.000 | 0.734 | 0.537 | 0.000 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.064 | 0.020 | 0.014 | 0.064 | node-14/thread-0/socket.wait-first-byte | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

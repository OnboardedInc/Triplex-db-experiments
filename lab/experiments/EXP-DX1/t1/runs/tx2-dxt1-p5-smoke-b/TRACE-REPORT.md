# Trace report

No commit traces were observed; the cause of slow commits is not established.

Run `tx2-dxt1-p5-smoke-b`; source `030bee4497a1c57598ddd690f155a36710e5a4b6`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 0/0 (n/a%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 68797.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: legacy wall anchors; cross-process timing may be skewed.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-14-1.jsonl.gz: unexpected end of file; node-14-2.jsonl.gz: unexpected end of file; Writer Linux boot-clock binding missing; Writer file absent: cannot establish complete commit denominator; No commit traces. Oracle: see ns-report.json; not certified by tracing.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
## P1 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.798 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.419 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.054 | 0.000 | 0.000 | 2.054 |
| p99 | 1448.538 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 85.502 | 1399.420 | 0.000 | n/a | 0.400 | 236.991 | n/a | n/a | 52.061 | 0.000 | 0.000 | 52.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3051e065133ab94f0000000000000001 | 1448.538 | 0.000 | n/a | 0.000 | 0.000 | 12.157 | 1399.420 | 0.000 | n/a | 0.039 | 35.109 | n/a | n/a | 1.814 | 0.000 | 0.000 | 1.814 | gw-r/thread-48/gateway.route | none observed |
| 159d3e61635be5f00000000000000001 | 594.137 | 0.000 | n/a | 0.000 | 0.000 | 20.864 | 333.828 | 0.000 | n/a | 0.400 | 236.991 | n/a | n/a | 2.054 | 0.000 | 0.000 | 2.054 | gw-w/thread-44/gateway.route | none observed |
| 159d3e61635be5f0000000000000002f | 88.952 | 0.000 | n/a | 0.000 | 0.000 | 85.502 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.449 | 0.000 | 0.000 | 3.449 | node-14/thread-0/socket.queue-and-write | none observed |
| 159d3e61635be5f00000000000000003 | 79.162 | 0.000 | n/a | 0.000 | 0.000 | 2.419 | 48.664 | 0.000 | n/a | 0.095 | 27.511 | n/a | n/a | 0.472 | 0.000 | 0.000 | 0.472 | gw-w/thread-46/gateway.route | none observed |
| 159d3e61635be5f00000000000000002 | 61.534 | 0.000 | n/a | 0.000 | 0.000 | 4.329 | 45.001 | 0.000 | n/a | 0.096 | 11.703 | n/a | n/a | 0.405 | 0.000 | 0.000 | 0.405 | gw-w/thread-43/gateway.route | none observed |
| 159d3e61635be5f00000000000000004 | 54.798 | 0.000 | n/a | 0.000 | 0.000 | 2.613 | 40.493 | 0.000 | n/a | 0.034 | 11.494 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-w/thread-44/gateway.route | none observed |
| 159d3e61635be5f00000000000000006 | 52.976 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.061 | 0.000 | 0.000 | 52.061 | node-14/thread-0/socket.wait-first-byte | none observed |
| 159d3e61635be5f00000000000000005 | 51.241 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.436 | 0.000 | 0.000 | 50.436 | node-14/thread-0/socket.wait-first-byte | none observed |
| 159d3e61635be5f00000000000000030 | 10.112 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.560 | 0.000 | 0.000 | 9.560 | node-14/thread-0/socket.wait-first-byte | none observed |
| 159d3e61635be5f00000000000000031 | 5.583 | 0.000 | n/a | 0.000 | 0.000 | 0.533 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.051 | 0.000 | 0.000 | 5.051 | node-14/thread-0/socket.wait-first-byte | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

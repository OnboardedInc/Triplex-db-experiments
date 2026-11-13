# Trace report

No commit traces were observed; the cause of slow commits is not established.

Run `tx2-dxt1-p4-history-a-3-history-192`; source `a057992d28395c9431fc578a145f4678ae26ea21`; subjects unknown; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 0/0 (n/a%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 583740.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: legacy wall anchors; cross-process timing may be skewed.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-14-0.jsonl.gz: unexpected end of file; node-14-1.jsonl.gz: unexpected end of file; system-linux.jsonl.gz: unexpected end of file; Writer Linux boot-clock binding missing; Writer file absent: cannot establish complete commit denominator; No final Node histograms: recorder drain not proven; No commit traces. Oracle: see ns-report.json; not certified by tracing.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
## P1 / outside-phases / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 65.730 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.002 | 38.409 | 0.000 | n/a | 0.140 | 18.017 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 |
| p99 | 524.828 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.237 | 351.758 | 0.000 | n/a | 0.340 | 162.400 | n/a | n/a | 1.221 | 0.000 | 0.000 | 1.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 81bec637af24e7150000000000000001 | 524.828 | 0.000 | n/a | 0.000 | 0.000 | 9.237 | 351.758 | 0.000 | n/a | 0.212 | 162.400 | n/a | n/a | 1.221 | 0.000 | 0.000 | 1.221 | gw-w/thread-45/gateway.route | none observed |
| 81bec637af24e7150000000000000002 | 67.731 | 0.000 | n/a | 0.000 | 0.000 | 9.030 | 40.197 | 0.000 | n/a | 0.140 | 18.017 | n/a | n/a | 0.349 | 0.000 | 0.000 | 0.349 | gw-w/thread-44/gateway.route | none observed |
| 81bec637af24e7150000000000000003 | 65.730 | 0.000 | n/a | 0.000 | 0.000 | 2.337 | 36.479 | 0.000 | n/a | 0.340 | 26.308 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 | gw-w/thread-47/gateway.route | none observed |
| 81bec637af24e7150000000000000004 | 59.298 | 0.000 | n/a | 0.000 | 0.000 | 3.002 | 38.409 | 0.000 | n/a | 0.073 | 17.623 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-w/thread-49/gateway.route | none observed |
| 81bec637af24e7150000000000000005 | 52.821 | 0.000 | n/a | 0.000 | 0.000 | 1.706 | 34.093 | 0.000 | n/a | 0.040 | 16.736 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-w/thread-48/gateway.route | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

# Trace report

No commit traces were observed; the cause of slow commits is not established.

Run `tx2-dxt1-p5-smoke-e`; source `04ff7a7246f41f9542652d1a77d150ae9b0e7aae`; subjects unknown; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 0/0 (n/a%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 1234739.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: legacy wall anchors; cross-process timing may be skewed.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-139-0.jsonl.gz: unexpected end of file; node-44-0.jsonl.gz: unexpected end of file; Writer Linux boot-clock binding missing; Writer file absent: cannot establish complete commit denominator; No commit traces; VM/cgroup collector missing. Oracle: see ns-report.json; not certified by tracing.

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
| p50 | 166.556 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 33.294 | 87.907 | 0.000 | n/a | 0.071 | 42.450 | n/a | n/a | 1.466 | 0.000 | 0.000 | 1.466 |
| p99 | 474.403 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 43.193 | 293.414 | 0.000 | n/a | 0.198 | 164.787 | n/a | n/a | 8.619 | 0.000 | 0.000 | 8.619 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72a621cf66a89e140000000000000001 | 474.403 | 0.000 | n/a | 0.000 | 0.000 | 14.232 | 293.414 | 0.000 | n/a | 0.198 | 164.787 | n/a | n/a | 1.772 | 0.000 | 0.000 | 1.772 | gw-w/thread-41/gateway.route | none observed |
| bf2504432da934ed0000000000000001 | 183.542 | 0.000 | n/a | 0.000 | 0.000 | 43.193 | 96.742 | 0.000 | n/a | 0.078 | 42.450 | n/a | n/a | 1.079 | 0.000 | 0.000 | 1.079 | gw-w/thread-45/gateway.route | none observed |
| 4a7d095ad95fee1f0000000000000001 | 166.556 | 0.000 | n/a | 0.000 | 0.000 | 19.924 | 87.907 | 0.000 | n/a | 0.030 | 50.075 | n/a | n/a | 8.619 | 0.000 | 0.000 | 8.619 | gw-w/thread-47/gateway.route | none observed |
| fcf606966ec738760000000000000001 | 143.775 | 0.000 | n/a | 0.000 | 0.000 | 40.266 | 63.829 | 0.000 | n/a | 0.071 | 38.674 | n/a | n/a | 0.935 | 0.000 | 0.000 | 0.935 | gw-w/thread-44/gateway.route | none observed |
| 2e5e677991a9cf150000000000000001 | 140.383 | 0.000 | n/a | 0.000 | 0.000 | 33.294 | 73.092 | 0.000 | n/a | 0.026 | 32.505 | n/a | n/a | 1.466 | 0.000 | 0.000 | 1.466 | gw-w/thread-48/gateway.route | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

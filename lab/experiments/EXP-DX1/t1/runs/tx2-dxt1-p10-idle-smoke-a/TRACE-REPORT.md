# Trace report

No commit traces were observed; the cause of slow commits is not established.

Run `tx2-dxt1-p10-idle-smoke-a`; source `69e04935d646471f9a151a239d2733928ca8f1ca`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 0/0 (n/a%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 1297061.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: legacy wall anchors; cross-process timing may be skewed.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-14-1.jsonl.gz: unexpected end of file; Writer Linux boot-clock binding missing; Writer file absent: cannot establish complete commit denominator; No commit traces. Oracle: see ns-report.json; not certified by tracing.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
## P1 / outside-phases / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.668 | n/a | n/a | n/a | 0.055 | n/a | 0.000 | 0.000 | 2.242 | 24.479 | 0.000 | 0.000 | 0.028 | 13.548 | n/a | n/a | 0.245 | 0.055 | 0.001 | 0.245 |
| p99 | 389.317 | n/a | n/a | n/a | 0.116 | n/a | 0.000 | 0.000 | 26.379 | 241.349 | 0.000 | 0.000 | 0.227 | 120.280 | n/a | n/a | 0.966 | 0.116 | 0.003 | 0.966 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95e27270f6ae1ac40000000000000001 | 389.317 | 0.116 | n/a | 0.000 | 0.000 | 26.379 | 241.349 | 0.000 | 0.000 | 0.227 | 120.280 | n/a | n/a | 0.966 | 0.116 | 0.000 | 0.966 | gw-w/thread-48/gateway.route | none observed |
| 95e27270f6ae1ac40000000000000002 | 68.353 | 0.060 | n/a | 0.000 | 0.000 | 3.829 | 47.950 | 0.000 | 0.000 | 0.058 | 16.212 | n/a | n/a | 0.245 | 0.060 | 0.001 | 0.245 | gw-w/thread-53/gateway.route | none observed |
| 95e27270f6ae1ac40000000000000003 | 43.103 | 0.114 | n/a | 0.000 | 0.000 | 2.242 | 23.596 | 0.000 | 0.000 | 0.028 | 16.894 | n/a | n/a | 0.228 | 0.114 | 0.003 | 0.228 | gw-w/thread-50/gateway.route | none observed |
| 95e27270f6ae1ac40000000000000006 | 41.668 | 0.055 | n/a | 0.000 | 0.000 | 2.268 | 30.536 | 0.000 | 0.000 | 0.053 | 8.487 | n/a | n/a | 0.269 | 0.055 | 0.001 | 0.269 | gw-w/thread-49/gateway.route | none observed |
| 95e27270f6ae1ac40000000000000005 | 39.111 | 0.047 | n/a | 0.000 | 0.000 | 1.181 | 24.040 | 0.000 | 0.000 | 0.025 | 13.548 | n/a | n/a | 0.270 | 0.047 | 0.001 | 0.270 | gw-w/thread-51/gateway.route | none observed |
| 95e27270f6ae1ac40000000000000004 | 36.801 | 0.038 | n/a | 0.000 | 0.000 | 1.332 | 24.479 | 0.000 | 0.000 | 0.027 | 10.839 | n/a | n/a | 0.086 | 0.038 | 0.001 | 0.086 | gw-w/thread-52/gateway.route | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.



## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |


| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |


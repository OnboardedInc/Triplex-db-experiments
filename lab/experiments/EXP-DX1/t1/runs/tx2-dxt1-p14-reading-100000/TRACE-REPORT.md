# Trace report

No commit traces were observed; the cause of slow commits is not established.

Run `tx2-dxt1-p14-reading-100000`; source `f87308a3dc2f000da95dd1ac7d06f9ad8910b487`; subjects unknown; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 0/0 (n/a%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 14274806.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: legacy wall anchors; cross-process timing may be skewed. 0 JFR events without continuous-anchor proof are retained raw but not overlaid; Mac wall samples are whole-run context, not per-commit overlap evidence.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-14-0.jsonl.gz: unexpected end of file; node-14-1.jsonl.gz: unexpected end of file; system-linux.jsonl.gz: unexpected end of file; Writer Linux boot-clock binding missing; Writer file absent: cannot establish complete commit denominator; No final Node histograms: recorder drain not proven; No commit traces. Oracle: see ns-report.json; not certified by tracing.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
## P1 / outside-phases / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 505.943 | n/a | n/a | n/a | 0.135 | n/a | 0.000 | 0.000 | 8.224 | 327.902 | 0.000 | 0.000 | 0.207 | 101.568 | n/a | n/a | 0.772 | 0.135 | 0.000 | 0.772 |
| p99 | 1799.833 | n/a | n/a | n/a | 1.066 | n/a | 0.000 | 0.000 | 136.742 | 1021.223 | 0.000 | 0.000 | 0.867 | 740.130 | n/a | n/a | 3.163 | 1.066 | 0.001 | 3.163 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6727f8522a08f060000000000000001 | 1799.833 | 0.176 | n/a | 0.000 | 0.000 | 35.585 | 1021.223 | 0.000 | 0.000 | 0.867 | 740.130 | n/a | n/a | 1.852 | 0.176 | 0.000 | 1.852 | gw-w/thread-48/gateway.route | none observed |
| e6727f8522a08f060000000000000006 | 827.109 | 1.066 | n/a | 0.000 | 0.000 | 9.154 | 327.902 | 0.000 | 0.000 | 0.251 | 487.114 | n/a | n/a | 1.623 | 1.066 | 0.001 | 1.623 | gw-w/thread-48/d/sync | none observed |
| e6727f8522a08f060000000000000003 | 535.117 | 0.135 | n/a | 0.000 | 0.000 | 4.530 | 431.803 | 0.000 | 0.000 | 0.153 | 97.724 | n/a | n/a | 0.772 | 0.135 | 0.000 | 0.772 | gw-w/thread-46/gateway.route | none observed |
| e6727f8522a08f060000000000000002 | 505.943 | 0.104 | n/a | 0.000 | 0.000 | 8.224 | 392.762 | 0.000 | 0.000 | 0.123 | 101.568 | n/a | n/a | 3.163 | 0.104 | 0.000 | 3.163 | gw-w/thread-50/gateway.route | none observed |
| e6727f8522a08f0600000000000000f2 | 437.727 | 0.172 | n/a | 0.000 | 0.000 | 136.742 | 299.875 | 0.000 | 0.000 | 0.393 | 0.000 | n/a | n/a | 0.545 | 0.172 | 0.000 | 0.545 | gw-w/thread-51/gateway.route | none observed |
| e6727f8522a08f060000000000000004 | 337.495 | 0.132 | n/a | 0.000 | 0.000 | 8.023 | 166.449 | 0.000 | 0.000 | 0.207 | 162.136 | n/a | n/a | 0.546 | 0.132 | 0.000 | 0.546 | gw-w/thread-52/gateway.route | none observed |
| e6727f8522a08f060000000000000005 | 137.390 | 0.129 | n/a | 0.000 | 0.000 | 6.925 | 95.217 | 0.000 | 0.000 | 0.141 | 34.397 | n/a | n/a | 0.582 | 0.129 | 0.001 | 0.582 | gw-w/thread-49/gateway.route | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.



## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |


| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |


## Quiet transactor counters

Object-cache hit rate: 99.945%; 1831807/1832807 hits/requests over 10 callback intervals (1 empty/unsupported). callback intervals, process-wide including setup; no per-request attribution.

Index observer: installed; dropped events 0; 4 observed processor adoption calls (including setup). Exact timestamps, basis changes and durations: NATIVE-COUNTERS.json. No vendor INFO logging enabled.

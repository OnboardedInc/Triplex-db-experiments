# Trace report

No commit traces were observed; the cause of slow commits is not established.

Run `tx2-dxt1-smoke-b`; source `1e68eac327f5e7be2bdfee50487d675d1b483c88`; subjects unknown; tracing full.

Commit coverage: 0/0 (n/a%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 346.

Units: ms; TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node wall time excluding observed waits/GC, not on-CPU time. Driver queue is separate; timer drift is a bounded estimate shown only as an overlay. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: Writer file absent: cannot establish complete commit denominator; No final Node histograms: recorder drain not proven; No commit traces. Oracle: see ns-report.json; not certified by tracing.

## Visibility limits

Logical read histograms include every finished read; retained fast reads are a fixed 1/1024 FNV sample, and reads at least 50 ms are retained. Slowest read selection is among the retained sample plus every observed slow read. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

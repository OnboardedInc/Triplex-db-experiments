# Permanent tracing (DX-T1)

North star: P2 first (small commits under 256 readers), then P1/P3/P4/P5; the scope and bars are in
[scope](../../../SCOPE.md), [north star](../../../NORTH-STAR.md) and [targets](../../../TARGETS.md).

`bash lab/experiments/EXP-DX1/t1/run.sh real tx2-dxt1-smoke --subjects 1000 --level-s 2 --max-readers 16`
smokes the complete path before any 10,000-subject measurement.
`bash lab/experiments/EXP-DX1/t1/run.sh pair tx2-dxt1-pair --rung 10k` runs the exact-local-read pair.
The run's cleanup calls `node lab/trace/finalize.mjs RUN_DIR COPY_DIR` automatically after collecting and stopping the JVMs.
Reports live at `~/Claude/Projects/triplex-db-2/evidence/DX-T1/TAG/{TRACE-REPORT.md,trace.html,trace.chrome.json,trace-summary.json}`.
Raw compressed records and JFR live at `TAG/trace/raw/`, with SHA256SUMS one level above.
Copies of reports go to `lab/experiments/EXP-DX1/t1/runs/TAG/` (large viewers are ignored by git; indexes carry checksums).
`node lab/bin/trace-store.mjs list` shows bytes; `archive TAG --to DIR` copies, verifies and moves only the raw files.
The single index is `~/Claude/Projects/triplex-db-2/evidence/TRACE-INDEX.md`. Nothing is uploaded.
`TRIPLEX_TRACE_LEVEL=off|summary|full` controls all processes; benchmark default is `full`, product default is `off`.

Full records every commit and every physical HTTP gateway request. Logical reads retain every request at least 50 ms and a
fixed 1/1024 FNV-1a sample of the remainder, with logarithmic histograms of all finished reads. Summary skips TypeScript and
gateway own-work spans shorter than 0.5 ms and samples fast gateway reads. Both levels keep every commit. A request over
8,192 spans reports truncation explicitly and cannot satisfy the coverage numerator. Recording errors remain diagnostic gaps.
Node GC pauses are timestamped; one-second CPU/heap/event-loop and separate cgroup/Mac samples locate contention. Timer drift
is an estimated bound, never proof of GC or CPU attribution. The layer table uses exclusive interval unions, not added p99s.
Every layer keeps its own clock/identity; gateway receive begins at Jetty dispatch. Response-write means OutputStream write and
flush, not remote ACK. Peer await includes the network, transactor queue and storage. TypeScript own spans measure wall time,
not per-request CPU. The report states each of these limits and preserves unknown time.

Set `TRIPLEX_TRACE_DEBUG=1` only for debugging: Node 8508, transactor 8505, gateways 8506/8507, inside the VM network, with no
host port mapping. This is off by default. Debug runs are not latency evidence.

The JVM image already contains JFR. The recorder uses `jdk.jfr.consumer` to export events while the JVMs are alive before shutdown, so no JDK image
or dependency is downloaded. Thread park threshold is 5 ms; socket/file threshold is 1 ms; GC and safepoint events have zero
threshold. Datomic metrics use its supported callback at its native cadence (no undocumented interval override). Transactor
transaction logs retain io-stats; individual storage statements and internal transactor work are not automatically causal spans.
Postgres statement duration, checkpoint/autovacuum logging and I/O/WAL timing are enabled only in traced benchmark stacks;
parameter values are suppressed. One-second wait/WAL/I/O samples and container/Mac counters are retained.

The mechanism follows Node's built-in AsyncLocalStorage/perf_hooks and the documented
[Datomic callback](https://docs.datomic.com/operation/monitoring.html),
[transaction timing boundaries](https://docs.datomic.com/reference/io-stats.html),
[JFR configuration](https://docs.oracle.com/en/java/javase/23/jfapi/flight-recorder-configurations.html), and
[Postgres duration logging](https://www.postgresql.org/docs/17/runtime-config-logging.html).
These sources define observation boundaries; measured behavior decides the findings.

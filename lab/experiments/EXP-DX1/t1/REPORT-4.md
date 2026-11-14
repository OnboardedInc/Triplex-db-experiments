P2 does not pass: the controlled isolated zero-reader floor is 14.373 ms, still above 10 ms.
At zero readers the peer wait is the largest named part, not raw disk synchronization.
The full-trace anatomy below preserves retries and reports the remainder separately.
Raw fdatasync on the owned VM volume averaged 0.113 ms; durability stayed on.
Quiet default INFO logging had no demonstrated zero-reader benefit.
At L256 quiet logging saved 2.048 ms against 1.792 ms control drift; this is one candidate observation.
Restoring q8's history window already removed the historical-read fallback bottleneck.
Fallback decoding stays off the writer; the original 267-ms delay is only partly attributable retrospectively.
Dedicated writer/engine cores saved 0.999 ms at zero readers and 1.728 ms at 256 readers, beyond drift.
No transaction-function optimization, row layout change, or acknowledgement before durable apply is introduced.

W1: primary-commit anatomy, milliseconds; context A = `p4-anatomy-a-2-anatomy`, full without extra native logs, JVM sampling on; swap 8.528 GiB, Mac non-VM CPU median 52.6%; off p50 controls 13.579/13.738 (swap 8.544/8.528, CPU 48.5/45.8%). Default INFO was still active in A.

| Step (3,420 primary commits, sequential retries summed) | p50 | p99 |
| --- | ---: | ---: |
| Client encode/send | 0.267 | 1.692 |
| Outbound network + Jetty dispatch | 0.210 | 3.432 |
| Gateway before peer | 0.835 | 6.802 |
| Peer transact wait | 6.757 | 31.318 |
| Gateway after peer | 0.200 | 1.709 |
| Return network/body/callback | 0.142 | 8.045 |
| Client parse/resolve | 0.050 | 0.179 |
| Other named root work outside transact HTTP | 4.258 | 30.491 |
| Whole trace wall | 14.491 | 66.997 |

Marginal percentiles do not add. A's TypeScript own wall is 3.403/9.947 ms, synchronous CPU 0.737/2.739, run-queue wait 0/1.647; median total TypeScript share 32.59%. Other root work includes begin/capture/publication/queue, not unexplained time. [Full anatomy](ANATOMY-a.md).
Postgres A: 1,626 nonoverlapping time windows, 1,816 ambiguous; median two statements, execute-time sum 0.255/1.356 ms (excludes implicit commit at Sync). Run-window WAL: 11,390 syncs / 3,488.497 ms; exact per-transaction WAL syncs are not identified.
RE1 explains two serial autocommits per log append, about 3.1 Postgres commits including resets/tree writes, 12-KB transactions and almost no batching. Peer transport, thread handoffs and portions of storage remain unsplit.

W2: all below use summary, 10,000 subjects, same-session A/B/A (logging zero A/B/B/A). S = timed Mac swap GiB; H = non-VM CPU median %, where 100% is one core; complete p99/max context is linked.

| Setting / workload | Control p50 bookends → candidate ms | Saving / drift ms | S controls → candidate; H controls → candidate | Decision |
| --- | --- | --- | --- | --- |
| Quiet INFO / zero | 14.625,15.500 → 14.740,15.012 | 0.187 / 0.875 | 11.922,11.766 → 11.899,11.868; 38.2,60.4 → 42.8,50.7 | No floor gain |
| Quiet INFO / L256 small | 13.567,15.359 → 12.415 | 2.048 / 1.792 | 13.611,13.160 → 13.314; 43.2,58.0 → 55.5 | Provisional keep, one candidate |
| Plaintext / zero, quiet fixed | 14.039,14.366 → 14.354 | -0.151 / 0.327 | 13.097,12.886 → 12.910; 36.9,39.2 → 60.5 | TLS stays on |
| Isolated cores / zero, quiet + TLS | 15.419,15.324 → 14.373 | 0.999 / 0.095 | 12.739,12.419 → 12.606; 58.5,48.0 → 48.3 | Keep placement |
| Isolated cores / L256 small | 16.383,16.639 → 14.783 | 1.728 / 0.256 | 11.399,12.397 → 11.517; 58.6,55.5 → 47.3 | Keep placement |

[Full tables](CORE-ZERO-A.md), [L256](CORE-256-A.md), [quiet zero](LOG-ZERO-a.md), [quiet L256](LOG-256-c.md), [TLS zero](TLS-ZERO-a.md). TLS L256 completed two oracle-passing arms but disk refused the closing control: [incomplete, no gain claim](TLS-256-INCOMPLETE.md). Index-adoption tuning was not measured in this timebox.
Kept placement: TX 0, PG 1, write gateway 2, writer 3, Node background/readers 4–7, read gateway 4; explicit G1/200-ms TX target in both arms. Read p99 8.511 ms and 33,252 correct pulls/s at L256, against 8.895/7.359 ms and 32,113/36,486 bookends (same L256 host context above). This exceeds P4's whole-machine 4,400/s throughput bar; history-depth and weighted-mix P4 remain unmeasured.
The 16-GiB guest fits: candidate L256 minimum MemAvailable 5.708 GiB, zero OOM/oom_kill; controls 5.563/5.855 GiB, zero OOM. Limits and caches are unchanged. Oracle PASS, zero mismatches, all 6,360,782 model reads exact in the candidate diagnostic.
At the isolated zero floor, peer wait is 6.343/44.931 ms (p50/p99); the peer path plus client capture/publication and scheduling hold the median above 10. Raw disk sync alone does not explain it. At the isolated reader diagnostic, TS own wall 4.046/13.708 ms, synchronous CPU 0.944/3.732, synchronous run-queue 0/0.213, TS share median 33.80%; controls' run-queue p99 6.782/6.504 (same all-primary host context in CORE-256-A).
W3: [complete >50-ms cause table with worst trace IDs](TAIL-4.md): 535/218/334 commits in baseline/isolated/baseline, 3,530 primary commands each. Same-subject wall totals 23,588/5,389/6,277 ms; peer wait 13,547/8,891/8,673; scheduler lateness 10,389/1,746/3,399. All-primary p99 improvement is inside the 278.793-ms bookend drift; no tail win is claimed.
The original 267.108-ms scheduler delay includes eight GC pauses totaling 35.393 ms and fallback scopes; without that attempt's CPU profile the rest remains unassigned. Fresh profiles moved fallback decode/checking off the writer. Same-subject queues follow slow predecessors; lateness with spare slots is a benchmark writer-thread stall.
Restoring q8 history 64→192 MiB removed ~8% historical gateway fallback: L256 read p99 244.735/247.807 → 7.967/7.903 ms (summary, S controls 12.191/12.258 → 12.625/12.383, H 64.2/78.4 → 59.2/61.7; history-b A/B/B/A). Seed 400→2,000 lowered zero p99 by 3.979 ms beyond 1.738 drift; no median benefit. Per-arm context and earlier worker comparisons remain in [audit](AUDIT-4.md).
W4 INCOMPLETE: deadline TERM during the final 900-second ladder tail; truncated collectors, no final writer file/oracle/closing off. No full P1/P2/P3 verdict or full-pair tail comparison. Opening off p50/p99 13.447/60.289 ms (S 12.257, H 44.1/188.8 median/p99) missed 12 ms; completed summary zero 13.782/152.145 ms (S 12.210, H 49.2/197.9), different-duration context, no effect claim. [Retained attempt](VERDICT-4-INCOMPLETE.md). Zero arms deliberately skip oracle; completed reader diagnostics pass. Exact replica split rule `pending`, strict scope unchanged; all owned resources removed and lease released.
Unsplit: per-transaction WAL sync count, peer/TX legs, handoffs and TX time between storage calls. Native diagnostic b-2 gives process/apply/function/storage-and-other remainder medians 8.250/2.480/0.905/4.730 ms; peer residual 7.011 ms. These are separate marginal distributions on a severely busy full+1-ms-profiler arm (S 10.048, H 298.7; off controls 463.845/69.790 ms, S 8.619/11.620, H 354.2/392.0), not a speed claim or additive partition.
Deferred function/layout ideas are RE1 estimates of ~0.5/~0.3 ms mean saving, unmeasured here; neither was started. No server-time or ACK semantics change. No physical power-loss test was performed.
Checks: 215 package tests pass, 51 external-service skips, typecheck/build pass; 458 registered JS roots have no type/binding errors, but 124 inherited coverage gaps block the root check. [Checks and evidence](CHECKS-4.md); [pin audit](PINS-4.md).
PASS/receipt audit: report/anatomy/native-transactions/cpu-profile/native-settings/ablation/study/finalize and cleanup/archive boundaries check observed content, this attempt's clocks, exact source/slot/inputs; SQL and native residuals retain unbound gaps. Full site-by-site reasoning and exceptions are in [AUDIT-4.md](AUDIT-4.md); no new semantic acceptance gate is introduced.
Run: `DX_QUIET_LOGS=1 DX_ENCRYPT_CHANNEL=true DX_NATIVE_SETTINGS_READBACK=1 DX_CPUS_TX=0 DX_CPUS_PG=1 DX_CPUS_GW_WRITE=2 DX_CPUS_GW_READ=4 DX_CPUS_DRIVER=3,4,5,6,7 DX_MAIN_CPU=3 DX_WORKER_CPUS=4,5,6,7 DX_TX_JAVA_OPTS='-Xms256m -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=200' bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-TAG`.
Setting trials: `DX_NATIVE_REPEATS=1 bash lab/experiments/EXP-DX1/t1/session.sh isolated-floor tx2-dxt1-TAG` (or quiet-floor, quiet-256, channel-floor, channel-256, isolated-256). Each run writes TRACE-REPORT.md, COMMIT-ANATOMY.md, trace.html and Chrome JSON beside its tables; private raw gzip lives under the DX-T1 evidence tag's trace/raw; repository run folders retain small reports/indices/checksums, and TRACE-INDEX.md locates the private viewers. No upload, unsafe durability option or sealed-seed mutation.

The five slowest commits in the final 10,000-subject pair waited primarily **before the request**, in VM Node process 14,
writer thread 0, `driver.queue (scheduler/subject/admission)`: 1,064–1,527 ms. The historical 4.5 s stalls did not recur.
The report locates the current delay; scheduler dispatch, per-subject ordering and admission remain combined inside that span.

| T5 example trace | wall ms | queue ms | TypeScript share |
| --- | ---: | ---: | ---: |
| `0f502b210046778f00000000000045b8` | 1592.910 | 1527.276 | 96.33% |
| `0f502b210046778f00000000000045a9` | 1551.552 | 1441.803 | 93.13% |
| `0f502b210046778f0000000000004598` | 1444.330 | 1322.228 | 91.90% |
| `0f502b210046778f0000000000004588` | 1327.571 | 1146.085 | 87.31% |
| `0f502b210046778f0000000000004523` | 1253.125 | 1064.469 | 85.31% |

Producer for final `q8-c` and `cost-b`: `d7aeb0699071e22fc8499fb97ea91eaf58ce195d`; subsequent commits contain reports only.
All findings above and the decomposition below are available directly in the automatically generated [trace report](runs/tx2-dxt1-q8-c-ladder/TRACE-REPORT.md).

| target | observed result |
| --- | --- |
| T1 | 187 package tests passed, 51 skipped; nine tracing tests. Gateway/JFR preflight: 3 tests, 14 assertions, zero failures. Build/types and five new JS binding roots passed. |
| T2 | Ladder: 8,540/8,542 commits have >=95% named-scope coverage (99.9766%); zero arm: 8,534/8,534. Every writer row matched a trace; zero missing worker receivers. Unknown intervals retained. |
| T3 | Four fresh 10k zero-reader arms, off/full/full/off, same source/trace, 3,420 primary commands each. Mean arm p50 14.686 -> 19.147 ms: +4.460 ms (+30.37%); cost aim missed. p99 119.278 -> 114.261 ms (-5.017 ms, -4.21%); arm variation prevents an improvement claim. |
| T4 | Both full 10k arms DONE, automatic Markdown/HTML/Chrome outputs, all three JFR exports and Mac/VM/PG collectors validated. Ladder oracle PASS: 53 reads / 2,561 entities; 3,400,353 model reads exact, zero errors. Zero-reader oracle deliberately NOT-RUN. |
| T5 | Current stalls localized above with five IDs; original 4.5 s cause unproven. Small primary commits at 256 readers: p50 24.319 ms, p99 835.794 ms (28 commands), both latency aims missed. |
| T6 | Compressed raw pair: 160,993,232 bytes (153.535 MiB), below 2 GB. Zero 44,197,834; ladder 116,795,398. |

At 256 readers, the trace table's 35 small background requests (including retries) have p50 wall 24.238 ms.
Per-column medians: TypeScript own scope 7.213 ms, offer queue 0.717, TypeScript GC 0, network residual 1.507,
gateway own 1.365, gateway queue 0.042, gateway GC 0, peer call 0.497, peer wait 10.926, unexplained 0.019.
Median TypeScript total is 8.406 ms; median per-request share 35.1%. Quantile components do not add.
Coverage measures named wall-time scopes. TypeScript own scopes include unmeasured scheduling; per-request on-CPU time is unavailable.
Explicit worker RPC wait is measured after subtracting causal child work; other event-loop readiness is n/a. GC during remote wait is an overlay.
Reader workers saturated; host quiet passed admission but failed after q8-c, with one busy sample among 45 at L256.
These figures are diagnostic observations; clean performance acceptance and independent promotion were not established.

Run a pair and find its outputs in ten steps:

1. Start in this worktree, with the private lab Docker endpoint and at least 15 GiB free.
2. Smoke first: `DX_TRACE_TEST_GATEWAY=1 bash lab/experiments/EXP-DX1/t1/run.sh real tx2-dxt1-your-smoke --subjects 1000 --level-s 2 --max-readers 16`.
3. Set `export DX_STACK_EVIDENCE="$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1" DX_READ_PATH=replica`.
4. Set `export DX_ORACLE_ROOT="$DX_STACK_EVIDENCE/oracle" TRIPLEX_TRACE_LEVEL=full`; the smoke verifies the frozen executable oracle copy.
5. Run `node lab/bin/heavy.mjs --label DX-T1-pair -- bash lab/experiments/EXP-DX1/quiet/run-10k-pair.sh tx2-dxt1-your-pair 360`.
6. Leave the host idle through both arms; the measurement lease and owned-resource cleanup are automatic.
7. Open `$DX_STACK_EVIDENCE/tx2-dxt1-your-pair-{zero,ladder}/{TRACE-REPORT.md,trace.html,trace.chrome.json}` beside the normal run tables.
8. Raw gzip/JFR files are in each arm's `trace/raw/`; raw checksums are in `trace/SHA256SUMS`, derived checksums in `SHA256SUMS`.
9. Repository/local copies are in `lab/experiments/EXP-DX1/t1/runs/TAG/`; large viewers stay ignored, with committed report/index/checksums.
10. See `~/Claude/Projects/triplex-db-2/evidence/TRACE-INDEX.md`; use `node lab/bin/trace-store.mjs list` or `archive TAG --to DIR` locally.

| layer | permanent observations and limits |
| --- | --- |
| Driver/client/replica | W3C context and exact worker parent links; queue, planning, validation, encoding, expected state, socket write/first byte/body/parse, receipt/publication, RYOW and replica apply. Per-isolate timestamped GC, loop delay/drift, CPU/heap every second. Scope wall time provides an upper bound on own code. |
| Gateways | Receive/dispatch, route/admission, commit/read steps, peer db/sync/query/pull/transact, touched cache counters, response encoding and actual stream write/flush; trace ID in MDC. Jetty queue before dispatch and remote ACK are outside the boundary. |
| JVM/transactor | Default per-run JFR in all three JVMs, GC/safepoints, parks >=5 ms, socket/file events >=1 ms; native callback cadence and logs/io-stats. Closed transactor internals and per-transaction storage shares remain unjoined. |
| Postgres | Statement durations, I/O/WAL timing, waits, checkpoint/autovacuum logs on UTC. These are contextual observations; individual statements are not causally assigned to a commit. |
| VM/Mac | Separate one-second container CPU/throttling/PSI/memory/I/O and disk counters; host CPU/swap. These samples overlap requests without establishing individual causal shares. |

`off|summary|full` is one switch; benchmark default full, product default off. Every commit is retained completely in enabled levels.
Logical reads retain every >=50 ms request, fixed 1/1024 FNV sample and actual top 20 per phase/thread; all reads enter histograms.
Summary reduces read span/log volume and keeps commit-owned begin routes/worker steps; fresh 1k oracle PASS, 84/84 coverage.
Summary has no 10k cost measurement. Full overhead combines instrumentation, serialization, JFR and PG logging; no ablation isolates them.
4.037 ms of the final 4.460 ms p50 increase occurred inside transact. Full arm p50s were 19.814/18.479; off 13.932/15.441 ms.
See [cost arms](COST.md), [validation receipts](CHECKS.md) and the required [content/freshness/binding audit](AUDIT.md).
No dependencies/images were added. Debug switches are off; VM-only ports 8505–8508 are wired but were not exercised.
All fourteen fresh-run manifests/checksums and empty owned inventories were reread; every owned volume is removed, lock absent.
First failures and earlier producers remain retained. Acceptance files and pinned paths are unchanged (0 changed pins); nothing pushed or uploaded.
Root checks retain unrelated pre-existing failures; full root check, skipped service suites, summary 10k cost and independent promotion remain unverified.
Next: split queue residency into scheduler/per-subject/admission intervals, profile recorder allocation/flush cost, and correlate peer transaction IDs with native I/O.

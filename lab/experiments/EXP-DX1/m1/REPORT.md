The measured 772 ms burst stall is write-gateway G1 GC amplified by a 409/retry; the original 1–2 s amplitude was not reproduced.
Sparse extra call time is mainly the native future (+6.95 ms) and SDK staging (+5.61 ms); PostgreSQL INSERT itself adds only 0.095 ms.

North star: P2 diagnostic, under lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. No product code changed.
Raw evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-M1/{tx2-dxm1-zero-c,tx2-dxm1-indexed-b}/.
Both arms: 10,000 subjects, zero readers, first frozen burst, 3,350 burst commits; unchanged H4 gateway stage and existing d-native public builds mounted read-only.
Zero/indexed burst call→return p50: 14.02/13.79 ms; p99: 174.62/191.21 ms; maximum: 599.82/771.99 ms. Pre-indexing did not remove the tail.
Q2 job completed at 23:01:07.006 UTC, before the burst at 23:01:10.919; native index/create-index completed at 23:01:06.824. No index event occurred during the burst.
Q3 used a separate fresh 10k B6 scope on the same physical stack; untimed seed batches held roughly 400 facts. Its 32 MiB SDK cache had 9,185 missing predecessor stamps; both phases made two HTTP calls per commit, including /begin.
An initial 400-subject warm-cache Q3 measured offered→return 20.60/6.36 ms. Its SQL threshold change was masked by a startup flag; those logs were retained. The final run used a reloadable threshold and verified SHOW=0 before timing.

Timeline of the indexed stall, 2026-11-10 UTC (logs beside the driver directory):
1. ns-writes: call 23:01:41.628→42.400, 771.99 ms, trace +150.709 s; publication witness is near the return, not the initial delay.
2. commit-phases: first /begin 41.629→42.100 took 470.79 ms; gateway reported 467.65 ms. Later successful-attempt “stage” includes the earlier failed attempt, not just preparation.
3. gc-gw-w: mixed evacuation 41.691→42.072, 380.72 ms (0.36 CPU seconds); safepoint 387.84 ms. This overlaps most of that /begin wait.
4. commit-phases: first POST took 191.40 ms and returned 409; second /begin 6.87 ms; final POST 96.50 ms, with native future 92.47 ms and predecessor wait 0.004 ms.
5. gc-tx/gc-gw-r: transactor mixed pause 42.236→42.280, 43.95 ms; read gateway had no GC pause in the stall interval.
6. m1.jfr/jfr-events: confirms the 43.9 ms transactor pause; largest recorded overlapping socket/file event was a PostgreSQL socket read of 18.5 ms.
7. tx-internal/2026-11-10.log + pg.log: no indexing at the stall; no SQL ≥100 ms, checkpoint, reported lock wait or autovacuum event in 23:01:40–49.
8. counters: every container had zero throttling increments and zero memory-limit/OOM events; gateway runnable CPU waiting rose 592 ms in 42.036→43.036. VM memory-pressure totals stayed flat; vmstat showed no swap I/O.
9. counters/io.stat: PG wrote 0.97 MB and read zero bytes in 41.033→42.036; VM full I/O-pressure time rose 11.9 ms in that second, not hundreds of milliseconds.
10. driver.log/ns-report: main-thread ELU 0.314/0.544 around the call, samples about 0.5 s apart; main V8 scavenges nearby were ≤4.93 ms. No long main-thread GC explains this outlier.

Q3 medians, milliseconds: 60 commits at 1/s, then 500 back-to-back. Sparse 23:03:59–23:04:58; dense 23:04:58–23:05:02 UTC.
| Phase | Sparse | Dense |
| --- | ---: | ---: |
| Actual Triples.transact call→return | 24.300 | 6.435 |
| Offered→return, including timer wake | 29.745 | 6.459 |
| Call→adapter entry | 0.468 | 0.094 |
| SDK staging, including /begin | 6.781 | 1.172 |
| Staging /begin HTTP, nested | 3.217 | 0.569 |
| SDK admission queue | 0.022 | 0.006 |
| Encoding through socket finish | 1.494 | 0.379 |
| Socket finish→response headers | 13.344 | 4.257 |
| Headers→body parsed | 0.134 | 0.063 |
| Parsed→adapter return | 0.340 | 0.129 |
| Adapter return→Triples return | 0.033 | 0.013 |
| Gateway JSON parse / preparation | 0.215 / 1.076 | 0.073 / 0.345 |
| Gateway predecessor / submission | 0.004 / 0.236 | 0.002 / 0.075 |
| Gateway native future completion | 10.185 | 3.232 |
| Gateway response preparation | 0.049 | 0.019 |
| Transactor tx/process / apply, nested | 6.470 / 2.235 | 2.150 / 0.758 |
| PG INSERT execute, nested (112/971 statements) | 0.190 | 0.095 |
Medians do not add; gateway/transactor/SQL rows overlap the enclosing HTTP stages. SQL execute timing is not the whole storage round trip or transaction durability wait.

Proposals, not built: reduce write-gateway allocation/mixed-GC pauses and test a CPU separate from the transactor; preserve correctness while reducing fallback/retry amplification. For sparse commits, test a bounded predecessor-stamp cache to avoid /begin, then isolate VM wake cost in the native/message path; changing INSERT execution is unlikely to recover the measured gap.
Limits: original 1–2 s stalls remain unattributed directly; causal VM wake cost was not isolated. Both host-before lines said busy (about 20.9/21.8 GB swap); no keep-awake helper was started. Holds were approximately 6.6/7.9 minutes; owned containers/networks/volumes were removed before release. Evidence is about 40.1 MB, compressed; setup hash manifests/vendor source copies were omitted.
Checks: Node/Bash syntax checks and both real measurement runs completed; no new PASS verdict, receipt or acceptance promotion, no oracle run, and no pinned path/contract change. Inherited NS bars are diagnostic for this truncated window.
Commands: python3 lab/experiments/EXP-DX1/m1/prepare.py
node lab/bin/heavy.mjs --label DX-M1-zero -- bash lab/experiments/EXP-DX1/m1/run.sh zero c
node lab/bin/heavy.mjs --label DX-M1-indexed -- bash lab/experiments/EXP-DX1/m1/run.sh indexed b
python3 lab/experiments/EXP-DX1/m1/analyze.py /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-M1/tx2-dxm1-indexed-b

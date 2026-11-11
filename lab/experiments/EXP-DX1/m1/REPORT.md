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

## Collector arms

P2 configuration diagnostic, 2026-11-10/11 UTC. Same H4 stage, public builds, read gateway, SQL settings and 10k zero-reader trace; no product changes.
GC/CPU window: trace seconds 120–180. Call cohort: 3,350 burst-tagged calls (3,262 new commits, 88 resends), including replays finishing about 2.8 s later.
GW/TX columns are pause count / total GC ms / maximum GC ms / maximum safepoint ms. Call column is p50 / nearest-rank p99 / maximum ms / count >100 ms. CPU uses 1 s counter interpolation.
Retry counts bind successful new-commit positions, operation IDs and return times; C/K are all logged burst HTTP 409 CasConflict/ClockConflict responses, including deliberate replays.
| Run | GW n/Σ/max/SP | TX n/Σ/max/SP | Call p50/p99/max/>100 | GW CPU s≈ | Retry; C/K | Host |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| G1 | 54/822.52/35.046/36.32 | 34/532.95/63.053/67.29 | 9.44/66.23/205.72/17 | 17.48 | 11; 107/11 | busy |
| Z1 | 28/0.33/0.051/3.86 | 29/582.58/94.208/96.61 | 9.66/70.03/196.30/15 | 18.05 | 8; 107/8 | busy |
| S1 | 147/1197.00/104.324/105.59 | 31/618.49/59.493/61.71 | 9.72/267.58/1304.77/64 | 20.15 | 13; 107/13 | busy |
| G2 | 57/780.59/37.088/37.15 | 33/519.67/43.739/48.25 | 9.40/59.15/110.53/1 | 17.21 | 3; 107/3 | busy |
| Z2* | 31/0.31/0.027/3.38 | 28/586.29/55.181/59.34 | 10.82/76.41/208.13/17 | 21.19 | 8; 107/8 | quiet |

Incomplete: S2 and P were not measured; transactor ZGC could not acquire the measurement lock before its admission cutoff (00:33 UTC). Five gateway runs completed; this is not the full requested sequence.
Recommendation: no configuration is verified to meet both requirements. Z is the pause-first candidate (GC <=0.051 ms, safepoints <=3.87 ms in two runs), but medians increased 2.3%/15.1% and gateway CPU increased about 3%/23% versus the paired G controls. Reject S as tested.
Write-gateway Z candidate options: -Xms1g -Xmx2g -XX:+UseZGC -XX:+ZGenerational -Ddatomic.objectCacheMax=1g. G retains the requested G1 control options.
S used the requested 512m/768m heap, G1 pause target 10, nursery minimum 30%, 128m object cache, plus UnlockExperimentalVMOptions; TX2_ENTITY_CACHE_BYTES=0 and TX2_REACH_SESSION_ENTRIES=0 disable the derived revision budgets too.
S1 failed the pause target and also made a 181.92 ms full compaction about 8 s after the fixed burst window. Transactor G1 maxima were 43.74–94.21 ms; no transactor setting can be recommended as meeting 20 ms from this study.
409s: successful new-commit retries were ClockConflict/TRIPLEX_CLOCK: a submitted recorded time was <= the prior maximum. There were zero outer driver retries.
All observed CasConflict/TRIPLEX_CONFLICT responses fell within deliberate replay intervals (88 resends + 32 lost-ack replay attempts per burst); no successful new-commit diagnostic retried a CasConflict. The generic message does not identify its guard.
*Z2 driver completed and wrote all 3,350 call records before a wrapper parse error: I edited the script while Bash was still reading it. Cleanup and live GC copies completed; raw error is retained in wrapper-terminal-excerpt.log.gz. No exit-zero acceptance claim is made.
Judgment checks: collector-table metrics use collectors-analyze.py: content=frozen 3,350-call cohort and parsed GC/error bytes; freshness=attempt timestamps and live copies after full-window counters; binding=actual container options/placement plus position/operation/return-time joins. Async-context labels are not trusted; report judgments use those same runs. The post-burst S1 full-compaction value is a direct dated GC-log entry. No PASS receipt or contract promotion.
Raw logs/output: evidence/DX-M1/tx2-dxm1-cg-{g-1,z-1,s-1,g-2,z-2}/ under the existing absolute evidence root above; per-run analysis.log.gz is analyzer stdout. Admission logs remain in tx2-dxm1-cg-s-2/, tx2-dxm1-cg-z-txz1/ and remaining-terminal.log.gz.
Limits/next: test Z with CPU separation (P remains unmeasured), then transactor -Xms1g -Xmx3g -XX:+UseZGC -XX:+ZGenerational. Do not infer either result from these runs; none of the completed runs achieved the 50 ms commit-p99 goal.
Final admission child returned 124 without creating containers. Its orchestration wrapper originally returned zero; nonzero propagation is now fixed and checked with a controlled child returning 124 (exit-check.log.gz). Original raw output was retained.
Retained evidence is about 87 MiB, compressed. Five holds lasted 5.0–5.2 minutes each; host state is in the table. Same image IDs/source hashes/read settings; source/build mtimes predate the study. No keep-awake helper, downloads, product/pinned/contract edits, or oracle/acceptance promotion. All owned containers/volumes/networks were removed.
Commands: python3 lab/experiments/EXP-DX1/m1/collectors-prepare.py
node lab/bin/heavy.mjs --label DX-M1-collector-ARM-N -- bash lab/experiments/EXP-DX1/m1/collectors.sh ARM N  # completed G1,Z1,S1,G2,Z2; S2 admission cancelled, P not reached
python3 lab/experiments/EXP-DX1/m1/collectors-analyze.py EVIDENCE_RUN
node lab/bin/heavy.mjs --label DX-M1-final-collector-trials -- node lab/experiments/EXP-DX1/m1/remaining.mjs 2026-11-11T00:39:00Z  # TX-Z admission expired; S2 repeat/P omitted

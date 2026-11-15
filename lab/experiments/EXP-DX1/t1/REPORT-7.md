P2 still misses in the quiet closing pair C: all-primary p99 is 55.647 ms against 50 ms; no later full pair ran.
C used summary tracing, swap 4.679 GiB and Mac non-VM CPU 12.2%; its off bookends were 11.007/45.569 and 10.745/41.412 ms p50/p99.
C's 256-reader medians miss: 11.391 ms for 5–10 facts and 13.567 ms for 11–25 facts, against 10 ms each.
C's small burst median passes at 9.791 ms; the medium burst misses at 12.095 ms against 10 ms.
The remaining P1 miss is the 1024-reader writer-tail ratio, 3.730 against 2; P3 and the measured P4 bars pass.
Delta broadcasts are kept: broadcast p99 fell from 5.151 to 1.303 ms in D, but all-primary p99 did not improve beyond drift.
The journal trial J observed a 497.4→301.3-MiB writer heap and 55.2→38.7-ms maximum GC pause; its missing bookend prevents a controlled gain claim.
Journal retention stays opt-in; writer-only V8 tuning and the shared-core two-transactor layout remain unmeasured.
The final pair was attempted before the 75-minute reserve, but refused below the unchanged 15-GiB floor; no containers or lease remain.
The largest remaining tail wait is peer-to-transactor/storage; writer GC/allocation and retained oracle/duplicate history still need work.

Z1: full 10,000-subject, unchanged 900-second zero/loaded pair `tx2-dxt1-p7-closing-a`, source 7e8ccd81, split rule `pending`, exact local reads; oracle PASS (810 commands, 53 reads, 2,241 entity queries, zero mismatches), all-read errors/violations zero. R is part-6's busy reference c9b9fc3f. [Every bar, three columns, contexts and qualifications](VERDICT-7.md); the final column is explicitly unmeasured.
R summary loaded context: swap 10.701 GiB, Mac CPU 65.3%; off bookends 13.724/104.423 and 13.008/51.145 ms, swaps 11.649/12.053 GiB, CPUs 45.6/54.8%. C off swaps 4.694/4.679 GiB, CPUs 10.5/10.5%. Both C controls meet 12 ms; neither R control does. Different host/cache conditions prevent attributing R→C to one change.

| bar (C and R loaded contexts above) | requirement | R | C | final |
| --- | --- | --- | --- | --- | --- |
| P1 G256/G64; G1024/G256 | ≥1; ≥0.9 | .970; .870 | 1.017; 1.124 | not run |
| P1 writer p99 ratios 256; 1024 | ≤1.25; ≤2 | 2.245; 6.945 | 1.129; 3.730 | not run |
| P1 read p99; writer max wait at 256, ms | ≤100; ≤2000 | 8.383; 134.323 | 6.815; 24.464 | not run |
| P1 recovery ms; minimum hot share | ≤60000; ≥.5 | 40000; .595 | 35000; .596 | not run |
| P2 5–10 p50/p99; 11–25 p50/p99 at 256, ms | ≤10/50 each | 15.999/52.613; 16.383/134.323 | 11.391/24.464; 13.567/22.795 | not run |
| P2 all-primary p99; burst small/medium p50, ms | ≤50; ≤10/10 | 203.881; 14.015/16.895 | 55.647; 9.791/12.095 | not run |
| P2 queue max; burst drain seconds | ≤2.19; ≤60 each | 2; .127/.602 | 2; .045/.701 | not run |
| P2 accounted/published; RYOW/duplicate/lost-ACK exact | 7408; all exact | 7408; exact | 7408; exact | not run |
| P3 gaps/order/visible duplicates; lag p99 ms | 0/0/0; ≤250 | 0/0/0; 221.096 | 0/0/0; 46.322 | not run |
| P3 exact replay; crashes; affected-set/range | true; 3; exact | met | met | not run |
| P4 weighted whole-machine correct pulls/s | ≥4400 | 14720 | 16521 | not run |
| P4 weighted p50/p99 ms; depth 1/3/10 p99 ms | ≤5/25; depth10/depth1≤1.1 | .034/.293; .182/.191/.195 | .032/.247; .160/.166/.163 | not run |
| P4 physical bytes/query flatness | ≤1.1 | unmeasured | unmeasured | not run |

Z2: D is the fresh `p7-basis-b` snapshot/delta/snapshot, source 4cf2b1a7, summary, 450-second focused ladders with unchanged 45-second phases through 1024; all three loaded arms DONE/oracle PASS. Separate same-mode zero references bind both ratios. Swap 4.624/4.608/4.608 GiB, CPU 11.2/11.1/11.1%; controls are the two snapshot bookends. This diagnostic is not a full-pair verdict.

| D snapshot / delta / snapshot | opening | candidate | closing |
| --- | --- | --- | --- |
| all-primary p50/p99 ms | 12.569/44.483 | 12.459/57.201 | 12.500/53.584 |
| commits >50 ms, count / summed request wall ms | 23/1467.757 | 68/4667.151 | 54/3476.076 |
| GC events >50 ms, count / summed duration ms | 2/113.205 | 2/128.711 | 1/57.314 |
| GC count / total ms / max ms | 822/2230.381/60.597 | 756/2186.364/73.029 | 822/2289.207/57.314 |
| writer scheduler-late >50 ms: count / sum ms | 0/0 | 1/52.235 | 0/0 |
| writer p99 ratio 256 / 1024 | 1.152/.523 | 2.323/.760 | 4.256/.628 |

D primary p50 saving .075 ms narrowly exceeds .069-ms bookend drift; p99 change +8.167 ms is within 9.101-ms drift. Broadcast items fall 19.37 million→12,471, p50/p99 1.815/5.151→.307/1.303 ms (closing 1.879/5.151). Keep delta for that measured work reduction; GC and tail are not fixed. [First failed trial, exact contexts, heap/kinds and complete results](BROADCAST-7.md).
J: `p7-model-b`, source 12df19b2, summary, delta fixed; loaded heap→journal p50/p99 12.544/66.251→12.243/63.013 ms, swap 4.562→4.554 GiB, CPU 11.1→11.2%. Opening control only; closing disk-refused, so no latency-win/default promotion. >50-ms commits 89→66 (total wall 6081→5061 ms); scheduler-late >50 ms 1/62.071→0/0. [All arms, own-mode ratios, GC counts, heaps and archive verification](MODEL-7.md).
Fresh 1,000-subject delta/journal smokes b/c each pass the independent oracle and all-read checks; journal capture/replay and verified gzip preserve exact original bytes. New seal-readback/report hardening has unit and recorded-fixture validation after these engine timings.
C tail: 96/7408 commits >50 ms, summed wall 12099 ms: largest cause peer wait 60, network 10, subject predecessor 11, scheduler lateness 10, gateway 4, TypeScript 1. Writer lateness >50 ms is four intervals / 407.535 ms, two union episodes / 205.077 ms. [Every group, five-plus trace IDs and GC/profile limits](TAIL-7.md). GC overlays do not establish exclusive CPU attribution.
Z3: no new two-core sharing comparison; keep transactor0/Postgres1/write-gateway2/writer3, readers+Node background4–7/read-gateway4. No new writer-only V8 flags or transferable-buffer trial; retained reads already spill to another isolate, expected-model history can now journal, oracle/duplicate history remains. No P1-preservation claim for a new layout.
Z4: `p7-final-a`, source 7b864a32, disk-refused before lease acquisition; no final latency/control/oracle result exists. Disk observation 14.384 GiB, ownership inventory empty, lease absent. Missing J bookend and full pair stay missing; do not substitute focused ladders. [Evidence/index/checksums](EVIDENCE-7.md).

Compression: 6,939 authorized incomplete/smoke files, 6,794,667,682→535,399,178 bytes with verified round trips. Initial free 19.494→22.239 GiB; later batches and actual host allocation leave final 14.384 GiB. Reports/viewers/source and protected baselines retained; [journals/restore/space observations](COMPRESSION-7.md). No unrelated deletion or guard relaxation.
Checks: 266 unit tests pass, 51 external-service tests skipped; package build, declarations, typecheck, lint, shell syntax pass. Root-JS still fails the inherited unregistered `report-revision-race.mjs`; no root/pack/differential/power-loss PASS claimed. [Fresh receipts and limitations](CHECKS-7.md), [content/freshness/binding audit](AUDIT-7.md); [no changed pinned paths](PINS-7.md), acceptance untouched. No new dependency/image or engine durability change.
Automatic completed-run reports now include source-bound writer GC/heap/lateness/count tables; failed/off attempts cannot manufacture them. Model journaling stays opt-in; delta is the benchmark default. Next: finish J bookends, reduce retained oracle/duplicate objects and allocation, then profile/qualify writer-only V8 and shared-core layouts and repeat the full pair.
Commands (new tags, ≥15 GiB, scripts own lease/cleanup/heavy wrapper; do no other work during holds):
```sh
DX_NATIVE_GATES=0 DX_GATEWAY_SELFTEST=0 DX_TRANSACTION_CENSUS=1 DX_MATCH_DURATION_S=900 bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-NEW
DX_STRESS_DIAGNOSTIC=1 DX_NATIVE_REPEATS=1 bash lab/experiments/EXP-DX1/t1/session.sh basis-256 tx2-dxt1-NEW-BASIS
DX_STRESS_DIAGNOSTIC=1 DX_NATIVE_REPEATS=1 bash lab/experiments/EXP-DX1/t1/session.sh model-256 tx2-dxt1-NEW-MODEL
```
Default outputs: private `DX-T1/<tag>/{TRACE-REPORT.md,trace.html,trace.chrome.json,WRITER-STATS.json,trace/raw/}`; small report/index/manifests copied beside this report, viewers stay private; sessions contain host/control tables. Original earlier runs predate automatic WRITER-STATS; verified derivations are under `p7-writer-stats-v3/`.

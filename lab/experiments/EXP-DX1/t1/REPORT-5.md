P2 does not pass. The completed zero-reader run still misses the median and tail bars; the full reader verdict was refused for disk.
A commit now measures 13.601 ms at p50 in the full zero arm (context Z below); the largest named wait is the peer call, 6.395 ms.
Outside the transact HTTP call, the trace measures 3.572 ms at p50, including queueing, staging, encoding and benchmark validation.
Moving the benchmark's durable witness behind the unchanged completion boundary saved 1.523 ms at p50, beyond 0.233-ms control drift (W).
Strict scopes now assign record time atomically on the server. Clock replays and ticket wait are zero; ordinary CAS retries remain.
That clock feature costs a net 0.417 ms at the zero-reader median, beyond 0.289-ms drift (C0); no loaded speedup is proven.
Non-strict scopes still accept submitted backdates, valid time is preserved, and acknowledgements still follow durable engine apply.
Warm commits use optimistic cached predecessors, so `begin` is not a second HTTP round trip per commit. Cold begin supplies a pinned basis/handle, command claim and old triples for checks.
Native and differential tests and four loaded diagnostic oracles pass. A zero-reader run deliberately has no oracle; there is no full-pair PASS.
Remaining work is peer/transactor/storage wait, unexplained Node continuations, and a full loaded verdict once more disk is available.

X0: 694 eligible files losslessly compressed: 7,992,341,813 → 835,801,395 bytes; Mac free 17.166 → 23.784 GiB, below the requested 25. All round-trip hashes verified; nothing outside the selection removed. [Receipt](COMPRESSION-5.md). Later free fell to 14.927 GiB and the unchanged 15-GiB guard refused the reader arm/closing control; cited raw traces remain intact.

Contexts: all CPU figures below are Mac non-VM medians; A/B/B/A entries are in execution order. Quantiles are per arm, not pooled. Full ranges, CPU p99 and exact controls are in the linked [W](comparisons/tx2-dxt1-p5-defer-b/MEASUREMENTS.md), [C0](comparisons/tx2-dxt1-p5-clock-a/MEASUREMENTS.md), [C256](comparisons/tx2-dxt1-p5-clock-b/MEASUREMENTS.md) and [partial verdict](VERDICT-5-INCOMPLETE.md) tables.

| Context | Level | commit p50 / p99 ms, in arm order | swap GiB | Mac CPU % | control |
| --- | --- | --- | --- | --- | --- |
| W: insert/deferred/deferred/insert, zero | summary | 14.686/68.695; 12.958/353.113; 13.135/65.018; 14.453/74.131 | 9.802/9.794/9.755/9.755 | 39.5/64.2/44.3/52.4 | first/last |
| C0: client/server/server/client, zero | summary | 13.558/82.178; 14.173/75.517; 14.066/195.325; 13.847/72.040 | 9.739/9.723/9.700/9.700 | 50.2/52.0/45.2/43.4 | first/last |
| C256: same clock order, small band at 256 readers | summary | 14.655/73.001; 12.031/42.527; 14.847/44.804; 12.479/41.086 | 9.661/11.383/11.398/11.599 | 71.4/54.0/43.3/46.1 | first/last |
| O: opening zero-reader control, 200 s | off | 13.273/67.350 | 12.274 | 51.5 | opening only |
| Z: completed zero-reader arm, 900 s (652984e9) | summary | 13.601/107.202 | 12.094 | 49.7 | O; duration differs, no gain/cost claim |

Measured sources: W `3ff6db5a`; C0/C256 `d3375228`; O/Z `652984e9`. Subsequent changes correct recording boundaries and checks/formatting; no new latency gain is claimed.

X1: Z per-step milliseconds below; [all named continuations, owner, ACK relation and necessity](OUTSIDE-5.md). These are individual quantiles and are not additive; capture is a marginal span. The SQLite witness is benchmark apparatus, not engine durability. Expected-state/oracle work remains before the measured completion. No latency timestamp or frozen writer phase moved.

| Step (Z) | p50 | p99 | owner / before measured ACK |
| --- | ---: | ---: | --- |
| begin / cached snapshot / claim | 0.040 | 0.403 | product / yes |
| validation and staging | 0.685 | 4.110 | product / yes |
| pre-HTTP transaction encoding | 0.395 | 2.034 | product / yes |
| clock ticket | 0 | 0 | removed in server mode; counters prove zero |
| publication event capture | 0.037 | 0.279 | benchmark / yes |
| receipt settlement / cache | 0.132 | 0.577 | product / yes |
| command planning; ACK/subject state | 0.026; 0.040 | 0.107; 0.197 | benchmark / yes |
| expected-state; oracle bookkeeping | 0.373; 0 | 2.105; 0.181 | benchmark / yes |
| read-your-own-write dispatch | 0.036 | 0.184 | benchmark / yes; asynchronous read follows |
| queue; unmatched continuation | 0.767; 0.051 | 29.563; 0.157 | benchmark / yes; residual retained |
| durable witness storage | 1.175 | 5.439 | benchmark / after existing finishedAt |
| peer transact wait | 6.395 | 59.073 | gateway/closed engine/storage / yes |

Z TypeScript own wall p50/p99 2.656/10.392 ms; observed synchronous CPU 0.681/3.013, synchronous run-queue wait 0/0.055; median TypeScript share 28.85%. Async own scopes are not exclusive CPU attribution. Legacy trace roots include ~0.033-ms median onDone closure; actual bars above use writer finishedAt. Future roots use that exact boundary; 230 tests and an 8,534-root offline compatibility audit pass, but native remeasurement is disk-blocked. No artificial latency improvement is claimed.

X2: C0 controls have 10/6 clock replays and 221.166/105.885-ms total ticket wait; both server arms have 0/0. C256 controls have 9/5 replays and 256.641/581.138-ms wait; server arms 0/0. C256 medians are mixed inside 2.176-ms bookend drift. Core 861 tests, Datomic 230 (51 external skips), host 34, native gateway 17 tests/53,848 assertions pass. Native differential 300 scenarios/95,028 comparisons; four-process clock test 2,000 commands; live replica differential 200,000 worlds/zero differences during 4,573 writes. Four loaded clock diagnostics have fresh oracle PASS; see [checks and limits](CHECKS-5.md).

X3 PARTIAL: [64 actual immutable-log transactions by attribute](BYTES-5.md), bound to operation/position/t: 56.45 datoms, 17,067.73 value-representation bytes/transaction; native row texts are 16,784.14 bytes (98.34%). This is UTF-8/EDN, not the roughly 12-KB Fressian/storage figure. Only 2.00 identity datoms/transaction reach the log; redundant submissions have no demonstrated log-byte saving. Fresh serial-point read count/time and physical encoded bytes remain unmeasured; no additional function-read/layout optimization is claimed. Revision reads still use EAVT. Layout changes require rebuilt seeds; none were made.

X4 INCOMPLETE: Z all-primary p99 107.202 ms >50; burst small/medium p50 12.031/14.463 ms >10. Steady queue max 2 ≤2.190; drains 0.044/0.691 s ≤60; all 7,408 primary commands committed, 227 duplicate and 80 lost-ACK receipts name originals, 7,408 RYOW checks exact. [All >50-ms causes and trace IDs](TAIL-5.md): peer wait dominates; same-subject waits follow predecessors, while scheduler lateness with free slots is a writer-thread stall. No native/CPU stack proves its entire cause.
C256 candidate read p99 7.679/7.583 ms and feed-lag p99 50.159/37.622 ms (controls 8.063/8.127 and 47.550/195.906) keep those diagnostic slices. Full P1 stress/baseline ratios, full-profile reader-loaded P3, the ≥4,400 total pulls/s P4 bar and history flatness are not revalidated. The read path's default split rule is `pending`. O missed the 12-ms host reference. [Original disk refusals and partial result](VERDICT-5-INCOMPLETE.md).

Run after disk admission recovers (outputs: per-tag TRACE-REPORT.md, COMMIT-ANATOMY.md, trace.html, Chrome JSON and census beside the tables; compressed raw trace under trace/raw, indexed by evidence/TRACE-INDEX.md; repository retains small indices/reports/hashes):
```sh
DX_TRANSACTION_CENSUS=1 bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-NEW
DX_NATIVE_GATES=1 DX_GATEWAY_SELFTEST=1 bash lab/experiments/EXP-DX1/t1/run.sh real tx2-dxt1-NEW-smoke --subjects 1000 --reader-ladder-only --max-readers 16 --level-s 2 --match-duration-s 200
node lab/bin/heavy.mjs --label DX-T1-check -- bash -c 'cd packages/datomic && ../../node_modules/.bin/vitest run && ../../node_modules/.bin/tsc --noEmit'
```

[Receipt-site audit](AUDIT-5.md), [pin audit](PINS-5.md) (zero changed pins), [evidence index](EVIDENCE-5.md). All owned containers/volumes removed; leases released. No acceptance edit, seed mutation, unsafe durability setting, upload or push. Root JS check remains blocked by an inherited unregistered test; pack check rejects required --store-dir; no root/pack or physical power-failure PASS is claimed. Next: disk headroom, full reader pair, then native per-helper reads/row-byte categories and an AEVT-only comparison.

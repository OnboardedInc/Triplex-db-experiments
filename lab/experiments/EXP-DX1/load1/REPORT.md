# DX-HA1 · Import in one database

All accounts will use one database. The overnight import moved 5,491 facts per second with 128 facts per transaction.
The quiet account's slow saves took 49 ms, against 21 ms before the import and 11 ms after it. Both comparisons missed the limit.
Half of the twelve slowest saves waited while an import transaction was in progress. The other half need separate explanations.
The slower control had four saves queued behind unusually slow transactions even with the importer off.
The next test uses 16, 24 and 32 facts per transaction and lets ready saves go first.
The target is 3,000 facts per second that readers can see, with every neighbour's slow saves and reads within 1.5 times its control.

## Overnight bare metal

| Facts/frame | Quiet save/read p99 ms | Bulk hold p50/p99 ms | Native apply p50/p99 ms | Bulk overlap in 12 slowest saves, ms | GC overlap count gateway/transactor | Index adoptions in arm / overlap count |
|---|---:|---:|---:|---|---:|---:|
| 0 before | 21.31 / 4.86 | — | — | 0 | 1 / 1 | 2 / 0 |
| 128 | 48.58 / 30.07 | 10.08 / 28.52 | 3.43 / 19.80 | 6, 10.59–34.46 | 6 / 5 | 49 / 0 |
| 500 | 88.05 / 32.16 | 42.62 / 76.93 | 18.20 / 40.40 | 12, 25.60–97.06 | 15 / 13 | 53 / 1 |
| 2,000 | 223.07 / 33.66 | 181.38 / 232.18 | 84.00 / 118.00 | 12, 172.65–202.31 | 10 / 28 | 54 / 5 |
| 0 after | 10.92 / 4.01 | — | — | 0 | 3 / 3 | 2 / 0 |

- 128 facts. Saves 124/230/183 had frames applying for 28.5/29.1/28.9 ms. At p99, save 219 overlapped a 5.89-ms apply and 7.46-ms gateway GC; its gateway wait was 48.17 ms and its dispatch queue was 9.55 ms. Slow saves 263/151 had preceding live applies of 16.0/25.2 ms. Gateway prep on a different request does not establish a blocking dependency.
- Control drift. The four largest saves in the first control queued 19.25–51.93 ms behind preceding native transactions of 36.7–61.4 ms. The sixth save set p99 with 7.38 ms of queue plus 1.87 ms before native submit. The last control's two largest queued 19.18–21.69 ms; the next three overlapped gateway GC for 12.35–15.66 ms and its p99 overlapped transactor GC for 8.14 ms.
- Log-write-path parks of at least 5 ms appeared in 0/1/12 of the overlapping 128/500/2,000 frames. The latter two had observed parks of 10.00 and 12.84–14.30 ms. Native completion to gateway peer return took 1.89–2.34 / 7.10–23.29 / 26.77–44.67 ms in those frames. The originals do not split durable I/O, peer apply, and messaging per command; parks and post-native residual are the available bounds.
- GC clips for 128/500/2,000 peaked at gateway 8.19/15.95/17.21 ms and transactor 10.87/25.96/14.12 ms. Direct processor index adoptions that overlapped the tail took up to 2.00 ms at 500 and 9.98 ms at 2,000. Background indexing has minute-level completion metrics only. Overlaps are nonexclusive and guest clock bounds are 0.66–1.16 ms.
- [Evidence index](EVIDENCE5.md) includes every slow save, both JFR recordings and the offer reconciliation. [Part 4](PART4.md) preserves the older Mac controls.

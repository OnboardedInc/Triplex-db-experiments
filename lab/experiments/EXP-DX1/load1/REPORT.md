# DX-HA1 · Import in one database

The overnight server loaded 5,491 facts per second, but its quiet account's slow saves took 49 ms against 21 ms and 11 ms in the controls.
Half of the twelve slowest saves overlapped an import transaction. The slower control had four saves queued behind long native transactions.
On the Mac, 16, 24 and 32 facts per transaction yielded 844, 836 and 935 queryable facts per second.
All three widths fell short of 3,000 facts per second and had missed neighbour requests.
Every committed test frame reconciled with its original receipt and stored rows, including the backdated write whose reply was deliberately dropped.
[Single-server command and predictions](MICRO-SERVER.md)

## Overnight bare metal

| Facts/frame | Quiet save/read p99 ms | Bulk hold p50/p99 ms | Native apply p50/p99 ms | Bulk overlap in 12 slowest saves, ms | GC overlap count gateway/transactor | Index adoptions in arm / overlap count |
|---|---:|---:|---:|---|---:|---:|
| 0 before | 21.31 / 4.86 | — | — | 0 | 1 / 1 | 2 / 0 |
| 128 | 48.58 / 30.07 | 10.08 / 28.52 | 3.43 / 19.80 | 6, 10.59–34.46 | 6 / 5 | 49 / 0 |
| 500 | 88.05 / 32.16 | 42.62 / 76.93 | 18.20 / 40.40 | 12, 25.60–97.06 | 15 / 13 | 53 / 1 |
| 2,000 | 223.07 / 33.66 | 181.38 / 232.18 | 84.00 / 118.00 | 12, 172.65–202.31 | 10 / 28 | 54 / 5 |
| 0 after | 10.92 / 4.01 | — | — | 0 | 3 / 3 | 2 / 0 |

- 128 facts. Saves 124/230/183 had frames applying for 28.5/29.1/28.9 ms. At p99, save 219 overlapped a 5.89-ms apply and 7.46-ms gateway GC. Its gateway wait was 48.17 ms and its dispatch queue was 9.55 ms. Slow saves 263/151 had preceding live applies of 16.0/25.2 ms. Gateway prep on a different request does not establish a blocking dependency.
- Control drift. The four largest saves in the first control queued 19.25–51.93 ms behind preceding native transactions of 36.7–61.4 ms. The sixth save set p99 with 7.38 ms of queue plus 1.87 ms before native submit. The last control's two largest queued 19.18–21.69 ms. The next three overlapped gateway GC for 12.35–15.66 ms and its p99 overlapped transactor GC for 8.14 ms.
- Log-write-path parks of at least 5 ms appeared in 0/1/12 of the overlapping 128/500/2,000 frames. The latter two had observed parks of 10.00 and 12.84–14.30 ms. Native completion to gateway peer return took 1.89–2.34 / 7.10–23.29 / 26.77–44.67 ms in those frames. The originals do not split durable I/O, peer apply, and messaging per command. Parks and post-native residual are the available bounds.
- GC clips for 128/500/2,000 peaked at gateway 8.19/15.95/17.21 ms and transactor 10.87/25.96/14.12 ms. Direct processor index adoptions that overlapped the tail took up to 2.00 ms at 500 and 9.98 ms at 2,000. Background indexing has minute-level completion metrics only. Overlaps are nonexclusive and guest clock bounds are 0.66–1.16 ms.
- [Evidence index](EVIDENCE5.md) includes every slow save, both JFR recordings and the offer reconciliation. [Part 4](PART4.md) preserves the older Mac controls.

## Mac microframes

| Facts/frame | Committed / queryable facts/s | Mean frame interval ms | Serial hold p50/p99 ms | Median wire bytes / stored rows | Quiet save/read p99 ms | Quiet ratios before and after, save / read | Missed offers, all accounts |
|---|---:|---:|---:|---:|---:|---|---:|
| 0 before | 0 / 0 | — | — | — | 336.03 / 80.83 | — | 8 |
| 16 | 854 / 844 | 18.73 | 6.11 / 39.49 | 19,392 / 41 | 360.21 / 230.88 | 1.07× / 2.86× and 0.93× / 1.02× | 18 |
| 24 | 836 / 836 | 28.64 | 7.39 / 43.98 | 27,962 / 59 | 2,345.46 / 798.12 | 6.98× / 9.87× and 6.03× / 3.53× | 360 |
| 32 | 945 / 935 | 33.85 | 8.01 / 197.97 | 36,532 / 77 | 529.45 / 333.07 | 1.58× / 4.12× and 1.36× / 1.47× | 14 |
| 0 after | 0 / 0 | — | — | — | 389.18 / 226.38 | — | 0 |

- Gateway queue p99 for quiet saves was 153 / 1,258 / 294 ms in the 16 / 24 / 32 arms. Respectively 4 / 0 / 7 of the twelve slowest successful saves possibly overlapped a bulk hold, within the measured clock bounds. The 24-fact arm's long quiet tail persisted after bulk release.
- Each 108-second arm offered 55 saves and 55 reads per second across eleven neighbours. The importer offered about 130 frames per second, staged the next frame outside the serial lane and kept one outstanding. Ready live saves came first. Each frame was capped at 96 stored rows and 64 KiB. A 24-fact frame needs an 8-ms completion interval to reach the rate target.
- All three arms verified every committed frame, every claimed ID and final pinned row, and a near-end queryable prefix. Each proved birth, backdate, retirement and one lost reply under live writes. The direct retry returned an opaque wrapper status and the durable lookup resolved the original claim.
- The Mac controls themselves differed by 2.80× on quiet reads. The measured frontier falls short of the throughput target in every arm. Missed offers prevent a neighbour latency pass. The server command remains a prediction. [Offer tapes, role metrics and audit](EVIDENCE5.md)

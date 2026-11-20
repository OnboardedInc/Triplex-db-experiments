# Can imports leave neighbouring accounts alone?
The longer repeat found slow saves behind bulk frames, garbage collection and waits elsewhere in the write path.
At 50 saves per second, the best tested pacing setting loaded 2,137 facts per second and still slowed the quiet account.
Giving the importer its own database and writer increased loading to 5,167–5,537 facts per second.
With one PostgreSQL process the quiet account stayed within the limit, but some other accounts slowed down.
Two PostgreSQL processes on the same Mac still shared the machine’s resources. The quiet account’s slow saves took twice as long.
Splitting databases also makes cross-account queries and release order something the application has to coordinate.
One- and two-machine commands are ready. The Mac timings are diagnostic, and the full-sized decision remains open.

## Shared database

The earlier 4.72× used 60 quiet saves, so its p99 was the maximum. All ten slowest offers arrived with a bulk reply outstanding. Nine of those frames committed first. The two slowest saves took about 132 ms and waited 22 and 5 ms in the gateway queue. [Earlier report](PART3.md)

The repeat collected 540 quiet saves and 540 reads in each of three 108-second arms. The 128-fact cap loaded 3,082 facts/s. Quiet read/save p99 was 95.6/154.6 ms versus 22.4/96.8 first and 203.3/247.9 last. Control drift makes a single pooled ratio misleading. Across 2,775 bulk frames the median held 120 facts. Hold p50/p99 was 15.6/69.2 ms, native apply 4.4/39.8 ms, writer log-path parks of at least 5 ms 0/13.8 ms and native completion to peer return about 3.3/13.3 ms.

One 255 ms save overlapped a 228 ms bulk hold and 150 ms of transactor GC. A 248 ms save had no bulk hold and overlapped 145 ms of GC. Another 152 ms save overlapped a 119 ms bulk hold with 6.4 ms in native processing. The saved recording puts this delay after native completion and before peer return. The collector overflowed after saving the native recording, exact worker results and offer tapes. Gateway GC and frame preparation were unavailable, and one process-wide 736 ms index job had no attributable interval. Chunked collection fixes the overflow. Index backpressure becomes possible when new memory-index data outruns the headroom available during a merge. [Datomic capacity planning](https://docs.datomic.com/operation/capacity.html)

A frame compiles before admission, carries whole subjects, and waits behind ready live saves. One bulk frame is outstanding. W1’s bounds are 96 stored rows and 64 KiB. We adapt using dispatch-to-peer time and persist the chosen boundary before submission. DX-PREP1’s work applies to existing single-owner saves. It excludes bulk. Its eight-save groups spent about 117 ms preparing the members versus 2 ms appending. GC, catch-up and indexing can overrun a size estimate.

| Offered saves/s | Budget | Facts/s | Quiet read/save p99 ms | Ratios versus first control |
|---:|---:|---:|---:|---:|
| 50 | Control | 0 | 22.1 / 91.7 | 1.00 / 1.00 |
| 50 | 1 ms | 0 | 18.0 / 34.9 | 0.81 / 0.38 |
| 50 | 4 ms | 0 | 16.2 / 57.3 | 0.73 / 0.63 |
| 50 | 8 ms | 596 | 21.2 / 88.6 | 0.96 / 0.97 |
| 50 | 11.06 ms | 2,137 | 51.6 / 166.4 | 2.33 / 1.82 |

The 1 and 4 ms plans stopped after the smallest group repeatedly exceeded budget. At 8 ms, 206/2,842 frames exceeded budget before the plan stopped. At 11.06 ms, 416/9,050 exceeded it. The latter budget came from half of the matched control’s quiet read p99. An integer deadline fix preserves the completed cells and allows the final control to start in subsequent runs. The dedicated allowance campaign uses a quiet-alone reference.

## Independent Datomic database and transactor

| At 50 saves/s | Facts/s | Quiet read/save p99 ms | Quiet ratios vs both controls | Largest ratios across accounts vs both controls |
|---|---:|---:|---:|---:|
| Shared PostgreSQL | 5,537 | 36.4 / 124.0 | 0.89–1.26 / 0.89–1.13 | 1.79–2.51 read / 1.29–2.06 save |
| Separate PostgreSQL | 5,167 | 76.3 / 412.4 | 0.98–1.42 / 2.01–2.09 | 2.57–3.46 read / 2.17–2.21 save |

All 11,880 offered reads and saves completed exactly in each split arm. The 108-second comparison includes ten writing accounts plus the quiet one at 5 saves/s. Every account offers 5 pinned reads/s. Each importer has its own process and gateway. Shared SQL used separate SQL databases and roles. Separate SQL added 192 MiB of container budget on top of the extra writer and gateway’s 1.41 GiB. Both used one VM and disk, with different control tails and image IDs. The Datomic JARs and mounted gateway sources were bound in each run. The placement order leaves the difference between the two SQL layouts unresolved.

Account-local pins and receipts remain useful. Cross-account reads need coordinated cuts or a materialized view, and release activation needs explicit coordination across independent commit streams. The earlier move copied and verified 1,280–20,480 facts online in 2.76–18 s and fenced for 0.47–0.71 s with one three-fact delta. Extrapolating the top rung gives about 3.5–3.9 hours of live copying for 16 million facts, with two copies during overlap and a bounded final suffix. [Move evidence](../ha1/REPORT.md)

- Audit. Retrospective uses archived file hashes and exact receipt positions. Native capture binds original recording bytes to the identified role, attempt, source and slot. Each live arm verifies schedule, reads and durable receipts at exact cuts, then replays per-account metrics from the saved offers. The split child checks every original claim and every stored row. Adaptive retry checks original frame boundaries and receipts at reopen. The stack validates mounts, images and cleanup. The bench receiver verifies archive hash, revision, layout and attempt before replaying offer tapes. No acceptance pins or frozen trace changed.
- [One- and two-server commands and forecasts](ISOLATION-BENCH.md) · [Part 4 evidence checksums](PART4-SHA256SUMS) · [Part 3](PART3.md).

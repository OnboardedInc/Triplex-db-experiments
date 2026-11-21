The scorecard should pin `57580241dc4020f9ab7590839c72c00356fcedee`.
Version 0.1 has a small laptop profile and a server profile for one database.
The server gives the transactor three cores and a 16 GiB cache. The gateways get four cores for writes and one for reads.
The server defaults to Java 21 with G1. One option switches the transactor to Java 25 with ZGC.
An operator can place the PostgreSQL write-ahead log on a separate filesystem. Saves still wait for durable storage.
At full size, the best 394-offer run saved 361.51 per second and 7.23% of offers expired.
The best quiet-account tail at 620 offers took 2.29 times as long under load.
The Mac verified the laptop checks and a reduced-memory server startup. The fresh and billion-record scorecards still need bare metal.

## Gates

| Gate | Result |
| --- | --- |
| Laptop SDK and package checks | Nine build tasks and both typechecks. 439 SDK tests passed and 53 were skipped in each writer mode. 18 focused tests passed. |
| Laptop native | 27 tests and 54,079 assertions for each writer. The grouped and ordered restart cases checked two synchronous flushes each, both resend responses and retired IDs. |
| Laptop erasure | Each writer checked all 13 routes, including journal, feed, pinned reads and backup restore. |
| Laptop playground | Each writer passed 17 API cases, Chromium and separate native journal checks. The restored PostgreSQL dumps matched 928 grouped and 958 ordered rows. |
| Laptop scorecard toy | Each writer matched 211 receipts, 96 quiet reads and 20 cold pulls. The ordered journal matched 211 ID blocks. |
| Reduced Mac server startup | Actual Java 21.0.13+9 G1 across transactor, writer and reader. Final processor counts 3/4/1, max heaps 640/352/352 MiB and caches 64/32/32 MiB. All PostgreSQL durability switches were on. |
| Preflight | Same-device, nonempty, malformed and unavailable-device WAL inputs were rejected in the shell fixture. Separate-device input chose the WAL bind and initdb setting. |

The reduced startup used the shared server policy with laptop memory and the Mac reservation's two-core Docker quota per container. The Linux run still needs to verify physical placement, the full cache budget and the combined Java 25 ZGC and separate-WAL startup. The startup, SDK, native, playground and toy gates ran at `42ecd1420`. Erasure ran at `6d5edfc35`. The WAL shell checks, final launch plans and scale typecheck cover the follow-up launch changes through `9066ad9e1`. Earlier Mac refusals involved disk admission, cleanup with another owned slot still active, and a transient Docker build failure. [Evidence checksums](V0.1-SHA256SUMS)

## Evidence audit

The startup witness checks final HotSpot flags, pinned releases, cache arguments and live SQL switches. It reads fresh logs between two observations of the same process and binds the result to exact source bytes, image and reservation. The physical launcher verifies the empty WAL directory and devices before startup, then checks the live mount and PostgreSQL settings. The scorecard rechecks the three serving JVM boots after restore. The integrated campaign collector checks the source-bound policy, final flags, image IDs and capture window before classifying observations. All 521 pins and the frozen inputs matched their recorded digests.

The launch and Mac gates are indexed in the [version 0.1 state table](V0.1-STATE.md). The physical comparison used ten 100,000-person accounts, fair turns and 1,900 people per busy neighbour. The scorecard retains its own tapes. Select `--tx-jvm j25-zgc` and `--wal-directory DIR` for the combined server treatment. [Server command](../v01/SERVER.md)

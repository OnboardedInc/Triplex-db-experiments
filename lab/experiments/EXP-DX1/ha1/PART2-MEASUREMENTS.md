# Local recovery observations

All times are diagnostics from a shared VM. Original bytes, input digests, source revision, slot and cleanup are indexed by attempt. [Evidence index](PART2-EVIDENCE.md) · [Checksums](PART2-SHA256SUMS)

## Transactor loss

Each cell starts with a real completed index request. Tail cells then append up to 128 subjects of 160 facts each. The tail column counts authored application facts committed after the serving peer’s index basis immediately before kill dispatch. Each rate covers the 1.6-second pre-fault offer interval. Native replay is shown only when the elected role’s log tail resolves to an exact checked operation in the recovered database.

| Attempt | Seed facts | Load | Writes/s | Unindexed facts | Broker / sync / new receipt (s) | Native replay MiB / s | Pin successes / errors | First touch / repeat (ms) |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 6ec202c9 | 10,240 | indexed-light | 4.9 | 80 | 13.014 / 13.694 / 14.332 | — | 148 / 0 | 35.18 / 27.65 |
| 6ec202c9 | 10,240 | indexed-burst | 53.9 | 890 | 8.425 / 14.290 / 14.597 | — | 150 / 0 | 24.10 / 21.74 |
| 6ec202c9 | 10,240 | tail-light | 5.5 | 10330 | 10.624 / 16.602 / 16.815 | — | 171 / 0 | 22.87 / 25.11 |
| 6ec202c9 | 10,240 | tail-burst | 111.9 | 12060 | 9.391 / 14.779 / 16.066 | — | 166 / 0 | 17.51 / 18.40 |
| ac53471b | 163,840 | indexed-light | 5.5 | — | 6.986 / 8.182 / 8.499 | — | 83 / 0 | — |
| ac53471b | 163,840 | indexed-burst | 51.4 | — | 9.715 / 15.755 / 16.895 | — | 145 / 0 | — |
| ac53471b | 163,840 | tail-light | 4.2 | — | 13.109 / 20.234 / 20.809 | — | 176 / 0 | — |
| ac53471b | 163,840 | tail-burst | 82.9 | — | 14.817 / 23.633 / 24.954 | — | 223 / 0 | — |
| 5278c53b | 2,078,720 | indexed-light | 5.5 | 90 | 13.666 / 19.250 / 19.781 | 0.163 / 0.016 | 205 / 0 | 31.37 / 30.83 |
| 5278c53b | 2,078,720 | indexed-burst | 95.6 | 1560 | 6.965 / 8.293 / 8.570 | 2.868 / 0.129 | 90 / 0 | 20.64 / 54.45 |
| 5278c53b | 2,078,720 | tail-light | 5.5 | 4250 | 8.980 / 9.958 / 10.777 | 7.356 / 0.317 | 112 / 0 | 32.01 / 20.08 |
| 5278c53b | 2,078,720 | tail-burst | 109.8 | 5940 | 7.494 / 12.584 / 13.979 | 10.483 / 0.375 | 147 / 0 | 27.38 / 25.43 |
| 3e77594d | 2,923,520 | tail-burst | 65.0 | 21580 | 13.209 / 17.661 / 21.999 | 37.218 / 2.216 | 162 / 0 | 99.59 / 125.99 |

First touch and repeat use the same previously unsampled subject on the surviving reader, at the held basis. When the reach route declines, the public row route verifies the complete subject. The raw cell records both the path and gateway cache counters. Earlier envelopes also contain a legacy scheduler scope count. Actual physical population and per-tenant work are in the trial’s database and population records. Election detection, native catch-up and client retry can overlap. Broker-to-ACK is an upper envelope for the remaining work.

## Backup and WAL

The denominator is one million **seeded application facts**. Each ratio includes fixed cluster files, PostgreSQL WAL in the base or a fresh vendor CLI process. The amounts are direct normalizations of a small run. They cannot be used as a linear production capacity slope. A restore is measured from starting recovery on the second site through the first correct new client receipt. Source removal, human detection, provisioning a physical machine and external archive download would add time.

| Trial | Seed facts | Full Datomic MB / s per million | PG base MB / s per million | Datomic storage / client s per million | PG storage / client s per million |
| --- | ---: | ---: | ---: | ---: | ---: |
| 6d645aeb | 10,240 | 49.09 / 747.53 | 4850.43 / 42.87 | 960.81 / 2860.98 | 55.03 / 2131.58 |
| 70413428 | 163,840 | 139.28 / 49.59 | 575.25 / 7.64 | 64.83 / 205.74 | 8.99 / 157.68 |

| Trial | Live Datomic delta bytes / seconds | Facts newly in delta | WAL payload / archived bytes | Last segment switch (ms) | Recovery point |
| --- | ---: | ---: | ---: | ---: | --- |
| 6d645aeb | 96,208 / 7.331 | unrecorded | 1,040,960 / 50,331,648 | 237.15 | Receiver stopped after confirming the completed segment. |
| 70413428 | 92,699 / 7.735 | 1891 | 1,516,760 / 50,331,648 | 406.07 | Receiver streaming at failure. The next segment was partial. |

| Trial | Live activity | Complete writes in interval | Ten-fact commit p50 / p99 (ms) | Writes/s |
| --- | --- | ---: | ---: | ---: |
| 6d645aeb | ordinary | 26 | 21.22 / 65.37 | 14.4 |
| 6d645aeb | pgBase | 6 | 24.03 / 59.59 | 13.7 |
| 6d645aeb | datomicFull | 129 | 15.43 / 35.26 | 16.9 |
| 6d645aeb | datomicDelta | 128 | 12.89 / 36.41 | 17.5 |
| 70413428 | ordinary | 30 | 11.27 / 127.35 | 16.7 |
| 70413428 | pgBase | 19 | 13.09 / 88.54 | 15.2 |
| 70413428 | datomicFull | 151 | 10.97 / 42.55 | 18.6 |
| 70413428 | datomicDelta | 147 | 10.36 / 26.75 | 19.0 |

Across 153,600 additional seeded facts, the observed increase per additional million was 145.30 MB for Datomic and 290.24 MB for the PostgreSQL base. Size and CLI startup dominate different parts of these short runs.

For `70413428`, stopping and isolating the original source took 1.041 seconds. Adding physical restore gives 26.875 seconds from the kill to a new PostgreSQL-backed application receipt. The Datomic restore was measured independently from its own fresh start after the physical trial.

In `70413428`, the Datomic incremental backup added 49.0 bytes per changed application fact, or 49.0 MB per million at this particular cut. The recorded cut covered 1,891 newly backed-up facts. The full backup cut contained 164,961 facts, giving 138.34 MB and 49.25 seconds per million at that exact cut.

The asynchronously archived WAL count includes whole 16 MiB segments. Some bytes predate the measured payload. PostgreSQL physical recovery returns the entire cluster. Datomic backup returns the selected database. The losing policy and its native cut are part of each recovery record.

## Planned movement and synchronous replication

| Trial | Move | Seed facts | Live copy (s) | Fence to first write (s) | Detail |
| --- | --- | ---: | ---: | ---: | --- |
| 33e4ae80 | Account | 1,280 | 20.031 | 3.946 | Verified 15 commands before fence and 1 after it. Neighbor acknowledged at 1.070 s. |
| 3f5b6862 | Account | 1,280 | 5.624 | 0.707 | Verified 16 commands before fence and 1 after it. Neighbor acknowledged at 0.188 s. |
| 0c44903d | Account | 1,280 | 2.762 | 0.467 | Verified 16 commands before fence and 1 after it. Neighbor acknowledged at 0.054 s. |
| b5968724 | Account | 20,480 | 18.003 | 0.620 | Verified 136 commands before fence and 1 after it. Neighbor acknowledged at 0.101 s. |
| ed263949 | Whole | 10,240 | 0.930 | 15.472 | Flush 0.300 s, promotion 0.261 s, transactor 13.646 s, first pinned read on B 0.041 s. 17 writes during base copy. |
| 05b4e293 | Whole | 235,280 | 1.358 | 15.616 | Flush 0.254 s, promotion 0.273 s, transactor 13.531 s, first pinned read on B 0.057 s. 25 writes during base copy. |

Tenant trial `3f5b6862` occupied 85.82 MB in the two PostgreSQL data directories at the end of seeding and 86.20 MB after the post-cut audit. The figures include both clusters, WAL and concurrent neighbor writes.

Tenant trial `0c44903d` occupied 85.80 MB in the two PostgreSQL data directories at the end of seeding and 86.15 MB after the post-cut audit. The figures include both clusters, WAL and concurrent neighbor writes.

Tenant trial `b5968724` occupied 92.22 MB in the two PostgreSQL data directories at the end of seeding and 133.76 MB after the post-cut audit. The figures include both clusters, WAL and concurrent neighbor writes.

Trial `7f58b5b7` recorded 16 balanced blocks of 512 ten-fact commits. The local-only block p99 range was 34.97–199.83 ms. Remote-flush blocks measured 42.21–84.75 ms. The slowest individual writes were 649.69 and 5026.71 ms, respectively. The new receipt after primary loss took 23.933 s. Promotion left one copy until a replacement standby could be added.

The mixed physical move used 1,024 deep subjects, 8,880 wide subjects and 5 small-account subjects in 18 tenant namespaces. Before the fence, 150 writes completed during destination preparation. The largest such commit took 194.4 ms, and the observed replay lag at admission was 0 bytes.

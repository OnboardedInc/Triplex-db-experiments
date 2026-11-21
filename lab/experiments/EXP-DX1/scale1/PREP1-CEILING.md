# Full-size ordered writer ceiling

Ten accounts of 100,000 people shared one Datomic database with 162,456,470 current facts, starting at cut 87,002. Each cell ran for 90 seconds. The quiet workload offered 315 saves in every cell. Each loaded neighbour offered across 1,900 distinct people. The trial used one write gateway. The controls used matched quiet tapes and disjoint neighbour bands, in the order shown. Cache state could carry across cells.

The ordered writer delivered at most 278.08 saves/s in a 90-second loaded cell. Throughput fell short of all four forecasts. With fair turns at 620/s, the quiet ratio was 1.34× against the 1.25× bar. The 900/s fair-turn cell had a 0.96× ratio with 73.2% of offers expired and 199.28 ms absolute quiet p99. Every quiet cohort completed all 315 saves. Full-size 394/s, quiet reads and feed isolation remain unmeasured by this arm.

| Offered/s | Fair turns | Forecast saves/s | In-window saves/s (n) | Expired (n offered) | Quiet solo → loaded p99, ms (n per side) | Ratio | ACK drain, s |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 620 | off | 450 | 278.08 (25,027) | 30,512 (55,800) | 131.89 → 1861.21 (315) | 14.11× | 1.73 |
| 620 | on | 350 | 274.28 (24,685) | 30,930 (55,800) | 167.18 → 224.61 (315) | 1.34× | 1.04 |
| 900 | on | 380 | 238.10 (21,429) | 59,259 (81,000) | 206.70 → 199.28 (315) | 0.96× | 1.05 |
| 900 | off | 520 | 240.71 (21,664) | 58,850 (81,000) | 115.98 → 1150.09 (315) | 9.92× | 1.22 |

Append rates count native blocks completed during the offer window. Append latency and saves per append include the drain. Old-format groups count a save with at least one original seed predecessor. New-format groups contain saves with only ordered predecessors. The SQL counters are scoped to the transactor thread.

| Cell | Saves/append | Appends/s in window | Append call p50 / p99 / max, ms (n) | SQL reads/save with seed predecessor (n) | SQL reads/save with ordered predecessors (n) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 620-off-alone | 1.000 | 3.50 | 0.586 / 62.735 / 88.159 (315) | 2.575 (315) | unmeasured (0) |
| 620-off-loaded | 1.126 | 247.13 | 0.412 / 3.788 / 228.285 (22,468) | 1.839 (18,287) | 0.621 (7,001) |
| 620-on-alone | 1.000 | 3.50 | 0.363 / 69.910 / 111.375 (315) | 2.546 (315) | unmeasured (0) |
| 620-on-loaded | 1.059 | 258.78 | 0.379 / 1.928 / 206.815 (23,475) | 1.895 (18,220) | 0.582 (6,650) |
| 900-on-alone | 1.000 | 3.50 | 0.361 / 67.968 / 242.569 (315) | 2.403 (315) | unmeasured (0) |
| 900-on-loaded | 1.009 | 236.39 | 0.379 / 1.572 / 196.751 (21,557) | 2.094 (17,795) | 1.693 (3,946) |
| 900-off-alone | 1.006 | 3.48 | 0.350 / 66.230 / 81.808 (313) | 2.152 (315) | unmeasured (0) |
| 900-off-loaded | 1.031 | 233.39 | 0.438 / 3.843 / 257.559 (21,491) | 1.970 (17,860) | 1.863 (4,290) |

All three JVMs used G1. The transactor, write gateway and read gateway had 1, 4 and 1 available cores. Their wall-clock pause and safepoint logs are in the bundle. The checker hashed the write gateway log before clean shutdown added 836 bytes. The archive retains the full file and records its byte-exact 2,156,206-byte checked prefix. The derived append table joins the verified durable receipts to the original trace blocks by native transaction ID and matches the collector p99 before adding the p50, maximum and in-window append counts.

Source `1dd5952cbc1b11251619a83a25e85be885edd588`. Build through cleanup took 18 minutes 53 seconds (USD 0.34). All eight cells, raw ledgers, pause logs and scoped cleanup were archived. The optional WAL repeat was deferred to keep the scorecards and AGE1 moving. The current published full-size command lacks a 620-only second-drive treatment on this mounted device. [Archive checksum](evidence/prep-v01-ceiling-physical.sha256)

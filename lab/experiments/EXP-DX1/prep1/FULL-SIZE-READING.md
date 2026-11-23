# Full-size writer limit and the matched follow-up

Ten accounts of 100,000 people shared one database with 162,456,470 facts. One write gateway served neighbours spread across 1,900 people each. The stopped PostgreSQL copy reopened cut 87,002. The archive came from `1dd5952cbc1b11251619a83a25e85be885edd588` and matches SCALE1 source `522633169`. The recount verified the archive, member hashes, checked log prefix, plan, source, slot and attempt before joining receipts to native blocks. [Original ceiling plan](CEILING.md) · [Evidence checksums](SHA256SUMS)

| Loaded arm | In-window saves/s | Expired | Quiet solo → loaded p99, ms | Saves/append · appends/s | Native apply mean / p50 / p99, ms/save | Apply / append / either, % of window |
| --- | ---: | ---: | --- | --- | --- | --- |
| 620, fair off | 278.08 | 30,512 / 55,800 | 131.89 → 1,861.21 · 14.11× | 1.126 · 247.13 | 3.34 / 2.54 / 14.23 | 92.71 / 21.40 / 96.65 |
| 620, fair on | 274.28 | 30,930 / 55,800 | 167.18 → 224.61 · 1.34× | 1.059 · 258.78 | 2.51 / 2.28 / 6.87 | 69.05 / 19.58 / 74.84 |
| 900, fair on | 238.10 | 59,259 / 81,000 | 206.70 → 199.28 · 0.96× | 1.009 · 236.39 | 3.03 / 2.48 / 6.49 | 73.19 / 18.41 / 78.22 |
| 900, fair off | 240.71 | 58,850 / 81,000 | 115.98 → 1,150.09 · 9.92× | 1.031 · 233.39 | 3.89 / 2.76 / 10.85 | 94.92 / 21.40 / 97.03 |

| Loaded arm | SQL reads/save overall · seed / ordered predecessor | SQL + decode mean, ms/save | EAVT / AEVT / AVET loads per save | Gateway prepare p50 / p99, ms | Sender wait p50 / p99, s | Transactor / writer / reader GC CPU, s in 90 s |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 620, fair off | 1.501 · 1.839 / 0.621 | 1.68 | 0.872 / 1.176 / 0 | 1.49 / 25.01 | 39.08 / 49.61 | 11.46 / 13.58 / 0.26 |
| 620, fair on | 1.544 · 1.895 / 0.582 | 1.50 | 0.857 / 1.088 / 0 | 1.99 / 25.28 | 32.00 / 49.98 | 7.05 / 11.58 / 0.24 |
| 900, fair on | 2.021 · 2.094 / 1.693 | 1.89 | 1.077 / 1.500 / 0 | 2.25 / 26.91 | 39.03 / 66.90 | 9.04 / 11.88 / 0.20 |
| 900, fair off | 1.950 · 1.970 / 1.863 | 2.21 | 1.067 / 1.318 / 0.0005 | 1.53 / 19.95 | 43.48 / 66.26 | 10.11 / 13.82 / 0.22 |

The offered window clips the union of native compute and append spans. Those spans can overlap and include waits. The transactor was pinned to one core and G1 logged 7.05–11.46 CPU seconds per loaded cell, or about 8–13% of that core's 90-second budget. These are GC CPU seconds only. The original archive has no process CPU counter for the whole transactor. Largest transactor safepoints were 210–257 ms under load. The runner now captures cgroup CPU over each offer and drain interval, excluding the journal verification pass.

**Read causes.** `sql` counts persisted fetches. Index load counts overlap and can exceed SQL reads, so they cannot be added or treated as per-call causal counts. [Lookup inventory and instrumented small diagnostic](LOOKUP-READING.md)

| Earlier lookup category | Full-size evidence |
| --- | --- |
| Owner revision CAS, numeric owner identity and exact predecessor or retirement | These can share EAVT pages. EAVT registered 0.86–1.08 loads/save in the busy cells. First seed predecessors cost more SQL at every rate. The archive cannot separate CAS from business-row, function or scope EAVT loads. |
| Native assertion and retirement redundancy, native revision redundancy | These can share AEVT pages. AEVT registered 1.09–1.50 loads/save. The earlier per-lookup diagnostic assigned most of its native fetches here. This trace also contains AEVT access for position and excision, with no key-specific counts. |
| Historical range, operation and command uniqueness, journal resolution, and native unique-value checks | AVET loads were zero in three busy cells and 11 across 22,150 saves in the last. There is no signal here like the earlier scattered-ID AVET effect. Those calls still check correctness. |
| Scope and function identity, logical clock and position, and dispatch | These share EAVT, AEVT and in-memory schema paths with the categories above. The archived trace has neither the lookup keys nor separate bounds for their SQL reads. |

**What bounds it.** Without fair turns, mean apply used 3.34–3.89 ms/save out of the observed 3.60–4.15 ms per delivered save. SQL and decoding consumed 1.68–2.21 ms/save within apply. Most append time overlapped apply. The drive took 0.38–0.44 ms at its median append and 0.76–0.91 ms on average. Near-one-save batches make that cost visible at 233–259 appends/s, but the disk was inside append for about one fifth of the window. With fair turns, the sender waits for all six receipts before issuing its next turn. Its effective turn took about 22–25 ms, and append-plus-apply occupied 75–78% of the window. The remaining time includes gateway work, the receipt path and turn admission. Median handoff from predecessor-ready to submit was 0.005–0.006 ms. Native entry p99 with fair turns was at most 0.024 ms. The tens of seconds of sender queue describe overload. They do not establish slow gateway preparation. To deliver 394/s, the pipeline needs 2.54 ms per save, or at most 15.23 ms for a six-save turn. More cache can remove storage and decode time. Extra cores can service JVM, index and I/O work around apply. Separate WAL and ZGC target tails and may reduce turn stalls. These are hypotheses for the matched arms.

## Server 2 follow-up

From a built, clean pinned checkout use the `scale` command in the report. Allow 18 minutes of offers and up to 45 minutes total, including three independent file copies, readback and teardown. The earlier eight-cell copy run took 18:53 from build to cleanup with 12 minutes of offers. Forecast 38–42 minutes with local images and the mounted drive ready. Each arm offers 315 quiet saves alone and the identical 315 beside nine neighbours at each rate. Each loaded neighbour spans 1,900 people. The arms share the same age, input commands and order. Loads are 394 then 620, and every arm uses six-credit fair turns.

The base arm uses a 2 GiB transactor object cache and one core. The cache arm uses 16 GiB and three physical cores. The third uses that cache and placement plus Java 25 ZGC on the transactor and separate WAL. All use a 24 GiB transactor heap. The existing gateway allocation stays at four writer cores and one reader core to hold those roles constant, and PostgreSQL stays on one core. Gateways remain on Java 21 G1. The upgraded transactor uses cores 0, 7 and 8. The driver must have CPUs 0–8 available as nine distinct physical cores. JDK25 may use the pinned local image or a receipt via `DX_PREP1_JAVA25_RECEIPT`.

| Arm | Gross offers/s | Window | Delivered/s forecast | Quiet p99 forecast, ms | Loaded/solo ratio | SQL reads/save forecast |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Base | 394 | Alone | 3.5 | 135 | 1.00× | 2.50 |
| Base | 394 | Loaded | 277 | 189 | 1.40× | 1.55 |
| Base | 620 | Alone | 3.5 | 155 | 1.00× | 2.50 |
| Base | 620 | Loaded | 273 | 217 | 1.40× | 1.55 |
| 16 GiB + 3 cores | 394 | Alone | 3.5 | 91 | 1.00× | 1.50 |
| 16 GiB + 3 cores | 394 | Loaded | 365 | 137 | 1.50× | 0.45 |
| 16 GiB + 3 cores | 620 | Alone | 3.5 | 100 | 1.00× | 1.50 |
| 16 GiB + 3 cores | 620 | Loaded | 405 | 150 | 1.50× | 0.58 |
| 16 GiB + 3 cores + WAL + ZGC | 394 | Alone | 3.5 | 21 | 1.00× | 1.50 |
| 16 GiB + 3 cores + WAL + ZGC | 394 | Loaded | 394 | 28 | 1.32× | 0.45 |
| 16 GiB + 3 cores + WAL + ZGC | 620 | Alone | 3.5 | 20 | 1.00× | 1.50 |
| 16 GiB + 3 cores + WAL + ZGC | 620 | Loaded | 440 | 34 | 1.68× | 0.58 |

The 394-point throughput forecast for the third arm assumes the larger cache removes roughly one fetch per save and append and safepoint tails fall with the small-seed treatments. These arm data will separate that prediction from the fair-turn wall time limit. A full 394 requires zero expiries and 35,460 durable saves after drain as well as the in-window rate. A quiet expiry withholds the all-offer p99 and ratio.

**Driver handoff for WAL.** Supply the existing, mounted and reserved ext4 filesystem on the second NVMe as `SCALE1_WAL_MOUNT` and the cleanly stopped, self-contained original PostgreSQL 17 template as `SCALE1_PGDATA`. Allow room for one disposable full copy under Docker storage plus scratch WAL on the mounted drive. The launcher opens the held template read-only and creates a new private volume for each arm. In the last arm it moves only that stopped copy's `pg_wal` to a fresh directory on the second drive, compares the WAL file hashes, sets ownership for PostgreSQL, links `pg_wal` to `/wal/pg_wal`, verifies the link, checks both devices and flushes before start. The running cluster must read back that same link and location with `fsync`, `synchronous_commit` and `full_page_writes` on. Cleanup removes the owned private volume and WAL directory after the stack is down. The driver retains the original template and the existing mount.

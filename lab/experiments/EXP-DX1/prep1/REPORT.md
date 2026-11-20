Not yet. The per-person writer reached 111 of 394 offered saves/s in one database. The lookup-only hint preserved correctness but failed to take most storage reads off the serial thread.
The five-arm server comparison uses source `d3bd6a8b3e6924ebf5c1b53e77a5ca2d78d6b2f2`.
Run `DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-PREP1-storage -- bash lab/experiments/EXP-DX1/prep1/server.sh storage "$OUT" d3bd6a8b3e6924ebf5c1b53e77a5ca2d78d6b2f2 "$SEALED"`.
Set `SEALED` to the earlier comparison’s sealed campaign directory and `OUT` to a new absolute directory. The hard limit is 89 minutes 20 seconds.
The comparison uses one gateway, the same ten-account seed and the same saves at 235 and 394 offers/s. It measures the quiet account alone and beside nine neighbours.
Historical assertion ID probes fetched at least half of the storage reads in the small-cache SQL trace. The owner revision check fetched about one segment per save.
With native prefetch enabled, the hint arm fetched 976 segments against 457 without hints. The 32 MiB Mac fixture does not establish the effect at server cache sizes.
The fifth arm changes only the old per-person writer’s object cache from 2 to 16 GiB. It can show whether cache alone takes the reads off the critical path.

**North star.** Durable, exact small saves and quiet-account tails in one database. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Why reads happen.** The Mac trace reconciled 106 K and 674 S fetches to stock native counts. K’s were all native AEVT row/retirement redundancy. S’s historical AVET check accounted for 350 fetches within its span, owner CAS for 95, and another 60 appeared under lazy AVET iteration. Operation and command point checks fetched no SQL on this tape. Three unscoped S EAVT entity keys were unavailable. In the earlier server run, the grouped arm reached 179.5 and 181.7 saves/s and the per-person arm reached 140.6 and 111.1 at 235 and 394 offered. [Lookup table](LOOKUP-READING.md) · [Server reading](SERVER-READING.md)

**What changed.** `TX2_SUBJECT_PREFETCH=1` adds a lookup-only Datomic hint to numeric-owner S. The authoritative transaction, installed writer hash, scope/erasure checks, CAS, claims and ordinary business/journal rows use the prior path. The timing field records hint preparation separately and the receipt can report whether a hint was attached. An attached hint says nothing about its hit rate. [Dependency argument and forecasts before implementation](LOOKUP-PLAN.md)

**Hint diagnostic.** In the first pair, both arms saved 96 changes and all hinted saves attached hints. Stock SQL counts were 771 without and 746 with hints. In the repeat, the transactor read back native prefetch enabled on one CPU and counts were 457 without and 976 with hints. Historical AVET alone rose from 337 to 722. VM CPU PSI avg10 was 9.15–15.65% without and 9.61–30.30% with hints in the repeat. The initial forecast of moving 60–75% of the I/O is unsupported. The functioning read-free apply and ≤0.5 ms target remain open. [Checksums](SHA256SUMS)

**Server controls.** Each arm restores and verifies the sealed seed. All use one gateway, the same CPU placement, native prefetch enabled, 24 GiB transactor heap and 30 GiB transactor container limit. The four 60-second cells per arm have matched quiet arrivals and identical field inputs. The collector seals stage clocks, native reads, journal receipts and the three JVM logs.

| Arm | 235 / 394 loaded forecast saves/s | Quiet p99 solo → loaded at 235 / 394 (ms) | Loaded native apply ms / SQL reads per save at 235 and 394 |
| --- | --- | --- | --- |
| Grouped K | 180 / 182 | 119 → 341 / 37 → 294 | 0.19 / 0.05 and 0.19 / 0.05 |
| Original S | 141 / 111 | 63 → 1,169 / 17 → 1,474 | 6.91 / 11 and 8.62 / 10 |
| Numeric-owner S | 146 / 115 | 63 → 1,120 / 17 → 1,430 | 6.41 / 10.3 and 8.12 / 9.3 |
| Numeric-owner S with prefetch | 125 / 100 | 73 → 1,320 / 20 → 1,690 | 7.0 / 11.3 and 8.7 / 10.3 |
| Original S with 16 GiB cache | 210 / 185 | 35 → 700 / 12 → 880 | 2.1 / 2.2 and 3.6 / 2.2 |

Solo cells forecast 3.5 saves/s. K under load forecasts eight saves per append and all other cells one. Loaded forecasts have expiries, which leave the complete-cohort p99 unavailable. The generated plan includes numbers for all 20 cells.

**Local gates.** The hinted numeric-owner writer passed 8 SQL native tests and 762 assertions, including a real competing write after hint generation. The restart gate interrupted the reply after the synchronous native commit. The original operation and command resolved to the same original receipt, and the pinned, native and journal queries matched. Eight TypeScript unit tests and strict type checking passed. The simulated producer and collector matched 3,185 fixture offers to durable receipts and rejected a changed cache profile. The physical campaign is unrun here.

**Evidence audit.** The probe checks exact acknowledgements, journal changes and pinned bytes for the fresh fixture. Its collector binds stage hashes, image, reservation, attempt, database and native t to the exact apply interval. The SQL restart gate binds the hint, source and flushes to matching receipt bytes. The launcher checks the original seal and owned resource cleanup. The server producer checks writer options and exact feed; its collector checks the bound tape, accepted receipt, native append, fresh JVM identity, cache/heap readback and tape positions before publication. No acceptance pins moved. [Checksums](SHA256SUMS)

The per-person writer has yet to reach 394 saves/s in one database. It acknowledged 111.1 saves/s at 394 offered, and its native apply averaged 8.62 ms per save.
The grouped writer acknowledged 181.7 saves/s under the same load.
At 235 offered, the grouped writer reached 179.5 saves/s and the per-person writer reached 140.6.
The per-person writer's 235-load median was 6.15 ms and 11 SQL reads per save. The earlier 4.01 ms and eight reads describe one row.
At 50 offered, both kept up. The per-person writer's worst account had a 1,568 ms p99.
All 136 of its replies over one second came from offers in seconds one through four, and most of their time was spent waiting to enter Datomic.
The copied archive has neither arm's JVM pause logs or raw append trace. It leaves the cause of the early stall and the per-person saves per append open.
The copy is missing the last per-person solo cell and its terminal summary. All offered rows and receipts below refer to copied cells.

**North star.** Durable, exact per-person saves and quiet-account tails. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Source and scope.** Both arms use one gateway, source `7ca8525a9`, the same 16,245,050-fact, ten-account seal and a 144-second window per cell. `read-early.py` reopens archive SHA-256 `55efa10fd2c44689ceb5d09db2cd20906150d03d66a42a75c6c42d009ef89b90`, matches every extracted member to its archive bytes and each cell to its saved tape, source, database, options and cut. It matches ACKs to operation, receipt, native transaction and clock, and cross-checks K against the server collector's hashed inputs and terminal scope. S is a bound prefix of producer-verified rows. The independent terminal collector for S is outstanding. These are experiment observations. [Checksums](SHA256SUMS)

**Native apply and storage.** Each distribution is p50 / p99 / mean per acknowledged logical save. K repeats one telemetry sample for each member of a transaction, so divide each observed transaction metric by its reported group width before weighting by its acknowledged saves. SQL is the storage read count. Decode is deserialize wall time in ms. The saved JSON also has SQL time, AVET loads, other quantiles and per-transaction statistics. Solo cells all offered 504 saves at 3.5/s. For loaded cells the rate in the label is gross offered.

| Arm / cell | Offered | In-window ACK/s | Expired | Native apply ms | SQL reads | Decode ms |
| --- | ---: | ---: | ---: | --- | --- | --- |
| K 50 alone | 504 | 3.5 | 0 | 11.01 / 57.29 / 14.34 | 13 / 23 / 13.39 | 4.36 / 10.12 / 4.76 |
| K 50 loaded | 7,200 | 50.0 | 0 | 4.99 / 16.00 / 4.84 | 8 / 17 / 6.97 | 2.54 / 5.58 / 2.21 |
| K 235 alone | 504 | 3.5 | 0 | 9.36 / 93.34 / 12.48 | 13 / 26 / 13.61 | 4.55 / 11.31 / 5.31 |
| K 235 loaded | 33,840 | 179.5 | 7,715 | 0.15 / 0.70 / 0.19 | 0 / 0.75 / 0.04 | 0 / 0.25 / 0.02 |
| K 394 alone | 504 | 3.5 | 0 | 9.46 / 24.93 / 10.81 | 14 / 24 / 14.90 | 5.50 / 9.22 / 5.72 |
| K 394 loaded | 56,736 | 181.7 | 30,303 | 0.14 / 0.68 / 0.18 | 0 / 0.62 / 0.03 | 0 / 0.25 / 0.01 |
| K 620 alone | 504 | 3.5 | 0 | 9.33 / 38.83 / 11.34 | 14 / 23 / 14.79 | 5.70 / 9.15 / 5.86 |
| K 620 loaded | 89,280 | 171.9 | 64,276 | 0.16 / 0.89 / 0.24 | 0 / 1.25 / 0.09 | 0 / 0.46 / 0.03 |
| S 50 alone | 504 | 3.5 | 0 | 7.29 / 66.24 / 9.83 | 10 / 25 / 10.74 | 3.53 / 9.68 / 3.93 |
| S 50 loaded | 7,200 | 50.0 | 0 | 5.73 / 41.29 / 7.12 | 9 / 18 / 9.64 | 2.93 / 7.77 / 3.24 |
| S 235 alone | 504 | 3.5 | 0 | 6.30 / 57.96 / 7.14 | 10 / 17 / 10.15 | 3.87 / 6.66 / 3.93 |
| S 235 loaded | 33,840 | 140.6 | 13,351 | 6.15 / 18.24 / 6.91 | 11 / 19 / 11.00 | 3.36 / 6.75 / 3.57 |
| S 394 alone | 504 | 3.5 | 0 | 6.36 / 11.33 / 6.60 | 10 / 17 / 9.77 | 4.06 / 7.04 / 4.06 |
| S 394 loaded | 56,736 | 111.1 | 40,485 | 7.24 / 56.69 / 8.62 | 10 / 20 / 10.00 | 3.09 / 7.66 / 3.51 |
| S 620 alone | | | | pending | | |
| S 620 loaded | 89,280 | 140.1 | 68,903 | 5.46 / 55.96 / 6.86 | 8 / 17 / 8.68 | 2.67 / 6.99 / 3.04 |

**Serial point.** In the loaded 235 / 394 / 620 cells, all sends got receipts. K had 26,125 / 26,433 / 25,004 logical receipts on 3,276 / 3,309 / 3,127 native transactions. S had 20,489 / 16,251 / 20,377 receipts, one per native transaction, with zero replans. The in-window ACK rate is a lower bound on same-window native completions. Receipt totals include the drain and the copied rows lack independent native completion wall stamps. K's terminal collector gives 7.97 / 7.99 / 8.00 saves per append. S's one-save transactions could still share an append, so its saves per append remain unknown. At 235, K's median group had 8 saves, 225 datoms, 1.18 ms of apply and zero SQL reads, with reads on 358 of 3,276 transactions. S had 24 datoms, 11 SQL reads, 10 AVET loads and 1.70 ms SQL at the median. Only one of the 65,829 prepared transactions across the copied cells reported zero SQL reads. K's solo medians of 13–14 reads show that the no-read pattern is specific to busy grouping.

**Forecast comparison.** At 50 / 235 / 394 / 620 the original one-gateway forecasts and in-window observations (saves/s) are K 50 / 235 / 255 / 255 vs 50 / 179.5 / 181.7 / 171.9 and S 50 / 235 / 383 / 383 vs 50 / 140.6 / 111.1 / 140.1. Forecast K/S worst-account p99 at 50 was 30 / 27.34 ms and observed was 312.9 / 1,568.4 ms. At 235 and above, expiries make complete-cohort p99 unavailable. Quiet-account details and completed-only distributions are retained in the reading receipt.

**Where the time went.** At 235, sender queue p99 was 34.0 s for K and 58.2 s for S. Gateway-ready to native entry p50/p99 was 520/882 ms for K and 644/986 ms for S. K's p99 from submit to native entry was 5 ms, ready-to-append 2.16 ms and durable append 4.07 ms. S's p99 from submit to native entry was 986 ms. At 50 loaded, K/S all-account p99 was 258.1/1,367.8 ms and account 0 was 221.1/1,568.4 ms. S's 136 replies above 1 s had median ready-to-native wait of 1,360 ms, native apply of 15.66 ms and 14 SQL reads. All 301 replies above 500 ms were offered by second six. Sender queue p99 was 1.87 ms and every ACK used the prepared function. The starts were asymmetric. S's 50-loaded cell was its first cell and K had already run a solo cell. A cold or adopting index fits this pattern. The missing transactor, writer and reader pause logs prevent attributing it to cache, adoption or a JVM pause.

**Ceiling.** A single serialized apply needs an average budget below 2.54 ms to sustain 394 saves/s, with room left for append. S's means of 6.91–8.62 ms imply an apply-only ceiling around 116–145/s at 235 and 394. A 4.01 ms sample gives 249/s only if held across the run. Gateway count can relieve preparation and queueing. It cannot raise this apply-only ceiling while these costs persist. The two- and four-gateway measurements remain pending.

### Where the read work sits

| Path | Gateway work before submission | Work remaining on the Datomic transaction thread |
| --- | --- | --- |
| Busy K | Runs the installed commit function on each speculative view. The function reads EAVT for the scope, latest clocks, owner revisions and predecessor/retirement rows. It looks up operation, command, journal and owner strings by unique value and seeks new assertion prefixes in historical AVET. It then materializes concrete datoms with persisted entity numbers. | `triplex.group/apply-v1` checks the exact native basis and returns concrete datoms. Native normalization and uniqueness remain. |
| S | Resolves the existing person by unique value, reads its revision and exact predecessor/retirement bytes in EAVT, checks the scope and journal absence, and prepares journal row templates. The retraction and revision CAS already use the numeric owner. | Scope and function fence reads, operation/command/journal unique lookups, historical AVET range or point seeks for new assertion IDs, and EAVT reads of the latest position and clock. Native normalization sees the retained business identity tempid and resolves its unique value again for new rows. |

The grouped route moves the authored read set to the gateway and trades concurrency for a basis fence. Its low-load singleton still runs the ordinary transaction function in Datomic and shows 13–14 median reads. At 235, S reports a mean 11 SQL reads with 2.14 ms SQL and 3.57 ms decode. AVET activity includes history, claims and native identity/uniqueness work. This copy contains per-transaction counters and cannot assign particular SQL fetches to particular authored calls. Gateway-cached values cannot replace the transaction's checks for new IDs, concurrent command claims, journal collisions or changed revisions. [Written paths](../../../../packages/datomic/gateway/src/triplex/gateway/subject_save.clj) · [Grouped path](../../../../packages/datomic/gateway/src/triplex/gateway/group.clj)

### Predictions before implementation

These are apply-only means and ceilings from the copied S 235/394 cells. They exclude durable append, the gateway and queueing. The 235-load averages imply roughly 0.52 ms per SQL/decode pair if those counters are additive. A read moved to another index can erase that saving.

| Candidate | Predicted native apply at 235 / 394 | Apply-only ceiling at 235 / 394 |
| --- | --- | --- |
| Submit the already known owner entity number and drop its identity upsert | 6.4–6.9 / 8.1–8.6 ms, assuming zero or one saved read/decode pair | 145–156 / 116–123 saves/s |
| Make the existing owner CAS hot while preserving revision semantics | 6.4–6.9 / 8.1–8.6 ms, assuming up to one avoided fetch | 145–156 / 116–123 saves/s |
| Put two disjoint prepared saves in one transaction and share fixed guard work | About 6.3 / 8.0 ms if a 1.2 ms fixed cost is shared. Perfect sharing of all work would still cost 3.45 / 4.31 ms | About 159 / 125 saves/s. Perfect sharing would give 290 / 232 |
| Eliminate half the measured storage and decode time with a larger working cache | About 4.05 / 5.63 ms | About 247 / 178 saves/s |

The object-cache comparison is already queued with TAIL1. PREP1 used a 2 GiB transactor object cache. To fit 394 at 235's mix would take roughly 77% removal of its observed SQL/decode time before allowing for append. At 394's measured mix even arithmetic removal of all SQL/decode leaves 2.63 ms. That is a model using reported counters. The cache arms can test it. Passing native hints would add a speculative producer-side apply. Earlier DX-M2 throughput fell with hints enabled, so this is a weaker first bet than removing a lookup whose result already exists. [TAIL1 handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/da7eca837/lab/experiments/EXP-DX1/bm1/HANDOFF.md) · [Hints measurements](../m2/REPORT.md)

Pick the numeric-owner change first. It can remove the redundant unique upsert on today's wire shape without loosening protection. Keep an exact EAVT identity check as well as the revision CAS because direct entity-ID changes can leave the revision untouched. It is a small experiment and carries no 394 saves/s forecast.

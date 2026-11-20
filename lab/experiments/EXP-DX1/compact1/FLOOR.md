# Durable Datomic floor on the Mac

**North star.** P2 service demand on the native path. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

Datomic Pro 1.0.7745, PostgreSQL 17, a new database with three throwaway attributes and no Triplex write path. Each result was verified against the requested values, membership, native transaction and Datomic log. PostgreSQL reported `fsync=on`, `synchronous_commit=on` and `full_page_writes=on`. These are short Mac mechanism measurements. [Datomic transaction acknowledgement and pipeline](https://docs.datomic.com/transactions/transaction-functions.html) · [PostgreSQL WAL settings](https://www.postgresql.org/docs/17/runtime-config-wal.html)

The factorial phase crossed 1/4/8/16/32/64 authored datoms, 100/1,024/4,096/16,384 UTF-8 value bytes and 0/1/4/16/64 serial AVET hits on existing keys, with 12 reversed/rotated blocks. Every physical transaction adds one native instant datom. The first baseline's depth-one regression uses ordinary least squares across the 120 cell medians.

| Clock | Fixed ms | µs per authored datom | µs per KiB of values | µs per explicit lookup | R² |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native `tx-with` | 0.160 | 1.74 | 2.49 | 0.70 | .54 |
| Peer submission through durable result | 2.136 | 4.80 | 67.82 | 1.33 | .70 |

The tested keys fit in cache. The lookup slope prices a warm explicit indexed seek on top of the transaction function, with uniqueness, ref maintenance and cold segment loads priced by the real layout gate. The fixed term is a regression intercept for the full mixed factorial, with a function invocation even when the lookup count is zero.

The burst phase used 120 native transactions per arm, two arms per cell, direct native submission and one 100 B value per member. The ranges are the two measured arms. Member means one tiny assertion on its own entity, except the one-member case stores it directly on the transaction.

| Members per native tx | Members/s at depth 1 | Members/s at depth 64 | Depth-64 peer p99 ms |
| --- | ---: | ---: | ---: |
| 1 | 759–824 | 1,696–2,790 | 21.7–48.5 |
| 2 | 1,075–1,253 | 2,933–7,069 | 29.2–72.0 |
| 4 | 2,460–2,498 | 6,241–11,287 | 29.8–76.4 |
| 8 | 4,359–5,988 | 12,509–17,721 | 32.7–63.2 |
| 16 | 7,925–8,047 | 19,233–28,703 | 58.1–86.2 |
| 32 | 13,307–15,986 | 32,880–45,699 | 72.4–74.8 |
| 64 | 22,245–26,188 | 30,920–52,911 | 98.2–218.5 |
| 128 | 29,403–35,332 | 26,443–39,156 | 369.2–414.2 |

The first baseline reached 52,911 minimal members/s at 827 physical transactions/s. Its best physical rate was 3,535 tx/s in one short two-member window. The matching reverse arm saw 1,467 tx/s. A repeatable sustained bound, a general Datomic maximum and the ceiling with application obligations need longer experiments.

- At one member, the apply thread accounted for 22–25% of depth-64 wall time. Read-to-logged medians were 3.09–6.68 ms and peer medians 18.3–27.9 ms. Apply cannot explain the bottleneck here. Queuing in send and acknowledge, log encoding and the two-SQL-commit append all sit outside that apply percentage. WAL and peer counters do not identify their individual serial shares.
- At 64 members, apply occupied 15–59% of elapsed wall. At 128 members, it occupied 18–80%. Read-to-logged grew to 72–119 ms and peer p99 to 369–414 ms for 128. Index adoption and cold segments compete with the log pipeline and require separate stage evidence. A larger member limit can reduce usable throughput and stretch p99.
- Effective WAL insertion moved during every timed arm. `pg_stat_wal` counters can lag across subsecond windows. Use the insert-LSN delta for bytes. Native log encoding and PostgreSQL WAL are different units.
- Baseline configured a 32 MiB index threshold, 96 MiB memory-index maximum, 64 MiB object cache and one indexing thread. There were two index adoptions including the setup index. Datomic rejected a 2 MiB threshold at startup. Cache size and index settings change merge frequency and segment read cost. The log writer's block limits and the one apply thread are fixed in this build. [Datomic capacity and indexing](https://docs.datomic.com/operation/capacity.html#indexing) · [Lab transactor notes](https://github.com/OnboardedInc/Triplex-db-experiments/blob/72785052e/lab/experiments/EXP-DX1/re1/TRANSACTOR-NOTES.md)

## Settings sweep

Three fresh databases repeated all cells with the same source, image, resource caps and durability. Each variant changed one transactor setting against the repeated baseline. Each depth-64 range spans two short blocks.

| Profile | Fixed native apply ms | One member tx/s | Eight members/s | 128 members/s |
| --- | ---: | ---: | ---: | ---: |
| Baseline repeat | 0.213 | 2,653–3,213 | 11,999–21,035 | 50,971–57,907 |
| 64 MiB index threshold | 0.248 | 1,172–2,872 | 6,903–8,316 | 67,393–68,471 |
| Two indexing threads | 0.233 | 2,860–3,528 | 25,939–27,007 | 36,299–47,013 |

The higher threshold moved the second index adoption from the 128-member depth-one burst at native t 103,519–103,648 to the 32-member depth-one burst at t 121,531–121,564. All three profiles still saw two adoptions. The best observed floor over the sweep was 68,471 bare members/s with 128 per transaction. Two indexing threads reached 5,890 physical tx/s in a different short block of two-member transactions. At depth one with one minimal member, the unchanged baseline moved from 759–824 to 359–564 tx/s between runs. The setting effects vary by group size and share that background variation. Use two indexing threads as the next eight-member setting to test and retain the low threshold as a comparison. [Sweep data](SHA256SUMS)

## Reproduce

```sh
node lab/bin/heavy.mjs --label DX-COMPACT1 -- node lab/bin/engine.mjs compact-probe --holder DX-COMPACT1 --run floor --image tx2-datomic:dx-w1-small-cost-69a7e6cd --out floor-new
```

Add `--profile large-index` or `--profile parallel-index` for the settings sweep. `floor-summary.mjs` verifies the binding and reduces one or more attempt directories. The native logs and full baseline table are under `DX-COMPACT1/floor-baseline-c`. Attempts `floor-baseline-a` and `floor-baseline-b` stopped before timing because the configured image ID and then tag were absent. The successful attempts pinned their local image ID and read back the Datomic JAR hashes. [Evidence hashes](SHA256SUMS)

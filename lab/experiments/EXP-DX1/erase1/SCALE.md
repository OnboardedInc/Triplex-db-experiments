# Native excision on the shared Mac

**North star** P1 and P2. Measure the exact-read barrier and live save/read latency around native indexing. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The database size counts deep-profile current facts at the seed cut. The history column counts two-field saves on the target, each with two retirements, two new assertions and the original logical journal. `Matched` counts selected packed history datoms, including the deliberately target-only journal. Excision also leaves identity and revision datoms. [Method](METHOD.md)

| Current facts | Saves in target history | Matched datoms | Native ACK / index / sync (ms) | Written segments EAVT / AEVT / AVET / RAET | Directory writes | Old handle still positive (s from request) |
| ---: | ---: | ---: | ---: | --- | ---: | ---: |
| 94,848 | 0 | 333 | 118 / 331 / 562 | 9 / 24 / 12 / 4 | 7 | 8.0 |
| 94,848 | 415 | 5,715 | 16 / 440 / 712 | 22 / 22 / 19 / 4 | 7 | 5.4 |
| 993,335 | 0 | 306 | 14 / 1,470 / 1,595 | 48 / 50 / 46 / 4 | 11 | 7.5 |
| 993,335 | 415 | 5,722 | 23 / 2,180 / 2,818 | 69 / 87 / 71 / 4 | 13 | 8.3 |
| 3,988,500 | 0 | 318 | 18 / 1,630 / 1,739 | 68 / 69 / 67 / 5 | 12 | 6.6 |
| 3,988,500 | 415 | 5,725 | 150 / 2,380 / 3,394 | 114 / 127 / 126 / 5 | 33 | 9.8 |

`sync` is native transact submission to `sync-excise` completion. Each fresh JVM confirmed current, pre-erasure as-of, history and sampled raw log datoms were clear of the selected rows. Each retained gateway handle still returned the exact value after the barrier. The raw Datomic database value also still exposed it. The all-reader clock has no observed endpoint.

## Live traffic

Each control and excision block contains 500 verified saves with four pinned read loops. Rows give p50/p99 in ms. “During job” includes only requests fully inside the native index build, with the conservative clock bounds applied. For fewer than 100 saves, nearest-rank p99 is the largest sample. The complete block combines the short job with time outside it, and the shared Mac shows warmup and neighbor noise.

| Facts / target saves | Saves control → full excision block | Saves during job (n) | Reads control → full excision block | Reads during job (n) |
| --- | --- | --- | --- | --- |
| 94,848 / 0 | 24.9/135.4 → 12.4/69.9 | 29.5/138.8 (5) | 5.3/34.7 → 2.9/17.1 | 5.4/44.9 (155) |
| 94,848 / 415 | 17.0/102.7 → 8.7/57.7 | 42.1/63.5 (9) | 3.5/38.0 → 2.1/9.4 | 3.4/15.6 (383) |
| 993,335 / 0 | 10.6/35.4 → 11.4/52.4 | 9.5/604.8 (68) | 2.6/12.9 → 2.7/13.5 | 2.7/18.6 (1,572) |
| 993,335 / 415 | 10.4/28.9 → 11.2/54.8 | 13.2/1,377.3 (43) | 2.4/8.4 → 2.6/11.5 | 2.7/14.2 (2,397) |
| 3,988,500 / 0 | 10.7/38.4 → 10.1/47.9 | 10.9/60.3 (115) | 2.8/13.0 → 2.6/9.1 | 2.9/10.9 (1,864) |
| 3,988,500 / 415 | 9.9/24.3 → 13.4/97.3 | 12.6/123.3 (101) | 2.4/8.2 → 2.9/15.3 | 2.7/9.2 (2,942) |

## Storage after both requests

| Seed facts | KVS objects deleted / stored value bytes | Relation bytes freed by Datomic GC / plain vacuum / full rewrite | Change in allocated WAL bytes / WAL generated across maintenance |
| ---: | ---: | ---: | ---: |
| 94,848 | 3,028 / 9,031,246 | 0 / 0 / 11,493,376 | 0 / 51,884,560 |
| 993,335 | 4,122 / 44,450,445 | 0 / −49,152 / 319,610,880 | 0 / 409,629,288 |
| 3,988,500 | 4,040 / 41,946,077 | 0 / −24,576 / 1,564,393,472 | 0 / 1,445,946,016 |

Positive “freed” means fewer allocated relation bytes than immediately before final GC. These are maintenance totals after both excision arms and ordinary indexing. The store can reuse already allocated pages. The offline rewrite also removes older bloat, so its reduction does not measure the erased person's footprint. WAL allocation is a stock and can stay unchanged while bytes are written and recycled. [PostgreSQL vacuum](https://www.postgresql.org/docs/17/routine-vacuuming.html)

## Growth in the measured range

N is millions of seed facts. Fits are least squares on the log of the three points. The history slopes use the two targets at each size, so sampling and different baseline activity remain in the differences.

| Metric | Zero-save fit | 415-save fit | Change per added field save at each rung |
| --- | --- | --- | --- |
| Native index seconds | 1.07 × N^0.45 | 1.54 × N^0.48 | 0.0002627, 0.001711, 0.001807 |
| Request-to-sync seconds | 1.29 × N^0.32 | 2.18 × N^0.44 | 0.0003623, 0.002947, 0.003988 |
| Leaf writes | 131 × N^0.40 | 209 × N^0.47 | 0.04337, 0.2, 0.3928 |

Across 0 to 415 saves, matched history grew by about 13 packed datoms per save. PostgreSQL deletion totals combine two requests and ordinary generations, so these observations cannot identify a per-person reclaim rate. The latency table shows the observed tails by size and history. Those tails vary with the available overlap samples and shared-host load.

Using the same three-point log fit, the aged full-block ratios to their paired controls scale as `0.99 × N^0.26` and `1.92 × N^0.52` for save p50 and p99, and `0.97 × N^0.20` and `1.03 × N^0.56` for read p50 and p99. The zero-edit exponents are 0.19, 0.26, 0.15 and 0.12 in the same order. A comparison of the two histories includes their different job overlap and warmup. Treat the exponents as descriptions of these blocks. Allocated bytes freed by ordinary GC fit zero at all three rungs. Stored-value deletion and offline relation shrink fit roughly `29.6 MB × N^0.44` and `276 MB × N^1.32` across both requests and ordinary activity.

The 25,000-person run completed under the same 2.875 GiB private stack cap and a 6 GiB disk reservation. It is the largest local run attempted under the shared scheduling window.

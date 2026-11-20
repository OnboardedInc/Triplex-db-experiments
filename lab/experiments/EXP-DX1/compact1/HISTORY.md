# Exact subject checkpoints and long histories

**North star.** P1 pinned reads, P4 current reads, and the P7 cost of opening an untouched subject. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The trusted peer prepares a snapshot of the predecessor's live intervals once per 64 subject events. It retains assertion coordinates, attribute codes, both validity endpoints and original recorded times. The snapshot byte hash includes its source identity, owner, exact parent native entity and logical position. The next event stores that immutable snapshot as one unindexed attribute under its normal revision guard. The serial append copies the prepared value with its ordinary body. It uses no second storage turn. The record charge is one addition per 64 accepted saves. Payload divided by 64 is the amortized byte charge.

A reader first selects the exact recorded cut, including member order inside a group. It then walks backward to the first eligible carrier. The carrier encodes its parent, so the reader applies the carrier itself and at most 63 newer events. A read before that carrier uses an earlier snapshot or the original prefix. The warm current cache may apply a shorter suffix or return the same projection immediately. Warm pinned reads reuse the peer's Datomic caches and still verify and fold the selected checkpoint. Full assertion and retirement history uses the source log because the snapshot describes live intervals. Damaged snapshots fail their digest or source-binding check and use the original chain.

Snapshots preserve protected representations and coordinates. Every decoded result resolves current erasure state before returning protected content. A pre-erasure checkpoint can remain physically present after erasure because it cannot restore a revoked protected value. Data restore still needs the separately current key ledger and validation of all backing copies.

The SQL probe seeds six distinct 160-fact subjects at each of 1, 64, 415 and 2,000 events. Each strategy and read mode starts a new peer process. The cold read uses a fixture-derived logical cut without a prior revision lookup. The first and repeated reads return the complete verified fact set. Shared transactor and storage pages may stay resident. Each read includes a same-process GC count delta. Six samples per arm make the nearest-rank p99 the maximum. The pinned checks cross both sides of checkpoints, and a deliberately changed checkpoint digest must decline.

The 194.44 ms read from Part 1 was the maximum among 88 untouched subjects in a 16M-fact load. It was the only value above 16.29 ms and its subject had one event. Replay depth therefore cannot explain it. The original record includes wall time, person ordinal and fact count. It lacks that read's GC, segment fetch, I/O and scheduler timing, so its cause remains unobserved. The 87 other reads and the checkpoint reproduction remain separate samples. [Part 1 import evidence](COST.md)

## Mac SQL read times

Each cell is p50 / p99 in milliseconds. The nearest-rank p99 is the largest of six verified reads per cell.

| History | Read | Original cold | Original warm | Checkpoint cold | Checkpoint warm |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Current | 0.71 / 10.75 | 0.43 / 0.52 | 0.75 / 7.23 | 0.24 / 0.42 |
| 1 | Pinned | 0.89 / 12.61 | 0.69 / 2.28 | 0.92 / 12.08 | 1.03 / 2.36 |
| 64 | Current | 1.32 / 8.36 | 0.23 / 0.69 | 1.87 / 5.63 | 0.28 / 0.67 |
| 64 | Pinned | 1.31 / 5.57 | 1.25 / 5.58 | 1.35 / 3.62 | 1.48 / 15.27 |
| 415 | Current | 9.94 / 49.50 | 0.48 / 0.89 | 3.01 / 21.20 | 0.33 / 0.56 |
| 415 | Pinned | 5.36 / 34.89 | 6.15 / 14.73 | 2.17 / 3.93 | 2.78 / 5.35 |
| 2,000 | Current | 36.05 / 85.95 | 0.60 / 1.05 | 2.91 / 4.29 | 0.96 / 1.11 |
| 2,000 | Pinned | 30.06 / 83.18 | 23.42 / 65.75 | 4.07 / 29.37 | 2.14 / 7.78 |

The checkpoints averaged **10,733 value bytes each**, or about **168 bytes and 1/64 of a datom per save** at steady cadence. Cold and pinned folds at 1, 64, 415 and 2,000 events used 1, 1, 32 and 17 events. The 85.95 ms current and 83.18 ms pinned original-chain maxima each included a JVM collection. The 29.37 ms pinned checkpoint maximum had no collection. This instrumented run did not reproduce the original 194 ms read. All nine boundary cuts matched plain replay and a changed snapshot digest was rejected. [Mac `p2-history-c` evidence](SHA256SUMS)

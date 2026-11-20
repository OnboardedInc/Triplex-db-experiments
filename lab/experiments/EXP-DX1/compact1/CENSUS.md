# Compact save size

**North star.** P2 datoms and value bytes per durable field edit. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

An established account and subject produce 11 datoms for a solo save. Each save carries its command identity, ordinal, server clock, owner, prior event and body. Two pointer updates add four datoms, with one native transaction instant. For eight successful established subjects across two accounts the layout writes 69 datoms, or 8.625 per save. Eight accounts yield 81, or 10.125 per save. A bootstrap owner adds its unique key, has no predecessor, and has no old subject head to retract.

The design census below uses ASCII value `edited-field-000000000`, W0 dictionary code 23 and consecutive answer suffixes `/ans:0` through `/ans:24`. Each replacement retires its old `[1, ordinal]` and asserts the new value with default validity. Account `a0`, command `write-10000` and two one-slot clock/head updates supply the same 97 B of non-body values. Strings count in UTF-8. Each long, reference and native instant counts as eight bytes. Fressian encodes tuples and headers as well as values.

| Replaced business facts | Native datoms | Body bytes | Total value bytes |
| ---: | ---: | ---: | ---: |
| 1 | 11 | 134 | 231 |
| 3 | 11 | 245 | 342 |
| 25 | 11 | 1,492 | 1,589 |

A timestamped assertion adds the explicit 27-character bound and its quoting. Ciphertext, wider IDs, activation and notice records change this price. A field edit fits under 2 kB with the W0 field lengths and this common shape. A 25-fact save can exceed that budget with long values or inclusive bounds converted to exact half-open intervals. PostgreSQL WAL and log-tree amplification require native measurement.

Keeping the predecessor reference spends one datom on the established save. It lets a current reader apply only the known suffix and a pinned reader resolve the last visible event with the same structure. The original layout's per-row compression saved 1.67% of stored value bytes in the matched 1k Part 8 arm and produced higher latency and WAL. The compact layout targets repeated structural data instead of compressing its encoding. [Part 8 matched layout result](https://github.com/OnboardedInc/Triplex-db-experiments/blob/10a395386/lab/experiments/EXP-DX1/t1/SLIM-8.md)

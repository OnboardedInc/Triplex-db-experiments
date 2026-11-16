# Part 11 replay and native size prices

North star: P2 commit median and tail, with exact values, atomicity and durable acknowledgements preserved. All timings below are diagnostics on current layout 3, exact local reads, strict server clock, split rule `pending`, source `f9a84dcb`. No layout, wrapper or default is adopted.

All three arms share one measurement lease and identical source/build bytes, frozen trace, collectors, placement/cache/history and durable settings. Native timing is **full tracing**; same-session zero-reader controls bookend the loaded arm. Mac CPU is non-VM summed CPU percent; it can exceed 100. Swap is 3.994 GiB in every native and replay sample.

| arm | original all-primary p50/p99 ms | native CPU p50/p99 % | replay CPU p50/p99 % | slow >50 ms |
| --- | ---: | ---: | ---: | ---: |
| zero-before | 12.298/50.234 | 17.3/96.3 | 19.3/137.7 | 36 |
| loaded | 13.293/70.566 | 15.0/109.1 | 14.1/144.1 | 91 |
| zero-after | 11.943/48.326 | 16.0/111.9 | 19.3/53.9 | 29 |

Global control p50/p99 mean 12.120/49.280 ms; bookend drift 0.354/1.908 ms. Every latency in the native tables uses that arm's native CPU/swap row; every pure apply latency uses its replay CPU/swap row. No off arm or full verdict pair was run; these are not comparable to H as a causal change.

Each arm joins all 3530 primary commits by exact trace, database hash and native t, and checks 100 captured successful primary payloads per band. Each payload uses the peer result’s authoritative immutable `db-before`; schema/watermark setup and warmups happen outside replay timing. Five shapes run twice with rotated/reversed order: 3000 measured results per arm, 9000 total. A/B/C/E preserve the decoded full logical row delta, including IDs, owner, time, actor, typed values and signed-zero bits. This checks row text and add/retire intent; historical retirement-coordinate reconstruction remains untested. It is not full query equivalence or a new-layout oracle. D deliberately omits rows and fails that equality.

All 8,565,810 loaded model reads are correct, zero errors/violations; independent current-layout oracle PASS: 443 commands, 37 reads, 1744 queries, no mismatch/receipt violation. No layout is installed on a real connection: the native basis remains unchanged during each replay. The completed 1000-subject smoke i also has a complete trace and 3000 qualified replays; gateway selftests: 21 / 53,973 assertions.

## Current native size relation

Warm means no earlier commit in flight and an idle gap from 0 to 50 ms. Native table entries are wall-time counters on the transactor; they are not on-CPU time. Quantiles of parts do not add. Native size slopes use within-warm-path fact bins with at least eight observations; size and datoms co-vary, so the slopes do not independently identify the cost of removing a datom while keeping its text.

| arm | added-datom slope: service / peer / native apply ms | peer-minus-apply slope ms/KiB | canonical size fit bytes/fact; R² |
| --- | ---: | ---: | ---: |
| zero-before | 0.087/0.035/0.013 | 0.042 | 908.5; 0.999614 |
| loaded | 0.103/0.036/0.013 | 0.054 | 908.4; 0.999601 |
| zero-after | 0.103/0.054/0.016 | 0.049 | 908.6; 0.999607 |

| arm / fact band | native datoms p50 | original commit p50/p99 ms | peer p50/p99 ms | native apply p50/p99 ms |
| --- | ---: | ---: | ---: | ---: |
| zero-before / small | 41 | 10.940/45.483 | 6.078/32.501 | 1.260/15.500 |
| zero-before / medium | 61 | 13.108/47.292 | 7.032/33.535 | 1.680/14.600 |
| zero-before / large | 101 | 16.511/72.435 | 8.584/47.024 | 2.520/26.800 |
| loaded / small | 41 | 11.862/65.440 | 6.649/47.836 | 1.350/15.400 |
| loaded / medium | 61 | 14.240/76.429 | 7.678/51.681 | 1.830/21.000 |
| loaded / large | 101 | 17.403/84.691 | 9.134/45.636 | 2.710/27.600 |
| zero-after / small | 41 | 10.594/42.232 | 5.977/32.894 | 1.260/15.700 |
| zero-after / medium | 61 | 13.018/48.326 | 7.092/33.292 | 1.700/16.600 |
| zero-after / large | 101 | 16.730/71.081 | 8.791/37.571 | 2.220/21.100 |

## Five speculative shapes

A = today. B = original validation/clock assignment, journal row texts packed by length into one unindexed value per journal. C = B plus JSON clock splice, one authoritative watermark read with conservative history fallback, one liveness read for retractions, and one command-id attribute on the transaction replacing the single consistent claim; its new watermark datom is counted. D = omit generated change/changed-entity rows before serial apply. E = append row values/retirement markers on new owner-linked containers, leaving current subject revision checks. These are one-step replays over current-layout bases, not long-running migrated stores.

Fressian sizes are real bytes from Datomic’s serializer for these speculative datoms under a fixed transaction UUID and speculative native ids. They are **canonical serialized sizes**, not observed physical WAL/disk bytes or an exact native UUID/header census. Value bytes count string UTF-8/non-string EDN. Packing preserves the full row text; almost all bytes remain even when datoms disappear.

Loaded arm, full tracing, replay CPU 14.1/144.1%, swap 3.994 GiB; controls are the same session’s zero-reader replay rows above. 100 payloads/band, two rounds. Paired delta is candidate minus A; 95% bootstrap intervals resample payloads. No durable latency win is inferred from these warm peer times.

| band / shape | datoms | value bytes | Fressian bytes | pure apply p50 ms | function p50 ms | paired apply delta ms [95%] | AVET / EAVT / AEVT visits | predicted PG commits/tx † |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| small / A | 41 | 10172 | 10544 | 0.474 | 0.290 | 0.000 [0.000, 0.000] | 126.5/22/16 | 2.942 |
| small / B | 27 | 10232 | 10466 | 0.470 | 0.300 | -0.009 [-0.042, 0.022] | 126.5/22/16 | 2.935 |
| small / C | 26 | 10158 | 10388 | 0.443 | 0.280 | -0.044 [-0.327, 0.009] | 27/22/16 | 2.928 |
| small / D | 30 | 4066 | 4328 | 0.326 | 0.160 | -0.150 [-0.210, -0.088] | 81.5/22/16 | 2.387 |
| small / E | 44 | 10236 | 10644 | 0.473 | 0.310 | -0.055 [-0.270, 0.010] | 126.5/28/10 | 2.951 |
| medium / A | 61 | 19010 | 19582 | 0.686 | 0.480 | 0.000 [0.000, 0.000] | 225.5/22/16 | 3.749 |
| medium / B | 37 | 19110 | 19444 | 0.650 | 0.500 | -0.021 [-0.049, -0.016] | 225.5/22/16 | 3.737 |
| medium / C | 36 | 18986 | 19316 | 0.586 | 0.440 | -0.077 [-0.099, -0.054] | 27/22/16 | 3.725 |
| medium / D | 40 | 6916 | 7278 | 0.396 | 0.220 | -0.263 [-0.326, -0.190] | 130.5/22/16 | 2.650 |
| medium / E | 64 | 19074 | 19684 | 0.702 | 0.510 | 0.012 [0.002, 0.018] | 225.5/28/10 | 3.758 |
| large / A | 99 | 36086 | 37038 | 1.159 | 0.860 | 0.000 [0.000, 0.000] | 426/22/16 | 5.308 |
| large / B | 56 | 36262 | 36784 | 1.142 | 0.920 | -0.030 [-0.058, -0.008] | 426/22/16 | 5.285 |
| large / C | 55 | 36041 | 36561 | 0.988 | 0.760 | -0.174 [-0.231, -0.135] | 27/22/16 | 5.265 |
| large / D | 59 | 12476 | 13028 | 0.559 | 0.355 | -0.518 [-0.638, -0.385] | 231/22/16 | 3.164 |
| large / E | 102 | 36150 | 37138 | 1.161 | 0.910 | 0.007 [-0.022, 0.019] | 426/28/10 | 5.317 |

C reduces median medium apply 14.6–16.7% across arms (paired estimates are smaller); the brief’s 30% target is not met. C cuts medium AVET visits from 225.5 to 27 but keeps almost all serialized text. E trades AEVT reads for EAVT/owner work and adds three datoms; no reliable small/medium saving is established. All replay SQL-read medians are zero: this is a warm-cache price, not the missing 100k cold-cache result.

## SQL/WAL and predicted durable prices

| arm | observed storage write autocommits/Datomic tx | WAL writes/tx in sampled window | mean WAL write ms | explicit WAL syncs |
| --- | ---: | ---: | ---: | ---: |
| zero-before | 3.490 | 3.231 | 0.331 | 0 |
| loaded | 3.419 | 3.161 | 0.458 | 0 |
| zero-after | 3.495 | 3.232 | 0.329 | 0 |

The SQL counts include background tree/index/heartbeat writes; WAL counters use their own recorded sample window. `fsync`, `synchronous_commit` and `full_page_writes` remain on. `open_datasync` performs durable work in WAL writes, so zero explicit sync calls is not zero durability cost.

† PG model: two fixed SQL commits plus byte-proportional excess calibrated to the observed write-commit count and predicted current average Fressian size. Tail reset/treeification frequency scales with log bytes; background composition and batching may change in a real layout. It is not a measured per-band SQL count.

Durable p50 model: measured original band p50 + paired warm replay apply delta + current warm peer-minus-apply byte slope × byte delta. Queueing, idle premium, TypeScript and readers stay unchanged. The byte slope remains observational; reader reconstruction, 100k cold reads and tail feedback are unpriced. No P99 forecast or new-layout durability result is claimed.

| shape | predicted zero-reader small/medium p50 ms, averaged bookends | predicted 256-window small/medium p50 ms |
| --- | ---: | ---: |
| A | 10.767/13.063 | 11.711/12.991 |
| B | 10.754/13.039 | 11.698/12.963 |
| C | 10.673/12.963 | 11.659/12.900 |
| D | 10.356/12.274 | 11.237/12.085 |
| E | 10.779/13.077 | 11.661/13.008 |

The zero column prices the complete zero-reader primary population; the 256 column uses the benchmark’s settled 45-second 256-reader window (33 small, 11 medium commits). The population definitions differ deliberately and are stated rather than silently substituted. C’s estimated durable gain is inside global bookend drift; D’s forecast still misses 10 ms and omits reader/identity costs.

## Exactness and scale limits

The native EDN audit checks all 900 payloads: each single claim’s transaction id equals the journal/transaction id, so folding does not discard a different claim identity in this sample. General SPI/multi-journal/backdated cases remain untested and need a preserved slow path.

D drops 7,222 distinct row identities per 300-payload cohort; original IDs are not present among retained rows. A compact identity list would average 625.9 UTF-8 bytes per commit before framing/datoms, plus reconstruction and arbitrary-SPI fallback. Thus D as priced cannot return every existing Triplex answer; the figures are an optimistic bound. No such map is built.

The sealed 100k PG seed occupies 17.50 GiB; live capacity above the 15-GiB floor was only 0.97–1.06 GiB (read-only size probe). No clone is admitted and A/C/E storage reads at 100k are unverified. The seed was only mounted read-only, with no Postgres process.

Full method/output: `tx2-dxt1-p11-size-a-session/calibration-v3.json`, `p11-pricing/prices-final.json`, and each arm’s compressed `trace/raw/layout-*` and automatic `trace.html`. Controls, exact identities, source hashes and incomplete development attempts remain private under `evidence/DX-T1/`; see [audit](AUDIT-11.md) and [evidence index](EVIDENCE-11.md).

```sh
bash lab/experiments/EXP-DX1/t1/replay-session.sh tx2-dxt1-my-replay
node lab/trace/layout-calibration.mjs "$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1" tx2-dxt1-my-replay
python3 -I lab/trace/layout-price.py <session>/calibration.json <new-prices>.json
```

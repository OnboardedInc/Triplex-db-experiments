# Pinned-read probe on the 1 billion database

**First answers.** (1) **A pin near the head is not slow:** 1,000 positions behind the head, a pinned read took 1.26 ms p50, against 31.86 ms at the old pin 87,002 (28.2 million positions back). The cost tracks the history after the pin. (2) **Segment loads per cold pinned read: 1 (p50; mean 1.19)**, and the repeat costs the same with 0 loads, so the cost is work the cache does not remove (candidate B), not leaf loading. The very first read of the pass loaded 77 segments. (3) **The revision short-cut returned 0 mismatches:** 584 of 600 reads were answered from the current database, 16 went the as-of route.

Run on Server 2 at 20:12–20:18 UTC on 2026-11-23, with the builder's probe at `0688bd00f` (`exp/DX-RD1-readers`) against the scorecard checkout at `6770c37ba`, on a scratch copy of the sealed held cluster (copy 123 s, PostgreSQL and transactor active 21 s later). The copy was removed; the held source was not touched. **Only the `reader` pass ran.** The `bigcache` pass was refused at peer start: `:db.error/not-enough-memory (datomic.objectCacheMax + datomic.memoryIndexMax) exceeds 75% of JVM RAM`. A 12 GiB cache in a 16 GiB heap leaves no room for the memory index, so the wrapper's bigcache settings need a larger heap or a smaller cache. That is the builder's fix.

## Reader pass: one core, 3 GiB heap, Datomic's default cache, pin 87,002, 600 reads per arm

| Arm | Wall p50 / p99 ms | Thread CPU p50 ms | Allocation p50 MB | Segment loads per read, p50 (mean) | Route | Prediction |
| --- | --- | ---: | ---: | --- | --- | --- |
| `pinned`, cold | 31.86 / 88.89 | 29.26 | 72.8 | 1 (1.19); first read 77 | as-of, 600 | 38–55 ms; ≥ 8 loads under A |
| `pinned-repeat` | 28.29 / 72.45 | 27.79 | 72.0 | 0 (0.00) | as-of | — |
| `current` (head) | 0.20 / 4.06 | 0.20 | 0.3 | 0 (0.03) | source | 1–5 ms, under 3 MB |
| `pinned-recent` (head − 1,000) | 1.26 / 21.27 | 0.63 | 1.0 | 1 (0.80) | as-of | within 30% of `pinned` |
| `shortcut` | 0.21 / 51.31 | 0.21 | 0.3 | 0 (0.19) | source 584, as-of 16 | 70–90% from current; 0 mismatches |
| `pinned-twice` (1,200 reads) | 28.61 / 76.80 | 28.03 | 72.0 | 0 (0.34) | as-of | second read under 10 ms under A |
| `concurrent`, 16 threads, 60 s | 522.35 / 706.73 | 28.63 | 73.2 | 1 (1.87) | as-of | 18–26 reads/s |

Arm totals: `concurrent` 1,819 reads in 60.24 s, **30.20 reads/s** with 60.23 s of process CPU (the core was saturated). Ten to sixteen of each arm's 600 people were edited by AGE1 after the pin. PostgreSQL during the pass: 36,353 TOAST block reads and 3,565 heap block reads.

**Against the predictions.** `pinned` was faster than predicted (31.86 ms against 38–55) but still about 160 times `current`, so the falsifier (under 15 ms) did not trigger: the as-of read itself is the cost. Candidate A predicted many leaf loads and a cheap second read; neither happened (1 load, repeat as slow), so the result points to B. The recent pin was far cheaper than predicted, so the cost grows with the history after the pin, not with total history. The short-cut matched its prediction. Sixteen threads gave 30 reads/s, a little above the predicted 18–26 and well below 40, so the reader is CPU-bound, not waiting.

Evidence: `evidence/DX-SCALE1/rd2-probe/rd2-out.tar.gz` in the private evidence folder (SHA-256 `119373f34013afdc7f08bed2cd77da99fe28daa128ebc1ca5a023757f03acba8`): per-read records, JFR profile, GC log, PostgreSQL counters, configuration and the wrapper log.


Builder's probe `rd1/pinned-probe.clj` and `pinned-probe-server.sh` at `0688bd00f` (`exp/DX-RD1-readers`), run against the scorecard checkout at `6770c37ba` on a scratch copy of the sealed held cluster. Predictions below are copied from `rd1/PINNED-1B.md` at `df3cb07b4` before the launch.

## Predictions, written before the run (copied)


| Measure (pass `reader` unless named) | Prediction | What it would mean if wrong |
| --- | --- | --- |
| `pinned` p50, thread CPU, allocation | 38 to 55 ms; thread CPU at least 80% of wall; 45 to 80 MB per read; route `as-of` for all | Under 15 ms: the scorecard's slowness came from its stack (writer load, peer novelty, GC competition), not from the read itself |
| `current` p50 | 1 to 5 ms, under 3 MB per read | Over 20 ms: the cost is the 1 billion database at any cut, not the as-of view |
| `pinned-twice`, second read | **A:** under 10 ms. My lean is A at about 60%, from toy 2 (no point lookup walks the history; the cost is leaf decoding) | Second read as slow as the first: candidate B, work the cache cannot remove |
| io-stats on a cold `pinned` read | **A:** at least 8 leaf loads (`*-load`) and `deserialize` per read, `sql` at least 5 | Under 3 loads with 40 ms of CPU: B |
| `pinned-recent` p50 | Within 30% of `pinned` (cost tracks total history, as on toy 1) | Under half of `pinned`: the cost grows with the history after the pin, so recent pins are cheap |
| `shortcut` | Answered from the current database for 70 to 90% of people; 0 mismatches; mean 5 to 15 ms | Any mismatch: the revision rule is not exact on this database and the fix must not ship as designed |
| `concurrent`, 16 threads on one core | 18 to 26 reads/s | Over 40/s: waiting, not CPU, dominates, and more read permits would help |
| `bigcache` `pinned` p50 | Within 25% of `reader` if each person's segments are distinct; under 20 ms if reads share segments | — |
| PostgreSQL block reads during `pinned` | TOAST reads well above zero per read only under A | — |

**Falsifier of the main claim** (the as-of route costs about 40 ms of CPU per read at 1 billion): `pinned` p50 under 15 ms on one core with `current` similar. Then the scorecard's number came from its environment, and the next step is the scorecard's reader under load, not the read path.


## Pinned-read fix pair (build `dc34aa18d`): predictions copied from `rd1/PINNED-1B.md` before launch

**Predictions, written before the run.** Reads/s and p50 per step, one reader core. Sources: the card's ladder (old pin, 18.12/s and 44.80 ms at one seat), the probe (old pin 31.86 ms, near head 1.26 ms, current 0.20 ms inside the peer), the fresh card's head-pinned ladder (606/s and 1.18 ms at one seat over HTTP).

| Pin, options | 1 seat | 16 seats | 256 seats |
| --- | --- | --- | --- |
| Old pin 87,002, off | 17–23/s, p50 40–55 ms | 17–23/s, p50 0.7–0.95 s | 17–22/s, p50 11–15 s, no errors |
| Head − 1,000, off | 300–600/s, p50 1.5–3 ms | 400–900/s | 400–1,000/s |
| Old pin 87,002, on | 400–700/s, p50 1.2–2.5 ms | 500–1,200/s | 500–1,200/s |
| Head − 1,000, on | 400–700/s, p50 1.2–2.5 ms | 500–1,200/s | 500–1,200/s |

Short-cut share in arm `on` at the old pin: 95–99% of reads answered from the current database (584 of 600 in the probe). Wrong values and errors: 0 in every step.

**Falsifier.** Arm `on` at the old pin below 100 reads/s at one seat means the walk is not the whole cost or the option did not act (check `shortcut` counts in the step records and `pinnedCutLookup` in the write options). Any wrong value, or a gate difference, means an option is not exact and must not merge. Arm `off` near the head below 150/s at one seat would mean the HTTP route pays a cost the probe did not see.


## Pinned-read fix pair: result (21:24–21:45 UTC on 2026-11-23)

Build `dc34aa18d` (`exp/DX-RD1-readers`, containing the one branch at `3d4320155`), `v01/study-server.ts` with `DX_RD2_PINNED_PAIR=1`, one arm per new physical copy of the sealed held cluster, aged fresh-peer check on the stack network, `server` profile, one reader core, 1.5 GiB reader cache. Arm `off` ran 21:24–21:35 (including the 5-minute build), arm `on` 21:35–21:45. Both exited 0 and removed their copies; `pinned-comparison.json` written.

| Pin | Seats | Off: reads/s · p50 / p99 ms | On: reads/s · p50 / p99 ms · read from current | Prediction (off; on) |
| --- | ---: | --- | --- | --- |
| Old pin 87,002 | 1 | 19.37 · 41.73 / 103.94 | **467.92** · 1.37 / 14.34 · 98.0% | 17–23/s, 40–55 ms; 400–700/s, 1.2–2.5 ms |
| Old pin 87,002 | 16 | 19.50 · 782.34 / 1,171.46 | **478.92** · 27.14 / 101.38 · 98.1% | 17–23/s; 500–1,200/s |
| Old pin 87,002 | 256 | 20.20 · 12,582.91 / 13,500.42 | **478.80** · 516.10 / 880.64 · 99.5% | 17–22/s, 11–15 s; 500–1,200/s |
| Head − 1,000 | 1 | 409.00 · 1.53 / 13.57 | 770.67 · 1.06 / 3.82 | 300–600/s, 1.5–3 ms; 400–700/s |
| Head − 1,000 | 16 | 310.00 · 42.24 / 118.78 | 612.97 · 23.42 / 79.87 | 400–900/s; 500–1,200/s |
| Head − 1,000 | 256 | 283.25 · 851.97 / 1,236.99 | 534.72 · 464.90 / 786.43 | 400–1,000/s; 500–1,200/s |

**Zero wrong values and zero errors in all twelve steps.** Every old-pin read was checked against the seed's value.

**Against the predictions.** The options remove the old-pin cost: 19.4 → 467.9 reads/s at one seat (24×), p50 41.7 → 1.37 ms, inside the predicted 400–700/s and 1.2–2.5 ms. The falsifier (on below 100/s at one seat, or any wrong value) did not trigger. At 16 and 256 seats arm `on` stayed near 479/s, just under the predicted 500–1,200/s floor; the single reader core is the limit there. Near the head with the options off, 16 and 256 seats gave 310/s and 283/s, below the predicted 400–1,000/s; one seat (409/s) was inside the range.

Evidence: `evidence/DX-SCALE1/pinned-pair-1b/pinned-pair-1b.tar.gz` in the private evidence folder (SHA-256 `e7d59dc3c55081406b666d80b2c6f1fc5a336d6d5004d8140c9b32ba0e2c76b8`).

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

## Tuned pinned-read arm (build `64c70e549`): predictions copied from `rd1/PINNED-1B.md` before launch

**Predictions, written before the run.** Closed loop, no think time, so by Little's law p50 is about seats ÷ reads/s. In the pair, p99 was 1.65 to 1.7 times p50 at 256 seats. Cost model: the pair's on arm spent 1.1 to 1.8 ms of CPU per single-subject exchange, of which the read itself is about 0.2 ms (probe). With eight subjects per exchange the fixed part is shared: about 2.4 to 4.4 ms per exchange, rising 35 to 50% with many exchanges in flight, so 0.4 to 0.8 ms of CPU per subject. Three cores at 0.95 give 3,600 to 7,100 subjects/s before GC on those cores and the batches that do not fill; the ranges below allow for both.

| Seats | Pin | Reads/s (subjects) | p50 | p99 | Mean batch |
| --- | --- | --- | --- | --- | --- |
| 64 | head − 1,000 | 2,500–4,500 | 14–26 ms | 30–70 ms | 7–8 |
| 64 | old pin | 2,300–4,200 | 15–28 ms | 30–75 ms | 7–8 |
| 256 | head − 1,000 | 2,800–4,800 (central 3,800) | 53–90 ms (central 67) | 90–155 ms (central 115) | 7.5–8 |
| 256 | old pin | 2,500–4,400 | 58–100 ms | 100–170 ms | 7.5–8 |
| 1,024 | head − 1,000 | 2,500–4,500 | 230–410 ms | 400–800 ms | 8 |
| 1,024 | old pin | 2,300–4,200 | 245–445 ms | 420–850 ms | 8 |

Old pin 5 to 15% below near head, as in the pair (479 against 535 at 256 seats), from the 1 to 2% of subjects read through the as-of view. Short-cut share at the old pin 97 to 99.5%. Wrong values and errors: 0 in every step.

Falsifiers (from the launch message): near-head reads/s at 256 seats below 1,500 or above 6,000; mean batch below 6; any wrong value.

## Tuned pinned-read arm: result (22:59–23:10 UTC on 2026-11-23)

Build `64c70e549`, `DX_RD2_PINNED_TUNED=1`, `DX_RD1_LADDER=pinned-tuned`, one new physical copy of the sealed held cluster: three reader cores, 3 GiB read cache, three read permits, both pinned options on, batches of up to eight subjects. Exited 0 and removed its copy.

| Pin | Seats | Reads/s | p50 / p99 ms | Mean batch | From current | Prediction (reads/s; p50; p99) |
| --- | ---: | ---: | --- | ---: | --- | --- |
| Head − 1,000 | 64 | 5,466.7 | 9.60 / 63.23 | 8 | all | 2,500–4,500; 14–26; 30–70 |
| Head − 1,000 | 256 | **12,375.9** | **18.43 / 72.19** | 8 | all | 2,800–4,800; 53–90; 90–155 |
| Head − 1,000 | 1,024 | 1,482.0 | 667.65 / 987.14 | 8 | all | 2,500–4,500; 230–410; 400–800 |
| Old pin 87,002 | 64 | 3,689.9 | 13.25 / 73.22 | 8 | 97.9% | 2,300–4,200; 15–28; 30–75 |
| Old pin 87,002 | 256 | **10,598.8** | **20.10 / 83.46** | 8 | 98.0% | 2,500–4,400; 58–100; 100–170 |
| Old pin 87,002 | 1,024 | 1,213.1 | 823.30 / 1,122.30 | 8 | 97.7% | 2,300–4,200; 245–445; 420–850 |

**Zero wrong values and zero errors in all six steps.**

**Against the predictions.** At 256 seats the arm delivered about 2.5–3 times the predicted rate, with p99 under 100 ms at both pins (72.19 and 83.46 ms). The falsifier "near-head reads/s at 256 seats above 6,000" triggered: the cost model overstated the per-subject cost. At 1,024 seats throughput fell to 1,482 and 1,213 reads/s, below the 64-seat step and below the predicted 2,300–4,500. That drop is not explained by this run's records. Mean batch was 8.0 everywhere, so the batch falsifier did not trigger.

Evidence: `evidence/DX-SCALE1/pinned-tuned-1b/pinned-tuned-1b.tar.gz` in the private evidence folder (SHA-256 `8beca2bc6033d1997659ae97c8eb2995a894fbca30448397068604e905301ac0`).

## Pinned readers with saves (DX-RD3, build `9376ece9c`): predictions and falsifiers copied from `rd1/PINNED-1B.md` before launch

### Predictions, written before the run

Corrected model above. Closed loop, no think time. Additions for the save load:

- The reader ingests about 27 commits/s of novelty and serves the quiet account's P6 reads.
- PostgreSQL's one core serves both peers' segment reads.
- The driver's event loop carries the save sender beside the 256 seats.
- The transactor indexes at 256 MB of novelty, so at most one index adoption is likely across the S windows.

| Window | Reads/s (central) | Read p50 | Read p99 (central) | Current share | Reader CPU |
| --- | --- | --- | --- | --- | --- |
| `s-near-head` | 9,500–12,500 (11,000) | 19–27 ms | 70–120 ms (88) | ≥ 99.5% | 1.9–2.6 |
| `s-seed-cut` | 8,000–10,800 (9,500) | 22–32 ms | 80–130 ms (98) | 97–98.5% | 1.9–2.6 |
| `s-tape` | 800–2,600 (1,500) | 100–320 ms (170) | 160–600 ms (300) | 85–98% (a read goes to the as-of view when the subject's next save commits between the pin's choice and the read; 990 of the 2,086 commits re-save a subject within 20 s, and commits take tens of ms to seconds at 1 billion) | 2.0–2.7 |
| `ref-near-head` | 11,000–12,800 | 18–24 ms | 65–95 ms | 100% | 1.9–2.3 |
| `ref-seed-cut` | 9,500–11,000 | 20–28 ms | 75–100 ms | 97.5–98.5% | 1.9–2.3 |
| `ref-tape` | 1,200–2,800 (1,900) | 90–210 ms | 140–400 ms | 90–100% | 2.0–2.7 |

**Random subjects (the product's cache-cold case), from the corrected model.** A read of a random subject among 1,000,000 almost never finds its leaf segments in a 3 GiB cache. That cache holds about 6,200 decoded segments (about 0.5 MB each). The working set is the leaves of a million subjects at 1.4 to 2.2 distinct segments each, so 1.4 to 2.2 million segments, about 0.7 to 1.1 TB decoded. So each subject costs its loads: 1.4 to 2.2 loads (the tuned arm measured 1.43 and 1.78 when its reuse distance exceeded the cache, and about 2.2 for a subject's first read). Each load costs 0.6 to 0.9 ms of reader CPU including its collection, plus about 0.11 ms of the exchange's fixed cost. That is **1.0 to 2.1 ms per subject (central 1.5)**, on the 2.2 to 2.4 cores left outside collector pauses (the 1,024-seat steps used 2.23 to 2.27).

| Window | Reads/s (central) | p50 | p99 (central) | Storage loads per subject | Object-cache hit share (by request, branches included) | Decode CPU | Sampled storage reads per exchange of 8 | Current share |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ref-random-near-head` | 900–2,200 (1,400) | 115–285 ms (183) | 170–450 ms (270) | 1.3–2.3 | 0.78–0.90 | 1.2–2.0 cores | 10–18 | ≥ 99.9% |
| `s-random-near-head` | 850–2,100 (1,350) | 120–300 ms (190) | 180–480 ms (280) | 1.3–2.3 | 0.78–0.90 | 1.2–2.0 cores | 10–18 | ≥ 99.5% |
| `ref-random-seed-cut` | 800–2,000 (1,250) | 130–320 ms (205) | 190–500 ms (300) | 1.4–2.6 | 0.76–0.90 | 1.2–2.1 cores | 11–21 | 97–98.5% |

Mean batch 7.5–8; wrong values and errors 0.

**The 100 ms p99 bar at 256 seats is not met for random subjects** in any of the three; the model's central p99 is 270 to 300 ms.

**What the model says would meet it, so the server result can confirm or refute the sizing.**
- **The rate needed.** With no think time and p99 about 1.4 × p50 (the cache-miss steps showed 1.36 to 1.48), p99 ≤ 100 ms needs p50 ≤ 71 ms, so **about 3,600 reads/s** at 256 seats.
- **Cores.** At 1.5 ms per subject (1.0 to 2.1) that is 5.4 busy cores (3.6 to 7.6), so **about 7 reader cores (5 to 10)** at the 0.75 to 0.8 of a core each one gives outside collector pauses. On the 12-core machine that means a second reader with its own cores, or the reader on its own machine, beyond the three cores the tuned reader has.
- **Cache.** **No affordable cache size meets it.** A cache covering the working set would need 0.7 to 1.1 TB. A partial cache's hit share on leaves is about its share of the working set: 3 GiB gives under 0.5%, 12 GiB under 2%, which saves almost nothing.
- **What else would.** Fewer loads per subject (a subject's rows in fewer segments, as the covering owner head does for writes) or cheaper decoding.

**What would refute this sizing:**
1. Random reads at or above 2,800 reads/s on three cores, or storage loads per subject at or below 0.5. Then subjects share segments far more than modelled, the working set is much smaller, and a larger cache (12 to 24 GiB) could meet the bar. The next run would then be the same window with a 12 GiB reader cache.
2. Loads per subject within the predicted range but reader CPU per subject under 0.8 ms. Then decoding is cheaper than the 0.6 to 0.9 ms per load, and fewer extra cores are needed: 3,600 × CPU per subject ÷ 0.78 cores.
3. Reads/s well below the range (under 900) while the reader uses under 1.8 cores. Then storage latency (PostgreSQL's one core, or disk reads beyond its 8 GiB page cache) limits it, not reader CPU. The fix would then be storage-side, and the metrics minutes' `StorageGetMsec` will show it.

**Tape pins are one subject per exchange, read whole:** 1.3 to 2.5 ms of reader CPU per exchange (a single-subject exchange near the head cost 1.13 ms in the pair's one-seat step), on 2 to 2.7 cores. Wrong values and errors: 0 in every window.

**Saves.** Commit latency is measured from the scheduled offer to the acknowledgement in the driver.

| Window | Stored commits/s (offered 26.7: 23.2 S + 3.5 quiet) | Expired | S commit p50 | S commit p99 | Quiet commit p50 / p99 | Reads per commit |
| --- | --- | --- | --- | --- | --- | --- |
| `s-alone` | 25.5–26.7 | 0–100 | 25–120 ms | 0.25–3 s | 6–12 / 20–60 ms | 0.5–5 |
| `s-near-head`, `s-seed-cut`, `s-tape` | 25–26.7 | 0–150 | +0–25% over `s-alone` | +0–40% over `s-alone` | +0–30% over `s-alone` | Same as `s-alone` |
| `ref-*` (3.5/s quiet only) | 3.5 | 0 | — | — | 5–10 / 15–45 ms | — |

**P2's bar** (save p50 ≤ 10 ms, p99 ≤ 50 ms with 256 readers): **missed by the S commits**, whose median is a 6-fact save and two thirds of which take the general writer; **for the quiet account's 3.5/s, p50 ≤ 10 ms is likely met in every window (6–12 ms predicted), and p99 ≤ 50 ms is likely met in the `ref-` windows (15–45 ms) and borderline in the S windows (20–60 ms, plus up to 30% with readers).** For the reference tape alone, the current `server-32` card's part 1 at 1 billion (no readers) measured 6.18 / 21.38 ms.

**P1's bar** (read p99 ≤ 100 ms at 256 seats with saves): **met for the ladder's batched pins near the head and at the old pin** (central 88 and 98 ms; the old pin is the one at risk); **missed for pins at the tape's own positions** (central p99 300 ms), because those reads cannot share an exchange.

### What would show each prediction wrong

1. **Saves cost the reader capacity:** `s-near-head` below 9,000 reads/s or p99 above 130 ms while `ref-near-head` (or the tuned arm's 12,376 / 72 ms) holds. Then log ingestion, an index adoption, or PostgreSQL contention costs reads. Look at reader CPU and GC per window, the reader's `StorageGet` counts in `gw-r.jsonl`, and PostgreSQL's CPU.
2. **Readers cost the saves:** the S commit p99 in a read window above 1.5 × `s-alone`'s, or stored commits/s more than 5% below it. Check the driver's event-loop delay first. If its p99 is above 10 ms, the extra save time is at least partly the driver's, not the store's.
3. **The tape-pin model is wrong:** `s-tape` above 4,000 reads/s means a whole-subject single exchange costs well under 0.6 ms. Below 500 means something other than reader CPU limits it: reads pinned ahead of the reader waiting for publication (`BasisNotAvailable` in the failures), or the driver.
4. **The corrected model is wrong:** reader CPU per exchange in `ref-near-head` outside 1.0 to 1.6 ms, or the reader below 1.7 cores with the driver below 1.5 cores at 256 seats.
5. **Exactness:** any wrong value or error in any window. In particular, a tape pin that disagrees with the sender's record means a pinned read under concurrent saves on one subject is not exact (the Mac gates never covered concurrent saves on one subject). Then the options must not merge.


Random-subject windows (from the launch message): 900–2,200 reads/s (central 1,400), p50 115–285 ms, p99 170–450 ms, 1.3–2.3 storage loads per subject, cache hit share 0.78–0.90, 0 wrong values. Refuters: 2,800 reads/s or more, or 0.5 loads per subject or fewer; reader CPU per subject under 0.8 ms; under 900 reads/s with the reader under 1.8 cores.

## Pinned readers with saves (DX-RD3, build `9376ece9c`): faulted before its first window (01:23–01:27 UTC on 2026-11-24)

The dry run reached its first offer (`DX-DRY-RUN first offer reached: pinned pinned-saves lab/experiments/EXP-DX1/v01/study-server.ts:160`); its first attempt was refused in 3 s only because the campaign's parent directory did not exist. The timed arm then stopped in the window driver, before any window: `ReferenceError: Cannot access 'savesWindows' before initialization` at `savesArm` (`v01/study-server.ts:305:19`), called from `study-server.ts:204` and `rd1/prepared.ts:153` `sealedArm`. The stack and the copy were removed; no window ran, so there are no measurements. The builder must fix the variable's initialization order. Evidence: `evidence/DX-SCALE1/pinned-saves-1b/pinned-saves-1b.tar.gz` in the private evidence folder (SHA-256 `2852025f7ad74ddffd651201157dba3295c1d831a0537f150a6cd4460847b256`).

## Pinned readers with saves (DX-RD3, build `e02bf4edf`): result (01:55–02:16 UTC on 2026-11-24)

The dry run printed `[DX-RD3] windows resolved` and stopped inside the window driver (`v01/saves-arm.ts:69`). The timed arm ran all ten windows (90 s each, 256 seats) on a scratch copy of the sealed cluster and exited 0 at 02:16 UTC. Its containers, network and scratch copy were removed. **Wrong values: 0 in every window.**

| Window | Tape | Pin | Reads/s | Read p50 / p99 ms | Wrong | Errors | Stored commits/s | S commit p50 / p99 ms | Quiet commit p50 / p99 ms | Reader cores | Driver loop p99 ms | Sampled storage reads per exchange of 8 | Cache hit share |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: |
| `s-alone` | production-S | none | — | — | — | — | 23.08 | 11.52 / 55.55 | 10.62 / 48.90 | 0.18 | 12.19 | — | — |
| `s-near-head` | production-S | near-head | 8,960.0 | 23.81 / 112.13 | 0 | 0 | 23.08 | 8.06 / 64.77 | 4.77 / 35.07 | 1.90 | 16.49 | not recorded | not recorded |
| `s-seed-cut` | production-S | seed-cut | 8,879.0 | 22.91 / 99.33 | 0 | 0 | 23.07 | 7.46 / 52.48 | 5.50 / 29.18 | 2.03 | 16.96 | not recorded | not recorded |
| `s-tape` | production-S | tape | 1,434.5 | 177.15 / 303.10 | 0 | 0 | 3.16 | 282.62 / 1,105.92 | 241.66 / 605.54 | 2.59 | **169.87** | not recorded | not recorded |
| `ref-random-near-head` | saturday | random-near-head | 1,219.6 | 207.87 / 333.82 | 0 | 0 | — | — | 5.63 / 9.41 | 2.09 | 10.94 | 14.10 | 78.4% |
| `s-random-near-head` | production-S | random-near-head | 1,216.6 | 207.87 / 323.58 | 0 | 0 | 23.07 | 7.90 / 55.81 | 4.19 / 22.53 | 2.14 | 16.34 | 13.51 | 81.4% |
| `ref-random-seed-cut` | saturday | random-seed-cut | 1,085.5 | 231.42 / 342.01 | 0 | 0 | — | — | 5.98 / 20.73 | 2.14 | 10.94 | 14.82 | 77.8% |
| `ref-near-head` | saturday | near-head | 10,419.7 | 21.38 / 77.82 | 0 | 0 | — | — | 3.90 / 6.27 | 1.99 | 10.94 | 0.45 | 96.7% |
| `ref-seed-cut` | saturday | seed-cut | 8,368.4 | 23.81 / 107.52 | 0 | 0 | — | — | 4.22 / 6.33 | 2.06 | 10.96 | 0.69 | 95.8% |
| `ref-tape` | saturday | tape | 3,445.7 | 68.61 / 137.22 | 0 | 0 | — | — | 133.12 / 228.35 | 2.41 | **89.65** | not recorded | not recorded |

Cache hit share is the reader's object-cache hits over requests in its per-minute metrics, weighted by each minute's overlap with the window. The reader record is empty in the four `s-` windows without random pins and in `ref-tape`, so those cells were not recorded.

**Storage loads per subject were inside the predicted 1.3 to 2.3.** The column above counts the sampled storage reads of one exchange, and an exchange carries 8 subjects (mean batch 8). The prediction table gives that as its own column, predicted 10 to 18, and the measured values are inside it. Per subject, two independent counts give:

| Window | Sampled reads per exchange ÷ 8 | Reader `StorageGet` count ÷ reads in the same seconds | Handler CPU per exchange | Reader core-ms per subject |
| --- | ---: | ---: | ---: | ---: |
| `ref-random-near-head` | 1.76 | 1.46 | 8.29 ms | 1.72 |
| `s-random-near-head` | 1.69 | 1.78 | 7.91 ms | 1.76 |
| `ref-random-seed-cut` | 1.85 | 2.00 | 8.65 ms | 1.97 |
| `ref-near-head` | 0.06 | 0.10 | 1.15 ms | 0.19 |
| `ref-seed-cut` | 0.09 | 0.14 | 1.36 ms | 0.25 |

The first report of this run, sent before publication, gave 13.5 to 14.8 as loads per subject. That was the per-exchange figure; the per-subject values are above.

**Against the predictions:**
1. **Random subjects fit the model.** Reads/s were 1,086 to 1,220 (predicted 800 to 2,200, central 1,250 to 1,400), p99 324 to 342 ms (predicted 170 to 500), loads per subject 1.46 to 2.00, cache hit share 77.8 to 81.4% (predicted 0.76 or 0.78 to 0.90, so at the low edge), and reader CPU 1.7 to 2.0 core-ms per subject (predicted 1.0 to 2.1 ms per subject). None of the three refuters fired. Reads/s were not at or above 2,800 and loads per subject were not at or below 0.5. Reads/s were not under 900 with the reader under 1.8 cores. The 100 ms p99 bar at 256 seats is missed for random subjects, as predicted.
2. **Saves cost the reader a little near the head: falsifier 1 fired narrowly on rate, not on latency.** `s-near-head` read 8,960/s at p99 112 ms against `ref-near-head`'s 10,420/s at 78 ms. That is 14% fewer reads, 40 reads/s under the 9,000 floor, with p99 inside the 130 ms limit. Reader CPU was 1.90 cores with saves and 1.99 without, and PostgreSQL used 0.20 cores against 0.12, so the loss is not reader CPU; this run does not show which of log ingestion, index adoption or PostgreSQL contention it was. At the old pin, reads were higher with saves: 8,879/s against 8,368/s. Random-near-head was the same with and without saves (1,217 and 1,220).
3. **Readers did not cost the saves outside the tape window (falsifier 2 did not fire there).** Production-S stored 23.07 to 23.08 commits/s in every window except `s-tape`. In those windows S commit p99 was 52 to 65 ms against `s-alone`'s 55.55 ms (limit 1.5 × = 83 ms), and 0 commits expired. All saves offered were durable and complete. The stored rate was 23.1/s, not the predicted 25.5 to 26.7, because the stored figure counts production-S commits only; the quiet account's 3.5/s is reported separately. S commit p50 was 7.5 to 11.5 ms, well under the predicted 25 to 120 ms.
4. **Both tape windows were limited by the driver, so they give no reading of the database.** The driver's event-loop p99 was 169.87 ms in `s-tape` and 89.65 ms in `ref-tape`, against the 20 ms threshold, and the driver used 1.1 cores. In `s-tape` it offered only 285 production commits (3.17/s) instead of about 2,086. All 285 were durable. Of the quiet account's 315 offers, 49 were acknowledged. Three quiet reads failed and none were wrong. The predicted `s-tape` rate was 800 to 2,600 reads/s, and 1,434.5 is inside it. Falsifier 3 did not fire, but the window cannot confirm the tape-pin model while the driver is saturated.
5. **P2's bar for the quiet account** (save p50 ≤ 10 ms, p99 ≤ 50 ms with 256 readers): **met in every window except the two driver-bound tape windows.** Quiet p50 was 3.9 to 10.6 ms and p99 6.3 to 48.9 ms.
6. **P1's bar** (read p99 ≤ 100 ms at 256 seats): `ref-near-head` met it at 77.82 ms and `s-seed-cut` at 99.33 ms. It was missed narrowly by `s-near-head` (112.13 ms) and `ref-seed-cut` (107.52 ms). The random pins missed it at 324 to 342 ms.

Evidence: `evidence/DX-SCALE1/pinned-saves-1b-e02/` in the private evidence folder, holding `pinned-saves-1b-e02.tar.zst` (SHA-256 `6b732d0ef444d9330e0a68402e6ae91a035f839cd5b93408ba773d043d654783`; all window records, the launch profile, the cleanup record, the run log and the launcher) and `pinned-saves.json` (SHA-256 `315fc987a9d6d2bfa99c3327a91b5615ae4b421933295043483d05330766cb51`). Both were checked on the server and on the Mac.

## Random arm (build `d94dff145`): predictions and falsifiers copied from `rd1/PINNED-1B.md` before launch

This arm reruns the three random windows: `ref-random-near-head`, `s-random-near-head` and `ref-random-seed-cut`. Each is 90 s at 256 seats, run on the tuned reader's 3 cores and 3 GiB cache, and each configuration gets its own fresh copy. The reader runs with 6 permits (`p6`) and then 12 (`p12`), set by `DX_RD3_READ_PERMITS`. `p12` runs only if 18 minutes remain within the 40-minute ceiling, and only if 18 minutes remain before evidence collection starts at 04:00 UTC.

| Configuration, window | Reads/s (central) | p50 | p99 (central) | Loads per subject | Cache share | Reader cores |
| --- | --- | --- | --- | --- | --- | --- |
| `p6`, `ref-random-near-head` | 1,450–1,700 (1,580) | 150–175 ms | 240–290 ms (260) | 1.5–2.0 | 0.76–0.81 | 2.6–2.9 |
| `p6`, `s-random-near-head` | 1,400–1,700 (1,560) | 150–180 ms | 240–300 ms (265) | 1.5–2.0 | 0.76–0.82 | 2.6–2.9 |
| `p6`, `ref-random-seed-cut` | 1,300–1,550 (1,420) | 165–195 ms | 260–330 ms (290) | 1.6–2.1 | 0.75–0.80 | 2.6–2.9 |
| `p12`, each window | 0–10% above `p6` | | | Same | Same | 2.7–2.95 |

- **Saves:** `s-random-near-head` stores 23.07/s, with S commit p99 50 to 70 ms and quiet p99 20 to 40 ms.
- **Storage time per exchange** (`sql-ms`): 7 to 9 ms. PostgreSQL rises to 0.35 to 0.45 cores.
- **Handler CPU per exchange:** 8 to 10 ms.
- **Errors and wrong values:** 0 of each.
- **The 100 ms bar:** not met in any configuration (central p99 260 to 290 ms).

**What would show the sizing claim ("about 7 cores, permits about twice the cores, no affordable cache") wrong:**
1. **`p6` at or above 2,000 reads/s on 3 cores.** CPU per subject falls with concurrency below 1.35 ms, and fewer than 6 cores would meet the bar.
2. **`p6` under 1,350 reads/s with the reader under 2.4 cores.** The idle core is not permit-held storage waits but something permits cannot reach: a lock, the collector, PostgreSQL. More cores would then not scale linearly, and 7 is an underestimate.
3. **`p12` at or above 1.15 × `p6`.** Storage waits still idle cores at two permits per core, so the permit rule becomes about four per core. The core count stands.
4. **Cache share by request above 0.9, or loads per subject under 1.0.** The working set is smaller than modelled and a cache test is worth building.

Loads per subject here are the sampled storage reads per exchange ÷ 8. The cache share is weighted by each metrics minute's overlap with the window.

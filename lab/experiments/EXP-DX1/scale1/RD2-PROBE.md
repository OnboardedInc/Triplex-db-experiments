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

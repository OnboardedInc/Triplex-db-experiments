# Saturday's save runs: is the 32 GiB cache's gain the cache or the larger heap?

**The cache: fewer storage reads, not fewer collector stalls.** The 32 GiB arms changed two things at once: object cache 16 → 32 GiB and transactor heap 24 → 48 GiB. With the larger heap, the transactor's ZGC allocation stalls are gone: none on any thread in all 12 loaded cells of the three cache32 runs. In the 16 GiB runs, however, the stalls never set the 394/s tail. Across five 16 GiB runs at 394 offered, none of the slowest 1% of busy saves in the second half met a stall of 50 ms or more. The stalls together held some transactor thread for 0.1 to 1.1% of each window. Storage reads held the serial writer for 73 to 83% of the window at 16 GiB and 26 to 31% at 32 GiB (native apply time ÷ wall time, 394/s). That difference is the gain. Everything here comes from Saturday's evidence on the Mac (`evidence/DX-BM1/bench3/`, the transactor's own `prep1-gc-tx.log` with `gc*,safepoint*=debug`, `prep1-index.ndjson` adoptions, per-save native I/O counters, `summary.json`). It was read with [`heap_reading.py`](heap_reading.py), and the full output is kept privately at `evidence/DX-LOAD2/heap/heap-reading.jsonl`.

How saves are attributed. A save "met a stall" when a transactor allocation stall of 50 ms or more ended between 2 s before the save was due and its acknowledgement. "After an adoption" means the save was due within 6 s of an index adoption. "First minute" means it was due in the first 60 s. A save past its 30 s expiry deadline waited long enough to meet almost anything, so at 620 offered on 16 GiB, where the queue reached the 30 s expiry, the shares are exposure and not cause.

## 1. 16 GiB cache, 24 GiB heap (rolling 6 ×3, rolling 8, rolling 12, barrier 6, five cores)

| Run, cell | Writer-thread stalls: count, total ms, longest | All transactor threads: count, longest ms | Time any thread was stalled | Heap free at collection start, lowest / median | Writer busy applying (whole / 2nd half) | 2nd-half busy p99 ms | Slowest 1% (2nd half): met a stall / after an adoption, no stall / neither |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| rolling 6, 394 | 4, 261, 115 | 38, 505 | 0.38% | 5% / 29% | 0.78 / 0.74 | 5,070 | 0% / 0% / 100% |
| rolling 6 repeat (6r), 394 | 4, 204, 143 | 32, 362 | 0.19% | 13% / 29% | 0.81 / 0.73 | 2,826 | 0% / 0% / 100% |
| rolling 6 third (6s), 394 | 4, 1,008, 431 | 32, 434 | 0.37% | 2% / 26% | 0.83 / 0.78 | 4,618 | 0% / 31% / 69% |
| rolling 8, 394 | 7, 1,278, 674 | 63, 675 | 0.51% | 6% / 30% | 0.82 / 0.77 | 5,842 | 0% / 0% / 100% |
| rolling 12, 394 | 4, 1,037, 588 | 28, 589 | 0.35% | 5% / 28% | 0.81 / 0.75 | 2,457 | 0% / 42% / 58% |
| five cores (tx5), 394 | 2, 265, 196 | 22, 196 | 0.12% | 12% / 30% | 0.42 / 0.30 | 469 | 7% / 93% / 0% |
| rolling 6, 620 | 5, 959, 495 | 39, 495 | 0.30% | 5% / 30% | 0.88 / 0.86 | 30,024 (expiries) | 57% / 7% / 37% |
| rolling 6r, 620 | 4, 677, 335 | 29, 335 | 0.21% | 9% / 27% | 0.90 / 0.89 | 30,025 | 49% / 15% / 36% |
| rolling 6s, 620 | 2, 539, 454 | 39, 455 | 0.31% | 0% / 27% | 0.90 / 0.87 | 30,024 | 50% / 2% / 48% |
| rolling 8, 620 | 3, 409, 369 | 24, 371 | 0.17% | 6% / 27% | 0.90 / 0.87 | 30,029 | 33% / 19% / 48% |
| five cores, 620 | 10, 1,828, 405 | 65, 405 | 0.48% | 5% / 27% | 0.79 / 0.76 | 30,023 | 64% / 2% / 33% |
| barrier 6, 394 | 2, 585, 446 | 24, 454 | 0.20% | 6% / 27% | 0.68 / 0.66 | 30,005 | 60% / 0% / 40% |

The stalls fall mostly on Datomic's worker pool (`clojure-agent-send-off-pool-*`: 10 to 35 per cell, up to 452 ms), the indexer, the serial writer (`processor-*`) and the log thread. They are the same mechanism found in the fair-import run (section 2 of [NEIGHBOURS-SERVER.md](NEIGHBOURS-SERVER.md)). A young collection starts on the allocation-rate trigger, and the 24 GiB heap, which holds the 16 GiB object cache, runs out of free space while marking. Safepoints are short throughout.

**At 394 offered, the multi-second second-half tails are backlog spells with no stall near them.** In three of the six runs every save in the slowest 1% was outside both a stall and a post-adoption window ("neither"). In two more, 58 to 69% was; the rest sat within 6 s after an adoption. Five cores is the exception: 93% after an adoption, 7% near a stall. The writer was busy applying 73 to 78% of the second half, and a save read 1.26 to 1.35 SQL segments on average. That leaves too little spare writer time to drain a spell, and PREP1's own reading placed those spells in index jobs, when reads rise to about 1.6 per save. **At 620 offered** the 16 GiB writer was 86 to 89% busy, the queue ran to the 30 s expiry, and between 24,984 and 41,979 offers expired. Half the slowest saves "met" a stall only because they waited 30 s.

## 2. 32 GiB cache, 48 GiB heap (three runs, three and five transactor cores)

| Run, arm, cell | Stalls, any thread | Heap free at collection start, lowest / median | Collections | Writer busy applying (whole / 2nd half) | SQL reads per save (whole / 2nd half) |
| --- | ---: | ---: | ---: | ---: | ---: |
| cache32, 3 cores, 394 | 0 | 12% / 58% | 12 | 0.30 / 0.13 | 0.23 / 0.037 |
| cache32b, 3 cores, 394 | 0 | 11% / 58% | 12 | 0.31 / 0.13 | 0.23 / 0.037 |
| cache32c, 3 cores, 394 | 0 | 11% / 58% | 12 | 0.30 / 0.13 | 0.23 / 0.037 |
| cache32 ×3, 5 cores, 394 | 0, 0, 0 | 9% / 58% | 12 | 0.26–0.27 / 0.12 | 0.19 / 0.035 |
| cache32 ×3, 3 cores, 620 | 0, 0, 0 | 10% / 19–26% | 24–26 | 0.38–0.40 / 0.26–0.28 | 0.19–0.22 / 0.07–0.11 |
| cache32 ×3, 5 cores, 620 | 0, 0, 0 | 10% / 20–21% | 25–27 | 0.32–0.35 / 0.22–0.26 | 0.16–0.20 / 0.07–0.13 |

**The allocation stalls are gone in every cell.** At 394 the larger heap also cut collections from about 100 to 12 per cell. At 620 the median free share at collection start (19 to 26%) is close to today's 24 GiB runs (25 to 30%), and the lowest is 9 to 12%. Yet no thread stalled. In absolute terms 10% of 48 GiB is about 4.8 GB of headroom, against 0 to 3 GB at the lowest point in the 24 GiB runs. Free share alone does not predict a stall; free bytes against the allocation burst do.

## 3. How much of cache32's gain is the cache, and how much the heap?

**Almost all of it is the cache.**

1. **Capacity.** At 394/s the serial writer spent 0.74 to 0.78 of the second half applying on 16 GiB and 0.13 on 32 GiB, because SQL reads per save fell from 1.26–1.35 to 0.035. All transactor-thread stalls together covered 0.1 to 0.5% of the time in the 16 GiB second halves. So the stalls explain under 1% of the capacity difference, and the reads explain the rest.
2. **Tail.** In the 16 GiB second halves at 394, 0% of the slowest 1% met a stall in all six runs except five cores (7%). The tails are capacity spells. Removing the stalls with heap alone would leave those spells.
3. **620/s.** With 32 GiB the writer was 0.26 to 0.28 busy in the second half and stored 620/s. With 16 GiB it was 0.86 to 0.89 busy and could not keep up. A 0.3% stall share cannot account for that.

**Expected behaviour of the two untested combinations** (forecasts, not measurements):

| Combination | Stalls | Reads per save, late | Writer busy at 394 | 2nd-half busy p99 at 394 | 620/s |
| --- | --- | ---: | ---: | ---: | --- |
| 16 GiB cache, 48 GiB heap | gone or nearly gone (more free bytes than cache32 had) | 1.2–1.4, as today | 0.70–0.78 | 2,000–5,500 ms, as today | not kept up: 430–490 stored/s, about 25,000–42,000 expired |
| 32 GiB cache, heap leaving today's 2–13% lowest free share at collection start (about 36–40 GiB) | back: 2–6 writer stalls per cell, longest 150–500 ms | 0.03–0.05, as cache32 | 0.13–0.15 | 300–900 ms: a 400 ms stall at 13% writer use drains in about 0.5 s | kept up, with second-half p99 700–1,500 ms |

**Which single extra arm separates them most cheaply:** 16 GiB cache with a 48 GiB heap (everything else as rolling 6, three cores, the 394 and 620 cells only, about 30 minutes). If it reproduces today's 16 GiB numbers (late reads above 1.0 per save, second-half p99 in seconds at 394, expiries at 620), the gain is the cache. If it matches cache32, the heap did it. **This arm is not launchable from existing code with settings alone.** PREP1's `rolling-launch.mjs` at `97aced1b1` accepts only fixed arm names (`1-rolling6-cache32-S` and `1-rolling6-tx5-cache32-S` tie the 48 GiB heap to the 32 GiB cache), so it needs a new arm name of about five lines. My reading is that the arm is not needed: question 1's attribution already shows the 394/s tails at 16 GiB with no stall near them.

## 4. The cold first minute in the cache32 runs: reads only

| cache32 run, cell | First-minute busy p99 ms | SQL reads per save, first minute | Writer busy applying, first minute | Stalls, first minute |
| --- | ---: | ---: | ---: | ---: |
| 3 cores, 394 (three runs) | 14,598 / 15,788 / 14,347 | 1.00 / 1.00 / 0.99 | 0.93 / 0.96 / 0.93 | 0 |
| 5 cores, 394 (three runs) | 10,288 / 10,878 / 10,490 | 0.81 / 0.81 / 0.81 | 0.81–0.83 | 0 |
| 3 cores, 620 (three runs) | 21,139 / 21,326 / 21,368 | 0.71–0.72 | 0.88–0.90 | 0 |
| 5 cores, 620 (three runs) | 17,090 / 17,255 / 14,287 | 0.55–0.58 | 0.74–0.79 | 0 |

**No stall on any thread in any first minute.** The cold cache sends about one SQL read per save in the first minute, and the serial writer is 81 to 96% busy applying. The backlog built there then sets the whole-window p99 of 10 to 21 s. That is the cold-start item, and heap does not touch it.

## 5. Headline rows for every run (summary.json of each arm)

| Run | Arm | Cache / heap | Offered | Stored/s whole (2nd half) | Expired | Busy p99 ms, 2nd half | Quiet p99 ms | SQL reads per save |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| rolling-main | rolling 6 | 16 / 24 GiB | 394 | 392 (392) | 0 | 5,067 | 54.00 | 1.35 |
| rolling-main | rolling 6 | 16 / 24 | 620 | 454 (485) | 36,164 | 30,024 | 61.79 | 1.32 |
| rolling 6r | rolling 6 | 16 / 24 | 394 | 394.00 (400.81) | 0 | 2,824 | 46.44 | 1.45 |
| rolling 6r | rolling 6 | 16 / 24 | 620 | 439.59 (462.05) | 41,466 | 30,024 | 56.29 | 1.41 |
| **rolling 6s (new)** | rolling 6 | 16 / 24 | 235 | 235.00 (234.97) | 0 | 32.1 | 42.93 | 0.69 |
| **rolling 6s (new)** | rolling 6 | 16 / 24 | 394 | 394.00 (402.16) | 0 | 4,618 | 66.11 | 1.41 |
| **rolling 6s (new)** | rolling 6 | 16 / 24 | 620 | 438.00 (456.28) | 41,979 | 30,023 | 99.15 | 1.39 |
| tx5 | rolling 6, 5 cores | 16 / 24 | 394 | 394.00 (394) | 0 | 468 | 68.83 | 0.57 |
| tx5 | rolling 6, 5 cores | 16 / 24 | 620 | 485.61 (527) | 24,984 | 30,022 | 250.10 | 0.96 |
| cache32 | 3 cores | 32 / 48 | 394 | 394.00 (394) | 0 | 521 | 61.81 | 0.23 |
| cache32 | 3 cores | 32 / 48 | 620 | 620.00 (620) | 0 | 709 | 44.68 | 0.20 |
| cache32 | 5 cores | 32 / 48 | 394 | 394.00 (394) | 0 | 656 | 47.63 | 0.19 |
| cache32 | 5 cores | 32 / 48 | 620 | 617.86 (640) | 0 | 5,867 | 76.64 | 0.20 |
| cache32b | 3 cores | 32 / 48 | 394 | 394.00 (394) | 0 | 269 | 59.39 | 0.23 |
| cache32b | 3 cores | 32 / 48 | 620 | 620.00 (620) | 0 | 725 | 68.19 | 0.20 |
| cache32b | 5 cores | 32 / 48 | 394 | 394.00 (394) | 0 | 531 | 55.28 | 0.19 |
| cache32b | 5 cores | 32 / 48 | 620 | 617.75 (664) | 0 | 11,382 | 62.03 | 0.16 |
| **cache32c (new)** | 3 cores | 32 / 48 | 394 | 394.00 (393.95) | 0 | 244 | 42.74 | 0.23 |
| **cache32c (new)** | 3 cores | 32 / 48 | 620 | 620.00 (619.99) | 0 | 711 | 44.92 | 0.22 |
| **cache32c (new)** | 5 cores | 32 / 48 | 394 | 394.00 (394) | 0 | 627 | 54.21 | 0.19 |
| **cache32c (new)** | 5 cores | 32 / 48 | 620 | 619 (619) | 0 | 889 | 111.07 | 0.16 |

The SQL column is the whole-window mean, including the cold minute. Late reads in the cache32 runs are 0.035 to 0.13 per save (section 2). **cache32c repeats the first two runs on three cores:** 394.00 and 620.00 stored/s with no expiries, and second-half p99 244 and 711 ms. **On five cores at 620 it kept up for the first time** (second half 619 stored/s and p99 889 ms, against spells of 5.9 and 11.4 s in the earlier two runs). Its quiet account reached 111 ms there. **rolling 6s repeats the 16 GiB pattern:** 394 kept up with second-half p99 4.6 s, and 620 stored 438/s with 41,979 expired.

## What the evidence cannot establish

1. The two untested combinations in section 3 are forecasts. No run separated heap from cache. The separating arm needs a new PREP1 arm name.
2. "Met a stall" is a timing coincidence, not a trace of cause. Where waits approach the 30 s expiry (620 on 16 GiB), it says nothing about cause.
3. Why 48 GiB stalls nowhere even at 9 to 12% free while 24 GiB stalls with 13% free: the logs give occupancy, not the allocation burst per collection, so "free bytes against the burst" is the likely reading rather than a measurement.
4. SQL counts requests to PostgreSQL, which may serve them from memory.

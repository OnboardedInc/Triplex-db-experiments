# Priority 8 · Why live saves slow down beside a fair import, and the live-first importer

**Saturday's 22× is not a second-half failure of the import.** Busy accounts' saves were slow in both halves of the loaded cell (p99 390 then 286 ms). The baseline changed: the control cell's first half carried its own cold-start spell (p99 553 ms), and its second half was clean (12.6 ms). Inside the loaded cell the time goes into waiting for an admission credit, while the credits are held by saves queued at the transactor behind import frames. The frames become slow for a few seconds after each index adoption, and the import makes index jobs run about four times as often. The change on this branch keeps the importer out of the credit window while any live save is waiting. A trace-driven replay of Saturday's cell predicts second-half busy p99 of about 80 ms instead of 286 ms. That is a large cut, and it still misses 1.5× of a 12.6 ms baseline. **The job-start stalls (burst B) are ZGC allocation stalls on the transactor's 24 GiB heap** (section 2): Saturday's stack already logged collector and safepoint events, and the first reading missed the file. Everything below comes from the full-size evidence of 2026-11-21 (`evidence/DX-BM1/bench3/bench3-fair-import`, INT1 `8ab832093`, rolling 6, one importer credit, 32-fact frames, ten accounts of 100,000 people, 16 GiB transactor object cache, three transactor cores).

## 1. Where a busy save spends its time in the second half

The slowest 1% of busy saves in the second half (353 saves at or above the 286.1 ms p99) spent their time as follows, in mean ms per save.

| Part of the save | Slowest 1% | All busy saves | Control, all busy saves |
| --- | ---: | ---: | ---: |
| Total, due to acknowledgement | 304.25 | 29.35 | 4.55 |
| Waiting in the client for an admission credit | **277.60** | 18.62 | 0.98 |
| Client to gateway | 0.20 | 0.28 | 0.23 |
| Gateway prepare (parse to submit) | 1.71 | 1.14 | 0.91 |
| Waiting in the transactor queue | 19.30 | 3.74 | 0.23 |
| Datomic serial apply | 2.69 | 1.49 | 0.63 |
| Apply end to log append end | 1.13 | 1.57 | 0.64 |
| SQL storage reads during apply, per save | 0.95 | 0.48 | 0.13 |

**91% of a slow save is the wait for a credit.** The gateway, the save's own apply and its storage reads together add under 6 ms. The credit wait is a symptom: rolling 6 gives the nine busy accounts and the importer five credits, and during a spell all five are held by requests queued at the transactor behind a slow import frame. Transactor queue waits of 140 to 315 ms follow each long apply in the native trace. The serial apply was busy 71% of the second half (15% in the control's second half), and the transactor used 2.11 of its three cores (0.58).

## 2. What changes between the first and second half

Nothing that matters changes inside the loaded cell.

| Loaded cell (rolling 6) | First half | Second half |
| --- | ---: | ---: |
| Busy save p99, ms | 390.5 | 286.1 |
| Index adoptions | 5 (29.8, 56.1, 81.7, 109.2, 136.0 s) | 5 (165.6, 193.3, 219.7, 246.2, 274.0 s) |
| Slowest 1% due within 6 s after an adoption (share of all saves in those windows) | 100% (20%) | 79% (20%) |
| Serial apply busy | 65% | 71% |
| Frame apply mean / p99, ms | 3.57 / 18.50 | 4.13 / 22.29 |
| Busy save apply mean, ms | 1.28 | 1.49 |
| SQL reads per busy save | 0.43 | 0.48 |
| Imported facts/s | 3,120 | 2,762 |

**The ratio moved because the baseline moved.** The matched control's first half had a cold-start spell in its first ten seconds (p99 630 ms, up to 16 saves queued per account), so its first-half p99 was 553 ms. Its second half was clean at 12.6 ms, with one index adoption at 202.9 s. The loaded cell is the same in both halves: its tail comes in spells that start at each index adoption, every 27 s on average with the import against every 100 s without it. The import does not reach people whose rows are not in memory (frames create new subjects, and busy saves' reads rose only from 0.43 to 0.48 per save). Queues do not grow across the window: between spells the busy p99 per ten-second bin returns to about 20 to 30 ms, and no account ever had more than 12 saves waiting.

Two kinds of spell set the tail. Both come from index jobs.

1. **After an index adoption (A).** The first import frame after an adoption applies in 60 to 133 ms, and frames stay slow for seconds: 30.4 ms mean in the first second, 12.2 in the second, 5.8 at 2 to 4 s, 3.06 ms once settled. Busy saves read 1.34 SQL segments per save in that first second against 0.41 when settled. The serial writer is 88 to 98% busy for about three seconds (frames 504 to 594 ms/s plus saves 381 to 424 ms/s at 136 to 138 s), and up to 12 saves per account queue for the credit. Busy p50 is 168.5 ms for saves due 0 to 3 s after an adoption in the second half.
2. **At the start of the next index job (B): ZGC allocation stalls.** About 8 to 10 s after an adoption the next index job starts (the transactor runs at 2.8 to 3.0 of its three cores), and in four of ten cases one save's apply or log append stalls 143 to 302 ms (146.2, 200.9, 254.6, 283.0 s). Saves due 6 to 12 s after an adoption have p99 287.6 ms. **The transactor's own collector log (`prep1-gc-tx.log`, `gc*,safepoint*=debug`) settles the cause.** Every one of the four stalls ends in the same millisecond as a ZGC "Allocation Stall" of the transactor's serial writer thread (`processor-…`), of its log thread or of its indexer: 136, 240, 229 (log thread) and 295 ms. The writer thread stalled five times in the loaded cell (698 ms in total), against twice (192 ms) in the control. At each stall a young collection started on the "Allocation Rate" trigger with 27% of the 24 GiB heap free, and the heap reached 100% used during marking: about 6.7 GB was allocated in 1.7 s at job start. Old-generation use after major collections ran at 49 to 74% of the heap (12 to 18 GB, with the 16 GiB object cache inside it). Safepoints are not the cause: 216 in the loaded cell, the longest 5.69 ms. The slow frames right after an adoption (burst A) coincide with no allocation stall; they are storage reads.

Between spells the loaded cell's busy p99 is 20.1 ms (3 to 6 s after an adoption, no job) and 27.5 ms (12 to 40 s, job running), against 8 to 13 ms in the control.

## 3. Does a 32-fact frame hold the single writer longer than a save?

Yes, by 2.3 to 2.8 times when settled and by about 14 times right after an adoption. Apply is strictly serial in the trace (no two applies overlap); log appends are pipelined.

| Time since the last adoption | Frame apply mean / p99, ms | Busy save apply mean / p99, ms | Frame ÷ save (mean) |
| --- | ---: | ---: | ---: |
| 0 to 1 s | 30.39 / 103.74 | 2.22 / 7.81 | 13.7 |
| 1 to 2 s | 12.15 / 29.80 | 1.40 / 4.97 | 8.7 |
| 2 to 4 s | 5.81 / 19.03 | 1.22 / 5.14 | 4.8 |
| 4 to 8 s | 3.61 / 11.64 | 1.25 / 7.44 | 2.9 |
| 8 to 15 s | 4.00 / 13.55 | 1.52 / 8.06 | 2.6 |
| 15 s and later | 3.06 / 6.61 | 1.34 / 6.07 | 2.3 |
| Whole window, halves | 3.57 → 4.13 | 1.28 → 1.49 | 2.8 |

A frame writes 83 datoms for 32 facts; a busy save writes 23 to 31 for one or two facts. Per fact the frame is far cheaper (0.10 ms against 0.7 to 1.3 ms), but each frame is one indivisible apply that every later transaction waits behind. A frame's hold from grant to receipt averaged 9.77 ms in the first half and 10.89 ms in the second. Over the whole cell it took about 1.9 ms to reach the transactor, 1.0 queued, 3.6 to 4.1 applying, 1.5 to the end of the log append and 2.1 back to the client. With one importer credit that hold caps the rate at about 92 frames, or 2,940 facts, per second.

## 4. How much of the 22× would the 32 GiB object cache remove?

**About 5%: the busy second-half p99 would fall from 286 ms to roughly 270 ms, still about 21×.** The reasoning:

1. The tail is set by spells A and B (79 to 100% of the slowest 1%). Neither is a capacity miss of the cache.
2. Spell A is generation turnover. Each index job writes new segments, and the first reads after adoption miss whatever the cache size. In the 32 GiB save run (`bench3-cache32`, 394/s, three cores) busy saves still read **1.11 SQL segments per save in the first second after adoption**, 0.51 in the next, against 0.015 once settled. This run read 1.34 in its first second. The cache32 reading's "0.0006 inside index jobs" counts saves during the build, not after adoption.
3. Spell B happens with the transactor at three of three cores and is not a read.
4. What the cache does remove is settled reads (0.41 to about 0.02 per save) and some settled apply. In the trace replay, halving settled save apply leaves second-half busy p99 at 212 against 222 ms for the unchanged replay, and raises the import to 3,327 from 3,059 facts/s. Under the fair scheduler the importer takes the writer time the cache frees.

**What would prove this wrong:** a fair-import run with the 32 GiB cache (and its 48 GiB heap), no other change, with second-half busy p99 under 150 ms, or with frame apply in the first second after adoption under 10 ms. The heap is a confound: the cache32 arms also raised the heap from 24 to 48 GiB. Spell B is now known to be collector allocation stalls on the 24 GiB heap, so that configuration would likely remove it as well. In the replay, removing the four stalls from the fair cell moves second-half p99 from 225 to 217 ms. The cache and heap together would therefore remove about 5 to 10%, not 15%.

## 5. The change: a live-first importer

**Rule:** the importer takes a credit only while no live save is waiting for one (`importMayStart` in `scale1/decision/writes.ts`). Nothing else changes: one importer credit, the same immutable 32-fact frames and command identities, the same commit-order gate, synchronous commit, journal records and receipts. Every import grant records how many live saves were queued at that moment (`liveQueued`). A yield arm asserts that every grant saw zero. `yieldedChecks` counts how often the importer was ready and held back.

**Why this rule and not the alternatives.** The serial writer cannot pre-empt a frame, so the client can only decide whether a frame enters the queue. Under the fair scheduler, the importer re-enters the credit window as soon as its turn comes, even while saves are waiting. Each slow post-adoption frame then joins the queue ahead of saves that are already late, and the spell feeds itself. With the yield rule, at most the frame already admitted stands in front of a backlog. Replayed against Saturday's trace (`neighbours_sim.py`, five seeds):

| Replay of the rolling 6 cell | Busy p99 whole / 2nd half, ms | Quiet p99 whole / 2nd half, ms | Facts/s |
| --- | ---: | ---: | ---: |
| Fair (as run; measured 325 / 286, 50.2 / 50.2, 2,941) | 211.7 / 222.3 | 42.4 / 45.0 | 3,059 |
| Fair with settled save apply halved (cache stand-in) | 203.7 / 212.0 | 41.8 / 43.0 | 3,327 |
| **Yield, 32 facts** | **49.2 / 60.8** | **38.4 / 42.5** | **3,039** |
| **Yield, 40 facts** | **58.3 / 66.9** | **43.7 / 47.8** | **3,470** |
| Yield, 32 facts, without the four job-start stalls | 41.6 / 41.4 | 34.7 / 35.1 | 3,057 |
| Yield, 40 facts, next frame 8 facts after a frame over 20 ms | 51.9 / 60.8 | 38.7 / 37.6 | 3,523 |
| Yield, 32 facts, frame cost by time since adoption instead of by frames since | 47.9 / 57.6 | 38.7 / 43.9 | 3,053 |

The replay under-predicts the measured fair cell (222 against 286 ms in the second half, 212 against about 325 ms whole, 42.4 against 50.2 ms quiet, 3,059 against 2,941 facts/s). The forecasts below scale its yield numbers by those ratios. Smaller frames after a slow frame, pauses keyed to index jobs and two importer credits were rejected. Variable widths change command identities and gained 6 ms. A pause does not lower the per-frame cost if the cost falls with the frames applied since adoption, which is how this trace reads. Two credits put a second frame in the transactor queue (replay quiet p99 56 to 58 ms, busy 73 to 87 ms).

## 6. Mac gate at toy size

**Passed at `22fb96e07`** (Mac, slot s3, one ordinary heavy token, about four minutes, clocks diagnostic):

```sh
DX_LOAD2_IMPORT_POLICY=yield TRIPLEX_DATOMIC_FAST_PATHS=save-wire node lab/bin/heavy.mjs --label DX-LOAD2 -- \
  node --import tsx lab/bin/engine.mjs ha1 --slot auto --holder DX-LOAD2 --experiment load-fair --diagnostic
```

The compact SCALE1 fixture ran both yield arms, each with toy quiet, control and import cells of 6 s. Live accounts offered 20 saves/s beside a two-credit importer, plus the quiet account and pinned reads on every account. Each arm discarded one durable import response and recovered its receipt. It then checked the whole native suffix against every save and frame and queried all imported rows independently at the terminal cut.

| Arm | Frames (facts) imported and verified | Times the importer held back | Grants made while a live save waited | Live saves and reads acknowledged |
| --- | ---: | ---: | ---: | --- |
| Yield, 32 facts | 92 (2,944) | 68 | 0 | 141 of 141 saves, 120 of 120 reads per cell |
| Yield, 40 facts | 167 (6,680) | 54 | 0 | 141 of 141 saves, 120 of 120 reads per cell |

The gate fails unless the importer held back at least once and imported at least one frame in each arm, so both paths ran. **Repeated at `7ab2c8daa` after adding the per-frame stage record:** the same gate passed. It imported 107 and 110 frames, with 36 and 44 hold-backs, no grant beside a waiting save, a stage on every frame, and all saves and reads acknowledged (`evidence/DX-LOAD2/load1/load-fair-56dd633f-085b-44f3-beab-d1b524dae119`). Two earlier attempts on the same rule are kept with the evidence. At 120 live saves/s the Mac stack was saturated, so the importer held back almost always (3 and 2 frames) and the invariant held. At 40 saves/s the second arm imported 53 frames with 326 hold-backs. Two attempts stopped before any offer: once on a toy-seed timeout with the Mac at load 41, and once on the 10 GiB disk floor. The default fair path is unchanged in code. Its launch shape is byte-for-byte the old one, but it was not re-run here. Evidence: `evidence/DX-LOAD2/load1/load-fair-6be68a88-be3c-450f-b5f2-22063db7aba8` (private).

## 7. Full-size server command

**Launch commit: the commit that carries this sentence (its code is `706c2d523`).** Do not launch `760fc0145` or `7ab2c8daa`: their `held-server.ts` declares `policy` twice, a SyntaxError that stops the launch before any offer. The Mac gate never loads that file, because it is Linux-only. The launch commit renames the argument and loads cleanly up to its Linux check on the Mac. Run from the published commit on the prepared server, exactly as [FAIR-SERVER.md](FAIR-SERVER.md), with the native job queue clear, a fresh disposable copy of the held fresh copy and its byte-matching WAL copy. Only the last two options are new. The launch runs two arms on one copy: rolling 6 with yield at 32-fact frames, then rolling 6 with yield at 40-fact frames. Each arm keeps its own five-minute quiet, control and import cells, so every ratio is against a baseline taken minutes earlier on the same database. Barrier 6 is not run; it was dominated on Saturday. Thirty minutes are timed; the 57-minute limit is unchanged.

```sh
bash lab/experiments/EXP-DX1/load1/fair-server.sh \
  "$(git rev-parse HEAD)" "$IMAGE" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$PG_TEMPLATE" "$NEW_OUTPUT" --pg-data "$PG_COPY" --wal-dir "$WAL_COPY" \
  --credit-mode rolling6 --import-credits 1 --frame-facts 32,40 --import-policy yield
```

Outputs per arm: `rolling6-yield32-{quiet,control,import}{,-raw}.json` and `rolling6-yield32-comparison.json`, then the same for `rolling6-yield40`. Each comparison now carries `yieldedChecks` and `importGrantsBesideLiveQueue` (must be 0). Each imported frame in `*-import-raw.json` now carries its own `stage` (gateway timeline, `transactMicros`, `nativeComputeMs`, datoms). The Mac gate recorded it for every frame (107 of 107 and 110 of 110 at `7ab2c8daa`). The import path returns no per-frame I/O counters, so frames' SQL reads stay unmeasured. Frame apply against time since the last adoption comes from joining each receipt's `t` with `prep1-native.ndjson` and the adoptions in `tx.jsonl`; the reader does this. **Collect for the reading:** `result/*.json`, and from `result/engines/*/trace/raw/` the files `prep1-native.ndjson`, `tx.jsonl`, `prep1-gc-tx.log` and `tx-jvm.log` (Saturday's bundle had all four). Collector logging is the stack's existing `-Xlog:gc*,safepoint*=debug` and `gc*,safepoint*=info`; no collector, heap or measured setting changes. Read the evidence with `neighbours_reading.py SUMMARY RAW rolling6-yield32 rolling6-yield40` after extracting both archives. For each arm it prints writer stalls of 100 ms or more, the allocation stalls that end inside them, and the writer thread's stall count and total.

### Predictions, written before any run

| Measure | Yield, 32 facts | Yield, 40 facts | Saturday's fair rolling 6 |
| --- | ---: | ---: | ---: |
| Verified facts/s, whole (second half) | 2,920 (2,740); range 2,750–3,100 | 3,330 (3,140); range 3,100–3,550 | 2,941 (2,762) |
| Busy save p99 ms, whole | 65–75; range 45–110 | 75–90; range 50–130 | 319–331 |
| Busy save p99 ms, second half | about 78; range 50–110 | about 86; range 55–130 | 282–290 |
| Busy second-half ratio against a 12–14 ms control | about 6×; range 4–9× | about 6.5×; range 4–10× | about 22× |
| Quiet loaded commit p99 ms, whole | about 45; range 38–55 | about 52; range 42–60 | 50.24 |
| Worst read ratio | at most 1.4× | at most 1.4× | 1.37× |
| Slowest 1% of busy saves due within 6 s of an adoption | 50–80% | 50–80% | 79–100% |
| Busy saves' share of time waiting for a credit, slowest 1% | under 60% | under 60% | 91% |
| Index adoptions per 300 s import cell | 9–11 | 11–13 | 10 |
| ZGC allocation stalls of the writer thread in the import cell (count, total) | 3–6, 400–900 ms | 4–7, 500–1,100 ms | 5, 698 ms |

**Against the bar.** On the whole-window comparison that Saturday's reading used, the 40-fact arm is forecast to clear 3,000 facts/s with busy and read ratios well inside 1.5×, and its quiet account sits on the 50 ms line (about a 40% chance it meets it). The 32-fact arm is forecast to keep the quiet account under 50 ms (about 60%) and to miss 3,000 facts/s by about 3%. **Neither arm is forecast to hold busy saves within 1.5× of the clean second-half baseline.** That needs about 19 ms, and between spells the loaded cell already ran at 20 to 28 ms p99, because the import takes about a third of the serial writer and keeps an index job running most of the time.

**What would show the forecast wrong.**

1. A second-half busy p99 above 150 ms in either arm: the yield rule does not break the spells, and the credit-queue explanation is wrong.
2. A second-half busy p99 under 30 ms: the replay overstates the cost of what remains, and the bar is closer than stated.
3. Facts/s under 2,600 at 32 facts: yielding costs the importer far more grants than the replay found.
4. Any `importGrantsBesideLiveQueue` above zero, any missing live offer, or any row, feed or journal mismatch: the run does not qualify, whatever its clocks.
5. Under 40% of the slowest 1% falling within 6 s of an adoption while the tail stays above 60 ms: something other than index jobs sets the tail, and the next step below is aimed at the wrong thing.

### The next step if the arm misses as forecast

Fewer index jobs, not a different importer. Ten adoptions in five minutes cause both kinds of spell. Raising `memory-index-threshold` from 256m (with `memory-index-max` raised to match and heap headroom checked) should cut adoptions toward the control's rate of about three per five minutes. That is a transactor setting, not a change to Datomic. It needs its own arm and its own forecast, because a larger memory index lengthens each job and must not reach the maximum, where Datomic slows writers. The 48 GiB heap should be tested in the same arm, to settle whether the job-start stalls are a collector effect.

## 8. What the priority 8 bar means for a busy account, in numbers (for the owner)

The bar compares each live account's p99 under import with the same account's p99 without import, minutes earlier on the same database, and allows 1.5 times. For a busy account's saves in a clean window, that baseline was 12.6 ms p99 on Saturday (second half of the control cell, 235 saves/s across nine accounts), so the bar is about 19 ms. The save bar for these accounts outside an import is 50 ms p99, so the ratio rule is about 2.6 times tighter than the absolute bar. The quiet account already has an either-or clause: within 1.5 times its baseline, or inside the measure's own 50 ms commit bar. On Saturday's evidence the clean loaded cell, between index-job bursts, ran at 20 to 28 ms p99. That passes 50 ms and fails 19 ms. The yield arm is forecast at about 78 ms in the second half, which fails both. The ratio also depends on which window is measured. Over the whole five minutes, the control's cold first ten seconds set the baseline at 466 to 477 ms, so the same loaded cell measured 0.68 times. In the clean second half it measured about 22 times. This note does not change the bar. Whether the quiet account's clause, 1.5 times or inside 50 ms, should also apply to busy accounts is the owner's call.

## 9. What the evidence cannot establish

1. **Settled on 2026-11-23: the job-start stalls are ZGC allocation stalls** (section 2), read from the transactor's collector log in Saturday's summary archive. It is still open whether more heap headroom alone removes them. Tonight's run logs the same file, so a repeat can be checked the same way.
2. **Why frames are so much slower than saves after an adoption.** Frames carry no per-transaction I/O counters (the import path does not return them), so the frame's own SQL reads are inferred from timing, not counted. Whether its post-adoption cost falls with frames applied or with time cannot be separated cleanly: the two readings of the trace disagree on some bins. The replay tried both, and the yield result barely changes.
3. **Physical reads.** SQL counts requests to PostgreSQL, which may serve them from memory.
4. **The quiet account's tail.** Its 11 slowest saves (of 1,050) split between the job-start stalls (5) and the first slow frames after adoptions (6). A reserved credit does not help with either, because the frame is already at the writer. So the yield rule helps the quiet account less than the busy ones.
5. **Mac clocks.** The toy gate proves the rule and exactness only. Its clocks are diagnostic and say nothing about full-size latency.

## Reproduce

Extract `summary.tar.zst` and `raw.tar.zst` of `bench3-fair-import` into two directories, then run `python3 -I neighbours_reading.py SUMMARY RAW` for sections 1 to 3. `python3 -I neighbours_cache32.py` takes the cache32 arm's `r394-loaded.json`, `prep1-native.ndjson` and `prep1-index.ndjson` (section 4). `python3 -I neighbours_sim.py SUMMARY RAW '[{"policy":"yield"}]'` runs the replay (section 5). The outputs used here are kept privately with the evidence (`evidence/DX-LOAD2/reading/`).

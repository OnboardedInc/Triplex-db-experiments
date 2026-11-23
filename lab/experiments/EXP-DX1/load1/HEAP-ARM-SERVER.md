# Priority 8 · Yield 32 with the cache32 transactor memory: one control and one import cell

## What tonight's live-first run says (bench 4, `bm1/IMPORT-YIELD-READING.md`)

1. **Yield 40 was worse than yield 32 for two reasons.** Larger frames cost more per fact on the single writer: 6.33 against 4.00 ms per frame in the second half, 0.158 against 0.125 ms per fact. They also cost more after an adoption: 42 against 28 ms per frame and 89 against 56 storage reads per frame in the first second, with a slower recovery (8.4 against 3.3 ms at 4–8 s). The writer ran 84% busy against 72%, so the importer held back 37,565 times against 16,841 and fell to 2,553 facts/s.
2. **Run order made it worse.** Yield 40 ran second on the same copy, when its own control already had 7 writer allocation stalls totalling 2,177 ms (yield 32's control had 2, 276 ms). The heap filled as the cache warmed, so the comparison of 32 against 40 facts is not clean.
3. **24 or 16 facts would not help.** With one credit a frame takes 9–11 ms from grant to receipt, but only 3–4 ms of that is the writer. That caps throughput near 2,300 facts/s at 24 and 1,600 at 16. The tail now comes from collector stalls, not frames.
4. **The forecast missed the adoption bursts because it overrated them.** With the yield rule a post-adoption frame adds at most about 30 ms to a save behind it. The three job-start allocation stalls (173, 254, 246 ms) each freeze all five neighbour credits at once and queue about 60 saves each. That is enough to set the slowest 1% (1% of the slowest saves fell within 6 s of an adoption, against my 50–80%).
5. **I guessed that share; the replay could have computed it.** Removing the saves within 3.5 s of the three writer stalls takes yield 32's second-half busy p99 from 103.7 to 45.6 ms, and quiet from 40.8 to 37.9 ms. Yield 40: 336.9 to 67.6 ms.

## The arm

**One arm on one fresh copy:** yield 32, rolling 6, one importer credit. The transactor gets PREP1's cache32 memory: 48 GiB heap, 32 GiB object cache, 8 GiB direct memory, 60 GiB container. These are the same JVM1 launcher values (`txCacheMiB: 32768`), ported unchanged into `jvm1/launch.mjs`. Every other role, core placement, collector flag, durability and memory-index setting is unchanged. Role caps sum to 79 GiB (60 + 6 + 5 + 8), and the launch refuses a host with under 89 GiB `MemTotal`. **Cells:** control (live only), then import, five minutes each, both under the same memory. The quiet-alone cell is skipped. The quiet account's bar uses its own control cell, and the comparison file shows `quietAlone: null`. Output files: `rolling6-yield32-c32-{control,import}{,-raw}.json` and `rolling6-yield32-c32-comparison.json`. The transactor's collector log (`prep1-gc-tx.log`, `tx-jvm.log`) is written as before.

```sh
bash lab/experiments/EXP-DX1/load1/fair-server.sh \
  "$(git rev-parse HEAD)" "$IMAGE" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$PG_TEMPLATE" "$NEW_OUTPUT" --pg-data "$PG_COPY" --wal-dir "$WAL_COPY" \
  --credit-mode rolling6 --import-credits 1 --frame-facts 32 --import-policy yield \
  --tx-cache 32768 --cells control,import
```

**Duration:** about 16 to 22 minutes. That is ten timed minutes plus launch, verification and cleanup; tonight's six-cell launch took 34 minutes in all. The launcher's limit for this cell set is 38 minutes plus one for termination. Run it through the launch dry run first, as tonight.

## Predictions, written before any run

| Measure | Tonight, yield 32, 24 GiB heap | This arm, forecast |
| --- | ---: | ---: |
| Writer-thread allocation stalls, import cell | 4 (659 ms, max 246) | 0 to 2, none over 150 ms |
| Writer-thread allocation stalls, control cell | 2 (276 ms, max 226) | 0 |
| Control busy save p99, second half | 14.3 ms | 9 to 14 ms |
| Import busy save p99, second half | 103.7 ms | 30 to 50 ms (central 40) |
| Ratio to the control, second half | 7.3× (8.2× worst account) | 2.5 to 4.5× (central 3.3×) |
| Quiet loaded commit p99, whole | 37.9 ms | 25 to 40 ms |
| Verified facts/s, whole (second half) | 3,059 (2,752) | 3,150 to 3,500 (3,000 to 3,400) |
| Worst read ratio, whole | 1.23× | at most 1.3× |
| Slowest 1% of busy saves in the second half due within 6 s of an adoption | 1% | 40 to 80% |

The reasoning: the 48 GiB heap with the 32 GiB cache had no allocation stall in any of Saturday's 12 save cells, down to 9–12% free at collection start. Without the stall spells tonight's tail is 45.6 ms. The larger cache also cuts settled reads (Saturday: 0.36 to about 0.04 per save) and settled apply. That frees writer time, so the importer yields less. The post-adoption reads are new index segments, which no cache size holds (`HEAP-READING.md`, `NEIGHBOURS-SERVER.md` section 4), so those bursts remain and set the new tail.

**What would show it wrong.**

1. Three or more writer allocation stalls over 150 ms in either cell: the cache32 heap shape does not hold the import's allocation bursts, and the next lever is the collector (more concurrent GC threads or a soft heap cap), not the cache.
2. Second-half busy p99 above 80 ms with no stalls: something other than stalls and adoption bursts sets the tail.
3. Facts/s below 2,900 over the whole window: the larger heap or cache costs the importer throughput.
4. Any grant beside a waiting live save, any missing offer, or any row, feed or journal mismatch: the run does not qualify.

## What would mean the priority 8 bar is met, and what else it would need

**Met:** in the second half, every live account's save p99 is at most 1.5× its control, which is about 15–20 ms on a 10–14 ms control. Every read p99 is at most 1.5× its control. The quiet account is at most 1.5× its control or at most 50 ms. The import verifies at least 3,000 facts/s in both halves. I give this about a 10% chance.

**Not met with the stalls gone and the tail in the 6 s after adoptions (the forecast case):** the remaining cost is index-job turnover, which the cache cannot remove. The next arm combines this memory with the fewer-index-jobs setting (memory index 512m and 1536m, already gated at `b847b5480`; with 48 GiB of heap, the extra index memory fits). An importer pause of one or two seconds after a slow frame could then follow as a separate arm. If the owner adopts an absolute clause for busy accounts like the quiet account's (within 1.5× or inside the 50 ms save bar), the forecast 30–50 ms would meet it.

**Not met because stalls remain:** collector settings for the transactor, as a separate arm.

## Mac gate at toy size

**Passed at `f7a51f9d5`** (`DX_LOAD2_CELLS=control,import`, yield, toy). It ran one control and one import cell with no quiet cell. 390 frames (12,480 facts) were imported and verified, with 3 hold-backs and no grant beside a waiting save. The discarded durable response was recovered, and all 141 saves and 120 reads per cell were acknowledged. The comparison holds `quietAlone: null`. No containers or networks were left (`evidence/DX-LOAD2/load1/load-fair-a8f42c5e-a5cc-4d4f-8bf0-530a8d41d8d8`). The Mac stack uses the laptop profile, so the 48 GiB memory itself cannot run there. Instead the launch profile was checked directly: `launchProfile("server", {txJvm: "j25-zgc", writeJvm: "j25-zgc", txCacheMiB: 32768})` gives `-Xmx49152m -XX:MaxDirectMemorySize=8192m -Ddatomic.objectCacheMax=32768m`, a 61,440 MiB container, and unchanged writer, reader, PostgreSQL and memory-index settings. These are the same flags as Saturday's cache32 arms. `held-server.ts` loads to its Linux check on the Mac, and its option checks typecheck.

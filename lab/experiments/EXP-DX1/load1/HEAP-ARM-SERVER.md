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

## Next arm: the same memory with fewer index jobs (memory index 512m / 1536m)

**The heap arm ran and every forecast held** (`bm1/IMPORT-YIELD-READING.md` at `b3b519aad`). No writer allocation stall in either cell; control busy second-half p99 9.7 ms; import 45.1 ms (4.6×); quiet 39.0 ms; 3,321 facts/s (3,094 in the second half). 97% of the slowest 1% fall within 6 s of an index adoption (11 adoptions in the import cell).

**A code change was needed.** At `96b16e759` the two options refused each other: `fair-server.sh` required no `--memory-index` with `--tx-cache`, `held-server.ts` asserted the same, and the arm-label check had no combined form. `b65c2cc2f` removes those two refusals and labels the arm `rolling6-yield32-c32-mi512m`. Nothing else changes. Both cells run on one stack, so **the control cell runs under the same memory-index setting** as the import. The combined launch profile checks out:

- transactor `-Xmx49152m -XX:MaxDirectMemorySize=8192m -Ddatomic.objectCacheMax=32768m`, container 61,440 MiB;
- memory index `{threshold: 512m, max: 1536m}`, passed to `stack/up.sh` as `--memory-index-threshold 512m --memory-index-max 1536m`;
- write gateway, read gateway, PostgreSQL and credit mode identical to the heap arm.

**Mac gate passed at `b65c2cc2f`** (`DX_LOAD2_MEMORY_INDEX=64m,128m DX_LOAD2_CELLS=control,import`, yield, toy). The Mac stack cannot run the 48 GiB memory, so the toy combines the memory-index option with the two-cell set only. The import cell verified 244 frames (7,808 facts), with 8 hold-backs and no grant beside a waiting save. The discarded durable response was recovered, all saves and reads were acknowledged, and nothing was left running (`evidence/DX-LOAD2/load1/load-fair-0affbaae-8fe9-44d8-bdda-4d556fb2858b`).

```sh
bash lab/experiments/EXP-DX1/load1/fair-server.sh \
  "$(git rev-parse HEAD)" "$IMAGE" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$PG_TEMPLATE" "$NEW_OUTPUT" --pg-data "$PG_COPY" --wal-dir "$WAL_COPY" \
  --credit-mode rolling6 --import-credits 1 --frame-facts 32 --import-policy yield \
  --tx-cache 32768 --memory-index 512m,1536m --cells control,import
```

Duration: about 17 minutes (the heap arm took 17 min 6 s), with a 38-minute launcher limit.

### Predictions, written before any run

| Measure | Heap arm (256m / 1g), measured | This arm (512m / 1536m), forecast |
| --- | ---: | ---: |
| Index adoptions in the 300 s import cell | 11 (every 23–27 s) | 5–7 (every 42–62 s) |
| Index adoptions in the control cell | 2 | 1 |
| Writer allocation stalls, either cell | 0 | 0–1, none over 150 ms |
| Heap free at collection start, import cell, lowest / median | 15% / 19% | 12–15% / 15–19% |
| Control busy p99, second half | 9.7 ms | 8–12 ms |
| Import busy p99, second half | 45.1 ms | 35–55 ms (central 42) |
| Ratio to the control, second half | 4.6× | 3.5–5.5× (central 4.3×) |
| Slowest 1% within 6 s of an adoption, second half | 97% | 80–97% |
| Quiet loaded commit p99, whole | 39.0 ms | 30–45 ms |
| Verified facts/s, whole (second half) | 3,321 (3,094) | 3,300–3,550 (3,100–3,400) |
| Worst-case log to replay at a transactor restart | about 200 MB (4–26 s) | about 370 MB (8–50 s); not measured by this arm |

**The reasoning.** Under import the memory index fills at about 10 MB/s by Datomic's own measure, so twice the threshold halves the adoptions. Each job then rewrites more segments, so each post-adoption spell runs 1.2 to 1.8 times as deep. The tail stays in the spells, which now cover about 12% of saves instead of 24%. The p99 moves down only a little, because it is set by the depth of the worst spells, not by how many there are. The extra memory index adds 0.3 to 1.3 GB of live heap. The 48 GiB heap had 15% free at its lowest under import, and Saturday's cache32 save runs went to 9–12% with no stall. So the heap should still clear.

**What would show it wrong.**

1. Adoptions outside 4 to 8: the fill-rate model is wrong.
2. Two or more writer allocation stalls, or any over 150 ms: the larger memory index does not fit this heap's headroom under import.
3. Second-half busy p99 above 60 ms: fewer but deeper spells make the tail worse. Raising the threshold is then the wrong direction.
4. Second-half busy p99 under 25 ms: the spell count matters more than forecast, and a larger threshold should be tried next.
5. Any memory-index back-pressure warning in the transactor log, any refused or expired save, or any grant beside a waiting live save: the arm is invalid.

### Can any setting meet the strict 1.5× bar?

**No setting I know of in this design.** The strict bar needs busy second-half p99 at most 1.5 × 9.7 = 14.6 ms. In the heap arm the busy p99 was still 18.1 ms for saves due 10 s or more after an adoption, and 19.9 ms for saves due 6 s or more after. That is a floor with no spell at all. At 3,000 facts/s the import keeps about 45 to 58% of the serial writer busy (97 frames/s at about 3 ms each), and a live save that arrives behind a frame waits for it. Fewer index jobs can bring the p99 down toward that floor, about 20 ms, but not below 14.6 ms. Getting there would take the import off the live writer's path, for example a separate transactor or database for the import. That would break the single-database rule. Or it would take fewer facts per second, which breaks the 3,000 target. **So the strict 1.5× bar for busy accounts needs the absolute clause** the quiet account already has: within 1.5× of baseline, or inside the measure's own 50 ms save bar. The heap arm already meets that clause, with busy 45.1 ms and quiet 39.0 ms in the second half, as this arm is forecast to.

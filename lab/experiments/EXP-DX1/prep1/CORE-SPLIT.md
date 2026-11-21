# Give the transactor two of the writer's cores

**North star P2.** Scheduled offer to durable ACK and quiet isolation on the sealed one-database seed of 162,456,470 facts. These five-minute cells diagnose the writer, with exact receipts and without the P1 background readers needed for a P2 score. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## What happened at 394/s

The comparison uses the same four transactor-clock bins for both credit widths. Debt-building bins are seconds 200–220 and 270–290. Clear or draining bins are 170–190 and 230–250. Each ACK was joined to its native member in the original source, slot and attempt. Apply is native start to applied. Reads and associated timings are Datomic's per-save SQL and deserialization counter deltas.

| Policy | Bins | Saves | Apply mean / p50 / p99 | SQL reads/save | SQL read / decode time per save |
| --- | --- | ---: | ---: | ---: | ---: |
| Rolling 6 | Clear/draining | 15,504 | 1.398 / 1.459 / 3.606 ms | 0.993 | 0.211 / 0.453 ms |
| Rolling 6 | Debt building | 13,142 | 2.793 / 2.360 / 8.036 ms | 1.571 | 0.614 / 0.814 ms |
| Rolling 12 | Clear/draining | 15,434 | 1.448 / 1.520 / 3.874 ms | 0.978 | 0.243 / 0.457 ms |
| Rolling 12 | Debt building | 14,794 | 2.537 / 2.159 / 7.473 ms | 1.636 | 0.580 / 0.810 ms |

Rolling 6's 200–220 bin alone rose to 3.022 ms apply and 1.642 reads/save. At 270–290 it was 2.588 ms and 1.506 reads/save. Rolling 12 was 2.564 ms and 1.597 reads/save in the first bin, and 2.511 ms and 1.674 in the second. Additional SQL read and decode time together grew by 0.764 ms/save for rolling 6 and 0.690 ms/save for rolling 12. Those increases are 55% and 63% of the respective wall-time increases as a scale comparison. The counters cannot isolate CPU scheduling inside the read and decode paths or show what evicted the working set. The data rule out unchanged reads as the explanation. They support testing CPU headroom under indexing and cache pressure together.

The sealed database's index jobs covered 198.76–219.03 s and 262.75–285.26 s for rolling 6 and 198.74–217.85 s and 262.70–284.44 s for rolling 12. Neither clear/draining bin had a recorded active job. Across their ten-second splits, transactor CPU rose from 0.95–1.44 to 2.26–2.71 cores for rolling 6 and from 0.90–1.45 to 1.81–2.72 for rolling 12. No bin recorded cgroup quota throttling. Competition inside a three-core affinity mask can still occur without a quota event. The SQL counts distinguish more reads from a pure CPU-only slowdown, while the CPU and job clocks support a mixed explanation. Neither clock can establish how much faster the same read would be with two more cores.

## Fourth arm

Move physical cores 4 and 5 from the writer gateway to the transactor. The transactor gets cores `0,4,5,7,8` with Java 25 ZGC and `-XX:ActiveProcessorCount=5`. Leave `index-parallelism=1`, `ConcGCThreads=2` and `ParallelGCThreads=3`. One index worker and two concurrent GC workers leave two core slots in that worker budget for serial apply and other work. The process mask does not dedicate a core to any thread or guarantee scheduler availability during safepoints, JIT work or storage waits. The writer gets cores `2,3` with Java 21 G1, `ActiveProcessorCount=2`, `ParallelGCThreads=2` and `ConcGCThreads=1`. Preserve the headline heap, cache, memory-index thresholds, durable PostgreSQL settings and separate WAL. The reader, sender and observer keep the same placements.

Run the fourth arm separately in a new output directory on the same host and prepared template as fresh-first. It has only the 394 and 620 matched 300-second solo/loaded pairs, with the same people and offers as the control at those rates. Skipping 235 preserves the existing three-arm queue item and its 120-minute cap. The add-on takes 20 minutes of tape and caps the whole add-on at 35 minutes. The skipped cell means 394 begins from a colder earlier history than the control. Compare both halves and check index overlap separately. The one-branch launch defaults stay with the integration builder.

```bash
DX_PREP1_ROLLING_ARM=rolling6-tx5 DX_BARE_METAL=1 \
  node lab/bin/heavy.mjs --label DX-PREP1-tx5 -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh rolling "$TX5_OUT" 73afad665ac2ccecea62161b8dfb6a3a48287057 \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$SCALE1_PGDATA" --wal-mount "$SCALE1_WAL_MOUNT"
```

Use the clean checkout pinned by [the report](REPORT.md). Compare against its separately pinned original three-arm control. The observer checks live Linux affinity each second. The collector checks the exact masks, JVM versions and final flags, transactor properties and SQL durability before accepting the sealed summary.

## Forecast before launch

Measure late spells as at least five consecutive one-second observations with 300 or more scheduled offers still without an ACK. At 394 the control had two such second-half spells with peaks of 2,117 and 1,825. At 620 the measure includes expired work, so its depth is a delivery deficit rather than just the live queue.

| Offered/s | Stored/s whole / second half | Second-half busy p99 | Second-half spells and max depth | Loaded quiet p99 |
| ---: | ---: | ---: | --- | ---: |
| 394 | 394 / 394, no expiries | 300 ms | Zero ≥300-offer spells, with at most one smaller recurrent build and a peak below 250 | 49 ms |
| 620 | 478 / 500 | 30,025 ms | One sustained overload spell. About 42,600 still without ACK at 300 s, including expiries. | 55 ms |

The forecast assumes some of the apply slowdown yields to CPU headroom while SQL demand still rises around the index work. It leaves the full-window 50 ms busy target open, and predicts continuing overload at 620. If index-aligned bins still reach 2.5–3.0 ms apply, about 1.6 reads/save and thousand-offer queues with the transactor comfortably under five cores and no cgroup throttling, the extra cores did not address the limit. If the two-core writer instead saturates and its preparation or reply gets worse, the split is a poor trade. If it wins on repeat with the same receipts and quiet latency, the integration builder can adopt this 5/2 placement and keep the current index and ZGC worker caps.

## Checks and custody

Mac launch-policy verification used an ordinary token and no engine. The tests accepted the intended flags and refused wrong CPU, ZGC and index settings. The Java 25 final-flag parser also decoded the archived real baseline transactor startup. The three-arm plan matched its saved bytes, the new paired tapes retained the two control tape digests at each rate, and the producer/collector fixture joined 1,022 expected synthetic receipts. The startup settings check awaits a live Linux launch of the fourth arm. The derived cohort ledger and launch gates are under `evidence/DX-PREP1/p16-placement`. [Evidence checksums](SHA256SUMS)

The analyser uses the published checkpoint and archive digests, their original source, plan, seed and slot, exact ACK-to-native joins, and database-bound index begin/end lines. The live startup check reads the new owned slot's logs and mounted transactor properties before offers. The collector rechecks those observations against the sealed plan, bound container IDs, PID incarnations and CPU masks, and hashes the consumed files. Its existing exact receipt and WAL checks continue to apply. Mac fixtures are explicitly synthetic. No contract pins moved. [Published checkpoints](https://github.com/OnboardedInc/Triplex-db-experiments/blob/1b2eaf8bbcbea2117b4bc87fd4c8b915dc9888a8/lab/experiments/EXP-DX1/bm1/ROLLING-READING.md)

# Two-server synchronous failover campaign

From the clean published experiment branch, the orchestrator supplies the two released SSH targets through `BENCH_SERVER` and `BENCH_SERVER_B` and the dedicated private IPv4 link through `HA1_LINK_A` and `HA1_LINK_B`. The dedicated host manifests must name `DX-HASYNC1`. Use a new tag for each run.

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite hasync-p9-v3
```

The 18-cell schedule builds one edited 100,000-subject checkpoint on A and a 740-subject lean checkpoint on B. The larger checkpoint drives the withheld reply, index fault and planned move. The withheld-reply cell also retries one committed replacement from saved bytes, measures a fresh standby rebuild and verifies that a fresh boot container refuses the retained old disk. The mid-commit, import, both directional WAL cuts and reboot run on small fresh fixtures. The cost pair compares both flush policies at depths 1, 16 and 64 on the same smaller strict lean checkpoint. Fleet counts use independent Datomic systems and small data. The Mac supplies the smaller deep scale points.

A system receives five saves and 50 pinned reads per second. At scale, two read offers per second open a new deep subject at the checkpoint cut. A one-second caller deadline separates on-time and late answers. A 5.5-second wire deadline preserves the opportunity to observe a late reply and its receipt. A client should durably keep each unconfirmed command and retry with the same command ID and bytes after reconnect.

| Probe | Two-server forecast |
| --- | --- |
| Edited seed with 16,045,255 active facts and 60,000 status replacements | 53–59 min at 4,800–5,400 facts/s with index and checked snapshot. Lean seed runs in parallel. |
| 16M first on-time save after withheld reply / index crash | 12–30 s / 15–38 s. About 60–190 offers fall in a write gap at five per second. Expect the sealed route to refuse most. |
| Retry of one committed replacement with a withheld reply | The repeat returns the original receipt and leaves one replacement in the feed. A different command with the retired predecessor conflicts. The extra setup and audit are forecast to take under five seconds inside the existing cell. |
| Cold reads and native log replay after failover | Read completion gap 0.1–1.0 s on healthy peers. Replay of a ≤40 MiB post-index tail should take 0.1–2.5 s. Gateway and broker timings are captured separately. |
| Mid-commit, import, directional WAL cuts, and reboot | 11–40 s to a fresh save. No lost earlier receipt, duplicate command, changed pin or out-of-order feed entry. |
| Planned move at 16M / 160M | 18–30 s / 21–40 s. Data precopy stays outside the pause. Heavy write tails or large rewind can cross the 30-second bar. The paired run measures 16M. |
| Last system after shared PostgreSQL failure at 1 / 4 / 10 systems | 12–27 s / 15–34 s / 20–46 s. Shared SQL promotes once and each Datomic writer rejoins concurrently. |
| Last system after dedicated PostgreSQL failure at 1 / 4 / 10 systems | 12–28 s / 16–38 s / 24–55 s. SQL and Datomic recovery run concurrently with more I/O and process overhead. |
| Idle resources | Forecast each active or standby transactor 120–260 MiB and 0.005–0.05 core. Each small PostgreSQL member 30–100 MiB and under 0.05 core. Add one peer JVM per side. Measure deltas over two heartbeat rounds. |
| One-copy gap / fresh synchronous standby | 12–38 s to reopen on one copy when the fence works. Full replacement 45–180 s at 16M and 7–27 min at 160M at 75–150 MB/s effective copy plus catch-up. |
| Synchronous save surcharge at depths 1 / 16 / 64 | +0.23–0.74 ms isolated or ungrouped. +0.03–0.19 ms per save in groups of four to eight. |
| Paired run with prepared builds and 40 GB free per host | 75–85 min for the cells and up to four minutes for launch and collection at expected archive sizes. The worker stops starting cells at 85 min and the service ceiling is 89 min. |

The upper budget assumes the full seed finishes inside 59 minutes and large restores, the rebuild and remaining tests fit 26 minutes. Lower rates can miss the budget and yield a partial archive. Preparing the pinned checkout and images is outside the worker timer. [Earlier loader measurements](https://github.com/OnboardedInc/Triplex-db-experiments/blob/530f435d2/lab/experiments/EXP-DX1/load1/PART3.md)

The controller archives raw outcomes and independently recounts each completed traffic stream against the predeclared topology, source, nonce, slot, scope, schedule and bytes. It matches the replacement receipt to the archived pending command, exact wire bytes and replay case. The bench power probe stops the owned workload. A physical power-loss test requires the enrolled independent interlock. [Fence procedure](FENCE.md)

# Two-server synchronous failover campaign

From the clean published experiment branch, the orchestrator supplies the two released SSH targets through `BENCH_SERVER` and `BENCH_SERVER_B` and the dedicated private IPv4 link through `HA1_LINK_A` and `HA1_LINK_B`. The dedicated host manifests must name `DX-HASYNC1`. Use a new tag for each run.

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite hasync-p9-v4
```

The 23-cell schedule builds one edited 100,000-subject checkpoint on A while B builds edited 740- and 6,300-subject checkpoints and a separate 740-subject lean checkpoint. Each checkpoint has its own backup manifest and receipt seal. Once loading finishes, run both fleet layouts at 1, 4 and 10 systems, then withheld reply, index fault and planned move at each edited size. Every withheld-reply cell retries a committed replacement from saved bytes. The 100,000-subject cell also measures a fresh standby rebuild and verifies that a fresh boot container refuses the retained disk. The two directional WAL cuts run on small fixtures. The lean checkpoint drives both flush policies at depths 1, 16 and 64. Mid-commit, import and the explicit old-writer restart are covered by the Mac correctness drills.

The smaller checkpoints start on B and the full checkpoint starts on A. Interpret the size fit with the recorded host orientations and separate replay, broker, peer and rewind timings. Fleet cells measure deployments with multiple Datomic systems. The version 0.1 product scorecard uses one shared database.

A system receives five saves and 50 pinned reads per second. At scale, two read offers per second open a new deep subject at the checkpoint cut. A one-second caller deadline separates on-time and late answers. A 5.5-second wire deadline preserves the opportunity to observe a late reply and its receipt. A client should durably keep each unconfirmed command and retry with the same command ID and bytes after reconnect.

| Probe | Two-server forecast |
| --- | --- |
| Edited seed with 16,045,255 active facts and 60,000 status replacements | 53–59 min at 4,800–5,400 facts/s with index and checked snapshot. Smaller edited and lean seeds finish on B during that window. |
| 100,549 / 1,000,464 active facts | 11–30 s / 12–34 s after a withheld reply or index crash. Planned pauses 12–23 s / 14–26 s. |
| 16M first on-time save after withheld reply / index crash | 12–30 s / 15–38 s. About 60–190 offers fall in a write gap at five per second. Expect the sealed route to refuse most. |
| Retry of one committed replacement with a withheld reply | The repeat returns the original receipt and leaves one replacement in the feed. A different command with the retired predecessor conflicts. The extra setup and audit are forecast to take under five seconds inside the existing cell. |
| Cold reads and native log replay after failover | Read completion gap 0.1–1.0 s on healthy peers. Replay of a ≤40 MiB post-index tail should take 0.1–2.5 s. Gateway and broker timings are captured separately. |
| Mid-commit, import, directional WAL cuts, and reboot | 11–40 s to a fresh save. No lost earlier receipt, duplicate command, changed pin or out-of-order feed entry. |
| Planned move at 16M / 160M | 18–30 s / 21–40 s. Data precopy stays outside the pause. Heavy write tails or large rewind can cross the 30-second bar. The paired run measures 16M. |
| Last system after shared PostgreSQL failure at 1 / 4 / 10 systems | 12–27 s / 11–34 s / 20–46 s. The Mac last-save diagnostics were 17.50 s and 12.02 s for one and four. Shared SQL promotes once and each Datomic writer rejoins concurrently. |
| Last system after dedicated PostgreSQL failure at 1 / 4 / 10 systems | 12–28 s / 13–38 s / 24–55 s. The Mac last-save diagnostics were 19.87 s and 22.25 s for one and four. SQL and Datomic recovery can run concurrently and compete for I/O. |
| Idle resources | Forecast each transactor at 120–260 MiB and 0.003–0.05 core. Small dedicated PostgreSQL members 30–100 MiB each and shared members 85–160 MiB each. Forecast 200–300 MiB for the gateway per side. Measure deltas over two heartbeat rounds. |
| One-copy gap / fresh synchronous standby | 12–38 s to reopen on one copy when the fence works. Full replacement 45–180 s at 16M and 7–27 min at 160M at 75–150 MB/s effective copy plus catch-up. |
| Synchronous save surcharge at depths 1 / 16 / 64 | +0.23–0.74 ms isolated or ungrouped. +0.03–0.19 ms per save in groups of four to eight. |
| Paired run with prepared builds and 40 GB free per host | 78–85 min for the cells and up to four minutes for launch and collection at expected archive sizes. The worker stops starting cells at 85 min and the service ceiling is 89 min. |

The upper budget assumes the full seed finishes inside 59 minutes. It allows about 8–10 minutes for fleet, 11–12 for the nine edited fault cells and 3–4 for both directional cuts and the save-cost cells. Lower rates can miss the budget and yield a partial archive. Preparing the pinned checkout and images is outside the worker timer. [Earlier loader measurements](https://github.com/OnboardedInc/Triplex-db-experiments/blob/530f435d2/lab/experiments/EXP-DX1/load1/PART3.md)

The controller archives raw outcomes and independently recounts each completed traffic stream against the predeclared topology, source, nonce, slot, scope, schedule and bytes. It binds each restore to its declared seed seal, records replay, broker, peer, rewind and first-touch observations, and fits milliseconds per doubling from the completed rungs. It matches the replacement receipt to the archived pending command, exact wire bytes and replay case. The bench power probe stops the owned workload. A physical power-loss test requires the enrolled independent interlock. The version 0.1 scorecard must run on the integrated single database at both ages. [Fence procedure](FENCE.md) · [Version 0.1 readiness](https://github.com/OnboardedInc/Triplex-db-experiments/blob/exp/DX-V01-scorecard/lab/experiments/EXP-DX1/v01/READINESS.md)

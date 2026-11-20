# Failover on the shared version 0.1 database

Take `a0c47480f`, which includes INT1 `51d0aff35`. The separate ordered import update comes from HA1. [Branch map](INTEGRATION.md)
Four Mac drills used one Datomic database with ten accounts. All 358 saves settled once and all 3,571 scheduled reads returned the expected values within one second.
The lost-reply edit returned its original receipt. The old disk refused to start as writer, and the planned move proved its first new save was on both copies.
Saves wait for a second copy by default. Set `HA1_RECOVERY_POLICY=A` to reopen on one copy with an alarm. Both choices passed the local correctness checks. [Owner decision](OWNER-DECISION.md)
The first server phase runs the four Priority 9 checks before any fleet or size work. It needs a prepared build, a sealed ten-account copy at each age and a server window. [Server run](BENCH.md)
Mac clocks are diagnostic. Bare-metal timings and physical power fencing still need verification.

## Mac correctness

The earlier eight Mac drills settled 782 scheduled saves once, with 689 original-ID retries. They returned 7,779 exact reads within the caller deadline. The old disk refused writer startup, and the planned move confirmed the first new receipt on two copies. Those drills waited 54 min 19 s in the ordinary queue. The earlier four fleet cells waited a combined 4 h 3 min 7 s. [Earlier evidence and diagnostics](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a9f076753/lab/experiments/EXP-DX1/hasync1/REPORT.md)

Each integrated drill used 1,210 facts, five saves and fifty pinned reads per second, rotating reads across ten accounts. The four drills waited a combined 18 min 8 s for admission and used 4 min 50 s of active time. The checks kept every earlier confirmed receipt, and 301 saves settled on same-ID retry.

| Mac diagnostic | Saves settled / retried | Exact scheduled reads | First scheduled new save | Longest read gap |
| --- | ---: | ---: | ---: | ---: |
| Lost reply, Policy B | 86 / 72 | 858 | 15.42 s | 0.070 s |
| Planned move | 70 / 55 | 697 | 11.46 s | 0.105 s |
| Returning disk, Policy B | 104 / 92 | 1,037 | 19.43 s | 0.182 s |
| Lost reply, Policy A | 98 / 82 | 979 | 17.17 s | 0.469 s |

Core and the Datomic SDK built. The strict HA typecheck, 25 focused checks and all 435 enabled SDK tests passed. The archive keeps the first codec-test timeout and the successful two-worker rerun with unchanged assertions. The full monorepo suite and 52 opt-in SDK cases were outside this run. No acceptance pins moved. [Gate and receipt audit](EVIDENCE.md) · [Archives](SHA256SUMS.archives)

## Bare-metal scorecard

```sh
P9_AGE=fresh P9_SEAL_SHA256="$FRESH_SEAL_SHA256" \
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite "$TAG"
```

The fresh ten-account forecast is 17–30 minutes with a prepared build and checkpoint. The first stage measures acknowledged loss, the first new save, pinned reads, and the first protected save after sealing writes for the move. The one-server commands label their two copies on one host as a rehearsal. [Four row commands](SCORECARD.md)

Fleet and the two edited size rungs run only if the window allows. Forecast 39–79 minutes with the optional phase. The fresh and 1B physical snapshots, copy throughput, hardware fence and paired timings remain unverified. The scorecard still needs to be taken into INT1 and run at both ages. [Forecast and schedule](BENCH.md) · [Version 0.1](https://github.com/OnboardedInc/Triplex-db-experiments/blob/main/lab/V0.1.md)

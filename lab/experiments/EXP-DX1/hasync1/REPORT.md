# Failover on the shared version 0.1 database

Take the Priority 9 work from `49d4b8139` on top of INT1 `51d0aff35`. It includes the second copy, the fence, the move and the same-database resend check.
All ten accounts use one Datomic database in the new drill. The independent replay checks the edit before and after the lost reply.
Saves wait for a second copy by default. Set `HA1_RECOVERY_POLICY=A` to reopen on one copy with an alarm. [Owner decision](OWNER-DECISION.md)
The first server phase runs the four Priority 9 checks. Fleet and size measurements can start after their evidence is collected. [Server run](BENCH.md)
The server run needs a sealed copy of the ten-account database at each age. The earlier Mac drills kept every confirmed save, but the updated checks are still running.
The older account move is in INT1. Take the newer ordered import work separately from HA1. [Branch map](INTEGRATION.md)

## Mac correctness

The earlier eight Mac drills settled 782 scheduled saves once, with 689 original-ID retries. They returned 7,779 exact reads within the caller deadline. The old disk refused writer startup, and the planned move confirmed the first new receipt on two copies. Those drills waited 54 min 19 s in the ordinary queue. The earlier four fleet cells waited a combined 4 h 3 min 7 s. [Earlier evidence and diagnostics](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a9f076753/lab/experiments/EXP-DX1/hasync1/REPORT.md)

The integrated correctness gates offer five saves and fifty reads per second, rotate the pinned reads across ten accounts, and keep the original operation identity through retry. Mac timings are diagnostic. [Gate and receipt audit](EVIDENCE.md) · [Archives](SHA256SUMS.archives)

## Bare-metal scorecard

```sh
P9_AGE=fresh P9_SEAL_SHA256="$FRESH_SEAL_SHA256" \
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite "$TAG"
```

The fresh ten-account forecast is 17–30 minutes with a prepared build and checkpoint. The first stage measures acknowledged loss, the first new save, pinned reads, and the first protected save after sealing writes for the move. The one-server commands label their two copies on one host as a rehearsal. [Four row commands](SCORECARD.md)

Fleet and the two edited size rungs run only if the window allows. Forecast 39–79 minutes with the optional phase. The fresh and 1B physical snapshots, copy throughput, hardware fence and paired timings remain unverified. The scorecard still needs to be taken into INT1 and run at both ages. [Forecast and schedule](BENCH.md) · [Version 0.1](https://github.com/OnboardedInc/Triplex-db-experiments/blob/main/lab/V0.1.md)

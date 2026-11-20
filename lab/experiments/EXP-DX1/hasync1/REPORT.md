# Failover correctness and server measurements

All 782 scheduled saves settled once across eight small Mac drills. 689 needed a retry with the identical command.
Every earlier confirmed save was present on the survivor. All 7,779 scheduled reads answered within the caller deadline with the expected values.
Resending an edit whose reply was lost returned its original receipt. The edit appeared once in the change history.
The old disk could no longer start as a writer. The planned move reopened writes once the second copy was ready.
Choose A to reopen on one copy, B to wait for a replacement, or C to keep three machines. I recommend B within the version 0.1 budget and C for production when funded and tested. [Owner decision](OWNER-DECISION.md)

## Availability

Each run offered five saves and fifty reads per second over eight subjects and 1,280 facts. The caller deadline was one second. Mac clocks are diagnostic. [Raw attempts and independent recount](EVIDENCE.md)

| Mac drill | First on-time new save | Longest save gap | On time / refused / timed out / late in cut | Settled / retried | Longest read gap |
| --- | ---: | ---: | ---: | ---: | ---: |
| Withheld reply | 15.95 s | 15.2 s | 0 / 76 / 0 / 0 | 91 / 76 | 0.150 s |
| WAL direction cut | 18.23 s | 17.2 s | 0 / 86 / 0 / 0 | 100 / 87 | 0.154 s |
| Reply direction cut | 19.79 s | 18.8 s | 0 / 92 / 0 / 2 | 106 / 92 | 0.107 s |
| Mid-commit kill | 18.61 s | 18.2 s | 0 / 91 / 0 / 0 | 103 / 96 | 0.054 s |
| Index-job kill | 15.86 s | 15.2 s | 0 / 76 / 0 / 0 | 89 / 81 | 0.649 s |
| 2,000-fact import kill | 21.59 s | 20.8 s | 1 / 104 / 0 / 0 | 117 / 109 | 0.145 s |
| Old disk returns | No on-time sample | ≥16.7 s | 1 / 76 / 0 / 8 | 90 / 76 | 0.213 s |
| Planned move | 15.82 s | 14.8 s | 0 / 72 / 0 / 2 | 86 / 72 | 0.095 s |

Cut outcomes count offers due from the fault up to the first on-time save sent to the new writer, or the end of the observation window. The gap is the longest consecutive run of offers without an on-time receipt at 200 ms sampling. No offer produced a wrong result.

The old-disk run ended its offer window before an on-time save was recorded on the new route. An explicit fresh receipt arrived after 19.89 s and a further receipt reached both copies 6.28 s after the replacement copy began. The planned-move probe received its fresh two-copy receipt 15.76 s after the seal.

The drills rechecked 92 pre-cut receipt lookups and each on-time and late scheduled receipt. The survivor feed kept the order and unique positions. The independent replay oracle also compared the values before and after the committed replacement. Clients keep pending commands durably and retry the same ID and payload. [SDK retry specification](SDK-RETRY.md)

The earlier Part 1 campaign kept all 73 acknowledged receipts and recorded 1,234 good reads. Its separate grouping and synchronous-flush measurements remain available. [Part 1 report](https://github.com/OnboardedInc/Triplex-db-experiments/blob/e61905198/lab/experiments/EXP-DX1/hasync1/REPORT.md)

## Size, systems and fencing

- The edited server size rungs target 100,549, 1,000,464 and 16,045,255 active facts, with three retire-and-replace edits on every fifth subject. Timings split Datomic log replay, broker readiness, peer synchronization, first-touch reads and PostgreSQL rewind. [Scale forecasts](SCALE.md) · [Server plan](v2/bench-plan.ts)
- The fleet runs 1, 4 or 10 Datomic systems, each with an active and standby transactor. The PostgreSQL alternatives are one shared pair with separate SQL schemas and roles or a pair per system. Cgroup readings report idle memory and cores by role. [Fleet driver](v2/fleet.ts)
- The returning-disk startup, simulated clock skew and replacement were checked locally. Full rebuild forecasts are 45–180 s at 16M and 7–27 min at 160M. The independent physical fence still needs a power-loss drill. [Fence](FENCE.md)

## Paired bench

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite hasync-p9-v4
```

Forecast 78–85 minutes plus up to four for launch and collection with prepared builds. The 23 cells cover 100K, 1M and 16M edited facts, both fleet layouts, standby replacement, stale-predecessor retry, directional cuts and save cost. The collector binds the three growth rungs to their own seed manifests and the retry receipt to its saved body, database, slot, source and oracle. The bare-metal run is pending. [Forecast and schedule](BENCH.md)

Version 0.1 still needs integration on `exp/DX-INT1` and the failover and move gates on its shared database at both scorecard ages. [Merge readiness](https://github.com/OnboardedInc/Triplex-db-experiments/blob/exp/DX-V01-scorecard/lab/experiments/EXP-DX1/v01/READINESS.md)

Ordinary Mac admission took 54 min 19 s across eight drills, including 17 min 11 s before the first. The earlier four fleet cells waited a combined 4 h 3 min 7 s. Both ten-system cells and all new size timings are in the paired campaign. [Fleet measurements](SCALE.md)

Scoped TypeScript and focused HA and command recovery tests cover the gate. The replacement settlement checks the withheld and recovered receipts, exact same-input replay, scoped claim, ordered feed and oracle cuts. Its pending body and response are fresh and bound to the gate nonce, slot, source and scope. No acceptance pins moved. [Evidence and audit](EVIDENCE.md) · [Checksums](SHA256SUMS)

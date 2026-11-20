# Failover under scheduled traffic

In the first Mac run that withheld a save reply, new saves resumed after 18.55 seconds.
The system refused 90 saves during that cut. All 90 settled after retry with the same command ID.
In the first planned move with scheduled traffic, a new save arrived after 13.56 seconds.
The first index drill exposed a 24.04-second gap when reads pulled a wide diagnostic record on every offer.
The revised drill reads a small field page on schedule and checks the wide record separately.
You can reopen on one copy with an alarm, wait for the second copy, or run three data machines.

## Availability

Five saves and fifty reads are offered per second per system. The one-second caller deadline classifies late answers separately from refusals and timeouts. Clients keep each pending command durably and resubmit its original ID and payload until a receipt is confirmed.

| Mac case | First on-time new save | Refused then retried | Longest on-time read gap |
| --- | ---: | ---: | ---: |
| Withheld reply | 18.55 s | 90 | 0.093 s |
| Mid-commit | 18.90 s | 98 | 0.063 s |
| 2,000-fact import | 17.00 s | 88 | 0.039 s |
| Planned move | 13.56 s | 65 | 0.053 s |
| Index fault, first attempt | 23.41 s | 120 refused, recovery ledger incomplete | 24.04 s |

The earlier Part 1 campaign kept all 73 acknowledged receipts and recorded 1,234 good reads. Its separate grouping and synchronous-flush measurements remain available. [Part 1 report](https://github.com/OnboardedInc/Triplex-db-experiments/blob/e61905198/lab/experiments/EXP-DX1/hasync1/REPORT.md)

## Size, systems and fencing

- Deep scale rungs target 100,549, 1,000,464 and 2,704,806 active facts, with three retire-and-replace edits on every fifth subject. Timings split recent Datomic log replay, broker readiness, peer synchronization, first-touch reads and PostgreSQL rewind. [Scale driver](v2/scale-local.ts)
- The fleet runs 1, 4 or 10 Datomic systems, each with an active and standby transactor. The PostgreSQL alternatives are one shared pair with separate SQL schemas and roles or a pair per system. Cgroup readings report idle memory and cores by role. [Fleet driver](v2/fleet.ts)
- The post-crash choice determines whether fresh writes are protected. A full standby rebuild is forecast at 45–180 s at 16M and 7–27 min at 160M. The independent controller protocol passed reboot, stale-ticket, unreachable-readback and simulated clock-skew checks. Physical boot and interlock qualification are separate. [Fence](FENCE.md)

## Paired bench

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite hasync-p9-v2
```

Forecast 75–85 minutes on the released pair with prepared builds and the stated copy and load rates. The 18-cell campaign tests a 16M edited population, fleet recovery and idle load, standby replacement, every fault shape and save cost. The bare-metal run is pending. [Forecast and schedule](BENCH.md)

The observations are Mac diagnostics. The evidence index lists each gate and the content, freshness and binding checks. No acceptance pins moved. [Evidence and audit](EVIDENCE.md) · [Checksums](SHA256SUMS)

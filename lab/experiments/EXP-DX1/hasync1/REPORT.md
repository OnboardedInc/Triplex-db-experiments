# Failover under scheduled traffic

In the first Mac run that withheld a save reply, new saves resumed after 18.55 seconds.
The system refused 90 saves during that cut. All 90 settled after retry with the same command ID.
In the first planned move with scheduled traffic, a new save arrived after 13.56 seconds.
The first index drill exposed a 24.04-second gap when reads pulled a wide diagnostic record on every offer.
The revised index drill read field pages on schedule. Its longest read gap was 0.18 seconds.
Choose A to reopen on one copy, B to wait for a replacement, or C to keep three machines. I recommend C. [Owner decision](OWNER-DECISION.md)

## Availability

Five saves and fifty reads are offered per second per system. The one-second caller deadline classifies late answers separately from refusals and timeouts. Clients keep each pending command durably and resubmit its original ID and payload until a receipt is confirmed.

| Mac case | First on-time new save | Unavailable at 200 ms sampling | Offers refused during cut | Total retried | Longest on-time read gap |
| --- | ---: | ---: | ---: | ---: | ---: |
| Withheld reply | 18.55 s | 18.0 s | 90 | 90 | 0.093 s |
| Mid-commit | 18.90 s | 18.6 s | 93 | 98 | 0.063 s |
| 2,000-fact import | 17.00 s | 16.6 s | 83 | 88 | 0.039 s |
| Planned move | 13.56 s | 13.0 s | 65 | 65 | 0.053 s |
| Index fault, first attempt | 23.41 s | 23.0 s | 115 | Ledger incomplete | 24.04 s |
| Index fault, field-page probes | 14.56 s | 13.8 s | 69 | 74 | 0.183 s |
| Old writer and disk returned | 14.66 s | 14.4 s | 72 | 72 | 0.087 s |

Offers are counted from the fault up to the first scheduled on-time save sent to the new writer. Every save in those windows was refused. No offer in those windows timed out or returned a late receipt. Read outcomes and offers outside the cut remain in the raw evidence. [Independent recount](v2/recount-local.ts)

The earlier retries appended facts. The new test resends a replacement whose predecessor was already retired. The native duplicate guard and SDK claim recovery are ported from the write-path fix. [SDK retry contract and test](SDK-RETRY.md)

The earlier Part 1 campaign kept all 73 acknowledged receipts and recorded 1,234 good reads. Its separate grouping and synchronous-flush measurements remain available. [Part 1 report](https://github.com/OnboardedInc/Triplex-db-experiments/blob/e61905198/lab/experiments/EXP-DX1/hasync1/REPORT.md)

## Size, systems and fencing

- Deep scale rungs target 100,549, 1,000,464 and 2,704,806 active facts, with three retire-and-replace edits on every fifth subject. Timings split recent Datomic log replay, broker readiness, peer synchronization, first-touch reads and PostgreSQL rewind. [Scale forecasts](SCALE.md) · [Scale driver](v2/scale-local.ts)
- The fleet runs 1, 4 or 10 Datomic systems, each with an active and standby transactor. The PostgreSQL alternatives are one shared pair with separate SQL schemas and roles or a pair per system. Cgroup readings report idle memory and cores by role. [Fleet driver](v2/fleet.ts)
- The old writer and the fresh container carrying its original disk refused startup. The replacement made a new write safe on two copies 1.33 s after its small copy began, ending a 17.59 s one-copy window. Full rebuild forecasts are 45–180 s at 16M and 7–27 min at 160M. The controller protocol passed reboot and simulated clock-skew checks. [Fence](FENCE.md)

## Paired bench

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite hasync-p9-v3
```

Forecast 75–85 minutes plus up to four for launch and collection on the released pair with prepared builds. The 18 cells cover a 16M edited population, fleet recovery, idle load, standby replacement, stale-predecessor retry, every fault shape and save cost. The collector checks the retry receipt against the attempt's saved body, database, slot, source and oracle. The bare-metal run is pending. [Forecast and schedule](BENCH.md)

The fleet first received Mac admission after 1 hour 19 minutes 34 seconds. One system recovered in 17.50 s on the shared pair and 19.87 s on the dedicated pair. The larger fleet, edited deep runs and both directional cuts remain queued. Physical power and management interlock qualification are pending.

Scoped TypeScript and focused HA and command recovery tests cover the gate. The replacement settlement checks the withheld and recovered receipts, exact same-input replay, scoped claim, ordered feed and oracle cuts. Its pending body and response are fresh and bound to the gate nonce, slot, source and scope. No acceptance pins moved. [Evidence and audit](EVIDENCE.md) · [Checksums](SHA256SUMS)

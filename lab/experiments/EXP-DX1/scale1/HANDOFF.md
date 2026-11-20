# DX-SCALE1 handoff

The current decision screen measures ten full-size deep accounts together, then partitions the same logical rows and tapes across two Datomic databases on the same server. Each topology gets the same ten writer clients, reader seats and feed observer. [Scale review](REVIEW.md) · [Write-path review](WRITE-REVIEW.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
2026-11-20T07:04:56.799Z · Collected arm-d7-single-read with service result exit-code, 0 physical-scope report(s) and verified cleanup. arm-d7-single-zero-b started at 2026-11-20T06:59:35.744Z with execution ceiling 2026-11-20T08:59:35.744Z.
<!-- end state -->

With the dedicated destination in `BENCH_SERVER`, this command shows all active stages and their ceilings.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Arm | Maximum |
| ---: | --- | ---: |
| Done | Verify and seal one 100,000-person account on WFIX1 | Sealed at 1:38 a.m. ET |
| 1 | `arm-d7-single-zero-c` replays 3.5, 4.9, 23.5 and 39.4 saves/s from that image without readers | 2 h |
| 2 | `arm-d7-single-read-c` replays the same tape and image with 64 seats on two cores for 600 s | 2 h |
| Held | Audited grouped 10k prerequisite, then full pooled and split placement | After reporting the single-account result |

The corrected single-account sequence has a five-hour guard from setup. The held placement plan is forecast at 35–39 hours (USD 38.15–42.51), with a 40-hour guard. Its pooled and split restores retain the same logical data, tape and resource placement. The 620/s headroom target requires a separately measured arm if all four placement cells hold. [Forecasts](PREDICTIONS.md) · [Held queue](decision/held-placement.json)

Each audited timed arm reads its actual writer gateway configuration at the restored database cut and binds the options, installed function, source, slot, nonce and clock into the result. The native gate also checks retrievable receipts, full feed changes and pinned field lifetimes. The wider placement queue waits for the single-account result to be collected and reported. The existing Q106f tiered-storage ruling remains an input while the owner clarifies placement.

The first zero-reader and bounded-reader attempts stopped during observer startup because their inherited SDK environment named the retired `fresh-texts` flag. Each recorded zero timed cells. Both replacements use the verified `arm-d7-single-seed` image. The retry relay initially refused the reformatted Mac transfer manifest and then retried using the original server byte digest checked against the same collected content. The corrected launcher passes the stack's selected paths to the observer processes.

`arm-d7-single-zero-b` sealed two checked cells and the writer ledger for the five-minute plateau. Its feed waiter expired after four minutes. `arm-d7-single-read-b` was stopped during restore, before any offers, because it would reach the same waiter. Both original records are retained. The replacement watcher budgets time from the end of the offered window.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. Packaging can retry against the same first attempt.

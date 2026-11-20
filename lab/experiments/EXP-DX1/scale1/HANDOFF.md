# DX-SCALE1 handoff

The current decision screen measures ten full-size deep accounts together, then partitions the same logical rows and tapes across two Datomic databases on the same server. Each topology gets the same ten writer clients, reader seats and feed observer. [Scale review](REVIEW.md) · [Write-path review](WRITE-REVIEW.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
The original 10,000-per-account seed completed and cleaned up. Repackaging verified the original image identity and normalized the progress records for compact transfer. The audited single-account seed with both reader conditions is next.
<!-- end state -->

With the dedicated destination in `BENCH_SERVER`, this command shows all active stages and their ceilings.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Arm | Maximum |
| ---: | --- | ---: |
| 1 | Finish the already-running 10k-per-account seed from the unfixed write path | Existing ceiling |
| 2 | One 100,000-person account on WFIX1, verify exact claims and feed, then seal the image | 3 h |
| 3 | Replay 3.5, 4.9, 23.5 and 39.4 saves/s from that image without readers | 2 h |
| 4 | Replay the identical tape and image with 64 seats on two cores for 600 s | 2 h |
| Held | Audited grouped 10k prerequisite, then full pooled and split placement | After reporting the single-account result |

The single-account queue has a seven-hour guard and an expected 70–105 minutes of bench time, about USD 1.27–1.91. After one measured verification, the held placement plan is forecast at 29–34 hours, with a 38-hour guard and USD 31.61–37.06 expected cost. Its pooled and split restores retain the same logical data, tape and resource placement. The 620/s headroom target requires a separately measured arm if all four placement cells hold. [Forecasts](PREDICTIONS.md) · [Held queue](decision/held-placement.json)

Each audited timed arm reads its actual writer gateway configuration at the restored database cut and binds the options, installed function, source, slot, nonce and clock into the result. The native gate also checks retrievable receipts, full feed changes and pinned field lifetimes. The wider placement queue waits for the single-account result to be collected and reported. The existing Q106f tiered-storage ruling remains an input while the owner clarifies placement.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. Packaging can retry against the same first attempt.

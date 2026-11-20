# Priority 9 scorecard handoff

Use the integrated Datomic build and a sealed physical snapshot of the ten-account database for each age. The run verifies the exact scope, snapshot manifest, PostgreSQL system identifier, original basis, known seed receipts, ten catalog entries and ten account membership probes. The source commit, snapshot digest, age, recovery policy and actual host identities travel with the evidence. Repeat with `P9_AGE=1B` and its own seal. [Server procedure](BENCH.md)

The operator starts the four measurements together and keeps the returned evidence directory. `HA1_RECOVERY_POLICY` defaults to `B`. Set it to `A` to reopen on one copy after fencing and report that choice on every row. Use a new tag for every run.

```sh
P9_AGE=fresh P9_SEAL_SHA256="$SEED_SHA256" \
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-p9 "$TAG" two-host
```

Each command prints one JSON row with the bar, measured value, verdict and topology. It reopens the archive and independently checks the data before printing. Set `LAYOUT=two-host` for scorecard evidence. Replacing `two-host` with `one-host` in the dispatch and `LAYOUT` runs the same checks with two volumes on one server. The returned rows mark that topology as a rehearsal. An independent power interlock still needs its physical check. [Fence](FENCE.md)

| Measurement | One server | Two-server window |
| --- | --- | --- |
| Zero acknowledged writes lost | Rehearse loss of the active processes and compare every confirmed test receipt on the survivor. | Run with the copies on different machines to count for Priority 9. |
| Writes resume within 60 seconds | Rehearse detection, promotion, reconnect and the chosen recovery policy. | Measure with the remote copy and actual link. |
| Reads continue | Rehearse exact pinned reads through the outage. | Measure the surviving reader while the other server's writer fails. |
| Planned move within 30 seconds | Rehearse fencing, rewind and two-copy publication. | Measure the whole database move across machines. |

```sh
node --import tsx lab/experiments/EXP-DX1/p9/score.ts lost-writes "$EVIDENCE" "$TAG" "$COMMIT" "$SEED_SHA256" "$AGE" "$LAYOUT" "${HA1_RECOVERY_POLICY:-B}"
node --import tsx lab/experiments/EXP-DX1/p9/score.ts write-recovery "$EVIDENCE" "$TAG" "$COMMIT" "$SEED_SHA256" "$AGE" "$LAYOUT" "${HA1_RECOVERY_POLICY:-B}"
node --import tsx lab/experiments/EXP-DX1/p9/score.ts read-continuity "$EVIDENCE" "$TAG" "$COMMIT" "$SEED_SHA256" "$AGE" "$LAYOUT" "${HA1_RECOVERY_POLICY:-B}"
node --import tsx lab/experiments/EXP-DX1/p9/score.ts planned-move "$EVIDENCE" "$TAG" "$COMMIT" "$SEED_SHA256" "$AGE" "$LAYOUT" "${HA1_RECOVERY_POLICY:-B}"
```

The read row counts one-second deadline misses between the fault and confirmed rerouting or the first scheduled receipt. It checks exact account membership at the original cut, covers all ten accounts and reports the longest gap. The move row measures from the write seal to the first verified new receipt with the new standby required. Unavailable or censored observations fail their bar. All pre-cut and in-flight outcomes remain in the compressed archive.

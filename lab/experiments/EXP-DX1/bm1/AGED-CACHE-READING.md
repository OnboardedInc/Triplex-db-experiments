# The 32 GiB cache arm on the one-billion aged cut, bench 4, November 23

**Refused before the first offer, at the live-head check.** PREP1 `cdc72d4d5` (`prep1/AGED-CACHE.md` at `d6e62fbe7`), launched at 18:06:59 UTC, stopped at 18:12:03 UTC. No offer was made, so none of the predictions can be judged. [Predictions](PREDICTIONS.md#bench-4-2026-11-23)

## Where it stopped

`prep1/ceiling-seed.ts` line 217 (`scalePredecessors`, aged branch) decodes the journal of the newest transaction at the aged head. That is AGE1's last replayed save at position 28,309,866. `packages/datomic/src/rowText.ts` line 125 throws `TypeError: Journal position payload must be null`.

The SDK decoder requires a modern-format `:_tx/position` row to carry no `value_number`, because it fills the value from `recorded_position`. AGE1's bulk loader writes a non-null payload in that row. **The PREP1 or AGE1 builder must fix this.** Either the aged check decodes AGE1's journal rows with the format AGE1 wrote, or AGE1's rows are shown to be a different, valid encoding. This is the live-head step (step 3 of the aged checks) that `AGED-CACHE.md` marked as never run on a live gateway.

## What passed before it

- **Receiver checks.** The re-pushed held cluster matched server 2's stopped inventory on bench 4: 1,642 files, 176,078,670,513 bytes, control `537ac161…`, tree `115999f1…`. `aged-scorecard.json` `faab1bc5…`, `sealed.json` `74b8f7de…` and both SCALE1 pins also matched.
- **Launcher checks.** The handoff digest and content checks, and the seed adoption (`seed.json` at head 28,309,866, `SEAL.sha256`, `plan.json`), were written by `server.sh` and the producer.
- **Stack.** The arm's copy and stack started. The cell directory has `start.log`, `launch-profile.json`, `pg-settings.json` and the counter files.

The cleanup removed the owned stack and its WAL directory. One empty anonymous volume left by the arm was removed by hand.

## Evidence

`evidence/DX-BM1/bench4/bench4-cache32-aged/` on the Mac (`TRANSFER.json`, `summary.tar.zst`, checked member by member at collection).

Running cost of bench 4 at 13:15 EST: about USD 2.65 (USD 1.09/hour from 15:47 UTC).

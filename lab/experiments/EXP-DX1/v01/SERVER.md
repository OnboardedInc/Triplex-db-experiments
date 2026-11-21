# Lean v0.1 server scorecard

Build and run the next-card commit below. Its merged INT1 pin is `5f62059b1fc03e8fffca0441f14ff4ddd4d7e734`. The queued billion-record comparison uses `8cc32d380dc56559477535e18130dbd0f3bff555` and its [pinned handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/0af801036141177bc48ad1883b4b12d3dd5ef961/lab/experiments/EXP-DX1/v01/SERVER.md).

## Arms and forecast

| Order | Credit mode | Work |
| --- | --- | --- |
| 1 | Driver's winning mode | Headline zero-reader reference |
| 2 | Same winning mode | Headline loaded, all available rows |
| 3 | barrier6 | Same stack and cut, P2 and P6 only |

All arms use ordered per-person writes, three transactor cores with Java 25 ZGC and a 16 GiB Datomic object cache, Java 21 G1 on both gateways, and PostgreSQL WAL on the other NVMe. Synchronous commit, fsync and full page writes remain on. This campaign sets the two optional diagnostics off. If barrier6 wins, the control provides a second barrier run.

The cap is **280 minutes and USD 5.09** at USD 1.09/hour, including 15 minutes for cleanup. It allocates 89 minutes for adoption and P1–P4, 53 for the headline quiet pairs, 10 for P7, 25 for P8 and 88 for the barrier comparison. Three copies at last night's measured 17m25s per four add about **13m04s** before the staged runs, for a total planning allowance of **293m04s and USD 5.32**, excluding the prebuilt checkout. The former 90-second tape is selectable at 224 minutes. The three-arm flow has the same start-of-cell, midpoint and end clocks, p50 and p99 reporting, and one-second telemetry from part 8.

## Predictions locked before the run

These predictions use the matched full-size barrier6, rolling6 and rolling12 forecasts and the previous fresh card. They assume an identical seed, Java profile and separate WAL. A comparable measured result takes precedence over these predictions. [Rolling calibration and exact forecasts](https://github.com/OnboardedInc/Triplex-db-experiments/blob/cb5e3cf7a2083b97f0a3fbc0d699a082a0940657/lab/experiments/EXP-DX1/prep1/ROLLING-CREDITS.md#forecast-before-launch) · [Fresh card](https://github.com/OnboardedInc/Triplex-db-experiments/blob/1ed7bbfd7/lab/experiments/EXP-DX1/scale1/V01-FRESH.md)

| Row | Forecast on fresh | Effect expected from credit mode |
| --- | --- | --- |
| P1 Pinned reads | Around 860 ms p99 at 256 readers, against 100 ms. Last night delivered 893/s at 256 versus 1,561/s at 64. | Little change. The same one-core reader gateway and sparse write prelude dominate the checked read path. |
| P2 Commits | Expect 50 and 235 stored/s at those two rates for all three modes. At 394 offered, barrier6 / rolling6 / rolling12 forecast 351 / 381 / 394 stored/s whole and 367 / 388 / 394 in the second half. At 620 expect 340 / 388 / 447 whole. At 394, whole save p99 is predicted at 30,020 / 10,400 / 105 ms. | Large change under sustained pressure because rolling frees individual slots. First-half warm-up and 620/s backlog can still raise the p99 or cause expiries. P2's qualifying size bands and resent ACK checks are outside this tape. |
| P3 Change feed | Expect an exact match for every acknowledged prelude save and its native journal entry, as for 1,260 of 1,260 in each prior headline arm. | No change in order or content. At 3.5/s, admission should rarely fill. Native effects and crash resume stay open. |
| P4 Current pulls | Expect exact checked current values and a similar single-client pull distribution. The weighted mix, deep history byte slope and full throughput remain open. | Little change. These reads follow the drain; credit mode carries no continuous write queue into the pull sweep. |
| P5 Publish | NOT RUN. The main card uses the same held seed. | No prediction from this run. The separate Publish campaign measures the overlap. |
| P6 Quiet account | Solo → loaded commit p99 at 235: barrier6 18 → 75 ms (4.17×), rolling6 18 → 36 ms (2×), rolling12 18 → 38 ms (2.11×). At 394: 15 → 73 ms (4.87×), 15 → 36 ms (2.40×), 15 → 43 ms (2.87×). At 620: 17 → 84 ms (4.94×), 17 → 43 ms (2.53×), 17 → 53 ms (3.12×). At 50, the prior barrier value was 22.91 → 53.50 ms (2.34×); expect roughly 25–45 ms loaded with rolling, an extrapolation. | Rolling reserves one quiet slot. The rolling6 forecast clears the new ≤50 ms alternative at 235/394/620 if no quiet commands expire and no quiet reads are wrong. Rolling12 clears it at 235/394 and misses at 620. The card also prints paired read and feed values and ratios. |
| P7 Idle cost | Similar cold first-read p99 and empty/restored residency to the fresh card. The marginal memory slope stays open. | Little change. The first reads and census precede the credit-controlled tape and use the same sealed seed and JVM limits. |
| P8 Live imports | Near 3,193 recorded facts/s at the fixed pace, with exact frames and receipts. Full deep and wide imports remain open. | Little direct change. The reference import and its paced lane retain their original admission path. |
| P9 Machine loss and move | NOT RUN. Version 0.1 uses option B, with the two-host run scheduled for Sunday. | No prediction from this run. [Two-server procedure](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a0c47480f/lab/experiments/EXP-DX1/hasync1/SCORECARD.md) |
| Journal, receipts and mixed IDs | Exact original journal and checked receipts. Both retired IDs should be refused; the four pinned values should match their own expected snapshots. | No content change. Credits settle after the writer validates the reply and advances the predecessor. |

## Build once

Use a clean checkout on `exp/DX-V01-next-card`. Build during staging.

```bash
COMMIT=c1eeb2ef8667394832b03e8115a66d5d4a422945
BUILD=/var/tmp/triplex-v01-lean-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types   lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
```

## Run from three private copies, one at a time

Use absolute paths. Set `SCALE1_IMAGE` to the metadata directory containing `image.json` and `transfer.json`. Set `SCALE1_TRANSFER_SHA256` to the recorded transfer digest and `SCALE1_IMAGE_SHA256` to the transfer's `summaryFiles["image.json"]`. The fresh seal has ten accounts of 100,000 people and 162,456,470 business facts at logical cut 87,002. Set `FRESH_PGDATA_SOURCE` to its stopped PG17 directory. Each scratch copy must preserve ownership, permissions and its own internal `pg_wal`. Keep the held source stopped.

Set `SCORECARD_WAL_DIRECTORY` to the other NVMe, with space for one relocated WAL and 16 GiB in working margin. Keep 16 GiB free on the data NVMe after making the scratch copy. Peak data storage is the held directory of about 115 GB plus one scratch of about 115 GB and that margin. Give the evidence filesystem at least 5 GiB free. The runner verifies the separate WAL device and the live settings before offering writes.

Set `CREDIT_MODE` to the winner, for example `rolling12`, and use the same new `SCORECARD_OUT` for all three commands. Prepare a new stopped copy at `FRESH_PGDATA_COPY` before each invocation. Remove that scratch only after the command confirms the arm complete. The path may be reused after the copy has been removed.

```bash
CREDIT_MODE='<winning-credit-mode>'
scorecard_arm() {
  sudo env "PATH=$BUILD/tools/bin:$PATH"     "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0     "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$SCORECARD_OUT"     --age fresh --arm "$1" --window-seconds 300 --credit-mode "$CREDIT_MODE"     --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$SCORECARD_WAL_DIRECTORY"     --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256"     --pgdata-source "$FRESH_PGDATA_SOURCE" --pgdata "$FRESH_PGDATA_COPY"
}
# Run individually with a new scratch copy and clean up after each.
scorecard_arm 1
scorecard_arm 2
scorecard_arm 3
sudo "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --assemble --commit "$COMMIT" --out "$SCORECARD_OUT"
```

The CLI mode takes precedence over `DX_V01_CREDIT_MODE`; allowed modes are `barrier6`, `rolling6`, `rolling8`, `rolling12` and `rolling16`. Arm 3 selects barrier6 internally. Keep the same supplied winner on all invocations so the campaign manifest matches. Preserve the complete `SCORECARD_OUT` and its sequence records, per-cell telemetry, logs and final Markdown. Compress the archive and record its checksum.

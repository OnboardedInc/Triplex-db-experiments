# Run the v0.1 scorecard

Server 2 should retain `790d9e96e` until INT1 names the ordered-writer integration. The commands below reproduce the two-writer preview. The Mac fixture verified the candidate. Full-size operation at either age remains open. [Current server handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/4fece9022f9ebbf3d633756117e9c899d6578a70/lab/experiments/EXP-DX1/v01/SERVER.md)

Use a dedicated bare-metal Ubuntu 24.04 server. The command holds the native queue lock and makes disposable restores of the sealed SCALE1 database. All measured accounts share one Datomic database in each arm. Allow at least 240 GiB free for fresh and 320 GiB for 1B. The held archives remain immutable.

## Build ahead of the allocation

Build from a clean checkout of the public scorecard branch at the pinned runner commit. The report names the corresponding INT1 writer integration.

```bash
COMMIT=483408dc3b4ca9851646bf91f8e72810fc2507b2
BUILD=/var/tmp/triplex-v01-ordered-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
```

The build pins Node, PostgreSQL, Datomic and the native Java 25 image. Startup rechecks the resolved image IDs and generated package hashes.

## Choose the sealed input

Set `SCALE1_IMAGE` to the held directory containing `image.json`, `transfer.json` and `seed.pgdump`. Use the separately recorded `SCALE1_TRANSFER_SHA256` and the transfer's `summaryFiles["image.json"]` digest as `SCALE1_IMAGE_SHA256`. Keep the published directory tag. The original cut has 1,000,000 people across ten accounts, 162,456,470 business facts and logical position 87,002.

Set `AGE=fresh` for the original seal. For `AGE=1B`, also supply the sealed AGE1 handoff, its hash, PostgreSQL dump of that exact aged cut and its hash, and the AGE1 Java and Datomic paths. The verifier runs against each restored peer's native identity, cuts, history count, receipts and replay ledger before offers.

```bash
cd "$BUILD/repository"
age_args=()
if [[ "$AGE" == 1B ]]; then
  age_args=(--aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
    --aged-dump "$AGED_PGDUMP" --aged-dump-sha256 "$AGED_DUMP_SHA256")
fi
scorecard() {
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=${AGE_JAVA:-}" "AGE_DATOMIC_HOME=${AGE_DATOMIC_HOME:-}" \
    "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
    --age "$AGE" --seed "$SCALE1_IMAGE" \
    --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
    "${age_args[@]}" "$@"
}
```

## Run the card or rerun the grouped comparison

```bash
scorecard --writer per-person-ordered --out "/var/tmp/triplex-v01-$AGE"
scorecard --writer grouped --out "/var/tmp/triplex-v01-$AGE-grouped"
```

The first command is the release candidate. It runs the full adopted workload and then the grouped P2 and P6 comparison in the same card. The second command is an optional grouped-only replay. Use it for a separate comparison attempt. The primary command already includes grouped within the per-age budget.

At USD 1.09 per hour, the primary campaign is capped at 235 minutes and USD 4.27 per age. The grouped-only replay has a 75-minute ceiling and costs up to USD 1.36. The plan allows 105 minutes for the principal restores and P1–P4, 20 for the quiet pair, 10 for the role census, 25 for import pacing, 60 for the grouped comparison and 15 for cleanup. Bare-metal duration depends on restore and verification speed. The grouped arm measures the same P2 offer schedule and matched P6 windows from the same seal. Keep the complete output directory.

The card records the writer, concrete layout and Java settings, P2 and P6 samples by configuration, and the result of the mixed-ID witness. The per-person arm uses the reference path for its import probe. The held P5 row links to server 1's separate Publish results. P9 links to the separate failover procedure and requires two servers for a qualifying result.

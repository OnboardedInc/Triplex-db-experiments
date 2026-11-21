# Run the v0.1 scorecard

Server 2 should run `ce9507b0ed9b0604b69ed28646175df254b7c0c7` from `exp/DX-V01-scorecard`. It combines the paired scorecard with INT1's named writer pin `f25a46e02591a1c6b6a9495f7f2cce20249571f0`.

Use a dedicated bare-metal Ubuntu 24.04 server. Each command holds the native queue lock and runs on disposable restores of the held seed. Each restore puts all ten accounts in one Datomic database. Allow at least 240 GiB free for fresh or 320 GiB for 1B.

## Build from the published commit

```bash
COMMIT=ce9507b0ed9b0604b69ed28646175df254b7c0c7
BUILD=/var/tmp/triplex-v01-ordered-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
```

Run the build from a clean checkout at `$COMMIT`. Startup verifies the built package bytes and pinned local image identities.

## Held inputs

- Both ages use `SCALE1_IMAGE`, the original sealed directory with its published directory tag and its `image.json`, `transfer.json` and `seed.pgdump`. Set `SCALE1_TRANSFER_SHA256` from the transfer digest recorded at handoff. Set `SCALE1_IMAGE_SHA256` to the `summaryFiles["image.json"]` digest from that transfer. The image records the dump length and SHA-256. The fresh seal contains 1,000,000 people in ten accounts, 162,456,470 business facts and logical cut 87,002.
- For 1B, also set `AGE_HANDOFF_JSON` to the sealed `triplex-age1-scorecard/1` identity and `AGE_HANDOFF_SHA256` to its recorded digest. Its `sourceSeed["manifest-sha"]` must equal `SCALE1_IMAGE_SHA256`. It carries the same scope, the native database ID, the physical and logical cuts, at least 1,000,000,000 Datomic history records and the replay ledger. Set `AGED_PGDUMP` to the PostgreSQL dump of that exact aged cut and `AGED_DUMP_SHA256` to its separately recorded hash. Set `AGE_JAVA` to the Java executable and `AGE_DATOMIC_HOME` to the Datomic 1.0.7745 distribution root for AGE1's fresh-peer verifier. The verifier checks the transactor JAR against the handoff's `datomicSha`. The verifier checks each restored peer before offers begin.

Resolve input and output paths to absolute paths. Each `--out` directory must be new. Each command runs the full per-person-ordered workload, followed by the grouped comparison for P2 and P6 from the same seal. Both use the INT1 default Java 21 with G1.

## Fresh

```bash
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
  --age fresh --writer per-person-ordered --jvm j21-g1 \
  --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" \
  --transfer-sha256 "$SCALE1_TRANSFER_SHA256" --out /var/tmp/triplex-v01-fresh
```

## 1 billion

```bash
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
  --age 1B --writer per-person-ordered --jvm j21-g1 \
  --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" \
  --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
  --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
  --aged-dump "$AGED_PGDUMP" --aged-dump-sha256 "$AGED_DUMP_SHA256" \
  --out /var/tmp/triplex-v01-1B
```

## Forecast and output

Each campaign is capped at 235 minutes including cleanup, up to USD 4.27 per age at USD 1.09 per hour. Build and aging happen separately. The plan allocates 105 minutes to the primary restores and P1–P4, 20 to the quiet-account windows, 10 to the residency census, 25 to import pacing, 60 to the grouped comparison and 15 to cleanup. The grouped stage uses six minutes of matched P2 offers. Both P6 comparisons use matched quiet-account windows.

Keep the full output directory with `SCORECARD-v0.1.md`. It records both writer configurations, their live JVM arguments and the mixed-format retired-ID witness. P5 and P9 are marked NOT MEASURED and link to the separate Publish and two-server failover procedures.

The optional ordered Java 25 ZGC comparison is omitted. The existing JVM selector applies to the full campaign, and an extra restore alone is budgeted for up to 42 minutes.

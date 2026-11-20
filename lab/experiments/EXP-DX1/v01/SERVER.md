# Run the v0.1 scorecard

Use the held SCALE1 decision loader image on a dedicated bare-metal Ubuntu 24.04 server. The process uses the existing native queue lock, 12 allowed physical cores numbered 0 through 11, and disposable PostgreSQL restores. The original archive stays immutable. Allow at least 240 GiB of free scratch for fresh and 320 GiB for 1B.

## Build ahead of the allocation

From a clean checkout at the stated revision with Node 22:

```bash
COMMIT=d5ac41f8ab6453567f9bbdf278296782426367ed
BUILD=/var/tmp/triplex-v01-adopted-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
```

The build pins Node, PostgreSQL, the Datomic distribution and the Java 25 native image. The scorecard verifies the resolved image IDs and generated package SHA-256s before startup and under the native queue lock.

## Fresh SCALE1

Set `SCALE1_IMAGE` to the held decision arm directory containing `image.json`, `transfer.json` and `seed.pgdump`. Use the original transfer SHA-256 and its independently recorded `summaryFiles["image.json"]` digest. Keep the directory's published tag. The producer had ten accounts, 1,000,000 people, 162,456,470 current business facts and logical cut 87,002.

```bash
cd "$BUILD/repository"
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
  --age fresh --writer grouped --seed "$SCALE1_IMAGE" \
  --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
  --out /var/tmp/triplex-v01-adopted-fresh
```

Set `--writer subject` on a separate attempt to use the integrated per-person writer. The card records grouping, compact rows, queryable K journal, installed commit function and all JVM role settings from startup readback.

## Aged 1B

Use the original SCALE1 image inputs, the AGE1 handoff bundle and an independently prepared PostgreSQL dump of that exact sealed aged cut. Supply `AGE_JAVA` and `AGE_DATOMIC_HOME` for the pinned AGE1 checker. The bundle's native database identity, logical and physical cuts, history count, receipts and replay ledger are checked against the restored peer before writes.

```bash
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
  --age 1B --writer grouped --seed "$SCALE1_IMAGE" \
  --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
  --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
  --aged-dump "$AGED_PGDUMP" --aged-dump-sha256 "$AGED_DUMP_SHA256" \
  --out /var/tmp/triplex-v01-adopted-1b
```

The budget is 235 minutes per age and up to USD 4.27 at USD 1.09 per hour. The first stage uses at most 105 minutes including both restores, 12 minutes of matched offers and collection. Budgets for P5 through P9 are 25, 30, 15, 25 and 20 minutes, with 15 minutes reserved for cleanup. The base card reports shortened P1–P4 observations and names the bars that still need qualifying evidence. Preserve the output directory with its campaign archives.

The INT1 Publish command was exercised on its own 64-person Mac fixture. It requires a held-scope adapter before it can supply this scorecard's P5 evidence.

P6 runs after the loaded arm on the same adopted scope. It compares the quiet account alone and at 235 aggregate offers per second, with identical quiet offer and read schedules. It reports age-matched commit, pinned field read and journal-observation components. The P6 obligation also needs durable feed effects and Publish and import overlap.

P7 samples first demand pulls at the retained loader cut and records empty and restored residency by role. An untouched-person slope under matched activity remains open.

P8 runs the existing fixed 32-fact pacing arm after P6 in the same database under the grouped writer. The fixed cell offers 50 saves per second across its synthetic active accounts and tracks verified import frames, queryable facts and per-account tails. It is a component of P8. The matched pacing controls, deep and wide volumes and per-person-writer pacing remain open.

# Run the v0.1 scorecard

Server 2 should run `65ad0997c1e077b5ca3e0dc5b2f8304f6f65f51c` from `exp/DX-V01-scorecard`. It combines the paired scorecard with INT1's writer pin `f25a46e02591a1c6b6a9495f7f2cce20249571f0`.

Use the dedicated bare-metal Ubuntu 24.04 host. Each command holds the native campaign lock and starts one disposable PostgreSQL copy per arm. All ten accounts remain in one Datomic database. The prior full-size logical COPY projected at least 76 minutes per restore. [SCALE1 handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/78beafe13/lab/experiments/EXP-DX1/scale1/HANDOFF.md)

## Build from the published commit

```bash
COMMIT=65ad0997c1e077b5ca3e0dc5b2f8304f6f65f51c
BUILD=/var/tmp/triplex-v01-pgdata-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
```

Run the build from a clean checkout at `$COMMIT`. Startup verifies built package bytes and pinned local image identities.

## Held inputs and copies

- For both ages, set `SCALE1_IMAGE` to the original directory with its published tag and `image.json` and `transfer.json`. Set `SCALE1_TRANSFER_SHA256` from the recorded transfer digest and `SCALE1_IMAGE_SHA256` from the transfer's `summaryFiles["image.json"]`. The fresh seal contains 1,000,000 people in ten accounts, 162,456,470 business facts and logical cut 87,002.
- For fresh, `FRESH_PGDATA_SOURCE` points to the held stopped PostgreSQL 17 data directory. For 1B, `AGED_PGDATA_SOURCE` points to the held stopped PostgreSQL directory at the exact AGE1 sealed cut. Supply the corresponding `AGE_HANDOFF_JSON` and recorded `AGE_HANDOFF_SHA256` plus `AGE_JAVA` and `AGE_DATOMIC_HOME` for the AGE1 fresh-peer check. `AGE_DATOMIC_HOME` is the Datomic 1.0.7745 distribution root. The handoff binds the original SCALE1 image, native identity, exact cuts and replay ledger.
- Make three independent file-level copies from the stopped source for the chosen age using the SCALE1 driver's copy step. Give the command the directories that directly contain `PG_VERSION` in the order **ordered zero-reader, ordered loaded, grouped loaded**. Preserve ownership and permissions. Each copy needs its own files and an internal `pg_wal`. The runner reads each source's control bytes, mounts only private copies and marks each copy used before startup. Keep the source stopped and exclusive. Refresh copies for a rerun. The runner stops its stacks and leaves the scratch directories for the driver to remove.
- The held fresh data directory is about **115 GB per copy**, or about **345 GB for three**. Size each 1B copy from the stopped aged directory's actual allocated bytes, for example with `du -sB1 "$AGED_PGDATA_SOURCE"`. Reserve three times that size and at least **16 GiB free on each filesystem hosting a copy** after staging. The copies can span filesystems. Keep at least 5 GiB free on the evidence filesystem.
- Use absolute paths. Each `--out` directory must be new. Each command runs per-person-ordered in full and repeats P2 and P6 with grouped on its own copy. Both use Java 21 with G1.

## Fresh

```bash
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
  --age fresh --writer per-person-ordered --jvm j21-g1 \
  --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" \
  --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
  --pgdata-source "$FRESH_PGDATA_SOURCE" \
  --pgdata "$FRESH_PGDATA_ZERO" --pgdata "$FRESH_PGDATA_LOADED" --pgdata "$FRESH_PGDATA_GROUPED" \
  --out /var/tmp/triplex-v01-fresh
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
  --pgdata-source "$AGED_PGDATA_SOURCE" \
  --pgdata "$AGED_PGDATA_ZERO" --pgdata "$AGED_PGDATA_LOADED" --pgdata "$AGED_PGDATA_GROUPED" \
  --out /var/tmp/triplex-v01-1B
```

For the existing logical dump path, omit all PGDATA options and retain `seed.pgdump` in the original SCALE1 image. For 1B also give `--aged-dump` and `--aged-dump-sha256`. The large-seed commands above need only the SCALE1 metadata and the stopped clusters.

## Forecast and output

The cap is **235 minutes and up to USD 4.27 for fresh**, and **235 minutes and up to USD 4.27 for 1B**, at USD 1.09/hour. Those budgets begin with prepared copies in place. Allow separately for build, AGE1 aging and three file-level copies at the host's measured copy rate. Full-size file-copy time has yet to be measured by this scorecard.

The 105-minute primary slice covers startup, identity checks and P1–P4. The remaining allowances are 20 minutes for P6, 10 for the P7 census, 25 for import, 60 for the grouped comparison and 15 for cleanup. P7 starts an empty reference stack in its own slot. It uses the same writer and JVM settings and closes before the prepared loaded arm starts.

Keep the full output directory with `SCORECARD-v0.1.md`, each arm's `pgdata.json` and the 1B `aged-live-check.json` files. The card records both writers and the mixed-format retired-ID witness. P5 and P9 link to the separate Publish and two-server failover procedures. The optional Java 25 ZGC comparison remains outside the schedule.

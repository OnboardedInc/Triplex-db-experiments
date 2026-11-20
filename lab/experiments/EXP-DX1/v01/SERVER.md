# Run the v0.1 scorecard on the allotted server

Use one idle, dedicated bare-metal Linux server. The existing INT1 placement requires 12 distinct allowed physical cores numbered 0 through 11, extra space for a disposable restore, WAL, and evidence, and the native Docker socket. Use the rated host from the BM1/SCALE1 handoff. Build ahead of the scored allocation.

## Build

Run this from a clean clone of the scorecard revision with Node 22 available. The command creates a fresh checkout and toolchain in a new build directory. It will refuse an existing build directory, changed or hidden source inputs, or unpinned files in the image context.

```bash
COMMIT=f8b231c198591074fb7a67a03b65057dbf6139f7
BUILD=/var/tmp/triplex-v01-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
```

## Run once at each age

Let `SEALED_FRESH` and `SEALED_1B` name the operator-held, read-only seed directories, and `FRESH_SEAL_SHA256` and `AGED_SEAL_SHA256` their trusted manifest digests from provisioning. Each directory contains the original INT1 `seed-image.json` and its `seed.pgdump`, for a pooled million-person frozen campaign using the legacy journal and original receipt identities. The original database and dump are kept unchanged. The worker restores each arm independently. The restore checks the manifest and streamed dump bytes, and the driver verifies the expected starting scope, population, journal and recorded seed commands before issuing offers.

```bash
cd "$BUILD/repository"
sudo env "PATH=$BUILD/tools/bin:$PATH" \
  "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs \
  --commit "$COMMIT" --age fresh --seed "$SEALED_FRESH" \
  --seal-sha256 "$FRESH_SEAL_SHA256" --out /var/tmp/triplex-v01-fresh

sudo env "PATH=$BUILD/tools/bin:$PATH" \
  "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs \
  --commit "$COMMIT" --age 1B --seed "$SEALED_1B" \
  --seal-sha256 "$AGED_SEAL_SHA256" --out /var/tmp/triplex-v01-1b
```

Use `--hourly-usd RATE` when the allocation differs from USD 1.09/hour. The fixed tape takes 197 minutes across both arms. The run allocation is capped at 235 minutes per age, or USD 3.58–4.27 per run and up to USD 8.54 across both at the default rate. The restore, exact seed replay and evidence collection must fit within the remaining 38 minutes. The scorecard is still written after an incomplete campaign, with a nonzero command exit and the failure log retained. The estimate excludes build time and seed preparation.

`--age` records the operator's label. Seed production and the record count belong to the provisioning evidence. The SCALE1 decision image uses a different layout and lacks the INT1 command identities expected by this tape. The driver refuses that input. A compatible pre-sealed INT1 image at each age is an outstanding dependency.

The physical run measures the frozen P1–P4 pair. P3 dependency fanout and P4 engine-side read bytes lack complete gates. The matched P5/P6/P8 field campaign exceeds the remaining window after the frozen pair. The scorecard calls out the missing P7 population census, wide import, P9 two-machine drill and unavailable correctness witnesses. It preserves the command log, native arm archives and a link to each published observation. Keep these directories with the final Markdown to retain working evidence links.

The held-image verifier expects the original logical seed head on the timed scope. Aging that appends through the same Triplex journal needs an explicit starting-state and oracle replay extension before it can use this command. Treat the fresh and 1B runtime forecasts as unverified until an operator completes both sealed runs.

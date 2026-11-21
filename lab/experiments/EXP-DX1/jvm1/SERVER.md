# Bounded physical-host comparison

## Java 25 and ZGC

Prepare the final integration revision with `sudo env DX_JAVA=25 bash lab/experiments/EXP-DX1/t1/bare-metal.sh --prepare "$COMMIT" "$BUILD"`. This builds both Java images and records their IDs and input manifest. Run the campaign from `$BUILD/repository` with `$BUILD/tools/bin` on `PATH`. Reuse the sealed `SEED_DIR` from the first JVM comparison at `46880aa47`. Keep it outside the new output directory. The seed receipt, run identity, population, position, dump size and dump digest are checked again.

```sh
env DOCKER_HOST=unix:///var/run/docker.sock node lab/bin/heavy.mjs --label DX-JVM1-server -- \
  node --import tsx lab/experiments/EXP-DX1/jvm1/server.ts run-part2-three "$OUT" "$SEED_DIR"
```

The first three arms are Java 21 with the two-core G1 writer, Java 25 with G1 everywhere at the same heap sizes, then Java 25 with ZGC everywhere. Use `run-part2` to add Java 25 G1 at ZGC's memory. Allow up to 78 minutes for three or 104 minutes for four, plus preparation. Use an idle 12-core Linux host with 160 GiB free and sufficient available RAM for the 37 GiB engine caps, the sender and the OS. The write schedule, seed cut and PostgreSQL durability checks are the same as in Part 1. The added read probe does one exact historic read per second on the reader for 60 seconds in each window. Use these results for the matched Part 2 comparison.

Each arm has 23 minutes for startup, PostgreSQL restore, workload and collection, then up to two minutes for cleanup. The dump stream is verified during restore. The final result requires a total under 26 minutes. The physical restore and verification budget needs rehearsal. `result.json` records save percentiles, quiet-account ratios, read p99, cgroup samples and per-JVM GC summaries. The per-role `*-gc-observed.log` hashes correspond to the saved bytes used for pause and allocation-stall counts during the workload. Full wall-clock GC logs are in `engines/<slot>/trace/raw`. Report any allocation stall as part of the result. [Arms and memory](COLLECTORS-PART2.md) · [Forecasts](PREDICTIONS-PART2.md)

## Part 1 comparison

Use the W1 native build layout, including the pinned images and the sibling results directory containing images.json and IMAGE-INPUTS.SHA256SUMS. Supply a clean checkout of this revision, twelve distinct available physical cores numbered 0–11, RAM for four 6 GiB engine cgroups and the client, and at least 160 GiB of scratch. The command refuses a nonphysical host, a busy daemon, a mismatched image or an altered seed. The controller does not connect to a remote host.

Before timing, prepare one sealed 10-account W1 seed on the same source. This setup copies the pinned population through the public write path, verifies its persisted rows independently, dumps PostgreSQL and records the exact dump size, SHA-256 and seed position. Sharing this seed keeps the large import out of the four arm windows. Create the seed with the same command below, substituting `prepare "$SEED_DIR"` for `run "$OUT" "$SEED_DIR"`. Both output directories must be new.

```sh
env DOCKER_HOST=unix:///var/run/docker.sock node lab/bin/heavy.mjs --label DX-JVM1-server -- \
  node --import tsx lab/experiments/EXP-DX1/jvm1/server.ts run "$OUT" "$SEED_DIR"
```

The command runs present, candidate, candidate with the threshold returned to 128 MiB and candidate with compiler scaling returned to 1. The ten W1 60-second offer windows are unchanged. Each arm starts fresh PostgreSQL storage, restores the exact seed, starts the three JVMs and captures their final HotSpot flags before offers. It checks receipts, the ordered journal and field values, matched source and container identities, then removes that arm's resources. Setup and workload share a 26-minute deadline with a separate cleanup window. An incomplete arm stops the campaign and preserves its own evidence. One full physical rehearsal is still required to verify the time budget. The primary summaries are solo35, solo235, solo394, ten35, nine235 and nine394 under results, with scheduled offer denominators and the quiet p99 ratio. The test prices save latency and the quiet-account effect; a rated pinned-reader and bulk-import comparison requires its own workload. [Forecasts](PREDICTIONS.md)

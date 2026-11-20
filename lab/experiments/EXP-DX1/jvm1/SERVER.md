# Bounded physical-host comparison

Use the W1 native build layout, including the pinned images and the sibling results directory containing images.json and IMAGE-INPUTS.SHA256SUMS. Supply a clean checkout of this revision, twelve distinct available physical cores numbered 0–11, RAM for four 6 GiB engine cgroups and the client, and at least 160 GiB of scratch. The command refuses a nonphysical host, a busy daemon, a mismatched image or an altered seed. The controller does not connect to a remote host.

Before timing, prepare one sealed 10-account W1 seed on the same source. This setup copies the pinned population through the public write path, verifies its persisted rows independently, dumps PostgreSQL and records the exact dump size, SHA-256 and seed position. Sharing this seed keeps the large import out of the four arm windows. Create the seed with the same command below, substituting `prepare "$SEED_DIR"` for `run "$OUT" "$SEED_DIR"`. Both output directories must be new.

```sh
env DOCKER_HOST=unix:///var/run/docker.sock node lab/bin/heavy.mjs --label DX-JVM1-server -- \
  node --import tsx lab/experiments/EXP-DX1/jvm1/server.ts run "$OUT" "$SEED_DIR"
```

The command runs present, candidate, candidate with the threshold returned to 128 MiB and candidate with compiler scaling returned to 1. The ten W1 60-second offer windows are unchanged. Each arm starts fresh PostgreSQL storage, restores the exact seed, starts the three JVMs and captures their final HotSpot flags before offers. It checks receipts, the ordered journal and field values, matched source and container identities, then removes that arm's resources. Setup and workload share a 26-minute deadline with a separate cleanup window. An incomplete arm stops the campaign and preserves its own evidence. One full physical rehearsal is still required to verify the time budget. The primary summaries are solo35, solo235, solo394, ten35, nine235 and nine394 under results, with scheduled offer denominators and the quiet p99 ratio. The test prices save latency and the quiet-account effect; a rated pinned-reader and bulk-import comparison requires its own workload. [Forecasts](PREDICTIONS.md)

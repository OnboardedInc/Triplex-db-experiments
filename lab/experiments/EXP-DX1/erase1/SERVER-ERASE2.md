# Full-size removal measurement

**North star** P1, P2, P3 and P6. Measure publication, history and quiet-account latency while another account removes protected values. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Forecast before the run

These are planning ranges for the fresh ten-account database. The earlier server had 128 people. The Mac is a shared diagnostic environment.

| Reading | Bare-metal forecast | Basis |
| --- | --- | --- |
| Additional protected replacement on the native application thread, p50 | 0.1–0.8 ms, five additional records | The existing compact layout wrote 22 records versus 17. The target is at most 0.3 ms. |
| 100 people with one sealed assertion each, request to durable acknowledgement | 150–900 ms | The three smaller native rungs had 114–211 ms p99 for 100 people. The full stage adds rate and another order of magnitude of retained facts. |
| Request until the live route checks complete | 250–1,800 ms | Allow additional peer synchronization, historical reads and journal checks after acknowledgement. |
| Quiet save p99, removal block versus the surrounding blocks | 1.00–1.40× | Independent saves can retry briefly while the current removal sequence is being published. |
| Quiet read p99, removal block versus the surrounding blocks | 1.00–1.35× | A read can wait for the verified removal sequence or retry against the same basis. |
| 100-body cleanup, including the native completion barrier | 8–75 s | The 128-person server took 1.13 s. Mac diagnostics at 4M facts took 5.68 s and included ordinary index work. |
| Quiet save p99, cleanup block versus the surrounding blocks | 1.10–2.00× | Standalone cleanup previously exceeded 1.25× at 4M facts. |
| Quiet read p99, cleanup block versus the surrounding blocks | 1.00–1.60× | Postgres and the transactor share work during the native index build. |
| Gateway-host loss | Removal sequence and unremoved keys survive with an independently hosted, durable authority and key custodian | Local gateway replacement and old-data restore established this for the PostgreSQL prototype. Production replication and irreversible wrapping-key rotation remain open. |
| Wall time with a stopped disposable PostgreSQL copy already available | 15–50 minutes, with an 88-minute ceiling | Four 90-second windows, plus process startup, exact feed readback, cleanup and shutdown. |

## Driver command

Use the clean removal branch revision and the corresponding `v01/build.ts` build receipt. The input is a **disposable writable copy** of a cleanly stopped PostgreSQL 17 cluster for the original fresh SCALE1 seed. Obtain `image.json`, `transfer.json` and their independent SHA-256 pins through the normal seed handoff. Leave the original sealed cluster separate. The driver writes into the disposable copy and leaves it stopped for evidence. It puts the lab authority in a separate PostgreSQL database under that same disposable server cluster. Actual gateway-host-loss deployment has separate data backups and wrapping key custody.

```sh
export DOCKER_HOST=unix:///var/run/docker.sock
export DX_V01_BUILD_RECEIPT="$BUILD_RECEIPT"
export TRIPLEX_DATOMIC_FAST_PATHS=save-wire
mkdir -p /var/tmp/triplex-bm1
flock --no-fork -n /var/tmp/triplex-bm1/dx-bm1-day.lock \
  timeout --kill-after=90s 86m \
  node --experimental-transform-types lab/experiments/EXP-DX1/erase1/measure-server.ts \
  --profile server --credit-mode rolling6 --commit "$(git rev-parse HEAD)" \
  --seed "$SEAL_DIR" --image-sha256 "$IMAGE_PIN" --transfer-sha256 "$TRANSFER_PIN" \
  --pg-data "$DISPOSABLE_PG_COPY" --out "$NEW_RUN_DIR"
```

All ten accounts stay in the existing Datomic database. The driver validates the original cut, original loader receipt and live account witnesses. It introduces a new synthetic field just for the removal account. It runs baseline, removal, cleanup and recovery windows. Each window offers exactly 235 saves per second to the other accounts, including 3.5 per second to the quiet account, with the same person and field-width tape. Record the durable count as well as the offered count. The cleanup window submits the sealed bodies before requesting the ordinary index build and waits for the exact cleanup barrier. The driver also checks quiet reads against their exact old basis. Preserve all four sets of offers and the exact journal readback comparison.

The live checks cover the two gateways, held and historical reads, the pinned batch, Reach reads, the stored journal, the feed and the typed value-filter refusal. The product regression separately exercises retained replicas, late import, deferred Publish, notices, the SSN rule and an actual restore. An actual restore is a separate operation after the active database has been stopped. Its elapsed time does not belong to the live publication reading.

The prior runner kept launcher PIDs, stopped them only while their process leaders were alive, and probed two shared loopback ports. That test could still see a live child JVM or another listener. The replacement starts isolated, unpublished Docker services, stops the four exact container IDs, checks their running/PID states, requires PostgreSQL exit 0 and checks `pg_controldata` for a clean shutdown. The original evidence did not identify the PID which held the old listener. [Prior disposition](../bm1/HANDOFF.md)

## Scorecard handoff

In the next-card adopted runner, add a removal arm consuming the same seed and new field setup. Run it after the performance arms on a fresh disposable copy. Keep the restore and deferred-Publish fixture from `regression.ts` for the standing product gate. Feed `route-checks.json` and the complete regression cases into the renderer. Require matching source, attempt, slot, database, seed pin, assertion identities and named checks before changing either row from NOT RUN. A partial file should identify missing cases. The scorecard branch has no DX-ERASE2 edits.

# Priority 8 · Fair import on one prepared server

From the published commit on an allocated Linux server, use Node 22 or newer, the matching `DX_V01_BUILD_RECEIPT`, the transferred full-size SCALE1 image and its pins, a stopped template, a disposable clone of its data, and a byte-matching WAL copy on the separate WAL device. The clone's `pg_wal` must link to `/wal`. Choose the winner of the independent rolling-credit run for `ROLLING_MODE`. Run with the native job queue clear.

```sh
bash lab/experiments/EXP-DX1/load1/fair-server.sh \
  "$(git rev-parse HEAD)" "$IMAGE" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$PG_TEMPLATE" "$NEW_OUTPUT" --pg-data "$PG_COPY" --wal-dir "$WAL_COPY" \
  --credit-mode "$ROLLING_MODE" --frame-facts 32 --import-credits 1
```

The server profile uses Java 25 ZGC on the write gateway and transactor and the ordered subject-save writer. PostgreSQL readback requires synchronous commit, fsync and full-page writes. Rolling runs first. Each mode has five minutes of quiet alone, five minutes of matched live-only traffic, then five minutes with import. All saves and reads keep their matched schedule across the last two cells. The full-size seed contains the quiet account and nine busy accounts. The nine offer 235 saves/s in aggregate, the quiet account offers 3.5 saves/s, and each active account offers six pinned reads/s. The importer uses the same fair scheduler as a separate busy account in the same database. Both modes and all six windows share one disposable PostgreSQL copy. The timeout is 57 minutes plus up to one minute for termination. Thirty minutes are timed workload. The rest covers launch, validation, post-run checks and cleanup. Keep the output and discard the used database clone after collection.

The generated source offers a deep account's worth of facts, 16 million at the default width, with one immutable synthetic subject per frame. It is a five-minute rate sample. At 3,000 facts/s a full load would take 89 minutes and each half would verify about 450,000 facts. Frames have stable command identities, and the normal commit-order gate preserves source sequence even when two or more account credits are selected. The sample separately checks every frame's business rows and its native journal. It records when the read peer first returned each journal entry, then counts only the entries whose rows verify at the pinned terminal cut. It reports end-of-window shortfalls.

Open each `*-comparison.json` for both 150-second halves and the full window. It reports every account's read and save p99, matched baseline, ratios and offered/verified denominators. Compare the quiet account with both its alone and loaded readings. Apply 1.5× to every account and both operations, with the owner's 50 ms alternative only for the quiet account's loaded commit. A missing live offer or a mismatched feed or row prevents a qualifying result. This command compares candidates on the fresh prepared population. The release scorecard still runs the frozen workload at both required ages.

At 32 facts per credit, the goal needs 94 grants/s. Predict 1,400–2,400 verified facts/s in barrier6 and 2,400–3,350 in the winning rolling mode, with quiet loaded commit p99 of 48–78 and 35–52 ms respectively. The [prewritten arithmetic and falsifiers](PREDICTIONS-PART7.md) cover the busy-account saturation limit and the next experiment. Compare measured grant holds and queryable rates by half. Steady rates above 3,000 with wider live tails falsify the assumption that the credit bound also bounds user latency.

## Mac correctness

```sh
TRIPLEX_DATOMIC_FAST_PATHS=save-wire node lab/bin/heavy.mjs --label DX-HA1 -- \
  node --import tsx lab/bin/engine.mjs ha1 --slot auto --holder DX-HA1 --experiment load-fair --diagnostic
```

The compact SCALE1 fixture tests a two-credit importer under both barrier6 and rolling6. It discards one durable response in each mode, recovers the receipt, checks the whole native suffix and queries all imported rows independently. All clocks are diagnostic. This uses an ordinary heavy token and an exclusive SQL stack with a read peer.

# Single-server test for small imports with several frames in flight

Use the published branch with the [preregistered predictions](PREDICTIONS-PART6.md). Expect 30–45 minutes, with 18 minutes of offered activity. The runner caps the bare-metal campaign at 60 minutes and budgets up to 25 minutes to prepare, with 5 minutes reserved for collecting evidence. The controller binds the exact published revision and verifies the transferred archive.

```sh
HA1_BENCH_HOURS=1 node --import tsx lab/experiments/EXP-DX1/ha1/control.ts load-pipeline load-pipeline-001 one-host
```

- Start with a live-only control. Run 16 facts at depth 2 and then 24 at depth 2. These are the two closest predicted candidates at the throughput target. The early report gives their progress and all eleven read and save p99s against the leading control. Use the trailing control for the paired comparison.
- Then run 16 and 24 facts at depth 1, followed by those widths at depth 4 and depth 8. Finish with the matched live-only control. Each cell has identical offered live work and one fresh Datomic database shared by all eleven live accounts and the importer.
- Read `load-pipeline-early.json` and `load-pipeline-comparison.json` in the attempt, with both controls and every account's offered and verified denominators. A candidate needs at least 3,000 independently queryable facts/s, every live offer verified, and both p99 ratios within 1.5 for every account against each fresh control. Read the frame/hold/queue distributions and exact wire-byte counts in each arm to test the explanation.
- One server is enough for these paired controls. This checkout uses the part 5 lean fixture. The version 0.1 row still needs the selected integrated layout and frozen workload on the fresh and billion-record seeds.

# Earlier single-frame experiment

At 50 aggregate noisy saves/s plus the quiet account, predict 1,950 / 2,850 / 3,440 queryable facts/s for 16 / 24 / 32 facts/frame. These correspond to observed mean frame intervals of about 8.2 / 8.4 / 9.3 ms. At 130 frames/s the hard ceilings are 2,080 / 3,120 / 4,160. Twenty-four facts need 125 successful frames/s and 8 ms between completions. Two matched 108-second live-only controls bracket every arm.

| Facts/frame | Predicted native apply p50 | Predicted quiet save/read p99 ms | Ratios against earlier faster control (10.92 / 4.01 ms) |
|---:|---:|---:|---:|
| 16 | 0.9 ms | 14 / 6.5 | 1.28 / 1.62 |
| 24 | 1.2 ms | 16 / 7.5 | 1.47 / 1.87 |
| 32 | 1.5 ms | 19 / 8.5 | 1.74 / 2.12 |

The model prices the overnight 128-fact arm's 3.43-ms apply, approximately 2 ms from native completion to peer return, and the fixed HTTP, receipt, and cursor costs. The tighter overnight control allowed 5.46 ms more on saves and 2.00 ms more on reads. The model predicts every arm will miss at least one limit. It extrapolates from 128-fact frames and 55 offered saves/s. The new paired workload offers more reads, so report ratios against each actual control and publish every account's results.

Run from the published experiment branch on one assigned server, using the operator-provided `BENCH_SERVER` and a new tag.

```sh
HA1_BENCH_HOURS=2 node --import tsx lab/experiments/EXP-DX1/ha1/control.ts load-micro load-micro-001 one-host
```

An arm reports chronological offers, measured gateway hold/queue and exact frame bytes, committed and independently queryable prefixes, and original receipts across a deliberately discarded reply. A bar comparison requires every originally offered live save and read to verify and every neighbouring account's p99 to be inside its own controls.

## Sustained shared-database import

After the short frontier, run one 15-minute 32-fact import between two 108-second controls. Keep all eleven live accounts and the importer in the same database in each arm. Predict 2.7–3.1 million queryable facts in the import window, with the last third retaining at least 85% of the first third's rate. Predict about 250–310 index adoptions and a sampled memory-index peak below 80 MiB at the 32/96 MiB settings. The shorter bare-metal import had roughly one adoption per 12,200 facts at 2,000 facts per frame. Three thousand facts per second remains plausible in this arm. The preregistered neighbour p99 predictions are 19 ms for saves and 8.5 ms for reads, above 1.5 times the earlier faster control. Compare all accounts against both fresh controls, including any missed offers.

```sh
HA1_BENCH_HOURS=2 node --import tsx lab/experiments/EXP-DX1/ha1/control.ts load-volume load-volume-001 one-host
```

Read novelty, direct index adoption, background job duration, and per-JVM stops in each third. Compare the last third's goodput and neighbour p99 with the first third and the two controls. The fresh and one-billion-record version 0.1 status comes from the integrated scorecard.

## Mac correctness and trace check

```sh
node lab/bin/heavy.mjs --label DX-HA1 -- node --import tsx lab/bin/engine.mjs ha1 --slot auto --holder DX-HA1 --experiment load-volume --people 10 --diagnostic
```

This checks four minutes of sustained work with 15 offered saves and 55 offered reads per second, an ordinary heavy token and one VM slot. The oracle checks original claims, every typed row, temporal queries and retries. Local elapsed values are diagnostic and can include activity from other builders.

If the lab VM has dropped PostgreSQL, append `--prepare-postgres "$PRIOR_POSTGRES_IMAGE_ID"` using the exact ID from the previous run's PostgreSQL role record. The managed diagnostic prefers that image and can restore the official public image anonymously. The recorded role ID identifies the dependency that actually ran.

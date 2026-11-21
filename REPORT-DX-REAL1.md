# DX-REAL1

North star follows P1 and P2 on a realistic one-database population, with the P6 quiet control and P7 untouched-person read. [Scope](lab/SCOPE.md) · [North star](lab/NORTH-STAR.md) · [Targets](lab/TARGETS.md) · [v0.1](https://github.com/OnboardedInc/Triplex-db-experiments/blob/main/lab/V0.1.md)

## Design before execution

| Population | People | Business and membership facts | Estimated native records added |
| --- | ---: | ---: | ---: |
| Held SCALE1 deep | 1,000,000 in 10 accounts | 162,456,470 | 429,778,659 already held |
| Wide thin, full | 4,500,000 in one account | 45,000,000 | ~126 million |
| Small | 29,000 in 100 accounts | 4,323,490 | ~11.4 million |
| Full combined | 5,529,000 in 111 accounts | 211,779,960 | ~567 million total |
| First rung combined | 2,029,000 in the same 111 accounts | 176,779,960 | ~469 million total |

TARGETS §1.2 gives the thin range of 1–4.5 million and ~160 facts per deep subject. It specifies no thin fact count. Use the eight W0 answer facts in THIN1, plus the two SCALE1 account/member facts per root. Use SCALE1's ten small accounts at 2,000 and ninety at 100, each with the existing deep subject generator. The 28 native records per thin person are an estimate of ten assertions, ten change records and two entity bookkeeping records for four entities, before per-frame metadata. The small estimate uses SCALE1's native-to-business ratio. [Thin fixture](lab/experiments/EXP-DX1/thin1/population.ts) · [Small sizes](lab/experiments/EXP-DX1/scale1/small-plan.ts)

TARGETS §2 and §2.1 fix 95% active-subject saves and 5% uniform, at least half of subgraph reads overlapping writes within 60 seconds (§1 P1), an 80/15/5 read basis mix, and 10–100 reads per save. It gives no fractions by account type. Proposed busy shares for both foreground streams are 80% deep, 15% thin, 5% small. The quiet deep account adds an independent control. The implied shares across the public 300-second window are about 84.6% deep including quiet, 11.6% thin and 3.9% small. The first-read sweep has its own denominator. These shares assume applicants in the wide account are less likely to be active than deep subjects. Confirm the tenant shares, thin shape, and small-account depth before using them as a fixed comparison.

Use the verified SCALE1 exact import mechanism for new people. AGE1's faster native path is calibrated on replacing existing rows with known predecessor identities. Its calibration omits new-owner creation and the SCALE1 import claims and feed contract. Use its settled-index and storage maintenance approach where it applies. Budget against the observed SCALE1 ~5,800 facts/s ingestion and ~6,120 facts/s verification and the slower ~3,193 facts/s live P8 reference. Plan roughly 2–3 hours for the first rung (USD 2.18–3.27), 5–7 hours for the full rung (USD 5.45–7.63), and about 138 GB and 166 GB stopped respectively, before copy/WAL headroom. The storage estimate applies the held ~293 bytes/native record to added records. Verify against actual SQL bytes, WAL and stopped tree bytes.

## Driver procedure

Use runtime commit `3c618698e4035e341124203df806d49b162992fb`. Prepare Node 22, the built public packages, Datomic 1.0.7745 and PostgreSQL 17 with the existing [v0.1 build command](lab/experiments/EXP-DX1/v01/SERVER.md). The runner uses the lab's bare-metal stack launcher. It needs eight available logical CPUs numbered 0–7, room for the copied cluster plus 40 GiB (first) or 100 GiB (full), and 5 GiB free on the evidence filesystem. The held PGDATA must be a clean PG17 shutdown, include private internal WAL, and already have the normal scorecard fixture roles. Use the `inventory.treeSha` from its SCALE1 physical handoff, the original image and transfer digests, and separate new output and data parents.

```bash
COMMIT=3c618698e4035e341124203df806d49b162992fb
runner=lab/experiments/EXP-DX1/real1/server.ts
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "$NODE22" --no-warnings --experimental-transform-types "$runner" extend \
  --commit "$COMMIT" --profile first \
  --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" \
  --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
  --pgdata-source "$SCALE1_PGDATA_SOURCE" --pgdata-sha256 "$SCALE1_PGDATA_TREE_SHA256" \
  --pgdata "$NEW_DATA_PARENT/pgdata" --out "$NEW_SEAL_DIRECTORY"
```

The runner verifies and independently copies the held cluster, checks the live Datomic scope and original SCALE1 loader receipts, and admits one exclusive extension on the copy. New namespaces and claims share the exact Datomic scope. It settles indexing, runs ordinary PostgreSQL vacuum/analyze and a checkpoint, checks synchronous durability, stops its roles, verifies the original tree stayed intact, and seals the copy. The full rung uses `--profile full` and new paths, again from the pristine deep parent. The two forecasts price independent builds. The current size estimate is for stopped PGDATA after this procedure. A maintained P-footprint claim also needs Datomic GC, its quiescence witness and `VACUUM FULL` under the lab's footprint procedure. Before starting a measurement, verify the file inventory and evidence ledger using the producer's emitted image and transfer digests.

```bash
sudo "$NODE22" --no-warnings --experimental-transform-types "$runner" verify \
  --commit "$COMMIT" --seed "$NEW_SEAL_DIRECTORY" \
  --image-sha256 "$REAL1_IMAGE_SHA256" --transfer-sha256 "$REAL1_TRANSFER_SHA256" \
  --pgdata-source "$NEW_DATA_PARENT/pgdata"
```

Run one quiet-only copy (append `--quiet-only`) and one loaded copy with the same command, independent paths and the same sealed parent. The read gateway receives its first subject reads during the run. The writer gateway performs startup identity checks. Subject sampling, receipts and pinned reads are bound to the selected seal and a new attempt. The driver leaves scratch PGDATA stopped for inspection and removes its containers and network. The driver agent owns disposal of the server scratch and should retain the extension seed.

```bash
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "$NODE22" --no-warnings --experimental-transform-types "$runner" measure \
  --commit "$COMMIT" --realistic-mix --seconds 300 --sweep 10000 \
  --seed "$NEW_SEAL_DIRECTORY" --image-sha256 "$REAL1_IMAGE_SHA256" \
  --transfer-sha256 "$REAL1_TRANSFER_SHA256" --pgdata-source "$NEW_DATA_PARENT/pgdata" \
  --pgdata "$NEW_MEASUREMENT_DATA_PARENT/pgdata" --out "$NEW_MEASUREMENT_OUTPUT"
```

## Harness handoff

The extended image keeps the `image.json` and `transfer.json` pins and the one-database scope of SCALE1. It has a separately versioned physical format, `scale1-realistic-pgdata/1`. Its physical payload is the stopped directory with a complete file-tree and control-file hash. The original image/transfer bytes remain under `parent/<original-tag>/` and keep their original dump digest. This branch does not fabricate a dump or copy its digest to the extended tree.

| Harness and boundary | Existing checks | Minimal extension |
| --- | --- | --- |
| PREP1 `prep1/ceiling-seed.ts:scaleSeed`, called by `server-produce.ts adopt-scale` and `server.sh rolling … --pg-data` | SHA-256 of image and transfer, cross-file source/nonce/tag, pooled layout, 100k per original account, 162,456,470 facts, population digest, exact account roster 0–9, database key, seed cut 87,002, proof cursor and source seal; physical mode checks the frozen membership summary. `scalePredecessors` queries original terminal command/claim, exact membership and predecessor rows and starts at the supplied head. | Add an explicit realistic physical branch in `scaleSeed`. Use `openRealisticSeal` and `verifyPgdata` on the held extension and the independent copy before a mount. Carry `originalHead` for the existing loader-terminal check and `head` for the live logical head and new offers. Keep the existing 10-account witnesses and loader identity via the embedded parent, validate `checkRealisticPeer` and bind the extension native census. In `armRun` replace its blanket full-size fact equality with equality to the verified variant. Bind both tree and image pins in its campaign plan. Keep existing ten-deep writer-comparison circuits and add the companion mixed traffic as a second treatment before interpreting results. |
| Scorecard at `7a8fc4200`, `v01/adopt.ts:openScaleSeal` and `checkAdoptedPeer`, called by `v01/adopted-server.ts` | Same original image/transfer/roster/cut/population checks. Cross-checks `proof.sourceSeal` and feed shape, strict lean clocks, original manifest, terminal claim and exact first fields. `v01/pgdata.ts` checks stopped PostgreSQL identity, disjoint copies, control hash and private files. The 1B case also checks the AGE1 bundle and live native identity. | Add the same format dispatch only for physical mode. Check the full tree hash on each copy before `claimPgdata`. Retain `originalCut` for `checkAdoptedPeer`'s terminal, original manifest and deep-member probes, and keep `startHead` at the extension cut. Run `checkRealisticPeer` at startup and include both cuts, both seal pins, and the extension roster/physical hash in sequential anchor records. For P7 use the explicit disjoint thin sweep and record first-rung versus full-rung residency under matched activity. An aged realistic card needs an AGE1 continuation from this extension plus its own source-bound 1B seal. |

Here the mixed traffic is an opt-in companion rather than a replacement for the PREP1 or scorecard producer. The other builders' branches keep their defaults and immutable reference checks. The extension loader and workload compile from this branch, while the two downstream format dispatches remain integration work.

## Workload and predictions

The companion uses the fixed trace generator for arrivals, 2% active populations, 95/5 active/uniform draws, the 60/30/10 command sizes, the actor mix, duplicates and replay of selected acknowledged saves. Quiet runs retain their own deterministic ~3.5 saves/s across the paired arms. Small-account primary offers rotate across accounts and apply seeded active or uniform subject selection within each. Each primary schedules ten reads, five at the saved subject. The driver records the observed hot/read-basis mix and independently checks exact root values and the entire save journal. The past cohort uses the authentic pre-extension cut, which legitimately returns no rows for newly seeded people. It does not claim 90 days of saved history for the adds. Saves append synthetic facts on the subject through the public adapter. Selected retransmissions check original receipts, but this companion does not exercise the comparison's prepared per-person path, replace an existing field for a retroactive correction, or implement the full P1 concurrency ladder.

| Metric | Prediction | Comparison condition |
| --- | --- | --- |
| Stored saves | About 4.6/s steady, 58/s offered in the 60 s burst, about 15/s across a 300 s arm if every offer stores | Compared with the ten-deep 394–620/s ceiling cells, this is a different offered rate with larger logical commands. An integrated matched ceiling could lose 0–25% from cache and index pressure. |
| p99 | Mixed foreground saves 20–100 ms outside saturation, thin current pulls 10–100 ms, deep current pulls 40–200 ms | Measure by class and basis. The historical ~860 ms P1 top result measured with a different concurrency profile. |
| Quiet deep account | Loaded commits approximately 1.1–2.0× solo p99 on the fixed workload, potentially over 50 ms during the burst | Report solo and loaded absolute p99 for saves, reads and feed. A fixed-load estimate cannot replace the ceiling's previous 2.29–3.35× examples. |
| Untouched thin | First-read p99 6–35 ms for the distinct thin cohort. Read gateway marginal RSS estimate 64–90 B/person, with the prior THIN1 slope of 72.48 B/person as the reference | A single database arm publishes per-role RSS and threads. The marginal cost requires multiple population cuts with matched settings and touched activity. The sweep's RSS difference measures first-touch costs. |

The workload has no cache-priming pass. Its P7 cohort excludes all foreground subject choices and the last two thin IDs, and each selected ID is read once at the extension cut. The seal verifier's construction probes run on the build clone before it is stopped. The timed run uses a freshly opened clone.

## Verdict and receipt audit

- **Suffix verification and terminal proof** in `load.ts` / `Snapshot.verify`. Content is checked against regenerated typed values, receipt identity, independent claim query, and every stored feed change, with pinned member checks. Freshness comes from the new manifest after the parent cut and a contiguous suffix with no unknown transactions. Binding uses the parent image, revision, namespace, row width, new attempt, database key, transaction positions and ledger digest.
- **Seal and transfer publication** in `server.ts publish`. The candidate is validated before any success transfer. The producer checks held and copied file bytes, native head and indexed record count, durability, fresh cleanup, a clean PostgreSQL stop, untouched parent inventory, and the new physical tree. Both digests must be supplied to the verifier. The first-party Mac seal is toy-only.
- **Workload result** in `workload.ts`. A successful output requires the original and duplicate receipt bytes, exact feed order/coverage, exact pinned read digests and exact distinct cold replies. Every observation is from a new attempt and its fresh stopped copy, and carries the image source, seed slot, starting cut and tape digest. This emits measurements and counts without assigning scorecard PASS.
- **Measurement completion anchor** in `server.ts`. It binds the exact workload bytes to the new slot and build, pinned seal and source tree after the run has passed its receipt checks, its PostgreSQL copy has stopped cleanly and the owned containers and network have disappeared.
- No contract files or pinned input paths were changed.


## Verification and handoff

The final pool-admitted Mac SQL toy run used runtime commit `3c618698e4035e341124203df806d49b162992fb`. One Datomic database held 5,600 people and 121,920 facts. The extension added 62,120 verified facts in 32 frames, sealing at logical cut 66. The driver checked 169 stored saves through cut 235, including three scheduled resends and two simulated lost-acknowledgement replays. It checked 1,690 exact pinned foreground reads, of which 845 targeted the recent saved subject, and 25 first reads at the untouched thin cut. The band counts were 1,358 latest, 249 recent and 83 past. All Mac clocks are diagnostic.

Strict TypeScript, shell syntax and three focused tests passed. The generated 300-second tape for both server profiles covers all 100 small accounts and preserves 1,042 identical quiet primary offers. It schedules 2,878 busy deep, 553 thin and 163 small primaries. These are generated offers. No bare-metal server was started or measured here.

The earlier shared-image check refused a mismatched image. The first private image build failed in a Docker layer writer and the retry built the pinned image. The first compact-stack attempt exposed the standard-launcher flag readback mismatch. The next attempt verified and sealed the population, then exposed the typed duplicate reply from the public adapter. The corrected attempt resolves that reply against the original durable command. The final attempt removed its container and volume and returned its reservation. The private image was removed and the final lab inventory showed no active DX-REAL1 reservation.

The compressed Mac archive is `evidence/DX-REAL1/mac-evidence.tar.gz` under the lab's durable project store. It includes the initial failures, final receipt positions and read digests, seed ledgers, generated tapes and cleanup. The [SHA-256 manifest](lab/experiments/EXP-DX1/real1/evidence/SHA256SUMS) identifies the archived bytes. Bare-metal timings, full scale stopped size, the activity-matched P7 residency slope, independent review, and adoption by the two downstream harnesses remain open.

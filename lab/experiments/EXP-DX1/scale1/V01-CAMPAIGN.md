# Server 2 v0.1 campaign

The November 20 evening handoff puts the full-size ordered per-person ceiling first, followed by the ordered v0.1 scorecard and the 1B rung. The smaller comparison made the long present-writer run dispensable. The verified SCALE1 seed and its dedicated server are retained.

| Item | Forecast from the November 20 handoff | Actual |
| --- | --- | --- |
| Existing fresh seed | About 7.8 h for ingestion, with 162,456,470 current facts. From the handoff, about 4–6 h for remaining claims, feed and seal at USD 4.36–6.54. | Sealed 1,000,000 people, 162,456,470 facts and 87,001 frames at cut 87,002. Ingest 7.78 h, verification 7.38 h, archive and hash 1.04 h. |
| Trimmed current writer | Up to 3 h (USD 3.27) from restore through the timed run. At least two pairs per rate are scheduled first. | Stopped by direction during restore. No timed cells. Native 1 min 39 s, about USD 0.03. |
| PREP1 comparison | The adopted ceiling arm takes 60 min (USD 1.09), with up to 50 min of build and dump verification (USD 0.91). | Accepted the immutable image and SHA. Stopped during the single-core SQL restore at 02:57 UTC. Zero timed cells. Setup through cleanup 14 min 56 s, about USD 0.27. |
| Fresh scorecard | 235 minutes (USD 4.27), plus clean build, conditional on compatible restore and exact replay. | Ordered source `ce9507b0` published while AGE1 was restoring. Its restore deadline remains a blocker. |
| AGE1 | 9.60 h (USD 10.46) at 24k records/s, cap 9.9 h (USD 10.79). A 430M native start needs about 23k/s or better. Add a separate restore unless it reuses the fresh restored storage. | The first setup failed before restore because the JDK package needed the standard man-page directory. Both packages were configured and verified. The retry started November 21 at 02:59 UTC on the mounted spare. |
| 1B scorecard | 235 minutes (USD 4.27), conditional on the aged seal and updated exact replay. | Waiting for AGE1 and its exact-cut SQL dump. |

The requested finish is Saturday 17:00 ET. The ceiling, two scorecards, 1B calibration and rung, and extra aged SQL export total about 20–22 h at the published forecasts, before any WAL repeat or restore repair. The combined budget was about USD 103 spent of USD 200 at the revised handoff. Use AGE1 ahead of the fresh card if the ordered runner has not been handed off. Budget the optional 620/s WAL repeat at at most 1 additional hour and USD 1.09, only if a fresh equivalent restore and the repeat fit without jeopardizing the scored work.

The physical seed archive is 131,838,300,610 bytes, SHA-256 `79337afadd5f4eaa7c0276b8aafd8ff63eb3b06a35c565eaa4c1c7de13ee981a`. The image manifest digest is `77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b`. The original transfer digest is `1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154`. All three are mode 0400 with immutable flags. The archive remains on Server 2.

## Original PREP1 matrix context

The original comparison used `7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534`. Its `server.sh run` always generates its own 100,000-person PostgreSQL archive. Its `arm` path checks a `SEAL.sha256` for `seed.json`, `seed.pgdump`, and `plan.json`. `server-produce.ts:323–329` requires its 16,245,050-fact roster, then opens its own scope and uses `baseline.fields` plus synthetic placement and field IDs. The offered tape freezes those choices. Copying or renaming the large image cannot satisfy those assertions or its oracle.

The operator-held SCALE1 directory supplies `image.json`, `seed.pgdump`, and the exact `transfer.json`. Use the transfer's `summaryFiles["image.json"]` digest and the image's own dump hash and byte count. Open the single `scopes[0].name` in the test/test namespace and verify its stored database ID, native logical head 87,002, membership and strict lean clocks. The field edits should address the first task in the tenant-qualified deep graph for each selected person. Prime fields 0–2 from exact pinned typed rows including all IDs, predecessor bytes and record times. Freeze the resulting 100,000-person-per-account selection and per-operation oracle before offers. The two policies must reopen the same cut independently and retain read-back options, receipts, full feed rows and per-JVM logs. In the PREP1 collector bind the adopted population and sealed image bytes instead of its small synthetic roster.

The twelve-arm command also gives each arm 1,740 seconds including restore. A single-account 11.76 GiB restore took about eight minutes. The full database occupied 114 GiB at the last ingest sample, so a streamed SQL restore per arm is likely to breach the 29-minute bound. Adopt one verified native restore as an immutable physical template and use fresh, independently verified disposable copies under the same cache and placement conditions, or supply a measured faster restore path and a revised cost. Retain the original SQL archive either way. PREP1 published another diagnostic launcher at `df307c29c`, with one gateway and 235 and 394 offers/s on the original comparison seal. Its new ordered-ID arm forecasts 225 and 205 settled saves/s at those rates. The old matrix still lacks full-size compatibility. The evening handoff replaces it with the ceiling below.

PREP1's published pre-run model gives settled saves/s, worst-account p99 in ms, then the quiet ratio. Both repetitions use the same forecast. Each observation will be recorded beside it. The controlled alone rates are 3.5/s with forecast p99 10 ms for K and 8.8 ms for S.

| Offers/s | K at 1, 2 or 4 gateways | S at 1 gateway | S at 2 or 4 gateways |
| ---: | --- | --- | --- |
| 50 | 50 / 30 / 4.20× | 50 / 27.34 / 1.11× | 50 / 27.34 / 1.11× |
| 235 | 235 / 30 / 13.76× | 235 / 27.48 / 1.19× | 235 / 27.48 / 1.19× |
| 394 | 255 / 77,739 / 14.53× | 383 / 4,122 / 1.22× | 394 / 28 / 1.22× |
| 620 | 255 / 204,086 / 22.00× | 383 / 88,244 / 1.26× | 620 / 28.36 / 1.26× |

## PREP1 full-size ceiling addition

PREP1 now names `8a116ed366d54ad7bca7b153d92d4f2eb4ea7041` for its one-hour ceiling command. It accepts the original SCALE1 seed with both pinned metadata files and uses one independent SQL restore. Verify the immutable dump digest explicitly before launch. The arm uses the corrected write path, ordered per-person saves, one write gateway and four matched 90-second pairs. It reads back its options and preserves stage clocks and all three JVM pause logs. The arm compares fair turns off and on at 620 and 900/s. Its warm order and 1,900 selected people per neighbour are part of the treatment. It supplies a full-size capacity and quiet-save isolation measurement. It leaves the original matched writer comparison and gateway-count treatment open.

| Offers/s and fair turns | Forecast inside window | Actual |
| --- | ---: | --- |
| Matched quiet controls, 3.5/s | 3.5/s, 315 offers per control | Unmeasured in the first attempt |
| 620/s, off | 450/s, up to 96 awaiting receipts | Unmeasured in the first attempt |
| 620/s, on | 350/s, up to 6 awaiting receipts | Unmeasured in the first attempt |
| 900/s, on | 380/s, up to 6 awaiting receipts | Unmeasured in the first attempt |
| 900/s, off | 520/s, up to 96 awaiting receipts | Unmeasured in the first attempt |

### Full-image restore blocker

The pinned PREP1 producer accepted the SCALE1 image and transfer manifests. The launch wrapper independently rehashed the 131,838,300,610-byte dump in 100.1 seconds. The single-core COPY had processed 81,840,120,620 expanded bytes at 02:56:10 UTC and 88,754,340,744 bytes at 02:57:07 UTC. The original COPY had already exceeded 549,482,753,296 expanded bytes near its end. That pace projects to at least 76 minutes of restore, with 12 minutes of offers, predecessor checks, and cleanup still needed inside the 60-minute cap. The first attempt was stopped before timing and had empty container, volume and network inventories after scoped cleanup.

The PREP1 command needs a measured restore above about 191 MB/s of expanded input before overhead, or a separately verified PostgreSQL physical template and a fresh disposable clone. A decompression or placement change may use additional cores **only** during setup. Restore placement must return to one PostgreSQL core for the timed control, and both policies must use the same cold-cut validation and durability. The scorecard's two 42-minute restore deadlines require at least 218 MB/s before overhead. AGE1’s two-core setup had copied 85.44 GB at 03:10:26 and 268.31 GB at 03:32:00 UTC. That is 141.3 MB/s between samples and about 65 minutes extrapolated for this COPY before index completion. Two-core streaming alone does not close either allowance at this pace. The optional 620/s WAL repeat also needs a verified faster restore and an explicitly supported independent WAL mount for this producer. The older WAL switch binds a different producer slot and device. A base append-tail reading remains unmeasured.

## Scorecard and aging dependencies

The earlier scorecard explicitly refused SCALE1. The revised `v01/SERVER.md` selects `790d9e96e7c700aa0f59e53fc1259df3deb6913d` and now accepts this image. The gate checks the operator-pinned transfer and database cut, original loader identity and fields. The ordered handoff now pins `ce9507b0ed9b0604b69ed28646175df254b7c0c7` with the INT1 writer at `f25a46e02591a1c6b6a9495f7f2cce20249571f0`. It selects `--writer per-person-ordered --jvm j21-g1`, with a grouped P2 and P6 control. Its two-restore first stage and 42-minute per-restore deadline still need a faster verified restore. The grouped-only fallback is out of the current queue. The stack enables timestamped GC logs for the transactor and both gateways and checks settings at runtime. The aged command additionally requires the measured AGE1 replay and exact-cut SQL dump. A valid card can record partial observations. Publish and P9 still need their held-scope and machine-failure adapters.

AGE1 `2859d6b15` runs unchanged for the 1B target. If its first exact 100,000-save segment measures 8,000–16,000 records/s and the official load deadline rejects continuation, the SCALE1 host checks the original attempt, observed starting count, sample and checkpoint. A separately hashed diagnostic launcher retains the same SQL and transactor, original deadline and three-hour reserve. It selects 620M/670M/720M/770M/800M or a lower rounded target from the remaining budget and uses the official native prefix reconciliation and copy checks. A diagnostic seal goes to its own directory and is ineligible for either 1B artifact. Nine focused fixture checks and the decision TypeScript gate passed. Bare-metal calibration remains pending. Its deployment needs an exclusively held restored SQL stack, the expected transactor settings and observed JVM PIDs, JDK, and a separate SQL restore database using the official Datomic tables. Both JDBC destinations and credentials stay in the operator environment. Its native count and bounded rate calibration determine whether it continues.

The AGE1 report selects `93ad03aa3` for the corrected aged logical replay and cut exporter. It can run against the sealed `2859d6b15` rung before stopping its transactor. Scorecard checks that bundle on the restored peer before offers. AGE1’s independent SQL verification remains in its budget. The additional scorecard dump is forecast at 1–2 h and USD 1.09–2.18. Its disk reserve includes the native backup, verification store and immutable dump. Server 2's spare NVMe has no visible partitions, mount, filesystem signature or owner. The projected backup and restored-copy reserves need a separate filesystem. The unused drive was formatted and mounted. It has 955,208,196,096 available bytes after mount. The system disk remained the root mount, and the held seed manifests and dump remain immutable.

## Received result bundles

| Attempt | Terminal status | Native hours | USD | Compressed bytes | SHA-256 |
| --- | --- | ---: | ---: | ---: | --- |
| arm-d7-wfix-pool-seed | success | 16.25 | 17.71 | 98429 | `055d67c2a34ca2f31edc3a53832c34d17472c364103e64fdaffbab208dc07eb7` |
| arm-d7-v01-present | checker-failed | 0.03 | 0.03 | 2866 | `d69101ae77160546fa45ba09c76ceb07e10da9f270a334b42aa4156286b71cf2` |
| prep-v01-ceiling-base | stopped during restore | 0.249 | 0.27 | 4213405 | `a75f5a0dbffe697d8de46a1a4226e83c753058b967c43bfc095ac41fa94611a7` |
| age-v01-1b | JDK setup failed before restore | 0.001 | <0.01 | 4081 | `f7df45aa303454345e360df791167dc143e9392e4bdcc747d6f3d0fa2e2014a6` |

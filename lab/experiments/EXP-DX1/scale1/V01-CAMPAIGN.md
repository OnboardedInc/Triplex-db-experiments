# Server 2 v0.1 campaign

The one-database release needs the grouped versus per-person comparison and the integrated scorecard at fresh and 1B. The current image comes from the verified SCALE1 decision loader. The seed and its host are retained. The prior two-writer isolation queue and all split-layout work were removed before start.

| Item | Forecast from the November 20 handoff | Actual |
| --- | --- | --- |
| Existing fresh seed | About 7.8 h for ingestion, with 162,456,470 current facts. From the handoff, about 4–6 h for remaining claims, feed and seal at USD 4.36–6.54. | Ledger shows 1,000,000 people, 162,456,470 facts and 87,001 frames at cut 87,002. Verification in progress. |
| Trimmed current writer | Up to 3 h (USD 3.27) from restore through the timed run. At least two pairs per rate are scheduled first. | Awaiting the seal. |
| PREP1 comparison | Twelve 29-minute arms give 5.8 h (USD 6.32) once compatible storage and restore admission are ready. The published restore method does not fit this seed. | Awaiting compatibility below. |
| Fresh scorecard | 197 timed minutes and 235 minutes total (USD 3.58–4.27), conditional on compatible restore and exact replay. | Adopted runner published as 790d9e96e. Awaiting the seal and prior stages. |
| AGE1 | 9.60 h (USD 10.46) at 24k records/s, cap 9.9 h (USD 10.79). A 430M native start needs about 23k/s or better. Add a separate restore unless it reuses the fresh restored storage. | Awaiting exact starting native count and calibration. |
| 1B scorecard | 235 minutes (USD 4.27), conditional on the aged seal and updated exact replay. | Adopted runner published as 790d9e96e. Awaiting AGE1 and its exact-cut SQL dump. |

The serial nominal allocations above total about 30–32 hours from the handoff, excluding tooling repair or an extra restore. Saturday 18:00 ET is the target. Meeting it needs several hours of faster restore, abbreviated successful or calibrated arms, or an earlier finish to the seed checks. With the published caps alone, plan for about USD 33–36 more on this server. If PREP1 still cannot adopt the held seed after the present-writer arm, the ready fresh scorecard can use the server while PREP1 is adapted. AGE1 can go before the fresh scorecard if the card is unavailable and AGE1 storage is ready.

## What PREP1 needs to adopt the large seed

The report currently selects `7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534`. Its `server.sh run` always generates its own 100,000-person PostgreSQL archive. Its `arm` path checks a `SEAL.sha256` for `seed.json`, `seed.pgdump`, and `plan.json`. `server-produce.ts:323–329` requires its 16,245,050-fact roster, then opens its own scope and uses `baseline.fields` plus synthetic placement and field IDs. The offered tape freezes those choices. Copying or renaming the large image cannot satisfy those assertions or its oracle.

The operator-held SCALE1 directory supplies `image.json`, `seed.pgdump`, and the exact `transfer.json`. Use the transfer's `summaryFiles["image.json"]` digest and the image's own dump hash and byte count. Open the single `scopes[0].name` in the test/test namespace and verify its stored database ID, native logical head 87,002, membership and strict lean clocks. The field edits should address the first task in the tenant-qualified deep graph for each selected person. Prime fields 0–2 from exact pinned typed rows including all IDs, predecessor bytes and record times. Freeze the resulting 100,000-person-per-account selection and per-operation oracle before offers. The two policies must reopen the same cut independently and retain read-back options, receipts, full feed rows and per-JVM logs. In the PREP1 collector bind the adopted population and sealed image bytes instead of its small synthetic roster.

The twelve-arm command also gives each arm 1,740 seconds including restore. A single-account 11.76 GiB restore took about eight minutes. The full database occupied 114 GiB at the last ingest sample, so a streamed SQL restore per arm is likely to breach the 29-minute bound. Adopt one verified native restore as an immutable physical template and use fresh, independently verified disposable copies under the same cache and placement conditions, or supply a measured faster restore path and a revised cost. Retain the original SQL archive either way. PREP1 published another diagnostic launcher at `df307c29c`, with one gateway and 235 and 394 offers/s on the original comparison seal. Its new ordered-ID arm forecasts 225 and 205 settled saves/s at those rates. Full-size adoption and the 1/2/4 gateway comparison remain open.

PREP1's published pre-run model gives settled saves/s, worst-account p99 in ms, then the quiet ratio. Both repetitions use the same forecast. Each observation will be recorded beside it. The controlled alone rates are 3.5/s with forecast p99 10 ms for K and 8.8 ms for S.

| Offers/s | K at 1, 2 or 4 gateways | S at 1 gateway | S at 2 or 4 gateways |
| ---: | --- | --- | --- |
| 50 | 50 / 30 / 4.20× | 50 / 27.34 / 1.11× | 50 / 27.34 / 1.11× |
| 235 | 235 / 30 / 13.76× | 235 / 27.48 / 1.19× | 235 / 27.48 / 1.19× |
| 394 | 255 / 77,739 / 14.53× | 383 / 4,122 / 1.22× | 394 / 28 / 1.22× |
| 620 | 255 / 204,086 / 22.00× | 383 / 88,244 / 1.26× | 620 / 28.36 / 1.26× |

## Scorecard and aging dependencies

The earlier scorecard explicitly refused SCALE1. The revised `v01/SERVER.md` selects `790d9e96e7c700aa0f59e53fc1259df3deb6913d` and now accepts this image. The gate checks the operator-pinned transfer and database cut, original loader identity and fields. Use the grouped writer while the per-person path remains under comparison. The stack selects timestamped GC logs for the transactor and both gateways through its PREP1 option and verifies the JVM and grouped-writer settings at runtime. The aged command additionally requires the measured AGE1 replay and exact-cut SQL dump. A valid card can record partial observations. Publish and P9 still need their held-scope and machine-failure adapters.

AGE1 `2859d6b15` supports SCALE1 adoption once the image and transfer are sealed. Its deployment needs an exclusively held restored SQL stack, the expected transactor settings and observed JVM PIDs, JDK, and a separate SQL restore database using the official Datomic tables. Both JDBC destinations and credentials stay in the operator environment. Its native count and bounded rate calibration determine whether it continues.

The AGE1 report selects `93ad03aa3` for the corrected aged logical replay and cut exporter. It can run against the sealed `2859d6b15` rung before stopping its transactor. Scorecard checks that bundle on the restored peer before offers. AGE1’s independent SQL verification remains in its budget. The additional scorecard dump is forecast at 1–2 h and USD 1.09–2.18. Its disk reserve includes the native backup, verification store and immutable dump. Server 2's spare NVMe has no visible partitions, mount, filesystem signature or owner. The projected backup and restored-copy reserves need a separate filesystem. Initialization is pending authorization.

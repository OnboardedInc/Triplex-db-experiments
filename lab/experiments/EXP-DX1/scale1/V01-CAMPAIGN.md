# Server 2 v0.1 campaign

The one-database release needs the grouped versus per-person comparison and the integrated scorecard at fresh and 1B. The current image comes from the verified SCALE1 decision loader. The seed and its host are retained. The prior two-writer isolation queue and all split-layout work were removed before start.

| Item | Forecast from the November 20 handoff | Actual |
| --- | --- | --- |
| Existing fresh seed | About 7.8 h for ingestion, with 162,456,470 current facts. From the handoff, about 4–6 h for remaining claims, feed and seal at USD 4.36–6.54. | Ledger shows 1,000,000 people, 162,456,470 facts and 87,001 frames at cut 87,002. Verification in progress. |
| Trimmed current writer | Up to 3 h (USD 3.27) from restore through the timed run. At least two pairs per rate are scheduled first. | Awaiting the seal. |
| PREP1 comparison | Twelve 29-minute arms give 5.8 h (USD 6.32) once compatible storage and restore admission are ready. The published restore method does not fit this seed. | Awaiting compatibility below. |
| Fresh scorecard | 197 timed minutes and 235 minutes total (USD 3.58–4.27), conditional on compatible restore and exact replay. | Awaiting compatible seed adoption. |
| AGE1 | 9.60 h (USD 10.46) at 24k records/s, cap 9.9 h (USD 10.79). A 430M native start needs about 23k/s or better. Add a separate restore unless it reuses the fresh restored storage. | Awaiting exact starting native count and calibration. |
| 1B scorecard | 235 minutes (USD 4.27), conditional on the aged seal and updated exact replay. | Awaiting AGE1. |

The serial nominal allocations above total about 30–32 hours from the handoff, excluding tooling repair or an extra restore. Saturday 18:00 ET is the target. Meeting it needs several hours of faster restore, abbreviated successful or calibrated arms, or an earlier finish to the seed checks. With the published caps alone, plan for about USD 33–36 more on this server. The run order is fixed except that AGE1 advances ahead of the fresh scorecard if the latter is unavailable after PREP1.

## What PREP1 needs to adopt the large seed

The report currently selects `7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534`. Its `server.sh run` always generates its own 100,000-person PostgreSQL archive. Its `arm` path checks a `SEAL.sha256` for `seed.json`, `seed.pgdump`, and `plan.json`. `server-produce.ts:323–329` requires its 16,245,050-fact roster, then opens its own scope and uses `baseline.fields` plus synthetic placement and field IDs. The offered tape freezes those choices. Copying or renaming the large image cannot satisfy those assertions or its oracle.

The operator-held SCALE1 directory supplies `image.json`, `seed.pgdump`, and the exact `transfer.json`. Use the transfer's `summaryFiles["image.json"]` digest and the image's own dump hash and byte count. Open the single `scopes[0].name` in the test/test namespace and verify its stored database ID, native logical head 87,002, membership and strict lean clocks. The field edits should address the first task in the tenant-qualified deep graph for each selected person. Prime fields 0–2 from exact pinned typed rows including all IDs, predecessor bytes and record times. Freeze the resulting 100,000-person-per-account selection and per-operation oracle before offers. The two policies must reopen the same cut independently and retain read-back options, receipts, full feed rows and per-JVM logs. In the PREP1 collector bind the adopted population and sealed image bytes instead of its small synthetic roster.

The twelve-arm command also gives each arm 1,740 seconds including restore. A single-account 11.76 GiB restore took about eight minutes. The full database occupied 114 GiB at the last ingest sample, so a streamed SQL restore per arm is likely to breach the 29-minute bound. Adopt one verified native restore as an immutable physical template and use fresh, independently verified disposable copies under the same cache and placement conditions, or supply a measured faster restore path and a revised cost. Retain the original SQL archive either way. This is an adoption request for PREP1, not a result from that writer.

PREP1's published pre-run model gives settled saves/s, worst-account p99 in ms, then the quiet ratio. Both repetitions use the same forecast. Each observation will be recorded beside it. The controlled alone rates are 3.5/s with forecast p99 10 ms for K and 8.8 ms for S.

| Offers/s | K at 1, 2 or 4 gateways | S at 1 gateway | S at 2 or 4 gateways |
| ---: | --- | --- | --- |
| 50 | 50 / 30 / 4.20× | 50 / 27.34 / 1.11× | 50 / 27.34 / 1.11× |
| 235 | 235 / 30 / 13.76× | 235 / 27.48 / 1.19× | 235 / 27.48 / 1.19× |
| 394 | 255 / 77,739 / 14.53× | 383 / 4,122 / 1.22× | 394 / 28 / 1.22× |
| 620 | 255 / 204,086 / 22.00× | 383 / 88,244 / 1.26× | 620 / 28.36 / 1.26× |

## Scorecard and aging dependencies

The current `v01/SERVER.md` is published but explicitly refuses SCALE1. It needs the INT1 `seed-image.json`, the original campaign's journal and command identities, and the exact starting logical seed head. The fresh wrapper must verify the SCALE1 population, source seal, typed fields and original receipt claims using a named adopted tape. The aged wrapper also needs an exact oracle for the AGE1 append prefix and the physical and logical cuts in its final seal. Do not relabel either input as INT1. The existing command alone leaves both scorecards unmeasured.

AGE1 `2859d6b15` supports SCALE1 adoption once the image and transfer are sealed. Its deployment needs an exclusively held restored SQL stack, the expected transactor settings and observed JVM PIDs, JDK, and a separate SQL restore database using the official Datomic tables. Both JDBC destinations and credentials stay in the operator environment. Its native count and bounded rate calibration determine whether it continues.

The AGE1 exporter at `4d0c68aab` adds the aged logical replay and cut bundle. It can run against the sealed `2859d6b15` rung before stopping its transactor. Scorecard still needs to consume and independently check that bundle. Server 2's spare NVMe has no visible partitions, mount, filesystem signature or owner. The projected backup and restored-copy reserves need a separate filesystem. Initialization is pending authorization.

# Playground sizes and startup paths

**North star** P8 measures how import affects other traffic. These measurements concern the local demo and do not qualify production import. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Inputs and choices

Mac probes used an arm64 host with 36 GiB system RAM and Node 22.23.1. The stack caps and the generator process RSS describe different workloads. Neither establishes the full tier's memory requirement.

The admitted Mac sample generated 45 objects in 2.46 seconds with an 87.7 MiB process peak RSS. Its 22,464 history frames occupied 2,160,335 compressed bytes. The two full schedules total 30,817,360 history saves. At the sampled compression and encoder rate, the history objects alone project to about 2.96 GB and 56 minutes of generation. The static graph, larger ID entropy and filesystem effects are additional. Allow 5 GB for generator output and measure the actual archive before upload. The full replay omits detailed gateway log files to bound disk use and still exposes available request timing headers. Full database expansion and restore memory remain open. Evidence is in `evidence/DX-PLAY1/fixture-test-retry.txt`.

The Git fixture contains 16 deep people averaging 165.6 current facts, 160 wide people with four each, and small accounts of 4, 5 and 7 people. Run `node examples/playground/fixture.ts` at the repository root to regenerate the archive and SHA-256 manifest byte for byte. Use `pnpm playground start --larger` for a larger local small-tier profile.

In the `live-10` Mac diagnostic, the portable stack took 70.0 seconds to boot and the 29,540-byte fixture took 37.2 seconds to replay. After the API and browser made additional writes, a quiesced 15.83 MB PostgreSQL database produced a 7.26 MB compressed dump in 0.94 seconds. The same running PostgreSQL instance restored the dump into a separate database in 0.92 seconds. The gate compared the sorted digest of every key and value, covering 905 rows. The restore interval includes creating that database. It excludes Docker boot, object download and reconnecting Datomic to the restored database. See `live-10/size.json` in the [evidence manifest](SHA256SUMS).

The passing `live-12` Mac diagnostic took 176.1 seconds to boot and 35.5 seconds to replay. Its 15.14 MB source database produced a 6.53 MB dump in 1.25 seconds. PostgreSQL restored it in 1.47 seconds and matched the digest over all 885 rows. Both runs include vendor fetch and Docker build in boot and omit workspace dependency installation. They measure different cuts after interactive writes. See `live-12/size.json` in the [evidence manifest](SHA256SUMS).

| Path                          | What it preserves                                                                                                                                                           | Disk and memory                                                                                                                            | Startup                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git small archive             | Same entity relationships, lower populations, 35 days of sampled changes and two release policies                                                                           | 29,540 compressed bytes. The four local containers are currently capped at 2,816 MiB combined. Node and Docker VM overhead are additional. | Replays into a fresh Datomic-on-PostgreSQL database. See the report for measured results.                                                                                     |
| Full compressed object replay | 100,000 deep people, 4 million wide people, three smaller accounts, 35 days at about 440,000 field-level saves/day/account across the two large accounts, and two releases. | Generator enforces a 2–5 GB compressed envelope and streams each object. Database expansion and working-set memory are open measurements.  | Each durable save consumes a gateway round trip. At a hypothetical 1 ms per save across ~30.8 million saves, replay alone would take over 8.5 hours before seed and releases. |
| PostgreSQL custom-format dump | Physical Datomic state with journal and indexes from the snapshot cut                                                                                                       | Ordered chunks with a SHA-256 manifest                                                                                                     | Restore with `pnpm playground start --tier NAME --data SOURCE`                                                                                                                |

The wide interpretation holds the fact count near the deep account's count, spread over about 4 million employees with four facts each. The small graph retains the source model's employee-child shape. Actual erasure events remain gated on a native query route that can return the marker in protected scopes. The full tier needs room for its 2–5 GB object cache in addition to PostgreSQL data, indexes and Docker assets. The unmeasured database size and peak memory prevent a reliable full laptop requirement.

Run the full generator on a larger machine from the repository root. It preserves the requested population and history. If the compressed size falls outside the envelope it leaves the generated parts and declines to write a loadable manifest.

```sh
node examples/playground/bundle.ts ../playground-full
```

The expected inventory is `manifest.json` and 148 gzip objects. The manifest enumerates every exact filename, SHA-256, byte size and row count. The names are five `catalog-AA-000.ndjson.gz` files, people batches for account 00 in 000–024, account 01 in 000–079, one batch each for 02–04, and `events-00-DDD.ndjson.gz` for 001–035. Use the generated manifest when copying or uploading.

When a full set and bucket exist, this is the upload command. Set the bucket and endpoint for the chosen account and use an AWS CLI profile with access to that destination. [Cloudflare R2 AWS CLI guide](https://developers.cloudflare.com/r2/examples/aws/aws-cli/)

```sh
aws s3 sync ../playground-full "s3://${R2_BUCKET}/playground/v2/" --endpoint-url "${R2_ENDPOINT}"
```

For local or remote replay, use `pnpm playground start --tier full --data SOURCE`. `SOURCE` can be a local directory or the HTTPS object base with `manifest.json`. `PLAYGROUND_DATA_URL` is equivalent. Downloads resume from a retained partial byte count and verify the size and SHA-256 of each completed object before importing. The directory under `.cache/playground-data` is a reusable download cache.

## Prepared snapshots

The Mac diagnostics used source `734890a2c` in the lab. Each run waited for Datomic to index the checkpoint, stopped its owned Datomic processes, exported PostgreSQL 17, dropped the original volume, restored into a fresh stack, and compared complete sampled person graphs at three cuts. The first-read clock begins with a local verified archive and a built image. It includes fresh databases and JVMs, verification of chunk bytes, restore, verification of the three cuts, and the first checked HTTP read. Restore includes staging and reverifying the chunks. The four memory figures are cgroup peaks for separate containers. Their sum is an upper bound on their combined peak during the observed interval. Node, Docker VM overhead and OS memory are additional.

| Deep / wide people    | Initial facts | Retained saves | Download | Restored PostgreSQL | Restore | First checked read | Replay at build | Build / restore container peak sums |
| --------------------- | ------------: | -------------: | -------: | ------------------: | ------: | -----------------: | --------------: | ----------------------------------: |
| 16 / 160, Git fixture |         6,974 |    303 grouped |  9.62 MB |            18.66 MB |  1.23 s |             37.0 s |          23.7 s |                     1,170 / 884 MiB |
| 48 / 1,920            |        19,278 |            350 | 23.71 MB |            34.74 MB |  1.90 s |             31.6 s |          43.8 s |                     1,376 / 919 MiB |
| 96 / 3,840            |        34,862 |          1,050 | 60.54 MB |            75.48 MB |  5.11 s |             53.0 s |          76.6 s |                   1,512 / 1,020 MiB |
| 192 / 7,680           |        66,010 |            560 | 80.56 MB |            97.74 MB |  7.73 s |             43.1 s |         125.3 s |                   1,554 / 1,010 MiB |

The last run restored an ordered two-object archive. PostgreSQL reached its 256 MiB container limit during the two larger restores while all checked reads still completed. The shipped container limits total 2.75 GiB at memory scale 1. Portable start and the server builder also accept memory scales 2 and 4 for 5.5 and 11 GiB of container limits. The higher scales are planning allowances. Their adequacy at each candidate size is unmeasured.

The fit uses the three individual-save rungs. The Git fixture uses grouped writes and stays outside the fit. Variations in save count make the initial-fact and save terms separately observable. The nonnegative fit gives about 1,016 compressed bytes per initial fact and 23,018 per retained save. Restored PostgreSQL fit terms are about 1,207 bytes per initial fact and 31,321 per save. These include the playground's legacy journaling and settled PostgreSQL/Datomic storage at this range. They are particularly uncertain when extrapolated over tens of millions of saves. They do not replace the independent production-layout measurement.

Brackets give sensitivity bounds from leaving out one rung at a time and multiplying the resulting envelope by 0.75 and 1.25. They are neither probability intervals nor guaranteed limits. Some two-rung fits cannot separate the fact and save costs. First new laptop start adds a 100 Mbit/s download and 0.5–3 minutes for image and service setup to the fitted local restore. Dependency installation and first-time image pulls can add time. Peak free disk includes two archive copies, 1.5 times restored PostgreSQL for data and temporary headroom, and 6 GB for runtime assets. Server build hours use the same serial replay path with a planning midpoint of twice the Mac replay speed, bracketed by one to four times that speed, plus export and restore. Effective observed export ran at 1.83–3.57 MB/s including quiescence and packaging. Server rates depend on the machine and have yet to be measured.

| Choice                                                                                                                                                  | Initial facts / retained saves | Download GB        | Restored PG GB / peak free disk GB  | Container allowance / laptop RAM | First start      | One-time server build |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------ | ----------------------------------- | -------------------------------- | ---------------- | --------------------- |
| **A. Sized to the 5 GB ceiling**. 246 deep and 9,840 wide people. Keeps 35 days with offered volume proportional to the deep population.                | 83,550 / 75,810                | 1.83 [0.07–4.99]   | 2.48 [0.08–5.53] / 13 [6–25]        | 2.75 GiB / plan 12 GiB           | 5.7 min [0.7–17] | 0.32 h [0.07–2.21]    |
| **B. Full population with active daily history**. About 1,900 active people per large account per day, with one retained save each day they are active. | 32,572,526 / 133,000           | 36.14 [5.25–49.53] | 43.49 [5.82–54.90] / 144 [25–188]   | 5.5 GiB / plan 16 GiB            | 110 min [15–148] | 11.7 h [0.9–29.7]     |
| **C. Full population and real-rate history**. Keeps all 35 days and all scheduled saves.                                                                | 32,572,526 / 30,817,360        | 742 [15.7–2,027]   | 1,005 [17–2,242] / 2,998 [64–7,423] | 11 GiB / plan 32 GiB             | 28 h [0.9–94]    | 116 h [19–860]        |

B retains a daily state for its rotating active cohort and drops intraday intermediate saves. Keeping every actual change for every person active at least once would include all the scheduled saves and give C. All three choices keep the account relationships, the 35-day span, and two release checkpoints. The upper download range for A is the selection boundary. B and C exceed 5 GB even at the low end of this sensitivity calculation.

**Recommendation** Use A for a downloadable playground and the Git fixture for the quick trial. The Mac build's upper forecast is 2.21 hours including export and restored validation. Its upper scratch requirement is about 30 GB including a third archive copy during export. This crosses the two-hour and shared-Mac disk guardrails. Build A on the larger machine with at least 32 GB free for the build. The command checks the actual 5 GB limit and keeps the bundle only after a fresh restore and verified read.

```sh
pnpm playground snapshot --tier tier-a --deep 246 --daily 1083 \
  --max-bytes 5000000000 --out ../playground-tier-a
```

The generated `../playground-tier-a/bundle/manifest.json` lists every ordered object with its exact size and SHA-256. The expected object count is about 28 chunks at the midpoint, with at most 75 chunks under the cap. Start it with `pnpm playground start --tier tier-a --data ../playground-tier-a/bundle`. No full-size bundle or hosted object has been created.

To reproduce the fit, extract `./run/snapshot.json` from each `part2-merged-{48,96,192}-01.tar.gz` archive, then pass those files to `node examples/playground/size-fit.ts` in increasing population order. The fit output and gates are indexed in the [evidence manifest](SHA256SUMS).

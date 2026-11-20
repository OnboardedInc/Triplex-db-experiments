# Playground sizes and startup paths

**North star** P8 measures how import affects other traffic. These measurements concern the local demo and do not qualify production import. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Inputs and choices

The Git fixture contains 16 deep people averaging 165.6 current facts, 160 wide people with four each, and small accounts of 4, 5 and 7 people. Run `node examples/playground/fixture.ts` at the repository root to regenerate the archive and SHA-256 manifest byte for byte. Use `pnpm playground start --larger` for a larger local small-tier profile.

| Path                          | What it preserves                                                                                                                                                           | Disk and memory                                                                                                                           | Startup                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git small archive             | Same entity relationships, lower populations, 35 days of sampled changes and two release policies                                                                           | 29,540 compressed bytes. The four local containers are capped at 2,560 MiB combined. Node and Docker VM overhead are additional.          | Replays into a fresh Datomic-on-PostgreSQL database. See the report for measured results.                                                                                     |
| Full compressed object replay | 100,000 deep people, 4 million wide people, three smaller accounts, 35 days at about 440,000 field-level saves/day/account across the two large accounts, and two releases. | Generator enforces a 2–5 GB compressed envelope and streams each object. Database expansion and working-set memory are open measurements. | Each durable save consumes a gateway round trip. At a hypothetical 1 ms per save across ~30.8 million saves, replay alone would take over 8.5 hours before seed and releases. |
| PostgreSQL custom-format dump | Physical Datomic state with journal and indexes from the snapshot cut. The gate uses a freshly loaded small SQL database and validates an independent restore.              | Full dump size and restored disk remain unmeasured. Bucket input may need to be chunked to preserve resumability.                         | Preferred if a full restore passes the size and laptop-time gates. The running playground currently accepts the compressed replay bundle.                                     |

The wide interpretation holds the fact count near the deep account's count, spread over about 4 million employees with four facts each. The small graph retains the source model's employee-child shape. Actual erasure events remain gated on a native query route that can return the marker in protected scopes.

Run the full generator on a larger machine from the repository root. It preserves the requested population and history. If the compressed size falls outside the envelope it leaves the generated parts and declines to write a loadable manifest.

```sh
node examples/playground/bundle.ts ./playground-full
```

The expected inventory is `manifest.json` and 148 gzip objects. The manifest enumerates every exact filename, SHA-256, byte size and row count. The names are five `catalog-AA-000.ndjson.gz` files, people batches for account 00 in 000–024, account 01 in 000–079, one batch each for 02–04, and `events-00-DDD.ndjson.gz` for 001–035. Use the generated manifest when copying or uploading.

When a full set and bucket exist, this is the upload command. Set the bucket and endpoint for the chosen account and use an AWS CLI profile with access to that destination. [Cloudflare R2 AWS CLI guide](https://developers.cloudflare.com/r2/examples/aws/aws-cli/)

```sh
aws s3 sync ./playground-full "s3://${R2_BUCKET}/playground/v2/" --endpoint-url "${R2_ENDPOINT}"
```

For local or remote replay, use `pnpm playground start --tier full --data SOURCE`. `SOURCE` can be a local directory or the HTTPS object base with `manifest.json`. `PLAYGROUND_DATA_URL` is equivalent. Downloads resume from a retained partial byte count and verify the size and SHA-256 of each completed object before importing. The directory under `.cache/playground-data` is a reusable download cache.

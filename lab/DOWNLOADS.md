# Downloads ledger (Sam's standing permission of 2026-11-10: up to 19.0 GiB in total, any lane)

Budget basis: 38.07 GiB free on the Mac's data volume at 2026-11-10 13:51 UTC; half is 19.03 GiB. Sizes are the image sizes
Docker reports after the pull (uncompressed, so an upper bound on what was fetched). Decision text:
`lab/research/SAM-decisions-2026-11-09.md`.

| When (UTC) | What | Why | Size | Running total |
| --- | --- | --- | --- | --- |
| 2026-11-10 12:22 | `apache/kafka:4.1.1` | XTDB shared log (lane X) | 0.22 GiB | 0.22 GiB |
| 2026-11-10 13:52 | `ghcr.io/xtdb/xtdb-aws:2.2.0` (`sha256:d7989bfa11f9…`) | XTDB with Kafka log and S3 storage modules (lane X) | 0.16 GiB | 0.38 GiB |
| 2026-11-10 13:52 | `cgr.dev/chainguard/minio:latest` (`sha256:fb893e36fc36…`) | S3-compatible object store for two-node XTDB | 0.05 GiB | 0.43 GiB |
| 2026-11-10 13:52 | `chrislusf/seaweedfs:3.97` (`sha256:bb05d66d2963…`) | fallback S3-compatible object store | 0.06 GiB | 0.49 GiB |
| 2026-11-10 | [DX-N1 postgres.dmg](https://github.com/PostgresApp/PostgresApp/releases/download/v2.9.6/Postgres-2.9.6-17.dmg) | Native lane D; published SHA256 `b38bb00b8c8702a568270aab85995c550f7f93d1503b818efdc5ff9a519b7168` verified | 119,621,638 bytes | DX-N1: 319,376,236 bytes (under 2 GiB) |
| 2026-11-10 | [DX-N1 jdk.tar.gz](https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13%2B9/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.13_9.tar.gz) | Native lane D; published SHA256 `bf036b35b071bfb2f54f2c0af8ee8d88afa95ee6eb3dce02c0f94cfc2524d04a` verified | 199,754,598 bytes | DX-N1: 319,376,236 bytes (under 2 GiB) |

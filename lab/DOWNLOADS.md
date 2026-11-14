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
| 2026-11-10 21:0x | Temurin JDK 21.0.13 for macOS arm64 (tarball, checksum verified) | DX-N1 native mode (ended by Sam; files removed 21:45 UTC) | 0.19 GiB | 0.68 GiB |
| 2026-11-10 21:0x | Postgres.app 2.9.6 with Postgres 17 (dmg, checksum verified) | DX-N1 native mode (ended by Sam; files removed 21:45 UTC) | 0.11 GiB | 0.79 GiB |

DX-T1, 2026-11-14: anonymous npm optional native test binding `@rolldown/binding-linux-arm64-gnu@1.2.7` from the existing lockfile; 7,549,043 compressed bytes, 17,404,144 expanded bytes. SHA256 `7add60734a765e6a8106814c73d79cc4caddf70df2807d44e4ef6f3116a0f7fa`; tarball SHA512 matches `pnpm-lock.yaml`. Enables the pinned Vitest/Vite toolchain inside the existing Linux VM; no catalog, lock or image change. Private receipt: `DX-T1/tools/linux-bindings/rolldown-receipt.json`.

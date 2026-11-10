# DX-H6 execution commands

North star: P5 (TARGETS §1.1, §6.1); P1/P2 latency retained. All receipts diagnostic.

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
node lab/bin/heavy.mjs --label DX-H6-build -- node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... --filter=@triplex-build/w0... --filter=@triplex-build/triplex-host...
DXH6_SEED_VOLUME=tx2-dxh5-seed-1000-pg-data node lab/bin/heavy.mjs --label DX-H6-record -- bash lab/experiments/EXP-DX1/h6/attempt.sh record tx2-dxh6-record2
node lab/bin/heavy.mjs --label DX-H6-offline -- node --experimental-strip-types --cpu-prof --cpu-prof-dir=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6 lab/experiments/EXP-DX1/h6/offline.ts
```

Fresh-prefix wrappers retain exact arguments, runtime/image identities and source/build hashes. `attempt-counts.sh` is the first immutable capture launcher (record1 failed setup); use `attempt.sh` for subsequent runs. Its independent guard uses 15-minute leases by default; only a 10k seed/sweep may set `DXH6_LEASE_MS=2700000`.

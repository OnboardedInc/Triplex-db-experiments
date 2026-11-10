# DX-H6 execution commands

North star: P5 (TARGETS §1.1, §6.1); P1/P2 latency retained. All receipts diagnostic.

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
node lab/bin/heavy.mjs --label DX-H6-build -- node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... --filter=@triplex-build/w0... --filter=@triplex-build/triplex-host...
DXH6_SEED_VOLUME=tx2-dxh5-seed-1000-pg-data node lab/bin/heavy.mjs --label DX-H6-record -- bash lab/experiments/EXP-DX1/h6/attempt.sh record tx2-dxh6-record2
node lab/bin/heavy.mjs --label DX-H6-offline -- node --experimental-strip-types --cpu-prof --cpu-prof-dir=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6 lab/experiments/EXP-DX1/h6/offline.ts
```

Fresh-prefix wrappers retain exact arguments, runtime/image identities and source/build hashes. `attempt-counts.sh` is the first immutable capture launcher (record1 failed setup); use `attempt.sh` for subsequent runs. Its independent guard uses 15-minute leases by default; only a 10k seed/sweep may set `DXH6_LEASE_MS=2700000`.

Actual subsequent profiles (each wrapper records its exact arguments):

```sh
DXH6_SEED_VOLUME=tx2-dxh5-seed-1000-pg-data node lab/bin/heavy.mjs --label DX-H6-sweep1000c -- bash lab/experiments/EXP-DX1/h6/attempt.sh sweep tx2-dxh6-sweep1000c --rung 1000 --scope dxh5-w0-1000-v1 --seed-receipt /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5/tx2-dxh5-seed1000b/driver/receipt.json --seed-mapper 95781c05db68757c31e4ba218dfcb40a4fa7e957f25c9fdd0da1999ede33f79e --workers 8 --live --baseline-s 60 --live-warmup-s 15
node lab/bin/heavy.mjs --label DX-H6-final-offline -- node --experimental-strip-types lab/experiments/EXP-DX1/h6/offline.ts final-common-layout
git fetch .
git log --oneline exp/DX-B8-head-lookup
# The actual merge used --no-edit -F /tmp/dxh6-b8-merge.txt to preserve the required commit footer.
git merge --no-edit -F /tmp/dxh6-b8-merge.txt exp/DX-B8-head-lookup
node lab/bin/heavy.mjs --label DX-H6-seed1000-postb8 -- bash lab/experiments/EXP-DX1/h6/attempt-seed.sh seed tx2-dxh6-seed1000-postb8 --rung 1000 --scope dxh6-w0-1000-postb8-v1 --seed-concurrency 1 --seed-warmup-commands 0 --g0-only
DXH6_LEASE_MS=2700000 node lab/bin/heavy.mjs --label DX-H6-seed10000 -- bash lab/experiments/EXP-DX1/h6/attempt-seed.sh seed tx2-dxh6-seed10000 --rung 10000 --scope dxh6-w0-10000-v1 --seed-concurrency 1 --seed-warmup-commands 0 --g0-only
```

The evidence launcher `launch-sweep10000.py` waits for seed exit0, fresh exact10k G0 receipt/source/volume binding, then executes the following. A failed prerequisite means **not executed**, not a failed semantic sweep:

```sh
DXH6_LEASE_MS=2700000 DXH6_SEED_VOLUME=tx2-dxh6-seed-10000-pg-data node lab/bin/heavy.mjs --label DX-H6-sweep10000 -- bash lab/experiments/EXP-DX1/h6/attempt-large-sweep.sh sweep tx2-dxh6-sweep10000 --rung 10000 --scope dxh6-w0-10000-v1 --seed-receipt /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/tx2-dxh6-seed10000/driver/receipt.json --workers 4 --live --baseline-s 60 --live-warmup-s 15
```

Local final evidence derivation (run only after the attempts settle):

```sh
node lab/bin/heavy.mjs --label DX-H6-analysis -- node lab/experiments/EXP-DX1/h6/analyze.mjs
node lab/bin/heavy.mjs --label DX-H6-manifest -- node lab/experiments/EXP-DX1/h6/manifest.mjs
```

No command above downloads images/dependencies or writes the acceptance contract. Exact label spelling/source heads and first-failure attempts are preserved in the durable launcher logs and per-attempt argument files; these examples do not retroactively qualify an attempt.

Final executed candidate and evidence commands:

```sh
DXH6_SEED_VOLUME=tx2-dxh5-seed-1000-pg-data node lab/bin/heavy.mjs --poll-ms 100 --label DX-H6-sweep1000d -- bash lab/experiments/EXP-DX1/h6/attempt.sh sweep tx2-dxh6-sweep1000d --rung 1000 --scope dxh5-w0-1000-v1 --seed-receipt /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5/tx2-dxh5-seed1000b/driver/receipt.json --seed-mapper 95781c05db68757c31e4ba218dfcb40a4fa7e957f25c9fdd0da1999ede33f79e --workers 4 --live --baseline-s 60 --live-warmup-s 15
node lab/bin/heavy.mjs --poll-ms 100 --label DX-H6-evidence-batch -- bash -c 'node lab/experiments/EXP-DX1/h6/analyze.mjs > /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/analysis.log && node lab/experiments/EXP-DX1/h6/seed-journal.mjs > /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/seed-journal-result.log && node --experimental-strip-types lab/experiments/EXP-DX1/h6/offline.ts post-b8-current > /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/offline-post-b8-current.log'
node lab/bin/heavy.mjs --poll-ms 100 --label DX-H6-final-evidence -- bash lab/experiments/EXP-DX1/h6/finalize.sh
```

`finalize.sh` runs only after `sweep1000d/exit.json`, inventories all own prefixes, writes the final derived analysis and manifest, then independently verifies every checksum. Output stays outside the evidence tree to avoid hashing its own changing log. No engine is kept alive while waiting for heavy/measurement admission.

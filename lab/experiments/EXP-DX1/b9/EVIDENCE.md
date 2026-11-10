# DX-B9 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9/`.
Final byte/file counts are in EVIDENCE-SIZE.json, generated only after selected gates and cleanup.
No raw evidence is committed. The SHA256SUMS.part-* files are digest indexes, each below1MB;
SHA256SUMS checks those shards. From this directory verify the shards with `shasum -a256 -c SHA256SUMS`.
From the durable root verify each shard with `shasum -a256 -c /absolute/worktree/lab/experiments/EXP-DX1/b9/SHA256SUMS.part-NNN`.
These prove file integrity, not semantic acceptance.

## Main evidence

- `frozen-2/`, `mixed-2/`: original A1 B1 A2 B2 holds. Each contains exit, host lines,
  individual stack/container/source manifests, raw driver summaries, recordings and removal receipts.
  `original-arm-binding.json` checks all8 source manifests against exact19f5422d/da77a50a Git bytes.
- `profiles-frozen-2/`, `profiles-mixed-2/`: B1 read/write gateway and transactor leaf/caller
  summaries plus lossless compressed execution-sample JSON. Raw JFR stays in original holds.
- `final-frozen-1/`: rejected optimized-but-enabled prototype. Its64-reader repeat ranges lose.
- `stage-default1/`: selected immutable A/B gateway and shared SDK/source/build/test/runner/oracle
  preimages, with CAPTURE.json. `default-frozen-1/`, `default-mixed-1/`: selected-default paired holds.
  Their warm-answer hashes bind counts/bytes/digests across arms to fresh A1; startup native-t
  changes are retained. `seed-clone-1/` seals the original B9 seed input; clones are byte-checked
  and removed per arm. The original H5 volume was not modified or needed.
- `gate-runner-default1/`: actual immutable gate runner copies. `tx2-dxb9-a-default1-short-*`
  and `tx2-dxb9-a-default1-full-*`: source manifests, raw test logs, individual exits, cache/proxy
  statistics, bounded cleanup receipts. `*-gate-union.json` exists only after the verifier passes.
- `SOURCE-CHANGES.json` in the repo: old/new SHA256 for all changed package paths.
  `PIN-CHANGES.json` and durable `pin-path-search.txt`: no matching changed pinned path found;
  no contract files edited. `host-script-binding.json`: local host-quiet.sh equals lane/d-native bytes.
- `final-owned-cleanup/`: retained seed attachment check, removal, observed absence and inventories.
  No semantic verdict. Old raw `.ndjson` receipt paths resolve through `COMPRESSION-INDEX.json`:
  original byte length/SHA256 and compressed path/SHA256 are retained, and decompression was checked.
  Use `zstd -dc PATH.zst` to recover original bytes. No failure log was truncated.
- Build/typecheck/format logs at root; W0 fixture failure in `w0-fixture-probe/result.log`.
  Earlier attempts and every rerun reason are in FAILURES.md. They remain in the digest index.

## Commands

All engine-bearing commands use the private DOCKER_HOST socket and own tx2-dxb9-* names.
Each wrapper owns the measurement lock only during its bounded hold, samples the host and cleans up
before release. No keep-awake helper was used. Node22.23.1 and pnpm10.11.0 were already present.
No downloads occurred; local Datomic/Postgres images were used with --pull never.

Setup/build commands (before immutable captures):

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/triplex build
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/triplex-testkit build
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/w0 build
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/triplex-datomic build
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/triplex-datomic typecheck
node_modules/.bin/oxfmt --check packages/datomic/src/sweepRows.ts packages/datomic/test/sweepRows.test.ts packages/datomic/test/w0-page.test.ts
```

Builds that were treated as heavy were admitted with `node lab/bin/heavy.mjs --label DX-B9-... --`.
The original short focused commands and failed setup messages are preserved in the session and logs;
no successful check is inferred from a failed command.

Selected capture and holds (OUT below is the durable root; existing IDs are immutable, so a rerun
must choose fresh IDs and a new capture, not overwrite these directories):

```sh
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9
python3 lab/experiments/EXP-DX1/b9/prepare.py "$OUT/stage-default1" --working
node lab/bin/heavy.mjs --label DX-B9-A-default-frozen -- bash "$OUT/stage-default1/source/lab/experiments/EXP-DX1/b9/clone2-window.sh" frozen "$OUT/stage-default1" default-frozen-1 tx2-dxb9-seed-clone-1-seed "$OUT/seed-clone-1/seed/tx2-dxb9-seed-clone-1-seed/driver/seed-state.json" "$OUT/seed-clone-1/exit.json"
node lab/bin/heavy.mjs --label DX-B9-A-default-mixed -- bash "$OUT/stage-default1/source/lab/experiments/EXP-DX1/b9/clone2-window.sh" mixed "$OUT/stage-default1" default-mixed-1 tx2-dxb9-seed-clone-1-seed "$OUT/seed-clone-1/seed/tx2-dxb9-seed-clone-1-seed/driver/seed-state.json" "$OUT/seed-clone-1/exit.json"
B8_GATEWAY_SRC="$OUT/stage-default1/B" B8_CACHE_VERIFY=true B8_HOST_GATES=1 B8_RECENT_TESTS=1 node lab/bin/heavy.mjs --label DX-B9-A-default-short -- bash "$OUT/gate-runner-default1/gate-window.sh" tx2-dxb9-a-default1-short bash "$OUT/gate-runner-default1/short-diff-gates.sh" tx2-dxb9-a-default1-short
B8_GATEWAY_SRC="$OUT/stage-default1/B" B8_CACHE_VERIFY=true B8_HOST_GATES=1 node lab/bin/heavy.mjs --label DX-B9-A-default-long -- bash "$OUT/gate-runner-default1/gate-window.sh" tx2-dxb9-a-default1-full bash "$OUT/gate-runner-default1/parallel-gates.sh" tx2-dxb9-a-default1-full full
python3 lab/experiments/EXP-DX1/b9/summarize.py "$OUT/default-frozen-1" "$OUT/stage-default1" > "$OUT/default-frozen-1/summary.json"
python3 lab/experiments/EXP-DX1/b9/summarize.py "$OUT/default-mixed-1" "$OUT/stage-default1" > "$OUT/default-mixed-1/summary.json"
python3 lab/experiments/EXP-DX1/b9/verify-gates.py tx2-dxb9-a-default1-short tx2-dxb9-a-default1-full "$OUT/stage-default1/B"
node lab/bin/heavy.mjs --label DX-B9-final-cleanup -- bash lab/experiments/EXP-DX1/b9/finish-cleanup.sh
node lab/bin/heavy.mjs --label DX-B9-evidence-manifest -- python3 lab/experiments/EXP-DX1/b9/manifest.py
python3 lab/experiments/EXP-DX1/b9/write-report.py
```

Original comparisons used captured `alternate.sh` with arguments `frozen stage-a1 frozen-2` and
`mixed stage-a2 mixed-2`. Actual shell bytes and per-arm invocation logs are inside each hold.
Seed creation used captured clone-window.sh `seed stage-clone1 seed-clone-1`; its sealed-source
receipt is retained. Profile commands used profiles.sh with fresh profiles-frozen-2/profiles-mixed-2
IDs and the corresponding B1-{gw-r,gw-w,tx}.jfr inputs. No C publication profile or D page replay ran.

B proposals are under draft/ and strict-order.test.ts.draft; apply-step-b.py was not executed.
They are not package tests and their presence is not evidence of strict ordering.

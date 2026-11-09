# EXP-P5 round A: A1 handoff

North star: P5, with P1/P2 protected. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; design R34 sections 0–6 and Q92a–k. This branch is an incomplete offline implementation, not an A1 screening or acceptance result.

## Build

From this worktree, with Node 22+ and pnpm 10.11.0:

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
node lab/bin/heavy.mjs --label CX-P5A-build -- pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec turbo run build --filter=@triplex-build/triplex-qualification... --filter=@triplex-build/triplex-xtdb... --filter=@triplex-build/w0
node lab/bin/heavy.mjs --label CX-P5A-tests -- node --experimental-strip-types --test lab/bench/test/bench.test.ts lab/bench/test/p5.test.ts
node node_modules/typescript/bin/tsc --noEmit -p lab/bench/tsconfig.json
```

## A1 G0, only in an orchestrator-opened scale window

Check at least 5 GiB host free first. Only attempt `up` once; an admission refusal ends the attempt. Do not wait, park residents, force ownership, or remove someone else's volume. The following example assumes s1 is genuinely available and the orchestrator has parked Datomic. `up --fresh` is permitted only for the newly owned exclusive slot; retain existing forensic state if the engine owner refuses fresh creation.

```sh
df -h .
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder CX-P5A --exp EXP-P5 --fresh
```

After successful admission and readiness, record the returned owner/placement evidence. Then:

```sh
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock XTDB_URL=postgres://xtdb:xtdb@127.0.0.1:5471/xtdb node lab/bin/heavy.mjs --label CX-P5A-A1-G0 -- node --max-old-space-size=4096 --experimental-strip-types lab/bench/driver.ts --world w0 --rung 1000 --composition public --lane xtdb --workers 1 --g0-only --output runs/P5/a1-1k-attempt-01/receipt.json
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-P5A
```

Always release your slot after a failed command too. Keep its volume and first-failure receipts. Do not use the `dev` slot. No A1 run was performed by CX-P5A.

The public page reader uses the built XTDB adapter's `getByEntities`, one call per BFS hop. Its client wrapper LEFT JOINs the scope's MAX(position) into the **same statement**, including the empty-result case. It masks retirement fields when projecting W0 facts. The SQL wrapper is typechecked but has not executed against XTDB; live G0 is needed before trusting it.

## What still blocks A1 screening

There is no valid command yet for the full S0/S1 six-round live screening design: the existing W0 entry point runs G0 and one diagnostic activation. It does not yet connect mapped trace traffic, 64 live readers, controller observations, alternating R2/R1 rounds, matched A/A windows, or per-round maintenance. Do not interpret `--workers` as a controller or traffic setting.

Also incomplete: a driver-owned advancing deterministic clock, all XTDB 4.4 counters (trie/file bytes and compactor jobs), placement/slot attestation in the sweep receipt, bytes per fact, G1 O-REPLAY for pre-capture trace writes, and ten abrupt **controller process** stops at random pages. Public G9 currently folds journal domain changes and may need explicit accounting for Triplex's internal journal assertions in `tx_assertions`.

## RQ01 stack

The final stacked commit adds `lab/bench/test/p5-g6.stacked.ts`. After merging/rebasing on RQ01, build its testkit and run:

```sh
node lab/bin/heavy.mjs --label CX-P5A-G6-build -- pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec turbo run build --filter=@triplex-build/triplex-testkit...
node lab/bin/heavy.mjs --label CX-P5A-G6 -- node --experimental-strip-types --test lab/bench/test/p5-g6.stacked.ts
```

This registers the actual memory composition's `sweepPage` as `sweep-page` alongside RQ01 source routes, exercises sparse P positions, T/TP refusal, future P, later retirement masking and the harness maintenance model. It is an offline fixture; it cannot qualify real purge leases, checkpoint gates, XTDB compaction, Datomic indexing or generation switches. Those live cases must be implemented on each corresponding lane. Its default RQ01 reference is diagnostic; an independently supplied O-REPLAY reference is still needed for qualification.

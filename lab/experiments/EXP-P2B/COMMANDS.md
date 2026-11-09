# EXP-P2B commands

North star: P2 commit latency and original receipt resolution, with P1 pinned
repository readers and P3 ordered resumable delivery. Goals and targets:
`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. These commands produce
experimental diagnostics. They do not promote a candidate or change acceptance.

## Offline

From the worktree root, with the pinned dependencies already installed:

```sh
node lab/bin/heavy.mjs --label CX-P2B-gates -- node lab/experiments/EXP-P2B/gates.mjs
node lab/bin/heavy.mjs --label CX-P2B-memory -- node lab/experiments/EXP-P2B/measure.mjs --mode memory --seconds 10 --readers 256 --seed p2x-a --subjects 10000
```

The dependency graph adds only workspace links. Installation uses the pinned
store: `pnpm --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store install --offline --frozen-lockfile`.
The native-module reuse receipt from this builder is `native-install.json`.
Do not replace the dependency lock with a newly resolved graph.

## Exclusive live window (orchestrator only; not run by this builder)

First let the orchestrator park lane D if needed. Check host free space is at least
5 GiB, then let `engine.mjs` admit the exclusive slot. Do not bypass a refusal.
From the root:

```sh
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder CX-P2B-live --exp EXP-P2B
```

Use the exports printed by that command (including its exact `XTDB_URL`, private
`DOCKER_HOST` and `TRIPLEX_LAB_SLOT_OWNER`). The driver itself checks the live
owner, endpoint, holder, container identity, label and memory cap before and after.
It records the image, mounts and slot-config hash. It does not start or stop engines.

```sh
node lab/bin/heavy.mjs --label CX-P2B-live-baseline -- node lab/experiments/EXP-P2B/measure.mjs --mode xtdb --slot xtdb-s1 --holder CX-P2B-live --seconds 300 --readers 0 --seed p2x-a --subjects 10000
node lab/bin/heavy.mjs --label CX-P2B-live-readers -- node lab/experiments/EXP-P2B/measure.mjs --mode xtdb --slot xtdb-s1 --holder CX-P2B-live --seconds 300 --readers 256 --seed p2x-a --subjects 10000
```

These matched open-loop runs use the existing generator, including its 120–180 s
burst. Every command is offered independently of the readers; latency starts at
the scheduled offer. Receipts, route counts, sampled raw answer bytes, exact-content
checks, trace, source/build hashes, durable consumer state and raw broker log live
under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/<attempt>/`.
The smoke seed population is not a year-one rung and there is no maintenance event.
These measurements remain diagnostic even if the provisional latency numbers fit.
A native commit control is the separately retained P2X2/A1 experiment; this driver
measures arm B only. A native-feed/off-engine-consumer P3 arm A1 must be reported
separately, per Q98j; counting arm B as lane X remains Sam's decision.

For the unchanged complete runtime conformance corpus, in this worktree's
`packages/xtdb` directory, use a fresh broker directory per attempt:

```sh
XTDB_INTEGRATION=1 XTDB_COMMIT_PATH=broker XTDB_BROKER_DIR=/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/live-conformance-01 node ../../lab/bin/heavy.mjs --label CX-P2B-live-conformance -- node ../../node_modules/vitest/vitest.mjs run test/conformance.test.ts --maxWorkers=1 --no-file-parallelism
```

That full suite is **not** certified by the offline storage subset. The public
native factory also detects `XTDB_COMMIT_PATH=broker`; explicit position reads wait
for the marker and bracket all answer requests with incarnation checks. Named
record-time native reads refuse until RT01's shared record-time integration lands.

Return to the root and release only this holder's exclusive slot, keeping its volume:

```sh
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-P2B-live
```

The live window still needs actual engine conformance, replica restart/stall tests,
process-stop consumer tests, CPU/RSS/disk observations, population fingerprints and
independent verification. No Local/InMemory XTDB-log comparison was performed here.

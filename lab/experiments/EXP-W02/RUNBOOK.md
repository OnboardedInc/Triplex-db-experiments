# EXP-W02 runbook

North star: GS under all five priorities and the correctness floor (SCOPE, NORTH-STAR,
TARGETS 2.1 and 6). These are diagnostic commands; no acceptance claim is authorized by
this branch. Q94a, contract 0.4.0 and independent case pinning remain open.

Run from this worktree. Node 22.23.2 supports the explicit type-stripping flag. Install
with the environment owner's pinned tooling and `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`.
No dependency or lockfile change is needed.

Offline receipt, including W0 build, types, unit checks, same-process in-memory G0 and
byte-identical regeneration:

```sh
node lab/bin/heavy.mjs --label CX-W02-offline -- node lab/experiments/EXP-W02/check-offline.mjs
```

The live window must be assigned by the orchestrator. Do not park residents from this
worktree. Check host free disk >= 5 GiB immediately before admission; use only the private
triplex2 Docker socket already in the lab environment. `engine.mjs up` must grant the
exclusive reservation. Do not use `--fresh` against unknown retained state.

The GS gate already acquires the canonical heavy grant for its build and live step. Do
not put an outer heavy grant around it: nested grants can deadlock with three other jobs.

Lane X, after the remaining executor work and the adapter builds:

```sh
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder CX-W02 --exp EXP-W02
node lab/bin/gate.mjs GS --lane xtdb --slot s1 --holder CX-W02 --exp EXP-W02 --rung 1k --readers 256 --run-kind diagnostic
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-W02
```

Lane Q, **only after** QG1 has qualified a built-base generation, the broker is merged,
and its position/count route and touched-block instrumentation are integrated:

```sh
node lab/bin/engine.mjs up --lane qlever --slot s1 --holder CX-W02 --exp EXP-W02
node lab/bin/gate.mjs GS --lane qlever --slot s1 --holder CX-W02 --exp EXP-W02 --rung 1k --readers 256 --broker-dir runs/W02-Q/broker --run-kind diagnostic
node lab/bin/engine.mjs down --lane qlever --slot s1 --holder CX-W02
```

Lane D, **only after** DA01/DA04, the Datomic slot registration and a position/count route
are integrated. `s1` here is the intended exclusive registration; it does not exist in
this branch's current slots file, so these commands currently refuse:

```sh
node lab/bin/engine.mjs up --lane datomic --slot s1 --holder CX-W02 --exp EXP-W02
node lab/bin/gate.mjs GS --lane datomic --slot s1 --holder CX-W02 --exp EXP-W02 --rung 1k --readers 256 --run-kind diagnostic
node lab/bin/engine.mjs down --lane datomic --slot s1 --holder CX-W02
```

Repeat with `--rung 10k` only after bytes-per-fact/disk forecasts admit it. Acceptance at
a reduced rung remains subject to Q94a; year-one projections cannot pass for measurements.
The runner uses a random fresh scope **per scenario**, the W0 population valid clock,
240-second trace windows containing the 120-180-second burst, and a separate overlay.
Maintenance must still be observed inside each window; a 240-second duration alone proves
no maintenance event. Every current v2 scenario returns FAIL/UNQUALIFIED until the named
state, domain, product and fault checks are integrated. The raw report retains those gaps.

## Round 2 offline execution

The v2 typecheck includes every `.ts` file, including the live entry and all test
modules. Build the public runtime dependencies before it; missing XTDB dist was
the cause of round 1's live-typecheck failure. With the environment owner's pinned
pnpm installed locally (no shared node_modules symlink):

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-W02-r2-install -- pnpm --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store install --offline --frozen-lockfile
node lab/bin/heavy.mjs --poll-ms 100 --label CX-W02-r2-offline -- node lab/experiments/EXP-W02/check-offline.mjs
```

The second command builds the public runtime dependencies, checks all v2 types,
runs the old and new regression tests, checks the frozen 20 goldens, executes all
70 CS-GS members through both D and Q memory/fake paths, and retains raw results.
It preserves every attempted result, including failures and explicit BLOCKED
cases. Offline fixture cases are not performance runs and never close GS.

Individual lane and case entry points (without any engine or slot):

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-W02-r2-D -- node lab/scenarios/run.mjs --offline --lane datomic --output runs/W02-r2/datomic-cases.json
node lab/bin/heavy.mjs --poll-ms 100 --label CX-W02-r2-Q -- node lab/scenarios/run.mjs --offline --lane qlever --output runs/W02-r2/qlever-cases.json
node lab/bin/heavy.mjs --poll-ms 100 --label CX-W02-r2-case -- node --experimental-strip-types lab/scenarios/v2/case-driver.ts --lane datomic --case GS-06B-SHARED-REFERENCE --output runs/W02-r2/shared-reference.json
```

Each Q fixture's counts are explicitly `OFFLINE-FAKE`, bound to its own memory
source, attempt and source hash, and read before and after the case. They exercise
selection, binding, receipt plumbing and refusal, not real QLever layout.

The live Q command additionally needs `--layout-reader lab/<reviewed-module>.ts`.
That module exports `readQleverLayout(binding)` and returns `{binding, counts}`
with fresh `baseTriples`, `deltaTriples`, `touchedBlockDelta`, `rebuildThreshold`
and `baseGeneration`. Its file hash is pinned and checked around every call;
missing/foreign/stale observations refuse. The module must read the measured
engine and actual query blocks; a fixture, transported receipt or process flag is
not a live reader. No such live instrumentation was supplied or qualified here.
The public QLever package must actually contain HostBroker; selecting the env
flag on an older marker-only package now refuses.

Offline consumer stops are logical client/consumer replacements over retained
memory state. Replica maintenance actually replays the source feed into a new
immutable generation and tests fallback/catch-up while writes proceed. Neither
is an engine process stop, compaction, physical tenant isolation or real erasure.

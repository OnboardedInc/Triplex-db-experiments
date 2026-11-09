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

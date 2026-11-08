# EXP-G03 round 2: exact window commands

These commands are for the orchestrator **after it opens the scale window**. They do not park any resident.
The first run is a registered-slot **diagnostic isolation canary**, not P1–P5 qualification. It verifies the
retained store, slot binding, relay/preflight, isolated TCP case and cleanup. It does not execute a business
case or PAIR-0 measurement. The semantic runner and other contract blockers remain unresolved.

Frozen implementation and authority: `e847718a23d08ceb57ffc5dfb444b505e57653b7`.
The final report commit can be newer; use the frozen id below so these commands cannot follow a moving ref.

```sh
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SOURCE_REPO=/Users/sam/projects/triplex-db-2
AUTHORITY=e847718a23d08ceb57ffc5dfb444b505e57653b7
EVALUATOR_COMMIT=e847718a23d08ceb57ffc5dfb444b505e57653b7
EVALUATOR_REPO=/Users/sam/.tx2-evaluator/g03-r2-e847718a

# One independent Git repository; fetch explicit objects, with no linked worktree or shared object store.
# Stop if this destination already exists; inspect/reuse only after checking its provenance.
test ! -e "$EVALUATOR_REPO"
mkdir -p "$(dirname "$EVALUATOR_REPO")"
git init "$EVALUATOR_REPO"
git -C "$EVALUATOR_REPO" fetch --no-tags "$SOURCE_REPO" "$EVALUATOR_COMMIT"
git -C "$EVALUATOR_REPO" checkout --detach "$EVALUATOR_COMMIT"
test "$(git -C "$EVALUATOR_REPO" rev-parse HEAD)" = "$EVALUATOR_COMMIT"
cd "$EVALUATOR_REPO"
node -e 'const s=require("node:fs").statfsSync(".");if(s.bavail*s.bsize<5*1024**3)process.exit(2)'

# s3 must be unused. The runner refuses retained/unknown volume state rather than wiping it.
# No polling or resident lifecycle action occurs: a refusal is a recorded terminal attempt.
node lab/bin/heavy.mjs --label CX-G03-window -- \
  node lab/experiments/EXP-G03/round2/window.mjs \
  --authority "$AUTHORITY" --evaluator-commit "$EVALUATOR_COMMIT" \
  --source-repo "$SOURCE_REPO" \
  --store-receipt "$EVALUATOR_REPO/lab/experiments/EXP-G03/round2/store.json" \
  --lane xtdb --slot s3 --holder CX-G03-window
```

The runner prints its full receipt and writes `runs/g03-window/<timestamp>/receipt.json`. Even if a
preflight or case fails, it attempts container/network/fixture-volume cleanup before stopping **its own**
slot and removing **its own newly created** slot volume. A proof failure stays diagnostic and retains its
reservation. Inspect remaining resources before retrying; each retry is a new timestamp.

Required retained assets, already prepared this round:

- Image `sha256:302cbcd48d5b68ca49d020204c08814fac74c451fb51e13a62b908f368423575`.
- Store `tx2-g03-r2store-store-b2b3e6e8cdfb` with listing
  `64bfed7194f5f8d852286cd923bd050f520f47562dd1937a86c3253d5bbc356e`.
- Receipt `round2/store.json`, whose values must match the authority's `buildSpec.boxSpec`.

Do not substitute a newly fetched store/image receipt if these assets disappear. This round demonstrated
that rebuilding the same recipe can yield different image and store hashes. A mismatch needs a new
retained attempt and reviewed contract pins; qualification fails closed.

## PAIR-0 layout, without allocating either slot

From the frozen evaluator checkout above:

```sh
node --input-type=module - "$SOURCE_REPO" "$AUTHORITY" <<'JS'
import { gitSource } from './lab/bin/claim.mjs';
import { authorityPolicy, pairLayout } from './lab/bin/box-policy.mjs';
console.log(JSON.stringify(pairLayout(authorityPolicy(gitSource(process.argv[2]),process.argv[3]),['s1','s2']),null,2));
JS
```

The plan gives candidate engine cores 0–1 and its SUT/relay/observer core 4; A0 engine cores 2–3 and its
SUT/relay/observer core 5. `BoxExecutor` accepts the validated layout and uses pinned auxiliary cores
without CPU quota. This is layout code, not a paired measurement: engine/observer placement and effective
`cpu.max`/`cpu.weight` readback still need integration with M01/OBS01 before a PAIR-0 result can qualify.
Two 3.5 GiB engines plus the shared residents do not fit in this first one-slot window.

## Later semantic qualification command

After a reviewed authority actually pins `obl-case.ts`, case manifests, oracle runners, A0, verifiers and
any required measurement/fault runners, the common CLI is:

```sh
node lab/bin/heavy.mjs --label CX-G03-OBL -- \
  node lab/bin/gate.mjs OBL --claim /absolute/path/to/claim.json \
  --repo "$SOURCE_REPO" --authority "$AUTHORITY" --evaluator-commit "$EVALUATOR_COMMIT" \
  --store-receipt "$EVALUATOR_REPO/lab/experiments/EXP-G03/round2/store.json" \
  --holder CX-G03-window
```

At the frozen authority above it will remain DIAGNOSTIC: the build argv/run are deliberately still null.
Do not call a diagnostic canary a completed OBL or P1–P5 case run.

After the scale run no longer needs the immutable store, the orchestrator can remove it explicitly:

```sh
node lab/bin/engine.mjs box remove-volume --run r2store \
  --name tx2-g03-r2store-store-b2b3e6e8cdfb --holder CX-G03
```

# Launch guard for tonight's server queue (DX-HA1 part 8)

## The fix

**No guard line needs to change on `exp/DX-INT1`; the refused runs were pinned to commits from before the guard admitted them.**
The writer allowlist in `stack/up.sh` (INT1 `666b625e5`, lines 257 to 260) already admits the prepared-copy route through
`( $prefix == tx2-dxscale1-publish-* && -n $prepared_pg )`, added by the removal merge `3669bee41` at 11:00. That clause
sits inside the same conjunction as before: `DX_PREP1_SERVER=1`, `DX_V01_ADOPTED_STACK=1`, `--no-publish` (private bridge,
no host ports) and one ordered per-person writer (`DX_PREP1_WRITERS=1`). The copy itself is checked again at lines 336 to
339 (bare metal, exact slot pattern, separate WAL, stopped PostgreSQL 17, `pg_wal` linked to `/wal`). The fair-import run
used the HA1 source commit `52ad22640` (based on INT1 `057cc1eb4`), not INT1's build of it, `b21ff7a17`. The Publish pin
`bfef77d34` (10:39) also predates the clause. Both refuse at their line 246 to 247, which admits only `tx2-dxscale1-v01-*`.
**Fix: rerun both on INT1 `666b625e5`.** That commit is on the one branch now, carries the clause, and the combined
check's fair import, quiet account and Publish combination was run on it. The held runner, fair campaign, `scale1/bench.ts`
and `v01/profile.ts` are byte-identical to INT1's gated fair-import build `b21ff7a17`.

## Tonight's launchers against the guard

Mac check: `ha1/guard-check.sh` (below). It runs each commit's own `stack/up.sh` with that launcher's slot, arguments
and writer settings and records where it stopped.

| Run | Launcher | Pin queued | Route into `stack/up.sh` | At the queued pin | On INT1 `666b625e5` |
| --- | --- | --- | --- | --- | --- |
| Fair import | `load1/fair-server.sh` → `actv-lazy/join/held-server.ts` | `52ad22640` | `tx2-dxscale1-publish-<11 hex>`, prepared copy, separate WAL, private bridge, one ordered writer | **Refused**, line 246–247 (only `v01-*`) | **Admitted**, line 260, then 336–339 |
| Publish at 100,000 | `actv-lazy/join/held-server.sh` | `bfef77d34` | same as fair import | **Refused**, line 246–247 | **Admitted**, line 260, then 336–339 |
| Removal stage | `erase1/measure-server.ts` | `3669bee41` | `tx2-dxscale1-removal-<12>`, `--pg-data`, no WAL | Admitted, line 249 | Admitted, line 259 |
| Read study | `scorecard.mjs --read-study` → `v01/adopted-server.ts` | none queued | `tx2-dxscale1-v01-<12>`, separate WAL | — | Admitted, line 259 |
| Cold start | `jvm1/cold-server.sh` | none queued | `tx2-dxscale1-v01-cold-<12 hex>`, cold copy, separate WAL | — | Admitted, lines 259 and 324–327 |
| Append retirement pair | `v01/adopted-server.sh`, `DX_W1_RETIREMENT_PAIR=1` | `1f64480bb` | `tx2-dxscale1-v01-<12>`, retirement on, numeric owner on | Admitted, line 259 (stack files identical to `666b625e5`) | Admitted, lines 259 and 268 |
| Realistic card | `scorecard.mjs --age realistic` | `a36c88e6c` | `tx2-dxscale1-v01-<12>`, `DX_V01_PGDATA` copy | Admitted, line 247 | Not on INT1 yet (combined-check gap) |
| Realistic build | `real1/server.ts extend` | `8597e3ef7` | `tx2-dxreal1-<uuid>`, `--real1-pgdata`; writer allowlist not consulted | Admitted, line 200 and the `else` at 265 | Admitted, line 200 and 266 |
| Writer arms | `prep1/server.sh` | `97aced1b1`, `73afad665`, `891ab9139` | `tx2-dxprep1-<tag>-<cell>`, published ports | Admitted, line 241 | Admitted, line 257 |
| Failover | `hasync1/sunday.ts` | THIN1's next build | Does not use `stack/up.sh` | Not this guard | **Fails at launch on `666b625e5`**: `hasync1/pair.ts` builds `-e -e HA1_FLEET_HTTP=1`. Fixed on CHK1 `f8e05f25b`; needs that merge. |

These checks run after the first stack container, so neither the dry run nor the Mac check covers them. I checked each by
reading the launcher. The removal copy and the removal settings (lines 568–570 and 729–730) are all set by
`measure-server.ts`. The realistic card's `DX_V01_PGDATA` checks are at `a36c88e6c` lines 509–513. The gateway setting
formats (lines 776–802) are constants from `v01/profile.ts`.

## Dry run per launcher (server)

`ha1/launch-dry-run.sh LOG_DIR -- LAUNCHER ARGS...` puts a `docker` stand-in (`ha1/dry-run/docker`) first on `PATH`.
The stand-in passes read-only queries to the real daemon. It also passes one kind of `docker run`: `--rm --network none
--read-only` with read-only mounts, such as the held runner's `pg_controldata` check. The first command that would create,
start, change or remove anything is refused with exit 97 and logged. The launcher's own input checks and every
`stack/up.sh` guard up to its first container therefore run for real. The verdicts:

- **ADMITTED (0):** the first refused command is the stack's own `docker create --name <slot>-extract`.
- **REFUSED (1):** the launcher exited before any Docker change. `launcher.log` shows the check.
- **REVIEW (3):** something else was refused first.

It works on any pin, including those already queued, because it lives outside the build. Fetch it once:

```sh
mkdir -p "$TOOLS/dry-run"
git -C "$BUILD" fetch origin exp/DX-HA1-failover-move
git -C "$BUILD" show FETCH_HEAD:lab/experiments/EXP-DX1/ha1/launch-dry-run.sh > "$TOOLS/launch-dry-run.sh"
git -C "$BUILD" show FETCH_HEAD:lab/experiments/EXP-DX1/ha1/dry-run/docker > "$TOOLS/dry-run/docker"
chmod +x "$TOOLS/launch-dry-run.sh" "$TOOLS/dry-run/docker"
```

Then, in each item's pinned build checkout with the same environment its `bench3-*.sh` wrapper exports, put the dry-run
wrapper in front of the launcher command that wrapper runs, with a new output path:

```sh
DR="bash $TOOLS/launch-dry-run.sh"
$DR "$JOB/dry-fair"    -- bash lab/experiments/EXP-DX1/load1/fair-server.sh "$PIN" "$IMAGE" "$IMAGE_SHA256" "$TRANSFER_SHA256" "$PG_TEMPLATE" "$JOB/dry-fair-out" --pg-data "$PG_COPY" --wal-dir "$WAL_COPY" --credit-mode rolling6 --frame-facts 32 --import-credits 1
$DR "$JOB/dry-publish" -- bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh "$PIN" "$IMAGE" "$IMAGE_SHA256" "$TRANSFER_SHA256" "$PG_TEMPLATE" "$PG_COPY" "$WAL_COPY" "$JOB/dry-publish-out"
$DR "$JOB/dry-removal" -- taskset -c 9,10,11 node --experimental-transform-types lab/experiments/EXP-DX1/erase1/measure-server.ts ...   # bench3-removal.sh arguments
$DR "$JOB/dry-card"    -- node lab/bin/scorecard.mjs --commit "$PIN" --out "$JOB/dry-card-out" ...                                         # bench3-realistic-card.sh arguments
$DR "$JOB/dry-study"   -- node lab/bin/scorecard.mjs --read-study --commit "$PIN" --out "$JOB/dry-study-out" ...
$DR "$JOB/dry-retire"  -- env DX_W1_RETIREMENT_PAIR=1 bash lab/experiments/EXP-DX1/v01/adopted-server.sh ...
$DR "$JOB/dry-cold"    -- bash lab/experiments/EXP-DX1/jvm1/cold-server.sh ...
$DR "$JOB/dry-arms"    -- bash lab/experiments/EXP-DX1/prep1/server.sh ...                                                                   # bench3-writer-addons.sh arguments
```

Conditions and limits:

- **Idle server only.** Run between queue items. Each launcher takes the day lock with `flock -xn` and requires
  `docker ps -q` to be empty. Under a running item it reports REFUSED at the lock, not at the guard.
- **The prepared copy is never opened by PostgreSQL**, so it stays usable for the real run. The held runner still
  compares `pg_wal` with the template, which takes up to 4 minutes.
- **Launchers with a separate WAL leave an empty `$WAL/<slot>` directory**, made by `scale1/bench.ts` before the stack.
  This applies to the read study, cold start and the retirement pair. Remove it with `rmdir` after the dry run.
- **Realistic build: do not dry-run it.** `real1/server.ts` makes a full `cp -a` of the parent PGDATA before the stack.
  The Mac check covers its route.
- **Failover: the dry run stops at its first PostgreSQL container (REVIEW)**, so it cannot reach the doubled `-e`. Use a
  build that contains CHK1 `f8e05f25b`.

## Mac check

```sh
node lab/bin/heavy.mjs --label DX-HA1-guard -- bash lab/experiments/EXP-DX1/ha1/guard-check.sh
```

It extracts each pinned commit's stack, configuration and TypeScript files. It derives the writer settings from that
commit's own `stackOptions("subject")`. It runs `stack/up.sh` under `bash -x` in one disposable container (no network,
512 MiB) with the stand-in answering empty. Inputs are a stub prepared copy, WAL on a separate tmpfs, the server's slot
`tx2-dxscale1-publish-249dd49021f` and the server's Java and PostgreSQL options. CPU lists are cut to the VM's eight
cores; the CPU check is unrelated to the route. Result at 2026-11-21 12:54 local (diagnostic, correctness only):
**23 cases, 0 mismatches.** Two of them run `launch-dry-run.sh` itself in pass-through mode against a stand-in daemon
that answers like an empty host. The fair input at `666b625e5` gives ADMITTED, stopping at
`docker create --name tx2-dxscale1-publish-249dd49021f-extract`. At `52ad22640` it gives REFUSED with no Docker change. The refusal reproduces at the exact test,
`[[ tx2-dxscale1-publish-249dd49021f == tx2-dxscale1-v01-* ]]`, for both `52ad22640` and `bfef77d34`, and the same input
is admitted at `666b625e5`. On INT1 the guard still refuses each of these:

- host ports published (`[[ true == false ]]`)
- no prepared copy
- a prepared copy on a `v01-*` slot (line 336)
- two writers
- `DX_V01_ADOPTED_STACK=0`

## Imports refused during a removal (combined check, `2b939a5d5`)

- **Doubled `-e`:** it was in the combined check's own Mac option splice (`ha1/stack.ts`), not in the server import path.
  `fair-server.sh` takes no retirement or serial option, and `stack/up.sh` receives retirement as an environment variable
  (line 769).
- **`ErasureFrontierUnavailable` (typed 503):** the production import producer (`load1/fair-campaign.ts`, `send`) does
  not retry it.
  - **What happens now:** a refusal fails the run. A frame is recorded only after its receipt, so nothing is duplicated
    or counted twice.
  - **Tonight:** it cannot occur, because the removal stage runs alone on its own copy.
  - **Needed for the production policy:** the bounded retry the live saves already have, at `scale1/decision/writes.ts`
    lines 323–330. That means retrying only `ErasureFrontierUnavailable` and `CasConflict`, with the same input and
    operation id, a deadline 15 s after the frame's due time and a retry count in the result. After a lost reply, look
    the frame up by its operation id before resending. Not built here.

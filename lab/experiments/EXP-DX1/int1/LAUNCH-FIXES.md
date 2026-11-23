# Launch fixes for the five runs that stopped before their first offer on bench 3

On 2026-11-21 five queued full-size runs stopped on bench 3 before any offer. Each one checked something that held on a
fresh small seed and not on the held full-size copy. This note gives the cause of each stop, the repair on
`exp/DX-INT1`, and the Mac proof on a small copy of the same shape. All Mac clocks are diagnostic.

## The five runs

| Run | Where it stopped | Cause | What the check protects | Repair | Commit |
| --- | --- | --- | --- | --- | --- |
| Cold start | `jvm1/cold-server.ts` line 118 at `8ab832093`: `subjectFunction` null | The runner read `/write-options` without opening the scope. The held copy was sealed by the seed build and has no ordered per-person function under this build's name. A scope open installs it. The other full-size runners open the scope first in `checkAdoptedPeer`. | Saves reach a writer that runs this build's ordered per-person function. | `jvm1/cold-open.ts` opens the scope on the write gateway after `ready` and before the first offer, then keeps the same write-options checks. The cold start counts the open, and `scope-open.json` records its clock. | `ef4513658` |
| Realistic first rung | `real1/server.ts` line 412 at `8597e3ef7`: 429,778,722 native records, expected 429,778,659 | The census ran after `checkAdoptedPeer`, whose scope open installs this build's schema and functions. The expected count is the held copy as sealed. The 63 records are named below. | The held copy is the SCALE1 seed, unchanged, before the extension writes. | The census runs before the open and keeps exactly 429,778,659. After the open, `real1/held-census.ts` lists every native record written since. It requires each to be schema, a database function or one of the two scope names, and the count difference to equal the list. It also requires the logical head unchanged. The list goes to `native-scope-open.json`. | `da0aaae16`, `3ef0f36cd` |
| Publish at 100,000 | `actv-lazy/join/held-campaign.ts` line 196 at `8ab832093`: positions must rise with member index | The pooled loader keeps two frames in flight, so a later frame can commit first. SCALE1 packs about twelve people into one frame. | Each person's original facts come from one loader frame at or below the cut. | `checkSeedFrames`: every position is a loader position at or below the cut, and each frame holds one contiguous run of people (a position never returns after a different one). | `22db6e3ec` |
| Reads ladder, tuned arm | `v01/adopted-server.ts` line 127 at RD1 `ca93f5165`: no `ladders/control-complete.json` | The read-study branch ended in `continue`, which skipped `prepared.complete()`. Separately, the driver pinned itself to 9,10 before the stack, so `stack/up.sh` refused cores 0–8. | The tuned ladder runs only after a sealed control on the same seal, input and PostgreSQL system. | RD1's prepared-copy path is merged into INT1's `v01/study-server.ts` and `study-run.ts` (`7bc17a3c3`). The arm body is a function passed to `rd1/prepared.ts` `sealedArm()`, which cleans up and then seals on every normal return. The driver takes all online CPUs while each stack starts and pins itself to 9,10 before its first read or save. `study-run.ts` reports a ladder complete only from its seal. | `03e7b1c03` |
| Append-retirement pair | Launch: restores `seed.pgdump`, which bench 3 does not hold | No prepared-copy path. | Both arms start from the same seal and cut. | With `DX_W1_RETIREMENT_PAIR=1`, `study-server.ts` runs `DX_RD1_LADDER=reference`, then `append`, each on a new copy of the held directory. The append arm requires the reference arm's seal, input record and PostgreSQL system. Rates, windows and writer settings are unchanged. | `860d0efd7` |

## The 63 records, by name

A scope open by this build on a copy sealed by the seed gateway writes four native transactions. The realistic rung
sets `DX_GROUP_COMMIT=1`, so the open also installs the group function.

| Transaction | Records | What |
| --- | ---: | --- |
| 1 | 35 | Eight new attributes with ident, type, cardinality and install, one unique and one index: `:triplex.scope/erasure-ledger`, `:triplex.scope/erasure-seq`, `:triplex.private/id`, `/entity`, `/attribute`, `/validity`, `/body`, `:triplex.tx/erasure-record`. Plus the transaction time. |
| 2 | 3 | The scope's schema hash replaced (one addition, one retraction) and the transaction time. |
| 3 | 5 | `:triplex/commit` replaced by this build's commit function, and the scope's commit-function hash replaced, plus the transaction time. |
| 4 | 20 | Four group attributes (`:triplex.group/position` unique, `/physical`, `/members`, `/touched`), the function `:triplex.group/apply-v1`, and the transaction time. |

That makes 60 additions and 3 retractions. Datomic's `db-stats` counts both, so the total is 63. The gateway code that
writes these four transactions (`schema.clj`, `commit.clj`, `group.clj`, `group_prepare.clj`) is the same at `8597e3ef7`
and at this head.

## Proof at small size on the Mac

`int1/launch-fixes.ts` runs one phase per heavy token against the lab VM. It uses a DX-THIN1 Java 21 image and
`stack/up.sh` in its Mac mode.

**The copy.** `held` starts a stack on the seed source's own gateway tree (`97852735`). Its write gateway reports the
same gateway source hash as the full-size seed writer (`aba650e3…`) and the same writer options. The phase then loads a
ten-account pooled SCALE1 toy through the SCALE1 generator and Snapshot loader, with 32 people per account and 20
frames. The loader holds frame 0 until frame 1 commits, so account 0's people 16–31 sit at position 2 and 0–15 at
position 3. PostgreSQL then stops cleanly and the volume is kept as the held copy. Each later phase starts a stack on a
fresh copy of it through `up.sh --clone-seed` (Mac-only, `tx2-dxthin1-lf-*`).

| Run | Stop reproduced | Repaired launch |
| --- | --- | --- |
| Realistic rung | Census 102,100 before the open, 102,163 after, so the old check fails by exactly 63 | `census`, `checkAdoptedPeer`, `installsSince`, `checkScopeOpen` from this checkout pass: 63 records, 4 transactions, named above. Reached the first extension write. |
| Cold start | With the ordered writer on, `subjectFunction` is null before the open | `openColdWriter` installs `:triplex.subject/v-b71693f35262baf699e5c7b9` in 2.49 s (diagnostic). The runner's sender code offered three saves, all acknowledged, and each journal entry carries that function. |
| Publish at 100,000 | Positions `3×16, 2×16`: the old order check fails | `checkSeedFrames` passes (2 frames, 1 reordering). `runHeld` itself, not in diagnostic mode, passed its adopted-peer, writer-option and seed-position checks. The dry-run hook stopped it at `held-campaign.ts:429`, its first Publish offer. |
| Reads ladder | `completed()` on bench 3's own control output gives "The control ladder has not completed". `up.sh`'s CPU check under `taskset -c 6,7` gives "unavailable or duplicate CPU". | `prepared.test.ts` drives `sealedArm` through control then tuned and the tuned ladder is admitted. The same CPU check passes unpinned, and the driver is then pinned to 6,7. |
| Retirement pair | Not reproducible on the Mac: the runner is bare-metal only | `prepared.test.ts` drives the reference and append arms through `sealedArm`. A failed arm is never sealed, the append arm is refused without the reference seal, and both are checked together. |

**Not proven at small size.** These were not run on the Mac:

- the bare-metal runners themselves: `cold-server.ts`, `real1/server.ts`, `study-server.ts` and `held-server.ts`
- Java 25, the separate WAL and the full-size copy times

The cold phase runs the runner's shared `openColdWriter` and its sender code, but not `cold-server.ts`. The publish phase
runs `runHeld`, the held runner's own campaign function.

The Saturday guard check (`ha1/guard-check.sh`) still passes with the refusal-line trap in `stack/up.sh`: 47 cases, 0 mismatches, including ten new cases at `99808c500`.

Evidence: `evidence/DX-THIN1/launch-fixes.tar.zst` in the lab evidence store ([SHA-256](LAUNCH-FIXES-SHA256SUMS)).

## Dry run to the first offer

```sh
bash lab/experiments/EXP-DX1/ha1/launch-dry-run.sh --to-first-offer QUEUE_FILE HELD_PGDATA NEW_LOG_DIRECTORY
```

Each `NAME COMMAND` line of the queue runs as root in the build checkout, with `HELD`, `LOGS` and
`DX_DRY_RUN_FIRST_OFFER=1` set. The launcher does all of its own work up to its first offer:

1. starts its stack on its own copy
2. runs every check
3. prints `DX-DRY-RUN first offer reached: NAME FILE:LINE`
4. throws, so its own cleanup removes the stack

The tool prints `ADMITTED NAME (stopped before its first offer at FILE:LINE)` or `REFUSED NAME FILE:LINE MESSAGE`. It
exits 0 only if every launcher is admitted.

`ha1/first-offer-queue.example` lists the queued launchers with `$VARIABLES` to fill from the bench units.

**Cost and limits**

- **Cost.** Each launcher makes its own copy of the held directory, as its real run does: about 4.4 minutes per
  full-size copy, plus stack start. The realistic extend makes a full `cp -a`.
- **Run on an idle server only.** Each launcher takes the day lock. Delete `$LOGS` copies and WAL subdirectories
  afterwards.
- **The read study and the retirement pair are checked through their first ladder.** The second ladder's admission
  needs the first one's seal. `prepared.test.ts` covers that seal.
- **Not yet run on a server.** On the Mac it was run only against the fixture launchers (`ha1/first-offer.test.ts`) and
  through `runHeld`.

## Seen but not repaired here

- **The realistic measure path** (`real1/server.ts` measure) compares its census after `checkRealisticPeer` with the
  sealed census. That holds only if the measuring build installs nothing new, so it is the same class of check. A build
  newer than the extension's would stop there.
- **Two trace messages on bench 3:**
  - the Publish write gateway logged "Trace file exists; use a fresh run"
  - the read gateway printed "Triplex trace output failed; evidence incomplete" 80 times

  Neither stopped a run.

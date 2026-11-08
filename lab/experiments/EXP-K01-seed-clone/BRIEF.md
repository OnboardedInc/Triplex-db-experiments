# EXP-K01 brief: seed once, clone faithfully (tooling, then validation E1)

## North star
Measurement speed for all five priorities: every XTDB A0, NS and PAIR-0 run spends 38 minutes or more seeding at 10k through the commit
path (EXP-N01 A0 receipt: 384,785 assertions in 2,281.6 s), and a PAIR-0 duet spends 76-106 minutes. R26 estimates 2-4 minutes per run
with a faithful clone. Read lab/NORTH-STAR.md first.

## Commander's intent
Build the smallest tooling that seeds a slot once, freezes it in the settled state, and starts faithful copies of it, then prove the
copies are faithful before any receipt depends on them (Q74c). Faithful means a measurement on a clone is indistinguishable from the same
measurement on a fresh-seeded slot within the PAIR-0 hold margins. A clone that is fast but subtly different is worse than no clone.

## Read
- lab/research/R26-seed-clone.md, all of it; section 6 has the procedure and commands, 6.9 the validation E1 and its predictions.
- lab/acceptance/RULINGS-PENDING.md Q74a-g; lab/bin/engine.mjs; lab/config/; lab/bench/driver.ts and lab/bench/lib/bulk.ts
  (`--seed-manifest`, `seedFromManifest`); lab/experiments/EXP-N01-northstar-bench/REPORT.md (last section).

## Work
1. engine.mjs: `golden` (settle a seeded slot: finish-block, wait for compactor jobs 0 and an empty live index; record the freeze
   fingerprint; `docker stop -t 60` and require `Node stopped.` in the log; copy into `tx2-golden-xtdb-<key>` with the source mounted
   read-only through a helper container on the pinned image with `-u 0:0` and a memory cap) and `clone` (take the slot, stop, wipe its
   volume, `cp -a` the golden in, `chown 20000:20000`, start with the same config hash). Golden key per Q74a. Never start an engine on a
   golden. Refuse when host free disk after the copy would fall below 5 GiB (Q74f).
2. Readiness: gate on `/healthz/started` through `docker exec` (Q74d), then the C1-C8 checks from R26 as a script that prints a JSON
   verdict. Check the pinned image actually has the BusyBox tools R26 assumes (`find -exec`, `wget --post-data=`, `stat -c`, `sync`).
3. Driver: an XTDB seed-only writer for the manifest (`xtdb-seed.ts`, R26 section 6) and the `driver.ts:250` fix (it dereferences
   `manifest.nq`); receipts record `seededBy` and the golden key.
4. First live check at a small rung that fits the disk: 500 subjects (the rung N01 proposes for the A0 P1 ladder), on s1 when engine.mjs
   reservations give it to you. Seed fresh, settle, golden, clone, run C1-C8 on the clone, compare the freeze fingerprints. Report times.
5. Write the E1 plan for the measurement window (Q69a): fresh-seeded arm against cloned arm under PAIR-0 (EXP-M01's harness on branch
   exp/M01-paired-measurement), with R26's seven predictions and the hold margins. Do not run E1; it needs two slots.

## Limits
- Work in your own worktree: `git -C /Users/sam/projects/triplex-db-2 worktree add /Users/sam/projects/triplex-db-2/.claude/worktrees/k01
  -b exp/K01-seed-clone main`. pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`.
- Docker only with `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`, and container lifecycle only through engine.mjs (your new
  subcommands included). Never touch Sam's default colima VM, /Users/sam/projects/triplex-db, or ports 15442 and 17019. Do not stop
  xtdb-dev or qlever-dev; other agents use them.
- Heavy host jobs through `node lab/bin/heavy.mjs --label K01 -- <command>`. Remove every clone and golden volume you make before you
  report unless the report names it as kept, with its size.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not spawn subagents. Never send the user's email or
  personal details anywhere.

## Return
Branch head; per work item what was built (file:line) and its evidence; the 500-subject seed, golden and clone times; the C1-C8 verdict;
the BusyBox check; volumes kept with sizes; the E1 plan; anything R26 got wrong.

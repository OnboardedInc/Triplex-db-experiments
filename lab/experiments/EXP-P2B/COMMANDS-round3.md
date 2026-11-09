# EXP-P2B round 3 commands

North star: offline P2 latency with P1 pinned reads and P3 ordered atomic-consumer
behavior. These commands do not allocate an engine slot or measure live XTDB.
Run from the P2B worktree with its installed dependencies, Node 22.23.2 and at
least 5 GiB host disk free. Default full-sync startup requires this Mac's
`/usr/bin/python3` standard `fcntl` bridge; it fails typed rather than falling
back when the native primitive is unavailable.

Build, typecheck and run the scoped broker/backend/route corpus:

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R3-gates -- node lab/experiments/EXP-P2B/gates.mjs
```

Fresh final-candidate diagnostic, with 3,000 offered commands, 1,000 per facts
band and the asynchronous maintenance stream:

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R3-fresh -- node lab/experiments/EXP-P2B/round3/case.mjs --phase fresh-final --readers 256 --workers 8 --maintenance on
```

The full ordered comparison uses the retained source/build levels in
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3/snapshots/`.
Those snapshots reuse this worktree's qualified dependency links. They preserve
historical code; rebuilding current HEAD with a `before` label does not recreate
the controls. The corrected continuation is `pipeline.mjs --after-pool`; it verifies the
retained earlier levels and restarts maintenance/full-sync measurements. Preserve
prior pointer/controller files before another pipeline
run: attempt directories are unique, but convenience matrix pointers are not.

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R3-ordered -- node lab/experiments/EXP-P2B/round3/pipeline.mjs
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R3-analysis -- /usr/bin/python3 -I lab/experiments/EXP-P2B/round3/analyze.py
/usr/bin/python3 -I lab/experiments/EXP-P2B/round3/render.py
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R3-manifest -- /usr/bin/python3 -I lab/experiments/EXP-P2B/round3/manifest.py
```

The actual corrected continuation used in this report was:

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R3-corrected-maintenance -- node lab/experiments/EXP-P2B/round3/pipeline.mjs --after-pool
```

`run.mjs` runs three repeats at 0, 64 and 256 readers. `P2B_WORKERS` selects the
pool and `P2B_MAINTENANCE=on` enables pin/purge/release traffic. `P2B_COUNTS` is an
explicit subset for a control. With a new phase name lacking a frozen snapshot,
it runs the current checkout. Every child remains open-loop at 40 offers/s.

To check a completed attempt's lossless archive:

```sh
/usr/bin/python3 -I lab/experiments/EXP-P2B/round3/archive.py --verify /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3/ATTEMPT_DIRECTORY
```

`ARCHIVE.json` lists each original filename, original SHA256, gzip filename and
compressed SHA256. Decompress into a fresh review directory, restoring every
archived component (including any `broker.db-wal`) together with the remaining
small files before opening a copied SQLite store. Native probe file identities
in historical reports identify the original files; restoration creates new
inodes and is not a new durability receipt.

No round-three live command is claimed ready for promotion. The older
`measure.mjs --mode xtdb` path explicitly uses synchronous replay polling and
colocated reader code; it does not exercise the pool built here.

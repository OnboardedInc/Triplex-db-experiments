# EXP-P2B round 4 commands

North star: P1/P2/P3 correctness only; no engine or latency run.
Run from the P2B worktree with the installed dependencies, public core build,
Node 22.23.2 and at least 5 GiB free. The copied root-level review fixture uses
an owned `node_modules/@triplex-build/triplex` link to `../../packages/core` so it
resolves the same public exports as package tests. This link was created locally;
no install or shared dependency directory was changed.

Final source-bound gate (build/typecheck, 153 upstream tests and nine regressions):

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R4-bound-gates -- node lab/experiments/EXP-P2B/round4/gates.mjs
```

Run just the copied/adapted reviewer schedules:

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R4-review -- node node_modules/vitest/vitest.mjs run --config lab/verify/P2B/vitest.config.mjs
```

The actual ten-minute execution used frozen source/build and harness copies:

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R4-ten-minute-pin -- node /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round4/snapshot/harness/long-pin.mjs /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round4/snapshot
```

A fresh attempt against those immutable candidate bytes gets a new UUID. To test
new candidate bytes, copy its broker `src`, generated `dist` and package manifest
into a **new** snapshot directory, with an explicit dependency-directory link;
copy `round4/long-pin.mjs` and `read-worker.mjs` together. Do not overwrite the
retained snapshot or relabel its old result as a new execution.

The final aggregator is deliberately bound to this report's named completed
attempt/logs and final gate. It verifies raw row hashes and denominators before
writing the compact summary and manifests:

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-P2B-R4-finalize -- node lab/experiments/EXP-P2B/round4/finalize-and-check.mjs
```

Preserve existing gate/log pointers before using their names again. Check the
committed checksum manifests with `shasum -a 256 -c MANIFEST`; large retained
SQLite files are outside git. Historical startup `F_FULLFSYNC` file identities
refer to the original inodes, not newly copied databases. All observations remain
offline builder evidence rather than independent acceptance.

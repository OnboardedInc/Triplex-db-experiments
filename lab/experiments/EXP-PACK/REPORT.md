# EXP-PACK: lab-owned package correctness gate

North star: correctness floor for every lane's packaged Triplex TypeScript API, under lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. This is packaging validation, not engine or acceptance qualification.

## Implementation

`scripts/check-packages.mjs` packs without building. No CLI prepack hook exists. A fresh checkout's CLI pack succeeds with only LICENSE, README.md and package.json; dist/index.js, dist/index.d.ts and dist/cli.js are absent. Dependency-order builds were already specified in turbo.json, but the pack command never invokes them. This is a missing pack precondition, not a CLI compiler defect.

`lab/bin/check-packages.mjs` is a scoped companion adapted from the upstream checker, which remains unchanged and runnable. It deletes only selected generated dist directories and runs actual per-package builds, topologically ordered by pnpm with workspace concurrency 1. It checks the same 12 lab-owned packages (upstream inventory minus DuckDB), tarball allowlists, manifests, every export/bin target, declarations and all entry points in a clean installed consumer, the SQLite/Datalog/derivation runtime smoke and the installed CLI help/version/describe. No engine is contacted. DuckDB prints OUT-OF-SCOPE with scope citation and the reported unresolved TS4023 failures.

Run after a frozen install with the owned store:

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
TRIPLEX_PACK_ARTIFACT_ROOT=/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-PACK/attempts node lab/bin/heavy.mjs --label CX-PACK -- node lab/bin/check-packages.mjs
```

pnpm 10.11 rejects bare --store-dir for pack and exec (both observed); the gate therefore passes --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store to build and pack. Consumer npm caches stay in each attempt, with install scripts disabled as upstream requires for FoundationDB portability.

## PASS audit

- Tarball count, required files, file allowlist, unique manifest names, release/private policies, Effect peer policies and every export/bin path are checked against freshly generated tar bytes, not workspace paths. All selected dist directories are removed before actual builds and tarballs use a new mkdtemp directory.
- Consumer declaration/API checks import all packed export entries, use strict TypeScript, and consume only installed tarballs with matching Effect peers. Runtime checks assert expected SQLite/Datalog rows, read-basis metadata, overlay and materialization contents. CLI checks compare its packed version and parsed describe response. Each command runs in this attempt's new consumer directory.
- The only overall PASS assignment follows all these checks and compares input byte hashes before/after execution. The diagnostic receipt binds source HEAD, input hashes, attempt directory, process/parent PID, package versions and tarball hashes; commands.json binds executed commands and output hashes. No engine slot, oracle result or acceptance PASS is claimed. Heavy-slot admission is provided by the outer heavy.mjs command.

## Validation

Initial implementation committed before the fresh gate run. Results, evidence manifest and moved-pin audit will be appended after execution. Separate reviewer verification remains outstanding.

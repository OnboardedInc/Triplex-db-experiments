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

Attempt 1 (`triplex-pack-O2mgic`) started while the initial implementation was being committed, at source HEAD 0aa97f0f. All 12 builds, packs and tarball checks passed; the clean install passed. The stronger skipLibCheck:false check failed because the consumer fixture lacked @types/node and ESNext.Disposable. Runtime/CLI checks were not reached. Failure and logs are retained unchanged. The fixture now explicitly installs @types/node 25.9.1 (workspace catalog version) and uses Node and disposable library types. Attempt 2 below ran after committing this correction with clean source status. Separate reviewer verification remains outstanding.

## Final builder results

Attempt 2: **PASS (packaging diagnostic only)**, `triplex-pack-UMylBa`. Source HEAD `903bd805e00c9369f482c13a825b091a97ae1ec5`; source working tree was clean before launch. The initial worktree had no node_modules or CLI dist; offline frozen install used the explicit shared store and downloaded zero packages. The successful attempt again removed all selected dist outputs and rebuilt without Turbo cache use, so previously built outputs could not satisfy it. Input content hashes matched at completion. Started 2026-11-09T08:07:59.195Z, finished 2026-11-09T08:08:32.137Z.

| Package (scope @triplex-build/) | Version | Fresh build | Tarball/export checks | Strict installed declarations |
| --- | --- | --- | --- | --- |
| triplex | 0.2.0 | PASS | PASS | PASS |
| triplex-cli | 0.1.1 | PASS | PASS | PASS |
| triplex-cloudflare | 0.1.0 | PASS | PASS | PASS |
| triplex-foundationdb | 0.1.0 | PASS | PASS | PASS |
| triplex-host | 0.1.0 | PASS | PASS | PASS |
| triplex-http | 0.1.1 | PASS | PASS | PASS |
| triplex-postgres | 0.1.1 | PASS | PASS | PASS |
| triplex-qlever | 0.1.0 | PASS | PASS | PASS |
| triplex-sql | 0.2.0 | PASS | PASS | PASS |
| triplex-sqlite | 0.1.1 | PASS | PASS | PASS |
| triplex-testkit | 0.2.0 | PASS | PASS | PASS |
| triplex-xtdb | 0.1.0 | PASS | PASS | PASS |

Additional checks:

- Inventory comparison: exactly the upstream 13-package list minus DuckDB; no other omissions.
- Consumer npm install with scripts disabled: PASS. FoundationDB native installation deliberately skipped, matching upstream portability policy.
- Consumer TypeScript 6.0.2, strict and skipLibCheck:false, all 22 declared public entry points (including CLI): PASS.
- Node resolution of all packed public entry points: PASS.
- SQLite/Datalog runtime: PASS; expected Alice row, optional basis semantics, valid-time basis/commit metadata, two overlay candidates with hypothetical provenance, current materialization and boundary at 5.
- Installed CLI --help, --version (0.1.1), SQLite describe (ok:true, command:describe): PASS.
- node --check, focused oxlint (0 warnings/errors), focused oxfmt --check: PASS.
- DuckDB: **OUT-OF-SCOPE**, lab/SCOPE.md 4.3; reported effect-storage.ts:112 and TypeDomains.ts:17 TS4023 remain unresolved. No DuckDB builds or edits performed.

The original scripts/check-packages.mjs is byte-for-byte unchanged: SHA256 `44ca4469409aaa3a6998bf1361278a53f93f41c89527c655f1b07acc4d36c1d0` before/after. It was not rerun as a full gate; its all-package build precondition and reported DuckDB failure are not declared fixed. Use the lab companion for the 12-package scope. No publishable package changed, so no Changeset is needed.

## Evidence and contract audit

Durable evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-PACK/`.

- `cli-before-build/triplex-build-triplex-cli-0.1.1.tgz`: original missing-dist reproduction (only 3 files).
- `inventory-audit.json`: upstream/lab package inventory and upstream checker hash.
- `attempts/triplex-pack-O2mgic/`: first failure receipt, commands, exact compiler diagnostics, tarballs and generated consumer.
- `attempts/triplex-pack-UMylBa/`: successful receipt, 44 command records/logs, fresh tarballs, generated consumer sources/tsconfig/package lock and CLI describe JSON output.
- Committed `SHA256SUMS` covers receipts, command logs, tarballs and consumer inputs/lock. All 129 listed SHA256 checks were reread and passed. Dependency installations and npm caches remain outside git and outside this evidence manifest; consumer lockfiles retain resolved versions/integrity.

No existing pinned file changed: the only additions are the new gate, this report and its evidence manifest. `lab/acceptance/`, packages/duckdb, original checker, lockfile and root package.json are unchanged. There are therefore no old/new pinned hashes to list and no contract re-pin was attempted.

Builder execution is not independent promotion verification. No backend-engine integration, native FoundationDB runtime, real XTDB/QLever connection, Datomic package, full root pnpm check, package publication, push or merge was performed. This gate implements exactly the current upstream inventory less DuckDB; future upstream inventory additions need a corresponding lab inventory update. Independent reviewer validation is the remaining handoff.

## Round 2: complete workspace accounting and evaluated imports

Review `verify/PACK` c71ec6d6 reproduced two false PASS cases: an added failing workspace build was omitted, and a freshly packed QLever import-time throw was never evaluated. This round replaces the fixed include array with pnpm's actual recursive workspace inventory. Every non-excluded workspace is selected for build/pack; candidates without build/export contracts fail with an unclassified-workspace error. `lab/config/pack-exclusions.json` is the single exclusion policy, with a non-empty reason per exact workspace name. Empty, unnamed, duplicate and stale entries fail closed. The current 25 workspaces comprise 12 checked packages and 13 explicit exclusions. Datomic's current unqualified package (LICENSE not configured) is now explicitly reported rather than silently omitted; its packaging needs lane D follow-up. Examples, application runners, test runners and internal oracle/qualification workspaces are separately named with reasons. DuckDB retains its OUT-OF-SCOPE diagnostic and scope citation.

Each public entry point from each packed exports map is now evaluated by `await import` in a separate Node process using this attempt's installed consumer. Import exceptions fail the gate. No checked runtime entry point is exempted, including FoundationDB's lazily loaded native backend facade. Wildcard/non-subpath export maps fail closed until explicitly supported, rather than claiming incomplete entry-point coverage. The existing declaration, runtime behavior and CLI checks remain.

### Round 2 PASS audit (before implementation commit)

- Workspace admission checks actual pnpm inventory against the exclusion file. Every selected package must have build/exports and every selected build runs under pnpm's failing recursive build command. Reasons and workspace identities are retained in this attempt's receipt; no exclusion counts as checked package success.
- Overall PASS still follows fresh dist deletion, real builds, fresh tarballs, content checks, clean install, strict declarations, expected SQLite behavior and CLI responses. Before/after input snapshots now also include untracked workspace source and all workspace manifests, plus the exclusion file. This binds newly added fixtures and detects additions/removals during execution. No pinned contract or engine slot qualification is claimed.
- Each import success follows actual module evaluation in its own fresh process. Receipt imports name exactly the attempted exports, command logs bind specifiers/cwd/exit/output hashes, and tarball/source hashes bind the evaluated installed bytes to this attempt.
- `regressions.mjs`, adapted from the reviewer's planted cases, checks exit plus receipt status, fresh attempt timestamps, HEAD/gate/fixture hashes, expected error markers and every command log hash. Baseline checks local installed bytes against tarballs, stale sentinels absent, every exported specifier imported in its own process, and all workspaces accounted for. Added-package and QLever tests now require FAIL and retain direct controls; missing-export, broken-declaration, SQLite and stale-source tests remain failure controls. All source mutations restore in finally. SHA256 manifests reread retained bytes; no builder result is independent acceptance.

Round 2 execution results will be appended after the committed-source regression run. No existing pinned path is intentionally changed; acceptance and original checker remain untouched.

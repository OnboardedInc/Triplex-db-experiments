# CX-VPACK: EXP-PACK adversarial review

North star: packaging correctness for the public TypeScript boundary used by all lanes; a correctness floor under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. No engine or performance qualification is claimed.

**Verdict: FIX-FIRST.** Reviewed `exp/PACK-lab-gate` at `7970e2a634f3ed7e5de731eb6285300b42a3066f`, independently in branch `verify/PACK`. The baseline validates the stated twelve-package slice, but package omission and import-time runtime failure can still produce a fresh overall PASS. These are the two findings within the assigned checks. No production fixes were made.

## Findings

### 1. High: newly added workspace packages are silently excluded

Location: `lab/bin/check-packages.mjs:15` and `:97` (inventory), `:152` (build filters).

The gate uses a hand-maintained twelve-name array. Directory discovery first filters against that array; its length check only checks that the existing twelve are present. A new workspace package is neither selected nor explicitly excluded, and cannot make that check fail.

Reproduction: add `packages/cx-vpack-added/package.json`, named `@triplex-build/triplex-cx-vpack-added`, with ordinary dist exports, an Effect peer, and a build script that throws `CX_VPACK_ADDED_BUILD_MUST_FAIL`. `pnpm --recursive list --depth -1 --json` recognizes it; its explicitly filtered build fails. The unchanged gate nevertheless exits zero, issues PASS, and records exactly the old twelve tarballs, with no line explaining the added package's omission.

Evidence: `added-package-r2/workspace-list.json`, `fixture-package.json`, `added-build-control.log`, `gate.log`, and the attempt receipt/commands under that directory. The added package was removed after the check.

Proposed fix: discover packages from pnpm's workspace inventory and classify every candidate as included or explicitly excluded with a scope reason. Fail on any unknown/unclassified package; print exclusions. The initial twelve may remain an explicit policy, but additions must require an explicit decision rather than silently disappear. Keep DuckDB's exclusion visible.

### 2. High: URL resolution lets a packaged runtime throw receive PASS

Location: `lab/bin/check-packages.mjs:323` and `:532` (generated export resolution), `:450` (runtime smoke imports).

The generated `exports.mjs` invokes `import.meta.resolve`, which does not evaluate a module. The runtime smoke exercises core/SQLite/derivation and the CLI, leaving other portable entry points unevaluated.

Reproduction: append `throw new Error("CX_VPACK_QLEVER_RUNTIME_THROW")` to `packages/qlever/src/index.ts`. The gate deletes dist, runs the real build, packs the throwing statement, installs those exact bytes into its new consumer, and still returns PASS. A separate `await import("@triplex-build/triplex-qlever")` in that very consumer immediately fails with that exact marker, without connecting to an engine. As a positive control, the same kind of mutation in SQLite is rejected by the gate's existing runtime smoke.

Evidence: `qlever-runtime-throw-r2/fixture.diff`, `fixture-bytes`, `gate.log`, `direct-import-control.log`, and its freshly hashed tarball/receipt/consumer; `sqlite-runtime-control-r2/` contains the caught control.

Proposed fix: evaluate installed portable public runtime entry points, in addition to checking their resolution. Run isolated imports where appropriate, and explicitly identify justified native-addon/platform exclusions. At minimum include the portable XTDB and QLever facades; import alone needs no live engine. Do not describe URL resolution as runtime import verification.

## Independent checks

All actual builds and gates ran under `node lab/bin/heavy.mjs`; no heavy run started below 5 GiB host free. Node was v22.23.2 and pnpm 10.11.0. Installation used the explicit shared pnpm store and `--offline --frozen-lockfile`. Gate npm installs used the committed reviewer shim: it copies only `_cacache` from the retained builder cache into each fresh attempt cache, then delegates to the real npm with `npm_config_offline=true`. The shim does not change builds, tarballs, consumer manifests or checks. No consumer node_modules was reused.

| Check                          | Gate outcome                      | Independent observation                                                                                                                                                                                  |
| ------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline                       | PASS / exit 0                     | Twelve actual fresh builds, twelve tarballs, strict consumer declarations, runtime smoke and CLI help/version/describe completed; 44 recorded commands.                                                  |
| Added workspace package        | PASS / exit 0                     | Counterexample: pnpm recognizes the added broken package; gate omits it.                                                                                                                                 |
| Missing host export target     | FAIL / exit 1                     | Tarball export checks reject `./dist/cx-vpack-missing.d.ts`.                                                                                                                                             |
| Broken Cloudflare declaration  | FAIL / exit 1                     | Real build completes, then the fixture appends an undefined type to emitted index.d.ts. Clean consumer tsc rejects `CX_VPACK_MissingType`; this tests the consumer checker, not just source compilation. |
| QLever import-time throw       | PASS / exit 0                     | Counterexample: throwing bytes are in the fresh tarball and installed file; direct consumer import fails.                                                                                                |
| SQLite import-time throw       | FAIL / exit 1                     | Positive control: the runtime smoke observes `CX_VPACK_SQLITE_RUNTIME_THROW`.                                                                                                                            |
| Bad source with valid old dist | FAIL / exit 1                     | Host's prior dist exists before adding an undefined source type. The fresh build fails on `CX_VPACK_UNDEFINED_SOURCE_TYPE`, before any pack command.                                                     |
| DuckDB visibility              | Visible in all seven gate outputs | Exact OUT-OF-SCOPE line names lab/SCOPE.md 4.3, TS4023, both locations, and says unresolved/not tested. This is a retained diagnostic, not a fresh DuckDB build result.                                  |

For baseline freshness, planted `CX_VPACK_STALE.txt` in all twelve selected dist directories; every sentinel was removed and absent from every tarball. The gate invokes actual per-package build scripts, without Turbo cache use. For all three completed PASS attempts, every installed package resolves inside that attempt's own consumer/node_modules, and installed index.js bytes match the corresponding freshly hashed tarball. The QLever source mutation also proves current source reaches packed runtime output.

The original CLI precondition explanation is consistent with source inspection: `scripts/check-packages.mjs:55` goes straight to pack, and the CLI has a build script but no prepack hook. The independent baseline confirms that the lab companion supplies the missing build step. I did not rerun the upstream all-package checker or recreate the builder's historical initial CLI tarball.

## Retention, restoration and unchanged contract

Durable evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VPACK/`. `results.json` in this review directory indexes the seven observations and exact attempt paths. `SHA256SUMS` lists retained raw evidence relative to that durable root; verify from that root using `shasum -a 256 -c <absolute-path-to-this-review>/SHA256SUMS`.

Receipts, command logs, tarballs, consumer sources/lockfiles, fixture bytes/diffs and controls stay outside git. The manifest contains 391 entries, reread successfully by the admitted controller. Dependency installations and npm caches are retained there but excluded from the evidence checksum manifest. Reviewer aggregate console logs are also retained. No evidence directory or large raw output is committed.

The exact executed reviewer tool snapshots are retained and hashed under `reviewer-source/`. After execution, committed tools received formatting and an optional `CX_VPACK_EVIDENCE` override so a new run can use a new durable directory without overwriting this evidence. Final syntax, focused oxlint, focused oxfmt and staged whitespace checks passed. A full reproduction, after the offline frozen workspace install, is:

```sh
CX_VPACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VPACK-new-attempt \
  node lab/bin/heavy.mjs --label CX-VPACK-reproduce -- node lab/verify/PACK/review.mjs
```

Use a previously nonexistent directory. This reproduction seeds only the retained builder registry cache, reruns all actual builds and checks, and leaves the temporary source fixtures restored.

The first harness run completed baseline, then failed before the added-package gate because pnpm list rejects bare `--store-dir`. `review.log` and `added-package/` retain this first failure. The harness was corrected to use `--config.store-dir`; subsequent cases use new `-r2` directories and `review-r2.log`. No product failure was relabeled or overwritten.

All temporary package/source mutations were restored in `finally` blocks. Final git diff is empty for packages, the lab gate, original checker, lockfile and acceptance files. Compared with pre-experiment `0aa97f0f`, the original checker remains SHA256 `44ca4469409aaa3a6998bf1361278a53f93f41c89527c655f1b07acc4d36c1d0`; `lab/acceptance/` has no diff. The gate under review remains SHA256 `5f4ae9849d70d4035a63fd108f1f8c8b3d545b382564d710e675a1003db191c1`.

Only new files under `lab/verify/PACK/` are committed. No existing pinned path changes, so there are no old/new pinned hashes to list. No acceptance edits or re-pins were made.

## PASS and verdict audit

The review does not promote the gate. These are every place the reviewer turns observations into checked results:

1. `review.mjs` reads each gate receipt and asserts its status and process exit agree with the specified observation. It checks content (expected error markers or complete PASS artifacts), freshness (new exclusive case directory, exactly one new attempt, start/finish after case start), and binding (exact reviewed HEAD, worktree root, gate SHA256, and each changed tracked fixture's input SHA256). No engine slot is claimed; the entire controller runs inside one admitted heavy slot.
2. Successful-attempt checks compare each tarball hash with fresh bytes, installed package location with the current consumer, and installed JS hash with extracted tar bytes. Baseline additionally checks all twelve sentinels are gone. These establish artifact content and fresh consumer/build binding, not arbitrary application correctness.
3. Counterexample controls check pnpm recognizes the added fixture and its build actually fails, and check the newly installed QLever import fails with the planted runtime marker. Those controls use this case's exact fixture and this attempt's consumer; a recorded gate PASS is explicitly a counterexample, not reviewer acceptance.
4. Failure controls require the planted marker in current output; the declaration check must reach consumer npx/tsc, while the stale-dist source check must fail in the first actual build. Each command log is rehashed against its command record.
5. Final restoration/unchanged-checker/contract assertions compare actual git diff and source bytes. The retained manifest hashes are reread before writing; it authenticates evidence bytes, not semantic success. The `FIX-FIRST` verdict follows the two reproduced counterexamples above, not a bare command exit.

## Limits and open questions

No gate fix, engine lifecycle change, engine connection, native FoundationDB execution, DuckDB build, performance/acceptance qualification, full root pnpm check, package publication, push or merge was performed. The remaining policy decision is which workspace packages receive an explicit exclusion and which platform/native entry points may skip runtime evaluation. Both findings require a builder change and a fresh independent rerun before ACCEPT.

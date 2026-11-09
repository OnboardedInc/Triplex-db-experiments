# CX-CHECKJS: checked JavaScript lab tools

North star: correctness floor for P1-P5 evidence-producing tools. Scope and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

## Implementation

Added `lab/tsconfig.checkjs.json`: recursive `.js`, `.mjs`, and `.cjs` coverage of all lab/bin, lab/bench, and qualification files, allowJs/checkJs/noEmit, strict checking, NodeNext resolution. No project-wide diagnostic suppression or strictness relaxation. The new `lab/bin/checkjs.mjs` runs the complete project diagnostics, then a second semantic pass that removes TypeScript suppression directives from parsed JavaScript comments and rejects unresolved bindings (TS2304, TS2552, TS18004, missing exports/namespaces, and related binding codes). Strings, templates, and coordinates are preserved. Consequently even a legacy per-file ts-nocheck cannot hide an unbound name in a dormant branch.

`pnpm --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store lab:check` obtains a heavy token. Root typecheck invokes the checker directly under the caller's heavy grant (avoiding nested-token deadlock); G0 invokes the same checker as its own resource-granted step and records a failure reason on nonzero exit. Package-only checks previously missed these scripts. No engine lifecycle changes.

## Diagnostic triage

The initial TypeScript 6.0.2 run reported **3,009 diagnostics across 105 files**. Every diagnostic, original file/line/column, code, message, category, and reason is retained in `triage.jsonl`; raw compiler output is `initial.txt`. Baseline is `2a2fe2fc9317de346b5249924f7c1a0b9a95f81a`.

**Real bugs found: none. Real-bug fixes: none.** The motivating sha256File import is already present in engine.mjs at this baseline. No new TS2304/TS2552 was reported. Regression fixtures reproduce those failures inside uncalled functions, including suppressed files/lines.

All initial diagnostics were classified as type noise. Most are unannotated parameters/collections and runtime-shaped option/report records. TS2554's nine claim.mjs calls pass a notification string to an intentionally empty default callback; JavaScript accepts/ignores the argument. TS2551's txCpus/gwCpus fields exist on Datomic's effective-config branch. TS2349 comes from an inferred heterogeneous string/callback test tuple. Buffer-to-JSON parsing uses supported runtime coercion. The bigint subtraction diagnostic in uptime_cases is inference noise for runtime bigint endpoints. TS1345 checks whether an injected admission callback returns a promise; the empty default is inferred as void. Thirty-nine TS2307 diagnostics refer to absent generated .runtime/.artifacts modules, packed-consumer packages, or unbuilt dist files; this static task does not establish their runtime availability.

One small file uses narrow string-parameter JSDoc (lab/bench/wait-slot.mjs). The other 104 diagnostic-bearing files use explicit per-file ts-nocheck reasons; generic legacy inference would otherwise require extensive annotation changes. The imported lab/scenarios/lib/policy.mjs is one such dependency outside the three root trees. These allowances suppress ordinary type noise, **not binding diagnostics in the lab checker**. This is a binding correctness floor, not complete static typing of legacy tools; property/arity errors in no-check files are not generally rejected by the second pass.

## Validation and first failure

- Initial diagnostics: expected compiler exit 2; retained.
- New checker: 110 JavaScript roots checked, zero diagnostics and zero suppressed binding errors.
- Plain `tsc -p lab/tsconfig.checkjs.json --pretty false`: exit 0.
- New regression tests: 4/4, zero failures/skips. Tests assert TS2304/TS2552/TS18004/TS2305 rejection, ordinary wrong-arity rejection, valid runtime strings/templates, and recursive project coverage.
- Executable-source comparison: TypeScript parser/printer with comments removed produces identical output for **104 existing JavaScript files**. gate.mjs intentionally adds the checker invocation. No existing application/oracle executable statements changed. `changed-files.json` retains the first attempt; `changed-files-committed.json` binds the final source bytes, old/new hashes and toolchain version. The latter includes the root-script adjustment that avoids nested heavy-token admission.
- First broader lab suite: **131 tests, 99 pass, 32 fail** (`lab-tests.txt`). The evaluator integrity checks see modified working-tree evaluator files differing from HEAD and reject with EVALUATOR-TAMPERED, causing downstream assertions to fail. `verification.txt` retains the failing exit and assertion. Commit source, then rerun; do not adopt the first attempt as a pass.
- Committed-evaluator rerun after implementation commit `a0c86a55`: **131/131 lab tests passed, zero failures/skips**, plus **4/4 new regression tests**, zero diagnostics in both checker and plain tsc. `verification-committed.txt` records actual exits and confirms source hashes unchanged after validation. All logs have the `-committed` suffix. The root package script adjustment was included in the source hashes during this attempt; evaluator bytes matched committed HEAD. No earlier failure was replaced or adopted as a pass.

All heavy runs use lab/bin/heavy.mjs. Host free disk was about 37 GiB before final verification. Existing installed dependencies were read through an uncommitted worktree node_modules symlink to this project's main node_modules; no install, dependency/lock changes, global cache writes, or engine reservations were made. The temporary symlink was removed after validation.

## PASS / receipt audit

1. checkProject / checker CLI: success requires a nonempty parsed root set, no normal project diagnostics, and no binding diagnostics from the unsuppressed pass. Diagnostics come from the current filesystem and actual TypeScript semantic analysis, not module import or an emitted passed flag. This local check claims no engine slot or runtime engine qualification.
2. New node:test fixtures: success is based on exact asserted diagnostic codes and coordinates, string-byte equality, and root membership/options. Fixtures are new mkdtemp attempts; cleanup runs in finally. They claim no engine result.
3. verify.mjs: compares actual executable source against the dispatched Git baseline, records changed-source SHA256 and toolchain identity, runs actual check/test processes, requires successful exits and nonempty zero-failure TAP summaries for tests, and checks source hashes again after validation. Attempt-specific filenames preserve earlier failures. This is local source/check evidence only, not a slot-bound production PASS.
4. G0 integration: only adds a failure path when the new checker exits nonzero. Existing G0 receipt/content/freshness/slot bindings are unchanged. No new engine PASS or promotion is issued by this work.

## Pinned files (contract unchanged)

Three modified files are pinned under acceptance/obligations.json (oracleFilesPinned, with CFG8 also in caseSourcesPinned). Their baseline bytes match the recorded pins. The contract builder must re-pin these comment-only changes in the next version; this branch deliberately does not edit lab/acceptance. Old and new SHA256 values follow.

| Pinned path | Old SHA256 | New SHA256 |
| --- | --- | --- |
| `qualification/capacity/configured-entities-v1/oracle.mjs` | `5e4f92bf74fde4504c309d2888cc234013ceb2fbfc8bca7c06fff51cea054cd3` | `92c0378b8120aaa25fb7a16d8659aa1790141eba62aed8f7e7356213efe92e94` |
| `qualification/capacity/historical-assertion-metadata-v1/oracle.mjs` | `bc93f24c88365add1d215747cd95705a3c2a2b4fd1c6cdd7e347a014fb23b290` | `bbd656760719b67a3435419121b0b7df909a99ea9c1aba22d85ea1363cb6b08f` |
| `qualification/capacity/historical-assertion-metadata-v2/oracle.mjs` | `f661e8138d5194bbcbbe56eec9ec35f8766bc9938540192e7b0d92d04685721b` | `5ce6612714b2b7742c46e0599617d472b4bf18a352806e5d44a44577878c9649` |

## Limitations / handoff

No full pnpm check/build/pack suite, live G0 engine gate, P1-P5 benchmark, engine operation, or acceptance-contract rebuild was run. The independent reviewer still needs to evaluate this implementation. Per-file type allowances are documented debt; the unsuppressed binding check is mandatory for the advertised guarantee. Missing generated/packed modules were not produced or run. No merge or push.

## Every changed file

The following is the complete source/config inventory (pinned paths marked). All remaining added files live in this experiment directory and are listed below.

- `lab/bench/wait-slot.mjs`
- `lab/bin/agent.mjs`
- `lab/bin/claim.mjs`
- `lab/bin/datomic-context.mjs`
- `lab/bin/engine.mjs`
- `lab/bin/gate.mjs`
- `lab/bin/heavy-lock.mjs`
- `lab/bin/heavy.mjs`
- `lab/bin/lib.mjs`
- `lab/bin/receipt.mjs`
- `lab/bin/scorecard.mjs`
- `lab/bin/status.mjs`
- `lab/bin/test/claim-fixtures.mjs`
- `lab/bin/test/claim-round2.test.mjs`
- `lab/bin/test/claim.test.mjs`
- `lab/bin/test/lab.test.mjs`
- `lab/scenarios/lib/policy.mjs`
- `package.json`
- `qualification/adapter/scale-fixture.mjs`
- `qualification/capacity/configured-entities-v1/oracle.mjs` **PINNED**
- `qualification/capacity/historical-assertion-metadata-v1/oracle.mjs` **PINNED**
- `qualification/capacity/historical-assertion-metadata-v1/oracle.test.mjs`
- `qualification/capacity/historical-assertion-metadata-v2/oracle.mjs` **PINNED**
- `qualification/capacity/historical-assertion-metadata-v2/oracle.test.mjs`
- `qualification/capacity/historical-assertion-metadata-v2/prepare.mjs`
- `qualification/capacity/historical-assertion-metadata-v2/run.mjs`
- `qualification/compare.mjs`
- `qualification/compare.test.mjs`
- `qualification/devloop/compare.mjs`
- `qualification/devloop/evidence.mjs`
- `qualification/devloop/executor.mjs`
- `qualification/devloop/fixtures/controller-child.mjs`
- `qualification/devloop/fixtures/native-package-consumer.mjs`
- `qualification/devloop/io.mjs`
- `qualification/devloop/migration.mjs`
- `qualification/devloop/preimages.mjs`
- `qualification/devloop/recipes/prepare-public-regression.mjs`
- `qualification/devloop/recipes/public-regressions.mjs`
- `qualification/devloop/scheduler.mjs`
- `qualification/devloop/state.mjs`
- `qualification/devloop/test/controller.test.mjs`
- `qualification/devloop/test/integrity.test.mjs`
- `qualification/devloop/test/migration.test.mjs`
- `qualification/devloop/test/preimages.test.mjs`
- `qualification/devloop/test/prepared-stopped.test.mjs`
- `qualification/devloop/test/process-identity.test.mjs`
- `qualification/devloop/worker.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/build-v2.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/build.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/lowercase-support.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/lowercase-support.test.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/owned-client-seam-v1/client-outcomes.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/owned-client-seam-v1/client-outcomes.test.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/owned-client-seam-v1/sdk-observation.test.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/owned-client-seam-v2/client-outcomes.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/owned-client-seam-v2/client-outcomes.test.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/prepare-build-v2.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/prepare-build-v3.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/prepare-build.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/prepare-components-v2.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/prepare-runtime.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/runtime-components-v2.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/runtime-components.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/runtime-noemit.mjs`
- `qualification/extensions/qlever-wrapper-repair-v1/runtime-runner.mjs`
- `qualification/extensions/string-order-v1/component-runner.mjs`
- `qualification/extensions/string-order-v1/prepare.mjs`
- `qualification/extensions/string-order-v1/probe-support.mjs`
- `qualification/extensions/string-order-v1/probe-support.test.mjs`
- `qualification/extensions/string-order-v1/runner.mjs`
- `qualification/extensions/string-order-v1/type-runner.mjs`
- `qualification/maintenance-jobs/reconcile-controller-publication.mjs`
- `qualification/reviews/canonical-queue-review.mjs`
- `qualification/reviews/compare-hardening-review.mjs`
- `qualification/reviews/failure-artifact-review.mjs`
- `qualification/reviews/load-observations-independent.mjs`
- `qualification/reviews/native-packet-final-independent.mjs`
- `qualification/reviews/preimage-review.mjs`
- `qualification/reviews/qlever-controller-review.mjs`
- `qualification/reviews/qlever-public-string-v5-independent-check-v2.mjs`
- `qualification/reviews/qlever-public-string-v5-independent-check.mjs`
- `qualification/reviews/qlever-public-string-v6-independent-check.mjs`
- `qualification/reviews/qlever-public-string-v6-terminal-independent.mjs`
- `qualification/reviews/qlever-wrapper-lowercase-v1-actual-independent.mjs`
- `qualification/reviews/qlever-wrapper-mixed-v1-actual-independent.mjs`
- `qualification/reviews/qlever-wrapper-runtime-v1-source-independent.mjs`
- `qualification/reviews/qlever-wrapper-sdk-build-v3-actual-independent.mjs`
- `qualification/reviews/qlever-wrapper-text-lowering-v1-actual-independent.mjs`
- `qualification/reviews/required-owner-review.mjs`
- `qualification/reviews/sidecar-migration-review.mjs`
- `qualification/reviews/xtdb-point-query-shape-independent.mjs`
- `qualification/reviews/xtdb-signed-zero-independent.mjs`
- `qualification/reviews/xtdb-writer-visibility-independent.mjs`
- `qualification/workloads/access_cases.mjs`
- `qualification/workloads/containment_cases.mjs`
- `qualification/workloads/dependency_cases.mjs`
- `qualification/workloads/engine_cases.mjs`
- `qualification/workloads/funnel_cases.mjs`
- `qualification/workloads/interval_join_cases.mjs`
- `qualification/workloads/recall_cases.mjs`
- `qualification/workloads/run_three_engines.mjs`
- `qualification/workloads/support_cases.mjs`
- `qualification/workloads/test_engine_cases.mjs`
- `qualification/workloads/training_cases.mjs`
- `qualification/workloads/uptime_cases.mjs`
- `qualification/workloads/webhook_cases.mjs`
- `lab/bin/checkjs.mjs`
- `lab/bin/test/checkjs.test.mjs`
- `lab/tsconfig.checkjs.json`
- `lab/experiments/EXP-CHECKJS/verify.mjs`

Experiment evidence/report files: `REPORT.md`, `verify.mjs` (also listed above), `initial.txt`, `triage.jsonl`, `check-attempt1.txt`, `verification.txt`, `changed-files.json`, `checkjs-final.txt`, `tsc-final.txt`, `tests-final.txt`, `lab-tests.txt`. Final added evidence files: `changed-files-committed.json`, `checkjs-final-committed.txt`, `tsc-final-committed.txt`, `tests-final-committed.txt`, `lab-tests-committed.txt`, and `verification-committed.txt`. Raw first-failure logs deliberately retain the runner's original trailing whitespace; source/config diff whitespace checks are clean. No evidence file exceeds 1 MB and the experiment evidence is below 5 MB.


## Round 2 — F1 tracked-file coverage correction (2026-11-09)

North star: the P1-P5 correctness floor for all evidence-producing JavaScript, under lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. This round supersedes round 1's three-directory coverage rule. Review read: verify/CHECKJS `36656efa`, VERIFY.md and completed-attempt coverage.json in the verify-checkjs worktree.

### Coverage rule and implementation

The root inventory now comes from **`git ls-files -z -- '*.js' '*.mjs' '*.cjs'`**, rather than three source trees. The TypeScript project's explicit `files` list is generated from this inventory. On every default checker run, `trackedCoverage()` recomputes the Git inventory and `coverageDiagnostics()` compares it with the actual parsed project roots. A missing checked root, a root that is not an eligible tracked JavaScript file, or an invalid exclusion fails the checker (TS90001 for coverage mismatches). The G0 failure path and heavy admission remain unchanged.

Only `node_modules` and `dist` path components are automatically omitted. All other exclusions live in **one file, `lab/checkjs-exclusions.json`**, as exact tracked paths plus nonempty reasons. The loader refuses stale paths, blank reasons, duplicates and unmatched wildcard paths. There are 78 explicit exclusions: 70 archived imported DuckDB vendor JavaScript files and eight immutable historical source captures. Their reasons are per path in that file; the final verifier asserts none of those files changed. A bounded reference search found no current lab/script/package/qualification entry point using vendor JavaScript; current native build references use the vendor's native artifacts/source, and package adapters use their own JavaScript copies. Historical receipt consumers generate fresh attempt sources rather than reading the captured source. Authored experiment and evidence-directory runners without that archival basis remain checked.

**565 tracked JavaScript files = 371 checked roots + 78 explicit exclusions + 116 generated outputs.** Newly tracked JavaScript anywhere must be checked or explicitly excluded. To update the inspectable TypeScript manifest after staging a new file:

```sh
node lab/bin/checkjs.mjs --update-files
pnpm --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store lab:check
```

The updater only writes the eligible root list and explicitly requires a subsequent validation; it does not emit a PASS. Plain tsc uses that same list. Root manifest omissions also fail the coverage test, independently of semantic diagnostics. All original live qualification files remain covered, and the previously omitted GS launcher, CS-GS helper, wire falsifier, package checker and docs scripts are now roots.

### Diagnostics and behavior changes

The exploratory all-file run reported 6,670 diagnostics across 328 files. Resolving installed workspace public declarations and matching the existing repository's ESNext library declarations / no-emit `.ts` import support left 6,540 diagnostics across 320 files: 4,290 type-noise diagnostics in the final checked scope and 2,250 in explicitly excluded archival sources. The initial scope had 4,414 type-noise and 2,256 archival diagnostics. Both complete diagnostic inventories, including file/line/column/message and reason, are retained in the durable JSONL files. Coordinates describe the corresponding exploratory attempt, not an assertion that round 2 edits existed in the round 1 Git tree.

**No new runtime bug was identified or fixed.** There were no unbound-name diagnostics in the final checked scope. The two missing-export diagnostics in the exploratory resolved run belong to the excluded historical packed consumer, whose captured tarball API differs from the installed current testkit declarations; they are not adopted as a live SDK defect. Arity diagnostics are default no-op callback inference. Named Wire instance fields are initialized in static connect(), context/report fields are populated after construction, the falsifier's floorDiv receives bigint inputs, and the legacy correction counters intentionally add booleans to numbers. The owned-result assignment warning is guarded by the success/failure state. These and the remaining dynamic-record, tuple and collection inference diagnostics are recorded as noise, not runtime fixes.

A narrow rest-argument JSDoc annotates the new synthetic Git fixture. The 242 legacy diagnostic-bearing files receive reasoned per-file ts-nocheck comments; the existing unsuppressed binding pass still checks them. All 242 have **byte-identical executable printer output** against `3575785a`; only checker/test behavior and the newly authored overlay/verification tools change. No TypeScript package source, generated dist file, captured source evidence, package dependency or lockfile was edited. The standalone checker remains strict; no whole-project type checking was disabled. The compiler now permits the existing Node strip-types `.ts` import paths and uses the repository's existing ESNext API declarations (the initial ES2023 declarations lacked Node 22's String.isWellFormed).

The worktree reused installed dependencies through a temporary local node_modules link layout, including public workspace package exports from the existing project install. The final attempt binds every compiler dependency source file by hash; no install or shared/global cache write occurred. The temporary layout was removed after validation.

### Fresh gates and retained failure

- First expanded checker: 370 roots, zero normal diagnostics and zero suppressed binding diagnostics (before adding the self-checked round 2 verifier).
- Final checker and plain tsc: **371 roots, zero diagnostics**, both exit 0.
- Coverage / regression tests: **6/6 passed, no failures/skips**, including a newly staged `.cjs` file in an arbitrary new directory, generated-output omission, explicit exclusion acceptance, and rejection of blank/stale/duplicate/wildcard exclusions.
- The reviewer-derived CLI overlays now reject dormant `cxVcheckjsDormantUnboundName()` calls in `lab/scenarios/run.mjs` and `lab/scenarios/v2/cases.mjs`, plus the engine dormant-name control and original missing-sha256File-import control. Every child exits 1 with TS2304 and the expected filename/name; actual compiler reads are positive and on-disk bytes remain unchanged. These are compiler-input probes, never engine execution.
- Broader lab/scenario run: **134 tests, 133 pass, 1 fail**, zero skips. The sole failure is claim.test.mjs's contract self-check reporting the changed pinned `freeze-ham-reference.mjs` bytes. It cannot pass against the unchanged acceptance pin. Its exit 1, TAP output and outcome remain in the first final attempt; this round does not count it as PASS or re-pin the contract.
- After improving the report runner to recognize both typed pin records and path-to-hash pin maps, a new explicitly **static-only** attempt reran the checker, plain tsc and all six regressions. It rechecked all source/dependency bytes and its actual heavy owner before recording the local summary. It does not overwrite or reclassify the broader-suite failure.

Completed static attempt: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-CHECKJS/round2/2026-11-09T07-35-45-049Z/`. It bound 565 tracked JavaScript files, config/policy/toolchain bytes, **517 compiler dependency files**, and heavy slot 3 / wrapper PID 24197 / label CX-CHECKJS-r2-final. The earlier broader failure is attempt `2026-11-09T07-30-11-862Z/`. Source and compiler dependency bytes were unchanged throughout the completed static attempt. Host free space was 29.4 GiB at initial preflight and 23.2 GiB at final readback, both above the 5 GiB admission floor. No engine slot was reserved.

### Newly touched acceptance pin

`lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs` is newly changed and pinned by the O-REPLAY filename-to-hash maps and both retained SHA256SUMS pin manifests. Its only change is the type-noise comment, and its executable comparison is identical. The existing contract pin equals its actual round 1 Git bytes.

| Path | Old SHA256 | Round 2 SHA256 |
| --- | --- | --- |
| `lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs` | `c533122597c940d69c8a101a1a175ba5e9d6ab62f1efdb2d5526c9f65a86a206` | `752aaa5c706c514ec265ed6865458fd6bd78795486764e200c088c3f52f53f28` |

**lab/acceptance is unchanged.** The contract builder must re-pin this file, as well as the three already reported round 1 oracle changes; round 2 does not modify those three again. No other newly touched source has an acceptance hash pin. The contract-pin self-check remains blocked until that separate contract update.

### Round 2 verdict / receipt audit

1. `trackedCoverage` / `coverageDiagnostics` and default `checkProject`: compare actual parsed roots with the fresh Git index and exact, validated exclusion records. The zero-diagnostic success path requires a nonempty root set and both ordinary and unsuppressed semantic binding checks. No old inventory, log or emitted passed flag is adopted. This is static source checking, not an engine/slot result.
2. `--update-files`: produces a root manifest only. Its output explicitly says validation is still required, and it does not assert a semantic pass.
3. Coverage tests: create a fresh isolated Git index and staged files, require the expected missing-root failure, require TS2304 once the file is checked, and require exact justified exclusion before accepting it. Invalid policy cases must throw. Fixture cleanup runs in finally.
4. Reviewer overlay / CLI tests: target exact compiler-visible paths, count actual reads, compare unchanged on-disk bytes at exit, and require fresh child status 1 plus diagnostic code, target path and exact planted/original missing name. The two formerly omitted paths cannot pass by being unread.
5. Round 2 verifier: binds actual source/dependency hashes, actual parent-heavy-owner PID/label/bytes, timestamps, command arguments and raw outputs; asserts parse-safe full printer equality for the 242 annotation-only files; reads both acceptance pin representations; rejects changes to archived exclusions; requires successful static exits, exact checker root count, and nonempty zero-failure TAP summaries. The completed static-only summary is written only after source/dependency and heavy-owner readback. It makes no claim that the failed broader run passed or that an engine is qualified.
6. Evidence SHA256SUMS: integrity index only, not a semantic acceptance receipt. Earlier diagnostics and the failed broader attempt remain retained. No new G0 PASS rule or production promotion was added; coverage failures reach the existing G0 failure path.

### Changed files, evidence and limits

`round2/annotated-files.json` lists all 242 reason-comment files, including the newly pinned helper. The other source/config changes are `lab/bin/checkjs.mjs`, `lab/bin/test/checkjs.test.mjs`, new `lab/bin/test/checkjs-overlay.mjs`, `lab/tsconfig.checkjs.json`, new `lab/checkjs-exclusions.json`, and new `round2/verify.mjs`. This report is appended; `round2/INDEX.md` and `round2/SHA256SUMS` index the durable evidence. Small wrapper logs and the annotation inventory remain in this directory. Bulky initial diagnostics and both full triage files are outside Git under the durable evidence path; the raw directory exceeds 5 MB.

No live GS/wire/engine gate, database request, benchmark, package build/pack, full pnpm check, acceptance rebuild, merge, push or publication ran. Static inclusion is not live execution qualification. The independent reviewer still needs to re-review F1's fix, and the contract builder must re-pin the newly changed oracle helper before the contract self-check can pass.

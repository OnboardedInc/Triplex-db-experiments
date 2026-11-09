# CX-CHECKJS: checked JavaScript lab tools

North star: correctness floor for P1-P5 evidence-producing tools. Scope and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

## Implementation

Added `lab/tsconfig.checkjs.json`: recursive `.js`, `.mjs`, and `.cjs` coverage of all lab/bin, lab/bench, and qualification files, allowJs/checkJs/noEmit, strict checking, NodeNext resolution. No project-wide diagnostic suppression or strictness relaxation. The new `lab/bin/checkjs.mjs` runs the complete project diagnostics, then a second semantic pass that removes TypeScript suppression directives from parsed JavaScript comments and rejects unresolved bindings (TS2304, TS2552, TS18004, missing exports/namespaces, and related binding codes). Strings, templates, and coordinates are preserved. Consequently even a legacy per-file ts-nocheck cannot hide an unbound name in a dormant branch.

`pnpm --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store lab:check` obtains a heavy token. Root typecheck invokes it; G0 invokes the same checker as its own resource-granted step and records a failure reason on nonzero exit. Package-only checks previously missed these scripts. No engine lifecycle changes.

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
- Executable-source comparison: TypeScript parser/printer with comments removed produces identical output for **104 existing JavaScript files**. gate.mjs intentionally adds the checker invocation. No existing application/oracle executable statements changed. `changed-files.json` records old/new source hashes and the toolchain version.
- First broader lab suite: **131 tests, 99 pass, 32 fail** (`lab-tests.txt`). The evaluator integrity checks see modified working-tree evaluator files differing from HEAD and reject with EVALUATOR-TAMPERED, causing downstream assertions to fail. `verification.txt` retains the failing exit and assertion. Commit source, then rerun; do not adopt the first attempt as a pass.
- Committed-source rerun: pending when this implementation commit was written; a follow-up report/evidence commit records its actual result.

All heavy runs use lab/bin/heavy.mjs. Host free disk was about 37 GiB before final verification. Existing installed dependencies were read through an uncommitted worktree node_modules symlink to this project's main node_modules; no install, dependency/lock changes, global cache writes, or engine reservations were made.

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

Experiment evidence/report files: `REPORT.md`, `verify.mjs` (also listed above), `initial.txt`, `triage.jsonl`, `check-attempt1.txt`, `verification.txt`, `changed-files.json`, `checkjs-final.txt`, `tsc-final.txt`, `tests-final.txt`, `lab-tests.txt`. Committed-source follow-up files will be named by attempt in the follow-up report. No evidence file exceeds 1 MB and the experiment evidence is below 5 MB.

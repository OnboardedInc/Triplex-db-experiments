# EXP-CHECKJS independent review — CX-VCHECKJS

Verdict: **FIX-FIRST**.

Reviewed commit: `3575785aff5ab36bc92eee6131f4b5b0ffe83c5d` (`exp/CHECKJS-lab-tools`). Comparison baseline: `2a2fe2fc9317de346b5249924f7c1a0b9a95f81a`. Review branch: `verify/CHECKJS`. No code under review was edited.

North star: correctness floor for P1–P5 evidence-producing tools, under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`. Offline review only; no database operations.

## Finding F1 — high: live GS JavaScript is outside the binding checker

Location: `lab/tsconfig.checkjs.json:13–16`; the coverage test at `lab/bin/test/checkjs.test.mjs:62–72` repeats the same three-directory assumption.

The config has 110 JavaScript roots and one additional local JavaScript dependency (`lab/scenarios/lib/policy.mjs`). It includes all tracked JavaScript under `lab/bin`, `lab/bench`, and `qualification`, but omits JavaScript that those entry points actually execute:

- `lab/bin/gate.mjs:645` passes `lab/scenarios/run.mjs` to the GS process. That launcher is absent from both roots and transitive compiler source files.
- `lab/scenarios/v2/case-driver.ts:17` imports `lab/scenarios/v2/cases.mjs`, which supplies the CS-GS manifest. This file is also absent. The scenario TypeScript project includes `*.ts` without `allowJs`/`checkJs`; this import has `ts-ignore`.
- The wire falsifier (`lab/falsifiers/wire/run.mjs` and its helpers) is omitted. Legacy scenario entry points/helpers are omitted as well. The full inventory is in `coverage.json`; archived research/experiment files are listed separately by path and are not all asserted to be live dependencies.
- Searching root package scripts and qualification subprocesses also finds `scripts/check-packages.mjs`: root `pack:check` runs it, and `qualification/devloop/recipes/public-regressions.mjs:25–27` executes it in the pack regression. It is outside the compiler program, as are the root docs-check scripts. These are the same missing-entry-point inventory problem, not a separate finding.

Reproduction (without editing the reviewed files):

```sh
CHECKJS_REVIEW_TARGET="$PWD/lab/scenarios/run.mjs" \
CHECKJS_REVIEW_MUTATION=append \
node lab/bin/heavy.mjs --label CX-VCHECKJS-gs-repro -- \
  node --import ./lab/verify/CHECKJS/overlay.mjs lab/bin/checkjs.mjs
```

The compiler-input overlay appends an unexecuted branch containing `cxVcheckjsDormantUnboundName()` and a line suppression. The actual checker CLI exits **0** and prints `110 JavaScript roots checked; no diagnostics or suppressed binding errors`. The overlay records **zero reads** of the planted GS file. Repeating with `lab/scenarios/v2/cases.mjs` gives the same result. For the included `lab/bin/engine.mjs`, the identical probe exits **1** with TS2304, proving that the difference is coverage rather than execution or suppression behavior.

Impact: the new G0 check can remain green while a gate-launched JavaScript program or its manifest helper contains an unbound name. This fails requested review condition (3), despite the narrower three-tree claim in the implementation report being accurate.

Proposed fix: inventory the actual entry points and their JavaScript dependencies, including subprocess launches and the GS TS-to-JS import edge; include them in this checker or a mandatory equivalent binding check. Add coverage regressions based on the entry-point inventory, plus a planted unbound-name test in the GS launcher and case-manifest helper. Do not merely extend the existing test's repeated directory list without checking runtime edges. No fix implemented in this review.

## Requested checks

1. **Suppressed binding check: verified for included files.** The unchanged baseline checker exits 0. Appending a dormant unbound call in the `ts-nocheck` engine file exits 1 with TS2304 at line 661; a preceding `ts-ignore` does not hide it. Independently removing `sha256File` from the compiler-visible engine import recreates TS2304 at lines 77, 99, and 102, again without executing the engine. The on-disk source remains unchanged. The builder's four regression tests cover the other requested binding codes.
2. **Executable-source comparison: verified.** Independently recomputed TypeScript 6.0.2 parser/printer output with `removeComments: true` for all **105 modified existing JavaScript files**. There are no parse diagnostics; **104 outputs match** the baseline exactly. `lab/bin/gate.mjs` is the sole expected difference. All three pinned oracle files belong to those 104. Their old bytes match every corresponding contract pin. The comparison uses the actual old/new sources, not the builder's `changed-files` report. Raw and printed SHA256 values are retained per file.
3. **Entrypoint coverage: fails, F1.** Enumerated tracked JavaScript and the compiler's transitive source files; retained package scripts and bounded source-reference inventories for `lab/bin`, `lab/bench`, `lab/scenarios`, `lab/falsifiers`, `qualification`, and `scripts`. No tracked JavaScript under `qualification` is omitted. The project is incomplete for lab execution as described above.
4. **Gate behavior: offline verification described in the evidence index below.** The source diff adds only one awaited, heavy G0 step and its nonzero-exit reason/first-failure entry. No pre-existing statement or branch is removed or changed. `Run.reason()` appends and `verdictOf()` returns FAIL whenever reasons exist. Raw checker stdout/stderr enter the existing outcome-store loop. A checker error thrown out of the step reaches the existing outer harness-error path; it cannot manufacture a PASS. An actual engine-bound G0 was not run.
5. **Heavy admission: source comparison verified; offline contention result described below.** `heavy.mjs` and `heavy-lock.mjs` have identical executable printer output to the baseline. The public `lab:check` script keeps its wrapper. The final root `typecheck` prepends the checker directly to the original typecheck command; the intermediate `a0c86a55` version called `pnpm lab:check` and could acquire a second token under an admitted caller. No environment-variable trust bypass or admission function was added. Root typecheck itself did not acquire a heavy token before this experiment; lab callers must still wrap it. This review does not claim that arbitrary direct typecheck invocations gain admission automatically.

## Pinned oracle files (contract unchanged)

These are the independently recomputed values. A contract builder must re-pin them; this reviewer did not edit `lab/acceptance/`.

| Path | Old SHA256 | Reviewed SHA256 |
| --- | --- | --- |
| `qualification/capacity/configured-entities-v1/oracle.mjs` | `5e4f92bf74fde4504c309d2888cc234013ceb2fbfc8bca7c06fff51cea054cd3` | `92c0378b8120aaa25fb7a16d8659aa1790141eba62aed8f7e7356213efe92e94` |
| `qualification/capacity/historical-assertion-metadata-v1/oracle.mjs` | `bc93f24c88365add1d215747cd95705a3c2a2b4fd1c6cdd7e347a014fb23b290` | `bbd656760719b67a3435419121b0b7df909a99ea9c1aba22d85ea1363cb6b08f` |
| `qualification/capacity/historical-assertion-metadata-v2/oracle.mjs` | `f661e8138d5194bbcbbe56eec9ec35f8766bc9938540192e7b0d92d04685721b` | `5ce6612714b2b7742c46e0599617d472b4bf18a352806e5d44a44577878c9649` |

## Evidence and reproducibility

Reviewer tools: `review.mjs`, `overlay.mjs`, and `admission.mjs` in this directory. Reproduce the whole review from this worktree with the project's installed dependencies visible:

```sh
node lab/bin/heavy.mjs --label CX-VCHECKJS -- node lab/verify/CHECKJS/review.mjs
```

Every run gets a new timestamped `evidence/` directory; no failed attempt is overwritten. `run-1.txt` retains a verifier failure after the printer and CLI probes: Node's strict comparison treats arrays from distinct VM contexts as different prototypes. The reviewer harness was corrected to compare their complete serialized observations, and the entire review was rerun. That failure is not attributed to EXP-CHECKJS or counted as a completed gate verification.

Completed attempt: `evidence/2026-11-09T07-12-54-453Z/` (2026-11-09 07:13:23 UTC); runner exit **0**, retained in `run-2.txt`. The enclosing heavy wrapper owned shared slot **3**, PID **83328**, label `CX-VCHECKJS-r2`; exact owner content hash is in `binding.json`. The earlier partial attempt is `evidence/2026-11-09T07-08-31-199Z/`.

| Evidence | Fresh observed result |
| --- | --- |
| `binding.json` | Exact reviewed-source hashes, verifier-source hashes, Node 22.23.2, TypeScript 6.0.2 and compiler hash, actual parent-heavy grant |
| `printer.json` | 105 existing modified JavaScript files; 104 identical printer outputs; all three original oracle pins match |
| `coverage.json` | 110 roots plus `policy.mjs`; complete tracked-file omissions, package scripts and source-reference inventory |
| `baseline.*` | CLI exit 0, 110 roots |
| `engine-dormant.*` | CLI exit 1, TS2304 at line 661; engine read twice; original bytes unchanged |
| `engine-original-missing-import.*` | CLI exit 1, TS2304 at lines 77/99/102; original bytes unchanged |
| `gs-omitted.*`, `gs-cases-omitted.*` | Both CLI exits 0; neither planted file read |
| `gate-model.json` | Three lanes: unchanged old steps/results on success, all 11 existing nonzero-step paths remain failures, new checker failure remains FAIL and executes all later steps |
| `regression-tests.*` | 4 tests, 4 passed, 0 failed/cancelled/skipped/todo; process exit 0 |
| `admission.json` | Child blocked with four live token owners, admitted only into released slot 4 under actual wrapper PID 6824, owned token removed afterward |
| `root-scripts.json` | Baseline/intermediate/reviewed scripts; original typecheck suffix retained and public `lab:check` still wraps heavy admission |
| `summary.json` | All reviewer assertions completed; reviewed source unchanged; verdict FIX-FIRST |

`SHA256SUMS` indexes the reviewer tools, report, both attempt logs and all retained evidence. No evidence file exceeds 1 MB; the full directory is about 1 MB. A temporary `node_modules` symlink read the existing project install and was removed after validation; no install or lockfile change was performed. Host free space exceeded 30 GiB before admissions. All substantive review execution used the shared heavy wrapper; the semaphore contention probe used a separate lock directory and live reviewer PIDs, never edited shared owners, and cleaned up its own locks.

## Verdict/receipt audit

This review creates a local review verdict, not a production PASS or engine receipt. Every assertion-to-verdict path in the new reviewer code is listed here:

1. `review.mjs` source/printer/pin checks: compare actual reviewed-source bytes against exact Git objects, reject parse errors, compare complete printer output, and require original oracle SHA256 values to equal the recorded pins. Each attempt records source/toolchain hashes and timestamp before interpreting outputs.
2. `review.mjs` CLI checks: require actual process status and diagnostic content, including the expected TS2304/TS2552 codes or explicit zero-read evidence; each process is freshly spawned. `overlay.mjs` targets one exact absolute path, logs reads, and asserts the on-disk bytes are unchanged. Inputs and environment overrides are retained. These checks assert static behavior only, not execution of dormant code.
3. `review.mjs` G0 model: evaluates the exact before/after authored functions with fresh deterministic mock observations, compares complete existing step sequences/results and failure reasons, and checks the actual `verdictOf()` function. It asserts only offline control-flow behavior; mock packet/build identities cannot qualify any real gate or engine slot.
4. `review.mjs` regression runner: requires actual test-process exit 0 plus a nonempty four-test summary with zero failures. Fixtures are created and removed by the existing tests. No old TAP log is adopted.
5. `admission.mjs`: fills exactly four isolated token directories with a live owner PID, waits for actual contention text with no child output, releases exactly one, then checks the child's observed token belongs to its real wrapper parent and that the wrapper removes it on exit. It records actual stdout/stderr and cleans up in `finally`. It claims no engine admission or production slot.
6. `review.mjs` final `summary.json` and this report: produced only after the preceding assertions complete and all reviewed source hashes are rechecked. The summary verdict is FIX-FIRST because the fresh omitted-file probes demonstrate missing coverage. A parent-heavy token identity and verifier-source hashes bind the completed attempt. The evidence SHA256 manifest is an integrity index, not a semantic PASS claim.

## Limits / open questions

No implementation fix, full root `pnpm check`, package build/pack, long lab suite, live G0, engine reservation, database request, benchmark, contract rebuild, merge, push, or package publication. Offline G0 mocks do not establish runtime engine qualification. The broad archived JS inventory contains research and old experiments; the builder should classify those explicitly while correcting the confirmed live-entry omissions. Re-review the coverage fix and the new contract pins before promotion.

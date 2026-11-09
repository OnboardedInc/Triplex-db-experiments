# EXP-CHECKJS round 2 independent review — CX-VCHECKJS

Verdict: **ACCEPT for F1's coverage correction**, subject to the separately required oracle re-pins. This is not a passing full-suite or live-engine qualification.

Reviewed source: `f72cd5add3dd7e9f5f7874802a6c8b6292c9c26a` on `exp/CHECKJS-lab-tools`; comparison baseline: `3575785aff5ab36bc92eee6131f4b5b0ffe83c5d`. Scope is round 1 finding F1, with new findings limited to high severity. No new high-severity defect found. No code under review or acceptance contract was edited.

North star: correctness floor for P1–P5 evidence-producing tools under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

## Coverage correction

The default checker recomputes tracked JavaScript from the Git index and compares it with the TypeScript project's explicit roots (`lab/bin/checkjs.mjs:14–43,73–82`). The updater writes roots and explicitly requires subsequent validation; it does not claim a semantic pass. Normal and suppression-stripped semantic passes still run. G0 invokes the default checker, so the inventory check is on its existing mandatory path.

Independent inventory: **565 tracked JavaScript files = 371 checked roots + 78 exact exclusions + 116 `node_modules`/`dist` outputs**. The former F1 omissions are checked roots. No excluded source appears in the project's transitive compiler sources.

Using the round 1 reviewer overlay and the actual round 2 checker CLI, each of these fresh compiler-input probes exits **1** with **TS2304**, the expected path and exact missing name, positive compiler reads, and unchanged on-disk bytes:

- `lab/scenarios/run.mjs`: dormant unbound call despite file and line suppressions.
- `lab/scenarios/v2/cases.mjs`: same CS-GS helper probe.
- `lab/falsifiers/wire/run.mjs`: same wire falsifier probe.
- `scripts/check-packages.mjs`: same package-check probe.
- `scripts/check-markdown-code.mjs` and `scripts/check-llms.mjs`: both docs probes.
- `lab/bin/engine.mjs`: dormant-name control and original missing-`sha256File`-import control.

The unmodified CLI exits 0 with 371 roots. These probes do not execute any dormant branch, database query, docs build, package checker, or engine command.

## Newly tracked `.mjs` admission

In the isolated reviewed-source repository, staged `previously-unknown-area/dormant.mjs` containing a suppressed unbound name. The actual checker fails TS90001 while the manifest is stale. Independently running the actual coverage test fails and names the new path.

After `--update-files`, the coverage test passes, but the checker fails TS2304 on `cxR2NewTrackedName`, proving that manifest admission does not hide semantic errors. Replacing only the planted fixture with valid source makes the checker pass with **372 roots**. Restoring the old manifest and adding an exact, nonempty-reason exclusion instead makes both the coverage test and checker pass with **371 roots**. All fixture/config/policy/index mutations were then removed and original reviewed hashes rechecked. The builder's complete six-test CHECKJS suite also passes with zero failed, cancelled, skipped, or todo tests.

## Audit of all 78 exclusions

`round2/exclusion-audit.json` records every path, supplied reason, and review disposition. `round2/exclusion-references.txt` retains the outside-vendor code/package references used in the audit. The JSON search in `round2/exclusion-json-references.txt` finds only SOURCE-ADAPTATION provenance and old receipt/file manifests, not current command recipes executing those captures. All 78 excluded files retain their baseline bytes; none was silently edited to gain exclusion.

- **70 vendor files:** imported homebase research, adapter/workload sources and historical evidence. Current outside-vendor references point to provenance, native Python/C++ builds, or compiled native artifacts. Inspected `packages/duckdb/experiments/build-core.mjs`, `build-owner.mjs`, the invoked vendor Python build scripts, native artifact loading, SDK preparation and qualification recipes. They do not execute the excluded JavaScript. A native build metadata `test_command` string is not an invocation.
- **Five DA01 continued-consumer captures:** three `smoke.mjs` files and `smoke-image6.mjs`/`smoke-image7.mjs`. The checked `consumer-check*.mjs` generators create the consumer directory exclusively, write fresh smoke source, then execute it; an existing captured directory causes refusal at mkdir. The finalizer reads `smoke-image7.json`, not its `.mjs` capture. No current caller of the image-specific source captures was found.
- **One DA01 measurement capture:** `measure-image4.mjs` is a historical copy, not imported by current `measure.mjs`; finalization consumes measurement JSON.
- **One DA01 round 3 packed-consumer capture:** checked `packed-exports.mjs` creates a fresh directory and writes its own smoke source before execution; `collect.mjs` reads `receipt.json`. It does not execute the retained old source.
- **One W0 mutation capture:** archived `mutation-112/mutate.mjs` is hardwired to the old W0 worktree. No current import or subprocess reference was found. It was inspected as source and never executed.

No current execution edge to an excluded capture was found. Historical documents describing old runs do not make those captures current entry points. The automatic omission of `node_modules`/`dist` matches the requested rule; it does not imply those outputs are freshly built or runtime-qualified.

## Pinned helper and retained suite failure

`lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs` differs from baseline by **one new leading comment line only**. Removing that line gives byte-identical baseline source. Independent TypeScript parsing reports no parse diagnostics, and comment-free printer outputs match exactly.

| Path | Baseline / existing pin SHA256 | Reviewed SHA256 |
| --- | --- | --- |
| `lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs` | `c533122597c940d69c8a101a1a175ba5e9d6ab62f1efdb2d5526c9f65a86a206` | `752aaa5c706c514ec265ed6865458fd6bd78795486764e200c088c3f52f53f28` |

The contract still pins the old bytes. The selected actual contract self-check fails with `pinned O-REPLAY files differ from the tree` naming this helper. This failure is expected and remains a failure, despite comment-free executable equivalence. The builder's retained broad-suite log reports 133/134 passing and this single failure; this review does not adopt that as a fresh full-suite pass. The helper and the three previously reported round 1 oracles need the separate contract-builder re-pin. No `lab/acceptance/` file was changed.

## Execution and evidence

Tools and evidence are under `lab/verify/CHECKJS/round2/`. The reviewer operates on a temporary Git archive of the exact reviewed commit, with a private index/object-alternate view inside this worktree. The archive is removed in `finally`; no builder/main worktree is changed. Existing installed dependencies/public workspace exports are read through temporary links for compiler resolution, with compiler dependency hashes recorded and rechecked. No install or network access is used. Host free space was about 26 GiB before admission. Heavy execution uses `lab/bin/heavy.mjs`, shared tokens and a recorded actual reviewer parent grant.

Completed attempt: **`round2/evidence/2026-11-09T07-57-02-454Z/`**, finished 2026-11-09 08:01:07 UTC; reviewer runner exit **0** (`round2/run-2.txt`). Actual parent-heavy owner: slot **4**, PID **84654**, label `CX-VCHECKJS-r2`. The attempt binds and rechecks the reviewed source, **517 compiler dependency files**, both reviewer source hashes, and actual owner bytes. The temporary source archive was removed after completion.

| Evidence in the completed attempt | Observation |
| --- | --- |
| `attempt.json`, `binding.json`, `coverage.json` | Exact source/toolchain/grant identity; 565/371/78/116 partition; zero imported exclusions |
| `baseline.*` | Actual CLI exit 0, 371 roots |
| `plant-*.json`, `plant-*.stderr.txt` | Eight actual rejections, exact TS2304 names/paths, positive reads, unchanged disk bytes |
| `new-file-*.json`, `new-file-*.stdout.txt`, `new-file-*.stderr.txt` | Missing-root/test failures, semantic rejection after inclusion, valid-source and justified-exclusion acceptance |
| `six-regressions.*` | Six tests passed, no failures/cancellations/skips/todo |
| `oracle-comparison.json` | One leading comment only; original/reviewed SHA256 and identical printed SHA256 |
| `contract-pin-selfcheck.*` | Expected exit 1 naming only the helper in the stale O-REPLAY pin error |
| `summary.json` | All reviewer assertions and final readbacks completed; eight planted targets rejected |

`round2/SHA256SUMS` indexes the report, tools, audit and retained attempts. Raw evidence remains below the bulky-evidence thresholds. Original TAP failure output retains its emitted trailing whitespace; source/report whitespace checks are clean. If reviewer JavaScript is later imported into a checkout with the new coverage gate, its manifest must be regenerated or the retained historical verifier explicitly excluded; this review does not change the implementation's root manifest.

First attempt `evidence/2026-11-09T07-52-14-292Z/` retains successful mutation/admission/regression observations and the expected failing contract self-check. Its reviewer assertion mistakenly required the word `hash`; the actual error says `pinned O-REPLAY files differ from the tree`. The reviewer tool therefore exits 1 and publishes no completed summary. `review-attempt1.mjs` preserves that executed source (matching the attempt's recorded SHA256); `run-1.txt` retains the assertion failure. The corrected verifier checks the precise error wording, adds the exclusion-import/baseline checks, and reruns the complete review in a new attempt. This is a reviewer-harness correction, not an EXP-CHECKJS defect or an adoption of the failed attempt as PASS.

Reproduction from this reviewer worktree with the existing TypeScript install visible:

```sh
node lab/bin/heavy.mjs --label CX-VCHECKJS-r2 --poll-ms 100 -- \
  node lab/verify/CHECKJS/round2/review.mjs
```

## Verdict / receipt audit

Every new reviewer path that interprets observations as acceptance evidence:

1. `round2/review.mjs` inventory/source checks compare fresh parsed roots, actual Git inventory and exact exclusions; require the 565/371/78/116 partition; compare actual source with the exact reviewed Git objects; confirm archived exclusions match baseline. The compiler source graph independently checks that no exclusion is imported. This claims static coverage only.
2. CLI mutation checks spawn fresh child processes and require actual nonzero status, TS2304, exact target/name, positive reads, and unchanged source. The reused reviewer overlay operates on an exact absolute path and reports fresh reads. No historical probe log is adopted.
3. New-tracked-file checks use the snapshot's real Git index, actual checker and actual coverage test. They require fail-before-admission, semantic failure after inclusion, and successful valid-source or exact-exclusion alternatives. Inputs and raw outcomes are saved. They do not mutate the outer reviewer index or contract.
4. Six-test acceptance requires actual exit 0, six executed tests, zero failures and zero skips. The selected pin self-check instead requires exit 1 and the precise stale-helper failure content; it is never counted as passing.
5. Helper equivalence compares actual Git/source bytes, parse diagnostics, complete printer output and expected old/new SHA256 values, plus the actual old contract pin. Equal executable output does not satisfy a mismatched byte pin.
6. `summary.json` is written only after the source/dependency hashes, verifier/overlay hashes and real parent-heavy owner are rechecked. Fresh timestamps, exact command arguments, overrides and raw outcomes bind the narrow claims; no engine slot or production result is claimed.
7. The exclusion audit and this report combine those source-bound observations with the retained code-reference inspection. Verdict ACCEPT is limited to F1; the checksum manifest is an integrity index, not a semantic PASS or promotion receipt.

## Limits / handoff

No implementation fix, excluded historical program execution, live GS/wire/engine gate, engine reservation, database request, benchmark, dependency install, full root check/build/pack, contract update, merge, push or publication. No unresolved high-severity finding within this round's scope. The contract builder must re-pin the four comment-only oracle changes and rerun the contract self-check before claiming a passing complete suite.

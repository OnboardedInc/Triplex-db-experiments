# First genuine native item-2 acceptance pass — WIP checkpoint only

Artifact: `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4` (202678 bytes), exact trusted path `/tmp/temporal-roadmap-research/iteration-02/native-integration-first/build/temporal_datalog.duckdb_extension`. Genuine runtime DuckDB v2.0.0/source d54cbbe3df. Artifact SHA verified before loading and after all checks; unchanged. No builds, accepted-source/artifact edits, artifact polling or timed benchmark campaign were performed.

## Outcomes

- Initial frozen prepared harness:262 native cases;260 matched,2 stale work-limit class expectations failed. All262 subsequent good-call recoveries passed. Raw `summary.json`, `results.json` and process logs remain unchanged.
- Current-contract-aligned isolated test copy: **262/262 native cases passed**, **262/262 recovery calls passed**;245 declarative host checks,486 SQL mode checks and706 actual candidate queries had no failures. Native outcomes: {'ok': 104, 'error': 158}.
- Nine minimized precharge/string/budget/empty-candidate cases: **9/9 native cases and9/9 recoveries passed**;9 host checks and18 SQL mode checks passed.
- Separate native-only old tuple-budget diagnostic preserved generic max_work and recovered successfully.

## Diagnosis of the initial failures

Minimal source: `answer('yes') :- [0 = 0].` at max_work 2. Native returned specific inner `TD_E_EXPR_LIMIT` with max_work/filter-evaluation context, while the prepared fixture expected generic `max_work`. The same mismatch occurred for two 65-byte strings at budget 5.

The current common contract explicitly specifies complete filter-AST precharge and TD_E_EXPR_LIMIT for filter/string-work exhaustion, preserving the old diagnostic only for old tuple-candidate exhaustion. The immutable source confirms separate `charge()` and `charge_expression()` branches. This was **oracle contract drift**, not a demonstrated native/source bug. The earlier test snapshot was not edited: aligned helpers and exactly two expectation changes live under `contract-aligned-harness/`. Program source, inputs, limits and all other expected outcomes remain identical.

## Minimized boundary evidence

- `[0 = 0]`: budget 2→ExprLimit; budget 3→success/work 3.
- `[1 / 0 = 0]`: budget 4→ExprLimit before evaluating division; budget 5→DivZero.
- False filter followed by that division: budget 7→ExprLimit; budget 8→DivZero. False does not hide the second filter.
- Two65-byte equal strings: budget 5→ExprLimit; budget 6→success/work 6 (three AST nodes plus ceil(130/64)=three byte-work units).
- Actual empty relational join never precharges the dormant division; succeeds with empty relation even under the tight budget.
- Old two-atom tuple work at budget 1 retains generic max_work; no production diagnostic change was requested.

## Precise limits / NOT_RUN

The 262 native cases include all 17 declared parser-negative cases and both accepted structural bounds (256/rule and4,096/program); native checks passed. AST oracles do not pretend to parse those textual negatives. The two large accepted structural cases remain explicitly SQL NOT_RUN to avoid an unrelated SQL compiler resource experiment. Fourteen SQL mode calls are static-only declarative validation, distinct from the706 actual candidate queries.

This task did not run the complete preexisting legacy/typed/persistence/browser suites, direct/core or binding sanitizers, host FP-control mutation tests or matched old/new timing. The source owner/root are handling those gates. No arbitrary SQL-stream atomicity guarantee or global counter equivalence is implied.

This is the **first WIP immutable native checkpoint**, not item2 acceptance or production readiness. Any final source/artifact change requires the matrix to be rerun.

## Reproduction and provenance

`contract-aligned-harness/` is runnable without manual patching and contains code, full 262 fixture/source inputs, the nine-case minimization corpus and input-manifest provenance. `contract-current-2106.md` records the exact contract used, and `alignment-provenance.json`/`FINAL-PROVENANCE.json` record hashes and classification. `results-contract-aligned-262/` and `results-precharge-minimized/` contain complete raw results.

The initial27,380 dataset, completed research freeze, original259-case15-file snapshot and corrected262-case40-file prepared closure were reverified unchanged.

# Item 2 browser/reference implementation handoff

Date: 2026-10-30 UTC. Target: frozen `../CONTRACT.md`, SHA-256 `56c7b0c54670d95c4b012e925e8d931963951129663f49f94e58d6ed76950180`.

## Implemented scope

Only six owned browser files changed/added; see `source-manifest.json` for byte sizes and hashes. Existing v1 UI/engine/worker, original typed tests/fixtures, and immutable accepted/frozen files were not changed. No Git/PR/Page/Site/deployment/install action or Codex task was used.

- `site/dist/engine-v2.js`: body-only bracket comparisons `= != < <= > >=`; bounded scalar `+ - * /` and computed unary minus; strict four-tag semantics; bool ordering errors; no assignments, generated bindings, functions, or computed relational/head terms.
- Relational joins retain the naive independent set fixed point. Filters execute only on complete candidates, all filters run despite false results, and faults are observed before head construction/deduplication. Ground filtered rules evaluate their one empty binding once before seeding. Runtime arithmetic behind a genuinely empty join remains dormant, while all static literal/syntax/safety/structural admission runs up front.
- Checked i64 arithmetic uses BigInt with a range check at every node. f64 nodes each use the corresponding binary64 JS operation, reject zero division/nonfinite/nonzero-to-zero underflow, retain finite subnormals, and normalize zero. Transient results have no dictionary, wire, or persistent-cache metadata.
- Exact bounded BigInt decimal-to-binary64 literal conversion replaces `Number(token)`. Complete strict grammar and 128-byte token checks precede conversion; lexical zero and adjusted-decimal magnitude checks precede powers; exact integer quotient/remainder rounding assembles nearest-even bits through DataView. Wire f64 admission remains a separate finite-number boundary.
- Separate 16-positive-atom/16-filter bounds; 256 filter-AST nodes/rule, 4,096/program, height 32 including comparison root, and 32 active parenthesis/computed-unary descents. Precharge each filter's full node count; charge `ceil((left_UTF8_bytes+right_UTF8_bytes)/64)` before same-string comparison. New expression-work exhaustion is `TD_E_EXPR_LIMIT`; old tuple/outer limits remain unchanged.
- Existing own-index/descriptor snapshots, getter/iterator/Proxy admission defenses, exact i64 clocks, half-open visibility and old smaller browser caps remain in place.

New test assets are compact, declarative, independently generated expectations with source hashes. `expression-fixtures-generate.py` deterministically transports the remotely preserved research inputs into checked-in JSON; it does not import an implementation oracle. The original exact-rational generation/proof scripts remain in the research checkpoint. No source/data file exceeds 400,000 bytes.

## Executed verification

| Check | Result / artifact |
|---|---|
| `node --test site/tests/*.test.mjs` | **472/472 groups pass**, zero skips/failures; unchanged old 96 plus 376 new. `full-suite-final.tap` |
| External unchanged item-1 browser contract | **122/122 checks pass**. `external-contract-final.json` |
| Selected aligned declarative filter corpus | **365/365 cases pass**; repository tests additionally reverse/duplicate facts and check recovery. `corpus-summary-verified-sql.json` |
| Independent exact integer/Fraction arithmetic vectors through actual filters | **2,060/2,060 pass**. Operands/expected values arrive as tagged wire cells; filter equality checks exact typed results and each expected fault. |
| Exact decimal boundary corpus through actual `evaluateV2` | **2,963 calls pass**: 2,962 numeric expectations plus one explicit bool embedding check for `true` (which the full language, unlike the decimal-only probe, admits). |
| Original SQL transport preparation | **259/259 pass**, with explicit adapters described below. `corpus-summary.json` |
| Verified SQL review transport preparation | **262/262 pass**, same boundary mappings. `corpus-summary-verified-sql.json` |
| Immutable accepted filter-free differential | **520 full result objects match**, including rows/rounds/derived_facts/work/active. 500 deterministic temporal graph/query cases plus 20 accepted declarative cases. `legacy-differential.json` |
| Syntax and data generation | `node --check` for engine/new test passes. Hash-pinned fixture generation completed. `fixture-generation.json` |
| Source boundary check | All 12 unowned accepted site files byte-identical; only the six declared owned files differ/new. `source-manifest.json` |

### Explicit transport adaptations, not source changes

The SQL transport fixtures use native/abstract spellings for some already-existing diagnostics and top-level `max_work`. The browser harness maps `max_work` to `{work: ...}`; recognizes new expression-work failure `TD_E_EXPR_LIMIT` with max_work context; maps generic `interval` to existing `TD_E_INTERVAL`; and recognizes existing static literal `TD_E_VALUE_RANGE` where native parser fixtures expect `TD_E_PROGRAM_SYNTAX`. New single-fault expression markers themselves must match exactly. The original first adapter attempt's seven mismatches are preserved in `corpus-summary-initial.json` / `corpus-results-initial.json`; no engine failures were hidden by assertion-catching.

### Found and fixed during self-review

Compact `true+1` / `false-true` initially mistook a Boolean's final `e` for a numeric exponent-sign prefix, causing an admission SYNTAX error rather than a deferred TYPE error, including behind empty joins. After reproducing and refreshing the primary lexical grammar, the sign exception now requires a numeric-leading token. Explicit live/dead-join regressions and the compact full four-tag arithmetic matrix pass. This did not modify frozen research.

Fresh focused source accessed 2026-10-30: [ECMA-262 2026 Boolean/numeric lexical grammar](https://tc39.es/ecma262/2026/multipage/ecmascript-language-lexical-grammar.html#sec-literals-numeric-literals). The selected language contract, rather than JavaScript's full grammar, remains authoritative.

## Read-only review

An explicitly launched native `gpt-6.1-sol` / max / `fork_turns=none` reviewer completed randomized expressions, precedence, work/bounds, barriers and compatibility review without source edits. Launch provenance is recorded; no tool exposes an independent self-model-attestation field. A prior full-history child reported a conflicting runtime and refused before reading/writing; none of its work was used.

The completed review found **no additional concrete defects**: **132,000 randomized expression invocations**, **497 focused resource/barrier/getter-defense checks**, and an independent **472/472** rerun of the checked-in suite pass at the final engine hash. Review files and reproducible probes are under `review/`, headed by `SOL-READONLY-REVIEW.md`. An initial eager multi-fault review-oracle mismatch was diagnosed and corrected in the review harness only; the negative result is retained and no source change was made for it.

## Local matched performance controls

`browser-performance.json` records complete Node wire-parse/evaluate/serialize calls, 21 interleaved samples after three warmups, for snapshot400 and joined60 controls. Every mode returned identical typed rows. Accepted/current filter-free work counts match (800 and 14,640); true-filter current work reflects the selected extra charges (3,200 and 15,240).

Median milliseconds were snapshot accepted/current/true-filter **7.29 / 7.10 / 7.85** and joined **4.29 / 3.81 / 4.00**, with broad overlapping ranges. These are two small local controls, **not** a general speedup/regression conclusion, full matched performance acceptance, or native/browser timing comparison.

## Remaining integration and honest limits

Native actual-C-API-v2 binding execution, cross-path sanitizer/FP-control tests, storage rollback/retry and native/browser/store end-to-end acceptance belong to the coordinator/other owners and are not claimed here. This handoff does not establish full resource/cancellation accounting, rendered UI behavior, Site deployment, crash certification or production readiness. The deployed v1 Site remains unchanged.

Reproduce browser suites with Node alone. To regenerate checked-in fixture transport, run:

```sh
python3 site/tests/expression-fixtures-generate.py --research-directory /tmp/temporal-roadmap-research/iteration-02/browser
node --test site/tests/*.test.mjs
node ../test-prep/browser-contract/run-contract.mjs --engine "$PWD/site/dist/engine-v2.js"
```

The independent corpus and accepted differential harnesses are inspectable `.mjs` files alongside this handoff. Runtime reports and review output live only in this implementation evidence directory.

## Stable write release

**Browser write ownership is released to the coordinator.** No further source changes are planned by this worker. Final engine SHA-256: `efa53e1f086b12801df833d0c7106809dfeb1ef87224a129d5a96ce2dff461f1`. All six final source hashes and modes are in `source-manifest.json`; deterministic regeneration preserved those hashes.

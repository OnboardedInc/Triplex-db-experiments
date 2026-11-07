# Typed browser reference acceptance preparation

This directory contains **unexecuted implementation acceptance tests**, prepared while the original prototype's ownership handoff is pending. It does not implement typed Datalog and must not be reported as a completed roadmap iteration.

## Proposed test boundary

The future independent browser reference module exports:

```javascript
evaluateV2(program, facts, validAt, knownAt, limits = {})
// May return an object or Promise. The object includes rows.
```

Facts and output cells use the research memo's explicit tagged JSON values: `str`, `bool`, decimal-string `i64`, finite-number `f64`. Every temporal coordinate at this JSON boundary is a canonical signed-int64 decimal string. Output `rows` contains tagged JSON cells, not raw BigInt or untagged values. `limits` uses browser names `facts`, `rounds` and `work`; this boundary can be supplied by a small test adapter if the eventual implementation uses other internal names. No native/browser timing comparison follows.

The existing `site/dist/engine.js` remains a separate unchanged v1 API. These tests intentionally require a v2 export instead of silently running v1 against typed fixtures. No wrapper may stringify or round input values to make a fixture pass.

## Run after an implementation exists

```sh
node run-contract.mjs --engine /absolute/path/to/engine-v2.js
```

`--fixtures /absolute/path/to/contract-fixtures.json` may override the adjacent corpus. No engine argument exits 2 with **UNRUN**; a missing module/export never counts as passing conformance. A backend may throw synchronously or reject a Promise. The final JSON describes only checks actually executed.

The harness checks the explicit answer/rejection corpus, input permutation and duplicate-fact invariance, direct nonfinite and malformed typed values, UTF-8/Unicode admission, canonical clocks, all-or-error resource rejection and health of a subsequent independent query. It does not test rendered UI, browser accessibility, native execution, persistence or deployment.

## Preparation verification

- `node --check run-contract.mjs`: syntax check only.
- Missing-engine invocation: expected exit 2, no implementation checks run.
- Corpus expectations were independently reviewed against the cited research contract; they are not observed implementation results.

See the adjacent copied fixture corpus and the original generator in the iteration 1 research artifacts. The frozen baseline manifest is recorded at `../../BASELINE.json` and is not modified by this harness.

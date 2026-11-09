# EXP-RQ01 round 4 — separate route entry

Builder CX-RQ01, branch `exp/RQ01-route-equivalence`. Merged main
`d2390dabe3d8eeec262c2fc6f38098bfed3cfafc` into accepted RQ01 builder
`d5cd32e6829100c0d9968ddb83713525e1510b3a`, without conflicts.
This report records offline builder verification, not independent acceptance.

## Change and byte preservation

The four harness exports now live in `packages/testkit/src/route.ts`, exposed by
`@triplex-build/triplex-testkit/route` with JS and declaration targets. The testkit,
XTDB and QLever harness tests and packed consumer use that subpath; the built
coverage controller imports `dist/route.js`. README and Changeset describe the
entry. Archived reviewer probes and historical evidence retain their original bytes.

`packages/testkit/src/index.ts` is byte-identical to merged main, SHA-256
`6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988`.
All four harness implementation modules are unchanged from accepted builder
`d5cd32e6`. No harness behavior, contract version or pin was changed.
The complete `lab/acceptance` tree is identical to merged main.

## Fresh results

- `evidence/round4-merged-01/receipt.json`: PASS, **95/95 tests** (91 testkit,
  3 XTDB, 1 QLever), zero failed/pending/todo assertions, TypeScript, normal build
  and five-seed measured coverage. Required Q89a negative regression and custom
  retirement-boundary mutant remain present. All command content, source,
  distribution, coverage and actual heavy-slot checks passed.
- `evidence/round4-final-package-smoke.json`: PASS, packed `/route` entry and its
  declarations present; all unpacked dist bytes match this build. Fresh consumer:
  **31,325 observations**, zero violations, six nonempty shapes, snapshot contract,
  exact original forty IDs and all three post-cut retirement fields masked.
  Pack/consumer exits and source/build/slot bindings pass. Uses existing pinned
  core/Effect links, without registry installation. Tarball and consumer remain
  under `.experiments/rq01-package-smoke-round4-final`.
- `evidence/round4-contract-01/contract.log`: `python3 -I -B
  lab/acceptance/build_contract.py --verify` exits zero and reports second
  regeneration byte-identical. All six artifact SHA-256 values match unchanged
  main bytes. Transitive hash:
  `9907cb15f0c2d7dd4fdf74d1e5d9c2eb78d9a25fac1febbcd701ccfb5a0a112c`.
- The first evaluator attempt, `evidence/round4-contract-01`, correctly refused
  the uncommitted merge: 76/108 passed, 32 failed because evaluator files from
  main did not match pre-merge HEAD `d5cd32e6` (`EVALUATOR-TAMPERED`). Its aggregate
  receipt is **false**, not a PASS. Contract verification and main byte comparison
  passed. The controller now takes the exact merged-main commit and checks it is
  an ancestor of committed HEAD; the evaluator will be rerun after this merge
  commit, without changing its integrity guard. Final evidence follows in the
  report update.
- Formatting passed on ten edited source/config/controller files; lint passed
  with zero warnings/errors on nine source/test/controller files.

Commands ran through `heavy.mjs` with CX-RQ01 holders; pre-admission disk free
was 7.3 GiB for the harness gate and 6.0 GiB for package smoke. The contract run
was queued while shared slots were occupied. No engine slot was acquired.

## PASS audit (completed before commit)

The following lists the decision sites exercised by this packaging change,
including reused controllers. No output flag alone is adopted as acceptance.

| Decision site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `route-history-grammar.ts` validation, generator/planner callers | Whole history grammar including nested physical groups and receipt identity; invalid input throws | Validates each invocation's history | Exact history passed into immutable execution plan |
| `route-equivalence.ts` comparisons and violation-free result | Expected canonical rows including metadata, within-contract route equality, typed refusals and immutable snapshot checks | Resets fixture and performs reads/events in this invocation | Requests, route IDs/contracts, frozen plan and applied retention echoes; model answers remain explicitly offline |
| `route-coverage.ts` `complete` / `requireRouteCoverage` | All required history families, shapes and every declared retirement cut including h/h-1; empty or incomplete sets refuse | Recomputed from this invocation | Exact plan digest, input equality and per-route cut identities; structural-only calls cannot complete |
| `retention-probe.mjs` successful return | Clean/correct routes have no violations; planted custom-cut route triggers HE-1 and HE-2 only at its boundaries; missing cuts rejected | New clean and mutated runs | Same explicit custom policies, owning routes, cut IDs and positions |
| `coverage.mjs` `passed` | Five exact seeds, complete measured coverage, nonempty answering shapes, zero violations and checked mutant | New output path; current reads and attempt token | Each result's exact plan/events; parent gate checks token and witnesses again |
| `gate.mjs` command content and receipt `passed` | Parses every test assertion/count plus required regression names; silent successful tsc; successful build and dist inventory; checks coverage contents, not its flag | Exclusive attempt directory, per-command start times, fresh reporter/build timestamps, new token | Before/after source hashes, reporter SHA-256, stable dist tree and actual parent heavy owner/slot; exact child commands retained |
| `package-smoke.mjs` content and receipt `passed` | Tar entries, every unpacked dist byte, public `/route` execution, exact known IDs and masked fields, nonempty shapes and zero violations | Exclusive consumer directory and token, freshly read consumer output after child start | Built dist tree, tar hash, packed bytes, borrowed dependency preimages, source hashes before/after and actual heavy slot |
| `round4.mjs` contract content | Successful verify, exact regeneration marker and all six computed artifact hashes; builder/artifacts/root index equal captured merge parent bytes | Direct child stdout from this attempt, exclusive output directory and new logs | Explicit full merged-main hash and committed HEAD, ancestor check, exact commands, log hashes, all lab/bin and acceptance inputs plus controller/helper/index before/after; actual heavy owner unchanged |
| `round4.mjs` evaluator content and aggregate `passed` | Successful real suite; exact TAP totals 108 tests/108 pass, zero fail/cancel/skip/todo; all prior byte/content checks required | Direct child execution in this attempt; no old log is read | Same frozen evaluator/contract input hashes, exact main commit, log hashes and actual shared slot |
| `build_contract.py --verify` and evaluator assertions | Contract recomputes pins and six expected byte strings; existing evaluator tests assert expected positive and adversarial outcomes | Newly executed on merged tree | Controller hashes their code/fixtures/contract and retains actual outputs; no evaluator or contract logic changed |

## Limits and open questions

No engines, online lane qualification, full-root check or repository-wide package
consumer check were run. Focused testkit packaging is verified; borrowed dependency
builds are not requalified. Q89a D-C1 stays explicitly known-failing inside a passing
negative regression; this packaging change does not repair it. There are no new
behavior questions. Independent merge review remains the next step; nothing was
pushed or merged into main.

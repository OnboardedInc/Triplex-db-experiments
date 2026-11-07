# Typed browser boundary corrective handoff

Recorded 2026-10-30T19:13:26.444005+00:00

## Change and reproduced failures

Only `site/dist/engine-v2.js` and `site/tests/typed-engine.test.mjs` changed. The naive full-scan/pending-round evaluator and legacy UI/wiring remain separate.

On the untouched starting module, direct JS repros showed: `[null]` hidden by an empty iterator; a length-zero array admitting 2001 iterator rows; a sparse hole hidden by an empty iterator; an indexed getter executed and accepted; and a Proxy f64 payload changing after finite checks, admitting NaN and serializing it as null. See `pre-fix-repros.log`.

`normalizeFacts` now snapshots and validates the own length descriptor once, then traverses numeric indices and requires own indexed data descriptors. It never reads or executes the caller iterator or indexed accessors. `requireRecord` now snapshots each recognized own data descriptor exactly once; its two callers consume that validated snapshot rather than reading caller properties. This additionally closes the confirmed Proxy check-then-read f64 defect.

Seven new regression groups cover the three iterator cases, indexed/inherited accessor nonexecution, ignored Symbol.iterator accessors, once-only array length/index descriptors, and row/value Proxy get-trap and NaN protection. The existing numeric allocation test is accurately renamed numeric-payload tuples.

## Final verification

All commands below exited 0. Relative commands ran from the site directory. Node v24.22.1; npm 11.9.0.

- `node --test tests/typed-engine.test.mjs`: 71 passed; 0 failed. Log: `typed-only.log`.

- `npm test`: 96 passed; 0 failed (25 legacy + 71 typed). Log: `full-suite.log`.

- `node --test tests/engine.test.mjs tests/conformance.test.mjs`: 25 passed; 0 failed. Log: `browser-fix-v1-only.log`.

- `node /workspace/scratch/497cfb3c035e/temporal-roadmap-20261030/test-prep/browser-contract/run-contract.mjs --engine /workspace/scratch/497cfb3c035e/temporal-roadmap-20261030/implementation/site/dist/engine-v2.js`: 122 checks passed; unchanged external harness and fixtures. Log: `external-contract.log`.

- `npm run check`: legacy app/engine/query-worker syntax passed. Log: `legacy-syntax.log`.

- `node --check dist/engine-v2.js && node --check tests/typed-engine.test.mjs`: new module/test syntax passed. Log: `new-syntax.log`.

- `node /tmp/temporal-roadmap-research/iteration-01/browser-fix-1908/boundary-review.mjs`: 10 adversarial groups passed. Log: `boundary-review.log`.

The independent bounded adversarial review also covered cap-length/iterator interaction, mutation after the fixed length snapshot, invalid reflected length values, every row/value getter slot, exactly-once row/value descriptors, nonfinite or wrong-type descriptor payloads, extra symbol fields, null-prototype records, and clock coercion hooks. No further clear correctness issue was found.

## Source and baseline hashes

- `site/dist/engine-v2.js`: 19533 bytes; SHA-256 `a564d71d3714f5db39110409a85e3f758371bed8ffbfb56ce826719328ea27bd`.
- `site/tests/typed-engine.test.mjs`: 19780 bytes; SHA-256 `e142d3f8b8321453d7a273e1424b324726acb72f33ba127276d74feb6bd582a5`.

All 218 manifest-listed original files in `/tmp/temporal-datalog-20261030/export/final-1139` and all 218 frozen-baseline files match the original export manifest. All 10 legacy site files are byte-identical across original, frozen and implementation. The 234-file pre/post snapshot changed only the two authorized source files. The typed fixture, external harness and external fixture remain byte-identical. Details: `source-and-baseline-audit.json`.

## Limits and handoff

- This is the independent JS reference only; no item-1, native/store/SQL, performance, deployment, or browser-UI completion claim.
- Ordinary index/field accessors and iterator/get traps are not invoked. Standard reflection can necessarily execute Proxy ownKeys/getPrototypeOf/getOwnPropertyDescriptor traps; this API is not an arbitrary hostile-JavaScript sandbox.
- npm emitted a pre-existing unknown http-proxy environment-config warning; both npm commands exited 0.
- No Git mutations, PR/Page/Site publication, native evaluator source/algorithm inspection, Codex task, user-computer action, fixture edit or legacy-source edit was performed. Publication and native/store/SQL acceptance remain with their owners.
- These files are stable for coordinator publication; no further source edits are pending.

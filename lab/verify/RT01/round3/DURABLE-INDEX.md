# CX-VRT01 round 3 durable evidence

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VRT01/round3/`.

`DURABLE-SHA256SUMS` paths are relative to that root. Every source output was copied and read back by SHA256 before its exact local duplicate was removed. Failed attempts are retained.

Adopted: `packages/`, `reproductions/`, `comparisons/attempt2/`, `actual-property/attempt4/`, `model-property/attempt2/`, `journal-clock/attempt3/`, `property-oracle/`. Closure: `RESULT.json` and `closure/execution.json`.

- F7: `journal-clock/attempt3/{a0,compact}-observed.json` and `*-sql.json`, plus `property-comparisons.json` and the raw expected pages in `property-oracle/`.
- 1,074 package tests: `packages/*-tests.txt`, `phases.json`, `execution.json`.
- Original reproductions: `reproductions/`, `matrix/`, `pending/`, `pending-proof/`; independent comparisons in the root `*-comparisons.json` files.
- New schedules: `actual-property/attempt4/*-observed.json`, `*.case.json`, `summary.json`; `model-property/attempt2/results.json`.
- Accepted oracle: `oracle/` contains self-check, 403 tests, 14 fixtures and pinned-tree command inventory; per-case responses remain alongside their input families.
- First failures: actual-property attempts 1–3, initial model-property results and runner, comparison-attempt1, preliminary journal-clock outputs. Reasons and coverage limits are in `../VERIFY-round3.md`.
- Integrity: `integrity.json`, `bindings.json`, `RESULT.json`; builder durable evidence is separately verified by closure and remains in the builder's CX-RT01 directory.

Reviewer tools keep their original worktree output paths for fresh reproduction. To inspect this attempt, resolve retained raw paths under the durable root above; do not overwrite these attempts. The manifest binds all retained bytes, including source preimages stored with failed attempts. `SHA256SUMS` binds committed reviewer tools, index and report.

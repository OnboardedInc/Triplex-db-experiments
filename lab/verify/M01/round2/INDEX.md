# CX-VM01R round 2 evidence

Verdict/report: [VERIFY-rebase-round2.md](../../../../VERIFY-rebase-round2.md).

- `challenge.mjs`, `challenge-result.json`, `challenge.log`: replay of the retained round-one F1 input; unchanged complete paired result; 216 old/new paired grade comparisons; 14 hard-rule single-arm refusals; preflight/soft/missing-signal checks; version-2 and legacy recomputations and planted edits.
- `clean-check.mjs`, `clone.log`, `clean-result.json`, `clean-check.log`, `clean-install*`, `clean-build*`: independent clean checkout at 99d9641d, offline frozen install, exact repaired runbook prebuild and clean final Git status. The complete checkout is retained under ignored `../runtime/round2-clean/`.
- `tests.tap`: fresh 52/52 focused tests from the reviewed checkout, no failures/skips.
- `source-bindings.json`: exact review inputs and baseline/reviewed source hashes; unchanged package/lockfile/noise/slots/acceptance checks.
- `SHA256SUMS`: paths resolve under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VM01R/round2/`; copies exclude dependency caches, package builds and the clone's Git metadata. No live slot/engine provenance is claimed.

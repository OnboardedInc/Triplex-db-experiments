# DX-B3

North star: P2 small atomic idempotent commits, with P1 read isolation. Targets: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md.

## M1

Implemented version 2 fixed-width position strings and journal-position flag, retaining canonical version 1 decoding. Reach streams the array after the new flag. Tests: rowText + reach, 2 files / 7 tests passed on this attempt, including 10,000 seeded round trips for both versions and 200 reach scenarios. Development stack: tx2-dxb3-dev, all four containers CPU 5, ports 8499/8500. Evidence in `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B3/tx2-dxb3-dev/stack.json`.

No scorecard PASS or qualification receipt is produced. Test assertions check actual decoded content against the tagged codec and original reach path using fresh UUID databases and this attempt's gateway source hash. Later milestone results follow.

## M2 implementation checkpoint

Installed source-hashed `:triplex/commit`; prepared transaction data uses position/text/retraction placeholders. Inside Datomic it checks live IDs and entity revisions, assigns the final span, finds exact current row text for retraction, and maintains recorded-time metadata. The function uses only `d/datoms`/`d/entid`; its payload walker accepts Datomic's Java map/list representation. The gateway returns the position from the report's own transaction datom and its delta. The optional core member corrects the public receipt after storage commits. Snapshot reads (`d/with`) use the same function.

Read tracking is entity-scoped for named entities and row IDs, scope-wide for history, dependency-state and Datalog/pattern/constraint reads without named entities. Added `concurrent-commits.test.ts`: 16 x 200 buildTraceCommand commands, 500 same-row races, nested spans, scope-wide replay, stored receipt positions and historical reach. The broad suite is still running at this checkpoint; this is an implementation commit, not a gate-complete claim. Focused nested/span/pattern replay test passed. Touched-core tests: 4 files, 46 tests passed.

Initial diagnostic failures retained: stack startup raced transactor discovery (socket reset); placeholder walker initially recognized Clojure collections only; journal number placeholders initially produced a long instead of a double. Those defects were corrected before the current full-suite attempt. Development source reloads are diagnostic and do not constitute immutable gateway-source receipts.

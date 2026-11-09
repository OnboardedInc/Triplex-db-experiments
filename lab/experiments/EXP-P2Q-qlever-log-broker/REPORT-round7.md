# EXP-P2Q broker fix round 7 — CX-P2Q-R3

Result: implemented Q89c exact-position refusal for the default-off broker read path. The corrected source-bound retry passed all seven gates: 802 offline matrix/Q89c checks, 224 package tests, 14 live tests and typecheck. Separate adversarial review remains required; this report does not promote the broker or close core error-tag obligations.

The scope is the requested correctness fix under [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md), and Q89c in the main checkout's `lab/acceptance/RULINGS-PENDING.md`. Read the supplied reviewer's complete `VERIFY-round7.md` and both reproductions without editing that worktree or the main checkout.

## Implementation and source

Base: `a1e390b9`. Product implementation: `25c54ff27fbc6d50cac7a363eeea564044083037`. Final measured candidate, including the corrected live fixture: `542873d7` on `exp/P2Q-qlever-log-broker`. `git diff 25c54ff2 -- packages` is empty: the second commit changes only the new regression fixture and its retry runner.

Only two product files changed:

- `packages/qlever/src/broker/BrokerStorageAdapter.ts`: replace the transaction's `Math.min(sourceK, requested)` substitution with a common basis gate. An explicit request above the immutable pin waits for `basisWaitMs`, then raises `BasisNotAvailable` with the original requested position, the pinned observed position, replica `the transaction snapshot`, surface and measured wait. Advancing the global head cannot advance that pin. At/below the pin, the requested position remains unchanged. Outside a transaction the existing resolved-prefix wait/refusal remains. Empty entity batches and empty dependency sets validate the basis before returning. Dependency-state reads now use the transaction pin; outside Datalog and dependency-state waits share the remaining basis budget rather than resetting it between prefix and replica waits.
- `packages/qlever/src/QleverQueryExecutor.ts`: pass the explicit requested position into the transaction gate for both `execute` and `executePage`. Broker reads can use earlier committed positions, including positions accompanied by recorded time. An explicit committed cut excludes the pending source view from both ordinary compilation and rule materialization, preserving the replica's earlier row versions rather than applying staged assertions/retractions. Implicit reads retain read-your-own-write behavior. A0's historical transaction admission remains unchanged.

There is no transport catalog/classifier change, native SPARQL product change, dependency update, core schema/API expansion or engine lifecycle action.

## Read entry-point audit

| Entry point | Exact-position handling |
| --- | --- |
| Adapter `getByEntity`, `getByEntities`, `query` | All share `queryRows` and the new common gate; present/absent entities, empty batches, earlier/pinned/future cuts covered. |
| Adapter `getById`, `history`, retraction-target reads | Share `queryRows`; these signatures have no basis argument. They keep the transaction pin when implicit. Regression covers staged retraction through `getById` and retained history. |
| Adapter `dependencyState` | Uses transaction pin or requested earlier cut; future positions refuse before aggregate/empty-set success. Live tests exercise exact earlier/pinned aggregates. |
| `currentCommitPosition` | Has no requested basis; returns the immutable pin inside a transaction and broker head outside. The concurrent-commit regression verifies this distinction. |
| Datalog `execute`, `executePage` | Share `run`; both receive the original explicit cut, wait/refuse above pin, and compile committed historical cuts without staged rows. `explain`/`explainPage` return plans without reading facts or accepting a basis. |
| Native `select`, `selectWithRelations` | Share `run` in `native/NativeQueries.ts`. Its existing requested-position loop waits/refuses, and `resolveNativeReadBasis` keeps the requested position. Both are exercised offline and live. Native facades are independent reads without the adapter's ambient transaction context; wrapping one in an adapter transaction does not make it a participant or substitute that transaction's pin. |
| Core `Triples`/pagination callers | `entity`/`entities` delegate resolved temporal reads; entity pages preserve cursor positions and delegate `query`/`getByEntities`. Query pages preserve cursor positions and delegate `executePage`. The public `TemporalBasis` schema has recorded/valid times, with positions internal to pagination/executor contracts; no new public position option was added. No further position clamp was found in these callers. |

A transaction captured at P is tested with a separate fiber committing a newer global head, after which all eight participating basis-bearing routes still refuse the newer cut with `required=new head`, `observed=P`, `replica=the transaction snapshot`. Earlier and pinned repository reads retain committed values across a staged insertion/retraction. Live Datalog tests exercise both execute variants at earlier/pinned cuts with recorded time and pending changes, and verify the implicit pending view separately.

## Evidence and gates

[Evidence directory](evidence-round7/). Reviewer tests are byte-identical copies; source paths and SHA-256 comparisons are in `reviewer-import.json`.

The source-bound runners retain commands, head, exact source/dependency hashes, environment, start/end, exits and log hashes, and refuse to overwrite existing receipts. Both run under `lab/bin/heavy.mjs`; free disk was about 14 GiB before the first admission and 12 GiB before the retry, above the 5 GiB floor. Node is v22.23.2. Existing process access is used for broker lock helpers. Live endpoints are restricted to shared qlever-dev at `http://127.0.0.1:7070`; graph names are unique. New live fixtures close their broker before dropping only their own graph.

Initial source-bound run:

`node lab/bin/heavy.mjs --label CX-P2Q-R7-final-suites -- python3 lab/experiments/EXP-P2Q-qlever-log-broker/run-round7-final.py`

At `25c54ff2`, Q89c (9), existing controls (763), package (224), typecheck, HTTP offline (30), and unchanged HTTP live (12) passed. The new basis-live tests failed (2) because the test constructed `DatabaseScope.test` twice: native reads used a different empty graph and observed 0 while the fixture expected the actual published marker 4095. Exact logs and 65 completed rows per client are retained in `final/`; this was not hidden or converted into a product pass. The corrected fixture constructs one structured scope for broker/native/Datalog and first asserts native and broker markers agree. The product source did not change. An earlier unbound exploratory offline run is retained in `first/` (9 passed, 2 live skipped); final claims use the source-bound receipts.

Fresh source-bound retry:

`node lab/bin/heavy.mjs --label CX-P2Q-R7-retry-suites -- python3 lab/experiments/EXP-P2Q-qlever-log-broker/run-round7-retry.py`

| Gate at `542873d7` | Result | Evidence under `evidence-round7/` |
| --- | --- | --- |
| Reviewer Q89c reproductions + expanded offline entry-point checks | **9 passed**, 2 live skipped | `retry/q89c.json`, `.log`, `retry/q89c/` |
| Round-five/round-six matrices and installed-code controls | **763 passed** | `retry/controls.json`, `.log`, `retry/controls/` |
| QLever package suite, including transport inventory/upgrade guard | **224 passed**, 26 live skipped | `retry/unit.json`, `.log` |
| QLever TypeScript | **exit 0** | `retry/typecheck.json`, `.log` |
| Real HTTP offline matrix | **30 passed**, 12 live skipped | `retry/http-offline.json`, `.log`, `retry/http-offline/` |
| Expanded qlever-dev basis checks, standard and fresh clients | **2 passed**, 2 offline cases filtered | `retry/basis-live.json`, `.log`, `retry/basis-live/` |
| Real HTTP qlever-dev matrix | **12 passed**, 30 offline cases filtered | `retry/http-live.json`, `.log`, `retry/http-live/` |

The new entry-point matrix contains 80 future-position checks per fixture: 10 routes × inside/outside × present/absent × position alone/position with recorded time. Every check asserts the failure class, reason, exact required/observed/replica fields, minimum wait and elapsed bound. The two live fixtures add earlier/pinned Datalog/dependency reads while mutations are staged. The unchanged HTTP matrix covers both clients and query surfaces, header/body cut points, exact outage fields, completed decode errors, HTTP errors, successful responses and unmet bases. The previously reviewed structured transport inventory and bounded cause behavior are rerun without modification.

All 14 retained gate receipts were read back with their expected exits (the initial fixture failure remains exit 1), matching log hashes and `sourceStillMatches: true`. Every final retry source/dependency hash still matches the current bytes, and package hashes match across both measured commits. `SUMMARY.json` independently verifies all 240 final future-basis records, their 80 unique tuples per fixture and exact fields, plus all 12 live HTTP outage fields. `MANIFEST.json` hashes the evidence files. The committed `summarize-round7.py` reproduces these checks. `cleanup.json` records zero remaining owned test/heavy/lock-helper processes, no engine lifecycle actions and no exclusive engine slot. Broker fixture state is retained under the recorded `runs/broker/CX-P2Q-R7-*` directories; raw initial failures remain intact.

## Limits and handoff

This is a correctness fix in the default-off broker candidate. No performance, throughput, benchmark, durability-at-scale, promotion or production-readiness claim is made. Did not run the root monorepo check, packed-consumer gate, PostgreSQL/FoundationDB suites, full older verifier durability/fuzz/load suites or unrelated engines. The task restricts live checks to qlever-dev. Did not change the public recorded-time/position API or claim future recorded-time behavior deferred after Q89a. The default-off `ReadError` subclasses remain; Q67h core tag migration is not implemented here. No merge, push, publish, deployment, resident restart or exclusive engine reservation occurred.

Open question: independent reviewer acceptance of the Q89c fix; no implementation question requires user input.

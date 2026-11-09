# DX-B2 report

North star: P1/P4 exact subject pulls and P2 atomic commits on Postgres storage. Targets: lab/TARGETS.md. Diagnostic fast-forward work under PROTOCOL 0b; no acceptance or scorecard promotion.

## Baseline and N0

Offline install: 605 packages, 600 reused, zero downloads. Built core/testkit/Datomic before the effective baseline. Baseline on the merged gateway with Postgres: 142 tests passed, the one declared signed-zero/int64-domain test failed (143 total). The initial test attempt raced the initial build and collected no tests; retained as baseline.log. Effective baseline: baseline2.log.

N4 stack blockers fixed in 44e2d811: allow tx2-dx* prefixes, CPUs 0–7, optional evidence root, requested transactor 2 GiB heap/3 GiB cap and 128m/512m index thresholds. DX-B2 used only CPUs 0–4 and ports 8493/8494. The merged reach call passed the connection in place of the database name; fixed in N1.

## N1

Cached scope and attribute IDs per database; separate per-database string-to-Long ID maps, removed on deletion. Scope values remain request-time index reads. Each entity uses one EAVT scan with Datom methods, primitive array counters and range-based integer parsing. Overflow, row/entity budgets and historical eligibility remain. begin/transact/reach responses include server elapsed microseconds after JSON parsing through response serialization. No reflection warnings in reach.clj on startup.

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B2/`. Gateway development staging is mutable and its original stack health source hash describes only the initial source; subsequent gates bind to retained source snapshots, not that initial health hash.

## Observation-to-verdict audit

- Equivalence test compares full content and BFS order against the fallback at the same resolved basis, using fresh UUID scopes created by the current attempt. It counts accepts/declines and checks zero decoding faults. No endpoint exit status is substituted for equality.
- Unit/integration test counts are diagnostic test outcomes, not production or contract acceptance.
- No lab/acceptance files are edited and no scorecard PASS is claimed.

N1 fresh gate: 2 tests passed (51.54 s), 6,600 comparisons; see n1-results.json for exact acceptance/decline counts. The first N1 attempt raced a gateway restart and failed transport initialization; n1.log is retained. The rerun n1-retry.log passed. Source retained in source-N1/.

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

## N2

Entity revision datoms advance for every changed entity, including retractions; new scopes use rows-version 2, old scopes decline. The v2 wire carries full unfiltered entity row sets or revision references, one shared page for reach-many and per-root closure coverage. Session maps are per database, LRU bounded to 64, and entry admission/clearing is synchronized to enforce the 1,000,000-entry cap under concurrent requests. A configurable lower cap (never above 1,000,000) supports forced reset tests. Overflow pages are entirely inline; pages larger than the cap leave the session map empty.

Each client has a UUID session and database-scoped decoded entity maps. Inline rows validate types directly, validate/decode the value domain once, sort once per entity, and deeply freeze cached Triples/values/Options. Results perform the core-equivalent BFS with valid-time filtering. References missing locally retry once with full=true; over 500,000 cached entities starts a new session. Transaction-local fast reads still decline. Malformed responses and unresolved full references return to fallback with fault diagnostics. Older revisions replace newer cache entries correctly.

Fresh final N2 gate: 6 tests passed (reach + codec; 122.92 s), 6,600 generated bases, 5,960 accepted bases and 29,800 full answer comparisons across initial/fresh/warm/two-root batch reads; declines: 380 interior-position, 260 irregular; zero faults. The randomized gate had 0 reference misses; targeted deterministic missing-copy recovery plus 50 concurrent cold pulls had 1 miss and 0 faults. Forced reset on a separate gateway with cap 2 passed (n2-reset2.log). All five executed mutants failed answer/coverage assertions: gateway valid filter, row retirement, record-time mapping, retraction-only revision, client valid filter. Source was restored; the final unmutated gate passed. See mutants.log and mutant-*.log.

Earlier N2 failures are retained: primitive-argument arity rejected by the Clojure compiler; malformed test transaction IDs; a targeted oracle fixture that dropped internal recordedPosition (corrected to pin the exact basis, matching the original DX-B1 fixture); and a reset-gateway startup raced a catalog deletion. None counts as an equivalence failure or successful mutation check.

N2 verdict audit additions: revision transitions compare actual values with fallback at the same pinned cut; mutation script requires nonzero test exit AND an AssertionError answer mismatch; forced reset compares fallback bytes after server-side cache clearing; the 50 concurrent requests use a newly generated session. Wire closures are compared as coverage sets because EAVT ref order differs from recordedAt/id order; client results independently restore the exact core BFS order. No production acceptance is claimed.

## N3

begin/transact now read d/db; connection-startup and scope initialization keep their explicit syncs. tx-data receives the cached scope ID for commits (the speculative d/with helper has an indexed fallback). Begin uses the cached scope ID. Normal reach checks a named position against the cached scope's position datom and only enters the wait loop when behind. The gateway records whether it waited. Transact returns time spent in d/transact/deref separately from staging and serialization. Elapsed gateway headers now include UTF-8 response encoding. DatomicClient exposes an optional observation callback with actual request start/end, bytes, gateway/transact microseconds, wait status, position and datom count.

request-index captures a fresh UUID, the database basis t, server request/completion timestamps, calls request-index then sync-index with a bounded wait. Invalid wait budgets are rejected. The indexing/timing integration test passed and verifies a fresh planted value through the same database afterwards. Host and VM epoch clocks differ by about 90 ms; tests compare server elapsed time with host monotonic elapsed time, not raw cross-machine epochs.

Final Datomic suite: 144 passed, 1 declared pre-existing signed-zero/int64 failure (145 total), n3-final.log. Reach gate again includes 6,600 bases and the cache transitions. Core reach/read-basis suites: 7 passed. SQLite, PostgreSQL, Cloudflare, FoundationDB, XTDB and QLever typechecks: all green (9 successful Turbo tasks including shared builds). Full lab/bench typecheck has unrelated existing audit-traffic JSON-narrowing errors; missing built declarations in its first attempt were addressed by building the existing packages. No package downloads occurred. Raw route oracle output from baseline/final tests is retained under route-oracles/ in durable evidence rather than git.

N3 verdict audit additions: the indexing test binds database, requested t, UUID-shaped job and fresh marker; validates same-server ordered timestamps and timeout range; transport timing tests require the actual begin and transact calls. Driver maintenance events count only completed jobs whose request AND completion timestamps fall inside the P1 measured window. Warm commit stage measurements follow in N4; a successful indexing API test is not a full P1 maintenance qualification.

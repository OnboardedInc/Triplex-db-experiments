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

## N4 runner

The runner is `lab/experiments/EXP-DX1/b2/bench.mjs`. It uses built public exports plus the actual world/commands/trace generators. Each phase takes the measurement lock (including its warm-up), caps its hold at 14m30s, captures stats for the four owned stack containers, and writes raw observations outside git. NS smoke wrapper: b2/ns-smoke.mjs. The first NS smoke attempt waited for the lock then failed before phases because the sandbox denied the existing host feed clock's read-only kern.bootsessionuuid query; its ERROR report is retained. A rerun has that read available. No maintenance-event claim derives from the failed attempt.

The benchmark's past-position and read-your-own-write calls use public Triples.reach, with the existing internal recordedPosition cut injected at the adapter boundary: public TemporalBasis intentionally does not accept recordedPosition. No public core temporal contract was changed. This limitation is explicit in the result metadata.

## N4 first complete attempt (baseline before follow-up optimization)

Measured head `5d3fdaee2c4b294d4517fb1dbef8ae712241e732`; exact source/build hashes, container IDs and raw observations: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B2/bench-1794261338251-452a53df-4043-47ae-9cb1-3db435c4f647`. All six steps completed. These are diagnostic numbers; several bars are missed.

Conditions: 2,000 subjects, 20 accounts. Postgres CPU 0 / 512 MiB cap; transactor CPUs 0,1 / Xmx2g / 3 GiB cap / index 128m–512m; writer CPU 2 and reader CPUs 3,4, each Xmx1g / 1500m cap. Postgres fsync, synchronous_commit and full_page_writes on; wal_sync_method=fdatasync. Each timed phase (including warm-up) held the shared measurement lock. `step*-stats.jsonl` records all four owned containers before each timed phase; other VM containers were not inspected because ownership permissions exclude them.

### Step 1

| Subjects | Accounts | Domain facts | Seed seconds | Facts/s | Bar |
|---:|---:|---:|---:|---:|---|
| 2,000 | 20 | 83,185 | 85.50 | 972.95 | Report |

### Step 2

20,000 warm-up + 20,000 timed pulls per mode; separate 30-second idle baselines. Body bytes exclude HTTP headers.

| Mode | p50 / p90 / p99 ms | Client CPU us/pull | Reader CPU us/pull | Pulls/reader CPU-s | Bytes/pull | Rows / entities | Gateway p50 us |
|---|---|---:|---:|---:|---:|---|---:|
| references | 2.79 / 4.65 / 6.90 | 830.26 | 1,271.32 | 786.59 | 3,634.97 | 429.88 / 91.44 | 668.00 |
| full | 4.59 / 10.68 / 17.10 | 3,916.47 | 1,667.30 | 599.77 | 82,839.65 | 429.88 / 91.44 | 852.00 |

Bars: single-client p50 ≤5 ms, p99 ≤25 ms; ≥1,100 pulls/reader CPU-second. References reduced body bytes 22.8x and client CPU 4.7x. Both modes had 0 refMisses, 0 faults and 0 declines. The single-client CPU bar was missed.

### Step 3

| Readers / threads | Pulls/s | Reader CPU-s | Pulls/reader CPU-s | p50 / p99 ms | Host CPU-s | CPU bar |
|---|---:|---:|---:|---|---:|---|
| 32 / 4 | 2,610.13 | 118.46 | 1,322.94 | 7.54 / 68.41 | 62.52 | ≥1,100 |

Each worker warmed 5,000 pulls (20,000 total) before 60 seconds of 8 closed-loop readers. Concurrent CPU efficiency exceeded the bar, but tails were substantially higher than single-client tails. This is not the 256-reader P1 qualification.

### Step 4

| Basis (5,000 pulls each) | p50 / p99 ms | Reader CPU us/pull | Client CPU us/pull | Declines |
|---|---|---:|---:|---:|
| recordedAt: {'position': 1040, 'instant': 1794261464428} | 2.07 / 6.07 | 938.55 | 587.00 | 0 |
| position: {'position': 1539, 'instant': 1794261484067} | 2.45 / 5.98 | 1,175.28 | 644.18 | 0 |

The record-time cut is halfway through seeding, so some sampled subjects did not yet exist. These rows do not establish a history-flatness ratio at equal world size.

### Step 5

| Mode | Samples | p50 / p90 / p99 ms | Maximum queue | p99 ratio | Bars |
|---|---:|---|---:|---:|---|
| commits | 3,000 | 17.36 / 29.94 / 52.73 | — | — | p50 ≤10, p99 ≤50 |
| openLoop | 3,291 | 2,287.96 / 5,680.31 / 6,549.70 | 254 | — | p50 ≤10, p99 ≤50 |
| openLoopWithReaders | 3,291 | 8,140.00 / 20,098.56 / 24,336.35 | 768 | 3.72 | p50 ≤10, p99 ≤50 |

Serial: 3,000 warm-up and 3,000 timed benchmark-shaped commands; exactly 2 HTTP calls per commit. Datoms p50/p90/p99: 301.00 / 658.00 / 1,100.00. Open loop: 3,291 Poisson offers over 60 seconds at expected 55/s, uniform over 200 subjects, admissionQueue=true. Both arms reuse the arrival schedule; command shapes are subsequent deterministic draws, not byte-identical replays. Queue length is all offered unfinished commands minus the active command, including subject ordering and adapter admission.

The baseline is already overloaded at 55/s; the 3.72x tail ratio cannot qualify reader/writer isolation. Writers target the first 200 subjects, whose worlds accumulate event refs throughout the experiment.

#### Commit breakdown

| Component | p50 ms | p99 ms |
|---|---:|---:|
| beforeMs | 0.22 | 0.75 |
| beginWallMs | 1.74 | 5.66 |
| beginGatewayMs | 0.54 | 3.18 |
| stagingMs | 2.81 | 11.16 |
| transactWallMs | 11.90 | 43.86 |
| transactGatewayMs | 8.89 | 39.13 |
| datomicTransactMs | 7.46 | 35.76 |
| afterMs | 0.13 | 0.29 |

Component medians are not additive. The 2.81 ms staging median, begin HTTP wall >1 ms, and transact non-engine overhead >1 ms require follow-up attribution. The 7.46 ms d/transact median and overloaded 55/s tail activate the optional N5 experiment.

### Step 6

| Checks | Visible | Waited at read gateway | Pull p50 / p99 ms | Correctness bar |
|---:|---:|---:|---|---|
| 2,000 | 2,000 | 16 | 8.20 / 68.56 | Every new stamp visible |

All 2,000 stamps matched their acknowledged commands at the exact returned internal position. Latency is higher than seed-only head pulls because the 200 hot worlds have accumulated live event entities. Raw witnesses bind each returned position to the expected and observed stamp.

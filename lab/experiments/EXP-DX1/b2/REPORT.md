# DX-B2 report

North star: P1/P4 exact subject pulls and P2 atomic commits on Postgres storage. Targets: lab/TARGETS.md. Diagnostic fast-forward work under PROTOCOL 0b; no acceptance or scorecard promotion.

Final result: N1–N5 implemented and correctness-gated. The final diagnostic run observed 3,461 pulls/read-gateway CPU-second, single-client pull 1.87/6.50 ms p50/p99, and serial commit 9.77/30.69 ms. The 55/s queue tail, writer/readers ratio and grown-world read-your-own-write tail remain misses. All created Docker resources were removed; no qualification or promotion is claimed.

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

## N4 follow-up and N3 attribution

The unfiltered v2 gateway was still parsing time bounds on scalar rows. Follow-up code parses bounds only for reference rows and uses primitive double bounds; no row filtering or traversal rule changed. Fresh read gate: 3 tests passed, 6,600 bases / 29,800 answer comparisons, expected 380 interior-position and 260 irregular declines, zero faults (readopt2-gate.log). A first return-hint placement produced AbstractMethodError; that failed attempt is retained in readopt-gate.log and was corrected before the successful gate.

The 3,000-warm-up/1,000-profiled-command attribution probe (200 stamp/address subjects, real command shapes; not an N4 replacement) is in `commit-probe-1794263164056-63fdf750-e078-47ef-945f-5f339ef13025/`. Medians: total 16.47 ms; staging 2.56 ms = begin decoding 0.042 ms + tagged row encoding 1.181 ms + remaining core staging 1.264 ms. Request serialization 0.697 ms, gateway JSON parsing 0.201 ms, HTTP/transport remainder 1.735 ms. V8 CPU samples identify encodeRow/decodeRow and stringifyExact among the largest active leaves. The >1 ms local codec cost is addressed by direct scalar and stored-domain validation before row-text construction, preserving long-column signed-zero canonicalization. Codec/client/value-domain unit gate: 117 passed.

Core staging lies in the unowned core transaction path; the task permits only named optional-member edits there. The >1 ms transport remainder is outside the gateway's parsed-request/response-ready interval. The alternative already-bundled Jackson parser prototype passed 10,023 assertions but was not integrated because the measured parser median is only 0.20 ms; its source and failed/successful unit attempts remain in durable evidence/parser-prototype and parser-unit*.log.

## N5 candidate and repeated attribution

N5 omits physical schema-version when it equals 1 and derives the asserting transaction from the f/id datom when asserted-in is absent. Readback keeps explicit non-default schema versions and supports legacy asserted-in facts. The native feed watches f/id for new rows and either witness for legacy rows, deduplicating dual witnesses. Full Datomic gate: 144 passed and only the declared pre-existing failure (n5-gate.log). JVM feed gate: 13 tests / 85 assertions passed, including new identity-only/dual-witness equivalence (n5-feed-unit3.log).

The JVM feed fixture exposed another merged URI-template remnant: feed_live.clj referenced removed main/base-uri. It now uses main/db-uri and main/uri-template. The first JVM attempt failed to compile that fixture; the second lacked its required DF01_RECORDED_PAGE output setting. Both failures are retained. Neither is counted as a successful feed gate.

The repeated 3,000-warm-up / 1,000-profiled-command probe is in `commit-probe-1794263835793-998e9d71-802c-4816-8582-15da1c148581/`, with pre-execution source/build copies and unchanged-source checks. Median row encoding fell 1.181→0.777 ms; remaining core staging 1.244 ms; request serialization 0.729 ms; gateway parsing 0.217 ms; transport remainder 1.742 ms. Median datoms fell 281→233 (17.1%). d/transact was 7.196 ms versus 6.948 ms in the control; total 16.315 versus 16.467 ms. This probe does not demonstrate an engine-latency benefit from N5. Its physical size reduction and unchanged correctness are established; full step-5 remeasurement follows. The original control probe bound only selected entrypoints, not a complete transitive snapshot; it is attribution evidence, not a production receipt.

## Final verification before the final warm run

Final unmutated Datomic suite: 144 passed / 1 unchanged known failure / 145 total, 179.77 seconds (`final-gate.log`). It includes 29,800 answer comparisons at 6,600 bases. All five final mutants failed content/coverage assertions (`final-mutants.log`, `mutants-20261109T224204Z-24714/`); production sources were restored before the final suite. Normal 50-pull concurrency: 0 concurrent reference misses; deliberate cache loss: 1 full retry. Forced cap-2 reset gate: 65 resets, 0 faults, 50 correct concurrent answers (`final-reset.log`, `final-reset-transitions.json`). The final stack is created from the restored committed production source.

The broader lab/bench typecheck remains red in unmodified files: audit-traffic.ts (13 JSON-narrowing diagnostics), round2.ts (18 JSON-narrowing diagnostics), and hs01-seed.ts (one possibly-undefined claim). There were no driver.ts diagnostics. The six other adapters' typechecks and the seven touched core reach/read-basis tests are green as reported above.

## Observation-to-verdict inventory (final)

These are diagnostic checks, not contract PASS receipts:

- `packages/datomic/test/reach.test.ts`: compares exact Triple content and BFS order against the fallback at the identical pinned basis; fresh UUID scopes and fresh clients/sessions bind each attempt; cache-transition cases exercise newer/older revisions, retraction-only changes, concurrent requests and resets. Fault/decline counters prevent silent fallback from counting as an accepted fast answer. Gateway closure coverage is checked independently.
- `packages/datomic/test/rowText.test.ts` and client/value-domain tests: codec round trips compare with the existing tagged codec; 10,000 seeded row fixtures and explicit rejection cases exercise the current source. Direct row-text validation still checks scalar types, exact safe long columns and the stored value domain.
- `packages/datomic/test/commit-fast.test.ts`: actual begin/transact request counts, duplicate/stale/lost-ACK outcomes and handle release are checked; indexing tests bind a fresh job to this scope, requested t, same-server timestamps and a fresh marker readback. The existing signed-zero/int64-domain failure remains excluded from success claims.
- `gateway/feed_test.clj`: current executable feed projection compares identity-only and legacy dual witnesses with the same expected record, plus ordering, deadline and unsupported-erasure cases. These are mock-peer unit checks, not a fresh two-process excision qualification.
- `b2/mutants.sh`: each changed current source must produce nonzero test exit AND an AssertionError answer/coverage mismatch; startup/transport failures cannot qualify. Each rerun gets its own retained directory; source restoration precedes the unmutated gate.
- `b2/bench.mjs`: assertions check completed public calls, positive measured CPU, zero fast-path faults/declines in the head runs, exactly two HTTP calls for each serial commit, and the exact expected stamp at every returned-position readback. Fresh UUID scopes, copied runner, source/build hashes, container/image IDs, cpusets, native cgroup counters, actual response headers and raw observations bind the measurements. There is no automated performance PASS verdict; tables show numbers beside bars.
- `b2/commit-probe.mjs`: attribution uses real public commands, checks actual call counts/stamp presence, retains a V8 profile and (in the later attempt) pre-execution source/build copies with unchanged-source checks. Its smaller fixture and the earlier control's partial binding make it diagnostic only.
- `lab/bench/driver.ts`: indexing witnesses require the correct database, an identified job, native requested t, completed=true, ordered server timestamps, and BOTH timestamps inside the measured P1 window. The gateway actually calls request-index/sync-index at that t. Incomplete or outside-window jobs never count. The short smoke observed five of six jobs completing; it is not a full P1 qualification.

## Declines, retries and limits

Gateway declines: rows-version not 2; sticky irregular time/position history; a non-head logical position without an exact physical transaction (including an interior cut/position zero); overflow on any visited entity; more than 5,000 unique entities or 100,000 scanned rows (the union for a batch page); nonempty row sets without a revision; invalid root/page/session shape. Empty or historically absent entities are inline revision-zero empty sets. Transaction-local adapter calls decline so staged reads keep the fallback path. Invalid inputs and unavailable future positions keep their typed gateway/read errors.

Client recovery: a missing/mismatched revision reference retries once with full=true; an unresolved full response or malformed/basis/coverage response increments faults and falls back. Server LRU eviction sends inline again. Server entry overflow resets the session and sends the whole response inline. The client rotates its session and clears caches when it observes more than 500,000 cached entities at the start of a pull. Transport/timeout/response-byte-budget failures remain read errors rather than semantic accepted answers. Cached Triples, nested values and Options are frozen.

No full 256-reader P1 run, production scale rung, P5 qualification, independent final review or scorecard promotion is claimed. The benchmark uses internal SPI position injection for exact-position public reach calls; no new public TemporalBasis member was introduced. No merge, push, deployment or package publication was performed.

## Final N4 warm results (retained N5 design)

Measured source head `9d5809fc183a2284f3365b0e5fe0ff10930c06f6`. Full raw evidence, runner, source/build hashes and container bindings: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B2/bench-1794264686047-2fbd8359-6b4d-4d93-b459-0d51b2de01bb`. This complete second attempt replaces the first attempt for the final design. Both attempts remain retained.

Conditions are the same requested topology listed above: PG CPU 0; transactor 0,1 (Xmx2g, 3g cap, index 128m/512m); writer CPU 2; reader CPUs 3,4 (both Xmx1g, 1500m caps). PG fsync, synchronous_commit and full_page_writes were on, wal_sync_method=fdatasync. Each step has its own `step*-stats.jsonl` start snapshot for all four owned containers. CPU is the read gateway cgroup alone, never the transactor/PG sum. Client CPU includes the public call and benchmark bookkeeping.

### Final step 1 — seed

| Subjects | Accounts | Domain facts | Seconds | Facts/s | Bar |
|---:|---:|---:|---:|---:|---|
| 2,000 | 20 | 83,185 | 51.51 | 1,614.89 | Report |

### Final step 2 — one reader

20,000 warm-up + 20,000 uniformly random timed pulls per mode; 30-second idle baseline for each.

| Mode | p50 / p90 / p99 ms | Client CPU us/pull | Reader CPU us/pull | Pulls/reader CPU-s | Body bytes/pull | Rows / entities | Gateway p50 us |
|---|---|---:|---:|---:|---:|---|---:|
| references | 1.87 / 4.27 / 6.50 | 709.29 | 901.42 | 1,109.36 | 3,634.97 | 429.88 / 91.44 | 446.00 |
| full | 4.15 / 9.92 / 15.04 | 3,865.58 | 1,399.04 | 714.77 | 82,839.65 | 429.88 / 91.44 | 738.00 |

Bars: p50 ≤5 ms, p99 ≤25 ms, ≥1,100 pulls/reader CPU-second. The reference mode observed all three bars, with little margin on the single-reader CPU bar. Full mode is a diagnostic bypass of references. Both had 0 reference misses, faults, resets and declines. References cut body bytes 22.79x and client CPU 5.45x. A single diagnostic run is not an independently verified qualification.

### Final step 3 — 32 readers

| Readers / threads | Pulls | Pulls/s | Reader CPU-s | Pulls/reader CPU-s | p50 / p99 ms | Host CPU-s | CPU bar |
|---|---:|---:|---:|---:|---|---:|---|
| 32 / 4 | 408,010 | 6,798.03 | 117.88 | 3,461.19 | 3.47 / 26.25 | 84.88 | ≥1,100 |

Each thread warmed 5,000 pulls before its eight closed-loop readers ran for 60 seconds. Reader CPU was about 1.96 cores of the two-core cpuset; host CPU about 1.41 cores. The 26.25 ms concurrent p99 is reported explicitly; this is not a 256-reader P1 run.

### Final step 4 — past bases

| Basis | Cut | Samples | p50 / p99 ms | Reader CPU us/pull | Client CPU us/pull | Declines |
|---|---|---:|---|---:|---:|---:|
| recordedAt | 1794265563933 | 5,000 | 1.00 / 5.84 | 592.25 | 533.88 | 0 |
| position | 1539 | 5,000 | 1.04 / 5.82 | 619.90 | 507.46 | 0 |

The record-time cut is halfway through seed; the position cut is exactly 500 subject commits before the seed head. Some subjects did not yet exist at these cuts. No equal-world history-flatness conclusion is drawn.

### Final step 5 — commits

| Mode | Samples | p50 / p90 / p99 ms | Max queue | p99 ratio | Bar |
|---|---:|---|---:|---:|---|
| commits | 3,000 | 9.77 / 17.18 / 30.69 | — | — | p50 ≤10, p99 ≤50 ms |
| openLoop | 3,291 | 25.16 / 69.29 / 177.86 | 15 | — | p50 ≤10, p99 ≤50 ms |
| openLoopWithReaders | 3,291 | 28.77 / 126.48 / 353.21 | 23 | 1.99 | p50 ≤10, p99 ≤50 ms |

Serial has 3,000 warm-up then 3,000 timed real buildTraceCommand commands, all exactly two HTTP calls. Datoms p50/p90/p99: 249.00 / 538.00 / 896.00. Median datoms fell 301→249 (17.3%) from the first N4 run. Both 60-second open-loop arms use 3,291 scheduled Poisson offers (expected rate 55/s) over 200 subjects, with admission enabled. Latency starts at the intended arrival and includes all waiting; no early timer releases or censored queue waits are omitted.

The serial bars were observed, but the 55/s p99 bar was missed in both arms. Queue maxima improved from 254/768 to 15/23, but remained material. The 1.99x writer-tail ratio is above P1's 1.25x reference and does not qualify isolation. Arrival schedules match; command shapes are subsequent deterministic draws and hot worlds accumulate events, so this is the requested first look, not a matched-clone P1 experiment.

#### Final commit breakdown

| Component | p50 ms | p99 ms |
|---|---:|---:|
| beforeMs | 0.18 | 0.42 |
| beginWallMs | 1.05 | 3.26 |
| beginGatewayMs | 0.34 | 2.17 |
| stagingMs | 1.44 | 4.77 |
| transactWallMs | 6.73 | 26.37 |
| transactGatewayMs | 5.00 | 24.18 |
| datomicTransactMs | 4.21 | 22.71 |
| afterMs | 0.11 | 0.22 |

The final d/transact median is 4.21 ms (first run 7.46 ms). Staging remains 1.44 ms; the attribution probe isolates core work and local encoding as above. Begin HTTP wall is 1.05 ms; its gateway work is 0.34 ms. Transact HTTP wall includes the native transaction, gateway preparation, serialization and VM transport. Core and transport costs are reported rather than changing the core transaction contract outside the permitted optional-member scope. Medians are not additive. No causally isolated speedup is claimed from these two whole-design attempts.

### Final step 6 — read your own write

| Checks | New stamp visible | Read gateway waited | Pull p50 / p90 / p99 ms | Bar |
|---:|---:|---:|---|---|
| 2,000 | 2,000 | 15 | 4.87 / 11.63 / 50.27 | Every stamp visible; pull 5/25 ms |

Correctness was observed in all 2,000 cases at the returned internal position. The grown-world p99 of 50.27 ms missed the 25 ms pull reference. Raw witnesses retain each position, expected stamp, observed stamp and wait status. These hot worlds have accumulated live event refs throughout 14,582 measured/warm-up commands; this is not the original seed-only world size.

## Remaining questions

- Why do 55/s queue tails and the writer/readers ratio remain high despite passing serial medians? The next work needs admission/core staging and engine pause attribution under a matched cohort; no dropped work or deadline censoring was used here.
- Can grown-world cross-peer p99 be reduced while retaining the full event closure? The final 2,000 correctness checks do not meet that latency reference.
- Independent final review, full P1/P5 windows and scale qualification remain outstanding. No contract or scorecard promotion was attempted.

## Cleanup and retained evidence

All DX-B2-created containers, networks and volumes were removed after clients exited. `evidence/DX-B2/CLEANUP.json` records empty remaining-owned lists. Source/build snapshots, tests, first failures, profiles, raw measurements and logs remain in the durable evidence directory. The committed SHA256SUMS manifest and EVIDENCE.md index locate and verify them.

## Pin hash inventory

No modified path appears as a file pin in the current lab/acceptance text/JSON inputs, and lab/acceptance is unchanged. `HASH-CHANGES.json` lists every changed existing source path with its full old and new SHA-256 (including unpinned paths) for the contract builder; no repinning was performed.

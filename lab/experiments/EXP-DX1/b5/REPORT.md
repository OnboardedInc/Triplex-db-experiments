# DX-B5 — lean layout (work in progress)

North star: P2 small atomic commits and P5 seed throughput, retaining exact P1/P4 cuts (`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`).

## L0 checkpoint

Implemented process-wide timestamp registration and ordered HTTP sends (ACKs still overlap), per-client sequenced gateway `d/transact-async` submission with a 20 ms predecessor wait, transactor rejection of replay-safe clock regressions, typed ClockConflict transport, bounded clock catch-up and existing callback replay. Low-level non-replay-safe commits retain irregular-scope behavior. Registration is shared across nested savepoints; aborted callbacks release their registration.

Offline suite: 132 pass, 35 native tests skipped. Native complete suite is running on the owned CPU-5 SQL-storage stack, ports 8505/8506, transactor Xmx1g and gateway Xmx768m. No milestone acceptance or performance PASS is claimed. The first typecheck found an exact-optional state member error; fixed before rerun. The first build command used an unsupported pnpm exec option; retained failure, rerun using local binary succeeded.

Observation-to-verdict audit: `CommitOrder.test.ts` asserts actual send order, equal-clock registration order, overlapping unacknowledged sends and cancellation unblock on newly constructed queue entries. Existing integration tests use fresh UUID scopes and read back exact positions/content. These are developer checks, not acceptance receipts. No new PASS/receipt emitter exists. Native results, multiprocess gate and timing remain pending.

Evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/` (stack source preimages, SQL configuration, exact container IDs, image IDs, durability settings); initial logs also in parent `evidence/DX-B5-*.log`.

`lab/acceptance/` is unchanged. Final hash inventory and cleanup pending. L1–L6 not yet complete.

## L1/L2 implementation checkpoint

Added immutable rows-version 3 selection, indexed row values, a retirement-marker attribute, lean row-only assertions and retractions, serial-point live-ID conflicts and uniqueness seeks. Legacy remains the default; existing scopes are never converted. Lean readers use immutable cuts when eligible and native Datomic row history otherwise, including explicit retirement markers and interior logical cuts. Begin prefetch, entity/entity-list/id/pattern scans and history dispatch through the same visibility/masking rules. Reach, journal and command routes admit version 3. Native `q` and old `log` explicitly return HTTP 409 LayoutUnsupported; a typed ReadError subclass retains route identity.

One deterministic differential smoke passed against a native SQL-storage stack. The final 300-scenario run and the parameterized lean integration suites are in flight. No L1/L2 gate acceptance is claimed yet.

Design deviations found during implementation:

- Datomic coalesces an assertion and retirement in the same physical transaction. To preserve the existing adapter's born-retired history, lean keeps that row text plus a marker; cut/reach readers exclude marked retained rows. This exception is required for nested/staged semantics. Ordinary old-row retirement still retracts its row datom.
- Ordered timestamp registration applies to replay-safe callbacks. Unsafe SPI callbacks can deliberately stage fixed timestamps and await another commit; ordering those would deadlock existing savepoint tests. Clock rejection is narrower still: a replay-safe callback must contain a public journal before the adapter promises that replay will re-read the runtime clock. Raw SPI import timestamps cannot advance by callback replay. Non-public callbacks retain the existing irregular flag behavior.

Observation audit additions: the differential test compares ordered full row answers and metadata from fresh UUID scopes with identical row IDs and seeded public runtimes, not just counts. It compares receipt positions and public journals; row-closure assertions compare genuine cached TripleRows with getByEntities rows. Native stack source is copied before startup and health binds that source hash. The passing smoke is diagnostic developer evidence, not a contract PASS. First failures remain in durable logs.

## L3/L4/L5 implementation checkpoint

The differential generator contains 300 deterministic scenarios, patterned on the existing reach generator, plus explicit interior-position retirement markers, retraction-only commits, shared timestamps, irregular SPI history, seeded public journals/claims and duplicate commands. It compares all storage read families and full row closures. The first full attempt was interrupted by an OOM-killed 1.5 GiB transactor container while two native suites ran concurrently. No completed 300-scenario verdict is inferred. The replacement retains Xmx1g, raises only the container limit to 2 GiB, and runs the differential gate alone.

Added optional getReachRows/Many to the core adapter interface; other adapters remain unchanged. The Datomic entity cache retains immutable decoded TripleRows beside Triples. Row closures reuse the existing traversal/order. The W0 Datomic branch in w0-public uses one reach-many request per page and reconstructs portable page-wide BFS order, deduplicating shared entities while retaining genuine recorded positions. A new 64-subject page comparison exercises the actual new branch (the old H2 helper remains a portable fallback).

Native unsupported-route/born-retired smoke passed on the replacement stack. The first W0 test import failed because W0 dist had not yet been built; the offline W0 build has now run. Native lean suite first pass: 25 passed / 8 failed, including the known int64-domain failure, explicit unsupported-q cases, a route-label mismatch, a clock-retry exhaustion during concurrent CPU-5 load, and the inherited B4 untyped-journal decoder bug. Route labels and filtering untyped journal rows before branded Triple decoding have been corrected; no successful final-suite claim yet.

## Fresh gate results (before final sealing)

- Differential native run `diff300-2.log`: **300 scenarios, 84,000 ordered answer comparisons, 5,400 accepted fast cuts and 5,400 physical-row closure comparisons; passed** in 250.71 s. This is a developer equivalence gate, not independent acceptance.
- Both-layout 64-subject page test `page5.log`: two tests passed, exact row order/content at past and head cuts, one HTTP request per page.
- Native four-process clock gate `clock4-2.log`: 2,000 commands from four processes, 162 clock replays, zero record-time fast declines, every receipt's IDs found in its exact fallback cut. Passed. Replay count exceeds the initial expectation of a few under the CPU-5 development profile.
- Nine requested adapter/core typechecks: 12 Turbo tasks successful (`adapters.log`). No other adapter source changed.
- Lean supported-suite pass `lean-final1.log`: 31 passed, two native-q tests explicitly skipped, two failures (known int64-domain case and one-process ordering). Other q scenarios now assert LayoutUnsupported while retaining row assertions.
- The ordering diagnosis captured zero client timestamp-send regressions but three native clock replays in one 3,200-command run. The send boundary was corrected from request construction to the actual HTTP socket `finish` event. ACKs still overlap. Fresh socket-boundary test/client checks: 98 passed before adding the dedicated delayed-flush case. The strict native one-process rerun is pending.

The inherited B4 untyped journal row failure is fixed by filtering physical row metadata before constructing branded Triples, retaining the same typed-journal result. Legacy stored facts are unchanged.

The corrected strict one-process gate `order-finish1.log` passed in 125.96 s: **3,200 commands, 16 clients, zero clock replays, zero declines**, exact positions plus exact getByEntities-based fallback rows at every receipt's record time. The process send-order diagnostic also recorded zero timestamp regressions. Three semantic mutants were rejected by actual assertion differences (`mutants.log` and `mutants/*/test.log`): ignoring an explicit retirement position, removing the lean valid-time predicate, and treating an irregular lean scope as regular. Each mutant used a freshly started, healthy native stack, and each owned stack was removed.

The L6 wrapper is queued on the shared measurement lock. The lock is currently held by another measured lab run (its implementation uses an empty lock directory); it has not been removed or adopted. The wrapper creates no stack until it acquires the lock. Initial logs formerly named `evidence/DX-B5-*.log` have been retained under `evidence/DX-B5/initial-logs/`.

The final offline suite passed 139 tests with 40 native cases explicitly skipped (`offline-final.log`). The broad bench typecheck retains pre-existing diagnostics in audit-traffic/round2 and initially exposed missing inference in the new page reader. The page reader now supplies its physical-row return type through the existing built core runtime entry point; the focused bench typecheck passes (`focused-bench-types2.log`). The original missing XTDB build was generated from unchanged source before the focused check.

Expanded final differential run `diff300-final.log`: **300 scenarios, 84,000 comparisons, 5,400 accepted fast cuts and 5,400 row-closure checks; passed** in 315.71 s. This run includes populated entity-type patterns, empty retirement IDs and born-retired rows, and exercises the final history-based identity reservation. The fresh CPU-5 stack was removed before clearing the private functional guard.

Full lean suite `final-lean2.log`: **173 passed, 2 failed, 2 intentionally skipped / 177**, including seven touched core tests. The failures are the declared int64-domain case and the unchanged indexing-duration cross-clock assertion. The expanded 16-client gate completed all 3,200 commands with **171 clock replays, zero send-timestamp regressions, zero fast declines and exact record-time fallback rows**. This does not meet the initial expectation of zero replays under contention; the earlier isolated gate observed zero. The two intentionally skipped cases require native Datalog, which lean explicitly does not implement; other native-q tests assert the typed unsupported result. The first final legacy run predates the separate clock budget and had 174 pass / 3 fail (known domain, cross-clock timing, exhausted clock retries); it is retained and needs a focused current-source rerun.

Final expanded mutant rerun `mutants-final.log`: all three again fail content assertions. The targeted mutation run starts at scenario 1 (no born-retired fixture obscuring the intended marker mutant); the full 300-scenario run uses the default start of 0. Each mutated gateway source tree and its native test log remain retained. The outer ad-hoc zsh wrapper used the reserved name `status` after the completed mutants, so it failed to clear its private functional guard; actual empty Docker container/network/volume readbacks were checked before manually removing that owned guard. No measurement lock was released by that recovery.

The L6 runner now measures a genuine 64-subject W0 seed through the existing `seedW0` command plan, then calls the actual optimized `publicSweep` page reader on the read peer, comparing every returned row with the portable page and requiring one HTTP request. The earlier `rowPage` step is separately labelled a raw NS-world reach page, not substituted for the W0 page.

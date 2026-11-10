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

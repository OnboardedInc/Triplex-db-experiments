# DX-B5 — lean layout (work in progress)

North star: P2 small atomic commits and P5 seed throughput, retaining exact P1/P4 cuts (`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`).

## L0 checkpoint

Implemented process-wide timestamp registration and ordered HTTP sends (ACKs still overlap), per-client sequenced gateway `d/transact-async` submission with a 20 ms predecessor wait, transactor rejection of replay-safe clock regressions, typed ClockConflict transport, bounded clock catch-up and existing callback replay. Low-level non-replay-safe commits retain irregular-scope behavior. Registration is shared across nested savepoints; aborted callbacks release their registration.

Offline suite: 132 pass, 35 native tests skipped. Native complete suite is running on the owned CPU-5 SQL-storage stack, ports 8505/8506, transactor Xmx1g and gateway Xmx768m. No milestone acceptance or performance PASS is claimed. The first typecheck found an exact-optional state member error; fixed before rerun. The first build command used an unsupported pnpm exec option; retained failure, rerun using local binary succeeded.

Observation-to-verdict audit: `CommitOrder.test.ts` asserts actual send order, equal-clock registration order, overlapping unacknowledged sends and cancellation unblock on newly constructed queue entries. Existing integration tests use fresh UUID scopes and read back exact positions/content. These are developer checks, not acceptance receipts. No new PASS/receipt emitter exists. Native results, multiprocess gate and timing remain pending.

Evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/` (stack source preimages, SQL configuration, exact container IDs, image IDs, durability settings); initial logs also in parent `evidence/DX-B5-*.log`.

`lab/acceptance/` is unchanged. Final hash inventory and cleanup pending. L1–L6 not yet complete.

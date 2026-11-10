# DX-B4: indexed journal reads and north-star diagnosis

North star: P1/P2/P3/P4/P5, measured against `lab/TARGETS.md`, under PROTOCOL 0b. Diagnostic development evidence; no contract PASS or scorecard promotion.

## T1/T2 implementation

Optional adapter hooks retain the portable path on `undefined`. Core reuses its existing journal decoder, exclusive cursor and page limit; `waitMs` is validated as an integer in 0..30000. The Datomic gateway reads immutable indexes, writes JSON directly, and long polls its local peer every millisecond. Transaction-local calls decline. Command lookup uses the unique claim index. Receipt bodies use indexed entity row datoms; portable fallback remains available.

A physical Datomic commit may contain several logical Triplex transactions. New commits link all journals via `:triplex.tx/journals` and retain their shifted logical positions on `:triplex.journal/position`. The feed seeks physical positions with `(inc after)` and sorts logical journals within each commit. This preserves nested commits and interior cursors. Suppressed journals have no link and are skipped. A new scope marker proves that the links cover every commit; older scopes decline. Published journal retraction/extension sets a sticky feed-irregular flag, so current row texts are read only under an append-only proof. Rows-version, irregular and overflow checks also decline.

Initial gate: 3 tests passed, including deep-equal public pages over 100 seeded scopes, nested commits, retractions, commands/unknown IDs, head and future cursors; long-poll wake/idle deadline; unpublished claim isolation. The first random fixture failed on an incorrect receipt field. A second run compared equal pages but correctly rejected its zero-fast-answer coverage (differing nested timestamps set irregular). Both failures are retained; the deterministic-clock fixture exercises accepted answers. Stronger final gates and benchmark results follow below.

## Observation-to-verdict audit

- `packages/datomic/test/journal-fast.test.ts`: compares complete public records and ordered pages/next against a separately constructed adapter with both optional hooks removed and indexed receipt reads disabled. New UUID scope per scenario, this attempt's gateway, generated command/input stream, and quiescent common head bind the comparison. An explicit accepted-answer count prevents fallback-only success. Long-poll and visibility assertions are from requests/commits made in the same test, not historical outputs.
- `packages/core/test/transaction-fast.test.ts`: checks exact fallback invocation counts, optional-hook arguments, null-versus-undefined semantics, and typed bounds errors before I/O using freshly constructed mocks/runtime.
- Existing Datomic tests: actual native writes and exact content readback on fresh scope identities; the known signed-zero/int64 failure remains a failure. Offline HTTP fixtures are transport/codec tests, not engine qualification.
- `b4/run.mjs`: records raw driver exit and phase-boundary route counters, exact stack identities/cpusets/durability and current working diff. It adds no semantic PASS verdict. The driver's independent correctness/bar/oracle outputs are reported with their invalid reasons, not inferred from exit zero.

## Outstanding in this intermediate commit

Full package suite, mutants, T3 scans and T4 north-star runs are still in progress. No writer-throughput claim is made yet. No `lab/acceptance/` edit, merge, push, publication, download or unrelated engine action was performed.

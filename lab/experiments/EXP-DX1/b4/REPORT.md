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

## T3 finding and correction

The first measured 2,000-subject diagnostic reached `p4h1` before being stopped. Pending at phase starts: warmup/baseline/L1/L4/L16/L64/L256 = 0; L1024 = 337; recovery = 1181; p4mix = 1859; p4h1 = 919. `max-readers=64` caps the labels L256/L1024 to 64 actual readers. Scan counters at stop: 40 scan calls begun, 3,931,914 enumerated fact-index datoms; some scans were still in flight, so completed per-pattern counts are smaller. The identified pattern is `attribute=:_tx/command-id` from public `transactionByCommand`, core `TriplesLive.ts` fallback; completed calls walked about 200,000 datoms each.

Cause: timestamp regression sets scope `irregular` during concurrent writes. The initial command and current-receipt routes unnecessarily reused the feed's timestamp eligibility guard, so duplicate/lost-ACK resolution declined and entered the whole-store fallback. T3 separates eligibility: commands and current receipt bodies require row/link completeness and no journal modification, but not timestamp monotonicity. Feed eligibility still declines the irregular flag exactly as requested. A fresh regression test asserts exact record equivalence and exactly `command` + `journal` HTTP routes after timestamp regression.

A separate inherited harness blocker prevents a valid feed measurement. `lab/bench/lib/datomic-publication.ts:24` requires `position === input.position`; DX-B3 intentionally returns a shifted final position with a checked delta. The observer throws after the real commit, triggering operation resolution but recording no publication witness. The feed then stops when it reaches such a position. `b4/repro-publication.mjs` reproduces this using the real Datomic client's ACK validator: returned position 2, submitted position 1, delta 1 is accepted; installing the unchanged harness observer throws `Datomic publication response/input binding mismatch`, with zero witnesses. This file is outside the named bench edit scope and remains unchanged. Thus the stopped run cannot establish P3 or writer isolation with a continuously running feed.

## Final functional gates before post-fix measurement

`dxb4-final-tests.log`: 175 passed, 1 failed / 176 tests, 17 files, 142.10 seconds. Datomic: 162 passed plus the declared pre-existing signed-zero/int64-domain failure. Touched core: 13 passed. The journal property test reports 100 scopes, 700 accepted direct feed pages and 600 command comparisons. It includes unjournaled SPI commits, nested positions, retractions, shared timestamps, head/future cursors, retired-journal decline, long poll, unpublished claim isolation and timestamp-regressed command eligibility. Both required mutants fail content checks; gateway startup failures are excluded. Nine package typechecks pass (`dxb4-adapters.log`). No other adapter source changed.

Additional audit entry: `b4/repro-publication.mjs` checks the exact accepted ACK fields and exact observer exception/count in a fresh local HTTP fixture. It demonstrates a harness contract mismatch, not native performance or acceptance. T3 scan statistics count actual enumerator datoms, including work from unfinished requests; internal entity-API materialization performs additional work that these counters do not quantify.

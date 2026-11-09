# EXP-GS12F: typed rejection of unholdable assertion values

North star: correctness floor for P2, SCOPE 2.4 (no silent precision loss), NORTH-STAR P2 and TARGETS GS.12. Builder work on `exp/GS12F-typed-unholdable`, based on `8d098718`. Independent review and promotion belong to the orchestrator.

**Result: implementation complete; verification partial.** The core fix, contract 0.4.0 and tests are ready for independent review. Final XTDB live tests pass. QLever live tests timed out at both 30 and 120 seconds per test; no QLever semantic acceptance is claimed. Datomic is absent from this branch.

## Implementation

Read `1d191991:lab/scenarios/12-audit-march-3/fix.patch` and its instrumented probe; implemented against this checkout rather than applying that patch. `invalidAssertValue` checks every assertion with `Schema.is(TripleValue)` before adapter transaction callbacks, command claims, position allocation or insertion. Both TriplesLive and KvTriplesLive use it. `assert` and `assertBatch` preserve InvalidTripleError instead of wrapping it in WriteError. The public effect error types and dependent config, validation, derivation and consumer-checkpoint unions propagate the typed failure. Existing storage capability rejection of a valid integer in legacy adapters is unchanged.

Acceptance contract version is 0.4.0. Generated files come from build_contract.py; no hand-edited hashes or publication anchors. The frozen original 44 conformance cases remain unchanged; separately exported `valueLimitCases` and `exactIntegerLimitCase` are reusable new tests.

## Test matrix

- All six W01b invalid integers: int64 high/low overflow, leading zero, negative zero, leading plus, exponent notation. Also wrong primitive payloads and unknown/null variants. Test all three public write entry points, mixed-batch atomicity, unchanged positions, absent receipts and corrected-command reuse.
- Exact-integer lanes: signed long minimum/maximum, both sides of ±2^59 and the boundary itself, and safe-integer edges around ±2^53. Check public get, receipt identity/value and recorded/valid-time readback.
- W0 kinds: cents/minutes at and outside their limits (both numeric JSON representation and integer wire encoding on exact lanes); datetime scalars including fractional milliseconds; dates/instants at and outside 2000–2099, preserving microseconds lexically; text at and beyond length/ASCII boundaries; enum strings; booleans; references; erased-marker JSON. W0 domain validity is distinct from storage representability: the storage layer preserves representable out-of-domain values and does not clamp them.
- Explicit tests use XTDB/QLever public runtimes, KV/SQLite integration, PostgreSQL integration and Cloudflare workerd. Optional DuckDB and FoundationDB cases are in `other-adapters.test.ts`, requiring explicit owned artifacts/cluster configuration; they never provision services. No Datomic package exists in this branch, so the signed-long test is reusable but a Datomic public-path run remains blocked on integration.

## Execution evidence

Final command results are in [exits.txt](evidence/exits.txt); the final heavy runner exits 1 because QLever failed. Node v22.23.2, pnpm 10.11.0. [source.json](evidence/source.json) fingerprints the final attempt's source and runner before execution. The post-run report changes only documentation, not tested implementation or test predicates.

| Check | Observed result | Evidence |
| --- | --- | --- |
| Target package build | exit 0 | [build.log](evidence/build.log) |
| Core typecheck | exit 0 | [typecheck-core.log](evidence/typecheck-core.log) |
| Workspace typecheck | 32/32 tasks successful | [typecheck.log](evidence/typecheck.log) |
| Core tests | 850/850 | [unit-core.log](evidence/unit-core.log) |
| XTDB offline tests | 62 passed, 90 skipped | [unit-lanes.log](evidence/unit-lanes.log) |
| QLever offline tests | 31 passed, 24 skipped | [unit-lanes.log](evidence/unit-lanes.log) |
| KV/SQLite new boundary tests | 4/4 | [integration-values.log](evidence/integration-values.log) |
| Cloudflare workerd | 3/3 including both new cases | [cloudflare.log](evidence/cloudflare.log) |
| Existing SQLite conformance suite | 1 suite passed | [sqlite.log](evidence/sqlite.log) |
| XTDB expanded live boundary matrix | 3/3, 180.43 seconds total | [xtdb-live.log](evidence/xtdb-live.log) |
| QLever expanded live boundary matrix | **0/3; each timed out at 120 seconds** | [qlever-live.log](evidence/qlever-live.log) |
| Optional DuckDB/FDB cases | 5 skipped; not verified | [other-adapters.log](evidence/other-adapters.log) |
| Package consumer | 13 tarballs and clean consumer verified | [pack.log](evidence/pack.log) |
| Contract 0.4.0 | byte-identical regeneration/verification | [contract.log](evidence/contract.log), [contract-verify-final.log](evidence/contract-verify-final.log) |

Post-run [engine status](evidence/engines-after.log) reported both residents READY. The QLever timeout cause is **not determined**; health alone does not explain or validate these tests. No further timeout increase or semantic weakening was made. PostgreSQL integration was authored but not run: this lab has no PostgreSQL slot and Testcontainers lifecycle is outside the permitted engine tool. Full root `pnpm check`, browser E2E, full G1, and full GS.12 were not run. Package artifacts remain in `.cache/gs12f-pack/triplex-pack-0X0T9t` inside this worktree.

All failures and subsequent attempts are retained under `evidence/`. Attempt 1 exposed real KV/SQLite transaction-callback wrapping and a test-helper type error; moved validation outside those callbacks. Attempt 2 passed KV/SQLite boundary tests and Cloudflare but found the helper's generic Effect.suspend needed explicit error parameters. Live tests in both attempts were interrupted after those known defects; their incomplete runs are not evidence of round-trip acceptance. Attempt 3 passed the corrected core and offline matrix, plus 3/3 XTDB live tests. Its QLever cases each timed out at the package default 30 seconds (no equality verdict). The QLever wrapper now uses the same 120-second integration-test budget as XTDB. Coverage review added explicit scalar datetimes and integer-encoded W0 cents/minutes endpoints, and the final attempt reruns the full expanded matrix. A QLever-only retry was queued but cancelled before execution to consolidate these additions. This is a test invocation limit, not a production latency SLA.

The first pre-claim attempts failed during setup (Vite cache destination, missing local links and pnpm's rejection of --store-dir on run/exec); the successful attempt invokes the installed Vitest binary directly. Frozen installation used exactly the required project store, with no lockfile/dependency changes. Broader commands use lab/bin/heavy.mjs; source fingerprints and command exit codes are retained, not treated as semantic qualification receipts.

## PASS audit

1. `packages/core/test/value-limits.test.ts`: only the test runner judges success. Content: exact InvalidTripleError class plus zero transaction-callback and claim counters for each invalid integer/write API; a valid signed-long control must reach the instrumented claim. Freshness: a new runtime/counter per test. Binding: imports this checkout's source, uses literal inputs and an instrumented adapter, claims no engine/slot evidence.
2. `packages/testkit/src/valueLimits.ts` `verify`: content checks the error class/field/value, stored facts, position and receipt absence, corrected command acceptance, or literal expected round-trip values and transaction IDs. Freshness: writes/reads execute in that invocation, each engine test uses a random scope, baseline tests create fresh layers, external FDB uses a random subspace. Binding: all calls use one injected Triples layer; exactIntegerLimitCase binds receipt txId and historical basis to the returned transaction. These are builder tests, not acceptance closures.
3. Test wrappers (XTDB, QLever, KV/SQLite, PostgreSQL, Cloudflare, optional DuckDB/FDB): success comes only from running those effects; disabled adapters are reported skipped. Fresh per-test scope/layer/DO/subspace binds observations to the selected runtime. No Datomic PASS is synthesized.
4. `gates.sh`: records raw command exits only, never emits a semantic PASS or qualifies any obligation. Source manifest hashes the source tree at attempt start, excluding evidence outputs. Engine URLs are explicit shared dev residents; no exclusive slot is claimed. These logs do not prove immutable physical-container identity or constitute source/slot-bound acceptance receipts. Existing contract generator is unchanged apart from the version and performs its own validation/byte-identical regeneration. Independent source/slot/input-bound acceptance and full GS.12 reruns remain owed.

5. The modified expectation in `packages/xtdb/test/integer-storage.test.ts` now requires InvalidTripleError rather than WriteError. Its existing assertions check unchanged position and exact blob readback within a fresh random runtime scope. It remains a separately authored regression; the final focused live run exercises the new shared cases, and does not claim this older skipped case passed.

## Not done / open questions

No merge, push, package publish or promotion. No changes to GS.03 supersession, signal-ack, W0 rules, or the oracles (B3 is a separate task). No Datomic public adapter exists at this source base. Optional native/external adapters are unverified unless an explicit fresh result above says otherwise. The contract still describes QLever's native 60-bit rejection range despite the existing adapter's lexical int64 storage channel; reconcile that declaration separately with independently reviewed boundary observations. No year-one load, performance or complete GS.12 outcomes-match-golden claim is made. Schema validation alone does not certify arbitrary JSON or nonfinite-number transport; those broader existing codec semantics remain outside this focused integer regression.

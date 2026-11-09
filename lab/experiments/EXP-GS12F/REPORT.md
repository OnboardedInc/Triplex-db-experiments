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

## Round 2: contract ownership and offline QLever proof

North star: the same P2 correctness floor under SCOPE 2.4 and TARGETS GS.12. This section supersedes round 1's contract-version and QLever live-qualification statements; the original observations above remain historical evidence.

### Contract restoration

Separate commit **564d79b3** restores **every tracked path under `lab/acceptance/` to main `62bcc8a325ceb07ba391c160c4ec83d3c8af320c`**, including main's pending-ruling updates. `git diff main -- lab/acceptance/` is empty. There was no regeneration in round 2. GS12F does not own a contract version or repin; **0.4.0 is reserved for RT01**, and the contract builder owns the next repin. All core implementation and earlier evidence are retained.

The original regeneration's explicit implementation pin delta was:

| Pinned path | Old SHA-256 (8d098718) | New SHA-256 (1e22e79a; unchanged implementation) |
| --- | --- | --- |
| `packages/testkit/src/index.ts` | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `432cec5c6aa33150c5c6f6c54091184edcaece3395ee3c809524c5502594a6d6` |

For completeness, that regeneration also moved these *derived contract metadata* pins. Both have now been restored with the contract; neither is an implementation pin the fix asks to retain:

| Reverted metadata path | Old SHA-256 | Rejected regeneration SHA-256 |
| --- | --- | --- |
| `lab/acceptance/budgets.json` | `c09b5257c08d050d9c99d8e1595cd4817b9c8c1337afba291109e7fd0c7a8159` | `5ac9f83af125c50fbf04a62669c2b18e7ac4eaba023b560bfe1fb57e833503d3` |
| `lab/acceptance/load-contract.json` | `c54af6122604a7cbe49c4de41ba658f9076cea8701f90cc4e3583f1cad009428` | `0eed6e91719ec5f4b30d0d55cc9d656012232054f3a9c64a7bb53ba7ab0212a4` |

[Pin inventory](evidence/round2/pins.json) extracts these deltas from the two historical generated obligation files, verifies the retained implementation pin against current bytes, and supplies old/new hashes for the individual changed core source files as supplementary source deltas. Those core-file rows are explicitly distinguished from direct contract pins; no new pin is invented or published.

### Live evidence is DIAGNOSTIC

Both the 30-second and 120-second QLever live attempts are **DIAGNOSTIC**, per **Q91a and [R35](../../research/R35-qlever-delta-cost.md)**: qlever-dev serves reads from its update delta, so those attempts do not qualify a built-base QLever composition. Their raw timeout logs and nonzero exits are unchanged. They establish neither a semantic rejection failure nor a semantic PASS. [Classification records](evidence/round2/live-classification.json) bind each annotation to its exact historical log hash and timeout text. No resident restart, rebuild, new live run or timeout increase was performed in round 2.

### Offline coverage and validation

`packages/qlever/test/value-limits-offline.test.ts` adds three offline cases, without HTTP or an engine:

1. Compose the actual `makeQleverStorageAdapter` with core's public Runtime over an instrumented offline client. Initialization must make exactly one query. Each of the six W01b invalid integers is then sent through `assert`, a mixed `assertBatch`, and a mixed `transact` with a command ID: all **18 writes must return InvalidTripleError with the original field/value**, with no subsequent query, update or command request.
2. Call QLever `packValue` directly for the same six invalid payloads: canonicality failures must throw TypeError and overflow must throw RangeError. Direct row decoding must also refuse both int64 overflow texts.
3. Exercise QLever `packValue`, `encodeRow` and `decodeRow` over **53 vectors**: signed-long endpoints, ±2^59 and adjacent integers, ±2^53 and adjacent integers, W0 cents/minutes endpoints, string/date/instant/text/enum limits, numeric datetime bounds and fractional milliseconds, booleans, refs, erased JSON markers and a blob descriptor. Compare decoded complete rows and the packed value fields to the original inputs, including Object.is for numbers/datetimes. This proves the codec path, not SPARQL execution, durable receipts or historical engine reads.

Final round 2 results: **3/3 targeted offline cases**, **34 passed / 24 skipped** across the full QLever offline suite, and **1/1 core pre-claim regression**. The strengthened final tests pass in [qlever-suite.log](evidence/round2/qlever-suite.log) and [preclaim.log](evidence/round2/preclaim.log); the combined heavy command exited 0. [capture.log](evidence/round2/capture.log) is empty on successful pin/restoration/classification capture. The 24 skipped tests are live cases, not offline successes. No engine was used. Production packages were not rebuilt or repacked in round 2 because their implementation is unchanged. The initial targeted offline run passed 3/3 ([offline.log](evidence/round2/offline.log)); the full offline suite reruns the strengthened field-to-original-input checks. No production implementation changed after round 1. Only the new test, evidence capture and this appended report were added after the separate restoration commit.

### Round 2 PASS audit

- **Offline preflight assertions:** content checks the exact error class/field/value and request counters, including a positive initialization witness; freshness comes from a new client, runtime and counters in this test invocation; binding is to the actual QLever adapter/core composition and six literal payloads, with no engine or slot claim.
- **Codec assertions:** content compares original input fields, exact integer text and decoded full rows, and requires specific exception classes; every row is freshly packed/encoded/decoded in this invocation; binding is to this checkout's `rdf.ts` and literal vectors. No oracle or engine result is substituted.
- **Pin/restoration capture:** reads immutable Git preimages for the historical hashes, checks the current retained pin bytes, and asserts the current tracked contract diff against the captured main commit is empty. These are content/binding checks, not a new contract build or semantic PASS. The capture is executed in this round's heavy job.
- **DIAGNOSTIC annotation:** checks each retained raw log for the exact timeout and three failures, records its SHA-256, and explicitly labels it historical. It makes no fresh-engine or qualification claim and never relabels a timeout as success.
- **Test runner results:** fresh offline invocations only. [Execution source hashes](evidence/round2/execution-sources.json) bind the test, actual adapter/codec/core inputs, capture script and lockfile before the final checks. No physical-slot identity is claimed for offline work.

### Remaining boundaries

No Datomic integration, full GS.12, durable QLever commit/history validation, engine performance claim, promotion, push, or merge. The contract builder must repin the implementation path above in its next version. Independent review remains required. Round 1's remaining external/native-adapter and nonfinite/JSON transport limits remain unchanged.

## Round 3: one exact value-domain catalog and canonical KV integers

This section supersedes round 1/2's limited JSON/nonfinite coverage and acceptance of QLever integers outside its declared range. Review `verify/GS12F` at `6bab84e` identified real defects: shape checks admitted lossy JSON and nonfinite values, canonical KV integers failed inside a backend callback, and the QLever range declaration was unenforced. The review probes are retained byte-for-byte in [round3](round3/README.md), with runnable local copies. The memory-integer probe now requires a successful callback, commit and exact readback because rejecting canonical values was the defect. No review observation is retroactively changed.

### Implementation and explicit bounds

`packages/core/src/ValueDomain.ts` defines the sole adapter codec-admission catalog. `StorageAdapter.valueDomain`, public pre-claim validation and adapter packing/decoding use it. The core row decoder also uses the selected adapter's domain; adapters without the new property retain a compatibility domain honoring their existing supported-kind list. KV compositions use the memory domain. FoundationDB uses the same KV logical codec; its native service and physical key/transaction constraints are not qualified here.

| Codec profile | Exact integer admission | Decimal precision/scale |
| --- | --- | --- |
| Memory/KV, FoundationDB/KV, XTDB, DuckDB | canonical decimal text, [-9223372036854775808, 9223372036854775807] | unsupported (`null`) |
| QLever | canonical decimal text, [-576460752303423488, 576460752303423487] | unsupported (`null`) |
| SQLite, PostgreSQL, Cloudflare SQL | integer kind unsupported by their current schemas | unsupported (`null`) |

All profiles declare finite binary64 numbers in [-Number.MAX_VALUE, Number.MAX_VALUE], rejecting negative zero; datetime values use finite binary64 milliseconds in [-8640000000000000, 8640000000000000], including fractional milliseconds and rejecting negative zero. Strings, refs and blob text fields admit well-formed Unicode up to **1,048,576 UTF-8 bytes**, excluding NUL. This is an explicit portable codec-admission cap, not a measurement of an engine's largest physical string. Blob sizes admit safe nonnegative integers [0, 9007199254740991], excluding negative zero. Boolean values remain exact booleans. No new decimal wire kind is introduced: tagged decimal values, including `16.50` and `16.501`, reject typed rather than pretending to preserve decimal precision.

JSON admits ordinary object/array data to depth 128, finite numbers other than -0, and the same text constraints recursively. Undefined, bigint, functions, symbols, accessors, hidden properties, custom prototypes/toJSON, malformed Unicode, sparse/decorated arrays and cycles reject typed. Tagged value envelopes must be ordinary data with the expected fields. The generated reserved transaction journal permits 16 additional nesting levels around already-validated user JSON; public preflight always uses the base depth. This prevents an admitted depth-128 value failing late when its journal envelope is encoded. Empty blob filenames are preserved by the SQL codecs.

KV META records add integer tag 7 without renumbering existing tags. Integer index keys add tag 8 with an unsigned, biased big-endian int64 payload, preserving order and adjacent values above 2^53. No Number conversion is used. Existing META records remain readable. The callback-path integer prohibition is removed, so canonical integers now commit instead of producing a late WriteError. This change does not add KV integer Datalog arithmetic/query support.

### Regression coverage and observed failures

The persistent [integration boundary suite](../../../test/integration/test/value-domains.test.ts) exercises all eight catalog entries through real codecs. It compares decoded values to the **original inputs**, including signed integer endpoints, adjacent unsafe integers, binary64 endpoints/subnormals, date endpoints/fractions, UTF-8 text limits (ASCII and astral Unicode), booleans, JSON depth, and blob size/text/empty-filename bounds. One past each declared boundary, unsupported integer/decimal families and lossy representations must throw InvalidTripleError. Every invalid vector is also sent through assert, mixed assertBatch and mixed transact against the selected domain: the exact original error value and zero callback/claim counters are required. Memory additionally commits its accepted endpoints and checks get, journal receipt/transaction identity and a historical read. The integration package runs this suite during ordinary checks; the dedicated round3 configuration also runs the copied QA probes.

The shared testkit invalid-value cases now cover nonfinite numbers/dates, -0, malformed/oversized text, lossy JSON, invalid blob sizes and unsupported decimal values. Its exact-integer lane case consults the selected domain: out-of-range QLever values must reject typed without a position or receipt; supported values must retain exact get/receipt/history representations. Historical QLever storage/query/outcome fixtures are adjusted to the admitted 60-bit endpoints, without changing the separate aggregate-result int64 tests.

Intermediate [attempt-1](round3/evidence/attempt-1/exits.txt) passed probes, offline XTDB/QLever, KV/SQLite integration and Cloudflare conformance, but **failed** the core large-string regression under the initial 64 KiB cap and TypeScript checks in the new integration test. Both failures are retained. The cap is now 1 MiB, preserving the existing >64 KiB test, and the harness uses correctly branded entity IDs and an explicitly widened effect list. An earlier `integer-2.log` is an incorrect Vitest cwd invocation, not semantic evidence. Initial targeted probe results are historical intermediate observations; final results below bind the final source.

No files under `lab/acceptance/` are changed in round 3. Contract construction and repinning remain the contract builder's responsibility. Earlier QLever live timeouts remain **DIAGNOSTIC** under Q91a/R35; no live QLever retry, engine reservation or container lifecycle action is performed.

### Final round 3 results

**Stable attempt 3 completed with every recorded command exit 0.** [Exit record](round3/evidence/attempt-3/exits.txt), [source manifest](round3/evidence/attempt-3/sources.json) and [end-of-attempt source check](round3/evidence/attempt-3/source-stability.json) bind the run to base `5610572e` plus the exact changed/new source bytes. The captured source files were unchanged at attempt end. The manifest also checks the immutable review-probe preimages at `6bab84e` and verifies no acceptance changes since round 2. These are offline builder checks, not a physical-slot-bound acceptance receipt.

| Gate | Fresh result | Evidence |
| --- | --- | --- |
| Copied QA probes + all-profile boundary suite | 34/34 | [probes.log](round3/evidence/attempt-3/probes.log), [raw probe observations](round3/evidence/attempt-3/probes/) |
| Core unit suite | 850/850 | [core.log](round3/evidence/attempt-3/core.log) |
| XTDB offline suite | 62 passed; 90 live/optional skipped | [xtdb.log](round3/evidence/attempt-3/xtdb.log) |
| QLever offline suite | 34 passed; 24 live skipped | [qlever.log](round3/evidence/attempt-3/qlever.log) |
| KV/SQLite public value-limit integrations | 4/4 | [integration.log](round3/evidence/attempt-3/integration.log) |
| SQLite conformance wrapper | 1/1 | [sqlite.log](round3/evidence/attempt-3/sqlite.log) |
| Cloudflare workerd conformance/value-limit wrappers | 3/3 | [cloudflare.log](round3/evidence/attempt-3/cloudflare.log) |
| DuckDB direct codec regressions | 2/2 | [duckdb-codec.log](round3/evidence/attempt-3/duckdb-codec.log) |
| Changed package/dependency builds | 9 tasks successful | [build.log](round3/evidence/attempt-3/build.log) |
| Workspace TypeScript checks and prerequisite builds | 32 tasks successful | [typecheck.log](round3/evidence/attempt-3/typecheck.log) |
| Package consumer check | 13 tarballs and clean consumer verified | [pack.log](round3/evidence/attempt-3/pack.log) |

Attempt 2 passed the semantic/build/type/package gates but its source-stability check correctly failed: final cleanup edits changed the shared wire-limit import, KV format comment and DuckDB duplicate range check during execution. It is retained as **intermediate**, not the final source-bound result. Attempt 3 repeats all gates after freezing those source files and reports no source drift. A previously refused attempt did not execute gates while disk free was below 5 GiB. [Owned-cache cleanup](round3/evidence/cache-cleanup.json) retained historical tarballs and raw logs while removing regenerable consumer trees/download cache; the earlier report's statement that those consumer trees remain present is historical. Final pack artifacts are in `.cache/gs12f-pack/triplex-pack-wtZ0tT`.

### Updated pin inventory (no repin)

The published contract's direct implementation-pin drift is still the original testkit barrel export; round 3 does not edit that barrel. Current published pins remain untouched:

| Pinned path | Published old SHA-256 | Candidate new SHA-256 |
| --- | --- | --- |
| `packages/testkit/src/index.ts` | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `432cec5c6aa33150c5c6f6c54091184edcaece3395ee3c809524c5502594a6d6` |

For completeness, round 2's restoration also advanced this administrative pin from the original experiment base to then-main; this is **restored main content**, not a new round 3 edit or requested implementation repin:

| Restored administrative path | Original base SHA-256 | Restored main SHA-256 |
| --- | --- | --- |
| `lab/acceptance/RULINGS-PENDING.md` | `b86222c537567c78ecd5e53e23f9450f0e48e7d8ff54b7f533d3678243a862c0` | `ced5c9496bcd596cce85973f91ec8f32426adc4f0d049e2ecac288a3a224ab37` |

The [final source manifest](round3/evidence/attempt-3/sources.json) lists **every changed/new implementation and test path**, including the core files, with its old SHA-256 from original base `8d098718` and current SHA-256 (`null` old hash means a new file). `publishedPinDrift` separately extracts exact published path/hash entries from the unchanged obligations; it finds only the testkit barrel above. XTDB's whole-file source changes are inventoried there even though its published outside-block mutation fixture pins specific unchanged code blocks rather than a whole-file hash. This is an inventory for the contract builder, not generated acceptance metadata.

### Round 3 PASS audit

1. **`test/integration/test/value-domains.test.ts` codec/boundary assertions.** Content: compare the original tagged input to decoded actual codec output with strict deep equality; require InvalidTripleError for every outside value, including one past numeric/text/date/depth/blob/integer bounds. Independent literal vectors retain unsafe adjacent integers, finite/subnormal values and unsupported decimal kinds. Freshness: each encode/decode is executed in this invocation; counters/runtimes are newly created per profile. Binding: the profile and actual encoder/decoder are selected together from this checkout; the source manifest pins the catalog, test and codec edits. No engine, native FoundationDB key-limit or durable QLever claim is made.
2. **The same suite's pre-claim and memory transaction assertions.** Content: check exact error class and identity of the original error value plus zero transaction/claim counts for all three write APIs. Accepted memory controls must return the original value from get, receipt changes and historical reads; receipts must have the returned transaction ID. Integer tuple bytes must order signed endpoints and distinguish adjacent unsafe integers. Freshness: new runtimes/backends and literal commands per test; binding: one selected domain/runtime, returned fact IDs, transaction ID and historical basis. Stubbed pre-claim tests never claim successful adapter durability.
3. **Runnable copied QA probes/controls.** Content: require typed failures and unchanged actual XTDB/QLever transaction/claim counters; QLever's literal outside-60-bit cases reject; memory unsafe integers must commit through the real instrumented callback and read back exactly. The controls execute shared testkit effects. Freshness: clients, runtimes, counters and observations are created by the current test; binding: actual adapters/codec source, literal inputs and fresh per-attempt observation directory. Immutable original probe copies are checked against `6bab84e`, and deliberate import/output/memory-probe changes are documented. Initial observation files are not substituted for final attempt outputs.
4. **`packages/testkit/src/valueLimits.ts`, modified core integer and adapter regression tests, and wrappers.** Content: the shared checks require the exact error class/field/original value, unchanged position/facts, no command receipt, reusable corrected command identity and exact supported get/receipt/history values. The lane-specific integer case reads the selected adapter domain and requires typed refusal outside it. Core's positive KV regression requires exact committed int64 readback. Updated QLever/DuckDB direct-codec tests require the new typed class; QLever decode also rejects outside its declared bound. Freshness: effects execute in fresh test layers/scopes, no historical output adoption. Binding: returned IDs/positions/receipts and the injected adapter; skipped live tests are reported skipped. No separate int64 aggregate-result admission is weakened.
5. **`round3/gates.sh`, `capture.py` and source-stability check.** Command exits are retained individually and any nonzero exit fails the runner; they are not semantic acceptance verdicts. Capture hashes the changed/new source bytes at attempt start, binds the Git base/review preimages, inventories published pin drift, and asserts the acceptance diff is empty. End checking compares current bytes to that exact manifest and fails on drift (demonstrated by attempt 2). Freshness: a new attempt directory and timestamp; binding: local source paths and offline inputs only, explicitly no physical slot. Build/typecheck/package-consumer successes mean those checks succeeded, not that GS.12 or a lane qualified.
6. **Cleanup record.** This is an operational record, not a semantic PASS. The deletion scope is asserted to lie under this worktree's `.cache`; only terminal generated consumers and the npm download cache were removed. Free-space values were read around the operation, and tarballs/logs were retained. No engine state, source, unknown evidence or shared dependency store was removed.

### Remaining limits

No acceptance edit, version bump, repin, merge, push, publish or promotion. No live XTDB/QLever/Datomic, PostgreSQL service, native DuckDB or native FoundationDB run in round 3. There is no Datomic public adapter in this branch; no Datomic result is fabricated. Codec checks and FoundationDB's shared KV logical encoding do not establish physical native engine limits. No full root `pnpm check`, browser suite, full G1 or full GS.12 `outcomes-match-golden` execution is claimed. KV integer Datalog support and decimal wire/precision support remain outside this fix. The deliberate finite portable string/date/depth admission limits may reject previously attempted inputs beyond them; such writes now fail typed before claims. Independent adversarial review and the contract builder's next repin remain required.

## Round 4: sparse arrays, complete XTDB journals, PostgreSQL precision and FoundationDB bytes

North star: P2's correctness floor under [SCOPE 2.4](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md). This section supersedes round 3's blanket fractional-datetime and FoundationDB logical-only admission statements. QA [review round 2](/Users/sam/projects/triplex-db-2/.claude/worktrees/verify-gs12f/lab/verify/GS12F/VERIFY-round2.md) at `baad2f3` identified four reproducible mismatches. The original independent, matrix, backend, transport and live controls are copied byte-for-byte as `round4/*.original.txt`; the capture checks them against that immutable Git commit. Runnable copies retain the original error and readback checks, with output/import/format adjustments and the changed PG/FDB admission expectations documented below.

### Bounds table and sources

The executable table remains [ValueDomain.ts](../../../packages/core/src/ValueDomain.ts). It now exposes datetime integer-millisecond precision, maximum array holes, the journal nesting allowance, optional encoded-storage budgets and source references alongside the existing bounds. Scalar integer ranges, binary64 bounds, blob size bounds and unsupported decimal precision/scale remain as in round 3.

| Entry | Profiles | Actual admission / bound | Codec or limit source |
| --- | --- | --- | --- |
| Array holes | Every profile | **0**; every own array property except `length` must be a canonical, safe index below `length`, with an enumerable data descriptor. One missing element, including a hole disguised by numeric non-index properties, rejects typed. | `ValueDomain.ts` `losslessJson`; actual XTDB/QLever canonical JSON encoders reject sparse arrays, whereas JSON.stringify would replace holes and drop extra properties. |
| User JSON nesting | Every profile | **128** edges; 129 rejects before claims. | Shared preflight and packers, exercised over both nested records and arrays. |
| Stored journal nesting | Every profile | Public bound **128 + 16 = 144** for generated `:_tx/` envelopes; stored depth 145 rejects. Public admission remains 128. | `storedValueDomain`; `packages/xtdb/src/XtdbStorageAdapter.ts` `insert` now passes it to `packValue`, matching other insertion and decode paths. |
| Datetime precision | PostgreSQL | **Whole milliseconds**, within ±8,640,000,000,000,000. Fractions including ±0.5, the smallest positive subnormal and the next binary64 value above 1 reject typed. | [Shared SQL DDL](../../../packages/sql/src/schema.ts) declares `value_datetime BIGINT`; PostgreSQL documents BIGINT as a whole-number type. [PostgreSQL numeric types](https://www.postgresql.org/docs/13/datatype-numeric.html). |
| Datetime precision | Memory/KV, FoundationDB/KV, XTDB, QLever, SQLite, Cloudflare, DuckDB codec | Finite binary64 milliseconds within the same range, preserving fractional values and rejecting -0. | Actual binary META / numeric column / lexical codecs; fresh XTDB live fractional readback and SQLite/Cloudflare integrations. Native DuckDB/FDB storage remains separately unqualified. |
| Text UTF-8 bytes | FoundationDB/KV | **4,096 bytes per field**, well-formed Unicode, no NUL. This is an explicit conservative scalar admission policy, **not** the engine's physical text ceiling. Complete encoded-record restrictions below apply jointly. | Native FDB key/value limits require a narrower physical composition than the previous 1 MiB logical-only profile. Codec and public wrapper tests cover the policy endpoint and typed refusal beyond it. |
| Text UTF-8 bytes | Other profiles | Existing **1,048,576-byte** portable admission cap. | Actual pack/decode controls; XTDB live strings/refs/blob fields at 1 MiB. |
| Encoded key | FoundationDB/KV | **10,000 bytes including the configured subspace**. | [FoundationDB known limitations](https://apple.github.io/foundationdb/known-limitations.html); `bufferKvTransaction` checks complete encoded index/META/claim keys. |
| Encoded KV value / META | FoundationDB/KV | **100,000 bytes**, reduced by a smaller configured `maxValueBytes`. META headers count. | Actual [FdbKvBackend.ts](../../../packages/foundationdb/src/FdbKvBackend.ts) `DEFAULT_MAX_VALUE_BYTES` and `assertValueWithinLimit`; same documented [FDB limit](https://apple.github.io/foundationdb/known-limitations.html). |
| Encoded mutation budget | FoundationDB/KV | Default **8,000,000 estimated bytes**, reduced by smaller configured `maxTransactionBytes`: each mutation counts key + value + subspace + the wrapper's **64-byte** overhead estimate. | Existing FDB wrapper defaults / `MUTATION_BYTE_OVERHEAD`; below the documented 10,000,000-byte native affected-data cap. This is an application mutation budget, not a qualification of every native read-conflict/transaction overhead. |

These are intersecting restrictions: for example, three individually valid FDB blob text fields can produce a journal index key beyond 10,000 bytes. That combination must fail typed before claims; scalar component codec round trips alone do not admit it. Default and configured storage budgets are injected from the actual backend into `KvBackend.valueDomain`, used by public KV preflight, binary META serialization and transaction admission. Oversized META includes identifiers and `createdBy`; journal keys include escaped JSON and envelope fields. Subspace bytes are counted explicitly. The table's storage budget is null for the other profiles; this round does not invent unmeasured native size ceilings for them.

### Implementation

The sparse-array guard now tests canonical indices against array length and safe-integer representation in addition to property cardinality. Keys `4294967295` and `9007199254740993` can no longer stand in for element zero. All profiles reject the original object with InvalidTripleError before lossy JSON encoding. The copied actual memory/SQLite controls and actual XTDB/QLever adapter controls retain their original checks.

XTDB's missing actual `insert` packing call now uses the same stored journal domain as decoding. Maximum-depth user JSON can therefore be committed with its generated journal; the global user limit was not raised. PostgreSQL's packer and pre-claim guard both consume the table's integer-millisecond requirement, retaining the existing schema rather than introducing an unreviewed migration. The shared testkit excludes fractional positive datetime controls on PostgreSQL; fractions are explicit negative controls instead.

FoundationDB now has a physical admission path in `kv/layers/valueAdmission.ts`. It first executes a **read-only, buffered size preview outside the backend's write callback**. IDs and clock values are sampled/memoized for replay, and the preview uses the maximum representable commit position for byte sizing. The preview performs actual encoding of the user facts, META headers, all indexes, command/position records and generated journal. It does not flush mutations or certify constraints/preconditions from preliminary reads. Logical checks rerun in the real transaction.

The real transaction also buffers and validates **all actual mutations before flushing any**, including command claims. If existing data changes after the preview, the actual byte check still returns InvalidTripleError without flushing the buffered claim; a new core regression demonstrates this. Buffer reads and ordered ranges see prior buffered writes/deletes, including reverse/limit behavior; the underlying transaction remains authoritative for commit/conflict behavior. The preview may perform backend read transactions. The guarantee tested is no entry into the **write callback** for deterministic admission failures and no native claim/write before actual byte validation, rather than a claim of zero read transactions in every case. Unbounded memory/KV backends retain their original single-callback path.

Invalid physical sizes preserve the original assertion value through the typed channel rather than an Effect defect or WriteError. The backend's generic raw-byte guard remains in place. A raw KV service is not a TripleValue API. No native cluster durability or FoundationDB performance improvement is inferred from the substituted transport.

### Test coverage and retained attempts

The persistent integration bounds suite now checks dense arrays against decorated sparse arrays on every codec, public vs stored journal depth (128/129 and 144/145), and PostgreSQL's precision restriction, including the next representable binary64 value above an integral millisecond. The independent matrix retains literal endpoints rather than reading expected caps from the table; its PG fractions move from positive vectors to explicit typed-negative vectors, and FDB uses the new literal 4 KiB scalar policy. The original 1 MiB FDB counterexamples remain explicit early-rejection controls over the **actual backend wrapper**.

`round4/physical.test.ts` additionally runs that actual wrapper with only its native transport substituted. It commits admitted string/ref/JSON/blob endpoints, verifies fresh get/receipt values and transaction IDs, and checks the real encoded META endpoint at **100,000 bytes** and one byte beyond. It similarly exercises an encoded journal/index key at **10,000 bytes including subspace**, then one byte beyond. Oversized META, escaped journal/index combinations and large JSON must return the original typed error without invoking the write callback or writing claims. Direct encoder/buffer controls cover smaller configured caps, subspaces 0/23, exact key/value endpoints, and the **8,000,000 / 8,000,001** mutation-budget boundary. The transport substitute retains committed bytes for positive readback; it is not a FoundationDB cluster.

Four persistent core regressions check preflight rejection before callback/claim, actual-state revalidation before claim flush, ID/time replay, and buffered point/range/delete behavior. The full core suite is now 854 tests.

Initial `types-initial.log`, `types-2.log` and `types-3.log` retain the incremental type-check outcomes. The first copied-control run retains the old PG probe's uncaught packing exception after the fix correctly began rejecting fractions. Its runnable copy now explicitly requires InvalidTripleError and records that rejection; its immutable original remains unchanged. `controls-2.log` retains a failed key-endpoint fixture that tried to exceed the independent 4 KiB nested-string policy; the corrected fixture distributes context across entity/attribute/type fields within their limits and observes the complete key's exact byte bound. `kv-admission-1.log` retains invalid branded IDs in the new test fixture; valid IDs fix test setup without changing implementation. Later controls pass. `live-1.log` is an earlier successful live control; final source-bound live evidence is separate below.

### Final round 4 validation

Final **attempt 3** records zero exits for every gate and no source drift: [exits](round4/evidence/attempt-3/exits.txt), [execution-source manifest](round4/evidence/attempt-3/sources.json), [end check](round4/evidence/attempt-3/source-stability.json). It binds the exact changed/new inputs to base `811a42a8` and checks the immutable controls at `baad2f3`. Old source hashes are from original experiment base `8d098718`; new paths have null old hashes. The capture log's `git show` messages for missing original-base paths are expected and recorded as null preimages, not silently treated as existing old content. Attempt 1 also passed its gates; attempt 2 repeats the matrix after adding the smallest-subnormal and adjacent-binary64 PostgreSQL precision negatives. Attempt 3 is the final rerun after making the FDB wrapper defaults and mutation-overhead estimate aliases of the shared table, eliminating duplicate limit literals. Historical results are not substituted for the final attempt.

| Fresh gate | Result | Evidence |
| --- | --- | --- |
| Independent controls, physical wrapper tests, persistent all-profile matrix | **55/55 tests** | [probes.log](round4/evidence/attempt-3/probes.log) |
| Independent literal endpoint assertions | **196 exact codec round trips; 257 direct typed rejections; 771 public typed rejections**, zero write callbacks/claims in that negative matrix | [per-profile observations](round4/evidence/attempt-3/probes/) |
| XTDB actual public endpoint control | **16/16 vectors** with exact get, receipt and historical readback; one test passed | [live.log](round4/evidence/attempt-3/live.log), [returned identities](round4/evidence/attempt-3/probes/xtdb-live-boundaries.json) |
| Core unit tests | **854/854** | [core.log](round4/evidence/attempt-3/core.log) |
| XTDB offline tests | 62 passed; 90 live/optional skipped | [xtdb.log](round4/evidence/attempt-3/xtdb.log) |
| QLever offline tests | 34 passed; 24 live skipped | [qlever.log](round4/evidence/attempt-3/qlever.log) |
| KV/SQLite value limits; SQLite conformance | 4/4; 1/1 | [integration.log](round4/evidence/attempt-3/integration.log), [sqlite.log](round4/evidence/attempt-3/sqlite.log) |
| Cloudflare workerd controls | 3/3 | [cloudflare.log](round4/evidence/attempt-3/cloudflare.log) |
| DuckDB direct codec controls | 2/2 | [duckdb-codec.log](round4/evidence/attempt-3/duckdb-codec.log) |
| Package/dependency builds | 10 tasks successful | [build.log](round4/evidence/attempt-3/build.log) |
| Workspace typechecks/prerequisite builds | 32 tasks successful | [typecheck.log](round4/evidence/attempt-3/typecheck.log) |
| Tarballs/clean consumer | 13 packages verified | [pack.log](round4/evidence/attempt-3/pack.log) |

The independent total decreases from the review's 199 positive vectors to 196 because PostgreSQL's three fractional/subnormal positive controls now correctly lie outside its declared storage precision. Four explicit PostgreSQL fractional/adjacent values are added to the negative matrix; the persistent suite also checks those values. All other independent scalar-family controls remain. This does not claim decimal support: precision/scale remains unsupported.

The live gate used shared `xtdb-dev` at **5470**, without lifecycle changes or an exclusive slot. Its exact container ID, image and start time match in [before](round4/evidence/attempt-3/container-before.log) and [after](round4/evidence/attempt-3/container-after.log); comparison exited zero. The random scope and every returned transaction ID remain in raw observations. These are focused correctness observations on the resident, not performance qualification or a full GS.12 receipt. QLever live remains DIAGNOSTIC under Q91a/R35; no QLever live run was made. Final package artifacts remain in `.cache/gs12f-pack/triplex-pack-Arpb6E`.

Targeted authored-source lint finished with zero warnings/errors ([lint-final.log](round4/evidence/lint-final.log)); the complete root check is not claimed.

### Contract and pin inventory

`lab/acceptance/` is **unchanged relative to `811a42a8`**; no version, ruling, generator, pin or generated artifact was edited. The published direct implementation-pin drift remains the same original testkit export, with no additional direct-pin drift introduced in round 4:

| Pinned path | Published old SHA-256 | Current candidate SHA-256 |
| --- | --- | --- |
| `packages/testkit/src/index.ts` | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `432cec5c6aa33150c5c6f6c54091184edcaece3395ee3c809524c5502594a6d6` |

The historical administrative `RULINGS-PENDING.md` restoration's `b86222c537567c78ecd5e53e23f9450f0e48e7d8ff54b7f533d3678243a862c0` → `ced5c9496bcd596cce85973f91ec8f32426adc4f0d049e2ecac288a3a224ab37` is unchanged and is not a new round 4 edit. [The final manifest](round4/evidence/attempt-3/sources.json) supplies old/new SHA-256 for every changed/new source path and separately inventories published pin drift. The XTDB change is limited to its import and actual `insert` pack call; published outside-block fixture blocks are untouched. The contract builder owns the next repin.

### Round 4 PASS audit

1. **Executable table/admission predicates (`ValueDomain.ts`, META codec, `valueAdmission.ts`).** These permit encoding, not semantic acceptance. Content: validate the original value's kinds, exact numerical/text/array/depth properties, then actual encoded META/index/journal/key/value bytes plus configured subspace and mutation-budget arithmetic. Freshness: computed from the current invocation's values and encoded records, not a previous plan/receipt. Binding: selected backend domain/configuration and current original-value subject. Preliminary logical results never settle constraints/preconditions; the real transaction reruns checks and revalidates every actual mutation before flushing any claim. The changed-actual-data regression demonstrates that a successful preview alone cannot permit an oversized native write. Native transport/cluster behavior beyond these checks is not certified.
2. **Persistent integration boundary tests and four new core buffer/admission tests.** Content: compare original tagged values against real codec outputs; assert typed rejection at/one past the declared limits, including zero vs one hole, public/stored nesting and PostgreSQL adjacent precision. New core tests require no flushed claim after preview or actual-state byte failure, identical replayed IDs/time, and exact point/range/delete results before/after flush. Freshness: fresh backends, counters and runtime effects in each test. Binding: the selected profile, literal values, actual codec/helper source and same transaction buffer. No mock successful commit is promoted to native durability.
3. **Copied `independent.test.ts`, `matrix.test.ts` and original FDB endpoint control.** Content: exact original values/errors and zero callbacks/claims; successful memory integer writes must traverse the real callback and read back exactly. The PG probe compares the checked-in BIGINT DDL with actual table/packer rejection. Matrix counters increase only after checks succeed; literal limits remain independent of the catalog. Freshness: new runtimes/clients/scopes and fresh per-attempt output directory. Binding: actual adapters/codecs, immutable original-control preimages at `baad2f3`, and documented runnable-copy changes. An unsupported family or a skipped native test is not counted as a round trip.
4. **New physical FDB controls and transport substitute.** Content: execute the actual wrapper's guards and public KV composition; bind receipt transaction ID and exact get/receipt value to the current command; observe exactly 100,000 META bytes and 10,000 key+subspace bytes, then require one-byte-past rejection before write callback/native sets. Additional controls exercise configured caps and exact mutation-budget arithmetic without flushing failed buffers. Freshness: a fresh wrapper/database map/runtime; counters are sampled around each command. Binding: actual wrapper/source, selected cap/subspace and original input object. The substitute retains committed bytes only for local readback; it does not assert native FDB rollback, recovery or cluster acceptance.
5. **XTDB live control.** Content: a vector is recorded only after exact get, matching receipt transaction ID/value and historical readback against its returned basis. Freshness: random new scope and fresh real commands. Binding: captured source, URL 5470, exact resident identity/image/start time before and after, literal vectors and returned IDs. Sixteen successes qualify this focused control only; they do not close GS.12, G1 or a performance obligation.
6. **Shared testkit, core/adapters and existing conformance wrappers.** Unchanged success predicates execute afresh; new PG controls consult the same declared precision and preserve original-value equality and no-position/no-receipt checks. Fresh per-test layers/scopes bind observations to their selected composition. Live/optional skips remain explicit. Builds, typechecks, direct DuckDB tests and clean package consumer verify only their stated boundaries.
7. **Capture/runner/report.** Each real command has its own raw output and exit. The source manifest hashes actual current changed/new inputs and immutable review preimages, checks the acceptance diff, and the end check requires identical source bytes. Container comparison checks exact captured bytes. Fresh attempt directories/timestamps bind the final evidence; no historical attempt is relabeled fresh. The report preserves failures and distinguishes logical codecs, the real wrapper with substituted transport, and the actual XTDB resident. No formal acceptance PASS or promotion receipt is generated.

### Not done / open boundaries

No acceptance edit, repin, version bump, merge, push, publish or promotion. No native PostgreSQL or FoundationDB cluster, native DuckDB or Datomic run. PostgreSQL's BIGINT mismatch is resolved by documented/source-backed early rejection, not a new schema or a server-execution claim. FoundationDB's wrapper/encoded-byte proof uses the documented native size limits and a substituted transport; native conflict-range overhead, retry/durability behavior and performance remain unqualified. The new bounded-FDB admission path adds a preliminary read/encoding pass; its performance cost is not measured. No full root `pnpm check`, browser suite, full G1 or GS.12 `outcomes-match-golden` run. Decimal support and KV integer Datalog support remain outside this fix. Independent review and contract repinning remain pending.

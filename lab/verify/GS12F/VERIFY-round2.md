# GS12F round 2 QA — CX-VGS12F

**Verdict: FIX-FIRST.** Reviewed builder `811a42a8adb356320b09128d173f752ccdc348f9` and round 3 of its report. Merged it into `verify/GS12F` at `216037a7fad6fc8b3c71815daf004be71d9c9b69`, as requested. No implementation fix, contract edit, main merge or push was made.

North star: P2 correctness floor, [SCOPE 2.4](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md), and [TARGETS](../../TARGETS.md). A single admission table improves consistency, but the table and complete write paths still disagree in four reproducible ways.

## Findings

### R2-F1 — HIGH: numeric non-index properties let a sparse array pass lossless JSON validation

**Location:** `packages/core/src/ValueDomain.ts:78-82`.

The array guard checks property count and a digits-only property-name grammar. It does not establish that those properties are array indices below `length`. This input passes every profile's `invalidValue`:

```ts
const value: any[] = new Array(1);
value["4294967295"] = 7;
// The same failure occurs with property "9007199254740993".
const wire = { type: "json", value };
```

Its keys are `length` and a numeric-looking property, so the count is `length + 1`. Element zero is still missing. `JSON.stringify` produces `[null]` and drops the property.

Fresh actual-codec observations across eight profiles show twelve silent conversions (memory, FoundationDB/KV logical codec, SQLite, PostgreSQL, Cloudflare and DuckDB, two vectors each). XTDB and QLever instead throw **TypeError** from their additional sparse-array check, rather than InvalidTripleError. In the actual public memory and SQLite compositions, a command commits and its get/receipt contain `[null]`. In actual XTDB/QLever adapters over offline clients, all three write APIs enter transactions; command-bearing `transact` enters a claim and then returns **WriteError**. This is a new variation of the original losslessness finding, not a failure of the old now-fixed Infinity/surrogate cases.

**Reproduction:** `node lab/bin/heavy.mjs --label CX-VGS12F-r2-repro -- node_modules/.bin/vitest run --config lab/verify/GS12F/round2/vitest.config.ts`. See [direct codec observations](round2/evidence/decorated-array-codecs.json), [memory](round2/evidence/memory-decorated-array.json), [SQLite](round2/evidence/sqlite-decorated-array.json), [XTDB](round2/evidence/xtdb-decorated-array.json), and [QLever](round2/evidence/qlever-decorated-array.json).

**Proposed fix:** require an own enumerable data descriptor for every index `0..length-1`, and reject every additional property other than `length`. An integer-looking name is insufficient: check the canonical array-index range and its relation to length. Add these combined sparse/decorated cases to both preflight and codec regressions, preserving original input in the typed error.

### R2-F2 — HIGH: XTDB rejects an admitted depth-128 JSON value while packing its journal

**Location:** `packages/xtdb/src/XtdbStorageAdapter.ts:518`; compare `storedValueDomain` in `packages/core/src/ValueDomain.ts:192` and its use by the other updated insertion paths.

XTDB's insertion path still calls `packValue(input.value)` with the base domain. Public preflight correctly admits JSON at depth 128, but core wraps that value in its generated `:_tx/` change envelope. XTDB then rejects the deeper envelope with InvalidTripleError and wraps it in **WriteError: Invalid XTDB assertion**. The promised additional journal depth is applied on decode, but omitted here on encode.

**Fresh live reproduction:** [live.test.ts](round2/live.test.ts), invoked through [run-live.sh](round2/run-live.sh), failed in **55.05 seconds** at vector 15, a valid nested array of depth 128. The error's captured original value is the generated transaction-change object, not the user's original JSON. The preceding **15 controls** completed exact public get, command receipt and historical reads: 1 MiB string/ref, a blob with three 1 MiB text fields and maximum safe size, finite binary64 extrema/subnormal, datetime extrema/fractions, int64 endpoints/unsafe adjacent integer and both booleans. Those are focused observations, not a passing live suite. See [live.log](round2/evidence/live.log) and [returned identities](round2/evidence/xtdb-live-boundaries.json).

**Proposed fix:** apply `storedValueDomain(ValueDomains.xtdb, input.attribute)` when packing actual assertion/journal rows, keeping public preflight at depth 128. Add a public XTDB regression that commits maximum-depth user JSON and checks get, receipt and historical readback. Do not raise the global public depth limit to hide the missing internal adjustment.

### R2-F3 — HIGH: PostgreSQL's datetime admission exceeds its actual column representation

**Locations:** `packages/core/src/ValueDomain.ts:38,52`; `packages/sql/src/schema.ts:37`; `packages/postgres/src/PostgresqlAdapter.ts:214-228`.

The PostgreSQL catalog admits fractional milliseconds such as `datetime(0.5)`. Its packer returns `value_datetime: 0.5` unchanged, and the adapter binds it directly into a **BIGINT** column. That column cannot retain a fractional millisecond exactly. The all-profile builder test passes because its PostgreSQL “round-trip” feeds the packed JavaScript object directly to `decodeValueColumns`; it never passes through PostgreSQL storage.

**Reproduction:** the schema/admission assertion in [independent.test.ts](round2/independent.test.ts) fails, with the exact domain/packed value/DDL recorded in [postgres-datetime-schema.json](round2/evidence/postgres-datetime-schema.json). This is a source-proven representation mismatch. No live PostgreSQL error or rounding behavior was observed in this review; the exact driver/server failure mode remains unverified. The adapter maps SQL insertion failures to WriteError after transaction entry, so relying on server rejection would not meet the requested pre-claim guarantee either.

**Proposed fix:** either migrate the datetime value column to a representation that preserves the declared finite binary64 domain, or represent PostgreSQL's integer-millisecond restriction in the shared table and reject fractions before transaction/claim entry. Add a real PostgreSQL public-write/readback regression. The wider supported domain requires a compatible schema migration, not only a packing predicate.

### R2-F4 — HIGH: FoundationDB's catalog endpoints exceed the wrapper's known value cap

**Locations:** `packages/core/src/ValueDomain.ts:36,45`; `packages/foundationdb/src/FdbKvBackend.ts:222,654`; `packages/foundationdb/src/FdbTriples.ts:25`.

The FoundationDB profile admits 1,048,576 UTF-8 bytes per text field, while the actual backend defaults to **100,000 bytes per encoded KV value**. The public FoundationDB composition uses the ordinary KV preflight; no FoundationDB/config-specific size admission is injected. Its META record contains the user value plus headers, and index keys also have separate native constraints.

The fresh probe executes the **actual `makeFdbKvBackendService` byte guard** and public KV composition with only the unavailable native transport replaced. For catalog-admitted string/ref/JSON/blob endpoints, every command enters a transaction and writes its command claim before the real wrapper rejects the META record as `FdbKvBackendError`, delivered as an Effect defect rather than InvalidTripleError. The string's META record is **1,048,696 bytes** against the 100,000-byte cap. All four vectors reproduce. This needs no assumption about a live server.

**Reproduction:** `node lab/bin/heavy.mjs --label CX-VGS12F-r2-fdb -- node_modules/.bin/vitest run --config lab/verify/GS12F/round2/backend.config.ts`. See [fdb-backend-limits.json](round2/evidence/fdb-backend-limits.json), [backend2.log](round2/evidence/backend2.log), and the explicit [transport substitute](round2/foundationdb-stub.ts). The first attempt's `vi.mock` did not intercept the native import and failed to load `libfdb_c`; [backend.log](round2/evidence/backend.log) and its source preimages are retained. That first attempt is a setup failure, not a semantic observation or native-cluster test.

**Proposed fix:** connect the actual backend's configured encoded-value/key/transaction constraints to pre-claim admission, including META/journal/index overhead. A shared logical codec's ability to serialize 1 MiB does not establish an adapter's ability to store it. Reject unholdable values with InvalidTripleError before callback/claim entry, or implement an independently verified storage strategy that makes the published profile true. Native FoundationDB key and transaction limits remain separately unqualified.

## What the fresh reruns establish

The original review probes were rerun with only imports/output paths adjusted in [original-probes.test.ts](round2/original-probes.test.ts). **Four of five pass.** The remaining old memory-integer test deliberately assumes canonical integers fail and uses `Effect.flip`; it now fails because the write succeeds. That obsolete expectation is not counted as a product defect. The independent replacement confirms **five** canonical integer values, including signed endpoints and distinct integers above 2^53, successfully traverse real memory callbacks and read back exactly in [memory-integer-success.json](round2/evidence/memory-integer-success.json).

| Fresh check                           | Result                                        | Proof boundary                                                                                                                                   |
| ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Builder all-profile boundary suite    | 27/27 pass                                    | Real logical codecs, stubbed pre-claim adapter matrices, actual memory endpoint transactions                                                     |
| Original reviewer probes              | 4 pass, 1 obsolete expectation fails          | Original nonfinite/JSON/surrogate rejection and QLever range cases now pass                                                                      |
| Independent new probes                | 1 pass, 6 fail                                | Memory integer success; decorated-array failures and PostgreSQL schema mismatch                                                                  |
| Independent literal endpoint matrix   | 8/8 profiles pass                             | **199** exact codec round-trips; **253** direct typed rejections; **759** public typed rejections across three APIs, zero callback/claim entries |
| Core focused value/integer tests      | 9/9 pass                                      | Reviewed current source, fresh invocation                                                                                                        |
| QLever focused offline suite          | 3/3 pass                                      | Preflight, integer limits and codec proof; no SPARQL execution                                                                                   |
| KV/SQLite public value-limit controls | 4/4 pass                                      | Actual public compositions                                                                                                                       |
| FoundationDB wrapper supplement       | 1 failing test, four endpoint counterexamples | Real wrapper/guard, substituted native transport; no cluster                                                                                     |
| XTDB live endpoint supplement         | 1 failing test; 15 preceding vectors exact    | Current public A0 path; maximum-depth JSON fails in journal packing                                                                              |

The independent matrix uses literal limits rather than deriving expected values from the table: ±int64 or QLever's 60-bit endpoints and adjacent values; finite binary64 extrema/subnormals; ±8,640,000,000,000,000 milliseconds and fractions; 1 MiB ASCII, two-byte and astral Unicode text/ref/blob fields; maximum safe blob sizes and empty filenames; JSON text/key limits and depths 128/129; exact booleans. Unsupported integer profiles and both tagged decimal `16.50`/`16.501` reject typed. Decimal precision/scale is still unsupported, not qualified by a blanket unsupported-family rejection. W0 domain limits remain distinct from codec admission limits.

The combined first probe command records **32 passed / 7 failed**: 27 builder passes, four original passes, one new memory success, six real new failures, and one obsolete memory-rejection expectation. Later supplements have separate logs/exits, so no first failure or attempt was overwritten. Normal endpoint success does not erase the counterexamples.

## Contract, pins, source and resource binding

[contract-audit.json](round2/evidence/contract-audit.json) confirms the entire tracked `lab/acceptance/` tree equals captured main **`dfaf78e8ac48b561dbf516a42ca404d00490ca57`**. No contract edit or repin was made. A later recheck also matches main `0ef5760cb7a870a8ce19b1e908330d8e516a9379`; the recorded equality is tied to a resolved commit, not a moving branch label. The only candidate-changed direct implementation pin remains complete in round 3's report:

| Pinned path                     | Published/main SHA-256                                             | Candidate SHA-256                                                  |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/testkit/src/index.ts` | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `432cec5c6aa33150c5c6f6c54091184edcaece3395ee3c809524c5502594a6d6` |

Round 3 also now lists the original-base administrative `RULINGS-PENDING.md` restoration, including its old/new hashes. The candidate-specific pin list and the previously noted historical administrative row are complete. Whole-file changes not directly pinned are not invented pins; no change to the acceptance outside-block fixture was made by this review.

All reviewed production/source inputs were checked against builder Git blobs before the first run and after the supplements. See [execution-sources.json](round2/evidence/execution-sources.json), supplement source captures and [final-source-audit.json](round2/evidence/final-source-audit.json). The only amended first-run reviewer input is its unused-by-supplements discovery config, changed to keep later supplemental suites separate; its exact executed preimage is retained and hash-checked. The initial final-audit helper treated that known config change as drift; its failed helper/preimage and correction note are retained. No production drift was excused.

Heavy runs used `lab/bin/heavy.mjs`; free host disk was about 15 GiB before admission. Node/pnpm/dependencies were already present from the pinned frozen installation; no dependency installation or change was made this round. XTDB used only resident port 5470. Its exact container ID, image and start time agree in [before](round2/evidence/xtdb-container-before.txt) and [after](round2/evidence/xtdb-container-after.txt). No container lifecycle change or exclusive reservation was requested. QLever live remains **DIAGNOSTIC under Q91a/R35**; no new live QLever command was run.

## PASS / verdict audit

1. **Original probe copy:** exact InvalidTripleError classes and transaction/claim counters are tested freshly against actual adapters over new offline clients. Output paths are new and original evidence is untouched. Its obsolete memory expectation stays visibly failed; the replacement does not relabel it.
2. **`independent.test.ts`:** direct codec results retain original sparse/decorated inputs and decoded bytes/errors; actual memory/SQLite get and receipt IDs bind readback to the fresh command. Actual XTDB/QLever adapter counters bind late failures to the selected runtime and literal input. The PostgreSQL check compares actual admitted/packed 0.5 with the checked-in physical DDL; it makes no server-execution claim. Memory integer success checks exact original value and real callback count.
3. **`matrix.test.ts`:** exact original tagged values are compared with actual codec outputs; literal expected bounds are separately checked against the table. Every outside vector requires the typed class/original value and zero transaction/claim counters on all three public APIs. Each profile gets a fresh runtime; input totals are incremented only after assertions pass. FoundationDB here is explicitly the shared logical codec, not native storage.
4. **`backend-boundaries.test.ts` / transport stub:** the actual FDB wrapper performs its own default-cap check; the substitute records transaction entry and actual command-key prefix `0x22` writes. Fresh per-attempt state and the reviewed KV/FDB source bind the observations. It asserts the requested early typed failure and fails; it never claims a real cluster committed or rolled back anything. Setup failure in attempt 1 remains separate.
5. **`live.test.ts`:** records a vector only after actual get, receipt transaction identity/value and historical reads all match the original input. Fresh random scope and returned transaction IDs bind all 15 recorded successes; vector 15's failure remains a failure and the suite is not promoted. Source/image/resident identity is recorded; no isolated-performance or full-acceptance claim is made.
6. **Builder suites freshly invoked by `run.sh`:** unchanged predicates execute against the reviewed checkout; individual command exits and skipped/live boundaries are explicit. Historical builder totals are not adopted as fresh results.
7. **Capture/final-source audit and report:** immutable builder bytes, published path/hash intersections and entire contract-tree equality are checked directly. Fresh timestamps and supplement source captures bind this attempt. The one preserved discovery-config preimage is checked explicitly; no other drift is allowed. The FIX-FIRST verdict follows the four findings above, not the controller exit or a source hash alone. No semantic acceptance receipt or obligation closure is emitted.

## Not done / open questions

No code fixes, contract change, repin, main merge, push, publish or promotion. No full GS.12/G1, root check, new package build/consumer check, native PostgreSQL/FoundationDB/DuckDB/Datomic run, Cloudflare workerd rerun or performance qualification. PostgreSQL's precise driver/server response and FoundationDB's native key/transaction limits remain unverified; the source/wrapper mismatches above are narrower confirmed findings. No QLever SPARQL durability/history acceptance is claimed. The original three cases improved, but the all-values exactness and early typed-error promise remains unfulfilled.

# CX-VGS12F: EXP-GS12F adversarial review

**Verdict: FIX-FIRST.** Reviewed builder head `5610572e01514fd770f3049d5fe1f53ae6096fac` on `exp/GS12F-typed-unholdable`, including both rounds of `lab/experiments/EXP-GS12F/REPORT.md`. Review branch: `verify/GS12F`. No production code or acceptance contract was changed.

North star: correctness floor for P2, specifically typed rejection before transaction entry and exact readback under [SCOPE 2.4](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md). The six malformed integer cases are fixed, but that is narrower than the task's every-unholdable-value claim.

## Findings

### F1 — HIGH: shape validation leaves representability failures and silent conversions reachable

**Locations:** `packages/core/src/store/validateValues.ts:14`; the predicates it uses in `packages/core/src/Value.ts:16`, `:19`, `:44`, `:53` and `:56`. Consequences are visible at `packages/core/src/kv/hexastore/KvTripleStore.ts:164` and `:227`, and XTDB/QLever packing.

`Schema.is(TripleValue)` accepts nonfinite numbers/datetimes, arbitrary unknown JSON, strings containing isolated UTF-16 surrogates and negative blob sizes. These are not caught by the new guard:

- With the actual XTDB and QLever A0 adapters over instrumented offline clients, `{type:"number",value:NaN}`, number Infinity, datetime NaN/Infinity, JSON containing Infinity, JSON undefined/cycles/bigint, and a negative-size blob reach `withTransaction`. Every command-bearing `transact` also reaches `claimCommand`. Packing returns **WriteError**, not InvalidTripleError. There are nine failing payloads across three APIs on XTDB (27 observations), and the same nine plus an isolated surrogate on QLever (30 observations). Invalid writes issue no mutation request in these offline tests; the failure is late validation/error classification, not proof that a failed command durably consumed a claim.
- Memory accepts `json({erasedAt:Infinity})`; the returned assertion contains Infinity, while `get(id)` contains `{erasedAt:null}`. `json(undefined)` also succeeds, then `get` dies with `SyntaxError`. Cyclic/bigint JSON and nonfinite datetimes die with untyped exceptions. Nonfinite number scalars are accepted. A string containing `"\ud800"` succeeds and reads back as U+FFFD. This is an observed silent conversion, not a hypothetical adapter limit.
- QLever's isolated-surrogate failure happens while constructing the commit encoding, after transaction and command-claim entry, as WriteError.

**Reproduction:** from this worktree, run `node lab/bin/heavy.mjs --label CX-VGS12F-repro -- node_modules/.bin/vitest run --config lab/verify/GS12F/vitest.config.ts`. The failing tests preserve all observations before their final assertion. See [XTDB observations](evidence/xtdb-preflight.json), [QLever observations](evidence/qlever-preflight.json), [memory values](evidence/memory-values.json), and [runner output](evidence/adversarial.log).

**Proposed fix:** make preflight cover the actual representable value domain before snapshot/transaction/claim entry: finite scalar values, recursively lossless JSON, well-formed Unicode and valid descriptor sizes, plus any adapter-specific limits. Reuse pure adapter validation where needed without opening a transaction. Return InvalidTripleError with original input. Add public-write tests on all three entry points, and compare original/readback values without a JSON.stringify comparison that can erase NaN/Infinity/undefined/-0 differences. This finding covers representability, not W0 attribute validation.

### F2 — HIGH: memory's unsupported integer path is still a WriteError inside a callback

**Locations:** `packages/core/src/kv/layers/KvTriplesLive.ts:427-435`; `packages/core/src/errors/index.ts:20`. The analogous generic adapter capability check remains inside `adapter.withTransaction` at `packages/core/src/store/TriplesLive.ts:280-290`.

The memory composition cannot hold the canonical integer family, but `0`, `9007199254740992`, `9007199254740993` and `9223372036854775807` all pass the new preflight. Each invokes the actual in-memory backend transaction callback and then fails with UnsupportedValueTypeError, which **extends WriteError and retains `_tag: "WriteError"`**. The builder report explicitly preserves this legacy behavior; it does not meet this review's “never a WriteError, before any callback” requirement. The memory positive controls exercise cents/minutes as number values and therefore miss this path.

**Reproduction:** the `memory: canonical integer capability rejection...` test records four successive callback increments and `writeError:true`, `invalid:false` in [memory-integers.json](evidence/memory-integers.json).

**Proposed fix:** perform capability rejection before the callback and use a typed non-WriteError failure. If the memory composition is required to round-trip integer wire values within the common minimum range, implement exact integer storage there as a separately tested change; otherwise explicitly qualify its smaller accepted domain. Do not silently convert canonical integer text to number.

### F3 — MEDIUM: QLever's declared 60-bit rejection boundary remains unenforced

**Locations:** `packages/core/src/store/validateValues.ts:14`; `packages/qlever/test/value-limits-offline.test.ts:139-147`; unchanged declaration `lab/acceptance/obligations.json` → `laneIntegerRange.qlever`.

The published declaration is `[-2^59, 2^59-1]`, with values outside rejected at write. Both `576460752303423488` and `-576460752303423489` pass core preflight and reach transaction entry. The review's transaction-entry witness intentionally stops there; it does not fabricate a successful commit. The builder's codec test, freshly rerun here, expects these values and full signed-long endpoints to round-trip through its lexical channel.

Exact lexical storage can be a useful workaround under SCOPE, and this finding does **not** claim those integers silently wrap in that channel. It does mean the requested typed rejection at the declared QLever boundary has not been implemented. Round 1 already identifies the discrepancy but leaves reconciliation to future work.

**Reproduction:** [qlever-declared-range.json](evidence/qlever-declared-range.json); test `QLever: declared 60-bit range...`. Its sentinel records transaction entry for each value.

**Proposed fix:** enforce the currently declared lane boundary before transaction entry, or have the contract owner independently approve and qualify the widened lexical accepted domain. GS12F must not repin or amend the contract itself. Until that decision, passing the codec test does not close this requirement.

## Fresh checks and scope of proof

All test runs used the reviewed worktree, pinned pnpm 10.11.0, Node v22.23.2, and the required `.pnpm-store`. Installation was frozen and offline. Heavy work ran through `lab/bin/heavy.mjs`; host free disk exceeded 5 GiB at admission. Commands, individual exits and raw output are retained in [run.sh](run.sh), [exits.txt](evidence/exits.txt), and [controller.log](evidence/controller.log). The controller preserves failing command exits; its own completion is not a semantic PASS.

| Check                                 | Fresh outcome            | Meaning                                                                                                                          |
| ------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Reviewer adversarial suite            | **5 failed / 2 passed**  | Five distinct failing assertions, including the two adapter matrices; two existing memory controls pass                          |
| Builder core pre-claim regression     | **1/1 passed**           | Six malformed integers rejected on all three APIs before instrumented transaction/claim entry; valid int64 control reaches claim |
| Builder QLever targeted offline suite | **3/3 passed**           | Malformed-integer preflight, direct integer refusal, and 53-vector codec checks; no SPARQL/durability proof                      |
| XTDB live expanded boundary suite     | **3/3 passed; 199.09 s** | Fresh resident A0 composition, including public get/receipt/historical exact integer checks                                      |

The offline adapter tests use the actual `makeXtdbStorageAdapter` / `makeQleverStorageAdapter` (default A0 encoding) and public Runtime/Triples over clients returning empty state. They prove control flow and error classes, not physical-engine storage. The separate QLever range test substitutes only a transaction-entry sentinel. The memory callback test wraps a fresh real `makeTestKvBackend`, retaining its behavior and counting actual callback execution.

The implementation and test source hashes were captured before execution in [execution-sources.json](evidence/execution-sources.json); each production source was checked byte-for-byte against the reviewed Git head. [started.txt](evidence/started.txt) identifies this attempt. No historical builder result is counted as fresh. The live XTDB endpoint is the existing resident on port 5470; [engines-before.log](evidence/engines-before.log) and [xtdb-container-during.txt](evidence/xtdb-container-during.txt) record status and container identity. The post-run container identity in [xtdb-container-after.txt](evidence/xtdb-container-after.txt) matches the during-run ID/image/start time. No resident lifecycle operation or exclusive slot was requested. This is a focused shared-resident rerun, not an acceptance receipt.

## Boundary coverage and limits

- **Integer:** fresh core/offline tests cover int64 high/low overflow and noncanonical strings, all three APIs and mixed batches. Builder exact-lane vectors cover both sides of ±2^53 and ±2^59 and int64 endpoints. Memory canonical-integer limitations and the QLever policy mismatch are explicit findings above.
- **Cents/minutes, text, dates, instants, enum, boolean, ref, erased marker:** both existing memory controls were freshly rerun. They include cents/minutes endpoints and adjacent out-of-domain values, 64/65-character and ASCII edges, 2000/2099 endpoints and adjacent outside-year date/instant strings, fractional millisecond datetime values, both booleans and erased markers. QLever's offline codec test covers the analogous vectors; this is codec proof only.
- **Domain versus engine limits:** W0's maximum text length 64, minutes maximum 10080 and date years 2000–2099 are world-domain constraints, not demonstrated physical string/date storage limits. Preserving their adjacent values as generic storage strings/scalars is not itself silent conversion. No adapter string-length ceiling is declared in this change; allocating enormous strings to find an engine exhaustion limit was not attempted.
- **Decimal:** W0 has no decimal type, attribute precision or scale. Core TripleValue also has no decimal family. A tagged `16.501` decimal was freshly shown to fail InvalidTripleError before transaction entry on both adapters and memory, because the family is unsupported; this is not proof of declared-scale handling or in-range decimal round-trip. The broader decimal contract remains unverified and cannot be closed by this integer fix.
- **Dates out of range:** W0 date/instant boundaries are lexical strings in the tested storage mapping. Nonfinite numeric datetimes are separately demonstrated failures of the new preflight. No universal JavaScript Date range was imposed on a storage type defined as an epoch-millisecond numeric scalar.
- **QLever live:** no new live QLever run was made. Both builder live timeout rounds remain **DIAGNOSTIC under Q91a/R35**, exactly as amended in round 2. Their timeouts do not strengthen or weaken the offline findings, and they are not semantic PASS evidence.

## Acceptance ownership and pin inventory

[contract-audit.json](evidence/contract-audit.json) independently intersects published obligations pins with changed paths. At capture, the **entire tracked `lab/acceptance/` tree is identical to main `15927efed3a6dd48d620b19bd0201fe862344b33`**. The report's restoration claim therefore checks out against a main newer than its recorded `62bcc8a3` restoration point. No contract generation, version change or repin was performed by this review.

Against current main, the sole candidate-changed directly pinned implementation path is complete in the builder report:

| Path                            | Main/published pin SHA-256                                         | Builder bytes SHA-256                                              |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/testkit/src/index.ts` | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `432cec5c6aa33150c5c6f6c54091184edcaece3395ee3c809524c5502594a6d6` |

The old pin remains unchanged intentionally for the contract owner to repin. Core source deltas are not direct obligations pins; the builder correctly distinguishes those.

For a literal **original base `8d098718` to head** intersection there is one additional pinned path, `lab/acceptance/RULINGS-PENDING.md`: old `b86222c537567c78ecd5e53e23f9450f0e48e7d8ff54b7f533d3678243a862c0`, new/current-main/published `ced5c9496bcd596cce85973f91ec8f32426adc4f0d049e2ecac288a3a224ab37`. This is main's pending-ruling update copied during restoration, not retained implementation drift. The builder mentions main's pending-ruling updates but does not explicitly list this path/hash pair; hence the audit's literal `allChangedPinPathsMentionedInReport:false`. The candidate-specific implementation pin list is complete; the historical base-to-head inventory would benefit from this administrative row. Budgets/load-contract regeneration deltas were reverted and are not current changed pins.

## PASS / verdict audit

1. **`adversarial.test.ts` adapter matrices:** content checks use the actual InvalidTripleError class and before/after transaction and claim counters; raw exits retain their actual causes. Freshness: new client, adapter, counters and runtime for each payload in this invocation. Binding: imports the reviewed adapters and public core; literal inputs and all three APIs; no physical-slot or durability claim. All observations are saved before the final assertions. Failures remain failures.
2. **Memory integer callback assertion:** content checks WriteError class and callback count on canonical integer literals. Freshness: new real in-memory backend/runtime. Binding: the injected backend is the backend the public Runtime uses. No engine claim.
3. **Memory value assertion:** content checks actual typed error class, retains full input/assertion/get exits, and exposes conversion bytes in the readback. Freshness: a new memory composition for each payload. Binding: `get` uses the exact assertion ID returned by that write. No historical result is reused.
4. **QLever declared-range witness:** content requires rejection before transaction entry, with a positive entry counter exposing the failure. Freshness: new adapter/runtime and counters. Binding: exact outside-range literals and actual default adapter capability declaration; sentinel replacement is explicit and no persisted result is claimed.
5. **`controls.test.ts`, core and QLever reruns:** the controls run builder-owned effects freshly; their source, scope and claims are described above. Existing builder predicates were not weakened. QLever's 53-vector test is limited to pack/encode/decode, not engine exactness.
6. **`audit.py`:** reads immutable Git blobs, computes actual SHA-256 values, intersects paths rather than trusting report rows, and compares the entire tracked contract tree with a resolved main commit. Production input bytes are checked against reviewed head before test invocation. This is file equality/source binding, not semantic contract qualification.
7. **`run.sh` and this report:** preserve raw per-command exits and derive the FIX-FIRST verdict from reproduced content failures. They do not emit an acceptance receipt or promote any obligation. The verdict is a review of this source, not a claim that every vector/adapter passed. Physical live evidence is limited to the identified shared XTDB resident; offline work makes no slot claim.

8. **`check-format-structure.mjs`:** compares freshly transpiled syntax-tree node kinds and literal/identifier text for current reviewer tests against preserved executed preimages, ignoring SourceFile.text (which contains formatting). Both match in `format-structure-equivalence.json`. Earlier byte/token/SourceFile.text comparisons report differences and are retained as formatting diagnostics; they never change a test outcome or verdict. The exact preimages remain the execution authority.

## Not done

No fixes, merges, pushes, package publication, contract edits or promotion. No complete GS.12, full G1, root `pnpm check`, package rebuild/repack, PostgreSQL/FDB/DuckDB/Datomic verification or performance run. No QLever SPARQL/durable receipt/history qualification. The first-failure reviewer results are retained. After execution, only reviewer TypeScript and Markdown formatting was applied; the exact executed reviewer source preimages are retained under `evidence/executed-reviewer-sources/` and match their recorded execution-source hashes. Reviewed production/testkit/builder-test bytes were not changed. Acceptance of the narrow six-integer regression does not establish the broader SCOPE 2.4 promise requested here.

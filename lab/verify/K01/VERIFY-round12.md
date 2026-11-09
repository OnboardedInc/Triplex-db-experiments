# K01 round 12 — independent offline QA

**Verdict: ACCEPT-OFFLINE. No findings requiring a code fix in this round.** The journal omission is a definite expectation bug; the corrected healthy count is **61,384** for 500 subjects and batch size 400. This is an independently reconstructed count, not a recovered observation from the deleted round-11 engine. That engine's actual count remains unknown.

Reviewer CX-VK01. Reviewed builder `aec5a715` (exp/K01-seed-clone), REPORT-round12.md, LIVE-round12.md, captured round-11 receipt/log, the public writer and the complete expectation/admission path. Merged into verify/K01 at `73626812e1875495edf6eb1f89b1a041edd645e2`. Runtime sources under lab/bench, lab/bin and packages exactly match the builder. No implementation fixes. Review additions live under lab/verify/K01.

## Independent journal derivation

`packages/core/src/store/transactionMetadata.ts:29-59` constructs these assertion inputs for each journal-enabled transaction:

```text
J = 2 + O + U + C
2 = position + instant
O = number of truthy actor, commandId, correlationId, causationId, configSnapshot fields
U = distinct entityId values among actual changes, within this transaction
C = actual assert changes + successful retract changes with their existing row
```

`TriplesLive.ts:209-260, 398-517` generates fresh assertion identities, flushes business assertions, records their changes, records successful retractions, then inserts all journal inputs through the same adapter. It does not recursively journal the journal. Missing/already-retracted targets generate no additional change. A repeated entity contributes once within a command and again when changed by a different command. Truthy optional fields each add one row; absent/empty optional fields add none. An empty command ID is rejected by the writer, rather than treated as a valid absent ID.

For an assert-only seed, business inserts B all produce changes. `seed.ts:78-95` always provides nonempty actor `bulk-seed` and command ID, with no other optional metadata and no journal-suppression symbol. Hence `J = 4 + U + B` per seed command. Bootstrap creates tables without assertion rows (`XtdbStorageAdapter.ts:622-649`). The adapter writes each assertion identity once (`:212-229`); `batchInsert` delegates every input to `insert` (`:522-528`). It neither collapses equal values nor distinct assertions on the same entity.

A retract-plus-assert replacement leaves the old assertion identity and inserts one new business identity. Its two changes on the same entity add one changed-entity journal row. With actor and command ID, J is `2 + 2 + 1 + 2 = 7`; total assertion-row increase is eight. With all five optional fields present, J is ten. A repeated retract of the same already-retracted row adds no second retract change. Adapter retraction updates the existing identity (`XtdbStorageAdapter.ts:529-544`); this review does not qualify XTDB valid-time slicing for arbitrary histories.

The new reviewer controls drive the **locally built public runtime** through a storage spy for all 32 subsets of the five optional metadata fields, plus empty optional strings and duplicate-retract/assert. The spy is copied from the builder fixture; it counts real TriplesLive insert calls and is not an independent XTDB emulator. Independence is from the new count formula: the actual public writer constructs its journal without calling n01SeedCounts.

For the captured seed, I also ran the actual seedRung with a receipt-producing recorder, tallied its submitted operations and distinct entities per command, and obtained:

| Quantity | Independent reconstruction |
| --- | ---: |
| Business assertions | 26,635 |
| Commands | 81 |
| Fixed journal rows, 4 × commands | 324 |
| Changed-entity rows, summed per command | 7,790 |
| Change rows | 26,635 |
| Journal assertions | 34,749 |
| Stored assertion rows | **61,384** |

The builder's separate 500-subject public-writer replay also passes. Its fixture verifies the original log/receipt hashes and explicitly has `actualStoredCount: null`. The live log contains only the old table-name error, with no count, row dump or completed G0 manifest. The fix is a sufficient explanation for why a healthy seed could not satisfy the old expectation; it does not exclude another engine-specific discrepancy in that deleted attempt.

## Observation-to-expectation trace

No engine COUNT value flows into the expected core-table counts on the production path.

1. `xtdb-seed.ts:35-39,69-79` obtains subjects and batch size from arguments, captures them in seedInputs, and hashes the generator (including n01-counts.ts) before opening the composition and writing.
2. `seedRung` counts the submitted assert operations and successful commands; it does not query stored row totals (`seed.ts:89-95`). Receipts provide positions. `xtdb-seed.ts:98-117` cross-checks the final position and records the result; business expectedAssertions comes from populationCounts.
3. `expectedN01` (`g0-xtdb.ts:18-41`) independently reconstructs the plan from subjects and batch size. It checks accounts, completion, subjects, command count, both business counts, and lastPosition against that plan. The receipt-derived commands/position are constrained to the reconstructed command total. Stored assertion expectation is only `plan.storedAssertions`; claims/attempts equal that independently checked command count, and tx_meta is one.
4. `pinXtdb` and `checkXtdb` recompute expectedN01. `readContent` (`g0.ts:102-131`) keeps observed count and expected count separate, refuses disagreement, then requires scan multiplicity to equal the observed count. It never updates expected from count/scan. Auxiliary-table contents remain fully scanned and pinned in D; their observed counts are scan-completeness checks, not substituted N01 core expectations.
5. `admitG0` (`g0.ts:182-204`) rejects an old expected-count binding before reading, performs a fresh complete read, and grants PASS only if full D matches the pre-freeze pin. Dprime or process diagnostics cannot substitute.

The reviewer plants unrelated `counts`, `result.observedAssertions`, `result.storedAssertions` and `g0.counts` values (including 0 and MAX_SAFE_INTEGER); expectedN01 stays identical. A reader returning the wrong observed count refuses, without changing expected. Builder controls also tamper commands, business assertions, expectedAssertions, lastPosition and accounts; all refuse. A synthetic legacy pin with the business-only tx_assertions count refuses before any reader call.

## Batch reconstruction and corruption controls

The helper's partition matches `seed.ts:105-143`: account worlds are sliced independently; subject facts are appended whole, flushing **only on overflow**, never splitting a subject. Exact equality does not prematurely flush. An oversized single subject remains whole. Early/incomplete seeds cannot pin through expectedN01's completion checks.

Reviewer controls call the real seeder for 21 subjects at batch sizes **1, 7, 27, 28, 29, 55, 56, 57, 224, 399, 401, 2000**, independently tally its actual submitted command partitions, and compare commands/business/journal/stored totals with the helper. All pass. At 28, the first subject command is `s0-0`; at 56 it is `s0-1`, proving equality at a subject boundary. Hop transitions and a final partial batch are included. At batch 7, account changed-entity memberships total **3,315** across commands versus **1,569** unique entities globally: the helper correctly counts repeats. At batch 1 these totals are 7,785 versus 1,569.

The planted reader has all schema tables, independently reported counts, business and journal rows, and a pre-mutation pin. All four changes refuse through actual admitG0:

- one missing business row;
- one extra business row;
- one missing journal row;
- one extra journal row.

A business-to-journal substitution preserving the total count refuses with `G0 content mismatch`. Incorrect independent COUNT also refuses. The fixture is a synthetic complete reader, not a persisted engine clone. The builder's public-writer row fixture separately reproduces the legacy count refusal and the corrected pin.

## Stale records and contract pins

Read-only filesystem inventory searched the review worktree runs, builder runs and main runs; it did not inspect Docker/volumes. It found these three historical XTDB manifests in the builder worktree, all without G0 pins:

- `runs/xtdb-seed/k01-r2-singlecut/manifest.json`
- `runs/xtdb-seed/CX-K01-500/manifest.json`
- `runs/xtdb-seed/CX-K01-500-retry/manifest.json`

Each actual file was hash-checked before and after evaluation. All three refuse `assertSeedInputsCurrent` with `Q74a: stale seed generator lab/bench/xtdb-seed.ts`, and actual admitG0 refuses the absent pin with zero reader calls. No published golden.json or fresh-state.json was found in those searched roots. No claim is made about uninspected volumes or records elsewhere.

Old pre-fix G0 pins with the business-only count also fail the new expected binding (executed control). Current source hashes make pre-change generators stale in the measuring driver (`bulk.ts:34-58`, `driver.ts:107`), and the count helper is now included in the source-generator hash list. Existing correctly hashed historical bytes are not current admission evidence. The clone lifecycle can copy historical bytes; that operation alone grants no measuring admission. The driver still performs its own G0 before setting seededBy (`driver.ts:279-280`). Golden publication still requires two fresh G0 checks before writing its record (`engine.mjs:735-745`). These lifecycle paths were inspected, not run.

The builder's REPORT-round12 and LIVE-round12 explicitly require new pins/goldens. No lab/acceptance file changed during this review or its merge. Text scans of both review and current main acceptance trees found no explicit references to the four changed runtime paths. The independently checked old/new hashes below are also in source-and-stale-inventory.json; any contract re-pin belongs to the contract builder.

| Path | Parent SHA256 | Round-12 SHA256 |
| --- | --- | --- |
| lab/bench/lib/g0-xtdb.ts | 21560713bea2d4b9eb74a4b75e29f0a022249b3d6a21ef0e865cb60eb35aca67 | ccd6add7e50b3ce8da3cbe0acc46a2f73b289b8db2ac6bdbfa3e418c36969ca4 |
| lab/bench/lib/g0.ts | d2995b912bbe0460b3eb1c53a728f2242046676de73f43a401f26d6b4ad6f195 | 1f98f70db84383b8c3ea489fa9b11f8fab9bbfc0b60193569f778fc34850b1eb |
| lab/bench/lib/n01-counts.ts | absent | a2a9a613ad6a40108cc200ce7050ffd855f48947945559f0f440d4c6d2971601 |
| lab/bench/xtdb-seed.ts | 82ac7eb63a49c4be16d0543baac362d7bba1a3c1aed298d9578f2365aa61e0a3 | b3f48c0c9caba9bf0751c4663ad0086f09d6533e87f6523a4579d6dc5d0fa99a |

## Execution and evidence

**468/468 tests pass:** 235 builder, 30 earlier reviewer, 98 column controls, 57 representation controls (including the three signed-zero controls), and 48 new count controls. Zero failures, skipped, cancelled or TODO tests. Bench TypeScript and a separate strict check of the new reviewer TypeScript test exit zero. Three real historical-manifest refusal audits and Node syntax checks pass. Local core/XTDB/qualification exports were rebuilt from reviewed sources before exercising the public writer.

Commands ran through heavy.mjs, with disk-floor checks before admission and inside the runners. The completed suite began with 5,788,561,408 available bytes, above 5 GiB. No engine slot was requested. Evidence: `evidence/review-round12/run.json` pins 65 sources/dependencies/fixtures and every suite log; all rehashed unchanged after execution. `final-checks.json` also inventories 504 local build outputs. Raw case output is durable at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VK01/round12/attempt-2/`, verified by SHA256SUMS-RAW. All new committed evidence files are below 1 MB, with the evidence directory below 5 MB.

First failures remain explicit: setup attempt 1 failed before tests because this worktree lacked core/dist; the first build wrapper rejected pnpm's store-dir option on a run command (no build ran), then the installed build executables built the exact local sources successfully. The first stale-audit assertion incorrectly required a pure expected-count calculation to reject every old manifest. I corrected that reviewer assertion to check the source-hash refusal and actual G0 admission refusal. These receipts are retained; no product failure was retried into a PASS.

The run receipt names pre-amend merge `5625e46f`. Its commit message was amended to remove Git-appended conflict notes and end with the required trailer. Both old and amended merges have exactly tree `19c086819cbc92a17091af07a400f9800d19e56f`; final-checks.json records the equality. The sole merge conflict was the earlier reviewer representation fixture; the builder's native-type witness additions were retained, preserving its refusal expectations. The 57 controls pass against the current reader.

## PASS, verdict and receipt audit

| Producing boundary | Content check | Freshness check | Binding check |
| --- | --- | --- | --- |
| n01SeedCounts / expectedN01 plan, no admission | Actual fact partition, business closed form, per-command metadata formula, reported inputs checked | Recomputed on each invocation; no engine count adoption | Manifest subjects/batch and source-generator hash; reported commands/position constrained to plan |
| readG0 / readE1G0 source pins | Complete rows/counts/full D; normalized digest retains its existing relation checks | Bounded reads; E1 requires two identical full D reads | Expected scope/position/counts/world; actual endpoint; pre-freeze writer call |
| admitG0 sole admission PASS | Expected binding, complete fresh D equals pre-freeze D | Fresh read on each call; no count retry | Exact pin and measuring endpoint; Dprime/diagnostics cannot grant |
| driver reuse / golden publication, unchanged | G0 before reuse; two G0 checks and layout checks before publication | Measuring-process read; separate clone starts | Current generator/build, manifest and runtime bindings; inspected only offline |
| 48 reviewer controls | Public writer counts, real seed command partitions, specific expected refusals, unchanged healthy control | New test execution with unique output path | Exact source/log hashes; public-runtime spy and synthetic reader identified as such |
| Suite runner receipt / this verdict | Exact TAP denominators, no skips/failures, exit/signal/error checks; rehash logs and inputs | New completed attempt; first failures retained separately | 65 input hashes, tested tree and builder equality, independent count cases; offline verdict only |
| Historical-record refusal receipt | Actual source-hash and actual admitG0 refusals; zero reader calls | Read actual inventory bytes again and rehash after evaluation | Exact three manifest paths/hashes and audit source hash; emits admitted:false only |

No new production granting path was added by this round. No catch on the expectation/count/admission path turns a failure into an expectation or PASS. Count errors now preserve expected/observed values, scope and position.

## Remaining verification

No Docker call, volume creation/removal, slot acquisition, source seed, freeze, two-start clone run, native transport probe or E1 measurement was performed. Actual XTDB COUNT/scan behavior and the new pre-freeze D/Dprime, post-start D/layout reproduction and fresh-seed E1 remain for the admitted live window. A new live first failure must retain its now-detailed count error. The deleted round-11 engine count cannot be verified from retained evidence. These limits do not block offline acceptance of the count fix.

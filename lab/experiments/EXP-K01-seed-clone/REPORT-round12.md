# EXP-K01 round 12 — business count was used as stored-row count

Builder CX-K01-R2, parent f3584a664227e79802b08e27243034429e4835dc, branch exp/K01-seed-clone. North star: exact seed reuse supporting P1–P5; authority lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md and Q93a–c. Offline only; no slot, container or volume action. No acceptance changes.

**Diagnosis: G0's expected count was wrong. This is not a seed business-data bug.** `populationCounts().seedAssertions` correctly counts N01 business facts, and the seeder correctly reports those input assertions. `expectedN01` incorrectly treated that number as all rows in tx_assertions. The public writer also persists the transaction journal in that table. Corrected expected counts come from the frozen seed inputs and batch partition, never from the observed database count.

**Verification: 420 tests and TypeScript pass.** A fixture derived from the captured command/log bytes drives the real public Triples writer with an offline storage spy. It reproduces the old G0 count refusal and pins with the corrected expectation. It still refuses an extra or missing row. Live verification remains pending.

## What the captured evidence can and cannot establish

The unchanged evidence/live-round11/seed.log records 500 subjects, 20 accounts, the seed scope, 47.8 s of writes and the table-only count error. receipt.json records the exact command, batch size 400 and seed ns-v2. There is **no captured actual COUNT result, row dump or completed manifest**. The volume was removed as requested. No offline method can recover its exact observed count from these bytes.

The new `fixtures/g0-count-live11.json` binds those original files by SHA256, extracts their input parameters, and explicitly records `actualStoredCount: null`. Its reconstructed row count is a source/public-writer result, not invented live evidence. Thus the exact count returned by the deleted engine, and any additional engine-specific discrepancy, remain unknown. Nevertheless the wrong expectation is a definite bug: a healthy seed using this enabled journal cannot equal the business-only count.

## Source and count reconstruction

`world.ts:245-250` defines seedAssertions as own business facts plus shared business facts. `seed.ts:85-100` counts assert operations, excluding journal rows; that distinction is correct. `seedOps` emits only asserts with deterministic business valid time. The initial seed does not issue retractions or a retract/assert replacement.

`packages/core/src/store/transactionMetadata.ts:29-57` returns journal assertions: position, instant, optional actor and command ID, optional other metadata, one changed-entity row per distinct entity in the command, and one change row per actual change. `seed.ts` always supplies actor `bulk-seed` and commandId, with no correlation/causation/config metadata. Therefore each seed command contributes:

```text
journal rows = 4 + distinct changed entities in that command + business assert changes
stored assertion rows = business assertions + journal rows
```

`TriplesLive.ts:513-517` inserts these metadata inputs through the same adapter transaction. The metadata does not appear in the receipt's business triples or the seed's input assertion counter. It does appear in the stored tx_assertions count and must remain covered by D; filtering it out or suppressing the journal would weaken the contract.

New `n01-counts.ts` independently reconstructs the actual input partition: shared account worlds are sliced at batchFacts; subject batches flush before overflow and never split a subject. It counts unique entities **per command**, including repeats across account chunks, rather than globally or once per assertion. It cross-checks business totals against populationCounts. For the captured inputs the reconstruction and actual public writer agree:

| Quantity | Source-derived/offline public-writer count |
| --- | ---: |
| Business assertions | 26,635 |
| Commands / claims / successful attempts | 81 |
| Journal base rows (4 × 81) | 324 |
| Changed-entity rows, summed per command | 7,790 |
| Change rows | 26,635 |
| All journal assertions | 34,749 |
| Expected stored assertion rows | **61,384** |

These are current-system assertion rows at the all-valid-time read, not Arrow file versions or transaction-log messages. The old count was 26,635, omitting 34,749 rows under the source-defined healthy execution. No claim is made that 61,384 was captured from the deleted live engine.

Bootstrap is not the missing term: XtdbStorageAdapter.ts:622-649 initialization creates tables, with no assertion inserts. xtdb-seed.ts checks initial scope position 0. Shared account/bootstrap-like worlds are already in populationCounts. The storage spy also observes zero assertion rows after public runtime initialization.

Retractions are not involved in this seed. They update the existing assertion's retraction fields (XtdbStorageAdapter.ts:529-544), while the public journal records the change. The regression separately exercises retract-old/assert-new in one public transaction: the old assertion identity remains, one new assertion is inserted, and two change rows share one changed-entity row. It gets 7 journal rows for that replacement transaction, not a business-row subtraction or two changed-entity rows. This validates public/adapter identity accounting; it is not live validation of XTDB temporal slicing for arbitrary histories.

## Visibility and wire-count hypothesis

Pinned clean XTDB source: c6c19623d90c658c15400fb46dc056f3735ed57b. Numbered excerpts and hashes are in evidence/round12/diagnosis-source.json.

* XtdbClient.ts:255-263 uses **COMMIT SYNC** and obtains the writer's await token. Subsequent queries on that client apply it (:182-191). The pin opens a new client and raw reader; it supplies no explicit snapshot token or writer await token.
* XTDB pgwire.clj:563-572 begins a new implicit read transaction; :584-607 dispatches synchronous commits and rethrows execution errors. Xtdb.kt:1004-1008 makes commitSync call executeTx; :333-340 and :355-358 submit and wait for the indexed transaction result.
* Xtdb.kt:684-698 pins a read basis by awaiting the applicable token and selecting `dbCat.snapshotToken()` when no snapshot is supplied. Database.kt:580-585 builds that token from latest-completed system times. Null await token does not mean an old empty snapshot; it means no additional token wait, after which the current completed snapshot is selected.
* G0 checks the scope's final application position before reading counts. The live stack reached the count check, so that scope check succeeded. XtdbStorageAdapter.ts:212-267 persists assertion rows, claims, tx_meta and attempts in one submitted transaction. With synchronous commits and fresh implicit reads, normal indexing lag cannot expose the final tx_meta position while omitting that same committed transaction's assertions at a later completed cut.
* FOR ALL VALID_TIME removes default valid-time filtering; it does not request old system-time versions. This seed creates each assertion identity once. COUNT returns a small exact integer; the reader validates it as a safe integer. The native numeric probes also succeeded, but their counts do not establish the missing live seed count.

This supports the expectation bug as a sufficient cause. It does not prove every actual engine observation from the deleted volume. No visibility retry, sleep-until-count-matches or reading an observed count into the expected value was added.

## Changes and tests

`expectedN01` now requires a valid batch size from seedInputs and independently validates account count, command count, business counts and final position against the input plan. It expects 61,384 stored assertions for this seed, while preserving result.assertions/expectedAssertions as 26,635 business assertions. The new helper is included in the seed-generator pin. Existing pins/goldens must be regenerated; the shared G0 interface is unchanged.

The count-refusal error now retains expected and observed counts, scope and position at the failing read boundary. That will preserve the information missing from live2 if a later attempt refuses. The first-failure rule stays unchanged.

Six new controls use the built **public core/runtime exports**, without an engine or private source import: captured-input 500-subject replay; same-transaction retract/assert; three additional batching cases (including split account chunks and an oversized single subject); invalid count-plan inputs. The storage spy records real TriplesLive insertions and supplies returned business receipts to the real seedRung. It is not an XTDB emulator and does not qualify native serialization, SQL visibility or full E1 normalization. The count regression first refuses with the legacy expectation, then completes readG0 with the corrected count; ±1 row mutations still refuse, as do tampered reported counts/positions/accounts.

Final command:

```sh
node lab/bin/heavy.mjs --label CX-K01-R12-offline -- node lab/verify/K01/run-round12.mjs
```

Final results: **235 builder + 30 prior reviewer + 98 column + 57 representation = 420 tests**, no skipped/cancelled/TODO cases; tsc exits 0. The receipt pins 62 sources, including core source and built journal/runtime modules used by the spy. A first development gate had all 420 tests passing but a test-only TypeScript TS7053 error in the tamper-key loop; it is retained in development-1. Adding a literal-key `as const` fixed it before the final source-bound run. All final source/log hashes and diff checks pass. No failed result was overwritten or promoted.

## PASS / verdict / receipt audit

| Transition | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `expectedN01` input plan (no PASS) | Business closed form plus per-command journal count; independent account/command checks | Recomputed from this manifest's inputs; no observed count adoption | Captured generator inputs, batch partition and pinned helper/source bytes |
| `readContent` / source pin | All schema-derived rows and independent counts, now including journal; W0 comparison unchanged | Bounded current reads, scope before/after and native catalog checks | Expected scope/position/counts/world in D; native type/OID/bytes retained |
| `readE1G0` Dprime pin | Same full D and documented generated-field/clock relations | Two complete reads must agree on D | Dprime/2 tied to the same expected inputs and normalization assignments |
| `admitG0` sole admission PASS | Fresh full D must equal a valid pre-freeze pin; all count mismatches still throw | New measured-endpoint read before warm-up | Exact expected binding and endpoint in receipt; no Dprime substitute |
| Golden publication / E1 equality (unchanged, unrun) | Two clone starts must reproduce D/L; each E1 arm passes its full D | Separate bounded reads | Source manifest/key, exclusive holder/slot and reference golden; diagnostics grant nothing |
| Offline fixture/test receipts | Original file hashes, real public-writer row tally, expected refusals and suite/log hashes | Unique development/final attempts; current runtime hashes | Captured inputs versus explicitly reconstructed rows; exact commands, sources and output paths |

The new count helper produces expected values or throws; it does not grant admission. No new process evidence grants PASS. The fixture's pin is an offline model result and is never an engine/clone qualification receipt.

## Contract and next live attempt

lab/acceptance remains unchanged. No textual acceptance references to changed paths were found in the current main tree. evidence/round12/changed-paths.json lists each old/new path hash for re-pinning as applicable, including these runtime changes:

| Path | Parent SHA256 | New SHA256 |
| --- | --- | --- |
| lab/bench/lib/g0-xtdb.ts | 21560713bea2d4b9eb74a4b75e29f0a022249b3d6a21ef0e865cb60eb35aca67 | ccd6add7e50b3ce8da3cbe0acc46a2f73b289b8db2ac6bdbfa3e418c36969ca4 |
| lab/bench/lib/g0.ts | d2995b912bbe0460b3eb1c53a728f2242046676de73f43a401f26d6b4ad6f195 | 1f98f70db84383b8c3ea489fa9b11f8fab9bbfc0b60193569f778fc34850b1eb |
| lab/bench/lib/n01-counts.ts | new | a2a9a613ad6a40108cc200ce7050ffd855f48947945559f0f440d4c6d2971601 |
| lab/bench/xtdb-seed.ts | 82ac7eb63a49c4be16d0543baac362d7bba1a3c1aed298d9578f2365aa61e0a3 | b3f48c0c9caba9bf0751c4663ad0086f09d6533e87f6523a4579d6dc5d0fa99a |

[LIVE-round12.md](LIVE-round12.md) uses a new run path/holder, explains the corrected business/journal distinction and preserves first-failure cleanup/retention. No command from it was run now. The engine count, source D/Dprime, freeze, two-start D/L, fresh-seed E1 and remaining native-kind checks still need a separate admitted live run. No volume is created or kept by this round.

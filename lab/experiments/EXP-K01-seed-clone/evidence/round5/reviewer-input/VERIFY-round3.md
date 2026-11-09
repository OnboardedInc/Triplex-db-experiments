# K01 round-3 offline review: FIX-FIRST

Reviewer: CX-VK01. Reviewed builder: `9254ec3b` (implementation `2c0e5867`). Merged into `verify/K01` at
`6ad85278d8ad4658ba00f17d2b4d076e84fbcd55`. All reviewed implementation files match the builder byte-for-byte.
The only merge conflict was the freshness test adapter; its previous version is retained in
`evidence/review-round3/merge-input/freshness-original.mjs`. The builder's adapter is used for the new owner API and Q83e.
No implementation fix was made in this review.

North star: reliable seed reuse and current evidence for P1-P5. Goals and targets remain `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, and `lab/TARGETS.md`. This review applies Q83e as supplied by the orchestrator, along with R26/R30
and the prior findings; it does not grant live qualification.

**Verdict: FIX-FIRST.** All 134 existing tests, benchmark TypeScript, and syntax checks pass freshly. The new 36-case
suite has 28 passes and 8 desired-behavior failures, grouped into three findings below. No test is skipped or marked
expected-failure. There is no demonstrated transaction-message bypass of Q83e's family whitelist; its payload validation
and two surrounding freshness paths still need fixes.

## Q83e against pinned XTDB

The upstream checkout is clean at `c6c19623d90c658c15400fb46dc056f3735ed57b`. Exact file hashes and numbered source/schema
excerpts are in [codec-source.json](evidence/review-round3/codec-source.json). The native-decoder behavior described here
is derived from that source; I did not execute XTDB's Kotlin/generated Java codec.

| Encoding | Pinned codec/processor meaning | Reviewed classifier behavior |
| --- | --- | --- |
| Header `0xff` | `LegacyTx` | Classified Tx and refused after F |
| Header `0x03`, outer field 6 | `Tx` | Refused after F |
| Header `0x03`, outer field 3 | AttachDatabase; processor uses `appendTx(indexDbOp(...))` | Refused after F |
| Header `0x03`, outer field 4 | DetachDatabase; processor also appends a transaction | Refused after F |
| Header `0x03`, outer field 2 | TriesAdded; publication/compactor control data | The intended maintenance family; accepted, but nested validation is incomplete (R3-F1) |
| Header `0x03`, outer field 1 | FlushBlock only when `expected_block_idx` is present; otherwise codec returns null | Accepted as F's cut anchor even when it decodes to null (R3-F1). Refused as an extra message after F |
| Legacy header `0x02` | Ignored legacy flush; codec returns null | Unsupported/refused, a conservative restriction |
| Unknown/reserved encodings or ambiguous multiple outer fields | Unsupported or not a recognized operation | Refused rather than guessed to be maintenance |

The post-F allowlist is **TriesAdded only**, matching Q83e's named maintenance encoding. A further FlushBlock is not on
that allowlist even though it is not an application transaction; it can change the checkpoint/catalog lifecycle. The
code correctly refuses both transaction encodings and the database operations that produce transactions. It does not
classify arbitrary source-head advancement as maintenance.

**Application messages anywhere in `(F,M]`:** independent fixtures use valid LocalLog framing and a schema-correct cut
anchor. Twenty cases place Tx, LegacyTx, AttachDatabase, or DetachDatabase at each of five interval positions, surrounded
by maintenance records, while the supplied observed T stays unchanged. All 20 refuse. Both mixed Tx/TriesAdded outer-field
orders also refuse as ambiguous. This includes first, middle and final interval records; checking just the final record
would not pass this set.

**Independent T:** `gauges()` reads `node.tx.latestCompletedTxId` separately from submitted/processed source message ids.
The pinned gauge implementation reads `liveIndex.latestCompletedTx`, while M comes from the source watcher/log head
(`Database.kt:375-387`). Settle compares the current application gauge with the seed T and the block's transaction id.
The new control accepts stable T with later M provisionally, with `qualified:false`; changing T with the same M refuses.
`verifyMaintenanceTail` receives that independently observed T as a bound input; it does not pretend to derive T from the
maintenance messages.

**Stopped-byte and resume binding:** source review confirms contiguous frame sizes/absolute trailers, the interval's
last record id equal to M, no record beyond M, retained raw tail bytes, re-decoding on golden load, a second stopped
reference tail, and reference/clone start checks at M. The 16 MiB and same-epoch limits fail closed. These remain offline
parser/control checks, not proof of an actual engine stop/copy/restart. R3-F1 prevents accepting the current decoder as
fully faithful to the pinned source format.

## Findings

### R3-F1 — MEDIUM: family tags qualify payloads the pinned codec would ignore or reject

**Location:** `lab/bin/xtdb-log.mjs:36-41` and `:59`; faulty positive fixture at `lab/verify/K01/tail-fixtures.mjs:9`.

`sourceMessageKind` validates generic protobuf framing, but it does not validate FlushBlock's required-for-a-cut field
presence. Pinned `log.proto:43` declares `expected_block_idx = 2`, and `SourceMessage.kt:61-65` explicitly returns null
when it is absent. The builder fixture `[03 0a 02 08 00]` encodes **field 1**, so it is not a cut in XTDB's codec.
The schema-correct zero-index anchor is `[03 0a 02 10 00]`.

Three negative fixtures (empty body, unknown field 1, and wrong wire type for field 2) all return `proof.ok:true`, although
none has the field presence that the native codec requires to recognize a cut. They therefore cannot prove that F names
the cut. Separately, validation recurses into TrieDetails only one level. A known `trie_metadata` field containing the
invalid protobuf tag-zero byte is not parsed at all, and is also certified as maintenance. The native schema requires
that nested value to be a decodable TrieMetadata message.

**Reproduction:** the four `R3-F1` tests in [q83e-review.test.mjs](q83e-review.test.mjs). Actual outputs, raw payload hex
and source-based codec inference are retained as `anchor-*` and `invalid-nested-metadata` in
[new-cases.json](evidence/review-round3/new-cases.json). All four desired-refusal assertions fail. The adjacent valid
field-2 anchor/maintenance control passes. These results do not show an application transaction hidden in TriesAdded;
they show malformed/non-cut bytes being accepted as a valid stopped-tail proof.

**Proposed fix:** validate supported bodies using the pinned schema, including expected-block-index presence/type and
all nested message structure. Bind the decoded cut index to the intended checkpoint block rather than accepting the
family name alone. Correct the builder fixture and regenerate its binary evidence; retain malformed anchors and nested
messages as explicit refusals. Unknown/unsupported schema content should fail closed rather than be relabeled valid.

### R3-F2 — MEDIUM: re-verification trusts C1's old PASS bit despite contradictory/missing hashes

**Location:** `lab/bench/clone-check.ts:243-245`.

The new certificate detects a mutation *after* a previous certificate was issued, but C1 re-verification still uses
`!!c1.pass`. It does not compare the copy's recorded tree hash/observed hash with the loaded golden's expected tree hash,
or check that those hashes exist. A current record with `pass:true, expected:good, observed:different` is certified C1
PASS; so are a wrong expected-golden hash and a record with no hash evidence. The code reports the contradictory fields
next to `pass:true` in the resulting verdict.

**Reproduction:** the three failing `R3-F2` cases run actual `clone-check` verification with each contradictory/missing
copy proof, while the other gates have matching current observations. All three return C1 PASS and overall PASS. The
matching-proof control passes. See `C1-different-observed`, `C1-wrong-expected` and `C1-missing-hashes` in the case file.
This is an offline metadata-integrity counterexample; no different physical clone was created. The parent verifier's
new certificate hash binds whatever current copy metadata it receives, so hashing that metadata cannot by itself repair
the missing C1 comparison.

**Proposed fix:** recompute C1's verdict from the immutable pre-start copy receipt: valid required hash values,
`record.copy.treeSha256`, `owner.volumeContent.copy.treeSha256`, and C1 expected/observed must agree, with the proper
golden/copy identity. A saved PASS flag alone is not evidence. Preserve the complete certificate binding and refuse
unsupported legacy/incomplete evidence; do not compare a live appended replica log with its pre-start bytes.

### R3-F3 — HIGH: `down` can remove the current container without revoking a pending verification

**Location:** `lab/bin/engine.mjs:328-357` (`down`), publication at `:978-984`.

`stopSlot` now invalidates readiness before stopping, and final publication uses the real owner-state lock. `down`
performs Docker stop/removal and optional volume removal without that initial invalidation. It only takes the owner-state
lock later to release the slot. Therefore a verifier can make its final running/start check, then a concurrent same-holder
`down` can remove the container and wait for the pool lock. The verifier acquires the owner-state lock, still sees its
PENDING attempt, and publishes PASS for the already removed container. The driver admits that record until slot release.

**Reproduction:** the failing `R3-F3` test executes actual `verify`, `down`, `releaseSlot`, and the **real** `updateOwner`/
directory-lock implementation over local owner files. Only engine/pool responses are simulated. Down is paused at its
pool update after container removal, between the verifier's final running check and its locked publication. Observed:
`running:false`, `containerPresent:false`, readiness PASS and actual `seedPathOf` admission true. The no-down control
publishes and admits only a running container. Event order and the published owner are in `down-race-true`.

No actual container or volume was touched. The counterexample shows a lifecycle invalidation gap in cooperating engine
operations, not an uncooperative manual owner-file edit, and does not assert that a live query succeeded after removal.

**Proposed fix:** mark the current owner generation/readiness non-admissible under the same owner-state protection
*before* `down` starts physical teardown. The final verifier must observe that supersession. Protect release against
deleting a later owner generation as well. A final unlocked running check or an atomic rename after teardown is not a
substitute for the invalidation transition.

## Previous findings and remaining variation results

| Earlier finding | Fresh result |
| --- | --- |
| R2-F1 prior-run golden cleanup | The adapted historical-artifact regressions pass. Two independent current-vs-old creation UUID cases execute actual `goldenRm`; only the matching UUID reaches removal. No new cleanup defect was found in these cases. |
| R2-F2 older owner publication | The adapted counterexample and builder's two real-process lock-order tests pass. The metadata read/compare/write transition is now locked; R3-F3 identifies the uncovered lifecycle caller. |
| R2-F3 copy/golden binding mutation | Certificate and start-identity mutation tests pass. R3-F2 is the distinct re-certification case where the current proof itself is internally contradictory. |
| R2-F4 failed proof acquisition | The prior failures and added signal/error/invalid-start/final-identity cases pass. Current command status is checked before proof acceptance. No additional acquisition failure was found. |

The old blanket F<M refusal assertions were legitimately replaced by Q83e provisional settlement plus actual tail
qualification. I inspected the adaptation patch and kept the prior test source; no defect assertion was marked TODO,
skipped, or converted to expected-failure. Native-shaped decoder evidence still needs the R3-F1 fixture correction.

## Fresh execution and artifacts

| Gate | Result |
| --- | --- |
| Original focused suites | 41/41 PASS |
| Adapted original reviewer suite | 21/21 PASS |
| Round-3 boundary suite | 23/23 PASS |
| Adapted round-2 freshness suite | 14/14 PASS |
| Builder round-4 suite | 35/35 PASS |
| New independent suite | 36 tests: 28 PASS, 8 FAIL; failures are R3-F1 (4), R3-F2 (3), R3-F3 (1) |
| Benchmark TypeScript | exit 0 |
| Reviewed JavaScript syntax | all exit 0 |

There are zero skips/TODOs/cancellations. Raw TAP, source hashes, commands, exits/signals and merged head are in
[existing-run.json](evidence/review-round3/existing-run.json), [new-run.json](evidence/review-round3/new-run.json), and the
adjacent TAP/case files. [environment-checks.json](evidence/review-round3/environment-checks.json) records actual completed
dependency and TypeScript commands. Prior case files were restored after the suites wrote them; new results use their
own round-3 directory. The first new-suite development trial had an incorrect function-extraction end marker; its exact
executed source and outputs are retained in `development-36/`, explicitly not used as the final down-race evidence.

The verifier worktree initially had no dependencies. Pinned pnpm 10.11.0 installed from the given store with
`--offline --frozen-lockfile --ignore-scripts`, then the local TypeScript 6.0.2 check passed. No lockfile/source contract
was changed and no sibling checkout source or build was imported. Installed dependencies are retained for reruns.
Disk readings stayed above the 5 GiB floor; receipts retain the readings. Review scratch is local and removed after jobs.

Reproduce the two suites under the shared heavy semaphore:

```sh
node lab/bin/heavy.mjs --label CX-VK01-round3-existing -- node lab/verify/K01/run-review-round3.mjs
node lab/bin/heavy.mjs --label CX-VK01-round3-new -- node lab/verify/K01/run-review-round3.mjs --new
```

The first exits 0; the second exits 1 until the eight assertions are satisfied. Use the local TypeScript command recorded
in `environment-checks.json` to repeat that separate gate. Review artifact hashes are in `evidence/review-round3/SHA256SUMS`.

## Limits and next work

No Docker execution, engine start/stop, volume creation/removal, engine slot, resident modification, network/service
request, main-checkout edit, implementation fix, push or production acceptance occurred. Only offline dependency reads/
installation, local test processes and the shared heavy-test grant were used. The requested merge is on `verify/K01` only.

The F/M/T design addresses the structural watermark mismatch from last round, and application-carrier interval checks
held in every tested position. Acceptance remains blocked by the three concrete findings. After fixing them, re-run the
source-bound offline gates and correct native-format fixtures, then independently qualify a real stopped source,
reference start and clone at M in an admitted window. T1-T7, live C1-C8, C10/E1/PAIR-0, large-rung behavior, the 16 MiB
tail bound at scale and performance remain unverified here; no full monorepo check was run.

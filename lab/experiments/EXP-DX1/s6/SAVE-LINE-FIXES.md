# S6: fixes to the save line after the S5 review

Branch `exp/DX-S6-save-line-fixes`, based on the save line's head `2d78680f7` with the review branch (`316d13d22`)
merged. The review's tests are now a standing gate phase (`s6/clj-run.sh` modes `fuzz` and `attack`). Mac figures
are toy-size and diagnostic. Every option stays default off. Written 2026-11-24.
[The review](../s5/REVIEW.md) · [Creation saves](../s4/CREATION-SAVES.md) · [Save shape](../v01/SAVE-SHAPE.md)

**In brief.**

- **F1 is fixed on every write route.** A failure after the transaction is handed to Datomic is a refusal only when
  a stored function or Datomic decided it. Anything else, including anything unrecognised, is answered
  `503 OutcomeUnknown`.
- **The SDK now decides an unknown outcome.** It looks the operation up, and when it is not stored it calls a new
  fence route. The fence stores the operation ID without a position, so the original can never commit.
- **The answer is then exact.** Either the original receipt, or `DatomicOperationNotApplied`, a conflict that a
  replay-safe save replays under a fresh operation ID.
- **F2:** lookups are priced in the estimate. An import frame reads only what it writes. With `TX2_READ_SET_BOUND=1`
  every class refuses a repeated name or a read set of more than 4,096 names.
- **F3:** a save racing a removal on request is `409 CasConflict` on every writer. It is `ErasureFrontierChanged`
  only when the request itself named the frontier.
- **F4 and F11:** a creation framed after the removal commits. A removal made on a gateway without the creation option
  now counts too.
- **F5:** the card fails a run in which no eligible save took the per-subject writer.
- **F6:** the 5 values are restored to the base's.
- **F9:** the several-owners and creation writers use `group/classify`'s account rule.
- **F7, F8 and F10** are stated (sections 7 and 10).

## 1. F1: decided or unknown

**The rule** (`outcome.clj`, `storage.clj` `commit!`, `main.clj` both catches):

1. **Before the transaction is handed to Datomic**, nothing was sent. Every failure keeps today's decided answer.
2. **After it is handed over**, a failure is decided only when the cause chain carries one of these:
   - a stored function's refusal marker;
   - Datomic's `:db.error/cas-failed`, `unique-conflict` or `datoms-conflict`;
   - the gateway's own 4xx.
3. **Everything else after hand-over is unknown:** `503 OutcomeUnknown`, with the failure's class named in the answer.
4. **On the other write routes** (`erase`, `protection`, `restore-erasure`, `create`, `delete`, `fence`), a failure
   without a status is 400 only when decided, and otherwise `503 OutcomeUnknown`.

**The fence** (`POST /v1/db/<db>/fence {"operationId"}`):

- It transacts `{:db/id "datomic.tx" :triplex.tx/operation-id id}`, a transaction with no position.
- `:triplex.tx/operation-id` is `:db.unique/value`. A late original is therefore refused `TRIPLEX_OPERATION_DUPLICATE`
  by its own function, and the fence of a committed save fails with a unique conflict.
- After a unique conflict the gateway syncs and answers the operation's state: committed with its receipt, or absent
  and fenced.
- `storage/operation` answers `{"status":"absent","fenced":true}` for a fenced ID.
- The feed and the log skip the fence: it has no position, so the log names it `non-triplex`.
- Positions, the head and the next save are unchanged (section 1.2).

**The SDK** (`DatomicStorageAdapter.ts` `persist`, `DatomicClient.ts`):

- After a transport failure, a 5xx or `OperationDuplicate`, it looks the operation up.
- If the save is committed: the original receipt.
- If it is absent and not fenced: fence. The fence answers committed (the receipt) or fenced (decided not applied).
- If either call fails: ask again until `resolutionTimeoutMs`, which is the stated bound (default 45 s).
- A fenced save throws `DatomicOperationNotApplied` (a `DatomicSerializationConflict`). `TriplesLive.transact` is
  replay-safe, so it is re-read and re-staged with a new operation ID; the fenced one can never commit.
- `transactResolved` gives import and settlement frames (`transactBulkFrames`) the same resolution.
- `transactCommand` fences when the command is not found.
- `erase` and `declareProtection` resend on an unknown outcome. Both are keyed and idempotent: a removal by its
  command, a declaration by its attributes.

### 1.1 Every exception the commit path can see, and its class

| Exception | Where it arises | Class | Answer |
| --- | --- | --- | --- |
| Codec `InvalidValue`, malformed request | gateway, before submit | Decided | `400 InvalidValue` |
| Operation ID already stored (pre-check) | gateway, before submit | Decided | `409 OperationDuplicate` |
| Frame bound, import bound, read-set refusals (`BulkFrameTooLarge`, `ImportCommitTooLarge`, `ReadSetTooLarge`, `ReadSetDuplicate`, `ImportReadSetNotWritten`, `ImportReadOnlyPredecessor`) | gateway, before submit | Decided | 400 or 413 with its code |
| Privacy checks (`ErasureFrontierChanged` from `ensure-seq!`, `ErasedAssertionIdentity`, `ErasureReplayDeclined`, `ProtectedTypeUnsupported`, `ProtectedWriteRequired`), `OwnerLayoutRequired` | gateway, before submit | Decided | 4xx with its code |
| `WriteQueueFull`, `CommitOrder*` (order queue) | gateway, before submit | Decided | its own status |
| Any other failure while preparing (`tx-data`, plans) | gateway, before submit | Decided (nothing sent) | 400 or 409 by marker, as before |
| `TRIPLEX_CONFLICT`, `TRIPLEX_IDENTITY`, `TRIPLEX_SLIM_LAYOUT_MISMATCH` | stored function | Decided | `409 CasConflict` / `IdentityConflict` |
| `TRIPLEX_CLOCK`, `TRIPLEX_CLOCK_EXHAUSTED` | stored function | Decided | `409 ClockConflict` / `ClockExhausted` |
| `TRIPLEX_ERASURE_FRONTIER` | general writer | Decided | `409 CasConflict`, or `ErasureFrontierChanged` when the request named `erasureSeq` (F3) |
| `TRIPLEX_OPERATION_DUPLICATE`, `TRIPLEX_COMMAND_DUPLICATE` | stored function | Decided | `409 OperationDuplicate` / `CommandConflict` |
| `TRIPLEX_IMPORT_PREDECESSOR` | general writer | Decided | `409 ImportPredecessorMissing` |
| `TRIPLEX_SUBJECT_REPLAN` | per-subject writer | Decided, then re-planned on the general writer | the retry's answer |
| `TRIPLEX_GROUP_STALE` | group scheduler | Decided | retried by the scheduler |
| `TRIPLEX_ERASE_HEAD_MOVED`, `TRIPLEX_PROTECTION_MIGRATION_REQUIRED` | removal and declaration functions | Decided | retried, or `409 ProtectedScopeNeedsMigration` |
| `:db.error/cas-failed`, `:db.error/unique-conflict`, `:db.error/datoms-conflict` | Datomic | Decided | 409 by attribute (`CasConflict`, `OperationDuplicate`, `CommandConflict`, `IdentityConflict`) or 400 |
| Deref of the transaction timed out (5 s) | gateway | Unknown | `503 OutcomeUnknown` |
| Receipt does not match the plan (`verify-report`) | gateway, after commit | Unknown | `503 OutcomeUnknown` |
| Anomaly `unavailable`, `interrupted`, `busy`, `fault`; "Transactor not available"; `:db.error/transactor-unavailable` | peer | Unknown | `503 OutcomeUnknown` |
| Connection reset, `SocketException`, `IOException`, `TimeoutException`, `InterruptedException` (in `ExecutionException`) | peer | Unknown | `503 OutcomeUnknown` |
| Any other exception after submit, including ones the gateway has never seen | anywhere | Unknown | `503 OutcomeUnknown` |
| `ErasureFrontierUnavailable` (`privacy/unavailable!`, also after a removal's transact timed out) | removal and declaration | Unknown (5xx) | the client resends the same command |
| The fence's own transact fails or times out | fence route | Unknown | `503 OutcomeUnknown`; the client asks again |

**The other write routes.** Every one of them goes through the same rule.

- Import frames and settlement frames are `transact` with a write class, so they go through `commit!`.
- Publish writes through `TriplesLive.transact`, so it goes through `commit!` too.
- Removal, declaration, restore, and creating or deleting a scope go through `main.clj`'s catch: a failure without a
  status is 503 unless decided.

### 1.2 In process: every fault point, every writer (`s6/outcome_gate.clj`)

RESULT_OUTCOME

### 1.3 The SDK end to end on PostgreSQL, with faults (`s6/stack.sh`, `s6/sdk-stack.ts`)

RESULT_STACK

## 2. F2: the estimate against the writer

RESULT_BOUND

## 3. F3: one refusal code for a save racing a removal

**The decision: `409 CasConflict` on every writer.** It becomes `ErasureFrontierChanged` only when the request itself
named the frontier (`erasureSeq`, as the importer and protected deliveries do).

**Why: the contract.** `SAVE-SHAPE.md` section 1, item 6, says that if anything in a save's conflict set changed after
its source position, the whole save is refused `CasConflict` and nothing is written.

- A removal on request, or a protection declaration, landing between a save's read and its commit is such a change.
  The save's frame is stale.
- The right action is to re-read and re-stage. The SDK does exactly that for `CasConflict`.
- After the re-read, the save cannot carry a removed value: the removal is in its new source.

**When `ErasureFrontierChanged` is kept.** A caller that stated a frontier (`erasureSeq`) asked "commit only at this
frontier". It must fetch the new frontier, which is what `ErasureFrontierChanged` tells it (IMP2's importer does this).

**How it is chosen.** In the gateway, after the refusal; no stored function changes:

- the general writer's `TRIPLEX_ERASURE_FRONTIER` maps to `CasConflict` unless the request named `erasureSeq`;
- for a request that named it, a per-subject `TRIPLEX_CONFLICT` maps to `ErasureFrontierChanged` when the scope's
  removal sequence moved (`frontier-moved?`, one sync after the refusal).

**The tests now measure the control instead of assuming it:**

- `s4/create_gate.clj` (lines 197-199) races the general writer at the same point (`race-at-submit`) and asserts
  `[409 CasConflict]`; the constant is gone.
- `s3/owners_gate.clj` has the control it lacked: `removal-on-request-between-plan-and-commit-general-control`.
- The review's `save-racing-a-removal` and `first-save-racing-protection` now pass. See section 9.

## 4. F4 and F11: a creation of a family a removal named before the entity existed

**Is the refusal right? Only for a frame from before the removal.**

- A save framed before the removal can carry the removed value: its data predates the removal. It is refused whole,
  `ErasureReplayDeclined`, as before.
- A save framed at or after the removal (its `sourceK` is at least the removal's position) writes a new value. It is
  the same as a new value written onto an existing entity after its own removal, which already commits. It now
  commits too.
- A save that states no source is treated as framed before.

**The rule's code:** `subject_create.clj` `removed-creation?` and `family-removed-at`.

**F11.** A removal entry records its selectors on every gateway, whatever its options. `family-removed-at` derives the
named families from the selectors as well as from the recorded families. A removal handled on a gateway without the
creation option therefore still refuses a creation framed before it.

**Costs and limits:**

- The check reads every removal entry of the scope for each protected value written onto a new entity. A database
  with many removals will want an index of named families by entity; not built.
- A selector without an attribute names every attribute protected now, not only those protected when the removal
  ran. This can only refuse more, never less.
- Option-off behaviour is unchanged: the rule runs only with `TX2_SUBJECT_CREATE=1`.

RESULT_RACE_F4

## 5. F5: the card's identity check

`v01/adopted.ts` `checkWriterSplit` runs after every card arm:

- With the per-subject writer on, at least one eligible save (it has a save key and was not sent with the general
  identity) must take a per-subject function.
- With several owners or creations on, every tape M save (it names its owners) must either take a per-subject
  function or carry the gateway's typed reason (`subjectDeclined`).

`v01/writer-split.test.ts`: 3 of 3 pass.

- A wide-writer run in which every eligible save went to the general writer fails.
- A tape M save on the general writer without a reason fails.
- A general arm and general-identity saves are not counted.

## 6. F6: the 5 stored values that differed from the base

**Restored.** The S2 edit to `subject_save.clj`'s plan removed one term of an `and`, so the namespace generated one
name fewer. `subject_save.clj` now takes back exactly that one name (`(gensym)` right after the plan), so the
namespaces loaded after it embed the base's names again.

RESULT_IDENTS

**Rejected:**

- Hashing the code after renaming generated symbols: every identity changes, options off included.
- Removing generated names from the two functions' quoted code: both identities change again, away from the base.

**The hazard stays.** Any future edit to a namespace loaded before the stored functions can shift them again.
`s4/idents.sh` against the base is the check; the page's identity table is its output.

## 7. F7 and F8: the excision scan at the serial point

**Counted.** The number of excision entities each per-subject commit scans is the number of `:db/excise` entities in
the database. No product path excises:

- The gateway never transacts `:db/excise` outside the `feed_live.clj` diagnostic.
- A removal on request masks an unsealed value, and a sealed scope destroys the key.
- The review measured 0 excision datoms after 2,000 removals on the memory database.

So on every product path the scan reads one empty index range per per-subject commit.

**Not removed from the serial point.** It cannot be made exact: an excision is made by an operator with Datomic's own
API, outside the gateway, so no counter or flag the gateway keeps would see it. The scan is the only check that does.
It costs one datom per excision entity.

**F8 (stated for operations).** One excision of anything other than a protected body turns every per-subject writer
off for the whole database, for good. That is the safe direction: the general writer takes every save. The rule for
operations: never excise outside the gateway. If someone does, the per-subject writers stay off until the database is
rebuilt.

## 8. F9 and F10

**F9.** `subject_owners.clj` `one-account?` now uses `group/classify`'s rule:

- an owner's account is its `acct/` prefix, or else its stored `:subject/account` on the lean layout;
- every owner must have the same one, and an owner with neither counts as no account.

`s6/race_gate.clj` `account-rule-matches-classify` tests it:

- two unprefixed owners with two stored accounts are declined `several-accounts`, and the general writer commits;
- with one stored account, the several-owners writer takes the save.

**F10.** The IMP2 page (`imp2/WHOLE-SUBJECT.md` section 2) is corrected. With `TX2_SUBJECT_CREATE=1`, an import frame
of one to four new subjects of one account, with one claim and a source, takes the creation function.

## 9. The standing gate phase and the other gates

RESULT_GATES

## 10. What is still not tested

RESULT_UNTESTED

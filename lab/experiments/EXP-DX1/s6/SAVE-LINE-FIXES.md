# S6: fixes to the save line after the S5 review

Branch `exp/DX-S6-save-line-fixes`, based on the save line's head `2d78680f7` with the review branch (`316d13d22`)
merged. The review's tests are now a standing gate phase (`s6/clj-run.sh` modes `fuzz` and `attack`). Mac figures
are toy-size and diagnostic. Every option stays default off. Written 2026-11-24. Evidence: the archive
`DX-S6-save-line` (`final-959634af4.tar.gz` sha256 `75c4112f…`, `earlier-runs.tar.gz` `d319ca1f…`), kept outside the
repository.
[The review](../s5/REVIEW.md) · [Creation saves](../s4/CREATION-SAVES.md) · [Save shape](../v01/SAVE-SHAPE.md)

**In brief, after the second review (S6b, section 12).**

- **One stored form per ID.** An operation ID is stored as sent everywhere, so a fence and its save can never
  disagree (R2-1, both paths). A command ID's form is chosen once (`stored-ids`) and re-applied by the replan retry.
- **The account setting is in the database and one-way.** Turning it on moves every save-writer function to a twin
  ident and leaves a refusal under the old one, so a save prepared before the transition and every save of an older
  build are refused, never stored under the plain key.
- **One mechanism for both lines.** The Publish builder's join layer drops its own `joined:v2` form and uses this one
  (section 12.4).
- **R2-2:** a replay carries its first attempt's source; a replay framed before a removal of a family it writes is
  declined.
- **R2-3 to R2-11** are fixed or stated in section 12.3; R2-10 is measured.

**In brief (S6).**

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
- **F7, F8 and F10** are stated (sections 7 and 8).
- **Command and operation IDs across accounts** (the Publish builder's finding), section 9.
  - Today, one account can deny another's IDs and read back its transaction.
  - With `TX2_ACCOUNT_CLAIMS=1` (default off) and the SDK's `claimAccount`, both IDs are the account's own. Over
    10,000 two-account schedules, each account got exactly its answers alone, except the shared assertion IDs, which are
    database-wide by design.
- **The SDK end to end on PostgreSQL:** 12,000 saves under 27 faults, with no stored save reported failed, no unstored
  save reported stored, and every receipt the stored one (section 1.3).
- **Identities:** equal to the base in every setting with every option off. All gates ran on the image built from the
  head (sections 6 and 10).

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

**The setup.** 4 writers (one-owner per-subject, several-owners, creation, and the general writer) times 12 faults,
injected at `d/transact-async`. The faults:

- the transactor unavailable before and after apply;
- interrupted after apply;
- `:db.error/transactor-unavailable` after apply;
- a connection reset before and after apply;
- a `TimeoutException` after apply;
- an unrecognised exception before and after apply;
- the 5 s deref timing out, with the save never applied, applied before the answer, or arriving after the fence.

**The result: 48 cases per setting, 419 of 419 checks, in each of `server` (every per-subject writer on) and `general`
(every one off).**

- Every case was answered `503 OutcomeUnknown`.
- Lookup plus fence gave the truth in all 48: 28 found committed with the original position, 20 fenced.
- In the 4 "arrives after the fence" cases, the original was refused `TRIPLEX_OPERATION_DUPLICATE` by its own function.
- A resend of the same operation was `409 OperationDuplicate`. The next save committed, and positions stayed
  contiguous.

**Decided refusals stay decided.** A stale predecessor is `409 CasConflict` on all 4 writers: not stored, not fenced.

**The fence itself** (`fence-leaves-feeds-and-positions-alone`):

- a second fence answers the same fenced state;
- the fence of a committed save answers its receipt;
- the feed lists 2 transactions for 2 saves around a fence.

**Removal and declaration with the transactor failing after and before apply:** both are answered
`503 OutcomeUnknown`, never 400. A resend answers 200, and exactly one removal is stored (sequence 1).

**SDK unit tests:**

- `packages/datomic/test/outcome-fence.test.ts`, 5 of 5: the original receipt after a lost connection or a 503;
  fenced means decided; lookup failures are retried; a 409 stays final.
- `command-recovery.test.ts` 6 of 6.
- The whole SDK suite: 470 passed, 53 skipped (they need a gateway).

### 1.3 The SDK end to end on PostgreSQL, with faults (`s6/stack.sh`, `s6/sdk-stack.ts`)

**The stack.** In the lab VM, by image ID on the image built from the head:

- PostgreSQL with `fsync`, `synchronous_commit` and `full_page_writes` on;
- a real transactor;
- two HTTP write gateways under a supervisor that restarts them;
- the SDK: `TriplesLive` over the Datomic adapter with `orderedSaves`, `saveSizeRule`, `severalOwners`, `creationSaves`
  and the replay loop. Four stores, two per gateway, eight workers.

Each store reaches its gateway through a proxy that drops 2% of write connections: half before forwarding (a lost
request), half after the gateway answered (a lost reply).

**The faults, at random while the SDK saves:**

- the transactor stopped (SIGTERM) or killed (SIGKILL) and restarted;
- the transactor paused 6 s (SIGSTOP), which times out the gateway's 5 s deref;
- either gateway killed (SIGKILL).

Then the stack is quiet, and every reported outcome is checked against the log and a read-back of every subject.

| Run (head, image) | Faults | Dropped requests / replies | Saves | Stored | Reported stored but absent | Reported failed but stored | Receipt not the stored one | Unknown at the bound | Positions contiguous | Subjects read back exactly |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `959634af4`, `sha256:8afa5f298ef3…` | 27: 9 SIGTERM, 4 SIGKILL, 4 SIGSTOP of the transactor; 10 gateway SIGKILL | 442 / 462 | 12,000 | 11,844 | 0 | 0 | 0 | 0 | yes (11,844) | 1,862 of 1,862 |
| `18962f332`, `sha256:1b6b073831df…` | 7: 2 SIGTERM, 2 SIGKILL, 1 SIGSTOP; 2 gateway SIGKILL | 274 / 285 | 12,000 | 11,852 | 0 | 0 | 0 | 0 | yes | 1,861 of 1,861 |
| `ce8eb2d31`, `sha256:116b8cc74687…` | 7, the same mix | 264 / 274 | 12,000 | 11,856 | 0 | 0 | 0 | 0 | yes | 1,865 of 1,865 |

**What the SDK reported for the saves it did not store** (156, 148 and 144):

- one `Cannot acquire Datomic source cut` per run: a read before submit;
- all the others `DatomicOperationNotApplied`: fenced, replayed, and out of replays while the transactor restarted.

None was stored. No save ended `TransactionOutcomeUnknown`. Save latency (diagnostic, toy): p50 17 to 19 ms, p99 120
to 143 ms, outages included.

**The kinds of save in each run:** one owner 4,818, wide 1,800, two owners 2,396, creation 1,793, general 1,193.

**Constraint attacks, quiet, after the faults** (the first run, `959634af4`):

- **A unique rule on an attribute two creations write at once:** 20 pairs, each through the other gateway. Exactly
  one committed in 20 of 20. The other answered `ConstraintViolation`.
- **A reference-target rule whose target is retired while a creation refers to it:** 20 runs, 0 dangling references.
  Exactly one of the two committed each time; the other answered `ConstraintViolation`.
- **A release that adds a unique rule between the save's read of the definitions and its commit:**
  - The save names the definitions it read (EntityState precondition) and is refused `TransactionConflict`.
  - A save that read them outside the transaction ("stale definitions") commits under the old rules. The store cannot
    know what a caller did not read.

The earlier `ce8eb2d31` run's precondition case used a `TripleLive` precondition, which TriplesLive refuses without a
matching retraction. Its result is not counted.

## 2. F2: the estimate against the writer

**The estimate now prices lookups.** `import_bound.clj` `estimate-us` adds 12 µs per entity in the read set, per live
predecessor and per command ID.

**The read set is capped:**

- With `TX2_READ_SET_BOUND=1`, every class refuses a repeated name (`ReadSetDuplicate`) or more than 4,096 entities or
  live predecessors (`ReadSetTooLarge`).
- An import frame (under `TX2_IMPORT_WHOLE_SUBJECT=1`) reads only what it writes. Otherwise it is refused
  `ImportReadSetNotWritten` or `ImportReadOnlyPredecessor`.

`s6/bound_gate.clj` (127 of 127 checks) sends each of the 4 classes:

- a warm-up frame;
- 3 honest 100-fact frames;
- the review's 3 adversarial frames (55,000 absent names, one existing subject named 18,000 times, 12,000 read-only
  live IDs);
- 3 frames at the cap.

**Every adversarial frame of the review is now refused by type, in every class.** The review's own attack
(`s5-attack/import-bound-estimate-against-apply`) now asserts that.

**Worst time in the writer over its estimate, among admitted frames.** These are memory-toy figures and diagnostic.

| Class | Worst admitted frame | transactMicros | Estimate (µs) | Ratio |
| --- | --- | ---: | ---: | ---: |
| live | 1 fact, 4,096 read-only live IDs (at the cap) | 50,638 | 61,857 | **0.82** |
| import | warm-up 20 facts | 2,219 | 9,410 | **0.24** |
| activation | 1 fact, 4,096 read-only live IDs (at the cap) | 52,015 | 61,864 | **0.84** |
| notice | 1 fact, 4,096 read-only live IDs (at the cap) | 34,052 | 61,859 | **0.55** |

Honest 100-fact frames ran at 0.07 to 0.17 of their estimate.

**Read the ratios with care:**

- A frame at the cap with 4,096 live predecessors is a legitimate shape: a 4,096-fact replacing save has that many.
  It holds the toy's writer about 50 ms, and its estimate (62 ms) is above the import bound, so an import cannot send
  it. A live save can; no live bound applies unless `TX2_WRITE_BUDGET_US` is set.
- At 1 billion records each lookup can be a cold segment read. The price is a warm figure, which is why the cap, not
  the price, is the bound.

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

**Test: `s6/race_gate.clj`, 22 of 22 checks.** With the removal handled with and without the creation option:

- a creation framed before the removal: `[409 ErasureReplayDeclined]`;
- a creation framed after it: `[200]`, on the creation function, and it stores the new value, never the old one.

The review's `removed-family-after-removal` now shows `creationWithNewValueAfterRemoval [200]` with the option on.

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

**Identities (`s4/idents.sh`, 11 settings, head `959634af4`):**

- **Against the base `23b7df344`:** 58 of 58 equal in all 9 shared settings, the 5 values included.
- **Against the save line's head `2d78680f7`:** 61 of 66 equal in all 11 settings. The 5 that differ are exactly the
  restored ones, now equal to the base. The several-owners and creation functions are unchanged.
- **With every option off** (setting `base`), all values equal.

**The cause, measured.** A probe printed the generated-name numbers inside the 3 affected quoted forms. Their
normalized code was equal, and the names were offset. The S2 condition is written with three terms again (`true`
added), which takes the base's count.

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

## 9. Command and operation IDs across accounts (the Publish builder's finding)

The Publish builder's search (`actv-lazy/PUBLISH-BESIDE-SAVES.md` section 0.2, `bf377c57f`) found that a save's
command ID is unique in the whole database (`schema.clj` 63-64, `commit.clj` 183, `subject_save.clj` 105). Operation
IDs and assertion IDs are unique the same way.

### 9.1 Today (`TX2_ACCOUNT_CLAIMS` off): what one account gets back from another's IDs

Test: `s6/accounts_gate.clj`, setting `accounts-off`.

| Account B does this with account A's ID | What B gets | What it gives away or denies |
| --- | --- | --- |
| Saves with A's command ID | `409 CommandConflict`. The SDK then replays, and its claim check answers `CommandAlreadyCommitted` naming A's transaction ID | Denies B the ID. B learns A's transaction ID. Worse: a B that claimed the ID first makes A's own save answer "already committed" with B's transaction, which A's resend logic takes as its original receipt |
| `transactionByCommand` (the `command` route), the `claim` route, the `begin` prefetch | A's transaction ID (`bClaimTxId` = `bCommandTxId` = A's in the gate) | `TriplesLive.transactionByCommand` then reads that transaction: A's changes, with A's entity IDs, attributes and values. The `claim` route with `receipt` also gives A's position, record time and operation ID |
| Saves with A's operation ID | `409 OperationDuplicate` | Denies the ID; the `operation` route gives A's receipt |
| Commits first under the operation ID of A's save in flight (the F1 shape) | Commits | Before S6, A's SDK looked the operation up, found it committed and settled on B's position: an unstored save reported stored. In the gate A's lookup names B's transaction (`aLookup.txId` is not `aJournal`) |
| Uses A's assertion IDs (an identity block) first | Commits | A's save is refused `IdentityConflict` (400). Assertion IDs are row identities, database-wide by design. The SDK draws them at random, so B must already know them |

**What B can learn:** whether an ID is used; the transaction, position and record time that used it; through the
transaction, the rows.

**What B can deny:** any ID it learns or guesses first. The SDK's operation IDs and identity blocks are random UUIDs,
so only command IDs are practical to deny. They are chosen by the client and are often meaningful (`joined:<id>`).

### 9.2 The fix: `TX2_ACCOUNT_CLAIMS=1` (default off) and the SDK's `claimAccount`

**Where the caller's account is known:**

- **The gateway, at a save:** the account of the entities it writes, by `group/classify`'s rule (the prefix, or the
  stored `:subject/account`). The request must name the same account, or it is refused `400 InvalidValue`.
- **The SDK:** when the store is opened for one account (`claimAccount`, an option of `makeDatomicRuntime` and of
  `DatomicClient`). Every save, and every `claim`, `command`, `begin`, `operation` and `fence` request, then names the
  account.
- **The product's API** (the entity handlers, the playground's tools): it knows the account of every request, so it
  can open one store per account.

**Where it is not known:**

- A raw `DatomicClient` without `claimAccount`.
- A save that writes several accounts, none, or only system entities.
- Removal commands (`erase`), which keep database-wide command IDs. The removal branch's own follow-up covers them.
- The group-commit scheduler (`TX2_GROUP_COMMIT=1`), whose in-memory keys use the plain operation ID. Not covered and
  not tested.

All of these keep today's IDs, for their saves and their lookups alike. A caller that names no account therefore
always finds its own saves: its unknown outcomes are never fenced under the wrong key.

**What it changes in the stored claim.** For a save that names its account, the stored values become
`acct-id/v1/<n>/<account>/<id>`, `n` being the account's length:

- `:triplex.claim/command-id` and `:triplex.tx/operation-id`;
- an import frame's predecessor command, which follows.

The journal's `:_tx/command-id` row keeps the client's ID, and both feeds decode the stored values back to the client's
IDs. No stored function changes: they compare a longer string. Identities are in section 6.

**Why this encoding.** The length prefix makes the boundary between account and ID exact, whatever either contains.

- `joined:<account>/<id>` is ambiguous once an account may contain the separator: (`a/b`, `c`) and (`a`, `b/c`) give
  the same string.
- 20,000 random (account, ID) pairs over an alphabet with `/` and digits gave 17,945 distinct pairs, 17,945 distinct
  stored values, and 17,945 round trips.
- A client ID that begins with the prefix is refused `400 InvalidValue`, so no plain ID can equal a scoped one.

**Old un-scoped claims.** A plain claim written before the option, or by a gateway without it, is still found for the
account that wrote it: its transaction's business entities, read from the log, are all that account's.

- That account cannot claim it again (`409 CommandConflict`).
- Another account does not find it, and its own claim of the same ID commits.
- A legacy plain operation ID of one account does not block another's.

**The F1 shape, fixed for every caller.** The `operation` and `fence` answers now name the committed transaction
(`txId`). The SDK settles only on its own journal's transaction. Any other means the operation ID is taken, so the
save is decided not applied and replays under a new ID (`persist`, `transactResolved`).

### 9.3 The gate (`s6/accounts_gate.clj`)

**Two accounts in one database, sharing every command ID and every operation ID.** One schedule in ten also shares an
ordered identity block. The writers covered: one-owner per-subject, several owners, creation, general, and import
frames. Each schedule:

1. runs account A's saves alone in one scope and account B's alone in another;
2. runs the same saves interleaved at random in a third scope;
3. compares each account's answers.

**With `TX2_ACCOUNT_CLAIMS=1`: 10,000 schedules, 127,848 saves, 18 of 18 checks.**

- 9,004 schedules gave each account exactly its answers alone.
- The other 996 shared an identity block. In all of them the only difference was the later account's save refused
  `IdentityConflict` (400), which is by design (assertion IDs are row identities).
- 0 other differences.
- Then 57,012 lookups (claim, command and operation, each by its account): **0 returned another account's
  transaction.**

**With it off: 1,000 schedules, 8 of 8 checks.** Every one differs from alone: the second account is refused
`OperationDuplicate` or `CommandConflict`. B's claim, command and operation lookups of a shared ID return A's
transaction (`_tx/…DW00` in the gate's line), and a lookup naming no account does too.

**Also in the gate:**

- **The F1 shape:** a lookup of an operation ID another account committed first names that account's transaction,
  which the SDK now refuses to settle on.
- **Legacy plain claims:** as described above.
- **The encoding:** no collisions.

**SDK:** `packages/datomic/test/claim-account.test.ts`, 2 of 2. With `claimAccount`, every lookup names the account;
without it, the requests are exactly as before.

## 12. After the second review: one stored form per ID, one account mechanism for both lines (design written before the tests, 2026-11-25)

The second review ([REVIEW-2](../s5/REVIEW-2.md), `9dc800e7b`) found the break of section 9.2 (R2-1). With
`TX2_ACCOUNT_CLAIMS=1`, a fence was stored under one form of an operation ID while the save it fenced was stored under
the other. This happened in a mixed fleet and in the per-subject replan retry. The late original then committed, and
the SDK's replay stored the save a second time.

The cause is that the form an ID took depended on each process's environment and on the code path. This section is
the design that replaces it. It follows the rules of the Publish builder's settings
(`actv-lazy/PUBLISH-BESIDE-SAVES.md` 0.8 at `2084d3ba7`): a setting stored in the database, one-way, and the
environment only grants permission. The Publish builder's answer (its 0.9) is that the gateway's mechanism is the one
both lines keep; section 12.4 says what the join layer changes to use it.

### 12.1 Operation IDs: one stored form in every state

An operation ID is stored as the client sent it: by the save, by its replan retry, and by the fence, on every gateway,
whatever the setting.

- Scoping operation IDs by account bought almost nothing. The SDK draws them at random (a UUID per attempt), so another
  account can only reuse one it has already seen, and the feed shows those only once they are committed.
- Reusing a committed ID refuses only the reuser. An operation ID taken by another transaction is never settled on: the
  receipt names its transaction, and the SDK checks it against its own journal (section 9.2).

**What this makes impossible:** a fence and a save of one operation stored under different forms. That is R2-1 by
both of the review's paths, and on any future gateway build too, because no code chooses a form.

### 12.2 Command IDs: the setting

**Where it lives.** `:triplex.scope/account-ids` = 1 on the database's scope entity: one setting per database. Absent
means command IDs are stored as sent (as before). A value other than 1 is one this build does not know, and it refuses
every save of that database (`409 SettingUnknown`), so the next setting a later build adds stops this build the same
way.

**Who turns it on.** Only a process started with `TX2_ACCOUNT_CLAIMS=1`, through `POST /v1/db/<db>/settings
{"accountIds": true}` or at its first save that names an account. It never turns off. `TX2_ACCOUNT_CLAIMS` no longer
changes how any request behaves; it only grants permission.

**The transition moves the writer functions.** The transaction that sets the value also, for each save-writer
function installed in the database (the general commit function and its variants, the one-owner, several-owners,
creation and covering-owner functions):

1. installs the same body under a twin ident (`<name>-ids1`);
2. replaces the body under the old ident with one that refuses (`TRIPLEX_CONFLICT`, answered `409 CasConflict`, which
   the SDK replays).

The functions every build calls inside or beside a save (row assertion, removal guards, group application, hints,
folds) are not moved. A writer function first installed after the transition is moved the first time this build
routes a save to it, by the same statements; two processes doing it at once write the same values.

**How a gateway learns it, and how stale its view may be.**

- Every gateway of this build reads the setting from the database value it prepares a save on, and the same for every
  lookup. With it on, the save calls the twins (`account_claims.clj` `route-data` and `route-plan`; the replan retry
  calls what the first attempt called).
- Its view can be stale only between that read and the commit. A save prepared with the setting absent calls the old
  idents; if the transition commits first, those refuse it, and the SDK's replay is prepared under the setting. **No
  save prepared under the old view commits after the transition.**

**One place chooses the form.** `account_claims.clj` `stored-ids` picks it once per save:

- **Scoped** (`acct-id/v1/<n>/<account>/<id>`): the save names its account, writes only that account's entities, and
  the setting is on.
- **Plain:** any other save that names an account (its entities are several accounts' or none).
- **As sent:** a request that names no account.

`apply-ids` writes the choice into the prepared data, and the replan retry re-applies the same choice from the
request's `:triplex/stored-ids` (`storage.clj`). That fixes R2-1b. The gate `s6/stored_ids_gate.clj` lists every place
in the gateway that writes or reads a stored ID, and fails if one is added or changed; the list
(`s6/stored-id-sites.txt`, 73 lines) is the answer to "every place a stored ID is computed today": the form is
computed in `stored-ids` and written in `apply-ids` only; every other listed line reads or checks an ID in the form the
request already carries.

**A save in flight across the transition.**

- Prepared before, committing after: refused by the old ident, then replayed under the setting. Nothing stored.
- Committed before: its claim is plain. A resend naming the same account after the transition is refused
  `CommandConflict` (`stored-ids` finds the account's plain claim), and the SDK's claim check finds it as the account's
  own.

**What an old build does.** A build that does not know the setting calls the writer functions by their old idents.
Once the setting is on, every save it makes, whichever writer, is refused, and so is a save it planned before the
transition and commits after it: **the window the Publish builder admits for its old builds (one write planned before
the transition) is closed here.** The test `an-older-build-is-refused-once-the-setting-is-on` runs it for the one-owner,
several-owners, creation and general writers: `409 CasConflict`, no operation and no command stored.

- Exactly which builds this covers: every build whose writer functions are this build's, which is every build since
  the base `23b7df344` run with the same writer options (their identities are equal, section 6). A build whose writer
  code differs installs its own functions under its own idents and is not stopped; two such builds already cannot share
  a database safely today.
- Removals, declarations, fences and the other non-save routes of an old build still run. None of them stores a command
  ID of an account's save.

**Ownership of plain claims (one rule for both lines).** A write's account is the account of the entities it writes:
`acct/<account>/...`, the stored `:subject/account`, the join layer's metadata `lazy/account/<kind>/<account>` (kind
`releases`, `origin`, `clock`, `erasure`, `dispatcher`; `mask` and `cursor` too), and a document namespace that names
its account in clear, `notice:v2:<n>/<account>/...` (n the account's length). System entities (`_...`) and the join
layer's present documents, `notice:v1:<hash>:...`, are journals and never decide it: their account is inside a hash.

- **Every change, not some change** (the Publish review's condition, `act10/REVIEW-3.md` U4): a write has an account
  only when every business entity it writes is that account's, and a plain claim belongs to an account only when every
  business entity its transaction wrote is that account's.
- A lookup naming an account finds its scoped claim, or else a plain claim that is its own. Any other plain claim is
  answered `taken`, and its transaction is never returned.
- A plain claim of no one account (several accounts' entities, an entity of no account, or system entities only)
  refuses every account's save of that ID (`CommandConflict`) and is answered `taken` to every account's lookup, so it
  is never committed twice.
- This changes R2-11's answer: a save across two accounts is no one account's. A resend of it naming one of them is
  refused, never stored again, and its lookup answers `taken`, never the receipt.

### 12.3 The reserved prefix, the command path and the other findings

- **R2-3:** no client-supplied ID may begin with `acct-id/v1/` on any route (save, claim, begin, command, operation,
  fence), with or without an account named, and whatever the setting.
- **R2-4:** a command lookup is made for an account when the caller names one, or when it names its own save's
  entities and they belong to one account. The SDK sends `claimAccount`, or else the frame's entities. A plain claim of
  other accounts is answered `taken`, and the SDK fails the save with `DatomicCommandIdTaken`, a decided refusal that
  is never another account's receipt. A caller that names neither, such as `TriplesLive`'s claim check run before the
  transaction reads anything, keeps the database-wide answer for plain claims and never sees a scoped one.
- **R2-2:** a replay is judged by the source of its save's first attempt.
  - The SDK sends `frameSourceK` on every replay: the source its first attempt sent (null when it sent none, an
    optimistic attempt).
  - The gateway refuses a save carrying it with `409 ErasureReplayDeclined`, never replayed, when it writes a protected
    value of an (entity, attribute) family that a removal named at a position after that source, on a new entity or an
    existing one (`storage.clj` `replay-frame-check!`, inside `tx-data`, so every writer and the replan retry).
  - A creation racing a removal is still answered `ErasureReplayDeclined` at once when the removal named its family
    (`removal-race-declined?`).
  - Both rules compare the removal's position with the frame's source, so they hold whether a removal takes effect at
    its entry's position (today) or at its Datomic commit (DX-ERA2's option): a removal not yet published refuses every
    write it can reach (503), so a replay is admitted only after it is published, and is then judged by its first
    source. Not run on DX-ERA2's code, which does not merge into this branch (five files conflict).
  - With the per-subject writers off, the save holds the scope's writer lock from its plan to its commit, so a removal
    cannot land between them: it waits, and then covers the value (the review's test now shows this on its own thread).
  - Cost: a replay whose first attempt was optimistic is judged as framed before every removal, so it is declined when
    it writes a family any removal ever named.
  - Found on the stack: the SDK's optimistic source is the last position the client saw, which can precede the removal,
    so a creation saved after the removal was declined, and so would every later one. On `ErasureReplayDeclined` the
    SDK now reads the head once; the caller's next save is framed after the removal and stored (`sdk-stack.ts`
    `REPLAY_ACROSS_REMOVAL`).
- **R2-5:** a save naming an account whose entities belong to no one account keeps the plain form; it is not refused.
  It is refused only when its entities are another single account's.
- **R2-6:** the general writer's refusals that carry no marker are decided by their exact messages (`outcome.clj`),
  answered 400 and never replayed. The stored functions are unchanged.
- **R2-7:** the fence accepts any operation ID the save accepts.
- **R2-8:** the 503 answer names the failure's class (`cause`) on every write route, the privacy-guarded ones included.
- **R2-9:** the fence route stays unbounded. Operation IDs are random per attempt, so fencing another caller's in-flight
  operation means knowing an ID the store has not published. The review's 3,000 fences per setting left saves, feed and
  positions unaffected, at about 2 datoms each.
- **Group commit:** a save under the setting is not grouped (it calls the twins, which the group path does not route).
  A group of an old build is refused at its members' functions.

### 12.4 What the join layer changes to use this mechanism

1. Drop the `joined:v2/<n>/<account>/<id>` form and the `accountKeys` setting. A Publish's client ID is
   `joined:<id>` again, looked up in the plain form for records from before as well.
2. Open each held account's client with the SDK's `claimAccount` set to that account. Its commits and every lookup
   (`claim`, `transactionByCommand`, `operation`, `fence`) then name the account; the gateway stores the claim as
   `acct-id/v1/<n>/<account>/<id>` once the database's setting is on.
3. **Move the account's documents to a namespace that names the account in clear:** `notice:v2:<n>/<account>/<hash>:`
   in place of `notice:v1:<hash>:` (n the account's length; the hash as now). This is what lets a settlement frame,
   which writes only settlement documents, have an account. Without it a frame writes only journals, has no account,
   stores a plain claim, and another account can still take its computable ID first (U3). Old `notice:v1:` documents
   must still be read.
4. Every write an account's processes make, frames and the enrolment (`join-held-enrolment:<account>`) included, names
   the account and writes only that account's names. A write that also touches another account's names, or an entity
   of no account, has no account, keeps the plain form, and stays open to U3 and U8.
5. Turn the setting on from a process with `TX2_ACCOUNT_CLAIMS=1` (`POST /v1/db/<db>/settings {"accountIds": true}`),
   after every gateway runs this build. It is the same one-way database setting for both lines; the join layer needs no
   setting of its own for IDs. Its other settings (frame guards, the cap, the ledger mode) stay in the origin fact.
6. Make `original`'s ownership check "every change in this account's names" (U4) and keep it as a second check of
   what the gateway returns.

**What this closes, once 1 to 5 are done.**

- U8: another account can neither read a Publish's record by its computed command ID (its lookup finds its own scoped
  claim or `taken`; a lookup naming no account finds no scoped claim) nor take a Publish's ID first (its own claim is
  stored under its own account).
- U3: a frame's and the enrolment's claims are stored under their account, so another account's save under the same
  ID is stored under its own and refuses nothing.

**What stays.** A write of no one account's names (system entities only, or two accounts' names) under an ID before
the account's own write refuses that write (`CommandConflict`), never a wrong acknowledgement. Whether an ordinary
client may write system entities is the API's rule, not the store's.

## 10. The standing gate phase and the other gates

**Every gate ran by image ID on `tx2-dxs6:959634af4f1c`, built from the head by `s6/image.sh`.**

- Image `sha256:8afa5f298ef3…`.
- Base: the pinned runtime `sha256:da58aea16b31…`.
- No source mounts: only the test files are mounted.
- The image's source label matched the head in every run.

**Runner:** `s6/final.sh` (steps `gates`, `older`, `accounts`, `fuzz`) over `s6/clj-run.sh`.

| Gate | Settings | Result |
| --- | --- | --- |
| `s6/outcome_gate.clj` (F1, every fault point) | server, general | 419 of 419 each |
| `s6/race_gate.clj` (F4, F9, F11) | server | 22 of 22 |
| `s6/bound_gate.clj` (F2) | bound | 127 of 127 |
| `s5/attack_gate.clj` (the review's attacks) | server, import | 49 of 49; 151 of 151 |
| `s6/accounts_gate.clj` | accounts-off; accounts-on | 8 of 8 (1,000 schedules); 18 of 18 (10,000 schedules) |
| `s5/fuzz.clj` with JSON, boolean, datetime and blob values | server, serial, plainowner | 6 runs: 9,000 serial and 5,400 concurrent saves, 0 differences |
| `s5/fuzz.clj` with protected values, unsealed | server | 1,500 serial and 900 concurrent, 0 differences |
| `s5/fuzz.clj` with protected values, sealed | server | 1,500 serial and 900 concurrent, 0 differences; every sealed save took the general writer (no shared authority in process) |
| `s3/owners_gate.clj` (with the new measured control) | s3, s3-serial | 262 of 262 each (the control: `[409 CasConflict]`, refused whole); run on the head image after a test-only commit (`da257db5a`; gateway sources identical) |
| `s4/create_gate.clj` (the measured control in place of the constant) | server, serial, hints | 145, 145 and 147 of each; the measured control `[409 CasConflict]`; same image and commit |
| `v01/writer-split.test.ts`, `v01/production-card.test.ts` | Node | 10 of 10 |
| SDK suite (`packages/datomic`) | vitest | 470 passed, 53 skipped |

**Why the totals differ from the review's.** The review's own tests now pass where they had asserted the findings:

- `transactor-unavailable-after-apply` is `[503 OutcomeUnknown]` on all 3 writers, and the operation is found
  committed.
- `save-racing-a-removal` is `[409 CasConflict]` on both writers for all 3 kinds.
- `first-save-racing-protection` is `[409 CasConflict]` on both writers.

**The fuzzer counts:**

- Its kill modes now answer `503 OutcomeUnknown` for a kill before or after submit, on both scopes alike.
- On the sealed scope, `ProtectedTypeUnsupported` appears when a replacement writes a non-string type onto a protected
  field; it is the same on both scopes.

## 10.1 S6b: the gates on the head image (2026-11-25)

**Image:** `tx2-dxs6:96b866c6ddf8` (`sha256:55cdd3f517fe…`), built from `96b866c6d` by `s6/image.sh` on the pinned
runtime `sha256:da58aea16b31…`; every step below ran on it by image ID (`s6/final.sh`, chain `final3-96b866c6d`). The
later head `e8f393920` changes the SDK only (the gateway sources are identical); its stack run used the review's
image built from `96b866c6d` (`s5/image2.sh`, `tx2-dxs5:96b866c6ddf8`). Mac toy, times diagnostic. Evidence: the archive
`DX-S6-save-line` (`s6b-final-e8f393920.tar.gz` sha256 `3b1e6df6…`, `s6b-earlier-runs.tar.gz` `8f14e0fa…`), kept outside
the repository.

| Gate | Settings | Result |
| --- | --- | --- |
| `s5/attack2_gate.clj` (every test of the second review) | accounts-off, accounts-on, accounts-on-serial, accounts-on-general, bound, general | 24, 64, 64, 55, 44 and 22 assertions, 0 failures |
| `s6/stored_ids_gate.clj` (sites list, every writer, the transition, an older build, a Publish-shaped write, frames and the enrolment) | accounts-on, accounts-on-serial, accounts-on-general, group-accounts | 109 of 109 each |
| `s6/outcome_gate.clj` (F1 fault points; removal and declaration with the original in flight) | server, general, accounts-on, group, group-accounts | 426 of 426 each |
| `s6/race_gate.clj`, `s6/bound_gate.clj`, `s5/attack_gate.clj` | server; bound; server, import | 22; 127; 49 and 151 |
| `s6/accounts_gate.clj` | accounts-off (control); accounts-on; group-accounts | 1,000 schedules (the control shows today's differences, 8 of 8); 10,000 schedules, 127,848 saves, 0 differences, 0 lookups not the account's own; 2,000 schedules, 25,632 saves, 0 differences |
| `s3/owners_gate.clj`, `s4/create_gate.clj` | s3, s3-serial; server, serial, hints | 262, 262; 145, 145, 147 |
| `s5/fuzz.clj` with faults (`S5_FAULTS`) and the second account (`S5_ACCOUNTS`), 10 seeds each | accounts-on, accounts-on-serial, accounts-on-general, group-accounts | 31,298, 31,072, 31,360 and 31,228 saves, 0 differences |
| The same, option off | server | 31,258 saves, 0 differences |
| Protected values with faults | server, sealed; accounts-on, unsealed, second account | 7,200 and 9,426 saves, 0 differences |
| `s5/fuzz.clj` without faults (value types, protected, sealed) | server, serial, plainowner | 19,200 saves, 0 differences |
| Identities, every writer setting, options off | head `96b866c6d` against base `23b7df344` (`s4/idents.sh`, `s3/compare-idents.py`) | equal |
| `s5/stack2.sh` (the review's mixed fleet on PostgreSQL: a gateway with the option and one without, both pairings) | — | passed (`DX-S5R2_STACK_EXIT 0`) |
| `s6/stack.sh` (the SDK end to end, faults, then the replay across a removal) | server, head `e8f393920` | passed: 12,000 saves, 0 violations; the replay declined on a new and an existing entity, the save after the removal stored |
| SDK suite (`packages/datomic`) | vitest | 470 passed, 53 skipped |

**The fuzzer with faults and the second account: 172,842 saves, 0 differences.** That is 134,384 with the setting on
(fleet states: the setting absent, turned on by the run's first save naming an account, and on; per-subject writers on,
serial options, general writer only, group commit) and 38,458 with it off. Shadows of a command first committed by a
save of no one account are refused, as the shared rule says (1,473, counted apart). Every fault mode resolved by lookup
and fence; no save stored twice.

**The stack.** At `e8f393920` (run `final4-e8f393920-stack`): 12,000 SDK saves through proxies dropping 2% of
requests and replies, with transactor and gateway faults: 12,000 stored and reported stored, 0 violations, positions
contiguous, every subject read back equal. Then the replay across a removal: on a new entity and on an existing one the
SDK's replay carried its first attempt's source (0, then 3) and was declined `ErasureReplayDeclined`; nothing of the
value framed before the removal was stored; the caller's next save was framed after the removal (source 1, then 4) and
stored. The earlier run at `96b866c6d` (11,835 stored, 165 reported not stored and not stored, 0 violations) found the
stale optimistic source that `e8f393920` fixes.

**R2-6, what the unmarked refusals are** (`s6/r26_tally.clj`, general writer, setting on, 3 seeds, 8,304 saves): every
"Missing live row datom" refusal (51) carries the generator's `wrong-owner-retire` fault: a retirement framed on another
owner's entity. They are now answered `400 TransactionRejected`, never 503, so nothing replays them. The review's 984
were these, each replayed until replays ran out.

**R2-10, the creation function's import frame, measured** (`s5/attack2_gate.clj`, bound): ten repeats of the frame
(one new subject, 20 values of 100 bytes) ran at 0.09 to 0.18 of the estimate. The first call of each stored function
in a transactor process ran at 1.62 (16 ms against 10 ms): it includes the function's compile, which no estimate
prices. The review's 1.08 was that first call. Consequence: once per function per transactor start, an import frame can
exceed the bound by the compile time; every later call is within it.

**`TRIPLEX_IDENTITY f/id` in these gates.** In the in-process fuzzer, 46 in the R2-6 tally's 8,304 saves, and 922 in
the first review's 59,000: the fuzzer's own `reuse-block` and `reuse-refused-block` modes, which send a save under an
identity block already used, refused on both scopes alike. The in-process gates do not use the SDK's ID generator, so
the Publish review's U1 (the SDK's monotonic factory handing out IDs inside a save's block) cannot occur there. On the
stack (the SDK, 12,000 saves a run, three runs at `63273b0c6`, `373c15207` and `96b866c6d`), no save was refused for
identity: every failed save was `DatomicOperationNotApplied`. U1 is not the cause of any stop in these gates, nor of the
984.

## 11. What is still not tested

**On the server**

- **Nothing ran on a server.** Every figure is the Mac toy's and diagnostic.
- **The lookup price** (12 µs) is a warm memory-toy figure. Cold reads at 1 billion records are not measured.
- **The excision scan** (F7) was not measured on PostgreSQL with real excisions; no product path makes one.

**Faults not run**

- A real network partition between the peer and the transactor. The proxies drop client connections; the transactor
  was stopped, killed and paused.
- A fault during a removal on the PostgreSQL stack. Removal and declaration faults are tested in process only.
- The group-commit scheduler (`TX2_GROUP_COMMIT=1`) under faults or with account claims: not run.

**Paths not covered**

- The covering writer (`TX2_SUBJECT_OWNER_HEAD=1`) and the general hint function: only their identities were checked.
- Sealed values on a per-subject writer: the in-process fuzzer has no shared authority, so every sealed save took the
  general writer.
- Several gateways, some with `TX2_SUBJECT_CREATE` and some without, saving at once: F11 is tested only by handling the
  removal without the option.
- Account claims on removal commands, and an import frame whose predecessor command is a legacy plain claim: not
  scoped.

**S6b: what is still not tested**

- **DX-ERA2's removal at its Datomic commit:** not run; its branch does not merge here (five files conflict). The R2-2
  rules compare positions, so they hold under it by construction, not by test.
- **A real older build in the fleet:** simulated in process (no stored-ID choice, no routing); the stack's mixed fleet
  ran this build with and without permission, not a binary from before this change.
- **A build whose writer code differs from this one's** is not refused by the transition (it installs its own
  functions); not tested, and not safe today either.
- **The transition under load on PostgreSQL:** tested in process only (one save across it, every writer).
- **The join layer on this mechanism:** not built here (section 12.4 lists its changes); `notice:v2` documents are
  tested with hand-made entity names.
- **Group commit with the setting on:** such saves are not grouped; the cost is not measured.
- **An optimistic replay** is judged as framed before every removal (its first attempt stated no source); not measured
  how often a real workload declines that way.
- **Operation IDs under a removal command** and the import predecessor of a legacy plain claim: not scoped (as in S6).

**Contract and API limits**

- **The release-between-read-and-commit attack** uses a definitions entity read inside the save (EntityState
  precondition). The product's real release path (Publish's definitions) was not driven.
- **The "stale definitions" case commits by design.** A caller that does not read the definitions in the save cannot
  be protected by the store.
- **The 147 to 148 saves per stack run that ended `DatomicOperationNotApplied`** are correct (not stored, reported not
  stored). A caller sees them as failures: the replay budget (12 attempts, 1 to 50 ms apart) runs out during a
  transactor restart. A longer replay budget while the transactor is down is not built.

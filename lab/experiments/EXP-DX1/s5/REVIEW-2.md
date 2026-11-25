# S5 second review: the save line's fixes (S6)

Reviewer's branch `exp/DX-S5-save-line-review`, which contains the fixed head `a6d02225c` (fast-forward) plus the
reviewer's tests. The gateway and SDK sources are exactly `a6d02225c`'s: nothing under `packages/` was changed.
Written «DATE». Mac figures are toy-size and diagnostic.
[First review](REVIEW.md) · [The fixes](../s6/SAVE-LINE-FIXES.md)

Every counted run used one image, built from this branch's head by `s5/image2.sh` with the gateway sources, the
codec spec, the test files and the bundled SDK driver copied in, started by image ID with only an output directory
mounted: «IMAGE». Evidence: `DX-S5-review/r2` (outside the repository), «ARCHIVE».

## Page 1

**Is there a break now? With every option at its default, no. With `TX2_ACCOUNT_CLAIMS=1`, yes.**

- **Default options** (the account option off on every gateway): no stored difference and no wrong answer in «FUZZ»
  fuzzed saves, of which «FAULTSTEPS» had an unknown outcome resolved by lookup and fence, and «STACKUNIFORM» stack
  cases with the transactor paused or killed while a save was in flight. Sure for what was sent; the generator's
  limits are in "Not tested".
- **With `TX2_ACCOUNT_CLAIMS=1`: a save the SDK was told was not applied is stored, and the SDK's replay stores it a
  second time.** This is F1's kind of break: a committed save answered as refused. Sure:
  - in process, every predicted case: 5 of 5 (`s5/attack2_gate.clj`, the first two tests);
  - on the PostgreSQL stack with the real SDK (`TriplesLive`, `claimAccount`), the transactor paused while one save
    of one new fact was in flight: in both mismatched cases the SDK reported one save stored, and the log holds 2
    transactions and 2 live facts (`s5/mixed-fleet.ts`). Every uniform case was exact.

**Is F1 closed? Only while the fence and the save store the same operation ID.**

- **What closes it** (all needed, and all present):
  - `storage.clj` 594 and 658: `submitted` is set before the hand-over, and after it any failure that
    `outcome/decided?` does not recognise is `503 OutcomeUnknown`;
  - `outcome.clj` 30-46 (`decided?`) and 66-80 (`fence!`), and the unique `:triplex.tx/operation-id`, so the later of
    the original and the fence is refused at the serial point;
  - `main.clj` 265-272 for the other write routes;
  - the SDK's `persist` (`DatomicStorageAdapter.ts` 693-740): lookup, then fence, then the receipt or
    `DatomicOperationNotApplied`, and a new operation ID for the replay (971).
- **What opens it again.** The fence key is chosen by `account-claims/operation-key` (`account_claims.clj` 75-82):
  for an operation not stored yet it is always the scoped form when the caller names an account. The save's key is
  chosen elsewhere, and two paths make it the plain form while the SDK names its account:
  1. **A gateway without the option** (a rolling start of `TX2_ACCOUNT_CLAIMS`, or one gateway left behind) stores
     the plain ID; a gateway with it fences the scoped one. The reverse pairing breaks the same way.
  2. **On a fleet with the option everywhere**, a per-subject save refused `TRIPLEX_SUBJECT_REPLAN` is retried from
     the request, `(tx-data db input)` (`storage.clj` 478), after `scope!` rewrote the prepared data (549). The retry
     stores the plain operation and command IDs. If the retry's outcome is unknown, the fence misses it.
     The trigger used is natural: another client's save whose journal has no instant row flips the scope's
     `feed-irregular` flag between the plan and the commit.
- **With a command ID** the claim stops the replay (`CommandConflict`, then the lookup finds the original), so the
  fact is stored once. The SDK then answers `CommandAlreadyCommitted` naming its own transaction instead of the
  receipt. **Without one** (a `TriplesLive.transact` without `meta.commandId`) the save is stored twice.

**The most serious remaining findings, each with its test** (`s5/attack2_gate.clj` unless named):

1. **R2-1 (high, option on): the fence under another key; the save stored twice.**
   `a-fence-under-another-key-does-not-stop-the-original`, `a-replanned-save-loses-its-account-scope`;
   stack: `s5/stack2.sh`.
2. **R2-2 (medium): a creation racing a removal is replayed into the removed family.** On both writers, a creation
   framed before the removal is refused `ErasureReplayDeclined` when it arrives after the removal, but answered
   `409 CasConflict` when the removal lands between its plan and its commit. The SDK replays a `CasConflict` from a
   fresh read; a creation's values are the caller's own, so the replay stores the value framed before the removal,
   now with a source after it, which F4 admits. On the general writer this is new in S6: F3 turned its
   non-replayable `ErasureFrontierChanged` into the replayable `CasConflict` (`storage.clj` 669).
   `a-creation-racing-a-removal-is-replayed-into-the-removed-family`.
3. **R2-3 (medium, option on): the reserved prefix works in every lookup.** `scope!` refuses a save whose IDs begin
   with `acct-id/v1/`; the claim, command, begin and operation routes and the fence do not. A caller that names no
   account writes another account's stored form and gets its transaction ID, receipt and position, and through
   `transactionByCommand` its rows; it can also fence that account's save in flight (denial; the save is replayed).
   The page's "0 returned another account's transaction" holds only for callers that name their account.
   `lookups-accept-the-reserved-prefix`.
4. **R2-4 (medium, option off, as S6 9.1 says): the command path still settles on another account's transaction.**
   S6's "fixed for every caller" holds for the operation path (`DatomicStorageAdapter.ts` 714). `transactCommand`
   (`DatomicClient.ts` 1642-1645) returns whichever transaction holds the command ID: B's earlier save of the same
   command makes A's save answer with B's receipt. `the-command-path-settles-on-whichever-transaction-holds-the-command`.

**One recommendation: make the operation ID's stored form independent of options and of the writer before
`TX2_ACCOUNT_CLAIMS` is turned on anywhere.** One stored form per operation, chosen the same way by the save, its
replan retry and the fence on every gateway, with or without the option. Keep the mixed-fleet stack check
(`s5/stack2.sh`) as a gate for any change to how IDs are stored.

## Findings

| ID | Severity | Finding | Where | Test | Result |
| --- | --- | --- | --- | --- | --- |
| R2-1 | High (option on) | A fence stored under another key than its save does not stop it; the SDK replays and the save is stored twice. Two paths: a mixed fleet (either pairing), and the per-subject replan retry, which drops the account scope | `account_claims.clj` 75-82; `storage.clj` 478, 549; `main.clj` 392-404 | `a-fence-under-another-key-does-not-stop-the-original`; `a-replanned-save-loses-its-account-scope`; `s5/stack2.sh` | in process 5 of 5 as predicted; stack «STACKMIX» |
| R2-1b | Medium (option on) | The replanned save's command ID is stored plain too: for those saves another account is denied the ID again, and finds the transaction | `storage.clj` 478 | `a-replanned-save-loses-its-account-scope` | B's save of the same command: `409 CommandConflict` |
| R2-2 | Medium | A creation racing a removal that named its entity is answered `CasConflict`; the SDK's replay stores the value framed before the removal. The same frame arriving after the removal is refused `ErasureReplayDeclined` | `storage.clj` 669 (F3); `subject_create.clj` 83-96 (F4) | `a-creation-racing-a-removal-is-replayed-into-the-removed-family` | both writers: race `409 CasConflict`, replay `200`, the pre-removal value stored |
| R2-3 | Medium (option on) | Lookups and the fence accept the reserved prefix: a caller naming no account reads and fences any account's stored IDs | `main.clj` 392-415; `storage.clj` 898; `outcome.clj` 70 | `lookups-accept-the-reserved-prefix` | claim, command, begin, operation: A's transaction; fence: A's save fenced |
| R2-4 | Medium (option off) | The command path settles on any transaction holding the command ID (S6 9.1 states it; "fixed for every caller" covers only the operation path) | `DatomicClient.ts` 1642-1645 | `the-command-path-settles-on-whichever-transaction-holds-the-command` | A `409 CommandConflict`, the lookup names B's transaction |
| R2-5 | Low (option on) | With `claimAccount`, every save of no one account is refused `400 InvalidValue`: a new subject without the `acct/` prefix, a system entity. S6 9.2 says such saves keep today's IDs | `account_claims.clj` 96-98 | `claim-account-and-saves-of-no-one-account` | both `400 InvalidValue`; the same saves without `account`: `200` |
| R2-6 | Low | Refusals inside the general writer's function that carry no marker are now unknown: `503`, the SDK fences and replays the same save, refused the same way, until its replays run out (then a conflict, not a refusal). Seen: "Missing live row datom" (a retirement framed on the wrong owner, «MISSINGLIVE» times in the fuzz runs) and "Invalid commit span" | `commit.clj` 105, 214, 228, 296, 309; `subject_save.clj` 130 | `refusals-inside-the-stored-function`; fuzz `DX-S5R2_UNKNOWN` lines | `503`, fenced, replay `503` |
| R2-7 | Low (option on) | The fence checks the length of the stored, scoped form: an operation ID of 245 to 256 characters is accepted by the save and refused by the fence (`400`), so its unknown outcome cannot be decided | `outcome.clj` 70; `main.clj` 399-402 | `fences-accumulate` | save `200`, fence `400 InvalidValue` (option off: `200`) |
| R2-8 | Info | The 503 answer does not name the failure's class (S6 1.1 says it does): `outcome/unknown` puts it in `:cause`, which the response does not carry | `main.clj` 419-424 | fuzz logs | `{"code":"OutcomeUnknown","message":"Commit outcome unknown"}` |
| R2-9 | Info | Fences are permanent, positionless transactions. The fence route names no account and has no limit: anyone who can reach a gateway can fence any operation ID they know or guess | `outcome.clj` 66-80 | `fences-accumulate` | 3,000 fences: 3,000 log transactions, about 2 datoms each; saves, feed and positions unaffected |
| R2-10 | Info | F2: the S6 bound gate measured the general writer only. Import frames of new subjects take the creation function (F10); the first such frame in a JVM ran at 1.08 of its estimate (cold function), later ones 0.08 to 0.14 | `import_bound.clj` 21-23 | `import-and-live-shapes-against-the-estimate` | «F2» |

## Attacked without a break

| Attack | What was sent | Count | Result |
| --- | --- | ---: | --- |
| «ROWS» | | | |

## Not tested

- «NOTTESTED»

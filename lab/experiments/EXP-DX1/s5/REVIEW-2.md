# S5 second review: the save line's fixes (S6)

Reviewer's branch `exp/DX-S5-save-line-review`. It holds the fixed head `a6d02225c` (a fast-forward) plus the
reviewer's tests; nothing under `packages/` differs from `a6d02225c`. Started 2026-11-24 22:45 EST, written
2026-11-25 01:49 EST. Mac figures are toy-size and diagnostic.
[First review](REVIEW.md) · [The fixes](../s6/SAVE-LINE-FIXES.md)

**How it ran.** Every counted run used an image built from this branch's committed head by `s5/image2.sh`: the
pinned lab runtime with the head's gateway sources, codec spec, test files and bundled SDK driver copied in, started
by image ID, with nothing mounted but an output directory.

- `tx2-dxs5:bfcdaad75e7e`, `sha256:02fb87a2ba35…` (source `bfcdaad75`): the attack gate in 6 settings, the stack,
  and 8 fuzz runs with the account option off.
- `tx2-dxs5:258d4413dca0`, `sha256:5d2138497468…` (source `258d4413d`: the harness fixes of section 3, fault steps
  under the import and settlement write classes, and R2-11's test): 5 fuzz runs with the option on and a second
  account, one more server run, and R2-11.
- `tx2-dxs5:04fd6bb34bc6` (`sha256:e45f36e27229…`) and `tx2-dxs5:24c04e312862` (`sha256:402a331cd87c…`) ran fuzz
  runs stopped by the harness (not counted) and R2-11's command case.
- Evidence, outside the repository: `DX-S5-review/r2-archives`, one archive per run, with `SHA256SUMS`.

## Page 1

**Is there a break now? With the account option off, no break in exactness, and one gap in the removal guarantee.
With `TX2_ACCOUNT_CLAIMS=1`, yes: a save stored twice.**

- **The per-subject writers on (the line under review), and any fleet whose gateways all have the same account
  setting, short of a replan whose retry has an unknown outcome:** no stored difference, and no save reported other
  than as it was stored.
  - 118,071 fuzzed saves (71,723 with the account option off, 46,348 with it on), 11,972 of them with an
    unknown outcome injected and resolved as the SDK resolves it.
  - 26 stack cases on PostgreSQL with the real SDK (13 with the option on every gateway, 13 with it off), the
    transactor paused (14) or killed with SIGKILL (12) while one save was in flight: every one stored exactly once,
    with the reported receipt.
  - Sure for what was sent. The generator's limits are under "Not tested".
  - The gap (R2-2): a creation that races a removal naming its entity is replayed by the SDK and stores the value the
    removal was meant to keep out. It needs the per-subject writers on (with them off, the scope's privacy lock keeps
    the removal out of a save's commit) and the SDK's replay; reproduced on both writers.
- **With `TX2_ACCOUNT_CLAIMS=1`: a save the SDK was told was not applied is stored, and the SDK's replay stores it a
  second time.** This is F1's kind of break: a committed save answered as refused. Sure:
  - in process, 5 of 5 cases as predicted, on the per-subject writers and on the general writer;
  - on the PostgreSQL stack with the real SDK (`TriplesLive`, `claimAccount`): in both mismatched pairings the SDK
    reported one save stored, and the log holds 2 transactions and 2 live facts.
  - The fuzzer cannot find it: its faults hit a save's first transaction and its fleet is one gateway.

**Is F1 closed? Only while the fence and the save store the same operation ID.**

- **What closes it** (all present on the head):
  - `storage.clj` 594 and 658: `submitted` is set before the hand-over; after it, any failure `outcome/decided?` does
    not recognise is `503 OutcomeUnknown`;
  - `outcome.clj` 30-46 (`decided?`) and 66-80 (`fence!`), with `:triplex.tx/operation-id` unique, so whichever of the
    original and the fence reaches the serial point second is refused;
  - `main.clj` 265-272 for the other write routes;
  - the SDK's `persist` (`DatomicStorageAdapter.ts` 694-740): lookup, then fence, then the receipt or
    `DatomicOperationNotApplied`, and a new operation ID for the replay (971).
- **What opens it again.** The fence's key comes from `account-claims/operation-key` (`account_claims.clj` 75-82): for
  an operation not stored yet it is the scoped form whenever the caller names an account. The save's key is chosen
  elsewhere, and two paths store the plain form while the SDK names its account:
  1. **A gateway without the option** stores the plain ID; a gateway with it fences the scoped one (a rolling start
     of `TX2_ACCOUNT_CLAIMS`, or one gateway left behind). The reverse pairing breaks the same way.
  2. **A fleet with the option everywhere**: a per-subject save refused `TRIPLEX_SUBJECT_REPLAN` is retried from the
     request, `(tx-data db input)` (`storage.clj` 478), after `scope!` rewrote the prepared data (549). The retry stores
     the plain operation and command IDs. If the retry's outcome is unknown, the fence misses it. The trigger in the
     test is natural: another client's save whose journal has no instant row flips the scope's `feed-irregular` flag
     between the plan and the commit.
- **With a command ID** the claim stops the replay, so the fact is stored once; the SDK then answers
  `CommandAlreadyCommitted` naming its own transaction instead of the receipt. **Without one** (`TriplesLive.transact`
  without `meta.commandId`) the save is stored twice.

**The most serious remaining findings, each with its test** (`s5/attack2_gate.clj` unless named):

1. **R2-1 (high, option on): the fence under another key; the save stored twice.**
   `a-fence-under-another-key-does-not-stop-the-original`, `a-replanned-save-loses-its-account-scope`; the stack:
   `s5/stack2.sh` (`s5/mixed-fleet.ts`).
2. **R2-2 (medium): a creation racing a removal is replayed into the removed family.**
   - A creation framed before a removal that named its entity is refused `ErasureReplayDeclined` when it arrives after
     the removal.
   - When the removal lands between its plan and its commit, it is answered `409 CasConflict` (F3), on both writers.
   - The SDK replays a `CasConflict` from a fresh read. A creation's values are the caller's own, so the replay stores
     the value framed before the removal, now with a source after it, which F4 admits.
   - On the general writer this is new in S6: F3 turned its non-replayable `ErasureFrontierChanged` into the
     replayable `CasConflict` (`storage.clj` 669).
   - Test: `a-creation-racing-a-removal-is-replayed-into-the-removed-family`.
3. **R2-3 (medium, option on): the reserved prefix works in every lookup.**
   - `scope!` refuses a save whose IDs begin with `acct-id/v1/`; the claim, command, begin and operation routes and
     the fence do not.
   - A caller that names no account writes another account's stored form and gets its transaction ID, receipt and
     position, and through `transactionByCommand` its rows. It can also fence that account's save in flight (denial:
     the save is replayed).
   - S6's "0 returned another account's transaction" holds only for callers that name their account.
   - Test: `lookups-accept-the-reserved-prefix`.
4. **R2-4 (medium, option off, as S6 9.1 says): the command path still answers with another account's transaction.**
   - S6's "fixed for every caller" holds for the operation path (`DatomicStorageAdapter.ts` 714).
   - The command path takes whichever transaction holds the command ID. `TriplesLive`'s claim check
     (`DatomicStorageAdapter.ts` 1411-1432, `client.claim`) fails A's save `CommandAlreadyCommitted` naming B's
     transaction, which `transactionByCommand` then reads. `DatomicClient.transactCommand` (1642-1645) returns B's
     receipt as A's.
   - Test: `the-command-path-settles-on-whichever-transaction-holds-the-command` (the gateway's claim answer names B's
     transaction, not A's journal).

**One recommendation: give each operation one stored form, chosen the same way by the save, its replan retry and the
fence on every gateway with or without the option, before `TX2_ACCOUNT_CLAIMS` is turned on anywhere.** Keep the
mixed-fleet stack check (`s5/stack2.sh`) as a gate for any change to how IDs are stored.

## 1. Findings

| ID | Severity | Finding | Where | Test | Result |
| --- | --- | --- | --- | --- | --- |
| R2-1 | High (option on) | A fence stored under another key than its save does not stop it; the SDK replays and the save is stored twice. Two paths: a mixed fleet (either pairing), and the per-subject replan retry, which rebuilds the save without the account scope | `account_claims.clj` 75-82; `storage.clj` 478, 549; `main.clj` 392-404 | `a-fence-under-another-key-does-not-stop-the-original`; `a-replanned-save-loses-its-account-scope`; `s5/stack2.sh` | in process: the late original committed after "fenced", one increment added 2 (both pairings, both writer settings); the replan retry stored plain and committed after the fence. Stack: 2 of 2 mismatched pairings stored twice |
| R2-1b | Low (option on) | The replanned save's command ID is stored plain as well: for that save the option does nothing (a caller naming no account collides with it, as with the option off) | `storage.clj` 478 | `a-replanned-save-loses-its-account-scope` | claim stored plain; a save of the same command naming no account: `409 CommandConflict` |
| R2-2 | Medium | A creation racing a removal that named its entity is answered `CasConflict`; the SDK's replay stores the value framed before the removal. The same frame arriving after the removal is refused `ErasureReplayDeclined` | `storage.clj` 669 (F3); `subject_create.clj` 83-96 (F4) | `a-creation-racing-a-removal-is-replayed-into-the-removed-family` | creation writer and general writer, in the 4 settings with `TX2_SUBJECT_SAVE=1`: race `409 CasConflict`, replay `200`, the pre-removal value stored. With it off, the privacy lock excludes the race (section 2, last row) |
| R2-3 | Medium (option on) | Lookups and the fence accept the reserved prefix: a caller naming no account reads and fences any account's stored IDs | `main.clj` 392-415; `storage.clj` 898; `outcome.clj` 70 | `lookups-accept-the-reserved-prefix` | claim, command, begin and operation return A's transaction; B's fence of A's stored form fenced A's save in flight |
| R2-4 | Medium (option off) | The command path takes any transaction holding the command ID: `TriplesLive` fails A's save `CommandAlreadyCommitted` naming B's transaction; `transactCommand` returns B's receipt. S6 9.1 states it; its "fixed for every caller" covers the operation path only | `DatomicStorageAdapter.ts` 1411-1432; `DatomicClient.ts` 1642-1645 | `the-command-path-settles-on-whichever-transaction-holds-the-command` | A `409 CommandConflict`; the claim lookup names B's transaction, not A's journal |
| R2-5 | Low (option on) | With `claimAccount`, a save of no one account is refused `400 InvalidValue` (a new subject without the `acct/` prefix, a system entity). S6 9.2 says such saves keep today's IDs | `account_claims.clj` 96-98 | `claim-account-and-saves-of-no-one-account` | both `400 InvalidValue`; the same new subject without `account`: `200` |
| R2-6 | Low | Refusals inside the general writer's function that carry no marker are now unknown: `503`, the SDK fences and replays the same save, refused the same way, until its replays run out, and then reports a conflict, not a refusal | `commit.clj` 105, 214, 228, 296, 309; `subject_save.clj` 130 | `refusals-inside-the-stored-function`; fuzz `DX-S5R2_UNKNOWN` lines | "Invalid commit span" (span 0): `503`, fenced, replay `503`. "Missing live row datom" (a retirement framed on the wrong owner): 984 |
| R2-7 | Low (option on) | The fence checks the length of the stored, scoped form (at most 256): an operation ID longer than 256 minus 15 to 79 characters (by the account's length) is accepted by the save and refused by the fence, so its unknown outcome cannot be decided | `outcome.clj` 70; `main.clj` 399-402 | `fences-accumulate` | a 250-character ID: save `200`, fence `400 InvalidValue` (option off: fence `200`) |
| R2-8 | Info | The `503` answer does not name the failure's class (S6 1.1 says it does): `outcome/unknown` puts it in `:cause`, which the response does not carry | `main.clj` 421-426 | every fault step | the body is `{"code":"OutcomeUnknown","message":"Commit outcome unknown"}` |
| R2-9 | Info | Fences are permanent transactions without a position. The fence route names no account and has no limit: anyone who can reach a gateway can fence any operation ID it knows or guesses | `outcome.clj` 66-80 | `fences-accumulate` | 3,000 fences: 3,000 more log transactions, about 2 datoms each; the 21 saves after them commit, the feed lists 21, positions contiguous |
| R2-10 | Info | F2: the S6 bound gate measured the general writer only. Import frames of new subjects take the creation function (F10); its first frame in a JVM ran at 0.99 of its estimate in the counted run and 1.08 in a development run (a cold function); later frames 0.05 to 0.58 | `import_bound.clj` 16-19 | `import-and-live-shapes-against-the-estimate` | every other admitted import frame 0.05 to 0.58; the live save at both caps 27 to 30 ms, 0.23 to 0.25 of its estimate |
| R2-11 | Low (option on) | A command first committed by a save that named no account and wrote entities of two accounts has a plain claim no account owns (`owned?` needs every business entity of the transaction to be the account's). The same command, named by one of those accounts, commits again; so does the same operation ID | `account_claims.clj` 51-63, 101-105 | `a-plain-claim-of-no-one-account-is-not-found-by-the-account` | first save `200`; the same command naming account `z1`: `200`, a second transaction, and `z1`'s claim lookup names the second; the same operation ID naming `z1`: `200` |

## 2. Attacked without a break

| Attack | What was sent | Count | Result |
| --- | --- | ---: | --- |
| The fence while the original is still queued at a paused transactor | stack, uniform fleet (G_on alone, G_off alone), SIGSTOP 5.2 to 9 s, with and without a command ID | 14 | 14 exact: the fence queued behind the original, met it at the unique check, and answered its receipt; 0 fences stored |
| The original lost: the paused transactor killed with SIGKILL and restarted | stack, uniform fleet | 12 | 12 exact: one fence each, the replay stored once, the receipt the stored one |
| Unknown outcomes, in process: 7 failure classes x applied, never applied, held until after the fence | fuzz fault steps on both writers, the same fault on candidate and control, resolved by lookup and fence, replayed when fenced | 11,972 | every resolved answer the stored truth; 4,065 held originals sent after their fence, every one refused `TRIPLEX_OPERATION_DUPLICATE`; candidate and control agree in every step |
| The lookup of an operation that did commit | the fault steps whose original was applied and accepted | 3,766 | each resolved `committed` with the original's position; no fence stored. (The fence of a committed operation: the 14 paused-transactor cases above) |
| Import and settlement frames with unknown outcomes | one fault step in three under `import`, `activation` or `notice` (second image) | 1,661 | the same as live saves |
| Two SDK resolvers of one unknown outcome at once | in process, 6 settings | 6 | both answered fenced each time; the original refused; stored once |
| A second account sharing every client-chosen command and operation ID, option on | fuzz shadow saves after one save in four (second image) | 7,348 | every one committed on both writers; 0 claim or operation lookups returned the first account's transaction |
| The same with the option off | fuzz shadow saves | 1,523 | every one refused `409 OperationDuplicate` on both writers, equally |
| The differential fuzzer, faults included | 14 runs: serial saves (races, lost replies, kills before and after submit, reused commands, operations and identity blocks, faults) and concurrent rounds of 2 and 4 writers; 55,671 of the saves in the runs with a second account | 118,071 | 0 differences in answers, receipts, datoms or read routes; 266 deep compares equal; 0 unjustified refusals |
| A decided answer for an undecided outcome | reading: the catch's pass-through codes (`storage.clj` 656) and every place each is thrown | 7 codes | none is thrown after the hand-over |
| Unmarked refusals | the fuzzer's `wrong-owner-retire` saves (R2-6) | 984 | all answered `503` on both writers; the 370 inside fault steps each resolved fenced and absent |
| F2: import frames near the bound, and the live save at both caps | the shapes S6 did not send, on the general writer and the per-subject writers | 20 frames | admitted import frames 0.05 to 0.58 of their estimate except the cold first creation frame (0.99); 10 refused `413 ImportCommitTooLarge`; the live save at both caps 27 to 30 ms |
| Fences accumulating | 3,000 fences of 200-character IDs, then 21 saves, in 6 settings | 18,000 | 0.13 to 0.15 ms each (toy); every fence `200` fenced; saves, feed and positions unaffected |
| Removals with every per-subject writer off | probe, settings general and server | 2 | 200 for an existing and a not-yet-existing entity. With the per-subject writers off, a protected save holds the scope's privacy lock through its commit (`main.clj` 475), so a removal cannot land between its plan and its commit: R2-2 needs `TX2_SUBJECT_SAVE=1` |

## 3. How the tests work

**In process** (`s5/attack2_gate.clj`, run by `s5/clj-run2.sh`): the gateway's own route handler in one JVM on
Datomic's memory database, one writer setting per JVM.

- **A gateway without the option** is emulated with the option on and a request that names no account. Such a
  request is stored and fenced under exactly the plain ID that a gateway without the option uses (`storage.clj`
  529-533 and 547-551 skip the scoping; `main.clj` 399-404).
- **A delayed original:** the save's first `d/transact-async` is held, not sent; the gateway's deref times out
  (`503`); the test sends the held transaction after the lookup and the fence.

**Fuzz** (`s5/fuzz.clj`): the first review's differential fuzzer. A candidate scope with every per-subject writer on
and a control scope with every plan declined get the same requests; answers, receipts, datoms and the read routes are
compared. Two new dimensions:

- **`S5_FAULTS=1`:** one serial save in seven has an unknown outcome injected at its first `d/transact-async`, the
  same on both scopes.
  - 7 failure classes: transactor unavailable, interrupted, `:db.error/transactor-unavailable`, connection reset,
    timeout, an exception the gateway has never seen, and the deref timing out.
  - 3 kinds: applied, never applied, and held and sent after the fence.
  - Each is resolved as the SDK resolves it (lookup, then fence) and, when fenced, replayed under a new operation ID.
  - Checked on each scope: the resolved answer is the stored truth, a held original is refused, and both scopes
    agree.
  - On the second image, one fault step in three is sent under the `import`, `activation` or `notice` write class.
- **`S5_ACCOUNTS=1`:** a save whose owners are all of the first account names it (`account`). After one save in four,
  a second account saves a new subject under the first account's latest command ID and operation ID. With the option
  on it must commit, and its claim and operation lookups must return its own transaction.

**Stack** (`s5/stack2.sh`, `s5/stack2-run.sh`, `s5/mixed-fleet.ts`):

- PostgreSQL with `fsync`, `synchronous_commit` and `full_page_writes` on; a real transactor; gateway G_on with
  `TX2_ACCOUNT_CLAIMS=1` and gateway G_off without it.
- The SDK: `TriplesLive` with `claimAccount: "m1"`, `orderedSaves`, `saveSizeRule`, `severalOwners` and
  `creationSaves`. A proxy sends the save to one gateway and every other request (lookups, fence, reads) to the
  other.
- Each case: pause the transactor, send one save of one new fact, then resume it after 5 to 9 s, or kill it with
  SIGKILL while paused and restart it. Then read the log and the subject's live facts.

**Harness fixes.** The first fuzz runs with a second account stopped at a "difference" of the harness's own: a
shadow reused the second account's own command or operation ID from an earlier shadow, and was refused, as the
contract says. The first account's latest IDs can repeat: nothing new committed since the last shadow, or the same
command or operation ID committed again under the account after a plain claim of it (R2-11). Fixed in three steps
(`f228c8b0f`, `24c04e312`, `258d4413d`: a shadow now uses only IDs new to the second account). The 8 stopped runs stay
in the evidence and are not counted.

## 4. Not tested

- **Group commit** (`TX2_GROUP_COMMIT=1`) with fences or with the account option: not run, as in S6. From the code, a
  grouped save is checked for duplicates under the plain ID (`group.clj` 142) while its data carries the scoped one,
  so a scoped fence would be met only at the physical transaction's unique check.
- **Removal and declaration with the original still in flight** (a resend while the first transaction is queued):
  read only. `erase.clj` 163-245 makes a resend apply once or answer the first's receipt (the cut guard and the
  pending entry). Not fault-injected here; S6 injected failures before and after apply.
- **R2-2 with every per-subject writer off** (settings `general`, `accounts-on-general`): the removal the test uses
  answered `503`, so nothing was measured there. The probe (section 2, last row) shows why: the race cannot happen
  with those writers off.
- **On the stack:** network delay of the original instead of a paused transactor, an out-of-memory error in the
  gateway, an interrupt during the deref, and the HTTP layer closing the response after the commit. In process the
  fault classes include the interrupt and the deref timeout. An out-of-memory error is an `Error`, which neither
  catch takes; read only. S6's stack covered dropped requests and replies.
- **B naming its own account and fencing A's operation ID:** not sent. `operation-key` encodes B's account, so it
  cannot reach A's.
- **Sealed scopes and protected values with faults injected:** not run (S6 ran them without faults).
- **What a product handler does when the SDK's replays run out** on `DatomicOperationNotApplied` (R2-6): not tested.
- **Times at scale:** memory toy only. F2's ratios and the 27 to 30 ms live save are diagnostic.

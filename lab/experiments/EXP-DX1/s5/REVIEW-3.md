# S5 third review: the save line's answer to the second review (S6b)

Reviewer's branch `exp/DX-S5-save-line-review`. It holds the head under review, `cdfc70e02` (a fast-forward), plus
the reviewer's tests; nothing under `packages/` differs from `cdfc70e02`, whose gateway sources are identical from
`96b866c6d` on. Started 2026-11-25 09:35 EST, written 11:20 EST. Mac figures are toy-size and diagnostic.
[First review](REVIEW.md) · [Second review](REVIEW-2.md) · [The fixes](../s6/SAVE-LINE-FIXES.md) (sections 12, 10.1, 11)

**How it ran.** Every counted run used an image built from this branch's committed head by `s5/image3.sh`: the
pinned lab runtime with the head's gateway sources and codec spec, three other builds' gateways from their commits
(`a6d02225c`, the save line before S6b; `23b7df344`, the base; `03bb49cd3`, the removal branch), the test files and
the SDK drivers bundled from the head's built SDK, started by image ID, with nothing mounted but an output directory.
`s5/review3-runs.sh` lists the counted runs.

- `tx2-dxs5r3:4131f3685f94`, `sha256:e6d17e7f58f4…` (source `4131f3685`): the attacks in 7 settings, the second
  review's tests in 3, the removal branch's rule in 2, the native logs and identities, both transition stacks, U1 and
  the mixed fleet.
- `tx2-dxs5r3:89045bd1edc6`, `sha256:c92612abd4ae…` (source `89045bd1e`, adding the reopen test with the real
  bodies): that test, in 2 settings. Its fuzz run was stopped (the placeholders of section 5 were incomplete) and is
  not counted.
- `tx2-dxs5r3:5a225c306877`, `sha256:49b7e6b053ff…` (source `5a225c306`, the fuzzer's placeholders complete): the
  fuzzer, 3 settings x 8 seeds, and the second U1 run (200-row saves).
- Development runs (tests mounted from the working tree) are not counted, nor are the first image's fuzz runs and the
  second image's stopped one (their placeholders were incomplete); the harness errors they found are in section 5.
- Evidence, outside the repository: `DX-S5-review/r3-archives`, one archive per run (`r3-final-*`, `r3-final2-*`,
  `r3-final3-*`), with `SHA256SUMS`. Kept but not counted: `r3-final-fuzz-*` (the first image's fuzz),
  `r3-final2-fuzz-accounts-on` (stopped) and the development runs (`dev-*`).

## Page 1

**Is there a break? Yes. With the setting on and predecessor lookup off (the gateway's default), one open of the
database by a process whose general writer differs puts the old general writer back, and saves the transition was
meant to stop commit again. With the setting absent, no break found.**

- **What breaks** (`commit.clj` 419-432 and `main.clj` 91 against `account_claims.clj` 122-133):
  - The transition moves the general writer `:triplex/commit` to `:triplex/commit-ids1` and leaves a refusing body
    under `:triplex/commit`.
  - Every scope open runs `commit/install-base!`, which writes the opening process's general writer under
    `:triplex/commit` whenever its code hash differs from the one the scope recorded. The hash differs for any build
    whose `commit.clj` differs, and for the head itself under `TX2_LOAD1_PROFILE=1` or the covering-owner options
    (`TX2_SUBJECT_SAVE`, `TX2_SUBJECT_NUMERIC_OWNER` and `TX2_SUBJECT_OWNER_HEAD` all 1).
  - From then on the old ident works again, for good: nothing moves it back (`turn-on!` runs once, `ensure-twin!`
    skips a function whose twin exists). With predecessor lookup off, the general writer calls exactly that ident
    (`commit.clj` `entry`); with it on, it calls a hashed variant, which `install!` writes only when absent.
- **What commits that must not**, with predecessor lookup off:
  - a save planned before the transition commits after it, and stores the plain claim of an account-named save (S6
    12.2: "No save prepared under the old view commits after the transition");
  - a general save of a build that does not know the setting commits, after a reopen by the head under either option
    (S6 12.2: such builds are refused).
  - **On the PostgreSQL stack, with real builds:** with predecessor lookup off on every gateway, the real
    `a6d02225c` and `23b7df344` gateways were refused after the setting (6 of 6 saves). Then the head under
    `TX2_LOAD1_PROFILE=1` opened the database, and every save of both old builds was stored, with a plain claim:
    6 of 6, and 6 of 6 again after a transactor restart (`transition.ts`, `stack-transition-nopred`).
- **How sure: sure.** In process every case went as predicted (a planned save and an old build's save after a
  reopen, 2 settings; the reopen with the real profile and covering-owner bodies, 4 of 4). On the stack, 12 of 12
  old-build saves stored. With predecessor lookup on (the production scorecard's setting), the same stack kept the old
  builds refused (18 of 18), as the hashed variants predict.
- **With the setting absent:** the native log is identical datom for datom to the base `23b7df344` and to
  `a6d02225c`'s (2 settings, 240 saves each, apart from the scope's random key), identities equal in 6 settings, the
  second review's tests pass (143 assertions, 3 settings), and the fuzzer found no difference in 114,720 saves with the
  transition, stale planners and removals as steps.

**The three most serious findings, each with its test** (`s5/attack3_gate.clj` unless named):

1. **R3-1 (High): the old general writer comes back on a reopen** (above).
   `a-reopen-with-another-commit-hash-restores-the-old-ident` under `accounts-on-nopred` and
   `accounts-on-general-nopred`; `a-reopen-by-a-real-other-general-writer`; the stack's `transition.ts` with
   `S5_STACK_EXTRA=TX2_PREDECESSOR_LOOKUP=0`.
2. **R3-2 (High): any caller can take an account's command ID first and make that account's SDK settle on the
   caller's transaction.** Two routes:
   - **naming the account:** the account is whatever the request names (`account`, the SDK's `claimAccount`, or the
     entities' account); nothing ties it to the caller. A second client opened with `claimAccount "m1"` saved first
     under m1's command ID; m1's own client then failed `CommandAlreadyCommittedError` naming the other client's
     transaction (the PostgreSQL stack, `transition.ts` AUTHORITY). In process, 7 of 7 settings
     (`one-account-against-anothers-command-ids-with-the-setting-on`, `:names-the-account`).
   - **the removal route, naming no account:** `erase` stores its command ID as a claim and does not check the
     reserved prefix (`erase.clj` 185, `erase!`; R2-3's list leaves it out). A removal of the caller's own value sent
     under `acct-id/v1/3/a20/<id>` returned 200; account a20's save of `<id>` is then refused `CommandConflict` and
     a20's lookup returns the removal's transaction as a20's own (`a-removal-takes-an-accounts-scoped-command-id`, 7 of
     7 settings). The claim can be planted while the setting is off and takes effect when it turns on.
   - S6 12.4's "another account can neither read a Publish's record ... nor take a Publish's ID first" holds only for
     callers that cannot name another account and cannot send removals.
3. **R3-3 (Medium): R2-2 is closed for the SDK's replay, not for a resend.** After `ErasureReplayDeclined`, the same
   command sent again as a new save is judged by its own later source and stores the value chosen before the removal,
   the removed value itself included (`r2-2-replays-across-a-removal`, 4 cases in each of 7 settings: one-owner and
   general writers, a new value and the removed value). The SDK has no automatic path to it: after the decline it
   reads the head once and throws `WriteError` (`DatomicStorageAdapter.ts` 697-705), and it replays only
   `CasConflict`, `CommandConflict` and `ClockConflict`. The resend is the caller's, and the store can tell it from a
   new save by its command ID: the removal branch refuses it (it records declined commands).

**One recommendation:** merge it default off, and keep the setting off everywhere until R3-1, R3-2's removal route
and R3-4 are fixed and an authenticated layer sets the account. For R3-1, hash `:triplex/commit` like its variants,
or have `install-base!` write a changed body under the twin, never under the old ident, once the setting is on, and
have `ensure-twin!` move again when the twin's body is not this build's.

**Fit to merge DEFAULT OFF into the one branch? Yes,** with the merge conditions of section 2 if the removal branch
merges in the same step. With the setting absent nothing reviewed here changes a stored datom or an identity.
R3-1, R3-2, R3-4, R3-5 and R3-7 need the setting on (a removal can plant R3-2's claim while it is off, but the claim
does nothing until the setting is on). R3-3 and R3-6 are in R2-2's replay rule and apply with the setting absent
too; neither is a regression from the base, where the SDK's own replay stored the value (R2-2).

**What must be true before the setting is turned on anywhere:**

1. R3-1 fixed, or every gateway of the database runs with predecessor lookup on and no process with another general
   writer (another build, `TX2_LOAD1_PROFILE=1`, the covering-owner options) ever opens it.
2. The reserved prefix refused on the removal route, and no claim in the database already begins with it.
3. The account a request names comes from the authenticated caller, and a caller can write only its own account's
   entities; without that the setting separates honest callers' IDs and nothing more.
4. R3-4 fixed: an ordered import stream that names its account stops at the transition.
5. Every gateway runs this build or later (S6 12.4 step 5). A database restored from a backup taken before the
   transition is back to the setting absent, and claims stored after the backup are gone with it.
6. If the removal branch merges: the merged rule of section 2.

## 1. Findings

| ID | Severity | Finding | Where | Test | Evidence |
|---|---|---|---|---|---|
| R3-1 | High | After the transition, any scope open by a process whose general-writer code hash differs writes a working body under `:triplex/commit` again. With predecessor lookup off, saves planned before the transition and saves of builds that do not know the setting commit, with plain claims. Permanent | `commit.clj` 409-432, `main.clj` 91, `account_claims.clj` 122-143 | `a-reopen-with-another-commit-hash-restores-the-old-ident`, `a-reopen-by-a-real-other-general-writer`, stack `transition.ts` (predecessor lookup off) | in process, 2 of 2 settings: the planned save committed with a plain claim, the old build's save stored; real bodies 4 of 4; stack: 12 of 12 saves of `a6d02225c` and `23b7df344` stored after the reopen, through a transactor restart. With predecessor lookup on: refused (5 settings in process, 18 of 18 on the stack) |
| R3-1b | Medium | The twin is never refreshed: after an upgrade that changes `commit.clj`, general saves under the setting (predecessor lookup off) still run the transition build's code, and nothing reports it | `account_claims.clj` 135-143 (`ensure-twin!` returns an existing twin without comparing its body); `install-base!` writes only the old ident | by reading; the reopen test's `routedTo` | after a reopen by another hash, saves still route to `:triplex/commit-ids1` (14 of 14 cases), which `install-base!` never writes |
| R3-2 | High | Any caller can take an account's command ID first: by naming the account, or with no account through a removal sent under the reserved prefix. The account's save is refused for good and its SDK settles on the other transaction | `account_claims.clj` 218-250 (`account-for`, `stored-ids`); `erase.clj` 185, `erase!` | `one-account-against-anothers-command-ids-with-the-setting-on` (`:names-the-account`), `naming-another-account-reads-its-claims`, `a-removal-takes-an-accounts-scoped-command-id`; stack AUTHORITY | 7 of 7 settings each; on the stack m1's client got `CommandAlreadyCommittedError` naming the other client's transaction |
| R3-3 | Medium | R2-2: a resend of the declined command as a new save stores the value chosen before the removal, the removed value included | `storage.clj` 174-189 (`replay-frame-check!` runs only when `frameSourceK` is sent) | `r2-2-replays-across-a-removal` | 28 of 28 |
| R3-4 | Medium | An ordered import stream that names its account stops at the transition: the next frame is refused `ImportPredecessorMissing` (409) every time, because `apply-ids` scopes the predecessor and the frames before are plain. Naming no account, it continues | `account_claims.clj` 251-262 (`apply-ids`, `:import-predecessor`), `storage.clj` 166-173 | `an-import-chain-across-the-transition` (`accounts-on-import`) | 1 of 1: frame 1 refused twice, stored naming no account |
| R3-5 | Medium (admitted, now measured) | A write of no one account's names (a system entity, or two accounts' entities) under an account's command ID refuses that account's save of it for good: 5 tries, then again after 30 more saves; lookup answers `taken` | `account_claims.clj` 229-250 | `one-account-against-anothers-command-ids-with-the-setting-on` | 28 of 28 (7 settings x 2 kinds x setting on and off) |
| R3-6 | Low (admitted cost) | A replay whose first attempt was optimistic (`frameSourceK` null) is declined for a family any removal ever named, even one removed before the value existed; the caller gets a `WriteError` and must save again | `storage.clj` 183-189, `DatomicStorageAdapter.ts` 989 | `r2-2-an-optimistic-replay-against-an-old-removal` | 7 of 7 |
| R3-7 | Low | A build that does not know the setting is refused with a plain `409 CasConflict`; its SDK replays it as a conflict until its replays run out and reports "Datomic source changed while staging the transaction". Nothing in the answer names the setting | `account_claims.clj` 105-107 | `transition.ts` (both stacks) | every refused old-build save, 24, at about 255-315 ms each |
| R3-8 | Low | The account name's characters differ by form: `acct/<account>/` allows `[A-Za-z0-9_-]`, `lazy/account/...` and `notice:v2:` also `.`. An account whose name has a dot has no account for its `acct/` entities, so its saves keep plain claims of no one account | `account_claims.clj` 52-65 | by reading | not run |
| U1 | not reproduced (not evidence that it is gone) | The Publish review's U1 did not occur: 3,000 pairs of 40-row saves and 800 pairs of 200-row saves (7,600 SDK saves; one process, 16 workers; one store with ordered blocks, one without) gave 0 identity refusals and 0 `TRIPLEX_IDENTITY` lines. The driver drew the second store's IDs through its saves, each after a network round trip; U1 needs IDs drawn directly from the SDK's ID factory in the same millisecond as a block's token, as the Publish line's own IDs are, and the driver did not show that this happened. Had it occurred: `TRIPLEX_IDENTITY` is decided (`400 IdentityConflict`), the SDK does not replay it, nothing is stored, and the caller's next save draws new IDs | `orderedSaveIdentity.ts` 22-31, `outcome.clj`, `DatomicStorageAdapter.ts` 668-680 | `u1.ts` (stack) | 0 of 7,600 |

**Account authority, route by route** (setting on; B is any caller, A an account):

| Route | What B needs | What B gets | Tested |
|---|---|---|---|
| Claim or command lookup naming A, or A's entities | A's command ID | A's transaction ID and receipt | `naming-another-account-reads-its-claims` (7 settings) |
| A save naming A, writing an A entity, under A's command ID | A's command ID | A's save refused for good; A's SDK settles on B's transaction | R3-2 (7 settings, and the stack) |
| A removal under `acct-id/v1/<n>/A/<id>`, naming no account | A's command ID, and removal access | the same as the line above | R3-2 (7 settings) |
| A save of no one account's names under A's command ID | A's command ID | A's save refused for good; A's lookup answers `taken` | R3-5 (28 cases) |
| Operation lookup or fence by operation ID | A's operation ID (random per attempt; the feed shows committed ones) | a committed operation's receipt; a fence of an attempt in flight makes it not applied, and the SDK replays it under a new ID | by reading (S6 12.1, R2-9) |
| Reads of A's rows | A's entity IDs | the rows: the gateway has no read authority | by design; not tested |

## 2. R2-2 against the removal branch: which rule is right, and the merged rule

**Run side by side, not merged.** A trial merge of `03bb49cd3` into `cdfc70e02` (a scratch worktree, discarded)
conflicts in 5 files, 12 hunks: `main.clj` 5, `storage.clj` 3, `DatomicStorageAdapter.ts` 2, `privacy.clj` 1 and
`ha1/local.ts` 1. Resolving them is the builders' work; a resolution of mine would be the thing tested. Each rule ran
on its own build with the same requests: `s5/attack3_gate.clj` on the head (7 settings), `s5/attack3_era.clj` on
`03bb49cd3` (its default and `TX2_REMOVAL_PER_ACCOUNT=1`, the same answers in both).

| Case (the same values each time) | Head (S6b) | Removal branch (ERA2) | Right |
|---|---|---|---|
| The SDK's replay after an unrelated refusal, across a removal (a fresh source) | declined: judged by the first attempt's source (`frameSourceK`) | stored the value chosen before: judged by its own fresh source (2 of 2 writers) | head |
| The same command sent again after the decline, as a new save | stored the value chosen before, the removed value included | declined: the declined command is recorded (3 of 3 writers) | removal branch |
| A new value long after a removal, the first attempt optimistic (no source) | the replay is declined: `frameSourceK` null counts as framed before every removal | past the decline check when it carries the removal stamp the SDK read (`removalSeen`), declined without it; then refused `CasConflict` by the writer, which the SDK replays (not chased) | removal branch |
| A save racing a removal, then the SDK's replay | declined (5 writers); with the per-subject writers off, the removal waits for the save's lock and the save commits first | declined at once, the command recorded | both |
| The same values under a new command after a decline | stored (a new save) | stored (a new save) | both |

**What a merged rule must be.**

1. A save is framed at the earliest of: the first attempt's source (`frameSourceK`, sent on every replay), its own
   source, and the removal stamp the client read before an optimistic commit (`removalSeen`, carried from the first
   attempt on a replay).
2. It is declined when a removal naming a protected value it writes is later than that frame. A save that states
   none of the three is declined, and the SDK always states one (`removalSeen` on an optimistic commit), so a value
   entered long after a removal is never declined for having no source.
3. A declined command is recorded, and every later save under it is declined, whatever it states. A new command is
   a new save.
4. One order of comparison: the removal's published position (its entry's position today, its Datomic commit under
   the per-account option) against a source, and the account's removal sequence against `removalSeen`, both read from
   the same published record.
5. In the merge itself:
   - keep the head's `write-status` in both of `main.clj`'s catch handlers (the removal branch answers an
     unrecognised failure 400, which is F1 again), with the removal branch's authority-fault handling in front of it;
   - keep the several-owners and creation namespaces loaded last (the identities depend on it), `removal-scope`
     before them;
   - move the several-owners and creation planners to `privacy/fence-seq`, as the one-owner planner moves (the
     removal branch never had them);
   - keep IMP2's `families` beside the per-account entry in `privacy.clj`;
   - carry `removalSeen` in the head's `wire()`;
   - then rerun `s5/attack3_gate.clj` (r22 cases) and `s5/attack3_era.clj` on the merged build: every case's "right"
     column above must hold.

## 3. What held

| Claim | How it was attacked | Cases | Result |
|---|---|---|---|
| A save prepared before the transition and submitted after it is refused, stores nothing, and its replay stores once (S6 12.2); a stale head gateway recovers on the SDK's first replay | 7 writers (one-owner narrow and wide, several owners, creation, general, import frame, settlement frame), each naming its account and not, the transition committed between plan and submit; 7 settings (per-subject, serial, general, predecessor lookup off for both, group commit, import pipeline) | 98 | all `409 CasConflict`, nothing stored, the replay `200`; every account-named replay stored the scoped claim and no plain one |
| Two processes turning the setting on at once write the same values | 3 threads of one process at once on 12 databases, 7 settings | 84 databases | setting 1 everywhere; every moved function's old ident refuses and its twin keeps the original body |
| A save prepared on a snapshot from before the transition | a `begin` handle taken before it, the save sent after it | 7 | stored, with the scoped claim |
| Builds that do not know the setting are refused (S6 12.2) with predecessor lookup on | the real `a6d02225c` and `23b7df344` gateways on the PostgreSQL stack beside the head: after the setting, after the head under the profile option opened the database, after a transactor restart | 18 saves (one-owner, general, creation) | all refused, nothing stored |
| One stored form per operation ID (R2-1) | the second review's mixed fleet on the PostgreSQL stack: the two pairings that stored one save twice, controls, transactor stopped and killed | 11 | every save stored once, with the reported receipt |
| R2-2 for the SDK's replay | a removal between a save's plan and its submit, then the SDK's replay (`frameSourceK` its first source): one-owner narrow and wide, creation, general, import frame | 25 races (per-subject settings) | every replay declined, nothing stored; with the per-subject writers off the removal waited for the save's lock (10, by design) |
| With the setting absent, nothing stored changes (asked by the coordinator) | one fixed sequence of 240 saves on the head, the head again, `23b7df344` and `a6d02225c`; SHA-256 over every log datom but `:db/txInstant`, then datom by datom | 2 settings x 4 builds | identical datom for datom, apart from the scope's random key (`s5/logdigest.clj`, `s5/logdiff.py`) |
| Identities equal to the base with every option off (S6 section 6) | `s3/idents.clj` on the head and `23b7df344`, `s3/compare-idents.py` | 6 settings | 58 keys equal in each, none missing; 8 new keys, all of the several-owners and creation namespaces |
| The second review's tests, as the builder updated them | `s5/attack2_gate.clj` on this image; the builder's edits read: 5 assertions changed to the new contract (one stored operation-ID form, `taken` for another account's plain claim, the general writer's lock in the R2-2 race, the first call's compile excluded from R2-10's ratio); none drops a check | 3 settings, 36 tests | 143 assertions, 0 failures |
| The removal branch's own rule, where it holds | `s5/attack3_era.clj`: a save racing a removal, then a resend of the same command, then the same values under a new command | 6 (3 writers x 2 settings) | race and resend declined, the command recorded; the new command stored |
| The fuzzer: candidate (every per-subject writer) against the general writer as control, with faults, a second account, the transition at one third of the steps, stale planners after it, removals alone and racing a save with the SDK's replay | `s5/fuzz.clj`, 3 settings (per-subject, serial, general with predecessor lookup off) x 8 seeds x 3,000 steps, the three settings at once; each step compares answers and receipts, and every 400 steps the stored datoms, every read route and the feed | 114,720 saves (93,120 serial, 21,600 concurrent in 48 rounds of 2 and 4 writers); 10,274 with an unknown outcome injected; 15,863 of a second account; 24 transitions; 1,401 stale-planner saves; 1,437 removals; 720 removal races | 0 differences, 240 deep compares equal, 0 unjustified refusals; every stale-planner save refused on both scopes and none stored; every replay across a landed removal declined |

## 4. Not tested

- **Nothing ran on a server.** Every figure is the Mac toy's and diagnostic.
- **A database restored from a backup taken before the transition:** not run (the memory storage has no backup and
  the stack has no backup step). By reading: the restored database has the setting absent and the original bodies,
  so it behaves as before the transition; claims stored after the backup are gone with everything else after it.
- **The transactor killed during the transition's own transaction:** not run. The setting, the twins and the
  refusals are one Datomic transaction; the schema transaction before it is harmless alone (`turn-on!` 122-133).
- **A build with different per-subject writer code** opening the database after the transition (the admitted limit):
  not built. `23b7df344`'s identities equal the head's, so it is covered; the general writer's case is R3-1.
- **The merged removal rule:** not built (section 2).
- **The per-subject replan retry racing a removal:** not run. By reading, `replay-frame-check!` runs inside `tx-data`,
  which the retry calls, so the retry is judged as its first attempt.
- **Two real gateways turning the setting on at once:** run in process only (3 threads on 12 databases, 7 settings).
- **Group commit across the transition with an old build's group in flight on the stack:** not run. In process the
  group setting ran the transition cases (14 of 14 held); by reading, the group guard (`GROUP_STALE`) refuses a group
  prepared before any later transaction.
- **U1 as the Publish line meets it:** the driver used two stores in one process, not the Publish line's own IDs.
  Not reproduced (0 of 7,600); see the U1 row.
- **The covering-owner writer under the setting:** only its general-writer body was installed (the reopen case); no
  covering-owner saves ran.
- **Sealed values with the setting on:** the fuzzer ran unsealed protection only.

## 5. Harness errors found and fixed (not findings)

- The authority test reused the command ID as the operation ID (the fuzzer's frame does when no operation is given);
  the SDK draws operation IDs at random. Every save now has its own.
- With the setting off, an account-named save on a permitted process turns the setting on (`stored-ids`); the
  setting-off cases now run with permission withheld.
- The snapshot case resent under its own command; it now reads the stored claim form.
- The first stack run named the account on the head's "before" saves through a permitted gateway, which turned the
  setting on at the first save; the "before" saves now name no account.
- The first stack runs had predecessor lookup on for every process (the card's settings are the container's); the
  stack can now override them (`S5_STACK_EXTRA`), and the second run has it off.
- The reopen test first ran with predecessor lookup on, where the general writer calls a hashed variant; it now also
  runs with it off.
- The fuzzer compared receipts' `recordedAt`, the stored datoms and the read routes across the two scopes after
  removals. Each scope's removal takes its own random transaction ID and its record time from the clock when that
  scope runs it, and every later server-assigned record time follows from it, so these differ by design. With
  removals on they are compared as placeholders (`fuzz.clj` `norm-text`, `norm-value`); the counted fuzz ran with it.
- The fuzzer's removal-race step required a declined replay even when the removal had waited for the save's lock
  (the general writer), so there was no race; it now requires the decline only when the removal landed.
- The R2-2 race test has the same expectation under the general writer: its 10 cases there are counted as "the
  removal waited", not as findings.
- The first U1 run (20,000 pairs of 40 rows) filled the memory database's heap; stopped, not counted.

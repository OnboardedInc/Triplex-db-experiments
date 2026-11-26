# S5 fourth review: the save line's answer to the third review (S6b, fourth pass)

Reviewer's branch `exp/DX-S5-save-line-review`. It holds the head under review, `9f210018f` (a fast-forward), plus the
reviewer's tests; nothing under `packages/` differs from `9f210018f`. Started 2026-11-25 18:25 EST, written 19:50 EST (the second fuzz setting still running then; its total follows in a later commit).
Mac figures are toy-size and diagnostic. At most two heavy jobs ran at a time, and one from 19:02 (the coordinator's
slot rule).
[Third review](REVIEW-3.md) · [The fixes](../s6/SAVE-LINE-FIXES.md) (section 13)

**How it ran.** Every counted run used an image built by `s5/image3.sh` from this branch's committed head: the pinned
lab runtime with the head's gateway sources (`9f210018f`'s), the gateways of `a6d02225c` (the save line before S6b),
`23b7df344` (the base), `03bb49cd3`, the removal branch `a8fc0276b` (`origin/exp/DX-ERA6-removal-on-save-line`, eighth
round) and the trial merges below, the test files and the bundled SDK drivers, started by image ID with nothing mounted
but an output directory. `s5/review4-runs.sh` lists the runs.

- `tx2-dxs5r3:3e1838854e3d` (`sha256:011c84183cae…`, source `3e1838854`): the attacks in 5 settings, the third
  review's tests in 7, R2-2 on the removal branch and the first trial merge in 4 each, the native logs and identities,
  the transition stack with predecessor lookup on, the fuzzer's first setting. Removed after its last run.
- `tx2-dxs5r3:1d554f7766f6` (`sha256:79a98a91a64c…`, source `1d554f776`, adding the window stack's fix and the second
  trial merge; the gateway under test is the same): the second trial merge in 4 settings, both window stacks, the
  transition stack with predecessor lookup off, the fuzzer's second setting.
- Development runs (tests mounted, on `tx2-dxs5r3:da86fcb6e100`, since removed) are not counted. The first window stack
  is not counted: its profile build refused to start (it was given the per-subject options without the per-subject
  writer); kept under `superseded/`.
- Evidence, outside the repository: `DX-S5-review/r4-archives`, one archive per run, with `SHA256SUMS`.

**The trial merges.** Local commits on a detached head, never pushed; their diffs against the head are in the evidence.

- `f17410ed5`: `9f210018f` merged with `a8fc0276b` under the builder's proposed resolution (S6 13.5), applied
  literally: the branch's side for the replay rule; this branch's `frame-check!`, `declined-check!` and
  `record-declined!` dropped; `TRIPLEX_ACCOUNT_IDS_ON` kept in the catch tail; the install wrap kept; the branch's
  `wire()` in the SDK.
- `9fe2e5f02`: `f17410ed5` with this branch's three checks put back, run only while the branch's replay rule is off
  (with it on, the branch's `decline-check!` decides).

## Page 1

**Is there a break? With the setting absent, no break found: fit to merge default off. With the setting on, yes, two:
a build that does not know the setting still writes, and a request naming one account can make an entity another
account's. Separately, the merge with the removal branch that the builder proposes would bring R2-2 back.**

- **The third review's R3-1 is fixed for this build.** Every install of this build under the setting writes a moved
  body to its twin, never to the old ident. On the PostgreSQL stack the real `a6d02225c` and `23b7df344` gateways,
  default options, were refused after the transition 48 of 48, with predecessor lookup off too and after this build
  under the load profile opened the database (the third review's case: 12 of 12 stored). The transition killed before,
  between and after its two transactions never left a mix, and running it again completed it (15 of 15).
- **What still commits that must not (R4-1, R4-4, R4-5).** A build that does not know the setting writes its own body
  on its open whenever its writer was not moved at the transition, and its saves then commit with plain claims:
  - **its general writer differs** (`a6d02225c` under `TX2_LOAD1_PROFILE=1`): 10 of 10 stored after its open; the
    window closes at this build's next routed save (0 of 10 after);
  - **its writer has an ident the database did not hold** (`a6d02225c` with the serial options): 10 of 10 after its
    open, 10 of 10 after three routed saves of this build, 7,222 saves in 60 s with it alone; the window closes only
    at this build's next open (0 of 10 after);
  - **with predecessor lookup off, builds that alternate re-open it:** after the profile build, `23b7df344` opened and
    stored 5 of 5, then the profile build opened again and stored 10 of 10;
  - **the account's own client** then saving the command an old build stored in the window gets
    `CommandAlreadyCommittedError` naming the old build's transaction, and the account's lookup returns that
    transaction as its own.
- **Can the database enforce "only builds that know the setting open it"? No.** The old build's code decides what its
  open writes, and nothing in the database refuses it. And "knows the setting" is not enough: builds of `cdfc70e02`,
  which the one branch holds now, know the setting but have no install wrap (R3-1 itself). The rule that would hold is
  "only builds with this pass or later".
- **What else breaks (R4-2).** `stored-ids` checks a request's accounts on the database as it was before the save.
  A request naming A that writes `:subject/account "b40"` on an entity whose ID names no account is stored; the entity
  is then B's: B writes it, A is refused. 10 of 10 (5 settings, setting on and off).
- **The merge with the removal branch (R4-3).** Applied literally, the builder's resolution leaves no decline check at
  the branch's default (its replay rule off): the SDK's replay across a removal stored the value chosen before it, the
  removed value included, 4 of 4; the caller's resend 4 of 4; a save racing a removal 3 of 5 writers. Keeping this
  head's three checks on the rule's off path (trial merge `9fe2e5f02`) passed every case (23 of 23); turning the
  branch's rule on by default also closes them.
- **How sure: sure.** R4-1, R4-4, R4-5: in process in 5 settings and on the stack with real builds, predecessor lookup
  on and off. R4-2: 10 of 10. R4-3: both trial merges in 4 settings each, against both parents.
- **With the setting absent:** the native log is identical datom for datom to the base `23b7df344`'s (2 settings,
  240 saves each, apart from the scope's random key); the 58 stored-function identities are equal in 6 settings; the
  third review's tests pass apart from its harness arm; the fuzzer found no difference in 52,905 saves of its first setting with the
  transition, an old build reopening, stale planners and removals as steps (its second setting: running, 2 of 11 seeds
  done when this was written, 9,673 saves, no difference).

**The three most serious findings, each with its test** (`s5/attack4_gate.clj` unless named):

1. **R4-1 (High): the admitted window.** `the-admitted-window-after-an-old-build-opens` (5 settings); on the stack,
   `s5/window.ts` on `s5/stack5-run.sh`, with `S5_STACK_EXTRA=TX2_PREDECESSOR_LOOKUP=0` for the second run.
2. **R4-2 (High): a request naming A makes an entity B's.** `a-request-naming-one-account`, the `planted` case
   (`attack4_gate.clj` 219).
3. **R4-3 (High for the next merge): the builder's resolution brings R2-2 back.** `s5/attack3_gate.clj`
   `r2-2-replays-across-a-removal` and `r2-2-race-on-each-writer` with `S5_ONLY=r22 S5_BUILD=merged` (the resolution)
   and `S5_BUILD=merged2` (the correction), settings `era6-rule-off` and `era6-rule-on`.

**One recommendation:** merge `9f210018f` into the one branch with the setting off now, and when the removal branch
merges onto it, keep this head's `frame-check!`, `declined-check!` and `record-declined!` on the branch's
replay-rule-off path, as `9fe2e5f02` does (about 60 lines in `storage.clj`), instead of dropping them; or flip
`replay-rule-default` to true in that same merge.

**May `9f210018f` merge into the one branch with the setting OFF? Yes.** With the setting absent nothing reviewed
here changes a stored datom or an identity, and the fuzzer agrees. The install wrap hooks `d/transact` for the whole
process but acts only inside `installing`, and with the setting attribute absent it transacts the install unchanged
(the native log is the proof). R4-1, R4-4, R4-5 and R4-8 need the setting on. R4-2's check runs with the setting off
too, but before this pass nothing was checked there, so it is a gap in the fix, not a regression. R4-3 is about the
next merge, not this one.

**What must be true before the setting is turned on on any database:**

1. **Every process that can open that database runs this pass or later**, whatever its options: not the base, not
   `a6d02225c`, not a build of the one branch from before this merge (`cdfc70e02` and its descendants). The database
   cannot enforce this today; either a change makes an older build's open fail (not designed or tested here), or the
   rule is accepted as an operations rule with R4-1's window as the cost of breaking it.
2. **R4-2 closed:** the gateway judges a request's accounts after the save's own `:subject/account` writes, or refuses
   a request naming A that writes `:subject/account` with any other value.
3. **The layer in front of the gateway built** (S6 13.2 points 1 to 4): the account taken from the authenticated
   caller, requests naming no account only from the system, removals only from callers allowed to remove.
4. **If the removal branch has merged: R2-2 closed in the merged build at its defaults**, shown by
   `r2-2-replays-across-a-removal` and `r2-2-race-on-each-writer` on that build (R4-3).
5. **The database was never turned on under `cdfc70e02`**, or its setting guard is installed before this build opens
   it, for example by posting the setting once through this build (R4-8).
6. **Predecessor lookup on** on every gateway (the production scorecard's setting): it stops R4-4's alternation; it
   does not close R4-1.

## 1. Findings

| ID | Severity | Finding | Where | Test | Evidence |
| --- | --- | --- | --- | --- | --- |
| R4-1 | High (setting on) | The admitted window, measured. A build that does not know the setting writes a working body on its open in two cases: its general writer under `:triplex/commit` when the scope's recorded hash is not its own (`TX2_LOAD1_PROFILE=1`, the covering-owner options, another `commit.clj`); and any writer whose ident the database did not hold at the transition (an option set no process had opened that database with), which it installs as a new ident. Its saves then commit, with plain claims. The general writer's window closes at this build's next routed save (`repair-routed!` finds `:triplex/commit` working) or open. A writer under a new ident is not one `repair-routed!` reads, so its window closes only at this build's next open: on the stack, `a6d02225c` with the serial options stored 10 of 10 after its open, 10 of 10 after three routed saves of this build, and 7,222 (predecessor lookup on) and 7,236 (off) in 60 s alone, then 0 of 10 after this build opened. Nothing in the database bounds it in time, and nothing in it can stop an old build's open | `account_claims.clj` 271-279 (`repair-routed!`), 143-165 (`repair-ops`, `repair!`); `a6d02225c` `commit.clj` 420-440 (`install-base!`, `install!`) | `s5/attack4_gate.clj` `the-admitted-window-after-an-old-build-opens`; `s5/window.ts` on `s5/stack5-run.sh` (`stack-window`, `stack-window-nopred`) | in process 20 of 20 after the open, 5 settings; stack: the profile build 10 of 10 after its open, 0 of 10 after this build's routed saves, both settings |
| R4-2 | High (account separation) | A request naming account A can make a new entity account B's. `stored-ids` judges the save's accounts on the database before the save (`other-accounts`, `account-of-id`), and an entity whose ID carries no account takes its account from its stored `:subject/account`. A request naming A that writes `:subject/account "b40"` on `x/planted-…` is stored (200; under A's scoped claim with the setting on); the entity is then B's: B's request writes it (200), A's is refused (400). Same with the setting off (no regression: before this pass nothing was checked) | `account_claims.clj` 57-70, 358-363, 365-372 | `s5/attack4_gate.clj` `a-request-naming-one-account` (line 219) | 10 of 10 (5 settings, setting on and off) |
| R4-3 | High (the merge with the removal branch) | The builder's proposed resolution (S6 13.5) leaves the merged build with no replay check at the removal branch's default. Dropping `frame-check!`, `declined-check!` and `record-declined!` also drops the third pass's `replay-frame-check!`, which this head replaced and the branch did not touch, so the three-way merge removes it without a conflict: `storage.clj` of `f17410ed5` holds no decline check at all. With the branch's rule off (`replay-rule-default false`): the SDK's replay across a removal stored the value chosen before it, the removed value included, 4 of 4; the caller's resend 4 of 4; a save racing a removal then replayed stored on 3 of 5 writers. That is R2-2 back in full, worse than both parents and than the one branch (`cdfc70e02` declines the SDK's replay). With the rule on, every R2-2 case is declined | `f17410ed5` `storage.clj` (`tx-data`, `commit!`); `a8fc0276b` `removal_commit.clj` 1019 | `s5/attack3_gate.clj` `r2-2-replays-across-a-removal`, `r2-2-race-on-each-writer` with `S5_BUILD=merged`; `S5_BUILD=merged2` for the corrected merge | 4 settings each; the corrected merge passes them all with the rule off (23 of 23) |
| R4-4 | Medium (setting on) | Builds with different general writers re-open the window on each alternation. A build that finds its own hash recorded leaves `:triplex/commit` alone, and under the setting this build never writes the recorded hash; but each build whose hash differs from the recorded one writes its body and its hash. With predecessor lookup off they call `:triplex/commit` and commit again; with it on they call their hashed variant, which their later opens find present (refused) and leave. Stack, predecessor lookup off: after the profile build opened, `23b7df344` opened and stored 5 of 5; the profile build then opened again and stored 10 of 10; on: 0 of 5 and 0 of 10 | `a6d02225c` `commit.clj` 420-432 | `the-admitted-window-after-an-old-build-opens` (`storedAfterItReopens`: 5 of 5 off, 0 of 5 on); `stack-window-nopred` P2 | in process 5 settings; stack 2 settings |
| R4-5 | Medium (setting on) | A window save takes the account's command ID in plain form. The account's lookup then returns the old build's transaction as the account's own (an owned plain claim), and its own save of that command is refused `409 CommandConflict`; through the SDK, `CommandAlreadyCommittedError` naming the old build's transaction | `account_claims.clj` 383-389, 336-345 | `the-admitted-window-after-an-old-build-opens` (`accountsOwnSaveOfTheCommand`, `accountsLookupIsTheOldBuildsTransaction`); `window.ts` P3 | 5 of 5 in process; 2 of 2 on the stack |
| R4-6 | Low | Builds that do not know the setting never show its text (R3-7's fix reaches this build only). On the stack `a6d02225c` answered the refusal `503 OutcomeUnknown` ("the operation was fenced and never committed", a fence of about 400 ms per save) and `23b7df344` `400 TransactionRejected`; neither names the setting. S6 13.4 says such a build answers "with that text" | `a6d02225c` `outcome.clj` (an unrecognised failure after submit is unknown) | `transition.ts` (`stack-transition`, `stack-transition-nopred`), `window.ts` | 48 of 48 refusals on the transition stacks, 65 on the window stacks |
| R4-7 | Low | An install that read the database before the transition and commits after it carries no guard and is not rewritten; if the process dies before `installing`'s repair, the old ident keeps a working body until this build's next routed save or open. With predecessor lookup off, saves calling it committed (3 of 3) until then; with it on they were refused | `account_claims.clj` 195-202 | `an-install-read-before-the-transition-commits-after-it` | 5 settings |
| R4-8 | Low | A database turned on by `cdfc70e02` (merged into the one branch) has the setting attribute but no setting guard, which this pass added. This build's installs there take the unguarded path (a plain install, then `repair!`): R4-7's window on every open of this build, until the guard exists. By reading, posting the setting again through this build's `settings` route installs it (`turn-on!` adds the attribute and guard when either is absent) | `account_claims.clj` 195-202, 236-250; `main.clj` 402-406 | by reading | not run |
| R4-9 | Low | On the removal branch's own build (its rule off or on) and on both trial merges with the rule on, an optimistic replay of a new value long after a removal, stating neither `frameSourceK` nor `removalSeen`, is declined `409 ErasureReplayDeclined`; this head stores it. The branch's SDK states `removalSeen` on every attempt, so only a caller that states no frame meets it, and the decline is on the exact side | `a8fc0276b` `removal_commit.clj` (`framed?`) | `r2-2-an-optimistic-replay-against-an-old-removal` | declined in all 4 settings of the branch's build and in both rule-on settings of each trial merge |
| R4-10 | Info | The removal branch adds two stored functions, `:triplex.removal/commit-v1` and `:triplex.removal/fence-v1`, outside `install-sites`. Neither is a save writer the transition moves (`swappable?` does not match them), so neither opens a window today; a later pass that moves either must list it | `a8fc0276b` `removal_commit.clj` 30, 502-510; `removal_scope.clj` 34, 139 | by reading | not run |

**R3-2 route 1's other paths held.** A request naming A that writes an `acct/b40/…` entity is refused `400 InvalidValue`
on the one-owner writer, as an import frame and as a settlement frame, with the setting on and off, with group commit
too (10 of 10 each); a request naming A writing a system entity only, or its own and a system entity, or a reference
into B's account, is stored under A's scoped claim (setting on) or plain (off).

**R2-2's general writer (the third review's harness).** The third review's `r2-2-race-on-each-writer` ran the removal
on the saving thread, which on the general writer waits for the writer lock the save holds. In the two settings that
send every save through the general writer, all 5 of its arms fail (10 assertions each), on this head and on every
other build; it is a harness limit, not a finding. Run on its own thread from the save's submit (`r2-2-the-general-writer-with-the-removal-on-its-own-thread`), the removal waits for the save, commits
after it, and the value chosen before it is not what is read after both: 3 writers (general, import frame, general
creating the entity) in 5 settings, 15 of 15.

## 2. The merge with the removal branch: is the builder's resolution right?

**No, not as written.** The conflicts are the ones the builder lists (`storage.clj` 2 hunks, `DatomicStorageAdapter.ts`
2, the test file add/add), and taking the branch's side in the SDK and keeping `TRIPLEX_ACCOUNT_IDS_ON` in the catch
tail are right. Dropping this branch's three checks is right only once the branch's replay rule is on by default.

| Build | Replay rule | SDK replay across a removal declined | Caller's resend declined | Race then replay: value not stored | Optimistic replay, no frame, new value stored |
| --- | --- | --- | --- | --- | --- |
| this head `9f210018f` | (no switch) | 4 of 4 | 4 of 4 | 5 of 5 | 1 of 1 |
| removal branch `a8fc0276b` | off (default) | 4 of 4 (its `replay-frame-check!`) | 0 of 4 | 5 of 5 | 0 of 1 |
| removal branch `a8fc0276b` | on | 4 of 4 | 4 of 4 | 5 of 5 | 0 of 1 |
| builder's resolution `f17410ed5` | off (default) | 0 of 4 | 0 of 4 | 2 of 5 | 1 of 1 |
| builder's resolution `f17410ed5` | on | 4 of 4 | 4 of 4 | 5 of 5 | 0 of 1 |
| corrected `9fe2e5f02` | off (default) | 4 of 4 | 4 of 4 | 5 of 5 | 1 of 1 |
| corrected `9fe2e5f02` | on | 4 of 4 | 4 of 4 | 5 of 5 | 0 of 1 |

Counts are per setting without the general writer (`era6-rule-off`, `era6-rule-on`); the general settings agree apart
from the harness arm. **Two ways to merge that keep R2-2 closed:** keep this branch's three checks on the rule's off
path (`9fe2e5f02`: `(when (not replay-rule) …)` around each), or flip `replay-rule-default` to true in the same merge
(the branch's comment says that is the one line that turns it on once reviewed). Either way `already-stored?` and the
branch's declined-command records stay; they use the same attributes as this branch's (`:triplex.removal/declined-
command`, `:triplex.removal/declined-by`).

## 3. What held

| What | How | Size | Result |
| --- | --- | --- | --- |
| The setting absent: native log | `s5/logdigest.clj`, head and base `23b7df344`, 2 settings | 240 saves each, 7,598 and 7,600 datoms | identical datom for datom apart from the scope's random key |
| The setting absent: identities | `s3/idents.clj`, head and base, 6 settings | 58 stored-function identities each | all equal; the head adds 8, the several-owners and creation writers' code, which the base does not have |
| The setting absent and on: the fuzzer | `s5/fuzz.clj`, faults, a second account, the transition at a third of the steps, stale planners, an old build reopening, removals (alone and racing a save with the SDK's replay), protected values unsealed | first setting (`accounts-on`): 11 seeds x 3,000 steps, 52,905 saves (43,005 serial, 9,900 concurrent in 22 rounds of 2 and 4 writers); 7,009 with a fault injected (unknown outcome, kill before or after, lost reply); 465 old-build reopens; 11 transitions; 638 stale-planner saves; 653 removals, 308 removal races. Second setting (`accounts-on-general-nopred`): running, 2 of 11 seeds done at 19:49 | first setting: 0 differences, 110 deep compares equal, 0 unjustified refusals, 0 replay differences; second setting so far: 9,673 saves, 0 differences |
| The third review's tests on this head | `s5/attack3_gate.clj`, 7 settings | 12 tests | 116 of 116 assertions in 4 settings, 118 of 118 with imports; the 2 general settings 106 of 116 (the harness arm above) |
| The transition killed at each step | `the-transition-killed-at-each-step`, before the first transaction, between the two, after the second before its answer | 3 points x 5 settings | never a mix (the setting absent and nothing moved, or the setting on and every writer moved); running it again completed it every time |
| Another account's entities | `a-request-naming-one-account` | 3 writers x 2 setting states x 5 settings | refused 400, 30 of 30 |
| The general writer racing a removal on its own thread | `r2-2-the-general-writer-with-the-removal-on-its-own-thread` | 3 writers x 5 settings | 15 of 15: the removal waits, the value is not stored |
| Real old builds after the transition, predecessor lookup on | stack `transition.ts`: `a6d02225c` and `23b7df344` (default options), the head, the head under the load profile, a transactor restart | 45 saves | 24 of 24 old-build saves after the transition refused; the head's 9 stored scoped; the profile store's 6, which name no account, stored plain as designed |
| Real old builds after the transition, predecessor lookup off | stack `transition.ts`, the same | 45 saves | 24 of 24 old-build saves refused, after this build under the load profile opened and after a transactor restart too (the third review's R3-1 case, 12 of 12 stored there) |
| A tenth writer of a moved ident | search of the head's gateway for `d/function` and `:db/fn` | every file | none: the nine `install-sites` are every writer of an ident `swappable?` matches; `erase.clj`, `group_prepare.clj`, `layout_replay.clj`, `ha_shared.clj`, `owner_layout.clj` `install-fixture!` write idents it does not match; failover promotion and restore install nothing of their own (by reading) |

## 4. Where the third review's findings stand

| Finding | Now | Evidence |
| --- | --- | --- |
| R3-1 (a reopen put the old general writer back) | fixed for this build's own installs; open for other builds (R4-1, R4-4) | stacks above; `a-reopen-*` pass in 7 settings |
| R3-2 route 1 (naming the account) | another account's entities refused on every writer; one hole (R4-2); naming itself is the front layer's | `a-request-naming-one-account` |
| R3-2 route 2 (a removal under the reserved prefix) | fixed | `a-removal-takes-an-accounts-scoped-command-id`, 7 settings |
| R3-3 (a resend after a decline stored the value) | fixed in this head; undone by the proposed merge (R4-3) | section 2 |
| R3-4 (an import stream stopped at the transition) | fixed | `an-import-chain-across-the-transition`, 118 of 118 |
| R3-5 (a write of no one account's names blocks an ID) | under the setting only a request naming no account can still write a plain claim; that is the front layer's point 3 | by reading; the stacks' profile store (6 plain claims, no account named) |
| R3-6 (an optimistic replay declined for any removal) | fixed in this head; the branch's rule declines a replay that states no frame (R4-9) | section 2 |
| R3-7 (the refusal named nothing) | this build answers it `409 CasConflict`; older builds still name nothing (R4-6) | stacks |
| R3-8 (account names differ by form) | one rule, `[A-Za-z0-9_.-]{1,64}`, in every form | by reading (`account_claims.clj` 52-70) |

## 5. Not tested

- **Reads by another account** (S6 13.2 point 5): rows by ID, history, reach across references, the feed, operation
  lookups, removal metadata. By reading, a claim lookup naming account A returns A's claims to whoever names A, and a
  lookup naming B for a command ID another account holds in plain form answers `taken`, which tells B that the ID is in
  use (command IDs are random, so this reveals little).
- **Who the caller is**: the gateway cannot tell (13.2); points 1 to 4 of the layer in front are not built, so nothing
  here tests them.
- **A database-side bar on old builds.** Nothing in this head stops an old build's open. One lever may exist for the
  general writer: an attribute predicate on `:triplex.scope/commit-fn-hash` that refuses a changed hash once the setting
  is on would make an old build's install transaction fail as a whole (it writes the body and the hash together). None
  was found for a writer installed under a new ident. Not tried.
- **Failover promotion, restore and the HA lab** with the setting on: by reading they write no moved ident; not run.
- **The one branch at `345f833e4`** (the key-pool, reply and ID allocator fixes): `commit.clj` is the same file as this
  head's, so its general writer's hash should be the same; its identities were not compared here.
- **Fences and operation lookups in the window**: by reading, a fence stores the operation ID, whose form the setting
  does not change (S6 12.1), so a fence in the window is the same as outside it; not run.
- **An open's repair racing an old build's save in flight**: by reading, Datomic orders the two, so the save either
  commits first (a window save, as counted) or calls the refusal after it; not run as a race.
- **Sealed values with the setting on**: the fuzzer ran unsealed protection only.
- **Scale and timing**: toy sizes on the Mac; the window's length on real traffic is the time between an old build's
  open and this build's next save (general writer) or open (a per-subject writer), which depends on traffic, not code.

## 6. Harness errors found and fixed (not findings)

- The first window stack started the profile build with the per-subject options the stack's container sets for every
  gateway, which that build refuses without its per-subject writer; it never became healthy. The runner now turns
  them off for that gateway (`stack5-run.sh`); the first run is kept under `superseded/` and not counted.
- The window driver reads a claim's form with two lookups sent without a position, which read the gateway's current
  view: once (1 of the 45 forms read in `stack-window-nopred`) the plain lookup ran before the peer had the save and
  the account lookup after, so a plain claim was counted as scoped. Only this build can write a scoped claim, and the
  save was the old build's.
- The in-process window test's reopen writes the old body and hash unconditionally: it models a reopen that finds
  another build's hash recorded. A single old build that finds its own hash recorded leaves the ident alone; the
  stack's P2 shows the alternation with real builds.
- The third review's R2-2 race on the general writer (section 1): replaced, for that writer, by a removal on its own
  thread.

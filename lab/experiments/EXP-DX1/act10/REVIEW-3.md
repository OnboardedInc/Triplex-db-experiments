# Third adversarial review: the settings stored in the database (DX-ACT10, 2026-11-25)

Reviewer DX-ACT10, branch `exp/DX-ACT10-publish-review`, fast-forwarded to the head under review `2084d3ba7` of
`exp/DX-ACT8-publish-beside-saves` (last code commit `f34694edf`) plus this review's tests and harness switches. The
code under review was not changed. The code diff `bf377c57f...2084d3ba7` was read before the page (sections 0.0 and 0.8
to 0.13). Mac only, toy sizes, the lab VM shared with other builders; every time below is diagnostic. Stacks ran on this
reviewer's private image `687631432169`, built again from the head under test (receipt `image-receipt-4.json`, the same
image ID: its Datomic inputs equal the earlier build's). The base runs use `8b28ec0f2`: the code of `bf377c57f` plus
this review's recorders only. Finished Wed Nov 25 05:15:34 EST 2026.

## Page 1, for the owner

**Is there a break now? Not in what the settings were built to stop: with the rollout order kept, no Publish was
acknowledged with another record and none landed twice in 25,000 fuzzed schedules (a mixed fleet with old builds) with
settings transitions landed inside Publishes' and frames' windows. But two faults need no attacker, a third needs only
the rollout order broken, and two let one account act against another.** How sure: certain for each; each reproduces
every time in process with the real code, and U1 also on the stack.

**The coordinator's item 5, run to ground.** The options-off stops are not a regression of this head and not the gate's
harness. Two ID generators in one process share one ID space (U1): a save's ordered identity block and the SDK's next
monotonic IDs in the same millisecond can be the same assertion ID, and the transactor refuses whichever commits
second. The duplicate is never stored. On the builder's cost and beside parts, 8 runs at the head and 8 at the base
show the same rate: 111.6 and 108.2 IDs a run inside a save's block, about one collision expected in 8 runs at each,
and one save refused (at the head). The builder's `G4off2`, recorded as "no error", has the same refusal in its
transactor's console. How sure: certain of the mechanism and that the base has it; the full gate's stop rate at the
base was not measured, and 3 stops in 4 runs at this head against 0 in 2 at the earlier code is not evidence of a
regression (p = 0.2). This is also very likely the cause of R6's one-try refusal.

**The three most serious findings, with their tests**

1. **U2, an account locked at the first transition (no attacker).** The first process given a permission records its
   own ledger mode, `whole` if it names none. An account whose notices were recorded in parts (every gate's accounts)
   then can neither settle nor publish, a release with no new notice policy included, until a process naming `parts`
   runs. Test T1.
2. **U1, a valid save refused (no attacker).** As above. Tests I1 and I2 (the same string from both generators), and
   the stack scans (section 2).
3. **U3, one account stops another's settlement or enrolment for good.** Settlement frame IDs and the enrolment's ID
   are computable and stay database-wide: one save under the next frame's ID, or under
   `join-held-enrolment:<account>`, and that settlement or enrolment is refused every time after. Tests T9 and T10.

Also: **U4**, a forged record that writes into two accounts' documents is acknowledged as each one's Publish (T6,
store-level writer); **U5**, the old build's window can land a release over the cap, which then stops its notices and
every later Publish (T4), or a frame after an acknowledged pause (T5).

**On the builder's proposal of one account-claims mechanism: I agree, with one condition that matters** (section 3):
settlement frames and the enrolment must get their account's claims too; as designed in 0.9, a frame writes only
documents and would keep a database-wide claim, so U3 would stay open.

**One recommendation: before any process is given a permission, fix the two faults that need no attacker (U2: take the
first transition's ledger mode from the account's own ledgers; U1: one allocator for save tokens and the SDK's IDs),
then build the gateway's account claims for every command ID an account writes, frames and enrolment included.**

## 1. Findings

Numbered U1 onwards. Tests are in `act10/review3.test.ts` (T1 to T10) and `act10/identity.test.ts` (I1, I2); each
test's output line is in `agents/DX-ACT10/review3-tests.log`.

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| U1 | **High (a valid write refused, and a save's resend refused again; exactness held; the cause of the options-off stops and very likely of R6)** | Two ID generators share one ID space in a process. A save's ordered identity takes the first 24 characters of a monotonic ULID as its token and owns `<token>00` to `<token>FF` (`packages/datomic/src/orderedSaveIdentity.ts` 21-31, 56-71). The SDK's other IDs come from the same monotonic factory (`packages/core/src/utils/id.ts` 14, 52; `IdGeneratorLive`, `RuntimeServices.ts` 28-33: every row ID and transaction ID written through the TypeScript adapter: Publishes, settlement frames, definitions, settings). Within one millisecond that factory only increments the last characters, so the next IDs after a save's token share the token, and one in four lands inside the save's block. When it equals one of the save's assertion IDs, whichever of the two commits second is refused "TRIPLEX_IDENTITY f/id" (`commit.clj` 271-273). The gateway refuses, so no identity is ever stored twice; a valid save, or a Publish's or frame's try, is refused. A save's resend keeps its token by design ("retain the token ... so a resend can reconstruct the same identifiers", `orderedSaveIdentity.ts` 50-54), so a save that lost is refused again on every resend; a Publish or a frame plans again with new IDs. Not this head's change: it is in the SDK since `2aa4306d2` (2026-11-20), and the base shows it as often as the head (section 2) | I1: with each pair on a fresh millisecond, 4,981 of 5,000 next SDK IDs share the save's token, 1,256 fall inside its block, 67 equal an assertion ID of a 16-row save and 187 of a 40-row save. I2: the same string (`01M8900QYN8JRAWG0CDE164701`, the save's ordinal 1, after 11,505 pairs). On the stack, section 2: head: 8 runs, 1 stopped, 893 IDs inside save blocks (111.6 a run), about 1.07 collisions expected; base: 8 runs, 0 stopped, 866 IDs inside save blocks (108.2 a run), about 1.01 expected; the one stop, head 4, a save refused "TRIPLEX_IDENTITY f/id" (`9a5bd680`) | One allocator for both: after handing out a save token, move the shared monotonic factory past `<token>ZZ` (or take tokens from a factory the SDK's other IDs never continue) |
| U2 | **High (an account locked, no attacker needed)** | The first settings transition stores the ledger mode of whichever permitted process comes first, `whole` when that process names none (`account-settings.ts` `merge`, 48-62; page 0.8). An account whose notices were already recorded in parts (every gate ran that way) is then locked: a settler naming none stops on "A ledger in parts needs TX2_NOTICE_LEDGER=parts"; a settler naming parts refuses (`SettingsConflict`); and the cap, now computed with the whole-ledger capacity against the account's history, refuses every Publish, a release adding no notice policy included (the message says such a release "still publishes"). The rollout order of page 0.8 does not prevent it: the one process given permission is often a publisher, and a publisher never needed `TX2_NOTICE_LEDGER` before. It ends only when a permitted process naming `parts` runs | T1: 400-policy release recorded in parts; a publisher allowed only the cap stores `{ledgerCap, ledger: "whole"}`; settler naming none: the assertion; naming parts: `SettingsConflict`; a Publish of R2 (no notice policy) refused, "0 new in this one"; after a permitted process naming parts: the Publish lands and the notices record | Take the first transition's ledger mode from the account's own ledgers (a ledger in parts, or the cursor's mode), or refuse a first transition that names no mode for an account that has recorded notices |
| U3 | **Medium-high (another account stops an account's settlement, or its enrolment, for good)** | R3 also covers settlement frames and the enrolment. A frame's command ID is a hash of what the account's records and the code determine (`archive.ts` 323 and 423, `recorded.ts` 251 and 322), and frames never move to the gateway's or the join layer's scoped forms. Another account that computes the next frame's ID and saves its own subject under it first makes every later run of that frame refuse ("commit receipt differs from the request"): the account's values or notices are never recorded again. A Publish ID taken this way costs the client one ID; a frame ID costs the account its settlement. The held enrolment's command ID is `join-held-enrolment:<account>` (`account.ts` 329), known to anyone: one save under it before the account enrols and the account can never enrol | T9: values and notices: the claim lands, then three later settlement runs each refused with the same command ID. T10: a save under `join-held-enrolment:acct-a`, then three enrolments of acct-a, each refused | Put every command ID an account's processes write under the account claims (section 3), settlement frames and the enrolment included; or give frames and the enrolment random command IDs with recovery by reading what they write (as the definitions and settings writes now do) |
| U4 | Medium (a forged record taken by two accounts) | R1's ownership rule accepts a record if *some* of its changes are in this account's documents (`account.ts` `original`, `own`). A record that writes into two accounts' documents is therefore each account's own: under the legacy key, with the legacy intent (the same for every account with the same ID and arguments), both accounts' Publishes are acknowledged with it and neither publishes. It needs a writer that chooses the command ID, the actor and the correlation (store-level access, as R3's S3) | T6: one forged record under `joined:r9` with one fact in each account's notice documents: A and B both acknowledged with it (`_tx/mem13`), each with 1 release (their R1) | Count a record as this account's only if every change it makes outside the transaction's own journal is in this account's names (its documents and metadata) |
| U5 | Medium (the admitted window, its worst outcomes) | An old build's plan made before a transition commits after it, as page 0.8 states; the worst outcomes are worse than "one release not checked by the cap". A release over the cap lands after the `ledgerCap` transition: its notices are never recorded (F3), and because the cap now counts it, every later Publish is refused, a release adding no notice policy included. An old build's frame lands after an acknowledged pause | T4: an old build's 1,700-policy release lands at 71 after the transition to `{ledgerCap, parts}`; the settler: `FrameTooLarge`, 11 parts needed (1,701 items); the next Publish of R2 refused. T5: pause at 9, one value frame of the old build after it | Keep the rollout order as a hard rule (page 0.8), and say these outcomes in the page; a release that lands over the cap should not lock the account's later Publishes (U2's fix to the message and the cap's count) |
| U6 | Low (settings are one-way only for this build's own code) | A writer of the origin fact can turn settings off (a direct rewrite, or a restore to before the transition): every process then follows, including the process that turned them on, which keeps its per-process `settled` cache and never turns them on again until it restarts. A second live origin row refuses every guarded Publish of the account | T3: settings gone; the permitted process publishes `r3` under `joined:r3` and leaves them off; a new process turns them on again; with a second origin row the Publish is refused ("guard differs with the head unchanged"); a resend of the scoped `r2` still finds its record | Read the settings at every plan instead of trusting the cache for the transition (the cache only saves one read), and say in 0.8 that "one-way" holds against this build only |
| U7 | Low (only test databases) | The `joined:<account>/<id>` form written by `bf377c57f` with its per-process switch is not looked up, so a resend of such a command through this build publishes again | T7: records `joined:acct-a/r2` and `joined:v2/6/acct-a/r2`, 3 releases | None if no such database outlives the lab (page 0.8 says so) |
| U8 | Medium (R3 as left, per route) | Learn: another account reads a Publish's record by its computed ID, including the full release document when published with full documents. Deny: a save under an account's next Publish ID refuses that Publish every time; the cost is that ID for good. Definitions and settings IDs: random under the setting, nothing to take. Frames: U3 | T8: 4 changes, 18,279 bytes, the forms readable; the victim's five offers of `r2` all refused | Section 3 |
| U9 | Medium (R10, stated but below real accounts) | The lifetime limit and its refusal are as the page says (C5), with one exception: when the stored capacity is below what the account already holds (U2, U5), a release adding no notice policy is refused too, against the message. The limit is a worst case, one subject owing every notice policy the account ever had, so it binds long before any real subject's ledger does; and the owner's private production research (numbers not reproduced in this public repository) puts the largest real accounts' forms in force above it already | T1, T4; C5 (builder) | Remove retired ledger items (follow-up 11) before accounts that large are held; until then the cap refuses them at their first release |
| U10 | Information (the fuzzer) | The fuzzer excuses an old build's late frame by the process that first tried the frame's command ID (`db.sent` keeps the first attempt only). Frame IDs are deterministic, so two settling processes plan the same frame under one ID; when this build's process tries first (refused by its guards) and an old build's lands later, the excuse misses and the admitted window is reported as a break | Seed 418,193 (section 4): first attempt by `settler-1-5` (this build, read 35, refused), the landed one by `settler-0-6` (old build, read 23, landed at 48) | Key the excuse on the attempt that landed (the memstore now records every attempt under `ACT10_DUMP=1`) |


## 2. The options-off stops (the coordinator's item 5)

**Answer: the stops are a fault of the SDK's ID space, present at the base as at the head, not a regression of this
head and not the gate's harness. The duplicate assertion ID is never stored: the gateway refuses the second writer.**

**The mechanism (U1, `identity.test.ts`).** In the held runner one Node process sends the save tape (each save with an
ordered identity: token `T` = the first 24 characters of a monotonic ULID, assertion IDs `T00`, `T01`, ...) and writes
every Publish, settlement frame and definitions write through the TypeScript adapter, whose row and transaction IDs come
from the same monotonic ULID factory. In the millisecond after a save takes its token, that factory's next IDs are `T`
followed by two more characters; a quarter of them read as two hex digits, and when they equal an ordinal the save uses,
the two writes carry one assertion ID. The transactor refuses whichever commits second, "TRIPLEX_IDENTITY f/id": a save
of the tape (the gate stops: `G4off3`, and head 4 below; `G4off2`'s transactor console holds the same refusal although
its stop, made before the stop named a save's error, recorded none; `G4off`'s captured console, its last 219 lines,
holds no refusal, so its stop is not confirmed as this one), or a Publish's try (refused once, planned again with new
IDs, landed: very likely R6's "Datomic transaction was rejected", which would read `IdentityConflict, 400` now; Publish
IDs land inside save blocks in every run below), or a frame (planned again, no trace).

**On the stack, 8 runs at the head and 8 at the base**, options and permissions off, the builder's cost and beside parts
(32 Publishes each), each run's every assertion ID scanned after the gate (`act10/idscan.ts`). An *intrusion* is an ID
written by something other than a save that falls inside a save's block (`T` + two characters); it is a collision when
those two characters are one of the save's own ordinals (then one of the two writes is refused and only the other is
in the feed). *Expected collisions* sums, over a run's intrusions, the chance that its two characters (1,024 values)
are one of the save's n ordinals, n / 1,024; the refused writer of a real collision is not in the feed, so a stop or a
refused try is the only direct trace of one.

| Run | Attempt | Gate | Commits scanned | Ordered saves | Other IDs | IDs inside a save block | Duplicates stored | Expected collisions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| head 1 | `16920ccd` | pass | 20,805 | 20,508 | 1,164 | 111 | 0 | 0.13 |
| head 2 | `d8c12efe` | pass | 20,805 | 20,508 | 1,165 | 117 | 0 | 0.13 |
| head 3 | `9998480c` | pass | 20,805 | 20,508 | 1,165 | 94 | 0 | 0.11 |
| head 4 | `9a5bd680` | stopped: one save refused, "TRIPLEX_IDENTITY f/id" | 13,513 | 13,352 | 713 | 69 | 0 | 0.08 |
| head 5 | `669246c3` | pass | 20,805 | 20,508 | 1,165 | 120 | 0 | 0.15 |
| head 6 | `36dc0351` | pass | 20,805 | 20,508 | 1,164 | 101 | 0 | 0.12 |
| head 7 | `eca8f30b` | pass | 20,805 | 20,508 | 1,165 | 143 | 0 | 0.17 |
| head 8 | `9cf6207e` | pass | 20,805 | 20,508 | 1,165 | 138 | 0 | 0.17 |
| base 1 | `4f02499c` | pass | 20,805 | 20,508 | 1,165 | 132 | 0 | 0.15 |
| base 2 | `d3982d17` | pass | 20,805 | 20,508 | 1,165 | 94 | 0 | 0.11 |
| base 3 | `ab5d0bef` | pass | 20,805 | 20,508 | 1,164 | 98 | 0 | 0.12 |
| base 4 | `ad99e292` | pass | 20,805 | 20,508 | 1,165 | 129 | 0 | 0.15 |
| base 5 | `a15fa81f` | pass | 20,805 | 20,508 | 1,164 | 129 | 0 | 0.16 |
| base 6 | `5096dffb` | pass | 20,805 | 20,508 | 1,164 | 70 | 0 | 0.09 |
| base 7 | `9b9ae9c9` | pass | 20,805 | 20,508 | 1,164 | 124 | 0 | 0.14 |
| base 8 | `c45f8ee1` | pass | 20,805 | 20,508 | 1,164 | 90 | 0 | 0.11 |

**Totals.** Head: 8 runs, 1 stopped, 893 IDs inside save blocks (111.6 a run), about 1.07 collisions expected. Base: 8
runs, 0 stopped, 866 IDs inside save blocks (108.2 a run), about 1.01 expected. No assertion ID was stored twice in any
run.

**Why the base looked clean, and what this does not settle.** Two earlier full-gate runs at the first review's code
(`Goff`, `Goffctl`) and one at this head (`G4off4`) had no stop; three at this head did, two of them confirmed as this
refusal (`G4off2`, `G4off3`). The full gate runs more parts beside the tape (adversarial, kill, live, enrol: 49
Publishes against 32 here), so its rate a run is higher than the 0.13 collisions a run measured here, and a collision
stops the gate only when the save is the one that commits second. Three stops in four runs at the head against none in
two at the earlier code is not evidence of a regression: all three stops falling among the head's four of the six runs
by chance has p = 0.2. The 16 runs above, the same parts at both, show the same intrusion rate. Nothing in this head
changes the save path or the ID generators; the one adapter change is the refusal's message.


## 3. One account-claims mechanism for both lines

**I agree with one mechanism, the gateway's, on four conditions.** The gateway is the one place that sees every writer's
claim and can tie a claim to the account whose entities the write writes; the join layer's `joined:v2` form ties nothing
(T8: another account still takes or reads a computed ID). What it would close and open:

| Finding | With the gateway's account claims as page 0.9 designs them | Condition |
| --- | --- | --- |
| U8 (learn, deny a Publish ID) | Closed: a lookup scoped by account finds only that account's claims; another account's save under the same client ID is stored under its own account | The Publish must carry its account: `account-of-id` reading `lazy/account/(releases\|origin\|clock\|mask\|cursor)/<account>` (0.9) |
| U3 (deny a settlement frame) | **Not closed as designed.** A frame writes only settlement documents (`notice:v1:<hash>` entities); 0.9 counts those as journal entities, so a frame has no account and keeps a plain, database-wide claim, which another account can still take first | Map each document namespace to its account (the document names carry it: `settlement-values-<account>`, `settlement-notices-<account>`, `joined-<account>`), so a frame's claim is its account's; or give frames random IDs with recovery from the progress row |
| U4 (a record in two accounts' documents) | Closed at the gateway: a write whose entities belong to two accounts has no one account and is refused when it names one; the join layer's `own` check should still be tightened (every change in this account's names) as a second check | Keep `original`'s ownership check and make it "every change", not "some change" |
| R1, R2 (as fixed here) | Unchanged if the gateway's form replaces `joined:v2` through the same kind of one-way setting and the join layer keeps looking up the plain form for records from before | The form switch needs the same rollout order as 0.8 (U5's window comes back otherwise), and records under `joined:v2` must be read until no test database holds them (U7's lesson) |
| U1, U2, U9 | Unrelated | — |


## 4. What was attacked and did not break, with counts

Which of the coordinator's attacks ran: (a), (b), (c), (d), (e), (g) and (h) ran; (f) ran in part (group commit with
the adversarial and kill parts; no removal, no gateway kill inside a group); the base-versus-head question of item 5
ran 8 against 8 (section 2).

1. **The builder's own suites at the head:** 50 of 50 (`settings.test.ts` 5, `review2.test.ts` 18, `cross-account`
   11, `targeted` 16). This review's: 12 of 12 (T1 to T10, I1, I2).
2. **(a) A transition racing a Publish or a frame.** The fuzzer now lands a settings transition inside a Publish's or a
   frame's window between its read and its commit (`ACT10_TRANSITIONS=1`), and inside an unguarded frame's window,
   most of the time, a later release as well: the schedule the builder's fuzzer lacked. It catches the origin guard
   dropped (`DX_ACT8_INJECT=no-origin-guard`: 7 of 1,000 schedules, "release 2 stored by a frame that landed after a
   later release"). With the guard: 25,000 schedules (`ACT10_MIXED=1 ACT10_SHARED=1`, seeds 400,000 to
   419,999 with both accounts namespaced, 420,000 to 424,999 with account B in the single-account layout; every
   publisher and settling process drawn as this build with some permissions, with none, or an old build): **1
   violating**, and it is the admitted old-build window, not a new break (below). 99,799 acknowledged Publishes, 68,891
   settings transitions (15,838 landed inside a Publish's window, 243 inside a values frame's, 890 inside a notice
   frame's, 764 later releases landed inside a frame's window), 6,446 kills, 2,454,255 notices and 347,260 ledger reads
   checked; **0 commands landed twice and 0 Publishes acknowledged with another record**; counted, not violations:
   138,904 refusals by old builds meeting a setting, 33,711 by a process naming a ledger mode the stored one forbids, 69
   Publishes refused across a transition of their own account, 88 old-build frames that landed after a transition (the
   window). The violation (seed 418,193): an old build's values frame read at position 23, before transitions at 28, 33
   and 34, waited in its bulk queue and landed at 48, after a later release at 38. The checker excuses an old build's
   frame by the process that first tried its command ID, and here a process of this build had tried the same frame ID
   first (and was refused by its tail guard), so the excuse missed (`ACT10_DUMP=1` shows both attempts). It shows how
   long the window can be: 25 positions, three transitions and a release.
3. **(a) Two processes turning on different settings at once:** the second write is refused on the origin guard, reads
   again and merges; both settings end on, the ledger mode the one naming `parts` (T2: 2 transitions).
4. **(a) Is the origin guard on every write that depends on a setting?** Read in the code, write by write: a guarded
   Publish (origin `EntityState`, `account.ts` 1068-1071), a whole-head Publish (the head fence), a progress frame
   (origin guard, `archive.ts` 241), a head frame (the head fence), the cap (checked again in the guarded plan), a new
   event's ledger mode (decided in a notice turn whose frames carry the origin guard), the transition itself (guarded
   on the row it read). One exception, harmless: whether the definitions write's command ID is random or the content
   hash is read at the Publish's start (`account.ts` 877-881) and not guarded, so a definitions write planned just
   before the `accountKeys` transition keeps a claimable ID (U8's deny, one write).
5. **(a) A settings version or field from the future:** refused, "not ones this build knows" (S5, rerun).
6. **(c) R1's rule for the account's own records:** every Publish record writes its notice tail and event
   (`np.operations`, `account.ts` 1047), so no record of the account's own fails `own`; settings and definitions writes
   are never under a `joined:` key. Keys: B1 at the `joined:v2/<n>/<account>/<id>` form, 0 collisions, and account 0's
   deadline key no other account's (builder's rerun of the review's test).
7. **(g) A killed transactor and a killed write gateway with a commit in flight:** Run `kill-w` (`ad721f66`, permissions
   on, the restart part with `DX_ACT10_KILL=1`: `docker kill` then `docker start` of this run's own containers, gateways
   on fixed host ports), every case passed. The transactor killed after a Publish's reads, inside its transaction, and
   before the second settlement frame: 7 and 10 offers refused ("Datomic transaction was rejected (TransactionRejected,
   400)") while the peers came back, then the Publish landed at 13 and 24 (read 12 and 23), one record each; the frame
   case's settlement retried 9 times on transport errors and resumed from its durable progress. The write gateway killed
   (back in 5.3 to 6.4 s): after the reads, the Publish landed at 39 with no failed offer; inside the transaction (the
   commit in flight met a killed gateway) 3 offers failed ("socket hang up", "Datomic read failed"), then it landed at
   44 (read 43) with one record for its command; the frame case finished. Each settlement 474 changes (160 notices where
   recorded) equal to the oracle and the independent rule; 23 positions and 184 reads pinned between each read and
   record exact; 488 notices in order; the ID scan found no duplicate assertion ID.
8. **(f) Group commit with the adversarial and kill parts:** Run `grp-adv-kill` (`0be021b3`, permissions
   on, the write gateway with group commit and saves on the general path, the adversarial part with a 60 s window and
   the kill part), passed: 26 adversarial steps each exact, the rival-Publish step refused once by design (2 refused
   tries: "Expected live triple", `CasConflict`), 5 kills of the publishing process each with one record; 33 Publishes
   with 307 positions between read and record and 2,456 pinned reads exact; 2,586 notices in order. 4 of the 30
   Publishes the recorder saw shared their Datomic transaction with saves (three adversarial steps, among them a rival
   write landing inside the Publish's transaction, and one kill step), fewer than the builder's 33 of 50 in `G4grpc`
   (a shorter adversarial window here). No removal can land in a group on the held toy (section 5).


## 5. What was not tested

- **A removal landing in a grouped transaction, and a transition racing a removal.** There is no removal on request on
  the held toy, and the removal branch is not merged here.
- **The full gate's stop rate at the base.** The 8 + 8 runs used the builder's cost and beside parts; the full gate
  (with the adversarial, kill, live and enrol parts) was not run at the base.
- **A database restored from a backup.** Not run; T3 writes the restored state by hand (the origin without its
  settings).
- **Two databases.** Not run; the settings are one origin fact per account per database and the per-process cache is
  keyed by scope, account and seal (`account-settings.ts` 66).
- **The rollout order on one stack.** The held runner is one process with one environment, so "this build everywhere
  with no permission, then the permission to one process" cannot be staged inside one toy run without new harness code;
  the fuzzer's mixed fleet stages it process by process in process (section 4).
- **The fuzzer's most suspicious schedules on a stack.** An in-process schedule (seeded yields, kills between store
  calls) has no stack equivalent; not attempted.
- **An old build that is really `bf377c57f`.** The in-process old build is this build minus the origin guard and the
  settings; the real `bf377c57f` also had R1's single-layout hole and the `joined:<account>/<id>` form (T7 writes that
  form by hand).
- **A group with an unknown outcome caused by a killed gateway.** The restart part stops the save tapes, so no group of
  saves is in flight at the kill; `grp-adv-kill` kills the publishing process inside groups instead.


## 6. How to run the tests

```sh
node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/review3.test.ts   # T1 to T10
node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/identity.test.ts  # I1, I2
# The fuzzer's new switch (off by default): ACT10_TRANSITIONS=1, a settings transition inside a Publish's or a frame's
# read-to-commit window (and inside an unguarded frame's window, half the time, a later release too).
ACT10_TRANSITIONS=1 ACT10_MIXED=1 ACT10_SHARED=1 node --experimental-strip-types lab/experiments/EXP-DX1/act10/fuzz.ts \
  --from 400000 --count 300 --out /tmp/f.json
DX_ACT8_INJECT=no-origin-guard ACT10_TRANSITIONS=1 ACT10_MIXED=1 ACT10_SHARED=1 \
  node --experimental-strip-types lab/experiments/EXP-DX1/act10/fuzz.ts --from 430000 --count 1000 --out /tmp/neg.json
```

Stack switches (holder DX-ACT10, diagnostic toy only, off by default): `DX_ACT10_IDSCAN=1` scans every assertion ID of
the run after the gate, whether it passed or stopped (`act10/idscan.ts`, `act10-idscan.json`); `DX_ACT10_KILL=1` makes
the gate's restart part kill and start a container instead of restarting it; `DX_ACT8_FIXED_PORTS=1` now also for this
holder. The launch lines are in `agents/DX-ACT10/chain-8.sh` and `toy4.sh`.

## 7. Evidence

Private, outside the repository (the owner's project folder `agents/DX-ACT10/` and `evidence/DX-ACT10/`):

- `review3-tests.log`: every output line of T1 to T10, I1 and I2 quoted above.
- `predictions-2.md` (its third-review part): what each stack run was expected to show, written before it ran.
- `chain-8.sh`, `toy4.sh`, `idscan-sum.py` and the `run-off-*.log`, `run-kill-w.log`, `run-grp-adv-kill.log` files; each
  run's `evidence/DX-ACT10/load1/load-fair-<attempt>/` holds its `act10-idscan.json`, `act10-causes.jsonl` and the
  gate's own files. `chain-7-stopped.log`: the first ordering of the same runs, stopped while its first run waited for a
  slot.
- `dist-datomic-head` and `dist-datomic-base`: the adapter builds swapped into the run checkout for head and base runs
  (they differ only in the refusal message, `DatomicStorageAdapter.ts`).
- `fuzz3/`: the campaign script, each run's `.json` and `.log`, `classify.py` and `sum.py`.
- `image-receipt-4.json`: the head's build of the private image (`687631432169`).
- The builder's archives `G4off-89b95f71`, `G4off2-0040dfe8` and `G4off3-2b6af953` (`evidence/DX-ACT8/archives/`): each
  run's `active-datomic.txt` (the transactor's console, its last 219 lines) searched for the refusal: one
  "TRIPLEX_IDENTITY f/id" in `G4off2` and one in `G4off3`, none in `G4off`.


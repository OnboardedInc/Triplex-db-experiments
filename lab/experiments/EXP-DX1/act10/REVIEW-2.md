# Second adversarial review: the fixes after the first review (DX-ACT10, 2026-11-24)

Reviewer DX-ACT10, branch `exp/DX-ACT10-publish-review`, now at the fixed head `bf377c57f` of
`exp/DX-ACT8-publish-beside-saves` plus this review's tests. The code under review was not changed. The diff
`2e7ae66c4..bf377c57f -- lab/experiments/EXP-DX1/actv-lazy/ packages/` was read before the builder's page (section 0 of
`actv-lazy/PUBLISH-BESIDE-SAVES.md`). Mac only, toy sizes, the lab VM shared with other builders; every time below is
diagnostic. The stack runs used this reviewer's private image `687631432169`, built from this branch at `816183115`
(receipt `agents/DX-ACT10/image-receipt-3.json`); later commits change only lab TypeScript files, which are not image
inputs.

## Page 1, for the owner

**Is there a break now? Yes, two, and both are in how the fixes are switched on, not in the narrowed guards.** How
sure: certain. Each reproduces every time in process with the real code, and the fuzzer finds each in many schedules
(counts below). With every option on in every process and no records from before the options, I found no break in
25,000 fuzzed schedules with every client-chosen and content-chosen key shared between the accounts (0 violating), and
the all-on pattern of the mixed-option runs had no violation either.

**Are F1 and F2 closed?**

- **F1 is closed for namespaced accounts, by three lines:** `account.ts` 93 (the key becomes `joined:<account>/<id>`),
  575 (the intent names the account), and 494-496 (an old un-prefixed record counts only if it wrote this account's
  notice documents). Tests A1 and D3m, and the shared-key fuzz, show it.
- **F1 is not closed in two places.**
  - **R1, the database's first account.** The single-account layout keeps the un-prefixed key, and line 491 returns any
    record found under it with no ownership check. So another account's record from before the option, with the same
    ID and document, is still this account's acknowledgement, and nothing is written for it. My first review proposed
    leaving that layout's key unchanged; this is the hole that proposal left. Test A2.
  - **R2, a mixed fleet.** A command sent by a process with the option and resent through one without it is published
    twice: two releases, two notice events. Any rolling deploy, rollback or stale publisher does this. Test D1m.
- **F2 is closed, by `definitions.ts` 239** (the account's definitions prefix is hashed into the command ID), whenever
  the writing process has the option. What remains open is the wider class in R3: the ID is computable, so another
  account can take it first and refuse the Publish.

**The most serious remaining findings**

1. **R1 (high): F1 for the single-account layout.** Test A2: account 0 gets account B's receipt (`_tx/mem11`); it has 0
   releases and tail 0. Fuzz, single layout with mixed phases: 118 of 2,500 schedules.
2. **R2 (high): one command lands twice across the option.** Test D1m: records at 6 and 7, under both ID forms, 2
   releases. Fuzz with mixed phases: 643 of 2,500 schedules.
3. **R3 (medium): the account in a key is a name, not an authority.** Another account can read a Publish's record by its
   command ID (S1), make a Publish or a by-reference Publish fail forever by saving first under its ID (S2), and, with
   store-level write access, write a record that the Publish takes as its own (S3: acknowledged, nothing published).
4. **R4 and R5 (medium): the same per-process problem in F3 and F4.** A publisher writing ledgers in parts lets through
   a release that a whole-ledger settler can never record (C2). A settler without the frame guards writes 6 frames after
   an acknowledged pause (G2).
5. **R10 (medium): F3's cap is a lifetime limit per account.** It counts every distinct notice policy the account has
   ever published, and nothing removes retired ones, so after about 1,580 (ledgers in parts) every release that adds a
   new notice policy is refused for good. Test C5: 10 releases of 150 new policies publish, the 11th is refused.
6. **R6 (open): the one-try refusal was not reproduced, and its cause is not found.** 0 refused tries in 44 Publishes
   under the account guard beside saves in three runs that recorded every cause, and 0 in 22 more with group commit.
   The message hides the gateway code; it is a refusal, not a wrong write.
7. **R7 (low): group commit.** In the toy's own configuration saves never enter the group lane, so a Publish cannot
   group with them (H1). With saves on the general path, 11 of 11 Publishes shared a transaction with saves and every
   check held (H2).

**One recommendation: do not ship these options as per-process switches.** Make `TX2_ACCOUNT_KEYS`,
`TX2_SETTLE_FRAME_GUARDS` and the ledger mode one-way settings stored in the database, read by every publisher and
settler, and refuse to start a process whose setting differs; and apply the ownership check of line 495 to every record
`original` recovers, not only to un-prefixed ones. The first closes R2, R4 and R5 together. The second closes R1 and the
forge in R3 (tests A2 and S3 report that this check refuses both foreign records). The rest of R3 (learn and deny)
needs the account in the gateway's claim key, which is the page's follow-up 4.

## 1. Findings

Numbered R1 onwards (the first review's F1 to F7 keep their numbers). "Test" names are in `act10/review2.test.ts`;
fuzz counts are from `act10/fuzz.ts` with the switches in section 4.

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| R1 | **High (break: F1 is still open for the single-account layout)** | Account 0 of a held database keeps the un-prefixed key with the option on (`account.ts` 93: only a namespaced account gets `joined:<account>/<id>`). For that key `original` returns whatever record it finds, with no ownership check (`account.ts` 491: `if (found \|\| key === "joined:" + id \|\| ...) return found`), and its intent does not name the account (575: `h([this.s.scope, id, args])`). A namespaced account's record written before the option, or by a process without it, with the same ID and document, is therefore account 0's acknowledgement: account 0 gets that account's receipt and nothing is written for it. My first review proposed leaving the single-account layout's key unchanged; that proposal left this hole | A2: `singleLayoutWithOption` = B's `_tx/mem11`, account 0 releases 0, tail 0. Fuzz, single layout with mixed phases: 118 of 2,500 schedules had account 0 acknowledged with the other account's record while the option was on (63 off-then-on, 48 off-on-off, 7 on-off-on), each after a phase without the option wrote that record. With the option on in every process and no old records it does not happen (A2b; 5,000 schedules, single layout, shared keys, 0 violating) | Check ownership on every record `original` recovers, not only legacy ones: a found record is this command only if it wrote this account's own release or tail entity. Or give account 0 a scoped key too, with the legacy fallback for its own old records |
| R2 | **High (break: one command lands twice in a mixed fleet)** | With the option on, a Publish is recorded as `joined:<account>/<id>`. A resend of the same command through a process without the option looks up only `joined:<id>`, finds nothing, and publishes again: two releases, two notice events, the record under both forms. This is a rolling deploy, a rollback, or one stale publisher. The page covers only the other direction (old records read by new processes, 0.1) and does not say that the option is one-way and fleet-wide | D1m: first at 6, resend at 7, 2 releases, tail 2, records `joined:acct-a/r1` and `joined:r1`. Fuzz, mixed phases: one command landed twice in 643 of 2,500 schedules (both accounts namespaced) and 346 of 2,500 (single layout), only in patterns where the option goes from on to off (on-off 293 and 157, on-off-on 295 and 165, off-on-off 55 and 24). Off then on is recovered (D2m) | Make the option a database setting, one-way, read by every publisher, and refuse to start a publisher whose setting differs; until then, state it as a deploy rule (all publishers switch together, never back) |
| R3 | Medium (deny with a guessed ID; forge with SDK write access) | The account in a key is a name, not an authority. Command claims are unique in the whole database (`:triplex.claim/command-id`) and any writer chooses its command ID, so nothing ties `joined:<A>/...` or A's `definitions:<hash>` to account A. **Learn:** any account's store reads any other's record by command ID (`store.ts` 168-173 `lookup`); over HTTP a reused ID answers 409 `command_already_committed` naming the original transaction (`EntityHttpHandlers.ts` 121, `TriplesLive.ts` 283-287). **Deny:** a save of B on its own subject, whose client-chosen command ID is A's next Publish ID, makes A's Publish of that ID fail every time (the actor assertion, `account.ts` 507); a save under A's definitions ID (`definitions.ts` 239: the hash of A's public prefix and node keys, computable from A's document) makes A's by-reference Publish fail. **Forge:** a record B writes under `joined:<A>/<id>` with actor `lazy/join` and A's correlation context (computed from public inputs) is taken by A's Publish as its own. Over the HTTP entity API the actor comes from authorization (`EntityHttpHandlers.ts` 412) and the correlation is not client-set, so forging needs SDK-level write access; learning and denying need only a command ID | S1: B reads A's record (4 changes, A's release entity and notice document). S2: A's Publish refused twice ("Expected values to be strictly equal", the actor), A's by-reference Publish refused ("commit receipt differs from the request"), another ID publishes. S3: A's resend acknowledged with B's record at 12; A's releases 1, tail 1 (the release it asked for was never written) | The gateway's claim key should include the writer's account, taken from its authority rather than from the ID string (the page's follow-up 4). In the join layer, the ownership check of R1 also refuses S3's forged record (it wrote B's subject, not A's release or tail) |
| R4 | Medium (F3 again when the publisher and a settler use different ledger modes) | The cap's limit comes from the publishing process's `TX2_NOTICE_LEDGER` (`account.ts` 654, `ledger-parts.ts` 21, 159). A publisher writing ledgers in parts accepts a release that a settler writing whole ledgers can never record: its notices, and every later release's in that account, stay unrecorded (F3's effect). The page states the constraint (0.1, F3 row; follow-up 8) but nothing enforces it | C2: the parts-mode publisher acknowledges a 400-policy release; the whole-ledger settler fails `FrameTooLarge` ("its closing piece alone exceeds the writer's bound"); a whole-mode publisher refuses the same release ("one subject could owe 422 notice items") | Store the ledger mode per account in the database, one-way, and read it at Publish and at settlement |
| R5 | Medium (the pause bound N = 0 needs every settling process to have the guards) | `TX2_SETTLE_FRAME_GUARDS` is per process. A settler without it (an old process, or the option off) keeps the 250 ms cached control and an unguarded frame, so frames land after an acknowledged pause, as in F4 | G2: both settlers with the guards: pause at 8, 0 frames after it; the second settler without them: 6 frames after it | The same as R2 and R4: a database setting read by every settler, or the deploy rule stated in the page |
| R6 | Information (open: the cause is still unknown) | The builder's one-try refusal "Datomic transaction was rejected" did not reproduce. With every refused commit's cause chain recorded, 0 of 44 Publishes under the account guard beside saves had a refused try of any kind (G1: 12 small Publishes at 39.4 own saves per second, 21 to 121 commits between read and record; G2 and G3: the builder's own cost and beside parts in its order, 16 beside saves each, 0 to 112 commits between), nor did 22 more with group commit on (H1, H2). The builder saw it once in each of two full runs (`Goff` with the options off, `G1f2` with them on), so it is rare and was there before the fixes. The message itself cannot say more: the adapter turns every 4xx except `CasConflict`, `CommandConflict`, `OperationDuplicate` and `CommitOrder*` into this one `WriteError` and keeps the code only in its `cause` (`DatomicStorageAdapter.ts` 500-526), which the gate records as text without the code (`account.ts` 640-642). The candidates a guarded commit can meet are `IdentityConflict` (an assertion ID already in history, `commit.clj` 271-273), `TransactionRejected` (any other gateway or Datomic text, for example "Missing live row datom", `commit.clj` 296, or a unique conflict on an attribute other than command ID and position, `storage.clj` 594-605), `SnapshotExpired`, `OwnerLayoutRequired` and `ErasureFrontierChanged`; none is a guard's decision. It is a refusal: the builder's records show the Publish planned again and landed exactly, so nothing wrong was written | `run-g1`, `run-g2`, `run-g3` with `act10-causes.jsonl`: 0 refused tries under the account guard; the only refusals recorded are the whole-head case's, by design (G2: 4 "Original Datomic source position is no longer current", 2 `CasConflict`; G3: 6 of the first kind) | Keep the gateway code in the refusal's record (the gate's `causes` could print `cause.cause.code`), or run the gate with `DX_ACT10_CAUSES=1` (it works for holder DX-ACT8 too); the next occurrence then names its code |
| R7 | Low (the page's 0.4 premise is wrong for the configuration its gates run; the case it describes is exact) | In `load-fair` the toy starts the write gateway with `TX2_SUBJECT_SAVE=1` (`ha1/stack.ts` 620-622), and a subject save goes straight to `d/transact-async` (`storage.clj` 419-447), never through the group lane. So in that configuration a Publish cannot share a physical transaction with a save; with group commit on, no group formed at all (H1). With saves on the general commit path (`TX2_SUBJECT_SAVE=0` on the write gateway), groups form and every Publish landed in one with saves, and the gate's checks held (H2) | H1 (`TX2_GROUP_COMMIT=1`): 11 Publishes, every position within 6 of each had its own Datomic t, gate PASS. H2 (`TX2_GROUP_COMMIT=1`, `TX2_SUBJECT_SAVE=0`): 11 of 11 Publishes shared their Datomic t with 1 to 5 saves (for example small-23's third at 1,514 with the saves at 1,509 to 1,513); gate PASS: 152 positions between reads and records with 1,216 pinned reads, 71 racing saves before and 18 after with 89 reads, 377 notices in order | Correct 0.4: with subject saves a Publish groups only with other general commits; the grouped case was run with saves on the general path (H2) and held. The adversarial, kill, live and enrol parts were not run with groups |
| R8 | Low (latent deny) | One key crosses accounts: account 0's deadline command `joined:deadline/<64 hex>` is the key of a namespaced account named `deadline` publishing the ID `<64 hex>`, which the ID pattern allows (`account.ts` 571). That account can take account 0's deadline command for a due date; the intent differs, so account 0's deadline advance is refused, not acknowledged wrongly | B1: 74,088 (account, ID) pairs over the allowed alphabet, 0 collisions; this one crossing | Refuse the account name `deadline`, or IDs of 64 hex characters, or scope account 0's key (R1's fix) |
| R9 | Information | The frame guards refuse frames that could have committed: a pace change between a frame's read and its commit refuses the frames in flight, and so does a pause set and cleared there. Each refused frame plans again and the release is stored. Another account's Publish refuses none | G1: pace change 2 refused, pause and resume 2, other account's Publish 0, none 0; all four end `stored` with 6 frames | None needed; the cost is in section 2 |
| R10 | Medium (a product limit the page does not state) | F3's cap counts every distinct notice policy of every release the account ever published, since a ledger keeps retired items (`ledger-parts.ts` 190-195). So it is a lifetime limit per account: once the account has used about 1,580 distinct notice policies (ledgers in parts; a few hundred with whole ledgers), every release that adds a new notice policy is refused, for good, because nothing ever removes retired items. The refusal says "Publish a release with fewer notice policies", which does not help: any new policy is too many. Releases that reuse earlier policy IDs, or carry none, still publish | C5: 10 releases of 150 new policies publish, the 11th is refused (1,672 items); then 8 releases of 10 new policies, the 9th refused; the first release again publishes (its policies are already counted); a release with no notice policies publishes | Say in the page and the message that the limit is for the account's lifetime; the real fix is the deferred removal of retired ledger items (RELEASE-LIMITS), which F3's cap does not replace |

## 2. What was attacked and did not break, with counts

Which of the coordinator's attacks ran: (a) to (i) all ran, except the parts of (h) in section 3 (a gateway restart,
enrolment beside a removal) and the removal half of (c), which was read only.

1. **(a) Old records, namespaced accounts.** An un-prefixed record of B, then A with the option, same ID and document:
   A lands its own record, B's resend with the option recovers B's old one (A1). One account, off then on: the old
   record is recovered and another document under that ID is refused (D2m). Two accounts, one process with the option
   and one without, same IDs: four separate records (D3m). A crafted record by name collision is not possible: the
   legacy check is `startsWith(this.db.prefix)` with the prefix `notice:v1:` + a fixed-length hash of the database and
   the account + `:` (`notify1/store.ts` 76), so no account's documents start with another's; only writing into A's own
   documents would pass it, which is R3's write-authority question.
2. **(b) The separator.** Account names refuse `/` (`store.ts` 126) and Publish IDs refuse `/` except a deadline's
   (`account.ts` 571). Over every account name and ID of up to three characters from `ab0-._:/`, 74,088 pairs, no two
   give one key (B1); the one crossing is R8. The definitions prefix `lazy/account/releases/<account>/definitions/` is
   followed by exactly 64 hex characters (`definitions.ts` 36-41): the single-account layout's
   `lazy/account/releases/definitions/` and the account named `definitions`'s
   `lazy/account/releases/definitions/definitions/` never accept each other's rows, and the definitions command ID
   hashes the prefix as a JSON array element, so no concatenation is ambiguous.
3. **(c) The save path in the join layer.** The lazy store's commit checks a found record against its own operations
   and actor (`store.ts` 191-224), so a save never takes another account's receipt there; S2's refusals are that check.
   The held save sender recovers by operation ID and asserts the claim's transaction ID (`writes.ts` 583-594).
4. **(d) Mixed fleet, the safe directions.** Off then on recovers (D2m); two accounts in different modes stay separate
   (D3m). The unsafe direction is R2.
5. **(e) The cap's boundary and history, one mode.** With ledgers in parts the cap is 1,592 items: 1,592 and 1,591
   publish and record; 1,593 is refused before any write (C3). Without the cap 1,593 to 1,672 still record, so the cap
   refuses about 80 items (5%) early, never late. Retired items stay in ledgers and the cap counts them: a second
   900-policy release is refused with the cap and fails `FrameTooLarge` (1,801 items, 11 parts) without it; a release
   with no notice policies publishes in both (C4).
6. **(f) The frame guards.** A pause landing while a frame is in flight, both settlers with the guards: 0 frames after
   it (G2). Two turns at once on one values writer beside a later Publish, 400 seeds: 353 stored, 47 superseded, 0
   stored after the later release (G4). Cost: 14.5 store calls per frame without the guards, 15.3 with them (+0.8, the
   control read; G3). Under the head precondition the frame commits at its read position (`archive.ts` 244), so the
   pause refuses it there too.
7. **(i) The fuzzers with every client-chosen and content-chosen key shared.** `ACT10_SHARED=1`: both accounts use the
   same Publish IDs, the same documents (B's by reference too) and the same save command IDs; kills and lost replies at
   every store call as before. With all three options on (`TX2_ACCOUNT_KEYS`, `TX2_SETTLE_FRAME_GUARDS`,
   `TX2_LEDGER_CAP_AT_PUBLISH`): 20,000 schedules with both accounts namespaced (seeds 100,000 to 119,999) and 5,000
   with the second account in the single-account layout (120,000 to 124,999), **0 violating of 25,000**: 62,397
   acknowledged Publishes, 162,580 and 62,229 saves (accounts A and B), 23,096 saves inside a Publish's window, 8,256
   kills, 2,461,441 notices and 336,118 ledger reads checked, 18,018 releases superseded and 25,366 stored. Then the
   mixed-option dimension (`ACT10_MIXED=1`: the option on or off per phase, one of six patterns per schedule, resends
   across phases), 2,500 schedules each:

   | Violation kind (schedules) | Both namespaced, seeds 130,000+ | Single layout, seeds 140,000+ |
   | --- | --- | --- |
   | One command landed twice (R2), only where the option goes from on to off | 643 | 346 |
   | Acknowledged with another account's record, option off (F1 unfixed) | 455 | 468 |
   | Acknowledged with another account's record, option on (R1) | 0 | 118 |
   | Definitions command ID collision (F2 unfixed: both writers without the option, as the two ID forms never coincide) | 311 | 325 |
   | Violating schedules | 1,158 | 1,072 |
   | Violations in the all-on pattern | 0 | 0 |

   Every violation is R1, R2, or the F1 and F2 shapes of processes running without the option.
8. **(g) and (h) on the stack.** Five toy runs on the private image, each under one heavy token, every check of the
   builder's gate passing: G1 (12 small Publishes at 39.4/s), G2 and G3 (the builder's cost and beside parts, 32
   Publishes each), H1 and H2 (group commit, 11 Publishes each). Across them, 0 refused tries in 66 Publishes under
   the account guard beside saves, with 0 to 121 commits between a Publish's read and its record (12 to 116 in H1
   and H2), so a save did not cause a retry in any of these runs. Results in R6 and R7.

## 3. What was not tested

- **A write-gateway restart.** In `load-*` modes the toy stack publishes each gateway on a host port the VM assigns at
  container start (`ha1/stack.ts` 109-111), so a restarted gateway comes back where the run's clients cannot reach it
  (the builder's `Gres3` saw `ECONNREFUSED` for two minutes). It needs the HA drills' fixed ports; not run.
- **Enrolment beside a removal.** The held toy has no removal on request (no shared removal directory); the builder's
  merge with the ticket branch already shows the walk refusing beside a removal (0.3, follow-up 5). Not repeated.
- **Removal command IDs across accounts.** They live on the removal branches, not this one; read only, on
  `exp/DX-ACT9-account-tickets` (`removal_commit.clj` 232-240): the R3 shapes are there too, without the forge. Learn: a
  reused ID with other selectors answers 409 `EraseCommandConflict` "The command already used different selectors",
  which says the ID exists. Deny: any commit that claims the ID first (a save with that client-chosen command ID)
  refuses the removal, "The command identity is already claimed". A repeat with the same selectors returns the earlier
  removal, and selectors name entity IDs that carry the account, so no account gets another's removal as its own. Not
  run here.
- **Forging over HTTP.** S3 forges through the store layer (a writer that chooses the actor and the correlation). The
  HTTP entity API takes the actor from authorization and has no account notion at all, so there is no HTTP path to try.
- **`DatomicClient.transactCommand` across accounts on a stack.** Read, not run: on a claimed command ID it returns the
  stored receipt for any input (`DatomicClient.ts` 1546-1583; the repository's own `w1/group/workload.ts` 308 asserts
  that a different input gets the original receipt). Its callers are lab import and failover campaigns (`load1`,
  `chk1`, `hasync1`), not the join layer or the held save sender, whose recovery asserts the claim's transaction ID
  (`scale1/decision/writes.ts` 594) and so refuses rather than acknowledging another account's save.
- **1,000 forms with ledgers in parts on a stack**, and the gate's adversarial, kill, live and enrol parts with group
  commit on (only the beside part ran with groups, section 2).

## 4. How to run the tests

```sh
node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/review2.test.ts   # A1 to G4, 18 tests, about 2 min
# The fuzzer's switches (all off by default): ACT10_SHARED=1 (accounts share Publish IDs, documents and save command
# IDs), ACT10_MIXED=1 (TX2_ACCOUNT_KEYS on or off per phase, resends across phases), ACT10_SINGLE=1 (account B in the
# single-account layout).
ACT10_SHARED=1 ACT10_MIXED=1 TX2_SETTLE_FRAME_GUARDS=1 TX2_LEDGER_CAP_AT_PUBLISH=1 \
  node --experimental-strip-types lab/experiments/EXP-DX1/act10/fuzz.ts --from 130000 --count 300 --out /tmp/f.json
```

The stack switches (holder DX-ACT10, diagnostic toy only, off by default): `DX_ACT10_CAUSES=1` wraps the held account's
store commit (`act10/causes.ts`) and writes `act10-causes.jsonl`: each refused commit's whole cause chain (class, tag,
HTTP status, gateway code, route, message), its read position, the head at the refusal and the commits between, and for
each Publish that lands its Datomic t and its neighbours' t (one t is one physical transaction). `DX_ACT10_GROUP=1`
starts the write gateway with `TX2_GROUP_COMMIT=1`, and `DX_ACT10_GROUP_SAVES=general` with it also with
`TX2_SUBJECT_SAVE=0` (`ha1/stack.ts`). Both run with the builder's gate
(`DX_ACT8_GATE=1`, with `DX_ACT10_STACK=1` for this holder); the launch lines are in `agents/DX-ACT10/chain-2.sh`
to `chain-6.sh`.

## 5. Evidence

Private, outside the repository (the owner's project folder `agents/DX-ACT10/` and `evidence/DX-ACT10/`):

- `review2-tests.log`: the 18 tests' outputs (every number quoted from A1 to G4 above).
- `fuzz2/`: the campaign scripts `run.sh` and `run2.sh` (the second is the rest of the first, held back so the stack
  runs got the heavy token first), each run's `.json` and `.log`, `classify.py` (violation kinds by phase and
  option) and `sum.py` (totals); `try-mixed.json` and `try-single.json` are the 300-schedule trials.
- `predictions-2.md`: what each stack run was expected to show, written before it ran, and each result.
- `chain-2.sh` to `chain-6.sh`, `toy3.sh`, `run-g1.log`, `run-g2.log`, `run-g3.log`, `run-h1.log`, `run-h2.log`: the
  stack runs and their logs;
  `evidence/DX-ACT10/load1/load-fair-<attempt>/` holds each run's `act10-causes.jsonl`, `act8-beside.json` and the
  harness's own files. Runs: G1 `6cd5aa07`, G2 `fef5dd94`, G3
  `e751dfb8`, H1 `6ea9d5f6` (its first wait for a token was stopped and it ran after G2), H2 `cc382b1d`.
- `image-receipt-3.json`: the private image `687631432169` built from `816183115`; the earlier image `e20aef8dcdc4` was
  removed by its receipt before these runs.

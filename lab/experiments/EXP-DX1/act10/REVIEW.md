# Adversarial review: a Publish beside saves and settlement frames under the narrowed guards (DX-ACT10, 2026-11-24)

Reviewer DX-ACT10, branch `exp/DX-ACT10-publish-review` from `exp/DX-ACT8-publish-beside-saves` at `2e7ae66c4`. The code
under review was not changed. This branch adds an in-process harness that runs the real code, a schedule fuzzer, targeted
tests, and a stack part for the held runner. Mac only, toy sizes, the lab VM shared with other builders; every time below
is diagnostic. The code was read before the builders' pages; my suspicions were written down before the pages were opened
(private evidence `agents/DX-ACT10/suspicions-before-pages.md`).

## Page 1, for the owner

**Is there a break? Yes, but not in the two narrowed guards themselves.** How sure: certain for the three findings
below. Each reproduces every time in process with the real code (F1 and F2 under both Publish rules), and each reproduced
again on a real stack: the held toy with real write and read gateways, transactor and PostgreSQL, on this reviewer's
private image `e20aef8dcdc4` built from this checkout (run `s2`, evidence `act10-stack.json`).

**The two narrowed guards held.** The account guard on a Publish and the progress guard on settlement frames gave the
same stored changes, notices, ledgers and reads as the positions in the store say they must, in every schedule I ran:
20,000 mixed randomized schedules (44,106 acknowledged Publishes, 18,873 saves committed inside a Publish's window, 6,754 kills, 1,989,343 notices and 271,246 ledger reads checked) with saves landing between a Publish's read and its record, two racing Publishes,
two or three settling processes, kills and lost replies at every store call; and 2,880 reads pinned at q - 1, q and q + 1
before and after settlement. Two negative controls show the fuzzer sees such breaks: settlement at the read position (the
builder's own wrong rule) was caught in 20 of 300 schedules, and dropping the entity guards in 14 of 300.

**What breaks is the many-accounts path around them: command IDs are database-wide while everything else is named per
account.** One database now holds every account, and two kinds of command ID were never given the account:

**The three most serious findings**

1. **F1 (break: a lost Publish that was acknowledged).** Two accounts that publish with the same command ID and the same
   document: the second account's Publish returns the first account's receipt. Nothing is written for the second account;
   it has no release and no notice event, and its caller is told it published. With a different document the second
   account is refused instead ("Reused command ID has different input"). `JoinedAccount.execute` looks the command up as
   `joined:<id>` in the whole database before planning (`account.ts` 562), and the intent it compares hashes the
   database's scope, not the account (`account.ts` 555).
   Test `act10/cross-account.test.ts` X1 and X2:
   `[X1 beside=1] {"aPosition":11,"bPosition":11,"bReceiptIsAs":true,"aReleases":1,"bReleases":0,"aTail":1,"bTail":0}`
   (the same with the whole-head rule, `beside=0`);
   `[X2] {"refused":"Reused command ID has different input ...","bReleases":0}`.
   On the stack (run `s2`): `"first":{"ok":true,"position":28,"txId":"_tx/01M8807K87QQ..."},"second":{"ok":true,"position":28,"txId":"_tx/01M8807K87QQ..."},"secondReleases":0,"secondTail":0`; X2 `"Reused command ID has different input"`.
   The lab's own callers always put the account key in the ID, so no gate could see it. SCALE2 met the same kind of
   collision with save IDs, between two runs in one database, and fixed it in the harness ("every command ID now carries
   a run nonce", `SCALE2.md` 229), not in the store.
2. **F2 (Publishes refused forever): with definitions by reference (`TX2_RELEASE_DOCS=ref`), an account cannot publish a
   document, or anything at all after a shared predecessor, once another account has stored the same definitions.** The
   definitions write's command ID is the hash of the content (`definitions.ts` 237) while the rows it writes carry the
   account's names (`definitions.ts` 36). The second account's write finds the first account's commit under that ID, the
   store's receipt check refuses it, five tries, then the Publish fails. A by-reference Publish also stores its
   predecessor's full document by reference first (`account.ts` 1042), so every account whose current release is the same
   standard document (in the lab every account's first release is the standard R1) collides on that alone: X4, a different new document, refused 3 of 3
   times; with full documents it publishes. Tests X3 and X4:
   `[X3] {"bRefused":"commit receipt differs from the request (command definitions:4724bb34...)","bReleases":0}`;
   `[X4] {"tries":["commit receipt differs ... definitions:5d6f605c...", (3 of 3)],"aReleases":1,"bReleases":2}`.
   In the fuzzer with both accounts publishing by reference, 232 of 500 schedules broke this way (593 refused writes).
   On the stack: X4 `a2ByReference: refused (the store's receipt check), a2WithFullDocuments: ok at 36`; X3 `a3ByReference: refused, a3Releases 0`.
3. **F4 (a paused account still writes; caused by the narrowing).** Under `TX2_SETTLE_PRECONDITION=progress` a frame that
   passed the pause check before an operator's pause lands commits after the pause is durable: one frame per writer per
   settling process (test P1: `head: framesAfterPause 0`, `progress: framesAfterPause 2 [settled-values, settled-notice]`).
   Under the head rule the pause's own commit moved the head and refused it. Separately, under both rules, the worker
   keeps the control cached for 250 ms (`settlement-control.ts` 72), so frames planned after the pause still go: with
   40 ms frames, 2 after the pause under head, 5 under progress (test P1b). SETTLEMENT-LIVE 8 says "paused, it sends
   nothing for that account".
   On the stack: `P1-head: pause at 39, value frames after it 0`; `P1-progress: pause at 47, value frames after it 1 (at 48)`.

**One recommendation: merge with named fixes.** The narrowing is sound for exactness and can merge. Fix F1 and F2 before
any second account publishes in the one database (both are a few lines: put the account into the joined command ID and
into the definitions command ID, section 1). Make the pause a guard (F4) or correct the page. Correct the supersession
sentence (F5). F3 is a separate, pre-existing limit that needs a Publish-time refusal.

## 1. Findings

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| F1 | **High (break)** | A Publish whose command ID another account already used is acknowledged with that account's receipt (same document), or refused (another document). `execute` looks up `joined:<id>` database-wide before planning (`account.ts` 562 `original`, 480-513); the intent hashes `this.s.scope`, the database (555). Same with the whole-head rule: not a regression of the narrowing, but on this branch and never exercised (every lab caller puts the account in the ID). The deadline commands of non-held accounts use the same pattern (`deadline/<sha256(due)>`); held calendars are empty, so it is not reachable today | X1 (both rules), X2; stack run `s2` X1, X2 | For a namespaced account, `"joined:" + account + "/" + id` as the command ID and the account in the intent (unchanged for the single-account layout, so existing records keep their IDs); `original` also checks that the record writes this account's release or tail entity |
| F2 | **High (Publishes refused forever)** | By reference, the definitions write's command ID is `definitions:<sha256(node keys)>`, the same in every account, while its rows are under the account's release name. The second account's write of the same nodes is refused by the receipt check (`store.ts` 219-220, 192); `stageDocument` tries five times and the Publish fails (`definitions.ts` 229-247). Through the predecessor (`account.ts` 1042) this blocks every by-reference Publish of an account whose current release is a document another account already stored by reference | X3, X4; cross-docs fuzzer: 232 of 500 schedules, 593 refused writes; stack run `s2` X3, X4 | Put the account's definitions prefix into the command ID: `"definitions:" + sha256(canonical([prefixOf(s), todo]))` (one line). Or one shared, database-wide definitions namespace with one command ID per node |
| F3 | Medium (a settlement that never finishes) | A release whose notice ledger needs more than 10 parts (about 1,680 owed items per subject by the default estimate) is accepted and acknowledged; its first ledger write is then refused with `FrameTooLarge` (`ledger-parts.ts` 109), and since the cursor cannot pass it, every later release's notices in that account are never recorded either. RELEASE-LIMITS 2.4 documents the limit as "refused at its first write"; nothing refuses the Publish. Reads keep answering under the release. Not part of the narrowing | C1: `bigAt 69, laterAt 71, tries: 3 of 3 FrameTooLarge ... needs 11 parts ... (1751 items), cursorEvent 2` | Refuse at Publish a release whose forms and notice policies can give a subject more owed items than the cap (`ReleaseTooLarge`), or build the deferred retraction of old parts the page describes |
| F4 | Medium (behaviour change caused by the narrowing) | Under the progress guard a frame past the pause check commits after a durable pause (the head rule refused it). Plus, under both rules, 250 ms of cached control (`settlement-control.ts` 72-73) | P1: head 0, progress 2 frames after the pause; P1b (40 ms frames): head 2, progress 5; stack run `s2`: head 0, progress 1 value frame after the pause | Put the account's control row into each frame's guard (an `EntityState` on `settlement-control`, read by the gate): a pause that lands after the gate refuses the frame, as the head did; read the control fresh before each frame, or say "within 250 ms and one frame per writer" in SETTLEMENT-LIVE 8 |
| F5 | Low (a stored record differs by rule; no answer changes) | A values frame reads whether its release is superseded at its read (`archive.ts` 286) and that read is not guarded under progress. A frame planned before a later Publish lands after it; when it is the release's last frame the release ends `stored`, not `superseded`. SETTLEMENT-LIVE 2's row "the next frame marks it superseded" is false in that case: there is no next frame. Reads never use these pages (byte frames) or use them only at the release's own position (count frames), so no answer changes | Fuzzer, 20,000 schedules under mixed rules: 2,087 releases `stored` although a later release landed before their last frame, 2,103 value pages written after a later release; head-rule control, 1,000 schedules: 0 and 0 (783 supersessions, each with only the frame that marks it); stack run `s2` S2: head `superseded`; progress `stored` with its progress row at 53, after the later release at 52 | Add the account's notice tail row to the values frame's guard (held accounts change it only at a Publish, so frames refuse exactly when a release lands), or correct the page |
| F6 | Low (the page) | With `TX2_ENROL_BESIDE_SAVES`, a rival enrolment of the same account whose record lands inside the other's walk refuses it ("Unclassified native writer left the joined source open", `account.ts` 283) instead of recovering the command; a retry recovers. PUBLISH-BESIDE-SAVES 6.1 says the rival's command is "recovered, not doubled" | E1: 300 races, 111 with one enrolment refused, 93 with both succeeding, 96 with no rival; always exactly one enrolment record, and the account then publishes and settles exactly | Accept, in the walk, a commit whose command ID is this account's own enrolment command; or correct the page |
| F7 | Information (the harness) | The builder's adversarial writes are all facts of the subject itself (person, task, file, placement); in the adversarial window the publishing account's own save tape is off; once perturbed, the independent form rule checks only the added policies. None hides a break (my fuzzer adds child entities, references added and removed, back-dated and future-dated changes, and found none), but the gates did not cover them | code | — |

## 2. What was attacked and did not break

Counts are exact. "Schedules" are the fuzzer's interleavings (`act10/fuzz.ts`); each is fixed by its seed.

1. **Everything a Publish reads, against every other writer (attack line 1).** I listed the Publish's reads from the code
   before reading the page (`account.ts` `state`, `execute`, the plan at 819-1005): the notice tail, the release list,
   `join-meta`, the calendar, the controls' clock, origin and marks, the definitions root, the removal sequence, and the
   held writer check. The page's table (PUBLISH-BESIDE-SAVES 2) lists the same twelve. Each is covered: the tail by its
   retraction (`TripleLive`), the calendar by its new `EntityState`, the release entity by the revision check from the
   transaction's begin, the rest written once or content-addressed. The one gap the page names itself holds today: a
   change to the release list between the read and the transaction's begin is caught only because every writer of a held
   account's release list also writes the tail or the calendar (a Publish, a scheduled release, `schedule`). Writers
   tried against a Publish in the fuzzer: saves of the same account (between the read and the record: in 8,436
   schedules forced by the Publish's own hooks, 4,170 after its read and 4,266 inside its transaction, plus the random
   ones), saves of the other account, the other account's Publish, a
   second and third Publish of the same account (racing: 4,715 schedules), two or three settling processes, kills
   and lost replies of the Publish's own process. **0 schedules** with a Publish acknowledged that is not its own record,
   a release list or tail that differs from the landed records, two Publishes from one tail, or a refusal under the
   account guard without a rival Publish of the same account.
2. **"Subject data needs no guard" (attack line 1).** Falsified for no kind of fact I could reach. The fuzzer's saves
   change every kind of fact a held subject has (root, worker, tasks, files, nested steps), add a child entity by
   reference, remove a reference, and back-date or future-date a value. In the held layout a rule cannot reach another
   subject's or another account's data (`heldWorlds` refuses a foreign subject in a pinned world), and there is no shared
   configuration entity; the release documents are content-addressed. **0 schedules** where a release's stored changes
   differ from its difference over every subject's world at q - 1.
3. **Positions p, q - 1 and q (attack line 2).** Saves committed after the Publish's read and inside its transaction (its
   `afterRead` and `inside` hooks) in 8,436 of the 17,036 account-guard schedules; reads pinned at q - 1, q and q + 1, before and
   after settlement reached the subject, under byte frames (read from the source) and count frames (the archive page at
   q, `receipt-archive` route 240 times): **2,880 reads, 0 differences** from an independent evaluation (test R1). The
   release in force at random pinned positions: **0 differences** in every schedule.
4. **Supersession (attack line 3).** A second and third release during settlement of the first, by the same and by a
   racing process, with kills: superseded values always a prefix of the release's own difference (**12,862
   superseded releases, 0 violations**); notices of superseded releases recorded in order and folded exactly; releases
   that remove forms a subject owed (a 20-form release followed by R2). The one difference is F5.
5. **Definitions by reference (attack line 4).** Racing writers of the same content in one account (the racing Publishes
   of the same document), a refused or killed Publish's definitions left behind (unreachable: only a record names a root,
   and the record checks the root is stored at its cut): **0 violations** in the schedules with one account by reference.
   Across accounts: F2.
6. **Ledger in parts (attack line 5).** 550 schedules with ledgers in parts at 200 (400 schedules), 500 (120) and
   1,000 (30) owed forms, with kills inside a subject's deliveries and parts, second and third releases, racing settling
   processes, and subjects crossing the one-part threshold both ways (a large release after R2, and R2 after it): **0
   violations**; 2,281 ledgers were in parts at the end of these schedules. A ledger read at every position where a notice frame landed, and
   at the position before it, is a whole state of the fold, never half old and half new: **305,356 ledger
   reads (271,246 in the mixed campaign, 34,110 in the runs in parts), 0 halves**. The cap: F3.
7. **Many accounts (attack line 6).** Names that are prefixes of each other (`a-003`, `a-0031`), that look like metadata
   keys (`definitions`, `releases`, `settlement`, `values`), that differ only in case (`ACCT`, `acct`), beside the
   single-account layout in one database: each sees only its own two releases and settles exactly (test N1); the
   settlement documents are distinct. Unicode is refused by the account pattern in `openStore`. Queue fairness: one
   account with 2,000 frames queued and forty small accounts arriving: no small account waited more than 2 turns (test
   Q1); a paced large account and a paused small one do not hold the others. Enrolment beside saves, racing the account's
   first saves, a rival enrolment and another account's Publish: **300 races, exactly one enrolment record each time**,
   and the account then publishes and settles exactly (test E1; the rival's refusal is F6). Command IDs: F1, F2.
8. **The harness (attack line 7).** The builders' oracle is an independent Python interpreter (`oracle.py`, the domain
   oracle) and its worlds are a separate restatement (`deep-reference.ts`), fed by the save receipts; it shares no code with
   the guards or the frames. Nothing pauses or drains saves in the unpaused windows or the beside gate (`gate.paused` is
   never set there, no `drain`); a refusal under the account guard is thrown, not counted. No case is skipped on a refused
   reservation and counted as a pass; the ACT5 live phase records "skipped" in its result when it skips its delivery check
   at server size. `TX2_SWEEP_STRICT=1` is set in every counted run of the builder (its run script's `base` and `gate`)
   and in `held-server.sh`; without it a failing fast sweep falls back to the portable path without a trace
   (`w0-datomic-reader.ts` 37), which is also exact. The independent form rule's narrowing and the adversarial window: F7.
9. **Stored records under the two Publish rules (the brief's last break condition).** One history run twice: two saves
   landing between the Publish's read and its record under the account guard, and the same two saves first, then a
   whole-head Publish that reads at q - 1; both settled. Every stored value of all 18 commits compared, 3,512 fields
   (packed values unpacked): the only differences are the record's `cut` (p against q - 1), `precondition` and `notice`
   hash, the event's `sourceBefore`, the tail's `parent`, and hashes taken downstream from the event (the values progress
   and page identity and chain hash, the notice packets' `recipe` and chain `previous`, the cursor's `parent`, and so the
   seven frame command IDs). **No delivery, ledger item or changed value differs** (test D1). The page lists the first
   five and names the rest as "the hashes taken over the event" and the progress identity.
10. **Randomized (attack line 8).** 22,650 schedules in all: 20,000 mixed (Publish rule, frame
   precondition, definitions and ledger mode drawn per schedule); 1,000 with frames under the head rule (control); 500 with
   both accounts by reference (F2); 550 with ledgers in parts (item 6); 600 negative controls (both caught). Every schedule
   that a violation names can be run again with `--only SEED`. On the stack (run `s2`, ten cases): X1 to X4, and P1 and
   S2 under each frame precondition, as in process (section 1).

## 3. What was not tested

- **Removal on request.** The memory store has no removal, and I did not run one on a stack. On this branch the removal
  ticket is checked database-wide at the serial cut, independent of the head rule (PUBLISH-BESIDE-SAVES 3, R10), and the
  builder's miniature `M3` ran a removal between a Publish's read and commit. The per-account removal rule
  (`TX2_REMOVAL_PER_ACCOUNT`) is not on this branch; DX-ERA3's break is in that rule, and the page's follow-up 1 (pass the
  account in the Publish's ticket) should be reviewed with it.
- **Group commit.** `TX2_GROUP_COMMIT` is off on the scorecard and the held runner refuses it for counted runs. Under the
  account guard a Publish no longer carries the head fence that kept it out of a group; whether a read pinned at q - 1 can
  then see a member at q of the same physical transaction depends on how the lean reads resolve a logical position, which
  I did not test.
- **A transactor or gateway restart on a stack.** Kills, lost replies and stalls ran in process only.
- **Two settling processes with different `TX2_SETTLE_COST`.** The estimate is read once per Node process, so one
  in-process schedule cannot hold two; argued from the code (each frame follows the durable progress row and the frame
  rule is deterministic given it).
- **Imports, deadlines and scheduled releases in a held account.** A held account's calendar is empty and the held toy
  has no import path; the deadline command IDs have F1's pattern but are not reachable in held accounts.
- **Server sizes and timings.** Toy sizes only; no time here is a result.
- **200, 500 and 1,000 owed forms on a stack.** In process only (the builder's RELEASE-LIMITS gate ran them on the toy).

## 4. How the tests work, and how to run them

**The harness (`act10/memstore.ts`).** A stand-in for `openStore` over the in-memory composition, so the real
`JoinedAccount`, `Archive`, `RecordedNotices` and `Settlement` code runs with no stack. It keeps the commit rules the
code relies on: without guards, the whole-head fence; with guards, each `EntityState` guard compared with the entity's
live facts at the transaction's begin (taken before the `inside` hook), each retraction live at the serial cut, and the
transactor's revision check on every entity the transaction reads or writes (`DatomicStorageAdapter` `state.entities`).
Commits are serialized, reads are not; every store call first yields a seeded random number of event-loop turns, so
concurrent actors interleave at every await. A "process" is a view with its own kill switch: after a random number of
calls its next call throws, and a commit it already sent may still apply (a lost reply). Account names, metadata names
and document names follow `openStore` exactly; the scope is the database's, as for every held account.

**The fuzzer (`act10/fuzz.ts`).** Each schedule restores a prepared database (two namespaced accounts of 6 deep subjects,
both enrolled, the first's baseline release settled), then runs at once: 0 to 13 saves of account A (a value change of
any of the subject's facts on its root, worker, tasks, files or nested steps; a back-dated correction; a future-dated
change; a new file entity by reference; a file reference removed), 0 to 5 saves of account B, 1 to 3 Publishes of A
(sometimes all racing; under the account guard half of the schedules also commit a save inside the Publish, after its
read or inside its transaction), a Publish of B, 1 to 3 settling processes of A (killed up to 3 times, with or without a
lost reply, and restarted), and transactor stalls. Each schedule draws the Publish rule (account guard 85%), the frame
precondition (progress 85%), definitions inline or by reference, and ledgers whole or in parts. A clean process then
finishes settlement and the checks run against positions read from the store:

- every acknowledged Publish is its own account's record; each account's release list and notice tail hold exactly the
  landed Publishes; no Publish is refused under the account guard unless another Publish of the same account raced it;
- each release's stored changes equal the release's difference over every subject's world at q - 1 (stored), or a prefix
  of it (superseded);
- the recorded notices, in order, equal a fold of every event over every subject's world at the event's position; every
  ledger equals the fold's items; a ledger read at every position where a notice frame landed (and the one before) is a
  whole state of the fold, never half old and half new;
- a read pinned at a random position finds the newest release at or before it in force.

The fuzzer's oracle reads positions and worlds from the memory store and calls the W0 kernel; it shares the kernel with
the path under test but nothing of the guards, the frames, the cursor or the selection. The kernel itself is what the
builders' independent Python oracle checks.

**Run** (from the repository root, after building the packages):

```
node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/cross-account.test.ts   # X1 to X4
node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/targeted.test.ts        # P1, P1b, E1, N1, Q1, C1, R1, D1
node --experimental-strip-types lab/experiments/EXP-DX1/act10/fuzz.ts --from 10000 --count 5000 --out main-0.json
DX_ACT8_INJECT=read-cut node --experimental-strip-types lab/experiments/EXP-DX1/act10/fuzz.ts --from 0 --count 300   # caught
ACT10_WEAKEN=entity node --experimental-strip-types lab/experiments/EXP-DX1/act10/fuzz.ts --from 0 --count 300       # caught
ACT10_CROSS_DOCS=1 node --experimental-strip-types lab/experiments/EXP-DX1/act10/fuzz.ts --from 50000 --count 500 --docs ref  # F2
```

Options: `--precondition head|progress`, `--beside 0|1`, `--docs ref|inline`, `--ledger whole|parts`, `--forms N`,
`--people N`, `--only SEED` (one schedule again). A schedule is fixed by its seed.

**The stack part (`act10/stack-part.ts`).** Run by the held runner under `DX_ACT10_STACK=1` on the held toy stack
(`engine.mjs ha1 --experiment load-fair --diagnostic --holder DX-ACT10` with `DX_ACT3_HELD=1 TX2_SETTLE_FRAMES=bytes
DX_ACT3_SETTLE=0 TX2_SWEEP_STRICT=1` and `DX_DATOMIC_IMAGE_RECEIPT` naming this reviewer's private image). It enrols
accounts 1 to 4 of the held database and repeats X1, X2, X3 and X4, then P1 and S2 (a Publish of the same account landing
inside its release's last values frame) under each frame precondition, through the real gateways and transactor.
Harness changes for it: `DX-ACT10` may build a private image (`lab/bin/engine.mjs`, as DX-ACT8 and DX-ACT9 do), the
`ha1` holder gate, and the hook in `held-campaign.ts`.

## 5. Evidence

Private, `agents/DX-ACT10/` (outside the repository): `suspicions-before-pages.md` (written before the pages were
read), `fuzz/main-0.json` to `main-3.json` and their logs (the mixed campaign), `fuzz/control-head.json`,
`fuzz/cross-docs.json`, `fuzz/parts-200.json`, `parts-500.json`, `parts-1000.json`, the negative controls (re-run with the
commands of section 4), `image-receipt-2.json` (the private image the stack run started), `run-s2.log` and the stack run's
`act10-stack.json` under `evidence/DX-ACT10/`. Every count in this page is in those files.

Files on this branch: `act10/memstore.ts`, `act10/fuzz.ts`, `act10/cross-account.test.ts`, `act10/targeted.test.ts`,
`act10/stack-part.ts`, this page; harness hooks in `lab/bin/engine.mjs`, `lab/config/datomic/runtime.mjs`,
`lab/experiments/EXP-DX1/ha1/local.ts`, `actv-lazy/join/held-campaign.ts` (all default off).

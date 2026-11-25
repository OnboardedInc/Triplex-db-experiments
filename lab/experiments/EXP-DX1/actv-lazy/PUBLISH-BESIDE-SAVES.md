# A Publish and an enrolment beside every account's saves (`TX2_PUBLISH_BESIDE`, `TX2_ENROL_BESIDE_SAVES`)

Builder DX-ACT8, 2026-11-24, branch `exp/DX-ACT8-publish-beside-saves` from `exp/DX-SCALE2-wide-thin` (`3e3e652b9`) with
`exp/DX-ACT6-release-limits` (`b0529e87d`) merged in (no conflicts). All accounts stay in one Datomic database. Mac
work is correctness at toy size; every Mac time is diagnostic, every count exact. Nothing here ran on a server. Every
option is default off; with nothing set every existing path is unchanged.

Section 0 is what three independent reviews found and what changed after them (0.A is the third, the newest). Sections
1 to 6 are the design, written before any code. The results follow from section 7.

## 0. What the three reviews found, and what changed after them

### 0.A The third review (2026-11-25, `act10/REVIEW-3.md`, `f596d1267`): what changed after it

**Does the one branch have U1? Yes.** `exp/DX-INT1` at `1ed2650bd`, with every option off, carries the two ID
generators the review read, byte for byte. Its fix is alone on `exp/DX-U1-id-allocator` (`a439e9b9e`, page
`u1/ID-ALLOCATOR.md` there). This branch carries the same fix (`c3f4dc505`).

| # | Finding, in one line | The fix (commit) | The test that now passes |
| --- | --- | --- | --- |
| U1 | A save's block of assertion IDs and the SDK's other IDs came from one ID space, so a valid save could be refused, and refused again on every resend | One allocator (`packages/core` `utils/id.ts` `reserveIdPrefix`); the held tape resends a save refused for an ID collision under a new block once its operation is known absent (`c3f4dc505`) | `identity.test.ts` I1 (0 of 5,000 share a token), I2 (0 of 200,000), I3 (0 of 100,000 IDs inside 28,572 blocks); on the stack, the options-off gate (0.A, the gates) |
| U2 | The first transition stored the ledger mode of whichever process came first, which could lock the account | Under any setting the ledgers are in parts with the archive, whatever a process names; the cap is computed the same way by every publisher (`f2c3cac73`) | `review3` T1; `review2` C2 |
| U3 | Another account could compute a settlement frame's or the enrolment's command ID and save under it first, stopping that account for good | Frame IDs carry a random part under any stored setting (`f2c3cac73` under `accountKeys`, widened in the next commit); the enrolment's ID carries one under `TX2_ENROL_BESIDE_SAVES`, and is recovered by reading what it writes (`f2c3cac73`) | `review3` T9 (values and notices: the next runs record), T10 (the account enrols) |
| U4 | A forged record in two accounts' documents was taken as each one's Publish | A record is this account's only if every change it makes is in this account's names (`f2c3cac73`) | `review3` T6 |
| U5 | A plan of a build from before the settings, made before a transition, could commit after it (a release over the cap landed and locked every later Publish; a frame landed after an acknowledged pause) | The transition fences what was planned before it: it rewrites the account's calendar row, every pending values progress row and the notice cursor, and creates the first such rows if absent (`f2c3cac73`); it commits under the removal sequence it read (`c788f5de2`), guarded on every row it fences (`afae099b1`) | `review3` T4, T5; `settings` S2, S3, S4, each with a negative control |
| U6 | A process kept a per-process cache of the settings, so it never turned them on again after a direct rewrite | No cache: whether a transition is needed is read at every plan and every frame (`f2c3cac73`) | `review3` T3 |
| U7 | The `joined:<account>/<id>` form of `bf377c57f` was not looked up | Looked up, under the same ownership rule, with either intent (`f2c3cac73`) | `review3` T7 |
| U8 | Another account can read a Publish's record by its computed ID, or save under the next one first | **Not fixed on this branch.** The fix is the gateway's account claims (the one mechanism, below) | `review3` T8 still states it |
| U9 | The ledger cap was a lifetime limit on the account | The retired-item archive (follow-up 11): a ledger holds the items in force only; the cap bounds one release (`f2c3cac73`) | `lifetime.test.ts` (4,000 distinct notice policies over 12 releases); `review2` C5; `targeted` C1 |
| U10 | The fuzzer excused an old build's late frame by the first attempt under its ID | The memstore records the attempt that landed at each position; the fuzzer reads that one (`f2c3cac73`) | The fuzz campaign (0.A, the gates) |

**U1 in detail.**

- **What the allocator guarantees.** Within one process, no ID issued before a block is reserved starts with the
  block's prefix, and none issued after does. This holds however the clock moves, a step back included: every new
  value is compared with the greatest issued so far, never with the clock. Across processes and restarts, IDs stay
  independent ULIDs; another process's ID shares a 24-character block prefix only if its 10 time characters and the
  next 14 random characters are equal (70 random bits per pair).
- **A resend refused for an ID collision is not refused forever.** The held tape sends such a save again under a new
  block, at most 3 times, and only after the operation lookup says the save is absent (its own earlier attempt may be
  what holds the IDs).
- **Which writers refuse a collision.** The general writer ("TRIPLEX_IDENTITY f/id", answered `400 IdentityConflict`);
  the per-subject writer (its history guard finds the used ID and plans again); `:f/id` is `:db.unique/value` behind
  both. No ID is ever stored twice.
- **Which SDK paths have it.** Any process that takes a block from `orderedSaveIdentity()` or
  `wideOrderedSaveIdentity()` and also makes IDs through `generateId` or `generateTransactionId`: every row ID of
  `TriplesLive` and `KvTriplesLive`, the `IdGenerator` of `RuntimeServices`, and every transaction ID written through
  the TypeScript adapter. On the one branch only lab processes take blocks (the held runner's tape and the gates and
  tapes under `lab/experiments/EXP-DX1`); no path under `packages/` does.
- **What is and is not byte-identical.** The ID strings differ: they always did from run to run, since ULIDs carry
  the clock and random bits. Everything else is identical: the paired native log on the U1 branch (`u1/paired.ts`,
  300 rounds) is the same on the base and the fix once each ID is replaced by its order of first appearance and each
  clock by a placeholder (normalized SHA-256 `8037b699...` in all four runs); 877 and 928 SDK IDs fell inside a block
  at the base, 0 with the fix.

**U2 in detail.** With no setting stored, a process writes with its own ledger mode, as before. Once any setting is
stored, every process writes ledgers in parts with the archive. A ledger in parts replaces a whole one, and a ledger
that fits one part is written exactly as a whole one, so no ledger already written is a problem, and a process that
names `whole` is not refused (it writes parts). No release that adds no notice policy is refused by a mode or cap
check (U9).

**U3 in detail, and what the join layer changes when the gateway's claims land.**

- **Frames.** Under any stored setting a frame's command ID is `settled-values:<hash>:<random>` (or `settled-notice:`).
  Nothing is recovered by a frame's ID: a frame is guarded on its progress row (or the head), so a frame that landed
  refuses its own resend, and the next run reads the row it wrote. (Widened from `accountKeys` alone after the
  single-layout fuzz: a transition rewrites a progress row with its own value, so a deterministic ID can name two
  plans with different retractions, below.)
- **The enrolment.** Under `TX2_ENROL_BESIDE_SAVES` a namespaced account's enrolment command ID is
  `join-held-enrolment:<account>:<random>`. Its four entities (the origin, the clock, `join-meta`, `join-calendar`)
  are created only if absent, so a lost reply, or a rival enrolment of the same account that landed first, is found by
  reading them. The journal walk accepts a rival enrolment by what it writes: those four entities and nothing else.
- **When the gateway's account claims land** (the one mechanism, on the reviewer's four conditions):
  1. A Publish carries its account: the gateway's `account-of-id` reads `lazy/account/(releases|origin|clock|mask|cursor)/<account>`
     (0.9). Its claim is stored scoped by the account. This closes U8.
  2. Frames and the enrolment keep their random IDs. They need no mapping of document namespaces to accounts, since
     no one can compute them.
  3. `original` keeps its ownership check, now "every change" (U4), as a second check of what the gateway returns.
  4. The switch from `joined:v2/...` to the gateway's form goes through a one-way setting in the account's origin, the
     same way as 0.8's, with the transition's fences (so no rollout order is needed for correctness). `joined:v2/...`,
     `joined:<account>/<id>` and the plain `joined:<id>` stay looked up.

**U5 in detail: the window is closed without relying on the rollout order.** A transition's commit now also rewrites,
each with its own value, the rows that whatever was planned before it is guarded on:

- the account's calendar row (every guarded Publish carries an `EntityState` guard on it; a whole-head Publish is
  fenced on the head);
- every values progress row of an owed release that is still pending, and the notice cursor (every frame under the
  progress precondition is guarded on its progress row);
- for an owed release with no progress row, or an account with notices and no cursor, the first row a frame would
  start from, so a first frame planned before is refused too.

A reader sees the same values before and after. The transition is guarded on each of those rows as it read them, so a
frame that writes one between the transition's read and its commit refuses the transition, which reads again (below).
So a plan of any build, old or new, made before the transition is refused at its commit.

**A fault the fuzzer found in this pass, and its fix.** The first mixed campaign with the transitions dimension, at
`c788f5de2`, found 19 of 2,500 schedules violating. 18 were one fault: the transition's commit was guarded on the
origin row only, so a first values frame or first notice frame that created its row between the transition's read and
its commit left two live rows for one key, and every later read of that row refused. Fixed in `afae099b1` (an
`EntityState` guard on every fenced row). `settings` S6 lands both first frames in that window: it fails at
`c788f5de2` and passes now. The 260 schedules from seed 230000 (2 violating at `c788f5de2`) give 0. The 19th
(seed 231894) was the fuzzer's own classification: its transition-step publisher counted the known refusal of a
definitions ID shared by two accounts before `accountKeys` (F2) as a violation; it now counts it as every other
publisher there does. The campaign was rerun from the start at `afae099b1` (the gates, below). A build from before the settings then reads the origin, finds settings it does not know, and
refuses the account (its exact comparison). The fuzzer now counts such a late frame as a break, not as the admitted
window.

**What remains of the window, exactly.** A frame of a build from before the settings reads the account (its source)
at one position and its own progress row at a later one. If a transition lands between those two reads, the frame is
planned from the fenced row, is not guarded on the origin (that build knows no settings), and lands after the
transition: one frame per such process, written under that build's rules (no frame guards; a new event's ledgers
without the archive, which the next event under the archive moves to it, so the fold stays exact). A Publish reads at
one position, so its window is closed. A second effect: two such builds can plan the same frame under one command ID
(a hash of the cursor's value), one before the fence and one after, with different retractions; the second to commit
stops on "commit receipt differs" (nothing is written twice; its restart refuses the account). So the rollout order of
0.8 (no build from before the settings is running when the first permission is given) is still what removes this last
frame; the fences remove everything else, and this build's own processes need no order.

**A transition never refuses a plan.** A permitted process tries a transition at most 8 times (each refused only by a
write to a row it fences); if none lands, it plans under the settings as stored, as a process allowed nothing does, and
tries again at its next plan. (At `afae099b1` the eighth refusal stopped the process: 4 of the 7 single-layout fuzz
violations there.)

**U6 in detail.** Settings stay one-way only against this build's own code. A writer of the origin fact can still turn
them off (a direct rewrite, or a restore to before the transition). What changed: the process that had turned them on
reads them at its next plan and turns them on again. The notice cursor keeps `archive` once it is set, so the ledgers
stay exact while the origin says otherwise (the stack case RS below). A second live origin row still refuses the
account's guarded Publishes ("guard differs"), which is the safe outcome.

**U9 in detail: the lifetime limit is gone.**

- **The design.** Under any setting a subject's ledger holds only its items in force. Each retired item is one row of
  its own (`recorded-retired:<subject>:<item ID>`), written in the same byte frames before the ledger's head. The
  kernel's fold is unchanged; its input is the ledger plus the archived rows of the work items not in the ledger, so a
  retired item that comes back continues at its sequence + 1. A row is only ever read by its key, and the ledger has
  priority over a row.
- **The cap now bounds one release:** a Publish is refused only when one subject could owe more notice items from that
  one release than one ledger can hold, and no single earlier release held all of its notice policies at once. A
  release whose policies one earlier release held is never refused, so a release that landed over the cap by any route
  never locks the account's later releases.
- **Tested** (`lifetime.test.ts`): 10 releases of 400 new notice policies each, then the first release's 400 again,
  then R2. 4,000 distinct policies over time, 17,607 notices in order equal to the kernel's fold; each of the 4
  subjects held 4,001 items over time, its ledger and archive together equal to the fold's whole state, its ledger
  equal to the items in force; 1,603 deliveries at sequence 2, among them the first release's 400 items for each of the 4 subjects. Two releases of 1,000
  policies each publish, their union in one release (2,000) is refused, either again publishes, R2 publishes.

**The largest account this design supports.**

| Bound | Size | What sets it |
| --- | --- | --- |
| Notice policies one subject owes from one release | **1,592** (plus up to 22 items from the base rules) | One ledger: 10 parts of 10,240 characters, the most one frame can replace within the writer's bound; the cap's worst-case estimate of a packed item |
| Forms and policies in one release, full documents | about **1,983 forms and 1,983 policies** (264 bytes a pair) | The release marker holds the new and the old document in one value of at most 1 MiB, so about 0.5 MiB each |
| The same, documents by reference | not the bound | Definitions are content-addressed rows; the 1,592 above binds first |
| Distinct notice policies over the account's life | **no bound from the ledger** | Retired items are archive rows; 4,000 tested, 1 in force at the end |
| What grows with history | one archive row per retired item per subject | Storage grows with history times subjects; a frame reads archive rows only for items entering or leaving force |

So the largest account is one whose every release keeps at most 1,592 notice policies in force for any one subject,
and, with full documents, at most about 1,983 forms and policies in a release. Its history is not bounded.

**U10 in detail.** `MemDb.landed` records, at each position, the process and read position of the attempt that landed.
The fuzzer's frame-guard check reads that, not the first attempt under the command ID.


### 0.0 The second review (2026-11-24, `REVIEW-2.md`, `5bbb3da09`), in plain words

**What it found.** With every option on in every process and no records from before the options, 25,000 fuzzed
schedules gave 0 violations, and the narrowed guards held again. But the fixes of the first review were switched on per
process, and that broke two things:

1. **R1 (high):** F1 was still open for the single-account layout (the held toy's account 0): its records kept the
   unscoped key, and `original` took any record found under it, another account's included.
2. **R2 (high):** a Publish sent by a process with `TX2_ACCOUNT_KEYS` and resent through one without it was published
   twice (two releases).

And: **R3** the account in a key was a name, not an authority (another account could read a Publish's record by its
command ID, claim its ID or its definitions ID first so that it always failed, or with store-level write access write a
record the Publish took as its own); **R4, R5** a publisher and a settler with different ledger modes, or a settler
without the frame guards, broke F3 and F4 again; **R10** the ledger cap is a lifetime limit per account; **R8** account
0's deadline key equalled the key of an account named `deadline`; **R7** section 0.4 was wrong for the toy (subject
saves never enter the group lane); **R6** the one-try refusal was not reproduced and the adapter hid its code; **R9**
the frame guards refuse frames on a pace change or a pause set and cleared (all end stored).

**Where this page was wrong after the first review.** Section 0.1 presented `TX2_ACCOUNT_KEYS`, `TX2_SETTLE_FRAME_GUARDS`
and `TX2_LEDGER_CAP_AT_PUBLISH` as fixes. As per-process switches they were not: a fleet in which one process lacked one
of them published twice, took another account's record, wrote frames after a pause, or accepted a release it could not
settle. Section 0.4 said a Publish could share a physical transaction with saves in the toy's configuration; it cannot
there (R7, corrected in 0.4).

**What changed.** The three switches are gone as behaviour. Each became a one-way setting stored in the account's own
origin fact, which every process reads and which a build that does not know it refuses (0.8). The variables now only
allow a process to turn a setting on. Every record a Publish recovers by its command ID must have written that account's
own documents (0.9). Section 0.10 states R10's lifetime limit, 0.11 the rest, 0.12 each finding with its test, 0.13 the
gates at the head.

**What is still open from the second review.** R3 for a Publish's own command ID: another account that can compute it
can still read the record or take the ID first (a refusal, never a wrong acknowledgement); the fix is the save line's
account claims in the gateway (follow-up 10). R10: the lifetime limit is real until retired ledger items are removed
(follow-up 11). An old build still running at the transition can land one plan it made before it (0.8; the rollout
order closes it). Three of four options-off gate runs at this head stopped on one save of the gate's own save tape;
the fourth passed, as did the earlier code's control (0.13). Cause open.

### The first review (`REVIEW.md`), as written after it (2026-11-24; the first commit after it at 19:56 local)

**What the review found.** An independent adversarial review (DX-ACT10, `lab/experiments/EXP-DX1/act10/REVIEW.md`,
`a1163648e`) found that the two narrowed guards this page adds held: the account guard on a Publish and the progress
guard on settlement frames gave the stored changes, notices, ledgers and reads the positions say they must in 20,000
randomized schedules (0 violations; both negative controls caught). It found seven other faults. Three were serious:

1. **F1, a break: a lost Publish that was acknowledged.** Command IDs are unique in the whole database, and a Publish
   looked its command up as `joined:<id>` with an intent that named the database, not the account. Two accounts that
   published with the same command ID and document: the second was told it published and got the first account's
   receipt; nothing was written for it.
2. **F2: Publishes refused for good.** With definitions by reference, the definitions write's command ID was the hash
   of the content alone, while its rows are under the account's names. Once one account had stored some definitions,
   every other account storing the same ones (in the lab, every account's first release) was refused, five tries, and
   could never publish by reference again.
3. **F4: a paused account still wrote.** Under the progress precondition a frame that passed the pause check before a
   pause landed committed after it (one frame per writer); under both preconditions the worker kept the control cached
   for 250 ms, so frames planned after the pause still went (up to 5 in the test).

The other four: **F3** a release whose notice ledger could not be written was acknowledged and then stopped every later
notice of its account; **F5** a values frame planned before a later release could land after it and leave the earlier
release `stored` instead of `superseded`; **F6** a rival enrolment of the same account refused the other's walk instead
of being recovered; **F7** this page's adversarial gate wrote only facts of the subject itself, with the publishing
account's own save tape off.

**Where this page was wrong.** Section 2 said nothing a Publish reads lives outside its own account's names: its command
lookup and its definitions write's command ID did (F1, F2). Sections 5 and 6 said a Publish or a rival enrolment that
landed is "recovered by its command ID": a Publish recovered another account's record (F1), and a rival enrolment was
refused, not recovered (F6). Section 9.6 implied that a pause stops frames (F4). The supersession sentence taken from
SETTLEMENT-LIVE 2 was false in F5's case. Each place is corrected below and marked "[corrected after the review]".

**The rule now, in one sentence: no lookup by a key the client or the content chooses crosses accounts.**

### 0.1 Each finding, its fix, and the test that now passes

**[superseded after the second review, 0.0 and 0.8]** The options named below are no longer what a request depends on:
each became a one-way setting stored with the account, and the variable only allows a process to turn it on. The tests
and counts below are as they were at `bf377c57f`. Every fix is behind an option that is off by default; with the
options off every path is as before and the review's tests still show the faults (they are kept as the controls). In-process tests run the real `JoinedAccount`, `Archive`,
`RecordedNotices` and `Settlement` code on the review's in-memory store (`act10/memstore.ts`); stack runs are on the
held toy stack, each started by image ID from the image built from this branch (section 14).

| # | Fix (option) | Test now (counts) | The same test with the option off (the control) |
| --- | --- | --- | --- |
| F1 | `TX2_ACCOUNT_KEYS=1`. A namespaced held account's joined command ID is `joined:<account>/<id>` and its intent hashes the account (`account.ts` 92-93, 574-576). A record written before the option (`joined:<id>`) is still read: it is accepted only if it wrote this account's own documents (`account.ts` 488-496, `original`); the single-account layout keeps `joined:<id>`. Deadlines go through the same `execute`, so their `deadline/<sha256>` IDs are scoped the same way. | X1 under both Publish rules: the second account lands at its own position (11 and 12), 1 release each; X2: the second account's different document publishes (1 release); X5, an old record: read again at its position 11, the other account's Publish distinct (12), a reused ID with another document still refused. Stack (run `Sfix`): X1 positions 28 and 29, `secondHasFirstsReceipt: false`, 1 release each; X2 the same account's own reuse with a different document refused ("Reused command ID has different input"), as it must be. | X1: the second account gets the first's receipt (position 11 = 11, 0 releases, tail 0); stack (run `Soff`): both at 28 with the same transaction ID, second account 0 releases. |
| F2 | The same option. The definitions write's command ID is `definitions:` + SHA-256 of the account's definitions prefix and the nodes (`definitions.ts` 239). Old records need no read: definitions are content-addressed and guarded by `EntityState` (created only if absent), so a write under the new ID over stored rows changes nothing. | X3: the second account publishes by reference (1 release, tail 1); X4: 3 of 3 by-reference Publishes land (4 and 2 releases); fuzzer with both accounts by reference, 500 schedules: **0 violating** (20 refused tries, all in schedules with racing Publishes of the same account or a killed publisher; in any other schedule a refusal counts as a violation). Stack: X3 and X4 by reference land (positions 34, 38, 42). | X3 refused ("commit receipt differs from the request (command definitions:4724bb34...)"); X4 3 of 3 refused; fuzzer 232 of 500 schedules violating; stack: X4 and X3 by reference refused. |
| F3 | `TX2_LEDGER_CAP_AT_PUBLISH=1`. Before anything is written, a Publish is refused (`ReleaseTooLarge`) when one subject could owe more notice items, across this account's releases, than its ledger can be written with (`account.ts` 651-670, called at 850 before the definitions are written and at 877 in the plan). The count: every notice policy of every release of the account (retired items stay in ledgers) plus up to twice the base rules (`ledger-parts.ts` 190); the size: a packed ledger of that many items with the longest IDs and 31 due dates (`ledger-parts.ts` 181, measured 15%, 6.5% and 5.9% above the real ledger at 200, 1,000 and 1,500 forms, so it refuses early, never late); the limit: 10 parts of 10,240 characters with ledgers in parts, one value per frame without (`ledger-parts.ts` 159). The message gives both numbers and what to do: "Publish a release with fewer notice policies (this account's releases can hold about N)". **The limit depends on the ledger mode, which the Publish reads from its own process (`TX2_NOTICE_LEDGER`); the processes that settle the account must use the same mode** (a publisher in parts with a settler writing whole ledgers would let F3 through again; the reverse refuses early). The first fuzz runs of ledgers in parts set the mode only for their settlers, and the cap, reading whole, refused every 200- and 1,000-form release (364 of 400 and 27 of 30 schedules "violating", all of them that refusal); rerun with the mode set for both (below). Follow-up 8. | C1 with the option: the 1,750-policy release refused at Publish with "one subject could owe 1772 notice items ... about 103432 characters, over the 102400 the settlement can write for one subject (10 parts of 10240 characters)", 0 commits written; a 1,000-form release then publishes, and the account's next release publishes and its notices are recorded (cursor at event 4). | C1: acknowledged, then 3 of 3 ledger writes refused (`FrameTooLarge`, 11 parts needed, 1,751 items) and the later release's notices never recorded. |
| F4 | `TX2_SETTLE_FRAME_GUARDS=1`. Each frame reads the account's control row at the same position its guard is read (no cache), waits while paused, and otherwise carries the control row in its guard (`settlement-control.ts` 79-89, `archive.ts` 220-233). **The bound: after a pause is acknowledged at position x, no settlement frame of that account commits after x (N = 0), under both preconditions.** Under progress a frame read before the pause names the control row's earlier live fact in its `EntityState` guard, so the pause refuses it at its transaction's begin or at the serial cut; under head the pause moves the head, which refuses it. The refused frame plans again and finds the pause. Cost: one control-row read per frame, where the cache allowed one per 250 ms. | P1 (a pause landing while a frame is in flight): 0 frames after the pause under head and under progress; P1b (40 ms frames, pause inside the cache window): 0 and 0. Stack (run `Sfix`): P1-head 0, P1-progress 0 value frames after the pause. | P1: 0 (head) and 2 (progress: one values, one notice frame); P1b: 2 and 5; stack (run `Soff`): P1-progress 1 frame after the pause (at 48, the pause at 47). |
| F5 | The same option: **a guard, not a corrected sentence.** A values frame also carries the account's notice tail row read at its source position (`archive.ts` 277-279); a held account's tail changes only at a Publish, so a frame is refused exactly when a later release lands, and the next frame marks the release superseded. Chosen over correcting SETTLEMENT-LIVE 2 because it makes the stored state the same under both preconditions for one read per frame; the earlier sentence ("the next frame marks it superseded") is now true. Consequence: as under the head precondition, a release superseded in the middle of a split subject keeps that subject's first part only; no reader consults a superseded release's pages, and the gate checks that part against the oracle's first changes. | Fuzzer, 20,000 schedules with the option (which makes `storedAfterSuperseded` and `pagesAfterSuperseded` violations): 0 and 0; 14,549 supersessions, each with only the frame that marks it. Stack (run `Sfix`): S2 under head and under progress: `superseded`. | Fuzzer, 5,000 schedules with the option off: 512 releases `stored` although a later release landed before their last frame, 515 pages written after it (not violations without the option); stack (run `Soff`): S2-progress `stored`, its progress row at 53 after the later release at 52. |
| F6 | `TX2_ENROL_BESIDE_SAVES` itself (no new option): the walk accepts a commit whose command ID is this account's own enrolment command (`join-held-enrolment:<account>`), and the enrolment then recovers that record (`account.ts` 284). | E1, 300 races: 204 with both enrolments returning the one record, 96 with no rival, **0 refused**; always one enrolment record. | E1: 111 of 300 with one enrolment refused ("Unclassified native writer left the joined source open"). |
| F7 | The gate (no option): in the adversarial window the publishing account's own save tape runs (23.5 per second, `DX_ACT8_ADV_OWN`, 0 for the earlier gate); two new kinds of write: a child entity linked by reference (a new file document with an expiry, linked by `:person/file`) and a reference removed (a `:person/file` link retracted); the independent form rule is narrowed only for the subjects the adversary changed, and (`dbc1f3c09`) only for the release right after the write (its notices reach the subject at that release's event), every other subject and release checked strictly (`beside-gate.ts` adversaryWrite, `Gate.settle`). Narrowed means the rule still checks every added-policy change and every form notice of that subject and leaves the base rules' notices (which it does not model) to the oracle, which checks every change and notice exactly in every step. "Shared configuration": a held account has none; every entity of a held world belongs to its subject (`heldWorlds` asserts it), and the jurisdiction and location entities exist only in the single-account W0 profile. Bitemporal writes (back-dated, future-dated) stay with the review's fuzzer, which ran them (the gate's oracle folds facts without valid-to). | Runs `G1f` (fixes on) and `Goff` (options off): 26 adversarial steps each, every one exact (section 8); `G1f2` with the per-release narrowing: 26 steps, each narrowed for at most the one subject written in it (for example `[1]`, `[7]`), the second-Publish and enrolment steps and every release after a write fully strict, every one exact. | — |

**What the review's tests are now.** Its 16 tests (with the controls above and the new cases: 27 in all), its fuzzer and
its stack part are a standing gate phase: `node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/*.test.ts`,
`act10/fuzz.ts`, `act10/isolation-fuzz.ts`, and the held toy runner with `DX_ACT10_STACK=1` (holder DX-ACT8 or
DX-ACT10). At `59995bd36`: **27 of 27** with no option set, **27 of 27** with the three fixes set in the environment
(each test sets its own options; the controls unset theirs), the held join's unit tests 31 of 31; the typecheck of
`actv-lazy` and `act10` gives the 15 errors it gave before the review, all in `load1/snapshot.ts` and `prep1/*`
(at `eca2e81d1`, which also types one lookup in the review's harness, `memstore.ts` 124, that the typecheck flagged,
and again at `4e2811bb5`). The commits after `59995bd36` change only the gate (`beside-gate.ts`, which no test imports)
and that type annotation.

**Fuzzers, every fix on** (`TX2_ACCOUNT_KEYS=1 TX2_SETTLE_FRAME_GUARDS=1 TX2_LEDGER_CAP_AT_PUBLISH=1`):

| Fuzzer | Schedules | Violating | Of note |
| --- | ---: | ---: | --- |
| The review's mixed schedules (`fuzz.ts`), seeds 10,000 to 29,999 | **20,000** | **0** | 44,284 acknowledged Publishes, 18,675 saves committed inside a Publish's window, 180,141 saves in all, 6,655 kills, 1,990,145 notices and 271,218 ledger reads checked; 14,549 supersessions, each with exactly the one frame that marks it (`storedAfterSuperseded` and `pagesAfterSuperseded`, violations under the option: 0) |
| The same, ledgers in parts at 200 forms (400 schedules) and 1,000 forms (30), with `TX2_NOTICE_LEDGER=parts` for the publishers too (at `eca2e81d1`) | **430** | **0** | 895 acknowledged Publishes, 1,770 ledgers written in parts, 476,150 notices; the first attempt without the mode for the publishers: every large release refused by the cap (F3 row) |
| Both accounts by reference (`ACT10_CROSS_DOCS=1`), seeds 50,000 to 50,499 | 500 | **0** | 1,092 acknowledged Publishes, 47,443 notices, 113 kills; control (options off): 232 violating |
| **New: the cross-account isolation fuzzer** (`isolation-fuzz.ts`), whole ledgers 5,000 and ledgers in parts 5,000 | **10,000** | **0 differing** | 22,036 accounts, 48,616 Publishes, 0 refused in the shared database; control (options off), 1,000 schedules: 679 differ |
| Negative controls with the fixes on: settlement at the read position (`DX_ACT8_INJECT=read-cut`) and the entity guards dropped (`ACT10_WEAKEN=entity`), 300 each | 600 | **caught**: 13 and 48 | the review's: 20 and 14 of 300 |

**The cross-account isolation fuzzer** (new, `act10/isolation-fuzz.ts`). Each schedule puts two to four accounts in one
database and has them share, on purpose, command IDs (`r1`, `r2`, `publish`, `x`, ...), documents (R1, R2, 20-form
releases inline and by reference, an 8-form one), release names, definition content and subject keys (every account's
subjects are `pl:s0000000k`), with account names that are prefixes of each other (`a-003`, `a-0031`), look like
metadata names (`definitions`, `releases`) or differ only in case (`ACCT`, `acct`). Each account runs a random sequence
of saves (fixed values, so the same in both runs), Publishes inline and by reference, and settlements. The same
sequence of each account is then run alone in a fresh database. **Each account's result in the shared database must
equal its result alone**: every Publish's outcome, its release list, every stored change, every recorded notice, every
ledger (version hashes compared up to renaming, since they hash positions).

### 0.2 Keys without the account that find a record in the one database

Searched in the join code, the notice store, the lazy store, the Datomic client and the gateway, for every key, hash or
name used to find a record: command IDs, content hashes, definitions, release names, notice streams, cursors and cache
keys. Account names are `^[a-zA-Z0-9_.-]{1,60}$` (`store.ts` 126), so a name holds no `/`.

| Key | Where | Account in it? | What was done |
| --- | --- | --- | --- |
| `joined:<id>`, a Publish's and a deadline's command ID, looked up before planning | `account.ts` 92-93, 488-500, 574-630 | **No** (F1) | Fixed: `joined:<account>/<id>` under `TX2_ACCOUNT_KEYS=1`; old records read and accepted only if they wrote this account's documents |
| `definitions:<sha256(nodes)>`, the definitions write | `definitions.ts` 239 | **No** (F2) | Fixed: the account's definitions prefix is hashed in, same option |
| A save's command ID chosen by the client (the SDK) | core `KvTriplesLive.ts` 466, gateway `commit.clj` 184 and `subject_save.clj` 105 (`:triplex.claim/command-id` unique in the database, `schema.clj` 64) | No | **Not fixed here; refused, never wrongly acknowledged.** A second account's save with a used ID is refused with 409 `command_already_committed` (`EntityHttpHandlers.ts` 121); the lazy store's own commit checks the found record against its own operations (`store.ts` 191-224) and refuses a foreign one; outcome recovery keys on a random operation ID (`DatomicStorageAdapter.ts` 582), not the command ID. So one account can block another's command ID and learn that it exists. The fix belongs where the API knows the caller's account (scope the claim by account); follow-up 4 |
| A removal's command ID (on the removal branches, not this one) | `removal_commit.clj` 232-240 on `exp/DX-ACT9-account-tickets` | No | **Not on this branch.** Refused across accounts (409 `EraseCommandConflict`); a repeat with the same selectors returns the earlier removal, and selectors name entity IDs, which carry the account. Follow-up 4, for the removal branch |
| `join-held-enrolment:<account>`, an enrolment | `account.ts` 317 | Yes (the single-account layout's `join-held-enrolment` has one account per database) | None needed |
| `join-index-<i>`, `join-enrolment` | `account.ts` 433, 457 | No | Justified: the non-held `install` only, which runs in its own database per account |
| `settled-values:<hash>` | `archive.ts` 310, 410 | Yes, through the identity, which hashes the release event's position (`archive.ts` 66-78); a position is unique in the database | None needed |
| `settled-notice:<hash>` | `recorded.ts` 245, 313 | Yes: the cursor's hash chain starts at `hash([account prefix, epoch, "receiver-genesis"])` | None needed |
| `settlement-control:<hash>` | `settlement-control.ts` 43 | Yes (`held.account` is hashed in) | None needed |
| `join-stage:<attempt>` | `staging.ts` 53, 109 | Random attempt (`randomUUID`) | None needed |
| A notice document's claim (every `Documents` commit) | `notify1/store.ts` 123-148 | Yes: `prefix + "claim:" + hash(id)`, and the prefix is `notice:v1:` + `hash([database, document name])` | None needed (a hashed name cannot collide by concatenation) |
| The receiver's `received:<hash(account, epoch)>` | `notify1/receiver.ts` 30-32 | Yes within one source database (the packet's account is the source account's document prefix, `recorded.ts` 218, 303) | Justified for the one database; a receiver taking packets from two source databases whose accounts share a prefix and an epoch would need the source database in it (outside the one-database model) |
| The settlement and control documents' names | `archive.ts` 173, `settlement-control.ts` 20 | Yes: `settlement-values-<account>`, `settlement-notices-<account>`, `settlement-control-<account>`, hashed into the prefix | None needed |
| Release, origin, clock, mask and cursor names | `store.ts` 125-135 | Yes: `<name>/<account>`; the definitions prefix `lazy/account/releases/<account>/definitions/` | None needed: no account name holds `/`, and a definitions key is 64 hex characters, so no account's names equal another's (the review's N1 and the isolation fuzzer's name pools check it) |
| Compiled releases by hash (one map per process) | `definitions.ts` 147-156 | No | Justified: keyed by the content hash and checked on entry (`compiled.hash === claimed`), so a hit is the same content whichever account asks |
| The lazy reader's answer cache; the archive's and recorder's window keys | `read.ts` 96, `archive.ts` 385, `recorded.ts` 275 | Per instance; each instance belongs to one account | None needed |
| The Datomic client's row and entity caches | `RowCache.ts` 110-132, `DatomicClient.ts` 910-934 | Keyed by database, entity ID and revision; entity IDs carry the account's namespace | None needed |
| Operation IDs and commit-order client IDs | `DatomicStorageAdapter.ts` 582, `CommitOrder.ts` 14, 26 | Random (`randomUUID`) | None needed |
| `deadline:<sha256(due)>`, `act8-adversary:`, `iso:<account>:` | `gate.ts` 223, `beside-gate.ts`, `isolation-fuzz.ts` | Gate and fuzzer IDs | Gate only |

### 0.3 Removal on request with the account tickets: does F1's fix compose?

**Yes, as far as the runs below reach.** `exp/DX-ACT9-account-tickets` (`c2aa3d416`, which already contains this branch
up to `2e7ae66c4`) merged into this branch's `b2ae7b32b` with three conflicts, each a holder list in the lab harness
(`engine.mjs`, `runtime.mjs`, `ha1/local.ts`), resolved as the union; `account.ts` and `archive.ts` merged with no
conflict. The merge is a scratch commit, `9481d33f6`, on no branch and not pushed (tree `53dbf730950e...`); it can be
made again with `git merge c2aa3d416` and the three unions. The two changes meet in one place, the account's name: the
tickets name the account by `held.account` (with the prefix `acct/<account>/`), and F1's command IDs use the same
`held.account`; the tickets change only what removal sequence a write carries and checks, F1 only what command ID it
uses.

| Check, on the merge, with every option of both on (`TX2_ACCOUNT_KEYS`, `TX2_SETTLE_FRAME_GUARDS`, `TX2_LEDGER_CAP_AT_PUBLISH`, `TX2_ACCOUNT_TICKETS`, `TX2_REMOVAL_PER_ACCOUNT`) | Result |
| --- | --- |
| The tickets' own tests (`account-tickets.test.ts`) | 6 of 6 |
| The review's cross-account tests, X1 to X5 | 11 of 11 |
| The review's targeted tests | 15 of 16; the one failure was the C1 control, which then ran with the Publish-time refusal on from the environment; it now unsets that option itself (`b2ae7b32b`) |
| The review's fuzzer, 2,000 schedules; both accounts by reference, 500 | 0 and 0 violating |
| The isolation fuzzer, 1,000 schedules | 0 differing |
| ACT9's removal cell on its many-accounts miniature (`act9/cells.sh`, after arm, 1 removal per second, ten publishing accounts, account A removing), with the three fixes on, on an image built from the merge (`9b98c6a511ef`, started by ID for its transactor and both gateways, as its `java-image.txt` and the VM's container list say) | **pass** (run `Cell`): 22 of 22 removals in A (p50 1,059 ms, p99 2,568 ms); the nine other accounts: **0 Publish, 0 settle, 0 delivery, 0 read refused**, 50 of 50 rounds complete; A: 1 Publish try refused by its own removal (`ErasureFrontierChanged`) and 1 delivery refused, both through on the next try or round; **10 of 10 accounts exact** against the oracle and the independent form rule, 0 notices delivered late, 0 twice; 1,043 saves in 74 accounts. ACT9's own after cell (`ACCOUNT-TICKETS.md` 10.1, without these fixes): 20 removals, 0 / 0 / 0 / 0, 55 of 55, A 1 / 0 / 1 / 0, 10 of 10 exact. Of the two late enrolments, one failed on the walk fault below ("Schema validation failed") and one enrolled (391 commits in its walk) |

In process the store has no removal authority, so there the ticket checks take their unprotected branch; the cell is
the combined run on a protected database moved to the per-account rule.

**A fault the ticket branch found in this branch's enrolment walk.** ACT9's cells (`ACCOUNT-TICKETS.md` 10.1) found
every enrolment beside removals failing in both arms: the held enrolment under `TX2_ENROL_BESIDE_SAVES` walks every
commit between its first and last write through the feed, and a removal's transaction in that window stops it (the feed
reader rejects the removal entry, "Schema validation failed", or the walk's position check fails, `677 !== 676`). It is a
refusal, not an exactness fault: nothing wrong is written and an enrolment after the removal succeeds. It is not fixed
here (follow-up 5).

### 0.4 Group commit

**[after the second review] Tested on a stack, exact.** Run `G4grpc` (0.13): every gate part with the write gateway's
group commit on and saves on the general path; 33 of 50 Publishes shared their Datomic transaction with 1 to 5 saves,
in every part, and every check held (every read pinned between a read and its record, every racing save, every
notice and ledger). `G4grp` ran the adversarial, kill, live and enrol parts the same way and held. Not run: group commit
with subject saves on their own path (there a Publish groups only with other general commits, R7).

**[corrected after the second review, R7]** In the toy's `load-fair` configuration a subject save never enters the
group lane (the write gateway runs `TX2_SUBJECT_SAVE=1`, and a subject save goes straight to `d/transact-async`,
`storage.clj` 419-447), so there a Publish can group only with other general commits; with group commit on, no group
formed (the review's H1). With saves on the general path (`TX2_SUBJECT_SAVE=0`) every Publish grouped with saves and the
gate held (H2). The rest of this section is what was written before; its premise holds only for saves on the general
path. **A Publish under the account guard can share one physical Datomic transaction with saves, when the write gateway
runs with `TX2_GROUP_COMMIT=1` and saves take the general path; from the code that is exact.** The held runner starts its write
gateway with `TX2_GROUP_COMMIT=0` for every `load-fair` run (`ha1/stack.ts` 572-588), so no result here had a group.

- **Eligible.** A Publish is a general commit; the group lane takes any commit that is lean, one span, with a
  server-assigned record time and at most 256 operations, on a regular scope (`group.clj` 127-133), from any account,
  up to `TX2_GROUP_MAX_MEMBERS` (8) at once (`group.clj` 373-404). Under the whole-head rule any member before a
  Publish in its group refused it (its scope-wide fence is checked in the group's speculative database); under the
  account guard only its own account's events refuse it, so it can land in a group behind saves. A Publish of the small
  or the large release (4 changes, tens of operations) is eligible; one of more than 256 operations never is.
- **Commit side: exact.** The group's members are evaluated one after another, each on the speculative database left
  by the ones before it (`group.clj` `evaluate`, 135-159: `d/with` per member), and each member's transaction functions
  run there: the tail's `TripleLive`, the calendar's `EntityState` and the revision checks see every earlier member.
  The physical transaction is then fenced on the whole database's basis (`:triplex.group/apply-v1`, `group.clj` 47): if
  anything committed since the evaluation, the group is stale and every member runs alone (`definitive?`, 223-233). A
  member refused in evaluation gets its own refusal and retries as alone. The prepared path (`group_prepare.clj`) groups
  only members whose keys are disjoint, and a Publish's keys include its guard entities (`group.clj` `classify`, 121-125).
- **Read side: from the code, exact.** Each member keeps its own position (`:triplex.group/position`). A read pinned at a
  position inside a group is cut per entity at that position (`group_cut.clj` `interior`, `legacy-slice`): an entity's
  rows written by a later member of the same group are left out. A Publish writes its release entity, its tail and its
  event, none of which is a subject with a covering owner root (the one shortcut there assumes no grouped write touches
  such a subject's root, `group_cut.clj` `entity-slice`), so a read pinned at the save's position `q - 1` inside the
  group would see the previous release, as the guard's argument needs.
- **Not tested [superseded: tested after the second review, above].** No run had a Publish in a group. Until a gate
  runs it (the gate with the write gateway's group commit on, checking every read pinned inside each group that holds a
  Publish), `TX2_PUBLISH_BESIDE` should not be run with `TX2_GROUP_COMMIT=1` (follow-up 6).

### 0.5 A transactor and a gateway restart, and ledgers in parts, on a stack

**A transactor restart: tested, exact.** The gate part `restart` (`DX_ACT8_PARTS=restart`, fixes on, saves stopped)
runs `docker restart` on this run's own transactor container three times: completed between a Publish's reads and its
commit (`afterRead`), begun inside its transaction 30 ms before the operations are sent so the commit meets the stopping
transactor (`inside`), and begun 30 ms before the second values frame of the settlement is sent (`frame`). The same
command is offered again every 2 s until acknowledged; a settlement stopped by the restart is run again until it
finishes.

| Case | What the restart did | Then | Checks |
| --- | --- | --- | --- |
| `afterRead` | 9 offers refused with "Native write had no receipt: Datomic transaction was rejected" while the peers reached the restarted transactor (7 in `Gres3`) | landed at its position 12 (read 11) | one record for the command ID; the next notice sequence; settled 474 changes, 160 notices, equal to the oracle and the independent rule; every read pinned from the read to the record exact |
| `inside` | 9 offers refused the same way (9 in `Gres3`; the first commit met the stopping transactor and no record of it landed) | landed at 23 (read 22) | one record; settled 474 / 0 exactly; pinned reads exact |
| `frame` | the settlement's frame commit met the stopping transactor; the worker stopped ("Native write had no receipt") | the settlement run again 7 times on transport failures only, then it resumed from its durable progress and finished | 474 / 160, every stored change and notice equal to the oracle; pinned reads exact |

Run `Gres4` (`4e2811bb5`, the transactor only) gave the table above and then the gate's end checks: every notice of the
account's releases in order (328) and its 8 ledgers in parts equal to the oracle; `Gres3` (`95c836459`) had given the
same three cases the same way before it went on to the gateway. Each restart returned in about 0.5 s
(`docker restart`); the refused offers are the peers reaching the transactor again afterwards.

**[after the second review] A gateway restart: tested** (run `G4res3`, 0.13), on fixed host ports.

**A gateway restart: not tested.** The first full run (`Gres3`) went on to restart the write gateway: every later offer
was refused with `ECONNREFUSED` on the gateway's old host port for two minutes. In `load-*` modes the toy stack
publishes a gateway on a host port the VM assigns when the container starts (`ha1/stack.ts` 109-111; its other modes
use a fixed port for exactly this reason), so a restarted gateway can come back where this run's clients cannot reach
it. The part now restarts the write gateway only with `DX_ACT8_RESTART_ROLES=active,write`; a gateway restart needs the
fixed-port publication of the HA drills (follow-up 9).

**[after the second review] 1,000 forms with ledgers in parts on a stack:** run `G4k` (0.13), exact.

**Ledgers in parts on a stack:** the gate's `beside` part publishes and settles the 200-form, 200-policy release with
`TX2_NOTICE_LEDGER=parts` (runs `G1f`, `G1f2` and, options off, `Goff`; section 8), and the final check reads every
ledger in parts through the recorder's own reader; ACT6's gate at 200 forms (run `R3`) is the options-off check. 1,000 forms in parts ran in the
fuzzer only (30 schedules).

### 0.6 What is still not tested

**After the second review** (the list below it is as written after the first; group commit, 1,000 forms in parts on a
stack and the gateway restart have run since, 0.13):

- **R3 for a Publish's command ID:** another account that can compute it can read its record or take it first (S1,
  S2: a refusal or a read, never a wrong acknowledgement). Waits on the one account-claims mechanism (0.9, follow-up 10).
- **R10's lifetime limit** stays until retired ledger items are removed (follow-up 11).
- **An old build in flight across a transition** on a stack: shown in process only (settings S2, S4); the fuzzer did
  not reach a frame of it landing late (0 of 5,000), and its negative control without the origin guard was not caught
  by the fuzzer (S3 catches it).
- **A rollout on a stack:** this build without permission beside an old build, then one process given permission. The
  pieces ran (the options-off runs; the permission runs; the fuzzer's mixed fleet) but not that sequence on one stack.
- **Two databases**, and a database restored from a backup taken before a transition: the processes that cached
  "settings on" would not write the transition again until they restart (they still follow what is stored).
- **Three options-off gate runs stopped on one save of the gate's save tape** (0.13, `G4off` to `G4off3`; one refused
  as an assertion ID already in history); `G4off4` and the control `Goffctl` passed. Cause open.
- **A write gateway killed with a commit in flight:** its restarts in `G4res3` failed no commit (requests sent during its
  stop completed); a `docker kill` was not run.
- The enrolment walk beside a removal (follow-up 5) and the cause of the original one-try refusal (R6).

As written after the first review:

- Group commit with a Publish in a group (0.4).
- The enrolment walk beside a removal (0.3), and a removal on request on the held toy stack (no shared removal
  directory there; the miniature has one).
- A gateway restart (0.5).
- A restart while saves run: the restart part stops the save tapes, since a tape cannot tell a save lost in a restart
  from a refused one; a standby transactor taking over (failover) is not this part's case.
- 1,000 forms with ledgers in parts on a stack (the fuzzer only); with the ledger cap on, such a release is refused at
  Publish anyway unless its account's releases fit (section 0.1, F3).
- The cause of the one refused try in `Goff` and in `G1f2` (follow-up 7).
- From the review's list, unchanged: two settling processes with different `TX2_SETTLE_COST`; imports, deadlines and
  scheduled releases in a held account (the deadline command IDs now carry the account under `TX2_ACCOUNT_KEYS`, by the
  same `execute`, but no held account has a deadline); server sizes and timings.
- Everything in section 13 that the review did not change.

### 0.7 Exactly what changed after the review (for the second review)

Branch `exp/DX-ACT8-publish-beside-saves`, from `2e7ae66c4` (the head the review read):

| Commit | What | Files |
| --- | --- | --- |
| `43472352c` | Merge of the review's branch (`a1163648e`): its harness, fuzzer, 16 tests and stack part; the stack part may run under holder DX-ACT10 | `act10/REVIEW.md`, `memstore.ts`, `fuzz.ts`, `cross-account.test.ts`, `targeted.test.ts`, `stack-part.ts`; `held-campaign.ts` (the `DX_ACT10_STACK` hook); `ha1/local.ts`, `engine.mjs`, `runtime.mjs` (holder lists) |
| `75a0654d5` | F1, F2: `TX2_ACCOUNT_KEYS`; tests X1 to X5 with the option on and off | `store.ts` (`accountKeys`), `account.ts` (`joinedCommandId`, `original`, `recorded`, `execute`), `definitions.ts`, `held-campaign.ts` and `beside-gate.ts` (look records up through `joinedCommandId`), `fuzz.ts`, `cross-account.test.ts` |
| `2af0ec835` | F3: `TX2_LEDGER_CAP_AT_PUBLISH`; F4, F5: `TX2_SETTLE_FRAME_GUARDS`; F6; tests P1, P1b, E1, C1 with the options on and off | `account.ts` (`ledgerCap`, the walk), `ledger-parts.ts` (`ledgerCapacity`, `worstLedgerChars`, `noticeItems`), `settlement-control.ts` (`gateAt`), `archive.ts` (frame guards), `fuzz.ts`, `targeted.test.ts`, `ledger-probe.ts` (diagnostic) |
| `8bfedf43d` | The cross-account isolation fuzzer | `act10/isolation-fuzz.ts` |
| `caadc7aa3` | F7: the widened adversarial window | `beside-gate.ts`, `deep-reference.ts` (a fact can be a removal), `held-campaign.ts` (the fact type) |
| `653a17183` | The review's stack part may run under holder DX-ACT8 | `ha1/local.ts` |
| `b2ae7b32b` | The gate's superseded-release check allows a split subject's first part (F5's consequence); the C1 control unsets the Publish-time refusal | `beside-gate.ts`, `targeted.test.ts` |
| `59995bd36` | The gate part `restart` (not in the default list) | `beside-gate.ts` |
| `dbc1f3c09` | F7: the independent rule narrowed only for the release right after an adversary's write | `beside-gate.ts` |
| `ca3c34182` | The restart part waits until both gateways reach the restarted transactor; a failure names its step | `beside-gate.ts` |
| `eca2e81d1` | A type annotation in the review's harness | `act10/memstore.ts` |
| `95c836459` | The restart part runs a step again while it fails only on transport after a restart, and records each such retry | `beside-gate.ts` |
| `4e2811bb5` | The restart part restarts the transactor by default, the write gateway only on request | `beside-gate.ts` |
| the commit after `4e2811bb5` (the branch head when this was written) | This page: section 0, the corrections marked "[corrected after the review]", the options table, the runs after the review (section 8), 9.1's options-off reruns, the evidence (section 14), follow-ups 0 and 4 to 9 | `PUBLISH-BESIDE-SAVES.md` |

**After the second review**, from `bf377c57f` (the head the second review read):

| Commit | What | Files |
| --- | --- | --- |
| `9208250f4` | Merge of the second review (`5bbb3da09`): `REVIEW-2.md`, its 18 tests, its fuzz dimensions (shared keys, mixed options, single layout), its stack switches | `act10/REVIEW-2.md`, `review2.test.ts`, `fuzz.ts`, `memstore.ts`, `ha1/stack.ts` and the holder lists |
| `1b3e0deee` | The three options become one-way settings in the account's origin (0.8); ownership of every recovered record (R1, S3); the `joined:v2/<n>/<account>/<id>` form (R8); random definitions and settings command IDs (S2); the cap's lifetime message (R10); the adapter's refusal code (R6); the review's tests assert the fixed behaviour; the stack harness's group commit and fixed ports for holder DX-ACT8; a 1,000-form gate case | `store.ts` (`originSettings`, `controls`), `join/account-settings.ts` (new), `account.ts`, `definitions.ts`, `archive.ts`, `recorded.ts`, `packages/datomic/src/DatomicStorageAdapter.ts` (and its `dist`), `act10/*.test.ts`, `memstore.ts`, `fuzz.ts`, `ha1/stack.ts`, `beside-gate.ts` |
| `8218b4300` | The fuzzer models a mixed fleet process by process (0.13); `settings.test.ts`; two diagnostic negative controls (`DX_ACT8_INJECT=no-legacy`, `no-origin-guard`); a store may carry its process's permits | `fuzz.ts`, `memstore.ts`, `settings.test.ts`, `account-settings.ts`, `account.ts`, `archive.ts` |
| `81ba9e81e` | The held runner and the gate check a joined record under the form in force at its position (`joinedCommandIdAt`); the held ledger adopts a settings transition another process wrote. The first stack run at `8218b4300` stopped at the runner's own check, which expected the unscoped form | `account.ts`, `held-campaign.ts`, `beside-gate.ts` |
| `73f1d98a6` | The fuzzer excuses a refused guarded Publish only when a transition of its own account landed while it ran | `fuzz.ts` |
| `2abece6fa` | The gate's restart part begins the frame case's restart before the second settlement frame of either kind | `beside-gate.ts` |
| `805214785` | The restart part runs a step again on "Transactor not available" | `beside-gate.ts` |
| `f34694edf` | The gate's uncertain-save stop names the saves' errors | `beside-gate.ts` |
| the commit after `f34694edf` | This page: 0.0, 0.4 to 0.13, sections 8, 14 and 15 | `PUBLISH-BESIDE-SAVES.md` |

New options, all off by default: `TX2_ACCOUNT_KEYS`, `TX2_SETTLE_FRAME_GUARDS`, `TX2_LEDGER_CAP_AT_PUBLISH` (since
`1b3e0deee` each only allows a process to turn the account's setting on); gate-only:
`DX_ACT8_ADV_OWN`, `DX_ACT8_PARTS=restart`, `DX_ACT10_STACK`. Nothing in the Datomic sources changed (the private image
was rebuilt only because the merge changed the harness's `runtime.mjs`, which is among the image's inputs).


### 0.8 The settings in the database (design, written before the code)

**Where a setting lives.** In the held account's origin fact (`lazy/account/origin/<account>`, attribute
`lazy/generation`), the fact the enrolment writes once and that every Publish plan and every settlement turn already
reads (`controls`). Its value gains a field: `settings: { v: 1, accountKeys?: true, frameGuards?: true, ledgerCap?: true,
ledger: "whole" | "parts" }`. One account, one origin fact, so one setting per account, and every process that
publishes or settles that account reads the same one. With no `settings` field every path is as before.

**How a process learns it, and how stale its view may be.**

- A Publish reads the settings in its plan, at its read position `p` (`controls(p)`). It decides there the form of its
  command ID, whether the ledger cap applies and with which ledger mode. Its commit is guarded on the origin row as it
  read it (an `EntityState` guard beside the calendar's), and a whole-head Publish is fenced on the whole head. So a
  Publish planned under the old settings is refused if a transition lands before its commit, and plans again under
  the new ones. **No Publish commits under settings older than those in force at its own position.**
- A settlement frame reads the settings at its own read position, one row (`originAt`). It decides there whether it is
  frame-guarded (control row, and for a values frame the notice tail). Under the progress precondition every frame is
  also guarded on the origin row; under the head precondition the head fence covers it. **No frame commits under
  settings older than those in force at its own position.** A recorder decides a new event's ledger mode the same way
  (the event then keeps it in its cursor, as before).
- A process's view is therefore never stale at a commit. It can be stale only between its read and a refused commit,
  which then plans again.

**The one-way transition.** Only a process allowed to turn a setting on writes it. The environment variables
`TX2_ACCOUNT_KEYS`, `TX2_SETTLE_FRAME_GUARDS` and `TX2_LEDGER_CAP_AT_PUBLISH` now mean exactly that: "this process may
turn the setting on". They are never what a request's behaviour depends on.

- **When:** a publisher does it before its Publish, a settler when it opens.
- **The write:** it rewrites the origin with the merged settings, guarded on the origin row it read, under a random
  command ID (no other account can compute it and claim it first; no recovery by ID is needed, the result is read back
  from the origin). Two processes racing to turn settings on: one lands, the other is refused, reads again and finds
  them on.
- **Only on:** settings only turn on (a merge is an OR).
- **The ledger mode:** recorded at the first transition (`TX2_NOTICE_LEDGER` of that process, `whole` if unset). It may
  then only go from `whole` to `parts`; the reader reads both forms. A process whose own explicit `TX2_NOTICE_LEDGER`
  differs from the stored mode refuses to settle the account (`SettingsConflict`), and to upgrade it if it has no
  permission.
- **What a process without permission does:** it follows the stored settings, whatever its environment.
- **Where a process's permission comes from:** its environment (`account-settings.ts` `permitsOf`). A store may carry
  `permits` instead; only the in-process fuzzer uses that, to model a fleet's processes in one Node process.

**A Publish in flight across the transition.**

- **Planned before it, committing after it:** refused by the origin guard (or by the head), then planned again under
  the new settings.
- **Landed before it:** its record carries the unscoped key. A resend after the transition looks up both forms (0.9),
  finds it as this account's own, and returns its receipt. Nothing lands twice.

**What an old build does when it meets a setting.** Every build since 2026-11-21 (`a50e5dbf1`) compares the held
origin fact exactly with `{ profile, held }` in `controls` (`store.ts`, before this change lines 279-281). Every Publish
plan and every settlement turn of such a build calls it (a values turn in `Archive.turn`, a notice turn in
`RecordedNotices.turn`). So once an account has any setting, every Publish and every settlement turn an old build
*starts* fails with an assertion before it plans or writes anything. Before any setting exists an old build behaves as
a new build with none stored; that includes the old F1 shape in old builds only. This build refuses a settings version
or field it does not know (`originSettings`), so the same holds for the next change.

**The window of an old build, and the rollout order that closes it.** An old build guards nothing on the origin row. So
a plan it made before the transition can still commit after it: at most one Publish and one frame per old-build
process, each under the old rules. Tested in `settings.test.ts`:

- **Its Publish (S2):** lands after the transition under the unscoped key; the resend through this build finds it as the
  account's own and returns its receipt (one release); the old build's next Publish refuses. So it cannot land twice.
  That one release was not checked by the cap, like a release landed before the setting.
- **Its frame (S4):** a values frame planned before the transition lands after a later release that landed after it
  (one value page); the same process's next turn refuses. So a pause acknowledged after the transition can be followed
  by at most one frame from each old-build process still running then.
- **This build has no such window (S1, S3):** its Publish and its progress frame are guarded on the origin row, so a
  plan made before the transition is refused at its commit and planned again; without that guard (the negative control
  `DX_ACT8_INJECT=no-origin-guard`) the frame lands after the later release.

**The rollout order:** first run this build on every process with no permission. While no setting exists it writes
what the old build wrote (the unscoped key, no cap, no frame guards); it differs only by one more row read, and by one
more `EntityState` guard on a guarded commit, which is not stored. Then give the permission to one process. At that
transition no old build is running, so nothing lands under the old rules after it.

**Records from before the setting, and who owns them afterwards.**

- **A joined record under `joined:<id>`:** found by every later lookup of that command, under either form. It counts
  only for the account whose notice documents it wrote (0.9).
- **Definitions:** content-addressed and guarded, so whoever wrote them, the rows are the account's own (under its
  definitions prefix).
- **Frames, ledgers and cursors:** they do not change form. Ledgers in parts and whole ledgers are read alike.
- **The `joined:<account>/<id>` form of `bf377c57f`:** not read. It existed only in test databases written with that
  commit's per-process switch.

**What it makes impossible**, with the rollout order above (each tested in 0.12 and 0.13):

- **R2:** a command landing twice in a mixed fleet. Every process that can still act on the account uses one key form
  at a position, and finds the other form.
- **R5:** a frame after an acknowledged pause from a settler without the guards. No such settler can commit once the
  setting is on.
- **R4:** a release accepted under one ledger mode and settled under another.
- **R8:** account 0's deadline key colliding with another account's key. Under the setting every held account's key is
  `joined:v2/<n>/<account>/<id>`, `n` the account name's length, so no two (account, ID) pairs give one key, and none
  equals an unscoped key (a Publish ID has no `/`; a deadline's is `deadline/<64 hex>`).

**What it does not make impossible.**

- One Publish and one frame per old-build process planned before the transition, if the rollout order is not kept
  (above).
- A process from before 2026-11-21: no held account ran before then.
- A process that writes the origin fact itself with other values.
- R3's learn and deny for Publish IDs (0.9).

**Cost.** One more row read and one more `EntityState` guard per guarded Publish and per settlement frame, whether or
not the account has settings, and one controls read at the start of a held Publish. No stored byte changes while an
account has no setting.

### 0.9 Ownership of every recovered record, and the account as an authority (R1, R3)

**Every record `original` recovers is checked, under both key forms.** A record found under this command's key is this
account's command only if it wrote this account's own joined documents (`notice:v1:<hash of the database and this
account's document name>:`; every joined command writes its notice documents there). This holds in every layout, the
single-account one included, and with or without settings (`account.ts` `original`). Another account's record under
the same key, or a forged one (R3's S3: it writes the forger's own subject), is not this command. The Publish then
commits under its own key. If that key is the other's, the commit is refused (the claim is unique). It is never
acknowledged with a record that is not its own.

**R3, the account as an authority.** Three cases.

- **The definitions ID (S2, definitions):** under the `accountKeys` setting the definitions write's command ID is
  random. The write is content-addressed and guarded (created only if absent) and needs no recovery by ID: a lost
  reply is found by reading the nodes again. So no other account can compute it and claim it first.
- **The settings transition's ID:** random, for the same reason.
- **A Publish's ID (S1, S2):** it must be recoverable by the client's resend, so it is a function of the client's ID
  and cannot be random. The save line's mechanism, `TX2_ACCOUNT_CLAIMS` with the SDK's `claimAccount`
  (`exp/DX-S6-save-line-fixes` `a6d02225c`, `account_claims.clj`), makes the account an authority. The gateway stores a
  claim as `acct-id/v1/<n>/<account>/<id>`, with the account taken from the entities the write writes (the request must
  name the same account). A lookup scoped by account finds only that account's claims, and its legacy plain claims by
  the log.
  - **What the join layer needs from it.** Today the gateway gives a Publish no account: `account_claims.clj`
    `account-of` needs every business entity a write touches to be one account's, by the `acct/<account>/` prefix (or
    the stored `:subject/account`), and a Publish writes `lazy/account/releases/<account>` and notice documents named
    `notice:v1:<hash>`. Two changes there: `account-of-id` also reads the account from
    `lazy/account/(releases|origin|clock|mask|cursor)/<account>`, and `notice:v1:` entities count as journal entities
    (as the claim and the transaction's own entities do). Then a Publish, whose only non-journal entities are its
    account's metadata names, has that account. The join store is opened with the SDK's `claimAccount` set to the held
    account, so its commit and every lookup (`transactionByCommand`) name it. Its claim is then stored as
    `acct-id/v1/<n>/<account>/joined:...`; another account's write under the same client ID is stored scoped by that
    other account. Neither can find, take or deny the other's (S1 and S2), and a plain claim from before is found only
    for the account whose entities it wrote (S6's `owned?`).
  - **Not built here.** It needs the save line's branch, which is not merged into this one, and a gateway change with
    its own image (follow-up 10).

**One mechanism for both lines (2026-11-25, after the save line's second review, `s5/REVIEW-2.md` `9dc800e7b`).**
Today there are two: this page's `joined:v2/<n>/<account>/<id>` under the account's `accountKeys` setting (the join
layer chooses the form), and the save line's `acct-id/v1/<n>/<account>/<id>` under `TX2_ACCOUNT_CLAIMS` (the gateway
chooses it). The save line's review found the same break in its form as R2 here: a fence and a save stored under two
forms (a mixed fleet; a replan retry rebuilt after scoping), lookups open to the reserved prefix, and a plain claim of a
save across two accounts owned by no account. **The one to keep is the gateway's**, fixed as that review asks, because
the gateway is where every writer's claim is stored and looked up (saves, Publishes, settlement frames, fences) and
because only it can tie a claim to the account whose entities the write writes, which stops another account taking a
computed ID (S2). What both lines would then share:

| Part | One rule for both lines |
| --- | --- |
| The setting | One one-way setting in the database, read at every commit, lookup and fence by every gateway (and by the join layer through them); a gateway or a join build that does not know it refuses the database instead of using the plain form. Whether it is per account or database-wide is the save line's choice; the join layer needs only to read it |
| The key form | `acct-id/v1/<n>/<account>/<id>`, chosen once per operation the same way on every path (the save, its replan retry, the fence, a Publish), never by the client |
| The ownership check | The account of a write is the account of the entities it writes (`acct/<account>/`, `:subject/account`, and for the join layer `lazy/account/(releases\|origin\|clock\|mask\|cursor)/<account>`, with `notice:v1:` entities counted as journal entities); the request must name the same account. A plain claim from before is found only for the one account all its entities belong to; a plain claim of no one account stays the database's (it refuses every account, as today), so it is never committed twice |
| The reserved prefix | `acct-id/v1/` refused in every route that takes an ID: save, claim, command, begin, operation, fence |

When that lands, the join layer drops its `joined:v2` form and its `accountKeys` setting: a Publish's client ID is
`joined:<id>`, it names its account, and `original` keeps its ownership check (0.9's first paragraph) as a second check
of what the gateway returns. No record under `joined:v2/...` exists outside test databases. The join layer's other
settings (frame guards, the cap, the ledger mode) are not about IDs and stay in the account's origin fact.
  - **Until then:** reading another account's record by command ID (S1) and claiming its next Publish ID first (S2)
    remain possible for a writer that can compute the ID. Both give a refusal or a read, never a wrong acknowledgement
    and never a wrong write.

### 0.10 R10: the ledger cap (superseded by U9, section 0.A: the cap bounds one release, and there is no lifetime limit)

What follows describes the ledger before the retired-item archive; it is kept as the record of what the second review
read.


A subject's notice ledger keeps one item for every notice policy it was ever owed: retired items are never removed
(`RELEASE-LIMITS.md`'s deferred removal is not built). So a bound on what one release adds would let the ledger grow
past what the settlement can write. A bound on what the ledger holds is a bound over the account's lifetime. **The limit
is real in this ledger shape**:

- **What it is:** the distinct notice policies of all the account's releases together, plus up to twice the base rules'
  items, must fit one subject's packed ledger. That is 10 parts of 10,240 characters with ledgers in parts, one value
  per frame without; about 1,580 distinct notice policies in parts.
- **What refuses:** a Publish that would take the account over it, before anything is written. The message now says
  so: how many distinct notice policies the account's releases would hold, how many this release adds, that the limit
  is for the account's lifetime, and that a release reusing the account's existing notice policy IDs, or adding none,
  still publishes.
- **What removes it:** removing retired ledger items once no reader needs them (RELEASE-LIMITS' deferred retraction of
  old parts). Then the cap can bound the ledger as it is: the items in force plus what one release adds. Follow-up 11.

### 0.11 R6, R7, R8, R9

- **R6:** the adapter's refusal message now carries the gateway's code and status ("Datomic transaction was rejected
  (TransactionRejected, 400)", `DatomicStorageAdapter.ts`), so the next one-try refusal names what refused it. The gate
  keeps counting tries. In the runs after this change no Publish under the account guard had a refused try other than
  by a rival Publish of its own account (`G4`, `W4`, `G4k`: 0; `G4grpc`: the 2 of the rival-Publish step, by design,
  "Source changed at admission"); the only refusals with the new message were the offers refused while peers reached a restarted
  transactor (`G4res`), all `TransactionRejected, 400`. The cause of the original one-try refusal is still open.
- **R7:** section 0.4 corrected. In the toy's `load-fair` configuration a subject save never enters the group lane
  (`TX2_SUBJECT_SAVE=1`), so a Publish groups only with other general commits. With saves on the general path the
  review ran it (H2: 11 of 11 Publishes grouped with saves, the gate held).
- **R8:** closed by the `joined:v2/<n>/<account>/<id>` form for every held account under the setting (0.8).
- **R9:** no change. Refusing a frame on any change of the control row is what makes the pause bound exact; each
  refused frame plans again and the release ends stored.

### 0.12 Each second-review finding, its fix, and the test that now passes

In process (`act10/review2.test.ts`, the review's 18 tests with their assertions turned to the fixed behaviour;
`act10/settings.test.ts`, new). Each test's own line in the log (`agents/DX-ACT8/act10/r2/tests-3.log`) gives the
values quoted. Before any change the same 18 tests reproduced every fault as the review found it (`repro-before.log`).

| # | Fix | Test now | Before (the review's run) |
| --- | --- | --- | --- |
| R1 | Every record `original` recovers, under both key forms and in every layout, must have written this account's own joined documents (0.9) | A2: account 0 (single layout) publishes its own release (`zGetsBsReceipt: false`, 1 release); A1, A2b, D3m: each account its own record | A2: account 0 got account B's receipt, 0 releases |
| R2 | The key form is the account's stored setting, read at the plan's position; both forms are looked up (0.8) | D1m: sent under the setting, resent by a process without the variable: the same record, 1 release (`joined:v2/6/acct-a/r1` only); D2m the reverse; settings S1 (a transition inside the Publish: refused once, planned again, scoped key, 2 releases); the mixed fuzzer (0.13); negative control `no-legacy` caught | D1m: 2 releases |
| R3 | Definitions and settings command IDs random under the setting; ownership check against forged records (0.9). Publish IDs: designed, not built (follow-up 10) | S1 (learn): another account can still read the record by its computed ID (open); S2 (deny): the definitions ID can no longer be taken (`takenDefs` lands, the Publish by reference still lands at 18), the Publish ID still can (refused twice, open); S3 (forge): the forged record is not taken (`resendIsForged: false`; the resend is refused, 1 release) | S3: the forged record acknowledged |
| R4 | The ledger mode is stored with the settings; the cap and every settler use it; a process naming another mode refuses (`SettingsConflict`) | C2: the settler naming `whole` refuses; a settler naming none records with the stored `parts` ("recorded") | C2: `FrameTooLarge` after the release was accepted |
| R5 | `frameGuards` is the account's setting; frames are guarded on the origin row | G2: a second settling process without the variable: 0 frames after the pause (and with: 0); settings S3: a frame planned before the transition is refused (control `no-origin-guard`: 1 page after the later release) | G2: 6 frames after the pause |
| R6 | The adapter's refusal names the gateway's code and status | `G4res3`: every offer refused while the peers reached a restarted transactor reads "Datomic transaction was rejected (TransactionRejected, 400)"; the gate runs count tries (no unexplained refused try since, 0.11) | the code hidden |
| R7 | Section 0.4 corrected | — | — |
| R8 | Under the setting every held account's key is `joined:v2/<n>/<account>/<id>` | B1: 74,088 (account, ID) pairs, 0 collisions, account 0's deadline key no other's | B1: account 0's deadline key = account `deadline`'s |
| R9 | No change (0.11) | G1: pace change and pause-resume each refuse 2 frames, all end stored | the same |
| R10 | The limit is stated as a lifetime limit; message and page say what refuses and what removes it (0.10) | C5 (an account renaming its 150 notice policies at every release): 10 releases publish, the 11th (1,650 distinct) is refused with the lifetime message; then 8 releases of 10 new policies publish before one is refused; the first release again (its policies already counted) and one with no policies still publish; C3: the boundary at 1,592 distinct policies (1,592 publishes and settles, 1,593 refused) | C5: the same counts; the message said only "fewer notice policies" |

New in `settings.test.ts`: S1 to S4 (the transition inside a Publish and inside a frame, this build and an old build,
0.8) and S5 (a settings version or field this build does not know: refused, "not ones this build knows").

### 0.13 The gates at the head

**In process.** At `f34694edf` (and before at `81ba9e81e`): the review's 18 tests, the earlier 27 (cross-account and
targeted) and the 5 settings tests: **50 of 50**; the held join's unit tests **31 of 31**
(`agents/DX-ACT8/act10/r2/tests-5.log`, `tests-join-5.log`). Typecheck of the changed files: no new error (the strict base configuration's index-signature and
unused-name warnings in the review's harness aside; `archive.ts` 608 as before).

**The fuzzer.** Two campaigns (`agents/DX-ACT8/act10/r2/fuzz/`, each step under one ordinary heavy token):

| Campaign (at `73f1d98a6`) | Schedules | Violating | Of note |
| --- | ---: | ---: | --- |
| **All on**: every process allowed every setting, accounts sharing Publish IDs, documents and save command IDs (`ACT10_SHARED=1`); namespaced 20,000, account B in the single-account layout 5,000; each schedule's ledger mode stored by its first transition (30% `parts`) | **25,000** | **0** | 62,471 acknowledged Publishes, 2,448,114 notices and 335,098 ledger reads checked, 9,185 kills, 162,580 and 62,229 saves (22,867 inside a Publish's window), 11,268 transitions (ledger mode moved to `parts`); 18,515 supersessions, each with only the frame that marks it; 2,171 refused Publishes, all in schedules with racing Publishes of one account or a killed publisher (0 excused by a transition) |
| **Mixed fleet** (`ACT10_MIXED=1`, shared keys): every publisher per phase and every settling process at each restart drawn as this build allowed some of the three settings (each at 60%, at least one), allowed none, or a build from before the settings, each naming `whole`, `parts` or no ledger mode; nine phase patterns with resends of earlier commands across phases; the baseline holds no setting; 2,500 namespaced, 2,500 single layout | **5,000** | **0** | 20,180 acknowledged Publishes, 496,384 notices, 1,375 kills, 13,192 transitions; **0 commands landed twice, 0 wrong acknowledgements**; refusals, each counted and none a violation: 26,438 by a build from before meeting a setting, 5,984 by a process naming a ledger mode the stored one forbids, 1,968 cross-account command ID collisions before the account had `accountKeys` (the first review's F2 shape, a refusal), 7 Publishes refused across a transition of their own account; 64 releases stored by a frame after a later release, none with `frameGuards` on at that release; 0 frames of an old build in flight landed late (the window S4 shows was not reached by the fuzzer) |
| The cross-account isolation fuzzer, every permission | 2,000 | **0 differing** | 4,440 accounts, 9,840 Publishes, 0 refused in the shared database |
| Negative controls: the legacy lookup dropped (`no-legacy`, mixed fleet); the origin guard dropped (`no-origin-guard`, mixed fleet); settlement at the read position (`read-cut`); the entity guards dropped (`ACT10_WEAKEN=entity`); 300 each | 1,200 | **caught**: 55, **0**, 14 and 63 | `no-legacy`: commands landed twice. `no-origin-guard` was **not** caught by the fuzzer, which does not land a transition and a later release inside one frame's read and commit; settings S3 does, by hand (1 page after the later release without the guard, 0 with it) |

A first all-on step at `8218b4300` (10,000 namespaced schedules, before the refusal check was narrowed to transitions of
the Publish's own account) also gave 0 violating.

**On the toy stack** (image `98c95f37c42e`, built from `43472352c`; the Datomic sources of every run commit equal the
image's, checked before each run; each run's `image.json` names that ID):

"Permissions on" is `TX2_ACCOUNT_KEYS=1 TX2_SETTLE_FRAME_GUARDS=1 TX2_LEDGER_CAP_AT_PUBLISH=1` in every process of the
run, so the first Publish turns every setting on and the gate's `TX2_NOTICE_LEDGER=parts` is stored as the account's
ledger mode.

| Run | What | Commit | Result |
| --- | --- | --- | --- |
| `S4` | the review's stack part (`DX_ACT10_STACK=1`), permissions on | `73f1d98a6` | **pass**: X1 both accounts publish at 30 and 32 (`secondHasFirstsReceipt: false`, 1 release each); X2 the account's own reuse with another document refused; X3, X4 by reference land (33 to 46); P1 0 value frames after the pause under head and progress; S2 `superseded` under both |
| `S4-first` | the same | `8218b4300` | stopped at the runner's own check, which expected the unscoped key (`joined:<id>`) where the setting gave `joined:v2/11/account-001/...`; fixed in `81ba9e81e` |
| `G4` | every gate part (cost, beside, adversarial, kill, live, enrol), permissions on | `73f1d98a6` | **pass**: every Publish the gate records with its tries landed at one try (22; 0 refused tries), the whole-head case refused 2 of 2 by design; the 26 adversarial steps exact; kill, live, enrol exact; 49 Publishes with 531 positions between read and record and 4,248 pinned reads; 6,764 notices in order |
| `G4grp` | adversarial, kill, live, enrol with group commit on (`DX_ACT10_GROUP=1`) and saves on the general path (`DX_ACT10_GROUP_SAVES=general`), permissions on | `73f1d98a6` | **pass**: 33 Publishes, 351 positions, 2,808 pinned reads, 3,786 notices in order |
| `G4grpc` | every gate part with group commit on, saves on the general path and the review's causes recorder (`DX_ACT10_CAUSES=1`), permissions on | `73f1d98a6` | **pass**; **33 of 50 Publishes shared their Datomic transaction with 1 to 5 saves** (22 with one, 5 with two, 2 each with three, four and five), in every part (beside 11 of 16, adversarial 17 of 28 including its two inner Publishes, kill 2 of 3, live 3 of 3); 569 positions between read and record with 4,552 pinned reads, 69 racing saves before and 17 after with 86 reads, 6,068 notices in order; 8 refused tries, 6 by the whole-head rule and 2 in the rival-Publish step, both by design |
| `G4k` | the `beside` part with the 1,000-form, 1,000-policy release (`limits1000`), ledgers in parts, permissions on | `73f1d98a6` | **pass**: the 1,000-form Publish at one try (read 126, record 171, 44 commits between, record 621,193 B); settled 23,700 changes and 8,000 notices, equal to the oracle and the independent rule (8 / 23,700 / 8,000); 8,008 notices in order and the 8 ledgers equal to the oracle, read through the recorder's reader (a 1,000-item ledger is about 60,000 characters by the cap's own estimate, so several parts of 10,240) |
| `G4res` | the `restart` part, transactor and write gateway, gateways on fixed host ports (`DX_ACT8_FIXED_PORTS=1`), permissions on | `73f1d98a6` | the transactor's three cases **passed** (10, 10 and 0 offers refused while the peers came back, each now named "Datomic transaction was rejected (TransactionRejected, 400)"; then landed, settled 474 / 160 equal to the oracle); the write gateway's `afterRead` and `inside` cases **passed** (restart about 10.3 s; the Publish landed with no failed offer; settled 474 changes); its `frame` case stopped at the part's own check: no second values frame came, so the restart never began. Fixed in `2abece6fa` (restart at the second frame of either kind) |
| `G4res2` | the same | `2abece6fa` | the transactor's `afterRead` and `inside` cases **passed** again (7 and 9 offers refused while the peers came back, then landed; 474 changes); its `frame` case stopped at the part's own retry rule: a peer answered "Transactor not available" while it reconnected, which the rule did not count as transport. Fixed in `805214785` |
| `G4res3` | the same | `805214785` | **pass**, all six cases. The transactor: `afterRead` and `inside` 7 and 10 offers refused ("TransactionRejected, 400") while the peers came back, then landed at 13 and 24 (read 12 and 23); `frame`: the restart began before the second settlement frame (a notice frame), that frame's commit was refused, the worker stopped, and the settlement resumed from its durable progress after 7 transport retries (474 changes, 160 notices, equal to the oracle and the independent rule). The write gateway, on fixed host ports: restarts of 14.7, 10.3 and 10.4 s; no offer failed (the commits sent during its stop completed), the Publishes landed at 39, 44 and 54, and in the `frame` case the first settlement run finished. Every read pinned between each read and record exact (23 positions, 184 reads), 488 notices in order and 8 ledgers equal to the oracle |
| `G4neg` | negative control, settlement at the read position (`DX_ACT8_INJECT=read-cut`), permissions on | `73f1d98a6` | **caught**: "stored changes differ from the oracle for release 2 (read 12, record 28)" |
| `W4` | the held runner's eight windows with no pause, the account guard, permissions on | `73f1d98a6` | **pass**: 8 of 8 Publishes at one try, 0 refused; every save acknowledged |
| `R1c`, `R2c`, `R3c` | options off: the held default campaign, ACT5's live cases, ACT6's gate | `73f1d98a6` | **pass**, every count as published (section 9.1): R1 86 changed values and 8 notices, 8 of 8 Publishes at one try inside one second, 8 first answers, 2 reopened pins, 0 read failures, 0 of 7,632 saves refused; R2 474 / 160 (8 / 474 / 160) in each of the six single cases, second-p superseded at 1 subject (420 changes, 1,200 notices) then 3,555, 2,328 notices delivered once and 0 twice; R3 72 subjects, 4 stops (1 inside a ledger's parts), notices 14,400 / 7,200 / 21,672 delivered once, 2 parts per ledger, the independent rule 72 / 42,720 / 14,400, 76 value and 510 notice frames under 8,000 µs, the definitions table 619,097 and 1,233,297 B then refused over 1 MiB, 3,532 B by reference |
| `G4off` | every gate part, options and permissions off | `73f1d98a6` | cost and beside as `Goff`; stopped in the adversarial window with one save of the save tape unresolved ("Uncertain save": its acknowledgement did not arrive within one second of the window's end; no gateway error in the logs) |
| `G4off2` | the same | `2abece6fa` | stopped the same way in the first `beside` window (one save of the tape unresolved) |
| `G4off3` | the same, with the stop naming the save's error (`f34694edf`) | `f34694edf` | stopped in the `beside` part's `large-own3` window: one save of the tape refused by the transactor's commit function, "TRIPLEX_IDENTITY f/id" (an assertion ID already in history), 11 ms after it was due; the transactor's log has the same refusal. Every Publish and settlement check before it held |
| `Goffctl` | control: the same gate at the first review's head (`653a17183`, the code of `Goff`), at the same hour | `653a17183` | **pass**: 49 Publishes, 537 positions, 4,296 pinned reads, 6,764 notices in order |
| `G4off4` | the same as `G4off3` | `f34694edf` | **pass**: every part (cost, beside, adversarial, kill, live, enrol); every Publish the gate records with its tries at one try, the whole-head case refused 2 of 2 by design; the 26 adversarial steps exact; 49 Publishes, 533 positions, 4,264 pinned reads, 95 racing saves before and 12 after with 107 reads, 6,764 notices in order and 8 ledgers equal to the oracle, as `G4` |

**The three options-off stops (explained by the third review: U1, section 0.A).** Each was one save of the gate's own
save tape, not a Publish or a settlement check: in `G4off3` a save refused on its first and only attempt because an
assertion ID it carried was already in the database's history. Correction (2026-11-25): `G4off2`'s stop recorded no
error, but its transactor's console holds the same "TRIPLEX_IDENTITY f/id" refusal; `G4off`'s captured console (its
last 219 lines) holds none, so its stop is not confirmed as this one. The tape's saves take ordered identities
(`TX2_SUBJECT_ORDERED_IDS=1`, a random token per save). No permission run of the gate stopped this way (`G4`,
`G4grp`, `G4grpc`, `G4k`: 0 of 4), and `Goffctl` and `G4off4`, run right after, passed. With no setting stored the
options-off path writes what it wrote before this change (0.8), and nothing changed in the save path except the
refusal's message; but three of four stops at this head against none in the earlier code's runs (`Goff`, `Goffctl`)
is not explained. Next: record each tape save's attempts (its identity token and every answer) so the next such stop
names the save and its first writer.

## 1. The problem in one paragraph

A Publish commits only if the whole database's head is still the position it read (`account.ts` `execute`: `expected`
= the head it read, then `requireDatomicSourcePosition`, which makes the transaction scope-wide, so the transactor
refuses it if any commit landed since). One database holds every account, so any save anywhere refuses it. Three
tries, then "Joined command exhausted three serial predecessor attempts" (SCALE2 F0: 3 of 3 refused). Every Publish
result so far was measured by a runner that paused the save sender and drained in-flight saves around each Publish
(`held-campaign.ts`, the `gate.paused` / `drain` / `resume` block). The product has no such pause.

## 2. What a Publish reads, and why each read was under the whole head

A held account publishes in `owed` mode (asserted: `assert(!this.s.held || storage === "owed")`). The record is one
transaction of four changes: the release marker (assert on the account's release entity), the notice tail (retract
the old row, assert the new one) and the notice event `event:<n>` (assert). Everything the plan reads, at the
position `p` it read the head at:

| # | Read | Where | Used for | Who else writes it in a held account |
| --- | --- | --- | --- | --- |
| R1 | The notice tail | `state(p)`: `db.get("tail", p)` | the sequence `n`, the parent hash, the previous release name and hash, the census, the epoch | every notice event of the account: a Publish, a save or deadline through `JoinedAccount` (not used by held accounts) |
| R2 | The release list | `controls(p).releases` | the predecessor release in force at `at` (the marker's `old` / `oldRef`, and the old document a read and settlement evaluate) | a Publish (always with R1), `schedule` (always with R5), a deadline that activates a scheduled release (with R1 and R5) |
| R3 | The enrolment document `join-meta` | `meta(p)` | the epoch and the census root in the marker; `at === meta.valid` | the enrolment, once, before any Publish |
| R4 | The census pages | not read by an owed Publish (`ids = []`); read later at the marker's cut | settlement's subject order | the enrolment, once (content-addressed, created only if absent) |
| R5 | The deadline calendar `join-calendar` | `execute` before planning (`through`) | whether a deadline must be processed before the Publish | the enrolment (empty for a held account), `schedule`, a save or deadline through `JoinedAccount` |
| R6 | The business clock | `controls(p).clock`, `c.at`, `c.input` | a held Publish does not use it (`at === meta.valid`); `c.input` only names the last account write for a check | the enrolment, saves and deadlines through `JoinedAccount` |
| R7 | Removal marks of the account | `controls(p).masks` | not used by an owed Publish; reads use the newest marks, settlement refuses an account with marks | nobody in a held account (`Store.input` refuses held stores) |
| R8 | The origin | `controls(p)` | the generation check | the enrolment, once |
| R9 | The release definitions by reference | `rootStored(ref, p)`, `loadRelease` | that the documents the record names are stored | content-addressed writes ahead of the Publish, each created only if absent, never retracted |
| R10 | The database's removal sequence | `readErasure` before the command, `recheckErasure` in the plan | the removal ticket the commit carries (`withErasure`), checked by the transactor at its serial cut | a removal on request in any account |
| R11 | Subject data | not read: an owed Publish lists, reads and evaluates no subject (`a.stats.worlds === 0`, asserted by the runner) | — | every save |
| R12 | The held writer check | `suffix` → `HeldSource.verifyThrough(p)` | the runner's ledger: every position up to `p` is a known writer | (a runner check, not part of the store) |
| R13 [added after the review] | The command's own record | `execute` → `original(id)`: `transactionByCommand("joined:" + id)` before planning and after a refused try | a Publish that already landed is returned, not written twice | **any account**: command IDs are unique in the whole database (`:triplex.claim/command-id`), so another account's `joined:<id>` is found too (F1); likewise the definitions write's `definitions:<hash>` (F2) |

**Why the whole head guarded all of them.** It was the one guard that covers everything at once: if nothing at all
committed between the read and the commit, nothing read can have changed. It was never about subject data (R11: none
is read). **[corrected after the review]** This page said it was never about other accounts either, because nothing a
Publish reads lives outside its own account's names, documents and the database's removal sequence. That was wrong for
R13: the command lookup reads a key the client chooses, in the whole database. No guard was the problem there (the
whole-head rule has the same fault); the key was. With `TX2_ACCOUNT_KEYS=1` the key names the account (section 0.1).

## 3. The narrower guard for each read

| # | Read | Guard under `TX2_PUBLISH_BESIDE=1` | Why it is exact |
| --- | --- | --- | --- |
| R1 | Notice tail | **The existing one**: the record retracts the tail row it read, with a `TripleLive` precondition | Checked twice: inside the transaction at its own begin (`TriplesLive`: a retract of a row no longer live with a `TripleLive` precondition fails with `TransactionConflictError`), and by the transactor at its serial cut (the `live` ids). So any other event of the account between `p` and the commit refuses this one. The tail is the account's own sequence: one row, advanced by every event. |
| R2 | Release list | **The transactor's revision check** on the release entity, which the record writes (every written entity joins the transaction's entity set: `DatomicStorageAdapter`, `state.entities.add` on every assert), covering the transaction's begin to its serial cut; between `p` and the begin, **R1 and R5** | Every writer of a held account's release list also writes the tail (a Publish; a deadline that activates a scheduled release) or the calendar (`schedule`). A future writer of the release list alone must add the release entity to the guard. Rejected: an `EntityState` guard on the release entity, which re-reads every marker ever published with its documents inside each Publish (with full documents up to megabytes; `controls(p)` already reads them once). |
| R3, R4, R8 | Enrolment, census, origin | **None** | Written once by the enrolment, which completes before any Publish (`meta(p)` asserts it exists); the census pages and the genesis are created only if absent; nothing retracts them. Read at `p`, they are the same at the commit. |
| R5 | Calendar | **New: an `EntityState` guard** on the calendar document (its one live row, or none) | One row; read inside the transaction at its begin and revision-checked at the serial cut, so a deadline added between `p` and the commit refuses this Publish and the retry processes the deadline first, as the whole-head rule would have. |
| R6 | Business clock | **None** | A held Publish's record does not depend on it: `at` must equal the enrolment's valid time whatever the clock says, and the notice plan checks valid time against the tail (R1). |
| R7 | Removal marks | **None** | Not an input of an owed record; never written in a held account. |
| R9 | Definitions | **None** | Content-addressed (key = SHA-256 of the node), created only if absent, never retracted: stored at `p` means stored at the commit. [corrected after the review] The rows are under the account's names, but the write's command ID was the content hash alone, so a second account storing the same nodes was refused for good (F2); with `TX2_ACCOUNT_KEYS=1` the account's definitions prefix is in the command ID. |
| R10 | Removal sequence | **The existing removal ticket, unchanged** | `withErasure(sequence)` makes the transactor compare the database's removal sequence at its serial cut, independent of the head rule. A removal between the read and the commit refuses the Publish (the plan's `recheckErasure` throws `ErasureChanged` on the next try); the client publishes again. Only in a database with a removal policy; without one no removal can run. |
| R11 | Subject data | **None** | Not read. |
| R12 | Held writer check | Runner only. In the unpaused mode the Publish checks the positions whose receipts it already has; every position is checked at the end of each window and case. | The product has no ledger; the runner's full check still covers every position. |

**So the whole guard is four checks in the one commit: the account's own notice tail (existing), its calendar (one
new `EntityState`), the transactor's revision check on what the record writes, and the removal ticket (existing).** No
other account's commit can fail the first three: other accounts' saves, Publishes, enrolments and settlement frames
write other entities. [corrected after the review] Another account's commit could still reach a Publish through its
command ID (R13, F1, F2), outside the guard; `TX2_ACCOUNT_KEYS=1` closes that. The only commits that refuse a Publish are this account's own other events (another Publish, a
deadline, a scheduled release) and, through the fourth, a removal on request.

**The removal marks under this rule (the fourth check).** In a database with a removal policy the Publish reads the
database's removal sequence before it plans (`readErasure`), checks it again in the plan (`recheckErasure`), stores it
in the marker (`erasureSeq`), and commits inside `withErasure(sequence)`: the transactor refuses the record if any
removal was published after that sequence. Today that ticket is database-wide, so **a removal of a protected value of
any account, between a Publish's read and its commit, refuses the Publish**; the client publishes again (the
miniature's removal step, section 9.4). The settlement and the recorded notices carry the same database-wide sequence,
so after a removal anywhere an account's notice recorder refuses to go on ("Recorded notices belong to an earlier
removal sequence") and reading its recorded notices is refused ("Discard the old protected input cut") for the removal's own account, for the account whose protected value was removed, and for an account
that had nothing to do with either removal (run `M3`, section 9.4).
That is the removal rule as it stands, not something this work changed.
With the per-account removal rule (`TX2_REMOVAL_PER_ACCOUNT`, built on `exp/DX-ERA2-removal-per-account`, not merged
here) the ticket the Publish carries would name its account: `withErasure(sequence, work, undefined, [account])`, the
account being the held account's key (the `acct/<account>/` namespace, `this.s.held.account`); the marker keeps the
database-wide sequence (a point in the one log); the rechecks become `recheckErasure(comp, sequence, account)`. The
Publish is then refused only by a removal in its own account or of an entity outside every account. That is still
conservative: an owed Publish reads no protected value (R11), so even its own account's removals change nothing it
read; the account-scoped ticket is kept because the marker's sequence is where that account's settlement starts its
own removal check. Passing the account is not built here (section 15, first follow-up).

**Cost of the guard against the whole-head rule:** one extra read inside the transaction (the calendar's row) and the
transactor's per-entity revision check on the three entities the record already writes; the whole-head rule's
scope-wide check goes. Counted per Publish in section 10.

## 4. What a Publish's position means now

Write `p` for the position the Publish read the account's state at and `q` for the position it lands at. Under the
whole-head rule `q = p + 1` always. Under the account guard `q > p`, and positions `p + 1 .. q - 1` hold other
commits: saves of any account (this one included), other accounts' Publishes and settlement frames.

**The record's position is `q`, as before.** It is where the release takes effect, where the feed shows it, and the
basis everything derived from it uses. The account guard proves that every account input of the record (section 3)
held the same facts at `q - 1` as at `p`. So the record is exactly the record a whole-head Publish that read at
`q - 1` would have written, apart from the read position it names.

**What the record stores.** The marker keeps `cut: p` and gains `precondition: "account"`; the notice event's
`sourceBefore` is `p`. Both now mean "where the Publish read its account's state", which the guard extends to `q - 1`.
Every reader of a marker goes through one function (`JoinedAccount.marker`), which for such a record returns
`read: p` and the effective `cut: q - 1`, and checks `p < q` and `sourceBefore === p` instead of `cut === q - 1`. A
whole-head record (no `precondition`) is checked exactly as before.

**For a save of the same account:**

| The save commits at | Release in force for it (reads at the save's position) | What it shows |
| --- | --- | --- |
| a position before `q` (including between `p` and `q`) | the previous release | the save's own position is before the Publish; a read pinned there answers under the previous release |
| `q` | impossible: one commit per position | — |
| a position after `q` | the new release | a read pinned at the save's position answers under the new release over a world that includes the save |

A save is one commit: it lands wholly before or wholly after the Publish. Its receipt position tells the client which.

**A read pinned at a position `r`:** the release in force at `r` is the newest one whose record is at or before `r`
(`controls(r)`, `winner`), and the answer is that release over the subject's world at `r`. For `p <= r < q` that is
the previous release over a world that includes every save up to `r`. This is the same rule as today for every
position before a Publish; the only difference is that such positions now exist between the read and the landing.

**The feed and the journal** list every commit once in position order: the saves and other commits up to `q - 1`, the
Publish at `q` (its four changes), then everything after. A follower of one account sees its own saves, its Publish
and its settlement frames in that order. No entry moves.

**"First correct answer inside one second" when saves never stop:** the clock starts when the Publish is offered and
stops at the first read whose basis is at or after `q` and whose answer equals the oracle's for the new release over
the subject's world at that basis (which will usually include saves made after `q`). The deadline reads at one second
must all be at a basis at or after `q` and exact.

**Settlement, and the dangerous case.** Settlement writes each subject's changed values as the difference between the
new and the previous release over the subject's world at the marker's `cut`; notices are worked out at the event's
position `q`. A subject X saved at a position `s` with `p < s < q` is in the world at `q - 1` but not at `p`. If
settlement evaluated at the read position `p`, X's stored changes would be computed from X's world before the save:
the new release's answer for X built on the pre-save value, which no read at or after `q` ever returns (a read at `q`
works the answer out over the world at `q`), and the save's effect under the new release would be missed (or, for a
consumer that applies changes in order, a value the save replaced would be written back). **So settlement must
evaluate at `q - 1`, not at `p`.** It does, because it takes the marker through `JoinedAccount.marker`, which returns the
effective cut `q - 1`. The Publish writes no subject data, so the world at `q - 1` is the world at `q`. The gate
injects the wrong rule (`DX_ACT8_INJECT=read-cut`, diagnostic only: settlement evaluates at `p`) to show the checks
catch it.

**Which answers change compared with the whole-head rule: none.** Proof: fix any serial order of commits that the
account guard allows. Every answer the store gives (a read at any position, a stored changed value, a recorded notice,
a ledger) is a function of the release documents, the subjects' worlds at a position, the event's position `q` and
the account's notice state, all evaluated at positions the commit order fixes. The record's inputs at `p` equal those
at `q - 1` (section 3), so the record equals the whole-head record read at `q - 1` except the read position it names;
the read position enters no answer (reads use their own position, settlement the effective cut `q - 1`, notices `q`).
What does change: three stored fields now carry `p` rather than `q - 1` (the marker's `cut`, the event's
`sourceBefore`, and the hashes taken over the event: the marker's `notice` and the tail's `parent`); the values
progress identity hashes the effective cut and the marker's `notice` hash. These are record identities, not answers.

## 5. What a client of the same account sees when its save races a Publish

- **Its save is never refused or delayed by the Publish.** A save writes the subject's entities; the Publish writes the
  account's release entity, tail and event. Neither is in the other's entity set, so the transactor's revision check
  never sets one against the other. This was already true under the whole-head rule (there it was the Publish that
  lost); now neither loses.
- **Its receipt position says which release applies to it.** Below the Publish's position: the previous release; above:
  the new one. A read pinned at the receipt answers accordingly.
- **The Publish's client** sees its Publish refused only by its own account's other events (another Publish of the same
  account, a deadline, a scheduled release) or a removal on request. The Publish is then planned again at the new head
  (up to three tries, as before). A save of any account never causes a retry. [corrected after the review] Not shown
  as stated: in runs `Goff` and `G1f2` one small Publish, with the publishing account saving 39.4 per second, had one
  try refused with "Datomic transaction was rejected" (a gateway refusal other than the guard's conflicts; the gate did
  not record its code) with only saves and no other event of the account between its read and its record; it planned
  again and landed at its second try, exactly (follow-up 7). Nothing is replayed: the retry plans
  afresh from the account's state, and a Publish that did land is recovered by its command ID. [corrected after the
  review] Without `TX2_ACCOUNT_KEYS=1` that lookup also finds another account's Publish with the same command ID and
  returns its receipt (F1); with it, only this account's.

## 6. Enrolment beside saves (`TX2_ENROL_BESIDE_SAVES=1`)

A held account's enrolment (`installHeld`) writes the census pages and the notice genesis (already entity-guarded:
each created only if absent), walks the journal between its start and its last check, then commits the enrolment
record (origin, `join-meta`, empty calendar, baseline clock) with `expected` = the head. SCALE2 built the walk half:
with the option a commit that touches none of the account's documents or metadata names is accepted. Finishing it:

1. **The enrolment record commits with `EntityState` guards that its four entities have no fact yet** instead of the
   head. Only a rival enrolment of the same account can write them (and the same command ID is recovered, not
   doubled). Up to three tries, each first looking the command up. [corrected after the review] The rival's record was
   not recovered when it landed inside this enrolment's walk: the walk refused it ("Unclassified native writer left the
   joined source open", F6; 111 of 300 races). The walk now accepts a commit with this account's own enrolment command
   ID, and the enrolment then recovers it (0 of 300 refused).
2. **The walk also accepts the account's own subject saves.** A held enrolment reads no subject data: its census is the
   subject IDs of the held source (`placementId(0 .. people - 1)`), the genesis and pages are built from those IDs, and
   nothing evaluates a world. A save of one of its subjects during enrolment is simply a save before its first
   Publish, which evaluates subjects at its own position. A commit that writes the account's documents or metadata
   names still stops the enrolment.
3. A namespaced account only (the option is ignored for the single-account layout, which must enrol at the seed's cut).

## 7. Options, the retry rule, and what is unchanged

| Option | Default | With it |
| --- | --- | --- |
| `TX2_PUBLISH_BESIDE=1` | off: the whole-head rule | A held account's (owed) Publish commits with the account guard of section 3; the marker carries `precondition: "account"`; up to three tries, each planned afresh; a whole-head marker is read as before. Not applied to non-held stores (their Publish stays on the head rule). |
| `TX2_ENROL_BESIDE_SAVES=1` | off: as before | SCALE2's walk, plus the account's own subject saves accepted, plus the guarded enrolment record (section 6). |
| `DX_ACT8_UNPAUSED=1` (runner) | off: the held runner pauses and drains saves around each Publish | The held windows publish with saves running; nothing pauses or drains. |
| `DX_ACT8_GATE=1` (runner, diagnostic) | off | The held runner runs this builder's gate parts instead of the windows. |
| `DX_ACT8_INJECT=read-cut` (diagnostic only) | off | Settlement evaluates at the read position `p` instead of the effective cut: the wrong rule, to show the checks catch it. |
| `TX2_ACCOUNT_KEYS=1` [after the review] | off: command IDs as before | A namespaced held account's joined and definitions command IDs carry the account (F1, F2, section 0.1); old `joined:<id>` records are read and accepted only if they wrote this account's documents. |
| `TX2_SETTLE_FRAME_GUARDS=1` [after the review] | off: the control cached 250 ms, frames unguarded on control and tail | Every settlement frame reads the control at its read position and is guarded on it; a values frame is also guarded on the notice tail (F4, F5). After a pause is acknowledged no frame of the account commits. |
| `TX2_LEDGER_CAP_AT_PUBLISH=1` [after the review] | off: such a release is acknowledged and its ledger refused later | A release whose notice ledger one subject could not be written with is refused at Publish, before any write, with the count and the limit (F3). |
| `DX_ACT8_ADV_OWN` (gate) [after the review] | 23.5: the publishing account's save tape runs in the adversarial window | 0: as the gate before the review. |
| `DX_ACT8_PARTS=restart` (gate, diagnostic) [after the review] | not in the default parts | The transactor and the write gateway restarted inside a Publish and a settlement (section 0.5). |
| `DX_ACT10_STACK=1` (the held runner, diagnostic) | off | The review's stack checks (X1 to X4, P1 and S2 under each precondition), holder DX-ACT8 or DX-ACT10. |

**Retry rule.** A refused try is a `Conflict` (the tail's `TripleLive`, the calendar's `EntityState` or the
transactor's revision check). The next try looks the command ID up (a try that landed is recovered), reads the head
again and plans again. Three tries, then the existing error. The removal ticket's refusal is `ErasureChanged`, which
ends the Publish as before (the client publishes again).

**Unchanged with the options off:** the marker, event, retry count and every check of a whole-head Publish; the
deadline path, `schedule`, saves through `JoinedAccount` and non-held Publishes keep the head rule even with the option
on.

<!-- RESULTS -->

## 8. The runs (toy stack in the lab VM; counts exact, Mac times diagnostic)

Every gate below ran on the held toy stack (`engine.mjs ha1 --experiment load-fair --diagnostic --holder DX-ACT8`, one
ordinary heavy token per run, no measurement lease): one database holding ten accounts of 8 deep subjects; account 0
publishes (its first release is the runner's R1 from nothing). The saves are the held tape: account 0 at its own rate
and the nine others at their usual load (211.5 per second together), one commit per subject's save, open loop. The
oracle for every read, change and notice is the generator plus every acknowledged save and every adversarial write,
folded release by release in order; the independent form rule (`form-expect.ts`) checks every form-adding release.
**Every counted run started the image built from this branch, and only that one.** The shared harness starts the
newest engine-built image in the lab VM, which during this work was another builder's gateway: every run made here
before this was found (13 toy runs, and the two miniature runs, which started the shared tag
`tx2-datomic:1.0.7745-da00`) began on one of five images built from other sources (section 14 lists them); none of
those runs is counted. So this branch builds a
private Java 21 image from its own checkout (`engine.mjs build --lane datomic --holder DX-ACT8 --variant-receipt
<receipt>`, private tag `tx2-dxact8-jre21:<inputs>`, no shared build event, the shared tags untouched), and the harness
under `DX_DATOMIC_IMAGE_RECEIPT=<receipt>` starts only that image by its ID and refuses to start when the checkout's
Datomic sources (gateway, configuration, codec) differ from the image's. Each run's `image.json` records the ID it
started; a read-only recorder also logged the image ID of every running container of each run from the VM itself.
Runs (private evidence `evidence/DX-ACT8/`, section 14):

| Run | What | Commit | Image started (ID) | Result |
| --- | --- | --- | --- | --- |
| `G1r` | every gate part: cost, beside, adversarial, kill, live, enrol | `722ef2f5a` | `a87bf58bf20c` | **pass** |
| `G1` | the same | `813264dac` | `a87bf58bf20c` | every part passed; the final ledger check then stopped at a fault of the gate itself (it read the ledgers in parts as whole ones; fixed in `722ef2f5a`, rerun as `G1r`) |
| `W1`, `W2`, `W3` | the held runner's eight windows with no pause: account guard; whole-head rule; account guard with the large release by reference | `813264dac` | `a87bf58bf20c` | **pass** (`W2`: the refusals of section 9.2) |
| `R1`, `R2`, `R3` | options off: the held default campaign, ACT5's live cases, ACT6's gate | `813264dac` | `a87bf58bf20c` | **pass**, every count as published (section 9.1) |
| `G3` | negative control: settlement at the read position (`DX_ACT8_INJECT=read-cut`) | `813264dac` | `a87bf58bf20c` | **caught**: stopped at the first Publish with a save between its read and record (section 9.4) |
| `M2r` | the many-accounts miniature, both options on (section 9.5) | `4d01710e3` | `a87bf58bf20c` | **pass** |
| `M3` | the miniature on a protected database, with the removal step last (`DX_SCALE2_REMOVAL=1`) | `cacdf65c9` (code as `ba9b13724`) | `a87bf58bf20c` | **pass** (section 9.4); three earlier attempts stopped at a read race and at the removal's effect on settlement, which the final step records |
| `G2` | a removal on request on the held toy (database protected before its load) | `169de51a3` | `a87bf58bf20c` | the load refused (`ErasureFrontierUnavailable`): that stack has no shared removal directory; not a result (section 13) |
| 15 earlier runs: a shake-out, the gate in two halves, the held windows, the options-off reruns, a removal and a negative control, two miniature runs (`M1`, `M2`), and three that stopped at faults of the gate itself | the same checks, on earlier commits | `34273617e` to `1966682b7` | five images built from other sources | **not counted** (section 14) |

**Runs after the review** (on the image built from `43472352c`, `sha256:98c95f37c42ebb36f6f4a729f52d7b54388ec150740f4c03d26e01aca5ecf4db`,
tag `tx2-dxact8-jre21:7c2e1c12509ecb67`; the Datomic sources of every run commit equal the image's, checked before each
run; each run's `image.json` and the VM's own container list name that ID for every container but PostgreSQL's).
"Fixes on" is `TX2_ACCOUNT_KEYS=1 TX2_SETTLE_FRAME_GUARDS=1 TX2_LEDGER_CAP_AT_PUBLISH=1`:

| Run | What | Commit | Result |
| --- | --- | --- | --- |
| `Sfix` | the review's stack part (`DX_ACT10_STACK=1`), fixes on | `653a17183` | **pass**: X1 to X4 publish in both accounts, X2's own reuse refused; P1 0 frames after the pause under both preconditions; S2 `superseded` under both (section 0.1) |
| `Soff` | the same, options off | `653a17183` | the review's faults, as it found them: X1 the first's receipt, X3 and X4 refused, P1-progress 1 frame after the pause, S2-progress `stored` |
| `G1f` | every gate part, fixes on (with F7's widened adversarial window) | `59995bd36` | **pass**: `beside` 2 of 2 refused under the whole head; 16 of 16 landed under the account guard, one try each, commits between read and record 0 to 89 (up to 12 of the account's own), every settled count as section 9.3 (39 / 7; 474 / 160 with 8 / 474 / 160; 4,740 / 1,600 with 8 / 4,740 / 1,600 at 200 forms in parts; by reference 474 / 160), first correct inside one second 16 of 16; adversarial 26 steps, the publishing account's tape on at 23.5/s: 11 kinds at both points (the 9 subject facts but the form answer, which the tape writes, plus a child file linked by reference and a reference removed), each write strictly between read and record, one try each, every change, notice, ledger and pinned read exact; the second Publish refused once each time as designed; the two enrolments of other accounts beside it; kill 5 of 5 with one record each; live: 0 frames while paused, 26 paced frames at least 300 ms apart, the second release supersedes the first inside its split first subject (362 of its 364 changes stored, each the oracle's) and settles 3,270; enrol 7 of 7 at one try, each 474 / 168; at the end 6,764 notices in order and 8 ledgers in parts equal to the oracle; 553 positions and 4,424 pinned reads between reads and records, 105 racing saves |
| `G1f2` | the same with the independent rule narrowed only for the release after an adversary's write | `dbc1f3c09` | **pass**, every count as `G1f` (adversarial 26 steps, each narrowed for at most the one subject written in that step, every other subject and every later release strict; live: superseded inside the split first subject, 362 of 364; enrol 7 of 7, 474 / 168 each; 6,764 notices, 8 ledgers; 543 positions and 4,344 pinned reads; 97 racing saves), except that one small Publish at 39.4/s again needed a second try after "Datomic transaction was rejected" (as in `Goff`; follow-up 7) |
| `G1f-first` | the same | `653a17183` | every part up to `live` passed; `live` stopped at the gate's own check of the superseded release (it expected whole subjects; with the frame guards a superseded release can stop inside a split subject, F5's consequence); check fixed in `b2ae7b32b`, rerun as `G1f` |
| `G3f` | negative control, settlement at the read position, fixes on | `653a17183` | **caught**: "stored changes differ from the oracle for release 2 (read 11, record 31)" |
| `W1f`, `W3f` | the held runner's eight windows with no pause, the account guard, fixes on; `W3f` the large release by reference | `653a17183` | **pass**: 8 of 8 Publishes at one try each, inside one second; commits between read and record 0, 0, 0, 0 at 3.5/s and 38, 13, 29, 10 (`W1f`) and 42, 13, 33, 20 (`W3f`) at 23.5/s; every probe, deadline read and reopened pin exact; 0 of 7,632 saves refused |
| `R1b`, `R2b`, `R3b` | options off: the held default campaign, ACT5's live cases, ACT6's gate | `653a17183` | **pass**, every count as published (section 9.1) |
| `Goff` | every gate part, options off (with F7's widened adversarial window) | `653a17183` | **pass**: cost as section 10; `beside` 2 of 2 refused under the whole head, 16 of 16 landed under the account guard with every settled count as section 9.3 (one try each but one: a small Publish at 39.4/s refused once with "Datomic transaction was rejected", a gateway refusal whose code the run did not record, planned again and landed at its second try; every check exact; cause not found, follow-up 7); adversarial 26 steps (11 kinds at both points, the second Publish refused once each time as designed, two enrolments), every one exact; kill 5 of 5 with one record each, 436 changes each; live: pause 0 frames offered while paused, 26 paced frames at least 300 ms apart, the second release supersedes the first; enrol 7 of 7 at one try, each 474 / 168; at the end 6,764 notices in order and 8 ledgers equal to the oracle; 547 positions and 4,376 pinned reads between reads and records, 129 racing saves |
| `Gres-first`, `Gres2` | the gate part `restart`, fixes on | `59995bd36`, `ca3c34182` | stopped at the part's own waits: the first at a step after the `afterRead` restart that met a peer not yet at the restarted transactor ("Error communicating with HOST ... PORT 4334"; the run did not record which step), the second at the settlement after the `frame` restart for the same reason (the two Publish cases had passed); the part now runs such a step again while it fails only on transport (`95c836459`) |
| `Gres3` | the same | `95c836459` | the three transactor cases passed (section 0.5); stopped at the first write-gateway case (its host port moved) |
| `Gres4` | the same, the transactor only | `4e2811bb5` | **pass**: the three transactor cases (section 0.5), 328 notices in order and 8 ledgers equal to the oracle |
| `M2f` | the many-accounts miniature (section 9.5), both options and the fixes on | `59995bd36` | **pass**, with `M2r`'s counts: 50 of 50 Publishes offered at once landed at one try, 0 refused (17 / 43 / 67 commits between read and record); 10 of 10 late enrolments (the head moved 152 to 217 commits during each); 2,367 saves in 323 accounts, 0 refused; 24,713 pinned and 24,363 current reads exact (526,006 rows); 2,343 of 2,343 saves in the feed once, in order; 29,820 changes and 10,605 notices settled for the 50 (121 value and 462 notice frames, 0 refused), 862 / 82 for the late 10; every subject of the 570 accounts read at the end |
| `Cell` | ACT9's removal cell on the merge with the account tickets, fixes on (section 0.3) | `9481d33f6` (scratch), image `9b98c6a511ef` | **pass**, section 0.3 |

**Runs after the second review:** section 0.13 (the same image, `98c95f37c42e`).

## 9. Gates

### 9.1 Gate (a): every option off, every existing count unchanged

Every option off (`TX2_PUBLISH_BESIDE`, `TX2_ENROL_BESIDE_SAVES`, `DX_ACT8_UNPAUSED`, `DX_ACT8_GATE`, `DX_ACT8_INJECT`,
`DX_SCALE2_REMOVAL` unset), on this branch's image:

| Check | Run | Count with the options off | The same count published before |
| --- | --- | --- | --- |
| The held runner's default campaign (`DX_ACT3_HELD=1`, eight windows, paused, settlement on) | `R1` | 86 changed values and 8 notices equal to the oracle; 8 of 8 Publishes landed at one try with first answers exact; both reopened pins exact; 0 read failures; no save refused | 86 changed values and 8 notices equal to the oracle, 8 of 8 first answers, 2 reopened pins (`PART9.md`, `LARGE-RELEASE.md`) |
| ACT5's live settlement cases (`DX_ACT5_LIVE=1`: quiet, own23, others under the head precondition; quiet-p, own39-p, others-p, second-p, multi-p under the progress precondition) | `R2` | every case exact: the large release 474 changes and 160 notices (independent rule 8 / 474 / 160) in each of the six single cases; second-p: the 150-form release superseded at 1 subject (420 changes, 1,200 notices) then the second release 3,555 changes; multi-p: 3 accounts, each 474 / 160 (8 / 474 / 160); 2,328 notices delivered once, 0 twice; every save acknowledged | the same (`SETTLEMENT-LIVE.md` section 9: C1 to C5) |
| ACT6's release-limits gate (`DX_ACT6_GATE=1`, all parts, 200 forms) | `R3` | the ledger in parts at 200 forms: 72 subjects, 4 stops (1 inside a ledger's parts), notices 14,400 / 7,200 / 21,672 equal to the oracle, delivered 21,672 then 0, 2 parts per ledger, independent rule 72 / 42,720 / 14,400, 76 value and 510 notice frames under 8,000 µs; the definitions table: full documents 619,097 and 938,509 B at 0.25 MiB, 1,233,297 B then refused over the 1 MiB value at 0.50 MiB, refused at 1.0 and 1.25 MiB; by reference 3,532 to 3,547 B at every size | the same (`RELEASE-LIMITS.md` sections 2.3 and 3) |
| The settlement-frames check at 256 subjects (`frames-check`, no stack) | `checks/frames-check-256-default` | every row's frames, splits, changed values and notices identical | ACT6's table |
| Unit tests of the held join (`actv-lazy/join/*.test.ts`) | Mac | 31 of 31 | — |

**After the review** (runs `R1b`, `R2b`, `R3b` on `653a17183`, image `98c95f37c42e`; the code those runs execute is the
same at the final head, which changed only the gate and a test since): every count above again, exactly: R1 86
changed values and 8 notices, 8 of 8 Publishes at one try and inside one second, 2 reopened pins, 0 read failures, 0 of
7,632 saves refused; R2 474 / 160 (8 / 474 / 160) in each of the six single cases, second-p superseded at 1 subject
(420 changes, 1,200 notices) then 3,555, 2,328 notices delivered once and 0 twice; R3 72 subjects, 4 stops (1 inside a
ledger's parts), notices 14,400 / 7,200 / 21,672, 2 parts per ledger, the independent rule 72 / 42,720 / 14,400, 76
value and 510 notice frames, the definitions table 619,097 and 1,233,297 B then refused over the 1 MiB value, 3,532 B
by reference. The review's fuzzer with every option off, 5,000 schedules (seeds 10,000 to 14,999): 0 violating (the
earlier rules' checks; F5's counts are reported, not violations, without its option: 512 and 515).

With the options off nothing in the record, the retry count or the checks of a Publish changed; the head-rule frame
refusals in ACT5's head cases (for example 100 value-frame and 117 notice-frame refusals in own23) vary from run to run
with the saves' timing, as they did there, and every settled count is equal.

### 9.2 Gate (b): no pause, the whole-head rule: the refusals

- **Gate part `beside`, case `head-small`** (runs `G1r` and `G1`): account 0 saving 23.5 per second and the nine others
  at their load (1,880 saves in 8 s, all acknowledged), two Publishes of the small release offered with nothing paused:
  **2 of 2 refused**, "Joined command exhausted three serial predecessor attempts" (each after about one second of three
  tries). Nothing was written; the oracle and the runner's release list are unchanged.
- **The held runner's own windows with no pause, the whole-head rule** (run `W2`: `DX_ACT8_UNPAUSED=1`, eight windows):
  at 23.5 saves per second **4 of 4 Publishes refused** ("Joined command exhausted three serial predecessor
  attempts"), recorded with each window, which went on; at 3.5 per second (only the publishing account saves) 4 of 4
  landed, as predicted (a try is refused only when one of 3.5 saves per second falls in its read-to-commit window).
  Every read check exact; no save refused.

### 9.3 Gate (c): no pause, the account guard: Publishes beside saves, exact

**Gate part `beside`** (run `G1r`; the first own-image run `G1` gave the same counts, its commits between read and
record differing by timing). Each case runs a save
window and offers its Publishes inside it with nothing paused; each Publish: the first correct answer (unpinned reads
until the basis reaches the record, checked against the oracle), the deadline reads at one second (four subjects,
checked against the release in force at their basis), the oracle fold, then settlement beside the saves (byte frames,
the progress precondition) checked against the oracle and, for a form-adding release, the independent rule. After the
window: the journal between each Publish's read and its record, every read pinned at every position from just before
the read to just after the record (all 8 subjects), and every save of account 0 whose life overlapped a Publish's.

| Case | Saves (account 0 / nine others), all acknowledged | Publishes offered / landed / refused | Tries each | Commits between read and record (of them account 0's saves) | Settled per Publish: changes / notices (independent rule: owing / changes / notices) |
| --- | --- | --- | --- | --- | --- |
| small, 23.5/s + others | 282 / 2,538 | 3 / 3 / 0 | 1, 1, 1 | 63 (11), 158 (0), 37 (0) | 39 / 7 each |
| large, 23.5/s + others | 282 / 2,538 | 2 / 2 / 0 | 1, 1 | 27 (1), 57 (5) | 474 / 160 (8 / 474 / 160); back: 474 / 0 |
| small, 39.4/s + others | 473 / 4,255 | 3 / 3 / 0 | 1, 1, 1 | 75 (10), 69 (10), 116 (16) | 39 / 7 each |
| large, 3.5/s, account 0 only | 35 / 0 | 2 / 2 / 0 | 1, 1 | 1 (1), 1 (1) | 474 / 160 (8 / 474 / 160); back: 474 / 0 |
| large, the nine others only | 0 / 2,115 | 2 / 2 / 0 | 1, 1 | 21 (0), 50 (0) | 474 / 160 (8 / 474 / 160); back: 474 / 0 |
| 200 forms and 200 policies (ledger in parts), 23.5/s + others | 329 / 2,961 | 2 / 2 / 0 | 1, 1 | 21 (2), 137 (14) | 4,740 / 1,600 (8 / 4,740 / 1,600); back: 4,740 / 0 |
| large by reference (`TX2_RELEASE_DOCS=ref`), 23.5/s + others | 282 / 2,538 | 2 / 2 / 0 | 1, 1 | 60 (11), 63 (6) | 474 / 160 (8 / 474 / 160); back: 474 / 0 |
| **All guarded cases** | **18,628 saves, none refused** | **16 / 16 / 0** | **1** | **1 to 158 (up to 16 of the account's own)** | **every stored change, notice and ledger equal to the oracle; 0 frames refused** |

**Between the read and the record** (all 47 Publishes of the gate run): every read pinned at every position from just
before each Publish's read to just after its record, all 8 subjects: 544 positions, 4,352 reads, each equal to the
oracle's answer under the release in force there (the previous release up to `q - 1`, the new one from `q`). **Racing
saves of the same account** (every save of account 0 whose send-to-acknowledgement overlapped a Publish's
read-to-record): 126, of which 110 landed before the Publish's record and 16 after; each one commit, none refused or
replayed, and a read pinned at its receipt answered under the release its position implies (126 reads). **The
journal** between each read and record held exactly the commits counted above, each once, in position order, and the
Publish's own four changes at `q`. All 6,602 notices of account 0's releases in order and its 8 ledgers (in parts)
equal to the oracle at the end.

Every first-correct answer and every deadline read was exact. Diagnostic only (the Mac, other builders' stacks):
first correct 0.12 to 1.22 s for the inline releases (12 of 14 inside one second), 1.45 and 0.40 s for the
by-reference release (whose first Publish also writes the definitions ahead); these are Mac clocks under load and not
results.

**The held runner's own windows with no pause** (run `W1`: `DX_ACT8_UNPAUSED=1 TX2_PUBLISH_BESIDE=1`, the toy's eight
windows, barrier 6 and rolling 6 at 3.5 and 23.5 saves per second, two Publishes per Publish window): **8 of 8
Publishes landed, 0 refused, one try each**; commits between a Publish's read and its record 0, 0, 0 and 0 at 3.5/s
(only the publishing account saves there, 3.5 per second), 49 and 15 (barrier) and 53 and 20 (rolling) at 23.5/s;
every first-correct probe, every deadline read and both reopened pins equal to the oracle; 0 read-check failures, 0
missing reads, 0 visibility failures, 0 missed deadlines; 0 of 7,632 saves refused. Diagnostic: first correct 94 to
702 ms, 8 of 8 inside one second.

**The same windows with the large release stored by reference** (run `W3`: as `W1` plus `TX2_RELEASE_DOCS=ref` and
`DX_ACT3_RELEASE=forms=20,policies=20,permille=1000`; each record 3.7 KB): **8 of 8 landed, 0 refused, one try each**;
commits between read and record 0, 0, 0, 0 at 3.5/s and 36, 14, 65, 19 at 23.5/s; every probe, deadline read and
reopened pin exact; 0 of 7,632 saves refused. Diagnostic: first correct 98 to 546 ms.


### 9.4 Gate (d): the adversarial schedule

**Gate part `adversarial`** (run `G1r`; the same 24 steps passed in `G1`). The nine other accounts save throughout (one save in five of their usual
tape, about 42 per second, so a 150-second window stays light on the toy); account 0's subjects are written only by the
adversary, through a second store (a second client). Each step publishes the next release (the large one, or back to
the base) with a hook that commits a write of subject X **between the Publish's read and its commit**, either after the
plan's last read and before its transaction begins (`afterRead`) or inside its transaction after the snapshot and
before the guards are read and the operations sent (`inside`); the gate checks that the write landed strictly between
the read position and the record, then settles the release beside the saves and checks every stored change and notice
against the oracle, and reads every subject pinned at every position from just before the read to just after the
record. For each step the gate also asks the oracle whether settling at the read position (the wrong rule) would have
given X different stored changes.

| Fact the rules read (written to subject X) | `afterRead`: tries / commits between read and record (X's write always among them) / settled changes, notices | `inside`: the same | Would settling at the read position have given X different stored changes (`afterRead`, `inside`) |
| --- | --- | --- | --- |
| start date | 1 / 19 / 456, 160 | 1 / 10 / 436, 0 | yes, yes |
| pay rate | 1 / 3 / 436, 161 | 1 / 6 / 436, 1 | no, no |
| weekly minutes | 1 / 10 / 436, 160 | 1 / 10 / 436, 0 | no, no |
| background check | 1 / 15 / 436, 160 | 1 / 10 / 436, 0 | no, no |
| state minimum wage floor | 1 / 10 / 436, 161 | 1 / 9 / 436, 1 | no, no |
| local minimum wage floor | 1 / 12 / 436, 160 | 1 / 10 / 436, 0 | no, no |
| I-9 section 1 | 1 / 10 / 436, 160 | 1 / 10 / 436, 0 | no, no |
| document expiry | 1 / 10 / 436, 161 | 1 / 10 / 436, 1 | no, no |
| a form answer | 1 / 1 / 436, 160 | 1 / 10 / 436, 0 | no, no |
| a form revision | 1 / 8 / 436, 160 | 1 / 10 / 436, 0 | no, no |

**20 of 20 steps: the write landed strictly between the Publish's read and its record, the Publish landed at its first
try, and every stored change, notice, ledger and pinned read equal to the oracle** (which folds X's write before the
record). The `afterRead` steps publish the large release (20 forms), the `inside` steps go back to the base; a notice
count of 161 or 1 is the oracle's own extra notice for X's new value (a pay rate under the floor, an expired document).
Only the start date changes which policies a subject owes under these releases, so only there would the wrong rule
have stored different changes for X; that is the case the negative control uses.

**The wrong rule is caught.** Run `G3`: the same part with settlement deliberately reading at the Publish's read
position (`DX_ACT8_INJECT=read-cut`, diagnostic only), the start-date kind only. **The gate stopped at the first such Publish**: "stored changes differ from the oracle for
release 2 (read 11, record 31)". Subject X (`pl:s00000001`), whose start date was written between position 11 and 31,
had 58 stored changes worked out from its world before the write (forms due 2026-11-04) where the oracle has 40 from its
world at the record (due 2026-10-14, from the new start date); the other 7 subjects were equal. So settling at the
effective cut `q - 1` is what makes the stored values right, and the checks see the difference.

**A second Publish of the same account in the window** (both windows): the hook publishes another release of account 0.
Both times the inner Publish landed first and **the outer one was refused once and landed at its second try**, planned
afresh on top of the inner one: after the plan's reads by the tail's `TripleLive` check ("Expected live triple ...,
but another transaction changed it", read inside its transaction); when the inner Publish landed after the outer one's
snapshot, by the transactor at its serial cut (the tail and the release entity had a newer revision: `CasConflict`,
reported as "Datomic source changed while staging the transaction"). Both halves of the guard fired once each. Each
outer record landed one position after the inner one and both releases settled exactly (436 changes, 160 notices
each). This is the only refusal the account guard gave in the whole gate (2 refused tries of
57).

**An enrolment of another account in the window** (both windows: `account-009` and `account-010` enrolled from inside
account 0's Publish, 4 enrolment commits each between its read and its record): **account 0's Publish landed at its first
try both times**, settled exactly; the two accounts' own Publishes and settlement then ran in the gate part `enrol`.

**Kills at every step** (gate part `kill`, runs `G1r` and `G1`; account 0 saving 23.5 per second and the nine others at one in
five, throughout). The Publish runs in a child process killed after the plan's last read, inside its transaction after
the snapshot, right after the native acknowledgement, and twice at a random moment after the child's store is open; the
runner then offers the same Publish again with the same command ID. **Every kill left exactly one record for the
command ID**: killed after the read and inside the transaction (before the commit), nothing landed and the second
offer landed at its first try; killed right after the acknowledgement, the record was there and the second offer
recovered it by its command ID (no second record); at a random moment, in `G1r` both children finished before their
timers (recovered), in `G1` one was killed before its commit (the second offer landed) and one finished. Every one of
those releases settled exactly (436 changes; 160 notices for each form-adding one).

**A removal on request in the window** (the miniature's removal step, run `M3`; the held toy's stack cannot hold a
protected database, section 13). The miniature's database was declared protected for `:person/note`
before its first save, so every Publish, enrolment and settlement frame of the run carried a real removal ticket; all
of its checks of section 9.5 passed with the same counts as `M2r` (50 of 50 Publishes at once landed at one try, 0
refused; 10 of 10 late enrolments; 2,367 saves, 0 refused; 15,953 pinned and 15,724 current reads exact; 29,820 changes
and 10,605 notices settled, 0 frames refused; 862 / 82 for the late accounts; every feed entry and final read exact).
Then, last, two steps:

| Step | Protected value saved / removed (removal sequence) | First offer | The same command offered again | Then that account's settlement |
| --- | --- | --- | --- | --- |
| a value under the publishing account's own names | 4,224 / 4,225 (0 to 1), between the Publish's read and its commit | **refused** at its first try: `ErasureFrontierChanged`, "Discard the old protected input cut" | read at 4,225, **landed at 4,226**, first try | refused: "Recorded notices belong to an earlier removal sequence" |
| a value under another (thin) account's names | 4,227 / 4,229 (1 to 2), the same | **refused** the same | read at 4,229, **landed at 4,230**, first try | refused the same |

and an account that published and settled before both removals and took no part in them (`account-013`): **reading
its recorded notices was refused** ("Discard the old protected input cut"). So under the database-wide removal
sequence: the account guard does not hide a removal (the Publish carries its ticket and is refused, as the whole-head
rule would have refused it), the republish lands at once, and one removal on request anywhere stops every account's
recorded notices, which is the coupling the per-account removal rule exists to remove (section 15, first follow-up).
The three earlier attempts (`M3-first` to `M3-third`) stopped at, in order: a pinned read at a receipt the read
gateway had not reached (a race of the miniature's own reader on the loaded Mac; the final run waits for it and needed
0 waits), the settlement refusal above when the live accounts settled after the removals, and the refusal to read
recorded notices when the checks ran after them; the final run puts the removals last and records those refusals.

### 9.6 Gate (g): settlement beside saves and the release limits, with nothing paused

**Gate part `live`** (run `G1r`; ACT5's pause and second-release cases, now with the Publish itself beside saves;
account 0 at 23.5 per second, the nine others at one in five):

- **Pause and pace:** the large release (17.2 KB record) landed at its first try with 19 commits between read and
  record; settlement was paused (0 frames offered while paused), then paced (26 frames, none closer than 300 ms), then
  released; 436 changes and 160 notices, the independent rule 8 / 436 / 160; first correct inside one second.
  [corrected after the review] "0 frames offered while paused" counts frames offered after the worker saw the pause; it
  does not show that no frame commits after the pause lands. Without `TX2_SETTLE_FRAME_GUARDS` one can under the
  progress precondition, and the 250 ms cache lets more through under both (F4: 2 and 5 in the review's P1b). With the
  option none can (section 0.1).
- **A second release in the middle of settlement:** the 150-form release (102.7 KB record) landed with 30 commits
  between; after its settlement had written 2 subjects the base release was published (39 commits between, one try);
  the first release's values stopped at subject 2 (`superseded`) and the second settled 3,270 changes, 0 notices; every
  value, notice and ledger equal to the oracle.

**The release limits beside saves:** the 200-form, 200-policy release with the ledger in parts and the large release by
reference are cases of gate part `beside` (section 9.3: 4,740 / 1,600 and 474 / 160, one try each), and the held
runner's windows by reference are run `W3`. Options off, ACT5's and ACT6's own gates are `R2` and `R3` (section 9.1).

**Gate part `enrol`** (run `G1r`; the toy's own form of gate (f)): without `TX2_ENROL_BESIDE_SAVES` an enrolment beside
saves is refused ("Unclassified native writer left the joined source open"); with it, 7 accounts (`account-002` to
`account-008`) enrolled one after another while every account saved, **each at its first try**; each then published R1
and the large release beside the saves (**one try each**), and all 7 settled at once through one queue: **each 474
changes and 168 notices** (8 for R1, 160 for the large release), the independent rule 8 / 474 / 160, each against its
own oracle.

<!-- GATES -->

### 9.5 Gates (e) and (f): many accounts publishing at once, and enrolment, beside saves (the miniature)

`scale2/mini.sh` (its own toy stack in the lab VM, one heavy token), with `TX2_PUBLISH_BESIDE=1`,
`TX2_ENROL_BESIDE_SAVES=1`, `DX_SCALE2_LIVE_AT_ONCE=1` (new: the live Publishes are offered all at once),
`DX_SCALE2_THIN=500`, `DX_SCALE2_PUBLISH=60`, `DX_SCALE2_LIVE_PUBLISH=50`, `DX_SCALE2_LATE=10`, and SCALE2's other options
on (`TRIPLEX_DATOMIC_SHARED_AGENT=1`, sweep gates evicted). One database: 570 accounts (10 deep, 60 publishing, 500
thin; 16,387 subjects, 237,356 facts). The 50 publishing accounts were enrolled and settled their first release before
the window; during the window (40 s of tape, stretched to 229 s by the Mac) every account saved (40 per second spread
by size, a busy deep account at 15 per second, a quiet thin account at 2 per second), six readers checked every answer,
a feed follower checked every save, then 3 s in **all 50 accounts offered their large release (20 forms, 20 policies)
at the same moment**, and from 2 s in **10 further accounts were enrolled** one after another, each publishing and
settling its first release. Afterwards each account's release was settled and checked against the oracle and the
independent form rule, one account at a time. Run `M2r` (on this branch's image): **pass**, with the same counts as the
first passing run `M2` (which had started the shared tag's image and is not counted).

| Count (exact) | M2r: 570 accounts, both options on |
| --- | --- |
| Publishes offered at once / landed / refused / tries per Publish | 50 / **50** / **0** / 1 each |
| Commits between a Publish's read and its record (min / median / max) | 38 / 72 / 103 (the other 49 Publishes and everyone's saves) |
| Late enrolments beside the saves / succeeded | 10 / **10** (the head moved 156 to 224 commits during each, all accepted by the walk; no transport retry) |
| Saves acknowledged / refused | 2,367 / 0 (323 accounts touched) |
| Pinned / current reads checked against the oracle; rows compared | 23,933 / 23,572; 509,198 |
| Feed: saves found once, at their receipt position, in order | 2,343 of 2,343 |
| Final read of every subject in every account (rows) | 175,472 in 570 accounts |
| Settled changes / notices of the 50 accounts, equal to the oracle and the independent rule | 29,820 / 10,605 (value frames 121, notice frames 462, 0 refused) |
| The same of the 10 late accounts | 862 / 82 |

The 50 accounts' settled totals are exactly SCALE2's (F1 and F2: 29,820 / 10,605 with 121 + 462 frames), where the same
releases were published into a paused database. Diagnostic only (the Mac, five other builders' stacks): the 50
Publishes offered at once were acknowledged 2.2 to 5.1 s after the offer, one after another in the one writer; the
40 s window's tape took 126 s.

**An earlier attempt (`M1`, on another image, not counted) stopped at its own check**: the 50 Publishes again all landed with one try each,
but one of the ten late enrolments failed with "Gateway deadline exceeded" (the HTTP client's request deadline on the
loaded Mac, a transport failure, not a refusal: the guard never ran). The miniature now runs such an enrolment once
more (enrolment and Publish are idempotent by command ID) and records the first error; `M2` and `M2r` needed no
retry.

**Without the options** the same Publishes are refused: SCALE2's F0 (3 of 3 refused, "Joined command exhausted three
serial predecessor attempts") and F1 / F2 (late enrolment refused 3 of 3) on this miniature; not rerun here.


## 10. What a Publish costs, under each rule

Measured by the gate's `cost` part (run `G1r`), with no saves running so the whole-head rule lands too: the same
releases published under each rule, two Publishes per row (the second goes back to the base release). Datoms and the
gateway's transact time come from the commit reply as the client received it; the journal entry is the transaction's
own entry as the feed returns it; the writer estimate is the bulk writer's own formula (`frameEstimate`: 3.5 ms + 45 µs
per row + 70 µs per KiB of wire) applied to the record's operations. "Calls" counts the HTTP requests of the commit
(begin, guard reads, transact, receipt).

| Release (documents) | Rule | Changes | Operation bytes | Datoms | Journal entry bytes | Writer estimate (µs) | Calls | Retries | Guarded |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small (inline) | whole head | 4 | 4,849 / 4,817 | 35 | 11,821 / 11,768 | 6,395 / 6,388 | 5 | 0 | the whole database (scope-wide) |
| small (inline) | account | 4 | 4,881 / 4,849 | 35 | 11,863 / 11,828 | 6,401 / 6,395 | 6 | 0 | tail (`TripleLive`), calendar (`EntityState`), 3 written entities revision-checked |
| large: + 20 forms, 20 policies (inline) | whole head | 4 | 17,175 / 10,914 | 35 | 27,695 / 19,777 | 8,923 / 7,639 | 5 | 0 | the whole database |
| large (inline) | account | 4 | 17,207 / 10,946 | 35 | 27,738 / 19,820 | 8,929 / 7,645 | 6 | 0 | as above |
| small (by reference) | whole head | 4 | 3,565 / 3,565 | 35 | 10,016 / 10,017 | 6,132 / 6,132 | 5 | 0 | the whole database |
| small (by reference) | account | 4 | 3,598 / 3,598 | 35 | 10,062 / 10,062 | 6,138 / 6,138 | 6 | 0 | as above |
| large (by reference) | whole head | 4 | 3,702 / 3,567 | 35 | 10,175 / 10,152 | 6,160 / 6,132 | 5 | 0 | the whole database |
| large (by reference) | account | 4 | 3,734 / 3,599 | 35 | 10,201 / 10,194 | 6,166 / 6,139 | 6 | 0 | as above |

**What the account guard costs over the whole-head rule:** 32 bytes in the record (`"precondition":"account"`), the
same 35 datoms, 26 to 46 bytes of journal, 6 µs of the writer's estimate, and **one more HTTP call** (the calendar's
row read inside the transaction). The transactor's revision check is per entity in the transaction's set, three for a
Publish, instead of one comparison of the head. What it saves is every refusal, every retry and every pause (sections 9.1
to 9.5).


## 11. The server run (for the day a machine is rented; nothing here has run)

Two parts. Both from a clean clone at `$COMMIT` (the head of `exp/DX-ACT8-publish-beside-saves` carrying this page),
built as for `PART9.md`. Predictions written before any run; every Mac time in this page is diagnostic and none is
used below as a server figure.

### 11.1 The Publish windows at 100,000 subjects, everyone saving, no pause

The held runner on the fresh SCALE1 template (as `LARGE-RELEASE.md` section 7; each arm its own fresh prepared copy,
about 4.4 minutes). The windows are the existing twelve (barrier 6 and rolling 6; 3.5, 23.5 and 39.4 saves per second
in the publishing account with the nine others at their usual load in the 23.5 and 39.4 windows; 20 Publishes per
Publish window, one every 5 s); `DX_ACT8_UNPAUSED=1` removes the pause and drain around each Publish.

```sh
common=("PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" "DX_ACT3_SETTLE=0" "DX_ACT8_UNPAUSED=1")
args=("$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL")
# Arm A: the account guard, small release, all twelve windows (about 30 min)
sudo env "${common[@]}" TX2_PUBLISH_BESIDE=1 bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh "${args[@]}" "$OUT/A"
# Arm B: the whole-head rule, no pause, the three rolling Publish windows only (about 13 min)
sudo env "${common[@]}" "DX_HELD_WINDOWS=rolling6/3.5/1,rolling6/23.5/1,rolling6/39.4/1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh "${args[@]}" "$OUT/B"
# Arm C: the account guard, the large release (20 forms, 20 policies), all twelve windows (about 32 min)
sudo env "${common[@]}" TX2_PUBLISH_BESIDE=1 "DX_ACT3_RELEASE=forms=20,policies=20,permille=1000" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh "${args[@]}" "$OUT/C"
```

**Predictions, arm A (the account guard, no pause, small release)** and what shows each wrong. The basis: the
record is 4.9 KB and four changes (toy, section 10); the writer applies one commit at a time; S1's server ladder put a
26 KB commit at 3.9 ms of serial apply; bench 4 at 25,000 subjects gave first answers of 19.83 / 36.72 ms (p50 / p99)
at 3.5 saves per second with the pause.

| Quantity | 3.5/s (publishing account only) | 23.5/s (235 saves/s in all) | 39.4/s (394/s) | Shows it wrong |
| --- | --- | --- | --- | --- |
| Publishes refused | 0 of 20 per window | 0 of 20 | 0 of 20 | any refusal (a guard fired on a save or another account) |
| Commits between a Publish's read and its record (p50 / max) | 0 / 1 | 3 to 10 / 30 | 5 to 15 / 50 | 0 at 23.5 or 39.4 (the Publish did not run beside saves), or over 200 |
| Publish acknowledgement p50 / p99 | 10 to 25 / 25 to 60 ms | 15 to 40 / 50 to 150 ms | 20 to 60 / 80 to 300 ms | p50 over 2 times arm B's whole-head acknowledgements at 3.5/s (the guard costs more than its one read) |
| First correct answer p50 / p99 | 20 to 60 / 50 to 150 ms | 30 to 100 / 80 to 350 ms | 40 to 150 / 120 to 700 ms | p50 over 150 ms at 3.5/s, or any Publish not correct within 100 s |
| First correct inside one second | 20 of 20 | 20 of 20 | 19 to 20 of 20 | fewer than 19 at 23.5 |
| Neighbours' save p99 against the same window without Publish | within 1.1 times (each Publish adds one 5 KB commit to the writer every 5 s) | within 1.1 times | within 1.15 times | over 1.25 times and over 50 ms (the quiet-account bar) |
| The publishing account's save p99 against control | within 1.1 times | within 1.1 times | within 1.15 times | as above |
| Racing saves refused or replayed | 0 | 0 | 0 | any |
| Exactness (probes, deadline reads, reopened pins) | every one equal to the oracle | the same | the same | any difference |
| Visibility failures (probe before the read gateway has the Publish; PUBLISH-STOP.md) | 0 to 3 per rolling window, as with the pause | the same | the same | many more than with the pause (this change moved the read gateway's lag) |

**Arm B (the whole-head rule, no pause):** refused Publishes 0 to 1 of 20 at 3.5/s (only the publishing account
saves, 3.5 per second: a try is refused when one save lands in its read-to-commit window of about 30 ms, so all three
tries about once in a thousand), at least 19 of 20 at 23.5/s and 20 of 20 at 39.4/s (a 30 ms window with 235 or 394
commits per second is empty about once in a thousand). Shows it wrong: fewer than 15 of 20 refused at 23.5/s.

**Arm C (the large release, 17.2 KB record):** as arm A, acknowledgement and first answer +1 to +6 ms; settlement is not
run in these windows (`DX_ACT3_SETTLE=0`; its time beside saves is ACT5's server run). Shows it wrong: p50 more than
10 ms above arm A at the same rate and mode.

### 11.2 The many-accounts rungs: 200 and 500 accounts publishing at once beside saves

`scale2/server.sh` (SCALE2 section 8) on the sealed 1 billion cluster, with the two new rungs: every publishing account
publishes its large release during the window, all at once, under the account guard; 10 more accounts enrol during
the window (`TX2_ENROL_BESIDE_SAVES=1`, already on in that script).

```sh
sudo env DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" \
  bash lab/experiments/EXP-DX1/scale2/server.sh /var/tmp/act8-many 1k-live 10k-live
```

**Predictions** (the burst: every publishing account offers its Publish at the same moment, 3 s into the window; 49
saves per second spread over every account, a busy deep account at 8/s and a quiet thin account at 1/s, throughout):

| Quantity | 1k-live (200 accounts at once) | 10k-live (500 at once) | Shows it wrong |
| --- | --- | --- | --- |
| Publishes refused | 0 of 200 | 0 of 500 | any |
| Late enrolments (10) | 10 of 10 | 10 of 10 | any refused |
| Publish acknowledgement after the burst starts: p50 / p99 / last | 0.2 to 0.6 / 0.4 to 1.2 / 0.5 to 1.5 s | 0.4 to 1.2 / 1.0 to 2.5 / 1.2 to 3.0 s | the last over 3 s (200) or 6 s (500): a Publish costs the writer more than about 5 ms, or the plans' reads (about ten per Publish) queue on the gateways |
| Acknowledged inside one second of the offer | 180 to 200 of 200 | 200 to 400 of 500 | fewer than 150 of 200 |
| Quiet thin account's save p99 over the window against the alone baseline | inside 50 ms or 1.25 times | the same | outside both |
| Saves delayed by the burst | saves sent during the burst wait behind up to 200 records: max 0.3 to 1.5 s, inside the p99 (the burst is under 1% of a 600 s window) | max 0.6 to 3 s | p99 outside the bar |
| Every settled change, notice and ledger of every publishing account, every read and feed entry | equal to the oracle | equal | any difference |

**The finding these rungs exist for:** the guard removes the pause and the refusals, but the records still go through
one writer one at a time. 10,000 Publishes an hour is 2.8 a second, which the writer absorbs (about 1.4% of it at 5 ms
each); 500 at the same instant take one to three seconds to land, so "inside one second" holds per Publish only when
bursts stay under about 200. A Publish to every account at once needs either the release stored once (SCALE2 P3) or the
records grouped into fewer commits.

### 11.3 Durations and cost (USD 1.09 per machine hour)

| Step | Time | Cost |
| --- | --- | --- |
| Fetch the SCALE1 template and build (if the machine is fresh; RUN2's figures) | 25 to 50 min | USD 0.45 to 0.90 |
| 11.1 arm A (prepared copy 4.4 min, boot and checks 4, enrolment and first Publish 2, twelve windows of 100 s 20, reopen 1) | about 32 min | USD 0.58 |
| 11.1 arm B (three windows) | about 14 min | USD 0.25 |
| 11.1 arm C (twelve windows, large release) | about 34 min | USD 0.62 |
| 11.2 1k-live (SCALE2's 1k rung, 22 to 41 min) | 22 to 41 min | USD 0.40 to 0.75 |
| 11.2 10k-live (SCALE2's 10k rung, 32 to 76 min) | 32 to 76 min | USD 0.60 to 1.40 |
| **All on one machine that has both the SCALE1 template and the sealed 1 billion cluster** | **about 2.2 to 3.3 h, plus setup** | **USD 2.45 to 3.60, plus 0.45 to 0.90** |

## 12. What the earlier Publish results (made with the pause) still support

Every Publish number before this page (bench 4, run 1 and 2 of `LARGE-RELEASE.md`, "100 of 100" and "120 of 120
inside one second at 100,000 subjects", the release-limits and settlement-live toy runs) was measured with the save
sender paused and drained around each Publish, under the whole-head rule.

**Still supported:**

1. **Exactness of the record and of every read and settled value.** The record is the same four changes (one field
   and one flag differ, section 4), reads work the answer out the same way, settlement writes the same values (at the
   effective cut, which under the whole-head rule was the same position).
2. **The record's size and its writer cost** (5 KB small, 17 KB large, 3.5 KB by reference; the toy cost table in
   section 10 shows the same bytes under both rules).
3. **The read path before settlement and its cost**, and the settlement frames' cost and bounds: neither depends on
   which rule committed the record.
4. **First-correct times at 3.5 saves per second in the publishing account** as an estimate: the pause there drained
   at most a few in-flight saves, so the writer was nearly as idle as it is now.

**Not supported:**

1. **That a Publish lands at all while saves run.** Under the whole-head rule it does not (SCALE2 F0: 3 of 3 refused;
   here, every unpaused Publish under the old rule refused at 23.5 saves per second). Every earlier "N of N inside one
   second" was a Publish into a stopped database.
2. **First-correct and acknowledgement times at 23.5 and 39.4 saves per second as product numbers.** They included the
   drain (the wait for in-flight saves) and then a writer with nothing else to do. Without the pause there is no drain,
   but the Publish's commit queues in the one writer behind the saves sent before it. Neither is an upper or lower
   bound on the other; arm A of section 11.1 measures it.
3. **Neighbours' save p99 in Publish windows.** The pause held every account's saves for the length of each Publish
   (the "gate hold", tens of milliseconds per Publish), so the earlier windows' save p99 against control charges the
   Publish with a stop the product never has. Without the pause a Publish costs the writer one record (section 10).
4. **"10,000 Publishes an hour" as minutes of stopped saves.** SCALE2 estimated 5 to 10 minutes of whole-database
   pause per hour from the pause; without it there is no pause; what remains is the records' writer time.

**Results on other images.** The 15 runs this lane made before it pinned its image (section 8) started gateways built
from other branches' sources; they support nothing here. Every count in sections 9 and 10 comes from a run that
started `a87bf58bf20c`, built from this branch. The earlier pages' own toy results (ACT5, ACT6, SCALE2) were made by
their builders through the same shared harness; whether each started its own branch's image is for those pages to
show (their evidence lists the image ID each run started).

## 13. Not verified

- **Nothing at full size, nothing on a server.** Every count is from the toy (8 subjects per publishing account, ten
  accounts; the miniature's 570 accounts); every Mac time is diagnostic (the lab VM was shared with five other
  builders' stacks throughout). Section 11 carries the server predictions.
- **The guard's argument for the release list (R2)** rests on the list of its writers in a held account (a Publish, a
  deadline with a scheduled release, `schedule`): a new writer of the release list alone would need to add the release
  entity to the guard. The transactor's revision check covers the release entity from the transaction's begin to its
  serial cut in every case; the gate's second-Publish cases exercise both halves.
- **Deadlines and `schedule` in a held account keep the whole-head rule** (held accounts have none today: their
  calendar is empty and the held runner never schedules). Beside saves they would be refused as Publishes were.
- **Non-held stores** keep the whole-head rule for Publish (their plan reads subject data in the stored, envelope and
  staged modes, which the account guard does not cover).
- **The read gateway's lag after an acknowledged Publish** (PUBLISH-STOP.md) is unchanged by this work and not measured
  here beyond the runner's existing visibility records.
- **Datoms per Publish** come from the commit reply as the client saw it; the storage bytes per Publish (PostgreSQL's
  write-ahead log) were not measured beside saves (they cannot be told apart from the saves' bytes there).
- **A removal on request ran in a Publish's window only in the miniature** (`M3`, after the save window, with no
  settlement frame in flight). The held toy stack gives its two gateways no shared removal directory, so a protected
  database cannot be loaded there at all (the fixture load is refused with `ErasureFrontierUnavailable`; run `G2`,
  `169de51a3`); the miniature's stack shares one (`DX_XQ3_ERASURE_DIRECTORY=1`). A removal while settlement frames of a
  protected database are in flight, and the per-account removal ticket (section 15), were not run.
- **Several settling processes** and **several publishing hosts** for one account: a second Publish of the same account
  was exercised from the same process (inside the first's window) and from a killed child process, not from a second
  host running concurrently for minutes.

## 14. Evidence and the image each run started

Private evidence, `evidence/DX-ACT8/archives/` (each archive holds the run directory and its logs). Every row below
started image `sha256:a87bf58bf20cb16e88601c733669557c9015e66ce778c2125d9744738560e655` (tag
`tx2-dxact8-jre21:c94ac8671abd108d`, built from `813264dac`, Datomic sources `cc2cad4930bb88fc...` equal to every run
commit's, checked before each run), as each run's own record says (`image.json`, or `config/java-image.txt` for the
miniature) and as the VM's own container list said while it ran.

| Run | Archive | sha256 |
| --- | --- | --- |
| `G1` | `G1-d56a51ab.tar.gz` | `803f5a039e616d404c0a05783198f96c93198a57ebdbce96d94454feb3bfaa9a` |
| `R2` | `R2-3cc44954.tar.gz` | `7bf31c7c01d578132a44d99ba04269c2559533f8f6cbc59417339059ef0cbf0f` |
| `W1` | `W1-caa2a7ee.tar.gz` | `68d34473e6ccb5e092ee445e60770beaad3e027b23b6c86a95680336a295c767` |
| `W2` | `W2-75014f3a.tar.gz` | `7e24e7f5186b039572c4e32ad485509c971eb357a24100b6e3fb4abdaa6907cf` |
| `W3` | `W3-e9ad48d8.tar.gz` | `2068e48c960a54a8dc6d380a3d5687cf35237f6654598287804ef3c04b47c89f` |
| `G1r` | `G1r-8a11a3dc.tar.gz` | `1d9c5044de513c0364eed04aa8c1c57dc2c85ed666af52297a83cb5f8e850997` |
| `R1` | `R1-3b92a167.tar.gz` | `79bd5ec831b7ca1d78466bb0950416eefa2f02dd77f51338061a80d7fdfdf6b0` |
| `R3` | `R3-6e92e917.tar.gz` | `4767c5d7a74797cc427a87e21b9bb4b0409ef0cd45da9028bfcf7bbdcf641a18` |
| `G2` | `G2-d7f0d7ac.tar.gz` | `62e3b4c190d1192a2f63afe07f08f52ff6ff262f1b19ecfc38b76e7121aa5057` |
| `G3` | `G3-ab57e96f.tar.gz` | `ff2a1cb3cf171ca925d0a4799109dbc50d7e4088c4ce9bb9d0ef95eb3406b39a` |
| `M2r` | `M2r.tar.gz` | `a5a8bb4a1e8c5bb9f0b0ce470fa1ef66111e45e57bbdd7148b8c2e6a66726c1b` |
| `M3-first` | `M3-first.tar.gz` | `7228274170d89a2c722e4eaf6b0e7980ff28586f9d23baa3ce961ad44e346832` |
| `M3-second` | `M3-second.tar.gz` | `27c897d48d78047d105973ae77f3f3ebd21e2fac155b770f13524c0471e448b2` |
| `M3-third` | `M3-third.tar.gz` | `8dfc92521ee7f0d9857e307ca63db7c25a3bd942659c5a242a8c15a5cf7167ea` |
| `M3` | `M3.tar.gz` | `eae7029192e8743f92d009694ea22a3242ca23fe803702243792bf8905a2f08e` |
| the 15 runs on other images (section 8), with their logs | `foreign-image-runs.tar.gz` | `2d5db3b1fb17577284fb5b0d2a5c62aa1104949b81ac2042699f12ded61272f5` |

**After the review.** Every row below started `sha256:98c95f37c42ebb36f6f4a729f52d7b54388ec150740f4c03d26e01aca5ecf4db`
(tag `tx2-dxact8-jre21:7c2e1c12509ecb67`, receipt built from `43472352c`; Datomic sources `6da365971c5f00d6...` equal to
every run commit's, checked before each run) except `Cell`, which started
`sha256:9b98c6a511ef8b6264ed03ce57400689f6eeef3b742504a4f51ca95807c1e09c` (tag `tx2-dxact8-jre21:f323f50c55c6d011`,
built from the scratch merge `9481d33f6`); each run's own record and the VM's container list name the same ID.

| Run | Archive | sha256 |
| --- | --- | --- |
| `Sfix` | `Sfix-cc56472f.tar.gz` | `87f7177d07db4e8e189621ab7d04c3ed68f690b5e7611480c24225c31ea9c9d5` |
| `Soff` | `Soff-4a9477c2.tar.gz` | `93126b5581904ca38d9da240c9156764f25a4478d24e1fef163056393839425f` |
| `G1f-first` | `G1f-first-f23f29a3.tar.gz` | `3b430c56224d5d23e24031b684fab370ce6b819f323b1472a2dcf84ee467fceb` |
| `G1f` | `G1f-1f830317.tar.gz` | `2ae5154ff91cb702ff669458e90a4a6b39f05d732018d0e8537c93e5e383dce7` |
| `G3f` | `G3f-f3097fb4.tar.gz` | `67720f5e56cf21e4ce1464e859f33959f638f4a68e257cdb702aff285172e8fb` |
| `W1f` | `W1f-f0048cc2.tar.gz` | `48d8fdcec6172e6bc68e5842888ac634ef5dafe1e76f11707fa526f81706e25a` |
| `W3f` | `W3f-01a30910.tar.gz` | `d3fd90bce12ba3c83c352b1221f99ab91caa367008808ba81ea156d0b0bd73f3` |
| `R1b` | `R1b-57b1e2c5.tar.gz` | `7bb4abab32ee4d2d9aa5d73ab47e96712a4c9390b2347cfdb3186f65fda9e938` |
| `R2b` | `R2b-139ae55d.tar.gz` | `f39bc6bb8b085f91dfd791e535eedd23374ebcea288780d297e1465e61bdcf3b` |
| `R3b` | `R3b-95f9a23c.tar.gz` | `b151957711c866d0b7a36d342e3fb85e1d8b92899fb41f35c8cdbaf365e76517` |
| `Goff` | `Goff-9f4d60d3.tar.gz` | `205a7f008274e20256a2d42b8c964f1f74457e4545118cdb8571e6e873206122` |
| `Gres-first` | `Gres-first-a8e3edc8.tar.gz` | `71d05fa85dd9e745cae6957aa8930501a979f5d50d078e61fdfb29442260b93a` |
| `M2f` | `M2f.tar.gz` | `a1b32506c1c4905d494ba53b86d9dd6e2f8d86e717e470ed4a1a606559d8db58` |
| `Cell` | `Cell-9481d33f6.tar.gz` | `1e2ea2b4f02952a25d1f2e0cda248f168af837bf30ebd25a26e86ee7e4453006` |
| `G1f2` | `G1f2-4a74057c.tar.gz` | `b03a2956f76ea7cbd7815ee88f73d69a6b243b7b2adfe334b1b339dbd2046b3e` |
| `Gres2` | `Gres2-57d04346.tar.gz` | `27165e315ca63fee1790ee06ac11539df2673515f2f9f921726a4d9dd05c494e` |
| `Gres3` | `Gres3-26e2fd51.tar.gz` | `8e9f022de0e1e157c46b43dde6fb087fc51aa1d4e48d8d14dc189d526f2a178f` |
| `Gres4` | `Gres4-d2825d2d.tar.gz` | `b7b35dfa52979420e5634626bcaf78e83c617075ad2c91864db12cd02959c2de` |

**After the second review.** Every row below started `sha256:98c95f37c42ebb36f6f4a729f52d7b54388ec150740f4c03d26e01aca5ecf4db`,
as each run's `image.json` says and, for every run from `G4` on, as the VM's own container list said for every
container but PostgreSQL's (the recorder started after `S4`).

| Run | Commit | Archive | sha256 |
| --- | --- | --- | --- |
| `S4-first` | `8218b4300` | `S4-first-c9f59210.tar.gz` | `d0ce27c855fff140c34d19729e1a52f097080776df44807dd873faa8b1ebec53` |
| `S4` | `73f1d98a6` | `S4-cc31fcfc.tar.gz` | `ca0caf47df59b6eeb5ccbc66899321cdcdcd0c63f9d29c366cfb1523ecef7573` |
| `G4` | `73f1d98a6` | `G4-a848e851.tar.gz` | `3cae4785d160324b63d05c45969b84fcc4eb082cb55d673338c7593e481b5949` |
| `G4grp` | `73f1d98a6` | `G4grp-93fc7911.tar.gz` | `3a4bf007ce042ff9356cffbd3effc6a8256ef2dc48b842f893a25c07d0e665c5` |
| `G4grpc` | `73f1d98a6` | `G4grpc-ca03da8b.tar.gz` | `f81a6fa7736646940f2f7661070f8c0e822a6d28ef6f60306411224e3fd67bcf` |
| `G4k` | `73f1d98a6` | `G4k-290fffd3.tar.gz` | `6d0fc194c03348d70aebf448e744959b88b690697006f0db0dc5844d44289e14` |
| `G4res` | `73f1d98a6` | `G4res-464f57b4.tar.gz` | `373ac2aed32a72ae64a22aad0d16730f54b8f46d623481cf179d2bcaa865ddf4` |
| `G4res2` | `2abece6fa` | `G4res2-c73e74ce.tar.gz` | `0b152a4b67f6d0614455ff1ded8c1f0790ff343c0b6a8ace6118fdf83e1835fc` |
| `G4neg` | `73f1d98a6` | `G4neg-8912e90e.tar.gz` | `13f54edb6f19fafff8b67a1006bb0c5c47947dbf56aa9b7101dba31db9b22b43` |
| `W4` | `73f1d98a6` | `W4-0dd5dbc7.tar.gz` | `ff4d17df775b050f02a6955428713cf72e0d60fe134b8aedea36c99878ea9ba0` |
| `R1c` | `73f1d98a6` | `R1c-fab7deac.tar.gz` | `6a84211aa91f8a52513d9caad93c1c85006cd50178f4fc0ec3e407e169a9791a` |
| `R2c` | `73f1d98a6` | `R2c-c63b8503.tar.gz` | `26996c48c2118c31b37115245941377036624f3a8c6b8920ec2cc39d4bef94e1` |
| `R3c` | `73f1d98a6` | `R3c-769a5214.tar.gz` | `b742c6038f3f1dcd9a9bb03abce0b54e192a4686e8771f327c7e6d14da578cdc` |
| `G4off` | `73f1d98a6` | `G4off-89b95f71.tar.gz` | `075a8f43f864fb0c755c50a3ec90e8d30aca6681ae4a24c36bef865562358f9f` |
| `G4res3` | `805214785` | `G4res3-8a3cf0cd.tar.gz` | `d1cb1e2a43f6a61445f56a56fff6f3ecbc57717458bc897dd463ca70f3d96227` |
| `G4off2` | `2abece6fa` | `G4off2-0040dfe8.tar.gz` | `4a7e47ea349e6c41a3c5e170f9ff1cee6bfc483a50182dee1f1492516bf7cc8f` |
| `G4off3` | `f34694edf` | `G4off3-2b6af953.tar.gz` | `008b39fa4aae4c17ea415c6dab9a10fe3712c6b0bce5fb3cd52d8a3a5adfd907` |
| `Goffctl` | `653a17183` | `Goffctl-82461071.tar.gz` | `eab316a755fb4e211a686747569c45d0a7fdaf6f0441b2f906d141a6cc8e43e7` |
| `G4off4` | `f34694edf` | `G4off4-87c36009.tar.gz` | `09c8649a535a3b6f5193a4b756d83a88794f121840872d6667d9aa3b8b2294cc` |

In process after the second review, `agents/DX-ACT8/act10/r2/`: `repro-before.log` (the review's 18 tests reproducing
every fault before any change), `tests-3.log`, `tests-4.log` and `tests-join-4.log` (the test phase at `8218b4300` and
`81ba9e81e`), `fuzz/` (both campaigns' logs, JSON and the commit each ran at; `first-8218b4300/` the earlier all-on
step), `g4grpc-causes.jsonl` (each landed Publish's Datomic t and its neighbours'), `g4res-restart-partial.json` and
`g4res2-restart-partial.json` (the restart cases recorded before each stop).

In process (no stack), private evidence `agents/DX-ACT8/act10/`: `repro-before.log` (the review's 16 tests before any
change), `tests-after.log`, `final/` (the test phase, typecheck and head at `59995bd36` and `eca2e81d1`), `fuzz/` (every
fuzz run's log and JSON, with the commit each ran at), `compose/` (the in-process checks on the merge with the tickets).

The five images those 15 runs started: `d6008c8d52dd`, `4fbfd98a5490`, `90d3ccd615de`, `fd497d71a313` (the shared
harness's newest build event at the time) and `21a67288007d` (the shared tag `tx2-datomic:1.0.7745-da00`, the
miniature's default). The settlement-frames check (`checks/frames-check-256-default.json`) runs no stack.

## 15. Follow-ups

0. **[after the review] Built elsewhere and composed:** follow-up 1 below was built on `exp/DX-ACT9-account-tickets`
   (`c2aa3d416`); section 0.3 has the merge with this branch and its runs.
1. **Pass the account through the removal ticket (first follow-up).** With the per-account removal rule
   (`TX2_REMOVAL_PER_ACCOUNT`, `exp/DX-ERA2-removal-per-account` `272a1bd66`, its page section 7) a held account's
   Publish, enrolment and settlement frames would be refused only by removals in their own account. Not built here: the
   helpers that take the account (`readErasure(source, account)`, `recheckErasure(source, sequence, account)`,
   `withErasure(sequence, work, sourceDatabase, accounts)`) and the gateway route and ticket header they use
   (`erasure-frontier?account=`, the ticket's account list, `removal_scope.clj`) exist only on that branch, which is not
   merged here; on this branch the change would not compile, and with only the call sites it could not be gated. The
   change, once both branches meet, guarded by `TX2_REMOVAL_PER_ACCOUNT=1` on the client (and a no-op on a database
   without the per-account policy, where ERA2's helpers fall back to the database-wide answer):

   | Where (this branch) | Today | With the account |
   | --- | --- | --- |
   | `account.ts` 802, `readErasure(this.s.comp)` before a Publish | database-wide sequence | `readErasure(comp, account)`; the marker's `erasureSeq` stays the database-wide sequence |
   | `account.ts` 814, `withErasure(sequence, ...)` around the Publish command | database-wide ticket | `withErasure(sequence, work, undefined, [account])` |
   | `account.ts` 970 (the plan) and 675 (`marker()`, every reader of a marker) | `recheckErasure(comp, sequence)` | `recheckErasure(comp, sequence, account)` |
   | `archive.ts` 265, 422, 452, 508, 607; `recorded.ts` 156, 368, 388; `staging.ts` (stage records keep `erasureSeq`) | database-wide | the same two changes with the frame's account |
   | `bulk.ts` 68, the frames' ticket | `withDatomicErasureSequence(seq, invoke, false, database)` | the frame's account as the ticket's account list |

   Gate (the miniature's removal step, `DX_SCALE2_REMOVAL=1`, section 9.4): in a protected database with the
   per-account policy, a removal in another account between a Publish's read and its commit lets the Publish land at
   its first try, and an uninvolved account's recorded notices stay readable and its settlement goes on; a removal in
   its own account refuses the Publish and the republish lands; on a database without the policy every case refuses,
   as `M3` recorded; every count of section 9 unchanged with the option off. What the removal's own account then does
   with its recorded notices (they may hold the removed value) is the removal rule's question, not the Publish's.
2. **Deadlines and `schedule` beside saves** (section 13): the same guard (tail, calendar, written entities) would
   apply; not needed by held accounts today.
3. **Many Publishes at the same instant** (section 11.2): the records go through the one writer one at a time; a burst
   to every account needs the release stored once or the records grouped.
4. **[after the review] Command IDs the API's client chooses** (section 0.2): a save's command ID, and on the removal
   branches a removal's, are unique in the whole database, so one account's ID refuses another's (409, never a wrong
   acknowledgement). Scope the claim by account where the API knows the caller's account (for example
   `<account>/<id>` in `:triplex.claim/command-id` for a write whose entities are all in one account's namespace), with
   the old form still read, as `TX2_ACCOUNT_KEYS` does for joined commands.
5. **[after the review] The enrolment walk beside a removal** (section 0.3, found by DX-ACT9): with
   `TX2_ENROL_BESIDE_SAVES`, an enrolment whose walk meets a removal's transaction stops (the feed reader rejects the
   removal entry, or the walk's position check fails). Two ways: read the walk's window with a reader that decodes
   removal entries and accept a removal that touches none of the account's documents; or drop the walk under the option,
   since the enrolment record is now guarded by `EntityState` on its own entities and the census pages and genesis are
   created only if absent (the walk would then only be the runner's ledger check). Gate: ACT9's cell with its two late
   enrolments, which fail today in both arms.
6. **[done after the second review: runs `G4grp` and `G4grpc`, section 0.4]** **[after the review] Group commit with a Publish in a group** (section 0.4): a gate with the write gateway's
   `TX2_GROUP_COMMIT=1` (the held runner sets 0 for `load-fair`; an option to set it for the diagnostic gate only), counting
   the groups that hold a Publish and a save (the reply's `groupSize`) and checking every read pinned inside each such
   group. Until then do not run `TX2_PUBLISH_BESIDE` with group commit.
7. **[after the review] Record the gateway's code for a refused guarded try.** A guarded Publish's refused try is
   classed as a conflict whenever the head moved (`store.ts` `rejectUnrecordedWrite`), which under saves is always, so
   the gate records only "Datomic transaction was rejected" (`DatomicStorageAdapter.ts` 525) and not the code under it.
   Runs `Goff` and `G1f2` each had one such try, both in the case with the publishing account saving 39.4 per second
   and only saves between the Publish's read and its record (`G1f` had none); the retries landed and every check
   passed. It is not the record clock (with server-assigned record time the gateway raises no clock conflict,
   `commit.clj` 309-312). Keep the native code in `beside.causes`, find which check refuses, and either guard it or
   show it cannot change an answer.
8. **[done after the second review: the ledger mode is stored with the account's settings, 0.8]** **[after the review] Store the ledger mode with the account.** `TX2_NOTICE_LEDGER` is read by each process; the
   Publish-time cap (`TX2_LEDGER_CAP_AT_PUBLISH`) and the settlement must agree on it. Write the mode into the account's
   settlement control (or the enrolment) and have both read it there.
9. **[after the review] A gateway restart on a stack.** Publish the toy stack's gateways on fixed host ports in a
   diagnostic mode (as the HA drills do) and run the `restart` part with `DX_ACT8_RESTART_ROLES=active,write`.
   [done after the second review: `DX_ACT8_FIXED_PORTS=1` for holder DX-ACT8, run `G4res3`, section 0.13. The write
   gateway's restarts failed no commit there: requests sent during its stop completed. A stop that refuses a commit in
   flight (a killed gateway, `docker kill`) is not run.]
10. **[after the second review] The account as an authority for a Publish's command ID (R3, learn and deny).** Merge the
    save line's account claims (`exp/DX-S6-save-line-fixes` `a6d02225c`, `TX2_ACCOUNT_CLAIMS`, `account_claims.clj`)
    and extend the gateway's rule that takes a write's account from the entities it writes (`account_claims.clj`
    `account-of-id`) to `lazy/account/(releases|origin|clock|mask|cursor)/<account>`, with `notice:v1:` entities counted
    as journal entities (section 0.9). The join store is opened with `claimAccount` set to the held account; its claim
    is stored as `acct-id/v1/<n>/<account>/<id>`, and a lookup by command ID answers only that account. One mechanism with the save line's; the join layer's `joined:v2/...` form stays only
    so two accounts do not collide by accident. Needs a gateway change and its own image. Gate: S1 and S2 of
    `review2.test.ts` on a stack (another account can neither read nor take the ID), and the isolation fuzzer.
11. **[after the second review] Remove retired ledger items, so the cap bounds the ledger in force (R10).** Build
    `RELEASE-LIMITS.md`'s deferred retraction of old ledger parts: once no reader needs a retired notice policy's items
    (every event that could deliver them recorded), a settlement frame retracts them. Then the cap can bound the items
    in force plus what one release adds, and an account that renames its policies every year has no lifetime limit.
    Gate: C5 with yearly renamed packages past 1,650 distinct policies, every notice and ledger equal to the fold.
12. **[after the second review] Optional: close the old-build window without the rollout order (0.8).** A transition
    could also rewrite the progress rows of releases and events still in progress, so that an old build's frame planned
    before it fails its progress guard. Not built: the rollout order closes the window with no code, and the first
    frame of a release has no progress row to rewrite.

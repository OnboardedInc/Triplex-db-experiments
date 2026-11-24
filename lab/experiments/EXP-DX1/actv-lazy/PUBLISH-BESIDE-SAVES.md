# A Publish and an enrolment beside every account's saves (`TX2_PUBLISH_BESIDE`, `TX2_ENROL_BESIDE_SAVES`)

Builder DX-ACT8, 2026-11-24, branch `exp/DX-ACT8-publish-beside-saves` from `exp/DX-SCALE2-wide-thin` (`3e3e652b9`) with
`exp/DX-ACT6-release-limits` (`b0529e87d`) merged in (no conflicts). All accounts stay in one Datomic database. Mac
work is correctness at toy size; every Mac time is diagnostic, every count exact. Nothing here ran on a server. Every
option is default off; with nothing set every existing path is unchanged.

Sections 1 to 6 are the design, written before any code. The results follow from section 7.

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

**Why the whole head guarded all of them.** It was the one guard that covers everything at once: if nothing at all
committed between the read and the commit, nothing read can have changed. It was never about subject data (R11: none
is read) and never about other accounts (nothing a Publish reads lives outside its own account's names, documents and
the database's removal sequence).

## 3. The narrower guard for each read

| # | Read | Guard under `TX2_PUBLISH_BESIDE=1` | Why it is exact |
| --- | --- | --- | --- |
| R1 | Notice tail | **The existing one**: the record retracts the tail row it read, with a `TripleLive` precondition | Checked twice: inside the transaction at its own begin (`TriplesLive`: a retract of a row no longer live with a `TripleLive` precondition fails with `TransactionConflictError`), and by the transactor at its serial cut (the `live` ids). So any other event of the account between `p` and the commit refuses this one. The tail is the account's own sequence: one row, advanced by every event. |
| R2 | Release list | **The transactor's revision check** on the release entity, which the record writes (every written entity joins the transaction's entity set: `DatomicStorageAdapter`, `state.entities.add` on every assert), covering the transaction's begin to its serial cut; between `p` and the begin, **R1 and R5** | Every writer of a held account's release list also writes the tail (a Publish; a deadline that activates a scheduled release) or the calendar (`schedule`). A future writer of the release list alone must add the release entity to the guard. Rejected: an `EntityState` guard on the release entity, which re-reads every marker ever published with its documents inside each Publish (with full documents up to megabytes; `controls(p)` already reads them once). |
| R3, R4, R8 | Enrolment, census, origin | **None** | Written once by the enrolment, which completes before any Publish (`meta(p)` asserts it exists); the census pages and the genesis are created only if absent; nothing retracts them. Read at `p`, they are the same at the commit. |
| R5 | Calendar | **New: an `EntityState` guard** on the calendar document (its one live row, or none) | One row; read inside the transaction at its begin and revision-checked at the serial cut, so a deadline added between `p` and the commit refuses this Publish and the retry processes the deadline first, as the whole-head rule would have. |
| R6 | Business clock | **None** | A held Publish's record does not depend on it: `at` must equal the enrolment's valid time whatever the clock says, and the notice plan checks valid time against the tail (R1). |
| R7 | Removal marks | **None** | Not an input of an owed record; never written in a held account. |
| R9 | Definitions | **None** | Content-addressed (key = SHA-256 of the node), created only if absent, never retracted: stored at `p` means stored at the commit. |
| R10 | Removal sequence | **The existing removal ticket, unchanged** | `withErasure(sequence)` makes the transactor compare the database's removal sequence at its serial cut, independent of the head rule. A removal between the read and the commit refuses the Publish (the plan's `recheckErasure` throws `ErasureChanged` on the next try); the client publishes again. Only in a database with a removal policy; without one no removal can run. |
| R11 | Subject data | **None** | Not read. |
| R12 | Held writer check | Runner only. In the unpaused mode the Publish checks the positions whose receipts it already has; every position is checked at the end of each window and case. | The product has no ledger; the runner's full check still covers every position. |

**So the whole guard is four checks in the one commit: the account's own notice tail (existing), its calendar (one
new `EntityState`), the transactor's revision check on what the record writes, and the removal ticket (existing).** No
other account's commit can fail the first three: other accounts' saves, Publishes, enrolments and settlement frames
write other entities. The only commits that refuse a Publish are this account's own other events (another Publish, a
deadline, a scheduled release) and, through the fourth, a removal on request.

**The removal marks under this rule (the fourth check).** In a database with a removal policy the Publish reads the
database's removal sequence before it plans (`readErasure`), checks it again in the plan (`recheckErasure`), stores it
in the marker (`erasureSeq`), and commits inside `withErasure(sequence)`: the transactor refuses the record if any
removal was published after that sequence. Today that ticket is database-wide, so **a removal of a protected value of
any account, between a Publish's read and its commit, refuses the Publish**; the client publishes again (the
miniature's removal step, section 9.4). The settlement and the recorded notices carry the same database-wide sequence,
so after a removal anywhere an account's notice recorder refuses to go on ("Recorded notices belong to an earlier
removal sequence") and reading its recorded notices is refused ("Discard the old protected input cut") (runs `M3-second` and `M3-third`).
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
  (up to three tries, as before). A save of any account never causes a retry. Nothing is replayed: the retry plans
  afresh from the account's state, and a Publish that did land is recovered by its command ID.

## 6. Enrolment beside saves (`TX2_ENROL_BESIDE_SAVES=1`)

A held account's enrolment (`installHeld`) writes the census pages and the notice genesis (already entity-guarded:
each created only if absent), walks the journal between its start and its last check, then commits the enrolment
record (origin, `join-meta`, empty calendar, baseline clock) with `expected` = the head. SCALE2 built the walk half:
with the option a commit that touches none of the account's documents or metadata names is accepted. Finishing it:

1. **The enrolment record commits with `EntityState` guards that its four entities have no fact yet** instead of the
   head. Only a rival enrolment of the same account can write them (and the same command ID is recovered, not
   doubled). Up to three tries, each first looking the command up.
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
| `M3` | the miniature with the removal step (`DX_SCALE2_REMOVAL=1`) | `722ef2f5a` | `a87bf58bf20c` | in progress at this commit |
| `G2` | a removal on request on the held toy (database protected before its load) | `169de51a3` | `a87bf58bf20c` | the load refused (`ErasureFrontierUnavailable`): that stack has no shared removal directory; not a result (section 13) |
| 15 earlier runs: a shake-out, the gate in two halves, the held windows, the options-off reruns, a removal and a negative control, two miniature runs (`M1`, `M2`), and three that stopped at faults of the gate itself | the same checks, on earlier commits | `34273617e` to `1966682b7` | five images built from other sources | **not counted** (section 14) |

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
protected database, section 13): the step ran in three earlier attempts (`M3-first` to `M3-third`); its final run is in progress at this commit.

### 9.6 Gate (g): settlement beside saves and the release limits, with nothing paused

**Gate part `live`** (run `G1r`; ACT5's pause and second-release cases, now with the Publish itself beside saves;
account 0 at 23.5 per second, the nine others at one in five):

- **Pause and pace:** the large release (17.2 KB record) landed at its first try with 19 commits between read and
  record; settlement was paused (0 frames offered while paused), then paced (26 frames, none closer than 300 ms), then
  released; 436 changes and 160 notices, the independent rule 8 / 436 / 160; first correct inside one second.
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
| the 15 runs on other images (section 8), with their logs | `foreign-image-runs.tar.gz` | `2d5db3b1fb17577284fb5b0d2a5c62aa1104949b81ac2042699f12ded61272f5` |

The five images those 15 runs started: `d6008c8d52dd`, `4fbfd98a5490`, `90d3ccd615de`, `fd497d71a313` (the shared
harness's newest build event at the time) and `21a67288007d` (the shared tag `tx2-datomic:1.0.7745-da00`, the
miniature's default). The settlement-frames check (`checks/frames-check-256-default.json`) runs no stack.

## 15. Follow-ups

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

   Gate: in a protected database with the per-account policy, a removal in another account between a Publish's read
   and its commit lets the Publish land at its first try; a removal in its own account refuses it and the republish
   lands; on a database without the policy both refuse, as today (the gate part `removal` of section 9.4, run once per
   case); every count of section 9 unchanged with the option off.
2. **Deadlines and `schedule` beside saves** (section 13): the same guard (tail, calendar, written entities) would
   apply; not needed by held accounts today.
3. **Many Publishes at the same instant** (section 11.2): the records go through the one writer one at a time; a burst
   to every account needs the release stored once or the records grouped.

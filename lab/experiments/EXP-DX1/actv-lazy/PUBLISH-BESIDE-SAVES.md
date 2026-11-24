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

**So the whole guard is: the account's own notice tail (existing), its calendar (one new `EntityState`), and the
transactor's revision check on what the record writes.** No other account's commit can fail any of them: other
accounts' saves, Publishes, enrolments and settlement frames write other entities. The only commits that refuse a
Publish are this account's own other events (another Publish, a deadline, a scheduled release) and a removal on
request.

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

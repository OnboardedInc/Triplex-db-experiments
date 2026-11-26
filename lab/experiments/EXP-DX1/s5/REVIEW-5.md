# S5 fifth review: the save line's answer to the fourth review (S6c, fifth pass)

Reviewer's branch `exp/DX-S5-save-line-review`. It holds the head under review, `1d9fdee6c` (a fast-forward; the
builder's branch already contained the fourth review), plus the reviewer's tests; nothing under `packages/` differs
from `1d9fdee6c`. Started 2026-11-25 22:01 EST, written 22:58 EST (the fuzzer still running then; its totals follow in a later commit). Mac figures are toy-size and diagnostic. At most
two heavy jobs ran at a time.
[Fourth review](REVIEW-4.md) · [The fixes](../s6/SAVE-LINE-FIXES.md) (section 14)

**How it ran.** Every counted run used an image built by `s5/image3.sh` from this branch's committed head: the pinned
lab runtime with the head's gateway sources (`1d9fdee6c`'s), the gateways of `a6d02225c` (the save line before S6b),
`23b7df344` (the base), the one branch `65a851d1b` (`origin/exp/DX-INT1`, with the fourth pass merged) and a trial
merge of `1d9fdee6c` onto it (`7114512b8`), the test files and the bundled SDK drivers, started by image ID with
nothing mounted but an output directory. `s5/review5-runs.sh` and `s5/review5-extra.sh` list the runs.

- `tx2-dxs5r3:726458e2c7e1` (`sha256:87d4b52b0903…`, source `726458e2c`): attack5 (five tests), attack4 and attack3,
  the native logs and identities of the four trees, both window stacks, the first restart-read stack, the fuzzer.
- `tx2-dxs5r3:2fb818b86ed2` (`sha256:f0c8342c7c61…`, source `2fb818b86`, adding two tests and the restart-read
  driver's idle-restart cases; the gateway under test is the same): those two tests in 4 settings, the second
  restart-read stack.
- Development runs (tests mounted, `r5-dev`) are not counted. Evidence: `DX-S5-review/r5-archives`, with `SHA256SUMS`.

**The trial merge.** `7114512b8` is `1d9fdee6c` merged onto `65a851d1b`. Under `packages/` it merges without a conflict
(the two changed files, `account_claims.clj` and `storage.clj`, apply cleanly); four lab test files conflict
(`s5/fuzz.clj`, `s5/window.ts`, `s6/clj-run.sh`, `s6/expected.sh`) and were taken from `1d9fdee6c`. A local commit on
a detached head, never pushed.

## Page 1

**Fit to merge into the one branch with the setting OFF? Yes.** With the setting absent:
- the native log of a fixed sequence of 240 saves is identical datom for datom, apart from the scope's random key,
  between the head and the base `23b7df344`, between the trial merge and the one branch `65a851d1b`, between the head
  and the one branch, and between the trial merge and the base (2 settings each);
- the stored-function identities are equal: the head's 58 to the base's in 6 settings, and the trial merge's 70 to the
  one branch's in 6 settings (none new, none different), so merging `1d9fdee6c` onto `65a851d1b` changes no stored
  function and no byte of that log;
- `guard!` reads one datom and writes nothing. The only change with the setting absent is R4-2's refusal of a request
  naming A that asserts another value in `:subject/account` (incomplete: R5-2); it leaves that log unchanged.

**What still stands before the setting goes on, on any database.** Three new breaks, all found in process; the
third also on the PostgreSQL stack with real older builds:

1. **R5-2 (High): R4-2 is not fixed for the compact row modes.** The check decodes a row text only when its raw text
   contains the characters `:subject/account`. JSON allows that name to be written with escapes: `:subject\/account`
   (what `clojure.data.json` writes for any `/` by default) or `\u003asubject/account`. The gateway decodes and
   stores such texts as sent. In fresh-text, compact-map and ordered-frame saves, a request naming A that gives a new
   entity B's account was stored, and the entity was then B's: 60 of 60 cases (3 modes x 2 escapes x setting on and
   off x 5 settings). Rows mode and unescaped texts were refused (70 of 70).
2. **R5-1 (High): the hash bar freezes the recorded general-writer hash, and the per-subject writers need that hash
   to be the process's own.** On a database with the setting on, a later build whose general writer differs (any
   later change to `commit.clj`) takes every save on the general writer, for good. In process, a one-owner save took
   the per-subject writer before such a build opened the database and the general writer after it, 4 of 4 settings;
   with the setting absent the same build recorded its hash and kept the per-subject writer, 4 of 4. A database turned on before the bar (under `9f210018f`
   or `cdfc70e02`) on which an older build with another hash opened keeps that hash when this build's open adds the
   bar, and then even this build's own saves take the general writer (3 of 3 settings).
3. **R5-3 (Medium, exactness): a command can commit twice.** R4-5's fix makes a plain claim committed after the
   setting "no account's". When that claim is an older build's save of the account's own command in the window, and
   the account's client sends the command again through this build (a new attempt, a new operation ID), it is stored
   again under the scoped form. 4 of 4 settings in process; on the stack 2 of 2 (predecessor lookup on and off): two
   claims, two transactions. The fourth review asked for this change: R4-5 called the old refusal a harm, mixing two
   cases (a plain claim of no one account, and the account's own command saved through an older build). For the
   account's own command the refusal was right.

And, standing as before:

4. **The operations rule.** After the transition only builds of this pass or later may open the database. The hash
   bar now refuses an older build whose general writer differs (the profile build's open failed on the stack, both
   settings). An older build whose writer has an ident the database did not hold still commits until this build's
   next save that reaches `commit!`, and nothing else bounds it. On the stack, `a6d02225c` with the serial options
   stored 10 of 10 after its open, 3,381 saves in 30 s with no request of this build, and 10 of 10 after this
   build's claim lookup, row read, fence, settings call, and a transact request that was not JSON. It stored 0 of 10
   after a save of this build refused at the account check, 0 of 10 after a stored save, and 0 of 10 after its own
   reopen (R5-4).
5. **The layer in front** (S6 13.2 points 1 to 4).
6. **Predecessor lookup on** on every gateway (now enforced: a gateway with it off refuses saves under the setting),
   with `TX2_ACCOUNT_IDS_NOPRED_FOR_TESTS` unset (nothing refuses or logs it: R5-6).
7. **A database turned on under `cdfc70e02` or `9f210018f`** is opened by this build before any older build with
   another hash opens it, or its recorded hash is checked after this build's first open (R5-1, R5-7).
8. **If the removal branch has merged:** the corrected resolution (R4-3).

**The three most serious findings, each with its test** (`s5/attack5_gate.clj`, mode `attack5`):

1. **R5-2:** `r4-2-through-the-compact-row-modes` (5 settings); also `r4-2-in-import-and-settlement-frames` (the same
   in import and settlement frames, 16 of 16).
2. **R5-1:** `a-later-build-with-another-general-writer` (4 settings); `a-database-turned-on-before-the-bar`.
3. **R5-3:** `a-command-saved-in-the-window-and-again` (4 settings); on the stack `s5/window5.ts` P3
   (`s5/stack6-run.sh`, with `S5_STACK_EXTRA="TX2_PREDECESSOR_LOOKUP=0 TX2_ACCOUNT_IDS_NOPRED_FOR_TESTS=1"` for the
   second run).

**One recommendation:** merge `1d9fdee6c` with the setting off now. Before the setting goes on anywhere, the builder
should do three things:
- move R4-2's check onto the rows as decoded for the save (every wire mode reaches `input-rows`), never onto raw text;
- give the per-subject writers a recorded hash this build may update under the setting (a second attribute without
  the predicate), so the bar stays a tripwire for older builds and stops freezing the fast path;
- answer an owned plain claim after the setting `taken` instead of ignoring it.

**How sure: sure.** Each break is a deterministic test that fails in every setting it applies to. R5-3 and the window
were also run on the stack with real older builds; R5-2 and R5-1 were run in process only (their code is the
gateway's own request path, the same on the stack).

## 1. Findings

| ID | Severity | Finding | Where | Test | Evidence |
| --- | --- | --- | --- | --- | --- |
| R5-1 | High (setting on) | The hash bar freezes `:triplex.scope/commit-fn-hash`: under the setting this build drops the hash from its installs (`rewrite-install`) and the predicate refuses every other write of it, the same value included. The one-owner, several-owners and creation writers and group application take a save only when that recorded hash equals the process's own general-writer hash. So on a database with the setting on: a later build whose general writer differs (any later change to `commit.clj`; also this build under `TX2_LOAD1_PROFILE=1` or the covering-owner options) takes every save on the general writer, for good; and a database turned on before the bar on which an older build with another hash opened keeps that hash when the bar goes on, so this build's own saves take the general writer too. The only way back is retracting the predicate by hand | `account_claims.clj` 146-159 (`hash-bar`), 204-218 (`rewrite-install`), 301-314 (`ensure-setting-schema!`); `subject_save.clj` 310, `subject_owners.clj` 156, `subject_create.clj` 174, `group_prepare.clj` 149 | `a-later-build-with-another-general-writer`; `a-database-turned-on-before-the-bar` | 4 of 4 settings (setting absent: per-subject kept, 4 of 4); 3 of 3 |
| R5-2 | High (setting on and off) | R4-2 is not fixed in the compact row modes. `request-rows` decodes a row text only when its raw text contains `:subject/account`; the JSON body may write the name with escapes (`:subject\/account`, `\u003asubject/account`), which `lean/decode` reads back as `:subject/account`, and the gateway stores the text as sent. A request naming A gives a new entity B's account in fresh texts, the compact map and the ordered frame, in plain saves and in import and settlement frames; the entity is then B's (B writes it). Z1-compressed bodies are refused by the stored function (`400 TransactionRejected`, `503 OutcomeUnknown` on the general writer) | `account_claims.clj` 465-482 (`request-rows`, `other-account-values`) | `r4-2-through-the-compact-row-modes`; `r4-2-in-import-and-settlement-frames` | 60 of 60 stored with B's account (rows mode and unescaped texts: 70 of 70 refused); frames 16 of 16 |
| R5-3 | Medium (setting on; exactness) | R4-5's fix lets one command commit twice. A plain claim committed after the setting's transaction is ignored: it neither refuses the account's save of that command nor is returned to the account. If the plain claim is an older build's save of the account's own command in the window, the account's client sending the command again through this build (a new attempt, a new operation ID) stores it again, scoped: two claims, two transactions | `account_claims.clj` 424-441 (`after-setting?`, `find-claim`), 484-519 (`stored-ids`) | `a-command-saved-in-the-window-and-again`; `window5.ts` P3 | 4 of 4 in process; 2 of 2 on the stack |
| R5-4 | Low (setting on) | Only a request that reaches `storage/commit!` runs `guard!`. A fence, a removal on request, a protection declaration, the settings route and a transact request that fails before `commit!` (a body that is not JSON) leave an older build's writer under a new ident working; so do reads and lookups. A save refused at the account check, a stored save and an open close it | `storage.clj` 824; `main.clj` route-handler | `what-passes-guard`; `window5.ts` P1 | 8 request kinds open after, 3 closed, 5 settings; stack: 10 of 10 stored after lookup, read, fence and settings, 10 of 10 after the non-JSON request, 0 of 10 after the refused save |
| R5-5 | Low | A transact request whose body is not JSON is answered `503 OutcomeUnknown`, though nothing was submitted (S6: a failure before submit is decided) | `main.clj` 269-276 (`write-status`) | `what-passes-guard`; `window5.ts` | 5 of 5 settings; stack 2 of 2 |
| R5-6 | Low | `TX2_ACCOUNT_IDS_NOPRED_FOR_TESTS=1` lifts the predecessor-lookup rule in any launch; nothing refuses it, logs it or reports it on `/health`. The rule itself no longer guards R4-4 (the bar does: an older build with another hash cannot write `:triplex/commit` at all), so the cost is a stated condition that a stray variable turns off silently | `account_claims.clj` 267-279 | by reading | not run |
| R5-7 | Low | Any process with a peer connection can retract the predicate. This build restores it at its next open or `turn-on!`, not at its next save; until then an older build's open (body and hash) goes through, and when the bar returns that build's hash is frozen (R5-1) | `account_claims.clj` 240-246, 301-314, 341-353 | `the-hash-bar-in-datomic-terms` | 5 of 5 settings |
| R5-8 | Info | The predicate also refuses re-asserting the hash already recorded (Datomic runs it on a redundant assertion too). No path of this build writes it; a future tool that writes the scope's attributes back as read would fail | — | `the-hash-bar-in-datomic-terms` (`sameHashAgain`) | 5 of 5 |


## 2. Rulings on the seven questions

**(1) The hash bar.** Sound as a refusal, in Datomic's own terms, and one-way in the wrong place.
- *What it does.* `:db.attr/preds clojure.core/nil?` on `:triplex.scope/commit-fn-hash` makes the transactor refuse any
  assertion of that attribute: a new hash (`:db.error/attr-pred … failed pred clojure.core/nil?`) and the same hash
  again (5 of 5 settings each). An older build writes its general writer and its hash in one transaction, so that
  transaction is refused whole and its open fails; in process the reviewer's fourth-review window test now errors at
  exactly that transaction (5 of 5), and on the stack the profile build's open failed both times
  (`503 OutcomeUnknown`; neither its gateway's log nor the transactor's names a cause, so the stack shows the refusal
  and the in-process tests show why). This build's schema transaction leaves the predicate in place.
- *Does this build need to write the attribute afterwards?* Its installs never do under the setting (`rewrite-install`
  drops the datom). But the per-subject writers and group application compare that attribute with the process's own
  hash on every save, and nothing can bring it up to date: R5-1.
- *A later, legitimate build with a new general writer* opens fine (its install drops the hash; its body goes to the
  twin), and its general writer works, but every save it serves takes the general writer, for good (R5-1).
- *Can the predicate be removed?* By any process with a Datomic peer connection: one retraction (5 of 5). No route of
  any build does it, and no older build does it. This build puts it back at its next open or `turn-on!`, not at a
  save (R5-7).
- *Restore to before the transition:* by reading, the restored database has neither the setting nor the bar, so it
  behaves as before the transition; claims written after the backup are gone with it (not run).
- *Failover promotion:* the bar is a datom in the database; a standby transactor serves the same storage, so it keeps
  it (by reading; not run).
- *A database turned on under `cdfc70e02` or `9f210018f`:* this build's first open (or a post to the settings route)
  adds the guard and the bar (the builder's `a-database-turned-on-without-the-setting-guard`; here 5 of 5 after a
  retraction). If an older build with another hash opened such a database first (`9f210018f` allowed it: R4-4), the
  bar arrives with that older hash recorded, and this build's own saves then take the general writer (3 of 3,
  `a-database-turned-on-before-the-bar`).
- *Is it one-way, and is that what we want?* One-way as far as any build goes. One-way is right for the refusal of
  older builds; it is wrong for the value the per-subject writers read. Keep the predicate on the old attribute as the
  older builds' tripwire, and give this build a hash it records and the per-subject writers read under the setting.

**(2) `guard!` and the remaining window.** Measured the way R4-1 was measured, with the real `a6d02225c` under the
serial options (its one-owner writer under an ident the database did not hold), predecessor lookup on and off:

| Step | Stored, lookup on | Stored, lookup off |
| --- | --- | --- |
| after its open | 10 of 10 | 10 of 10 |
| with no request of this build, 30 s | 3,381 of 3,381 | 2,871 of 2,871 |
| after this build's claim lookup, row read, fence and settings call | 10 of 10 | 10 of 10 |
| after a transact request to this build that is not JSON (answered `503`) | 10 of 10 | 10 of 10 |
| after a save of this build refused at the account check (`400`) | 0 of 10 | 0 of 10 |
| after a save of this build | 0 of 10 | 0 of 10 |
| after the older build opens again | 0 of 10 | 0 of 10 |

In process (`what-passes-guard`, 5 settings), the requests of this build that change or try to change stored state
without passing `guard!`: a fence, a removal on request, a protection declaration, the settings route, and a transact
request that fails before `commit!`. So the window closes at this build's next save that reaches `commit!`, whatever
its answer, and at nothing else. **The operations rule is the only thing that bounds it.** Nothing of this build
stores through an older build's writer: this build's own saves route to the twins.

**(3) R4-2's fix, every way to give an entity another account.** Setting on and off:
- *Rows mode*, in a plain save, an import frame or a settlement frame: refused (`400`).
- *The compact row modes* with the field's name escaped in the row text's JSON: stored, the entity B's. Plain saves
  60 of 60, import and settlement frames 16 of 16 (R5-2). Z1-compressed bodies are refused by the stored function.
- *A second attribute:* none exists. `group/persisted-account` reads `:subject/account` only, and only as a string
  with one distinct live value (`group.clj` 96-104); an entity whose ID names an account (`acct/`, `lazy/account/`,
  `notice:v2:`) keeps that account whatever it stores.
- *A retraction, then a re-assertion:* by reading, a request naming A may retract its own entity's
  `:subject/account` (retractions are not checked), which leaves the entity with no account; any account may then
  give it its own. That gives away A's own entity; it does not take B's. Not run.
- *Several-owners and creation saves:* the check runs in `stored-ids` before any writer is chosen, so the same holds
  for them (the builder's `a-save-cannot-give-an-entity-another-account`, 3 writers; the compact-mode bypass is the
  same function).
- *A system request naming no account:* may set any `:subject/account`, by design (S6 13.2 point 3).

**(4) The start-up rule and its override.** A gateway with predecessor lookup off neither turns the setting on nor
serves a save under it (`409 AccountIdsNeedPredecessorLookup`, after `guard!`'s repair). The override
`TX2_ACCOUNT_IDS_NOPRED_FOR_TESTS=1` is read in any launch. By reading, nothing refuses it, logs it or reports it on
`/health`, so yes: a production launch can carry it silently (R5-6). Two things soften this:
- the rule no longer guards R4-4: the hash bar does, since an older build with another hash can no longer write
  `:triplex/commit` at all;
- this build with lookup off routes to the twins like this build with it on.

What R4-4 needs now is the bar, and the rule is a stated condition with an unguarded switch.

**(5)** Section 3.

**(6) The mixed stack's `uniform G_off kill` case.** A harness limit, not a save reported stored and then absent,
with one condition stated.
- *What the mixed stack does.* It reads the log and the rows through the other gateway with no position, 1.5 s after
  the SDK's answer.
- *What a read without a position promises.* It answers at that gateway's peer's current view (`at_least.clj`:
  without the parameter nothing changes). After a transactor restart a peer that has not yet reconnected can be
  seconds behind; the builder's re-read found the save there 10 s later. No bound applies to such a read.
- *The bound that does apply.* The at-least read: with `atLeastPosition` set to the save's receipt, the gateway waits
  up to `basisWaitMs` (at most 2,000 ms) for its peer, then refuses `409 AtLeastTimeout`. It never answers without
  the save.
- *Measured on two stacks* (`s5/restart-read.ts`, two gateways of this build): 14 cases, 7 with the save in flight
  across the transactor's kill and restart and 7 with the transactor restarted while both gateways were idle, then the
  save at once; 10 reads at 0 to 20 s after each answer through the other gateway.
  - The at-least read had the save every time (140 of 140), answering within 146 ms at most.
  - The stale reader did not reproduce: the reads without a position had the save too (140 of 140). In every case the
    SDK answered only after the other peer had caught up.
- *Ruling.* The mixed stack's `uniform G_off kill` case breaks no contract. Its reads should carry the receipt's
  position (the harness is mine; the builder's 10 s re-read is a fair diagnostic until then). What no client may rely
  on is a read through another gateway, without its receipt, soon after a transactor restart.

**(7) The setting off.** Page 1: the log identical to the base and to the one branch, the identities equal, and the
trial merge onto `65a851d1b` changing neither.


## 3. The builder's edits to the reviewer's files

Diffs are against the fourth review's versions (`84d470328`); the edits are in the fifth pass's commits `80cdfd858`,
`5718e2104` and `c9c657afb`.

| File | Change | Ruling |
| --- | --- | --- |
| `s5/fuzz.clj` `old-open!` | When the database refuses the older build's body and hash (the bar), write the same working body alone, without the hash, and count the refused opens (`oldOpensBarred`) | **Right.** My version throws at the first old-build step on this head (the same transaction errors the fourth review's window test, 5 of 5 here). The step keeps its purpose: a working body under `:triplex/commit`, then a save of this build, then a stale planner that must be refused and store nothing. A body without a hash is the R4-7 shape the bar cannot stop, so this is the harder case, not a softer one |
| `s5/clj-run3.sh` | `TX2_ACCOUNT_IDS_NOPRED_FOR_TESTS=1` in the two predecessor-lookup-off settings | **Right, with a caveat.** Without it every save under the setting is refused by the new rule. Those two settings now test a configuration production refuses, and the switch itself is silent (R5-6) |
| `s5/window.ts` P1 | A save of the serial build under m1's command in its window, kept for P3 | **Right**: P3 needs a window save once P2's build cannot open |
| `s5/window.ts` P2 | `tryOpen`: an open that fails is logged `OPEN_REFUSED` and that build's steps are skipped | **Right in intent, weaker than it reads.** Any failure of the open counts, whatever its cause, and the builder's own run says the gateway logged none. This review's `window5.ts` also read both logs for the predicate's message (none there either) and leans on the in-process tests for the cause |
| `s5/window.ts` P3 (expected result) | P3's code is unchanged; its result went from `CommandAlreadyCommittedError` to "stored" | **The "stored" is R5-3**: the same command committed twice |
| `s5/mixed-fleet.ts` | A case that is not exact is read again after 10 s, through `G_on` and through the save's own gateway (diagnostic; the verdict line is unchanged) | **Right**: it adds evidence and changes no check. Its reads still carry no position (see (6)) |
| `s5/attack2_gate.clj` claim test | The rule for a system claim from before the setting kept (with a new system save before the setting: the account's save refused `409`, the lookup `taken`); for one after the setting, the account's save now stored and its lookup its own | **Right for what it tests**: a plain claim of no account's entities after the setting is a different ID space from the account's scoped one. The same rule also covers an owned plain claim from an older build's window, where it lets a command commit twice (R5-3); the edit encodes R4-5's fix faithfully, and the fix is what is wrong for the owned case |

**My own seeds.** The fuzzer ran the fourth review's seeds 731 to 741, 3,000 steps each, unchanged, in both settings
(`accounts-on`, `accounts-on-general-nopred`), with the builder's `old-open!` (mine cannot run on this head: the bar
refuses its first transaction). Totals: section 4 (running when this was written).


## 4. What held

| What | How | Size | Result |
| --- | --- | --- | --- |
| The setting absent: native log | `s5/logdigest.clj` on the head, the base `23b7df344`, the one branch `65a851d1b` and the trial merge `7114512b8`, 2 settings | 240 saves each, 7,598 and 7,600 datoms | head = base, trial merge = one branch, head = one branch, trial merge = base: identical datom for datom apart from the scope's random key |
| The setting absent: identities | `s3/idents.clj` on the four trees, 6 settings | 58 (base, head), 70 (one branch, trial merge) | head = base (the head adds the same 8 as before); trial merge = one branch, none new, none different |
| R4-1, the general writer | the hash bar: an older build's open with another hash | in process 5 of 5 (attack4's window test errors at that transaction); stack 2 of 2 profile-build opens failed; `23b7df344` then refused 5 of 5 | refused |
| R4-7 | an install that read the database before the transition and writes its hash after | 5 settings | refused by the bar; old saves after it refused (3 of 3) |
| R4-8 | a database turned on without the bar (predicate retracted), then this build's open | 5 settings | the bar back (but see R5-1 and R5-7) |
| R4-2 in rows mode and unescaped texts | the fourth review's planted case; attack5's rows-mode and unescaped-text cases | attack4 10 of 10; attack5 70 of 70 | refused `400` (Z1 bodies refused by the stored function) |
| R4-4's rule | a gateway with predecessor lookup off under the setting | not run here (the builder's gate); every run with lookup off needed the override to save at all | consistent |
| The third review's tests | `s5/attack3_gate.clj`, 7 settings | 12 tests | 116 of 116 in 4 settings, 118 of 118 with imports; in the 2 general-writer settings 106 of 116 (the known harness arm) |
| The fourth review's tests | `s5/attack4_gate.clj`, 5 settings | 5 tests | 21 of 21 assertions in each; 1 error in each, the window test's first transaction, refused by the bar (expected) |
| The transition killed at each step | attack4 | 3 points x 5 settings | never a mix; running it again completed it |
| The general writer racing a removal on its own thread | attack4 | 3 writers x 5 settings | 15 of 15 |
| Another account's `acct/` entities | attack4 | 3 writers x 2 states x 5 settings | refused 400, 30 of 30 |
| The older build's window, its close | `window5.ts`, real `a6d02225c` (serial options), lookup on and off | 2 stacks | closed at this build's first save, refused or stored (0 of 10 after each, both stacks) |
| Reads after a transactor restart | `restart-read.ts`, 2 stacks, the save in flight across a kill and restart (7) or right after an idle restart (7) | 14 cases x 10 reads, 0 to 20 s | the at-least read had the save 140 of 140 (at most 146 ms); no read answered without it |
| The fuzzer | `s5/fuzz.clj`: faults, a second account, the transition at one third of the steps, stale planners, older-build reopens, removals alone and racing a save, protected values unsealed | seeds 731 to 741 x 3,000 steps in `accounts-on` and `accounts-on-general-nopred`: running when this was written; `accounts-on` 8 of 11 seeds done at 22:55, 38,444 saves (31,244 serial, 7,200 concurrent in 16 rounds of 2 and 4 writers), 292 older-build reopens, 8 transitions, 445 stale-planner saves, 479 removals, 212 removal races | so far 0 differences, 80 deep compares equal, 0 unjustified refusals; totals follow in a later commit |


## 5. Not tested

- **Reads by another account** (S6 13.2 point 5) and **who the caller is**: the layer in front, unchanged.
- **Failover promotion, restore and the HA lab with the bar:** by reading, the bar is a datom and survives them; not run.
- **The retraction-and-re-assertion path of (3):** by reading only.
- **A real build of the one branch from before this merge (`cdfc70e02`) opening a database with the bar:** not run; in
  process the same transaction an older build writes is refused.
- **The compact-mode bypass on the stack:** run in process only; the SDK of this head writes unescaped JSON
  (`JSON.stringify`), so its own saves are refused as they should be. The bypass needs a client that writes its own
  texts, or any JSON encoder that escapes `/`.
- **Sealed protected values with the setting on:** the fuzzer ran unsealed only.
- **Scale and timing:** toy sizes on the Mac; every time here is diagnostic.


## 6. Cleanup

- Images, by ID: `tx2-dxs5r3:2fb818b86ed2` removed after its runs; `tx2-dxs5r3:726458e2c7e1` is removed when the fuzzer
  ends (it runs on it). The dev image `tx2-dxs5r3:68351d5e68dd` was removed when the first counted one was built.
  `tx2-dxs5r3:f76454bc66a4` is the builder's and was left alone.
- No container of this review is left (listing by label `dx-s5r3` and name prefix `tx2-dxs5r3-`); stacks remove their
  own.
- The scratch worktree of the trial merge was removed; `7114512b8` stays a local commit, never pushed. Its diff
  against the one branch under `packages/` is in the evidence.
- Evidence: `DX-S5-review/r5-archives` (one archive per run, `SHA256SUMS`), written when the fuzzer ends; the raw
  folders are removed after.

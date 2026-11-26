# Fifth adversarial review: the Publish line at 850517da9 (DX-ACT10, 2026-11-25)

Reviewer DX-ACT10, branch `exp/DX-ACT10-publish-review`. Under review: `exp/DX-ACT8-publish-beside-saves` pinned to
`850517da9` (code `8455107b6`; the later commit changes the page only, section 0.C). The code diff
`a6f89a409...850517da9` was read before the page. The code under review was not changed; this branch merged `850517da9`
(`a1ef27794`) and adds tests, one stack part (`act10/stack-stamp.ts`) and a smaller page size in its own ID scan. Mac
only, toy sizes; every time is diagnostic and taken from `date`. Stacks ran by image ID: this reviewer's image
`bc3287e074fe` (removed after the runs), built from the head under test (receipt `image-receipt-6.json`), and, for the
upgrade case, the merge agent's image `0c834aaa4a54` (its receipt read in place). Finished 2026-11-25 20:21 EST.

## Page 1, for the owner

**Is there a break? Yes, the same kind as Z1's, one step later: no attacker, permanent, under the settings, at a real
account's size.** The Z1 fix sized the most parts a ledger may have (10) with a cursor whose epoch is 26 characters.
Every real cursor carries the account's seal as its epoch, 64 characters. With that epoch and a large account's
counters, every closing piece of a ledger of 10 parts exceeds the writer's bound by 3 to 6 microseconds of its 8,000;
the writer's own frame builder refuses it, and that subject's notices, and every later notice of the account, stop for
good. The toy's small counters keep it 4 microseconds under, which is why no toy run shows it. How sure: certain of the
arithmetic, which is the writer's own estimate on the writer's own ops (V1); not shown on a stack, which cannot reach
those counters.

**The three most serious findings**

1. **Y1, a ledger of 10 parts can never be closed at a real account's counters (no attacker).** 7 of the 77
   combinations the builder checks fail once the cursor has a real 64-character epoch: every change of a 10-part
   ledger, 8,003 to 8,006 us against 8,000. A ledger is at 10 parts from about 1,500 to 1,614 notice items in force,
   the top of what the per-release cap admits. Test V1.
2. **Y2, an account enrolled by one build cannot be used by the next (pre-existing, every merge, options off too).** The
   enrolment stamps the account with `selector`, a hash of the source bytes of 14 files, `account.ts` among them. This
   round changes `account.ts`, so an account enrolled by `a6f89a409` cannot publish or settle under `850517da9`
   ("assert(m.compiler === selector ...)"), and the reverse. Nothing an operator can do brings it back today. Tests V2,
   V2b, V2c; on a stack, with the merged head (`f5b7f2446`, image `0c834aaa4a54`), the same refusals while saves and
   reads go on.
3. **Y3, a permitted Publish is refused for as long as an account's backlog lasts.** With more than 32 owed releases
   whose values are not settled (a paused account, or one no values settler runs for), the transition does not commit
   and every Publish by a process holding a permission is refused (`SettingsPending`), while processes allowed nothing
   keep publishing and add to the backlog. It ends only when the values are settled. Test V4.

**May `850517da9` merge into the one branch with every option off, after `a6f89a409`? Yes.** With every option off no
ledger is in parts (Y1), no process holds a permission (Y3) and no row is archived (Y5); the gates with every option off
pass at this head on this reviewer's image (`g4off-6` and `r3c-6`, section 2). Y2 is already on the one branch and this
merge triggers it once more, because it changes `account.ts`: a held account enrolled by the one branch's build before
the merge cannot be used after it. No database outside tests holds one, so I agree with not holding the merge for it.
One consequence for the rented-server session: enrol, publish and settle its held accounts with one build; a merge that
touches any of the 14 files between enrolment and the runs strands them (section 3).

**What must be true before any setting is turned on.** Y1 fixed (size the parts with the real epoch length and the
largest counters a supported account reaches, which gives 9 parts and a lower per-release cap, or keep a real margin);
Y3 decided (at least a permitted publisher on a paused account should not be refused for the whole pause); Z5 and U8
closed by the gateway rule of 0.B; Z4 settled with the removal line; the rollout order of 0.8 for the last old-build
frame; and, for any database that keeps held accounts across an upgrade, Y2's fix.

**One recommendation: before any setting is on, compute `ledgerPartsMax` and the cap with a 64-character epoch and the
counters of the largest supported account (and test the 77 combinations with that cursor), so the closing piece has a
margin a real account cannot use up.**

## 1. Findings

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| Y1 | **High (no attacker; permanent; ledgers in parts only)** | `ledgerPartsMax()` (`ledger-parts.ts` 31-52) and the limits taken from it (`longCursor`, 261) price the closing piece with a cursor whose epoch is `"0".repeat(26)`. A real cursor's epoch is the account's seal (`epoch: source.seal`, `account.ts` 336), 64 characters. The 38 extra characters cost about 8 us by the writer's estimate (3 wire bytes per op byte, 70 us per KiB), and the Z1 fix left 2 us (the largest of the 77 pieces, 7,998 of 8,000). So every change of a ledger of 10 parts, to any new size, prices over the bound; `noticeFrame` refuses it ("its closing piece alone exceeds the writer's bound"), the cursor cannot pass the subject, and the account's later notices are never recorded: Z1's effect, from the sizing instead of the shape | V1: the 77 combinations with four cursors. The sizing cursor: 346 B, worst 7,998 us, 0 failing. A real 64-character epoch with the sizing counters: 384 B, worst 8,006 us, **7 failing** (all with 10 old parts). A million-subject account's counters (event 40, start 999,936, batch 40,000,000, entries 64,000,000,000, part 3,180, erasure sequence 12): 372 B, 8,003 us, **7 failing**. The toy's counters: 339 B, 7,996 us, 0 failing. The writer's own `noticeFrame` on the worst case: `FrameTooLarge` | Size with a 64-character epoch and the largest counters a supported account reaches (9 parts, a lower cap), or require a margin (say 2 % of the bound) in `ledgerPartsMax`; check the 77 combinations with a real seal in R5-3 |
| Y2 | **High for any upgrade (pre-existing; every option, off too)** | The enrolment writes `join-meta.compiler = selector`, a hash of the source bytes of 14 files (`index.ts` 34-58: `account.ts`, `journal.ts`, `decision.ts`, `w0-world.ts` and ten more). `meta()` asserts it (`account.ts` 251), `state()` asserts the tail's inputs (513), and the notice journal checks each event's inputs (`journal.ts` 135-139). Any build that changes one byte of the 14 files, a comment included, cannot publish or settle on an account the previous build enrolled, and the previous build cannot use an account the new one enrolled or published on. The refusal is a bare `AssertionError`. No route brings such an account back (section 3) | V2c (and with `OLD_ROOT` at `345f833e4`): enrolled, published R1 and settled by the previous round; then this round's Publish: "assert(m.compiler === selector && m.census ...)"; its settle: refused. V2b: the previous round's Publish on an account this round enrolled: refused. On a stack with the merged head: enrolled, published (R1 at position 19) and settled by `345f833e4`; then `f5b7f2446`'s Publish: the same assertion, nothing written; its settle: refused; a save and a read of a subject: work (section 3) | Section 3 |
| Y3 | Medium (a paused account, or one no values settler serves; lasts until the values are settled) | The transition fences every owed release whose values are not settled, at most 32 (`transitionFencesMax`, `account-settings.ts` 49, 154). Over that it does not commit; a process holding a permission retries four rounds of eight, then throws `SettingsPending` (`account.ts` 931-941, the loop and its throw at 937), every time, while a process allowed nothing keeps publishing and adds to the backlog. A pause that outlasts 32 releases therefore refuses every permitted Publish until the pause ends and the values drain. The page says this (0.C, its bounds table) for a rollout; the review's point is that the refusal is not bounded in time | V4: 34 pending under a pause; three permitted Publishes refused ("Publish refused for now ...") in 546 ms; a process allowed nothing published meanwhile; the paused settler still waiting after 2 s (bounded by the test); after unpausing and draining, the permitted Publish landed and the settings turned on (`archive`, `ledger: "parts"`, `ledgerCap`) | When the cause is the backlog alone, let the permitted process publish under the stored settings while applying its own cap check first (Z2's other option), so the permission never publishes what the cap would refuse and is never refused for a pause |
| Y4 | Held | A permitted Publish offered repeatedly beside a long values settlement (256 subjects, interleaved, not forced) | V5: published at its first try during the settlement, 0 refusals | — |
| Y5 | Information (held) | Archive rows are now `{id, retired, seq, subject}`: between an item's retirement and its return, the stored state holds no payload for it, where the kernel's state (SPEC) keeps it. Exact against the kernel with payloads compared out (`comparable`); the payload is in the last delivery that carried the item | V3: 3 items retired with payloads, stored payloads `"null"`, each recoverable from its last delivery, returned at sequence 7; notices and full ledgers equal to the oracle | Say in 0.A that a reader needing a retired item's payload takes it from that delivery |
| Y6 | Medium-low (robustness of the write gateway) | The "read failure after its gate passed" in the builder's `g4R5`: this reviewer's ID scan (`act10/idscan.ts`, in the builder's run) read the feed in pages of 1,000 transactions, and the write gateway ran out of memory (its role `write`, exit 137, out of memory, about 639 s into the run). The gate had passed; the scan, not the code under review, failed. The harness now reads pages of 100. Nothing on the gateway bounds a feed page, so any reader asking for a large page can kill the write gateway | g4off-6 at this head with pages of 100: the ID scan completed in 29 s: 49,122 transactions, 47,862 ordered saves, 4,538 other IDs, **0** inside a save block, 0 duplicates | Cap a feed page on the gateway (by transactions and bytes) and have readers page to the cap |
| Y7 | Information (moot by Y2) | The one-part head in a mixed fleet: the previous round's reader asserts a head names at least 2 parts (`a6f89a409` `ledger-parts.ts` 86) and would refuse a one-part head. It never gets there: in each mixed case the stamp refuses first. So no account moves between the two builds in either direction, and a rollback after an upgrade strands every account the new build enrolled or published on | V2: an account of this round, its ledger shrunk to one part and, separately, kept at two; the previous round's settler stops at `journal.ts` 135 (the inputs identity) in both; this round's settler records, notices and full ledgers equal to the oracle | Y2's fix decides it; then the one-part head needs 0.8's rollout order |
| Y8 | Medium-low (unchanged from Z5) | Z5 as left: not changed in this round, as the page says. (a) With `TX2_ENROL_BESIDE_SAVES` unset the enrolment's ID is computable; (b) with it set, one fact written first on one of its four entities blocks it. It is the one branch's behaviour with every option off and closes only with the gateway rule of 0.B, which is not on this line | `review4` W2 passes as stated at this head (builder suites) | The gateway rule of 0.B, before any setting |
| Y9 | Medium (data-shaped; one subject's saves reach every subject's) | The calendar row counts instants, not days. Besides each `:file/expiresOn` day's end, a deep save adds each fact's end of validity after the cut at its own millisecond (`deep.ts` 59-65). A save that adds one rewrites the row whole (`account.ts` 1391-1397), as do the transition (`account-settings.ts` 144-147) and each instant's tick, one commit per instant (`account.ts` 1238-1249). Neither the save nor the transition is bounded by the writer's estimate. At day precision the date range (to 2099) caps the row at 26,699 instants, 801 KB, under the 1 MiB value; with instants it reaches the value at 34,952, and then every later save on the account that adds an instant is refused by the store's value check (`ValueDomain.ts` 129), whatever its subject, until ticks remove past instants. The page bounds the row by "distinct future due days" (0.C bounds table); that holds for day ends only | V6, priced by the writer's estimate (the row's change alone): 284 days 6.9 ms; 1 year 7.4 ms; 5 years 17.0 ms; 10 years 29.0 ms; every day to 2099 180 ms; 34,952 instants at the 1 MiB value 234 ms. Not run on a stack: the toy holds no due instant and its in-process store takes no deep save | The calendar in parts (the page's own proposal, one row per month), with a typed refusal, or a bound on distinct instants per account, before accounts with ends of validity at a time of day are beside saves |

## 2. What was attacked and held, with counts

- **The builder's suites at this branch's head** (`4b3f1c22d`, the code of `850517da9`): 113 tests, 111 pass, 2 skipped
  (the diagnostics W8c and W8d), 0 fail; the held suites 3 of 3.
- **This review's tests** (`review5.test.ts`): V1 to V6, V2b and V2c, 8 of 8 run as diagnostics; what they show is in
  the table. V2, V2b and V2c need `OLD_ROOT`; they ran with it at `a6f89a409`'s code and, for V2c, at `345f833e4`.
- **Z1's fix itself, at the sizing cursor and at the toy's counters**: the 77 combinations at 7,998 and 7,996 us, 0
  failing (V1). The fix holds for the cursor it was sized with; Y1 is the cursor it was not.
- **Payload-free archive rows and history exactness**: V3 above, and every fold check in the builder's suites.
- **The 32-release bound**: at 34 pending the transition does not commit; drained, it commits (V4).
- **`SettingsPending` beside a busy settlement**: V5, the Publish at its first try.
- **Stacks at this head, options off and on** (this reviewer's image `bc3287e074fe`):

  | Run | Settings | Result | Publishes | Positions, pinned reads | Racing saves | Notices in order | ID scan |
  | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
  | `g4off-6` | every option off | **pass** | 49 | 521, 4,168 | 108 | 6,764 | 49,122 transactions, 47,862 ordered saves, 4,538 other IDs, **0** inside a save block, 0 duplicates |
  | `g4-6` | every permission (account keys, frame guards, cap at Publish, ledgers in parts) | **pass** | 49 | 505, 4,040 | 104 | 6,764 | 49,892 transactions, 47,862 ordered saves, 12,407 other IDs, **0** inside, 0 duplicates |
  | `r3c-6` | ACT6's gate, options off, 200 forms | **pass**, the builder's counts exactly | | | | 14,400, 7,200 and 21,672 delivered, then 0 again | — |

  `r3c-6` in detail: 72 subjects, 4 stops (1 inside a ledger's parts), 2 parts per ledger, the independent rule 72 /
  42,720 / 14,400; 76 value and 510 notice frames, at most 7,995 and 8,000 us of the 8,000 us bound; the definitions
  table 619,097 and 938,509 B, 1,233,297 B, refused over the 1 MiB value at 1.0 and 1.25 MiB, 3,532 B by reference. Each
  run's prediction was written before it started (`predictions-2.md`) and held, except one part not checked: `g4-6`'s
  log does not print the Publish at which the settings turned on.

## 3. The compiler stamp (Y2): what an operator can do, and the smallest fix

**Why the stamp is there.** `index.ts` says it: reopening an unpaid release must run the exact classifier, world
mapping and selector that made its promise, and a hash of the declaration table alone was rejected because a changed
range boundary would keep that identity. The stamp also covers the enrolment's index, which the enrolling build's code
computed. The intent is sound; the checks are wider than it. `meta()` (251) and `state()` (513) refuse every Publish
and every settle on an account enrolled by another build, whether or not anything is unpaid, and the notice journal
(135-139) refuses every event another build wrote.

**What an operator can do today: nothing that brings the account back.** Only an enrolment writes `join-meta.compiler`
(`account.ts` 336-341 for a held account, 478-493 otherwise). Enrolling again is a no-op: the same command ID, or
`enrolledWith` (361-370) finds the enrolment and stops. The `join-invalid` record (1249, 1478) carries a `compiler`
field but no check reads it; it only makes reads after its position evaluate every subject instead of the index (753).
The only ways back are to run the enrolling build's exact source bytes, or to use a fresh database or another account
key, which leaves the account's notice history behind.

**On a stack (fact 2).** One held-runner run on the merge agent's image `0c834aaa4a54` (built from `f5b7f2446`,
its receipt read in place), the run checkout at `f5b7f2446` plus the stamp part (`act10/stack-stamp.ts`), namespaced
account 4 of the held database. The enrolling build is the one branch's lab tree at `345f833e4` (stamp `02a6942ab679`);
the merged head's stamp is `ef5124d35ead`. Each step as the caller sees it:

| Step | Build | What the caller sees |
| --- | --- | --- |
| Enrol | `345f833e4` | enrolled |
| Publish R1 | `345f833e4` | published at position 19 |
| Settle | `345f833e4` | 1 release settled |
| Publish R2 | `f5b7f2446` | `AssertionError: The expression evaluated to a falsy value: assert(m.compiler === selector && m.census && m.epoch && m.source > 0 && m.source < p)`, after 31 ms; nothing written (the notice tail stays at 1) |
| Settle | `f5b7f2446` | `AssertionError` from a multi-line assertion, after 206 ms |
| The notice tail | `f5b7f2446` | readable: sequence 1 (R1's event) |
| A save of a subject's fact through the store | `f5b7f2446` | landed at position 22 |
| A read of subject `pl:s00000000` at the head | `f5b7f2446` | 27 facts |
| A read of the saved fact | `f5b7f2446` | 1 row, the saved value |

So saves and reads through the store go on: beside saves, a save is a store commit and does not pass the account's
stamp. What stops is everything the account itself does. By code, every account method that reads `meta()` or
`state()` refuses the same way: `publish`, `schedule`, `advance` (the clock's tick, 1239), `admit`, `save` and
`saveDeep`, `receipt` and `noticeSelection`; and the settlers. So the account keeps taking saves but takes no new
release, its clock no longer passes due instants, and its notices stop at the last release the old build settled.

**The smallest fix I would accept.** Two parts, both needed:

1. **A typed refusal in place of the bare assertions** (`meta()`, `state()`, the journal check): a `CompilerChanged`
   error naming the stored stamp and the running one, so a caller can tell an upgrade from corruption, and so a
   rollout can check it before it routes traffic.
2. **A re-stamp route for an account that owes nothing.** A command, run by the new build, that is allowed only when
   every release's values and notices are settled to the tail and no scheduled release waits under the old stamp. It
   rebuilds the enrolment's index under the running build from the source at the current head (the enrolment's own
   path), and in one commit, guarded on `join-meta`, the tail and the origin row, replaces the stamp, the tail's
   inputs and, if any entry changed, the index. An old-build Publish racing it loses on the guard. This keeps the
   intent (no unpaid release is reopened under other code) and ends the stranding.

A declared format version in place of the source bytes (the existing `compilerVersion` with the declaration tables)
would remove most strandings, since most merges change no behaviour, but it is what `index.ts` rejected. I would
accept it only with a golden test that pins the classifier's outputs (fixed worlds to fixed index entries and notices)
and fails when they change without a bump, and it still needs part 2 for the changes that do bump it.

**What a test for it must show.**

1. Two builds that differ by one byte outside behaviour (a comment in `account.ts`), and two that differ in behaviour
   (a range boundary in a declaration table), each as an `OLD_ROOT` tree as in V2c.
2. Enrolled, published and settled by build A; under build B, before the re-stamp: Publish and settle refuse with the
   typed error naming both stamps, nothing written, and saves and reads on the account go on.
3. With a release still owed under A, the re-stamp refuses (typed) and B's settler refuses that release; A's settler
   can still finish it; then the re-stamp succeeds.
4. After the re-stamp, B publishes and settles, and the notices from the enrolment to the new tail (A's events and
   B's) equal the oracle, ledgers with their archive exact; A then refuses (typed).
5. For the behaviour change, the index after the re-stamp equals a fresh enrolment's under B, entry for entry.
6. The re-stamp racing a Publish by A: exactly one commits, the other is refused with nothing written.
7. Once on a stack with an image built from the merged head, as `stamp.sh` does here.

**The merge.** I agree with not holding the options-off merge for Y2: the fault is already on the one branch, and no
database outside tests holds a held account enrolled by it. Every later merge that touches one of the 14 files strands
the held accounts of any database that outlives it, test databases included.


## 4. What was not tested

- **Y1 on a stack.** A toy stack cannot reach a ledger of 10 parts at a real account's counters; V1 is the writer's
  own estimate on the writer's own ops. Not priced under a calibrated `TX2_SETTLE_COST` (the sizing uses the estimate
  in force, so the margin argument holds; the numbers would differ).
- **The calendar at size on a stack (Y9).** Priced only; no deep save reached the 1 MiB value.
- **The 32-release bound on a stack.** In process only (V4).
- **Z4, the removal line beside the archive, and the sealed path.** Not merged here; code read in the fourth review.
- **The rollout order of 0.8 (the last old-build frame).** Moot while Y2 refuses every mixed case; not run.
- **Sizes past the toy.** Every stack ran toy sizes on the Mac; timings are diagnostic.

## 5. How to run

```sh
node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/review5.test.ts      # V1, V3, V4, V5, V6
OLD_ROOT=<a checkout of a6f89a409>/lab/experiments/EXP-DX1 node --experimental-strip-types --test \
  lab/experiments/EXP-DX1/act10/review5.test.ts                                           # with V2, V2b, V2c
```

The stack runs: `agents/DX-ACT10/chain-10.sh` (the image and three gates) and `stamp.sh` (the upgrade case: the held
runner with `DX_ACT10_STACK=1 DX_ACT10_STAMP=1` and `OLD_ROOT` naming the enrolling build's lab tree).

## 6. Evidence

Private, outside the repository (`agents/DX-ACT10/`, `evidence/DX-ACT10/`): `review5-tests.log`,
`builder-suites-5.log`, `chain-10.log` and `run4-*-6.log`, `stamp.log` and `run5-stamp.log`, `image-receipt-6.json`,
`predictions-2.md` (fifth-review part).

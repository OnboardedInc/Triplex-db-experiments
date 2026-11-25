# Fourth adversarial review: the Publish line at a6f89a409 (DX-ACT10, 2026-11-25)

Reviewer DX-ACT10, branch `exp/DX-ACT10-publish-review`. Under review: `exp/DX-ACT8-publish-beside-saves` pinned to
`a6f89a409` (code `a380292be`). The code diff `2084d3ba7...a6f89a409` was read before the page (sections 0.A and 0.B).
The code under review was not changed. This branch merged `a6f89a409` (`b0a25ac6a`) and adds only tests and one harness
switch (`DX_ACT10_RERUN`, `ha1/local.ts`, off by default). Mac only, toy sizes, the lab VM shared with other builders;
every time is diagnostic. Stacks ran on this reviewer's private image `e2938e6d7ed4`, built from the head under test
(receipt `image-receipt-5.json`). Finished Wed Nov 25 14:00:02 EST 2026.

## Page 1, for the owner

**Is there a break? Yes, one that needs no attacker, under the settings.** The retired-item archive (U9's fix) lets a
subject's ledger shrink, which it never could before. When a ledger in parts shrinks to what fits one part, the new
ledger is written in its whole form inside the closing piece, beside the retraction of every old part. That piece was
sized for a small head, not for a packed ledger, so for some ordinary release sizes it exceeds the writer's bound. The
recorder then cannot pass that subject, and the account's notices stop for good. How sure: certain. It reproduces on
every try at fixed sizes, and it happened by itself in 4 of 40 random release histories (Z1).

**The three most serious findings**

1. **Z1, a ledger that shrinks stops the account's notices for good (no attacker).** After a release of 260 notice
   policies (2 parts), a release of 155 to 163 policies stops the recorder; after a release of 1,590 (10 parts),
   releases of 20 and 60 policies did. Settlers naming no mode or parts, on every retry: "its closing piece alone
   exceeds the writer's bound". Tests W8, W8b; the random campaign W4.
2. **Z2, a permitted publisher whose transition is starved publishes without the cap.** Eight transitions each refused
   by a settlement frame (a busy account), the process plans under the settings as stored (none), as designed, so the
   cap is not applied: a 1,700-policy release publishes, and its notices then need 11 parts and stop the account's
   notices for good (the old F3). Test W7.
3. **Z3, an event can start under the settings without the archive, in the settler's own mode.** The notice turn
   decides the archive and the ledger mode from the origin at its first head read, but commits guarded on the origin
   and cursor at its second. A transition between the two reads (its fence rewrites the cursor, so the frame is not
   refused) gives one event written whole and without the archive by a settler naming no mode; on ledgers already in
   parts the same window gives U2's own refusal, "A ledger in parts needs TX2_NOTICE_LEDGER=parts", once. Tests W1,
   W1b.

Also: **Z4**, the archive's rows are a kind of derived document the removal line's sealing check does not know, so the
two lines' settings cannot both be on (code read, section 3); **Z5**, the enrolment can still be denied for good (with
`TX2_ENROL_BESIDE_SAVES` unset its ID is still computable; with it set, one fact on one of its four entities does it),
test W2; **Z6**, U4's every-change rule accepts a change to any transaction's journal entity, test W3.

**What held.** The fold of the archive is exact wherever the recorder could pass: 36 random histories of 14 releases
each (retire, re-add, rename, payload changes, the first setting at release 4, settlers of every mode killed 431 times)
gave 125,944 notices and every subject's ledger with its archive equal to the kernel's fold; the per-release cap holds
at 1,590 policies and refuses 1,630; whole ledgers near their limit at the first setting continue exactly (U2); the
random enrolment ID survives a kill at every step and two enrolments at once with one record each; the fuzzer at the
head found 0 violating in 7,500 new mixed-fleet schedules and caught its negative control (6 of 1,000); the five stack
runs the builder skipped all pass, the three options-off regressions with every count equal to the builder's published
ones.

**Is the Publish line fit to merge into the one branch with every option off, now?** **Yes, with every option off.**
With no permission given and no setting stored, none of Z1 to Z3 can happen (each needs a stored setting or a permitted
process), the options-off regressions give the builder's counts exactly (section 2), and the only product changes are
the U1 allocator (reviewed separately: merge), the adapter's refusal message and the release compiler's 8,192-form
limit. Z5 (a) and Z8 are the one branch's behaviour today (`8a362ac38` has the same enrolment ID and frame IDs), not
new. The merge itself: a trial merge of `a6f89a409` into `8a362ac38` conflicts in `ha1/local.ts` and
`scale1/decision/writes.ts` (the U1 resend against the one branch's product path: resolve as the U1 review's V2, the
resend on the lab path only), and both dists are rebuilt.

**What must be true before any setting is turned on.** Z1 fixed (the most urgent: no attacker, permanent); Z2 fixed
(a permitted publisher never publishes without the cap); Z3 fixed (the archive and mode decided from the origin the
frame is guarded on); Z4 settled with the removal line before either line's setting is on in one database; U8 and Z5
closed by the gateway rule that refuses a write to an account's names that does not name that account (0.B's
proposal); and the rollout order of 0.8 kept, for the last old-build frame the builder states.

**One recommendation: merge the Publish line with every option off now (the regressions in section 2 pass), and
fix Z1 before any account is given a setting: when the old ledger is in parts, write the new one in parts too (a
one-part head), so a closing piece is always the retractions and a small head.**

## 1. Findings

Tests are in `act10/review4.test.ts` (W1 to W10; W8c and W8d are diagnostics, skipped unless `W8C=1` or `W8D=1`); each
test's output line is in `agents/DX-ACT10/review4-tests.log`, the 40-history campaign in `review4-w4.log`.

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| Z1 | **High (no attacker; permanent)** | Under the archive a subject's ledger holds the items in force only, so it shrinks when a release owes fewer items than the last. `ledgerChange` writes a ledger that fits one part in its whole form, inside the closing piece with the retraction of every old part (`ledger-parts.ts` 105-106). `ledgerPartsMax` sized the closing frame for the retractions plus a small head (31-52: 10 parts at 7,985 us of the 8,000), not plus a packed ledger of up to 10,240 characters. So a shrink from parts to one part can make the closing piece alone exceed the bound; `fillFrame` refuses it (`frames.ts`), the cursor cannot pass the subject, and every later notice of the account is never recorded. Before the archive a ledger never shrank, so this path was never taken | W8: after 260 policies (2 parts), 155, 160 and 163 policies stop on every try, settler naming none or parts; 120, 140, 150 and 166 record. W8b: after 1,590 (10 parts), 20 and 60 stop. W8d prices the closing piece at 7,942 and 7,971 us of 8,000 before the cursor's own change. W4: 4 of 40 random histories (releases of 20 to 220 policies) stopped this way, at 150, 151, 152 and 162 policies | Write the new ledger in parts whenever the old one is in parts (a head naming one part; the reader's assertion that a head names at least 2 parts, 86, changes with it), so the closing piece is always the retractions and a head; or size `ledgerPartsMax` for a whole ledger in the closing piece (fewer parts per ledger) |
| Z2 | Medium (a busy account; permanent when it happens) | A permitted process tries a transition at most 8 times; each try is refused by any write to a row it fences (a frame's progress row, the cursor). Then "it plans under the settings as stored, as a process allowed nothing does" (`account-settings.ts` 82-109). A Publish then checks the cap only if the stored settings hold `ledgerCap` (`account.ts` 928), so the process permitted the cap publishes without it. A release over the per-release cap then lands, and its notices stop the account (F3) | W7: 8 transitions each refused by one values frame of a pending release (256 subjects, pages of four); the 1,700-policy release published at 80 with no setting stored; the next permitted Publish turned the settings on; the notices: "FrameTooLarge: ... needs 11 parts ... (1701 items)" | A process permitted the cap applies it whether or not its transition landed (or refuses its Publish and tries again), so the permission never publishes what the setting would refuse |
| Z3 | Medium (a window of two reads; one event; can stop) | A notice turn reads the source head, then the settlement store's head (`recorded.ts` 174-175), decides the archive and, through `ledgerFor`, the event's ledger mode from the origin at the first (206-207), and commits guarded on the cursor and the origin read at the second (`archive.ts` 210). A transition between the two reads rewrites the cursor with its own value, so the frame is not refused: the event is written without the archive, in the settler's own mode, and the cursor keeps that for the whole event. For a settler naming whole on ledgers in parts this is U2's refusal again (transient when it hits the first frame, as W1b shows; by the code, permanent if a later subject of the same event is the first in parts, since an event's mode is kept to its end). It is this build's own window, not only an old build's | W1: the event after the transition: cursor without `archive` or `ledger`, each subject's ledger 81 items with 41 in force and 0 archived; the next event archives and the fold is exact. W1b: on ledgers in parts, "A ledger in parts needs TX2_NOTICE_LEDGER=parts", then recorded on the next run | Decide the archive and the mode from the origin read at the position the frame is guarded on (read the settlement head first, as the values turn does), or carry the decision into the frame's guard |
| Z4 | Medium (two lines' settings in one database) | The archive writes `recorded-retired:<subject>:<item>` rows, one per retired item, never deleted. The removal line's sealing setting (`exp/DX-ERA4-derived-copies` `1b02d1d22`, `derived_seal.clj` 551-563, 614) refuses every derived document kind not on its list, and this kind is not on it: on a sealed database the first retirement under the archive is refused, and the recorder stops. Its ledger-part check reads parts as sealed units, and this line's parts are character slices of one packed ledger (the removal review's N1). And each archive row keeps the retired item's payload for good: wherever a payload carries a protected value, the row is one more copy that a removal must reach | Code read; not run (the removal line is not merged here) | Before either setting is on in one database: add the kind to the sealing check's list, seal the rows as ledger items are sealed, and cut parts at item boundaries; or keep the two settings apart |
| Z5 | Medium-low (the deny of U3 for the enrolment remains) | (a) With `TX2_ENROL_BESIDE_SAVES` unset (its default) the enrolment's ID is still `join-held-enrolment:<account>` (`account.ts` 336, 363): one save under it first and the account can never enrol. (b) With it set, the enrolment is guarded on its four entities being absent (346-361): one fact written first on any of them (here a write through another account's store naming `notice:v1:<hash>:join-meta`, the writer of the third review's T10) and it is refused every time; `enrolledWith` finds no enrolment | W2: (a) both tries "commit receipt differs from the request (command join-held-enrolment:acct-a)"; (b) both tries "guard differs with the head unchanged" | (a) the random ID on both paths; (b) the gateway rule of 0.B (a write to an account's names must name that account), the same that closes U8 |
| Z6 | Low (store-level writer, as U4) | U4's rule accepts a change whose entity starts with `_tx/` (`account.ts` 529), meant for the record's own journal, so a forged record that also writes another transaction's journal entity is still taken as the account's own Publish | W3: a record under `joined:r9` writing A's documents and B's Publish journal `_tx/mem15` is returned to A's Publish as its own | Accept only the record's own journal (`r.txId`) |
| Z7 | Information | The fence creates an owed release's first values row in the byte-frame form (`valuesProgress`, `account-settings.ts` 146) whatever the settler's framing, so a page-framed settler then stores that release in byte frames. The values are the same (39 changes either way); "nothing a reader sees changes" holds for the values, not for the framing | W6 | None needed if every reader reads both framings (they do here); say it in 0.A |
| Z8 | Information (default off) | With no setting stored, frame IDs are deterministic as before (`archive.ts` 219), so U3's deny of a settlement frame (the third review's T9) is unchanged on an account with no setting, which is every account with the options off | Code; the third review's T9 | None for a default-off merge; it closes with the first setting |

## 2. What was attacked and held, with counts

1. **The builder's tests at the head:** 98 of 98 (`review3` 10, `review2` 18, `targeted` 16, `cross-account` 11,
   `identity` 3, `lifetime` 2, `settings` 6, `stack-r3` 1, the 11 `join` files 31; `held.test.ts` needs
   `--experimental-transform-types`). This review's: 12 of 12 (W1 to W10 and W8b; W8c and W8d are diagnostics). The
   tests W1, W1b, W2, W3, W7, W8 and W8b assert the findings; W4, W5, W6, W9 and W10 assert what held.
2. **(2) The archive's fold against an independent oracle** (W4; the oracle is the kernel's fold over every event with
   the whole state, not the recorder): 40 random histories of 14 releases, 20 to 220 notice policies each from a pool
   of 240, 8% of policies renamed and 10% of forms' due days changed per release (a new payload under the same ID),
   releases 1 to 3 recorded whole with no setting, the settings turned on at release 4 by a publisher allowed the cap
   (and half the time frame guards), settlers naming none, whole or parts, killed at random (974 settling runs, 431
   killed, half of them after the commit with the reply lost). 36 histories completed: 125,944 notices in order equal to
   the fold, and for each of 144 subjects its ledger with its archive equal to the fold's whole state and its ledger
   equal to the items in force (up to 362 items held over time, up to 313 archived, up to 2 parts). The other 4 stopped
   on Z1.
3. **(2) A subject at the per-release cap** (W5): 1,590 policies, then 1,590 others, then the first again, each
   published and recorded; 1,630 refused at its Publish. 9,542 notices equal to the fold; each subject 3,181 items over
   time, 1,591 in force in 10 parts, 1,590 archived.
4. **(4) U2 for ledgers whole and near their limit at the first setting** (W10): two disjoint 90-policy releases
   recorded whole (181 items, about 11,000 of the 11,771 characters a whole ledger may hold), then the first setting
   and a release of 90 or of 200 policies, recorded by settlers naming whole: exact, 270 and 380 items archived.
   Outside Z3's window, a settler naming whole on ledgers in parts records (W1b's second run; the builder's T1).
5. **(3) The random enrolment ID** (W9): killed at each of its 16 store calls (the reply lost at every other one), then
   enrolled by a new process: one enrolment record every time; 40 pairs of enrolments of one account at once, with
   interleaving: both return enrolled, one record each.
6. **(1) The fences in the fuzzer** (the builder's `fuzz.ts` at the head, transitions as steps, new seeds):
   `ACT10_TRANSITIONS=1 ACT10_MIXED=1 ACT10_SHARED=1` (a mixed fleet: this build with some permissions, with none, and
   builds from before the settings). Namespaced, seeds 600,000 to 604,999: **0 of 5,000 violating**; 20,487 Publishes
   acknowledged, 11,860 transitions (3,724 landed inside a Publish's window, 60 inside a values frame's, 258 inside a
   notice frame's, 222 later releases inside a frame's), 1,430 kills, 494,059 notices and 112,574 ledger reads checked,
   128,870 archived items read back; 24,294 refusals by builds from before the settings (counted, not violations).
   Single layout (`ACT10_SINGLE=1`), seeds 606,000 to 608,499: **0 of 2,500**; 10,087 acknowledged, 5,884 transitions,
   692 kills, 246,881 notices, 60,910 archived items. Negative control, fence and origin guard both off
   (`DX_ACT8_INJECT=no-fence,no-origin-guard`), seeds 609,000 to 609,999: **6 of 1,000 caught** ("release 2 stored by a
   frame that landed after a later release"). The fuzzer's releases are small, so it cannot reach Z1, and Z3 leaves the
   fold exact, so its checks would not flag that window.
7. **(1) Repeated transitions do not starve a settler or a publisher** (code read): a transition is tried only while the
   stored settings lack something a permitted process may turn on (`needsTransition`), so an account sees at most one
   per permission (three), plus one after each direct rewrite of its origin (U6); each refuses the plans in flight once.
   A transition racing a transition: one lands, the other reads again and merges (the third review's T2, in the 98).
   The reverse, a transition starved by frames, is Z2.
8. **(1) The fence's created rows** (W6): the release's values are the same with and without the fence (39 changes);
   only the framing differs (Z7). A transition that does not land leaves nothing: it is one commit.
9. **The runs the builder skipped**, on this reviewer's image built from the head (holder DX-ACT10, the builder's own
   settings for each from its `chain7.sh`):

   | Run | What | Attempt | Result |
   | --- | --- | --- | --- |
   | `g4k-2` | the 1,000-form release, every permission (ledgers in parts with the archive) | `f1473574` | **pass**: 2 Publishes at one try, 17 positions and 136 pinned reads between read and record; the release settled 23,700 changes and 8,000 notices (independent rule 8 / 23,700 / 8,000); 8,008 notices in order |
   | `w4-2` | the held runner's unpaused windows, every permission | `ffb3f78e` | **pass**: 8 Publishes in 4 windows, each at one try, 0 refused, 0 missed deadlines, 0 read or visibility failures |
   | `r1-2` | options off: the default campaign | `eb7af9b5` | **pass**, the builder's counts: 86 changed values and 8 notices, 8 of 8 Publishes at one try, 0 read failures |
   | `r2-2` | options off: ACT5's live cases | `06382222` | **pass**, the builder's counts: 474 / 160 (8 / 474 / 160) in each of the six single cases; second-p superseded at 1 subject (420, 1,200) then 3,555; 2,328 notices delivered once, 0 twice |
   | `r3c-2` | options off: ACT6's gate at 200 forms | `8cfe0a8e` | **pass**, the builder's counts: 72 subjects, 4 stops (1 inside a ledger's parts), notices 14,400 / 7,200 / 21,672 delivered then 0, 2 parts per ledger, independent rule 72 / 42,720 / 14,400, 76 value and 510 notice frames (at most 7,995 and 7,993 us); the definitions table 619,097 and 938,509 B, 1,233,297 B then refused over the 1 MiB value, refused at 1.0 and 1.25 MiB, 3,532 to 3,547 B by reference |
10. **U4, U6, U7** as fixed: the builder's T3, T6 and T7 pass (in the 98); Z6 is the one gap found in U4's rule.

## 3. The archive and removal on request

**On this line.** A removal on request does not touch notice ledgers or archive rows here: this line has the removal
sequence (`datomic-erasure.ts`: the recorder refuses notices of an earlier sequence, and a transition commits under the
sequence it read), not the removal line's derived copies. So a removed value that a ledger item's payload carries stays
in the ledger, as it did before, and now also in the archive row once the item retires.

**What the archive changes.** Before it, a retired item stayed in the ledger value, so a ledger was one place to scrub
or seal. Under it, every retired item is a row of its own, `recorded-retired:<subject>:<item>`, kept for good and read
only by its key: more places, the same payloads.

**Against the removal line's sealing setting** (`exp/DX-ERA4-derived-copies` at `1b02d1d22`, the removal review's
`era5/REVIEW-2.md`):

1. **The kind is unknown to the check.** `derived_seal.clj` checks every new row of a derived document on a sealed
   database and refuses any kind not on its list (551-563; the refusal at 614). `recorded-retired:` is not on it. So
   on a sealed database the first retirement under the archive is refused and the recorder stops.
2. **Ledger parts.** The check reads a ledger part as a vector of sealed units; this line's parts are character slices
   of one packed ledger, so they fail the check. This is the removal review's N1 seen from this side.
3. **What the archive does to N1.** N1: with the sealing setting a sealed item packs to about 400 characters, so a
   ledger outgrows one part between 30 and 32 owed forms, and parts are refused. The archive keeps only the items in
   force in the ledger, so retired items no longer count. The bound on items in force stays: about 25 to 30 sealed
   items fit one part. Releases owing a subject more than that still need parts, and the archive's rows are refused
   besides. The archive does not lift N1, and on a sealed database it adds a stop at the first retirement.

So until the two lines agree on these three points, an account's settings here and the database's sealing setting
there must not both be on.

## 4. What was not tested

- **A removal on request beside the archive.** Not run: the removal line is not merged here (section 3 is code read).
- **The last old-build frame** (0.A, U5): not attacked again; the builder states it, and the rollout order removes it.
- **Z1 on a stack.** Shown in process on the real recorder and frame code; the refusal is the writer's own estimate,
  computed before any commit (`fillFrame`), so a stack would refuse the same frame; not run on a stack.
- **Z3 with a permanent stop.** The window was shown, and U2's refusal in it; a permanent stop needs an event whose
  first frame commits before a subject in parts, which the toy accounts (every subject owes the same) do not give.
- **Two databases, a restore from a real backup, the fuzzer's schedules on a stack**: as in the third review.

## 5. How to run

```sh
node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/review4.test.ts      # W1 to W10
W4_SEEDS=40 W4_RELEASES=14 node --experimental-strip-types --test --test-name-pattern='^W4' \
  lab/experiments/EXP-DX1/act10/review4.test.ts                                         # the 40-history campaign
```

Stack runs: `agents/DX-ACT10/chain-9.sh` with `toy5.sh` (holder DX-ACT10, `DX_ACT10_RERUN=1`, the builder's own settings
for each run from its `chain7.sh`).

## 6. Evidence

Private, outside the repository (the owner's project folder `agents/DX-ACT10/` and `evidence/DX-ACT10/`):
`review4-tests.log`, `review4-w4.log`, `builder-suites-4.log`, `fuzz4/`, `chain-9.log` and `run4-*.log`,
`image-receipt-5.json`, `predictions-2.md` (fourth-review part, written before the runs).

# Second review of the pinned-read options: the hardening, the audit gate and the default flip (DX-RD6)

Reviewer's page, branch `exp/DX-RD6-pinned-read-review`. Head under review: `origin/exp/DX-RD7-pinned-read-hardening`
at `681bd528a` (the builder's page `rd7/HARDENING.md`; it contains the one branch at `65a851d1b`). The trial flip is
the reference branch `exp/DX-RD6-ref-default-flip`, made from `681bd528a`. Written 2026-11-26 from 01:12 to 01:44 EST
by the review agent. Every count below is a result; every time is a Mac diagnostic. All runs are Mac toys (in-memory
Datomic, or one PostgreSQL database inside one lab container).

## Verdict

**Yes: the flip may go onto the one branch together with the hardening and the audit gate.** It needs four standing
gates (below), the three launcher fixes that are on the reference branch, and one server measurement before anyone
relies on the gain.

1. **The hardened cut lookup is exact in every case asked about, including the builder's one deviation.** A position
   with no history answers nil. That is exact because the read route builds the pinned view from the same database
   value it binds as the current one (`storage.clj` `read-rows`: `*current*` is `db`, and the view is
   `(at-position db p)`, which refuses a position past `db`'s head). So the view can hold only datoms that the current
   database's history also holds. If no history datom exists, no view holds the number, and the reference lookup on
   the past view also answers nil. Tests: 0 differences in every case (section 1). The grouped attack goes from 2 of 6
   differing reads to 0 of 6 in my own run, for both the retraction and the re-assertion.
2. **The audit gate fails every break I built that makes the short-cut or the cut lookup answer wrong: 6 of 6** (four
   that break the short-cut, two that break the unguarded cut lookup). It also fails a retraction split from its
   assertion, and a position reused after its retraction. It does not see three breaks that make the reach route's
   parsed-entity cache answer wrong with every option off. The report-only count (d) sees two of them. Nothing sees
   the third, where a revision moves back to an earlier value while the rows change. **Ruling on (d): make it a
   failing rule.** It has two exceptions: entities born in the transaction and folds. It needs nothing for index
   entries, which (d) never counts. **Add a rule (e)** that fails when a subject's revision is asserted at or below
   the value it replaces. Product writers trip (d) and (e) 0 times in every run here. This is about the cache that is
   already on the one branch with every option off (R6-2). The flip does not create it, but the gate is the right
   place to close it.
3. **The flip changes no answer and no stored byte.** With the options explicitly off, the stored log, the replies
   and the key store are identical to the one branch's (with and without removals). With the default left on they are
   also identical. Stored-function identities are 70 of 70 equal with the settings unset, set to 1, set to 0, and on
   the base. My attacks pass in 9 writer settings, and in 6 more on the removal line merged with the flip. The fuzz
   hook shows 0 differences in 5 settings. The mixed fleet (one writer, and readers explicitly off, on by default and
   tuned, on one PostgreSQL database) shows 0 differences in 218,668 comparisons while 13,196 saves and 155 removals
   ran. With an in-process grouped writer on the same database it shows 0 differences in 121,258 comparisons over
   1,804 groups and 3,423 interior positions. A restore to an older position, with the lost positions taken again,
   shows 0 differences in 1,750 reads x 4 option sets.
4. **What a caller sees change: nothing but speed.** An operator sees four changes (section 3). The one that matters:
   three lab launchers leave the settings out when they mean off, so after the flip they would start readers with
   both options on. Two of them would then fail their own option checks, and one would silently measure an "off"
   reader that is on. The reference branch fixes all three.

**Standing gates for the one branch after the flip:**

| Gate | When | Fails on |
| --- | --- | --- |
| G1. The writers' audit gate (`rd7/audit-gate.sh`, its production half inside `prep1/stack.sh`) with rules (a), (b) and (c) failing, and (d) and (e) failing once added | every merge that changes a writer, a stored function or a write route | any violation; (d) outside its two exceptions; (e) at all |
| G2. Stored-function identities (`int5/idents.sh`), with the two settings unset, `1` and `0` | every merge that touches a namespace loaded before `commit.clj`, or the two options | any identity that moves |
| G3. The option-off stored log (`b2-keys/gate.sh` paired, `B2_THIS_ENV='TX2_PINNED_SHORTCUT=0 TX2_PINNED_CUT_LOOKUP=0'`) against the merge base | every merge | any difference in the native log, the replies or the key store |
| G4. This review's attacks (`rd6/attacks.clj`, 9 settings) under the default | any change to `pinned.clj`, `group_cut.clj`, `group_cut_guard.clj`, the short-cut's rule in `cross_index.clj`, or the pinned paths of `lean.clj` and `reach.clj` | any failed test; a planted break that does not fail the audit |

**Before the gain is relied on:** a server must measure both options on with the guard installed at 1 billion. The
condition-3 numbers (both on 450 reads/s at the old pin, 527 near the head, 16 seats) were taken without the guard,
and the guard replaces one current-index seek with one history-index seek. My prediction is under 2% of reads/s at
16 seats, because no writer ever retracts a position. That leaves the history index with no datom of
`:triplex.group/position`, so every seek lands in the same small, cached part of the tree. Section 4 has the steps and
the bar.


## Heads

| What | Commit |
| --- | --- |
| Under review | `681bd528a` (`origin/exp/DX-RD7-pinned-read-hardening`); its gateway differs from the one branch `65a851d1b` by `group_cut_guard.clj` and two lines of `main.clj` |
| The one branch (the base of the paired, identity and option-off runs) | `65a851d1b` |
| Trial flip (reference, not for merge as is) | `exp/DX-RD6-ref-default-flip` at `2cf72e92c`: `681bd528a` plus 14 lines in `group_cut_guard.clj`, 3 in `pinned_test.clj`, the three launcher fixes, and this review's harness |
| Removal line with the flip (local trial, not pushed) | `99359fa93` (`origin/exp/DX-ERA6-removal-on-save-line`) merged with the flip at `66c018c01`; `main.clj` requires `removal-scope`, then `group-cut-guard` last |

Images, started by ID: the lab Datomic runtime `sha256:da58aea16b31…` for the in-memory runs, and
`sha256:21a67288007d…` for the PostgreSQL runs. The tested tree's gateway sources come first on the classpath (a copy
taken at start). Evidence: the private evidence folder `DX-RD6-2/`.


## 1. The hardened cut lookup

**What it does** (`group_cut_guard.clj` `member-at`, installed from the last namespace `main.clj` loads, only with the
option on). It makes one seek into the position's history (`d/datoms (d/history current) :avet position cut`, at most
two datoms):

| History of the position in the current database | Answer | The reference (lookup ref on the past view) |
| --- | --- | --- |
| no datom | nil | nil: the view is `as-of` a t at or below the current database's basis, so it cannot hold a datom the current history lacks |
| one datom, an assertion, transaction at or before the view's t | that entity | the same entity: the assertion is in the view, and no retraction exists |
| one datom, an assertion after the view's t | nil | nil: the view is older than the assertion |
| anything else (a retraction, a second assertion) | the reference itself (counted as a fallback) | — |

**Why the deviation (nil for no history) is exact.** The guard is exact if the current database it reads contains
every datom the view can see. Every caller satisfies that:

- `storage/read-rows` binds `pinned/*current*` to its own `db`, and builds the view as `(at-position db p)`. That
  function refuses a position past `db`'s head (`unavailable!`), so the view is `db` as of an earlier or equal t.
- Held handles and staged previews bind `*current*` to nil, so the guard falls through to the reference (line 30).
- The batch route resolves one `db` (waiting for the pin with `await-position`, or refusing with 503), then calls
  `read-rows` with it. The sweep route does the same.
- The `/v1` read reaches `member-at` through `reach/select-db` inside that binding. The `/v2` reach routes call the
  same `select-db` outside it, so `*current*` is unbound there and they take the reference.

Datomic's history view of a database value includes the memory index and every indexed segment, so indexing does not
change the answer. An excision removes datoms from every view alike, the history included, so both answers agree
there too.

**The four cases asked about:**

| Case | Why it is exact | Test (this review) | Result |
| --- | --- | --- | --- |
| A position not yet indexed | the history view covers the memory index | `review2.clj` `guard-behind-indexed-and-never-written` on PostgreSQL: 24 batches of 2 to 5 grouped saves with solo saves between, `d/request-index` after batch 11 and `d/sync-index` (indexed to t 1077), every position read from 24 database values and the head | 6,534 comparisons from databases behind, 0 differences; 2,178 cross comparisons (a pin read from a database behind against the head), 0; at the head 3,522 reads x 4 option sets, 0 |
| A position written after the pin | if the position's one assertion is newer than the view's t, the guard answers nil, and the view lacks the position too | the same test: every pin is read from the database value of its own time and from every later one up to the head, whose histories hold the positions written after it (the cross comparisons) | included above; also in memory: 6,831 and 2,277 comparisons, 0 differences; 3,621 x 4 at the head, 0 |
| A restore to an older position | after a restore the database holds only the backup's datoms plus the new ones, so a position taken again has one assertion; the project's restore stops every gateway and the transactor first (`era2/stack-restore.sh`), so no peer keeps a cache from before | `rd6/restore-container.sh`: PostgreSQL, seed and 6 groups, `backup-db`; 6 more groups (answers kept); stop the transactor, `restore-db`, a fresh transactor and peers; 6 groups that take the lost positions again; every position under every option set, the answers at the backup's positions against those before the backup, and the audit | backup at head 38, then head 64; restored to 38; the lost positions 39 to 64 taken again by 6 groups and solo saves. Every position x 8 subjects: 1,750 reads x 4 option sets, **0 differences** (669 short-cut answers). Answers at the backup's positions: 304 of 304 equal to those before the backup. Grouped positions after the restore: 30, each with exactly one assertion in its history. Audit: (a) 0, (b) 0 / 0, (d) 0, (e) 0 |
| A second gateway behind | a gateway behind the pin waits up to `basisWaitMs` (at most 2,000 ms) for its peer to reach it or answers 503; it never builds a view past its own database, so it reads the same datoms as a gateway that is caught up, or refuses | the in-memory and PostgreSQL tests above read every position from 24 older database values; the mixed fleet (section 3) runs three readers beside the writer | 0 differences in both tests. HTTP fleet: 218,668 comparisons, 0 differences; 503 refusals while a removal was being published fall on both sides alike (150 on the readers with the options on, 140 on the reader with them off). Grouped fleet: three reader gateways behind an in-process grouped writer, 121,258 comparisons over 3,423 interior positions, 0 differences |

Positions with no history at all in those tests: 53 of 109 (memory) and 52 of 106 (PostgreSQL), the solo saves and
seeds. Positions with exactly one assertion: 56 and 54. Guard fallbacks: 0, since no product writer retracts or
repeats a position.

**Hypothetical writers against the guard** (my `attack grouped` under the flip, so the guard is installed by
default): an interior member's position retracted gives **0 of 6** differing reads under `on`, `cut` and `hard` (2 of
6 at the first review without the guard). The same number asserted again on another entity also gives **0 of 6** (2 of
6 before). Every other grouped case passes: every interior and end position (390 reads x 4 option sets, 0
differences), and forty groups on sixteen subjects (9,110 reads x 4, 0 differences, 113 grouped positions).

**Stored-function identities** (`rd6/identity-run.sh`, which runs `int5/idents.sh` on the base and on this tree and
compares them with `compare-idents.py`). The base is the one branch `65a851d1b`; this tree is the flip. The 8 settings
the one branch checks, plus 4 for this review: the options unset, both `=1`, both `=0`, and the base with both `=0`.
Result: **70 of 70 equal in every setting, 0 new keys** (`DX-XQ10_IDENTS_COMPARE equal`).

**The option-off log** (`b2-keys/gate.sh` paired, against `65a851d1b`). With `TX2_PINNED_SHORTCUT=0
TX2_PINNED_CUT_LOOKUP=0` on this tree: native log, replies and key store after a shred pass **identical**, with
removals and without, unsealed and sealed. With nothing set (the new default, both on): also **identical**. The
options change reads only, and both runs wrote through the same writers. The suites around them: 92 tests, 236,380
assertions, 0 failures, and 1 error that is the same on the base and on this tree (`http-route`, a `ClassCastException`
in `json.clj` line 82, which the base also raises). `sweep-shapes-test`: 89 of 89.


## 2. The audit gate against breaks it was not shown

Each break below is one raw `d/transact` (a hypothetical writer), made after product saves on a subject S, a second
subject T and an owned form F that S references. Then one more product save. Then the probe reads every position x
{S, T, F} under both options on (`on`), the short-cut alone (`short`) and the first review's hardened reader (`hard`).
It also reads the options-off reach route twice, cold and after a head read has filled the parsed-entity cache, and
runs the audit (`rd7/audit.clj`, unchanged). Grouped setting, memory and PostgreSQL. The counts are the same on both.

| Break | Short-cut reads that differ | Reach cache stale (options off) | Audit rules that fail | (d) report-only | (e) proposed |
| --- | --- | --- | --- | --- | --- |
| A row of S retracted, a row of T asserted, one transaction | 3 of 12 | 3 | (a) | 2 | 0 |
| A row of S retracted alone; an assertion on S in a later transaction | 0 of 12 | 3 | (a) | 2 | 0 |
| A row of S retracted with a retirement marker asserted on S; the marker retracted later | 3 of 12 | 3 | (a) | 2 | 0 |
| A row of S retracted with only an index entry asserted on S | 3 of 12 | 3 | (a) | 1 | 0 |
| A writer that touches only the owned form F: a row of F retracted alone | 1 of 12 | 2 | (a) | 1 | 0 |
| A retired row of S asserted back, revision unchanged | 0 of 15 | 1 | none | 1 | 0 |
| A row asserted on S, revision unchanged | 0 of 12 | 3 | none | 1 | 0 |
| A row of S replaced by another text, revision unchanged | 0 of 12 | 0 (my text differed only by a trailing space, which the parse ignores) | none | 1 | 0 |
| Two rows of S retracted and S's revision moved back to its earlier value, after a save had moved it on | 0 of 15 | 3 | none | 0 (the revision is asserted) | **1** (the only rule that fails) |

Position cases (grouped-save positions, `:db.unique/value`):

| Break | Audit |
| --- | --- |
| A position retracted, never reused | fails (b): a grouped-save position retracted |
| The same number asserted on a new entity after the retraction (Datomic allows it once the value is free) | fails both halves of (b): a position retracted, and a position asserted again |
| The same number on two live entities | refused by Datomic (`:db.error/unique-conflict`), so no writer can store it |

The first review's hardened reader (`hard`) answered every case correctly (0 differences).

**What this shows.**

- **Everything that breaks the short-cut fails (a).** The short-cut answers wrong only when a transaction retracts on
  a subject without asserting on it. With a T-only assertion, a marker or an index entry beside the retraction, (a)
  still sees it: an assertion on another subject does not count, and index entries do not count.
- **A retraction split from its assertion over two transactions fails (a)** on the first transaction, though the
  short-cut is then right by luck: the later assertion sends every older pin to the past view.
- **A writer that touches only an owned entity fails (a).** The audit's "subject" is any entity that has ever had
  `:triplex.entity/id`, and owned forms have one. The short-cut checks each read entity on its own, so a change to F
  alone sends F, not S, to the past view (0 differences on S in every case).
- **The reach cache depends on a stronger invariant than the one the audit gate checks.** The cache keys a parse by
  (entity, revision). It is exact only while every change to an existing entity's rows, markers or owner root moves its
  revision to a value it has not had before. Three breaks pass (a) to (c) and leave it stale: two are seen only by
  (d), and one by no rule.

**Ruling on (d): it should be a failing rule.** Two exceptions only:

1. **Entities born in the transaction** (their `:triplex.entity/id` is asserted in it): no parse of them can exist
   from before. The builder's code already leaves them out.
2. **Folds** (the transaction carries `:triplex.owner/folded`). A fold rewrites where an owner's texts live (`+row
   -row -root` on the owner) without changing a logical row, so a parse from before the fold is still right. This
   exception rests on that claim. No test compares a reach read cached before a fold with one cold after it; add one to
   the owner-head attack before (d) fails, or drop the exception and have folds move the revision.

No other exception is needed. Index-entry-only transactions never reach (d), because `:triplex.ix/entry` is not one of
the parsed attributes. Removal on request needs no exception either. Rule (c) already holds it to retracting nothing
of a subject, and (d) counted none of its transactions: 0 across the fleet's 155 removal transactions and the fuzz
runs' removals and removal races. The builder's worry was the save ledger's implicit revisions in the grouped
settings. They do not trip (d): the ledger drops `:triplex.entity/rev` only from the journal entity, which holds no
rows. With the ledger on and groups formed, (d) counted 0 (61 grouped positions in the guard test, 30 in the restore
test), and so did (e).

**Add rule (e): a subject's revision is never asserted at or below the value it replaces.** It is a check on the
cardinality-one retraction in the same transaction (`rd6/attacks.clj` `revision-regressions`, 13 lines). It closes the
last break. A revision retracted without a replacement is a retraction without an assertion on the subject, which (a)
already fails.

**Product writers against (d) and (e)** (the flip's default, so every audited database was written with both options
on; folds counted apart):

| Run | Transactions audited | (d) outside the exceptions | (e) | (a) / (b) |
| --- | --- | --- | --- | --- |
| Fuzz hook, flip, server / serial / grouped (seed 51, 600 serial steps, 300 concurrent saves, unsealed protection, removals, faults) | 865 / 862 / 835 per database, candidate and control | 0 | 0 | 0 / 0 |
| Fuzz hook, removal line with the flip, server-removal / serial-removal (seed 61, sealed protection, removal options on, 10 removals and 6 removal races per run) | 836 / 842 | 0 | 0 | 0 / 0 |
| Guard test, grouped with the save ledger, memory (24 batches, 61 grouped positions) | one scope | 0 | 0 | 0 / 0 |
| Mixed fleet, PostgreSQL (13,196 saves, 155 removals; (c) 0 of 155 removal transactions) | 13,150 | 0 | 0 | 0 / 0 |
| Mixed fleet with groups, PostgreSQL (1,804 groups, save ledger on) | 3,637 | 0 | 0 | 0 / 0 (4,816 positions asserted) |
| Restore test, PostgreSQL (groups with the save ledger, 30 grouped positions after the restore) | one database, whole log after the restore | 0 | 0 | 0 / 0 |

The builder's runs (`rd7/HARDENING.md` section 3) found only the planted writers and the owner-head folds under (d)
on every database they audited.


## 3. The default flip

**The trial** (reference branch). `group_cut_guard.clj`, the last namespace loaded, sets both options from their
variables: unset or `1` means on, `0` means off, and any other value refuses to start
(`IllegalArgumentException: TX2_PINNED_SHORTCUT must be unset (on), 1 (on) or 0 (off), not "false"`). The guard is
installed when the cut lookup is on. The definitions in `pinned.clj` and `group_cut.clj` stay as they are, because
editing them would renumber generated names inside the stored functions (G2). `pinned_test.clj`'s one assertion that
assumed the old default now binds the option off itself.

**Runs on the flip** (no setting given unless named):

| Run | Result |
| --- | --- |
| Defaults as loaded (`review2.clj` `defaults-as-loaded`, nothing set) | short-cut on, cut lookup on, guard installed, `write-options` reports both true |
| My attacks (`rd6/attacks.clj`), 9 settings: server, grouped, owner head, serial, general, index, import, hints, accounts | 8 tests each, 0 failures, 0 errors; the planted breaks differ exactly where the first review found them (the short-cut's two, which the audit fails), and the guard's two now give 0 of 6 |
| The same on the removal line merged with the flip, removal options on (`TX2_REMOVAL_PER_ACCOUNT=1 TX2_REMOVAL_SUBJECT_CHECK=1 TX2_REMOVAL_REPLAY_RULE=1 TX2_REMOVAL_COMMIT_BOUNDARY=1`): server, serial, general, grouped; and server, grouped with them off | 8 tests each, 0 failures, 0 errors. Removal masking at every pin under all five option sets, unsealed and sealed: 117 reads per case, 0 differences, 0 removed values visible |
| Fuzz hook (`rd6-attacks/fuzz-main` over `s5/fuzz.clj`), server, serial, grouped | 15,670 / 15,709 / 15,475 read shapes x 4 option sets, 0 differences; S5's own comparison 0 differing; 113,217 / 110,361 / 126,939 short-cut answers |
| Fuzz hook on the removal line with the flip, server-removal, serial-removal, sealed protection | 15,434 / 15,280 read shapes x 4, 0 differences; S5 0 differing |
| Guard tests (section 1), memory and PostgreSQL | 0 differences |
| Mixed fleet: one PostgreSQL database, the writer, and three readers: 8081 explicitly off (`=0`), 8082 with no setting (the new default), 8083 tuned with no pinned setting | `write-options` as started: off false / false; default true / true; tuned true / true. Two phases (per-subject saves, then append), 60 s each: 13,196 saves (12,982 committed), 155 removals, head 13,137. **218,668 comparisons between the off reader and each other reader, 0 differences**; 75,480 of them in the final sweep of every position. 772,612 short-cut answers on the default reader. 290 reads refused once with `503 ErasureFrontierUnavailable` while a removal was being published, spread over both sides; 662 driver-side exceptions before a save was sent (the first review's fleet had 241 to 720 per run). Audit of the whole log: 13,150 transactions, (a) to (e) all 0 |
| Mixed fleet with groups: the same three readers behind an in-process grouped writer on the same database (group writer and save ledger on; `RD6_GROUPS_PROTECTION=0`, see the observation in Findings), 120 s | 1,804 groups, 7,031 saves committed, 4,816 grouped positions of which 3,423 are interior. **121,258 comparisons, 0 differences** (1,762 in the final sweep). Audit: 3,637 transactions, (a) to (e) all 0 |
| Identities and option-off log (section 1) | 70 of 70 equal in every setting; identical |

**What a caller sees change:** no answer. Pinned reads get faster: one seek replaces the walk to a grouped position,
and an unchanged subject is answered from the current database. `/v1/db/<db>/write-options` reports
`pinnedShortcut: true` and `pinnedCutLookup: true` on a gateway started without the settings. The pinned counters in
`/v2/admin/scan-stats` move.

**What an operator sees change:**

| Before (the one branch `65a851d1b`) | After the flip (with the hardening) |
| --- | --- |
| A gateway started without the two settings: both off | both on, guard installed |
| `=1`: on, the unguarded cut lookup | on, with the guard |
| `=0`: off | off; the gateway is the one branch's byte for byte (G3) |
| Any other value (`true`, `on`, `yes`, empty): silently off (only `"1"` turned them on) | the gateway refuses to start and names the variable (from the code: the namespace throws while `main.clj` loads it; not started with such a value here) |
| `stack/up.sh` (`${DX_PINNED_SHORTCUT:-0}`): off unless asked | unchanged: it always passes a value, so its stacks stay off until its own default changes. That is a separate decision; the demo profile already passes `1` |
| `ha1/stack.ts` `pinnedReaderEnv`, `erase1/local.mjs`: pass nothing when off | without the fix they would start "off" readers with both on. `chk1/read.ts` and `erase1/regression.ts` assert the reader's options, so they would fail loudly. **Fixed on the reference branch**: both always passed |
| `thin1/slot.ts`: passes `1` for the tuned card reader and nothing otherwise | without the fix the reference card reader would run both on, and its measurements would be labelled wrongly with nothing failing. **Fixed on the reference branch**: `0` passed for every other reader |
| `demo/server-up.sh` G7 reads the options from the container's environment (`=1`) | unchanged today (the demo profile passes `1`); a reader started without the variables would be on while this check calls it off. Reading `write-options` from the gateway would be the exact check |


## 4. Not tested, and what a server must measure

**Not tested here:**

- Anything at scale or with storage timings. In particular, **the guard's history seek at 1 billion is unmeasured**.
  The condition-3 numbers predate the guard.
- A peer kept running across a restore. The project's procedure stops every gateway first. Datomic does not support
  restoring under running peers, and every read path, not only the guard, would be wrong there.
- The fold exception to (d): no test reads a reach parse cached before a fold against one after it (section 2).
- Groups in the fuzz: the S5 fuzzer's grouped setting formed no group in any run here (0 grouped positions in 3
  runs). Groups come from the targeted tests, the guard tests, the restore test and the in-process grouped fleet.
- Groups together with protection and removals in one fleet: with a protected attribute declared, no group formed
  (observation below). The grouped fleet therefore ran without protection, and removals ran in the HTTP fleet.
- Real older builds beside this one; failover promotion; the HA1 account move.
- Stored-function identities on the removal line merged with the flip (`66c018c01`): not run. That line's
  `removal-scope` is also loaded last for identities, and the guard now loads after it. The guard changes no stored
  function's text, but G2 must run when the two lines meet on the one branch.
- The production gate's PostgreSQL half of the audit on the flip (the builder ran it on `681bd528a`'s base; the flip
  changes no writer, and G3 shows the stored log identical).

**What a server must measure before the flip is relied on** (the session build plus the guard, the 1 billion
database, one reader core, the condition-3 ladder):

1. Both on with the guard against both on without it, at the old pin and near the head, at 1, 16 and 256 seats. Bar:
   reads/s within 5% of the unguarded numbers at 16 seats (450 old pin, 527 near the head). **Prediction: under 2%**,
   because no position has a history datom, so every seek lands in the same cached leaf of the history index.
2. The cut lookup alone with the guard, the same ladder: the guard's cost without the short-cut's saving beside it.
3. Wrong values: 0, with the comparison the condition-3 run used.
4. If the history seek costs more than the bar: keep the builder's unguarded lookup behind the audit gate's rule (b),
   which catches every writer that could make it wrong (section 2). The guard then becomes a second defence that is
   not worth its price.


## Findings

**R6-6 Medium (gate gap; no defect on the head). The audit gate does not see a revision that moves back.**
Head `681bd528a`, and the flip. A transaction that changes a subject's rows and asserts its revision at an earlier
value passes (a) to (d). With every option off, the reach route's parsed-entity cache then answers 3 of 15 reads with
rows from the other state that shares the revision. Reproduce: `run2.sh OUT review2 grouped`, test
`audit-against-other-breaks`, case "a row changed and the revision moved back to an earlier value". No product writer
does this (0 in every run). Smallest fix: rule (e) in `rd7/audit.clj`.

**R6-7 Low (gate gap). The report-only count (d) leaves two reach-cache breaks passing.** A row asserted on a subject
without moving its revision, and a retired row put back the same way: 3 and 1 stale reach reads, gate passes. Fix:
(d) failing, with the exceptions of section 2.

**R6-8 Low (fixed on the reference branch). Three lab launchers leave the settings out when they mean off.**
`ha1/stack.ts`, `erase1/local.mjs`, `thin1/slot.ts`. After the flip, their "off" readers would run both options on.
Fix: on `exp/DX-RD6-ref-default-flip`, carry it with the flip.

**R6-9 Info. `demo/server-up.sh`'s G7 check reads the options from the container's environment.** It is right today
only because every demo stack passes `1`. Reading `write-options` would stay right after any default change.

**R6-10 Info. The S5 fuzzer's grouped setting forms no group.** 0 grouped positions in every run here. Group coverage comes from targeted tests. A fuzz setting that holds the group writer's turn
(wfix1's barrier) would close it.

**Observation (not about the options). A scope with a protected attribute declared formed no group in my harness.**
Grouped fleet attempts 2 and 3 declared `:p/secret` protected, unsealed. Every group failed (attempt 2: 23 timeouts
at wfix1's barrier and 1 other error; attempt 3: 24 timeouts), and no save committed through a group. Each failure
came before that round's protected save, so no protected value was ever written: the declaration alone was enough.
Each time the leader reached the group writer, but no other member joined its queue while the leader was held. Attempt 4 is the same driver without the declaration, and formed 1,804 groups with 0 errors. The first
review's HTTP fleet (also protection declared) never formed a group either. I did not find the line that sends these
saves past the lane. If this is not intended, group commit is off for every account that declares a protected
attribute.

**Observation (not about the options). After a restore to an older position, a pin issued between the backup and
the restore names different data.** In the restore test, 169 of the 208 (position, subject) answers at positions 39 to
64 changed meaning: those positions were lost with the restore and taken again by new saves. The answer is the same on
every option set (0 differences), so no read path can notice. A client holding such a pin reads the new saves without
any error. If that matters, the restore procedure would need to make old pins refusable, for example with a database
epoch in every position.


## Reproduce

From a checkout of `exp/DX-RD6-ref-default-flip` (the scripts copy the tree's gateway sources and the harness at
start), one ordinary heavy token per command, `DOCKER_HOST` naming the lab VM:

```
node lab/bin/heavy.mjs --label DX-RD6-r2-attack -- bash lab/experiments/EXP-DX1/rd6/run2.sh OUT attack "server grouped ownerhead serial general index import hints accounts"
node lab/bin/heavy.mjs --label DX-RD6-r2-review2 -- bash lab/experiments/EXP-DX1/rd6/run2.sh OUT review2 "grouped server ownerhead"
RD6_STORAGE=pg node lab/bin/heavy.mjs --label DX-RD6-r2-review2-pg -- bash lab/experiments/EXP-DX1/rd6/run2.sh OUT review2 grouped
S5_SEEDS=51 S5_STEPS=600 S5_ROUNDS=2 S5_THREADS=4 S5_PER_THREAD=50 S5_PROTECTED=unsealed S5_REMOVALS=1 S5_FAULTS=1 \
  node lab/bin/heavy.mjs --label DX-RD6-r2-fuzz -- bash lab/experiments/EXP-DX1/rd6/run2.sh OUT fuzz "server serial grouped"
RD6_SRC=<removal line merged with the flip> node lab/bin/heavy.mjs --label DX-RD6-r2-era6 -- bash lab/experiments/EXP-DX1/rd6/run2.sh OUT attack "server-removal serial-removal general-removal grouped-removal server grouped"
RD6_READER_MODE=flip RD6_SECONDS=60 RD6_PHASES=per-subject,append node lab/bin/heavy.mjs --label DX-RD6-r2-fleet -- bash lab/experiments/EXP-DX1/rd6/fleet.sh OUT
RD6_DRIVER=groups RD6_GROUPS_PROTECTION=0 RD6_READER_MODE=flip RD6_SECONDS=120 node lab/bin/heavy.mjs --label DX-RD6-r2-fleet-groups -- bash lab/experiments/EXP-DX1/rd6/fleet.sh OUT
node lab/bin/heavy.mjs --label DX-RD6-r2-restore -- bash lab/experiments/EXP-DX1/rd6/restore-run.sh OUT
node lab/bin/heavy.mjs --label DX-RD6-r2-idents -- bash lab/experiments/EXP-DX1/rd6/identity-run.sh OUT 65a851d1b
B2_THIS_ENV='TX2_PINNED_SHORTCUT=0 TX2_PINNED_CUT_LOOKUP=0' node lab/bin/heavy.mjs --label DX-RD6-r2-paired-off -- bash lab/experiments/EXP-DX1/b2-keys/gate.sh OUT paired 65a851d1b
```

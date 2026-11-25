# Third review of `TX2_DERIVED_SEAL`: the builder's answer at `e75f61f40`

Reviewer DX-ERA5, 2026-11-25 (started 16:54 EST; this page written from 17:41 to 18:08 EST). Branch
`exp/DX-ERA5-derived-copies-review`, fast-forwarded to `origin/exp/DX-ERA4-derived-copies` at `e75f61f40` (code
`6b6243ead`; the removal branch merged at `03bb49cd3`). Tests only: no line of the code under review was changed. Mac,
toy sizes; every time on this page is diagnostic. Evidence: the lab evidence folder, `DX-ERA5/r3.tar.gz`.

**What was read, in this order.** The code diff `73e0d6849...e75f61f40 -- packages/` (12 files: `derived_seal.clj`
+586/-, `removal_commit.clj`, `main.clj`, `failures.clj`, `removal_repair.clj` new, `erase.clj`, `envelope.clj`,
`privacy.clj`, `storage.clj`, `DatomicClient.ts`, `DatomicStorageAdapter.ts`, `TransactionContext.ts`); the lab writers
(`bench/lib/derived-seal.ts`, `join/ledger-parts.ts`, `join/recorded.ts`, `read.ts`, `actv-lazy/store.ts`,
`bench/lib/datomic-erasure.ts`) and what they rest on (`bench/lib/deep-activation.ts`, `packages/w0/src/outbox.ts`
`publish`, `join/index.ts`, `actv-delta/rules.ts`); then `era4/DERIVED-COPIES.md` section 14; then the Publish review's
Z1 (`act10/REVIEW-4.md` at `5079fa7cc`) and the removal builder's `383db77d1`.

## Page 1

**Does the derived seal break? Not where it was built to hold; yes in three places around it.** With today's writers
placing records at a subject's real root, no removed value came back: every record computed from a removed value opened
as removed and no key left in the store decoded it (the deep-layout fuzzer, 21,000 schedules on the two boundaries,
627,253 checks, 0 violations; the earlier breaks B1 to B5 and N1 to N8 re-run and closed, except B4 in the deep
format and N3 away from the subject's own root). What breaks is around it: one subject can stop a whole account, and
the gateway's new root rule accepts a place that is not the subject's.

**How sure.** The first two are deterministic: T1 failed in process and on a stack, and again on a second try; T2
stopped in two runs, and again on a second try. T3 reproduced in hand-made cases on both boundaries and 10,918 times
in the fuzzer. Toy sizes on the Mac.

**The three most serious findings, each with its reproducing test:**

1. **T1. In the deep format, one removal on request stops the account** (B4 again). After one subject's protected
   document date is removed, the next release's settlement and notice recorder fail for the whole account
   (`Missing or ambiguous :file/expiresOn 0 !== 1`), every time, in process and on a stack; no subject gets the
   release's notices. The deep world builder requires exactly one row per document date, and the B4 fix removes the
   row before the builder reads it. Test: `era5/deep-remove.ts` and `era5/stack-deep.sh` (section 5.1).
2. **T2. A notice ledger only grows, so its capacity is a lifetime limit, and one subject over it stops the account's
   notices for good.** W0 keeps every retired item; the sealed ledger holds about 1,790 items (10 parts). One subject
   at 1,800, or at 1,700 and then 100 new forms, stops the recorder permanently, and the account's other subjects get
   no ledger and no notice. Not created by this option (in clear the limit is 1,680), but the chunked ledgers did not
   remove it. The Publish review's Z1 (a ledger shrinking) does not occur, for the same reason. Test: `era5/ledgers.ts`
   (section 3).
3. **T3. The root check accepts a root that is not the subject's.** A second entity carrying the root's two rows, or
   the same number's root in another account, or no root at all, is accepted; the record is sealed under none of the
   subject's values (or under another account's) and still opens and decodes outside the gateway after the removal.
   No writer does this today; one stale root ID or wrong account in a writer does. Test: `attack7.clj` d1 and `fuzz7`
   (sections 1 and 5.2).

**One recommendation: before any database declares the setting, make "one subject never stops an account" a tested
property.** Fix the deep world builder to accept a removed value (T1); make a full ledger stop only its subject, with a
named state (or drop retired items from the sealed ledger) (T2); then have the gateway find the subject's one root
itself and bind the place's account to the document's (T3). A test that removes one subject's value and fills another
subject's ledger, and then checks that every other subject of the account still gets the next release's notices,
covers the first two.

**The shape.** The gateway choosing the keys is right: it closed the class of breaks where a writer names too few rows
(N3 at the subject's own place: the builder's n3deep 0 of 24 open; in this fuzzer, 10,266 of 10,266 under-named
records at a real root removed when their own subject's reached value was). The root rule asks the wrong question: "is this entity *a* root of number N in account A", not "is this the root of the
subject this document belongs to". The walk over every reference is both too wide (it crosses into other subjects and
shared entities, so one removal forgets several subjects, and its cost grows with every subject reached: 1,063 ms and
402 names per record when a shared entity reaches 200 subjects) and too narrow (a value on an entity that refers to the
subject is not added). A declared subject boundary (which attributes and entities are the subject's own) would be
checkable; graph reachability is not.

**Fit to merge default off into the one branch?** The content, yes: with the option off nothing of the seal runs but
one read of the setting per request. The branch, not yet: it carries the removal branch at `03bb49cd3`, without
`383db77d1`'s fix, whose fault reproduces here (2 of 12 forced interleavings refused on each boundary; 0 of 12 with the
fix); merging that head conflicts in 8 files, and merging the one branch in 8. Land the removal branch first, take
its exact head, resolve, and re-run the option-off gate. Eight things must be true before the setting is declared on
any database (section 7).

**Branch head:** see the commit that adds this page on `exp/DX-ERA5-derived-copies-review`.

## 1. The deep-layout rule (line of attack a)

**What the gateway does** (`derived_seal.clj` 217-292). A place `<scope>|<account>|@<root>|<subject>` names the
subject's root. `root!` reads the root's live rows and requires exactly one `:subject/member` equal to the subject's
number and exactly one `:subject/account` equal to the place's account; `world-of` then walks every live reference row
from the root, breadth first, at most 65,536 entities; every live protected assertion on any entity of that world (and
on the subject's own entity and the entities named under it) is added to the record's keys.

**Test** `attack7.clj` (new; phase `cases7`, run by `inproc.sh`; every option on, sealed database, file authority, the
setting declared): runs `cases7-log` (ended 17:25:57 EST) and `cases7-commit` (17:26:46), the same on both boundaries.
Subjects in n3deep's shape: root `acct/<a>/pl:N` with its two rows, protected values on its worker entity and its
document entity, the chain root -> wk, root -> i9 -> sec -> ev -> doc. Each record's writer names only an unprotected
row of the root, so the keys are the gateway's choice alone.

**d1: a root the check accepts that is not the subject's.** Subject 7 of account a; one of its values removed and its
key deleted; then each record opened through the route and decoded outside the gateway with the keys the store still
holds.

| Place | Names in the header | Stored under the setting | After the removal | Decoded outside with the keys left |
| --- | --- | --- | --- | --- |
| the real root `@acct/a/pl:00000007` | 2 | 200 | removed | no |
| a second entity carrying the root's two rows (`:subject/member "7"`, `:subject/account "a"`), nothing else: a second placement of the same subject, or any entity written with those rows | **0** | 200 | **opens to the removed value** | **yes, with no key at all** |
| the same number's root in another account (`deep|b|@acct/b/pl:00000007|pl:s00000007`, consistent: the root's account is b) | 2 (account b's subject's) | 200, in account a's page for `pl:s00000007` | **opens to account a's removed value** | **yes, under account b's live keys** |
| no root (`deep|a|pl:s00000007`, as a deep store that is not held writes, page 14.3) | 0 | 200 | **opens** | **yes, with no key** |

So the check verifies that a root is *a* root of the subject's number in the account the place names, not that it is
*the* subject's root, and nothing ties the place's account to the document's account: the setting binds a unit to its
page's subject by the subject ID alone (`unit!`, 584-590), and in one database every account has a `pl:s00000007`. A
writer that states a wrong account or a stale root gets a record of one subject's values sealed under another's keys
(or none), and a removal of the first subject's value no longer reaches it. The builder's n3deep refuses only an
inconsistent pair (another subject's root, or a root whose account is not the place's): 0 of 24 still open; the
consistent wrong pairs above are not tested there.

**d2: what the walk reaches.**

| Case | Header names | After the removal named |
| --- | --- | --- |
| s1's root refers to s2's root (a manager, a household member, a referrer) | s1's records: 4 (its own 2 and s2's 2) | s2's worker value removed: **s1's record opens as removed** (and s2's) |
| s3 and s4 both refer to one shared site entity holding a protected value | 3 each | the site value removed: **both subjects' records open as removed** |
| a cycle (s1's document refers back to its root) | sealed | the walk ends |
| s2 keeps a protected note on an entity that refers TO its root (a reverse reference) | 1 (the note is not added) | the note removed: **the record computed from it still opens** |
| the same walk with the limit lowered to 5 entities (the real one is 65,536) | | the seal call refused, 400 `InvalidDerivedRecord` |

So a removal on request of one subject's value makes other subjects' derived records unreadable wherever a reference
reaches it (the recorder then forgets those subjects too and delivers all their notices again in a new generation,
M4), a value on an entity that points at the subject instead of being pointed at is outside the rule, and a world that
outgrows the bound makes every seal call of that subject fail, which stops the writer (it does not seal smaller).

**d3: a protected value added after a record was sealed** (attacked without a break): a record sealed before the later
value names 2; one sealed after names 3; removing the later value leaves the earlier record open (it never held it) and
makes the later one removed; removing an earlier value then removes the earlier record. 4 oracles, 0 violations.

**The walk's cost** (`attack7.clj` `d4`, phase `cost7`, ended 17:39:43 EST; medians of 5; Mac, diagnostic). One frame
of 64 subjects x 6 records (each subject 6 entities, 2 protected values):

| Places | Seal call (ms) | Names per record |
| --- | --- | --- |
| W0 places (no root, no walk) | 16 | 0 |
| root places (the walk) | 47 | 2 |
| every root also refers to one team entity that refers to 50 other subjects' roots | 307 | 102 |
| ... to 200 other subjects' roots | 1,063 | 402 |

One reference to a shared entity that refers onward to other subjects makes every record of every subject that reaches
it carry every reached subject's values, and the walk's time grows with them. At the owner's shape (1,000,000 subjects
in a deep account), a single entity referring to all members makes every world exceed 65,536 entities and every seal
call of the account fail. SCALE1's `person` has no such reference today (page 14.7 item 9); nothing prevents one.

## 2. The content-free kinds (line of attack b)

`attack7.clj` `b1` (same runs): each of the 22 patterns the setting accepts without decoding, written with a document
holding a protected value in clear: **22 of 22 accepted** on each boundary (`notice-progress`, `values:N`, `claim:...`,
`census:...`, `members:...`, `join-meta`, `join-calendar`, `join-member:...`, `join-index-base:N`, `join-index:N`,
`join-invalid`, `control`, `event:N`, `tail`, `erasure`, `received:...`, `effect-erasure:...`, `recorded-generation:...`,
`recorded-cursor`, `cursor`, `settled-values:...`, `settled-notice:...`). Identifier fields take a value shaped like an
identifier: an SSN with dashes (`123-45-6789`) is accepted as a removed marker's name, a page entry's subject and a
packet's account (3 of 3).

Can today's writers put a protected value there? By reading what each kind holds: counters, cursors, IDs, hashes of
sealed bytes, release documents. The one with values is the join index (`join-index-base:N`, `join-index:N`): its
postings hold the indexed rules' inputs (MINWAGE, EVSTAT, PAYCHG: pay, minutes, location, dates of the E-Verify status;
`actv-delta/rules.ts` 134-160); under W0's schema none of them is a string a policy can protect (pay and minutes are
integers, location a reference, the E-Verify date an instant), and the expanded index that copies whole worlds is
refused under the option (`account.ts` 349). A hash of a protected value: none found (claims hash the packet's sealed
bytes). So no writer of this option puts one there today; the list is a promise about the writers, not a check.

## 3. Chunked ledgers (line of attack c)

**Test** `era5/ledgers.ts` (new; `run.sh`, this head's gateway in process, the setting declared on every database,
`TX2_NOTICE_LEDGER=parts`, W0 format, lean layout). Prediction written before the runs: `predictions.txt`, 17:04 EST.

**A removal of one subject's value held in one of many chunks** (`remove:400`, run `lone-remove-1`, ended 17:31:05):
three subjects owing 400 forms (3 parts each). X's two document values removed and their keys deleted: **X's 3 chunks
open as removed, Y's 3 and Z's 3 open** (401 and 400 items). The next release (401 forms): settlement stored, recorder
recorded; **X restarted in generation 1** with 401 items, Y in generation 0 with 402; X's notices delivered again
(802 deliveries for X against 402 for Y: M4, by design). Attacked without a break.

**A shrinking ledger: the Publish review's Z1 does not happen here, because a W0 ledger never shrinks.** `shrink-1`
(17:19:24 to 17:22:16 EST), one subject:

| First release, then second | Ledger after the first | After the second | Recorder |
| --- | --- | --- | --- |
| 300 forms, then 20 | 2 parts, 301 items | 2 parts, 301 items | recorded, recorded |
| 300, then 100 | 2 parts, 301 | 2 parts, 301 | recorded, recorded |
| 1,000, then 20 | 6 parts, 1,001 | 6 parts, **1,021** | recorded, recorded |
| 1,000, then 100 | 6 parts, 1,001 | 7 parts, **1,101** | recorded, recorded |
| 1,700, then 20 | 10 parts, 1,701 | 10 parts, **1,721** | recorded, recorded |

W0's `publish` marks an item no longer carried as retired and keeps it (`outbox.ts` 142-148, RULINGS Q40h). The
synthetic release names its forms with three digits below 1,000 and four above, so 1,000 then 20 are different items:
the ledger grows. My prediction (a stop from 6 or 10 parts down to a small ledger) was wrong: the closing piece never
gets small.

**The consequence: a ledger only grows, so its capacity is a lifetime limit, and one subject over it stops the whole
account.** `edge-1` (17:23:10 to 17:29:42 EST) and `lone-remove-1`:

| Case | Recorder | Recorder again |
| --- | --- | --- |
| one subject owing 1,780 forms | recorded: 10 parts, 1,781 items | |
| one subject owing 1,800 forms | `Subject pl:s00000000: its sealed notice ledger needs 11 parts; at most 10 can be replaced within the writer's bound` | the same |
| one subject: 1,700 forms, then a release of 100 other forms (1,801 items) | the first recorded; the second stopped, the same message | the same |
| three subjects, one owing 1,800 forms, the two others owing none of the synthetic forms (the release's buckets chosen so) | stopped at that subject | the same; **the other two subjects have no ledger and got no notice** |

So the stop is named and permanent, and it is the account's, not the subject's: the recorder cannot pass that subject,
and every later subject and release of the account waits behind it. "A subject owing more than about 1,780 forms"
understates it: the limit counts every notice item a subject was ever owed, retired ones included, across every
release. The same holds in clear at 1,680 items (this option did not create it; it raised the limit by 110).

## 4. The re-sweep at many removals (line of attack d)

**Test** `attack7.clj` `r1` (phase `resweep7`, ended 17:32:49 EST): the real `resweep-one!` on synthetic committed
removal records (one identity each, due a day ago), the record reader, the cut and the key store replaced; a restored
key a third of the way down the list.

| Removals in the database | Heap for the records it keeps | One pass (ms, five passes) | Passes until the restored key is checked |
| --- | --- | --- | --- |
| 10,000 | 5 MB | 17, 12, 12, 7, 12 | 26 |
| 100,000 | 60 MB | 90, 91, 74, 87, 76 | 260 |
| 300,000 | 182 MB | 425, 289, 323, 260, 302 | not run (the bound gives about 780) |

**Starvation:** at 10,000 removals with 256 more identities falling due before every pass (a sustained 256 a second),
the restored key was not checked in 400 passes (without arrivals: 26). Without such a rate it is reached within about
n / 384 passes.

**What that means at the owner's scale.** The pass checks at most 512 keys, but it still sorts every due record and
collects every identity on every pass, and keeps every record in memory: about 600 bytes and 1 microsecond per removal
per pass, on every gateway, for every database, every second. 1,000,000 removals: about 600 MB and about 1 s per pass
(a pass then never rests), and a restored key reached after about 2,600 passes, 45 minutes or more. 10,000,000: 6 GB
and 10 s per pass. The builder's own statement (page 14.7 item 3) is right, and its comment in the code ("a pass costs
the same at 1,000 removals as at 1,000,000", `derived_seal.clj` 438) is not. **A design that reaches 1 billion facts:**
keep the removed key handles where the keys are (a table of tombstones beside `triplex_removal.keys`, written by the
removal) and delete restored keys with one set-based statement per pass (`DELETE ... USING` the tombstones), or refuse
to read any key whose handle is a tombstone; read the erasure records by a durable cursor over their sequence instead of
holding them all. Then a pass costs what was restored, not what was ever removed.

## 5. Every earlier break again, the fuzzer, and the stack (line of attack e)

All on `e75f61f40`, under each removal boundary unless said ("log": per account, removals take effect at their
publication; "commit": the same database moved to the commit boundary; the in-process runs check the database's
boundary is the one asked for, `ERA*_BOUNDARY` lines).

| Earlier finding | Test re-run | Log | Commit |
| --- | --- | --- | --- |
| B1 a frame kept clear after a failed or stalled seal | `attack.ts` W, W2 (`attack2-dbwide`, `attack2-peraccount-log`, `attack2-commit`, 17:36 to 17:38 EST) | 17 of 17 units sealed, 0 clear; 0 copies served or stored after the removal (also database-wide) | the same |
| B2 a pending removal stops key deletion | `attack5.clj` pending (`pending5-*`) | 8 oracles, 0 | 8, 0 |
| B3 the stored length names the value | `attack.ts` L (adapted to the chunked ledger records: their length under another type is the recompressed chunk's) and `attack5.clj` c2 | every type fits in all 4 places, 3 runs | the same |
| B4 a removed value as absent | W0 format: `attack.ts` S (the next release stored and recorded after the removal); `ledgers.ts` remove | held | held |
| B4 in the deep format | `era5/deep-remove.ts` | **broken: the account's next settlement and recorder stop** (section 5.1) | not run per boundary (database-wide; section 5.1) |
| B5, N6 the held reader's cache | `row19.ts` | reads wait during the window; nothing served | no cached answer with the removed date after the commit; plain read masked |
| N1 ledgers in parts with the setting | `forms.ts` P (`forms-1`, 17:33 to 17:35 EST) and on a stack (`stack-w0forms-1`, 17:48 to 17:55 EST) | in process: 30 and 100 whole (31 and 101 items), 200 and 1,000 in parts (201 and 1,001 items opened back); on the stack 200, 1,000, 1,700 in parts (201, 1,001, 1,701 items); the builder's figures. But section 3: the limit is lifetime and account-wide | |
| N2 the rebuild dropping a protected attribute | `attack6.clj` z2 | refused 400 `InvalidValue`; a save then waits for the log (503 `RemovalLogMissing`) | the same |
| N3 a writer naming too few rows | `attack6.clj` e1; `attack7.clj` d1, fuzz7 | at the subject's own place: closed (e1 own-subject record removed; the builder's n3deep 0 of 24 open, not re-run; fuzz7 section 5.2). **Not closed for a consistent wrong root or account, or no root** (section 1) | the same |
| N4 shapes | `attack6.clj` e1 | 17 of 18 hand-made documents now refused (the one accepted: the under-named record of another subject, the builder's residual); another attribute and capital hex refused. But 22 content-free kinds accept anything (section 2) | the same |
| N5 the re-sweep | `attack6.clj` m2; `attack7.clj` r1 | failures counted (1 each at 10 to 1,000 removals); the restored key deleted within the bound. Cost: section 4 | the same |
| N7 the fence | `attack6.clj` e2 | the held write refused 409 `CasConflict`; no clear copy stored | the same |
| N8 the journal change record | `attack6.clj` e3 | refused; 0 native datoms with the clear copy | the same |
| N9 the deep-shape cost | `cost5.clj` (the builder's runs, 14.5) and `attack7.clj` d4 | section 1 (the walk) | |
| Z2, Z4 (removal reviews) | `attack6.clj` z2, z4 | closed | closed |

Totals: `attack5.clj` cases 1,523 oracles and pending 8 on each boundary, 0 violations; `attack6.clj` cases6 1,803
(log) and 1,805 (commit), 0; `attack7.clj` cases7 86 on each, 0 (its findings are counted, not oracles); `attack.ts` 3
runs, no break; `row19.ts` 2 runs; `forms.ts` 1 run; `ledgers.ts` 3 runs; `deep-remove.ts` 2 runs (in process and on a stack).

### 5.1 B4 is not fixed in the deep format

**Test** `era5/deep-remove.ts` (new; `era4/deep-forms.ts` with a removal): one held, namespaced account in the deep
format (SCALE1's `person`, 3 subjects, 366 facts), its document expiry dates protected and sealed, the setting declared
everywhere, `TX2_NOTICE_LEDGER=parts`; a release of 200 owed forms published, settled and recorded; subject 0's
document expiry date removed on request; then a second release (201 forms).

| | In process (`deep-remove-inproc`, 17:36:09 to 17:36:34 EST) | On a stack (`stack-deep-2`, 17:56:14 to 17:56:40 EST; transactor, PostgreSQL, write and read gateway, every container on its pinned image by ID at start and end; gateway source `e75f61f40`) |
| --- | --- | --- |
| first release | settled, recorded: 2 parts, 201 items opened back | the same (2 parts, 201 items) |
| after the removal | subject 0's 2 chunks open as removed; subject 1's open (201 items) | the same |
| second release: settlement | **`FAILED: Missing or ambiguous :file/expiresOn 0 !== 1`** | **the same, and again on a second try** |
| second release: recorder | **the same** | **the same, and again on a second try**; 39 packets before and after: no subject got a notice of the second release |

The deep world builder (`bench/lib/deep-activation.ts` 52-55, `policyWorld`) requires exactly one row for every file's
`:file/expiresOn`. The B4 fix drops a removed row from the world (`decision.ts` `withoutRemoved`) before that builder
reads it, so the read finds none and throws; the page fails, and with it the account's settlement and notices. In the
W0 format (`worldOf`) a missing row is simply absent, which is why `attack.ts` S and `ledgers.ts` pass. So in the
layout version 0.1 is built on, one removal on request of one subject's protected document date stops every later
release of that subject's account: the first review's B4, back in the deep format. (With the option off the removed row
stays in the world as W0's erased marker, which W0 refuses with `W0.E_VALUE`: the account stops either way; reasoned,
not run.) The removal was database-wide (the deep forms database is not moved per account); the stop is in the
writer, before any boundary matters.

### 5.2 The fuzzer in the deep layout

`attack7.clj` `fuzz7` (new): the first review's schedules (removals stopped at a random step and resumed, kills,
restored keys, second removals) in the held deep layout, the setting declared, with the place and the writer's names as
dimensions. Each block: a sealed database, 24 subjects (numbers 1 to 8 in accounts a, b and c), a second root per
subject (an entity carrying the root's two rows), and per schedule 1 to 3 new protected values per subject on entities
of their own, linked from the subject's evidence entity (reached by the walk) or, one in eight, referring to the root
(not reached). Each record: from 1 to 4 of the schedule's values; placed at the subject's real root (five in eight), a second
root, the same number's root in another account, or with no root; named in full or only by an unprotected row
(mislabelled); its seal call ok, failed or refused (the writer then stores clear, which must be refused).

Oracles that must hold: the removal completes and its keys are deleted; a record named in full from a removed value
opens as removed and does not decode with any key left; **a record at its real root whose removed source is its own
subject's value on an entity the walk reaches opens as removed, whatever its names**; a kept record opens to its
content (or as removed when another value of its place's subject was removed: the gateway seals under every value of
the subject); every clear write refused, every sealed write accepted. (No native scan in this fuzzer: fuzz6's blocks
do that, in the W0 layout.)

**Runs** (`series7`, 17:41 to 18:06 EST): 7 runs of 1,500 schedules on each boundary, blocks of 100, seeds 801 to 807
(log) and 901 to 907 (commit); before them two trials of 60 (the first found the harness's own faults: a removed
entity and attribute reseeded, which the store refuses, and the kept-record oracle not knowing that the gateway seals
under every value of the subject; the second, 2,308 oracles, 0 violations).

| | Log | Commit |
| --- | --- | --- |
| schedules | 10,500 | 10,500 |
| oracles (must hold), violations | 313,453, **0** | 313,800, **0** |
| removals stopped at one of 5 steps and resumed (a sixth, after the guard, drawn but never reached on this path) / not stopped | 7,351 (1,450) / 4,304 | 7,363 (1,481) / 4,335 |
| kills, restored keys | 3,197, 1,587 | 3,337, 1,649 |
| seal calls ok and their units accepted; seal calls failed or refused (400), the clear unit then written refused 409 `DerivedRecordUnsealed` | 47,444; 15,579 | 47,267; 15,945 |
| records named in full from a removed value: opened as removed | 14,742 of 14,742 | 14,582 of 14,582 |
| records at the real root from their own subject's removed, reached value, whatever their names: removed | 5,035 of 5,035 | 5,231 of 5,231 |
| records of kept values: open / open as removed with their subject | 26,041 / 3,764 | 25,933 / 3,733 |

**Counted apart (findings, not oracles): records named only by an unprotected row whose removed source still opens
after the removal.**

| Why the removal did not reach it | Log: still opens (removed) | Commit: still opens (removed) |
| --- | --- | --- |
| placed at a second root (T3) | **1,901** (0) | **1,788** (0) |
| placed at the same number's root in another account (T3) | **1,760** (28) | **1,865** (47) |
| placed with no root (T3) | **1,725** (0) | **1,879** (0) |
| real root, the value on an entity that refers to the root (T4) | **882** (265) | **917** (269) |
| real root, the value another subject's (the builder's admitted residual) | 2,833 (114) | 2,890 (125) |

The ones counted "removed" were removed because another value of the place's subject went in the same schedule. So the
fuzzer finds the same holes as the hand cases, at the same rate on both boundaries, and nothing else: no removed value
decoded where the rule says it must not, and no clear copy stored.

## 6. The removal fix `383db77d1` (line of attack f)

**The fault, forced.** `attack7.clj` `e4race` (phase `e4race7`) is the removal builder's own deterministic test of it
(`era2/gate.clj` `cut-read-race` at `383db77d1`, ported unchanged): a removal of account a held just before its
publication; a request of account b (a ticketed frame, a save, a read) whose k-th read of the log's head (k = 1 to 4) is
held right after the file is read; the removal published; a read of b1 moving the gateway's cache to the published
head; the request let go. 12 interleavings per run.

| Gateway source | Log boundary | Commit boundary |
| --- | --- | --- |
| this head `e75f61f40` (`e4race-head-log` 17:30:53, `e4race-head-commit` 17:31:14 EST) | **2 of 12 refused**, 503 `ErasureFrontierUnavailable` (a ticketed frame naming b at one read, a save of b1 at another) | **2 of 12 refused**, the same |
| this head with `383db77d1`'s fix (its `privacy.clj` and `removal_commit.clj` changes, 13 lines) applied on a local branch (`e4race-fix-log`, `e4race-fix-commit`) | 0 of 12 | 0 of 12 |

So seed 915's refusal is this head's, every time the interleaving happens, on both boundaries; the fix removes it.
The randomized gate itself (`era4/inproc.sh`, 1,000 schedules, seed 915, commit boundary; runs `gate915-head-1`, `-2`
and `gate915-fix-1`, `-2`, 17:39 to 17:48 EST): 16,528 and 16,540 oracles on the head, 16,548 and 16,526 with the fix, 0
violations in all four: the seed does not reproduce by itself (it depends on timing, as the builder found); the forced
interleaving above does, every time.

**Does anything of this option break with the fix?** The option's in-process cases on the head with the fix applied:
`attack5.clj` cases (commit boundary) 1,523 oracles, 0 violations; `attack6.clj` cases6 (both boundaries) 1,803 and
1,805, 0; `attack7.clj` cases7 (commit) 86, 0, with the same findings as without the fix. Nothing changed.

**Merging the removal head itself.** `git merge 383db77d1` into this head (local branch `exp/DX-ERA5-r3-merge-383`,
aborted): **8 files conflict, 34 hunks**: `erase.clj` 8, `main.clj` 8, `removal_commit.clj` 6, `privacy.clj` 5,
`removal_scope.clj` 3, `subject_save.clj` 2, and two lab files. The fix was therefore tested by applying its two gateway
files alone (they apply cleanly); the merge is the derived builder's to do.

## 7. Fit to merge default off, and what must be true before the setting is declared

**Default off, the content is fit; the branch is not ready to merge.**

1. **What runs with the option off.** Nothing of the seal: the derived routes, the check, the fence, `install!` and the
   re-sweep are all behind `TX2_DERIVED_SEAL` (`main.clj` 102, 518-545, 764). One read runs on every request: whether the
   database holds the setting (`derived-required?`, 534), so a gateway without the option refuses a database that
   declared it (503, M3, re-run here: `m3`). The builder's own option-off gates (7 of 7 settings byte-identical against
   a rebuilt base; paired runs with the same datoms and replies) were not re-run by me.
2. **Why not now.** This branch carries the removal branch at `03bb49cd3`, not its reviewed head: it lacks
   `383db77d1`'s fix, whose fault reproduces here on both boundaries (section 6), and merging that head conflicts in 8
   files (34 hunks, 6 of them gateway files). Against the one branch's head (`origin/exp/DX-INT1` at `efee27905`,
   committed 16:57 EST) `git merge-tree` reports 8 conflicting files: `envelope.clj`, `failures.clj`, `main.clj`,
   `storage.clj`, `subject_save.clj`, `DatomicStorageAdapter.ts`, `ha1/local.ts`, `b2r/REVIEW.md`. The order that
   works: the removal branch lands first; this branch then takes that exact head, resolves its conflicts, and re-runs
   its option-off identity gate and this review's forced race on the merged result.

**Before the setting is declared on any database, these must be true:**

1. **One subject cannot stop an account.** A removal on request in the deep format (section 5.1) and a subject whose
   ledger reaches its lifetime limit (section 3) each stop every later release of the whole account today. Each must
   stop, at most, that subject, with a named and visible state.
2. **The deep world builder accepts a removed protected value** (`deep-activation.ts` 52-55): the same fix as B4 had in
   the W0 format.
3. **A place is bound to its subject and account.** The gateway must find the subject's root itself (one root per
   account and number: refuse a second entity carrying those rows) and refuse a unit whose place's account is not the
   document's account (section 1, d1).
4. **What the walk follows is decided:** stop it at another subject's root and at entities shared between subjects
   (or accept that one subject's removal forgets every subject that refers to it), and either follow references into
   the subject (reverse references) or forbid protected values on entities that only point at it (section 1, d2).
5. **The re-sweep is rebuilt for many removals** (section 4) before removals accumulate: it holds every removal in
   memory and re-sorts them each second.
6. **The removal branch's E4 fix is in** (section 6).
7. **Every gateway runs this build** (admission 1), **and the setting is declared again after any restore** of a backup
   taken before the declaration (not reminded by anything).
8. **The content-free kinds stay content-free:** a written rule that no protected attribute is an input of the join
   index's rules (section 2), since the setting takes those kinds without looking.

## 8. Findings

| # | Severity | Finding | Where | Test, result | Boundaries |
| --- | --- | --- | --- | --- | --- |
| T1 | High | **B4 is not fixed in the deep format:** after one subject's protected document date is removed on request, the next release's settlement and notice recorder fail for the whole account, every time (`Missing or ambiguous :file/expiresOn`) | `bench/lib/deep-activation.ts` 52-55 with `actv-lazy/decision.ts` `withoutRemoved` | `deep-remove.ts`: in process and on a stack, settlement and recorder failed twice each; no subject got a notice of the second release (section 5.1) | database-wide removal; the stop is in the writer |
| T2 | High (no attacker; not created by this option) | **A subject's notice ledger only grows and has a lifetime limit; one subject over it stops the whole account's notices for good.** W0 keeps retired items; the sealed limit is about 1,790 items (10 parts); in clear 1,680 | `packages/w0/src/outbox.ts` 142-148; `join/ledger-parts.ts` `ledgerChangeUnits`; `join/recorded.ts` | `ledgers.ts`: 1,780 recorded; 1,800 stopped twice; 1,700 then 100 more forms stopped twice; one subject at 1,800 left the account's two other subjects with no ledger and no notice (section 3) | in process, the log boundary's setting; the recorder does not depend on the boundary |
| T3 | High (a writer's wrong place) | **The root check accepts a root that is not the subject's** (any entity carrying `:subject/member` and `:subject/account`; the same number's root in another account), and the setting binds a unit to its page by subject ID only, which every account shares. Such a record is sealed under none of the subject's values (or another account's) and survives their removal | `derived_seal.clj` 243-250, 584-590 | `attack7.clj` d1: 3 of 3 wrong places accepted and still open after the removal, decoded outside with no key or with the other account's live keys; fuzz7: 5,386 (log) and 5,532 (commit) such records still open (section 5.2) | both |
| T4 | Medium | **The walk follows every reference:** into another subject (its removal makes this subject's records unreadable) and through shared entities (one removal reaches every subject that refers there); it does not follow references into the subject (a value on an entity that points at the root is not added); cost and header size grow with every subject reached (1,063 ms and 402 names per record for a frame reaching 200 other subjects); over 65,536 entities every seal of the subject fails | `derived_seal.clj` 238-269 | `attack7.clj` d2, d4; fuzz7: 882 and 917 records from an unreached value still open (section 5.2) | both |
| T5 | Medium | **The re-sweep keeps every removal in memory and sorts all of them every second:** 182 MB and 300 ms per pass at 300,000 removals (about 600 MB and 1 s at 1,000,000); a restored key is reached after about n / 384 passes, and never while 256 or more identities fall due each second | `derived_seal.clj` 436-487 | `attack7.clj` r1 (section 4) | not boundary-dependent |
| T6 | Medium (availability) | **Seed 915 is this head's:** a request of another account is refused 503 when it reads the log's head across a removal's publication; `383db77d1`'s fix is not merged here | `privacy.clj` `cut` | `attack7.clj` e4race: 2 of 12 refused on each boundary; 0 of 12 with the fix applied (section 6) | both |
| T7 | Medium | **The setting takes the 22 content-free kinds without looking**, and identifier fields take a protected value shaped like an identifier | `derived_seal.clj` 554, 617-618 | `attack7.clj` b1: 22 of 22 and 3 of 3 accepted with a protected value (section 2) | both |
| T8 | Low | The branch does not merge with the removal branch's head (8 files, 34 hunks) or the one branch's (8 files) | | `git merge`, `git merge-tree` (section 7) | |

## 9. What held

Counts of what was attacked and did not break, on `e75f61f40`, both boundaries unless said:

| What | Count |
| --- | --- |
| The deep-layout fuzzer | 21,000 schedules, 627,253 oracles, 0 violations (section 5.2) |
| `attack5.clj` cases and pending (B2, B3 and the first review's cases) | 1,523 + 8 oracles on each boundary, 0 violations |
| `attack6.clj` cases6 (N2 to N8, Z2, Z4, M2, M3) | 1,803 (log) and 1,805 (commit), 0 violations |
| `attack7.clj` cases7 (d1, d2, d3, b1: its findings counted apart) | 86 on each boundary, 0 violations; d3, a value added after a seal: 4 of 4 |
| `attack7.clj` cost7 | 2,930 seal calls, every one accepted |
| B1: units sealed after a failed or stalled seal (`attack.ts` W, W2) | 17 of 17 sealed, 0 clear, on each of 3 runs (database-wide, per-account log, commit) |
| B3: the stored length (`attack.ts` L, adapted to chunks) | every type fits in all 4 places, 3 runs |
| B4 in the W0 format (`attack.ts` S; `ledgers.ts` remove) | the next release stored and recorded: 3 `attack.ts` runs and the `ledgers.ts` removal |
| B5, N6 (`row19.ts`) | 2 runs, nothing served from the cache with the removed value |
| N1 (`forms.ts`, `stack-w0forms-1`) | 200 and 1,000 forms in parts in process, 200, 1,000 and 1,700 on a stack; every item opened back |
| N3 at the subject's own place (`attack6.clj` e1, the builder's n3deep, fuzz7) | closed: 10,266 of 10,266 under-named records at a real root removed |
| N7, N8 | refused (409, and 0 native datoms with the clear copy) |
| The chunk removal (`ledgers.ts` remove:400) | X's 3 chunks removed, Y's and Z's 6 open, the recorder went on |
| The E4 fix applied (`383db77d1`'s two files) | forced race 0 of 12 on each boundary; attack5, attack6, attack7 cases unchanged (1,523, 1,803, 1,805, 86 oracles, 0 violations) |
| Gate seed 915 (`era4/inproc.sh`, 1,000 schedules, commit boundary) | 4 runs (2 head, 2 fix), 16,526 to 16,548 oracles each, 0 violations |

## 10. Not tested

1. **Option off**, byte for byte: the builder's gate, not re-run.
2. **An old build beside this one**, and **two gateways writing one database with the setting**: not run.
3. **The deep format with the commit boundary** for the removal stop (T1): the deep forms database is not moved per
   account; the stop is in the writer's world builder, before the boundary matters.
4. **The re-sweep with the PostgreSQL authority**, and above 300,000 removals: extrapolated (section 4).
5. **The walk at 1,000,000 subjects** sharing one entity: reasoned from the bound (section 1).
6. **A real writer computing a record from two subjects**: none exists (the builder's not-tested item 1).
7. **A ledger part whose header is too large for its size class** (a subject with a long protected history): not run.
8. **Free-text protected values against the size classes**: W0 has none.
9. **The full merge of `383db77d1`**: conflicts; only its two-file fix was applied and tested.
10. **The Publish review's Z1 in its own writer** (`act10`): tested here only in W0's ledger writer, where a ledger
    never shrinks.
11. **The native scan under schedules** (`fuzz6`, W0 layout) on this head: not re-run; `fuzz7` checks through the
    route and with the keys left, not the native datoms.

## 11. Reproducing

Every run: `DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label <name> -- <command>`, from this branch;
`ERA5_EXTRA_ENV="TX2_REMOVAL_COMMIT_BOUNDARY=1"` for the commit boundary in process.

| File | Command | What |
| --- | --- | --- |
| `era5/attack7.clj` phase `cases7` | `bash lab/experiments/EXP-DX1/era5/inproc.sh NEW_DIR cases7` | d1, d2, d3, b1 |
| phase `cost7` | `bash .../inproc.sh NEW_DIR cost7` | d4, the walk's cost |
| phase `resweep7` | `bash .../inproc.sh NEW_DIR resweep7` | r1, the re-sweep at many removals |
| phase `e4race7` | `bash .../inproc.sh NEW_DIR e4race7`; with `ERA5_GATEWAY_TREE=<a checkout with the fix>` for the fix | seed 915 forced |
| phase `fuzz7` | `ERA5_N=1500 ERA5_BLOCK=100 ERA5_SEED=S ERA5_RUN=hS bash .../inproc.sh NEW_DIR fuzz7` (seeds 801 to 807, 901 to 907) | the deep-layout fuzzer |
| `era5/ledgers.ts` | `ERA5_DRIVER=ledgers.ts ERA5_EXTRA_ENV=TX2_NOTICE_LEDGER=parts ERA7_PEOPLE=1 ERA7_CASES=edge:1780,edge:1800,shrink:1700:100 bash .../run.sh NEW_DIR on`; `ERA7_CASES=shrink:300:20,shrink:300:100,shrink:1000:20,shrink:1000:100,shrink:1700:20` the same way; `ERA7_CASES=lone:1800,remove:400` with the default 3 subjects | section 3 |
| `era5/deep-remove.ts` | `ERA5_DRIVER=deep-remove.ts DEEP_FORMS=200 ERA5_EXTRA_ENV=TX2_NOTICE_LEDGER=parts bash .../run.sh NEW_DIR on`; on a stack `DEEP_FORMS=200 bash lab/experiments/EXP-DX1/era5/stack-deep.sh NEW_DIR` | T1 |
| `era5/attack.ts`, `row19.ts`, `forms.ts`, `attack5.clj`, `attack6.clj` | as in `REVIEW-2.md` section 14 | the re-runs |

`inproc.sh` gained `ERA5_GATEWAY_TREE` (another checkout's gateway source; the tests stay this one's). The local branch
with the fix applied is `exp/DX-ERA5-r3-merge-383` (not pushed: it carries the removal builder's code). Images: the
runtime `sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be` (the gateway source mounted from the
head under test; its commit in each run's `source`, `e75f61f40` in all but the runs with the fix), PostgreSQL
`sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32`, checked at start and end of each stack.

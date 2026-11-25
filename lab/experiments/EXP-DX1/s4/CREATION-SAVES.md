# Creation saves: the real mix of saves, and creations on the fast writer (DX-S4)

North star P2 and the owner's decision of 2026-11-24: one commit per subject's save. The per-subject writer was built
for form saves, and the production-shaped tapes (R and S) hold nothing else. A study of the product's real saves
(private; only rounded shares appear here) found that form saves are **under a tenth** of real saves and that **most
saves create an entity**. This page maps every real kind of save onto the store, adds a tape with the real mix (tape M,
`production-M`), designs and builds creations on the fast writer behind one default-off option, gates it, and publishes
the server run. Mac figures are toy size; times are diagnostic. [Scope](../../../SCOPE.md) ·
[Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Several owners](../s3/SEVERAL-OWNERS.md) ·
[Product saves](../s2/PRODUCT-SAVES.md) · [Import whole subjects](../imp2/WHOLE-SUBJECT.md)

## In brief

- **Share of the real mix on the fast (per-subject) writer: about 10% before, about 100% after** (tape M on the
  production exactness gate through the product's path: section 4). Before is the state the several-owners builder
  left (`orderedSaves`, `saveSizeRule`, `severalOwners`, the wide writer): only form saves reach the fast writer;
  every creation (new enrolment, new subject, new owed form) and every save with a reference value takes the general
  writer. After adds `TX2_SUBJECT_CREATE=1` in the writer and `creationSaves` in the SDK. On the gate's tape M cell
  (360 saves): 23 of 360 before (6.4%; the cell drew 6.4% form saves), 360 of 360 after; on the aged toy's tape M cell
  (270 saves): 34 of 270 before (12.6%), 270 of 270 after. Every field of every owner read back exactly in all four.
- **What each kind costs the writer** is small, because real saves are small: 3 to 12 facts for every creation kind,
  and a median of 6 facts per save on tape M. The table in section 1 gives datoms, request bytes, new identities and
  history lookups per kind; section 1.3 gives storage reads inside apply and log bytes on PostgreSQL.
- **History lookups are where creations cost most today:** the general writer checks every new identity in history,
  one index seek each (16 for a new enrolment, 28 for a new subject, 41 for a subject with its first enrolment). With
  `creationSaves` every such save carries one ordered block and declares its bounds, so either writer proves the whole
  block absent with **one range probe** (the import builder's finding, applied to live creations).
- **One commit per subject's save, for a creation:** one API action is one commit. A new subject with its profile and
  its first enrolment arriving together is one commit of two new owners (the creation writer takes it); arriving as two
  actions it is two commits, which is what the study's timings show (attribute writes and enrolments seconds after the
  entity's creation). Page-submission records are facts of the task, one fact each, inside the form save's commit:
  **0.3% of tape M's form saves exceed 128 facts** (audit facts once per save; per record the study puts it at about 8%).
- **Creation on the fast writer is exact and built** (`subject_create.clj`, a sibling stored function installed only
  with the option, as the several-owners function is). It proves a new owner absent at the serial point with one
  unique-index seek, exactly the condition the general writer's revision check enforces. Against a general-writer
  control every receipt and every read route is equal; two creations of one ID commit one and refuse the other whole; a
  creation racing a removal on request ends refused or wholly applied without the removed values; a lost reply returns
  the original receipt. With the option off every stored function is identical (62 of 62 identities and code hashes in 9
  writer settings).
- **What stays on the general writer:** saves of more than 4 owners (bulk actions), saves over 128 facts, saves that
  read an entity they do not write, protected values in sealed scopes. Together they are under 1% of the mix.
- **Server run:** two card arms on tape M at 1 billion records (before and after) plus a creation-burst arm, with
  predictions (section 6). Nothing ran on a server; none is rented.

## 1. The real kinds of save in the store

Every kind below was sent through the product's path (`TriplesLive` over the Datomic adapter) in `s4/gate.ts`, to a
writer with the per-subject settings of the server (numeric owner, ordered IDs, wide writer, several owners), and every
committed request was replayed unchanged to a general-writer control and to a profiling general writer that counts
history lookups (`TX2_LOAD1_PROFILE=1`). Four instances of each kind; counts are exact, times are not reported.

### 1.1 What one commit holds, and which writer takes it

Shares are of real saves (rounded to 5%). "Before" is the several-owners builder's state; "after" adds the creation
option in the writer and the SDK. The typed reason is what `client.saveRoutes` counts (`runtime:` from the SDK, or the
gateway's refusal on the receipt).

| Kind of save | Share | Entities in the commit | New owners | Subject's root touched | Facts / retired | Before: writer (reason) | After |
| --- | ---: | --- | ---: | --- | ---: | --- | --- |
| New enrolment of an existing subject (status, start, external ID, references to the subject and the client) | 55% | the enrolment | 1 | no (the enrolment refers to it) | 6 / 0 | general (`runtime:reference-value`) | creation writer |
| The same with the subject named as a plain value | | the enrolment | 1 | no | 6 / 0 | general (the owner does not exist; no gateway reason) | creation writer |
| New subject with its profile values | 20% | the subject's profile | 1 | it is the root | 12 / 0 | general (the owner does not exist) | creation writer |
| New subject, its profile and its first enrolment as one action | under 1% (separate actions in the data) | profile and enrolment | 2 | it is the root | 18 / 0 | general (`runtime:reference-value`) | creation writer |
| Attribute writes right after creation (cost centre and manager as references, pay rate) | 10% | the new enrolment | 0 | no | 3 / 0 | general (`runtime:reference-value`) | creation writer |
| The same with plain values | | the new enrolment | 0 | no | 2 / 0 | per-subject | per-subject |
| New owed form (a task: form definition and enrolment as references, status, due date, creator) | 5% | the task | 1 | no | 5 / 0 | general (`runtime:reference-value`) | creation writer |
| Prefill of the new task (ten values) | under 1% | the task | 0 | no | 10 / 0 | per-subject | per-subject |
| Form page save: two answers replaced, progress, status, three audit facts, two page-submission records | 10% (all form saves) | the task | 0 | no | 9 / 2 | per-subject | per-subject |
| The same page with two fields mapped to the subject's profile | about 5% of form saves | task and profile | 0 | yes (profile) | 3 / 3 | several-owners writer | several-owners writer |
| Status change | under 1% | the task | 0 | no | 4 / 2 | per-subject | per-subject |
| Check result | under 1% | the task | 0 | no | 2 / 0 | per-subject | per-subject |
| Large form page: 45 answers and 80 page-submission records | under 1% of form saves | the task | 0 | no | 130 / 0 | general (`runtime:over-subject-bound`) | general, with a wide block (`general-block:over-subject-bound`) |
| Bulk action: a batch and five items | under 1% | six new entities | 6 | no | 6 / 0 | general (`over-owner-bound`) | general, with a wide block (`general-block:over-owner-bound`) |

The study's two missing shapes (a progress copy, a past-dated correction) do not occur in the product and are not on
tape M.

### 1.2 Counted work per kind (memory toy; counts exact)

Datoms and identities are the same on every writer (the control's receipts equal the writer's in every arm). History
lookups are the general writer's, counted at its serial point; the per-subject and creation functions always prove the
save's ordered block absent with one range probe (at most 128 history datoms inspected).

| Kind | Datoms | Request bytes | New identities | General writer, before: per-ID history seeks | General writer with `creationSaves`: range probes / seeks | Fast writer: range probes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| New enrolment | 31 | 10,864 | 16 | 16 | 1 / 0 | 1 |
| New subject with profile | 43 | 19,994 | 28 | 28 | 1 / 0 | 1 |
| New subject with profile and enrolment | 58 | 29,115 | 41 | 41 | 1 / 0 | 1 |
| Attribute writes after creation | 25 | 6,724 | 10 | 10 | 1 / 0 | 1 |
| New owed form | 29 | 9,324 | 14 | 14 | 1 / 0 | 1 |
| Prefill | 39 | 16,956 | 24 | (per-subject) | | 1 |
| Form page save | 41 | 17,955 | 24 | (per-subject) | | 1 |
| Form page with profile fields | 34 | 12,200 | 14 | (several owners) | | 1 |
| Status change | 31 | 10,957 | 14 | (per-subject) | | 1 |
| Large form page (130 facts) | 279 | 183,674 | 264 | 264 | 1 / 0 | (general) |
| Bulk action (6 owners) | 46 | 13,805 | 21 | 21 | 1 / 0 | (general) |

Request bytes rise by 29 bytes with `creationSaves` (the declared bounds). Datoms are 2 per fact plus the journal
(3 rows, one changed-entity row per owner, one change per fact and per retirement) plus one revision per owner.

### 1.3 Storage reads inside apply and log bytes (PostgreSQL, small cache)

`s4/sql.sh` (`s4/sql-run.sh`, `create_gate.clj` `measure-*`): fsync, synchronous commit and full page writes on; 96
subjects per arm, each a profile of 12 fields, a task of 40 and an enrolment of 6, seeded and indexed identically; then
after a transactor restart each subject gets a cold and a warm save of one kind (12 subjects per kind, two rounds of 48),
on the general writer (as today) or the creation and per-subject writers. Storage reads are each transaction's own
io-stats; times diagnostic. Every save's records are equal between the arms (datoms, text bytes, and the feed of both
databases by digest, `DX-S4_VERIFY`, head 288).

**32 MiB object cache:**

| Kind (facts) | Writer, before → after | Datoms | Added text bytes | Storage reads inside apply, cold: mean (max), total, before / after | Warm | Serial apply, median cold / warm, before → after (diagnostic) |
| --- | --- | ---: | ---: | --- | --- | --- |
| New enrolment (4, two references) | general → creation | 27 | 4,796 | 0 (0), 0 / 0 (0), 0 | 0 / 0 | 1.35 / 1.02 → 0.67 / 0.83 ms |
| New subject with profile (12) | general → creation | 43 | 12,187 | 0.50 (6), 6 / 0.58 (7), 7 | 0 / 0 | 1.52 / 1.35 → 0.96 / 1.15 ms |
| New subject with profile and enrolment (16, two owners) | general → creation | 54 | 16,089 | 0 / 0 | 0 / 0 | 1.79 / 1.84 → 1.07 / 0.89 ms |
| New owed form (5, two references) | general → creation | 29 | 5,557 | 0 / 0 | 0 / 0 | 1.52 / 0.96 → 0.91 / 0.69 ms |
| Attribute writes (3: one reference, two replaced) | general → creation | 29 | 5,323 | 0 / 0 | 0 / 0 | 1.12 / 1.61 → 0.88 / 0.77 ms |
| Form page (9: two replaced, seven first writes) | per-subject (both) | 41 | 10,010 | 0.50 (4), 6 / 0.50 (4), 6 | 0 / 0 | 1.35 / 1.38 → 1.30 / 1.07 ms |
| Form page with profile fields (22, two owners) | general → several owners | 110 | 34,786 | 0 / 0 | 0 / 0 | 3.29 / 3.76 → 1.05 / 1.14 ms |
| Status change (4) | per-subject (both) | 29 | 5,226 | 0.08 (1), 1 / 0 | 0 / 0 | 1.55 / 1.12 → 1.12 / 0.74 ms |

PostgreSQL WAL bytes per round of 48 saves: 331,232 / 330,456 (round 1, general / creation) and 337,224 / 337,176
(round 2): within 0.3%. Reads inside apply appear only on the first saves after each restart (at most 7 in one save) and
are the same per kind on both writers; at toy size the whole seed fits in the cache once loaded, so they show the shape
(a creation reads no more than the general writer), not the server's numbers. The "before" column for form saves is the
general writer only in the general arm of this harness; on the product's path they already take the per-subject writer.

**Smaller caches:** the harness's transactor did not start with a 2 MiB or an 8 MiB object cache (it exited before
listening; the size is now a setting, `DX_S4_OBJECT_CACHE`, default 32 MiB). With the 32 MiB cache and an 8 MiB memory
index (`DX_S4_INDEX_THRESHOLD=8m`, more index jobs) the reads inside apply were the same per kind as above (form page 6
and 6, new subject 6 and 7, status change 1 and 0, every other kind 0), WAL bytes per round within 1.5% between the arms,
and the two databases equal by feed digest. So at toy size the reads come from the restart, not from the cache size;
the server run (section 6) is where reads per creation are measured.

### 1.4 What "one commit per subject's save" means for a creation

1. **One API action is one save is one commit.** A creation is a save like any other: one command ID, one receipt,
   one feed entry naming every entity created, all or nothing.
2. **A new subject, its profile and its first enrolment in one action are one commit of two new owners.** The creation
   writer takes it (up to four owners of one account). Arriving as two actions (the subject, then the enrolment seconds
   later, which is what the study's timings show for almost all enrolments) they are two commits, each on the
   creation writer.
3. **An enrolment does not touch the subject's root.** It is its own entity with a reference to the subject; the
   subject's revision is not part of its commit, so a save of the subject and a new enrolment of it never conflict.
4. **Attribute writes made seconds after a creation are their own save** on the entity just created (an existing
   owner by then): with reference values they need the creation option, with plain values they already take the
   per-subject writer.
5. **Page-submission records are facts of the task in the form save's commit**, one fact per record (the page's
   state), with the audit facts once per save. On tape M 0.3% of form saves exceed 128 facts and take the general
   writer whole; none is split. Writing the audit facts per record would put about 8% of form saves over 128.

## 2. Tape M (`production-M`)

`w1/field/production-mix.ts` with the rounded shapes in `real2/production-mix.json` (shapes R and S and their hashes
are untouched). One cell offers, per neighbour account, exactly as many saves as shape S's cell offers at the same load
step (23.1 saves a second at the 394 step), drawn as follows; the quiet account keeps the card's own stream.

| Parameter | Value |
| --- | --- |
| Kinds | new enrolment 55%, new subject 20%, attribute writes 10%, form save 10%, new owed form 5% |
| Creation burst (`production-M-burst`) | every save creates: new subject 75%, new enrolment 25% |
| Enrolments of a subject created in the last minute | 35% of enrolments (the rest go to existing subjects) |
| Which existing subject gets an enrolment | weighted by a long-tailed count of enrolments per subject (median 1, p99 about 30, p99.99 about 1,000; capped at the store's 1,680-item bound) |
| Attribute writes | on the newest enrolment of the account, created within 10 s |
| Form save values | median 2, p90 about 11, p99 about 40; over a third exceed 3; capped at the store's 128 |
| Page-submission records per form save | median 2, p90 about 30, p99 about 80; capped at 128 |
| Form saves that also write the profile | 5% |
| Arrivals | uniform order statistics over the cell (Poisson conditioned on the count); deterministic per seed, band, account |

**What the tape gives at the 394 step (300 s, `mixReport`):** 6,930 saves; kinds 55.1% / 19.9% / 10.1% / 9.4% / 5.5%;
80.5% of saves create an entity; 70.7% carry a reference value; 0.5% write two owners; facts per save median 6, p90
12, p99 44; form saves median 12 facts, p99 89, 0.3% over 128; enrolments per subject inside the cell median 1, p99 3.
The burst tape: 100% creations, 12 facts at the median.

**Wired into the card** as `--tape production-M` and `--tape production-M-burst` (`v01/production-card.ts`), sent only
through the product's path (`DX_S2_PRODUCT=1`; the sender refuses otherwise). The card names a subject's task and root
as the seed has them, and every entity the tape creates under `acct/<account>/s4/<cell>/…`, so cells of one campaign
never share a created entity. Before the first offer the card reads every task (as for shape S), every subject root it
writes, and proves every entity the cell creates absent (`mixPredecessors`); after the cell it reads back every field
of every owner the tape wrote. The feed check and the identity check accept a commit of several owners (one
changed-entity row each). The default tape and tapes R and S are unchanged (card tests).

## 3. Creation on the fast writer

### 3.1 What the general writer proves for a new entity

The general writer has no separate idea of "new". For each entity the save names (`entities`: every entity it writes
or reads) it looks the public ID up at the serial point (`d/entid` on the unique `:triplex.entity/id`, one index seek)
and, **if the entity exists, requires its revision to be at or before the save's source cut**; an entity that does not
exist is created by the save's upsert. Every new assertion ID is checked absent in history: one seek per ID, or one
range probe when the save declares its identity bounds. So the general writer's proof for a creation is "absent now, or
unchanged since the source cut". When the SDK sends no source cut (a save without an ordered block that skipped the
snapshot), it checks no revision at all: **before this work, two creations of one ID sent at once both committed onto
one entity without a conflict** (gate a, "before" arm).

### 3.2 The creation function

A second stored function built from the one-owner function's text with only its head update replaced, as the
several-owners function is, installed only with `TX2_SUBJECT_CREATE=1` (in a namespace loaded last, so no existing
stored function moves). The plan accepts a save of one to four owners of one account, where at least one owner does not
exist yet or a value is a reference, and every rule of the several-owners plan holds (frame, scope flags, removal
sequence, read set equal to the owners, bounds of 128 facts and 128 retirements). At the serial point:

| Owner | Check | Why it equals the general writer |
| --- | --- | --- |
| New (absent when the gateway planned) | its public ID is still absent (one unique-index seek), else `CasConflict`; its revision row is the save's own, stamped with the commit's position | The plan read the database at or after the source cut and found no such entity, so one that exists at the serial point was created after the source, and the general writer would refuse it too (its revision is newer than the source). |
| Existing | public ID unchanged; revision compare-and-set against the revision planned | The several-owners proof, unchanged. |
| Every new assertion | the ordered block's interval holds no row in history (one range probe) | The one-owner proof, unchanged. |
| Reference values | written as plain rows (the target's public ID in the row text); the target is neither read nor written | In the lean layout the general writer writes the same row and does not read the target either. |

**(a) A new entity under an existing subject (an enrolment)** is a one-owner creation; the subject is referenced, not
written. **(b) A new subject with its profile** is a one-owner creation; with its first enrolment, two new owners.

**Races and resends:**

1. **Two creations of one ID at once:** the first to reach the serial point creates it; the second finds the ID present
   and is refused whole (`CasConflict`, nothing written, none of its identities in history). The SDK replays it at a
   new snapshot, where the entity exists, and writes onto it as an ordinary save, exactly as the general writer does.
2. **A creation racing a removal on request:** the removal moves the removal sequence, so a creation planned before it
   is refused whole (as every per-subject save is). The resend is then exact in two cases: (1) an enrolment under a
   subject whose value is removed writes nothing of the removed family; (2) a creation of the very subject the removal
   named had nothing to remove (the subject did not exist), so the resend would bring the removed value back. With the
   option on, a removal records the families it names even when no row exists (the import builder's record, now also
   kept under this option), and a live creation that writes a removed family onto an entity that does not exist yet is
   refused whole (`ErasureReplayDeclined`) on every writer; a resend without the removed values commits whole. With
   the option off the removed value comes back, as it does for imports with the import option off.
3. **A resend after a lost reply:** the receipt is found by operation; a resend of the command is refused
   `CommandAlreadyCommitted` naming the original transaction.

### 3.3 What stays on the general writer, and what it costs

| Save | Why the fast writer refuses it (typed reason) | Cost at 1 billion records (fits in `v01/SAVE-SHAPE.md` 4.3) |
| --- | --- | --- |
| More than 4 owners (bulk action: a batch and its items) | `over-owner-bound`: each owner adds a revision check and a changed-entity row; four is the several-owners bound | 6 facts: about 0.7 ms of serial apply; with a wide block and declared bounds one history probe instead of 21 |
| Over 128 facts or retirements | `over-subject-bound` | 130 facts: about 16 ms serial; one history probe instead of 264 |
| Reads an entity it does not write | `read-only-entity` | as its size |
| Protected values in a sealed scope | `protected-values-or-frame` | as its size |
| Two accounts | `several-accounts` | not one subject's save |

On tape M these are under 1% of saves.

### 3.4 What it buys

At 1 billion records the general writer's serial apply is about 0.12 ms per fact. Tape M averages 8.2 facts per save,
so about 1.0 ms of serial apply per save before; the fast writer's toy ratio (2.2 to 3.5 times shorter) gives 0.3 to
0.45 ms after. At the 394 step (23.1 saves a second) the serial thread is busy about 2.3% before and 0.7 to 1.1% after.
**The gain in serial time is small; the real mix is not serial-bound.** What matters more for a creation at full size is
the first touch: the absence lookup of a new public ID reads the unique index's segment for that key range, cold if no
recent save touched it. Both writers make that read; the per-subject hints (`TX2_SUBJECT_HINTS`) name existing owners'
reads only, so they do not move it (section 6 predicts it).

## 4. Gates (Mac, toy size; counts are results, times diagnostic)

Evidence: `DX-S4-creation/` in the private evidence store (archives and `SHA256SUMS`). Every memory, Clojure and SQL run used
one pinned runtime image (`tx2-datomic:dx-s4-runtime`, `sha256:da58aea1…`, a tag of my own on the image the shared
production tag pointed at when work began, with this branch's gateway sources mounted); each memory gate container's
image ID is recorded and checked against it (all matched). The production gate builds its own image per attempt under
a private tag (`tx2-dxs4-native:<attempt>`); the build receipt's image ID and the ID the gate's containers ran are
recorded and equal in every arm below.

| Gate | What ran | Result |
| --- | --- | --- |
| **(a) Option off: stored functions** (`s4/idents.sh`, the gateway loaded as production loads it) | Nine writer settings (no per-subject writer; the server's; wide; wide and both hints; narrow revision, reused predecessors and append retirement; owner head; several owners; several owners with the serial settings; the whole-subject import bound), on the merged base (`630d707f2`), the several-owners head (`7f46bf043`), the import head (`d4411c77b`), `exp/DX-INT1` (`23b7df344`) and this branch's final tree | **62 of 62 identities and code hashes equal to the merged base and to the several-owners head in all 9 settings**, at the start and on the final tree; the creation option adds 4 keys only (`:triplex.subject/create-2c925107…` with the server's settings, `create-edbb1edb…` with the serial settings). The merged base equals the several-owners head exactly (the merge moved nothing). Finding 3 (section 5) on `exp/DX-INT1` |
| (a) Option off: SDK | `creationSaves` off: no request field changes (the option adds `declareIdentityBounds`, stripped before the wire, and a block for reference saves only when on) | SDK unit tests: `test/ordered-saves.test.ts` 5 of 5 (one new test: references, owner bound, wide blocks over a bound, the 4,096 limit, refusals); type check of `packages/datomic` clean |
| **(b) Every real kind against a general-writer control** (`s4/gate.ts` through `TriplesLive`; arms "before" = the several-owners builder's SDK options and the gateway's creation option off, "sdk-only" = `creationSaves` on and the gateway's option off, "after" = both on) | 15 kinds, 50 saves judged per arm (section 1), then every committed request replayed to a control with the per-subject writer off and to a profiling general writer | **All three arms pass: 50 judged, 0 unexpected; 54 receipts equal (position, clock, datoms); 2,955 read-route answers equal** (current at two valid times 37 + 37, history 37, reach 37, each owner's journal 37, pinned reads before and at every commit at three valid times 324, by assertion ID current and full history 1,169 + 1,169, the whole feed 54, every command 54). After: every creation kind 4 of 4 (2 of 2 for subject with enrolment) on the creation function, every form kind on the per-subject or several-owners function as before, the large form page, the bulk action and the refusals on the general writer with their typed reasons. Before and sdk-only: every creation kind on the general writer |
| **(c) Two creations of one new ID at once** (`s4/gate.ts`; and at the serial point, `s4/create_gate.clj`) | Two commands creating one enrolment, sent together | **After and sdk-only:** 3 attempts, 1 refused `CasConflict`, 1 replay, 2 committed; the refused attempt's 8 identities absent from history. At the serial point: the second creation planned, the first committed between its plan and its commit, the second refused `CasConflict` with nothing written (operation absent, journal absent, no identity in history); the entity holds only the first creation's rows; the general writer refuses the same save the same way. **Before:** both commit without a conflict (finding 1); the final state is the same in all three arms |
| **(d) Lost reply and resend of a creation** (`s4/gate.ts`, a new subject with its profile and first enrolment) | The reply dropped after the gateway committed | 1 request sent; the receipt found by operation; the resend refused `CommandAlreadyCommitted` naming the original; the lookup by command returns it; the feed 54 entries before and after. After: the creation function, 2 owners created |
| **(e) A creation racing a removal on request** (`create_gate.clj`, an unsealed protected scope) | (1) A new enrolment planned, then a removal of the existing subject's protected value, then the commit; (2) a new subject with a protected value planned, then a removal naming that subject (which does not exist yet), then the commit and a resend; option on, and off | (1) `CasConflict`, nothing written; the resend commits on the creation function; **no row of the removed family written after the removal**. (2) Option on: `CasConflict`, nothing written; the resend refused **`ErasureReplayDeclined`**; a resend without the removed value commits whole on the creation function (12 fields); **the removed value in no route answer at any position and nowhere in the Datomic log**. Option off: the resend commits with the value and **the removed value is readable** (the fault the option closes) |
| (e) Other changes between plan and commit (`create_gate.clj`) | Another save of the existing owner; the removal sequence moved; the existing owner's public ID moved | Each: `CasConflict`, the function submitted once, nothing written |
| **Refusals** (`create_gate.clj`) | A third entity read only; five new owners; two accounts; 129 facts; a system attribute on the new owner; a source older than the existing owner's revision | Each planned with its reason (`read-only-entity`, `over-owner-bound`, `several-accounts`, `over-subject-bound`, `system-field`, `stale-source`) and its outcome equal to the general writer's (five committed by the general writer with the reason on the receipt, the stale one `CasConflict` on both) |
| **Serial-point totals** (`s4/clj-gates.sh`, memory) | The four tests above and the routes test (6 creation shapes against a control on every read route at every position: 10 owners, 61 identities) | **5 tests: 144 assertions pass with the server's settings, 144 with narrow revision, reused predecessors and append retirement, 146 with hints** (the 2 more check that hints were attached) |
| **(f) Production exactness gate on tape M** (`DX_CHK1_HOLDER=DX-S4 DX_W2_WIDE=1 DX_S2_PRODUCT=1 DX_S3_OWNERS=1 DX_S4_MIX=1 DX_S4_CREATE=0|1 prep1/manage.py OUT production 10 1 1 0 1`: PostgreSQL, real transactor, the server's per-subject settings, every save through the product's path) | The gate's R, S and wide cells as before, then a cell of tape M (30 s, 40 saves per neighbour account, 360 saves): existing tasks and profiles seeded, every created entity proved absent first, every field read back | **Both arms pass.** R 840 and S 88 per-subject, the two 130-fact saves general, 2,836 fields exact (as S2 and S3 published). **Tape M: 360 of 360 acknowledged, 0 expired, 290 created entities proved absent before the cell, 313 owners and 3,030 fields read back exactly.** Writers: **before (create 0) 23 of 360 per-subject (6.4%, the form saves), after (create 1) 360 of 360 (100%)**: 193 enrolments, 75 new subjects, 47 attribute writes and 22 owed forms on the creation function, 23 form saves on the per-subject function, no refusal. Image built = image run in both arms |
| **(f) Aged-toy gate on tape M** (`DX_S2_PRODUCT=1 DX_S1_WIDE=1 DX_S3_OWNERS=1 DX_S4_MIX=1 DX_S4_CREATE=0|1 real2/aged-gate.sh OUT`, the pinned runtime image by ID) | AGE1's loader-aged toy; R and S cells as before, then a tape M cell folded onto the toy's people | **Both arms pass.** R 840 and S 88 per-subject and ordered; 128 aged rows admitted (the predecessor read now also covers tape M's subjects; 120 without tape M), a tampered aged row refused, 101 writes over aged rows, 2,254 fields read back, final cut 1,289. **Tape M: 270 of 270 acknowledged, 0 expired, 215 created entities proved absent, 11 saves over aged subjects, 249 owners and 3,211 fields read back exactly.** Writers: **before 34 of 270 per-subject (12.6%, the form saves), after 270 of 270**: 144 enrolments, 55 new subjects, 21 attribute writes and 16 owed forms on the creation function, 34 form saves on the per-subject function |
| **(g) Counted work per kind** | Section 1.2 (memory) and 1.3 (PostgreSQL) | Datoms, text and log bytes equal between writers for every kind |
| Card | `v01/*.test.ts` (one new test: tape M offers shape S's saves per account, shares within 3 points, more than 75% creations, every created entity once and under the cell's prefix, the burst all creations, the plan binding, the writer option) | **42 of 42** (S3: 41) |

## 5. Findings on the way

1. **Before this work, two creations of one ID sent at once both commit, merged onto one entity** (product path,
   `orderedSaves` on, a save with a reference value): the SDK gives such a save no block, so it states no source cut,
   and the general writer then checks no revision. With `creationSaves` the save carries a block and its source cut and
   the second creation is refused whole and replayed.
2. **The card's identity check would refuse every wide-writer arm.** `checkSavedIdentity` (`v01/adopted.ts`) required
   a production commit to take the per-subject writer exactly when it has one to three facts that each replace a value
   (the narrow rule). With `TX2_SUBJECT_WIDE=1` (S1's, S2's and S3's server arms) the first per-subject commit of more
   than three facts would fail it. Fixed here: with the wide writer, several owners or tape M, a per-subject commit must
   name one of the writer's installed functions; the receipt, journal and identity checks are unchanged.
3. **The merged branch's owner-head and general-writer hint functions have different stored identities than
   `exp/DX-INT1` (`23b7df344`).** `s4/idents.sh` on the five trees: the import branch equals `23b7df344` in all 9
   settings; the several-owners branch differs from it in 5 values (`owner-layout` code, update code and ident;
   `general-prefetch` code and ident), so the change came with the product-path or several-owners work, not with the
   merge. The default commit function and the per-subject function are unchanged. Existing scopes that run
   `TX2_SUBJECT_OWNER_HEAD=1` or `TX2_GENERAL_PREFETCH=1` would install new functions on that head.
4. **A receipt named a refusal reason for a save the creation writer took** (the several-owners plan's `new-owner`),
   found by the gate's reason column and fixed before the final runs.

## 6. Server run (published before any run; no machine is rented)

**The decision it serves:** on the real mix, does the creation option move the saves to the fast writer at full size,
and what does the real mix cost against the P2 bars (p50 at or under 10 ms, p99 at or under 50 ms)? The control is the
several-owners builder's arm D on tape M (every option of the branches this one is based on), so the pair differs only
in the creation option.

Build and `part`/`arm` exactly as [READINESS](../v01/READINESS.md) "Next server session" and S2's section 8, at the head
that carries this branch:

```bash
CARDM=(1B production-M server-32 300 tuned)
CARDB=(1B production-M-burst server-32 600 tuned)
BASE="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1 DX_S3_OWNERS=1"
EXTRA="$BASE"                arm /var/tmp/s4-card-m-before "${CARDM[@]}"   # E: tape M, creation option off
EXTRA="$BASE DX_S4_CREATE=1" arm /var/tmp/s4-card-m-after  "${CARDM[@]}"   # F: tape M, creation option on
EXTRA="$BASE DX_S4_CREATE=1" arm /var/tmp/s4-card-m-burst  "${CARDB[@]}"   # G: the creation burst, 600 s cells
```

**Before reading any number:** the Run settings line names `DX_S4_CREATE=1` (F, G) with the other writer options and
the tape (`production-M`, `production-M-burst`); `v01/adopted.ts` refuses an arm unless every writer's `write-options`
shows `subjectCreate: 4` with its function installed exactly when `DX_S4_CREATE=1`; `tape-report.json` beside each
cell shows the kind shares within 3 points of section 2.

**The one-hour burst:** the card's longest cell is 600 s, so arm G gives ten minutes of the burst at each load step,
including the 394 step. A full hour at 394 needs the card to run one loaded cell six times on one copy (not built);
until then G's 394 cell and its index jobs are the evidence, and the hour is a forecast.

**Duration and cost:** E and F are 71 to 85 minutes each (two copies, part 1 9 to 11 minutes, part 2 58 to 68); G with
600 s cells about 130 to 155 minutes. All three: 4 h 50 min to 5 h 45 min, **about USD 5.30 to 6.30** at USD 1.09 per
machine hour; E and F alone 2 h 20 min to 2 h 50 min, about USD 2.60 to 3.10.

**Predictions** (1 billion records, second half of each loaded cell, tape M neighbour commits, latency from send):

| Measure | E: creation option off | F: on | G: burst, on (394 cell) |
| --- | --- | --- | --- |
| Commits on the per-subject writer | 8 to 12% (the form saves) | 99 to 100% | 99 to 100% |
| Typed reasons on the rest | `runtime:reference-value` about 70%, the rest the gateway's new-owner path | under 1%, `over-subject-bound` and `over-owner-bound` only | none or `over-owner-bound` |
| Mean serial apply per commit (8 facts mean; 12 in G) | 0.8 to 1.3 ms | 0.3 to 0.6 ms | 0.4 to 0.8 ms |
| Serial thread busy at 394 | 2 to 3% | 0.7 to 1.4% | 1 to 2% |
| Storage reads inside apply per creation, late (first minute) | 0.0 to 0.3 (0.2 to 1.0) | the same as E | the same |
| Commit p50 at 50 / 235 / 394 / 620 | 6 to 9 / 6 to 9 / 6 to 9 / 7 to 10 ms | 0.2 to 1 ms below E | 6 to 9 ms |
| Commit p99 at 50 / 235 / 394 / 620 | 20 to 45 ms each | within 15% of E | 20 to 45 ms |
| Conflicts replayed by the SDK | 0 to 0.5% | 0 to 0.5% | 0 to 0.3% |
| Stored against offered; expired; read-back | all; 0; exact | the same | the same |

**Basis:** the fit `v01/SAVE-SHAPE.md` 4.3 (warm commit 5.39 ms + 0.201 ms per fact; serial apply 0.12 ms per fact on
the general writer) at tape M's facts (median 6, mean 8.2), the toy ratio 2.2 to 3.5 for the fast writer, and the
product path's overhead S2 forecasts (under 1 ms of client staging; a first save of a subject reads its predecessors
through one extra request). Tape M's saves touch an existing subject's rows far less often than shape S's do: an
enrolment refers to its subject and reads nothing of it, a creation has no predecessor, and attribute writes follow
their entity's creation within seconds. The cold reads that set shape S's p99 (a subject's first save in the run)
remain only for the tenth of saves that are form saves. **A creation's own first touch** is the absence lookup of its
new public ID in the unique index: the card names created entities under one prefix per cell, so after the first
creation of a cell that segment is warm; a product that names an enrolment under its subject's own ID would read the
subject's neighbourhood cold when the subject is not in memory (1 to 3 ms at 1 billion, inside apply). **The
per-subject hints do nothing for it:** they name an existing owner's reads, and a creation's new owner has none; the
absence lookup is made at the serial point on either writer.

**What would show these wrong:**

1. **F puts under 99% of tape M commits on the per-subject writer, or E over 15%.** Real-mix saves break a rule the toy
   did not: read the receipts' `subjectDeclined` and `client.saveRoutes` first.
2. **F's p50 above E's by more than 1 ms at any step, or its p99 more than 20% above.** The creation function costs
   something per save the toy did not show (the absence seek, the plan's extra lookups): remove the option rather than
   keep it.
3. **E's or F's p99 above 50 ms at any step.** The real mix is not as warm as forecast; read storage reads inside apply
   by kind (`writerPath` and the commit samples) before anything else.
4. **Storage reads inside apply per creation above 1 late.** The absence lookup is cold at full size even with
   clustered IDs; then hints for the absence probe are the next step.
5. **G's p99 over 50 ms or more than one index job in its 600 s at 394.** A creation hour fills the memory index faster
   than forecast (creations add new entities and unique-index entries); the hour forecast fails.
6. **Any lost or expired save, any read-back mismatch, a `tape-report.json` outside 3 points, or the write-options
   check refusing.** The arm counts for nothing until explained.

## 7. What the existing scorecard shows, and what it does not

Every scorecard number so far was made on tapes R and S (form saves only; shape S with the lab producer, except S2's
toy card) or on Saturday's tape.

**They do tell us:**

1. What a form save costs at 1 billion records: shape S commit p50 / p99 10.69 / 45.31 ms at 394 (90 s cells), 42 ms
   p99 in a 300 s run; the cold first save of a subject in the run is what sets p99.
2. The general writer's serial apply per fact (0.12 ms at 1 billion), which prices every kind of save here, creations
   included, since a creation is ordinary rows.
3. That the per-subject writer and the general writer write the same records (every gate since W1).

**They do not tell us:**

1. **The real load.** Form saves are under a tenth of real saves; about four fifths create an entity. No server run
   has sent a creation, a reference value, an enrolment, a new subject, or a burst hour where every save creates.
2. **The cost of a creation's first touch:** the absence lookup of a new public ID at full size, warm or cold.
3. **The product's path at 1 billion:** every card number so far used the lab producer; S2's and S3's product-path
   arms and this branch's arms have not run.
4. **The writer split of the real mix:** tape S puts every save on one task; the real mix puts about 10% there before
   this option.
5. **Steady-state P2:** the card's P2 cells were 90 s; the rule of 2026-11-24 judges second halves of 300 s cells.

So the P2 forecast for the real load rests on fits and toys until arms E and F run.

## 8. Not verified

- **Nothing ran on a server.** Every 1 billion figure is a forecast from the fits named; arms E, F and G have not run.
- **The card's tape M plumbing has not run end to end:** the card's launcher refuses to run outside a Linux bare-metal
  host. Covered: the card tests (42 of 42), the production and aged gates (which use the server producer's `phase()`,
  not the card's sender), the type of every edited line through those runs. The card's sender path for tape M
  (`scale1/decision/writes.ts`), `mixPredecessors`, the feed digest of several owners and the relaxed identity check
  are exercised by no run.
- **The one-hour creation burst** is not built (the card's longest cell is 600 s).
- **Storage reads at full size:** the toy's reads come from a 2 MiB and a 32 MiB object cache after a restart; they show
  the shape, not the server's numbers.
- **Product entity naming:** the tape names created entities under one prefix per cell; the product's own identifiers
  (and so whether a creation's absence lookup is warm) are not known here.
- **Sealed protected scopes:** a creation carrying sealed protected values takes the general writer
  (`protected-values-or-frame`); the removal races were gated on an unsealed protected scope, where the original row
  stays readable at earlier positions until excision (the sealed form shreds its key). The families refusal itself is
  writer-agnostic and was exercised on both writers.
- **Removal by assertion ID** of a value not yet created has nothing to record (the ID does not exist), as for imports.
- **Two-owner form saves on tape M at toy size:** the gate's M cell drew 23 form saves and none wrote the profile (5%
  share); two-owner saves are covered by gate (b) and by the several-owners builder's gates.
- **Tape M's shapes** are rounded from one study's windows; the per-account spread the study saw is not modelled (one
  behaviour for all nine neighbour accounts, as tapes R and S).

## Files

Gateway: `packages/datomic/gateway/src/triplex/gateway/subject_create.clj` (new), `storage.clj` (plan selection,
hints, receipt check and keys), `main.clj` (install, write options), `privacy.clj` and `erase.clj` (the removed-family
refusal and record, resolved at call time). SDK: `packages/datomic/src/DatomicStorageAdapter.ts` (`creationSaves`,
`orderedSaveShape`), `DatomicClient.ts` (`declareIdentityBounds`), `test/ordered-saves.test.ts`. Tape:
`w1/field/production-mix.ts`, `real2/production-mix.json`. Gates: `s4/` (`gate.ts`, `run-gates.sh`,
`mem-gateways.sh`, `create_gate.clj`, `clj-gates.sh`, `sql.sh`, `sql-run.sh`, `idents.sh`, `mix-cell.ts`). Producer
and gate: `prep1/server-produce.ts` (`phase` takes tape M), `prep1/production-gate.ts`, `prep1/manage.py`,
`prep1/stack.sh`, `w1/field/journal.ts`. Card: `v01/production-card.ts`, `v01/adopted.ts`, `v01/run.ts`,
`scale1/decision/writes.ts`, `scale1/decision/observer.ts`, `stack/up.sh`, `v01/production-card.test.ts`. Aged gate:
`real2/aged-gate.ts`, `real2/aged-gate.sh`. The older files in `s4/` (`README.md`, `launch.sh`, `qlever.sh` and the rest)
belong to an earlier, unrelated spike of the same name.

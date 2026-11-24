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
  writer. After adds `TX2_SUBJECT_CREATE=1` in the writer and `creationSaves` in the SDK.
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
  **0.3% of tape M's form saves exceed 128 facts** (audit facts once per save; per record it would be about 8%).
- **Creation on the fast writer is exact and built** (`subject_create.clj`, a sibling stored function installed only
  with the option, as the several-owners function is). It proves a new owner absent at the serial point with one
  unique-index seek, exactly the condition the general writer's revision check enforces. Against a general-writer
  control every receipt and every read route is equal; two creations of one ID commit one and refuse the other whole; a
  creation racing a removal on request ends refused or wholly applied without the removed values; a lost reply returns
  the original receipt. With the option off every stored function is identical (68 identities in 9 settings).
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

SQL_TABLE_PLACEHOLDER

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

GATES_PLACEHOLDER

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

SERVER_PLACEHOLDER

## 7. What the existing scorecard shows, and what it does not

SCORECARD_PLACEHOLDER

## 8. Not verified

NOTVERIFIED_PLACEHOLDER

## Files

Gateway: `packages/datomic/gateway/src/triplex/gateway/subject_create.clj` (new), `storage.clj` (plan selection,
hints, receipt check and keys), `main.clj` (install, write options), `privacy.clj` and `erase.clj` (the removed-family
refusal and record, resolved at call time). SDK: `packages/datomic/src/DatomicStorageAdapter.ts` (`creationSaves`,
`orderedSaveShape`), `DatomicClient.ts` (`declareIdentityBounds`), `test/ordered-saves.test.ts`. Tape:
`w1/field/production-mix.ts`, `real2/production-mix.json`. Gates: `s4/` (`gate.ts`, `run-gates.sh`,
`mem-gateways.sh`, `create_gate.clj`, `clj-gates.sh`, `sql.sh`, `sql-run.sh`, `idents.sh`, `mix-cell.ts`). Producer
and gate: `prep1/server-produce.ts` (`phase` takes tape M), `prep1/production-gate.ts`, `prep1/manage.py`,
`prep1/stack.sh`, `w1/field/journal.ts`. Card: `v01/production-card.ts`, `v01/adopted.ts`, `v01/run.ts`,
`scale1/decision/writes.ts`, `scale1/decision/observer.ts`, `stack/up.sh`, `v01/production-card.test.ts`.

# Import a subject whole

Builder DX-IMP2, 2026-11-24, branch `exp/DX-IMP2-import-whole-subject` from `exp/DX-INT1` `23b7df344`. Task: the save
shape page's row 9 ([SAVE-SHAPE](../v01/SAVE-SHAPE.md) section 3). Mac work is correctness at toy size; every Mac
time here is diagnostic. Nothing here ran on a server (none is rented). [Scope](../../../SCOPE.md) ·
[Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Readiness](../v01/READINESS.md)

## In brief

1. **With `TX2_IMPORT_WHOLE_SUBJECT=1`, no reader can see a subject half imported.** Each subject is one commit (or
   one of several whole subjects in one commit). Every read route was asked about every subject at every position:
   0 half-imported answers in 624 reads per writer mode, on memory and on PostgreSQL storage, and 0 through 36 kills
   and lost replies (section 5).
2. **The fault, stated exactly, is not what row 9 said.** No importer in the lab splits a subject; they all refuse a
   subject larger than their frame. What today's code does depends on the writer mode:
   - **v0.1's writer (per-subject writer, no live priority):** an import frame has no bound at all. A 500-fact subject
     is one commit holding the single writer for as long as it takes.
   - **The grouped writer with live priority:** the bulk class (96 new rows, 64 KiB) refuses any subject over
     46 facts (45 on three entities) with `BulkFrameTooLarge`, naming no limit. A 160-fact subject cannot be imported.
   - **The only way through that bound is to split the subject.** Split, readers see it half imported on all six
     routes at 32 of 42 positions in the check, and a kill between two frames leaves 90 of 160 facts visible for good.
3. **The bound: one import commit may hold at most 40,000 µs of the writer's own estimate** (`TX2_IMPORT_COMMIT_US`,
   the live budget's price function). That admits about 200 facts of the lab's size per commit. A 160-fact subject is
   32.4 ms estimated and is forecast to hold the writer about 16.5 ms at 1 billion. A 500-fact subject is 91.8 ms
   estimated, about 41 ms held at 1 billion, and is refused whole: `ImportSubjectTooLarge` from the importer,
   `ImportCommitTooLarge` with `maximum` and `estimatedMicros` from the gateway. Section 2 gives the argument.
4. **Option off is byte-identical to the base:** the same requests, outcomes, positions, write options and 3,532 log
   datoms, under the default settings and under v0.1's writer settings (section 5, gate a).

## 1. The fault (step 1, toy, diagnostic clocks)

Subjects of 20, 46, 47, 160 and 500 facts, each on three entities (a root referring to a profile and a document, as
the lab's deep subjects are), framed as the SDK frames a save on a lean scope. A neighbour account saves between
frames. After the import, every route is asked about every subject at every position. A subject is **out** (no
fact visible), **whole** (all facts) or **half** (anything else). Routes: pinned current read, pinned history read,
reach from the root, read by assertion ID, the feed's change records, and the journal's change rows.
Gate `imp2/whole_gate.clj` `fault-today`; identical results on memory and PostgreSQL.

| Path | 20 facts | 46 | 47 | 160 | 500 | What a reader sees |
| --- | --- | --- | --- | --- | --- | --- |
| v0.1 writer, one frame per subject | one commit | one commit | one commit | one commit | one commit | whole or out (300 reads, 0 half); **no bound**: the writer's estimate runs 8.0, 12.5, 12.7, 32.4 and 91.8 ms |
| Grouped writer with live priority, one frame per subject | one commit | 413 `BulkFrameTooLarge` | 413 | 413 | 413 | the refusal names no limit; on one entity, 46 facts fit and 47 do not (2F + 4 rows ≤ 96) |
| Split to fit 96 rows and 64 KiB (the only way through) | 1 frame | 2 frames (45 + 1) | 2 (45 + 2) | 4 | 12 | **half at 2, 2, 6 and 22 positions** for the 46, 47, 160 and 500 subjects (each gap between two frames is two positions, because a neighbour's save lands in it): 192 of 1,260 reads half, 32 on each of the six routes |
| Split, killed after 2 of the 160-fact subject's 4 frames | | | | 90 of 160 facts | | half on all six routes, at the head, with nothing recording that the rest is missing |

**ID lists, the sweep and the `find` route** are not on this base (`23b7df344`); the merge builder had not pushed them
when this branch finished. They read the same committed rows, so a whole commit is whole on them too; this is argued,
not tested.

## 2. The decision: one commit per subject, and where the bound sits

**One commit, not a staging form.** A commit is atomic on every route because Datomic applies a transaction whole;
nothing else is needed. A staging form (parts invisible until a final switch, as ACT6 did for notice ledgers) would
need every read route, the feed and every question route to hide parts, and a restart to finish or remove them. That
is worth building only for subjects above the bound, and the scale target's deep subjects are 160 facts.

**What one subject costs the single writer as one commit** (toy, PostgreSQL storage, gate `counted-work-per-subject`;
apply times diagnostic):

| Facts | Commits | Datoms | Row and journal text | New rows | Operations | Request bytes | Writer estimate | History lookups inside apply (plain / with identity bounds) | Storage reads inside apply | Toy apply, warm (plain / bounds) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 1 | 65 | 20,234 B | 46 | 58 | 27,414 | 8.0 ms | 64 / 19 | 0 | 4.9 / 4.2 ms |
| 160 | 1 | 345 | 149,428 B | 326 | 338 | 200,400 | 32.4 ms | 344 / 19 | 0 | 4.6 / 5.3 ms |
| 500 | 1 | 1,025 | 463,588 B | 1,006 | 1,018 | 620,912 | 91.8 ms | 1,024 / 19 | 0 | 20.2 / 11.5 ms |

- **Datoms are 2F + 25** for one subject; text is about 925 bytes per fact; the estimate is about 4.5 ms + 0.175 ms
  per fact for 57-character values.
- **Storage reads inside apply are 0 at toy size**: the toy database fits in cache. They say nothing about 1 billion.
- **The general writer checks each new ID in history**, one AVET lookup per assertion. Declaring the frame's ordered
  identity block (`historyIdentityBounds`, one wide block per frame) replaces them with one range probe. Import frames
  create new subjects, so without the creation option they never reach the per-subject writer whatever their
  identity. Correction (S5 review finding F10, S6): with `TX2_SUBJECT_CREATE=1`, an import frame of one to four new
  subjects of one account, with one claim and a source, takes the creation function
  (`s5-attack/import-bound-estimate-against-apply`); the records are the same as the general writer's.

**What a live save can wait.** Today's live bound is 8 ms of the same estimate, which admits about 20 facts. The bar
that binds an import is priority 6: a quiet account's commit p99 stays within 1.25 times its control or inside 50 ms.

1. **Hold at 1 billion: about 5 ms + 0.072 ms per first-write fact.** Basis: 72 ms of native apply per 2,000 imported
   facts in the archived server trace (`load1/ISOLATION-BENCH.md`), doubled for 1 billion as replacing saves doubled
   from 430 million to 1 billion (0.06 to 0.12 ms per fact, `bm1/PRODUCTION-TAPE-READING.md`). 160 facts: about
   16.5 ms. 500 facts: about 41 ms. The 40 ms bound: about 19.5 ms.
2. **A neighbour's save that arrives during an import commit waits the rest of it.** At 3,000 facts/s the import holds
   the writer about 30% of the time, so the p99 save meets almost a whole commit: it adds about 0.97 times the hold.
3. **The quiet account:** 24 ms p99 alone on the production tape at 1 billion. Beside 160-fact commits about 40 ms
   (inside 50 ms); beside 500-fact commits about 64 ms (outside); at the bound about 43 ms. The 1.25 times clause
   (30 ms) is missed at every width, as it already is with today's 32-fact frames (quiet 32.5 ms measured).
4. **A neighbour's p50** moves about 0.3 × half the hold: about 2.5 ms for 160-fact commits.

So the bound sits where one commit costs a quiet save at most about 20 ms at 1 billion: **40,000 µs of the writer's
estimate, about 200 facts**. A subject over it is refused with the limit, never split. The owner can move it with
`TX2_IMPORT_COMMIT_US` (1 to 1,000,000).

## 3. What is built (all default off)

| Part | With `TX2_IMPORT_WHOLE_SUBJECT=1` | Off |
| --- | --- | --- |
| Gateway bound (`import_bound.clj`, called from `storage/commit!`) | An import-class commit (`writeClass: "import"`, or no claims) whose estimate exceeds `TX2_IMPORT_COMMIT_US` (default 40,000) is refused whole: 413 `ImportCommitTooLarge`, `maximum` = the limit, `estimatedMicros`, nothing written. Checked in every writer mode. The bulk class's 96 rows and 64 KiB, and the live budget, no longer apply to import frames. | Not loaded at all |
| Why the bound sits in its own namespace | Any new function in `write_policy.clj` renumbers the generated names of the commit function and the per-subject function, which load after it, and so changes their stored hashes. The bound is loaded lazily on the first import commit, and `write_policy.clj` gains two plain values only. | Every native function and stored hash equal to the base |
| Write options | `options.importWholeSubject: true`, `options.importCommitMicros` | No new keys |
| Error body | `estimatedMicros` beside `maximum` when the gateway sets it | Unchanged |
| Importer (the gate's, as load1's protocol) | Packs the longest run of whole subjects whose frame fits; a subject that alone exceeds the bound is reported `ImportSubjectTooLarge {subject, facts, estimateUs, limitUs}` and never sent | |
| Lab plumbing | `stack/up.sh` forwards both settings to the writers; the combined check's writer settings carry them; `ha1/local.ts` lets DX-IMP2 run the combined cases in its own slot; the fair importer takes one whole subject of up to 1,000 facts per frame and checks the writer's readback; the fair server launcher accepts those widths | Byte-identical launches |

**The load1 snapshot importer** sends import-class frames under the option from its import entry points, and never
splits a subject (section 8.2). The product has no import API yet. Where an import gets its identities is the SDK's
(below).

## 4. Identities, receipts and history

- **An imported subject is a save.** The same frame sent as an import and as a live save gives the same outcome,
  position, record time, 842 log datoms (equal by digest) and the same feed and journal (gate
  `an-imported-subject-is-a-save`).
- **A resend after a lost reply returns the original receipt:** the lost reply answers 503 `OutcomeUnknown`; the
  resend `OperationDuplicate`; a new operation on the same command `CommandConflict`; the claim lookup returns the
  committed receipt at the original position; the 160 facts are written once.
- **A kill mid-import resumes without duplicates** (gate c below).
- **Where this meets the SDK identities builder** (`exp/DX-S2-save-shape-sdk`, `TriplesLive`, `DatomicStorageAdapter`,
  not edited here): import frames take the general writer, so the per-subject writer's ordered-block rule does not
  matter to them. What matters is (1) a 160-fact subject's frame has about 330 assertions and a 200-fact one about
  410, so a per-transaction ordered block must be the wide form (4,096), not the one-byte form (256); and (2) a frame
  that declares its block's bounds turns one history lookup per assertion into one range probe (1,024 to 19 lookups
  for 500 facts on the toy). Neither changes the bound, which prices operations and bytes.

## 5. Gates (toy; counts are results)

Run: `node lab/bin/heavy.mjs --label DX-IMP2-gate -- bash lab/experiments/EXP-DX1/imp2/gate.sh OUT` (the lab image
with this branch's gateway sources mounted read-only, and the base's sources for gate a). Evidence:
`DX-IMP2/` in the private evidence store.

| Gate | Result |
| --- | --- |
| **(a) Option off: byte-identical** (`off_digest.clj`, base `23b7df344` and this branch, fresh JVM each) | 6 import frames and 6 live saves (subjects of 8 to 500 facts): the same 12 request digests, outcomes and positions, the same 3,532 log datoms by digest, the same write options; under the default settings and under v0.1's writer settings. **IDENTICAL** both times. |
| **(b) Every subject wholly in or out, every route, every position** (`whole-subjects-visible-whole-or-not-at-all`, v0.1 writer and grouped writer) | 13 subjects, frames of 8 whole subjects (139 facts, 32.2 ms), 1 (47), 2 (160 + 11, 34.8 ms) and 1 (13); 8 positions, 624 reads per mode, **0 half**; the 500-fact subject refused by the importer, and by the gateway when sent anyway (413, `maximum` 40,000, `estimatedMicros` 91,895), and never visible |
| Step 3: several whole subjects per frame | the first frame carries 8 subjects; covered by (b) |
| **(c) Kill at every frame through the first 50 subjects, resume** (`kill-after-every-frame-and-resume`) | 62 subjects (60 of 20 to 40 facts, one of 160, one of 9) in 11 frames; each of the 9 frames that start before subject 50 was killed before its send, lost its reply once (503, recovered by lookup), was killed after its commit but before its checkpoint (recovered by `CommandConflict` and lookup), and was killed after its checkpoint: 27 kills and 9 lost replies, 28 restarts. Final log equal to a control import datom for datom (4,290 datoms; only operation IDs, one per attempt as the SDK's, excluded), receipts equal, 0 duplicate history rows, each command committed once, 0 half at every position |
| **(d) Live saves beside an import, same subject and other accounts** (`live-saves-beside-an-import`, both writer modes) | Live save first: the import is refused 409 `CasConflict`, nothing written, then sent again and committed whole on top. Import first: the live save is refused 409 `CasConflict` and replayed on top. Never merged: 0 half in 72 reads; 161 and 121 current facts. Neighbour saves in another account between frames: all 200 |
| (e) Removal on request of a subject that is itself mid-import | **Pass with the option** (section 8.1): 28 assertions; 0 removed plaintexts in any answer at any position, against 13 with the option off. Earlier, beside an import: **Partly.** The combined check's `read` case ran with the option set in the launcher (`ha1 load-fair --combined read`, holder DX-IMP2, toy SQL stack): 4 import frames at positions 5, 7, 13 and 23, a removal on request at position 8 between them, 21 saves, 176 logical reads, 27 replayed commits, exit 0. Its imports are 8-fact subjects in other entities than the removed value, so **removal of a subject that is itself mid-import was not exercised**, and this case does not read the writer's options back |
| **(f) Fair-import combined check with the option on** (`ha1 load-fair --combined fair`, holder DX-IMP2) | Exit 0: 8 import frames (fair policy) beside live saves, the quiet account and Publish, 36 receipts, 46 replayed commits, every row read back. Rerun at `f3cda6b85` with the writer readback asserted: **exit 0**, writer `importWholeSubject: true, importCommitMicros: 40000`, 8 import frames, 36 receipts, 46 replayed commits, 0 containers left |
| (f) Production exactness gate with the option on (`DX_CHK1_HOLDER=DX-IMP2 DX_IMP2_WHOLE=1 prep1/manage.py OUT production 10 1 1 0 1`, at `f3cda6b85`) | **Pass**: R 840 of 840 and S 88 of 88 commits (and 2 wide), 0 expired, 2,264 facts written, 2,836 fields read back exactly. The option reached the stack as its staged `import-whole` setting; this gate has no writer readback of its own. The gate rebuilds the shared `tx2-datomic:dx-real2-production` tag, as every builder's run of it does |
| Snapshot importer proof with the option on (`ha1 load-proof`, holder DX-IMP2) | **Pass**: every snapshot frame reached the writer as import class (`frameClasses: {import: 2}`), writer readback `importWholeSubject: true`, 20 facts, kill-free reopen and forged-cursor refusal as the proof has always checked |
| **(g) Counted work** | section 2 table |
| **Totals** (`imp2/gate.sh` on `0e3c57e8e`'s gateway sources) | memory: 6 tests, 272 assertions, 0 failures; PostgreSQL storage (fsync, synchronous commit, full page writes on): 6 tests, 272 assertions, 0 failures; option-off digest IDENTICAL twice |

## 6. Server run (published before any run; no machine is rented)

**What it answers:** the import rate and the neighbours' cost when every frame is one whole subject of 160 facts.

**Harness:** the fair-import launcher that measured priority 8 (`load1/fair-server.sh`, `held-server.ts`), live-first
(`yield`), rolling 6, one importer credit, on one fresh disposable copy. Each arm has its own five-minute quiet,
control and import cells on the same copy. Arm 1 is today's setting (32-fact frames); arm 2 is 160-fact whole
subjects. Both arms run with the option on: 32-fact frames never reach the bound, so arm 1 behaves as today.

```bash
# Prepared server as load1/FAIR-SERVER.md (build receipt, native job queue clear, fresh disposable copy and WAL copy).
COMMIT=<this branch's head>
TX2_IMPORT_WHOLE_SUBJECT=1 node lab/bin/heavy.mjs --label DX-IMP2-whole-160 -- \
  bash lab/experiments/EXP-DX1/load1/fair-server.sh "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
  "$SCALE1_TRANSFER_SHA256" "$TEMPLATE" "$OUT/imp2-whole" \
  --pg-data "$COPY" --wal-dir "$WAL_COPY" --credit-mode rolling6 --frame-facts 32,160 --import-policy yield
```

**Three things this harness does not do, which the brief asks for:**

1. **It runs on the fresh scale image (ten accounts of 100,000 subjects), not at 1 billion.** It reads the scale seal,
   not the aged bundle. The 1 billion forecasts below double the per-fact apply; running it at 1 billion needs the
   aged copy wired into `held-server.ts` (not built).
2. **Its neighbours run Saturday's tape** (one to three fields per save, 235 saves/s over nine accounts and a quiet
   account at 3.5/s), not the production-shaped tape.
3. **Its import cell lasts five minutes,** so it imports about 5,000 to 6,000 subjects of 160 facts, not 10,000.
   Its fair-import subjects are one entity each.

**Duration and cost:** copy 2 to 3 minutes, two arms of three five-minute cells with launch and checks about
30 minutes (57-minute limit), verification and cleanup about 10: about 45 minutes, about USD 0.85 at USD 1.09 per
machine hour; with server preparation, about 1 hour 15 minutes and USD 1.40.

**Predictions** (second half of each cell; arm 1 from the yield runs of 2026-11-21 to 23):

| Measure | Arm 1, 32-fact frames | Arm 2, 160-fact whole subjects | At 1 billion (forecast only) |
| --- | --- | --- | --- |
| Import rate | 3,000 to 3,700 facts/s | 3,500 to 6,000 facts/s (fewer frames, each about 9 ms more apply) | 2,500 to 4,500 facts/s |
| Frame apply mean / p99 | 3.5 to 4.5 / 18 to 23 ms | 8 to 12 / 25 to 45 ms | 14 to 20 / 40 to 70 ms |
| Busy accounts' save p50 | within 2 ms of control | within 4 ms of control | within 5 ms |
| Busy accounts' save p99 | 30 to 80 ms (1.5× missed, as before) | arm 1 + 5 to 15 ms | arm 1 + 10 to 20 ms |
| Quiet account p99 loaded | 30 to 45 ms | 32 to 48 ms: inside 50 ms; 1.25× missed | 38 to 50 ms |
| Frames refused `ImportCommitTooLarge` | 0 | 0 | 0 |
| Rows verified at the terminal cut, receipts, expiries | all; all; 0 | all; all; 0 | |

**What would show these wrong:**

1. **Arm 2's quiet p99 over 50 ms while arm 1's is under it:** one 160-fact commit costs a quiet save more than the
   forecast; lower `TX2_IMPORT_COMMIT_US` to about 25,000 (about 115 facts) and rerun.
2. **Arm 2's frame apply p99 over 60 ms on the fresh image:** the per-fact hold is at least twice the forecast; the
   1 billion forecast and the bound must be redone.
3. **Any `ImportCommitTooLarge` on a 160-fact frame:** the server's request bytes differ from the Mac's; read the
   refusal's `estimatedMicros`.
4. **Arm 2's import rate under arm 1's:** whole subjects cost more per fact than small frames, and the case for
   larger commits falls.
5. **Any lost or unverified row, expiry or write-options mismatch:** the run counts for nothing until explained.

## 7. Not verified

- **Nothing ran on a server.** Every 1 billion figure is a forecast from the fits named in section 2.
- **ID lists, the sweep and `find`** were not on the base; their visibility is argued, not tested.
- **Removal by assertion ID of a value not yet imported** has nothing to record (the ID does not exist yet); only entity selectors are recorded as families.
- **ID lists, the sweep and `find`**: `origin/exp/DX-INT1` was still `23b7df344` at 15:52 local, so nothing was merged and the visibility gate does not cover them.
- **The product has no import API.** The bound applies to import-class commits; the load1 snapshot importer sends
  them under the option from its import entry points (section 8.2); the toy fixture's seed loader does not.
- **Toy apply times and storage reads** say nothing about 1 billion; the toy database fits in cache.
- **The server harness gaps** in section 6 (fresh image, Saturday's tape, five-minute cell, one-entity subjects).

## 8. Closing the open items (2026-11-24, after the lab VM was repaired)

### 8.1 Removal on request of a subject that is itself mid-import (gate e)

**The fault, found first.** A subject being imported does not exist until its frame commits. A removal that names it
in that window (by its entity, with or without the attribute) matches no row, removes nothing, and only advances the
removal sequence. The frame is refused whole (`ErasureFrontierChanged`, it carried the old sequence), the importer
reads the frontier again and resends, and **the removed value is written**. A client that sends no removal sequence
gets the same result without the refusal.

**The change (default off, with `TX2_IMPORT_WHOLE_SUBJECT=1`):**

1. A removal records the protected families (entity, attribute) its entity selectors name, even when no row exists
   (`erase.clj` `make-entry`, `import_bound.clj` `removal-families`); every gateway reads them back from the removal
   record (`privacy.clj` `apply-entry`). With the option off no record gains the key.
2. The removal frontier route reports `families` (only with the option on).
3. The existing rule then applies: an importing write (`:_tx/actor` "bulk-import", or `erasureReplay`) of a removed
   family is refused whole with `ErasureReplayDeclined`. The importer leaves the reported families out and resends.

**Gate** (`imp2/removal_gate.clj`, sealed protected scope with file keys, shredding with no grace; option off then on):

| Case | Option off | Option on |
| --- | --- | --- |
| 1. Removal of s1's protected value between its frame's read and commit (s1 alone in its frame) | refused `ErasureFrontierChanged`, resent with the value: **removed value readable** | refused, resent without it: 21 facts then 20, the value never stored |
| 2. Removal of s3 (all protected attributes) between the read and commit of a frame of s2, s3, s4 | refused, resent whole: **s3's value readable** | refused whole, resent with 104 of 105 facts: s2 and s4 whole with their values, s3 whole without its value |
| 3. Removal after the commit (s5) | 1 identity removed; key shredded | the same |
| 4. As 1, from a client that sends no removal sequence (s6) | committed with the value: **readable** | refused `ErasureReplayDeclined`, resent with 55 of 56 facts |
| Removed plaintext in any route's answer at any of 8 positions (pinned read, pinned history, reach, feed) | 13 cells (s1, s3, s6) | **0** |
| Every subject wholly in or out on the six routes (288 reads) | 0 half | 0 half |
| Protected plaintext anywhere in the Datomic log | none (sealed) | none |
| Values not removed still readable (s2, s4) | yes | yes |

28 assertions, 0 failures. **Not covered:** a removal by assertion ID cannot name a row that does not exist yet, so
it has nothing to record; a live save (not an import) may still write a removed family, as before.

### 8.2 The load1 snapshot importer (item 4)

- **Bound by the option:** with `TX2_IMPORT_WHOLE_SUBJECT=1`, each import entry point (`file-proof.ts`,
  `split-import.ts`, `live.ts`) installs `load1/import-class.ts`, which gives the snapshot's own commands
  (`load1/…`) `writeClass: "import"`, so the gateway's bound applies. A frame refused for the bound writes nothing and
  is reported `ImportFrameTooLarge {first, end, facts, limitUs}`; the checkpoint does not move.
- **The toy fixture's pinned seed loader (`age1/scale1-fixture.mjs`) does not opt in.** It is set-up, not an import
  under test, and its frames of 16 deep subjects (1,938 facts) are about three times the bound: the first rerun of
  the fair combined check, with the hook installed for every snapshot, refused its seed frame whole, as it must.
- **It never splits a subject** (`imp2/snapshot-whole.test.ts`): for the thin (300 subjects), seed (120) and deep
  (24) sources at 9 widths from 8 to 8,192 facts, 597 frames, every frame equals its subjects' facts, whole and in
  order; when a subject is larger than the width the source refuses before any part of it is framed. Option off, the
  request is the same object with no write class. 6 tests pass; load1's own 7 tests pass.

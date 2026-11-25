# Several owners in one subject's save (DX-S3)

North star P2 and the owner's decision of 2026-11-24: one commit per subject's save. The product-path builder
([S2](../s2/PRODUCT-SAVES.md)) found that 6 of the product's 11 save shapes reach the per-subject writer; the main
shape that does not is a save that writes several owners in one commit (a form page that also updates the subject's
profile). This page lists the shapes, gives the design for two to four owners, says what is built behind one
default-off option, every gate with its counts, and the server arm. Mac figures are toy size; times are diagnostic.
[Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) ·
[Save shape](../v01/SAVE-SHAPE.md) · [Product saves](../s2/PRODUCT-SAVES.md) · [Wide saves](../w2/WIDE-SAVES.md)

**In brief.**

- **7 of the product's 11 save shapes now reach the per-subject writer** with the option on (S2: 6 of 11). The new
  one is the form page that maps fields to the subject's profile (task and profile, two owners). Built and gated at 2,
  3 and 4 owners. The 4 shapes left on the general writer are the ones that create an entity or write a reference.
- **On the production-shaped tape nothing changes:** every one of its saves writes one owner (0 of 6,919 saves at the
  394 load write two or more; the same at 50, 235 and 620). So the tape's share on the fast writer stays what S2's
  arm C gives (100% of S saves in the toy gates). How often a real page maps profile fields needs a production query;
  none was made.
- **The option:** `TX2_SUBJECT_SEVERAL_OWNERS=1` in the write gateway (needs the wide writer) and `severalOwners` in
  the SDK (with `orderedSaves`); the lab switch `DX_S3_OWNERS=1` sets both. Off, nothing is installed: all 58 stored
  functions and code hashes the gateway knows are identical to the product-path builder's build in 8 writer settings,
  and the SDK's requests are byte-identical.
- **How:** a second stored function, built from the one-owner function's own text with one part replaced: every
  owner's public ID is checked and every owner's revision is compare-and-set against the revision the gateway read.
  It is installed only with the option on, so the one-owner function keeps its identity.
- **Exactness:** against a control written through the general writer, every receipt (399) and every read route
  (67,954 answers) is equal; two saves sharing one owner commit one and refuse the other whole (its 14 identities, on
  both of its owners, are absent from history); a removal on request, an excision, a moved public ID or another save
  of one owner between the plan and the commit refuses the whole save and writes nothing.
- **What it buys:** about 2 ms of serial time per two-owner form save at 1 billion records (forecast, section 7). It
  matters only if such saves are common and the serial point is busy.

## 1. The product's save shapes and the owners they write

From S2's table (`s2/PRODUCT-SAVES.md` section 3, the shapes read from the product's code in `v01/SAVE-SHAPE.md`
section 2), with the wide writer and `orderedSaves` on:

| Product save | Facts / retired | Owners | Before (S2) | After (this option on) | Why not, if not |
| --- | ---: | ---: | --- | --- | --- |
| Form page submit, 20 rows (task) | 25 / 25 | 1 | per-subject | per-subject | |
| The same, kept true until now | 50 / 25 | 1 | per-subject | per-subject | |
| **The same with fields mapped to the subject's profile** | 27 / 27 | 2 | **general** | **per-subject** | was: several entities |
| Status change | 4 / 1 | 1 | per-subject | per-subject | |
| Status change with the file as a reference | 2 / 1 | 1 | general | general | a reference value |
| Check result | 2 / 2 | 1 | per-subject | per-subject | |
| Writeback to the subject's other form | 1 / 1 | 1 | per-subject | per-subject | |
| Import row (a new subject's first save) | 12 / 0 | 1 | general | general | the owner does not exist yet |
| Correction of a past value | 2 / 1 | 1 | per-subject | per-subject | |
| Bulk action (a batch and five items) | 6 / 0 | 6 | general | general | six owners, all new |
| Progress copied between subjects | 2 / 0 | 1 | general | general | a new owner and a reference |
| **Qualifying** | | | **6 of 11** | **7 of 11** | |

**The 5 shapes that did not qualify before, and why:**

1. **Form page with profile fields:** two entities (task and profile). The SDK gave it the runtime's IDs
   (`runtime:several-entities`) and the gateway's plan accepts exactly one owner. **Now per-subject.**
2. **Status change with the file as a reference:** a reference value names a second entity; neither the SDK's rule
   (`runtime:reference-value`) nor the gateway's field rule takes it.
3. **Import row:** the subject does not exist yet. The writer's serial check is a compare-and-set on an existing
   owner's revision; a new owner would need an absence proof of its public ID inside the function.
4. **Bulk action:** six new entities (over four owners, and none exists yet).
5. **Progress copy:** a new task with a reference to the source subject.

**What the 4 left cost on the general writer** (1 billion records; fits named in `v01/SAVE-SHAPE.md` 4.3: serial apply
0.12 ms per fact on the general writer, warm commit 5.39 ms + 0.201 ms per fact):

| Shape | Facts | Serial apply, general | What the per-subject writer would save | Warm commit |
| --- | ---: | ---: | ---: | ---: |
| Status change with a file reference | 2 | 0.24 ms | under 0.2 ms | 5.8 ms |
| Import row | 12 | 1.4 ms | about 1 ms (and imports go through the import class) | 7.8 ms |
| Bulk action | 6 | 0.7 ms | about 0.5 ms | 6.6 ms |
| Progress copy | 2 | 0.24 ms | under 0.2 ms | 5.8 ms |

None is worth a second extension: together they are rare actions of a few facts each.

**The production-shaped tape** (`s3/tape-owners.ts`, the card's shape S cells, 300 s, both tape edges; evidence
`tape-owners.json`): every neighbour save writes one owner, the subject's first task.

| Cell (no-burst tape) | Saves | Rows | 1 owner | 2 | 3 | 4 | over 4 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 rows/s | 834 | 13,950 | 834 (100%) | 0 | 0 | 0 | 0 |
| 235 | 4,011 | 69,450 | 4,011 (100%) | 0 | 0 | 0 | 0 |
| 394 | 6,919 | 117,150 | 6,919 (100%) | 0 | 0 | 0 | 0 |
| 620 | 10,569 | 184,950 | 10,569 (100%) | 0 | 0 | 0 | 0 |

The burst tape gives the same (843, 4,020, 6,928 and 10,578 saves, all one owner). The production study the tape is
built from saw form rows grouped by subject; it does not say which rows map to the profile. **An extension to four
owners covers 0% of the tape's saves and rows,** and every two-to-four-owner product save the product makes.

## 2. What the per-subject writer proves for one owner

The writer is two halves: a plan in the write gateway, on its newest database value, and a stored function that runs
at the serial point on Datomic's own database value (`subject_save.clj` `plan-with-erasure` and `body`).

**The plan certifies the frame and reads the predecessors:**

1. one journal, one command claim, no client sequence, span 1, server record time, lean rows, not scope-wide, no save
   ledger, packed journal, bulk class or import predecessor; every op one of the small shapes;
2. the scope's flags (schema and commit-function hashes, rows and head versions, strict clocks, regular positions and
   feed, the removal ledger and its sequence) are the per-subject writer's, the function is installed, no excision has
   removed application rows, and the save's journal does not exist yet;
3. **the owner exists and its revision is at or before the save's source cut, which is at or before the head;**
4. each retracted ID is the owner's current row (one EAVT seek each, not retired);
5. **fields:** narrow (wide off): one to three facts, each replacing the same field; wide (W2): up to 128 facts and
   128 retirements, plain fields only (no reference, no `:_` attribute, not a journal row). S2 allowed a field to be
   asserted twice (the old value kept true until now, then the new value): nothing below is keyed by field, and every
   predecessor is covered by the revision check;
6. the new IDs are exactly the asserted rows, and an **ordered block** is recognised from the journal ID (`_tx/<24>00`
   one-byte, 256 IDs; `_tx/<23>W00` wide, 4,096).

**The stored function checks, at the serial point:** the operation and the command are not claimed; the scope's
durable flags are unchanged; the numeric owner still has its public ID (owner witness); the function is the installed
one; the removal sequence is the one planned; no excision; the journal is absent; **the history guard** (the whole
ordered interval holds no row of any owner, live or retired, at most 128 datoms inspected, else one probe per ID);
then **the revision compare-and-set** (the owner's revision is still the one the plan read; it becomes the new
position), and it stamps every row with the position and clock.

**Its conflict set** is the owner (revision), the operation and command claims, the scope's flags and removal
sequence, the journal entity and the identity interval. The general writer's is every entity in `entities` (each
revision not newer than the source), every retracted row (still current), every new ID (never used), the claims.
They are the same set: any commit after the plan that touches the owner moves its revision past the planned value,
and the plan's database is at or after the source, so the general writer would also refuse it (`rev > source`).

## 3. What must hold for two to four owners (the design built)

The same proofs, owner by owner, in one function:

| Question | Rule |
| --- | --- |
| **Revision check** | One per owner. The plan reads every owner's revision (each at or before the source cut); the function checks every owner's public ID (numeric owner) and compare-and-sets every owner's revision (or, with the narrow revision, checks it through the revision's AEVT and asserts the new one). Any owner changed after the plan refuses the whole save. |
| **One account** | Every owner in one account: all IDs in one `acct/<account>/` namespace, or none namespaced (test scopes), as `group/classify` reads accounts. Else `several-accounts`. |
| **Conflict set** | Every owner written or read. The read set the SDK names (`entities`) must equal the owners written; a save that also reads an entity it does not write is refused (`read-only-entity`), because a read-only entity would need a second kind of check (no revision change, absence included). |
| **History IDs across owners** | One ordered block numbers every assertion of the save, whichever owner it belongs to, in the SDK's staging order; the history guard proves the one interval empty once, for all owners. The block size counts one changed-entity journal row per owner. |
| **An owner that does not exist yet** | Refused (`new-owner`). Creating it would need an absence proof of its public ID inside the function and an upsert path; the general writer takes such saves. |
| **An owner retired by the save** | Retiring every field of an owner is ordinary retirement: the owner entity keeps its public ID and gets the new revision, exactly as the general writer leaves it. Gated (retirements only, two owners). |
| **References between owners** | Refused (`reference-value` in the SDK, `reference-or-system-field` in the gateway), as for one owner. |
| **Predecessors** | Each retracted ID must be the current row of the owner the retraction names; read once per ID on that owner (`retired-not-current` otherwise). |
| **Bounds** | The wide writer's, over the whole save: at most 128 facts asserted, 128 retired, 1,024 ops, 4 owners (`over-subject-bound`, `over-owner-bound`). |
| **Removal on request** | Unchanged: the removal sequence and the scope's flags are checked once per save; a removal between the plan and the commit changes the sequence, so the whole save is refused. |
| **Append retirement** | Each retirement marker goes on its own owner; the receipt check expects every owner's markers. |
| **Hints** (`TX2_SUBJECT_HINTS=1`) | The hint function names one owner's reads; the gateway calls it once per owner in one `d/with` (the hint function is unchanged). Per owner the serial point reads the owner's public ID and revision (EAVT), the revision's AEVT, and each retired and new row's EAVT and AEVT neighbourhood; the history interval once. So a cold save of N owners can read up to N times the one-owner reads inside apply; hints move them before apply. |
| **Covering owner head** (`TX2_SUBJECT_OWNER_HEAD=1`) | Not combined: the gateway refuses to start with both, and `stack/up.sh` refuses the pair. The covering root is one owner's. |

## 4. Every refusal, with its typed reason

A refused save takes the general writer with its block (exact: the general writer takes any IDs). Reasons are counted
in `client.saveRoutes` (SDK reasons when the SDK gives no block; with `severalOwners` on, every answer's writer as
`writer:per-subject`, `writer:general`, or `general:<the gateway's reason>`, from the receipt's `subjectDeclined`).

| Reason (`client.saveRoutes`) | Where | Case |
| --- | --- | --- |
| `runtime:over-owner-bound` | SDK | more than 4 entities asserted (also `general:over-owner-bound` if the gateway sees more than 4 owners) |
| `runtime:several-accounts` / `general:several-accounts` | both | owners in two accounts, or a namespaced and a plain ID |
| `runtime:reference-value` / `general:reference-or-system-field` | both | a reference value (between owners or to any entity), or a `:_` attribute |
| `runtime:system-entity`, `runtime:system-attribute` | SDK (gateway: `system-entity`) | an entity `_…` or attribute `:_…` |
| `runtime:over-subject-bound`, `general:over-subject-bound` | both | over 128 facts asserted or 128 retired (or 1,024 ops) across all owners |
| `runtime:no-command-id`, `runtime:constraints`, `runtime:pattern-retraction`, `runtime:empty`, `runtime:nested`, `runtime:not-lean`, `runtime:client-record-time` | SDK | as for one owner (S2) |
| `general:new-owner` | gateway | an owner that does not exist yet |
| `general:read-only-entity` | gateway | the save reads an entity it does not write |
| `general:stale-source` | gateway | an owner's revision is newer than the save's source cut (the general writer then refuses it, `CasConflict`) |
| `general:retired-not-current` | gateway | a retracted ID is not its owner's current row |
| `general:scope` | gateway | the scope's flags, the function not installed, an excision, or the journal exists |
| `general:frame`, `general:protected-values-or-frame` | gateway | a client sequence, scope-wide read, bulk or import frame, irregular positions, span over 1; protected values (sealed envelopes) |

## 5. What is built (every part default off)

| Part | With it on | Off |
| --- | --- | --- |
| **Gateway:** `subject_owners.clj`, `TX2_SUBJECT_SEVERAL_OWNERS=1` (needs `TX2_SUBJECT_SAVE=1` and `TX2_SUBJECT_WIDE=1`; refuses to start beside `TX2_SUBJECT_OWNER_HEAD=1`) | A save of 2 to 4 owners that the one-owner plan declined is planned by this namespace; if accepted it is sent to `:triplex.subject/owners-<hash>`, installed at scope open. The receipt says `subjectOwners: n`, or `subjectDeclined: <reason>` for a refused save of two or more owners. `write-options` reads back `subjectSeveralOwners: 4` and the function. | Nothing installed, no new receipt or write-options key. |
| **The function** | `subject/compile-code` of the one-owner body with only its head update replaced (`owners-update`): every owner's public ID and revision. Same history guard, flags, removal and stamping text. | The one-owner function is not touched. |
| **SDK:** `severalOwners` (`makeDatomicRuntime`/adapter, or `TRIPLEX_DATOMIC_SEVERAL_OWNERS=1`), only with `orderedSaves` | `orderedSaveShape` takes up to 4 entities of one account (`SUBJECT_SAVE_OWNERS`); the block counts one changed-entity row per owner; `owners:<n>` and each answer's writer counted. | Requests byte-identical (gate a). |
| **Lab:** `DX_S3_OWNERS=0|1` | The production gate (`prep1/manage.py` under the `DX-S3` holder) and the card (`stack/up.sh`, `scale1/decision/writes.ts`, `v01/adopted.ts` readback check, recorded among the writer options). | As before. |

**The identity hazard, and how it is avoided.** The stored function's ident is the hash of its code, and the code
embeds names that the Clojure reader generates while loading (`changes-application-rows?` expands with
auto-generated symbols). A namespace compiled before `subject_save.clj` reads that macro shifts those names, and with
them the ident of every per-subject function on every scope. So nothing earlier is edited: `subject_owners.clj` is a
new namespace loaded last (the last require of `storage.clj`, and from `main.clj`), and `storage.clj` and `main.clj`
are changed only in their bodies. `s3/idents.sh` loads the gateway as production does and prints every stored-function
ident and every quoted code form's hash (58 of them) in 8 writer settings, before and after.

## 6. Gates (Mac, toy size; counts are results, times diagnostic)

Evidence: `DX-S3-owners/` in the private evidence store (archives and `SHA256SUMS`).

| Gate | What ran | Result |
| --- | --- | --- |
| **(a) Option off: stored functions** (`s3/idents.sh`, `s3/compare-idents.py`) | The gateway loaded as production loads it, at `4d619a516` and at this branch, in 8 settings (no per-subject writer; the server's; with wide; with wide and both hints; narrow revision, reused predecessors and append retirement; the covering owner head; the new option on; on with the serial settings) | **58 of 58 identities and code hashes equal in all 8 settings**, both at the start of the work and on the final tree (`idents-base.jsonl`, `idents-final.jsonl`). With the option on, 4 new keys only (the new function; `:triplex.subject/owners-a184ca53…` with the server's settings, `owners-5dd408e7…` with the serial settings). |
| **(a) Option off: requests** (`s3/bytes.sh`) | S2's byte gate with every option off, and a copy (`s3/bytes.ts`) with `orderedSaves` and `saveSizeRule` on plus a two-owner and a four-owner save, each at `4d619a516` and at this branch against a fresh gateway, deterministic runtime; snapshot handles and ordered block tokens masked by order of first use | **Options off: 40 requests, 212,809 bytes, identical** (35 byte for byte, 5 with a masked handle). **`orderedSaves` on: 43 requests, 236,734 bytes, identical** (24 byte for byte; 8 block tokens and 2 handles masked) |
| **(a) Option off: the product-path builder's gates**, on this branch | S2's `run-gates.sh` (its gate b with the wide writer on and off, c, d, the size rule); S2's production gate exactly as S2 ran it (`DX_CHK1_HOLDER=DX-S2 DX_W2_WIDE=1 DX_S2_PRODUCT=1 …`); S2's aged gate (`DX_S2_PRODUCT=1 DX_S1_WIDE=1`); the production gate under DX-S3 with `DX_S3_OWNERS=0` | **The same counts S2 published:** gate b wide on 6 of 11 product shapes, 96 receipts, 33,918 answers equal; wide off 2 of 11, the same counts; c and d pass. Production gate: 840 R and 88 S per-subject, the two 130-fact saves general, 0 expired, 2,836 fields exact. Aged gate: R 840 and S 88 per-subject, ordered; 120 aged rows, a tampered row refused, 101 writes over aged rows, 1,927 fields, final cut 1,289. With `DX_S3_OWNERS=0`: the same, and the two-owner form saves 0 of 24 per-subject |
| **(b) Every save shape against a general-writer control** (`s3/gate.ts`, through `TriplesLive`, `orderedSaves` + `saveSizeRule` + `severalOwners`; gateway option on) | The matrix (1 to 4 owners × first writes, replacements, retirements, past-dated corrections, mixed × one fact per owner, 20, 64, 128, 129 facts: 100 saves) and 22 product shapes at 1 to 6 owners; every committed request replayed to a control with the per-subject writer off | **122 cases judged, 0 unexpected.** Matrix: **20 of 25 per-subject at each of 1, 2, 3 and 4 owners** (the 5 others assert or retire more than 128: runtime IDs, general writer). Product shapes: 1 owner 6 of 9 (the 3 others: references and a new subject); **2 owners 6 of 9** (the 3 others: `read-only-entity`, `new-owner`, `several-accounts`); **3 owners 1 of 1; 4 owners 1 of 1**; 5 and 6 owners 0 (`over-owner-bound`). **399 receipts equal** (position, clock, datoms; the control never used the per-subject writer). **Every read route equal (67,954 answers):** current at two valid times (280 + 280), history (280), reach (280), each owner's journal (280), pinned reads before and at every commit at three valid times (2,394), by assertion ID current and full history (31,681 + 31,681), the whole feed (399), every command (399) |
| (b) the same with the gateway's option off | The SDK still gives two-to-four-owner saves a block; the gateway sends them to the general writer without a reason | Pass: 122 judged, 0 unexpected; 1 owner 20 of 25 (matrix) and 6 of 9 (product) per-subject, **every save of two or more owners on the general writer**; 399 receipts and the same 67,954 answers equal; (c) and (d) pass on the general writer |
| (b) the same with `TX2_SUBJECT_HINTS=1` | | Pass, the same counts as the option-on arm; **99 of 99 per-subject saves carried hints** (every owner's reads named) |
| **(b) at the serial point** (`s3/owners_gate.clj`, in memory, against a control scope written with the per-subject writer off) | 7 saves of 2, 3 and 4 owners (replacements, first writes, retirements, 128 facts over four owners, retirements only), plain and with append retirement | Equal outcome, position, clock and datoms for every save; every read route (current, pinned at every position, history, by assertion ID, reach, feed with every change) equal; current values equal to the model; 187 retirement markers written with append retirement. **4 tests, pass: 255 assertions** with the server's settings, **255** with narrow revision + reused predecessors + append retirement, **269** with hints (the 14 more check that every several-owners save carried hints) |
| **(c) Two saves at once sharing one owner** (`s3/gate.ts`) | Save 1 writes the profile's field 0 and task A; save 2 the profile's field 1 and task B; sent together | 3 attempts: 1 refused `CasConflict`, 1 replay, 2 committed (both per-subject); **the refused attempt's 14 identities (on both of its owners) absent from history;** its replay took a new block; every field holds exactly one value |
| (c) at the serial point (`owners_gate.clj`) | A general-writer save of the second owner between the plan and the commit | `CasConflict`; the function submitted once; the operation absent, the command unclaimed, the journal absent, none of the save's identities in history |
| **(d) Lost reply and resend** (`s3/gate.ts`, a two-owner save) | The reply dropped after the gateway committed | 1 request sent; the receipt (position 399) found by operation; the resend refused `CommandAlreadyCommitted` naming the original transaction; the lookup by command returns it; the feed 399 entries before and after; writer per-subject, 2 owners |
| **(e) Removal on request of one owner between the read and the commit** (`owners_gate.clj`, protected scope) | The plan made, then a removal on request of the second owner's protected value (the gateway's own `erase` route), then the commit | **`CasConflict`, nothing written** (operation absent, command unclaimed, journal absent, no identity in history); the same save sent again as a new operation commits on the several-owners writer. Also refused whole with nothing written: the removal sequence moved directly, an excision of the second owner's rows, the second owner's public ID moved |
| **Refusals** (`owners_gate.clj`) | New owner, a read-only third entity, five owners, two accounts, 129 facts over two owners, a reference between the owners, a source cut older than an owner's revision | Each planned with its reason; each outcome equal to the control's (six committed by the general writer with `subjectDeclined` on the receipt, the stale one `CasConflict` on both) |
| **(f) Production and aged gates, option on** | Production gate (`DX_CHK1_HOLDER=DX-S3 DX_W2_WIDE=1 DX_S2_PRODUCT=1 DX_S3_OWNERS=1 prep1/manage.py OUT production 10 1 1 0 1`: PostgreSQL, real transactor, the server's per-subject settings, wide writer, every save through the product's path); aged-toy gate (`DX_S2_PRODUCT=1 DX_S1_WIDE=1 DX_S3_OWNERS=1 real2/aged-gate.sh OUT`) | **Production gate: pass, 840 R and 88 S commits on the per-subject writer (before: the same; the tape has no save of two owners), the two 130-fact saves on the general writer, 0 expired, 2,836 fields read back exactly**; write-options `subjectSeveralOwners: 4`. Its two-owner form saves: 24 of 24 per-subject (0 of 24 with `DX_S3_OWNERS=0`). **Aged gate: pass, R 840 of 840 and S 88 of 88 on the per-subject writer, ordered** (before: the same), 120 aged rows admitted, a tampered aged row refused, 101 writes over aged rows, 1,927 fields read back, final cut 1,289 |
| **(g) Counted work of a two-owner form save** | Section 7 | 320 saves per arm on PostgreSQL with a cold cache: the same datoms and text bytes, read routes equal; reads inside apply 21 against 31 (cold) and 3 against 10 (warm); apply 3.1 to 3.3 times shorter (diagnostic). On the product's path: 24 of 24 per-subject with the option on, 0 of 24 off |
| **(h) W2's wide gate and the mixed-identity suite** (`s1/suites.sh`, PostgreSQL, real transactor; two new arms with the option on) | off; wide; wide with both hints; **wide with several owners; wide, hints and several owners** | Mixed-identity, collision and conflict suite with WFIX1's regression suite: **6 tests, 235 assertions, pass in all 5 arms**. W2's wide gate: **4 tests, 221 assertions, pass in all 4 wide arms** (the same counts as S1 and S2 published) |
| Unit tests | SDK (`packages/datomic`, unit, with `test/ordered-saves.test.ts`, one new test); card tests `v01/*.test.ts` (two new assertions in an existing test) | **SDK 462 passed, 53 skipped** (S2: 461 and 53); **card 41 of 41**. Type check of `packages/datomic` clean. (A first run failed 4 SDK files and 1 card file on missing builds of `testkit`, `w0` and `qualification` in this fresh worktree; after building them, all pass.) |

## 7. Counted work of a two-owner form save

**On PostgreSQL storage with a cold cache** (`s3/sql.sh`: fsync, synchronous commit and full page writes on; a 32 MiB
object cache emptied by a transactor restart before each arm and round; 160 subjects, each a task of 40 fields and a
profile of 20, seeded and indexed identically per arm; then each subject gets a cold save and a warm save that each
replace 20 task fields and 2 profile fields, two rounds of 80 subjects; storage reads are each transaction's own
io-stats; times diagnostic):

| Two-owner form save (22 facts, 22 retired, 71 assertions) | General writer | Several-owners writer |
| --- | ---: | ---: |
| Saves (cold / warm) | 160 / 160 | 160 / 160, every one `owners-…` with 2 owners |
| Storage reads inside apply per save, cold: mean (max), total | 0.194 (9), 31 | 0.131 (9), 21 |
| The same, warm | 0.062 (10), 10 | 0.019 (1), 3 |
| Segment loads inside apply, cold: EAVT / AEVT / AVET | 8 / 10 / 13 | 6 / 8 / 7 |
| Datoms per save (cold and warm) | 110 | 110 |
| Added text bytes per save, cold / warm (median) | 33,785 / 35,345 | 33,785 / 35,345 |
| PostgreSQL WAL bytes per round of 160 saves, round 1 / round 2 | 1,236,016 / 3,503,808 | 1,320,232 / 1,456,680 |
| Serial apply, median cold / warm (diagnostic) | 7.63 / 7.57 ms | 2.32 / 2.41 ms |

- **The records are the same:** datoms and text bytes are equal for every save, and every read route (current and
  history of all 320 owners, pinned reads across the run, the whole feed with every change) is equal between the two
  arms by digest (`DX-S3_VERIFY`, head 480).
- **Reads:** most of each arm's reads are the first saves after a restart (max 9 in one save). The several-owners
  writer read no more than the general writer: 21 against 31 cold, 3 against 10 warm. At toy size the whole seed fits
  in the cache once loaded, so this says nothing about 1 billion beyond "not more per owner than the general writer".
- **WAL:** the general writer's round 2 includes an index job (2.3 MB more); round 1 is within 7% between the arms.
- **Serial apply:** 3.1 to 3.3 times shorter on the toy, as W2 measured for one owner at this size (2.2 to 3.5).

**On the product's path inside the production gate** (`prep1/production-gate.ts` with `DX_S3_OWNERS=0|1`, 12 subjects
each saved twice, 20 task fields and 2 profile fields; toy, warm 32 MiB cache):

| | Option off | Option on |
| --- | --- | --- |
| Writer, first / second save | general 12 / 12 | per-subject 12 / 12, ordered IDs on all 24 |
| Storage reads inside apply | 0 | 0 |
| Datoms | 110 | 110 |
| WAL bytes, median first / second | 19,584 / 21,136 | 19,360 / 21,072 |
| Serial apply, median first / second (diagnostic) | 5.39 / 4.79 ms | 2.23 / 2.00 ms |

The one-owner form save in the same runs (20 fields): per-subject in both, 99 datoms, apply 1.87 to 1.89 ms first.

**At 1 billion records (forecast):** a 27-fact task-and-profile save holds the serial point about 3.2 ms on the general
writer (0.12 ms per fact); the toy ratio of 2.2 to 3.5 gives 0.9 to 1.5 ms on the several-owners writer, so about
1.7 to 2.3 ms less serial time per such save, and 0.5 to 2 ms off its own commit p50 (S2 section 5). If a share f of
the 23 saves per second at the 394 load were such saves, the serial thread would be busy about f × 4 to 5 points less (23 × 2 ms = 46 ms per second).

## 8. Server arm D (published before any run; no machine is rented)

**The decision it serves:** with the option on, does anything change for the saves the card sends? The production
tape has no save of two or more owners (section 1), so arm D is a no-regression arm: the same as S2's arm C with the
option on in the writers and the SDK. It cannot price a two-owner save on the server; that needs a tape on which a
share of form saves also writes the subject's profile, which needs a production query for the share (not made).

Build and `part`/`arm` exactly as [READINESS](../v01/READINESS.md) "Next server session" and S2's section 8
(`CARD=(1B production-S-noburst server-32 300 tuned)`), at the head that carries this branch:

```bash
EXTRA="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"              arm /var/tmp/s2-card-product-wide   "${CARD[@]}"  # C (S2)
EXTRA="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1 DX_S3_OWNERS=1" arm /var/tmp/s3-card-product-owners "${CARD[@]}"  # D
```

Arm D is its own campaign (parts 1 and 2), 71 to 85 minutes, about USD 1.30 to 1.55 at USD 1.09 an hour; with S2's
three arms, 4 h 45 min to 5 h 40 min. **Before reading any number:** the card's Run settings line names
`DX_S3_OWNERS=1` with the other writer options; `v01/adopted.ts` refuses the arm unless every writer's `write-options`
shows `subjectSeveralOwners: 4` with its function installed (and `subjectWide`, `subjectHints`, `generalPrefetch`).

**Predictions** (1 billion records, second half of each 300 s cell, shape S commits, commit latency from send):

| Measure | C (S2's prediction) | D: C plus several owners |
| --- | --- | --- |
| S commits on the per-subject writer | 95 to 100% | the same as C, within 1 point |
| Saves of two or more owners (`owners:<n>` in `saveRoutes`); gateway refusals (`general:<reason>`) | 0; 0 | 0; 0 (only saves over 128 facts, if any, count as `general:over-subject-bound`) |
| Mean serial apply per S commit (about 17 facts) | 0.6 to 1.2 ms | within 10% of C |
| Commit p50 at 50 / 235 / 394 / 620 rows/s | 0.5 to 2 ms below A | within 1 ms of C |
| Commit p99 at 50 / 235 / 394 / 620 rows/s | within 20% of A | within 15% of C |
| Conflicts replayed; stored against offered; expired; read-back | 0 to 0.5%; all; 0; exact | the same |

**Basis:** with the option on, a one-owner save takes exactly the path it takes with it off (the several-owners plan
is asked only after the one-owner plan declines, and only for two or more owners); the SDK's rule gives a one-owner
save the same block. The option adds one stored function at scope open and nothing per save.

**What would show these wrong:**

1. **Any `owners:<n>` count, or any `general:` reason other than `over-subject-bound`, in D's `saveRoutes`.** The tape
   is not what section 1 says, or a one-owner save is being planned as several owners: read the receipts'
   `subjectOwners` and `subjectDeclined`.
2. **D's share on the per-subject writer differs from C's by more than 2 points.** The option changed a one-owner
   save's route.
3. **D's commit p50 more than 1 ms above C's at any load, or p99 more than 20% above.** The option costs something
   per save that the toy did not show.
4. **Any lost or expired save, any read-back mismatch, or the write-options check refuses.** The arm counts for
   nothing until explained.

**To price a two-owner save on the server** (not built): a tape option that makes a stated share of shape S saves
also replace two fields of the subject's profile, with the card's preload, journal and read-back checks extended to
the profile. Until then, section 7 and S2's forecast are the evidence: about 2 ms of serial time saved per such save
at 1 billion.

## 9. Where this meets the whole-subject import builder

The import builder (`exp/DX-IMP2-import-whole-subject`, `TX2_IMPORT_WHOLE_SUBJECT`) makes an import commit hold a
whole subject (a root, its profile and its documents) under a bound on the writer's time. This branch does not touch
the bulk class or the import path. Where the two meet:

1. **No import frame takes the several-owners writer.** An import frame carries a client sequence, a bulk class or an
   import predecessor, and its subject's owners are new: the several-owners plan refuses each of these (`frame`,
   `new-owner`). A whole-subject import of several entities stays on the general writer, under IMP2's bound.
2. **After an import, the subject's live saves can.** Once a subject's task and profile exist, a form save that writes
   both takes the several-owners writer (with the option on).
3. **Code:** both branches edit `storage.clj` `commit!` next to the per-subject plan (IMP2 adds its bound check just
   before it; this branch adds the several-owners plan just after it), `main.clj`'s write-options readback, and
   `stack/up.sh`'s option list. The edits are side by side, not overlapping, and both keep new namespaces out of the
   load order before `subject_save.clj` (IMP2 resolves its namespace at call time; this branch requires its own
   last). Whoever merges second re-runs `s3/idents.sh` on the merged head.
4. **Bounds:** IMP2 bounds an import commit by the writer's estimated time (40,000 µs, about 200 facts); this branch
   bounds a several-owners save by the wide writer's 128 facts and 4 owners. A save over either goes to the general
   writer (live) or is refused whole (import).

## 10. Not verified

- **Nothing here ran on a server.** Every 1 billion figure is a forecast from the fits named in `v01/SAVE-SHAPE.md`
  4.3 and S2 section 5; arm D has not run.
- **How often the product's saves write two to four owners.** The production-shaped tape has none (section 1); the
  share of form pages that map fields to the subject's profile needs a production query, and none was made. So the
  share of real saves this moves is unknown; on the tape it is 0.
- **A two-owner save on the server.** Arm D cannot price it (the tape has none); section 7's toy counts are the only
  measurement.
- **Storage reads inside apply at 1 billion.** The toy's cold reads come from an emptied 32 MiB cache after a restart;
  they show the shape (per owner), not the server's numbers.
- **Protected values in a several-owners save:** a save carrying sealed protected values (envelopes) is refused to the
  general writer (`protected-values-or-frame`); removal on request of one owner was gated on an unsealed protected
  scope only.
- **The covering owner head with several owners:** refused by design; not combined.
- **The card's and `stack/up.sh`'s new lines** were checked by `bash -n`, the card's unit tests and the type check;
  the card's launcher refuses to run outside a Linux bare-metal host, so arm D's plumbing has not run end to end.

## Files

Gateway: `packages/datomic/gateway/src/triplex/gateway/subject_owners.clj` (new), `storage.clj` (plan selection,
hints, receipt check, receipt keys), `main.clj` (install, write-options). SDK: `packages/datomic/src/DatomicStorageAdapter.ts`
(`severalOwners`, `orderedSaveShape`, `SUBJECT_SAVE_OWNERS`), `index.ts`, `test/ordered-saves.test.ts`. Lab: `s3/`
(`gate.ts`, `run-gates.sh`, `mem-gateways.sh`, `owners_gate.clj`, `clj-gates.sh`, `sql-run.sh`, `sql.sh`,
`idents.clj`, `idents.sh`, `compare-idents.py`, `bytes.ts`, `bytes.sh`, `compare-bytes.py`, `tape-owners.ts`),
`prep1/manage.py`, `prep1/stack.sh`, `prep1/production-gate.ts`, `stack/up.sh`, `scale1/decision/writes.ts`,
`v01/production-card.ts`, `v01/adopted.ts`, `v01/production-card.test.ts`. The older files in `s3/` (`README.md`,
`run.py` and the rest) belong to an earlier, unrelated configuration spike of the same name.

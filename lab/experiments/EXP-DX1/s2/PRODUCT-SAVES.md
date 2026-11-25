# The product's save on the fast writer (DX-S2)

North star P2 and the owner's decision of 2026-11-24: one commit per subject's save. [The save's
contract](../v01/SAVE-SHAPE.md) found that the product's own path (`TriplesLive` over the Datomic adapter) never
reached the per-subject writer; only the lab's producers did. This page says why, what is built so a product save of
one subject reaches it, the save-size rule, the several-owners answer, every gate with its counts, and the server pair.
Mac figures are toy-size; times are diagnostic. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) ·
[Targets](../../../TARGETS.md) · [Readiness](../v01/READINESS.md) · [Wide saves](../w2/WIDE-SAVES.md)

**In brief.**

- **Yes, with two default-off options on, a product save of one subject now takes the per-subject writer.** The SDK
  option `orderedSaves` and the gateway's `TX2_SUBJECT_WIDE=1` together: **6 of the product's 11 save shapes qualify**
  (the 20-row form page, in both forms the product's clients write it; the status change; the check result; the
  writeback to the subject's other form; the past-dated correction). With the SDK option alone (wide writer off),
  2 of 11 (the one-to-three-field replacements). With the SDK option off, **0 of 11, even with the wide writer on**.
- **Why the product missed it:** not the random IDs. Every product save named its own new journal as an entity it
  touched, and a save that skipped the snapshot sent no source cut. The per-subject writer refuses both. With the wide
  writer on, the product's "from now on" form (the old value kept true until now, then the new value) was refused too:
  it asserts two rows of one field.
- **The save-size rule** (`saveSizeRule`, default off): over 1,000 facts refused before sending as `SaveTooLarge`;
  over the 4 MiB request cap refused as `SaveRequestTooLarge` instead of `InvalidValue`; 129 to 1,000 facts sent to
  the general writer and counted with the reason.
- **Several owners:** yes, a real save touches two: a form page that maps fields to the subject's profile writes the
  task and the profile. It stays on the general writer. That costs about 2 ms of serial time per such save at
  1 billion records; the exact extension is designed (section 5) and not built.
- **Gates:** with the options off the SDK's requests are byte-identical to the previous build (40 requests). Against a
  control database written through the general writer, every receipt (96) and every read route (33,918 answers) is
  equal, wide on and off. The production exactness gate and the aged-toy gate pass with every save sent through the
  product's path.
- **Server pair:** three card arms (product path off; on; on with the wide writer and both hint options), published
  with predictions in section 8. None has run.

## 1. Why a product save of one subject did not reach the per-subject writer

Found on the toy by sending the product's saves (`s2/probe.ts`) to a gateway running the server's per-subject writer
settings and reading which writer acknowledged each one (`subjectSave` on the receipt).

| What the SDK sent | The gateway's rule it broke (`subject_save.clj` `plan-with-erasure`) | Effect |
| --- | --- | --- |
| `entities` named the subject **and the save's own new journal** (the adapter adds every staged row's entity, journal rows included) | `(= #{subject} (set entities))` | Every product save went to the general writer, whatever its size. |
| `sourceK: null` when the SDK skipped the snapshot (every predecessor it retracts was in its cache, or it retracts nothing) | `(integer? source)` | Every such save went to the general writer. |
| A new identity per assertion (the runtime's ULIDs) | None: the writer accepts them and checks each ID in history (one index seek per ID at the serial point) | Cost, not refusal. |
| Two rows of one field: the old value kept true until now as a bounded row, and the new value (the console's `save_facts` and correction, the playground's `replace`) | With `TX2_SUBJECT_WIDE=1`: `(= (count business) (count after))` and `(count before)`, distinct fields on each side | Every "from now on" save and every correction went to the general writer. |

A save without a command ID also never qualifies (`(= 1 (count (:command-ids p)))`); the product's saves carry one.
Scopes need strict record clocks with server record time, or the SDK sends a client sequence (`clientId`), which the
writer refuses; the product's lean scopes are created that way.

## 2. What is built (every option default off)

| Part | With it on | Off |
| --- | --- | --- |
| **Core:** `StorageAdapter.saveIdentity` (optional), asked by `TriplesLive.transact` once per attempt, before any ID is used | The adapter may return one journal ID and a source of assertion IDs for the whole save. A replay after a refusal asks again, so it gets a new block; a refused attempt's block was never written. | No adapter has it; `TriplesLive` calls the runtime's `nextTxId` and `nextTripleId` exactly as before. |
| **SDK:** `orderedSaves` (`makeDatomicRuntime` / adapter option, or `TRIPLEX_DATOMIC_ORDERED_SAVES=1`) | A save that passes `orderedSaveShape` (section 3) gets one ordered block: a one-byte block (256 IDs) when its IDs fit, else a wide block (4,096). Such a save names only the entities it reads and writes (not its own new journal), and states its source cut when it skipped the snapshot. Every save's reason is counted in `client.saveRoutes` and put on the commit sample (`saveRoute`). | Requests byte-identical (gate a). |
| **SDK:** `saveSizeRule` (`TRIPLEX_DATOMIC_SAVE_SIZE_RULE=1`) | Section 6. `SaveTooLarge`, `SaveRequestTooLarge`, `SAVE_LIMIT_FACTS` (1,000), `SUBJECT_SAVE_FACTS` (128) exported. `DatomicClient.transactRequestBytes` measures a body with the same encoder and sends nothing. | The 4 MiB cap refuses as `InvalidValue` "Request too large", as before. |
| **Gateway:** the wide rule (`TX2_SUBJECT_WIDE=1` only) | Plain fields on each side, repeats allowed: each predecessor is still read in the plan and covered by the revision compare-and-set; nothing in the plan's rendering or the native function is keyed by field. | Unchanged (the narrow rule, one to three replacements, is untouched with the option on or off). |
| **Lab:** `DX_S2_PRODUCT=0|1` | The production gate, the aged gate, the REAL2 runner's `phase()` and the card send every save through `TriplesLive` with `orderedSaves` off (0) or on (1), the same facts and retirements and the same command ID as the lab framing. The card records the setting with the writer options. | The lab producers, as before. |

The native function, the schema and the storage format are unchanged. Datomic is not modified.

## 3. What qualifies, exactly

A save takes the per-subject writer only if both lists hold.

**The SDK gives it an ordered block** (`orderedSaveShape`, decided from the operations before staging):

1. it carries a command ID and no constraints (`enforce`, which reads by type and makes the save scope-wide);
2. its operations are assertions and retractions by ID (no retraction by pattern);
3. every assertion is on one entity, not a system entity (`_…`), not a system attribute (`:_…`), not a reference;
4. at most 128 facts asserted and 128 values retracted;
5. it is the first logical save of its physical commit, on a lean scope whose record clocks the server assigns.

**The gateway admits it** (`plan-with-erasure`, with the server's per-subject settings):

1. the subject exists and every retracted value is its own current plain field;
2. one journal, one command claim, no client sequence, span 1, a regular frame (not scope-wide, no save ledger,
   packed journal or bulk class, not an ordered import frame);
3. the save's source cut is at or after the subject's revision, and the scope's flags are the server writer's;
4. narrow (wide off): one to three facts, each replacing a current value of the same field; wide: up to 128 facts and
   128 retirements, any mix of replacements, first writes, retirements and repeated fields.

A save the SDK gives a block but the gateway refuses (a new subject, a retraction of another entity's fact, a read that
finds nothing) takes the general writer with its block. That is exact: the general writer takes any IDs, and the
contiguous block lets it probe the history once for all of them.

### The product's save shapes on the toy (`s2/gate.ts`, `v01/SAVE-SHAPE.md` section 2)

| Product save | Facts asserted / retired | Entities | Wide on | Wide off |
| --- | ---: | ---: | --- | --- |
| Form page submit, 20 rows (answers, progress, status, three audit fields), plain replacement | 25 / 25 | 1 | per-subject | general |
| The same, kept true until now (the console's and the playground's form) | 50 / 25 | 1 | per-subject | general |
| The same with two fields mapped to the subject's profile | 27 / 52 | 2 | general | general |
| Status change (status, completion time, file name, event) | 4 / 1 | 1 | per-subject | general |
| Status change with the file as a reference | 2 / 1 | 1 | general (reference) | general |
| Check result (check field and progress, both replaced) | 2 / 2 | 1 | per-subject | per-subject |
| Writeback to the subject's other form (one field) | 1 / 1 | 1 | per-subject | per-subject |
| Import row (a new subject's first save, 12 facts) | 12 / 0 | 1 | general (no subject yet) | general |
| Correction of a past value (one field) | 2 / 1 | 1 | per-subject | general |
| Bulk action (a batch and five items, new entities) | 6 / 0 | 6 | general | general |
| Progress copied between subjects (new task, reference to the source) | 2 / 0 | 1 | general (reference) | general |
| **Qualifying** | | | **6 of 11** | **2 of 11** |

With `orderedSaves` off: 0 of 11 on either writer setting (the production gate below shows the same on the tape).

### The matrix (`s2/gate.ts`; one subject per case, seeded first)

| Facts | New values | Replacing | Retirements | Past-dated correction (two rows per field) |
| ---: | --- | --- | --- | --- |
| 1 | per-subject (wide); general (narrow) | per-subject, both | per-subject (wide) | per-subject (wide) |
| 3 | per-subject (wide) | per-subject, both | per-subject (wide) | per-subject (wide) |
| 20 | per-subject (wide) | per-subject (wide) | per-subject (wide) | per-subject (wide) |
| 64 | per-subject (wide) | per-subject (wide; a wide block) | per-subject (wide) | per-subject (wide; wide block) |
| 128 | per-subject (wide; wide block) | per-subject (wide; wide block) | per-subject (wide; wide block) | general: 256 rows asserted, over the bound |
| 129 | general, reason `over-subject-bound` | general | general | general |
| 500 | general, reason `over-subject-bound` | general | general | general |

Two subjects in one save (3, 20 and 128 facts): general, `several-entities`. A save with a scope-wide constraint (3 and
20 facts): general, `constraints`. "Both" means with the wide writer on and off; otherwise per-subject needs it on.

## 4. Conflicts, replays, lost replies

- **Two saves of one subject at once** (gate c): the first to reach the serial point commits. The second was planned
  against a source cut older than the subject's new revision, so the per-subject writer sends it to the general
  writer, which refuses it whole (`CasConflict`). The SDK replays it with the same command ID at a new snapshot and a
  new block. This holds for saves of different fields too, as the save's contract says (item 7).
- **Change in behaviour, with the option on only:** a save that skipped the snapshot now states its source cut (the
  newest position this client has seen). Before, such a save was checked only against the values it retracts, so two
  saves of different fields of one subject could both commit at once. Now the second is replayed. A client whose view
  is older than another client's save of the same subject pays one replay.
- **Lost reply** (gate d): the SDK resolves the receipt by its operation ID and sends nothing again; a resend of the
  command is refused `CommandAlreadyCommitted` naming the original transaction, and the lookup by command returns the
  original receipt.
- **Identities:** a block is minted per attempt from the process's ordered-token sequence (`orderedSaveIdentity.ts`),
  never reused; a refused attempt's IDs were checked absent from history (gate c).

## 5. Several owners in one subject's save

**Does a real save touch several owners?** Yes. From the product's save shapes (`v01/SAVE-SHAPE.md` section 2):

1. a form page with fields mapped to the subject's profile (`employee.*`) writes the task and the profile;
2. a form page with employer fields writes the employer too (shared by every subject of that employer);
3. copying progress between two subjects can change both.

The page's recommendation stands for 2 and 3 (the employer's fields as their own commit after the save; a progress
copy as one general-writer commit). Case 1 is the subject's own data and must stay one atomic save.

**It stays on the general writer.** The smallest exact extension is known: the plan accepts up to four existing
owners; each owner's revision must be at or before the source cut, each retracted value must be that owner's current
plain field, and the native function compare-and-sets every owner's revision (one per owner) and checks each numeric
owner's public ID. Nothing else changes. It is not built because the native function is the one every per-subject
save runs: changing it installs a new function ident on every scope, and every gate that certified the writer (W1's
covering head, W2's wide gate, W4's hints, removal on request, the recovery and production gates) must run again. The
measured cost of not building it is small:

| At 1 billion records (fits named in `v01/SAVE-SHAPE.md` 4.3) | Task alone (25 facts), wide writer | Task and profile (27 facts), general writer |
| --- | ---: | ---: |
| Serial apply | 0.9 to 1.4 ms (toy ratio 2.2 to 3.5 below general) | 3.2 ms (0.12 ms per fact) |
| Warm commit end to end | about 8.5 to 9.5 ms | 10.8 ms (5.39 + 0.201 × 27) |
| Serial thread at the 394 load (23.06 saves/s) if every save were like this | 2.0 to 3.1% | 7.5% |

So each two-owner save costs about 2 ms of serial time (1.9 to 2.4 ms) and 0.5 to 2 ms of its own commit p50; commit p99 is set by
storage and is unchanged within noise. Build the extension when two-owner saves are a large share of saves and the
serial point is busy (above about 30%). How often a page maps profile fields needs a production query; none was made.

## 6. The save-size rule (`saveSizeRule`)

| Save | What happens | Why this limit |
| --- | --- | --- |
| Up to 128 facts asserted and 128 values retired | Sent; the per-subject writer can take it (with the wide writer on) | The wide writer's bound: every production-shaped save fits (largest about 120 facts), and the serial apply stays a few milliseconds |
| 129 to 1,000 facts | Sent to the general writer, counted as `general:over-subject-bound` in `client.saveRoutes` and on the commit sample | A 1,000-fact save holds the single serial point for about 120 ms at 1 billion records (0.12 ms per fact), and every other save in the database waits behind it; no product action found makes one |
| Over 1,000 facts | Refused before sending: `SaveTooLarge { facts, bytes, limitFacts: 1000 }` | As above; the measured bytes name the request it would have sent |
| Over 4,194,304 bytes of request (about 1,728 replacing facts of 57 characters, or 1,266 of 500) | Refused before sending: `SaveRequestTooLarge { facts, bytes, limitBytes }` instead of `InvalidValue` | The SDK's and the gateway's shared body cap |

`facts` is the larger of the facts asserted and the values retired (a replacement counts once). **A client above the
limit** sends the data through the import class (`DatomicClient.transactBulkFrames`, write class `import`), one frame
per whole subject, and does not split a save into several live commits: a reader between the parts would see half a
save, and a conflict on a later part would leave the earlier parts committed (`v01/SAVE-SHAPE.md` 4.4).

## 7. Gates (Mac, toy size; counts are results, times diagnostic)

| Gate | What ran | Result |
| --- | --- | --- |
| **(a) Byte-identical requests, options off** (`s2/bytes.ts`, `s2/compare-bytes.py`) | One product workload (seed, replacements of one and three fields, first write, retirement, past-dated correction, two subjects, a constraint, an `EntityState` precondition, no command ID, a reference, 140 facts; every read route) through a recording proxy, deterministic runtime, against a fresh gateway, on the build before this branch (`23b7df344`) and on this branch | **40 requests, 212,809 bytes, identical.** 35 byte for byte as recorded; 5 carry a snapshot handle the gateway issues at random, masked by order of first use |
| **(b) The matrix and the product's shapes against a control** (`s2/gate.ts`): every save through `TriplesLive` with `orderedSaves` and `saveSizeRule` on, to a memory gateway with the server's per-subject settings; every committed request then sent unchanged to a gateway with the per-subject writer off | Wide writer on, and off | Wide on: 96 committed requests, **96 receipts equal** (position, assigned clock, datoms; the control never used the per-subject writer). **Every read route equal:** current reads of 54 subjects at two valid times (108), history (54), pinned reads before and at every commit at three valid times (576), reads by assertion ID current and full history (16,440 + 16,440), subject pulls (54), the whole feed with every change (96), the lookup of every command (96), each subject's journal (54). Wide off: the same counts, all equal |
| **(c) Two saves of one subject at once** | Two replacements of different fields, sent together | 3 attempts, 1 refused `CasConflict`, 1 replay, 2 committed (both per-subject); the refused attempt's IDs absent from history; its replay on a new block; both new values current |
| **(d) Lost reply** | The reply dropped after the gateway committed | 1 request sent; the receipt (position 95) found by operation; the resend refused `CommandAlreadyCommitted` naming the original transaction; the lookup by command returns it; the feed 95 entries before and after |
| **Save-size rule** | 1,001 facts; 900 facts of 5,000 characters; the same 900 on a store without the rule | `SaveTooLarge` facts 1,001, bytes 1,227,103, limit 1,000, nothing sent. `SaveRequestTooLarge` facts 900, bytes 10,002,679, limit 4,194,304. Without the rule: `WriteError` caused by `InvalidValue` "Request too large", as before |
| **(e) Production exactness gate, every save through the product's path** (`DX_CHK1_HOLDER=DX-S2 DX_W2_WIDE=1 DX_S2_PRODUCT=1 prep1/manage.py OUT production 10 1 1 0 1`) | PostgreSQL storage, real transactor, the server's per-subject settings and the wide writer | Pass: **840 R and 88 S commits, all on the per-subject writer with ordered IDs**; the two 130-fact saves on the general writer (runtime IDs, over the bound); 0 expired; 2,836 fields read back exactly; every journal checked against the request the SDK sent |
| The same with `DX_S2_PRODUCT=0` (product path, option off) | | Pass: 840 R, 88 S and the 2 wide commits **all on the general writer, 0 per-subject**; 2,836 fields exact |
| **(e) Aged-toy gate, every tape save through the product's path** (`DX_S2_PRODUCT=1 DX_S1_WIDE=1 real2/aged-gate.sh OUT`) | AGE1's loader-aged toy | Pass, the same figures as every earlier run: 120 aged rows admitted, a tampered aged row refused, 101 writes over aged rows, 1,927 fields read back, final cut 1,289. **R 840 of 840 and S 88 of 88 on the per-subject writer, ordered** |
| **(f) Counted work of a 20-field form save** (inside the production gate, 12 subjects, two saves each) | Product path, option off and on, wide writer on | See the table below |
| **(g) The console's tools with `orderedSaves` on, on a second toy** (`TRIPLEX_DATOMIC_ORDERED_SAVES=1`, the toy's writer started with the per-subject writer, ordered IDs, numeric owner and the wide writer; `DEMO_TOY_NAME=s2`, ports 18781 / 18785 / 28781; `demo/toy/gates.sh`) | The console server, the MCP tools and the scripted proof, all through `TriplesLive` | **Pass:** g12; config 16 of 16; entities 19 of 19; query 24 of 24; journal 7 of 7; derive 4 of 4; catalogue 70 of 70; **proof 37 of 37**. Of the 60 commits the gates made, 19 carried an SDK block and 41 the runtime's IDs (configuration, releases, several entities). The same write gateway, probed with product saves on a new scope, put every replacement on the per-subject writer with ordered IDs. The owner's console on 28580 was not touched (it answered throughout) |
| W2's wide gate and the mixed-identity suite with the repeated-field rule (`s1/suites.sh`) | PostgreSQL, real transactor | Mixed-identity, collision and conflict suite: 6 tests, 235 assertions, pass with the wide writer off, on, and on with both hints. W2's wide gate: 4 tests, 221 assertions, pass (on; on with hints) |
| **Toy card, every save through the product's path** (`DX_S2_PRODUCT=1 DX_V01_TAPE=production-S-noburst v01/mac.ts --fixture … per-person-ordered rolling6`: clean checkout at `ee00c244f`, package build, managed image, the rolling 6 arm and the barrier 6 control) | The toy's writer runs the narrow per-subject writer (the toy stack does not take the wide option) | Pass, both arms: every save of every cell sent through `TriplesLive` (224 saves over both arms, all marked product), every one on an ordered block from the SDK; the 28 saves of more than three facts (14 per arm) on the general writer, the other 196 per-subject; 0 expired; the card's identity, journal-digest and writer-rule checks held; production read-back exact (171 fields of 12 subjects) |
| Unit tests | SDK (`packages/datomic`, unit, with `test/ordered-saves.test.ts`); core; card tests `v01/*.test.ts` | SDK 461 passed, 53 skipped (the merged head had 458 and 53); core 863 of 863; card 41 of 41 |

**(f) Counted work, one 20-field form save (toy; storage reads and datoms are counts, times diagnostic):**

| Product path | Writer (24 saves) | Ordered IDs | Storage reads inside apply | Datoms | PostgreSQL WAL bytes, median first / second | Serial apply, median first / second (diagnostic) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `orderedSaves` off | general 24 | 0 | 0 | 99 | 17,320 / 19,016 | 1.58 / 2.35 ms |
| `orderedSaves` on | per-subject 24 | 24 | 0 | 99 | 17,088 / 19,152 | 0.76 / 1.44 ms |

Datoms (4 × 20 + 19) and WAL bytes are the same: both writers write the same records. Storage reads inside apply do not
show at toy size (the whole toy fits in a few segments); every apply touched the same cached index segments (EAVT 22,
AEVT 43, AVET 9, directory 73). The server figures in `v01/SAVE-SHAPE.md` 4.2 and 4.3 are the ones to use for reads.

## 8. Server pair (published before any run; no machine is rented)

The decision it serves: with every save sent the way the product sends it, does the per-subject writer (narrow, then
wide with hints) take the saves, and what does it change at each load step? The control is the product path with the
option off, not the lab producer, because the lab producer already sends ordered blocks.

Build and `part`/`arm` exactly as [READINESS](../v01/READINESS.md) "Next server session" (`CARD=(1B
production-S-noburst server-32 300 tuned)`), at the head that carries this branch:

```bash
EXTRA="DX_S2_PRODUCT=0"                                                           arm /var/tmp/s2-card-product-off "${CARD[@]}"  # A
EXTRA="DX_S2_PRODUCT=1"                                                           arm /var/tmp/s2-card-product-on  "${CARD[@]}"  # B
EXTRA="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1" arm /var/tmp/s2-card-product-wide "${CARD[@]}"  # C
```

Each arm is its own campaign (parts 1 and 2), 71 to 85 minutes; all three 3 h 35 min to 4 h 15 min, about USD 4 to 5.
Before reading any number: the card's Run settings line names `DX_S2_PRODUCT` and the writer options; the writer's
`write-options` shows them (C: `subjectWide`, `subjectHints`, `generalPrefetch`).

**Predictions** (1 billion records, second half of each 300 s cell, shape S commits, commit latency from send):

| Measure | A: product path, option off | B: option on | C: option on, wide writer and hints |
| --- | --- | --- | --- |
| S commits on the per-subject writer | 0% | 25 to 40% (the one-to-three-field replacements) | 95 to 100% |
| Mean serial apply per S commit (about 17 facts) | 1.8 to 2.8 ms | 1.5 to 2.5 ms | 0.6 to 1.2 ms |
| Commit p50 at 50 / 235 / 394 / 620 rows/s | 8 to 12 / 7 to 11 / 7 to 11 / 8 to 12 ms | within 1 ms of A | 0.5 to 2 ms below A |
| Commit p99 at 50 / 235 / 394 / 620 rows/s | 35 to 60 / 32 to 55 / 32 to 55 / 35 to 60 ms | within 15% of A | within 20% of A |
| Conflicts replayed by the SDK | 0 to 0.5% | 0 to 0.5% | 0 to 0.5% |
| Stored against offered; expired; read-back | all; 0; exact | the same | the same |

**Basis:** CARD2's forecast for this card with the lab producer (second-half p50 7 to 10 ms at 50/s and 7 to 9 at 235
to 620, p99 30 to 50 ms) plus what the product's path adds: a subject's first save in the run reads its predecessors
through one extra request to the gateway (1 to 4 ms at 1 billion, cold), and the SDK stages and encodes the save on the
client (under 1 ms for 17 facts). The production tape's saves return to a subject within 5 minutes 82% of the time, so
most saves skip that request. A sends every commit to the general writer (0.12 ms per fact of serial apply); B moves
the replacements of one to three facts; C moves nearly all (W2's and S1's forecasts).

**What would show these wrong:**

1. **A puts any commit on the per-subject writer.** The diagnosis of section 1 is wrong.
2. **C puts under 95% of S commits on the per-subject writer, or B outside 20 to 45%.** Production saves break a rule
   the toy's did not; read `saveRoutes` and the gateway's refusal reasons first.
3. **A's p50 is more than 3 ms above step 2's lab-producer card at any load.** The product path's own cost (the
   predecessor request, client staging) is larger than forecast; read the client trace spans.
4. **Conflicts replayed above 1% in B or C.** Stating the source cut costs more replays than forecast.
5. **C's mean serial apply is not at least 1.5 times below A's for commits of 60 facts or more.** W2's rule: remove the
   wide option.
6. **Any lost or expired save, or any read-back mismatch.** The arm counts for nothing until explained.

**How this changes the eleven-step session list:** step 3 ("S1's Wide arm") compared the wide writer against step 2,
both with the lab producer, which already sends ordered blocks, so it measured the writer on saves the product does not
send. Replace step 3 with arms B and C above (C carries the hints of step 8, so step 8 folds into it), and add arm A
if the session has 75 more minutes. Step 2 stays the lab-producer card, so the day's card stays comparable with
2026-11-23.

## 9. Not verified

- **Nothing here ran on a server.** Every 1 billion figure is a forecast from the fits named.
- **The card's product path ran only on the Mac toy card**, with the narrow writer (the toy stack has no wide option);
  the card's launcher refuses to run outside a Linux bare-metal host. Card arm C's wide writer with product saves ran
  only in the production and aged gates (REAL2's `phase()`), not in the card.
- **The product path's extra cost** (the predecessor request on a subject's first save, client staging) is forecast,
  not measured: Mac times are diagnostic.
- **Which writer took the console's own saves** on its loader-built toy database: the console does not expose receipts,
  so gate g shows that its tools and proof pass with the option on and which commits carried a block, not the writer
  of each.
- **Storage reads inside apply** at toy size say nothing about 1 billion.
- **How often a product page maps profile or employer fields** (the share of two-owner saves) needs a production query;
  none was made.
- **The two-owner extension** (section 5) is designed, not built.
- **A wide save carrying protected values** (removal on request) was not exercised on the product path, as on W2's.

## Files

Core: `packages/core/src/storage/StorageAdapter.ts` (`saveIdentity`), `store/TriplesLive.ts`. SDK:
`packages/datomic/src/DatomicStorageAdapter.ts` (`orderedSaves`, `saveSizeRule`, `orderedSaveShape`, `SaveTooLarge`,
`SaveRequestTooLarge`), `DatomicClient.ts` (`transactRequestBytes`, `saveRoutes`, `isLean`), `index.ts`,
`TransactionContext.ts`, `test/ordered-saves.test.ts`. Gateway: `subject_save.clj` (the wide rule). Lab: `s2/`
(`product.ts`, `gate.ts`, `bytes.ts`, `compare-bytes.py`, `mem-gateways.sh`, `run-gates.sh`, `probe.ts`),
`prep1/server-produce.ts`, `prep1/production-gate.ts`, `prep1/manage.py`, `prep1/stack.sh`, `real2/aged-gate.*`,
`scale1/decision/writes.ts`, `v01/adopted.ts`, `v01/adopted-card.ts`, `v01/production-card.ts`, `v01/mac.ts`.
Evidence: `DX-S2/` in the lab evidence store.

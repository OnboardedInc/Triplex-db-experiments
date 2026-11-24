# One commit per subject's save

North star P2 (commits) and the owner's decision of 2026-11-24 (`lab/V0.1.md` on `main`): "We should decide on one
commit per subject save. That's what we should do." This page is the contract of a save, what it means for the
product, every place the store and the lab still assumed one commit per row and what was done with each, how a save's
cost grows with its size, the state of the wide per-subject writer, and the server runs that must confirm all of it.
Mac figures are toy-size and diagnostic; forecasts at 1 billion records are derived from the server fits named beside
them. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) ·
[Readiness](READINESS.md) · [Production card](PRODUCTION-CARD.md) · [Wide saves](../w2/WIDE-SAVES.md)

**In brief.**

- **The contract:** one command = one commit = every fact one subject's save changes, all or nothing, with one
  command ID, one receipt and one feed entry. Section 1.
- **The product maps onto it:** a form page, a status change and a check result each become one commit on the
  subject's own entities. Two product actions touch something outside the subject: the employer writeback of a form
  page and copying progress between two subjects. Section 2.
- **Per-row assumptions:** 12 places found. 6 changed on this branch (the card's default tape is now shape S, among
  them). One real bug found on the way: `reach/response` returns a Boolean since W3. Section 3.
- **Size:** a save of 17 facts is forecast at 8.8 ms warm at 1 billion. A save of 1,000 facts is forecast at 206 ms,
  and it holds the serial point for about 120 ms. The SDK sends at most 1,728 replacing facts of 57 characters under
  the 4 MiB cap. A larger save should be refused with a clear answer, not split. Section 4.
- **Wide writer:** merged on this branch, default off. Every gate passes with it off and on, and on with both hint
  options. It buys serial time (about 1.2 ms per 17-fact save at 1 billion), not latency. Section 5.
- **Server runs:** published with predictions in section 6. None has run; no machine is rented.

## 1. The contract of a save

**In ten lines.**

1. A save is one `transact` call carrying every fact one subject's action changes: answers, retirements, progress and status.
2. It is one commit. Every fact is written, or none is.
3. It carries one command ID. A resend with that ID writes nothing: it is refused with `CommandAlreadyCommitted`, which names the original transaction, and `transactionByCommand` returns the original receipt. A resent operation gets `OperationDuplicate`; a lost reply gets `OutcomeUnknown`, and the lookup by command then finds the receipt.
4. It returns one receipt: transaction ID, position and record time.
5. It makes one feed entry. The entry names every entity changed (one `:_tx/changed-entity` row each) and gives each change's attribute, operation, value and valid-time range.
6. Its conflict set is every entity it writes or reads. If any of them changed after the save's source position, the whole save is refused with `CasConflict` and nothing is written.
7. Of two saves of one subject sent together, the first to reach the serial point commits. The second is refused whole. The SDK replays a replay-safe save (re-read, re-validate, re-stage; the same command ID; up to 12 times, 1 to 50 ms apart). Any other client re-reads and resends with the same command ID.
8. Preconditions and constraints are checked once against the whole save: the source cut plus all of the save's operations. A read across subjects makes the save scope-wide, so it commits only if nothing in the database committed since its source.
9. A reader holding the receipt reads its own save at the receipt's position: a pinned read is exact. An unpinned read passes the receipt as "at least" (RD4's option, being merged).
10. A save of one entity of four facts or more takes the general writer today. With `TX2_SUBJECT_WIDE=1`, a save of up to 128 facts on one entity takes the per-subject writer. A save that touches several entities always takes the general writer. Every writer gives the same records and the same receipts.

### 1.1 What "one subject" means on the lean layout

The store has no write-time idea of a subject. Every row carries its `entity_id`, and every entity has its own
revision. The general writer checks, for each entity in the commit (`entities` in the payload: every entity written,
plus every entity the transaction read), that the entity's revision is not newer than the save's source position
(`commit.clj` `operation-code`, the `(when source …)` block). A subject is a read-time idea: a root entity and the
entities its references reach. In the W0 kernel's grammar, a placement owns the documents, decisions and answers whose
IDs start with `<placement>/` (`packages/w0/src/schema.ts` `classify`, `allowedKind`). In the lab's data, a subject is
a root (`pl:`), a profile (`wk:`) and tasks, each a separate entity.

**So a save that touches a placement and its tasks is one commit with several entities in it.** It is atomic across
all of them, because Datomic commits one transaction or nothing, and each entity's revision is checked. It never takes
the per-subject writer, which accepts exactly one entity: `(= #{subject} (set entities))` in `subject_save.clj` `plan`.
That rule is the same with the wide option on. The production-shaped tape's saves each write one entity, the subject's
task, so the tape does not show this cost. A product save that also writes the subject's profile does show it.

The per-subject writer could take a subject's owned entities together. That would need one revision compare-and-set
per entity in the native function, which reads several owners. It is not built. It is the next step if the product's
saves turn out to be mostly multi-entity (section 2).

### 1.2 Two saves of the same subject at once

| | Per-subject writer | General writer |
| --- | --- | --- |
| Check at the serial point | compare-and-set on the owner's revision against the revision the gateway read | every touched entity's revision is not newer than the save's source position |
| The winner | the first transaction the transactor applies | the same |
| What the loser gets | 409 `CasConflict`; nothing written; command ID not claimed | the same |
| What the SDK does (`DatomicStorageAdapter.withTransaction`) | a replay-safe transaction is replayed at a new snapshot: its callback runs again, so it re-reads current values, re-checks preconditions and constraints, and re-stages; at most 12 retries (`maxRetries`), sleeping `min(50, 2 × retry + 1)` ms between them | the same |
| What a client that is not replay-safe does | re-reads the subject at a newer cut, rebuilds the save, resends with the same command ID and a new operation ID | the same |

The lab's producers also keep one save per subject in flight (the `busy` and `owned` sets in `prep1/server-produce.ts`
and `scale1/decision/writes.ts`). A product client should do the same: a second save of a subject should wait for the
first save's receipt. Otherwise the two saves conflict at the serial point and one of them pays a replay.

Which product meaning should the loser get? For a subject's own form answers, replaying is right: the second save is
applied on top of the first, and for a field both saves changed, the later save wins. For an administrator's edit made
against what was on screen, the save should carry an `EntityState` precondition, as the console and the playground do.
Then the loser gets `TransactionConflictError` and is shown the change.

### 1.3 Validation and constraints see the whole save

`TriplesLive.transact` (`packages/core/src/store/TriplesLive.ts`) runs inside one transaction scope:

1. It checks preconditions (`TripleLive` and `EntityState`).
2. It claims the command ID.
3. It evaluates `meta.enforce.constraints` against the facts at the save's source cut plus all of its operations (`Constraint.newlyViolated`).
4. It stages every operation.

Every entity the callback reads joins the commit's conflict set (`state.entities`). A read not keyed by entity, such
as a query by type, makes the commit scope-wide (`state.scopeWide`). The general writer then refuses the commit if the
database's head moved after the source (`(when (and scope-wide (not= h source)) (conflict))`).

**Cost of a scope-wide save:** all accounts share one database, so a scope-wide save conflicts with every other commit
in the database. At 23 commits per second, its chance of committing on the first try is low whenever its read takes
more than a few tens of milliseconds. Form saves must not read across subjects inside their transaction. A uniqueness
rule across subjects needs the attribute index (the questions-across-subjects work) to narrow this.

### 1.4 Reading your own save

The receipt's position is the read basis. `reader.rows(db, { entityIds, basis: { recordedPosition: receipt.position } })`
returns exactly the state that includes the save: P2's "the pull at the returned transaction sees the commit". The
console's `save_facts` reads back this way.

An unpinned read sent to the read gateway straight after the reply can be answered from before the save: 9 times in
150 on the toy (RD4). RD4's "at least" read fixes this: the client passes the receipt (`ReadAtLeast.fromReceipt`) and
the gateway waits for its peer to reach that position. It is default off and being merged.

## 2. What the product writes today, and what its one commit would hold

Read from the product's code (read-only). Names below are descriptions, not the product's table names.

| Product action | What it writes today | Its one commit in the store | Entities | Writer |
| --- | --- | --- | --- | --- |
| **Form page submit** (the candidate or an employer submits one page) | One database transaction under the task's lock: a page-submission record with its audit (IP, user agent, submitter); the page's earlier answers archived and every submitted answer written, one row per field; fields mapped to the subject's profile (`employee.*` paths) copied onto the subject; fields mapped to the employer (`employer.*` paths) copied onto the employer; the task's progress and status recomputed | One commit: the answers as facts of the task (one retirement per changed answer), the progress and status facts, the audit facts, and the profile facts when the page maps any | The task alone, or the task and the subject's profile | Task alone: per-subject with wide on (up to 128 facts), else general. Task and profile: general |
| **Status change** (a task completed out of band, or expired) | One transaction: the task's status, a PDF file attached to the task, a task event | One commit: status, completion time, the file reference and the event as facts of the task | One, or two if the file is its own entity | Per-subject (one to three facts, or wide) or general |
| **Check result** (a background-check, identity or work-eligibility provider's webhook) | The same path as a page save with the integration as source: the check field's value merged with the provider's earlier data, and progress | One commit: the check field's new value (one retirement) and progress | The task | Per-subject (one to three facts) |
| **Work-eligibility writeback** to a second form of the same subject | A data field written onto the subject's other task, keeping its later signatures | One commit on the other task | One | Per-subject |
| **Bulk action** (assign a form to many subjects) | One transaction: the batch and one pending item per subject. Then a background job creates each subject's task, each in its own transaction | One commit for the batch (its items refer to subjects but change none), then one commit per subject's new task | One, then one per subject | General (new entities) |
| **Progress copied from one subject to another** (merging duplicate records) | One transaction: the target's new tasks with the source's progress, and a record naming both subjects | One commit on the target, with references to the source | The target's entities | General |

**Does anything need several subjects in one atomic change?**

1. **The employer writeback of a form page.** The employer record is shared by every subject placed with that
   employer. Today it is updated in the same transaction as the subject's answers.
2. **Copying progress between two subjects.** It changes only the target, unless the source is also changed (for
   example, marked as merged). In that case, two subjects change in one transaction.

**What the store offers:** the general writer commits any set of entities in one commit, all or nothing. Each entity's
revision is checked against the save's source, and one conflict refuses the whole commit.

**What it costs:**

- Such a commit never takes the per-subject writer.
- A shared entity in many saves makes those saves conflict with each other. Two subjects of one employer saving
  employer fields at once conflict, and the loser replays.
- At the rates measured (23 commits per second), conflicts on one employer would be rare. They would matter during a
  bulk onboarding of one employer's staff.

**Recommendation:**

- Write the employer fields as their own commit on the employer, after the subject's save. They are facts about the
  employer, and nothing in the subject's save depends on them. Keep the subject's save single-subject.
- Write a progress copy as one commit. It is rare and small, and its atomicity matters: a reader must never see the
  target half copied.

Not verified: how often product pages carry employer fields. That needs a production query, and none was made.

## 3. Every place that assumed or encouraged one commit per row

| # | Where | What it assumed | Done |
| --- | --- | --- | --- |
| 1 | The scorecard's save loads (`v01/run.ts`, `v01/mac.ts`, `v01/production-card.ts`) | Saturday's tape was the default, one or two fields per commit | **Changed:** a new card runs `production-S` unless another tape is named (`defaultCardTape`, `newRunTape`). The realistic card keeps its own tape. A recorded campaign without a tape name still reads as Saturday's, so old cards re-assemble unchanged. When the card branch's `production-S-noburst` is on the one branch, it should become the default (one line). |
| 2 | The card's production commit identity (`scale1/decision/writes.ts`) and the production gate's producer (`prep1/server-produce.ts`) | A commit over 256 assertions took the general identity | **Changed:** with `TX2_SUBJECT_WIDE=1`, it takes a wide ordered block (4,096 assertions). Off, nothing changes. |
| 3 | The card stack (`stack/up.sh`) | Did not forward `TX2_SUBJECT_WIDE` | **Changed:** forwarded to the writer gateways when set, and refused without the per-subject writer. |
| 4 | The card runner (`v01/run.ts`) | Passed only a fixed list of environment names to the arm, so `TX2_GENERAL_PREFETCH`, `TX2_SUBJECT_HINTS` and `TX2_SUBJECT_WIDE` set on the command line were dropped. W3's and W4's published card commands would have run their "on" arms with the option off. | **Changed:** the three pass through. The campaign records the ones set. `adopted.ts` asserts the writer's readback matches. The card names them under Run settings. |
| 5 | The per-subject writer (`subject_save.clj` `plan`) | Takes 1 to 3 facts that each replace a value: the shape of one row | **Merged:** W2's `TX2_SUBJECT_WIDE` (up to 128 facts, first writes and retirements), default off. Section 5. |
| 6 | The SDK's identities on the product path (`TriplesLive` and `DatomicStorageAdapter`) | Every assertion gets its own ULID. Only the lab's producers mint one ordered block per save (`orderedSaveIdentity`). The general writer gets the client's `historyIdentityBounds` range probe, but the per-subject writer recognises only ordered blocks and otherwise checks each ID in history. | **Not changed.** Identity allocation lives in core and in every adapter. The fix is designed: on a lean scope, the Datomic adapter takes one wide ordered block per transaction and numbers the transaction's assertions in it, behind an option. Without it, the product's wide saves pay one historical index seek per assertion at the serial point, which the lab's tape does not. |
| 7 | The core write API (`Triples.assert`, `assertBatch`, `retract`, `retractByPattern`) | Each call is its own commit, so a product that calls `assert` per field gets one commit per row | **Documented** in the interface (`packages/core/src/store/Triples.ts`): a subject's save is one `transact` call. The API stays, because it is a general store's API. |
| 8 | The console (`examples/console` change sheet; `examples/demo-mcp` `save_facts`) | The change sheet edits one attribute per submit. `save_facts` takes 1 to 20 attributes of one entity in one commit, guarded by the entity's state | **Not changed.** Each submit is already one commit with all of its retirements and assertions. The console is a fact inspector, and one field per change is its interaction. Its gates (`demo/toy/gates.sh`) serve on port 28580, which the owner's console uses, so a change could not be gated today. If the console gains a form view, it should send the form's fields in one `save_facts` call, and the 20-attribute bound should rise to 128. |
| 9 | Import (`load1` frames; the gateway's bulk class, `write_policy.clj`) | A bulk frame holds at most 96 new rows and 64 KiB (`TX2_BULK_ROWS`, `TX2_BULK_BYTES`), so a subject of more than about 46 facts cannot be imported in one frame. Import splits a subject across frames, and a reader can see it half imported. | **Not changed** (a default). The lab's import frame is one new subject of 8 to 64 facts. Proposed, as ACT4 did for settlement: a frame holds whole subjects up to a byte bound; a subject larger than the bound is written in parts with the split recorded, and its root is written last, so a reader reaching it by reference sees it whole. |
| 10 | The playground (`examples/playground/service.ts`) | Nothing: a save is one `transact` for the subject (`replace`) with an `EntityState` precondition, and the seed writes a subject and its owned entities in one transaction | No change needed. Its background Publish writes 16 subjects per commit, which is settlement, not a save. |
| 11 | The demo toy loader (`examples/demo-mcp/src/toy-load.ts`), the compliance host, the HTTP entity store, the host protocol, the CLI | One `transact` per subject or per entity operation | No change needed. |
| 12 | Lab tapes | Shape R (one commit per form row) and Saturday's tape | Kept selectable, because earlier cards must reproduce. The card says which tape ran. Shape R's assembly fault (H11.9) no longer blocks the default. |

**A bug found on the way, not a per-row assumption.** W3 (`8cf543b8c`, carried by W4) moved the read-permit argument
of `reach/response` (`packages/datomic/gateway/src/triplex/gateway/reach.clj`) one parenthesis too far. As a result:

- The function returned `(admission/pinned? input)`, a Boolean, instead of the reach body.
- Every `/reach` and `/reach-many` answer, used by subject pulls and the console, would be `true` or `false`.
- W2's wide gate found it here: its route comparison calls `reach/response` and failed with a `ClassCastException`
  in 3 of 4 tests.
- The production and aged gates read through `/read`, so they did not see it.

It is **fixed on this branch** (`reach.clj` line 408). The same fix is needed wherever W3 or W4 is merged, including
the integration builder's pending merge onto `exp/DX-INT1`.

## 4. How cost grows with the size of a save

### 4.1 Request size against the 4 MiB cap (Mac, exact; `s1/request-size.ts`)

The real `DatomicClient` sends to a stand-in gateway on localhost that records each request's bytes. The client uses
the lean layout with ordered row texts, as the server writer does. Each save is the lab's `command()` framing:

- the business rows;
- one journal change per fact asserted and per value retired;
- four journal rows.

Values are 57 characters, as the production tape writes. Evidence: `DX-S1/request-size.json`.

| Facts in the save | Request bytes, all replacing | Assertions | Identity | Request bytes, all first writes |
| ---: | ---: | ---: | --- | ---: |
| 1 | 4,381 | 7 | one-byte block | 3,179 |
| 5 | 14,053 | 19 | one-byte block | 8,019 |
| 10 | 26,147 | 34 | one-byte block | 14,073 |
| 17 | 43,094 | 55 | one-byte block | 22,557 |
| 50 | 122,987 | 154 | one-byte block | 62,553 |
| 100 | 244,041 | 304 | wide block (with the option; else general) | 123,157 |
| 128 | 311,913 | 388 | wide block | 157,149 |
| 340 | 825,801 | 1,024 | wide block | 414,517 |
| 1,000 | 2,425,645 | 3,004 | wide block | 1,215,761 |

- **About 2,424 bytes per replacing fact** and about 1,215 per first write. A replacement carries its new row, its
  journal change, and the retired row's journal change with the old value.
- **The largest save the SDK sends:** 1,728 replacing facts of 57 characters (4,192,501 bytes; 1,729 is refused
  before sending), or 1,266 facts of 500 characters. All first writes reach about 3,400 facts of 57 characters.
- **The cap:** both the SDK (`DatomicRequestTooLarge`, before opening a socket) and the gateway (`request-json`)
  refuse a body over 4,194,304 bytes. Live saves have no row or byte bound of their own. The bulk class has
  96 rows and 64 KiB; `TX2_WRITE_BUDGET_US` is off by default.

### 4.2 The toy ladder (Mac, PostgreSQL with fsync, diagnostic; `s1/ladder.sh`)

One subject per save, six subjects per size (one at 2,000 and 4,000). Each subject is seeded with
max(160, size) fields and indexed. Then, for each arm, the transactor restarts and every subject gets two saves:

- **Cold:** its first save after the restart, replacing `size` seeded fields.
- **Warm:** the same fields replaced again at once.

**The arms:**

- **`general`:** the option off. Today every save of four facts or more takes the general writer.
- **`subject-wide`:** `TX2_SUBJECT_WIDE` on. The per-subject writer takes up to 128 facts and the general writer the
  rest.

**Shared settings:**

- Both arms write the same wide ordered block, so the records are identical. Above 4,096 assertions the IDs are plain
  26-character IDs.
- The memory index is 256 MiB, so no index job runs inside a measured save.
- Every save's subject is read back exactly after it commits (an assertion in the harness).

**Measures:**

- Serial apply: Datomic's `io-stats :api-ms`.
- Reads inside apply: the transaction's `io-stats :reads :sql`.
- WAL bytes: PostgreSQL's WAL insert position before and after the commit.

Medians of six. Evidence: `DX-S1/ladder-1.tar.zst` and `DX-S1/ladder-records.json` in the private evidence store.

| Facts | Assertions | Datoms | Added text bytes | PostgreSQL WAL bytes per commit, cold / warm | Storage reads inside apply, cold / warm: median (max) | Serial apply, general writer, cold / warm (ms) | Serial apply, per-subject wide, cold / warm (ms) | Writer and identity with the option on |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 5 | 19 | 39 | 8,527 | 1,840 / 1,856 | 0 (9) / 0 (0) | 2.50 / 1.89 | 0.79 / 0.99 | per-subject, wide block |
| 10 | 34 | 59 | 15,906 | 2,304 / 2,556 | 0 (0) / 0 (0) | 5.13 / 2.12 | 0.76 / 0.75 | per-subject, wide block |
| 17 | 55 | 87 | 26,224 | 3,200 / 8,436 | 0 (2) / 0 (0) | 3.69 / 3.92 | 0.94 / 1.39 | per-subject, wide block |
| 50 | 154 | 219 | 74,866 | 12,544 / 12,280 | 0 (0) / 0 (0) | 5.79 / 8.96 | 1.42 / 2.59 | per-subject, wide block |
| 100 | 304 | 419 | 149,370 | 20,808 / 20,832 | 0 (2) / 0 (0) | 8.94 / 8.81 | 2.08 / 4.67 | per-subject, wide block |
| 340 | 1,024 | 1,379 | 506,730 | 51,608 / 52,100 | 0 (2) / 0 (0) | 35.98 / 36.98 | general: 57.10 / 46.60 | general, wide block |
| 1,000 | 3,004 | 4,019 | 1,497,474 | 126,172 / 130,756 | 0 (2) / 0 (0) | 92.04 / 94.12 | general: 89.86 / 117.72 | general, wide block |
| 2,000 (one subject) | 6,004 | 8,019 | 2,987,463 | 225,872 / 226,944 | 2 / 0 | 149.83 / 148.01 | general: 188.38 / 189.78 | general, general identity |
| 4,000 (one subject) | 12,004 | 16,019 | 5,981,463 | 435,024 / 435,576 | 3 / 1 | 331.24 / 331.80 | general: 381.92 / 673.89 | general, general identity |

**Datoms and bytes grow linearly.**

- A save of N replacing facts writes 4N + 19 datoms: per fact, a row, its journal change, the retired row's
  retraction and its journal change.
- It writes about 1,500 bytes of row and journal text per fact.
- PostgreSQL writes about 125 to 130 WAL bytes per fact from 340 facts up. Datomic compresses its log, so the
  durable write is about one twelfth of the text.

**The transactor accepted every size, up to 4,000 facts.** 16,019 datoms and 6 MB of text took 331 ms of serial
apply. The harness hands the transaction to Datomic directly. Through the SDK and the gateway, the 4 MiB request cap
stops a replacing save at 1,728 facts first.

**The per-subject wide writer's serial apply is 1.9 to 6.8 times shorter** than the general writer's for the same
save at 5 to 100 facts. W2 measured 1.25 to 3.5 times.

**Storage reads inside apply do not show at toy size.** The whole toy database fits in a few segments. The first
commit after each restart reads 9 to 18 segments and later commits read 0 to 2. The server figures are the ones to
use: 0.70 reads per shape S commit late at 1 billion, 1.53 in the first minute, and 1 to 3 ms each.

### 4.3 Forecasts at 1 billion records

**The fit:** a warm commit costs 5.39 ms + 0.201 ms per fact, end to end. It was fitted over 1,761 general-writer
commits at 1 billion on the production-S card (private `research/2026-11-24-undiagnosed-misses/REPORT.md`,
section 1). Serial apply on that card was about 0.12 ms per fact at 1 billion and 0.06 ms at 430 million
(`bm1/PRODUCTION-TAPE-READING.md`). A storage read inside apply costs 1 to 3 ms there, mostly decode.

| Facts | Request bytes | Writer and identity, option off | Writer and identity, option on | Serial apply, general (0.12 ms per fact) | Serial apply, wide (toy ratios, cold to warm) | Warm commit end to end (5.39 + 0.201 × facts) | A cold subject adds | Serial thread held at 2.9 saves/s, general |
| ---: | ---: | --- | --- | ---: | ---: | ---: | --- | ---: |
| 5 | 14,053 | general; one-byte block | per-subject; one-byte block | 0.6 ms | 0.2 to 0.3 ms | 6.4 ms | 1 to 3 storage reads × 1 to 3 ms | 0.2% |
| 10 | 26,147 | general; one-byte block | per-subject; one-byte block | 1.2 ms | 0.2 to 0.4 ms | 7.4 ms | the same | 0.3% |
| 17 | 43,094 | general; one-byte block | per-subject; one-byte block | 2.0 ms | 0.5 to 0.7 ms | 8.8 ms | the same | 0.6% |
| 50 | 122,987 | general; one-byte block | per-subject; one-byte block | 6.0 ms | 1.5 to 1.7 ms | 15.4 ms | the same | 1.7% |
| 100 | 244,041 | general; general identity | per-subject; wide block | 12.0 ms | 2.8 to 6.3 ms | 25.5 ms | 2 to 4 reads (more EAVT segments) | 3.5% |
| 340 | 825,801 | general; general identity | general; wide block | 40.8 ms | — (general) | 73.7 ms | the same | 11.8% |
| 1,000 | 2,425,645 | general; general identity | general; wide block | 120 ms | — (general) | 206 ms | the same | 34.8% |

Notes on the table:

- **Facts and form rows.** A form row is about 1.2 facts, so a 17-row form save is about 20 facts. At 20 facts the fit
  gives 9.4 ms warm. The measured shape S completion p99 at 1 billion was 42 ms.
- **The fit's range.** It was fitted on the card's commits of up to about 130 facts. At 340 and 1,000 it is an
  extrapolation. Section 6's ladder tests it.
- **The general identity.** "General identity" applies with the option off: a commit over 256 assertions cannot use
  the one-byte block. With the option on, it takes a wide block up to 4,096 assertions.
- **A 1,000-fact save holds the serial point for about 120 ms.** Every save in the database queues behind it for that
  time. That, not the request cap, is why section 4.4 sets the product's bound at 1,000.

### 4.4 What a client does with a save larger than the store accepts

**Refuse it with a clear answer. Do not split it.**

1. **Splitting breaks the contract.** Every split commit is visible as soon as it lands. A reader between the parts
   sees half a save. A lost reply in the middle leaves the client unsure which parts landed. A conflict on part 3
   leaves parts 1 and 2 committed. Keeping all-or-nothing across parts would need a staging protocol: parts written
   to a draft entity, then one final commit that makes them current. That is more moving parts than any product save
   needs.
2. **No product save comes near the cap.** The production-shaped tape's largest save is about 120 facts. A whole
   release of 40 form and policy definitions is about 340 facts, and it goes through Publish, which settles in its
   own frames.
3. **The practical bound is serial time, not bytes.** A 1,000-fact save holds the serial point for about 120 ms at
   1 billion on the general writer (0.12 ms per fact). Every other save in the database waits behind it, so a
   neighbour's commit p99 breaks the 50 ms bar.

**The rule to adopt** (a product setting, not built here):

- **Live saves up to 128 facts:** the wide writer's bound, and a few milliseconds of serial time.
- **129 to 1,000 facts:** accepted as one commit and counted. Each one delays the saves queued behind it by its
  apply time (about 0.12 ms per fact at 1 billion), so they must stay rare. No product action found in section 2
  makes one.
- **Over 1,000 facts:** refused before sending, with `SaveTooLarge { facts, bytes, limitFacts: 1000 }`.

Bulk loads go through the import class. Today the SDK's refusal at 4 MiB surfaces as `InvalidValue` "Request too
large", which names neither the save nor the limit.

## 5. The wide writer (`TX2_SUBJECT_WIDE`)

**State:** merged on this branch from `origin/exp/DX-W2-wide-saves` `4ccbbf518`, default off. Both conflicting hunks
were resolved by reading both sides:

- `erase1/local.mjs`: keep both the pinned read options and the wide line.
- `scale1/decision/writes.ts`: keep INT1's production assertion count; with the option on, a commit takes a wide
  block and uses the general identity only past 4,096 assertions.

W3 (`a6146ff4f`) and W4 (`27fee5dc1`) were merged here too, cleanly, so the hint options can run beside it. The card
stack, the card runner, the production gate and the aged gate all carry the switch. Every addition is default off.

**Gates (Mac, correctness).** Evidence: `DX-S1/gates-0920.tar.zst` (production and aged gates, with `run-gates.sh`) and `DX-S1/suites.tar.zst` in the private evidence store, with `SHA256SUMS`.

| Gate | Wide off, hints off | Wide on, hints off | Wide on, both hints on |
| --- | --- | --- | --- |
| **W2's own gate** (`w2/wide_gate.clj`: wide and narrow saves of 1 to 129 facts on one subject against a control database on every read route; append retirement; refusals, resends, identity conflicts and a lost reply on the wide path), PostgreSQL with a real transactor (`s1/suites.sh`) | — (the gate is for the option on) | 4 tests, 221 assertions, pass (after the `reach.clj` fix; before it, 3 errors in its route comparison) | 4 tests, 221 assertions, pass |
| **Mixed-identity, ordered-ID collision and conflict suite** (`prep1/subject_conflicts.clj`) with WFIX1's regression suite, PostgreSQL | 6 tests, 235 assertions, pass | 6 tests, 235 assertions, pass | 6 tests, 235 assertions, pass |
| **Gateway selftest** (in memory) | 28 tests, 54,110 assertions, pass | 28 tests, 54,110 assertions, pass | — |
| **REAL2 production exactness gate** (`DX_CHK1_HOLDER=DX-S1 [DX_W2_WIDE=1] [DX_W3_GENERAL_PREFETCH=1 DX_W4_SUBJECT_HINTS=1] prep1/manage.py OUT production 10 1 1 0 1`) | Pass: 840 R and 88 S commits, 0 expired, 2,836 fields read back exactly. S: 51 per-subject, 37 general. The two 130-fact saves (394 assertions) take the general identity. | Pass, the same 2,836 fields. **All 840 R and 88 S commits take the per-subject writer.** The two 130-fact saves take wide blocks on the general writer (130 facts is over 128). Write-options readback `subjectWide: true`. | Pass, the same 2,836 fields. Per-subject hints on 928 commits, general hints on 9; write-options readback shows all three options. |
| **REAL2 production tape on a loader-aged toy** (`[DX_S1_WIDE=1] [DX_W3_GENERAL_PREFETCH=1 DX_W4_SUBJECT_HINTS=1] real2/aged-gate.sh OUT`) | Pass: 120 aged rows admitted, a tampered aged row refused, 101 writes over aged rows, 1,927 fields, final cut 1,289. R: 384 of 840 per-subject. S: 52 of 88 per-subject. | Pass, identical figures. R 840 of 840 and S 88 of 88 per-subject. | Pass, identical figures. Every commit per-subject and hinted (R 840, S 88). |
| Card unit tests (`v01/*.test.ts`) and the saves-arm harness (`rd1/saves-gate/harness.ts`, with a new case 9 for the ladder) | 35 of 35; harness passed, including the seven ladder windows | — | — |
| Identity tests (`w2/wide-ids.test.mjs`, `prep1/ordered-ids.test.mjs`) | 5 of 5 | — | — |

**What it buys for a 17-fact save at 1 billion:**

| | General writer | Wide per-subject writer |
| --- | --- | --- |
| Serial apply | about 2.0 ms (0.12 ms per fact, measured on the 1 billion card) | about 0.8 ms (0.5 to 1.1): the toy ratio is 2.8 to 3.9 at 17 facts here and 1.9 to 2.2 at 20 facts in W2 |
| Serial time per save | — | about 1.2 ms less |
| Commit p50 | — | 0.5 to 1.5 ms lower |
| Commit p99 | set by durable storage, credits and index jobs | unchanged within noise |
| Share of the serial thread at 394 rows/s (23.06 saves/s) | 4.6% | 1.8% |
| Share of the serial thread at 620 rows/s (about 36.3 saves/s) | 7.3% | 2.9% |
| Serial apply alone saturates at | about 500 saves/s | about 1,250 saves/s |

**What would make it worth switching on:**

1. **A server pair confirms it.** Section 6, arm (a). The pair must show apply off÷on of at least 1.5 for saves of
   60 facts or more, no more than one extra storage read per commit late, and commit p99 within 20% of off.
2. **The product's saves can use it.** The SDK must mint one ordered block per save (section 3, row 6). Otherwise the
   per-subject writer checks each assertion's ID in history, and the toy gain was measured with ordered blocks.
3. **The serial point gets busy.** Live saves, Publish settlement and import together above about 30% of the serial
   thread. That is where the headroom pays.

Conditions 1 and 2 are required; condition 3 is when the gain starts to matter. Until 1 and 2 hold, leave it off. If
the pair shows a ratio under 1.5, remove the option rather than keep an unused switch (W2's rule).

## 6. Server runs (published before any run; no machine is rented)

Both runs need a rented bare-metal server of the measured kind (12 cores, 96 GB, two NVMe drives) and the owner's
approval. They run on the merged head: `exp/DX-INT1` after the card branch (CARD2: `production-S-noburst`, the tuned
reader, 300 s cells), W3, W4 and this branch, with the `reach.clj` fix of section 3. Build once as
[PRODUCTION-CARD](PRODUCTION-CARD.md) "Build once". Copies and the environment are as the card's drivers use them.

### 6.1 (a) The production-S card with the wide writer and the general-writer hints, 300 s cells

**Four arms:**

| Arm | Wide writer | General-writer hints |
| --- | --- | --- |
| Control | off | off |
| Wide | on | off |
| Hints | off | on |
| Both | on | on |

Each arm is its own campaign, with part 1 then part 2. The sequential runner refuses a campaign that does not start
with part 1, and refuses any part whose launch settings differ from part 1's. So arms cannot share a campaign, and
W3's published `part 2`-only commands would be refused as written.

**If time is short, run Control and Wide.** The decision at hand is whether the wide writer earns its place under one
commit per save. With the wide writer on, nearly every shape S commit leaves the general writer, so the general hints
then touch only about 1.5% of commits.

```bash
COMMIT=<the merged head>; BUILD=/var/tmp/triplex-s1-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
part() {  # $1 part, $2 new scratch copy of AGED_PGDATA_SOURCE, $3 campaign directory; $EXTRA = writer options (may be empty)
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" $EXTRA \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$3" --arm "$1" \
    --age 1B --tape production-S-noburst --profile server-32 --reader tuned --read-permits 12 \
    --credit-mode rolling6 --window-seconds 300 \
    --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$SCORECARD_WAL_DIRECTORY" \
    --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
    --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
    --pgdata-source "$AGED_PGDATA_SOURCE" --pgdata "$2"
}
arm() {   # $1 campaign directory; parts 1 and 2 (P2 and P6 are in part 2), one new copy each
  for n in 1 2; do make_copy "$COPY" || return 1; part "$n" "$COPY" "$1" || return 1; remove_copy "$COPY"; done
}
EXTRA=;                                            arm /var/tmp/s1-card-control      # 1
EXTRA=TX2_SUBJECT_WIDE=1;                          arm /var/tmp/s1-card-wide         # 2
EXTRA=TX2_GENERAL_PREFETCH=1;                      arm /var/tmp/s1-card-hints        # 3 (if time)
EXTRA="TX2_SUBJECT_WIDE=1 TX2_GENERAL_PREFETCH=1"; arm /var/tmp/s1-card-both         # 4 (if time)
```

**Before reading any number, check each arm's records:**

- The card's Run settings line names the options that were set.
- The write gateway's `write-options` shows `subjectWide` and `options.generalPrefetch` as set. `adopted.ts` now
  refuses the arm if they differ.
- With hints on, `/v2/admin/scan-stats` shows `generalHints.attached` above zero.

**Duration:**

- Per arm: two copies of 2 to 3 minutes, part 1 of 9 to 11 minutes and part 2 of 58 to 68 minutes (CARD2's figures
  for these settings). That is 71 to 85 minutes, with a ceiling of 100.
- Control and Wide: 2 h 25 min to 2 h 50 min. All four: 4 h 45 min to 5 h 40 min.
- At USD 1.09 an hour: about USD 2.60 to 3.10 for two arms, and USD 5.20 to 6.20 for four.

**Predictions** (1 billion records, the second half of each loaded cell, shape S commits):

| Measure | Control | Wide | Hints | Both |
| --- | --- | --- | --- | --- |
| Shape S commits on the per-subject writer | 25 to 40% | 95 to 100% | as Control | 95 to 100% |
| Commits on a wide block / on the general identity | 0 / 1.2 to 1.5% | 1.2 to 1.5% / 0 | as Control | as Wide |
| Mean serial apply per shape S commit (about 17 facts) | 1.5 to 2.5 ms | 0.6 to 1.2 ms | 1.3 to 2.3 ms | as Wide |
| Apply Control ÷ arm, commits of 60 facts or more | — | 1.5 to 3.5 (central 2.5) | under 1.3 | as Wide |
| Storage reads inside apply per commit, late | 0.4 to 1.0 | within +1 of Control | general writer's reads down 40 to 55% in the first loaded cell | as Wide |
| Commit p50 at 394 | 7 to 10 ms | 0.5 to 1.5 ms below Control | within 2 ms of Control | as Wide |
| Commit p99 at 394 and 620 | 30 to 50 ms | within 20% of Control | 10 to 30% below Control at 620 | within 20% of Control |
| Stored against offered; expired | all; 0 | all; 0 | all; 0 | all; 0 |
| Exact read-back of every field | yes | yes | yes | yes |

**What would show these wrong:**

1. **Wide puts under 95% of shape S commits on the per-subject writer.** The production saves then break a rule the
   toy saves did not. Read the gateway's refusal reason before anything else.
2. **Apply Control ÷ Wide for commits of 60 facts or more is under 1.5.** The toy's gain does not carry to the server.
   Recommend removing the option (W2's rule).
3. **Wide reads more than one storage read per commit above Control, late.** The per-subject writer's fixed guards
   then cost more at full size than the work they save.
4. **Wide's commit p99 is more than 20% above Control's.** The gateway's planning of large saves then costs more than
   the serial time saved.
5. **Any arm loses a save, expires one, misreads a field, or refuses on the write-options check.** The arm counts for
   nothing until that is explained.

### 6.2 (b) The save-size ladder at 1 billion, with 256 pinned readers running

**What runs:**

- `v01/study-server.ts` with `DX_RD3_PINNED_SAVES=1 DX_RD3_WINDOWS=ladder`: the saves arm of
  [PINNED-1B](../rd1/PINNED-1B.md), with its stack, reader settings and admission unchanged.
- Seven isolated windows of 90 s, one per size: 5, 10, 17, 50, 100, 340 and 1,000 facts.
- In each window, 256 pinned readers near the head, and every neighbour save rewritten to exactly N facts
  (`DX_S1_LADDER_FACTS`) at the 50 rows/s cell's save times: about 2.9 saves per second, about 260 saves per window,
  with the card's quiet account beside them.
- Each window's first cut is the previous window's terminal.

**Optional second arm, on its own copy:** `TX2_SUBJECT_WIDE=1`.

```bash
# As rd1/PINNED-1B.md "saves_arm", plus DX_RD3_WINDOWS=ladder and $EXTRA.
saves_arm() {  # $1 = new scratch copy of AGED_PGDATA_SOURCE, $2 = new campaign directory, $3 = deadline in ms
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" $EXTRA \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_RD3_PINNED_SAVES=1 DX_RD3_WINDOWS=ladder \
    DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" DX_RD1_LADDER=pinned-saves "DX_RD1_PGDATA=$1" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$2" "$3" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6
}
OUT=/var/tmp/s1-ladder-1b; mkdir "$OUT"                   # new
EXTRA=; DEADLINE=$(( $(date +%s%3N) + 40 * 60 * 1000 ))
saves_arm "$COPY_1" "$OUT/off" "$DEADLINE"                 # writes OUT/off/pinned-saves/pinned-saves.json
# optional, on a new copy:
EXTRA=TX2_SUBJECT_WIDE=1; DEADLINE=$(( $(date +%s%3N) + 40 * 60 * 1000 ))
saves_arm "$COPY_2" "$OUT/wide" "$DEADLINE"
```

**Duration:** copy 2 to 3 minutes, stack start and aged check 4 to 6, seven windows of 3.5 = 24.5, cleanup 2: about
33 to 36 minutes per arm, with a deadline of 40. Two arms: about 70 minutes, about USD 1.30.

**Predictions** (wide off; commit latency over each window's saves):

| Facts | Commit p50 | Commit p99 | Writer | Pinned read p99 near the head |
| ---: | ---: | ---: | --- | ---: |
| 5 | 6 to 9 ms | 20 to 45 ms | general (wide on: per-subject) | under 140 ms |
| 10 | 7 to 10 ms | 20 to 45 ms | general (per-subject) | under 140 ms |
| 17 | 8 to 12 ms | 25 to 50 ms | general (per-subject) | under 140 ms |
| 50 | 14 to 20 ms | 35 to 65 ms | general (per-subject) | under 140 ms |
| 100 | 23 to 32 ms | 50 to 90 ms | general (per-subject) | under 140 ms |
| 340 | 65 to 90 ms | 110 to 180 ms | general | under 160 ms |
| 1,000 | 185 to 260 ms | 280 to 450 ms | general | under 180 ms |

**Basis:**

- p50 is the 1 billion fit, 5.39 + 0.201 ms per fact, with up to 3 ms for the 256 readers.
- p99 adds a cold subject's 1 to 3 storage reads of 1 to 3 ms each, and the measured tails of shape S beside readers
  (52 to 65 ms).
- Pinned reads: the near-head window with shape S saves measured 112 ms p99. The ladder's saves are fewer but larger.
- **With the wide writer on:** sizes 5 to 100 forecast 0.5 to 6 ms lower p50, and p99 unchanged within 20%.

**What would show these wrong:**

1. **p50 at 17 facts or more differs from 5.39 + 0.201 ms per fact by more than 30%.** The fit does not hold over
   that range, and sections 4.3 and 4.4 must be redone.
2. **p99 at 1,000 facts is above 1 s, or a save expires at 340 or 1,000.** The serial point queued: 2.9 saves per
   second of 1,000 facts is too fast for this machine, and the 1,000-fact bound of section 4.4 is too high.
3. **Pinned read p99 is more than twice the near-head window's 112 ms, or any wrong value.** Large saves then disturb
   readers more than their count suggests.
4. **Any lost save or read-back mismatch.** Exactness broke; the run counts for nothing until that is explained.

## 7. Not verified

- **Nothing here ran on a server.** Every 1 billion figure is a forecast from the fits and measurements named beside
  it. No machine is rented.
- **The ladder's server path ran only in the Mac harness, with stubs:** `study-server.ts` into the saves arm, into the
  card's production cell with `DX_S1_LADDER_FACTS`. The rewrite of the tape is unit-tested. The saves themselves (the
  preload, identities, journal checks and exact read-back) are the card's production path, but saves of N rewritten
  facts have not been through a stack.
- **The card runner's writer-option pass-through was not run end to end.** Its launcher refuses to run outside a
  Linux bare-metal host. Covered: unit tests (34 card tests pass), the readback assertion's code path, and the type
  check of the touched lines.
- **Storage reads inside apply at toy size say nothing about 1 billion.** The whole toy database fits in a few
  segments.
- **The product's mapping is read from its code, not measured.** How often a page carries employer fields, and how
  many saves would be multi-entity (task and profile), would need a production query. None was made.
- **The product path with the wide writer is not measured.** The SDK mints random IDs, so the per-subject writer
  checks each ID in history (section 3, row 6). The toy and the gates used ordered blocks.
- **Not changed and not gated:** the console (its gates use port 28580, which the owner's console holds) and import
  framing.
- **The `reach/response` fix** was checked by W2's wide gate and the gateway selftest on this branch, with the option
  off and on. Every other route test that W3 and W4 ran before the fix read through `/read`, so their results stand.
- **Gate timing:** the production and aged gates ran at `41f34557b`, before the `reach.clj` fix. They do not read
  through reach.
- **Mac clocks are diagnostic only.** The apply ratios above are the toy's.

# The two size limits of a large release: a subject owing 200 forms or more, and definitions near the 1.3 MiB ceiling

Builder DX-ACT6, 2026-11-24, branch `exp/DX-ACT6-release-limits` (on `exp/DX-ACT5-settlement-live` `c1579ee50`, with
`exp/DX-INT1` `23b7df344` and `exp/DX-ACT7-settlement-1b-prep` `82ba1ca38` merged in). Mac work is correctness at toy size; every Mac time here is diagnostic. Nothing ran
on a server (none is rented). Three options, all default off; with all of them unset nothing changes.

| Option | What it does | Needs |
| --- | --- | --- |
| `TX2_NOTICE_LEDGER=parts` | a subject's notice ledger longer than one part (10,240 packed characters) is written as numbered parts, then a small head that names them | `TX2_SETTLE_FRAMES=bytes` |
| `TX2_RELEASE_DOCS=ref` | the definitions are stored once, by content, ahead of the Publish; the Publish carries a reference | nothing |
| `DX_ACT6_STREAM_CHECK=1` | the held runner compares a settled release with the oracle page by page instead of loading it whole | byte frames |

One cap changed in the kernel (not an option): `compileRelease` accepts up to 8,192 forms and 8,192 policies (was 512),
so a subject can owe 1,000 forms and a definition set can reach 1.25 MiB. Every release accepted before is accepted and
evaluated the same (kernel tests 174 of 174).

## Short answer

1. **A subject owing 200, 500 or 1,000 forms now settles.** With `TX2_NOTICE_LEDGER=parts` its ledger is written in
   parts inside the existing byte frames, and only its head switches the ledger: a reader sees exactly the earlier
   ledger until the frame that holds the head and exactly the new one from then on. Every frame stays within the 8 ms /
   64 KiB bound. Toy gates pass at 200, 500 and 1,000 forms with kills inside a subject's deliveries and inside its
   ledger parts, a second release in the middle, a pause in the middle, against the oracle and the independent rule.
   The new limit is the ledger head's frame: about **1,680 owed notice items per subject** by the default estimate
   (more under a calibrated `TX2_SETTLE_COST`; section 2.4). Gates also pass under a calibrated estimate.
2. **A release near the ceiling.** With full documents the ceiling is far below 1.3 MiB. Each new fact value crosses
   the wire twice (as a row and as an escaped row text), so the 4 MiB request holds only 1.2 to 1.7 MB of operations, and
   the store takes at most **1 MiB per fact value**, while the release marker holds the new and the old document in one
   value. Today a first set must stay **between 0.50 and 0.70 MiB** (the request: accepted at 0.50, refused at 0.70 on the
   toy) and a release that follows a set of its own size under about **0.5 MiB** (the marker value). The toy refused
   the 0.5 MiB follow-on, first releases at 0.70 and 0.95 MiB, and every first release at 1.0 and 1.25 MiB. Both refusals now name the limit and the sizes;
   the value limit is checked before any write. With `TX2_RELEASE_DOCS=ref` the Publish record is **3.5 KB and four
   changes at every size up to 1.25 MiB** (single-writer estimate 6.1 ms against 132 to 258 ms for full documents that
   fit); the definitions are written ahead, outside the save fence, once, by content (a release that adds 20 forms to
   5,000 writes 5 or 6 bounded writes, 14 to 22 KB); reads sweep 1 KB per release instead of the documents and compile a
   release once per process. **The ceiling becomes about 11 MiB of definitions** (the index root's own bounded write),
   and before that the kernel's cap of 8,192 forms and policies; at 1.25 MiB the binding cost is the read (308 KB
   answers), not the store.
3. **Reads with many policies.** A read evaluates every policy in force, and the answer carries one trace entry per
   policy, so its size is linear in the policies whatever the subject owes (64 KB at 1,000 policies for a subject that
   owes nothing, 308 KB at 5,000). An index from a subject to its policies cannot shrink that without changing the
   answer; it is not built. What was not linear but quadratic in practice is fixed by the reference option: with full
   documents every read sweeps every release marker ever published in the account (each with two full documents) and
   compiles the winning document again (30 ms at 1.25 MiB on the Mac).

## 1. What was measured before building (database-free; Mac times diagnostic)

**Definition-set sizes** (synthetic forms of 12 fields, one policy per form, `largeRelease(R2, forms=N)`): 1,000 forms
= 263,654 B (0.251 MiB), 2,000 = 0.502 MiB, 4,000 = 1.004 MiB, 5,000 = 1.255 MiB. Compiling one: 7.5 ms at 1,000, 30 to
34 ms at 5,000 (`read-cost.ts`).

**The Publish record with full documents** is 3.0 KB + 1.2 × (2 × new + old) bytes of operations (fitted on the toy by
DX-ACT3, confirmed on the toy here in section 3.3; the wire is larger, below). From `definitions-check.ts`:

| Set | First release of the set (old = R2) | A release adding 20 forms to it (old = the set) |
| --- | ---: | ---: |
| 0.25 MiB (1,000 forms) | 636,407 B | 964,783 B |
| 0.50 MiB (2,000) | 1,267,847 B | 1,911,943 B |
| 1.00 MiB (4,000) | 2,530,727 B | 3,806,263 B |
| 1.25 MiB (5,000) | 3,162,167 B | 4,753,423 B |

"About 1.3 MiB" (LARGE-RELEASE.md) compared these operations with the 4 MiB request. Two things make the real limit
lower, both found by the toy gates:

- **The wire carries each new value twice.** The transact body sends every new row as a row and again as an escaped
  row text (`protocol.ts` `stagedInput`), so the request is well over twice the operations. Measured on the toy: a
  first release of the 0.50 MiB set (1,233,297 bytes of operations) was accepted; of 0.70 MiB (1,725,214 bytes, held
  runner) and 0.95 MiB (2,339,414 bytes) refused by the client's 4 MiB check. So the wire is between 2.43 and 3.40
  times the operations; my model of the body (below) gives 2.29 and is therefore short by at least 6%; the exact factor
  is not established.
- **The store takes one fact value of at most 1 MiB** (`ValueDomains.datomic`: 1,048,576 UTF-8 bytes), and the marker
  is one value holding the new and the old document: the release adding 20 forms to the 0.5 MiB set was refused by the
  store ("Value is outside datomic's exact storage domain").

So with full documents (operations exact; wire by my model of the body, a lower bound):

| Set | First release: operations / wire | Follow-on (adds 20 forms): marker value / wire |
| --- | --- | --- |
| 0.25 MiB | 617,710 / 1,412,076 | 528,137 / 2,114,338 |
| 0.38 MiB | 924,810 / 2,114,276 | 791,237 / 3,167,638 |
| 0.45 MiB | 1,109,070 / 2,535,596 | 949,097 / 3,799,618 |
| 0.50 MiB | 1,231,910 / 2,816,476 | **1,054,337 (over 1 MiB)** / 4,220,938 (over) |
| 0.70 MiB | 1,725,214 (measured) / over: **refused on the toy** | — |
| 0.95 MiB | 2,337,470 / **5,344,396 (over; refused on the toy)** | — |

- **a first set must stay between 0.50 and 0.70 MiB** (the request; accepted at 0.50, refused at 0.70);
- **a release that follows a set of its own size under about 0.5 MiB** (the marker value, and the request, together).

Publish refuses an over-limit value itself, before any write, with the sizes; an over-limit request is refused by the
client before sending, and Publish reports it as `ReleaseTooLarge` with the record's size.

**The writer's hold**, by the bulk writer's own estimate applied to the Publish record (the formula its frames are
admitted by): 132 ms for the 0.25 MiB first release, 198 ms for its follow-on, 258 ms for the 0.50 MiB first release;
by reference 6.1 ms whatever the size (section 3.3). The real hold of a large record has not been measured.

**A read before settlement** (`read-cost.ts`, 64 deep subjects, medians):

| Policies in force | Subject owes | Trace entries in the answer | Answer bytes | Evaluate µs | Serialize µs | Compile ms (per read with full documents) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 0 (R2) | — | 11 | 2,970 | 42 | 10 | 0.05 |
| 40 | every form | 51 | 27,254 | 140 | 57 | 0.55 |
| 40 | none | 51 | 5,330 | 48 | 10 | 0.25 |
| 200 | every form | 211 | 124,389 | 551 | 205 | 1.5 |
| 200 | none | 211 | 14,770 | 174 | 24 | 1.5 |
| 1,000 | every form | 1,011 | 618,999 | 3,811 | 2,278 | 7.5 |
| 1,000 | none | 1,011 | 63,970 | 881 | 90 | 7.5 |
| 5,000 | every form | 5,011 | 3,083,118 | 35,496 | 13,995 | 30 to 34 |
| 5,000 | none | 5,011 | 307,970 | 4,661 | 1,714 | 30 to 34 |

Per policy that a subject does not owe: about 0.9 µs of evaluation and 60 bytes of answer (its trace entry). Per owed
policy: about 7 µs and 600 bytes (its task, its due obligation, its work item and the trace entry).

**Every read also swept every release marker ever published in the account** (`controls()` reads all rows of the
release entity: markers are asserted, never retracted, and each held the new and the old document in full), and
compiled the winning document again. Each Publish with full documents adds its marker (new plus old document) to what
every later read pulls: on the toy, 1.6 MB after five Publishes of sets up to 0.5 MiB (section 3.3), growing without
bound with the number of releases.

## 2. The ledger of a subject owing many forms (`TX2_NOTICE_LEDGER=parts`)

### 2.1 Why it was refused

A subject's ledger (`recorded-ledger:<subject>`, one packed value of its notice items) was the closing piece of its
notice units, written whole. The writer's estimate (`frameEstimate`: 3.5 ms + 45 µs × (5 × ops + 16) + 70 µs per KiB of
4,096 + 3 × the canonical ops) allows about 12 KB of one value next to the cursor change; at 200 owed forms the packed
ledger is about 12.5 KB, so the head-plus-cursor frame alone exceeded 8 ms and the frame was refused
(`FrameTooLarge: its closing piece alone exceeds the writer's bound`, reproduced by `ledger-check.ts` in `whole` mode at
200, 500 and 1,000 forms).

### 2.2 The rule

- **A ledger that fits one part (10,240 packed characters) is written exactly as before**: the same value under the
  same key. So the small release and the 20-form release write byte-identical ledgers with the option set.
- **A longer ledger** is cut into parts `recorded-ledger-part:<subject>:<event>:<i>` (each a slice of the packed
  string). The parts are units of the subject after its deliveries, so the byte frames carry and split them like
  deliveries. The head `recorded-ledger:<subject>` becomes `{parts, event, chars, sha}` and is the closing piece: it is
  written with the last part (or alone after it), together with the retraction of the old head and of the old ledger's
  parts.
- **Readers** (`readLedgers`) read the head, then its parts at the same position, join them, and check the length and
  SHA-256 against the head. A part never written, or written twice, fails the read.
- **Restart**: until the head is written the subject's ledger is its earlier one, so a restarted writer computes the
  same deliveries and the same parts (same release, same work items, same old ledger) and skips the units the cursor
  counts (`part`). Parts are keyed by the event, so two events never collide.
- **The mode is chosen per event** and named in the cursor (`ledger: "parts"`), like the framing, so a restart with the
  option changed resumes an event as it began.
- **Under both preconditions.** With the old head rule a frame commits only if the database head did not move. With
  `TX2_SETTLE_PRECONDITION=progress` a frame commits only if the account's notice cursor still holds the facts it
  followed; every notice frame (parts included) changes that cursor, and only the account's notice writer writes its
  ledgers, so a frame built from a stale ledger is refused. Both are gated (2.3).
- **Per account.** Parts live in the account's own notice documents (`settlement-notices` + the account's names), so
  two accounts in the one database never share a key.
- **Pause** (`TX2_SETTLE_CONTROL=1`): the control is checked before every frame, parts included; a paused account
  wrote nothing for 2.5 s in the gate and resumed exactly.

Why not one row per item, or the items split across commits: one row per changed item costs two rows (225 µs of
estimated service each) per item, about 450 ms of writer time per subject at 1,000 forms against about 75 ms in parts;
and splitting the items across commits would let a reader see a ledger half old and half new. The save-shape contract
(`v01/SAVE-SHAPE.md`, one commit per subject's save) is kept in spirit: the subject's ledger changes in exactly one
commit, the head's; the parts before it are unreachable.

### 2.3 Gates

**`join/ledger-check.ts 72`** (no database; the notice writer's own `noticeFrame` and `noticeCandidate` over an
in-memory store that applies every frame's ops exactly and refuses a second live row for a key or a retraction of a
row that is not live). Each frame is built from the durable state alone, as after a restart. After **every** frame
every subject's ledger is read (`readLedgers`) and must be exactly its earlier ledger, or exactly its new one once its
head frame has committed. Chain per size: R2, R2 + N forms (all 72 subjects owe all N), every second form's due date
moved (every owed notice delivered again, every ledger rewritten and its old parts retracted), forms withdrawn.
**Pass** (`ledger-check-72.json`):

| Forms owed | Notices recorded (R2+N / moved) | Notice frames (R2+N / moved / withdrawn) | Frames ending inside a subject | Ledger reads checked between frames | Parts per ledger | Parts written / retracted | Largest frame estimate | `whole` ledgers |
| ---: | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| 200 | 14,400 / 7,200 | 288 / 216 / 144 | 432 | 659 | 2 | 432 / 288 | 8,000 µs | refused |
| 500 | 36,000 / 18,000 | 596 / 504 / 288 | 1,172 | 1,399 | 3 to 4 | 668 / 452 | 8,000 µs | refused |
| 1,000 | 72,000 / 36,000 | 1,152 / 864 / 504 | 2,304 | 2,531 | 6 | 1,296 / 864 | 8,000 µs | refused |

The same check under the calibrated estimate `TX2_SETTLE_COST=2500,25,55` (`ledger-check-72-cost2500.json`): pass at
all three sizes; notice frames (R2+N / moved / withdrawn) 144 / 144 / 72, 432 / 360 / 216 and 936 / 648 / 432; 365,
1,013 and 2,021 ledger reads checked between frames; largest wire 65,533 B (the wire bound closes frames), largest
service 7,976 µs; under it a 200-form ledger also fits whole, 500 and 1,000 do not.

Recorded deliveries equal the kernel's in order; for R2 + N the independent rule (`form-expect.ts`) agrees for all 72
subjects (42,720 / 106,800 / 213,600 changed values and 14,400 / 36,000 / 72,000 notices); no ledger change lost; the
parts still live at the end are exactly those of the last ledgers. `whole` mode reproduces the refusal at each size.

**`join/release-limits-gate.ts`, part `ledger`** (toy stack, `engine.mjs ha1 --experiment load-fair --diagnostic
--holder DX-ACT6` with `DX_ACT6_GATE=1 DX_ACT6_PART=ledger`), real stores, `TX2_SETTLE_FRAMES=bytes
TX2_NOTICE_LEDGER=parts TX2_SETTLE_CONTROL=1`. Per size: R2 published and settled; R2 + N forms (every subject owes
all N) published; its values writer killed after 2 frames; its notice writer then run in a child process killed after
**one** frame at a time until the first subject's head is written, and at every stop every subject's ledger is checked
old-or-new and the packets so far must be an exact prefix of the oracle's notices; a second release (due dates moved)
published while the first is half settled; the account paused (nothing written in 2.5 s), resumed; everything settled;
then: all notices equal to the oracle's (`Reference`), every ledger equal to the oracle's item states, the independent
rule on release 2, release 3's stored changes equal to the oracle's, release 2's half-written values marked superseded,
delivery to a recipient once (a second delivery adds 0), every frame at or under 8,000 µs.

**Pass at all three sizes** with `TX2_SETTLE_PRECONDITION=progress`, on the final tree (`load-fair-c133d3ee`) and before
the merge of `82ba1ca38` (`load-fair-4cfbe9aa`), with identical counts:

| Forms owed | Subjects | Stops (kill after one frame) through subject 1 / of them inside its ledger parts | Notices: release 2 / 3 / all, equal to the oracle | Delivered, then again | Ledger parts per subject | Independent rule (owing / changes / notices) | Value / notice frames, largest estimate |
| ---: | ---: | --- | --- | --- | ---: | --- | --- |
| 200 | 72 | 4 / 1 | 14,400 / 7,200 / 21,672 | 21,672, then 0 | 2 | 72 / 42,720 / 14,400 | 76 / 510, 8,000 µs |
| 500 | 24 | 8 / 2 | 12,000 / 6,000 / 18,024 | 18,024, then 0 | 3 | 24 / 35,550 / 12,000 | 74 / 363, 8,000 µs |
| 1,000 | 16 | 16 / 5 | 16,000 / 8,000 / 24,016 | 24,016, then 0 | 6 | 16 / 47,400 / 16,000 | 82 / 434, 8,000 µs |

**Under a calibrated estimate** (`TX2_SETTLE_COST=2500,25,55`, final tree, `load-fair-4f491138`): pass at all three
sizes with the same notices, deliveries, ledgers, independent counts and stored changes; frames are closed by the wire
bound (largest wire 65,515 to 65,533 B, largest service estimate 6,795 to 7,992 µs); value / notice frames 75 / 290,
50 / 259 and 50 / 339; stops inside the parts 0 (200 forms: the larger frames carry both parts and the head together),
2 and 5.

Release 3's stored changes (21,600 / 18,000 / 24,000) equal the oracle's; release 2's half-written values are marked
superseded; all ledgers equal the oracle's item states. The 200-form case also passed earlier, at an earlier commit, under
the same rule (`load-fair-a55f4fb9*`). Under the old head rule the 500 and 1,000 cases passed every check in a run the
harness then refused because I changed a source file while it ran (`load-fair-0d691820*`; not counted as a result); the
database-free check above is independent of the rule.

### 2.4 What bounds it now

The frame that holds a subject's new head also retracts the old ledger's head and parts, beside the cursor change. By
the writer's default estimate that frame fits with up to 10 old parts (7,985 µs) and not with 11 (8,224 µs); the limit
is computed from the estimate in force (31 parts under 2,500/25/55). A ledger is therefore kept to **10 parts of 10,240
characters** by default: a ledger that would need more is refused at its first write
(`FrameTooLarge: ... its notice ledger needs N parts`), not on the release after it. Packed ledger sizes on deep toy
subjects (all owing): 200 forms 12,460 characters (2 parts), 500 forms 30,672 (3), 1,000 forms 60,956 (6), 1,500 forms
91,252 (9), 1,750 forms 106,332 (11, refused). So **a subject can owe up to about 1,680 notice items**; 1,000 owed forms
use 6 of the 10 parts.

To go further the old parts would have to be retracted after the head switch, with their keys carried forward by the
new head and collected by a later frame (not built: nothing asked for more than 1,000).

Values are not bounded per subject: a subject's changed values are split by value across frames (DX-ACT4); 1,000 owed
forms are about 3,000 changed values, 9 value frames per subject by the default estimate (6 calibrated).

## 3. A release near the ceiling (`TX2_RELEASE_DOCS=ref`)

### 3.1 Decision: content-addressed definitions, not a chain of deltas

The measurements (section 1) say the cost with full documents is three copies per Publish, the 1 MiB value limit on the
marker, every read sweeping every marker, and every read compiling the document. A delta document (the change against
the predecessor, with periodic full documents) would shrink the Publish but keep the full document inside the record
every so often, and that full document must itself fit one value (so the ceiling stays near 1 MiB); and every cold
reader would replay a chain. Storing each definition once by content fixes all four costs and needs no chain: an edit
writes only the parts around it (the deltas, in effect), and any release is rebuilt from its root exactly.

### 3.2 The rule

- **Nodes.** The document is split into content-addressed nodes: *parts* (consecutive forms, or consecutive policies,
  at most 8 KiB, cut after an entry whose SHA-256 starts below 16/256, or when the next entry would pass 8 KiB),
  *pages* (consecutive part keys, at most 96, cut after a key starting below 8/256) and a *root* `{release hash, bytes,
  the eleven base rules, the form pages, the policy pages}`. Key = SHA-256 of the node's canonical JSON. Content-defined
  cuts keep an edit local: adding 20 forms to 5,000 writes 6 new nodes (16 KB).
- **Where.** Each node is one fact `lazy/definition` on the entity `<account's release entity>/definitions/<key>`, so
  every account keeps its own (ACT5's per-account names in the one database).
- **Written ahead, unfenced, once.** Publish first writes the nodes not stored yet (root last, alone), each write
  within the writer's 8 ms bound by its own estimate, without the database head fence: each write commits only if every
  node entity it creates has no fact yet (ACT5's entity guards). A write refused because another writer stored the same
  node is re-read and skipped. None of these rows is reachable until a Publish names the root, and none is ever
  retracted (definitions of every release stay readable at old pins).
- **The Publish stays one atomic permanent record** with the same four changes. Its marker carries `documentRef`
  (release hash, root key, bytes) and `oldRef` instead of the two documents; its notice event carries `documentRef` and
  `document: null`. The plan asserts at its cut that both roots are stored (they are never retracted, so stored at the
  cut means stored at the commit, which is fenced on that cut as before).
- **Readers.** `loadRelease` reads the root, its pages, its parts (64 per read), joins them, compiles, and checks the
  SHA-256 of the canonical document against the release hash; the compiled release is kept by that hash (at most 64
  releases per process). The marker reader fills `document` and `old` from it, so every existing caller is unchanged;
  `render` takes the compiled release from the cache (`prefetchWinner` loads it first in `readAt`, `readMany`,
  `calculate` and the dispatcher), and refuses to evaluate if it was not loaded. The notice journal loads it through a
  new `release` input. A release published with full documents before the option was set stays readable; the first
  Publish by reference also stores its predecessor's document.
- **Not by reference:** scheduled (future) releases still carry their document; the posting-range optimization in
  `notify1/ranges.ts` skips a release by reference (it then takes the general path, which is exact).

### 3.3 Toy measurements

`join/release-limits-gate.ts`, part `definitions` (toy stack, 8 deep subjects, two stores seeded alike: one with full
documents, one by reference; owed storage, so no settlement). For each set: R2, then the set (first), then the set plus
20 forms (follow-on). Every Publish's answers were checked for every subject against the oracle in its own store
(`Reference.check`), and the two stores' answers compared with each other (without their basis, since the stores sit at
different positions). **Pass** on the final tree (`load-fair-3f5b269b`; the same numbers at `8f8137471`,
`load-fair-7cc699a9`). Times are Mac clocks, diagnostic.

| Set | Docs | Release | Publish record (B / changes) | Writer estimate for the record | Storage WAL bytes | Definitions written ahead (writes / nodes / B) | Publish ms, incl. writing ahead (diag.) | A read after it: markers swept (rows / B) | Definitions loaded by that read (nodes / B) | Answer B | Read ms (diag.) |
| --- | --- | --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: | ---: |
| 0.25 MiB | full | first | 619,097 / 4 | 132 ms | 92,392 | — | 317 | 2 / 265,949 | — | 63,582 | 25 |
| 0.25 MiB | full | follow-on | 938,509 / 4 | 198 ms | 127,104 | — | 493 | 3 / 799,134 | — | 64,802 | 33 |
| 0.25 MiB | ref | first | 3,532 / 4 | 6.1 ms | 334,848 | 38 / 163 / 358,915 | 1,623 | 2 / 1,762 | 163 / 279,400 | 63,582 | 38 |
| 0.25 MiB | ref | follow-on | 3,536 / 4 | 6.1 ms | 56,600 | 5 / 8 / 21,407 | 406 | 3 / 2,731 | 166 / 284,950 | 64,802 | 36 |
| 0.50 MiB | full | first | 1,233,297 / 4 | 258 ms | 155,272 | — | 638 | 5 / 1,597,096 | — | 124,582 | 52 |
| 0.50 MiB | full | follow-on | **refused**: marker 1,059,385 B > 1,048,576 | — | — | — | — | — | — | — | — |
| 0.50 MiB | ref | first | 3,532 / 4 | 6.1 ms | 350,560 | 38 / 149 / 357,350 | 4,146 | 5 / 4,663 | 310 / 556,651 | 124,582 | 70 |
| 0.50 MiB | ref | follow-on | 3,538 / 4 | 6.1 ms | 42,656 | 6 / 6 / 14,242 | 787 | 6 / 5,633 | 311 / 562,011 | 125,803 | 68 |
| 1.00 MiB | full | first | **refused**: marker 1,054,100 B > 1,048,576 | — | — | — | — | — | — | — | — |
| 1.00 MiB | ref | first | 3,536 / 4 | 6.1 ms | 1,551,280 | 78 / 276 / 704,838 | 4,678 | 8 / 7,568 | 582 / 1,109,094 | 246,583 | 133 |
| 1.00 MiB | ref | follow-on | 3,541 / 4 | 6.1 ms | 73,912 | 5 / 10 / 21,540 | 1,393 | 9 / 8,540 | 587 / 1,114,840 | 247,803 | 129 |
| 1.25 MiB | full | first | **refused**: marker 1,317,200 B > 1,048,576 | — | — | — | — | — | — | — | — |
| 1.25 MiB | ref | first | 3,542 / 4 | 6.1 ms | 358,304 | 38 / 131 / 354,007 | 2,741 | 11 / 10,478 | 713 / 1,384,777 | 307,583 | 137 |
| 1.25 MiB | ref | follow-on | 3,547 / 4 | 6.1 ms | 40,936 | 5 / 6 / 19,309 | 1,366 | 12 / 11,451 | 714 / 1,390,134 | 308,803 | 200 |

How to read it:

- **The Publish record by reference is 3.5 KB and four changes at every size**: the single writer's hold for the
  record is the same at 1.25 MiB as for the small release (6.1 ms by the bulk writer's own estimate, against 132 to
  258 ms for full documents that still fit). The fence on every account's saves covers only that record.
- **The definitions are written ahead, outside the fence**, each write within the 8 ms bound: 38 to 78 writes for a
  new set (fewer nodes when earlier sets share them: the 2,000-form set reused the 1,000-form set's leading nodes, the
  5,000-form set the 4,000's), 5 or 6 writes (14 to 22 KB) for a release adding 20 forms. The "Publish ms" column on the
  Mac includes these writes; only the record is under the fence.
- **Reads stop sweeping documents**: after eleven Publishes the markers a read sweeps are 10 KB by reference against
  1.6 MB after five Publishes with full documents. A read by reference loads a release's definitions once per process
  (about 1.05 × the document) and then evaluates from the cache; the read times above are each new release's first
  read, so they include that load and the compile.
- **What a read returns grows with the policies, in both modes**: 64 KB at 1,000 policies, 308 KB at 5,000, for a subject
  owing none of the forms (section 4).
- The 50-release chain (40 forms, each release editing every ninth form's due date and adding one form and its
  policy, permille 500): every release checked against the oracle in both stores, 400 answers compared between them,
  identical. With `definitions-check.ts`, every release pair of the large-release check and a 50-release chain from
  5,000 forms rejoin byte-identical (same canonical document, same release hash), so a reader evaluates exactly the same
  compiled release as with the full document.

### 3.4 What the ceiling is now

- **Full documents (default):** between 0.50 and 0.70 MiB for a first set (the 4 MiB request, which carries each value twice) and
  about 0.5 MiB for a release that follows a set of its own size (the 1 MiB value limit on the marker). Publish refuses
  beyond either with `ReleaseTooLarge`. "About 1.3 MiB" (LARGE-RELEASE.md section 4 item 3) is corrected here.
- **By reference:** the Publish record is about 3.5 KB at any size, so neither limit applies to the definitions. Each
  node is at most 8 KiB and each write is within the writer's bound; the largest node is the root (base rules plus 66
  bytes per index page: 2.4 KB at 1.25 MiB). The root must fit one bounded write (about 15 KB of operations), which
  allows about 11 MiB of definitions in force on the synthetic forms; beyond it `stageDocument` refuses ("One
  definitions node exceeds the writer's bound"), and a third index level would lift it. Before that, the kernel's own
  cap of 8,192 forms and 8,192 policies (about 2 MiB of synthetic definitions) applies.
- **So near 1.3 MiB the store is no longer the limit; the read is.** At 5,000 policies every read evaluates 5,000
  policies and returns a 308 KB answer for a subject owing none of them (3 MB for one owing all), section 4.

## 4. Read cost with many definitions in force

Measured in section 1 (`read-cost.ts`): at 40, 200 and 1,000 policies a read evaluates every policy (40, 200, 1,000)
and returns one trace entry per policy (51, 211, 1,011 with the eleven base rules). Diagnostic evaluation: 48, 174 and
881 µs for a subject that owes nothing; 140, 551 and 3,811 µs for one that owes everything (plus 10, 24, 90 / 57, 205,
2,278 µs of serialization). Answer bytes: 5.3, 14.8 and 64 KB / 27, 124 and 619 KB.

**Does the reader need an index from a subject to the policies that can apply to it? No, not as the answer is defined.**
The answer lists a trace entry for every policy in force, including those that do not apply ("row 0" without a start
date, "row 1" outside the share); an index could skip their evaluation (about 0.9 µs each) but would have to emit the
same entries, so the answer stays linear in the policies. What an index would buy is under 1 ms per read at 1,000
policies. It is not built. If the product's answers should list only the policies that apply, that is a change to the
answer (and to the oracle and the independent rule), not an index; it would cut a non-owing subject's answer at 5,000
policies from 308 KB to about 3 KB.

What did grow faster than the policies, and is fixed by `TX2_RELEASE_DOCS=ref`:

- **Compiling the release on every read**: 7.5 ms at 1,000 policies, 30 to 34 ms at 5,000 (full documents). By
  reference the compiled release is kept by its hash (content-addressed and checked when loaded, so the cache is exact):
  once per release per process.
- **Sweeping every marker ever published**: each read's `controls()` pulls every release marker of the account, each
  with two full documents; by reference each marker is about 950 bytes (toy: 12 markers, 11,451 bytes).

## 5. What bounds a notice frame, and the settlement builder's proposals

**What closes a frame** (DX-ACT7's analysis, `act7/RUN2.md`, agrees with mine): the next whole subject would push the
estimated service over 8 ms; under the default estimate the 64 KiB wire limit never binds first. One notice frame of
the 20-form release: 3.5 ms fixed + 0.72 ms (16-row constant) + 0.28 ms (4 KiB wire constant) + 0.45 ms (cursor retract
and assert) + 0.23 ms (the packet op) = about 5.2 ms before any subject; each subject then costs 0.45 ms for its ledger
change (two ops at 5 estimated rows each), about 0.35 ms for its 1.7 KB ledger value and about 0.55 ms for its 20
deliveries (2.7 KB packed): about 1.35 ms, so 1 to 2 subjects per frame.

**Ledger parts under both limits and a calibrated estimate.** Parts travel in the same frames as deliveries, so
`fillFrame` admits them by the same `frameEstimate(...).fits`, which checks the service bound and the 64 KiB wire bound
under whatever coefficients are in force (`TX2_SETTLE_COST`, merged from `82ba1ca38`). The one fixed number, the most
parts a ledger may have, is now computed from the estimate in force (the head frame that retracts the old parts must
fit both bounds): 10 by default, 31 with 2,500/25/55, 14 with 2,500/45/70. A ledger written under a generous estimate
and replaced under a stricter one can exceed the stricter limit; that release is then refused with `FrameTooLarge`
(clear, not silent). The database-free check and the toy gate ran under the default and under 2,500/25/55 (section 2.3).

**Frame counts** (`act7/frames-account.ts`, the writers' own builders, deep subjects, R2 then R2 + N forms, every
subject owing; frames per subject):

| Forms owed | Ledger | Default estimate: value / notice frames per subject (notices per notice frame) | Calibrated 2,500/25/55: value / notice frames per subject (notices per frame) |
| ---: | --- | --- | --- |
| 20 | whole (today) | 0.203 / 0.898 (22.3) | 0.125 / 0.234 (85.3) |
| 20 | parts | 0.203 / 0.898 (22.3): identical, the ledger fits one part | 0.125 / 0.234 (85.3): identical |
| 200 | whole (today) | **refused** (the ledger alone exceeds the bound) | 2 / 2 (100) |
| 200 | parts | 2 / 4 (50) | 2 / 2 (100) |
| 500 | whole (today) | **refused** | **refused** |
| 500 | parts | 5 / 8.28 (60.4) | 3 / 6 (83.3) |
| 1,000 | whole (today) | **refused** | **refused** |
| 1,000 | parts | 9 / 16 (62.5) | 6 / 12.05 (83.0) |

(256 subjects at 20 and 200 forms, 64 at 500 and 1,000.) Under the calibrated estimate the 64 KiB wire bound closes the
frames (largest wire 65,530 to 65,533 B), and the 200-form ledger fits whole; at 500 and above the ledger alone exceeds
it under either estimate.

**Proposal: a subject's ledger change as one operation (about 15% fewer frames). Not built.** The store's write
operations are assert and retract; an assert of the new ledger without retracting the old row leaves two live rows
under the ledger's key, which every reader refuses (`Documents.rows` admits one live row per key), and a replacing
assert would need a new operation in the store's write language and the gateway, beyond these files. The 15% comes
from the estimate charging a retraction like an assertion (5 estimated rows, 225 µs); whether a retraction costs the
transactor that much is not measured (DX-ACT7's frame counters record each frame's datoms and would show it). If it
costs less, counting rows by operation kind in `frameEstimate` gives the same gain without changing what is written;
that belongs with the estimate's coefficients (`TX2_SETTLE_COST`, DX-ACT7).

**Proposal: a subject's notices as one compact record, the ledger derived when read (about 45% fewer). Not built: it
conflicts with keeping the ledger exact and cheap to read.** The notice writer needs each item's sequence and payload as
they stand after every earlier event to decide what to deliver. If the record holds only the deliveries, the state is
the fold of every earlier record of the subject (and retirements, which are not deliveries, must be recorded too), so a
subject's ledger read, and every restart, grows with the number of releases; if the record holds the state, it is the
ledger again. The ledger in parts keeps one current state per subject, switched in one commit; a compact record could
later be written in parts the same way.

## 6. Server runs (for the day a machine is rented)

Both runs use the held runner as `SETTLEMENT-FRAMES.md` section 9 does: commit = the head of
`exp/DX-ACT6-release-limits` carrying this page; build as for `PART9.md` (the w0 package from the same commit, because
the kernel's form cap changed); a fresh prepared copy for each run (about 4.4 minutes). `held-server.sh` already sets
`TX2_SWEEP_STRICT=1`.

### 6.1 Every subject owes 200 forms, settled to the end (100,000 subjects)

Two sizes. **Run A first** (one subject in ten owes 200 forms: 10,000 subjects, the same per-subject shape) because it
fits the runner's present limits; **run B** is every subject.

```sh
# Run A: one subject in ten owes 200 forms
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "TX2_SETTLE_FRAMES=bytes" "TX2_NOTICE_LEDGER=parts" "TX2_SETTLE_PRECONDITION=progress" \
  "DX_ACT3_RELEASE=forms=200,policies=200,permille=100" "DX_ACT3_SETTLE=1" "DX_ACT4_INITIAL=large" \
  "DX_ACT6_STREAM_CHECK=1" "DX_HELD_MINUTES=150" \
  "DX_HELD_WINDOWS=rolling6/39.4/0,rolling6/39.4/1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
# Run B: every subject owes 200 forms (the same, with permille=1000 and DX_HELD_MINUTES=480)
```

**Proven at toy size with these exact settings** (permille 1000, held runner on the toy stack, 8 subjects, final tree,
`load-fair-6d30c254`): settled with 2 value frames and 4 notice frames per subject (largest estimates 8,000 and 7,996 µs);
4,826 changed values and 1,608 notices equal to the oracle through the streamed check; the independent rule agrees for
8 of 8 subjects; every window's Publishes inside one second; exit 0.

Forecast, from `frames-check.ts 256` with ledgers in parts (`frames-check-256-f200.json`: R1 + 200 forms from nothing,
256 deep subjects: 154,505 changed values, 51,300 notices, 512 value frames and 1,024 notice frames, every frame at or
under 8,000 µs) and the per-frame and per-subject costs measured at 100,000 on 2026-11-23 for the small release (values
40 to 70 ms per frame, notices 25 to 40 ms per frame, 3 to 6 ms per subject; the two writers run together):

| Quantity | Run A (1 in 10 owes) | Run B (all owe) | Shows the analysis wrong |
| --- | --- | --- | --- |
| Settlement completes, every frame within the bound | yes, max estimate ≤ 8,000 µs | yes | any refusal (`FrameTooLarge` included) or any frame over 8,000 µs |
| Changed values | 6.9 million (± 3%) | 60.4 million (± 2%) | outside |
| Notice entries | 2.0 million (± 3%) | 20.0 million (± 2%) | outside |
| Value frames / notice frames | 22,000 / 46,000 (± 10%) | 200,000 / 400,000 (± 5%) | outside |
| Ledger parts written | 2 per owing subject: 20,000 | 200,000 | otherwise |
| Settlement time (both writers) | 25 to 50 min | 3.5 to 6 h | A over 90 min or B over 8 h; or under half the low end |
| Exactness | every stored change and notice equals the oracle's, streamed; the independent rule agrees for every subject | same | any difference |
| Runner memory | under 2 GiB with the streamed check | same | out of memory |
| Live windows after settlement | as SETTLEMENT-FRAMES section 9 at 39.4/s | — | — |

Run B costs a machine for 5 to 8 hours (settlement plus the streamed oracle check of 60 million changes, 45 to 135
minutes). Run A answers the question at a tenth of the cost; run B only if the owner wants the full figure.

### 6.2 A release near the ceiling published at 100,000 subjects with the nine neighbours under load

The held runner alternates R2 and R3 + N forms (N policies, one subject in ten owing all of them), twenty Publishes
per Publish window, with the nine neighbour accounts saving. Full documents cannot carry 1.25 MiB at all (section 3.4);
a full-document Publish of 2,800 forms (0.70 MiB) was refused on the toy by the request limit, so the arm uses 1,800
forms (0.45 MiB), below the accepted 0.50 MiB. Three arms, each from its own fresh prepared copy, about 25 minutes each (boot and checks 4,
enrolment and first Publish 2, six windows about 12, reopen 1, the oracle's checks of 1,800 to 5,000 policies 3 to 6):

```sh
W="rolling6/3.5/0,rolling6/3.5/1,rolling6/23.5/0,rolling6/23.5/1,rolling6/39.4/0,rolling6/39.4/1"
# Arm 1: full documents, 1,800 forms (0.45 MiB), below the largest accepted on the toy
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "DX_ACT3_RELEASE=forms=1800,policies=1800,permille=100" "DX_ACT3_SETTLE=0" "DX_HELD_WINDOWS=$W" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
# Arm 2: by reference, the same 1,800 forms (add "TX2_RELEASE_DOCS=ref")
# Arm 3: by reference, 5,000 forms (1.25 MiB) (TX2_RELEASE_DOCS=ref, DX_ACT3_RELEASE=forms=5000,policies=5000,permille=100)
```

**At toy size** (final tree, 8 subjects, the held runner's toy windows at 3.5 and 23.5 saves/s): arm 3's settings
(`load-fair-3d40c409`): every Publish record 3,691 to 3,694 bytes and 4 changes, 8 of 8 Publishes answered correctly
inside one second, no probe before its Publish, exit 0; the definitions (1.32 MB document, two releases) were written
before the first window. Arm 1's settings at 0.45 MiB (`load-fair-f9fa8533`): every
Publish record 1,111,014 to 1,111,019 bytes of operations and 4 changes (forecast 1.11 MB), 8 of 8 inside one second,
exact, exit 0; at 0.70 MiB the toy refused the first Publish by the request limit (`load-fair-c957e395`). Mac times are
diagnostic and not compared.

Predictions (against the large release of 2026-11-23 at the same rate and credit mode: first-correct p50 32 to 63 ms,
Publish pause-to-durable p50 26 to 37 ms, p99 74 to 123 ms at 39.4/s):

| Quantity | Arm 1: full, 0.45 MiB | Arms 2 and 3: by reference | Shows the analysis wrong |
| --- | --- | --- | --- |
| Publish record | adding about 1.11 MB of operations, removing about 0.56 MB, 4 changes | 3.5 to 3.6 KB, 4 changes (toy: 3,532 to 3,547) | by reference over 5 KB or more than 4 changes; full documents off by more than 3% |
| Definitions written ahead | none | first R3 + N: 60 to 75 writes (arm 2), 175 to 190 (arm 3), each within the 8 ms bound, all before the first window; every later Publish 0 (the two documents repeat) | any write after the second Publish |
| Publish pause to durable, 39.4/s | p50 100 to 300 ms on adding Publishes | p50 25 to 45 ms, p99 within 30 ms of the 20-form release | arm 2/3 p50 above 60 ms; arm 1 under 100 ms (the record would then not cost what the estimate says) |
| Neighbours' save p99, Publish window over its control, outside stall seconds | 2 to 8 times at 39.4/s; 1.3 to 3 at 3.5 | 0.8 to 1.3 (as the small release) | arm 2/3 above 1.5 |
| What a read sweeps (markers) | grows about 0.9 MB per Publish pair: about 27 MB by the last window | about 1 KB per Publish | arm 1 not growing |
| First-correct answer, subject owing none (about 90% of probes) | p50 rises with every Publish (10 to 20 ms per MB swept, plus a 10 to 15 ms compile per read): first window 50 to 120 ms, last window 300 to 600 ms, some over 1 s at 39.4/s | p50 within 15 ms of the 20-form release once both releases are loaded (first read of each release in a reader process +50 to 200 ms); answers about 110 KB (arm 2) and 308 KB (arm 3) | arm 1 flat across windows; arm 2/3 p50 above 100 ms after the first window |
| First-correct answer, subject owing all (about 10%) | as above, plus 15 to 50 ms of evaluation and serialization and a 1.1 to 3 MB answer | p99 set by these: 60 to 200 ms | arm 2/3 p99 above 400 ms |
| Within one second | arm 1 fails in the later windows | 20 of 20 per window | arm 2/3 below 19 of 20 |
| Exactness | every probe, deadline and reopened answer equals the oracle's | same | any difference |

## 7. Not verified

- Every number at 100,000 subjects and at 1 billion records; every Mac time (diagnostic).
- The writer's real service time for a Publish of a large record, and for a settlement frame near the 8 ms estimate.
- Definitions by reference beside live saves of other accounts (the unfenced, guarded writes are gated only on a
  quiet toy), and two Publishes of the same new definitions racing (the guard path is exercised by the code, not by a
  gate).
- A reader's first load of a 1.25 MiB release on a server (about 1.4 MB in about 180 nodes); a later release loads its
  whole node set again (the cache is by release, not by node).
- The held runner's streamed check (`DX_ACT6_STREAM_CHECK=1`) has run only on the toy (8 subjects, 4,826 changes and 1,608 notices); its memory at 60 million changes is a forecast.
- Real product definitions (other attributes, shared forms, policies that read more than the start date): the
  synthetic forms are 12 field names and one policy each.
- Answers listing a trace entry for every policy in force is the answer's definition today; at thousands of policies
  it, not evaluation, sets the read's size.

## 8. Options off: what is unchanged

- `frames-check.ts 256` with every option unset gives the same changed values, notices, frame counts and largest
  estimates as DX-ACT4's published run on all 11 release pairs (`frames-check-256-default.json` against
  `evidence/DX-ACT4/frames-check-256.json`).
- With `TX2_NOTICE_LEDGER=parts` a ledger of up to 10,240 packed characters is written exactly as before (same key, same
  value), so the small release and the 20-form release are unchanged by the option; only the cursor gains
  `ledger: "parts"`.
- With `TX2_RELEASE_DOCS` unset, Publish, the marker, the notice event and every reader take the old path; the only new
  behaviour on that path is the refusal of a marker or event value over the store's 1 MiB limit, which the store
  refused anyway (now before any write, with the sizes).
- Kernel: 174 of 174 tests. Lab unit tests in `actv-lazy/join` (frames, bulk, held, observations, ranges, shared save,
  admission): 24 of 24. `negative.test.ts` and `volume.test.ts` fail the same two cases on the base branch
  (`b623914a4`), unrelated.

## Files

`join/ledger-parts.ts` (mode, parts, head, reader, candidate), `join/recorded.ts` (units with parts, cursor mode,
`streamPackets`), `join/definitions.ts` (nodes, staging, loader, compiled cache), `join/account.ts` (Publish by
reference, `writeDefinitions`, value-limit refusal, marker reader), `notify1/journal.ts` (event by reference,
`release` input), `decision.ts`, `read.ts`, `dispatch.ts` (`prefetchWinner`), `store.ts` (unchanged after the rebase:
ACT5's entity guards are used), `join/archive.ts` (`storedStream`), `join/held-campaign.ts` (`DX_ACT6_STREAM_CHECK`,
definitions written before the windows), `join/large-release.ts` and `packages/w0/src/release.ts` (8,192 forms),
`join/ledger-check.ts`, `join/definitions-check.ts`, `join/read-cost.ts`, `join/release-limits-gate.ts`,
`join/frames-check.ts` (ledger mode), `ha1/local.ts` and `load1/fair-local.ts` (holder DX-ACT6).

Evidence (private, `evidence/DX-ACT6/`): `ledger-check-72.json`, `ledger-check-72-cost2500.json`,
`definitions-check.json`, `read-cost.json`, `frames-check-256-f200.json`, `frames-check-256-default.json`,
`frames-account/*.json`; toy runs as archives `load1/load-fair-*.tar.gz` with their logs. On the final tree: `c133d3ee`
(ledger gate, default estimate), `4f491138` (ledger gate, 2,500/25/55), `3d40c409` (held, 1.25 MiB by reference),
`f9fa8533` (held, 0.45 MiB full documents), `3f5b269b` (definitions gate), `6d30c254` (held, 200 forms settled, streamed
check).
Earlier commits, same checks passed: `4cfbe9aa` (ledger gate, before merging `82ba1ca38`), `7cc699a9` (definitions gate
at `8f8137471`), `daac16bd` (held, 200 forms, at `8f8137471`). Not results: `49dd4c13` and `9ff94cae` (launch settings,
then the pause set on the wrong store), `a55f4fb9` (200 forms, passed at an earlier commit), `0d691820` (500 and 1,000
passed every check but the harness refused the run: I changed a source file during it), `407808b0` (the two stores'
answers compared with their basis), `1b87c6e0` (found the 1 MiB value limit), `f1772c64` (1.25 MiB by reference passed,
but the runner fenced saves around the first Publish's definitions writes: 8.2 s on the Mac; fixed in `946ffbee8`),
`1ac87cea` and `c957e395` (full documents at 0.95 and 0.70 MiB: refused by the 4 MiB request), `33e29b73` (the
calibrated ledger gate's coverage assertion was too strict at 200 forms).

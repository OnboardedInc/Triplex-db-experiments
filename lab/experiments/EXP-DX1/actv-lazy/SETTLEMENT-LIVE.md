# Settlement beside live saves (`TX2_SETTLE_PRECONDITION=progress`, default off)

Builder DX-ACT5, 2026-11-24, branch `exp/DX-ACT5-settlement-live` from `exp/DX-ACT4-settlement-frames` (`b623914a4`).
Mac work is correctness at toy size; every Mac time here is diagnostic, every count exact. Nothing here ran on a server.

SECTION-SHORT

## 2. What the head precondition protects, from the code

Before this change every settlement frame was committed inside a transaction that first required the database's
head to be the position the frame was read at (`requireDatomicSourcePosition`, then the transactor's
`(when (and scope-wide (not= h source)) (conflict))` in `commit.clj`). In the held layout the settlement documents live
in the same database as every account's data (`Archive.open` opens the account's own scope when `s.held`), and the
head is the newest commit of the whole database (`newest-commit` in `commit.clj`). So a frame was refused by any
commit anywhere in the database between its read and its commit: a save in its own account, a save in any of the
nine others, another account's Publish or settlement frame, or this account's other writer (values against notices).

**What a frame reads, and whether a later write can change it.**

| Input | Where it is read | Can a write after the frame's read change it? |
| --- | --- | --- |
| The subjects' facts (values) | `worldsAt(..., { tx: m.cut, validTime: m.at })`: position-pinned reads at the release's own cut | No. A save after the cut has a later position and is invisible at the cut. |
| The subjects' facts (notices) | `notices.work(e, ids, ...)` evaluates worlds at `{ position: e.at }`, the Publish's own position | No, for the same reason. |
| Census page, event, marker | `memberPage(..., m.cut)`, `notices.event(n)`, the release marker on the account's release entity | No. Each is asserted once by Publish or enrolment; no code path retracts them. |
| A later release (`displaced`) | `controls(sourceAt).releases` | Yes, but it only decides when the older release's values stop (marked superseded at its next frame). A frame committed after a newer release adds one page under the older release's identity, which no reader consults; the next frame marks it superseded. That is the state the store reaches when the newer release lands just after the commit. |
| Removal marks and the removal sequence | `controls().masks` (must be empty), `readErasure`, `erased:` markers | Yes, and it matters (a protected value could be written after its removal). It is caught without the head check: every frame carries the removal-sequence ticket, which the transactor verifies at the serial cut (`TRIPLEX_ERASURE_FRONTIER`), and settlement refuses an account with marks. The held path has no other removal route (`Store.input` refuses held stores). |
| The writer's own progress: values progress `values:<seq>`; the notice cursor `notice-progress` | read at the frame's head `at` | Yes, and it is the one input that decides correctness: two frames that follow the same progress row would write two pages for one range, fork the progress (two live rows for one key, which `Documents.rows` refuses), or record notices twice or out of order. Only the settlement writers write these rows (and every notice-ledger change is committed together with a cursor change, so the ledgers are covered by the cursor). |

**So, for each case the brief names:**

1. *A save of a subject inside the frame, committed between the frame's read and its commit:* no wrong outcome. The
   frame's changed values and notices are the release's answers at the release's own position; the save is after it.
   Reads never use the stored pages (byte framing) or use them only at the release's own position (count framing),
   where the save is not visible either.
2. *A save of a subject outside the frame:* no wrong outcome, for the same reason.
3. *The release marker:* never changed after Publish. A newer release changes nothing the frame wrote; see the table.
4. *Another writer of the same release or the same notice stream* (a restart overlapping the old process, a retry after
   a lost reply, a second host, a different framing): this is the wrong outcome the precondition exists for.

**The narrowest sufficient precondition** is therefore neither per subject, nor per frame's subjects, nor the release
marker, nor the head: it is *the writer's own progress row still holds exactly the facts the frame followed*. A
per-subject check would refuse frames for saves that cannot change them (the brief's "then only that subject is
recomputed" has nothing to recompute: a subject's answer at the release's cut never changes).

**Why the guard is sufficient (from the code).** With the option, `store.commit` drops the head requirement and adds
an `EntityState` precondition on the progress entity with the fact ids read at `at` (none for a release's first
frame). `TriplesLive.transact` reads that entity inside the transaction at its own begin position and refuses if the
live fact ids differ (any change between `at` and the transaction's begin). The read puts the entity into the
transaction's entity set, which the commit function checks at the serial cut: `(when (> rev source) (conflict))` for
each entity that exists then (any change between the begin and the cut, including a rival creating the first progress
row). The retraction of the previous progress row also carries `TripleLive`, which the commit function checks against
the live rows (`(doseq [id live] ...)`). A repeated frame (same progress, same data) has the same command id and is
recognized, not doubled. Nothing else a frame reads can change in a way that alters what it writes (table above).

## 3. The option

`TX2_SETTLE_PRECONDITION=progress` (unset or `head`: unchanged). With it, both settlement writers commit each frame
with an entity guard on their own progress row instead of the head requirement (`store.ts` `commit(..., guards)`,
`archive.ts` `write(..., progress)`, `recorded.ts`). It changes nothing a frame writes, its command id, or the
framing. A release half settled under one setting is finished under the other (toy case `stop-h` then `same-p`).
Published first as commit `77a82b37f` ("Publish precondition: ...") for the release-limits builder.

## 4. Toy counts before and after (exact counts; Mac clocks diagnostic)

**Setup.** The held runner's toy stack (`engine.mjs ha1 --experiment load-fair --diagnostic --holder DX-ACT5` with
`DX_ACT3_HELD=1 DX_ACT5_LIVE=1 TX2_SETTLE_FRAMES=bytes`): one database holding ten accounts of 8 deep subjects;
account 0 publishes. Each case publishes the 20 forms and 20 policies release (every subject owes all 20: 474 changed
values and 160 notices, 2 value frames and 7 notice frames by bytes), then settles it while an open-loop save stream
of 8 s runs (the held tape; `play` with per-save credits). After each case the form-free release is published again
and settled quietly, so every case starts alike. Cases and code: `join/settle-live.ts`; evidence in
`evidence/DX-ACT5/load1/` (section 10).

**Frames, before (`head`) and after (`progress`).** "Offered" counts every frame sent to the writer, including retries.

| Saves during settlement | head: offered / refused / committed | head: settled (s) | progress: offered / refused / committed | progress: settled (s) |
| --- | --- | --- | --- | --- |
| none | 11 / 2 / 9 | 0.79 | 9 / 0 / 9 | 0.65 |
| same account, 3.5/s | 16 / 7 / 9 | 1.08 | 9 / 0 / 9 | 0.63 |
| same account, 23.5/s | 84 / 75 / 9 | 3.13 | 9 / 0 / 9 | 0.58 |
| same account, 39.4/s | 325 / 316 / 9: **none committed while the saves ran**; 20 refusals per second | 8.69, after the saves stopped | 9 / 0 / 9 | 0.57 |
| only the nine other accounts, 211.5/s (control) | 251 / 242 / 9: **none committed while the saves ran** | 11.30, after the saves stopped | 9 / 0 / 9 | 0.69 |

Even with no saves the head rule refused 2 frames: the values writer and the notice writer refused each other. With
the guard the two writers, and any number of accounts, never refuse each other (section 6).

**What this says for full size.** A frame's read-to-commit window is tens of milliseconds; at 235 to 394 saves/s in the
one database the chance of no commit landing in it is about e^(-235 x 0.04), under 1 in 10,000. With the head rule a
large release does not settle at all while the database takes saves, in any account. That is the risk named on
2026-11-24, confirmed and wider than stated: it is the whole database's saves, not the account's.

## 5. The live side

| Case (account 0 saves 23.5 or 39.4/s; 188 or 315 saves) | Saves acknowledged / refused | Account save p50 / p99 (diagnostic) | Saves whose life overlapped 0 / 1 / 2 frame turns |
| --- | --- | --- | --- |
| No settlement, 23.5/s | 188 / 0 | 15.6 / 235.6 ms (one Mac stall) | — |
| head, 23.5/s | 188 / 0 | 14.0 / 33.0 ms | 126 / 52 / 10 |
| progress, 23.5/s | 188 / 0 | 11.5 / 42.8 ms | 177 / 10 / 1 |
| head, 39.4/s | 315 / 0 | 18.7 / 76.4 ms | 7 / 205 / 96 (and 7 at 3) |
| progress, 39.4/s | 315 / 0 | 12.8 / 38.2 ms | 298 / 16 / 1 |
| Nine other accounts, 211.5/s: head | 1,692 / 0 | 145.3 / 2,319.9 ms | 52 / 1,020 / 610 (10 at 3 or 4) |
| Nine other accounts, 211.5/s: progress | 1,692 / 0 | 18.0 / 134.5 ms | 1,573 / 96 / 23 |

1. **No live save was refused in any case** (every save `acked`, none refused, expired or uncertain). Saves are checked
   per subject at the transactor; a frame writes only settlement documents, which no save reads, so a frame can never
   make a save fail. This holds with either rule.
2. **A live save waits behind at most one frame in the writer.** Each process sends one settlement frame at a time
   (the bulk queue's single turn, shared by both writers and, now, by every account it settles), and every frame is
   admitted only within the 8 ms estimated-service bound (largest admitted in every case: 7,953 µs). "Overlapped 2"
   above counts frame *turns* as the client sees them (read, evaluate, build, send, reply: tens of milliseconds on the
   Mac), not time in the writer: a save that spans the end of one frame's commit and the next frame's reading phase is
   counted twice though only one frame was ahead of it in the writer. The writer-side wait is not measurable on the Mac.
3. **The head rule's retries are themselves load.** Under the head rule refused frames go through the whole send,
   prepare and serial check again and again (up to 20 per second per writer on the toy); with the nine other accounts
   saving, their p99 was 2.3 s against 134.5 ms with the guard (Mac, diagnostic, one run each).
4. **The admission lane** (case flag `admission`, `bulk.ts` `settlementLane`): frames take a credit in the same account
   admission as saves (`play`'s bulk hook), one at a time, only while no live save waits for a credit. Toy, 23.5/s in
   account 0 plus the nine others: 9 frames granted, 11 grant checks declined because saves were waiting; settled in
   0.63 s; account save p99 144.3 ms, neighbours 209.9 ms (diagnostic). It is the strict form of "a save waits behind at
   most one frame": no frame starts while a save waits.

MULTI-SECTION

## 7. Exactness gates (toy, all passed unless marked)

Every case below compared, after settlement: every stored change with the oracle at the release's own position
(including the saves made before it, none after); for each form-adding release every change and notice with the
independent rule (`form-expect.ts`: 8 of 8 subjects owe, 474 changes, 160 notices); every notice of every release, in
order, with the oracle (cumulative); every subject's notice ledger with the oracle; and every 400 ms during the save
window a read pinned at the newest position the runner had matched to a known writer, checked exactly against the
oracle for the release in force there.

GATES-TABLE

## 8. Control and sight per account

`join/settlement-control.ts`, option `TX2_SETTLE_CONTROL=1` (unset: no read, no change).

- **State** (`readSettlement(worker)`): the account's newest owed release (sequence, name, position); values: status,
  subjects done of total, changes written, frames; notices: the event being recorded and the last one, subjects done in
  it, entries written, caught up or not; the control (paused, pace, who set it, version); this process's frames offered,
  refused and committed per writer, per second; an estimate of the value frames and milliseconds remaining (frames per
  subject so far times this process's mean frame turn).
- **Control** (`setSettlementControl(store, { paused?, paceMs?, by })`): one durable fact per account in its own
  namespace (`settlement-control`), written with a guarded commit (no head check). A worker reads it before each frame
  (cached 250 ms): paused, it sends nothing for that account; paced, the account's key in the bulk queue gets at least
  that many milliseconds between frames. Other accounts are not touched (the queue skips a paused or paced key and
  serves the next). It survives a restart because it is a stored fact.
- **Routes.** No new gateway route is needed: the control is an ordinary fact, which the write gateway's transact route
  writes and the read gateway's rows route reads; the two functions above are the SDK calls. A named route
  (`GET/POST .../settlement/<account>`) would only wrap them.
- **What the console could show** (not changed): per account, a row with the release, a progress bar of subjects done
  of total for values and for notices, frames refused in the last minute, the estimate of time remaining, and pause,
  resume and pace controls; a database view listing the accounts with settlement in progress.
- **Toy** (case `pause-p`): PAUSE-RESULT

## 9. Server runs (for the day a machine is rented)

SERVER-SECTION

## 10. Not verified

NOT-VERIFIED

## Files

`join/frames.ts` (`preconditionMode`), `store.ts` (entity guards; per-account names, `HeldSource.namespace`),
`join/archive.ts` (guarded write, `Contest` counts, `stopAt`, queue key per account), `join/recorded.ts`,
`join/settlement.ts` (precondition and control passed through), `join/bulk.ts` (hold, per-account pause and pace,
external turns, `settlementLane`), `join/bulk.test.ts` (5 new tests), `join/settlement-control.ts`,
`join/settle-live.ts` (the toy phase and the server mode), `join/settle-child.ts` (held child killed at a moment),
`join/held-ledger.ts` (adopting a killed child's frames), `join/held-campaign.ts` (hook, `expected` and
`seedPositions` exported, per-account positions), `join/account.ts` (per-account names, enrolment of a further
account), `ha1/local.ts` (holder DX-ACT5).

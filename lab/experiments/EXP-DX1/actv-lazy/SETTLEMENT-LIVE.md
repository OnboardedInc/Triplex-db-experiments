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

SECTION-REST

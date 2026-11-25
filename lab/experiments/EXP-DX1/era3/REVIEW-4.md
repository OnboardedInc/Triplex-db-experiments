# Fourth adversarial review: the per-account removal with two boundaries (DX-ERA3, 2026-11-25)

Reviewer DX-ERA3, branch `exp/DX-ERA3-removal-review`, which merges `origin/exp/DX-ERA2-removal-per-account` at
`bd4ec0d1a` (gateway code at `f8725b97b`). **This review is pinned to `bd4ec0d1a`.** The builder has since pushed
`2d05e00c0`, `17e50baf3` and `f77bc6d85` on top of it; nothing on this page before section 5 was run against those
commits. The removal code was not changed. This pass adds:

- `era3/attack4.clj`: cases Q1 to Q11, the save line's R2-2 on every mode, and a fourth fuzzer whose schedules choose
  each gateway's boundary, put back older copies of the removal log and call the rebuild route;
- `era3/stack4.sh` and `era3/stack4-ack.mjs`: a data restore on each boundary (with a control), and the
  acknowledgement test following what each cached Reach session's client holds;
- a rerun of the second and third reviews' cases on the commit boundary;
- Q9 and Q10, which verify and extend two findings of the derived-copies review (`era5/REVIEW.md` at `a8213bc33`):
  B5 (a cache keyed on the published sequence, on the commit boundary) and B2 (one pending removal stops all key
  deletion).

Conditions: Mac only, toy sizes, the lab VM shared with other builders; every time is diagnostic. The code diff
(`3edb9f5d9...bd4ec0d1a -- packages/`: `erase.clj`, `main.clj`, `removal_commit.clj`) was read before the page's
sections 16 and 17. Predictions were written at 02:19 EST, before the first run. Every container ran the pinned
runtime image `sha256:21a67288007d...` with this branch's gateway source mounted (PostgreSQL `sha256:526f86d93c6e...`
on the stacks), recorded per run. Written 2026-11-25, 02:33 to 03:06 EST.

## Page 1, for the owner

**Is there a break? Yes: one that stops a database for good, one that drops protection, and one that keeps keys
alive. None of them answers a removed value to a plain read after its acknowledgement.**

- **No exposure after the acknowledgement.** In every test on both boundaries (cases, 40,000 fuzzer schedules and
  6,000 more on the composition with the save line's import, two acknowledgement stacks with 7,929 reads after 40
  acknowledgements), no read answered a removed value after its removal was acknowledged, and no Reach client held
  one.
- **How sure:** the three findings below reproduce every time. The first is confirmed on a real stack with a
  control; the other two in-process on both boundaries, unsealed and sealed.

**The three most serious findings**

1. **Z1 (high, commit boundary only): an ordinary data restore stops every write of the database, for good.**
   - **What happens:** the data is restored from a backup that is missing at least one save made before a removal.
     The restore route replays the removal at the next free position, not at its published one, so the replayed
     record's text differs from the log's. The commit boundary then sees "the data and the log disagree" and refuses
     every save, frame, removal, and the rebuild route itself: 503 `RemovalLogConflict`. Reads are served (masked).
   - **No route out:** the rebuild route refuses too. The only exit I can see in code is to delete the removal log and
     rebuild it whole from the data, which runs into Z2.
   - **Why it is common:** a backup is almost always older than the last few saves. The control (a backup exactly
     one position before the removal) works.
   - **The log's boundary:** writes are normal after the same restore; only the rebuild route refuses
     (503 `RemovalLogConflict`).
   - **Where:** `erase.clj` 304, `(assoc entry "position" (inc head-position))`; the agreement check
     `removal_commit.clj` 164 and its fall-through at 173.
   - **Test:** `BOUNDARY=commit era3/stack4.sh <out> <bodies> restore-shift` (control: `restore-noshift`).
   - **Still present at the builder's newest commit `f77bc6d85`** (the boundary as a database setting): same stack,
     same refusals (section 5).
2. **Z2 (high, both boundaries): rebuilding a missing log can drop a protected attribute.**
   - **What happens:** the removal log is lost. The rebuild route writes it from the data, taking the policy from the
     request body, and only checks that the policy covers attributes that were already removed. A policy that omits
     a protected attribute never removed so far is accepted.
   - **Then:** that attribute's values can no longer be removed (400 `EraseNotProtected`) and are still answered.
     With sealed storage, its new values are stored in clear (2 native copies in clear per save).
   - **Who can do it:** any caller that reaches the database's v2 routes; the gateway checks nothing else
     (`main.clj` 434).
   - **Where:** `removal_commit.clj` 727.
   - **Test:** `attack4.clj` `q2` (`ERA3_PHASES=q2`), 4 variants: 8 of 8 oracles fail.
3. **B2, verified and extended (high, sealed, both boundaries): ordinary requests keep one removal pending, and
   while it is pending no published removal's keys are deleted.**
   - **What happens:** the key-deletion pass reads the removal log with `privacy/cut`, which refuses while a removal
     is pending, and the refusal is swallowed (`envelope.clj` 208). So every published removal's keys stay on disk.
   - **How long, measured (Q10):** after a removal stops part-way, 8 ordinary requests (reads of the removed subject
     and of others, a Reach read, the journal, a save of another account, frames naming other accounts) each left an
     earlier, published removal's key in place, on both boundaries.
     - Log boundary: stopped after its intent or its declaration, the key stays until a write it can reach or a
       resend; stopped after its commit in Datomic, the first read publishes it and the key goes.
     - Commit boundary: at all three stop points the key stays. Reads never complete it.
   - **It lasts longer because of Z3:** some refusals that should start the pending removal's completion lose their
     tag and never start it (`storage.clj` 597; a delivery into a database with a removal in flight; a frame naming
     an account declared by a removal whose selection there is empty).
   - **Test:** `attack4.clj` `q10` (`ERA3_PHASES=q10`, `TRIPLEX_ERASURE_SHRED_GRACE_MS=0`), 6 variants: 5 fail, on
     both per-account modes.
   - **Fixed after this review's head:** at `17e50baf3` (which contains the builder's `2d05e00c0`) the same 6 runs
     keep no key (section 5). Z3 is unchanged there.

**Other findings** (section 1): Z3, a refusal that loses the tag that would complete a pending removal; Z4 with B5,
a Reach session on the commit boundary keeps the value between commit and publication; Z5 and Z6, low; Z7, found on
the builder's newer commit: a creation with no frame source escapes the R2-2 fix; R2-2 judged in section 2 (f).

**One recommendation: give every stuck removal state a way out that does not wait for a particular client request.**
Z1 (no exit from `RemovalLogConflict`), B2 with Z3 (a pending removal that nothing ordinary completes) and Z5 (a read
gateway that cannot publish refuses every read) are the same defect: the rule waits for a request that may never come.
A per-database completer that finishes any pending removal within a bounded time, a key-deletion pass that skips
pending removals instead of stopping, and an operator route out of `RemovalLogConflict` that cannot change the policy
would close all four.

**Should the commit boundary become THE rule, with the log's boundary code deleted? Yes, eventually; not now.**

- **Why it is the right direction:**
  - Reads never write the log, so a read gateway without log access serves (Z5 does not happen).
  - With the log two removals behind, a commit gateway served masked reads and its next removal caught the log up,
    while a log gateway refused everything (Q5a).
  - The fuzzer found no exposure on it, alone or mixed with log gateways.
- **Not safe now. Fix first, in this order:**
  1. **Z1.** Agreement must survive a restore replay: replay the published text at its published position, or
     compare entries without the position. Give `RemovalLogConflict` an operator route out.
  2. **Z4 with B5 (Q1, Q9).** Between a removal's commit and its publication, a Reach session at a pinned basis is
     told "keep your copy" and keeps the value. The served sequence stays the published one, so the Reach witness and
     the SDK's stamp do not change. That breaks this boundary's own promise (page 16.4: masked from the commit), and
     on this boundary nothing read-driven ever publishes the removal. The witness must change at the commit.
  3. **The boundary as a database setting, not a per-process switch.** In a mixed fleet the same database answers
     503 on one gateway and 200 on another at the same moment (Q5a), and Reach sessions behave differently per gateway
     (Q5b). The builder made this change in `f77bc6d85`, after this review's head; section 5 ran only the restore
     stack on it.
  4. **Z2, Z3 and Z7 apply to both boundaries** and must be fixed whichever boundary stays (B2 also did; it is fixed
     at `17e50baf3`).

## 1. Findings

| ID | Severity | Boundary | What | Where | Test | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Z1 | High | commit | A data restore from a backup missing a save before a removal: the replay lands at another position, every write, removal and the rebuild route answer 503 `RemovalLogConflict` with no route out. Log boundary: the rebuild route alone refuses | `erase.clj` 304; `removal_commit.clj` 164, 173, 712 | `stack4.sh restore-shift` (control `restore-noshift`) | Stack, with a control |
| Z2 | High | both | The rebuild route for a missing log accepts a policy without a never-removed protected attribute: its values can no longer be removed and are still answered; sealed: new values stored in clear | `removal_commit.clj` 727; `main.clj` 434 | `q2` | In-process, 4 variants |
| B2 | High (sealed) | both | One pending removal stops the deletion of every published removal's keys; 8 ordinary requests in a row keep it pending (commit boundary: at every stop point; log boundary: before its commit in Datomic) | `envelope.clj` 195-208 | `q10` | In-process, 5 of 6 fail; other review's finding, verified |
| Z3 | Medium | both | A refusal by a pending removal raised in the save path is rewrapped as 400 `TransactionRejected`: the tag that starts the removal's completion is lost. A delivery into a database with a removal in flight, and a frame naming an account declared by a removal whose selection there is empty, never complete it. The claims of `e921f3ef1` (page 15.5) and M2/M4 fail | `storage.clj` 597 (rethrow list); `removal_commit.clj` 282, 288; `main.clj` 513 | `q7`, `q8` | In-process, both boundaries |
| Z4 | Medium | commit | Between a removal's commit and its publication, a Reach session at a pinned basis gets a hit and its client keeps the value. Contradicts page 16.4; TARGETS 7.1 (after the acknowledgement) still holds | `removal_commit.clj` 170 (the sequence unchanged); `reach.clj` 315, 357; `DatomicClient.ts` 625-637, 913-930 | `q1`, `q9`, `q5` (b) | In-process |
| B5 | Medium | commit | The other review's cache finding: of 15 read routes checked with the removal paused after its commit, only the pinned Reach session leaves the value with its reader (Z4); every other route answers it masked | as Z4 | `q9` | In-process, verified |
| Z5 | Low | log | A gateway that cannot write the removal log answers 400 `GatewayError` to every read of a database with a removal committed and unpublished, until another gateway publishes it; 400 tells a client not to retry | `removal_commit.clj` 190; `main.clj` 509 | `q4` (c) | In-process |
| Z6 | Low | both | A delivery naming a nonexistent source answers 400 `GatewayError` with Datomic's text ("Could not find ... in catalog"), so a caller learns whether a database name exists | `main.clj` 490 | `q7` | In-process |
| R2-2 | Medium | both | The save line's finding on this rule: the racing creation is refused; the same frame sent after the removal and the client's replay are stored on every mode | see section 2 (f) | `r22` (gate `creation-race`) | Measured; judged below |
| Z7 | Medium | both | Found on the builder's newer `17e50baf3`, rerun on `bd4ec0d1a`: a creation that carries no frame source escapes the R2-2 fix. Racing a removal of its subject it is answered 409 `CasConflict` (replayable), and the same frame after the removal is stored. The SDK sends no source for its optimistic commits | `removal_commit.clj` at `17e50baf3` 703 (`(when (integer? source)`); `DatomicStorageAdapter.ts` 449 | `q11` | In-process, both boundaries, both commits |
| E9 | (known) | both | The second review's derived copy recorded before a removal: still not reached, now also on the commit boundary | `era5` work | `e9` | Fails 2 of 2 on each boundary; the builder's derived seal addresses it after `bd4ec0d1a` |

## 2. The coordinator's list, item by item (what I ran)

### (a) The commit boundary

- **Can the entry in the data differ from what publication writes? Yes, after a data restore (Z1).**
  - Ran: `stack4.sh` on both boundaries, with a backup taken before one extra save (`restore-shift`) and a control
    without it (`restore-noshift`), each followed by reads, saves, a frame, a removal and the rebuild route, then
    again after 20 s.
  - Commit boundary, shifted: the removal was published at position 5 and replayed at 4. A read of the removed
    subject answered masked (value 0 times). Then every write was refused, including 20 s later:

    | Step | Shifted restore | Control |
    | --- | --- | --- |
    | A save before the restore route | 503 `RemovalDataBehind` | 503 `RemovalDataBehind` |
    | The restore route | 200 | 200 |
    | A read of the removed subject | 200, value not answered | 200, value not answered |
    | A save of another account / another subject | 503 `RemovalLogConflict` | 200 |
    | A frame naming no account | 503 `RemovalLogConflict` | 200 |
    | A removal | 503 `RemovalLogConflict` | 200 |
    | The rebuild route | 503 `RemovalLogConflict` | 200 |
    | A save 20 s later | 503 `RemovalLogConflict` | 200 |

  - Log boundary, shifted: every step 200 except the rebuild route, 503 `RemovalLogConflict`.
  - In-process: the fuzzer's restores of the log (a pending copy, a copy behind) never produced
    `RemovalLogConflict` or `RemovalDataBehind` in 40,000 schedules.
- **A reader with a lagging view.** Ran: Q5a (the log two removals behind) and the fuzzer's `:b-read` dimension.
  The commit gateway served masked; the log gateway refused with 503 `RemovalLogBehind`. No removed value answered.
- **Pinned and history reads at older positions.** Ran: Q9, both boundaries. Current, history, pinned, a batch of two
  IDs, a read through a snapshot handle taken before the removal: all masked from the commit on the commit boundary,
  and from the read's own publication on the log boundary.
- **Every route and cache (B5).** Ran: Q9, the removal paused after its commit in Datomic, each route read once
  before (to fill every cache) and once after. Results in section 2.1. The parsed-entity cache and the definitions
  cache are filled by the "before" reads; the second-gateway Reach session is Q5b; ID lists and the sweep ran with
  `TX2_ID_LISTS=1 TX2_SWEEP=1`; the sweep refuses to project a protected attribute (409 `ProtectedValueLookup`)
  before and after. "Find" (`v1 q`) refuses protected attributes by code (`lean-query/assert-unprotected!`) and was
  not run.
- **Sealed key destruction timing.** Ran: Q10 (section 2.2), and the sealed fuzzer runs. Keys of a published removal
  go at the next pass when nothing is pending (control: 6 of 6). B2 holds them otherwise.
- **The two states that refuse writes only:**
  - **Which writes:** every write `check-writes!` guards (`removal_commit.clj` 218, called from `main.clj` 450 and
    481): saves, frames, deliveries, removals, and the rebuild route (712-717). Reads are served masked.
  - **How long:** `RemovalDataBehind` until the restore route runs (one call on the stack). `RemovalLogConflict`
    until an operator deletes the log and rebuilds it (read from code, not run).
  - **Can ordinary requests put a database there, or keep it there? Put: no.** 0 of 40,000 fuzzer schedules and
    0 case requests were answered either code. **Keep: once there, `RemovalLogConflict` never ends by itself (Z1).**

### 2.1 Q9: every read route with the removal paused after its commit (B5)

Ran: `q9`, both boundaries, on the per-account and subject-check modes (the same results on both), `TX2_ID_LISTS=1
TX2_SWEEP=1`, removal of subject a1 stopped after its commit in Datomic. Each route read once before the removal
(filling the gateway's caches) and once after the stop. "Value" means the reply carried the removed value; for a Reach
session it means what the client holds after the reply (a hit keeps the copy it had). Rerun finished at 02:48 EST
after two inputs of mine were wrong in the first run (the Reach read at the current basis and `entity-transactions`
were refused 400 before and after); the other 13 routes gave the same results both times.

| Route | Before | After the commit, log boundary | After the commit, commit boundary |
| --- | --- | --- | --- |
| `v1 read`, current | value | masked (this read published the removal) | masked |
| `v1 read`, history | value | masked | masked |
| `v1 read`, pinned at the position before the removal | value | masked | masked |
| `v1 read`, a batch of two IDs | value | masked | masked |
| `v1 read` through a snapshot handle taken before the removal | value | masked | masked |
| `v2 reach`, a session at the pinned basis | value | masked, entity sent again | **hit: the client keeps the value** |
| `v2 reach`, a session at the current basis | value | masked | masked (the basis moved) |
| `v2 reach-many` at the pinned basis | value | masked | masked |
| `v2 transactions` (journal page) | value | masked | masked |
| `v1 log` feed, `v2 entity-transactions`, `v2 ids`, `v2 sweep` (IDs) | no value (by design) | no value | no value |
| `v2 sweep` projecting the protected attribute | 409 `ProtectedValueLookup` | the same | the same |
| `v2 erasure-frontier` sequence | 0 | 1 | **0** |

- **So B5 holds on this head in exactly one place, the Reach session witness** (`reach.clj` 315: the witness is
  `[position t sequence]`; at a pinned basis only the sequence can change, and on the commit boundary it does not
  change until publication). The SDK's Reach cache uses the same stamp from `x-triplex-erasure-seq`
  (`DatomicClient.ts` 625-637, 913-930) and keeps its entity on a hit (read from code).
- The gateway-side caches these routes use (the parsed-entity cache, the recent-entity cache, the pinned shortcut,
  the ID memo, the definitions) were exercised by the "before" reads, and every route answered masked after the
  commit. I did not read their counters, so "filled" is inferred, not measured.
- **The SDK's row cache** holds rows only as write preconditions (`DatomicStorageAdapter.ts` 123-147, 683), not as
  answers to reads; not a read route.

### 2.2 Q10: how long ordinary requests keep a removal pending, and every key with it (B2)

Ran: `q10`, sealed, the key-deletion grace set to 0, both boundaries, on the per-account and subject-check modes (the
same results on both). Removal R1 published; R3 published; then R2 (a
third account) stopped at one of three points. After each ordinary request, one key-deletion pass ran and R3's key file
was checked.

| R2 stopped | Boundary | Ordinary requests, all answered 200 | After how many was R3's key still on disk | What completed R2 | R3's key then |
| --- | --- | --- | --- | --- | --- |
| after its intent | log | 8 | 8 of 8 | a frame naming no account (503, tagged) | deleted |
| after its declaration | log | 8 | 8 of 8 | the same | deleted |
| after its commit in Datomic | log | 8 | 0 (the first read published R2) | the first read | deleted |
| after its intent | commit | 8 | 8 of 8 | a frame naming no account | deleted |
| after its declaration | commit | 8 | 8 of 8 | the same | deleted |
| after its commit in Datomic | commit | 8 | 8 of 8 | the same | deleted |

- **The ordinary requests:** a read of R1's removed subject, a read of R2's own subject, the journal, a save of a fourth
  account, a frame naming another account, a frame naming the fourth account, a Reach read of another subject, the
  first read again.
- **Control:** with nothing pending, R1's key was gone after one pass in all 6 runs.
- **How long, then:** on `bd4ec0d1a`, as long as no request arrives that the rule makes complete R2: a write R2 can
  reach (a frame naming its accounts or none), another removal, R2's resend, or (log boundary, R2 already committed in
  Datomic) any read of the database. Nothing else ends it and there is no timer. Ordinary traffic on other accounts can
  keep every published removal's key alive indefinitely.

**Other swallowed refusals in the removal, publication and key code** (read from code at `f8725b97b`):

| Where | What is swallowed | Effect |
| --- | --- | --- |
| `envelope.clj` 208 | Every failure of the key-deletion pass for a database: a pending removal (B2), an unreadable log, a failed delete on disk or in PostgreSQL | Keys stay; no log line, no count |
| `envelope.clj` 214 | A failed refill of a sealed database's key batch (PostgreSQL) | Shows up later as failed saves |
| `envelope.clj` 223 | Any failure of the whole pass, in the worker loop | Same as 208 |
| `storage.clj` 597 | Not swallowed, rewrapped: `ErasureFrontierUnavailable` with `:removal-pending` leaves as 400 `TransactionRejected` without its tag | Z3: the pending removal's completion never starts |
| `removal_commit.clj` 674 | A failed completion (`complete-pending!`): logged with its code, not retried | The next request must try again |
| `removal_commit.clj` 756 | The start check: logged as `"Unverified"` | Visible, acceptable |
| `privacy.clj` 177 | Any non-typed failure reading the log becomes 503 unavailable | Cause lost, not swallowed |

### (b) The rebuild route

- **Who may call it:** any caller of the database's v2 routes, when the per-account guard is on (`main.clj` 434). It
  checks nothing about the caller, like `protection`.
- **A policy listing fewer attributes:** Z2. Ran: Q2 on both boundaries, unsealed and sealed. A policy omitting an
  attribute already removed is refused (409 `ProtectionPolicyMismatch`); one omitting a never-removed attribute is
  accepted (200), after which that attribute's removal answers 400 `EraseNotProtected`. Read from code, not run: a
  policy claiming `sealed: true` over clear data is accepted (only the reverse is checked, 729).
- **Racing a removal:** the fuzzer's `:rebuild :while-pending` (10,048 of the 40,000 schedules): 200 each time,
  0 violations.
- **A second rebuild; a stop between appended entries:** Q3. A rebuild stopped after its first of two entries leaves
  the log one behind; reads meanwhile: log boundary 503 `RemovalLogBehind`, commit boundary 200; no value answered on
  either; the next rebuild finishes (200, head 2), and a frame and a removal then answer 200.
- **Against restored older data:** the restore stacks (Z1): refused with 503 `RemovalLogConflict` on both boundaries
  after a shifted restore; 200 in the control.
- **Rebuild, then restore of an older log:** the fuzzer's restore dimension after a rebuild. A read on the log gateway
  after the restore: 503 `RemovalLogBehind` (5,093 + 769 schedules), else 200 masked (4,233); on the commit gateway:
  200, masked (9,982). The following rebuild normalised all 20,077. 0 violations.

### (c) Publish-first reads (the log's boundary)

- **Can a read wait forever?** No longer than the removal lock is held. Q4a: the starter held the lock in its
  publication for 1.5 s; the read waited 1,511 ms and answered masked.
- **Can it time out into serving the value?** No. `publish-for-read!` (`removal_commit.clj` 190) publishes or fails;
  if the removal is still pending afterwards it answers 503. It never falls back to the log's older cut.
- **A read gateway that cannot write the log:** Z5. Q4c: reads of the removed subject, another subject and another
  account all answered 400 `GatewayError`. The value was not answered.
- **A storm of reads:** Q4b: 50 concurrent reads, each finding the removal committed and unpublished: 50 answered 200
  masked, one publication, 37 ms in all.
- **The read failing after it published:** read from code: the removal stays published and acknowledged to the next
  resend; the read answers 503. Not run with a stop at that point.

### (d) A mixed fleet

- **Ran:** Q5a, Q5b, and the fuzzer, whose schedules choose the boundary of the gateway that starts the removal, the
  one that completes it and the one that reads (about 50/50 each over 40,000 schedules).
- **Result:** no removed value answered after its acknowledgement; 0 violations. The fleet does behave differently
  per gateway:
  - Q5a: the log two behind. Log gateway: reads and removals 503 `RemovalLogBehind`. Commit gateway: reads 200
    masked, a removal 200 (catches the log up to head 3). Then the log gateway serves.
  - Q5b: a removal committed on the log gateway and read on the commit gateway: the Reach session gets a hit (Z4),
    a plain read is masked, nothing publishes; a frame then completes it (503 tagged). Committed on the commit
    gateway and read on the log gateway: the session gets the entity again, masked, and the read publishes it.
- **The earlier build beside each boundary: not run.** Read from the diff: an earlier gateway (`3edb9f5d9`) has no
  `check-writes!`, so it accepts writes while the data is behind the log; it has no publish-first read; and it
  answers deliveries from a source with a removal pending without the tag. The second is allowed before the
  acknowledgement (TARGETS 7.1). The first needs a stack with two images and was not built.

### (e) M2 and M4: deliveries with removals pending on both sides

- **Ran:** Q7, both boundaries: database X and database Y, each with a removal stopped after its declaration; deliveries
  X to Y until one answers 200 (at most 4), then Y to X.
- **Result: Z3.** The first delivery is refused 503 with the tag naming the source, and completes the source's
  removal. Every later delivery is refused by the recipient's own pending removal as 400 `TransactionRejected`, which
  completes nothing, although its message says "this gateway completes it". After 4 deliveries in each direction the
  recipient's removal was still pending and no delivery had committed.
- **A nonexistent source:** 400 `GatewayError`, "Could not find s2-QQQQ... in catalog" (Z6). An unreachable source
  was not run separately.
- **Does naming the source in the refusal leak anything?** No. Both refusal messages name no database (checked on
  every reply); the source's name is only in the response's error data used inside the gateway.

### (f) R2-2 (`s5/REVIEW-2.md` at `9dc800e7b`)

Ran: the gate case `creation-race` on every mode (database-wide, per account on each boundary, subject check),
both writers:

| Step | Database-wide | Per account, either boundary |
| --- | --- | --- |
| The creation the removal landed inside | 409 `ErasureFrontierChanged` | 409 `CasConflict` |
| The same frame sent after the removal (its source before it) | 200, stored | 200, stored |
| The client's replay (fresh source, new operation ID) | 200, stored | 200, stored |

- **Which of these store a value the removal should have covered?**
  - The racing creation: refused everywhere. Correct.
  - **The same frame after the removal: yes.** Its source is before the removal, so it was decided without seeing
    it. The save line refuses it (its F4, `ErasureReplayDeclined`); this branch does not have F4.
  - **The replay: yes in effect, on the per-account modes.** `CasConflict` is the answer the SDK replays by itself,
    so the client's value framed before the removal is stored after it without the caller choosing to. On the
    database-wide mode the answer is `ErasureFrontierChanged`, which the SDK does not replay.
  - A new save with a fresh source sent later by a caller's choice: not covered, by the rule's definition.
- **The builder's three-part proposal (page 17.6):**
  1. **Refuse at the serial point any save whose own source is older than the last removal of a subject it writes,
     with the terminal `ErasureReplayDeclined`: right.** It also turns the race's `CasConflict` into a terminal
     answer, which removes the automatic replay. **One gap, now confirmed (Z7):** a creation can omit its source (the
     SDK does for its optimistic commits, `DatomicStorageAdapter.ts` 449), and the builder's implementation of part 1
     at `17e50baf3` skips such a save (`(when (integer? source) ...)`). Q11: the race 409 `CasConflict` and the same
     frame after the removal 200, stored, on both boundaries. A missing source must count as older than every
     removal of the subjects the save writes.
  2. **Record the command as declined, so a resend under the same command is refused: right, but it works only if
     the SDK keeps the command ID across its replay.** If it mints a new one, part 2 changes nothing.
  3. **A fresh save with a new operation ID: the owner's call.** Refusing it means a permanent tombstone per removed
     subject, which changes what removal on request means.

### (g) The fuzzer

- **Ran:** `fuzz4`, 40,000 schedules: 10,000 each on the per-account and subject-check modes, unsealed and
  sealed, seeds 4101, 4201, 4301, 4401; and 6,000 (3,000 per mode) on the composition with the save line's import
  (`TX2_IMPORT_WHOLE_SUBJECT=1`, seeds 4701 and 4801).
- **Dimensions added this round:** the boundary of the gateway that starts the removal, that completes it, and that
  reads after it; a log restore (none, a pending copy, a copy behind); the rebuild route (none, while pending, after);
  plus the third fuzzer's stops, slow steps, late arrivals, second gateway and fresh caches.
- **Result: 0 violations.** 377,220 oracles over the 40,000 schedules; 57,228 over the 6,000 composition schedules
  (the save line's import at `d4411c77b` merged with `bd4ec0d1a`). No schedule's request was answered
  `RemovalLogConflict` or `RemovalDataBehind`.
- **Then on a stack:** the fuzzer flagged nothing, so the stacks took the two most suspicious classes from the cases:
  a Reach session cached across removals (`stack4.sh ack4`, 20 removals per boundary, 4 readers) and data restores
  (3 stacks, above).

  | Boundary | Reads after an acknowledgement | Value answered after | Reach hits after | Clients holding the value after |
  | --- | --- | --- | --- | --- |
  | commit | 4,519 | 0 | 1,516 | 0 |
  | log | 3,410 | 0 | 1,157 | 0 |

### Rerun of the earlier reviews' cases on the commit boundary

- Third review K2 to K10: 12 oracles, 0 violations.
- Second review E1 to E9: 50 oracles, 2 violations, both E9 (the derived copy, unsealed and sealed), the known open
  finding; nothing new. Control: E9 alone on the log boundary at the same head fails the same 2 of 2.

## 3. What I could not test

1. **The earlier build beside each boundary** (item d): needs two runtime images on one stack.
2. **A real backup older than several removals.** The restore stacks used one removal; with several, each replayed
   removal shifts, and I expect Z1 the same way. Not run.
3. **An operator deleting the log and rebuilding it after Z1** (the only exit I can see): not run.
4. **A read failing after it published, and an unreachable delivery source** (items c and e): read from code only.
5. **PostgreSQL key deletion for B2:** Q10 used the file authority. The pass is the same function on both, and the
   swallowed refusal is before the branch between them.
6. **Times:** every time on this page is from the shared Mac VM and diagnostic only.
7. **Anything after `bd4ec0d1a`**, unless section 5 says otherwise.

## 4. Tests, how to run them, evidence

- In-process: `ERA3_MAIN=4 bash lab/experiments/EXP-DX1/era3/run.sh <out> <off|on|subject> "<phases>"`, phases from
  `q1 q2 q3 q4 q5 q7 q8 q9 q10 q11 r22 fuzz4`.
  - Another commit's gateway source: `ERA3_SOURCE_REF=<commit>` (archived from this checkout; section 5 used it).
  - The commit boundary for the earlier reviews' cases: add `ERA3_EXTRA_ENV=TX2_REMOVAL_COMMIT_BOUNDARY=1`.
  - Q9 and Q10: `ERA3_EXTRA_ENV="TRIPLEX_ERASURE_SHRED_GRACE_MS=0 TX2_ID_LISTS=1 TX2_SWEEP=1"`.
  - The fuzzer: `ERA3_N`, `ERA3_SEED`, `ERA3_BLOCK=200`, `ERA3_SEALED=1`; the composition adds
    `ERA3_SOURCE=<a merge with the save line>` and `TX2_IMPORT_WHOLE_SUBJECT=1`.
- Stacks: `BOUNDARY=<commit|log> bash lab/experiments/EXP-DX1/era3/stack4.sh <out> <bodies> <scenario>`, the scenario
  one of `restore-shift`, `restore-noshift`, `ack4`;
  `SOURCE_REF=<commit>` runs another commit's gateway source. The bodies come from `ERA3_MAIN=2 ... run.sh <dir>
  subject bodies2`. Predictions are in the script's header, written before the first run.
- Evidence: the archive `DX-ERA3-4.tar.gz` in the lab's evidence folder for this reviewer (outside the repository):
  each run's log, the image ID it ran, its source hash and the predictions file.

## 5. The breaks rerun on the builder's newer commits

Asked: "if you finish early, rerun your breaks on its newer head and say which commit". The builder pushed three
commits after `bd4ec0d1a` while this review ran: `2d05e00c0` (B2), `17e50baf3` (R2-2 cases 1 and 2) and `f77bc6d85`
(02:36 EST: the commit boundary as a one-way setting in the database).

- **In-process cases at `17e50baf3`** (`ERA3_SOURCE_REF=17e50baf3`, the tests unchanged). It is the newest commit
  where the boundary is still a per-process switch, which my in-process emulation of two gateways needs.
- **The restore stack at `f77bc6d85`** (`SOURCE_REF=f77bc6d85`, `BOUNDARY=commit`, which on that commit lets the
  gateway move the database to the commit boundary when it moves it per account).

| Finding | `bd4ec0d1a` (this review) | `17e50baf3` | `f77bc6d85` |
| --- | --- | --- | --- |
| Z1 restore with a shift | every write refused for good | not run | **unchanged:** after the restore route every save, frame, removal and the rebuild route 503 `RemovalLogConflict`, also 20 s later; reads 200 masked (stack, 02:57 EST) |
| Z2 rebuild drops a protected attribute | 8 of 8 oracles fail | 8 of 8 fail | not run |
| B2 keys kept while a removal is pending | 5 of 6 fail | **0 of 6: fixed** | not run |
| Z3 lost tag (Q7, Q8) | fail | fail, unchanged | not run |
| Z4 and B5 (Q1, Q9) | the pinned Reach session keeps the value | unchanged | not run |
| R2-2 without a frame source (Q11) | race 409 `CasConflict`; the late frame stored | **unchanged (Z7)** | not run |
| R2-2 | race refused; the late frame and the replay stored | **race and late frame 409 `ErasureReplayDeclined`**; the replay with a fresh source stored (case 3, the owner's call) | not run |

- `2d05e00c0` also counts and logs the failures that were swallowed (`failures.clj`), and adds a worker that
  completes removals left pending too long (`TX2_REMOVAL_WORKER_COMPLETE_MS`, default off). That worker is the
  recommendation on page 1; with it off by default, Z3 and the commit boundary's read path still leave a removal
  pending indefinitely. Not tested.

Branch head: the commit that adds this page, "DX-ERA3: fourth review ..." (`git log -1 --
lab/experiments/EXP-DX1/era3/REVIEW-4.md`), on `exp/DX-ERA3-removal-review`.

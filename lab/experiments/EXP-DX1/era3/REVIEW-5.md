# Fifth adversarial review: the per-account removal at 61692eec8 (DX-ERA3, 2026-11-25)

Reviewer DX-ERA3, branch `exp/DX-ERA3-removal-review`, which merges `origin/exp/DX-ERA2-removal-per-account` at
`61692eec8` (gateway code unchanged since `3998744c7`; the merge is `9d526e7dd`). **This review is pinned to
`61692eec8`.** Later commits on the builder's branch were not run. The removal code was not changed. This pass adds:

- `era3/attack5.clj`: cases W1 to W5 (the completion worker), P1 and P2 (the policy stored in Datomic), C1 (the
  rebuild and reconcile routes called by anyone), Z7a to Z7f (the rule for a save framed before a removal), S1 (the
  removal stamp on every read route), T1 to T3 (the move to the commit boundary), and a fifth fuzzer with the worker,
  the move, rebuild and reconcile as steps;
- `era3/stack5.sh`: a data restore from a backup taken while a removal is paused at one of its steps, then a second
  restore from the same backup;
- B2 on the merged line (`exp/DX-INT1` at `1ed2650bd`, every option off), as it is and with the one-line fix alone;
- a rerun of the fourth review's cases (Q1 to Q11) on this head;
- `era3/run.sh` runs another commit's source (`ERA3_SOURCE_REF`) and labels every container `tx2.holder=DX-ERA3`.

Conditions: Mac only, toy sizes, the lab VM shared with other builders; every time is diagnostic. The code diff
(`bd4ec0d1a...61692eec8 -- packages/`: 12 files, the gateway and the SDK) was read before the page's section 18.
Predictions were written at 05:09 EST, before the first run. Every container ran the pinned runtime image
`sha256:21a67288007d...` with this branch's gateway source mounted (PostgreSQL `sha256:526f86d93c6e...` on the
stacks), recorded per run. Written 2026-11-25, 05:47 to 07:20 EST.

## Page 1, for the owner

**Is there a break? Yes, two, both in the new protection policy, and both on either boundary. No removed value was
answered to a read after its acknowledgement anywhere.**

- **No exposure after the acknowledgement.** Every case, 90,000 fuzzer schedules, four restore stacks and two acknowledgement stacks: no
  read answered a removed value after its removal was acknowledged, and no Reach client was told to keep one.
- **What the breaks do:** after the removal log is lost, one ordinary request can leave a database where **no value
  can ever be removed on request again**, with no route out. In some variants new values of a protected attribute are
  also stored in clear, or every request is refused for good.
- **How sure:** certain. Both reproduce every time, on both boundaries and both per-account modes, unsealed and
  sealed.

**The three most serious findings**

1. **V1 (high, both boundaries): with the removal log lost, the protection route writes a new policy.**
   - **What happens:** the protection route compares the policy it is given only with the log's `head.json`. With the
     log lost there is none, so it writes a fresh head with whatever attribute list it was sent (`privacy.clj`
     `register!`, 103-111). It never reads the policy stored in Datomic. It is the one request that does not trigger
     the gateway's own rebuild of a missing log.
   - **Then, with a list that differs from the stored one** (narrower or wider), on both boundaries:
     - every removal, the rebuild route and the protection route itself answer 409 `ProtectionPolicyMismatch`, for
       good; nothing changes either policy back;
     - **log boundary:** every read and write also answers 503 `RemovalLogBehind` for good (the log's head now says
       sequence 0, and the rebuild route that would catch it up is refused);
     - **commit boundary:** reads and saves are served, and with a narrower list a new value of the dropped attribute
       is stored in clear in a sealed database (2 native copies in clear).
   - **With the same list:** recoverable; the rebuild route then answers 200 and removals work (the control).
   - **Who can trigger it:** any caller of the v2 routes, or a service whose start-up declares its policy, as the first
     request after the log is lost. A service release that adds a protected attribute does exactly this.
   - **Test:** `attack5.clj` `p2` (`ERA3_PHASES=p2`): 14 variants with a different list (narrower or wider, both
     boundaries, unsealed and sealed, both per-account modes), 28 of 28 oracles fail; the 2 same-list controls pass.
2. **V2 (high, databases moved per account by an earlier build): a foreign `head.json` becomes the stored policy.**
   - **What happens:** for a database whose policy is still only in the log (moved per account before `9bd7c783c`),
     the page's own instruction for a lost log is "put back any copy of the log's head.json". If the copy comes from
     another database, the rebuild route copies its policy into Datomic (`adopt-policy!`) **before** it checks that
     the head belongs to this database. The request answers 503, but the policy is stored and can never change.
   - **Then, with the right head back:** every removal and the rebuild route answer 409 `ProtectionPolicyMismatch`,
     for good. The value of the attribute the foreign policy lacks can never be removed.
   - **Where:** `removal_commit.clj` `rebuild-log!` 961 (adoption before `privacy/cut`), `adopt-policy!` 923 (reads
     `head.json` without the log's checks).
   - **Test:** `p1`, unsealed and sealed, on both per-account modes: 8 of 8 oracles fail.
3. **V3 (medium, every mode, options off included): a client that sends no frame source can be refused for ever.**
   - **The rule (Z7):** a save with neither `sourceK` nor `removalSeen` counts as framed before every removal. Measured:
     it is a permanent tombstone per entity and attribute (a removal by attribute) or per entity (a removal by
     entity); unprotected attributes and other subjects are not affected; it outlasts later removals.
   - **A delivery with no frame source** of a subject removed in the recipient is declined, again under a new command
     (Z7f).
   - **The refusal carries no removal stamp** (the 409 is built in the route handler's catch, without the headers a
     served answer gets). A client that learns its stamp only from responses, as the SDK does, retries with the same
     old `removalSeen` and is declined again each time, each refusal writing a transaction (3 datoms) and burning a
     command. One read of the database gives it a newer stamp and the save is stored (Z7c).
   - **Test:** `z-matrix`, `z-delivery`, `z-loop` (`ERA3_PHASES=z`), on database-wide, per account and subject check.

**One recommendation: make the policy stored in Datomic the only policy.** The protection route must compare with it
(and refuse while the log is missing, or rebuild first); adoption must only take a head that passes the log's own
checks (its database name and seal), and refuse while the database has no policy and the head fails them. That
closes V1 and V2, and it leaves the log with nothing that can disagree with the data's policy.

**Is the commit boundary now safe to become the only rule? Yes, as far as the boundary goes; fix V1 and V2 first,
because they break removal on request on either boundary and deleting the log boundary's code does not change them.**

- **Its own breaks from the fourth review are closed on this head:**
  - Z1: a restore from a backup taken while a removal was paused at its intent, its declaration or its commit, then a
    second restore: 0 values answered, every write 200 after each restore route (4 stacks).
  - Z4 and B5: 0 of 15 read routes leave the value with its reader between the commit and the publication, and the
    stamp moves at the commit (S1, Q9).
  - The boundary is the database's setting, and the move with a removal or a save in flight behaves (T1 to T3).
- **No new break specific to the commit boundary** in the cases or in 40,000 commit-boundary fuzzer schedules.
- **Conditions for deleting the log boundary's code:**
  - every gateway on this build first: a `bd4ec0d1a` build with its old switch on still serves reads after the move,
    with the sequence as its Reach witness (the builder's fleet stack, 18.6), which is the fourth review's Z4;
  - the permission to move (`TX2_REMOVAL_COMMIT_BOUNDARY=1`) on one controlled process: any process with it moves
    every database it removes on, for good, at that database's first removal;
  - databases on the log boundary in states 6 to 8 (log behind, data behind) must be cleared first: the move
    refuses while the data and the log disagree.

## 1. Findings

| ID | Severity | Boundary | What | Where | Test | Status |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | High | both | With the removal log lost, the protection route writes a new head with any attribute list. A list other than the stored policy: every removal, rebuild and protection call 409 `ProtectionPolicyMismatch` for good; log boundary every request 503 `RemovalLogBehind` for good; commit boundary, a narrower list stores new values of the dropped attribute in clear when sealed | `privacy.clj` `register!` 103-111; `erase.clj` `declare!` (route `main.clj` 433) | `p2` | In-process, 28 of 28 |
| V2 | High (databases moved before `9bd7c783c`) | both | A `head.json` from another database, put back to clear `ProtectionPolicyUnknown`: the rebuild route stores its policy before checking the head; with the right head back every removal and rebuild 409 for good | `removal_commit.clj` 923, 961 | `p1` | In-process, 8 of 8 |
| V3 | Medium | every mode | Z7's tombstone: a save or delivery with neither `sourceK` nor `removalSeen` of an entity and attribute (or entity) any removal named is declined for good; the 409 carries no stamp, so a client that learns its stamp from responses repeats the refusal | `removal_commit.clj` 803 (`constantly true`), 825-848; `main.clj` 562 (refusal without headers); SDK `DatomicClient.ts` 627-633 | `z-matrix`, `z-delivery`, `z-loop` | In-process |
| V4 | Low | every mode | A declined save writes a transaction (3 datoms per refusal after the first) and burns its command, so refused requests grow the database without bound | `removal_commit.clj` 825-838 | `z-growth`, `z-commands` | In-process |
| V5 | Low | both | A deleted database keeps its removal log, and every worker pass lists it for ever; with a removal pending at the delete, the worker fails on it every pass on every gateway (`db-not-found`, counted and logged, 4 of 4 passes) | `main.clj` `delete-scope!` 100-107; `removal_commit.clj` `complete-stale!` 880 | `w5` | In-process |
| V6 | Low | both | A corrupt `pending.json` or an altered log entry: every request of that database 503 and its published keys are kept, with no route out (rebuild and reconcile 503); now counted (`cut`, `shred`, `worker-completion`) | `privacy.clj` `cut`; `envelope.clj` `shred-published!` | `w3` | In-process; storage damage, not a request |
| V7 | Low | both | A removal the worker can never complete (its intent's sequence out of step) is retried every pass and logged as a completion "pending", but `complete-pending!` catches its own failure, so it is not counted (page 18.2 row 20 holds only for failures outside it) | `removal_commit.clj` 757-775 | `w3` (wrong-seq) | In-process |
| V8 | Low | both | A pending removal cannot be withdrawn or changed: no route; a resend with other selectors answers 503 `ErasureFrontierUnavailable` (retry later), not a terminal conflict, and the worker then completes the first selection | `removal_commit.clj` `erase!` | `w2` | In-process |
| V9 | Low | log, at the move | A save or frame planned before the move and committed after it answers 409 `ErasureFrontierChanged`, which the SDK does not replay (its replay list is `CasConflict`, `CommandConflict`, `ClockConflict`); stored when sent again. Once per database | `storage.clj` fence; SDK `DatomicStorageAdapter.ts` 510-523 | `t2` | In-process |
| R | — | — | A removed value comes back when a client claims a fresh frame (`removalSeen` far ahead, or the current position as `sourceK`) and sends it again: the rule's case 3, the owner's call, unchanged | `removal_commit.clj` 789-806 | `z-seen` | In-process |

## 2. The coordinator's list, item by item (what I ran)

### (a) The completion worker

- **Two workers and a client resend racing on one removal (W1).** The removal stopped after its intent, its
  declaration or its commit; then two calls of what `complete-pending!` runs (as two gateways' workers would, each
  past its own gateway's de-duplication) and the client's resend, released together. 10 runs per stop point and
  boundary, 60 in all: the removal committed once, the published sequence moved by exactly 1, nothing left pending,
  the value masked, every answer 200.
- **A worker with a stale view:** not possible as written: `complete-pending!` runs `erase!`, which syncs the
  database and reads the log afresh under the removal lock (read from code).
- **A worker on a gateway with a lost lock, or on the earlier build:** not run here. The earlier build has no worker.
  A lost PostgreSQL session mid-removal still answers 400 `GatewayError` (the builder's admitted item 8).
- **A removal withdrawn or changed (W2): it cannot be.** There is no route for it (three guessed route names 404). A
  resend with other selectors while it is pending answers 503 `ErasureFrontierUnavailable` ("retry"), and the worker
  then completes the first selection: a1 removed, b1 kept (V8).
- **A poisoned removal (W3), beside a healthy database whose removal is stale and whose published key is due:**

  | Poison in database P | The healthy database | P's requests | P's published key | Way out for P | Counted |
  | --- | --- | --- | --- | --- | --- |
  | `pending.json` cut short (not JSON) | completed and its key deleted in the same pass | 503 every read and write | kept | none: rebuild and reconcile 503 | `cut`, `shred`, `worker-completion` |
  | the intent's sequence 5 ahead | the same | 200 | deleted | none needed for requests; the removal never completes | logged as "pending" each pass, not counted (V7) |
  | a published log entry altered | the same | 503 every request | kept | none | `cut`, `shred`, `worker-completion` |

  One poisoned database does not hold back another. The two storage-damage cases are a refuse-everything state that
  is not in section 18.11's table (V6).
- **A database deleted while a removal is pending (W5):** its removal log stays (`delete-scope!` does not touch the
  authority), the worker still lists it, and every pass fails on it with `db-not-found`: 4 failures counted in 4
  passes, one log line each, on every gateway, for good. Nothing else is affected (V5).
- **Load (W4):** the worker's pass costs one `pending.json` read per database, and the key pass one cut per database,
  on every gateway every 500 ms; the number of accounts in a database does not matter. Measured on the Mac with no
  removals (the authority also held the logs of 74 deleted test databases, which every pass still lists, V5):

  | Databases created | Logs listed by the pass | Completion pass, median / max (ms) | Key pass, median / max (ms) |
  | --- | --- | --- | --- |
  | 1 | 75 | 0.8 / 1.7 | 1.5 / 4.4 |
  | 25 | 99 | 1.0 / 2.5 | 1.7 / 6.3 |
  | 100 | 174 | 2.1 / 5.5 | 2.7 / 6.2 |

  With PostgreSQL each of those reads is a query: about 2 queries per database per pass per gateway. With one
  database for all accounts, as planned, this is negligible.

### (b) The policy stored in Datomic

- **The window where the policy is only in the log (P1):** a database moved per account as an earlier build did it
  (the route bypassed, so no policy is stored), seeds, then the log lost:
  - two reads: 503 `RemovalLogMissing` each (the gateway's own rebuild fails with `ProtectionPolicyUnknown`); the
    rebuild route 409 `ProtectionPolicyUnknown`. As the page says.
  - **a `head.json` from another database put back** (its policy protects `:v` only; this one `:v` and `:p`): a read
    503; the rebuild route 503, **and the stored policy is now the other database's**;
  - this database's own head put back: the rebuild route, a removal of `:p` and a removal of `:v`: all 409
    `ProtectionPolicyMismatch`. V2.
- **An OLD copy of the database's own head:** the policy never changes, so any copy carries the same one; not run
  separately (P2's same-list control is the nearest).
- **Can the stored policy lose an attribute?** Not by a route once written: adoption runs only when none is stored
  and refuses a mismatch after. It can be set wrong once (V2), and a data restore to before the adoption removes it
  (Datomic restores the data), which reopens the window. **The log's policy can change** (V1), and that is what
  breaks the database.
- **Two gateways adopting different logs:** not run (one file authority in process); the adoption is a plain
  `:db/add` with no compare, so the last of two would win.
- **A newly protected attribute after adoption:** the protection route refuses it (409, the policy is immutable)
  while the log exists; with the log lost it is accepted and the database is stuck (V1, the "wider list" variant).

| Protection route after the log is lost, with | Boundary | Then: read / new `:p` save / rebuild / removal / protection with the stored list |
| --- | --- | --- |
| the same list | log | 503 `RemovalLogBehind` / 503 / **200** / **200** / 200 |
| the same list | commit | 200 / 200 / **200** / **200** / 200 |
| a narrower list (`:p` dropped) | log | 503 / 503 / 409 / 409 / 409, and every request 503 for good |
| a narrower list | commit | 200 / 200, **2 native copies in clear when sealed** / 409 / 409 / 409 |
| a wider list (`:q` added) | log | 503 / 503 / 409 / 409 / 409, every request 503 for good |
| a wider list | commit | 200 / 200 / 409 / 409 / 409 |

### (c) `removal-log-rebuild` and `removal-log-reconcile`, callable by anyone

- **Denial of service (C1):** 3 threads calling the rebuild route and 2 the reconcile route in a loop (1,235 and 734
  calls on the log boundary, 1,347 and 1,121 on the commit boundary, all 200) while 10 removals and 20 reads ran:
  every removal 200, median 8.3 ms (control 8.4) and 11.2 ms (control 10.2), no read refused, 0 values answered.
  The two routes take the removal lock briefly and serialise with removals; they did not starve them here.
- **Reconcile a real conflict away:** it rewrites only records that differ from the log's entry of the same sequence
  in their position, and refuses with 503 when anything else differs (W3's altered entry: 503). It cannot change a
  mask, so it cannot lose a removal or show a value (read from code; the fuzzer calls it in 1 schedule in 2).
- **What a hostile caller can do with them:** nothing beyond load, found. **The protection route is the dangerous
  one** (V1), and it is open to the same callers.

### (d) Z7's rule

- **Which legitimate clients send neither a source nor `removalSeen`:**
  - **deliveries** (a frame naming its source database) carry no `sourceK` in every test harness here; into a
    database where their subject was removed they are declined, also under a new command (Z7f);
  - **the SDK's optimistic commits** send `removalSeen` only once some answer from that database carried a stamp; an
    answer that refused the save carries none (Z7c);
  - **an old SDK** sends neither on its optimistic commits (read from code): every such save of a removed subject is
    declined;
  - imports and settlement frames are not on this branch.
- **What it can no longer do (Z7a), the same on database-wide, per account, subject check and both boundaries:**

  | Source-less save after a removal of a1's `:v` and of the whole entity b1 | Answer |
  | --- | --- |
  | a1 `:v` (the removed attribute) | 409 `ErasureReplayDeclined` |
  | a1 `:p` (another protected attribute of a1) | 200 |
  | a1 `:u` (unprotected) | 200 |
  | b1 `:v`, b1 `:p` (entity removed) | 409, 409 |
  | b1 `:u` (unprotected) | 200 |
  | a2 `:v`, a3 `:v` (other subjects of the account) | 200, 200 |
  | a1 `:v` again after three more removals of other subjects | 409 |
  | a1 `:v` with the current position as its source | 200 |

  So the tombstone is per entity and attribute for a removal by attribute, per entity for a removal by entity, and
  it is permanent.
- **A save that lies (Z7b):** `removalSeen` far ahead, or the current position as `sourceK`, with the removed value
  itself: stored, and the removed value is answered again. That is case 3 by the rule's own terms (a new save after
  the removal): any client can re-store a removed value by claiming a fresh frame. The owner's call, as the builder
  says; not counted as a break.
- **The decline record (Z7d, Z7e):** a declined save under another caller's command burns that command: the victim's
  later save, from another account and with a fresh source, is 409 `ErasureReplayDeclined`. Not new: an ordinary
  stored save under the victim's command burns it too (the victim then gets 409 `OperationDuplicate`). Every declined
  save writes one transaction and 3 datoms (the first one per database also installs two attributes), on every mode
  including database-wide (V4).

### (e) The stamp

Ran: S1 on both boundaries, the removal paused after its declaration and after its commit, and across the move (the
removal paused, then the database moved). Eleven routes read before, between and after (current, history, pinned,
batch, a snapshot handle, a Reach session at the pinned basis, one at the current basis, a pinned Reach read without
`erasureRefs` as an older client sends it, `reach-many`, the journal, the frontier), plus Q9's 15 routes on this head.

| Paused | Boundary | Routes leaving the value between | After the acknowledgement | Stamp before / between / after |
| --- | --- | --- | --- | --- |
| after its declaration | log | 10 of 10 that read a1 (allowed: not yet committed) | 0 | 0 / 0 / 1 |
| after its declaration | commit | 10 of 10 (allowed: not yet committed) | 0 | 0 / 0 / 1 |
| after its commit | log | 0 (the first read publishes) | 0 | 0 / 1 / 1 |
| after its commit | commit | **0** (Z4 closed; sequence still 0, stamp 1) | 0 | 0 / 1 / 1 |
| declaration, then the move | log to commit | 0 (the move completed it) | 0 | 0 / 1 / 1 |
| commit, then the move | log to commit | 0 | 0 | 0 / 1 / 1 |

- **A client that ignores the stamp:** the gateway decides "keep your copy" from the stamp, so an older SDK that keys
  on the sequence header is told to replace its copy (the `erasureRefs`-less read row). A client with its own cache
  keyed on the sequence (the held reader of the derived-copies branch) would serve the value between the commit and
  the publication on the commit boundary: the page's 18.4 last row; not on this branch.
- **The SDK's Reach cache end to end:** not run (as the builder says, its decoder rejects the toy attribute).

### (f) The move to the commit boundary

- **T1, a removal stopped after its intent, declaration or commit, then the move:** the move completed it first
  (published as 1, nothing pending), then moved; a1 masked; the resend 200.
- **T2, in flight across the move:** a save planned before the move and committed after it: 409
  `ErasureFrontierChanged`, stored when sent again (V9); a frame naming an account: the same; a delivery whose source
  database moved while it was in flight: 200 (the move waited for the delivery's lock past my 3 s).
- **T3, a removal racing the move:** both 200; the database on the commit boundary; a1 masked.
- **A gateway that has not seen the move, and the earlier build after it:** not run here; a write planned on the old
  value is refused at the serial point (T2), and the builder's fleet stack covers the earlier build.
- **Import and settlement frames:** not on this branch.

### (g) Z1 again: a backup taken during a removal, a restore, then a second restore

Stacks (`stack5.sh restore-during`; PostgreSQL authority, write and read gateways): the write gateway's removal of a1
paused 25 s at the step named; the data backed up during the pause; the removal finished; a save; the data restored
and the restore route run; checks; a removal of c1; the data restored again from the same backup and the restore
route run again; checks; a removal of b1.

| Boundary, paused at | Before each restore route | After the first route | After the second route | Values answered |
| --- | --- | --- | --- | --- |
| commit, intent | reads 200, saves 503 `RemovalDataBehind` | reads, saves, frame, rebuild, reconcile, removal: 200 | the same, sequence 2 | 0 |
| commit, declared | the same | the same | the same | 0 |
| commit, committed | first: reads and saves 200 (the commit was in the backup); second: saves 503 | the same | the same | 0 |
| log, declared | reads and saves 503 `RemovalDataBehind` | the same | the same | 0 |

### (h) B2 on the one branch with every option off

Ran the builder's `era2/b2.clj` (sealed, grace 2 s, the other removal held pending 10 s past the grace) with every
option off, on the merged line as it is and on a local commit object (not pushed) that is `1ed2650bd` with one line
changed, `envelope.clj` `shred-published!`: `(privacy/cut name nil)` to `(privacy/cut name nil true)`.

| Source | The other removal | Published key deleted after its publication | Past its grace | Requests meanwhile |
| --- | --- | --- | --- | --- |
| `1ed2650bd` | none (control) | 2,036 ms | 36 ms | 200 |
| `1ed2650bd` | stopped at its publication | only after its resend: 12,082 ms | **10,082 ms** (the hold) | 503 |
| `1ed2650bd` | stopped before its native commit | only after its resend: 12,085 ms | **10,085 ms** | 503 |
| `1ed2650bd` + the one line | none (control) | 2,025 ms | 25 ms | 200 |
| `1ed2650bd` + the one line | stopped at its publication | 2,023 ms, still pending | 23 ms | 503 |
| `1ed2650bd` + the one line | stopped before its native commit | 2,020 ms, still pending | 20 ms | 503 |

- **B2 is on the merged line with every option off**, as the builder found: the key lives exactly as long as the
  other removal stays pending.
- **The one line alone fixes it there.** It needs nothing else: `privacy/cut`'s third argument (a pending removal
  allowed) is already on `1ed2650bd`, from `91cffd2c3` (2026-11-20), and with it the cut is the published prefix
  only, so the pending removal's own keys are not touched before its publication (read from code: the pending entry
  is not applied to `:commands`).
- **Exactly what a standalone fix needs:** the one changed line of `2d05e00c0` in `envelope.clj`. The rest of that
  commit's `envelope.clj` hunk is optional: counting the dropped failures needs `failures.clj` (new in `2d05e00c0`; its
  `triplex.gateway.stats` is on `1ed2650bd`); the worker's completion needs `removal_commit.clj`, which the merged
  line does not have, and is off there unless `TX2_REMOVAL_WORKER_COMPLETE_MS` is set.
- **Still true there with the fix:** while a removal is pending, every request answers 503 (the database-wide rule),
  until its resend.

### (i) The fuzzer

- **Steps added this round** (on top of the third fuzzer's stops, slow steps, late arrivals, second gateway and fresh
  caches): the worker's pass (none, while the removal is pending, after it), the rebuild route and the reconcile route
  (none, while pending, after), a log restore (none, a pending copy, a copy behind), and on the "move" runs the move to
  the commit boundary at one schedule of each block of 200, while that schedule's removal may be pending. Each
  schedule also checks that the removal stamp moved with its acknowledged removal.
- **Runs** (`ERA3_MAIN=5 ... fuzz5`, 200 schedules per database):

  | Run | Boundary | Mode | Sealed | Schedules | Checks | Violations |
  | --- | --- | --- | --- | --- | --- | --- |
  | f-log-1 | log | per account | no | 10,000 | 105,916 | 0 |
  | f-log-B | log | per account | yes | 15,000 | 154,906 | 0 |
  | f-log-C | log | subject check | no | 15,000 | 158,901 | 0 |
  | f-commit-A | commit | per account | no | 20,000 | 211,886 | 0 |
  | f-commit-B | commit | subject check | yes | 20,000 | 206,393 | 0 |
  | f-move-1 | log, then the move in every block | per account | no | 10,000 | 106,009 | 0 |

- **What the steps did:** 44,927 worker passes, 45,063 rebuild calls, 45,198 reconcile calls and 50 moves, every one
  answered 200. 45,093 log restores: afterwards a read answered 503 `RemovalLogBehind` (11,477) or 200 masked (8,587)
  on the log boundary, 200 masked on the commit boundary (19,987), and the next rebuild brought all 45,093 back (200).
  No schedule answered a removed value, and the stamp moved with every acknowledged removal. Per boundary: 40,000
  schedules on the log boundary (419,723 checks), 40,000 on the commit boundary (418,279), 10,000 across the move.
- **Then on a stack:** the fuzzer flagged nothing, so the stacks took the most suspicious classes from the cases: the
  restores during a removal (item g) and the fourth review's acknowledgement stack (`stack4.sh ack4`: 20 removals, 4
  readers, every cached Reach session's client followed) on this head:

  | Boundary | Reads after an acknowledgement | Value answered after | Reach hits after | Clients holding the value after |
  | --- | --- | --- | --- | --- |
  | commit | 4,084 | 0 | 1,377 | 0 |
  | log | 4,266 | 0 | 1,437 | 0 |

### What was attacked without a break, with counts

| Attack | Count | Result |
| --- | --- | --- |
| Two workers and a resend racing on one removal (W1) | 60 races | applied exactly once each, all 200 |
| Rebuild and reconcile called in a loop during removals (C1) | 2,582 rebuild and 1,855 reconcile calls, 20 removals, 40 reads | every removal 200, 0 values answered |
| Every read route between a removal's commit and its publication (S1, Q9) | 11 routes x 6 situations, and Q9's 15 routes x 2 boundaries | 0 leave the value after the commit on the commit boundary, 0 after any acknowledgement |
| The move with a removal or a write in flight (T1 to T3) | 3 stop points, a save, a frame, a delivery, a racing removal | all complete; 0 values answered |
| A restore from a backup taken during a removal, then a second restore (stacks) | 4 stacks, 8 restores, 3 removals each | 0 values answered; every write 200 after each restore route |
| The fourth review's cases on this head (Q1 to Q11) | 46 checks | 0 violations |
| The fifth fuzzer | 90,000 schedules, 944,011 checks | 0 violations |
| Z7 on every mode (database-wide, per account, subject check) | 6 cases per mode and boundary | as tabled above; no value stored that a rule should have refused, except by a lie (case 3) |

## 3. The builder's claims, checked

| # | The builder's claim | My test on `61692eec8` | Verdict |
| --- | --- | --- | --- |
| 1 | B2 fixed; dropped failures counted; B2 exists on `exp/DX-INT1` `1ed2650bd` with every option off | Q10 here: 0 of 6 variants keep a published key (was 5 of 6). On `1ed2650bd` off, the builder's `b2.clj` with a 10 s hold: the control's key goes 36 ms past its grace; with the other removal pending the key outlives its grace by 10,082 and 10,085 ms (the hold) and goes 82 to 85 ms after the resend. Counting: `cut`, `shred`, `worker-completion` counted in W3 and W5 | **Holds.** One gap: a completion that fails inside `complete-pending!` is logged, not counted (V7) |
| 2 | A completion worker is part of the per-account rule; a pending removal is completed with no client | W1 (60 races, exactly once), W2, W3, the fuzzer's worker step (44,927 calls, all 200) | **Holds.** It completes even a removal its client would like to withdraw (V8), and it fails for good on a deleted database's log (V5) |
| 3 | One removal stamp every cache keys on; it changes at the commit on the commit boundary; Q9: 0 of 15 routes | Q9 here: 0 of 15 on both boundaries; S1: the stamp moves at the commit (0 to 1 while the sequence stays 0), 0 routes leave the value between, also across the move | **Holds** on the gateway. The SDK end to end not run (as stated) |
| 4 | R2-2 and Z7: a save framed before the removal is declined; no source and no `removalSeen` counts as older than every removal; the decline is recorded | Q11 here: race and late frame 409, value not stored. Z7a to Z7f | **Holds as stated**, with consequences the page does not count: deliveries without a source, a refusal without a stamp that the SDK cannot learn from, a transaction per refusal (V3, V4) |
| 5 | The boundary is a one-way value in the database; the move completes a pending removal first; a fleet with a `bd4ec0d1a` build answered 0 values | T1 (3 stop points), T2, T3 | **Holds** in process. The fleet stack not rerun |
| 6 | Z1 fixed; Z2: the policy in Datomic, the rebuild route takes only `{}`, a missing log rebuilt by the gateway, `ProtectionPolicyUnknown` until any copy of `head.json` is back; reconcile takes only `{}`; Z3, Z5, Z6 fixed; the read wait bounded at 5 s | Z1: 4 stacks with a backup taken during the removal and a second restore, 0 values, every write 200 after the route. Q2 here: bodies 400, a missing log rebuilt. Q7: deliveries both ways 503, 503, 200 and nothing left pending (Z3); Q8 503 then 200 (Z3); Q4c 503 three times (Z5); a nonexistent source 409 `ErasureFrontierChanged` (Z6); Q4a 1,508 ms with the starter holding the lock 1.5 s | **Z1, Z3, Z5, Z6 hold. Z2 does not:** "any copy of head.json" can make the stored policy wrong (V2), and the protection route can make the log's policy wrong (V1) |
| 7 | States that refuse every request until someone acts: log 3 of 10, commit 0; none waits for a particular client | V1 adds a state on both boundaries where removals are refused for good (and on the log boundary every request), with no route out; V6 adds one from storage damage | **Does not hold** for V1 |
| 8 | Admitted: a PostgreSQL session dying mid-removal answers 400; 21 dropped refusals listed | Not run | Not tested |

## 4. What I could not test

1. **The SDK end to end:** its Reach cache, its `removalSeen` on optimistic commits, and how an application sees a
   409 `ErasureReplayDeclined` (the SDK raises it as a terminal `WriteError`; read from code, `DatomicStorageAdapter.ts`
   503-528). V3's loop is shown at the gateway with a client that keeps its stamp as the SDK does.
2. **The earlier build beside this one, before and after the move** (item f): the builder's fleet stack covers it; not
   rerun.
3. **A gateway that has not yet seen the move** (a peer behind): not reachable in process; T2 shows a write planned on
   the old value refused at the serial point.
4. **Two gateways adopting different logs:** one file authority in process.
5. **A worker on a gateway whose PostgreSQL lock is lost mid-completion.**
6. **Imports and settlement frames under Z7:** not on this branch.
7. **The worker's cost on PostgreSQL:** W4 is the file authority on the Mac.
8. **Times:** every time here is from the shared Mac VM and diagnostic only.
9. **Anything after `61692eec8`.**

## 5. Tests, how to run them, evidence

- In process: `ERA3_MAIN=5 bash lab/experiments/EXP-DX1/era3/run.sh <out> <off|on|subject> "<phases>"`, phases from
  `w1 w2 w3 w4 w5 p1 p2 c1 z s t fuzz5`, with `ERA3_EXTRA_ENV=TRIPLEX_ERASURE_SHRED_GRACE_MS=0`.
  - The fuzzer: `ERA3_BOUNDARY=<log|commit|move>`, `ERA3_N`, `ERA3_SEED`, `ERA3_BLOCK=200`, `ERA3_SEALED=1`.
  - The fourth review's cases on this head: `ERA3_MAIN=4 ... "q1 q2 q3 q4 q5 q7 q8 q9 q10 q11"` with
    `ERA3_EXTRA_ENV="TRIPLEX_ERASURE_SHRED_GRACE_MS=0 TX2_ID_LISTS=1 TX2_SWEEP=1"`.
  - Another commit's gateway source: `ERA3_SOURCE_REF=<commit>`.
- Stacks: `BOUNDARY=<commit|log> PAUSE_AT=<intent|declared|committed> bash lab/experiments/EXP-DX1/era3/stack5.sh <out>
  <bodies> restore-during`; the bodies from `ERA3_MAIN=2 ... run.sh <dir> subject bodies2`. Predictions in its header.
- B2 on the merged line: `bash lab/experiments/EXP-DX1/era2/b2.sh <out> 1ed2650bd off` (the builder's test), and the
  same on a local commit object that is `1ed2650bd` with only the one changed line of `2d05e00c0`'s
  `envelope.clj` (`(privacy/cut name nil true)`); `ERA2_B2_HOLD_MS=10000`.
- Evidence: the archive `DX-ERA3-5.tar.gz` in the lab's evidence folder for this reviewer (outside the repository):
  every run's log, the image ID it ran, its source commit, the stacks' replies and the predictions file.
- Cleanup, 07:19 EST: `docker ps -a --filter label=tx2.holder=DX-ERA3` lists 0 containers; by name (`tx2-dxera3*`,
  which also covers the stacks' containers, which carry no label) 0; no volumes. One smoke container whose runner I
  stopped had been left exited; its log was kept with the evidence and the container removed.

Branch head: the commit that adds this page, "DX-ERA3: fifth review ..." (`git log -1 --
lab/experiments/EXP-DX1/era3/REVIEW-5.md`), on `exp/DX-ERA3-removal-review`.

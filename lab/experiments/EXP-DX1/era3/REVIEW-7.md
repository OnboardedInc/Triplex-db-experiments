# Seventh adversarial review: the removal branch at 383db77d1 and the reconciled branch at ae82b8984 (DX-ERA3, 2026-11-25)

Reviewer DX-ERA3, branch `exp/DX-ERA3-removal-review`, which merges `origin/exp/DX-ERA2-removal-per-account` at
`3257e3c6d` (the merge is `29906cfd7`, taking the builder's copies of `era3/attack6.clj` and `era3/run.sh`). Two
things are reviewed, each pinned:

- **Part A, the removal branch's seventh pass, pinned to `383db77d1`** (its head `3257e3c6d` changes the page only).
  The code diff `03bb49cd3...383db77d1 -- packages/` (16 files) was read before section 20 of `REMOVAL-PER-ACCOUNT.md`.
- **Part B, the reconciliation with the save line, `origin/exp/DX-ERA6-removal-on-save-line`, pinned to its tested
  code `ae82b8984`** (its head `674300b17` changes the gate's paired condition and the page).

**The one branch measured against:** `origin/exp/DX-INT1` at `efee27905`. It was `9eda0a935` at 16:50 and had moved
before the first run of this review; it was still `efee27905` when the last comparison ran.

Neither branch's code was changed. This pass adds:

- `era3/review7.clj` (Part A): R1, the key pass on an unsealed database with a due removal; R2, a caller of the
  protection route adds an attribute whose values are numbers; R3, the log's copy lists a name the stored policy
  lacks; R4, a read held at its read of the removal log's head while a removal publishes, the log is put back, or the
  head cannot be read; R5, the acknowledged line for every way a removal comes to be answered 200; R6, a stored save
  sent again after a removal of a value it wrote;
- `era3/review7b.clj` (Part B): M1, every combination of `frameSourceK`, `sourceK` and `removalSeen` (each absent,
  older than the removal, or fresh) on six writers, with M2 inside it (a declined command sent again; a new command);
  M3, what declined saves write and a command taken by another caller; M4, a stored save sent again after a removal;
- `era3/idents7.sh` (stored-function identities of both heads against the one branch's head, 11 writer settings) and
  `era3/paired7.sh` (the paired native log, 11 arms);
- `era3/stack6.sh restore-live` (the data and the removal authority restored to the same backup while the gateways
  keep running);
- `era3/run.sh` modes `r7`, `r7b`, `s5a3` (the save line's own third-review gate) and `ERA3_PG=1` (the PostgreSQL
  authority in process).

Conditions: Mac only, toy sizes, the lab VM shared with four other builders; at most two heavy jobs of this reviewer at
a time, the rest chained; every time is diagnostic. Predictions were written at 16:58 EST (`predictions.md` in the
evidence), before the first run. Every container ran the pinned runtime image `sha256:21a67288007d...` with the
reviewed commit's gateway source mounted (PostgreSQL `sha256:526f86d93c6e...`), recorded per run. Written 2026-11-25,
16:50 to 17:45 EST.

## The two direct answers

### (1) Is the removal branch fit to merge DEFAULT OFF into the one branch now?

**Only as the reconciled branch (Part B), merged again onto the one branch's current head and measured on that merge
commit before it lands. Not on its own.**

- **With every option off, both branches equal the one branch's head.** The paired native log is identical datom for
  datom to `efee27905` (unsealed 653 datoms, sealed 698), replies identical (md5 `3d94b2f60622` on all 7 arms), and a
  save that says nothing about its frame, of a removed subject's protected value, is stored on all three (200, md5
  `e028e3b04884`). Every stored-function identity both have is equal, in all 11 writer settings.
- **"Default off" is now inert for the replay rule.** The sixth review's Fact 1 (the rule ran on every protected
  database, options off included) is fixed: the rule is behind `TX2_REMOVAL_PER_ACCOUNT=1` or
  `TX2_REMOVAL_REPLAY_RULE=1` (`removal_commit.clj` `replay-rule`). With it off, Part B answers by the save line's rule
  (M3 with every option off: the source-less saves are stored, 200, as on the one branch).
- **Part A on its own lacks code the one branch has.** Against `efee27905`, Part A has 58 of the one branch's 70
  identities (equal) and lacks 12: the several-owners and creation functions (8) and the index hints' (4). Merging it
  alone means redoing what Part B already did: the two rules for a framed save, the save line's load order, its
  planners' fence. Part B lacks only the index hints' 4 (66 of 70, equal).
- **What the merge must carry:** the index hints' namespace from the one branch (neither branch has it), then the
  identity count and the paired log on the merge commit itself. Equal identities on the two sides do not prove the
  merge's: three merges in this line moved identities through load order alone (READINESS.md, the 20.3 fix).
- **Still on the one branch with options off:** X4 (one unreadable `head.json` stops the file authority's key pass for
  every database). Part A fixes it on its own file authority; v0.1 uses PostgreSQL, where it does not apply.

### (2) What must be true before any database is moved to per-account removal or the commit boundary

1. **F1 fixed on the replay rule's path (R6, M4).** A stored save sent again after a removal of a value it wrote must
   be answered as with every option off (409 `OperationDuplicate`, which the SDK resolves by reading its receipt), and
   its command must not be recorded as declined. Today it is answered 409 `ErasureReplayDeclined` on both branches, on
   both boundaries, on both authorities and on every writer tested, also database-wide with
   `TX2_REMOVAL_REPLAY_RULE=1`, while the operation reads `committed`.
2. **The record step 5 compares against is complete (R5).** Every removal whose client is answered 200 must print its
   `triplex.removal-acknowledged.v1` line, whichever step published it. Today 4 of 10 ways print none.
3. **The protection route refuses what it cannot protect (R2).** An attribute whose values are not strings must be
   refused at the protection call, not by every later save of every account, for good. Who may call the route must be
   decided: any caller that reaches the gateway can add an attribute, and no route or procedure drops one.
4. **A way out of `RemovalPolicyBehind` that does not protect an unknown name for good (R3),** or the procedure says
   that the restore route makes every name the log's copy lists protected for good, and the start check's line names
   the attributes (it gives only counts).
5. **The creation rule follows the merged rule, or `TX2_SUBJECT_CREATE` stays off on a moved database (Part B, M1).**
   With it on, a creation or import frame of a subject ID that a removal named is declined whenever it carries no
   `sourceK`, even with a fresh `frameSourceK` or `removalSeen` (3 of the 7 combinations that should be stored).
6. **The V4 decision written down (Part B).** Every declined command is recorded: 3 datoms per newly declined
   command, without bound in the number of commands; the removal page's 19.3 ("a save that says nothing writes
   nothing") no longer holds once the rule is on.
7. **Step 5 has an owner.** It is manual. Name who runs it after a restore and where the acknowledged lines are kept
   (outside both backups). The start check cannot do it: the restored data and the restored authority agree with each
   other, so only a record kept elsewhere shows the loss.
8. **Identities and the paired log measured on the merge commit** (answer 1).
9. **Scale:** nothing here ran on a server.

**The sixth review's eight preconditions, as of this pass** (the sixth review's cases rerun on `383db77d1`, `x6-on`
and `x6-subject`, 224 oracles, 0 violations; on `ae82b8984`, `x6-b`, 72 oracles, 0 violations):

| Sixth review's precondition | Now |
| --- | --- |
| 1. X1 fixed (the copy only grows) | **Met.** A2 rerun: the window's removal 503 `RemovalPolicyBehind`, the addition kept, the restore route takes it back. The new way out is R3 |
| 2. X2 fixed (the worker never retires on a catalog read) | **Met.** G2: a database missing from the catalog with a stale removal: live keys 2 before, 2 after, the log kept |
| 3. X3 fixed, and the start check reports a copy that differs | **Met.** B1: keys of a sealed database whose copy says unsealed deleted after a restart and 3 passes; R1; the start check prints `RemovalPolicyBehind` or `PolicyCopyDiffers` (counts only, R3) |
| 4. X4 fixed, or PostgreSQL only | **Met on this branch's file authority** (G1: `listing` counted 6, the other database's keys deleted and its stale removal completed). Still on the one branch (answer 1) |
| 5. A data restore never restores the authority with it (X10) | **Now a procedure** (20.5) whose step 5 is manual, and whose record is incomplete (R5) |
| 6. The rollout's five steps | Not rerun here |
| 7. X7 typed | **Met.** F: a removal sent while its intent is unreadable 503 `ErasureFrontierUnavailable`, with a message naming the rebuild route |
| 8. The decision on X5 written down | **Met** (20.2). D2 still shows the design: a stamp learned from an answer about another subject or account lets a save of the removed value through, 4 of 4 |

## Part A: the removal branch at 383db77d1

### Page 1, for the owner

**Is there a break? Yes, four, and none of them answers a removed value without a restore. The sixth review's four
high findings (X1 to X4) are fixed: their cases pass on this head. What breaks is what the branch tells its operators
and clients:**

- **The restore procedure's only check can miss removals.** Step 5 compares the acknowledged lines with the start
  state. A removal published by another step (the rebuild route; on the commit boundary also another removal or a
  read catching up from the data) prints no acknowledged line, although its client is answered 200 when it sends it
  again. After a restore of the data and the authority to one backup, step 5 cannot see that removal, and its value
  is answered again.
- **One protection call can stop every account's saves of an attribute, for good.** Any caller can add an attribute
  (the union rule). If its values are numbers, every later save that writes it is refused 400
  `ProtectedTypeUnsupported`, for every account, and no route takes the attribute back.
- **A stored save sent again after a removal is told it was declined.** The operation reads `committed` and its other
  values are stored, but the resend is answered 409 `ErasureReplayDeclined` (with every option off: 409
  `OperationDuplicate`).
- **A name that only the log's copy lists stops every account's writes** (503 `RemovalPolicyBehind`) until the restore
  route makes it protected for good.
- **What held:** the cache read before the log (no stale read, no refusal left behind, on both authorities); the key
  pass on unsealed databases (no deletion, no error, no stall); identities and the paired log against the one branch.
- **How sure:** each break reproduces in every variant it ran (both boundaries, unsealed and sealed, both per-account
  modes; R5 and R6 also on PostgreSQL). All four are in process; the stacks of this review test the restore.

**The three most serious findings**

1. **R5 (high for the restore procedure): 4 of 10 ways a removal comes to be answered 200 print no acknowledged line.**
   - **What happens:** `triplex.removal-acknowledged.v1` is printed only in `publish!` (`removal_commit.clj` 643), the
     removal's own publication. Three other steps publish a removal and print nothing: the rebuild route
     (`removal-log-rebuild`), and on the commit boundary the catch-up from the data (`catch-up!` 699, `append-log!`)
     that another removal or a read runs first. The client then sends its removal again and is answered 200 by
     `erase!` 797 (`erase/response db before`), which prints nothing either.
   - **Result:** a removal stopped after its native commit and then published by the rebuild route: 0 lines on both
     boundaries; by another removal or by a read: 0 lines on the commit boundary (1 on the log's boundary, where
     `complete-pending!` goes through `publish!`); by its own request or by the worker: 1 line. Same on the file and the
     PostgreSQL authority, both per-account modes (`a-on`, `a-subject`, `a-pg-on`: 12 violations).
   - **Why it matters:** step 5 is the only check against X10 (the data and the authority restored to the same
     backup undo every later removal silently; stack D3: the removed value answered again on both gateways). A
     removal with no line is not in the comparison: if it is the newest, the highest sequence misses it; if not, step 5
     cannot name its command to send it again.
   - **Reproduce:** `ERA3_MAIN=r7 ERA3_SOURCE_REF=383db77d1 ERA3_EXTRA_ENV=TRIPLEX_ERASURE_SHRED_GRACE_MS=0 bash
     lab/experiments/EXP-DX1/era3/run.sh <out> on r5` (add `ERA3_PG=1` for PostgreSQL), through `lab/bin/heavy.mjs`.

2. **R2 (high for availability): a caller adds an attribute whose values are numbers; every account's saves of it are
   refused 400 for good.**
   - **What happens:** `protect!` (1285) checks only that each name is a non-empty string outside `:_tx/`
     (`valid-attribute?` 214, the sixth review's X8 fix). It adds `":n"`, an attribute with numeric values. A numeric
     save that was stored before the call (200) is refused after it with 400 `ProtectedTypeUnsupported`, for this
     subject and every other; a 400 is final for clients.
   - **No way back:** the rebuild route and the restore route answer 200 and change nothing; the service's own list
     (without `":n"`) answers 200 with `notDeclared: [":n"]`. Taking the attribute out of the stored policy by hand
     makes the database `RemovalPolicyBehind` (the copy keeps it), and the restore route then adds it back. There is
     no procedure.
   - **Who can do it:** any caller that reaches the gateway's database routes. The gateway checks no caller on any
     route (it relies on what is in front of it; account claims check IDs, not callers), so the protection route is as
     open as a save. With one database for every account, the effect is on every account.
   - **Result:** 4 of 4 variants per mode (both boundaries, unsealed and sealed), both per-account modes: 16 violations.
   - **Reproduce:** `run.sh <out> on r2` as above.

3. **R6 (medium, the save line's F1): a stored save sent again after a removal of a value it wrote is answered 409
   `ErasureReplayDeclined`.**
   - **What happens:** `decline-check!` (1013) runs before the save and never asks whether the command is already
     committed. The save stated its source; the removal is later; so it is declined, and its command is recorded as
     declined while its operation reads `committed`.
   - **Who meets it:** a caller that resends a request it already sent (a retrying HTTP client, a queue that delivers
     twice) across a removal of that subject. The SDK does not resend after an unclear answer (it reads the operation's
     receipt), so SDK callers do not meet it this way. A caller that trusts the answer reports a stored save as refused
     and may build a new save from current data.
   - **With every option off** the same resend is answered 409 `OperationDuplicate` (`a-off`), which the SDK resolves
     by reading the receipt.
   - **Result:** both boundaries, both modes, both authorities: 6 violations (`a-on`, `a-subject`, `a-pg-on`). Part B
     has it too (M4, every writer, also database-wide with the rule on).
   - **Reproduce:** `run.sh <out> on r6`.

**One recommendation: make every answer agree with what is recorded, at the moment of the answer.**

- print the acknowledged line wherever a removal's client is answered 200 or a removal is published (`erase!`'s
  resend path, `append-log!`, the rebuild route), and let step 5 compare by command as well as by sequence (R5);
- before any decline, look up the command: a committed command is answered as with every option off (R6);
- refuse at the protection call an attribute the database cannot protect, so the refusal reaches the one caller that
  asked, not every later save (R2);
- name the attributes in the start check's `RemovalPolicyBehind` line, so an operator sees what the restore route is
  about to protect for good (R3).

### Findings

| ID | Severity | Where (`383db77d1`) | What | Test | Result |
| --- | --- | --- | --- | --- | --- |
| R5 | high (restore procedure) | `removal_commit.clj` `publish!` 643 (the only line); `erase!` 797; `catch-up!` 699 and `append-log!`; the rebuild route | A removal published by the rebuild route, or on the commit boundary by the catch-up that another removal or a read runs, prints no `triplex.removal-acknowledged.v1` line; its client's resend is answered 200 and prints none either | `r5` | lines for a removal answered 200: own request 1, worker 1, rebuild route 0 (both boundaries), another removal 0 (commit) / 1 (log), a read 0 (commit) / 1 (log); file and PostgreSQL, both modes: 12 violations |
| R2 | high (availability) | `protect!` 1285, `valid-attribute?` 214 | Any caller adds an attribute the database cannot protect (numeric values); every account's saves of it 400 `ProtectedTypeUnsupported`, for good; no route or procedure drops an attribute | `r2` | 16 violations of 16: saves 200 before, 400 after, for another subject too; rebuild and restore routes 200 with no change; the service's list 200 with `notDeclared: [":n"]` |
| R6 | medium | `decline-check!` 1013 (no lookup of the command first) | A stored save sent again after a removal of a value it wrote: 409 `ErasureReplayDeclined`, the operation `committed`, its command recorded as declined. Every option off: 409 `OperationDuplicate` | `r6` | 6 violations of 6 (both boundaries, both modes, file and PostgreSQL); with every option off 1 of 1 `OperationDuplicate` |
| R3 | medium (operations) | `policy-behind` 220, `served` 236, `erase!` 783, `rebuild!` 1440 | A name only the log's copy lists (a hand edit, storage damage) puts the database in `RemovalPolicyBehind`: every account's writes and removals 503, reads served; the service's own list does not clear it; the restore route clears it by protecting the name for good. The start-check line gives counts, not names | `r3` | 16 violations of 16: three accounts' saves 503; the read 200; the service's list 200 and the save still 503; after the restore route the stored policy `[":v" ":zz"]` and saves 200 |

Notes on the table:

- **R4's third oracle is withdrawn, not counted as a break.** On the log's boundary a log really put back during the
  held read is refused (503 `RemovalLogBehind`) for that read and for the next one, until the rebuild route. That is
  20.5 step 4; the oracle ("the next read is served") was too strict for that variant (2 of the 52 violations).
- **`RemovalPolicyBehind`, the three questions.** Who gets the 503: every write and removal on the database, of every
  account; reads are served. For how long: until an operator runs the restore route; nothing else ends it. Can
  ordinary requests keep a database there or put it there: no. Saves and reads do not touch the policy; a removal and
  a protection call only add, and they add to the stored policy before the copy (`add-attributes!` 1269, then
  `sync-policy-copy!` 1144), so neither can leave the copy ahead.
- **`restore-live`, what it shows.** A gateway that keeps running across a restore of the data and the authority to
  one backup does notice on the log's boundary: the restored log is behind the head it verified, so it refuses. That
  is the one place the loss is visible from inside (X10: after a restart nothing refuses). It is not a way to run the
  procedure: the running Datomic peers keep the data as they last saw it (the rebuild route found the removal there,
  although the restored storage is from before it), and a removal sent then cannot commit. Datomic's own procedure
  restarts every peer after `restore-db`; 20.5 step 3 ("start the gateways") assumes they were stopped, and should say
  so.
- **The union rule, the other two questions.** A head from another database: `privacy/cut` refuses a head or an entry
  that names another database (`privacy.clj` 165, 176), so the restore route and adoption cannot take another
  database's attributes from it unedited (code read; not run). An attribute that must stop being protected: no route,
  no procedure (R2).

### Attacked without a break

| What | Runs | Count |
| --- | --- | --- |
| **R1 the key pass treats every database as sealed** (X3's fix): an unsealed database with a due removal, and a sealed one, both boundaries: no key deleted that was not due, no failure counted, the progress mark advanced, every pass `ok` | `a-on`, `a-subject`, `a-off`, `a-pg-on`, `a-pg-off` | 4 variants per per-account run, 2 per database-wide run, file and PostgreSQL: 16 variants, 0 violations |
| **R4 the cache read before the log** (E4): a read held just before its read of the head while (a) a removal publishes and another request moves the cache: the held read verifies the newer head and does not answer the value; (b) the log is put back behind the head this gateway verified: refused 503 `RemovalLogBehind` on the log's boundary, served without the value on the commit boundary; (c) the head is unreadable during the hold: 503 `ErasureFrontierUnavailable`, and the next read is served (no cache left behind) | `a-on`, `a-subject`; (a) and (c) also `a-pg-on`, held at `sql/read-frontier` (E4's forced test on PostgreSQL, the builder's not-tested 3) | 6 variants per file run, 4 on PostgreSQL ((b) needs the file authority): 16 variants, 0 values answered; the one withdrawn oracle above |
| **The stored-function identities against the one branch's current head** | `idents` | 58 of 58 shared equal, 0 differ, in all 11 settings (base, server, server-wide, server-wide-hints, serial-retire, owner-head, several, create, questions, index, accounts); 12 missing (answer 1); 2 new (the removal fence's) |
| **The paired native log against the one branch's current head** | `paired` | every option off: every datom identical (653 and 698), replies identical; per account and commit boundary: identical, 0 decline datoms; the source-less case 200 on both |
| **fuzz7 spot check** (the builder's fuzzer with policy events; seeds the builder did not use) | `f7-log` (per account, sealed, seed 7911), `f7-commit` (subject check, unsealed, seed 7921) | 2,000 schedules each: 30,959 and 29,433 oracles, 0 violations (the builder's rate, about 15 oracles a schedule) |
| **A restore of the data and the authority while both gateways keep running** (`restore-live`, a PostgreSQL stack, sealed; the transactor alone stopped for `restore-db`, the authority's records and keys put back) | `st-live-log`, `st-live-commit` | 0 of the 32 reads after the restore (current and history, both gateways, four rounds, each boundary) answered the removed value. Log's boundary: every read, the frontier and a save 503 `ErasureFrontierUnavailable` on both gateways (each still held the head it verified, newer than the restored log) until the rebuild route, which appended the removal (`appended: 1`) from the gateway's own view of the data. Commit boundary: reads and a save served, the value masked. On both, a removal sent afterwards stays pending (503, its native step refused). See the note below |
| **The sixth review's cases** (A1, A2, A2b, A3, B1, B2, C, D, F, G1, G2, H, with the builder's three adapted oracles) | `x6-on`, `x6-subject` | 112 oracles each, 0 violations (the preconditions table above). D1, the rule's own cost with the per-entity index (X9): median 43, 43 and 39 microseconds at 1, 301 and 1,201 removals (the sixth review: 0.07, 0.12 and 0.37 ms, growing); 1 log line for 50 refusals |
| **Counts, Part A in process** | `a-on`, `a-subject`, `a-off`, `a-pg-on`, `a-pg-off` | 139 oracles: 50 violations in R2, R3, R5, R6, 2 withdrawn (R4), 87 held; builder checks 370, 0 failed |

### Not tested (Part A)

The builder's own list (20.7), item by item, and the sixth review's:

1. **Scale:** nothing ran on a server.
2. **Step 5 run end to end:** not automated, and not run here as a procedure. R5 shows its record is incomplete.
3. **`cut-read-race` on PostgreSQL:** run here as R4 (a) and (c), held at `sql/read-frontier`: held.
4. **A gateway that keeps its cache across a restore of the data and the authority:** run (`restore-live`, above).
   What was not run: restarting the gateways after it, which Datomic needs and which decides what is answered then.
5. **X2 and X3 on PostgreSQL in process:** X3 run here (R1 on PostgreSQL, `a-pg-on`, `a-pg-off`): held. X2 (the
   worker and a database missing from the catalog) not run on PostgreSQL; the code does not read the authority there.
6. **The SDK under load, across a gateway restart, and an SDK build without `removalSeen`:** not run here (no SDK
   build of this branch; the builder's `sdk-e2e` stacks only).
7. **A save planned before an attribute's addition and committed after it:** the sixth review's A1, rerun (`x6-on`,
   `x6-subject`): 16 variants, 0 violations; no removed value answered.
11. **The builder's restore stacks D1 to D6, its SDK end to end and its fuzz7 at 40,000 schedules:** not rerun here
    on `383db77d1` (this review: A1 to A3 in process, `restore-live`, and fuzz7 at 2,000 schedules per boundary).
8. **The rollout from an earlier build:** read from the code (the rollout section); not run here.
9. **An earlier build's gateway beside this one** (the sixth review's 2): the builder's `fleet-one` only.
10. **The union rule's "head from another database":** read from the code, not run.

## Part B: the reconciliation at ae82b8984

### Page 1, for the owner

**Is there a break? One, shared with Part A (F1: a stored save sent again after a removal is answered as declined).
The merged rule itself holds on every writer it runs on. Two things are by design and need a written decision: every
declined command is recorded (the reversal of V4), and the creation rule still judges by `sourceK` alone.**

- **The merged rule holds.** On the one-owner narrow and wide writers, the several-owners writer and the general writer,
  all 27 combinations of `frameSourceK`, `sourceK` and `removalSeen` (each absent, older than the removal, or fresh)
  are answered as the rule says: declined when none is stated or any stated one is older (20), stored when every
  stated one is fresh (7). A declined command sent again with every point fresh is declined; a new command is stored.
  The same on the database-wide rule (`TX2_REMOVAL_REPLAY_RULE=1`), per account with the subject check, and on the
  commit boundary.
- **Creation and import frames (`TX2_SUBJECT_CREATE=1`):** 24 of 27. The three combinations with no `sourceK` and a
  fresh `frameSourceK` or `removalSeen` are declined. That is `subject-create/removed-creation?`, which the page names
  as not covered (section 1); it applies to import frames of a new subject as well, which the page does not say.
- **The 11 datoms are right, but the gate's condition is not a bound.** They are the workload's one declined command:
  the record's schema once per database (9 datoms, 10 with the transaction's instant) and one record (2, 3 with its
  instant). Each further declined command adds 3 datoms; a declined save under a command already recorded adds none.
  This reverses the sixth pass's V4 fix on purpose (merged rule, item 4), and I think it is the right choice: one
  command has one outcome. The page's own table names the alternative (the save line's: a declined command sent again
  is stored) as wrong.
- **F1 is broken under the rule (M4):** a stored save sent again after a removal is answered 409
  `ErasureReplayDeclined` on every writer and both boundaries, its operation `committed`. With every option off, the
  save line's answer stands (409 `OperationDuplicate`).
- **`r2-2-race` on the general writer is not a break.** The gate's hook runs the removal inside the save's submit, on
  the thread that holds the database's removal lock; the removal fails (503) and is not acknowledged, and the save
  commits first as an ordinary save before any removal. With the server writers on, all five writers pass.
- **Identities and the paired log:** 66 of 66 shared identities equal the one branch's current head in 11 settings;
  the paired log identical with every option off; per account and commit boundary identical once the 11 decline
  datoms are left out.

**The three most serious findings**

1. **M4, F1 (medium): a stored save sent again after a removal of a value it wrote is answered 409
   `ErasureReplayDeclined`.** The same as Part A's R6, with the merged rule. `decline-check!` (`ae82b8984`
   `removal_commit.clj` 1032) runs before the save on both writers' paths and never asks whether the command is
   already committed; `decline!` (995) then records the committed command as declined. Result: fast and general
   writers, the database-wide rule, per account and the commit boundary: 6 violations of 6; every option off: 409
   `OperationDuplicate`, 2 of 2. Reproduce: `ERA3_MAIN=r7b ERA3_TESTS_REF=674300b17 ERA3_SOURCE_REF=ae82b8984
   ERA3_EXTRA_ENV="TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1" bash
   lab/experiments/EXP-DX1/era3/run.sh <out> subject m4`.
2. **M1, the creation rule (low to medium, documented in part): with `TX2_SUBJECT_CREATE=1`, a creation or an import
   frame of a subject ID a removal named is declined whenever it has no `sourceK`.** `removed-creation?`
   (`subject_create.clj` 83 to 96, called from `privacy.clj` 306 on every writer) compares the removal with `sourceK`
   only and counts a missing one as before every removal. A fresh `frameSourceK` or a fresh `removalSeen` does not
   help. The SDK's optimistic commit carries `removalSeen` and no source, so an optimistic re-creation of a removed
   subject ID is declined on every try, and the SDK's advice ("build a new save from current data") builds the same
   save. Result: 3 of 27 per writer (creation, import frame), every mode run: 6 violations per run. Reproduce:
   `run.sh <out> subject m1` with the settings above.
3. **M3, the V4 reversal (low, by design): every declined command is recorded.** First decline 13 datoms (the
   schema and one record); 20 more declines under new commands 60 datoms in 20 transactions; 20 declines under one
   command 3 datoms (its first record only). A caller that sends a declined save under a command ID another caller
   will use makes that caller's save declined (409). With every option off the same pre-emption exists in another form:
   the first caller's save is stored and the second is answered 409 `OperationDuplicate`. Reproduce: `run.sh <out>
   subject m3`.

**One recommendation: before deciding a save, ask what its command already did.** One lookup at the start of
`decline-check!` answers F1 (a committed command is answered as a duplicate, never declined, and never recorded as
declined) and keeps the merged rule's one outcome per command. Then give `removed-creation?` the merged rule's
earliest point, so a creation is judged like every other save.

### Findings

| ID | Severity | Where (`ae82b8984`) | What | Test | Result |
| --- | --- | --- | --- | --- | --- |
| M4 (F1) | medium | `removal_commit.clj` `decline-check!` 1032, `decline!` 995 | A stored save sent again after a removal of a value it wrote is answered 409 `ErasureReplayDeclined`; its command is recorded as declined while its operation is `committed` | `m4` | 6 of 6 (fast, general; database-wide rule on, subject check, commit boundary); every option off 409 `OperationDuplicate` 2 of 2 |
| M1-c | low to medium | `subject_create.clj` `removed-creation?` 83 to 96; `privacy.clj` 306 | A creation or import frame of a removed subject ID with no `sourceK` is declined, whatever `frameSourceK` and `removalSeen` say | `m1` | 3 of 27 per writer, creation and import frame, on all three modes (`b-rule2`, `b-on2`, `b-commit2`) |
| M3 (V4) | low (by design) | `decline!` 995 to 1011 | Every declined command recorded: the schema once (10 datoms), 3 datoms per newly declined command, none for a command already recorded; a command can be taken by another caller's declined save | `m3` | 13, 60 for 20 commands, 3 for 20 under one command; the other caller's save 409, 6 of 6 runs; every option off 409 `OperationDuplicate` |
| R2, R3, R5, R6 | as Part A | the same functions (`removal_commit.clj` differs from `383db77d1` only in lines 907 to 1060, the replay rule) | Part A's four breaks, unchanged | `r2` to `r6` on `ae82b8984` (`a-on-b`) | the same 22 violations as on `383db77d1` (plus R4's withdrawn one), 50 oracles |

Notes on the table:

- **The first M1 runs (`b-rule`, `b-on`) are not counted.** They gave the non-creating writers one subject for all 27
  combinations, so a combination stored earlier left the value in place and moved the subject past the fresh source
  (409 `CasConflict`, and "the value is stored" for later declined combinations). `e0c57a5f6` gives every combination
  its own subject; `b-rule2`, `b-on2` and `b-commit2` are the counted runs. Their M3 and M4 results are the same as
  the first runs'.
- **V4, the decision asked for.** A deliberate reversal, not a silent regression. The bound is per command, not per
  request, and with every option off nothing is recorded (0 datoms in the paired log). What must change is the text:
  section 19.3 of the removal page ("a save that says nothing writes nothing ... its command not burned") is false on
  this branch with the rule on, and the gate's condition should say what it measures: "the schema once and 3 datoms
  per distinct declined command; the paired workload declines one command, so 11 datoms without the instants".
- **`r2-2-race-on-each-writer` on the general writer, why it fails.** With `TX2_SUBJECT_SAVE=0` (every save takes the
  general writer) the gate's `at-submit` hook calls the removal on the save's own thread, inside the save's
  `privacy/guard`. The guard is a JVM monitor (re-entered by the same thread) and then a file lock, which the same JVM
  cannot take twice: the removal fails with `OverlappingFileLockException` (`triplex.removal-failure.v1`, where
  `reply`) and is answered 503. Nothing was acknowledged; the save commits as an ordinary save before any removal; the
  SDK's replay is 409 `OperationDuplicate`. A removal from any other thread waits on the monitor and then removes the
  value. 5 of 5 cases fail this way (10 assertions) in `b-s5a3-general`; with the server writers on (`b-s5a3`) all 5
  pass (removal 200, the save 409 declined, the replay declined, nothing stored).

### Attacked without a break

| What | Runs | Count |
| --- | --- | --- |
| **M1 the merged rule, 27 combinations**, one-owner narrow and wide, several owners, general: declined exactly when no point is stated or a stated point is older | `b-rule2` (database-wide, rule on), `b-on2` (subject check), `b-commit2` (commit boundary) | 4 writers x 27 x 3 runs = 324 saves, every one as the rule says; 12 oracles, 0 violations |
| **M2 inside M1**: a declined command sent again with every point fresh is declined; a new command with fresh points is stored | the same | 6 writers x 3 runs x 2 oracles = 36, 0 violations |
| **The save line's race and replay group** (`attack3_gate`, `S5_ONLY=r22`) with the server writers on: every writer's race declined and its replay declined, nothing stored; the refused-before-a-removal case declined for the SDK's replay and the caller's resend | `b-s5a3` | 12 tests, 22 of 23 assertions; the one failure is R3-6, the merged rule's item 3 by design |
| **Identities against the one branch's current head** | `idents` | 66 of 66 shared equal in all 11 settings; 4 missing (index hints'); 2 new (the removal fence's) |
| **The paired native log** | `paired` | every option off identical datom for datom, replies identical; per account and commit boundary identical without the decline datoms (11 per run); the source-less case 200 |
| **The sixth review's policy and worker cases on this branch** (A2, A3, B1, B2, G1, G2) | `x6-b` | 72 oracles, 0 violations |
| **Counts, Part B in process** | `b-rule2`, `b-on2`, `b-commit2` (M1 to M4), `b-rule`, `b-on`, `b-off` (M3, M4 only), `a-on-b`, `x6-b` | M1 and M2: 54 oracles, 6 violations (M1-c); M3: 8 oracles, 8 violations (6 with the rule on; 2 with every option off, the `OperationDuplicate` form); M4: 8 oracles, 6 violations, the 2 with every option off held; `a-on-b` 50 oracles, 22 violations and 1 withdrawn; `x6-b` 72, 0 |

### Not tested (Part B)

1. **The save line's other gates** (`attack2_gate`, `outcome_gate`, `stored_ids_gate`, the rest of `attack3_gate`) and
   the removal branch's full gate: the builder's runs only.
2. **`fuzz8`** (the mixed fuzzer): the builder's 80,000 schedules only.
3. **The SDK's replay end to end on this branch** (an SDK build of `ae82b8984`): the gateway answers only.
4. **The paired log and identities on a merge of this branch with the one branch's head:** no such commit exists yet
   (answer 1).

## The rollout question: a build that rewrites the general writer once

The builder's not-tested item 8: a rollout from an earlier build of the removal branch rewrites the general writer
once. What that does:

- **From the one branch, nothing.** Every identity the reviewed branches share with `efee27905` is equal, the general
  writer's included, so a gateway of either branch opening a scope the one branch opened finds its own hash and
  rewrites nothing (`commit.clj` `install-base!`, called at every scope open, `main.clj` 93).
- **From `03bb49cd3` or older (lab builds only),** the general writer's text differs in generated names only. Each
  gateway rewrites `:triplex/commit` when it opens a scope whose recorded hash is not its own: one transaction with the
  function's whole text and the new hash. In a mixed fleet the two builds rewrite it back and forth, once per scope
  open by the other build, and each rewrite stays in the database's history. While the recorded hash is not a
  gateway's own, its one-owner writer declines the scope and its saves take the general writer. The saves stay
  correct, because both texts are the same code (the builder's `fleet-one` with `03bb49cd3`: 18 of 18 requests 200).
  Read from the code; the alternation was not run here.
- **What it says about the save line's design** (new stored functions in namespaces loaded last, so that no existing
  identity moves): the design protects the identities only while every build in a fleet compiles the shared
  namespaces the same way. Nothing at run time notices when one does not, apart from the hash rewrites above. The
  check is the identity measurement on each merge commit, before it ships (answer 1).

## Tests, how to run them, evidence

Every heavy step ran through `node lab/bin/heavy.mjs --label DX-ERA3-7-<step> -- <command>` with
`DOCKER_HOST` set to the lab VM's socket, at most two at a time.

- **Part A cases:** `ERA3_MAIN=r7 ERA3_SOURCE_REF=383db77d1 ERA3_EXTRA_ENV=TRIPLEX_ERASURE_SHRED_GRACE_MS=0 bash
  lab/experiments/EXP-DX1/era3/run.sh <out> <on|subject|off> "r1 r2 r3 r4 r5 r6"`; `ERA3_PG=1` for the PostgreSQL
  authority (runs `a-pg-on` "r1 r4 r5 r6", `a-pg-off` "r1"). R2, R3 and R5 need a per-account mode.
- **Part B cases:** `ERA3_MAIN=r7b ERA3_TESTS_REF=674300b17 ERA3_SOURCE_REF=ae82b8984 ERA3_EXTRA_ENV="TX2_SUBJECT_PREFETCH=0
  TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 [TX2_REMOVAL_REPLAY_RULE=1 | TX2_REMOVAL_COMMIT_BOUNDARY=1
  ERA3_7B_COMMIT=1]" bash .../run.sh <out> <off|subject> "m1 m3 m4"`. `ERA3_TESTS_REF` is the commit whose `s5/` and `w2/`
  helpers the cases load.
- **The save line's gate group:** `ERA3_MAIN=s5a3 ERA3_TESTS_REF=674300b17 ERA3_SOURCE_REF=ae82b8984
  ERA3_EXTRA_ENV="... S5_ONLY=r22" bash .../run.sh <out> off -`, once with the server writers on and once with
  `TX2_SUBJECT_SAVE=0`.
- **Identities:** `bash lab/experiments/EXP-DX1/era3/idents7.sh <out> efee27905 383db77d1 ae82b8984` (the tools from
  the reference commit). **Paired log:** `bash .../paired7.sh <out> efee27905 383db77d1 ae82b8984 3257e3c6d`.
- **fuzz7 spot check:** `ERA3_MAIN=7 ERA3_BOUNDARY=<log|commit> ERA3_N=2000 ERA3_SEED=<7911|7921> ... run.sh <out>
  <on|subject> fuzz7`.
- **Stack:** `BOUNDARY=<log|commit> SEALED=1 SOURCE_REF=383db77d1 bash .../stack6.sh <out> <bodies> restore-live`, the
  bodies from the sixth review's `bodies6` run.
- **Run notes:** the first M1 runs (`b-rule`, `b-on`) used one subject for all combinations of the non-creating
  writers; they are kept and not counted for M1 (their M3 and M4 are). `e0c57a5f6` fixed the case before `b-rule2`,
  `b-on2` and `b-commit2` started; each run's `tests` file names the commit its tests came from.
- **Evidence:** the archive `DX-ERA3-7.tar.gz` in the lab's evidence folder for this reviewer (outside the repository):
  predictions, every run's log with its image and source commit, the identity and paired outputs, the stack's steps,
  replies and lines.
- **Cleanup, 17:41 EST:** `docker ps -a --filter label=tx2.holder=DX-ERA3` lists 0 containers; by name (`tx2-dxera3*`,
  which covers the stacks' and PostgreSQL containers) 0; no `dxera3` network; no volumes; no image was built, pulled
  or removed.

Branch head: the commit that adds this page, "DX-ERA3: seventh review ..." (`git log -1 --
lab/experiments/EXP-DX1/era3/REVIEW-7.md`), on `exp/DX-ERA3-removal-review`.

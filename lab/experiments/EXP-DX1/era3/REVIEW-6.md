# Sixth adversarial review: the per-account removal at 03bb49cd3 (DX-ERA3, 2026-11-25)

Reviewer DX-ERA3, branch `exp/DX-ERA3-removal-review`, which merges `origin/exp/DX-ERA2-removal-per-account` at
`03bb49cd3` (gateway code unchanged since `b047b22a0`; the merge is `8feee4c05`, taking the builder's copies of
`era3/run.sh` and `era3/attack5.clj` with their two adapted oracles). **This review is pinned to `03bb49cd3`.** The
removal code was not changed. This pass adds:

- `era3/attack6.clj`: cases A1 to A3 (the builder's own not-tested items), B1 and B2 (the log's copy of the policy
  made to disagree, and the readers that trust it), C (adoption from this database's own past), D1 and D2 (what the
  rule for a save that says nothing costs; what `removalSeen` stands for), F (the rebuild route's repair, called by
  anyone while an intent is torn), G1 and G2 (the key-shred worker's loops), A2b and H (the restore route after a
  copy rewrite, and without one), and request bodies for the stack;
- `era3/stack6.sh`: real Datomic backups and restores on a PostgreSQL stack (a restore from before an addition, with
  the data level with the log and behind it; the data and the removal authority restored to the same backup), two
  gateways adding attributes at once, the key pool after a real gateway restart, and a plain restore as the control;
- a rerun of the fifth review's cases (`attack5.clj`, with the builder's adapted oracles) and fuzz5 on this head.

Conditions: Mac only, toy sizes, the lab VM shared with other builders; every time is diagnostic. The code diff
(`61692eec8...03bb49cd3 -- packages/`: 10 files) was read before the page's section 19. Predictions were written at
09:41 EST (`predictions.md` in the evidence), before the first run; X1 to X5, X9 and X10 came out as predicted, and so
did the cases without a break; X6's answer code, X7 and X12 were not predicted. Every container ran the pinned runtime
image `sha256:21a67288007d...` with this branch's gateway source mounted (PostgreSQL `sha256:526f86d93c6e...` on the
stacks), recorded per run. Written 2026-11-25, 10:05 to 11:20 EST.

## Page 1, for the owner

**Is there a break? Yes, four high ones (one on the file authority only). The fifth review's two policy breaks (V1, V2)
are fixed, and V3 to V9 pass their reruns. Without a restore, no read answered a value after its removal was
acknowledged (every case, 80,000 fuzzer schedules), unless a later save stored it again (X5). The new breaks are in what
the removal log's copy of the policy, and the key-shred worker, are allowed to change:**

- **A data restore can make the database forget a protected attribute.** After the data is restored from a backup
  taken before an attribute was added, the first removal (or rebuild, or protection call) rewrites the log's copy from
  the restored, shorter policy. The only record of the addition is gone, the restore route has nothing to take back,
  and that removal is acknowledged while the subject's values of the added attribute stay answered.
- **The worker can delete every key of a live database.** If a database is absent from Datomic's catalog for one
  worker pass while one of its removals is stale (for example, deleted and then restored from a backup), the worker
  retires its removal log and every key. Every sealed value of that database is then unreadable for good.
- **The key pass trusts the log's copy of "sealed", and one unreadable log file stops it everywhere.** A copy that
  says "unsealed" stops key deletion for that database, silently. On the file authority, one database's unreadable
  `head.json` stops key deletion and the completion of stale removals for every database (also on the merged line).
- **A restore of the data and the removal authority to the same backup undoes every removal made after it,** with
  no refusal and no start-check line (X10). The code says so in a comment; the rollout must say so too.
- **How sure:** each reproduces every time it ran, on both boundaries and both per-account modes, in process; X1 and
  X10 also on a PostgreSQL stack with real `backup-db` and `restore-db`, 4 of 4 runs each.

**The three most serious findings**

1. **X1 (high, both boundaries): after a data restore from before an addition, any locked step rewrites the log's
   copy from the shorter policy, and the addition is lost.**
   - **What happens:** the restored data carries the stored policy as it was before the addition (`[":v"]`); the log
     still lists `[":v" ":q"]`. The page says the restore route takes the addition back from the log's copy
     (19.1, 19.2). But a removal (`erase!` 741 to 746), the rebuild route (`rebuild-locked!` 1131 to 1132) and the
     protection route (which runs `rebuild-locked!` first) all call `sync-policy-copy!` (1052) **before** anything
     else, and it rewrites the copy to the stored list whenever they differ. `covers!` checks only the attributes that
     removals already removed. The copy is then `[":v"]`; the restore route's `rebuild!` (1320) finds nothing to add.
   - **With a removal as that step:** the removal of subject a1 is acknowledged (200) while a1's values of `:q` (saved
     before the addition, and saved after the restore) stay answered on every read route. They stay answered after the
     restore route and after the service declares `[":v" ":q"]` again; only a second removal of a1 masks them.
   - **Reach:** the step runs before the refusal for data behind the log, so the backup need not be newer than the
     last removal. On the stack, with a removal of b1 made after the backup (the restored data behind the log), a
     removal of a1 sent before the restore route was refused 503 `RemovalDataBehind` and still rewrote the copy to
     `[":v"]` first (4 of 4 runs). In the two runs whose restore route then answered (both sealed), the client's retry
     of the removal was acknowledged and a1's `:q` value from before the addition was answered after it. In the two
     unsealed runs the restore route answered 503 (X12) and the run did not call it again.
   - **Tests:**
     - in process, `attack6.clj` `a2` (`ERA3_PHASES=a2`), the stored policy set back by a transaction as the
       builder's own gate does it: 24 variants (a removal, the rebuild route or the protection route with the old
       list; both boundaries; unsealed and sealed; both per-account modes). The restore route took `:q` back in 0 of
       24; with the removal step, a1's `:q` values were answered after its acknowledged removal in 8 of 8. Controls
       (the restore route first, or nothing before it): 16 of 16 pass;
     - on a PostgreSQL stack with real `backup-db` and `restore-db` (`stack6.sh all6`, D1), 4 of 4 runs (both
       boundaries, unsealed and sealed): the removal rewrote the copy to `[":v"]`, and after the restore route and the
       service's `[":v" ":q"]`, a1's two `:q` values (the one from before the addition, the one saved after the
       restore) were answered on the current and history reads; a second removal masked them. The control (D2, the
       restore route first): 0 answered, 4 of 4.
2. **X2 (high, both per-account modes): the worker retires the log and every key of a live database that is briefly
   absent from the catalog.**
   - **What happens:** `complete-stale!` (968) reads Datomic's catalog once per pass when a removal is stale (30 s by
     default). A database with a stale removal that is not in the catalog has its log and **every key** deleted
     (`removal-repair/retire-log!`): not only the keys of removed values, also the keys of every live sealed value.
   - **When a live database is absent:** while it is deleted and restored from a backup, or recreated by an operator.
     When it comes back, every sealed value in it is unreadable for good. The gateway's own delete route retires the
     keys too, by design (V5), so a delete-then-restore through the gateway loses them as well.
   - **Test:** `g2` (`ERA3_PHASES=g2`): a sealed database with three subjects, a removal of a1 stopped after its intent,
     the database deleted directly (`d/delete-database`), two worker passes: the keys of b1's and c1's live values
     went from 2 to 0; the log was gone. Both per-account modes.
3. **X3 (high for keys, both boundaries): the key pass reads "sealed" from the log's copy, which nothing checks.**
   - **What happens:** the head's `"sealed"` and `"attributes"` are outside the head's seal; `privacy/cut` accepts any
     Boolean when it has no cached head. The key pass (`envelope/shred-published!` 205) deletes keys only `(when
     (:sealed cut))`. The copy is rewritten only by the next removal or route. Its second reading after a failure
     (`removal-repair/shred-after-failure!`) takes the same flag.
   - **Then:** in a sealed database whose copy says `false` (a hand edit, storage damage, or an earlier build's
     protection route writing a head from a request during the roll, as V1 did on `61692eec8`), no key of a published
     and due removal is deleted, on any pass and after a restart, and **nothing is counted**. Reads and saves are served
     normally (they use the stored policy). The next removal rewrites the copy; the keys then go.
   - **Test:** `b1`: both boundaries, both per-account modes: keys alive after 3 passes, 1 of 1; after a restart (the
     cache and the progress mark cleared) and 3 more passes, 1 of 1; after the next removal and 2 passes, 0. Failures
     counted: none. 8 of 8 oracles fail.

**One recommendation: nothing derived may shrink a policy or delete a key.** Four small changes, one rule:

- the log's copy only grows: `sync-policy-copy!` writes the union of the copy and the stored policy, and a stored
  policy that lacks an attribute the copy lists is treated like data behind the log (writes and removals wait for the
  restore route, which adds it back) (X1);
- the key pass deletes due keys whatever the copy says about `sealed` (deleting a missing key is already harmless)
  (X3);
- the worker never retires a log or deletes a key because a database is missing from the catalog; only the delete
  route does (X2);
- each database's record in the worker's listing is read inside that database's own `try` (X4).

## Fit to merge DEFAULT OFF? What must be true before any database moves?

**Merge DEFAULT OFF: yes, with two facts stated where the merge is described.**

- - **Nothing on the per-account path runs with the options off.** X1, X2, X3, X6, X7 and X8 need
  `TX2_REMOVAL_PER_ACCOUNT=1` and a database moved through its route. The builder's paired native log is identical datom
  for datom with every option off (19.8); this review's database-wide runs agree (`c-off`: X4, D1 and D2 on the
  database-wide rule; `r5-off`: Z7, 12 builder checks, 0 failed).
- **Fact 1: "default off" is not "inert".** The rule for a save framed before a removal (R2-2, Z7) and the stamp
  headers run on **every protected database in every mode**, options off included (`main.clj` 537 and 584 call
  `decline-check!` on any protected database). A save that says nothing about its frame and writes a removed subject's
  protected value is refused 409 where `exp/DX-INT1` would store it, and the rule's cost grows with every removal ever
  made in the database (X9).
- **Fact 2: X4 is already on the merged line.** `envelope/authority-scopes` on `exp/DX-INT1` (`8a362ac38`) parses
  every database's `head.json` outside any `try`, as here. This branch does not make it worse with the options off;
  it adds the completion of stale removals behind it when the option is on.

**Before any database is moved per account (or to the commit boundary), all of these must be true:**

1. **X1 fixed** (the copy only grows, or a stored policy narrower than the copy refuses until the restore route), or
   the restore procedure forbids every request to the database between a data restore and the restore route, and
   checks it.
2. **X2 fixed** (the worker never retires on a catalog read), or the procedure forbids deleting a database to restore
   it, through the gateway or not, and the worker's completion is off during any restore.
3. **X3 fixed** (the key pass ignores the copy's `sealed`), and the start check reports a copy that differs from the
   stored policy.
4. **X4 fixed**, or the PostgreSQL authority only (its listing reads no file).
5. **A data restore never restores the removal authority with it** to the same backup (X10). On the stack, with the
   records and the keys put back, the acknowledged removal of a1 was undone after the restart: a1's removed value
   answered on both gateways, the frontier at sequence 0, no start-check line (4 of 4 runs). With the records only:
   sealed, every read of a1 503 `ErasureFrontierUnavailable` until the removal is sent again; unsealed, a1's removed
   value answered. The code knows (`erase.clj` `replay-after-restore!`: "Rejected: restoring the old authority
   alongside the old data (it would make the removed bytes available again)"); nothing refuses it.
6. **The rollout's five steps (19.6)** as written, with step 2 extended: no start-check line, and the stored policy
   equal to the log's copy on every database.
7. **X7 typed** (a removal sent while its intent is unreadable gets 503, not 400), so clients retry instead of giving
   up.
8. **The decision on X5 written down**: `removalSeen` says only "this client has seen an answer at least this new from
   this database", not "the data this save was built from is that new". With it, the rule stops a stale save only
   until the client sees any newer answer about anything in the database.

## Findings

| ID | Severity | Where | What | Test | Result |
| --- | --- | --- | --- | --- | --- |
| X1 | high | `removal_commit.clj` `sync-policy-copy!` 1052, called from `erase!` 746, `rebuild-locked!` 1132 | After a data restore from before an addition, the first removal, rebuild or protection call rewrites the log's copy to the shorter stored policy; the restore route then has nothing to take back; a removal in that window leaves the subject's values of the added attribute answered | `a2`; stack D1, D6 | in process: `:q` back after the restore route 0 of 24; values answered after an acknowledged removal 8 of 8; controls 16 of 16 pass. Stack: values answered after the acknowledged removal 4 of 4 (D1); the copy rewritten by a refused removal 4 of 4 (D6) |
| X2 | high | `complete-stale!` 968 to 988, `removal-repair/retire-log!` | A database missing from the catalog during one pass while a removal is stale loses its log and every key, live values' keys included | `g2` | live keys 2 → 0, both per-account modes |
| X3 | high (keys) | `envelope/shred-published!` 205, `removal-repair/shred-after-failure!` | The key pass deletes keys only when the log's copy says sealed; the copy is outside the head's seal and unchecked; nothing is counted | `b1` | keys alive after 3 passes and after a restart, 4 of 4 variants; deleted only after the next removal rewrote the copy |
| X4 | high (file authority) | `envelope/authority-scopes` 185 to 196 (also on `exp/DX-INT1`) | One database's `head.json` that does not parse, or names no database, throws out of the listing: no key deletion and no completion of stale removals for any database, every pass (the worker counts one `shred-worker` failure a pass) | `g1`, 3 variants | another database's due key alive and its stale removal still pending, 3 of 3 per mode, both per-account modes; with every option off (database-wide) the other database's due key alive, 3 of 3; recovers when the file is put back |
| X5 | medium (design) | `removal-after-source` 849; SDK `DatomicClient.ts` 629 to 635 | `removalSeen` is one number per database; any answer about any subject or account moves it; the SDK takes it from every answer and never drops its cached rows when it moves. A save of a removed subject's removed value framed with a stamp learned from another subject is stored | `d2` | 200 and the value answered again, 4 of 4 (another subject, another account; both boundaries); with the stamp held when a1 was read: 409 |
| X6 | medium (operations) | `protect!` 1184 | Two callers adding different attributes: the second is refused 409 `ProtectionPolicyMismatch` (503 when the lock is lost) and its retry is refused 409 again, for good, until one call names both. The page (19.9, item 3) says its retry adds on top. After any addition, an instance whose list lacks it (a rollback, or the old half of a rolling deploy) is refused at every protection call | `a3`; stack D4 | no attribute lost, copy equal to the stored policy, union when one call names both: all rounds pass; retries 409 in every round. Stack: every round of 6, in 4 of 4 runs: one gateway 200, the other 409; the union of all 13 attributes stored once one call named both |
| X7 | low to medium | `privacy/pending` read by `erase!` | While an intent record is unreadable (state 11), a removal (its resend, or another command's) is answered **400 `GatewayError`** with the JSON parser's message; reads and saves get the typed 503. A 400 is terminal for clients | `f` (rerun `c2-*`) | 400 for both removals, 503 for read and save, 4 of 4 variants per mode |
| X8 | low (hand edit) | `rebuild!` 1320 to 1330 | The restore route adds whatever attributes the log's copy lists that the stored policy lacks, with no check of the names. `":_tx/position"` added this way makes every later save 400 `ProtectedTypeUnsupported`, for good (an attribute is never dropped); the service's own list is refused 409 for good | `b2` | `:z` and `:_tx/position` stored; saves 400 with the latter; the narrower copy: no effect |
| X9 | medium at scale | `removal-after-source` 849 to 870, `decline!` 897 | A save that says nothing is checked against every removal ever committed in the database; each refusal prints one log line, not rate-limited | `d` | the rule alone (median of 30): 0.07 ms at 1 removal, 0.12 at 301, 0.37 at 1,201, 1.07 at 2,401, 1.87 at 4,801; one line per refusal (50 for 50) |
| X10 | precondition | `erase.clj` `replay-after-restore!` | The data and the removal authority restored to the same backup | stack D3, D3b | records and keys back: a1's removed value answered on both gateways after the restart, frontier 0, no start-check line, 4 of 4; records only: sealed, reads of a1 503 until the removal is sent again (2 of 2); unsealed, answered (2 of 2). The removal sent again: 0 answered, 8 of 8 |
| X11 | none | `removal-repair/take-key-refilled!` | N1 after a real restart of both gateways | stack D5 | the first sealed save on each restarted gateway 200, both values read back, 4 of 4 runs |
| X12 | low | `erase.clj` `replay-after-restore!` (calls `privacy/cut`, not `log-cut`) | The restore route on a gateway whose cache holds the log's copy from before another gateway rewrote it answers 503 `ErasureFrontierUnavailable` ("cannot be verified"). Any other request on that gateway re-reads the head (`log-cut`), and so does its key pass within a pass (500 ms; F1's second reading); the route then answers 200. On a stack the cache is the one the key pass filled. An operator's restore step can fail once with an untyped 503 | `a2b`; stack D1, D6 | in process 8 of 8 (503, then a read, then 200); stack: 3 of the 8 restore-route calls made after a copy rewrite answered 503. Control (`restore-plain`, a real restore with no policy change, unsealed): the route 200 with a removal to replay and with none (both boundaries: 4 of 4 calls 200, the removed value not answered before or after) |

Notes on the table:

- **X5 is by the rule's design** (case 3: a save framed after the removal is a new save). The finding is what the
  frame means: one answer about anything in the database moves it. The fifth review's V3 (an SDK build that sends no
  frame is refused for good on that subject's protected attributes) still holds: its way out is a newer client, which
  the page's count of "states whose way out needs a particular client: none" (19.2) does not include.
- **A1 is not a finding.** In an unsealed database the late save interleaves with the addition (stored in clear, as
  the page says; masked by a later removal; refused 409 when a removal of its subject came between). In a sealed
  database the addition waits for the held save (the hold is at `storage/submit!`), so the two cannot interleave there.

## Attacked without a break

| What | Runs | Count |
| --- | --- | --- |
| **A1** a save planned before an addition and committed after it, with and without a removal of its subject between (both boundaries, unsealed and sealed, both per-account modes) | `c2-on`, `c2-subject` | 16 variants, 24 oracles, 0 violations |
| **A2 controls**: a data restore from before an addition, then the restore route first, or nothing before it | `c-on`, `c-subject` | 16 variants, 32 oracles, 0 violations |
| **A3** two callers adding at once, with the lock and with it lost: no attribute lost, the copy equal to the stored policy, the union once one call names both | `c-on`, `c-subject` | 8 variants, 64 rounds, 24 oracles, 0 violations |
| **B2** a hand-edited copy: a removal still removes by the stored policy; a narrower copy has no effect | `c-on`, `c-subject` | 12 oracles, 0 violations (its other 6 oracles are X8) |
| **C** adoption from this database's own earlier head (sequence 0 and 1, unsealed and sealed): adopted, caught up from the data, every removed value masked | `c-on`, `c-subject` | 8 variants, 8 oracles, 0 violations |
| **F** the rebuild route with a body (400) and called in a loop by three callers while the client resends a removal whose intent is torn: applied exactly once, nothing pending, the other subject kept | `c-*`, `c2-*` | 16 variants, 32 oracles, 0 violations (X7 is the separate answer code) |
| **G3** the other worker loops: the start check and the pool refill catch per database; `complete-stale!` catches per database once its listing is read (the listing itself is X4) (code read; the stack's start check named only the database that was behind) | code, stack | no failure outside X4 |
| **The fifth review's cases** on this head (W1, W2, W3, P1, P2, C1, Z7a to Z7f, S1, T1 to T3, W5; the builder's two adapted oracles) | `r5-on`, `r5-subject`, `r5-off` | 123 and 124 oracles, 0 violations; database-wide Z7: 12 builder checks, 0 failed |
| **fuzz5**, key grace 0 | `f-*` | 80,000 schedules, 836,735 oracles, 0 violations: the commit boundary 40,000 (418,433 oracles; per account unsealed and subject check sealed), the log's boundary 20,000 (209,279; per account sealed and subject check unsealed), across the move 20,000 (209,023) |
| **Stacks**: the restore-route-first control (D2), two gateways adding at once (D4: every round one 200 and one 409, the union stored once one call named both), N1 after a real restart of both gateways (D5: the first sealed save on each 200, read back) | `st-*` | 4 stacks (both boundaries, unsealed and sealed): D2 0 values answered, 4 of 4; D4 24 rounds as described; D5 4 of 4 |
| **A real data restore with no policy change** (`restore-plain`): the data behind the log by one removal (E1), and level with it (E2) | `sp-*` | both boundaries, unsealed: the restore route 200 in 6 of 6 calls; the removed value masked before the route (the commit boundary serves the read) and after it |

## Not tested

1. **The SDK end to end** (its Reach cache under load, an SDK client across a gateway restart, an SDK build without
   `removalSeen`, `ensureRemovalStamp` racing a removal): no SDK build of this branch here (it needs a built second
   checkout; the Mac is short of disk). Covered at the gateway instead: X5 (`d2`), Z7 (`z` rerun), and the code read:
   `ensureRemovalStamp` runs only when the client holds no stamp, and an optimistic commit needs every predecessor in
   its cache, so a race with a removal frames the commit before the removal (declined), not after it.
2. **An earlier build's gateway beside this one** (X3's third route, and step 1 of the rollout): not run.
3. **A gateway that keeps its cache across a data and authority restore** (X10): Datomic's restore needs the
   transactor stopped, and the stack restarted the gateways with it.
4. **X2 and X3 on the PostgreSQL authority** in process: by the code they are the same (`complete-stale!` and the key
   pass do not depend on the authority). X4 does not apply there (the listing is one SQL query).
5. **A fuzzer with policy events** (additions, copy edits, data restores of the policy): cases only.
6. **Scale**: every number here is a toy on the Mac; nothing ran on a server.
7. **The builder's own gate** (`era2/gate.sh`) was not rerun here.

## Tests, how to run them, evidence

- In process: `ERA3_MAIN=6 bash lab/experiments/EXP-DX1/era3/run.sh <out> <off|on|subject> "<phases>"`, phases from
  `a1 a2 a2b a3 b1 b2 c d f g1 g2 h bodies6`, with `ERA3_EXTRA_ENV=TRIPLEX_ERASURE_SHRED_GRACE_MS=0`; `ERA3_D_NS`
  sets D1's removal counts (`"2400 4800"` for the larger run).
  - The fifth review's cases and fuzz5: `ERA3_MAIN=5 ...`, as in `REVIEW-5.md`; this pass ran fuzz5 with
    `ERA3_BLOCK=200` and seeds 6110, 6111, 6210, 6211, 6310, 6311.
- Stacks (PostgreSQL authority, a write and a read gateway): `BOUNDARY=<log|commit> SEALED=<0|1> bash
  lab/experiments/EXP-DX1/era3/stack6.sh <out> <bodies> <all6|restore-plain>`; the bodies from `ERA3_MAIN=6 ...
  run.sh <dir> subject bodies6`.
- `H` (the restore route after one removal, no restore, both boundaries): 16 variants, 16 oracles, 0 violations; it
  ruled out a restore-route fault without a copy rewrite before `a2b` found X12.
- Run notes: the first `all6` run stopped at its authority backup (PostgreSQL cut the long table names to the same 63
  bytes); it was fixed and rerun, and its partial output is kept as `st-log-sealed1.failed-table-name`. The first
  `restore-plain` run never started the stack after the restore; it was deleted and rerun. The first `A1` and `F` runs
  (`c-on`, `c-subject`) used attack5's `in-submit`, which left the held thread running past 3 s in sealed databases;
  `c2-*` reran both with a hold that waits, and the page counts `c2-*` for them. Only the smoke run started from the
  working tree before `attack6.clj` was committed (unchanged, as `c7a097cbb`); it is not counted. Every run's `tests`
  file names the commit its tests came from.
- Evidence: the archive `DX-ERA3-6.tar.gz` in the lab's evidence folder for this reviewer (outside the repository):
  the predictions file, every run's log with the image ID it ran and its source commit, the stacks' steps, replies and
  start-check lines.
- Cleanup, 11:19 EST: `docker ps -a --filter label=tx2.holder=DX-ERA3` lists 0 containers; by name (`tx2-dxera3*`,
  which also covers the stacks' containers) 0; no volumes; no image was built or pulled.

Branch head: the commit that adds this page, "DX-ERA3: sixth review ..." (`git log -1 --
lab/experiments/EXP-DX1/era3/REVIEW-6.md`), on `exp/DX-ERA3-removal-review`.


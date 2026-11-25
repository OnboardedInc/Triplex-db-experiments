# DX-ERA6: the per-account removal on the save line

Branch `exp/DX-ERA6-removal-on-save-line`. It merges two lines:
- **the removal branch's seventh pass** (`exp/DX-ERA2-removal-per-account`; its page is
  `era2/REMOVAL-PER-ACCOUNT.md`, section 20);
- **the save line's head `cdfc70e02`** (`exp/DX-S6-save-line-fixes`; its page is `s6/SAVE-LINE-FIXES.md`).

`origin/exp/DX-INT1` did not contain `cdfc70e02` when this branch was made (`git merge-base --is-ancestor` said no),
so the save line's head is merged directly. Every option defaults off. Mac, toy sizes; every time is diagnostic.

## 1. The merged rule for a save framed before a removal

This follows the save line's third review (`s5/REVIEW-3.md`, section 2). Its comparison of the two rules:

| Case | Save line | Removal branch | Right |
| --- | --- | --- | --- |
| The SDK's replay across a removal (a fresh source) | declined (first source) | stored (own source) | save line |
| The same command sent again after the decline | stored | declined (recorded) | removal branch |
| A new value long after a removal, first attempt optimistic | declined (null first source) | stored with its stamp | removal branch |

**The rule on this branch, with the replay rule on** (`TX2_REMOVAL_PER_ACCOUNT=1` or `TX2_REMOVAL_REPLAY_RULE=1`):

1. **A save is framed at the earliest point it states.** The points are its first attempt's source (`frameSourceK`,
   which every replay carries), its own source (`sourceK`), and the removal stamp it holds (`removalSeen`; on a replay,
   the first attempt's).
2. **When it is declined.** A save is declined (409 `ErasureReplayDeclined`) when a removal that names a protected
   value it writes is later than any point it states:
   - against a source, the comparison is by the removal's published position;
   - against `removalSeen`, by the removal's sequence.
3. **When it counts as framed before every removal.** This applies to a save that states none of the points, and to
   a replay whose first attempt stated no source (`frameSourceK` null) and that carries no stamp. The SDK always
   states one: an optimistic commit carries `removalSeen`, and a replay carries the first attempt's.
4. **A declined command is recorded,** whatever the save stated, once per command. Every later save under it is
   declined. A new command is a new save.
5. **The writers do not judge `frameSourceK` again.** `removal-commit/decline-check!` runs before the save on both
   writers' paths, and `after-refusal` runs after a refusal at the serial point, including the save line's own
   `ErasureReplayDeclined` for a creation racing a removal. Both use the rule above. The writers then see the request
   without `frameSourceK`, so the save line's own check (`storage/replay-frame-check!`, first source only) does not
   decline a replay the merged rule lets through. That was the save line's R3-6.
6. **With the replay rule off (every option off),** the save line's own rule answers, unchanged: a replay is judged by
   its first source, and a null first source counts as before every removal. No command is recorded, and no stamp
   header or `removalStamp` is sent. This is the one branch's behaviour once it takes the save line.

**The SDK** (`DatomicStorageAdapter.ts`):
- `wire()` carries `removalSeen`;
- a replay carries the first attempt's `removalSeen` beside `frameSourceK`;
- on `ErasureReplayDeclined` it reads the head once and throws `WriteError` (the save line's handler). It never sends
  the declined save again.

**Creations and import frames follow the merged rule (since the eighth pass, M1 of the seventh review).** Until
`c01f2f0c4` the creation option's `subject-create/removed-creation?` (`TX2_SUBJECT_CREATE=1`) judged a creation by its
own `sourceK` only, so a creation or import frame with no `sourceK` was declined whenever any removal had named its
family, even when its `frameSourceK` or `removalSeen` was later than the removal (3 of the review's 27 combinations).
With the replay rule on it now asks `removal-commit/creation-removal`: the same `frame-tests` over the save's
`sourceK`, `removalSeen` and the original request's `frameSourceK` (`*frame-input*`, bound by `main.clj` before the
writers strip it). With the rule off the old check answers, unchanged. Section 5 has the test.

## 2. What the merge kept

- **The save line's `write-status`** in both of `main.clj`'s catch handlers (an unrecognised failure of a write route
  is 503 `OutcomeUnknown` when undecided, never 400; F1 of the save line).
- **In front of it:** the removal branch's handling of an authority fault (a lost PostgreSQL session is a typed 503).
- **The N3 reply rule:** a typed refusal keeps its own message, and anything else answers a fixed text.
- **Load order.** The several-owners and creation namespaces load after every other stored-code namespace, and the
  removal scope loads after them (`storage` and `main` require it last).
- **The planners.** The one-owner, several-owners and creation planners fence on `removal-scope/fence-seq`.
- **The import's families** beside the per-account entry in `privacy/apply-entry`.
- **R3-2, route 2.** The removal route refuses a command ID that begins with the reserved account prefix (400
  `InvalidValue`, `account-claims/check-ids!`). A removal can no longer take an account's scoped command ID first.
  The check is in `main.clj`'s removal route, not in `erase!`, so a pending removal from before this build still
  completes.
- **E4 of DX-ERA4's gate (e), from the removal branch (`383db77d1`, its page section 20.8).** Another account's write
  was refused 503 `ErasureFrontierUnavailable` while a removal published: the replay rule read the log without a
  retry, and `privacy/cut` compared the head it read with a newer head this gateway had verified meanwhile. The merge
  takes both fixes (the cache read before the log; the rule's attributes from the stored policy) and the forced test
  `cut-read-race`. The save line's own cut read (`storage/removal-race-declined?`) runs on databases guarded
  database-wide only (`d224cb7d7`), where every request already waits for a pending removal.
- **A text for the race decline.** `reply/commit-message` gives the save line's mapping of a creation racing a removal
  (`ErasureReplayDeclined`) a fixed text instead of the generic one.

## 3. Stored-function identities

`s3/idents.clj` on this branch against the one branch's head `8a362ac38`, in all 8 writer settings (base, server,
server-wide, server-wide-hints, serial-retire, owner-head, several, create):
- **66 of 66 shared identities equal,** the several-owners and creation functions included;
- **two new keys,** the removal fence's.

This needed the removal branch's fix of section 20.3 of its page (`710f27d12`).

## 4. Gates

Every run below is on `ae82b8984` (this branch with the removal branch's `383db77d1` merged), from a frozen worktree of
that commit.

**The save line's gates** (`era6/save-line-gates.sh`; the source and the tests archived from the commit):

| Gate | Replay rule off (every option off but the save line's) | Replay rule on |
| --- | --- | --- |
| `attack2_gate` (the second review), 3 settings | 24, 64, 55 passed, 0 failed | the same |
| `outcome_gate`, 3 settings | 426 of 426 each | the same |
| Stored-form gate (`stored_ids_gate`), 4 settings | 109 of 109 each | (run with the rule off) |
| `attack3_gate` (the third review), 7 settings | the save line's own failures only (below) | the save line's own failures, minus R3-3 |
| `attack3_era` (the removal branch's rule), database-wide and per account | 5 passed, 3 failed each: the same 3 on the removal branch's own `03bb49cd3` (replays of the old protocol, with no first source) | (the rule is on in this gate) |

**What `attack3_gate` still fails, test by test**, against the save line's head `cdfc70e02` with the same tests:
- the same on both: R3-1 (`a-reopen-with-another-commit-hash-restores-the-old-ident`, 7 settings;
  `a-reopen-by-a-real-other-general-writer`, 2), R3-2 route 1 (`one-account-against-anothers-command-ids-with-the-setting-on`,
  7), R3-4 (`an-import-chain-across-the-transition`, 1), R3-6 (`r2-2-an-optimistic-replay-against-an-old-removal`, 7:
  the merged rule declines it, section 1 item 3), `r2-2-race-on-each-writer` (2, the general writer: the removal waits
  for the save, by design);
- **passing here, failing on `cdfc70e02`**: R3-2 route 2 (`a-removal-takes-an-accounts-scoped-command-id`, 7 settings,
  both rule settings), and with the rule on R3-3 (`r2-2-replays-across-a-removal`, 7).

**The removal branch's gate** (`era2/gate.sh`, all six removal reviews' tests and `cut-read-race`), 15:02 to 15:34:

| Phase | Result |
| --- | --- |
| Paired native log (reference: the one branch's `8a362ac38`, twice; this gateway off, per account, commit) | every option off: every datom identical to the one branch. Per account and commit: identical once the recorded decline is left out; the workload's import replay with no frame source is declined and its command recorded (section 1, item 4): 11 datoms per run, where the removal branch alone writes none. Replies identical on every arm (md5 `2caaf1e83af2`) |
| (a) the paired run with a save that says nothing about its frame, of a removed subject's protected value | every option off against the one branch: every datom identical, replies identical, the case answered 200 on both |
| Interleavings (`gate.clj`) | database-wide 572 checks, per account 2,472, subject 10,746, commit 10,720, the rule-off case 19: 0 failed |
| The six reviews' attacks and fuzzers (`era3`, `era3b` to `era3f`, every arm) | 0 violations; E9 2 of 2 (the derived-copies branch's, reported, not counted) |
| Reply texts, failure lines, the B2 review's scenarios, B2 | file 9 of 9 (off, on), PostgreSQL 15 of 15; 10 of 10; file 43 of 43, PostgreSQL 43 of 43; every mode 0 failed |
| Gateway suites (base off; this off, subject, commit) | 76 tests, 71,170 passed, 0 failed, 1 error on every arm, the base included |

The run's exit status was 1: the gate's paired condition was the removal branch's (no decline datom on any arm). The
condition is now this branch's (`era2/gate.sh`, `[DX-ERA6]`: 0 datoms with every option off, exactly 11 per run per
account, every other datom identical); applied to that run's own `paired.txt` it passes. The source is unchanged.

**The mixed fuzzer `fuzz8`** (`era3/attack8.clj`: saves of the save line's kinds, with and without a first source and
a stamp, sent and sent again, against removals at random points; the merged rule on), 40,000 schedules per boundary,
four chunks of 10,000 each (seeds differ; sealed and unsealed alternate), on the frozen worktree:

| Boundary | Chunks (oracles, violations) | Total |
| --- | --- | --- |
| The log's (per account, seeds 8101 to 8104) | 79,915; 80,043; 79,943; 80,065; 0 violations each | 40,000 schedules, 319,966 oracles, 0 violations |
| The commit (subject check, seeds 8201 to 8204) | 79,912; 80,088; 80,129; 79,943; 0 violations each | 40,000 schedules, 320,072 oracles, 0 violations |

**Stored-function identities** (`s3/idents.clj`, every option off, 8 writer settings) against the one branch's
`8a362ac38`: 66 of 66 shared identities equal in every setting; the two new keys are the removal fence's.

**R3-2 route 2, for the save line's builder:** the removal route now refuses a command ID with the reserved account
prefix (`main.clj`, `account-claims/check-ids!` on the erase route; section 2). It is on this branch, not on the save
line's.

## 5. The eighth pass: the seventh review's findings

The seventh review (`era3/REVIEW-7.md`, on `exp/DX-ERA3-removal-review` `7da3ca3b3`) tested this branch's
`674300b17` and the removal branch's `383db77d1`. Its tests are on this branch since `a33c88218` (`era3/review7.clj`,
`review7b.clj`, `idents7.sh`, `paired7.sh`, `stack6.sh restore-live`; `era3/run.sh` modes `r7`, `r7b`, `s5a3`,
`ERA3_PG=1`). This branch is now the reconciled branch: the removal branch's own page is
`era2/REMOVAL-PER-ACCOUNT.md`, here too (sections 19.1, 19.3 and 20.5 corrected in this pass).

| Finding | The fix | Commit | The test |
| --- | --- | --- | --- |
| **R5** (high): 4 of the 10 ways a removal is answered 200 printed no `triplex.removal-acknowledged.v1` line, so step 5 of the restore procedure could miss a lost removal | `removal-ack/acknowledged!` is called by every way a removal is answered 200 or published: its own request, its client's resend, the catch-up from the data (another removal, a read, the rebuild route), the rebuild route writing a missing log whole, and both database-wide sites. One line per removal per process. With `TX2_REMOVAL_ACK_JOURNAL=<file>` the removal is appended to that file and forced to disk (SYNC) before its client is answered 200, once per removal. The file lives on a volume outside the Datomic storage's and the authority's backup sets, so a restore of both cannot roll it back. A failed append answers 503 `RemovalAcknowledgementUnavailable`. The start check compares the file with each protected database's log and prints `RemovalAcknowledgedLost` naming the lost commands; a lost record is resolved once a removal of the same selectors acknowledged at or after it is in the log (step 5's resend under a new command) | `827edd4e4`, the resolution in the next commit | `review7.clj` `r5` (all 10 ways), `gate.clj` `ack-journal` (journal arms off, per account, commit: one record per removal whichever step published it, the start check names exactly the lost commands, each resend resolves its own) |
| **R2** (high): any caller could add a protected attribute holding numbers; every account's saves of it were then 400 `ProtectedTypeUnsupported` for good | `protect!` scans the live rows for each attribute it would add and refuses one holding a value other than a string (409 `ProtectedTypeUnsupported`, naming it), nothing written. Who may call the route is written down (removal page 19.1): the owning service and an operator only, enforced in front of the gateway | `827edd4e4` | `review7.clj` `r2` |
| **R3**: a name only the log's copy lists stopped every account's writes (503 `RemovalPolicyBehind`); the only way out, the restore route, protected the name for good | Only a save that writes such an attribute, and a removal, wait (503 `RemovalPolicyBehind` naming the attributes); every other save and every read is served. New operator route `POST /v2/db/{db}/removal-policy-copy-drop {"attributes": [...]}` drops a name from the copy when the stored policy lacks it and no removal in the data or the log removed its values; it prints `triplex.protection-policy-copy-dropped.v1`. The start-check line names the attributes (`copyOnly`, `storedOnly`) | `827edd4e4` | `review7.clj` `r3` (the drop before the restore route), `attack7.clj` P3 (adapted: the missing attribute's save 503, another attribute's save served) |
| **R6 = M4 = the save line's F1** (medium): a stored save sent again after a removal was 409 `ErasureReplayDeclined` while its operation read `committed` | `removal-commit/already-stored?` looks up the operation (`:triplex.tx/operation-id`) and each claim's command (account-scoped too) before `decline-check!` and `after-refusal` decline; a save already stored answers as with every option off (409 `OperationDuplicate`, which the SDK resolves by reading the receipt) | `c01f2f0c4` | `review7.clj` `r6`, `review7b.clj` `m4` |
| **M1-c, the creation rule**: creations and import frames with no `sourceK` were declined even when `frameSourceK` or `removalSeen` was fresh (3 of 27 combinations) | Section 1: with the replay rule on, `removed-creation?` asks `creation-removal` (the merged rule's `frame-tests`) | `c01f2f0c4` | `review7b.clj` `m1` (27 combinations on every writer, creation and import included) |
| **M3, the V4 reversal** (low, by design) | Written down: removal page 19.3's correction (what a declined save writes, the bound, the pre-emption and account-scoped IDs) | page | `review7b.clj` `m3`: reported, by design (2 per mode) |
| **The restore procedure** | Removal page 20.5: step 2 the journal; step 3 stop every gateway before the restore and start them after (a running gateway's Datomic peer keeps the pre-restore data, `restore-live`); step 4 reads `copyOnly` and may drop a name first; step 5 resends each lost removal under a new command | page | `stack6.sh` (D1, D3, D3b, D6) and `restore-live` |

**First results on `827edd4e4`** (`era3/run.sh`, frozen worktree, evidence `DX-ERA6/eighth/`):

| Run | Mode, phases | Oracles | Violations |
| --- | --- | --- | --- |
| `a-on` | per account, file, `r1` to `r6` | 50 | 1: R4 log-put-back's "the next read is served", which the review withdrew |
| `a-subject` | the subject check, file, `r1` to `r6` | 50 | the same 1 (withdrawn) |
| `a-pg-on` | per account, PostgreSQL, `r1 r4 r5 r6` | 34 | 0 |
| `b-rule`, `b-on`, `b-commit` | the rule on database-wide, per account, the commit boundary; `m1 m3 m4` | 22 each | 2 each, all M3 (by design) |

## 7. The owner's decisions of 2026-11-25: three switches, none turned on

Each decision is one commit behind its own switch. Each switch's default is one line in `removal_commit.clj`, `false`
in this pass. Turning a decision on means changing that line to `true` (the owner approved this once reviewed). Its
environment variable reads `1` (on) or `0` (off) whatever the line says. `era2/gate.sh` phase `switches` tests each flip on a
private copy of the source with only that line changed (`flip`, the changed line recorded in `flips`), and
`gate.clj` `owner-switches` fails an arm whose switch did not read what the arm expects.

| Decision | Commit | Default line | Variable | Tested by (`switches`, on `d500015e7`, all passed) |
| --- | --- | --- | --- | --- |
| (i) the replay rule on by default | `24677b8e6` | `(def replay-rule-default false)` | `TX2_REMOVAL_REPLAY_RULE` (now also `0`) | flip: unset on (database-wide 19 checks), `=0` off (20), per account with `=0` still on (23); this branch unset off (20); the paired native log with the flip |
| (ii) the 30-second completion worker under the database-wide rule | `113d7660f` | `(def worker-database-wide-default false)` | `TX2_REMOVAL_WORKER_DATABASE_WIDE` | flip: the age 30000, `=0` nil; this branch unset nil, `=1` 30000; B2 database-wide on the flip (20 checks: the worker completes the pending removal) and with `=0` (16: it does not) |
| (iii) protected attributes on an unsealed database refused outside tests | `d500015e7` | `(def protection-sealed-only-default false)` | `TX2_PROTECTION_SEALED_ONLY`; test-only `TX2_PROTECTION_UNSEALED_FOR_TESTS=1` | `gate.clj` `sealed-only` on the flip, database-wide (15) and per account (16); `=0` (12); the override (13); this branch unset (12); the whole per-account gate on the flip with the override (2,485 checks, 0 failed) |

### 7.1 What turning (i) on changes

On every protected database guarded database-wide (per account the rule already runs):
1. **A save framed before a removal of its subject is declined.** That is a save that writes a protected value of a
   subject a removal named, framed before that removal: by the earliest of `frameSourceK`, `sourceK` and
   `removalSeen`, or by stating none of them. It is answered 409 `ErasureReplayDeclined` (section 1); today it is
   stored and answered 200 (`replay-rule-off` on the flip: 409, the value not answered).
2. **Its command is recorded.** The record's schema is written once per database (9 datoms, 10 with the
   transaction's instant). Each newly declined command adds 3 datoms. On the paired workload: every datom equals the one
   branch's except 11 per run (`ERA2_PAIRED_FLIP_I`: identical, `[11, 11]`).
3. **Every answer on a protected database carries `x-triplex-removal-stamp`,** and the erasure frontier carries
   `removalStamp`. Today neither is sent.
4. **The writers see requests without `frameSourceK`.** The save line's own replay check (first source only) no longer
   judges; the merged rule does. Creations and import frames follow the merged rule.
5. **The SDK** reads the head once on `ErasureReplayDeclined` and throws `WriteError`; it never resends the declined
   save. A save already stored is answered 409 `OperationDuplicate`, as today.
6. **What the gates compare changes.** With the line flipped, "every option off" no longer equals the one branch:
   `era2/gate.sh`'s paired condition for `off` becomes `[11, 11]`, and the replies gain the stamp header. The flip
   commit must change those expectations in the same commit. Stored-function identities do not change: no
   installed function changes, and the record's schema is installed on the first decline.
7. **Opt-out:** `TX2_REMOVAL_REPLAY_RULE=0` (database-wide only).

### 7.2 What turning (ii) on changes

Under the database-wide rule:
1. **A removal left pending is completed by the key-shred worker 30 s after its intent.** That is a removal whose
   client went away after its intent, or a gateway that stopped mid-way. The worker completes it as the client's
   resend would. It prints `triplex.removal-worker-completion.v1`. The removal's key goes after its grace.
2. **What it replaces.** Today such a removal stays pending until its client sends it again or another removal
   completes it. Until then every read and every save of that database is answered 503
   `ErasureFrontierUnavailable`: B2 on the flip with `=0` shows the removal still pending after the wait, and both
   contacts are refused. With the flip, the worker completed it (B2 at-publish and before-native: the removal's key
   deleted by the worker, `:worker-ms 30000`).
3. **Unchanged:**
   - `TX2_REMOVAL_WORKER_COMPLETE_MS` still sets the age (`0` turns the completion off);
   - a database missing from Datomic's catalog is skipped and counted, never retired.
4. **Already true on this branch, whatever the line says:** `envelope/maintain-keys!` calls the completion pass once
   per pass. Every gateway now loads `removal-commit` at the worker's first pass; it returns at once when the age is
   unset. Before, it was called twice per pass with both variables set.
5. **Opt-out:** `TX2_REMOVAL_WORKER_DATABASE_WIDE=0`.

### 7.3 What turning (iii) on changes

1. **A new database cannot protect attributes unsealed.** Its declaration with `"sealed": false` (or none) is
   answered 409 `ProtectionNeedsSeal`, and nothing is written. A sealed declaration is answered as today.
2. **An existing database that already protects attributes unsealed keeps working.** The service declares its
   policy at every start, so:
   - **the same declaration again:** 200, as today, plus a `warning` field (`code` `UnsealedProtection`, and a message
     saying its values are stored in clear and a removal masks them with no key to delete) and one
     `triplex.protection-unsealed.v1` line;
   - **saves, reads and removals:** unchanged (the `sealed-only` case: a save 200, a removal 200, the removed value
     not answered);
   - **adding an attribute:** refused, 409 `ProtectionNeedsSeal`, nothing added (database-wide the policy was already
     immutable);
   - **at gateway start:** the start check prints one `triplex.protection-unsealed.v1` line (`atStart`) per such
     database. With this switch on, `main` runs the start check even with every other option off.
   Nothing breaks, and nothing converts the database: sealing an existing unsealed database is not built (its values
   would need re-encryption).
3. **Every caller that declares unsealed must change.**
   - The SDK's `declareProtection(db, attributes, sealed = false)` defaults to unsealed, so a caller using the default
     gets 409. The flip commit should change that default to `true`.
   - Every test harness that declares unsealed databases must set `TX2_PROTECTION_UNSEALED_FOR_TESTS=1`: the era2 and
     era3 gates, b2, b2r, the replies suites, the stacks, and the lab gates that pass `false`.
   - With the override, every declaration is answered as today. One line per declaration is marked
     `"override": true`. The whole per-account gate passed that way.
4. **Opt-out:** `TX2_PROTECTION_SEALED_ONLY=0`. The override must never be set in a deployment.

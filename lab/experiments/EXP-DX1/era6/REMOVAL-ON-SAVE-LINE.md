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

## 6. The merge of the one branch's head, and the gates on it

**The merge commit is `e50615a10`.** It merges `origin/exp/DX-INT1` at `efee27905` into this branch (first parent
`d500015e7`). At 18:24 EST none of the three merges still landing that day was on the one branch (`09730f887`,
`cc5656aa2`, `a6f89a409`; `git merge-base --is-ancestor`: no for each), so this merges the head found.

**What the merge carried:**
- the index hints' namespace (`index_hints.clj`, its 4 stored identities);
- everything else this branch lacked: the question reader, the cross index, `omit-protected`, `uncached`, the removal
  drops, `reach-late`, `batch`.

**The conflicts and how each was resolved:**

| File | Resolution |
| --- | --- |
| `main.clj` | the one branch's late namespaces in its order, the removal scope last; `route-handler-routed` keeps `query-string`; the question reader's guard runs inside N1's last-answer guard; the protection route refuses a declared attribute (`cross-find`) before either rule's declaration |
| `privacy.clj` | the one branch's drop hook first, then the E4 order (the verified head read before the log) |
| `storage.clj` | the union of the codes passed through |
| `subject_save.clj` | the one branch's `small-op` var; the removal fence left out of the check |
| `envelope.clj`, `failures.clj` | this branch's (X3, F1 of the B2 review) |
| `DatomicStorageAdapter.ts` | the same imports, in the one branch's order |
| `ha1/local.ts` | the one branch's two new holders |
| `b2r/REVIEW.md` | the one branch's section 7 |

**One change beyond the conflicts:** `removal_repair.clj`. The key pass's re-read advances the verified-head cache
outside `privacy/cut`, so it now calls the entity cache's drop hook, as `cut` does. Without this, a removal accepted
there would leave the parsed entities it names in the one branch's entity cache.

**Stored-function identities on `e50615a10`** (`era3/idents7.sh`, the tools from `efee27905`, 11 writer settings)
against the one branch's head `efee27905`:
- **70 of 70 equal in every setting:** 0 differ, 0 missing;
- **2 new keys:** the removal fence's.

The pre-merge head `d500015e7` (the switches included) has 66 of 70 equal in every setting, the index hints' 4
missing, the same 2 new keys. The switches moved no identity.

**The TypeScript** of `packages/datomic` type-checks on the merge (`tsc --noEmit`, no errors).

**The paired native log on `e50615a10`** (`era3/paired7.sh`, the tools from `e50615a10`), against the one branch's
`efee27905` run twice (stable):

| Arm | Native log | Replies |
| --- | --- | --- |
| every option off (`e50615a10`, and `d500015e7` before the merge) | identical datom for datom (unsealed 653, sealed 698) | identical (md5 `3d94b2f60622`) |
| per account with the subject check, and the commit boundary (both commits) | identical once the recorded decline is left out: 11 datoms per run (section 1, item 4) | identical |
| a save that says nothing about its frame, of a removed subject's protected value, every option off | identical datom for datom (673, 723) | identical (md5 `e028e3b04884`); the case answered 200 on all three |

### 6.1 Every check that fails, by name, and why

**A finding no review covers (reported first).** `s5/attack3_era.clj`'s `r2-2-replays-across-a-removal` fails on
this branch with the replay rule on (`era-server`, `era-per-account`).
- **The case:** a save refused for another reason (CasConflict), then a removal of its subject, then the replay. The
  replay carries the same command, a fresh source and no `frameSourceK`, which is the protocol of an SDK older than
  the save line.
- **What happens:** the replay is stored with the value chosen before the removal (`sdkReplay [200 nil]`,
  `storedAfter "value chosen before"`).
- **Why the rule cannot catch it:** the merged rule judges a replay by its first attempt's source only when the
  request carries it. A replay without it cannot be told from a new save after the removal.
- **Who is exposed:** the SDK on this branch always sends `frameSourceK` on a replay (`attack3_gate`'s
  `r2-2-replays-across-a-removal`, with it, passes with the rule on). With every option off, the one branch stores
  the same replay.
- **What would close it:** the gateway would have to refuse a replay that states no frame from a client that should
  send one, which needs a protocol version on the request. Not built.

**How a step now passes.** A step passes only when exactly the listed checks fail, each in the form its review
describes, and every other check passes. A different failure, or a listed check passing, fails the step.
- **The review cases and fuzzers** (`era3/run.sh`): `era3/expected-failures.json`, checked by `era3/expected.py`.
- **The save line's gates** (`era6/save-line-gates.sh`): `era6/expected-save-line.json`, checked by
  `era6/expected_save_line.py`.
- **The removal gate's E9 arm** (`era2/gate.sh`): `era3/expected-failures.json` too.

| Check (test name) | Where it fails | Kind | The review's words |
| --- | --- | --- | --- |
| R4 "the next read is served", case `R4 ... log-put-back meanwhile, log, file` | `r7` per account and subject check, file authority | withdrawn by the seventh review | REVIEW-7, notes on the table: "R4's third oracle is withdrawn, not counted as a break. On the log's boundary a log really put back during the held read is refused (503 `RemovalLogBehind`) for that read and for the next one, until the rebuild route." The detail shows both reads 503 `RemovalLogBehind` |
| M3 "a caller's save of its own subject is not declined because another caller used its command first", fast and general writers | `r7b`, every mode | by design (low) | REVIEW-7 Part B, 3: "M3, the V4 reversal (low, by design) ... A caller that sends a declined save under a command ID another caller will use makes that caller's save declined (409). With every option off the same pre-emption exists in another form ... 409 `OperationDuplicate`." Checked in the form for the rule's state: 409 `ErasureReplayDeclined` with the 13, 60 and 3 datoms when on, 409 `OperationDuplicate` when off |
| E9 "derived copy recorded before the removal", unsealed and sealed | `era3e9-on` | **open finding** (High against TARGETS 7.3), owned by the derived-copies work | REVIEW-2, E9 |
| `a-reopen-with-another-commit-hash-restores-the-old-ident` (7 settings), `a-reopen-by-a-real-other-general-writer` (2) | `attack3`, the account setting on | **open finding** R3-1 (High) | REVIEW-3, R3-1; "keep the setting off everywhere until R3-1, R3-2's removal route and R3-4 are fixed" |
| `one-account-against-anothers-command-ids-with-the-setting-on` (7) | `attack3`, the account setting on | **open finding** R3-2 route 1 (High); route 2 is fixed here | REVIEW-3, R3-2 |
| `an-import-chain-across-the-transition` (1) | `attack3-accounts-on-import` | **open finding** R3-4 (Medium) | REVIEW-3, R3-4 |
| `r2-2-replays-across-a-removal` (7) | `attack3` with the replay rule off only (passes with it on) | **open finding** R3-3 (Medium) with the rule off, as on the one branch; decision (i) closes it | REVIEW-3, R3-3 |
| `r2-2-an-optimistic-replay-against-an-old-removal` (7) | `attack3`, both rule settings | by design (low, admitted cost) | REVIEW-3, R3-6; REVIEW-7: "the one failure is R3-6, the merged rule's item 3 by design" |
| `r2-2-race-on-each-writer` (2, the general writer) | `attack3-accounts-on-general`, `-nopred` | test artefact the review explains | REVIEW-7: "the gate's `at-submit` hook calls the removal on the save's own thread ... A removal from any other thread waits on the monitor and then removes the value" |
| `attack3_era`'s `r2-2-an-optimistic-save-against-an-old-removal` (2) | `era` | behaviour the review rates right (the test asks for 200) | REVIEW-3, comparison row 3, the removal branch's column, rated right: "... then refused `CasConflict` by the writer, which the SDK replays (not chased)". The detail must show `withTheStamp [409 "CasConflict"]` |
| `attack3_era`'s `r2-2-replays-across-a-removal` (2) | `era` | **finding no review covers** (above) | none |

**One oracle corrected in this pass (the builder's own): fuzz7's P3, `fa71ac485`.** The eighth review is asked to
rule on it.

- **What P3 is for.** In each fuzz7 schedule a policy event can leave the stored policy without an attribute the
  log's copy lists. In that window a save of the missing attribute must wait: a typed 503, never stored, never a
  400.
- **The form before this pass** (`71b70ac26`):
  `(and (= 503 (first window-save)) (= 503 (first window-rm)))`. Any 503 for the window's save and removal. Then
  every save of the database waited (R3).
- **The stricter form** (this pass's first adaptation for R3, `827edd4e4` to `6bc0ca5d8`):
  `(and (= [503 "RemovalPolicyBehind"] behind-save) (= 503 (first window-rm)))`.
  - **It asserted:** a save that writes the missing attribute is answered exactly 503 `RemovalPolicyBehind`.
  - **Beside it, unchanged:** a save of another attribute is not held by the missing one (`(not= [503
    "RemovalPolicyBehind"] window-save)`).
- **The corrected form** (`fa71ac485`):
  - **The save:** 503, and its code is `RemovalPolicyBehind`. When the event put the log back behind the data
    (`:log-put-back`, `:both-put-back`), the code may also be `RemovalLogBehind`.
  - **The removal:** a typed 503.
- **Why the stricter form was wrong.**
  - **Two states at once.** `:authority-restore` puts the removal log back to the copy an earlier schedule saw, so
    the log is behind the data. In that state the gateway refuses every request on the database 503
    `RemovalLogBehind` until the rebuild route: the restore procedure's step 1 and step 4.
  - **Which check runs first.** That refusal comes from the request's cut, before the write path's per-attribute
    policy check. So the save of the missing attribute waits with `RemovalLogBehind`. The window's read and its other
    save get the same code. The removal route checks the policy first and answers `RemovalPolicyBehind`.
  - **Why it only showed now.** Since R3, `served` no longer marks every write of the database refused. The only
    thing that changed is which typed 503 the save gets. It still waits, nothing is stored, and the value is not
    answered.
  - **The rule.** The oracle has to accept the refusal the restore procedure prescribes for the state the event
    created.
- **Not weakened elsewhere.**
  - A `:data-restore` or `:add` event, which leaves the log as it is, must still answer exactly `RemovalPolicyBehind`.
  - P1, P2 and P4 are unchanged.
  - A 200 or an untyped answer still fails P3.

**Schedule 318, worked through.** It is the first of the 91: chunk 1 of the log's boundary, seed 7501, sealed, block 3,
whose attributes are named `:p3001` and up. The recorded detail, in order:

| Step | What happened |
| --- | --- |
| before the event | the block had added `:p3001` to `:p3005` (each answered 200); `:p3006` was in the log's copy and not in the stored policy |
| the event | `:authority-restore`: the log put back to the copy the previous schedule saw (`:log-put-back`); `behind` = `[":p3006"]` |
| the window's save of another attribute | 503 `RemovalLogBehind` (the log is behind the data) |
| the window's save of `:p3006` | 503 `RemovalLogBehind`. The stricter form wanted `RemovalPolicyBehind` here: **the violation** |
| the window's removal of a fresh subject | 503 `RemovalPolicyBehind` |
| the window's read | 503 `RemovalLogBehind` |
| the restore route | 503 `RemovalLogBehind` (step 4: rebuild first) |
| the rebuild route | 200 |
| the restore route again | 200; it adds `:p3006` to the stored policy from the copy |
| the window's removal sent again | 200, its value masked (P4 held) |
| after | stored policy and copy both `:v` and `:p3001` to `:p3006` (P1 and P2 held) |

**How `:p3006` reached the log's copy and not the stored policy.** A traced rerun of the same first 400 schedules
(`f7-trace318`, `ERA3_F7_TRACE=1`, seed 7501, sealed) reproduced schedule 318 exactly: `behind [":p3006"]` and the same
four window answers. Each schedule's event uses `earlier`: the stored policy and the log as they were at the start of
the previous schedule.

| Schedule | Event | The stored policy | The log's copy |
| --- | --- | --- | --- |
| 316 | `:add` `:p3006`, 200 | `:v`, `:p3001` to `:p3006` | the same |
| 317 | `:both`: the policy and the log set back to the start of 316 (before the addition), and the fuzzer's record of additions with them | `:p3006` gone | `:p3006` gone |
| 318 | `:authority-restore`: the log alone put back to the start of 317, when it still listed `:p3006` | without `:p3006` | **with `:p3006`** |

So at 318 the authority is restored to a later point than the data. Two things are true at once:
- **The log's copy is ahead of the stored policy in attributes:** `:p3006`, the R3 state.
- **The log is behind the data in removals:** the removals of schedules 317 and 318, which the restored log lacks.

This is the case the restore procedure orders. Step 4 says to rebuild first: the restore route answers 503
`RemovalLogBehind`, then the rebuild route answers 200. The restore route then adds the copy's `:p3006` back (200), as
step 4 says for a name added through the protection route and lost with a data restore. Until the rebuild, every
request waits with `RemovalLogBehind`, the save of `:p3006` included, which is what the corrected P3 accepts. The
stricter form expected that save to carry the attribute's own code, `RemovalPolicyBehind`.

**The rerun.** The 91 were all in chunk 1 of the log's boundary (all `:authority-restore`). That chunk was stopped
and fuzz7 rerun in full with the corrected form: chunk 1 again (seed 7501), 164,663 oracles, 0 violations.

### 6.2 The gates on the merge commit

(Filled in when the runs end.)

### 6.3 The second and third merges: the one branch's 2ce636613 and 65a851d1b

The three merges still landing on 2026-11-25 (`09730f887` N1, `cc5656aa2` the ID allocator, `a6f89a409` the Publish
line), then the save line's fourth pass (`9f210018f`, the account setting off), reached `origin/exp/DX-INT1` after
`e50615a10`. They are merged in two commits:

- **`e98bd5bd8`, the one branch's `2ce636613`** (the three merges).
  - **The Publish line's merge conflicted with nothing here.** Its `writes.ts`, `ha1/local.ts` and join layer were
    already resolved on the one branch.
  - **The conflicts were N1's:**
    - `envelope.clj`: the one branch's `key-pool/take-key-refilled!` (the same fill on demand, a failed fill counted
      and logged); this branch's copy in `removal_repair.clj` removed;
    - `reply.clj`: this branch's version (N1's message with a `where` argument, and the decline text);
    - `main.clj`: this branch's two catch handlers (N1's fixed texts, the removal paths in front);
    - `storage.clj`: this branch's set of codes passed through, which holds the one branch's.
- **`1be3efbab`, the one branch's `65a851d1b`** (the save line's fourth pass merged there).
  - **The save line's three checks are kept on the replay rule's off path.** The fourth pass replaced
    `replay-frame-check!` with `frame-check!`, `declined-check!` and `record-declined!`. As the fourth save line review
    tested (REVIEW-4 R4-3, its corrected trial merge `9fe2e5f02`, compared here and not merged), all three run on the
    off path, each behind `(when (not replay-rule) …)`.
  - **With the rule on,** the merged rule's `decline-check!`, `after-refusal` and `decline!` judge and record, using
    the same attributes.
  - **Compared with `9fe2e5f02`:** `storage.clj`, `subject_create.clj` and `privacy.clj` are equal but for comments.
  - **The one conflict, `DatomicStorageAdapter.ts`:** this branch's lines, as `9fe2e5f02` takes them. A replay states
    its first attempt's `frameSourceK`, and every attempt states the removal stamp it held (`removalSeen`; an
    optimistic attempt reads it first).
  - **What is not taken:** the save line's `frameSourceK` for an optimistic first attempt. `removalSeen` already
    states that frame, and a position seen before the stamp was read could decline a save for a removal the stamp
    already covered.

Results on `1be3efbab`: 6.4.

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

## 8. The fourth save line review on this branch (s5/REVIEW-4.md, 9c0d7ea26)

**R4-3, the merge with the save line's fourth pass.**
- **What the review found:** the save line builder's proposed resolution (its page, section 13.5) dropped the save
  line's `frame-check!`, `declined-check!` and `record-declined!`, and with them the earlier `replay-frame-check!`. With
  this branch's replay rule off (the default), a save replayed across a removal was then stored.
- **This merge keeps all three on the rule's off path,** as the review's tested correction `9fe2e5f02` does (each
  behind `(when (not replay-rule) …)`). With the rule on, the merged rule judges instead, as before.
- **Tested:** the review's own R2-2 group, `s5/attack3_gate.clj` with `S5_ONLY=r22`, in its two settings for this
  branch (`era6-rule-off`, `era6-rule-on`). It is now the save-line gate's phase `r22`.

**R4-9 (Low), documented here.**
- **The case:** an optimistic replay of a new value long after a removal, stating neither `frameSourceK` nor
  `removalSeen`.
- **With the rule on** it is declined 409 `ErasureReplayDeclined`: a save that states no point counts as framed before
  every removal (section 1, item 3). **With the rule off** the save line's rule stores it.
- **Who meets it:** this branch's SDK states `removalSeen` on every attempt, and since the save line's fourth pass an
  optimistic attempt also states `frameSourceK`. Only a caller that states no frame at all meets it.
- **Which side it errs on:** the decline is on the exact side, so no value removed before the save is stored by
  mistake.
- **The gate lists it** as the one expected failure of `r22` with the rule on.

**R4-10 (Info): two stored functions outside `install-sites`.** This branch adds two:
- `:triplex.removal/commit-v1` (`removal_commit.clj`, `commit-ident`, installed by `install!`);
- `:triplex.removal/fence-v1` (`removal_scope.clj`, the removal fence).

Neither is a save writer the account setting's transition moves (`swappable?` does not match them), so neither opens
the admitted window today. A later pass that moves either must add it to `install-sites`.

**How this branch's finding (section 6.1) and R4-9 relate.** They are two sides of one case. A request that does not
state its first attempt's frame cannot be told from a new save.
- **When it states a fresh `sourceK` and no first frame,** the gateway takes it as a new save after the removal and
  stores it. That is section 6.1's finding: an SDK older than the save line, replaying across a removal, stores the
  value chosen before it.
- **When it states nothing at all,** the merged rule takes it as framed before every removal and declines it. That is
  R4-9: a caller with no frame, saving a new value long after a removal, is refused.

The gateway errs one way or the other depending on what the request states. The cure for both is the same: the client
states its first attempt's frame (`frameSourceK`, or `removalSeen`) on every attempt. This branch's SDK does. What
remains is a protocol version, so that the gateway could refuse a request from a client that should state a frame and
does not. It is not built.

### 8.1 Before the replay rule is turned on: (a) or (b)?

**(a) must be true: every caller that writes a protected database runs an SDK that states its first attempt's frame
on a replay.**
- **Which SDKs qualify:** this branch's SDK, and the one branch's SDK from the save line on (`frameSourceK` on every
  replay).
- **Why it matters:** an SDK without it replays a save across a removal and the value chosen before the removal is
  stored (section 6.1). That happens with the rule off as well as on.
- **What the flip does to the gap:** turning the rule on neither opens nor closes it.
- **How it is enforced today:** only by deployment. Every service is upgraded before the rule is turned on, and the
  rollout checks it. The gateway cannot tell an old SDK's replay from a new save.

**(b) is not needed for the rule itself. It is the only way the gateway could enforce (a), and it is stricter.**
- **The rule (b) would add:** with the rule on, a save that writes a protected value and carries no `removalStamp`
  (`removalSeen`) is refused.
- **Who it would turn away:** every SDK that sends no stamp, including the one branch's SDK before this merge, which
  states `frameSourceK` and so satisfies (a).
- **When it could be turned on:** only after every service runs this branch's SDK.
- **The SDK side is already in place:** with the rule on, every answer on a protected database carries
  `x-triplex-removal-stamp`. The SDK keeps the newest stamp per database and sends it as `removalSeen` on every save
  after its first request; an optimistic commit reads the stamp first (`ensureRemovalStamp`).

**(b) is a small change. Sketched here, not built in this pass:**
1. **The check:** in `removal-commit/decline-check!` (a late namespace, so no early file gains a name), with
   `replay-rule` on, after `already-stored?`. When `(seq (written-protected db input attrs))` and `removalSeen` is
   not an integer, refuse: `(privacy/failure! 409 "RemovalStampRequired" "A save of a protected value must state the
   removal stamp it read; read the erasure frontier and send it again")`.
2. **The same check on the creation rule** (`creation-removal`).
3. **Exempt** the writes that carry their accounts' tickets instead: settlement frames, deliveries, the import
   pipeline's server-side frames. They are fenced on the accounts they read (removal-scope), not on a client's frame.
   Which of these must be exempt is the one decision the sketch leaves open.
4. **Its own switch,** default off, flipped only after the SDK rollout.
5. **Tests:** a save without the stamp refused, with it stored; an old SDK's replay across a removal refused (the
   finding's case); R4-9's save that states nothing refused `RemovalStampRequired` instead of `ErasureReplayDeclined`;
   every exempt writer unchanged.

About 15 lines and one switch. The cost is the rollout order, not the code.

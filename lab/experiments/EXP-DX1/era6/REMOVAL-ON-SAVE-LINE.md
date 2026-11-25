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

**Not covered by the merged rule:** the creation option's `subject-create/removed-creation?`
(`TX2_SUBJECT_CREATE=1`) still judges a creation by its own `sourceK` only. A creation with no source is declined
whenever any removal ever named its family. With removalSeen it would be stored under the rule above.

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

(filled below)

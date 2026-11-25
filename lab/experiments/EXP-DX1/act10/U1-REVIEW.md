# Review of the U1 fix: one ID allocator (DX-ACT10, 2026-11-25)

Reviewer DX-ACT10. Under review: `origin/exp/DX-U1-id-allocator` at `a439e9b9e` (page `u1/ID-ALLOCATOR.md`), built from
`1ed2650bd`. The one branch (`exp/DX-INT1`) is now at `8a362ac38`; the fix was merged onto it on a local branch
(`local/dx-act10-u1-on-int1`, merge `ff0413925`, pushed for reference as `exp/DX-ACT10-u1-on-int1`) and every run below
is on that merge unless named. Role: attacker, tests only; the code under review was not changed. Mac only, toy sizes;
every time is diagnostic. Finished Wed Nov 25 12:23:00 EST 2026.

## Page 1, for the owner

**Is there a break in the fix? No.** The allocator does what the page says: within a process no ID issued before or
after a reserved block starts with it, whatever the clock does, and IDs stay increasing. The attacks found nothing that
breaks it: 600,000 operations over 1,500 schedules with the clock stepping back 23,612 times (a day at a time included),
two allocators in one process, four worker threads, every prefix length, and a search of every ID source in `packages/`;
one low point (V3). How sure: certain for the allocator (tests A1 to A5 and the builder's I1 to I3, rerun on the merge).

**The page is wrong about the product on today's one branch.** It says only lab processes take blocks. At
`8a362ac38` the SDK's own save path takes them: the Datomic adapter's `saveIdentity` with `orderedSaves` on (the
adapter option, or `TRIPLEX_DATOMIC_ORDERED_SAVES=1`), for one-byte and wide blocks and the several-owners and creation
shapes. So at `8a362ac38` without the fix, U1 is in the product's save path whenever that option is on, and there the
refusal is not retried: the SDK answers "Datomic transaction was rejected", and the user's save, or whichever write
lost, fails to its caller. The fix closes this too, because the adapter takes its blocks from the same allocator.

**The production gate with the real-mix tape on the merge:** passed. Every save of its four cells was acknowledged (840,
88, 2, and tape M's 360 of 360, all 360 on the per-subject writer), none expired or was refused, and every owner read
back equal to the tape. One run cannot show that the merge agent's rejected save is gone; the in-process tests are what
show it.

**The three most serious findings**

1. **V1, the product path has U1 at `8a362ac38` (no attacker; fixed by this branch).** The adapter's ordered saves
   take blocks while every other write of the process takes IDs from the same ULID factory. Evidence: the adapter code
   (cited in the table) and the unchanged generators (byte for byte those of `1ed2650bd`, where I1 and I2 show the
   collision).
2. **V2, the merge needs a hand resolution.** `scale1/decision/writes.ts` conflicts: the one branch sends tape saves
   through the product path (`DX_S2_PRODUCT`), the fix adds a resend under a new block on the lab path. The resolution
   that keeps both is in the merge commit; the resend must stay off the product path.
3. **V3, short reservations move IDs into a later millisecond (low).** A prefix of 11 characters reserved 16 times in
   one millisecond carried into the time characters (A5); every later ID of that millisecond then reads a later time.
   Only lengths 23 and 24 are used.

**One recommendation: merge `a439e9b9e` onto the one branch with V2's resolution, rebuild both dists, and correct the
page's product claim (V1).** Restricting `reserveIdPrefix` to lengths 23 and 24 (V3) can follow.

## 1. Findings

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| V1 | **High at `8a362ac38` without the fix; closed by it** | The page's "no path under `packages/` takes blocks" holds at `1ed2650bd` and not at `8a362ac38`. There the adapter's `saveIdentity` (`DatomicStorageAdapter.ts` 1131-1151) takes `orderedSaveIdentity()` or `wideOrderedSaveIdentity()` for every save that `orderedSaveShape` admits (one owner, or up to `SUBJECT_SAVE_OWNERS` = 4 with `severalOwners` or `creationSaves`), when `orderedSaves` is on (option or `TRIPLEX_DATOMIC_ORDERED_SAVES=1`; default off; on in the production and aged gates, the S2 and S3 gates, and the console's tools under that variable, `s2/PRODUCT-SAVES.md` (g)). Every other write of the same process takes IDs from `generateId` and `generateTransactionId` (`TriplesLive` and `KvTriplesLive` `nextTripleId`, `IdGeneratorLive` and `nextTxId`, `RuntimeServices.ts` 28-33; snapshot transaction IDs). A refusal `IdentityConflict` is not one of the conflicts the adapter replays (`CasConflict`, `CommandConflict`, `ClockConflict`), so it becomes `WriteError("Datomic transaction was rejected")` (745) and fails to the caller. The generators at `8a362ac38` are byte for byte those of `1ed2650bd` (`id.ts`, `orderedSaveIdentity.ts`, `internal.ts`) | Code; the builder's I1 and I2 on `1ed2650bd`; the lab tape's own note at `8a362ac38` that "a runtime ID run can share a prefix with a journal ID ending in 00" (`writes.ts`, `adopt`) | Merge the fix; say in the page which product path takes blocks |
| V2 | Merge step | `writes.ts` conflicts in two hunks: `draft` (the one branch passes `mixRows`; the fix records `drafted`) and `submit` (the one branch's product path; the fix's resend loop). Resolution: `draft` keeps both; the fix's loop becomes `labSubmit` and is used only when `productMode` is unset; the product path is unchanged. On the product path the resend would be wrong: the save's operation ID is the SDK's (`row.operationId`), not `row.id`, and the SDK picks the block | Merge `ff0413925`; I1 to I3, suites and the gate on it | Take this resolution, or one that keeps the resend off the product path |
| V3 | Low | `reserveIdPrefix` accepts lengths 11 to 25. A length of 11 leaves one random character, so within one millisecond the successor carries into the time characters after at most 32 reservations; 12 after at most 1,024. IDs are still increasing and outside every block, but read a later millisecond than the clock | A5: 16 reservations of length 11, then the next ID's time `01M89TWHM3` against the clock's `01M89TWHM2` | Accept only 23 and 24 (the two lengths used), or document it |
| V4 | Information | The lab resend rule cannot store a save twice: the resend keeps the operation ID (`command(o.id, ...)`), both writers check the operation ID before anything else (`commit.clj` 181 before the identity check at 273; `subject_save.clj` `body`), and `:triplex.tx/operation-id` is `:db.unique/value` (`schema.clj` 63). An `IdentityConflict` therefore never comes from the save's own earlier attempt (that one is answered `OperationDuplicate`), so the lookup only guards a case that does not arise. If it ever ran on a stale lookup, the resend would be refused as a duplicate and the row would be held as uncertain against the new block's draft: a false stop, not a second record | Code read; not run on a stack | None needed |
| V5 | Information | ID sources outside the allocator: `packages/http` `EntityStore` calls `ulid()` (a fresh random per call, used only as an entity ID suffix `type:ULID`, never an assertion ID); the deterministic runtime (tests and replays) makes base-36 IDs that are not ULID-shaped; the gateway makes UUIDs and `_tx/erase-<uuid>`. None continues the allocator's ULID factory, so none can land in a block except by the 70-bit chance the page states | `git grep` over `packages/*/src` at `8a362ac38` | None |

## 2. What was attacked and held, with counts

1. **The builder's tests on the merge.** I1: 0 of 5,000 next SDK IDs share the save's token, 0 inside its block. I2:
   0 in 200,000 back-to-back pairs. I3: 0 IDs inside any of 28,572 blocks among 100,000 IDs. `prep1/ordered-ids` and
   `w2/wide-ids`: 5 of 5. The paired native log, twice: 3,300 datoms, 3,600 SDK IDs, 0 sharing a block's token, 0
   inside; normalized SHA-256 `8037b699...`, the builder's value on base and fix.
2. **Suites on the merge.** `packages/core` (vitest): 62 files, 863 tests passed. `packages/datomic`: 73 files and
   473 tests passed, 17 files (53 tests) skipped without `DATOMIC_INTEGRATION=1`, as on every run.
3. **A1, the clock.** 1,500 schedules of 400 operations on a fresh allocator each (600,000 operations: 347,978 IDs from
   both generators, 180,100 blocks of every length from 11 to 25), the clock moving forward by 1 ms or up to 10 s and
   back 23,612 times by 1 ms, up to 5 s, or a day: 0 IDs inside any block, 0 IDs not above everything before them, 0
   blocks not above everything before them, 0 blocks inside another.
4. **A2, two allocators in one process** (the adapter's instance for blocks, a second module instance for IDs): 0 of
   202,001 pairs share the token (2,001 on a fresh millisecond, 200,000 back to back); the adapter's own instance, the
   same pairs: 0.
5. **A3, worker threads:** four threads with their own allocators, 200,000 IDs, against 161,000 blocks of the main
   thread made at the same time: 0 inside.
6. **A4, every length:** for each length from 11 to 25, 50 IDs before and 50 after a reservation: 0 inside; lengths 10,
   26, 0, -1, 24.5 and NaN refused with `RangeError`.
7. **Every ID source in `packages/`** (V5): only `generateId` and `generateTransactionId` continue the ULID factory, and
   both now take from the allocator; `reserveIdPrefix` has one caller, `orderedSaveIdentity.ts`.
8. **Ordering elsewhere.** Nothing found that an allocator change reorders. The feed, cursors, pinned reads, the sweep
   and settlement use positions, not IDs. The gateway's history guard and ordered bounds compare a block's own prefix.
   `ConfigStore` breaks ties of equal record time by ID (`ConfigStore.ts` 162), which is still issue order within a
   process. The only change in order: IDs issued after a block in the same millisecond now sort after the whole block,
   where before some sorted inside it, and a block now sorts after every ID issued before it, where before it could
   sort below some. Both move closer to issue order; nothing that was ordered changes order.
9. **The stored-function identity check** (`int5/idents.sh`, this reviewer's image): the gateway sources of `8a362ac38`
   and of the merge, each loaded under the eight writer settings: 8 of 8 settings give the same 66 stored-function
   identities and code hashes (the fix changes no gateway file).
10. **The production gate with tape M on the merge:** attempt `4c777be6`, image `188e654e8728` built from the merge,
    holder DX-ACT10, every save through the product's path with `orderedSaves`, `severalOwners` and `creationSaves` on,
    the gateway with the per-subject, wide, several-owners and creation writers. Passed: R 840 of 840, S 88 of 88, the
    two wide saves (394 assertions, general identity) 2 of 2, tape M 360 of 360 (enrolments 193, new subjects 75,
    attributes 47, forms 23, owed forms 22; 290 owners created), 0 expired, 0 refused; 1,390 saves on one-byte blocks
    and 3 on wide blocks, 1,390 on the per-subject writer; 2,836 fields of 128 subjects and 3,030 fields of 313 tape M
    owners read back equal to the tape.

## 3. What was not tested

- **A production-gate run at `8a362ac38` without the fix**, to see the rejected save the merge agent saw; one run at
  the merge only.
- **A rejected save in the product path on a stack.** V1 is shown by code and by the generators' tests, not by a stack
  run with `orderedSaves` on and the fix off.
- **Cross-process collisions.** The 70-bit argument is the page's and was not tested; the same holds before and after
  the fix.
- **The console with `orderedSaves` on.** Not run; the console on 127.0.0.1:28580 is not this reviewer's to touch.

## 4. How to run

```sh
# On a checkout with the fix (the merge), after building packages/core and packages/datomic:
node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/u1-review.test.ts   # A1 to A5
node --experimental-strip-types --test lab/experiments/EXP-DX1/u1/identity.test.ts       # the builder's I1 to I3
```

The production gate: `DX_CHK1_HOLDER=DX-ACT10 DX_W2_WIDE=1 DX_S2_PRODUCT=1 DX_S3_OWNERS=1 DX_S4_MIX=1 DX_S4_CREATE=1
prep1/manage.py OUT production 10 1 1 0 1`, with the merge's `manage.py` accepting this reviewer's holder (a local
harness commit on the merge branch, `63f81ca8b`).

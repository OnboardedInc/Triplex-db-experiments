# One allocator for the SDK's IDs and ordered save blocks (U1)

Builder DX-ACT8, branch `exp/DX-U1-id-allocator` from `exp/DX-INT1` (`1ed2650bd`). The finding is U1 of the third
review of `exp/DX-ACT8-publish-beside-saves` (`lab/experiments/EXP-DX1/act10/REVIEW-3.md` on
`exp/DX-ACT10-publish-review`, `f596d1267`). This branch carries the fix alone. Every time is EST.

## Is U1 on the one branch? Yes

**With every option off, `1ed2650bd` has it.** Its two ID generators are the code the review read (the files are byte
for byte the same):

- **The ordered save block** (`packages/datomic/src/orderedSaveIdentity.ts`): the first 24 characters of one monotonic
  ULID, owning the 256 assertion IDs `<token>00` to `<token>FF`.
- **The SDK's other IDs** (`packages/core/src/utils/id.ts`): `generateId` and `generateTransactionId`, the next values
  of the same monotonic ULID factory.

Within one millisecond that factory only increments the last characters. So the next SDK IDs after a block share its
token, and some are exactly one of its assertion IDs.

| Test, on `1ed2650bd` unchanged | Result |
| --- | --- |
| I1: 5,000 pairs, each on a fresh millisecond | 4,990 next SDK IDs share the save's token; 1,245 fall inside its block; 63 equal an assertion ID of a 16-row save, 194 of a 40-row save |
| I2 | the same string, after 34,749 pairs: save `01M893QAS8ZMJB78HAPBDMRZ`, ordinal 4, SDK ID `01M893QAS8ZMJB78HAPBDMRZ04` |

**What a collision does.** Two writes carry one assertion ID, and the gateway refuses whichever commits second, so no
ID is ever stored twice:

- **The general writer:** "TRIPLEX_IDENTITY f/id" (`commit.clj` 271-273), answered `400 IdentityConflict`.
- **The per-subject writer:** its history guard finds the used ID inside the save's range and replans
  (`subject_save.clj` `history-guard`).
- **Datomic itself:** `:f/id` is `:db.unique/value`, the last guard.

A refused save's resend keeps its token by design, so it is refused again on every resend. A write through the SDK
plans again with new IDs.

**Which processes have it.** Any process that takes a block from `orderedSaveIdentity()` (or
`wideOrderedSaveIdentity()`) and also makes IDs through `generateId` or `generateTransactionId`. Those two functions make:

- every row ID of `TriplesLive` and `KvTriplesLive` (`nextTripleId`);
- the `IdGenerator` of `RuntimeServices`;
- every transaction ID written through the TypeScript adapter.

On the one branch only lab processes take ordered blocks (the held runner's save tape, the gates and load tapes under
`lab/experiments/EXP-DX1`). No path under `packages/` does: the product's SDK writes never take a block, so they cannot
collide with each other, since monotonic IDs never repeat.

The process shown to collide on a stack is the held runner. Its save tape and its Publishes, settlement frames and
definitions writes run in one Node process (the review's 8 + 8 stack runs; the options-off stops `G4off2`, `G4off3`
and the review's head 4).

## The fix

- **`packages/core/src/utils/id.ts`:** one allocator for everything the module hands out. It keeps the greatest ID
  issued, or the end of the last reserved block, and every new ID is greater.
- **`reserveIdPrefix(length)`** returns a prefix greater than the same-length prefix of every ID issued or reserved
  before. It then moves the greatest value to the block's end (the prefix followed by `Z`s).
- **`orderedSaveIdentity` and `wideOrderedSaveIdentity`** take their tokens from it (24 and 23 characters).
- **The held tape** (`scale1/decision/writes.ts`) sends a save refused with `IdentityConflict` again under a new block,
  but only after the operation lookup says the save is absent. Its own earlier attempt may be what holds the IDs. It
  does this at most three times; every other answer is handled as before.

**What the allocator guarantees:**

- **Within one process (one module instance):** no ID issued before a reservation starts with the reserved prefix, and
  none issued after does. This holds however the clock moves, a step back included, because every value is compared
  with the greatest so far, never with the clock.
- **Across processes and restarts:** IDs stay independent ULIDs. Another process's ID shares a 24-character block
  prefix only if its 10 time characters are equal (the same millisecond, or a clock that repeats one) and its next 14
  random characters are equal too: 70 random bits per pair.
- **What it costs:** after a reservation, the next IDs in that millisecond start past the block, one step further in
  the last characters. IDs stay increasing ULIDs; no ID changes length or alphabet.

## Tests

| Suite | Before (`1ed2650bd`) | After (this branch) |
| --- | --- | --- |
| `u1/identity.test.ts` I1 (5,000 pairs) | 4,990 share the token, 1,245 inside | **0 and 0** |
| I2 (200,000 back-to-back pairs) | the same string after 34,749 | **0 share the token** |
| I3 (28,572 blocks interleaved with 100,000 IDs) | — | **0 IDs inside any block**; blocks distinct and increasing; IDs increasing |
| `packages/core` (vitest) | — | 62 files, 863 tests passed |
| `packages/datomic` (vitest) | — | 71 files and 466 tests passed; 17 files (53 tests) skipped, as on every run without `DATOMIC_INTEGRATION=1` (they need a running gateway) |
| `prep1/ordered-ids.test.mjs`, `w2/wide-ids.test.mjs` | — | 5 of 5 |

## The paired native log (`u1/paired.ts`)

**The workload.** 300 rounds. Each round starts on a fresh millisecond, takes an ordered block, then writes 3 facts
through the SDK's own write path in the same millisecond (`KvTriples` over the in-memory KV backend, so every row and
transaction ID comes from the generators above). The log is every datom of the store, in commit order.

| Run | Datoms | SDK IDs | sharing a block's token | inside a block | raw log SHA-256 | normalized log SHA-256 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| base 1 | 3,300 | 3,600 | 3,487 | **877** | `3bb03b64...` | `8037b699...` |
| base 2 | 3,300 | 3,600 | 3,497 | **928** | `577b32c0...` | `8037b699...` |
| fix 1 | 3,300 | 3,600 | 0 | **0** | `99ab7c7b...` | `8037b699...` |
| fix 2 | 3,300 | 3,600 | 0 | **0** | `4b197236...` | `8037b699...` |

**What is byte-identical and what is not:**

- **Not byte-identical: the ID strings.** The raw log differs in every run, the base's two runs included, because
  ULIDs carry the clock and random bits.
- **Identical: everything else.** With each ID replaced by the order it first appears in and each clock value by a
  placeholder, the log is identical on the base and the fix in every run. The same datoms, attributes, values,
  entities, transactions and order.

**Why this is acceptable.** No reader or writer may depend on an ID's value beyond its uniqueness and its order within
a process, and both still hold. The only change is which IDs are chosen: never one inside a block reserved for a save.

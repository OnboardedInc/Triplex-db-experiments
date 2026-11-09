**E1. EXP-FD01: one feed contract, one consumer store, three adapters, one conformance suite (builder; reviewer).**
North star: P3 (TARGETS 1.1 P3 items 2, 4, 5, 6; NS-P3-GAPS-MAX, NS-P3-ORDER-VIOLATIONS-MAX, NS-P3-VISIBLE-DUP-EFFECTS-MAX; exact resume).
Measured by a testkit conformance suite run on each lane's feed adapter.
Build, with no engine changes:
1. `ChangeFeed` and `FeedEntry` in packages/core (shape in R41-a): resolutions `commit | aborted | epoch | seal`; per commit the
   stream, epoch, offset or LSN, positions, txIds, operationId, commandIds, the decided `stamp` (nullable until RT01 round B lands on the
   lane, with a flag), and changes `{op: assert | retract | erase, entity, attribute, validFrom, validTo, position, assertionId,
   erasureSeq?}`. No value, no envelope, no key id.
2. Adapters: broker `LogFeed` (lane Q and X via P2B), reading through R25's reader threads (`ReadRequest` kind `"feed"`), never
   synchronously on the main thread; P2X `CommitFeed` (X native), always loading exact tuples (`exact: true`), with METADATA as a
   pre-filter only; core journal (A0 control only, marked as such in receipts).
3. `ConsumerStore` in a host SQLite file with the Q84a pragmas: effects keyed by (consumer, epoch, position, subject), the affected
   set and the checkpoint in one transaction. It replaces the JSON-lines journals in broker feed.ts:182-302 and lab/bench/lib/feed.ts,
   and P2X's in-engine checkpoint, which stays only as a control arm.
4. The conformance suite in packages/testkit: per position, the entry's changes equal O-REPLAY's assertions and retractions for that
   position (identities); a gap audit over positions with aborted, epoch and seal accounting; per-subject order; three crash points,
   100 crashes each, with the keyed-atomic arm and the unkeyed-split control (the control must show duplicates, or the test is void,
   R18 X3 prediction 3); resume byte-identical to first delivery; a re-sent command produces no new position; the M-FEED-GAP
   mutation control (one entry dropped) must be caught.
Gates: G0; G1 on xtdb and qlever with the option off and on; the conformance suite on the broker feed offline, on P2X against
tx2-xtdb-dev at light load, and on the A0 journal for all three lanes. Prediction: lane Q offline lag p99 ≤ 20 ms with the SQLite
consumer store; consumer write p99 ≤ 10 ms. Slot: none.


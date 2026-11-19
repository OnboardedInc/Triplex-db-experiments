# DX-ACT1 · Correct release activation

A correct sweep can now advance 256 people with one durable page update. An unchanged person requires no individual write.
At 100,000 people, that is 391 page transactions. For the old bench mix, 9,798 people also need a changed item body.
In the first local Datomic measurement, 1,000 people took 0.326 s to publish with page guards, versus 6.71 s with individual guards.
All 1,000 reopened states matched the independent oracle, including unchanged people and people with no items.
At two evaluators, the local cost ratio projects 61 s per 100,000 and 10.2 min for ten such accounts in series. The 100 s bar still needs a server measurement.
Five evaluator cores fit the proposed 12-core allocation. The live read and save latency ratios will decide how many can be used.

## What is durable

A page transaction publishes its members' exact basis masks and changed item bodies together. The item body includes pending deliveries and their original sequences. The page fence protects absence, guard-only updates and equal-basis body changes. A losing live writer or sweep rereads the page. An uncovered neighbor keeps its own basis. [Design and alternatives](DESIGN-2.md)
Before a page commits, readers see the prior page. After it commits, those members have advanced or already hold a newer decision. A later page can still be at the old basis. Completion requires durable claims for every ordinal of the independently hashed roster; a lost ACK recovers the original claim and deliveries.

## Native price and in-flight proof

The 1k fixture has 116 item changes. The page arm wrote four page facts and 116 bodies, with zero individual writes for the other 884 people. The historical arm omitted 884 guard updates. All corrected arms matched 1,000 independent terminal states.
The first native run passed all 13 original publication schedules, the new layout on those schedules, and four page-specific cases. They cover an interrupted sweep, a lost page ACK, sparse membership, a newer live winner, concurrent first writers, equal-basis updates, a wholly superseded page and retries with different input or segmentation. A fresh process recovered the original deliveries.
Correctness audit. publishPage compares actual asserted bytes and receipt identity with its exact input/coverage digest. publishPages verifies contiguous ranges against the separate roster. The independent reader reconstructs page masks and body presence at one cut. price.ts binds fixture, scope, image and code, then compares every subject from a second process. page-pressure.ts reopens the same-scope live save and checks its ten values and receipt.
Pricing is diagnostic on the shared Mac. The model transfers the native publication wall ratio versus the incorrect historical filter to the old 22.99 s publication phase; the 50.79 s evaluation phase came from the two-worker bench. A reverse-order native repeat is pending.

## Server comparison

The first three arms retain the narrow full/selector pair and the standard individual guard. The fourth uses page coverage on standard R2. A separate fresh historical control must reproduce exactly the missing guard advances, with correct items and pending bytes; it cannot earn a normal equality receipt. All comparisons use the frozen trace, a fresh retained-seed clone, 256 live readers and independent readback.
On the prepared server, `node --experimental-strip-types lab/experiments/EXP-DX1/act1/bench.ts --execute` runs the default two-evaluator profile. Add `--workers 1,2,4,5 --hours 6` for the longer worker ladder. Each worker count gets a clean clone. [Runner](bench.ts)
The driver reserves cores 3 and 5 for the reader threads, core 6 for coordination, live writer and follower, and 7–11 for evaluators. Engine roles use 0, 1, 2 and 4. Every measured actor reports its actual thread affinity. Parallel results are reassembled in roster order before serial page publication.
The worker result accepts only complete matched windows with at least 500 commits on each side and read and commit p99 ratios both ≤1.5. An underfilled count remains unjudged. No live server timing or safe worker count has been measured here.
Bench audit. The collector checks the slot/nonce/source, marker facts, raw traffic, roster digest, CPU assignments, correct-arm output/state digest and the historical control's explicit mismatch count. Full activation on this server, the separate throttled compaction case and an independent review remain open. [Targets](../../../TARGETS.md)

# DX-ACT1 · Correct release activation

The old 73.78-second benchmark could undo a newer decision after restart. Its publisher and checker both missed progress for unchanged people. The W0 publication rule was correct.
A page now remembers progress for up to 256 people in one transaction. At the measured 100,000-person mix, 391 pages and 9,798 changed item bodies cover everyone. The other 90,202 need no individual write.
In two local Datomic runs, publishing for 1,000 people took 0.326 and 0.679 seconds with pages, versus 6.71 and 5.36 seconds with individual guards. Every reopened decision matched the independent oracle.
With two evaluators, that projects to **61–78 seconds for 100,000 people** and **10.2–13.0 minutes for ten such accounts in series**. Part 1 projected 320 seconds per account with individual guards.
The 100-second bar and the limits on live read and save latency still need a server run. Five evaluator cores fit with two cores reserved for readers.
For the narrow document-deadline release, the selector skipped evaluation for 675 of 1,000 people. The standard release used for the cost figures evaluates everyone.

## What an interrupted sweep guarantees

Only committed page members advance. Readers can see a completed prefix and an older suffix. Each live or sweep update compares its member’s transaction and valid time, then atomically replaces the page fence and any changed bodies or pending deliveries. A live winner forces a reread. A newer live basis survives. An uncovered neighbor keeps its own basis.
Completion needs contiguous transaction claims covering an independent sorted roster at one cut. Restart recovers each original claim and delivery sequence before publishing the suffix. A record at the wrong basis fails, as do different record bytes or conflicting segmentation on retry. The named page namespace routes ordinary live reconciles through the same fence on reopen. [Design, alternatives and write counts](DESIGN-2.md)
All 13 original native publication cases ran again. Five variants exercised the new layout and five more covered partial visibility, lost page acknowledgements, competing live decisions, coverage rejection, bounded native reads and normal-entry restart. The latest run completed 23/23. Strict native reads now split frames over 64 roots while retaining one read position.

## Measured publication cost

Both trials used the same 1,000 W0 R1/R2 worlds, 116 item changes, one frame in flight and fresh native scopes. The second reversed arm order. The table gives cost per roster subject. Ranges are the two observations.

| Local Datomic per person | Historical | Full state | Individual guard | Page |
| --- | ---: | ---: | ---: | ---: |
| Asserted value bytes | 140.70 | 533.29 | 219.38 | 98.05 |
| State rows / read pages / claim reads | 1.10 / .016 / .004 | 2.00 / .032 / .032 | 2.10 / .032 / .032 | .554 / .015 / .004 |
| HTTP requests | .048 | 1.192 | 1.192 | .035 |
| Publisher CPU / engine CPU, ms | .153–.181 / .658–.848 | 1.669–1.819 / 6.670–9.480 | 1.398–1.555 / 5.372–6.111 | .111–.187 / .220–.801 |
| Commit / publication wall, ms | .401–.460 / .569–.725 | 7.755–10.142 / 8.216–10.790 | 5.010–6.293 / 5.362–6.712 | .226–.539 / .326–.679 |

Each page trial wrote four page facts and 116 bodies in four transactions, with 63 retractions. The historical arm left 884 guards stale or absent. Both other correct arms used 32 transactions. Bytes count asserted values. Datomic per-scope physical storage and physical index reads were unavailable.
For a ten-fact live save deliberately queued at the client behind native submission, individual guard batches of 32/64/128/256 used 12,172/24,204/48,396/96,652 request bytes. Median waits across the two trials were 136–143/306–333/614–755/1,090–1,547 ms. The 256-member page used 865 bytes, waited 14–20 ms and reached save ACK in 28–37 ms. Each median uses three pairs. These measure one FIFO ordering.
The projection adds the old two-worker evaluation (50.79 s) to 22.99 s × page/historical native wall time. The implied publication phase is 10.35–27.44 s. The linear ten-account projection assumes the same mix and serial sweeps. The local fixture changed 11.6% of people versus 9.8% in BM1. [Original bench](../bm1/REPORT.md)

## Worker and server comparison

If evaluation scales ideally from two workers, the expected 100k total for 1/2/3/4/5 workers is 112–129 / 61–78 / 44–61 / 36–53 / 31–48 s. Serial setup, shared memory bandwidth and live traffic can flatten that curve.
The 12-core plan assigns engine roles to 0, 1, 2 and 4, 256 readers to 3 and 5, coordination, live writer and follower to 6, and evaluators to 7–11. Workers return ordinal-tagged output. The publisher commits pages in roster order.
On the prepared server run `node --experimental-strip-types lab/experiments/EXP-DX1/act1/bench.ts --execute` for the three-hour, two-worker comparison. Add `--workers 1,2,3,4,5 --hours 6` for the full worker ladder. Each profile uses a fresh retained-seed clone, native schedules and the frozen writer trace. [Runner](bench.ts)
The four arms are narrow full, narrow selector, standard individual guard and standard page. A fresh historical control must exhibit exactly the omitted guards while preserving items and pending deliveries. The largest measured worker count needs a complete matched window, at least 500 commits on each side and both live p99 ratios ≤1.5. Server timing, safe count, throttled compaction and independent review remain open. [Targets](../../../TARGETS.md)

## Evidence and verdict audit

`publishPage` checks the returned facts against the proposed bytes, or recovers the original immutable command with its input hash, scope, member mask, transaction and deliveries. `publishPages` checks every span against the roster, release and both clocks before producing a coverage digest.
The native schedules compare independent Python states and receiver sequences at actual committed positions in fresh scopes. `pageWireState` decodes stored masks and bodies at one pinned position. `price.ts` checks all 1,000 states from a second process and binds the fixture, owner, image, nonce and pre/post source bytes. `page-pressure.ts` reopens each fresh same-scope save and verifies its ten native values and transaction.
The worker gate compares every ordered result and durable state with Python, including empty inputs. The replica driver compares worlds, release markers, evaluation bytes and durable state for every roster member. The bench collector checks all named native cases, attempt/source/build/slot, raw traffic, CPU assignments and cross-arm digests before computing worker ratios.
Evidence lives under `evidence/DX-ACT1/part2/`. Both native pricing reservations were released. See `native-{1,2}/price/price.json`, `native-{1,2}/fifo/samples.json`, `native-2/schedules.tap` and `final-gates/`. [Part 2 checksums](PART2-SHA256SUMS) · [Part 1 checksums](SHA256SUMS)

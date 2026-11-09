# EXP-P3M: the NS bench measures P3 as contracted

Source: R41 section 4.3 E3 (lab/research/R41-*.md). Builder Codex medium; reviewer Codex high. Base: exp/FD01-feed-contract 731e10e4
(accepted offline, verify/FD01 c20526eb).

**North star:** P3 lag (NS-P3-LAG-P99-MS, Q55d, Q67d), NS-P3-EVERY-POSITION-ACCOUNTED and NS-P3-SOURCE-PREFIX-ENUMERATED. Measured by a
receipt whose lag start is the source's publication instant for each position.

## What to build (in lab/bench)

1. Read the lane feed through FD01's adapters, not `transactions()`.
2. Take the publication instant per position from the source (R41-c), through FD01's origin-bound PublicationClock:
   - broker: `watermarkAt`;
   - XTDB: the writer's host instant when COMMIT SYNC returns, with `system_time` recorded beside it;
   - Datomic: the TS client's host instant at the transact result.
3. Enumerate the final published prefix from the source's own record, then reconcile ACKs against it (Q67d). Fail the run on any
   position without an instant.
4. Run the consumer in its own worker or process, apart from the reader clients (EXP-P2B round 1 suggests in-process readers distort
   latency).
5. Run 256 closed-loop readers per TARGETS 1.1 P1 on the lane's read composition.
6. Report lag pooled over the window, bursts included, and split into steady and burst.
7. Label the reader level from the run itself, never from a constant (receipt 6f67e0 says "at L256" for a run with zero readers).
8. Receipts bind the feed route, the consumer store, the reader composition and the slot.

## Gates

Offline only, against a fake source with planted delays: planted delays of 100, 249, 251 and 400 ms are reported exactly; a position
with no instant fails the run; a receipt from a run with fewer readers than its label is refused. G0. No slot.

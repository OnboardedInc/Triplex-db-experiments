# DX-HA1 · More small import frames in flight

At the 128-fact cap, server frames took 21.84 ms on average. Datomic applied the frame in 4.08 ms and the writer held its turn for about 11 ms.
Several small frames can prepare and collect receipts at once. Only one import frame may hold the writer's turn, and ready saves go first.
The first two server arms are 16 facts with two in flight, then 24 with two. The forecasts are 3,040 and 3,600 queryable facts per second.
The forecasts put quiet reads outside the 1.5× allowance. [The server run](MICRO-SERVER.md) compares every account with two live-only controls.
The Mac verified 13,936 facts, reached four and eight frames in flight, and checked order, original receipts and restart. Mac timings are diagnostic.
The integrated code is `f5a3e90bf`. Allow 30–45 minutes on one server, with 90 minutes allocated for setup, tests and collection.

## Evidence and predictions

- The archived means sum to 21.84 ms across 4,943 frame matches. The 8 ms required at 24 facts is a target. The [stage split and forecasts](PREDICTIONS-PART6.md) describe how to falsify the model.
- The client counts every frame through the durable checkpoint. Pressure from two pending live saves halves the window, and four reduce it to one. The gateway schedules ready live saves ahead of queued bulk requests. It releases a bulk turn only when its peer future resolves.
- A cluster-side predecessor check refuses a suffix whose earlier frame has no committed claim. Durable frame identity combines the source, scope, width and ordinal with the exact original content. Client checkpoint replay looks up each original receipt.
- [Evidence and receipt audit](EVIDENCE6.md) · [Archived measurements and checksum](SHA256SUMS.part6)

[Part 5](PART5.md) preserves the single-frame frontier and four-minute sustained import check.

## Version 0.1 intake

- Merged INT1 revision `a08f20103`. Core passed 861 checks, Datomic passed 434 with 52 opt-in tests skipped, and the focused and retention checks passed 34. The managed import verified 11,472 facts on the merged code.
- The shared database recovered in all four transactor fault cells. Every observed historical probe succeeded, 742 in total. These runs checked receipts and feed resume in addition to the reads. [Exact attempts and hashes](EVIDENCE6.md)

- The planned whole-database move verified all 266 receipts and all 316 pinned-read probes. The shared Mac pause was 31.74 seconds, of which 21.17 seconds was transactor startup. The 30-second target remains open on bare metal.
- P8 uses the [single-server import matrix](MICRO-SERVER.md) and its per-account comparison. P9 uses the [single-server shared-database fault command](../ha1/BENCH.md#version-01-recovery-row-on-one-server). Host loss, synchronous commit cost and whole-database relocation need the paired runs described there.

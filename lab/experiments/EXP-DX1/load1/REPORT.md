# DX-HA1 · Import pacing in one database

On bare metal, 32 facts per frame loaded 3,983 facts per second. The quiet account's p99 rose to 37.59 ms for saves and 15.98 ms for reads.
The quiet saves at p99 spent 18–25 ms in the writer queue. Many of the slowest reads overlapped a pause in the shared gateway.
The two no-import controls differed by 1.9× for saves. Against the faster control, all three earlier frame sizes missed the neighbour limit.
The next server run compares feedback with fixed pacing at 32 facts per frame. Both keep one frame outstanding in the same database.
[Server command](MICRO-SERVER.md) · [Attribution and forecast](MICRO-ATTRIBUTION.md)
Allow 15–25 minutes on one server. The allocation includes setup, tests and collection within 90 minutes.

## Evidence and earlier pipeline experiment

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

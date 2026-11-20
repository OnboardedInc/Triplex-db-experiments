Preparing a full group took most of the time on the Mac.
Eight-save groups spent 86% of their gateway turn preparing the edits.
The forecast was 25% to 55%. Both repeats were above it.
Almost all of that preparation was Datomic applying each edit on the gateway.
The durable log append took about 2 ms at the median.
All 1,152 saves had the expected receipts, feed entries and pinned field reads.
The comparison used ten synthetic accounts on a one-core shared Mac slot.
The next build targets the repeated apply.

**North star.** P2 durable saves and P6 isolation, with P1/P3 exact cuts and feed. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)
**CEIL-MAC-ORTHO eight-member probe.** W1 source `7a6a7e9ef`, prepared-request reuse and predecessor lookup on, original row encoding, cap eight, 1,152 subjects with 160 scalar fields each. The six blocks used disjoint cohorts at 1/8/32/32/8/1 outstanding, 192 replacements per block.

| Outstanding | Members | Groups | Evaluate / materialize ms | Native apply / append ms | Append to last ACK ms |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 384 | 0 / 0 | 4.126 / 1.294 | 2.227 |
| 8 | 4 | 41 | 82.551 / 0.328 | 2.014 / 1.466 | 4.404 |
| 8 | 7 | 27 | 109.033 / 0.432 | 4.200 / 2.445 | 7.258 |
| 32 | 8 | 46 | 117.359 / 0.488 | 3.619 / 1.995 | 6.257 |

Values are medians within the displayed occupancies. The full table includes the smaller groups and per-group observations. The 8-outstanding arm produced no full groups. Initial gateway request preparation was 0.388 ms median at depth one. Full groups carried 38,384 median native serialized bytes. Native append measures the actual durable log call, and the ACK interval ends at the last HTTP client response.
**Decision.** For all full groups, total evaluate plus materialize divided by total evaluate plus materialize plus peer await was 85.8% (85.1% and 86.9% by repeat). The loop's per-member receipt settlement follows that denominator. The prepare path clears the 15% stop threshold. Shared CPU and the small synthetic seed limit extrapolation.
**Evidence.** `DX-PREP1/ortho-03` under the durable lab evidence root, with the append/receipt join in `stages.json`. Attempts 01 and 02 retain startup failures. [Checksums](SHA256SUMS)
**Result audit.** `manage.py` records engine exit and binds its log digest, attempt, image and reservation. `probe.ts` checks the current attempt's durable operation receipts, strict positions/clocks, exact feed changes and reads at p−1/p. `read_probe.py` checks staged/build input hashes, attempt, slot, image, durable SQL settings, all edits, native database/t, datom counts, timing bounds and zero observer drops before writing measurements.

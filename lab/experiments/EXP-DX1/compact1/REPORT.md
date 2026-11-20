A small edit fits into 11 database records and about 232 bytes of values.
A three-field edit used 344 bytes and a 25-field edit used 1,614 bytes.
The simplest durable single writes ran at 359–824 per second in the Mac baseline runs.
With 64 saves in flight, compact finished 614–742 saves a second on the Mac.
The new layout restores old answers from the same records that hold the edit and its receipt.
I predict about 730 small saves a second on one server with ten deep accounts.
At 235 and 394 saves a second, I predict p99 of 31 and 34 milliseconds.
Build the incremental writer first and make whole accounts movable between databases.

**North star.** P2 durable field saves, with P1/P3/P4 exact historical and current reads and P5 atomic publication. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)
**Floor.** 1,440 factorial and 3,840 burst transactions matched the requested bytes and durable log. Fixed native apply was 0.160 ms, plus 1.74 µs/datom, 2.49 µs/KiB and 0.70 µs/warm index seek. Durable peer coefficients were 2.136 ms, 4.80 µs, 67.82 µs and 1.33 µs. [Floor and settings](FLOOR.md)
**Ceiling.** The first baseline reached 1,696–2,790 minimal tx/s at depth 64. Native apply occupied 22–25% of the one-member deep bursts and up to 80% in a larger group. Across three settings the highest bare rate was 68,471 simple members/s with 128 per native transaction. Two indexing threads led the eight-member blocks and the larger threshold deferred index adoption. The baseline repeat drift limits attribution. [Floor and settings](FLOOR.md)
**Layout.** Event, claim, server clock, owner and account position are durable together. The subject chain reconstructs exact validity, receipt, retirement, history and both read paths. Grouping saves account-head replacements and one native instant. [Obligations](LAYOUT.md) · [Native size census](CENSUS.md)
**SQL gate.** Both readers matched independent W0 on 71 cases and 213 checked responses. The fresh peer recovered the exact receipt after the dropped group result. The SDK checked 11 requests. [Methods and evidence](MEASUREMENTS.md)
**Matched timing.** At 64 outstanding, compact finished 4.4× and 6.2× as many saves/s within the two matched Mac blocks. Native apply used 222–252 µs/save and WAL used 230–236 B/fact. At 1, 8 and 32 outstanding, the paired rate gains were 1.21–1.41×, 3.69–4.83× and 2.59–4.19×. [Write and read tables](MEASUREMENTS.md)
**Cost.** The Mac loaded 16M facts in 6m 25s plus 3s of final indexing, with 866 MB of WAL. Cold current reads for one-event subjects took 4.18 ms p50 and 194.44 ms p99, with one outlier across 88 reads. The heap sample added 99.5 KiB per touched subject. [Read, import and migration](COST.md)
**Prediction.** 730/s gross and 467/s after assumed reserves. The paced server test uses 235/s and 394/s with p99 of 31/34 ms predicted. [Assumptions and decision](PREDICTION.md)
`bash lab/experiments/EXP-DX1/compact1/bench-server.sh`
**Audit.** The floor checks full datom tuples and native t. The layout and loader compare durable event bytes to input. Receipts, old cuts, feed fields, the lost reply, SDK and oracle have explicit fresh-attempt and source checks. [PASS audit](AUDIT.md)
**Evidence.** Durable attempt directories under `evidence/DX-COMPACT1/`. [Checksums](SHA256SUMS)
**Open.** Production key custody and restore, storage-layer account isolation, complete activation and notice delivery, long-history reader tails and the full bare-metal mixed-traffic run.

A small edit fits into 11 database records and about 232 bytes of values.
A three-field edit used 344 bytes and a 25-field edit used 1,614 bytes.
The Mac finished about 800 minimal single writes a second with durable acknowledgement.
A short grouped test reached about 53,000 bare assertions a second.
The new layout restores old answers from the same records that hold the edit and its receipt.
I predict about 730 small saves a second on one server with ten deep accounts.
At the two planned loads, I predict p99 of 31 and 34 milliseconds.
Build the incremental writer first and make whole accounts movable between databases.

**North star.** P2 durable field saves, with P1/P3/P4 exact historical and current reads and P5 atomic publication. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)
**Floor.** 1,440 factorial and 3,840 burst transactions matched the requested bytes and durable log. Fixed native apply was 0.160 ms, plus 1.74 µs/datom, 2.49 µs/KiB and 0.70 µs/warm index seek. Durable peer coefficients were 2.136 ms, 4.80 µs, 67.82 µs and 1.33 µs. [Floor and settings](FLOOR.md)
**Ceiling.** 759–824 minimal tx/s alone, 1,696–2,790 at depth 64, and a peak of 52,911 bare members/s in a 64-member group. Native apply occupied 22–25% of wall for the one-member deep bursts. At larger groups it reached 80% in one arm. SQL, log encoding and peer delivery share the rest. [Floor and settings](FLOOR.md)
**Layout.** Event, claim, server clock, owner and account position are durable together. The subject chain reconstructs exact validity, receipt, retirement, history and both read paths. Grouping saves account-head replacements and one native instant. [Obligations](LAYOUT.md) · [Native size census](CENSUS.md)
**Comparison.** The matched SQL arms are queued behind the shared lab reservations. The in-memory preflight matched both read paths to independent W0 at 71 cases and exercised an interior group cut and the erasure marker. [Comparison method](MEASUREMENTS.md)
**Cost.** A cold or pinned read folds one subject's retained chain plus its referenced roots. A current cache entry tracks only live intervals at the matching head. The 16M-fact import and migration obligations are listed with the read tradeoffs. [Read, import and migration](COST.md)
**Prediction.** 730/s gross and 467/s after assumed reserves. The paced server test uses 235/s and 394/s with p99 of 31/34 ms predicted. [Assumptions and decision](PREDICTION.md)
`bash lab/experiments/EXP-DX1/compact1/bench-server.sh`
**Audit.** The floor checks full datom tuples and native t. The layout and loader compare durable event bytes to input. Receipts, old cuts, feed fields, the lost reply, SDK and oracle have explicit fresh-attempt and source checks. [PASS audit](AUDIT.md)
**Evidence.** Durable attempt directories under `evidence/DX-COMPACT1/`. [Checksums](SHA256SUMS)
**Open.** Production key custody and restore, storage-layer account isolation, complete activation and notice delivery, long-history reader tails and the full bare-metal mixed-traffic run.

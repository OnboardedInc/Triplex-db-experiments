All ten accounts stay in one Datomic database.
The saved run edited 96 different people and returned 96 receipts.
Fifteen saves used the prepared writer and eighty-one used the reference writer.
Ten groups of eight switched paths before reaching the database.
The other reference write was the first save, which ran alone.
The saved trace shows zero replays after submission.
The old trace cannot tell which preparation check rejected each group.
The new trace records those decisions by save.

**North star.** P2 durable small saves, P6 per-account tails and P8 live progress during import. Exact historical reads, native rows and the ordered feed are part of this experiment. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Step 1.** `subject-saved-census.json` rejoined 96 receipts for 96 subjects to 13 native transactions from the original depth run. One singleton and ten groups of eight used the reference path. Two groups of eight and seven certified using point checks. The study's counts match. The basis refresh only schedules a new draft on a missing or changed basis. A changed basis and an occupied covering range are intermediate events. Both can recover before submission. The retained run does not identify the terminal cause for the ten batches. The instrumented rerun records terminal native refusal and uncertainty separately from peer decisions.

**Evidence audit.** `census.py` validates the frozen probe, scoped offers, exact operation IDs and contiguous receipt positions, then joins them through the retained native t and append record. Fresh reasons are per operation and bound to the run nonce. The saved analysis labels unknown causes explicitly. The certified ACK uses the existing native report and receipt checks. [Checksums](SHA256SUMS)

Part 2's full report is available at `ec509b2dc`. No acceptance hashes moved.

All ten accounts stay in one Datomic database.
The saved run returned 96 receipts in 13 writes.
Fifteen saves used the old prepared writer. Ten groups switched paths before submitting.
The old trace shows zero submitted retries and cannot identify why each group switched paths.
The new writer checks one person's revision and assigns order and time at commit.
It keeps the ordinary records and journal and uses the existing writer for other save shapes.
The shared Mac lease is holding up the live checks.
The model is still a forecast. There is no new capacity result.

**North star.** P2 durable small saves, P6 per-account tails and P8 live progress during import. Exact historical reads, native rows and the ordered feed are part of this experiment. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Step 1.** `subject-saved-census.json` rejoined 96 receipts for 96 subjects to 13 native transactions from the original depth run. One singleton and ten groups of eight used the reference path. Two groups of eight and seven certified using point checks. The study's counts match. The basis refresh only schedules a new draft on a missing or changed basis. A changed basis and an occupied covering range are intermediate events. Both can recover before submission. The retained run does not identify the terminal cause for the ten batches. The instrumented rerun records terminal native refusal and uncertainty separately from peer decisions.

**Step 2.** Based on `883bb65bf`, with the WFIX `0f92704d2` port and regression fixtures from `4331d6fe8`. `TX2_SUBJECT_SAVE=1` selects an experimental singleton writer for strict ordinary lean replacements of one to three scalar fields on one existing person with a known source cut. Narrow classification requires that person to be the full entity read set, no wider reads, one regular journal and no packed rows. Unclassified frames go through the fixed reference path. Optimistic requests with no source cut and live/import scheduling remain on that path.

The owner revision is updated by every typed write to that owner's rows and is the serialized position, so its CAS covers the exact peer-read predecessor and any retirement. Source cuts stay at or before the peer's known head, so a later same-owner commit is a reference conflict. Scope/schema, writer function, layout and erase generation stay fenced. Any native excision or managed erasure declaration excludes this candidate. The transactor still checks journal absence, duplicate command and operation IDs, and historical assertion IDs across owners. Range occupancy uses exact prefix probes. A definite history or feed-layout refusal re-enters the reference path from a fresh cut. Transport failure leaves receipt resolution to the original operation. A fresh operation for the same command resolves via the original claim.

`subject_gate.clj` compares native stored row bytes and additions/retractions, historical reads, journal content and the original receipts on a 256-field subject, with speculative execution blocked. `subject_conflicts.clj` stages actual Datomic writes between preparation and submission. It also exercises reference admission for cross-subject and scope-wide predicates. No native verdict is recorded while the tests are queued.

**Evidence audit.** `census.py` validates the frozen probe, scoped offers, exact operation IDs and contiguous receipt positions, then joins them through the retained native t and append record. Fresh reasons are per operation and bound to the run nonce. The saved analysis labels unknown causes explicitly. `subject/verify-report` ties the operation, command, journal, owner, time and position to the committed native t before the gateway returns a receipt. The gate checks an independent expected receipt and compares row bytes across scoped database attempts. [Checksums](SHA256SUMS)

Part 2's full report is available at `ec509b2dc`. No acceptance hashes moved.

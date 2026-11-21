# Size and reads on the ordered save path

P2 and P6. Reduce serial storage misses without changing logical history, ACK durability, or the stored journal. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Audit before the change

- The existing native result verifies operation, claim, journal, position and revision against this attempt's exact committed database value. The candidate also matches the new marker bytes, owner, final clock, position and native transaction in that report's actual datoms. No separate database lookup decides whether to acknowledge.
- The native comparison checks the pinned answers, exact ordinary journal and receipts for the same edits on fresh scopes and separately confirms that the physical retirement used a marker. The recovery fixture binds the seed, sender mode, write option, native transaction and durable/denied operations to its fresh attempt before reopening it.
- The cache fixture restores the same indexed dump bytes per arm and uses the same subjects, widths and values. It verifies the installed writer, marker ACK, durable operation and exact old and new values at their named cuts. The result carries the dump hash, cache setting, fresh arm and native transaction numbers. It issues no product or acceptance verdict.

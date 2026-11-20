All accounts stay in one Datomic database.
The aging tool writes a full journal and keeps one native transaction per save.
The Mac comparison is queued behind another lab run.
Larger ages have no measurements from this run yet.
The server forecast depends on the rate of those complete writes.
The successor rehearsal checks a single move for every account.
The erasure drill tracks whether old copies can still return a value.
The timings from this Mac will describe this setup.

# DX-AGE1

**North star** P1 exact old and near pins, P2 durable save tails, P3 feed, P4 current reads. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Aging and gate

The deterministic solo K tape has ten deep and four thin accounts. Each replacement retains 16/20/24 datoms for one/two/three fields. A native pipeline preserves the original physical transaction boundaries. The gate drives the ordinary gateway save entry point against a separate database, then compares durable native logs, receipts, current rows, old pins and feed pages against the same tape. [Method](METHOD.md)

## Receipt audit

- Seed batches and native save batches compare every expected value, attribute, entity and added/retracted bit against fresh, monotonically advancing native reports. The save header and source position bind the command. Engine-assigned instants are checked for type. The exact logical clocks are checked as values.
- The fidelity observation is emitted only after both new databases' named receipts, durable log frames, current and pinned rows and feed pages match. The attempt binds its source archive, validated container identities, image and library hashes, SQL settings, exclusive slot and cleanup.
- Changed files are outside the acceptance pin set. The acceptance contract was left intact.

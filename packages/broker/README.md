# Experimental host broker

The private `@triplex-build/triplex-broker` package owns the shared decision loop,
SQLite log, command claims, operation receipts, frame codec, persisted source rows,
overlay retention, replica fencing and resumable feed. It was extracted from
EXP-P2Q for EXP-P2B. It depends on core public exports, never on an engine package.

`BrokerReplica` supplies a fresh marker, guarded fence and atomic publication.
`BrokerReadDriver` supplies rows and their eligibility marker from one snapshot.
The QLever package retains its public compatibility factory and SPARQL driver.
XTDB supplies a pgwire driver. Each broker instance currently has one replica;
this experiment does not add a multi-replica scheduler.

`makeBrokerStorageAdapter` retains P2Q's staging/CAS and exact-cut masking. Its
repository reads use the replica, merge source rows while behind, or fall back to
the persisted log. Dependency-state and Datalog require an eligible replica;
they never merge engine aggregates. The dependency-state implementation scans
replica rows and reduces them in TypeScript; its scale cost remains unmeasured.

Set `decisionStamp: true` when opening an XTDB broker. It assigns a strictly
increasing integer-microsecond stamp per decided member, persists it with the
frame and operation receipt, and exposes milliseconds at the TypeScript boundary.
The valid-time default retains its staged value. The QLever compatibility factory
keeps decision stamping opt-in pending the common RT01 integration.

`MemoryBrokerReplica` is an offline diagnostic driver. It is not a durability or
XTDB performance result. Actual broker persistence in those tests still uses the
pinned SQLite native driver.

This package preserves the accepted numeric position representation and 1,024
ordinal packing. Q51c's public opaque/bigint position migration requires a common
core/contract integration; it is not silently implemented in this experiment.

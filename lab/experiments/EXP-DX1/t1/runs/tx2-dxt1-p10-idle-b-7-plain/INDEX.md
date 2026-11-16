# tx2-dxt1-p10-idle-b-7-plain

Source: a0785bcf96f7afea3965b3028db2e27f4fbef6a9. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (32.439 ms, trace `897a45717404390c0000000000000106`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (54.537 ms, trace `897a45717404390c000000000000064b`); `tx/thread-86/transactor.triplex-function` (42.646 ms, trace `897a45717404390c0000000000000297`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (21.493 ms, trace `897a45717404390c00000000000000f0`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (32.754 ms, trace `897a45717404390c0000000000000299`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p10-idle-b-7-plain/.
Compressed raw traces: 18595242 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

# tx2-dxt1-p5-defer-b-1-baseline

Source: 3ff6db5ae859a18b9afcf85c58ee7cd70c829800. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (63.182 ms, trace `417bfc4f9929a22c000000000000082b`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (134.268 ms, trace `417bfc4f9929a22c00000000000001fe`); `node-14/thread-0/driver.queue.subject` (60.652 ms, trace `417bfc4f9929a22c0000000000000826`); `gw-w/thread-47/gateway.admitted-work` (111.251 ms, trace `417bfc4f9929a22c000000000000022b`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (104.931 ms, trace `417bfc4f9929a22c00000000000001a2`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p5-defer-b-1-baseline/.
Compressed raw traces: 7695442 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

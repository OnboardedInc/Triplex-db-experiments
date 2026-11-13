# tx2-dxt1-p4-smoke-g

Source: 0c2208b123903ee6df7f958e1355a586a23f3c49. Trace collection complete: true. Derived render recovery: true.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (1778.453 ms, trace `d87a9f279d731ddc0000000000000099`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (858.156 ms, trace `d87a9f279d731ddc0000000000000112`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (657.336 ms, trace `d87a9f279d731ddc0000000000000113`); `node-14/thread-0/driver.queue.scheduler-late` (531.086 ms, trace `d87a9f279d731ddc000000000000009a`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (457.530 ms, trace `d87a9f279d731ddc0000000000000138`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-smoke-g/.
Compressed raw traces: 2534000 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

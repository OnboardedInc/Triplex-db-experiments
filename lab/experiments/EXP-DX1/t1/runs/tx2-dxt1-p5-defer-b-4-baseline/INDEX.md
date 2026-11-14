# tx2-dxt1-p5-defer-b-4-baseline

Source: 3ff6db5ae859a18b9afcf85c58ee7cd70c829800. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/node.gc` (89.892 ms, trace `854d20932ad6977700000000000003ca`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (220.788 ms, trace `854d20932ad69777000000000000020d`); `node-14/thread-0/driver.queue.subject` (123.936 ms, trace `854d20932ad6977700000000000003d4`); `node-14/thread-0/socket.wait-first-byte` (145.516 ms, trace `854d20932ad6977700000000000003c6`); `node-14/thread-0/socket.wait-first-byte` (157.937 ms, trace `854d20932ad6977700000000000003c5`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p5-defer-b-4-baseline/.
Compressed raw traces: 7686175 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

# tx2-dxt1-p12-row-a-4-baseline

Source: 2409bdada6be6cb7f17d1aa71f31da90a72f01af. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (102.014 ms, trace `2916fa03b9c0f9b100000000000017e4`); `node-14/thread-0/socket.wait-first-byte` (92.201 ms, trace `2916fa03b9c0f9b100000000000017e3`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (34.293 ms, trace `2916fa03b9c0f9b100000000000017e6`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (111.691 ms, trace `2916fa03b9c0f9b10000000000000141`); `gw-w/thread-45/commit.prepare-and-validate` (107.608 ms, trace `2916fa03b9c0f9b10000000000001105`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p12-row-a-4-baseline/.
Compressed raw traces: 8807221 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

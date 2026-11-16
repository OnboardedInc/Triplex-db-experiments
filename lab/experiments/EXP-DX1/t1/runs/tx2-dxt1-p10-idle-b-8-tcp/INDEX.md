# tx2-dxt1-p10-idle-b-8-tcp

Source: a0785bcf96f7afea3965b3028db2e27f4fbef6a9. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (38.882 ms, trace `6f0a8b5e40b4d9a5000000000000033d`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (36.755 ms, trace `6f0a8b5e40b4d9a5000000000000033e`); `node-14/thread-0/socket.wait-first-byte` (21.823 ms, trace `6f0a8b5e40b4d9a50000000000000340`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (36.607 ms, trace `6f0a8b5e40b4d9a5000000000000033f`); `node-14/thread-0/socket.wait-first-byte` (48.253 ms, trace `6f0a8b5e40b4d9a50000000000000337`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p10-idle-b-8-tcp/.
Compressed raw traces: 18459255 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

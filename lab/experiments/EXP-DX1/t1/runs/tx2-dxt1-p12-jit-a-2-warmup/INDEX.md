# tx2-dxt1-p12-jit-a-2-warmup

Source: 8d4e3e21eac91cdd7a2777673a3a8a06e2b8e66a. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (671.111 ms, trace `ba4dbe25e2df14e5000000000000135c`); `node-14/thread-0/socket.wait-first-byte` (696.900 ms, trace `ba4dbe25e2df14e5000000000000135f`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (982.583 ms, trace `ba4dbe25e2df14e50000000000001336`); `gw-w/thread-74/peer.transact-await (includes order/network/storage)` (920.379 ms, trace `ba4dbe25e2df14e50000000000001338`); `gw-w/thread-80/peer.transact-await (includes order/network/storage)` (954.530 ms, trace `ba4dbe25e2df14e50000000000001335`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p12-jit-a-2-warmup/.
Compressed raw traces: 48044493 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

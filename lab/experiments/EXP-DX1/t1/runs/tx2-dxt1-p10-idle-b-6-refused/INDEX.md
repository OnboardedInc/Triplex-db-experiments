# tx2-dxt1-p10-idle-b-6-refused

Source: a0785bcf96f7afea3965b3028db2e27f4fbef6a9. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (47.587 ms, trace `d62c64b47eb831930000000000000448`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (15.290 ms, trace `d62c64b47eb8319300000000000000f1`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (34.117 ms, trace `d62c64b47eb831930000000000000449`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (29.157 ms, trace `d62c64b47eb831930000000000000634`); `node-14/thread-0/socket.wait-first-byte` (22.687 ms, trace `d62c64b47eb831930000000000000262`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p10-idle-b-6-refused/.
Compressed raw traces: 51707514 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

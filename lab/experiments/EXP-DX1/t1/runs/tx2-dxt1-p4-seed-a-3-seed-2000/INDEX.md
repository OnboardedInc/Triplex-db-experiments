# tx2-dxt1-p4-seed-a-3-seed-2000

Source: 647da7a8545c6ff0acd545de48fde57601c3de71. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (26.602 ms, trace `c0ab384c91453869000000000000182f`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (31.722 ms, trace `c0ab384c9145386900000000000003f8`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (54.992 ms, trace `c0ab384c9145386900000000000009d6`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (41.353 ms, trace `c0ab384c9145386900000000000009d5`); `node-14/thread-0/socket.wait-first-byte` (39.580 ms, trace `c0ab384c91453869000000000000171a`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-seed-a-3-seed-2000/.
Compressed raw traces: 6649117 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

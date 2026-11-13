# tx2-dxt1-p4-seed-a-1-baseline

Source: 647da7a8545c6ff0acd545de48fde57601c3de71. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (50.367 ms, trace `47bb2b3d052fd0de0000000000001271`); `node-14/thread-0/driver.queue.subject` (82.480 ms, trace `47bb2b3d052fd0de0000000000001275`); `node-14/thread-0/socket.wait-first-byte` (80.547 ms, trace `47bb2b3d052fd0de000000000000043a`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (43.345 ms, trace `47bb2b3d052fd0de00000000000006ba`); `gw-w/thread-48/gateway.admitted-work` (62.931 ms, trace `47bb2b3d052fd0de00000000000004b7`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-seed-a-1-baseline/.
Compressed raw traces: 7175173 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

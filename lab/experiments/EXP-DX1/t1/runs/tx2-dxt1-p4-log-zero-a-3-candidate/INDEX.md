# tx2-dxt1-p4-log-zero-a-3-candidate

Source: ef7473361c138176ead9c0222b2ccc53e33dde11. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (180.944 ms, trace `e6eb72f3c6e8377d00000000000011d3`); `node-14/thread-0/socket.wait-first-byte` (192.176 ms, trace `e6eb72f3c6e8377d00000000000011cf`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (95.278 ms, trace `e6eb72f3c6e8377d00000000000011d5`); `gw-w/thread-65/peer.transact-await (includes order/network/storage)` (167.323 ms, trace `e6eb72f3c6e8377d00000000000011d1`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (170.256 ms, trace `e6eb72f3c6e8377d00000000000011d2`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-log-zero-a-3-candidate/.
Compressed raw traces: 6686621 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

# tx2-dxt1-p2-smoke-f

Source: 04298a56c00b5aa953b14f65e3a34966e72210e3. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (245.560 ms, trace `217f8f683f5b76ef000000000000011b`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (159.277 ms, trace `217f8f683f5b76ef0000000000000151`); `gw-w/thread-62/peer.transact-await (includes order/network/storage)` (158.094 ms, trace `217f8f683f5b76ef0000000000000150`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (151.629 ms, trace `217f8f683f5b76ef000000000000014f`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (120.472 ms, trace `217f8f683f5b76ef000000000000014e`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-smoke-f/.
Compressed raw traces: 812154 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

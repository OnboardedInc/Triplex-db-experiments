# tx2-dxt1-p2-smoke-e

Source: 79dd8d09cc47ab974da6387945512767732c892c. Trace collection complete: false. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (269.421 ms, trace `2f5733cfb082861c000000000000010e`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (256.870 ms, trace `2f5733cfb082861c000000000000010f`); `node-14/thread-0/driver.queue.subject` (203.686 ms, trace `2f5733cfb082861c0000000000000110`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (93.490 ms, trace `2f5733cfb082861c00000000000000bb`); `gw-w/thread-65/peer.transact-await (includes order/network/storage)` (128.331 ms, trace `2f5733cfb082861c000000000000014b`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-smoke-e/.
Compressed raw traces: 788679 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

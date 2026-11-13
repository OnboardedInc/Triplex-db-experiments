# tx2-dxt1-smoke-h

Source: f6893eca95524bb4ecd715f442e8bcb23b8169c4. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (280.751 ms, trace `ca10090f2601caff00000000000000b5`); `node-14/thread-0/client.persist-and-resolve` (143.099 ms, trace `ca10090f2601caff000000000000014a`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (106.437 ms, trace `ca10090f2601caff00000000000000bb`); `node-14/thread-0/client.persist-and-resolve` (133.346 ms, trace `ca10090f2601caff0000000000000149`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (98.017 ms, trace `ca10090f2601caff00000000000000cd`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-smoke-h/.
Compressed raw traces: 2352886 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

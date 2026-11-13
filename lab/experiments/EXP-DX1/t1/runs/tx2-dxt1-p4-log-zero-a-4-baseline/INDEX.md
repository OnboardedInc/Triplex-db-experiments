# tx2-dxt1-p4-log-zero-a-4-baseline

Source: ef7473361c138176ead9c0222b2ccc53e33dde11. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (150.488 ms, trace `cceaf0dccd4dc00900000000000006c2`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (129.727 ms, trace `cceaf0dccd4dc00900000000000006c5`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (134.491 ms, trace `cceaf0dccd4dc00900000000000006c4`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (65.293 ms, trace `cceaf0dccd4dc00900000000000006d1`); `node-14/thread-0/driver.queue.subject` (89.723 ms, trace `cceaf0dccd4dc00900000000000006c9`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-log-zero-a-4-baseline/.
Compressed raw traces: 6682759 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

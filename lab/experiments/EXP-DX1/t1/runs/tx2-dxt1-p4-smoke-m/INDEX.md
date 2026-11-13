# tx2-dxt1-p4-smoke-m

Source: ef7473361c138176ead9c0222b2ccc53e33dde11. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (306.900 ms, trace `f79f20fd0ae5820c0000000000000058`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (175.801 ms, trace `f79f20fd0ae5820c00000000000000d9`); `gw-w/thread-65/peer.transact-await (includes order/network/storage)` (90.017 ms, trace `f79f20fd0ae5820c00000000000000e6`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (98.272 ms, trace `f79f20fd0ae5820c0000000000000074`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (88.538 ms, trace `f79f20fd0ae5820c00000000000000e5`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-smoke-m/.
Compressed raw traces: 726015 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

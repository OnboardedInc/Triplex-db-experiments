# tx2-dxt1-p4-smoke-i

Source: a057992d28395c9431fc578a145f4678ae26ea21. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (156.631 ms, trace `727872374d05bf1c00000000000000b5`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (139.195 ms, trace `727872374d05bf1c00000000000000c9`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (83.103 ms, trace `727872374d05bf1c00000000000000b9`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (85.078 ms, trace `727872374d05bf1c0000000000000141`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (93.413 ms, trace `727872374d05bf1c00000000000000cf`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-smoke-i/.
Compressed raw traces: 788795 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

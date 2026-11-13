# tx2-dxt1-smoke-g

Source: 0c1fa43b93562e3774b09e18c9e351decc0741da. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (329.725 ms, trace `c80fdcd8240879d4000000000000011c`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (279.634 ms, trace `c80fdcd8240879d400000000000000b5`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (191.299 ms, trace `c80fdcd8240879d40000000000000113`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (159.153 ms, trace `c80fdcd8240879d400000000000000f1`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (114.271 ms, trace `c80fdcd8240879d400000000000000b7`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-smoke-g/.
Compressed raw traces: 2606381 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

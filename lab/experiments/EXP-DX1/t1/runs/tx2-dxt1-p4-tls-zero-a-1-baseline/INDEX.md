# tx2-dxt1-p4-tls-zero-a-1-baseline

Source: a8bc259a437829f8d65e9630ab698b30bf202117. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (167.491 ms, trace `1ecbf60221f5e9910000000000000292`); `node-14/thread-0/driver.queue.subject` (98.550 ms, trace `1ecbf60221f5e9910000000000000362`); `node-14/thread-0/driver.queue.subject` (139.881 ms, trace `1ecbf60221f5e9910000000000000366`); `node-14/thread-0/driver.queue.subject` (123.043 ms, trace `1ecbf60221f5e9910000000000000365`); `node-14/thread-0/socket.wait-first-byte` (40.984 ms, trace `1ecbf60221f5e9910000000000000358`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-tls-zero-a-1-baseline/.
Compressed raw traces: 6661168 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

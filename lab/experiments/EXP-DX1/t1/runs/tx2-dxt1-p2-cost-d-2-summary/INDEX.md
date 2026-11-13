# tx2-dxt1-p2-cost-d-2-summary

Source: b93872958321dadbd615ed359d84950571e7f982. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (189.772 ms, trace `cfc1e96bce8d4c960000000000000883`); `node-14/thread-0/driver.queue.scheduler-late` (127.874 ms, trace `cfc1e96bce8d4c960000000000001b5b`); `gw-w/thread-49/commit.prepare-and-validate` (200.178 ms, trace `cfc1e96bce8d4c960000000000000540`); `node-14/thread-0/socket.wait-first-byte` (120.513 ms, trace `cfc1e96bce8d4c960000000000001b5c`); `node-14/thread-0/socket.wait-first-byte` (124.176 ms, trace `cfc1e96bce8d4c960000000000001b5d`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-cost-d-2-summary/.
Compressed raw traces: 7198751 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

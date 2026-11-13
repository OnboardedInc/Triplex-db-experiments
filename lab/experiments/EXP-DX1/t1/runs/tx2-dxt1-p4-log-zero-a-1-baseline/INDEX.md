# tx2-dxt1-p4-log-zero-a-1-baseline

Source: ef7473361c138176ead9c0222b2ccc53e33dde11. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/gateway.admitted-work` (113.928 ms, trace `ea244b9682c3667e0000000000000135`); `gw-w/thread-48/commit.prepare-and-validate` (50.722 ms, trace `ea244b9682c3667e00000000000002dc`); `node-13/thread-0/driver.queue.subject` (84.068 ms, trace `ea244b9682c3667e0000000000001d21`); `node-13/thread-5/socket.wait-first-byte` (42.873 ms, trace `ea244b9682c3667e00000000000002dd`); `node-13/thread-0/driver.queue.subject` (56.787 ms, trace `ea244b9682c3667e0000000000001d20`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-log-zero-a-1-baseline/.
Compressed raw traces: 6662323 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

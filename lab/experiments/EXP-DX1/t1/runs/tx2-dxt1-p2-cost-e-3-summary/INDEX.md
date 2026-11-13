# tx2-dxt1-p2-cost-e-3-summary

Source: 4ad48894a9a6a214f5e2866fec5fb8ac31d2d831. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (312.479 ms, trace `e51a148948fa02170000000000001dcb`); `node-14/thread-0/driver.queue.subject` (176.698 ms, trace `e51a148948fa02170000000000001db5`); `node-14/thread-0/driver.queue.subject` (286.213 ms, trace `e51a148948fa02170000000000001dc2`); `node-14/thread-0/driver.queue.subject` (212.079 ms, trace `e51a148948fa02170000000000001dd1`); `node-14/thread-0/socket.wait-first-byte` (178.790 ms, trace `e51a148948fa02170000000000001f57`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-cost-e-3-summary/.
Compressed raw traces: 7165073 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

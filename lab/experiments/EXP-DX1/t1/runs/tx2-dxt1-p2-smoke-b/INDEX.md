# tx2-dxt1-p2-smoke-b

Source: b7887c23023be9bc22ac6b667fd86b4300504fcf. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (251.257 ms, trace `bc96454f7fa2934b0000000000000118`); `node-14/thread-8/socket.wait-first-byte` (339.528 ms, trace `bc96454f7fa2934b0000000000000119`); `node-14/thread-0/socket.wait-first-byte` (186.386 ms, trace `bc96454f7fa2934b00000000000000b4`); `node-14/thread-0/client.persist-and-resolve` (174.843 ms, trace `bc96454f7fa2934b0000000000000146`); `node-14/thread-0/client.persist-and-resolve` (168.547 ms, trace `bc96454f7fa2934b0000000000000145`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-smoke-b/.
Compressed raw traces: 767065 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

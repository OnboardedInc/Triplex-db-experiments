# tx2-dxt1-p2-cost-a-2-summary

Source: d7c89645926a6a867c856f24dca2d4caba04c075. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-52/gateway.admitted-work` (55.159 ms, trace `f62327ee106316160000000000001558`); `node-15/thread-0/socket.wait-first-byte` (177.077 ms, trace `f62327ee106316160000000000001be3`); `node-15/thread-0/client.persist-and-resolve` (198.866 ms, trace `f62327ee106316160000000000001be4`); `node-15/thread-0/driver.queue.scheduler-late` (116.541 ms, trace `f62327ee106316160000000000001be8`); `node-15/thread-0/driver.queue.scheduler-late` (162.497 ms, trace `f62327ee106316160000000000001be6`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-cost-a-2-summary/.
Compressed raw traces: 14648719 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

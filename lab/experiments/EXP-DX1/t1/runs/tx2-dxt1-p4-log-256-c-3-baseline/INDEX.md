# tx2-dxt1-p4-log-256-c-3-baseline

Source: 804d28ce1dd59e769bf7341f864b66ae07073c6b. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (218.474 ms, trace `36c7c994564f81fa00000000000015aa`); `node-14/thread-0/driver.queue.subject` (124.857 ms, trace `36c7c994564f81fa00000000000015af`); `node-14/thread-0/driver.queue.subject` (235.212 ms, trace `36c7c994564f81fa00000000000015b4`); `node-14/thread-0/client.commit-send-queue` (184.632 ms, trace `36c7c994564f81fa00000000000015b3`); `node-14/thread-0/driver.queue.subject` (198.563 ms, trace `36c7c994564f81fa00000000000015c2`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-log-256-c-3-baseline/.
Compressed raw traces: 10961073 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

# tx2-dxt1-p4-tls-256-a-2-candidate

Source: a8419d3a952cc157a1eb85f3cf295659c85cf436. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (262.147 ms, trace `d03f715a728ae4650000000000001284`); `node-14/thread-0/client.commit-send-queue` (103.366 ms, trace `d03f715a728ae465000000000000129e`); `node-14/thread-0/socket.queue-and-write` (101.270 ms, trace `d03f715a728ae465000000000000129c`); `node-14/thread-0/client.commit-send-queue` (110.003 ms, trace `d03f715a728ae46500000000000012a0`); `node-14/thread-0/driver.queue.subject` (156.498 ms, trace `d03f715a728ae4650000000000001281`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-tls-256-a-2-candidate/.
Compressed raw traces: 11073174 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

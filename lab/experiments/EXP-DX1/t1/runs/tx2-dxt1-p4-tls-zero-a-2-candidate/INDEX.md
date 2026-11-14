# tx2-dxt1-p4-tls-zero-a-2-candidate

Source: a8bc259a437829f8d65e9630ab698b30bf202117. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (145.195 ms, trace `9f2af00b2ba598f40000000000001bcb`); `node-14/thread-0/socket.wait-first-byte` (117.907 ms, trace `9f2af00b2ba598f40000000000001bc3`); `node-14/thread-0/driver.queue.scheduler-late` (145.802 ms, trace `9f2af00b2ba598f40000000000001bca`); `node-14/thread-0/driver.queue.scheduler-late` (112.835 ms, trace `9f2af00b2ba598f40000000000001bcd`); `node-14/thread-0/driver.queue.scheduler-late` (137.785 ms, trace `9f2af00b2ba598f40000000000001bcc`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-tls-zero-a-2-candidate/.
Compressed raw traces: 6670118 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

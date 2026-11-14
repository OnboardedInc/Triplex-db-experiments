# tx2-dxt1-p4-tls-256-a-1-baseline

Source: a8419d3a952cc157a1eb85f3cf295659c85cf436. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.execute` (298.017 ms, trace `da7919ddb210d67c0000000000001c81`); `node-14/thread-0/client.commit-send-queue` (196.220 ms, trace `da7919ddb210d67c0000000000001c95`); `node-14/thread-0/driver.queue.subject` (409.547 ms, trace `da7919ddb210d67c0000000000001c99`); `node-14/thread-0/client.commit-send-queue` (197.559 ms, trace `da7919ddb210d67c0000000000001c94`); `node-14/thread-0/socket.wait-first-byte` (398.025 ms, trace `da7919ddb210d67c0000000000001c83`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-tls-256-a-1-baseline/.
Compressed raw traces: 11005188 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

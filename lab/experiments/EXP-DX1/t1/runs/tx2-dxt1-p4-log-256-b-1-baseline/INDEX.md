# tx2-dxt1-p4-log-256-b-1-baseline

Source: 494a063bbce265769f5797a044dd00a3b035e932. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (105.867 ms, trace `99ad64f6f825576900000000000015bf`); `node-14/thread-0/socket.wait-first-byte` (113.431 ms, trace `99ad64f6f825576900000000000015b9`); `node-14/thread-0/socket.wait-first-byte` (112.518 ms, trace `99ad64f6f825576900000000000015b7`); `node-14/thread-0/socket.wait-first-byte` (110.131 ms, trace `99ad64f6f825576900000000000015b6`); `gw-w/thread-42/gateway.admitted-work` (195.608 ms, trace `99ad64f6f82557690000000000000221`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-log-256-b-1-baseline/.
Compressed raw traces: 11100180 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

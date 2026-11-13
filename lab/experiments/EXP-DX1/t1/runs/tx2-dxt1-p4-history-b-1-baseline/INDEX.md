# tx2-dxt1-p4-history-b-1-baseline

Source: bfd3f3bbf719b0cb51b4605cdc8cdf8015be51d3. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (309.182 ms, trace `e54b9499dc41e198000000000000047c`); `node-14/thread-0/socket.wait-first-byte` (139.334 ms, trace `e54b9499dc41e1980000000000001d16`); `node-14/thread-0/socket.wait-first-byte` (245.173 ms, trace `e54b9499dc41e1980000000000001d1c`); `node-14/thread-0/socket.wait-first-byte` (239.275 ms, trace `e54b9499dc41e1980000000000001d1b`); `node-14/thread-0/driver.queue.subject` (162.725 ms, trace `e54b9499dc41e1980000000000001b7c`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-history-b-1-baseline/.
Compressed raw traces: 15780584 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

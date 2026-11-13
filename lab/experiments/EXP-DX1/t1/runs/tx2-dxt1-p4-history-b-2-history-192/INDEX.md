# tx2-dxt1-p4-history-b-2-history-192

Source: bfd3f3bbf719b0cb51b4605cdc8cdf8015be51d3. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (119.288 ms, trace `a51f0003b3741b5b00000000000017b0`); `node-14/thread-0/driver.queue.subject` (184.478 ms, trace `a51f0003b3741b5b00000000000014f8`); `node-14/thread-0/driver.queue.subject` (164.611 ms, trace `a51f0003b3741b5b00000000000017bb`); `node-14/thread-0/socket.wait-first-byte` (184.181 ms, trace `a51f0003b3741b5b00000000000017b5`); `node-14/thread-0/socket.wait-first-byte` (185.537 ms, trace `a51f0003b3741b5b00000000000017b6`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-history-b-2-history-192/.
Compressed raw traces: 11370352 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

# tx2-dxt1-p4-worker-pair-a-ladder

Source: 7e08cba64bbec1d542d2639ff32eb72b38443892. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-82/peer.transact-await (includes order/network/storage)` (188.832 ms, trace `8bdbca3c37f02d1b0000000000002c71`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (263.186 ms, trace `8bdbca3c37f02d1b000000000000225f`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (438.034 ms, trace `8bdbca3c37f02d1b0000000000002957`); `node-14/thread-0/driver.queue.subject` (300.690 ms, trace `8bdbca3c37f02d1b0000000000002c6f`); `node-14/thread-0/driver.queue.subject` (326.072 ms, trace `8bdbca3c37f02d1b0000000000002c76`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-worker-pair-a-ladder/.
Compressed raw traces: 38967340 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

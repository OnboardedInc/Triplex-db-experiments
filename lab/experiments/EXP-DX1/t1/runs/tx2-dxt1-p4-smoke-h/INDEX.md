# tx2-dxt1-p4-smoke-h

Source: 4d7774cef1c9ec68c2ad94c7fd575fde888d5999. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (650.610 ms, trace `72eca93608e3b9f70000000000000096`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (254.426 ms, trace `72eca93608e3b9f700000000000000c1`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (245.685 ms, trace `72eca93608e3b9f70000000000000114`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (183.097 ms, trace `72eca93608e3b9f700000000000000c7`); `node-14/thread-0/client.commit-send-queue` (125.100 ms, trace `72eca93608e3b9f7000000000000010d`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-smoke-h/.
Compressed raw traces: 833198 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

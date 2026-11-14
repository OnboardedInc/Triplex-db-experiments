# tx2-dxt1-p6-candidate-smoke-a

Source: b6aa04e7c7da002c8f6a9cf732e5efe2956e8c0a. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-1271/peer.transact-await (includes order/network/storage)` (25.067 ms, trace `122d758ad88ea833000000000000004c`); `gw-w/thread-1343/peer.transact-await (includes order/network/storage)` (76.177 ms, trace `122d758ad88ea833000000000000008f`); `node-194/thread-0/socket.wait-first-byte` (62.683 ms, trace `122d758ad88ea833000000000000020f`); `gw-w/thread-1319/peer.transact-await (includes order/network/storage)` (54.650 ms, trace `122d758ad88ea83300000000000001d1`); `gw-w/thread-1320/peer.transact-await (includes order/network/storage)` (35.012 ms, trace `122d758ad88ea8330000000000000601`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p6-candidate-smoke-a/.
Compressed raw traces: 249431268 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

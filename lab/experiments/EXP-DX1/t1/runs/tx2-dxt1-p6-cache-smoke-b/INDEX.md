# tx2-dxt1-p6-cache-smoke-b

Source: 9ac79685c6286ce7a20f3d06be5556d314817f42. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (93.547 ms, trace `843962c5e22ccb770000000000000056`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (114.062 ms, trace `843962c5e22ccb77000000000000005b`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (75.141 ms, trace `843962c5e22ccb770000000000000052`); `node-14/thread-0/driver.queue.subject` (37.279 ms, trace `843962c5e22ccb770000000000000764`); `node-14/thread-0/driver.queue.subject` (51.978 ms, trace `843962c5e22ccb770000000000000763`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p6-cache-smoke-b/.
Compressed raw traces: 16944141 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

# tx2-dxt1-p2-smoke-j

Source: 4ad48894a9a6a214f5e2866fec5fb8ac31d2d831. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (196.370 ms, trace `5d330d6a85d3ff400000000000000116`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (203.198 ms, trace `5d330d6a85d3ff4000000000000000b5`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (119.995 ms, trace `5d330d6a85d3ff400000000000000117`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (110.471 ms, trace `5d330d6a85d3ff40000000000000013f`); `gw-w/thread-65/peer.transact-await (includes order/network/storage)` (101.432 ms, trace `5d330d6a85d3ff40000000000000013e`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-smoke-j/.
Compressed raw traces: 767355 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

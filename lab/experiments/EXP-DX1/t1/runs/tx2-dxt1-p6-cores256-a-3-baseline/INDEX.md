# tx2-dxt1-p6-cores256-a-3-baseline

Source: 7629065bb0a0221b3ec27af2f5a6f030bd33487f. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (57.896 ms, trace `1cd203a6c1f2e3d7000000000000014d`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (77.115 ms, trace `1cd203a6c1f2e3d70000000000000151`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (60.720 ms, trace `1cd203a6c1f2e3d70000000000000100`); `node-14/thread-0/socket.wait-first-byte` (40.656 ms, trace `1cd203a6c1f2e3d70000000000001b76`); `tx/thread-81/transactor.triplex-function` (55.579 ms, trace `1cd203a6c1f2e3d70000000000000125`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p6-cores256-a-3-baseline/.
Compressed raw traces: 26067188 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

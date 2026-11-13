# tx2-dxt1-p2-smoke-c

Source: d7c89645926a6a867c856f24dca2d4caba04c075. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (279.413 ms, trace `e75182ffd70cad920000000000000116`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (217.586 ms, trace `e75182ffd70cad920000000000000117`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (224.569 ms, trace `e75182ffd70cad9200000000000000b4`); `node-14/thread-0/client.persist-and-resolve` (187.679 ms, trace `e75182ffd70cad920000000000000147`); `node-14/thread-0/client.persist-and-resolve` (178.554 ms, trace `e75182ffd70cad920000000000000146`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-smoke-c/.
Compressed raw traces: 1964825 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

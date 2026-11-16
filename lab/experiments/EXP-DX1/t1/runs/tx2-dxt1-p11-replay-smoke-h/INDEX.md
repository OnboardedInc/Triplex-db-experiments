# tx2-dxt1-p11-replay-smoke-h

Source: 4aabdb43f46b87f0d99e7a0508bae3d84240685c. Trace collection complete: false. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (93.590 ms, trace `a8365a9c40477c4f000000000000006d`); `node-14/thread-0/driver.queue.subject` (85.782 ms, trace `a8365a9c40477c4f00000000000001c2`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (63.001 ms, trace `a8365a9c40477c4f00000000000000ae`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (67.636 ms, trace `a8365a9c40477c4f00000000000000ee`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (64.464 ms, trace `a8365a9c40477c4f0000000000000134`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p11-replay-smoke-h/.
Compressed raw traces: 22003326 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Later evidence maintenance: some large files outside `trace/raw` are now losslessly stored as `.zst`. Restore them before checking their original file paths; [compression index](../../COMPRESSION-11.md) records original and compressed hashes. The original run status and raw-trace manifest are unchanged.

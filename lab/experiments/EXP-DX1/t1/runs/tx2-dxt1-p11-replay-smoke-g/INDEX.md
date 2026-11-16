# tx2-dxt1-p11-replay-smoke-g

Source: d62b4e952e5d2b0c5570225ff6e612eabee2f38b. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (89.254 ms, trace `0d8786f241672eba000000000000006e`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (83.220 ms, trace `0d8786f241672eba0000000000000136`); `node-14/thread-0/driver.queue.subject` (83.685 ms, trace `0d8786f241672eba00000000000001c7`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (76.597 ms, trace `0d8786f241672eba00000000000000b2`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (79.637 ms, trace `0d8786f241672eba00000000000000f0`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p11-replay-smoke-g/.
Compressed raw traces: 20931978 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Later evidence maintenance: some large files outside `trace/raw` are now losslessly stored as `.zst`. Restore them before checking their original file paths; [compression index](../../COMPRESSION-11.md) records original and compressed hashes. The original run status and raw-trace manifest are unchanged.

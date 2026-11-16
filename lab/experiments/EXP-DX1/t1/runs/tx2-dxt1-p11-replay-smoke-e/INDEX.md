# tx2-dxt1-p11-replay-smoke-e

Source: d62b4e952e5d2b0c5570225ff6e612eabee2f38b. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (103.636 ms, trace `a1c2a16f4649cbe8000000000000006d`); `node-14/thread-0/driver.queue.subject` (85.967 ms, trace `a1c2a16f4649cbe800000000000001c4`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (84.057 ms, trace `a1c2a16f4649cbe800000000000000b1`); `node-14/thread-0/driver.queue.subject` (88.767 ms, trace `a1c2a16f4649cbe800000000000006ec`); `node-14/thread-0/driver.queue.subject` (85.885 ms, trace `a1c2a16f4649cbe800000000000001c6`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p11-replay-smoke-e/.
Compressed raw traces: 20697613 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Later evidence maintenance: some large files outside `trace/raw` are now losslessly stored as `.zst`. Restore them before checking their original file paths; [compression index](../../COMPRESSION-11.md) records original and compressed hashes. The original run status and raw-trace manifest are unchanged.

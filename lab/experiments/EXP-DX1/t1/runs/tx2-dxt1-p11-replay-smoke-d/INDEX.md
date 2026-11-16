# tx2-dxt1-p11-replay-smoke-d

Source: d62b4e952e5d2b0c5570225ff6e612eabee2f38b. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (82.284 ms, trace `6aba8157a721bdb4000000000000006d`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (126.005 ms, trace `6aba8157a721bdb40000000000001a4e`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (71.363 ms, trace `6aba8157a721bdb400000000000000ad`); `node-14/thread-0/driver.queue.subject` (81.575 ms, trace `6aba8157a721bdb400000000000002ed`); `node-14/thread-0/driver.queue.subject` (73.688 ms, trace `6aba8157a721bdb400000000000001c5`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p11-replay-smoke-d/.
Compressed raw traces: 20636049 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Later evidence maintenance: some large files outside `trace/raw` are now losslessly stored as `.zst`. Restore them before checking their original file paths; [compression index](../../COMPRESSION-11.md) records original and compressed hashes. The original run status and raw-trace manifest are unchanged.

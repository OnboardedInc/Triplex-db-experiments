# tx2-dxt1-p11-replay-smoke-f

Source: d62b4e952e5d2b0c5570225ff6e612eabee2f38b. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (146.497 ms, trace `0eb430293e9d132d0000000000000659`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (96.618 ms, trace `0eb430293e9d132d000000000000006d`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (96.298 ms, trace `0eb430293e9d132d0000000000000134`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (132.870 ms, trace `0eb430293e9d132d000000000000065b`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (87.677 ms, trace `0eb430293e9d132d00000000000000b2`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p11-replay-smoke-f/.
Compressed raw traces: 20808227 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Later evidence maintenance: some large files outside `trace/raw` are now losslessly stored as `.zst`. Restore them before checking their original file paths; [compression index](../../COMPRESSION-11.md) records original and compressed hashes. The original run status and raw-trace manifest are unchanged.

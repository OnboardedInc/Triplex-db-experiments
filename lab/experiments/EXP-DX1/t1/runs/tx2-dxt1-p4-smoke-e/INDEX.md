# tx2-dxt1-p4-smoke-e

Source: 97d366795bf7351ff0b30ac78c3f9e55a23a1781. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (161.539 ms, trace `fd1ce898f9d8088800000000000000b4`); `gw-w/thread-69/peer.transact-await (includes order/network/storage)` (118.360 ms, trace `fd1ce898f9d808880000000000000149`); `gw-w/thread-67/peer.transact-await (includes order/network/storage)` (113.060 ms, trace `fd1ce898f9d808880000000000000148`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (93.710 ms, trace `fd1ce898f9d808880000000000000147`); `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (72.555 ms, trace `fd1ce898f9d808880000000000000146`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-smoke-e/.
Compressed raw traces: 7031027 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

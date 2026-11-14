# tx2-dxt1-p6-profile-smoke-a

Source: cc62564266eec40d6d486510e3399a08e0a76ed8. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-13/thread-0/driver.queue.subject` (97.215 ms, trace `208037e2d975faa000000000000008de`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (110.438 ms, trace `208037e2d975faa0000000000000005c`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (103.784 ms, trace `208037e2d975faa0000000000000005b`); `node-13/thread-0/driver.queue.subject` (80.095 ms, trace `208037e2d975faa000000000000008cb`); `node-13/thread-0/driver.queue.subject` (116.898 ms, trace `208037e2d975faa000000000000008d3`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p6-profile-smoke-a/.
Compressed raw traces: 32715172 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

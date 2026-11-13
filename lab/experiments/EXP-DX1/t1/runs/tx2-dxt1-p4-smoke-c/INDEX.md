# tx2-dxt1-p4-smoke-c

Source: a516a31eb0753ff89c4a613509ab2823c23b0b57. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (154.555 ms, trace `eb902191bc0966c000000000000000be`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (175.944 ms, trace `eb902191bc0966c000000000000000b5`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (151.379 ms, trace `eb902191bc0966c000000000000000c4`); `gw-w/thread-54/gateway.admission-wait` (62.662 ms, trace `eb902191bc0966c000000000000000d0`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (60.158 ms, trace `eb902191bc0966c000000000000000d2`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-smoke-c/.
Compressed raw traces: 7267970 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

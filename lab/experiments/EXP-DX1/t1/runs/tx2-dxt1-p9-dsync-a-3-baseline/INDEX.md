# tx2-dxt1-p9-dsync-a-3-baseline

Source: 80176ae4d03973999ef3fb0631e7013b6737e8ae. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (312.675 ms, trace `954e12391002e9650000000000001f0e`); `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (291.270 ms, trace `954e12391002e9650000000000001e8f`); `node-14/thread-0/driver.queue.subject` (142.276 ms, trace `954e12391002e9650000000000000377`); `node-14/thread-0/driver.queue.subject` (97.691 ms, trace `954e12391002e9650000000000000376`); `gw-w/thread-72/peer.transact-await (includes order/network/storage)` (62.324 ms, trace `954e12391002e9650000000000000370`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p9-dsync-a-3-baseline/.
Compressed raw traces: 41931159 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle and split-observation inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

# tx2-dxt1-p6-rev256-a-3-baseline

Source: b9b9c9f64441014c5fa84dc0bc6164736ca858fc. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `tx/thread-86/transactor.triplex-function` (63.828 ms, trace `276622f4f77c086d0000000000000150`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (39.906 ms, trace `276622f4f77c086d0000000000001188`); `node-14/thread-0/driver.queue.subject` (56.031 ms, trace `276622f4f77c086d000000000000118e`); `node-14/thread-0/driver.queue.subject` (88.279 ms, trace `276622f4f77c086d00000000000011f0`); `node-14/thread-0/driver.queue.subject` (62.017 ms, trace `276622f4f77c086d000000000000119f`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p6-rev256-a-3-baseline/.
Compressed raw traces: 26115744 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

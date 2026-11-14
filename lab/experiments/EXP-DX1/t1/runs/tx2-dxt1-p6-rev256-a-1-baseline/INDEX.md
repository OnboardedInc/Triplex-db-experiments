# tx2-dxt1-p6-rev256-a-1-baseline

Source: b9b9c9f64441014c5fa84dc0bc6164736ca858fc. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (58.419 ms, trace `587ca3309e51242300000000000018d4`); `node-14/thread-0/driver.queue.scheduler-late` (89.288 ms, trace `587ca3309e5124230000000000000c91`); `node-14/thread-0/driver.queue.scheduler-late` (97.408 ms, trace `587ca3309e5124230000000000000c90`); `node-14/thread-0/driver.queue.subject` (117.906 ms, trace `587ca3309e51242300000000000011dd`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (31.873 ms, trace `587ca3309e5124230000000000000102`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p6-rev256-a-1-baseline/.
Compressed raw traces: 25750568 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

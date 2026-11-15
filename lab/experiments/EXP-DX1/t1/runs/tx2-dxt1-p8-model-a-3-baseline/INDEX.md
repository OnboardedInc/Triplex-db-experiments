# tx2-dxt1-p8-model-a-3-baseline

Source: 15ed651621cd68e09be33a0dc42eb5b2329fa74f. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (113.509 ms, trace `5ebc0be275586ce70000000000001e76`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (84.299 ms, trace `5ebc0be275586ce7000000000000014c`); `node-14/thread-0/socket.wait-first-byte` (91.950 ms, trace `5ebc0be275586ce70000000000001227`); `node-14/thread-0/driver.queue.subject` (73.738 ms, trace `5ebc0be275586ce700000000000011ce`); `node-14/thread-0/driver.queue.scheduler-late` (65.537 ms, trace `5ebc0be275586ce7000000000000122e`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p8-model-a-3-baseline/.
Compressed raw traces: 18655641 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle and split-observation inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

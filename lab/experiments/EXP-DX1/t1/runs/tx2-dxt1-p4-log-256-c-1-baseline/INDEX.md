# tx2-dxt1-p4-log-256-c-1-baseline

Source: 804d28ce1dd59e769bf7341f864b66ae07073c6b. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (258.978 ms, trace `62aa6120a0b2ef570000000000000be4`); `gw-w/thread-48/gateway.admitted-work` (283.373 ms, trace `62aa6120a0b2ef570000000000000225`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (213.670 ms, trace `62aa6120a0b2ef570000000000000be2`); `gw-w/thread-69/peer.transact-await (includes order/network/storage)` (212.187 ms, trace `62aa6120a0b2ef570000000000000be3`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (175.771 ms, trace `62aa6120a0b2ef570000000000000be1`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-log-256-c-1-baseline/.
Compressed raw traces: 10961769 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

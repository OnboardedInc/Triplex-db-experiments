# tx2-dxt1-p9-dsync-a-1-baseline

Source: 80176ae4d03973999ef3fb0631e7013b6737e8ae. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (82.120 ms, trace `373b423ea439973c00000000000002e6`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (89.806 ms, trace `373b423ea439973c0000000000001f6c`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (63.581 ms, trace `373b423ea439973c0000000000000150`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (78.372 ms, trace `373b423ea439973c0000000000000152`); `node-14/thread-0/socket.wait-first-byte` (27.290 ms, trace `373b423ea439973c0000000000000201`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p9-dsync-a-1-baseline/.
Compressed raw traces: 42711631 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle and split-observation inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

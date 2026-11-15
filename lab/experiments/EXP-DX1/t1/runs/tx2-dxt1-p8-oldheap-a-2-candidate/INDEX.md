# tx2-dxt1-p8-oldheap-a-2-candidate

Source: 1a1b9388f59ffa65d521a411e8bd0807edb41d74. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-65/peer.transact-await (includes order/network/storage)` (267.309 ms, trace `d7011a107fe77f2f0000000000001f30`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (198.921 ms, trace `d7011a107fe77f2f0000000000001f31`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (204.316 ms, trace `d7011a107fe77f2f0000000000001eae`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (92.927 ms, trace `d7011a107fe77f2f0000000000000e6a`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (90.096 ms, trace `d7011a107fe77f2f000000000000014f`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p8-oldheap-a-2-candidate/.
Compressed raw traces: 18729762 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle and split-observation inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

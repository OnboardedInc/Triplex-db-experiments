# tx2-dxt1-p5-clock-a-1-baseline

Source: d3375228c4ee974a6dbdfb1dfbea3652a11a07b9. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (85.591 ms, trace `d84bdc773ab5a4f0000000000000086b`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (146.216 ms, trace `d84bdc773ab5a4f000000000000018ad`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (144.365 ms, trace `d84bdc773ab5a4f000000000000018ac`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (175.865 ms, trace `d84bdc773ab5a4f000000000000001cf`); `node-14/thread-0/socket.wait-first-byte` (84.613 ms, trace `d84bdc773ab5a4f0000000000000086c`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p5-clock-a-1-baseline/.
Compressed raw traces: 7840072 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

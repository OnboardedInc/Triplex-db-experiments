# tx2-dxt1-smoke-f

Source: 6b1b223513fafbb819b1a1b8835197e2b1ad946f. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-52/gateway.admission-wait` (96.932 ms, trace `7c1d76f3c3e6d13f00000000000000c0`); `node-14/thread-0/client.persist-and-resolve` (253.692 ms, trace `7c1d76f3c3e6d13f000000000000014e`); `node-14/thread-0/client.persist-and-resolve` (250.327 ms, trace `7c1d76f3c3e6d13f000000000000014d`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (201.644 ms, trace `7c1d76f3c3e6d13f000000000000014f`); `node-14/thread-0/client.persist-and-resolve` (241.234 ms, trace `7c1d76f3c3e6d13f000000000000014c`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-smoke-f/.
Compressed raw traces: 2604217 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

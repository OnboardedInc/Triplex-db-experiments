# tx2-dxt1-p4-core-zero-a-1-baseline

Source: 04dd61f7ae9431b4ea3053f191c001a944c8a7d8. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-13/thread-5/socket.wait-first-byte` (62.550 ms, trace `f7a146af1fdfe61700000000000003e7`); `gw-w/thread-45/gateway.request-parse` (65.438 ms, trace `f7a146af1fdfe61700000000000003f0`); `gw-w/thread-45/gateway.admitted-work` (178.238 ms, trace `f7a146af1fdfe61700000000000000f5`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (52.484 ms, trace `f7a146af1fdfe61700000000000003f1`); `gw-w/thread-47/gateway.admitted-work` (63.765 ms, trace `f7a146af1fdfe61700000000000003e6`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-core-zero-a-1-baseline/.
Compressed raw traces: 6704106 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

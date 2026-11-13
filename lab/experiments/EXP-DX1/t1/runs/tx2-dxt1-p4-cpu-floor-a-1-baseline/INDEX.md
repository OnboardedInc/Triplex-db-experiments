# tx2-dxt1-p4-cpu-floor-a-1-baseline

Source: 04f9aa93ffa8297049405cedb99839753b8aeb3f. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (135.786 ms, trace `ac2e7c0c04516ba3000000000000186a`); `node-14/thread-0/driver.queue.scheduler-late` (98.830 ms, trace `ac2e7c0c04516ba3000000000000186e`); `node-14/thread-0/driver.queue.scheduler-late` (101.286 ms, trace `ac2e7c0c04516ba3000000000000186c`); `node-14/thread-0/socket.wait-first-byte` (145.706 ms, trace `ac2e7c0c04516ba3000000000000186b`); `node-14/thread-0/driver.queue.scheduler-late` (67.732 ms, trace `ac2e7c0c04516ba30000000000001f72`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-cpu-floor-a-1-baseline/.
Compressed raw traces: 38630551 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

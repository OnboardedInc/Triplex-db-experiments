# tx2-dxt1-p4-cpu-floor-a-2-engine-isolated

Source: 04f9aa93ffa8297049405cedb99839753b8aeb3f. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (186.559 ms, trace `349ae9bbcae1ca2d0000000000001a52`); `node-14/thread-0/socket.wait-first-byte` (103.391 ms, trace `349ae9bbcae1ca2d000000000000190b`); `node-14/thread-0/driver.queue.scheduler-late` (127.297 ms, trace `349ae9bbcae1ca2d00000000000014be`); `node-14/thread-0/socket.wait-first-byte` (74.212 ms, trace `349ae9bbcae1ca2d00000000000014c7`); `node-14/thread-0/driver.queue.scheduler-late` (90.282 ms, trace `349ae9bbcae1ca2d0000000000001918`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-cpu-floor-a-2-engine-isolated/.
Compressed raw traces: 37964337 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

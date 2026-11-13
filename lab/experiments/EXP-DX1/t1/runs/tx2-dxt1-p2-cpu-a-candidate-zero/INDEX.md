# tx2-dxt1-p2-cpu-a-candidate-zero

Source: 04298a56c00b5aa953b14f65e3a34966e72210e3. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (432.205 ms, trace `0c9bf4cd955126fb0000000000003e09`); `node-14/thread-0/socket.wait-first-byte` (363.091 ms, trace `0c9bf4cd955126fb0000000000003ded`); `node-14/thread-0/driver.queue.subject` (364.628 ms, trace `0c9bf4cd955126fb0000000000003de5`); `node-14/thread-0/driver.queue.subject` (423.805 ms, trace `0c9bf4cd955126fb0000000000004033`); `node-14/thread-0/driver.queue.subject` (588.060 ms, trace `0c9bf4cd955126fb000000000000404a`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-cpu-a-candidate-zero/.
Compressed raw traces: 18325632 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

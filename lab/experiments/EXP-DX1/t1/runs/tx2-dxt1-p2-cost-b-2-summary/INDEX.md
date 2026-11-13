# tx2-dxt1-p2-cost-b-2-summary

Source: 8f8e995899327e659c1973b85a0fd51b2de1850d. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (84.507 ms, trace `aeeb8a184539e80c0000000000001873`); `node-14/thread-0/driver.queue.subject` (122.319 ms, trace `aeeb8a184539e80c0000000000001a9d`); `node-14/thread-0/driver.queue.scheduler-late` (76.870 ms, trace `aeeb8a184539e80c0000000000001b3f`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (82.067 ms, trace `aeeb8a184539e80c0000000000001a99`); `node-14/thread-0/client.persist-and-resolve` (83.477 ms, trace `aeeb8a184539e80c0000000000001875`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p2-cost-b-2-summary/.
Compressed raw traces: 6791970 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

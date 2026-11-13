# tx2-dxt1-p4-log-zero-a-2-candidate

Source: ef7473361c138176ead9c0222b2ccc53e33dde11. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (59.873 ms, trace `289771b70f08f9670000000000000f3d`); `node-14/thread-0/driver.queue.subject` (119.291 ms, trace `289771b70f08f9670000000000000f43`); `node-14/thread-0/driver.queue.subject` (105.481 ms, trace `289771b70f08f9670000000000000f41`); `node-14/thread-0/socket.queue-and-write` (45.212 ms, trace `289771b70f08f9670000000000000356`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (104.673 ms, trace `289771b70f08f9670000000000000108`). These are observed spans, not proof of the closed-source transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p4-log-zero-a-2-candidate/.
Compressed raw traces: 6666444 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

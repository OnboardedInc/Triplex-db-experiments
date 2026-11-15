# tx2-dxt1-p8-shared-a-3-baseline

Source: 37997257638b4703c176245ddb0a2a1d795258aa. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread--1/jdk.GCPhasePause` (44.215 ms, trace `068b3683eb06455500000000000001fe`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (55.673 ms, trace `068b3683eb0645550000000000000150`); `node-14/thread-0/driver.queue.subject` (84.501 ms, trace `068b3683eb0645550000000000000764`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (79.896 ms, trace `068b3683eb064555000000000000200a`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (84.507 ms, trace `068b3683eb0645550000000000000762`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p8-shared-a-3-baseline/.
Compressed raw traces: 43908239 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle and split-observation inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

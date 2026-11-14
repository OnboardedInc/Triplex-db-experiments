# tx2-dxt1-p6-cores256-a-2-candidate

Source: 7629065bb0a0221b3ec27af2f5a6f030bd33487f. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-49/commit.prepare-and-validate` (37.907 ms, trace `5878fe523cdd416e00000000000018a8`); `node-14/thread-0/socket.wait-first-byte` (48.821 ms, trace `5878fe523cdd416e0000000000001a3d`); `gw-w/thread-42/gateway.admitted-work` (19.711 ms, trace `5878fe523cdd416e0000000000000102`); `node-14/thread-0/client.validation-and-staging` (31.794 ms, trace `5878fe523cdd416e0000000000001a26`); `node-14/thread-0/client.validation-and-staging` (45.899 ms, trace `5878fe523cdd416e0000000000001a28`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p6-cores256-a-2-candidate/.
Compressed raw traces: 26655636 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.
Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

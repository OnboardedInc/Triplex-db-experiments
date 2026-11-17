Busy-host diagnostic; tracing `full`; no performance verdict. Final population controls and host swap/CPU context are in [READING-14.md](../../READING-14.md).

# tx2-dxt1-p14-init-smoke

Source: f30c173303d1ceafccff49331cc7fbba6757cfa3. Trace collection complete: true. Derived render recovery: false.

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (282.068 ms, trace `739af53730fbe9e00000000000001106`); `node-14/thread-0/driver.queue.subject` (197.151 ms, trace `739af53730fbe9e00000000000001103`); `node-14/thread-0/driver.queue.subject` (258.291 ms, trace `739af53730fbe9e00000000000001105`); `node-14/thread-0/driver.queue.subject` (257.740 ms, trace `739af53730fbe9e0000000000000087c`); `node-14/thread-0/driver.queue.subject` (159.891 ms, trace `739af53730fbe9e0000000000000087d`). These are observed spans, not proof of the transactor's internal cause.

Canonical files: $EVIDENCE_ROOT/DX-T1/tx2-dxt1-p14-init-smoke/.
Compressed raw traces: 36070198 bytes, under trace/raw; hashes in trace/SHA256SUMS.
Large viewers remain in the durable store ; only bounded reports, indices and SHA256SUMS are committed.
Auxiliary oracle and split-observation inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.

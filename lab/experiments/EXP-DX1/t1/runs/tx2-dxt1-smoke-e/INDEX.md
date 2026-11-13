# tx2-dxt1-smoke-e

Source `6b20dbda`; 1,000 subjects, exact local reads, oracle PASS, 1,915,330 reads with zero differences.
89/89 commit traces meet the named-span coverage target; fresh gateway/transactor JFR bytes, counts and hashes verified.
Compressed raw traces: 2,578,761 bytes. This smoke is not the full 10,000-subject T4 measurement.
Offline viewer filters, request-first rows and hover were checked in Chrome with zero errors/network requests.

Canonical artifacts: `~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-smoke-e/`.
Large viewers and screenshot stay in that durable directory; verify them with SHA256SUMS.
The viewer was regenerated with the current report builder; trace-summary.json records that builder's content hash.

Viewer storage: trace.html embeds its original bytes as checked gzip and opens offline; large Chrome JSON is losslessly archived as trace.chrome.json.gz. The canonical VIEWER-ARCHIVE.json retains original hashes; trace/raw is unchanged.

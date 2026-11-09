# [CX-VP2B] Why: independently recalculate final ACK quantiles from original monotonic clock pairs. Rejected: reprinting the builder's derived table as verification.
import pathlib, json, hashlib, gzip, math
root = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3')
sha = lambda b: hashlib.sha256(b).hexdigest()
summary = json.loads(pathlib.Path('lab/experiments/EXP-P2B/ROUND3-RESULTS.json').read_text())
assert summary['diagnosticOnly'] is True
name = 'matrix-step5-fullsync-corrected-40.json'
matrix_bytes = (root/name).read_bytes()
assert sha(matrix_bytes) == summary['inputs'][name]
selected = [r for r in json.loads(matrix_bytes) if r['readers'] == 256]
assert len(selected) == 3
results = []
for row in selected:
    directory = pathlib.Path(row['out'])
    assert directory.parent == root and directory.name == row['attempt']
    hashes = dict(line.split('  ',1)[::-1] for line in (directory/'SHA256SUMS').read_text().splitlines())
    report_bytes = (directory/'report.json').read_bytes()
    assert sha(report_bytes) == hashes['report.json']
    report = json.loads(report_bytes)
    assert report['attempt'] == row['attempt'] and report['committed'] == report['offered'] == 3000
    assert report['phase'] == 'step5-fullsync-corrected-40' and report['workerCount'] == 8
    assert not report['failures'] and report['sourceUnchanged'] and row['exit'] == 0
    archive = json.loads((directory/'ARCHIVE.json').read_text())
    entry = next(e for e in archive['files'] if e['file'] == 'raw.jsonl')
    compressed = (directory/entry['gzip']).read_bytes()
    assert sha(compressed) == entry['gzipSha256']
    raw = gzip.decompress(compressed)
    assert sha(raw) == entry['sourceSha256'] == hashes['raw.jsonl']
    commits = [json.loads(line) for line in raw.splitlines() if b'"type":"commit"' in line or b'"type": "commit"' in line]
    assert len(commits) == 3000 and sorted(c['event']['seq'] for c in commits) == list(range(3000))
    bands = []
    for band in range(3):
        values = sorted((int(c['ackNs'])-int(c['scheduledNs']))/1e6 for c in commits if c['event']['band'] == band)
        assert len(values) == 1000 and values[0] >= 0
        observed = dict(n=len(values), p50=values[math.ceil(len(values)*.5)-1], p99=values[math.ceil(len(values)*.99)-1])
        expected = report['perBandSummary'][band]['stages']['offerToAck']
        assert all(observed[k] == expected[k] for k in observed)
        bands.append(dict(facts=[10,20,40][band], **observed))
    results.append(dict(attempt=row['attempt'], repeat=row['repeat'], reportSha256=sha(report_bytes), rawSha256=sha(raw), bands=bands))
assert sha((root/name).read_bytes()) == summary['inputs'][name]
print(json.dumps(dict(scope='Three final 256-reader diagnostic cells only; no latency rerun or full archive audit', matrixSha256=sha(matrix_bytes), results=results), indent=2))

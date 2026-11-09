# [CX-VP2B-R2] Why: independently verify historical raw pin samples against a hand-derived seed and candidate source bytes. Rejected: adopting the builder's completion flag as fresh execution evidence.
import pathlib,json,hashlib,subprocess
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round4')
summary=json.loads(pathlib.Path('lab/experiments/EXP-P2B/ROUND4-RESULTS.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
attempt=root/summary['longAttempt']
result_bytes=(attempt/'result.json').read_bytes()
assert sha(result_bytes)==summary['longResultSha256']
r=json.loads(result_bytes)
assert r['attempt']==attempt.name and r['diagnosticOnly'] and r['sourceStable'] and r['pinDurationMs']>=600000
expected=dict(id='seed',entity_id='subject',attribute=':pin',value_type='string',value_string='seed',value_number=None,value_boolean=None,value_datetime=None,value_json=None,recorded_at=1,recorded_position=2048,valid_from=0,valid_to=None,created_by=None,retracted_at=None,retracted_position=None,retract_tx_id=None,entity_type=None,schema_version=1,tx_id='seed')
assert r['pin']==2048 and r['expectedRows']==[expected]
expected_hash=sha(json.dumps([expected],separators=(',',':'),ensure_ascii=False).encode())
manifest={line.split('  ',1)[1]:line.split('  ',1)[0] for line in pathlib.Path('lab/experiments/EXP-P2B/SHA256SUMS-round4-01.txt').read_text().splitlines()}
raw=(attempt/'samples.jsonl').read_bytes()
assert sha(raw)==manifest[str(attempt/'samples.jsonl')]
rows=[json.loads(line) for line in raw.splitlines()]
assert len(rows)==r['commits']==r['reads']==2827
assert [row['seq'] for row in rows]==list(range(1,2828))
assert all(row['rowHash']==expected_hash and row['readExact'] and not row['inTransaction'] and 0<=row['wal']<=r['cap'] for row in rows)
assert all(a['position']<b['position'] and a['atMs']<b['atMs'] for a,b in zip(rows,rows[1:]))
assert rows[-1]['atMs']>=599000 and max(row['wal'] for row in rows)==r['peakWal']==2027072 and r['cap']==33554432
assert r['feedPositions']==r['commits']+1
inputs=json.loads((attempt/'inputs.json').read_text());snapshot=pathlib.Path(inputs['snapshot'])
source_differences=[]
for name,digest in inputs['hashes'].items():
 data=(snapshot/name).read_bytes();assert sha(data)==digest
 if name.startswith('packages/broker/src/'):
  candidate=subprocess.check_output(['git','show','e9f0014b:'+name])
  if candidate!=data:source_differences.append(dict(path=name,snapshotSha256=digest,candidateSha256=sha(candidate)))
stat=(attempt/'store/broker.db').stat();assert r['fullFsyncProof']['dev']==str(stat.st_dev) and r['fullFsyncProof']['ino']==str(stat.st_ino)
print(json.dumps(dict(scope='Historical builder ten-minute samples and frozen input bytes; not a new ten-minute run',attempt=attempt.name,resultSha256=sha(result_bytes),samplesSha256=sha(raw),samples=len(rows),firstAtMs=rows[0]['atMs'],lastAtMs=rows[-1]['atMs'],reportedDurationMs=r['pinDurationMs'],expectedSeedSha256=expected_hash,peakWal=r['peakWal'],cap=r['cap'],sourceDifferencesFromCandidate=source_differences,frozenInputFiles=len(inputs['hashes'])),indent=2))

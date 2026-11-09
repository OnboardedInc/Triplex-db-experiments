"""[EXP-P2B-R4] Why: publish actual completed source-bound results and hashes, not partial samples or earlier successful gates.
Rejected: treating elapsed time, an exit code or a byte-preservation manifest as semantic acceptance.
"""
import pathlib,json,hashlib,subprocess,os
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round4')
EXP=pathlib.Path('lab/experiments/EXP-P2B')
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
long=json.loads((ROOT/'long-pin-attempt1.log').read_text().strip().splitlines()[-1]);out=pathlib.Path(long['out']);assert out.parent==ROOT and out.name==long['attempt']
r=json.loads((out/'result.json').read_text());assert r['attempt']==out.name and r['sourceStable'] and r['pinDurationMs']>=600000
assert len(r['expectedRows'])==1 and r['expectedRows'][0]['id']=='seed' and r['expectedRows'][0]['value_string']=='seed' and r['expectedRows'][0]['recorded_position']==r['pin']
expected=hashlib.sha256(json.dumps(r['expectedRows'],separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
rows=[json.loads(x) for x in (out/'samples.jsonl').read_text().splitlines()];assert len(rows)==r['commits']==r['reads']>=600
assert [x['seq'] for x in rows]==list(range(1,len(rows)+1))
assert all(x['readExact'] and x['rowHash']==expected and not x['inTransaction'] and 0<=x['wal']<=r['cap'] for x in rows)
assert all(a['position']<b['position'] and a['atMs']<b['atMs'] for a,b in zip(rows,rows[1:])) and rows[-1]['atMs']>=599000
assert r['peakWal']==max(x['wal'] for x in rows) and r['feedPositions']==r['commits']+1
inputs=json.loads((out/'inputs.json').read_text());snapshot=pathlib.Path(inputs['snapshot'])
assert all(sha(snapshot/p)==digest for p,digest in inputs['hashes'].items())
stat=(out/'store/broker.db').stat();assert r['fullFsyncProof']['dev']==str(stat.st_dev) and r['fullFsyncProof']['ino']==str(stat.st_ino)
gate=json.loads((ROOT/'bound-gates-final.log').read_text().strip().splitlines()[-1]);g=pathlib.Path(gate['out']);assert g.parent==ROOT
assert gate['executionComplete'] and gate['unchanged'] and [s['counts'] for s in gate['results']]==[[24,48,81],[9]]
before=json.loads((g/'inputs-before.json').read_text());after=json.loads((g/'inputs-after.json').read_text());assert before==after and all(sha(p)==digest for p,digest in after.items())
for stage in gate['results']:assert stage['status']==0 and stage['valid'] and sha(g/(stage['name']+'.log'))==stage['logSha256']
obspath=pathlib.Path(gate['results'][1]['observations'][0]);obs=json.loads(obspath.read_text());assert obs['fixtureSha256']==sha('lab/verify/P2B/review.test.ts') and obs['attempt']==obspath.parent.name
summary=dict(diagnosticOnly=True,baseHead=gate['head'],longAttempt=r['attempt'],longResultSha256=sha(out/'result.json'),gate=str(g),gateResultSha256=sha(g/'result.json'),observations=str(obspath),observationsSha256=sha(obspath),**{k:r[k] for k in ['pin','pinDurationMs','commits','reads','readLimits','walRefusals','peakWal','cap','checkpointMaxMs','maxCommitGapMs','feedPositions']})
summary['regressions']={o['name']:o['data'] for o in obs['observations'] if o['name'] in ['wal-cap-enforced','wal-held-reader','duplicate-publication-gated']}
(EXP/'ROUND4-RESULTS.json').write_text(json.dumps(summary,indent=2)+'\n')
files=[];links={}
for folder,dirs,names in os.walk(ROOT,followlinks=False):
 for name in dirs+names:
  p=pathlib.Path(folder)/name
  if p.is_symlink():links[str(p.relative_to(ROOT))]=os.readlink(p)
 for name in names:
  p=pathlib.Path(folder)/name
  if p.is_file() and not p.is_symlink():files.append(p)
(EXP/'LINK-TARGETS-round4.json').write_text(json.dumps(links,indent=2)+'\n')
chunks=[];part=[];size=0
for p in sorted(files):
 line=f'{sha(p)}  {p}\n'
 if size+len(line.encode())>750000:chunks.append(part);part=[];size=0
 part.append(line);size+=len(line.encode())
if part:chunks.append(part)
for n,lines in enumerate(chunks,1):(EXP/f'SHA256SUMS-round4-{n:02}.txt').write_text(''.join(lines))
changed=set(subprocess.check_output(['git','diff','--name-only','ba10ebb9a119a89e9bdd532ccaa2439f268b1211'],text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines());sources=[]
for name in sorted(changed):
 if not (name.startswith('packages/') or name.endswith(('.ts','.mjs','.cjs','.py'))):continue
 old=subprocess.run(['git','show',f'ba10ebb9a119a89e9bdd532ccaa2439f268b1211:{name}'],capture_output=True)
 sources.append(dict(path=name,oldSha256=hashlib.sha256(old.stdout).hexdigest() if old.returncode==0 else None,newSha256=sha(name)))
(EXP/'SOURCE-CHANGES-round4.json').write_text(json.dumps(sources,indent=2)+'\n')
print(json.dumps(dict(files=len(files),bytes=sum(p.stat().st_size for p in files),manifestChunks=len(chunks),summary=summary)))

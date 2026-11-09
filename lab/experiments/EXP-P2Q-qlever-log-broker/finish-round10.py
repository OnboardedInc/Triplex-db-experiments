# [EXP-P2Q] Why: final reporting rechecks current source/result bytes and owned operational state after the gates.
# Rejected: treating a stale summary, exit code, or a PID alone as semantic acceptance or cleanup authority.
import hashlib,json,os,pathlib,subprocess,time,shutil
root=pathlib.Path.cwd();base=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2Q-R3/round10')
self_path=root/'lab/experiments/EXP-P2Q-qlever-log-broker/finish-round10.py'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
self_before=sha(self_path);summary=json.loads((base/'SUMMARY.json').read_text())
assert summary['selfSha256']==sha(root/'lab/experiments/EXP-P2Q-qlever-log-broker/summarize-round10.py')
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();assert head==summary['head']
case_hashes={}
for gate,attempt in summary['gateAttempts'].items():
 out=base/attempt;r=json.loads((out/(gate+'.json')).read_text())
 assert sha(out/(gate+'.json'))==summary['receiptHashes'][gate]
 assert r['accepted'] and r['exitCode']==0 and r['sourceStillMatches'] and r['heavySlotStillMatches'] and r['resultFresh'] and r['contentMatches']
 assert all(sha(root/name)==digest for name,digest in r['sourceHashes'].items())
 assert sha(out/(gate+'.log'))==r['logSha256']
 if 'vitestPassed' in r:
  result=out/(gate+'-vitest.json');d=json.loads(result.read_text());assert sha(result)==r['resultSha256']
  cases=[c for suite in d['testResults'] for c in suite['assertionResults']]
  assert d['success'] and d['numFailedTests']==0 and sum(c['status']=='passed' for c in cases)==r['expectedPassed']==r['vitestPassed'] and len(cases)==r['vitestTotal']
  assert r['startedAt']<=d['startTime']/1000<=r['finishedAt'] and r['startedAt']<=result.stat().st_mtime<=r['finishedAt']
 else:assert (out/(gate+'.log')).read_bytes()==b''
 for case in (out/gate).glob('*.json'):
  assert r['startedAt']<=case.stat().st_mtime<=r['finishedAt']
  case_hashes[str(case.relative_to(base))]=sha(case)
for comparison in summary['fullByteComparisons']:
 data=json.loads((base/comparison['path']).read_text());rows=data if isinstance(data,list) else [data]
 for row in rows:
  if 'before' in row and 'after' in row:assert row['before']==row['after']
  if 'afterMetadata' in row:assert row['before']==row['afterMetadata']==row['transactionAfterMetadata']==row['transaction']
ps=subprocess.check_output(['ps','-axo','pid=,command='],text=True);owned=[]
for line in ps.splitlines():
 parts=line.strip().split(None,1)
 if len(parts)!=2:continue
 pid,command=parts
 if command.startswith(('node ','/Users/','/opt/')) and ('CX-P2Q-R10-' in command or (str(root) in command and 'vitest' in command)):
  owned.append({'pid':int(pid),'command':command})
assert not owned,owned
locks=[];live=[]
for path in (root/'runs/broker').glob('CX-P2Q-R10-*/*/LOCK'):
 raw=path.read_bytes();pid=int(raw.strip())
 try:os.kill(pid,0);live.append(pid)
 except ProcessLookupError:pass
 locks.append({'path':str(path.relative_to(root)),'pid':pid,'sha256':hashlib.sha256(raw).hexdigest()})
assert not live,sorted(set(live))
assert sha(self_path)==self_before
record={'format':'p2q-round10-final-readback/1','createdAt':time.time(),'sourceHead':head,'summarySha256':sha(base/'SUMMARY.json'),'selfSha256':self_before,'sourcePreimagesCurrent':True,'ownedTestProcesses':owned,'lockFiles':len(locks),'recordedPids':len({r['pid'] for r in locks}),'liveRecordedPids':live,'hostFreeBytes':shutil.disk_usage(root).free,'caseHashes':case_hashes,'retention':'All state and first failures retained; no deletion, signal or engine lifecycle action in this readback.','independentAcceptance':'open'}
with (base/'FINAL.json').open('x') as stream:json.dump(record,stream,indent=2);stream.write('\n')
with (base/'lock-owner-readback.json').open('x') as stream:json.dump(locks,stream,indent=2);stream.write('\n')
print(json.dumps({k:v for k,v in record.items() if k!='caseHashes'},indent=2))

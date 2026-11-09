# [EXP-P2Q] Why: close evidence only after the final source/types and sealed runtime bindings are read back.
# Rejected: adopting the old source hashes after a type edit, or treating process exit alone as test content.
import hashlib,json,os,pathlib,shutil,subprocess,time
root=pathlib.Path.cwd();base=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2Q-R3/round9')
self_path=root/'lab/experiments/EXP-P2Q-qlever-log-broker/finish-round9.py'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
self_before=sha(self_path)
summary=json.loads((base/'SUMMARY.json').read_text());proof=json.loads((base/'runtime-equality.json').read_text())
assert proof['summarySha256']==sha(base/'SUMMARY.json') and proof['sourceHead']==summary['productSourceHead']
assert proof['createdAt']>=summary['createdAt']*1000
assert sha(root/'lab/experiments/EXP-P2Q-qlever-log-broker/runtime-equality-round9.mjs')==proof['selfSha256']
old=json.loads((base/'retry/new-offline.json').read_text())
for record in proof['records']:
 assert record['beforeSha256']==old['sourceHashes'][record['file']]
 assert record['afterSha256']==sha(root/record['file']) and record['identical']
receipts=[]
for gate,expected in [('final-construction',5),('qlever-typecheck',None),('core-typecheck',None)]:
 out=base/'type-final';r=json.loads((out/(gate+'.json')).read_text())
 assert r['accepted'] and r['exitCode']==0 and r['contentMatches'] and r['resultFresh'] and r['sourceStillMatches'] and r['heavySlotStillMatches']
 assert all(sha(root/name)==digest for name,digest in r['sourceHashes'].items())
 assert sha(out/(gate+'.log'))==r['logSha256']
 if expected:
  report=out/(gate+'-vitest.json');d=json.loads(report.read_text())
  assert sha(report)==r['resultSha256'] and d['success'] and d['numFailedTests']==0
  cases=[c for suite in d['testResults'] for c in suite['assertionResults']]
  assert len(cases)==expected and all(c['status']=='passed' for c in cases)
  assert r['startedAt']<=d['startTime']/1000<=r['finishedAt'] and r['startedAt']<=report.stat().st_mtime<=r['finishedAt']
 else:assert (out/(gate+'.log')).read_bytes()==b''
 receipts.append(r)
assert len({r['attemptId'] for r in receipts})==1 and len({r['head'] for r in receipts})==1
assert all(r['heavySlot']==receipts[0]['heavySlot'] for r in receipts)
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();assert receipts[0]['head']==head
ps=subprocess.check_output(['ps','-axo','pid=,command='],text=True)
owned=[]
for line in ps.splitlines():
 parts=line.strip().split(None,1)
 if len(parts)!=2:continue
 pid,command=parts
 if command.startswith(('node ','/Users/','/opt/')) and ('CX-P2Q-R9-' in command or (str(root) in command and 'vitest' in command)):
  owned.append({'pid':int(pid),'command':command})
assert not owned,owned
locks=[];live=[]
for path in (root/'runs/broker').glob('CX-P2Q-R9-*/*/LOCK'):
 raw=path.read_bytes();pid=int(raw.strip())
 try:os.kill(pid,0);live.append(pid)
 except ProcessLookupError:pass
 locks.append({'path':str(path.relative_to(root)),'pid':pid,'sha256':hashlib.sha256(raw).hexdigest()})
# PID-only records never authorize cleanup; no state is deleted, including first failures.
assert not live,sorted(set(live))
assert sha(self_path)==self_before
result={'format':'p2q-round9-final-source-readback/1','createdAt':time.time(),'sourceHead':head,
 'runtimeMatrixSourceHead':summary['productSourceHead'],'summarySha256':sha(base/'SUMMARY.json'),'runtimeEqualitySha256':sha(base/'runtime-equality.json'),
 'finalConstructionPassed':5,'finalTypechecks':2,'receiptHashes':{g:sha(base/'type-final'/(g+'.json')) for g in ['final-construction','qlever-typecheck','core-typecheck']},
 'finalSourcePreimagesMatch':True,'typeOnlyRuntimeIdentical':True,'matchingOwnedTestProcesses':owned,'lockFiles':len(locks),'distinctRecordedPids':len({r['pid'] for r in locks}),'liveRecordedPids':live,
 'selfSha256':self_before,'hostFreeBytes':shutil.disk_usage(root).free,'engineLifecycleActions':0,'exclusiveReservations':0,
 'retention':'All owned fixture state and first failures retained. No deletion or process signal in this final readback.','independentAcceptance':'open'}
with (base/'FINAL.json').open('x') as stream:json.dump(result,stream,indent=2);stream.write('\n')
with (base/'lock-owner-readback.json').open('x') as stream:json.dump(locks,stream,indent=2);stream.write('\n')
print(json.dumps(result,indent=2))

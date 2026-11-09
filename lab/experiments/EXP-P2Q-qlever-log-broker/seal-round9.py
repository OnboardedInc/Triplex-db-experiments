# [EXP-P2Q] Why: qualify only actual passing case coverage, retaining the original live timeout and interrupted attempt.
# Rejected: overwriting a failing receipt or counting six passes as a successful seven-case gate.
import hashlib, json, pathlib, time
root=pathlib.Path.cwd()
base=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2Q-R3/round9')
self_path=root/'lab/experiments/EXP-P2Q-qlever-log-broker/seal-round9.py'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
self_before=sha(self_path)
def read_receipt(attempt,gate,passed,total,failed=0):
 out=base/attempt;r=json.loads((out/(gate+'.json')).read_text())
 assert r['sourceStillMatches'] and r['heavySlotStillMatches'] and r['resultFresh']
 assert all(sha(root/name)==digest for name,digest in r['sourceHashes'].items())
 assert sha(out/(gate+'.log'))==r['logSha256']
 if passed is None:
  assert r['accepted'] and r['exitCode']==0 and (out/(gate+'.log')).read_bytes()==b''
  return r,[]
 report=out/(gate+'-vitest.json');assert sha(report)==r['resultSha256']
 d=json.loads(report.read_text());cases=[c for suite in d['testResults'] for c in suite['assertionResults']]
 assert len(cases)==total and sum(c['status']=='passed' for c in cases)==passed and sum(c['status']=='failed' for c in cases)==failed
 assert d['numPassedTests']==passed and d['numFailedTests']==failed
 assert r['startedAt']<=d['startTime']/1000<=r['finishedAt'] and r['startedAt']<=report.stat().st_mtime<=r['finishedAt']
 if failed:assert r['accepted'] is False and r['exitCode']==1 and d['success'] is False
 else:assert r['accepted'] and r['contentMatches'] and r['exitCode']==0 and d['success']
 return r,cases
specs=[('earlier-offline',802,816),('new-offline',17,23),('foundation',42,42),('package',224,250),('core-focused',28,28),('qlever-typecheck',None,None),('core-typecheck',None,None)]
receipts=[read_receipt('retry',*s)[0] for s in specs]
partial,partial_cases=read_receipt('retry','new-live',6,14,1)
focused,focused_cases=read_receipt('journal-retry','fresh-journal-live',1,4)
earlier,earlier_cases=read_receipt('live-retry','earlier-live',54,54)
failed=[c for c in partial_cases if c['status']=='failed']; passed_retry=[c for c in focused_cases if c['status']=='passed']
assert len(failed)==1 and failed[0]['fullName']==passed_retry[0]['fullName']
assert 'fresh journal at an old cut' in failed[0]['fullName']
assert 'unreachable' in '\n'.join(failed[0]['failureMessages'])
# Preserve per-attempt ownership, then prove shared source inputs equal across attempts.
assert len({r['attemptId'] for r in receipts+[partial]})==1
assert len({focused['attemptId'],earlier['attemptId'],partial['attemptId']})==3
assert all(r['heavySlot']==receipts[0]['heavySlot'] for r in receipts+[partial])
assert focused['heavySlot']!=earlier['heavySlot']
for r in receipts+[partial,focused,earlier]:
 for name,digest in receipts[0]['sourceHashes'].items():assert r['sourceHashes'].get(name)==digest
# Recheck the new guard's actual observations and original cut coverage.
new=base/'retry/new-offline'
runtime=json.loads((new/'round9-runtime-construction.json').read_text())
assert len(runtime)==8 and {(r['name'],r['kind']) for r in runtime}=={(s,k) for s in ['triples','adapter','executor','native'] for k in ['own','inherited']}
assert all(r['rejected'] and r['requested']>r['observed'] and r['reads'] for r in runtime)
for kind in ['baseline','direct','inherited','merged']:
 d=json.loads((new/f'round9-type-{kind}.json').read_text())
 assert ('round9Read' in d['names'])==(kind!='baseline') and ('round9Read:' in d['implementationSource'])==(kind!='baseline')
 for key in ['diagnostics','implementationDiagnostics']:
  assert (not d[key]) if kind=='baseline' else any('round9Read' in message for message in d[key])
coverage=json.loads((new/'round8-policy-coverage.json').read_text())
assert len(coverage)==48 and all(r['checkCalls']>0 and r['checkedRequired']==r['expectedRequired'] for r in coverage)
constructor=json.loads((new/'round9-construction-policy.json').read_text())
assert constructor['failure']['ok'] is False and constructor['failure']['error']['required']==6144 and constructor['failure']['error']['observed']==3071
assert constructor['failure']['error']['reason']=='basis-not-reached'
assert constructor['retired']['retract_tx_id']=='later'
assert len(constructor['masked'])==1 and all(constructor['masked'][0][key] is None for key in ['retracted_at','retracted_position','retract_tx_id'])
# Equality is recomputed from full captured strings, never from an emitted `equal` flag.
comparisons=[]
def compare(file):
 d=json.loads(file.read_text())
 rows=d if isinstance(d,list) else [d]
 for row in rows:
  if 'before' in row and 'after' in row:
   assert isinstance(row['before'],str) and row['before']==row['after'],file
   comparisons.append({'path':str(file.relative_to(base)),'route':row.get('route'),'bytes':len(row['before'].encode())})
 for row in rows:
  if isinstance(row,dict) and 'afterMetadata' in row:
   assert json.loads(row['before'])['transactions']
   for key in ['transaction','afterMetadata','transactionAfterMetadata']:
    assert row[key]==row['before'];comparisons.append({'path':str(file.relative_to(base)),'variant':key,'bytes':len(row['before'].encode())})
for file in new.glob('*immutable.json'):compare(file)
for file in (base/'retry/new-live').glob('*immutable.json'):
 if 'fresh-journal' not in file.name:compare(file)
compare(base/'journal-retry/fresh-journal-live/round8-fresh-journal-immutable.json')
# Every chosen case artifact must be fresh for its own producer gate.
for attempt,gate,r in [('retry','new-offline',receipts[1]),('retry','new-live',partial),('journal-retry','fresh-journal-live',focused)]:
 for file in (base/attempt/gate).glob('*.json'):assert r['startedAt']<=file.stat().st_mtime<=r['finishedAt']
summary={'format':'p2q-round9-final-readback/1','createdAt':time.time(),'productSourceHead':receipts[0]['head'],
 'offlinePassed':1113,'typechecks':2,'liveCaseCoverage':7,'earlierLiveEnabledPassed':54,'earlierLiveCases':22,'earlierOfflineControlsRerun':32,
 'partialLiveAttempt':{'accepted':False,'passed':6,'failed':1,'failedCase':failed[0]['fullName'],'receiptSha256':sha(base/'retry/new-live.json')},
 'focusedRetry':{'passed':1,'sameCase':passed_retry[0]['fullName'],'head':focused['head']},
 'runtimeRejectedAdditions':8,'typeVariants':['baseline','direct','inherited','merged'],'existingPolicyRoutes':48,
 'fullByteComparisons':comparisons,'sharedSourcePreimagesMatch':True,'selfSha256':self_before,
 'receipts':{str(p.relative_to(base)):sha(p) for p in [*(base/'retry'/(s[0]+'.json') for s in specs),base/'retry/new-live.json',base/'journal-retry/fresh-journal-live.json',base/'live-retry/earlier-live.json']},
 'scope':'Builder slice evidence only; independent review and performance acceptance remain open'}
assert sha(self_path)==self_before
with (base/'SUMMARY.json').open('x') as stream:json.dump(summary,stream,indent=2);stream.write('\n')
print(json.dumps({k:v for k,v in summary.items() if k!='fullByteComparisons'},indent=2))

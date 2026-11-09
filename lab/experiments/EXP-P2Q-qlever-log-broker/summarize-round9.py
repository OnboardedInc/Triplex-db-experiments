# [EXP-P2Q] Why: re-read this attempt's exact assertion results, bytes and bindings before recording its outcome.
# Rejected: counting exit-zero logs or trusting an earlier round's receipts.
import hashlib, json, os, pathlib, time
root=pathlib.Path.cwd()
out=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2Q-R3/round9')/os.environ.get('P2Q_ATTEMPT','final')
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
gates=['earlier-offline','new-offline','foundation','package','core-focused','qlever-typecheck','core-typecheck','new-live','earlier-live']
receipts=[]
for gate in gates:
 r=json.loads((out/(gate+'.json')).read_text())
 assert r['accepted'] and r['exitCode']==0 and r['contentMatches'] and r['resultFresh'] and r['sourceStillMatches'] and r['heavySlotStillMatches'],gate
 assert sha(out/(gate+'.log'))==r['logSha256']
 assert all(sha(root/name)==digest for name,digest in r['sourceHashes'].items()),gate
 if 'vitestPassed' in r:
  report=out/(gate+'-vitest.json');assert sha(report)==r['resultSha256']
  data=json.loads(report.read_text());cases=[c for suite in data['testResults'] for c in suite['assertionResults']]
  assert sum(c['status']=='passed' for c in cases)==r['expectedPassed']==r['vitestPassed']
  assert len(cases)==r['vitestTotal'] and data['numFailedTests']==0 and data['success']
  assert r['startedAt'] <= data['startTime']/1000 <= r['finishedAt']
 else: assert (out/(gate+'.log')).read_bytes()==b''
 receipts.append(r)
assert len({r['attemptId'] for r in receipts})==1
assert len({r['head'] for r in receipts})==1
assert all(r['heavySlot']==receipts[0]['heavySlot'] for r in receipts)
# New guards are checked from actual case content, not their test names alone.
runtime=json.loads((out/'new-offline/round9-runtime-construction.json').read_text())
assert len(runtime)==8 and {(r['name'],r['kind']) for r in runtime}=={(s,k) for s in ['triples','adapter','executor','native'] for k in ['own','inherited']}
assert all(r['rejected'] and r['requested']>r['observed'] and r['reads'] for r in runtime)
for kind in ['baseline','direct','inherited','merged']:
 data=json.loads((out/f'new-offline/round9-type-{kind}.json').read_text())
 assert ('round9Read' in data['names'])==(kind!='baseline')
 assert (not data['diagnostics']) if kind=='baseline' else any('round9Read' in d for d in data['diagnostics'])
 assert data['kind']==kind
# Every executed original route retains its cut and refuses via the shared sentinel.
coverage=json.loads((out/'new-offline/round8-policy-coverage.json').read_text())
assert len(coverage)==48
assert all(c['checkCalls']>0 and c['checkedRequired']==c['expectedRequired'] for c in coverage)
summary={'format':'p2q-round9-content-readback/1','createdAt':time.time(),'attemptId':receipts[0]['attemptId'],'head':receipts[0]['head'],
 'acceptedGates':gates,'offlinePassed':sum(r.get('vitestPassed',0) for r in receipts if not r['gate'].endswith('-live')),
 'livePassed':sum(r.get('vitestPassed',0) for r in receipts if r['gate'].endswith('-live')),'typechecks':2,
 'runtimeRejectedAdditions':8,'typeVariants':['baseline','direct','inherited','merged'],'existingPolicyRoutes':48,
 'receiptHashes':{g:sha(out/(g+'.json')) for g in gates},'scope':'focused correctness and guard evidence; independent acceptance remains open'}
(out/'SUMMARY.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))

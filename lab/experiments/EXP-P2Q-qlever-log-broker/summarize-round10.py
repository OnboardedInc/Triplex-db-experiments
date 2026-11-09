# [EXP-P2Q] Why: re-open source-bound observations before reporting coverage; never adopt an exit flag alone.
# Rejected: counting forged identity or a symbol's serialized label as actual policy execution.
import hashlib,json,pathlib,os,time
root=pathlib.Path.cwd();base=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2Q-R3/round10')
selection=json.loads(os.environ.get('P2Q_GATE_ATTEMPTS_JSON','{}'))
specs={'native-foreign':(1,1),'native-symbol':(1,1),'earlier-offline':(802,816),'new-offline':(37,43),'foundation':(42,42),'package':(224,250),'core-focused':(28,28),'qlever-typecheck':None,'core-typecheck':None,'new-live':(7,14),'earlier-live':(51,51),'nonzero-rewinds-live':(3,8)}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
self_path=root/'lab/experiments/EXP-P2Q-qlever-log-broker/summarize-round10.py';self_before=sha(self_path)
receipts={};locations={}
for gate,counts in specs.items():
 attempt=selection.get(gate,'final');out=base/attempt;path=out/(gate+'.json');r=json.loads(path.read_text())
 assert r['accepted'] and r['exitCode']==0 and r['sourceStillMatches'] and r['heavySlotStillMatches'] and r['resultFresh'] and r['contentMatches'],gate
 assert all(sha(root/name)==digest for name,digest in r['sourceHashes'].items()),gate
 assert sha(out/(gate+'.log'))==r['logSha256']
 if counts:
  result=out/(gate+'-vitest.json');assert sha(result)==r['resultSha256']
  d=json.loads(result.read_text());cases=[c for suite in d['testResults'] for c in suite['assertionResults']]
  assert d['success'] and d['numFailedTests']==0 and sum(c['status']=='passed' for c in cases)==counts[0] and len(cases)==counts[1]
  assert r['startedAt']<=d['startTime']/1000<=r['finishedAt'] and r['startedAt']<=result.stat().st_mtime<=r['finishedAt']
 else:assert (out/(gate+'.log')).read_bytes()==b''
 locations[gate]=out;receipts[gate]=r
# The exact source tree and installed dependency preimages remain current; per-attempt owner identities remain distinct.
heads={r['head'] for r in receipts.values()};assert len(heads)==1
for gate,r in receipts.items():
 for name,digest in receipts['earlier-offline']['sourceHashes'].items():
  if not pathlib.Path(name).is_absolute():assert r['sourceHashes'].get(name)==digest
for gate in ['native-foreign','native-symbol']:
 path=locations[gate]/gate/'round10-native-mutation.json';d=json.loads(path.read_text());r=receipts[gate]
 assert r['startedAt']<=path.stat().st_mtime<=r['finishedAt']
 assert d['diagnostics']==[] and d['required']==6144 and d['observed']==2048 and d['replicaObserved']==3071
 assert set(d['typedKeys'])==set(d['runtimeKeys']) and len(d['runtimeKeys'])==3
 if gate=='native-foreign':
  assert d['privateReadQualified'] is False and 'unconstructed read: Symbol(round10NativeRead)' in d['guardError']
  assert d['outcome']['ok'] and d['outcome']['value']=={'rows':[]} and d['gateCalls']==0 and d['maskCalls']==0
 else:
  assert d['privateReadQualified'] and d['guardError'] is None and d['outcome']['ok'] is False
  assert d['outcome']['error']['reason']=='basis-not-reached' and d['outcome']['error']['required']==6144 and d['outcome']['error']['observed']==3071 and d['outcome']['error']['replica']=='the QLever replica'
  assert d['gateCalls']>0
new=locations['new-offline']/'new-offline'
assert json.loads((new/'round10-foreign-provenance.json').read_text())['constructorsRejected']==4
for kind in ['surface','dispatch','snapshot']:
 assert set(json.loads((new/f'round10-{kind}-keys.json').read_text())['keys'])=={'read','hidden','Symbol(round10Read)'}
keys=json.loads((new/'round10-native-public-keys.json').read_text());assert set(keys['typed'])==set(keys['runtime'])=={'select','selectWithRelations'}
symbol=json.loads((new/'round10-symbol-policy.json').read_text())
assert symbol['future']['ok'] is False and symbol['future']['error']['reason']=='basis-not-reached' and symbol['future']['error']['required']==6144 and symbol['future']['error']['observed']==3071
assert all(symbol['masked'][0][field] is None for field in ['retracted_at','retracted_position','retract_tx_id']) and symbol['retired']['retract_tx_id']=='later'
coverage=json.loads((new/'round8-policy-coverage.json').read_text());assert len(coverage)==48 and all(row['checkedRequired']==row['expectedRequired'] and row['checkCalls']>0 for row in coverage)
comparisons=[]
for directory in [new,locations['new-live']/'new-live']:
 for path in directory.glob('*immutable.json'):
  d=json.loads(path.read_text());rows=d if isinstance(d,list) else [d]
  for row in rows:
   if 'before' in row and 'after' in row:
    assert isinstance(row['before'],str) and row['before']==row['after'];comparisons.append({'path':str(path.relative_to(base)),'bytes':len(row['before'].encode())})
   if 'afterMetadata' in row:
    assert json.loads(row['before'])['transactions']
    for key in ['transaction','afterMetadata','transactionAfterMetadata']:
     assert row[key]==row['before'];comparisons.append({'path':str(path.relative_to(base)),'variant':key,'bytes':len(row['before'].encode())})
summary={'format':'p2q-round10-readback/1','createdAt':time.time(),'head':next(iter(heads)),'gateAttempts':{g:selection.get(g,'final') for g in specs},'offlinePassed':1135,'earlierLiveEnabledPassed':54,'newLiveCases':7,'typechecks':2,'constructorControls':20,'nativeMutations':2,'existingPolicyRoutes':48,'fullByteComparisons':comparisons,'receiptHashes':{g:sha(locations[g]/(g+'.json')) for g in specs},'selfSha256':self_before,'scope':'builder coverage only; independent acceptance remains open'}
assert sha(self_path)==self_before
with (base/'SUMMARY.json').open('x') as stream:json.dump(summary,stream,indent=2);stream.write('\n')
print(json.dumps({k:v for k,v in summary.items() if k!='fullByteComparisons'},indent=2))

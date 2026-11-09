"""Revalidate this attempt's actual bytes and semantic summaries; no engine qualification is granted."""
import hashlib,json,pathlib,re,subprocess,datetime
E=pathlib.Path(__file__).resolve().parent;R=E.parents[3]
D=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-0314')
sha=lambda b:hashlib.sha256(b).hexdigest()
s=json.loads((E/'source-and-hashes.json').read_text());head=s['testedSource']
subprocess.run(['git','merge-base','--is-ancestor',head,'HEAD'],cwd=R,check=True)
assert all(sha((R/p).read_bytes())==h for p,h in s['hashes'].items())
subprocess.run(['git','merge-base','--is-ancestor',s['main'],head],cwd=R,check=True)
audit=json.loads((E/'pin-audit.json').read_text());assert audit['activePaths']==247
assert {p['path'] for p in audit['movedPins']} == {'lab/acceptance/build_contract.py','lab/acceptance/RULINGS-PENDING.md'}
for pin in audit['movedPins']:
    assert pin['sha256']==sha((R/pin['path']).read_bytes()) and pin['sha256'] in pin['currentReferencedHashes']
compiled={'Q96'+c for c in 'abcd'}|{'Q97'+c for c in 'abc'}
authority=subprocess.check_output(['git','show',s['main']+':lab/acceptance/RULINGS-PENDING.md'],cwd=R,text=True)
pending=(R/'lab/acceptance/RULINGS-PENDING.md').read_text().splitlines()
for line in authority.splitlines():
    match=re.match(r'^\| (Q\d+[a-z]?(?:-S\d+)?)\b',line)
    if match and match[1] not in compiled:assert line in pending,line
contract=json.loads((R/'lab/acceptance/obligations.json').read_text())
new={'Q99'+c for c in 'abcde'}|{'Q99-S1'}|{'Q100'+c for c in 'abcdefghijklmnop'}|{'Q100-S1','Q101a'}
assert new <= set(contract['pendingRulings']['ids']) and not new & {r['id'] for r in contract['rulings']}
assert contract['version']=='0.3.14'

assert all(sha((R/r['path']).read_bytes())==r['sha256'] for r in audit['changedExistingSourceFiles'])
for ref in s['parents']:subprocess.run(['git','merge-base','--is-ancestor',ref,head],cwd=R,check=True)
runs=[]
for label,content in [('r3-verify-final','second regeneration byte-identical'),('r3-contract-tests-final','Ran 24 tests'),('r3-evaluator-final','# pass 108')]:
    ds=[p for p in D.glob(label+'-*') if (p/'receipt.json').exists()];assert len(ds)==1,(label,ds)
    p=ds[0];x=json.loads((p/'receipt.json').read_text());log=(p/'command.log').read_bytes();text=log.decode()
    assert x['head']==head and x['result']=={'code':0,'signal':None} and x['sourceStillMatches']
    assert datetime.datetime.fromisoformat(x['start']).timestamp()>=s['snapshotAtEpoch'] and x['end']>=x['start']
    assert sha(log)==x['logSha256'] and content in text
    assert all(sha((R/f).read_bytes())==h for f,h in x['inputs'].items())
    if label=='r3-contract-tests-final':assert '\nOK\n' in text
    if label=='r3-evaluator-final':
        for k,v in [('tests',108),('pass',108),('fail',0),('skipped',0),('cancelled',0),('todo',0)]:assert re.search(r'^# '+k+' '+str(v)+'$',text,re.M)
    runs.append({'label':label,'receipt':str(p/'receipt.json'),'sha256':sha((p/'receipt.json').read_bytes())})
mds=list(D.glob('r3-mutations-final-*'));assert len(mds)==1
mx=json.loads((mds[0]/'receipt.json').read_text());assert mx['head']==head and mx['sourceStillMatches'] and mx['result']=={'code':0,'signal':None}
assert datetime.datetime.fromisoformat(mx['start']).timestamp()>=s['snapshotAtEpoch'] and mx['end']>=mx['start']
m=(mds[0]/'command.log').read_text();assert sha(m.encode())==mx['logSha256'] and 'missed: []' in m
mm=re.search(r'total (\d+) run (\d+) caught (\d+) missed: \[\] retired \(anchor gone\): (\d+)',m);assert mm and mm[2]==mm[3]
assert 'CAUGHT 0314 pending Sam id truncated' in m
assert 'SOURCE sha256='+s['hashes']['lab/acceptance/build_contract.py'] in m
assert all(('CAUGHT '+r+' '+k) in m for r in ['Q96a','Q96b','Q96c','Q96d','Q97a','Q97b','Q97c'] for k in ['literal weakened','consumer missing','compiled row absent'])
assert all(('CAUGHT 0314 '+k) in m for k in ['repin missing','repin stale','case pin stale','review binding absent'])
for label, marker in [('r3-focused-final','19 passed'),('r3-types-final',None)]:
    ps=[p for p in D.glob(label+'-*') if (p/'receipt.json').exists()];assert len(ps)==1
    x=json.loads((ps[0]/'receipt.json').read_text());b=(ps[0]/'command.log').read_bytes()
    assert x['head']==head and x['sourceStillMatches'] and x['result']=={'code':0,'signal':None} and sha(b)==x['logSha256']
    assert all(sha((R/f).read_bytes())==h for f,h in x['inputs'].items())
    assert datetime.datetime.fromisoformat(x['start']).timestamp()>=s['snapshotAtEpoch'] and x['end']>=x['start']
    if marker:assert marker in b.decode()
# [CX-A01-0314-R3] Why: preserve the observed integration timeout as a failure, while binding its four passing Datomic cases. Rejected: promoting 38/39 to a full-file PASS or extending the timeout.
ps=list(D.glob('r3-integration-last-final-*'));assert len(ps)==1
ix=json.loads((ps[0]/'receipt.json').read_text());ib=(ps[0]/'command.log').read_bytes();it=ib.decode()
assert ix['head']==head and ix['sourceStillMatches'] and ix['result']=={'code':1,'signal':None} and sha(ib)==ix['logSha256']
assert datetime.datetime.fromisoformat(ix['start']).timestamp()>=s['snapshotAtEpoch'] and ix['end']>=ix['start']
assert all(sha((R/f).read_bytes())==h for f,h in ix['inputs'].items())
assert '1 failed | 38 passed (39)' in it and 'Test timed out in 5000ms.' in it
failures=re.findall(r'^ FAIL  (.+)$',it,re.M)
assert failures==['test/value-domains.test.ts > memory accepted endpoints survive journal, callback, get and receipt without conversion']
assert len(re.findall(r'^ ✓ .* > datomic > ',it,re.M))==3
assert len(re.findall(r'^ ✓ .* > datomic: dense arrays and stored journal depth agree with the table ',it,re.M))==1
integration={'result':'FAIL','pass':38,'fail':1,'datomicCasesPassed':4,'failure':failures[0],'receipt':str(ps[0]/'receipt.json'),'sha256':sha((ps[0]/'receipt.json').read_bytes())}
gates=[]
for lane in ['xtdb','datomic','qlever']:
    c=json.loads((E/f'G0-{lane}-capture.json').read_text());x=json.loads((E/f'G0-{lane}-receipt.json').read_text());root=pathlib.Path(c['durableRoot'])
    assert c['source']==x['git']['head']==head and c['verdict']==x['verdict']=='PASS'
    assert x['experiment']=='CX-A01-0314-R3' and x['runId']==c['runId'] and x['lane']==lane
    assert x['counts']==c['counts'] and x['counts']['executed']==x['counts']['pass']>0
    assert x['counts']['fail']==x['counts']['unexpectedSkip']==0 and x['counts']['skip']==x['counts']['expectedSkip']
    assert x['scope']=='full' and x['slot'] is None and not x['reasons'] and not x['firstFailures']
    assert x['git']['diffBytes']==0 and not x['git']['modifiedFiles'] and not x['git']['untrackedFiles']
    assert all(t['code']==0 and not t['timedOut'] for t in x['steps'])
    started=datetime.datetime.fromisoformat(x['startedAt']).timestamp();ended=datetime.datetime.fromisoformat(x['endedAt']).timestamp()
    assert started>s['snapshotAtEpoch'] and ended>=started and c['capturedAtEpoch']>=ended
    manifest=(E/f'G0-{lane}-SHA256SUMS').read_text();assert manifest==(root/'SHA256SUMS').read_text() and sha(manifest.encode())==c['manifestSha256']
    for line in manifest.splitlines():
        h,p=line.split('  ',1);assert (root/p).resolve().is_relative_to(root) and sha((root/p).read_bytes())==h,p
    assert (root/'receipt.json').read_bytes()==(E/f'G0-{lane}-receipt.json').read_bytes()
    for o in x['objects']:
        b=(root/'objects'/o['sha256']).read_bytes();assert len(b)==o['bytes'] and sha(b)==o['sha256']
    bm=json.loads((root/'raw/build-manifest.json').read_text());assert sha((root/'raw/build-manifest.json').read_bytes())==x['build']['manifestSha256']
    n=0
    for pkg in bm['packages'].values():
        assert len(pkg['list'])==pkg['files'] and sha(''.join(f['sha256']+'  '+f['path']+'\n' for f in pkg['list']).encode())==pkg['sha256']
        for f in pkg['list']:
            b=(root/'build'/f['path']).read_bytes();assert len(b)==f['bytes'] and sha(b)==f['sha256'];n+=1
    assert n==c['builtFiles']
    gates.append({'lane':lane,'runId':x['runId'],'counts':x['counts'],'sourceTreeId':x['git']['sourceTreeId'],'objects':len(x['objects']),'builtFiles':n,'durableRoot':str(root),'capturedAtEpoch':c['capturedAtEpoch'],'startedAt':started})
assert all(a['capturedAtEpoch']<b['startedAt'] for a,b in zip(gates,gates[1:]))
assert len({g['sourceTreeId'] for g in gates})==1
summary={'testedSource':head,'mainIncluded':s['main'],'sourceHashesStable':True,'contractTests':24,'evaluatorPass':108,'mutationCatalog':int(mm[1]),'mutationsCaught':int(mm[3]),'retiredAnchors':int(mm[4]),'g0':gates,'runs':runs,'focusedDatomicTests':19, 'integrationDomainTests':integration,'runtimeTypeFixture':'tsc exit zero with missing-domain expected error consumed','movedActivePins':audit['movedPins'],'noIndependentPromotion':True}
(E/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print('Validated exact result content, source stability, fresh attempt/source/slot/input bindings and retained build/raw/object bytes')

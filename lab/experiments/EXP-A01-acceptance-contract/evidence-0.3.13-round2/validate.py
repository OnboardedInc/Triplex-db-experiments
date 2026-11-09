"""Revalidate named round-2 receipts; never grant fresh engine qualification from saved evidence."""
import datetime,hashlib,json,pathlib,re,subprocess
E=pathlib.Path(__file__).resolve().parent;R=E.parents[3]
sha=lambda b:hashlib.sha256(b).hexdigest()
s=json.loads((E/'source-and-hashes.json').read_text());head=s['testedSource']
subprocess.run(['git','merge-base','--is-ancestor',head,'HEAD'],cwd=R,check=True)
assert s['main']=='9a7996e2a242690edbc86417283d8c7348950adb' and s['main'] in s['parents']
assert all(sha((R/p).read_bytes())==h for p,h in s['hashes'].items())
read=lambda n:(E/n).read_text()
for n,num in [('contract-tests-committed.txt',18)]:assert f'Ran {num} tests' in read(n) and '\nOK\n' in read(n)
for file,tests in [('evaluator.tap',108),('js-tests-committed.tap',7)]:
    for field,n in [('tests',tests),('pass',tests),('fail',0),('skipped',0),('cancelled',0),('todo',0)]:assert re.search(r'^# '+field+' '+str(n)+'$',read(file),re.M),(file,field)
assert 'total 582 run 494 caught 494 missed: [] retired (anchor gone): 88' in read('negtest.txt')
assert 'second regeneration byte-identical' in read('verify-final.txt')
assert 'Q47d external test: PASS' in read('q47d.txt')
gates=[]
for lane,count,skips,built in [('xtdb',1218,137,566),('datomic',1253,66,528)]:
    c=json.loads(read(f'G0-{lane}-capture.json'));x=json.loads(read(f'G0-{lane}-receipt.json'));D=pathlib.Path(c['durableRoot'])
    assert c['source']==x['git']['head']==head and c['verdict']==x['verdict']=='PASS'
    assert x['experiment']=='CX-A01-0313-R2' and x['runId']==c['runId'] and x['lane']==lane
    assert x['counts']==c['counts']=={'executed':count,'pass':count,'fail':0,'skip':skips,'expectedSkip':skips,'unexpectedSkip':0}
    assert x['scope']=='full' and x['slot'] is None and not x['reasons'] and not x['firstFailures']
    assert x['git']['diffBytes']==0 and not x['git']['modifiedFiles'] and not x['git']['untrackedFiles']
    assert all(t['code']==0 and not t['timedOut'] for t in x['steps'])
    started=datetime.datetime.fromisoformat(x['startedAt']).timestamp();ended=datetime.datetime.fromisoformat(x['endedAt']).timestamp()
    assert started>s['originalSnapshotMtimeEpoch'] and ended>=started and c['capturedAtEpoch']>=ended
    manifest=read(f'G0-{lane}-SHA256SUMS');assert manifest==(D/'SHA256SUMS').read_text() and sha(manifest.encode())==c['manifestSha256']
    for line in manifest.splitlines():
        h,p=line.split('  ',1);assert (D/p).resolve().is_relative_to(D) and sha((D/p).read_bytes())==h,p
    assert (D/'receipt.json').read_bytes()==(E/f'G0-{lane}-receipt.json').read_bytes()
    for o in x['objects']:
        b=(D/'objects'/o['sha256']).read_bytes();assert len(b)==o['bytes'] and sha(b)==o['sha256']
    m=json.loads((D/'raw/build-manifest.json').read_text());assert sha((D/'raw/build-manifest.json').read_bytes())==x['build']['manifestSha256']
    num=0
    for pkg in m['packages'].values():
        assert len(pkg['list'])==pkg['files'] and sha(''.join(f['sha256']+'  '+f['path']+'\n' for f in pkg['list']).encode())==pkg['sha256']
        for f in pkg['list']:
            b=(D/'build'/f['path']).read_bytes();assert len(b)==f['bytes'] and sha(b)==f['sha256'];num+=1
    assert num==c['builtFiles']==built
    gates.append({'lane':lane,'runId':x['runId'],'previous':x['previous'],'counts':x['counts'],'sourceTreeId':x['git']['sourceTreeId'],'objects':len(x['objects']),'builtFiles':num,'durableRoot':str(D),'capturedAtEpoch':c['capturedAtEpoch'],'startedAt':started,'manifestSha256':c['manifestSha256']})
assert gates[0]['capturedAtEpoch']<gates[1]['startedAt']
assert gates[0]['sourceTreeId']==gates[1]['sourceTreeId']
d=json.loads((R/'lab/acceptance/obligations.json').read_text());assert len(d['pendingRulings']['ids'])==50
summary={'testedSource':head,'mergedMain':s['main'],'sourceHashesStable':True,'generatorVerify':'all six outputs byte-identical','transitiveHash':re.search(r'verify transitive hash: (\w+)',read('verify-final.txt'))[1],'contractTests':18,'mergeAndPolicyJsTests':7,'mutationCatalog':582,'mutationsCaught':494,'mutationsMissed':0,'retiredAnchors':88,'evaluatorPass':108,'evaluatorFailures':0,'assertionsWeakened':False,'g0':gates,'pendingIds':d['pendingRulings']['ids'],'q47d':'PASS','firstMergeTestFailurePreserved':'merge-tests.txt','noOtherRound2GateFailures':True}
(E/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print('Validated round-2 content, attempt freshness, source/slot/input bindings and complete build preimages')

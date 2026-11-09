"""[CX-VA01-0314-R2] Why: report only fresh source-bound content with retained failures. Rejected: treating source-only Q87 or an exit code as merged-main acceptance."""
import hashlib,json,pathlib,re,subprocess,time
R=pathlib.Path(__file__).resolve().parents[4]
D=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0314/round2')
E=pathlib.Path(__file__).parent
HEAD='3618dd8372cd9f79fb4219359dd0dfaa577be5fd'
sha=lambda b:hashlib.sha256(b).hexdigest()
subprocess.check_call(['git','merge-base','--is-ancestor','651fdb77',HEAD],cwd=R)
merge=json.loads((D/'merge-main/merge.json').read_bytes())
assert subprocess.run(['git','merge-base','--is-ancestor',merge['main'],HEAD],cwd=R).returncode==1
assert set(merge['conflicts'])=={'lab/acceptance/ACCEPTANCE.md','lab/acceptance/RULINGS-PENDING.md','lab/acceptance/obligations.json'}
pending=(D/'merge-main/main/lab/acceptance/RULINGS-PENDING.md').read_text()
for rid in ['Q99'+c for c in 'abcde']+['Q100'+c for c in 'abcdefghijklmnop']:
    assert re.search(r'^\| '+rid+r'\b',pending,re.M),rid
    assert not any(r['id']==rid for r in json.loads((R/'lab/acceptance/obligations.json').read_bytes())['rulings'])
labels=['verify','contract-tests','mutations','evaluator-source','g0-xtdb','g0-datomic','g0-qlever','f1-f2','domain-omission','inventory','pins','integration-value-domains-corrected','integration-types','integration-datomic-only']
summary={}
for label in labels:
    files=[p for p in D.glob('*/execution.json') if json.loads(p.read_bytes())['label']==label]
    assert len(files)==1,(label,files)
    p=files[0];x=json.loads(p.read_bytes());text=(p.parent/'command.log').read_text()
    assert x['head']==HEAD and x['sourceUnchanged'] and x['sourceBefore']==x['sourceAfter']
    assert x['logSha256']==sha((p.parent/'command.log').read_bytes())
    assert all(sha((R/q).read_bytes())==h for q,h in x['sourceAfter'].items())
    assert x['endEpoch']>x['startEpoch'] and x['diskFreeBefore']>=5*1024**3 and x['offlineSlot'] is None
    assert x['exitCode']==({'integration-value-domains-corrected':1,'integration-types':2,'integration-datomic-only':1}.get(label,0))
    summary[label]={'directory':str(p.parent),'executionSha256':sha(p.read_bytes()),'logSha256':x['logSha256'],'head':HEAD,'observedMain':x['main'],'exitCode':x['exitCode'],'startedAtEpoch':x['startEpoch'],'endedAtEpoch':x['endEpoch']}
    if label=='verify': assert len(re.findall(r'^verify (?!transitive)',text,re.M))==6 and 'second regeneration byte-identical' in text
    elif label=='contract-tests':assert re.search(r'Ran 23 tests in .*\n\nOK',text)
    elif label=='mutations':
        assert 'total 607 run 519 caught 519 missed: [] retired (anchor gone): 88' in text
        for rid in ['Q96a','Q96b','Q96c','Q96d','Q97a','Q97b','Q97c']:
            for kind in ['literal weakened','consumer missing','compiled row absent']:assert 'CAUGHT '+rid+' '+kind+':' in text
    elif label=='evaluator-source':
        for k,n in [('tests',108),('pass',108),('fail',0),('skipped',0),('cancelled',0),('todo',0)]:assert re.search(r'^# '+k+' '+str(n)+'$',text,re.M)
        summary[label]['qualifiesCurrentMainQ87']=False
    elif label=='f1-f2':
        obs=json.loads((p.parent/'p2q/observations.json').read_bytes());assert obs['a0Domain']==obs['brokerDomain']=='qlever'
        assert len(obs['observations'])==2
        for o in obs['observations']:assert not o['result']['ok'] and o['result']['error']['_tag']=='InvalidTripleError' and o['before']==o['after'] and o['receipt'] is None
        obs=json.loads((p.parent/'p2q/envelope-observations.json').read_bytes());assert [v['depth'] for v in obs['observations']]==[120,128]
        assert all(v['result']['ok'] and v['receiptFound'] for v in obs['observations'])
        assert obs['sourceSha256']==sha((E/'broker-envelope.test.ts').read_bytes())
    elif label=='domain-omission':
        obs=json.loads((p.parent/'p2q/domain-required.json').read_bytes())
        assert obs['sourceUnchanged'] and obs['sourceSha256']==sha((R/'packages/core/src/storage/StorageAdapter.ts').read_bytes())
        assert obs['cases']['baseline']['exit']==0 and obs['cases']['omission']['exit']!=0
        log=(p.parent/'p2q/omission.log').read_text();assert 'TS2741' in log and "Property 'valueDomain' is missing" in log
    elif label=='pins':
        obs=json.loads((p.parent/'p2q/pins.json').read_bytes());assert obs['pins']==247 and not obs['moved'] and not obs['wholeHashHitsForChangedSource']
    elif label=='integration-types':assert "Property 'datomic' is missing" in text and 'value-domains.test.ts(187,' in text
    elif label=='integration-value-domains-corrected':assert 'datomic' in text and 'codecs[key] is not a function' in text
    elif label=='integration-datomic-only':assert '3 failed | 1 passed | 35 skipped (39)' in text and 'codecs[key] is not a function' in text and 'timed out' not in text
    if label.startswith('g0-'):
        lane=label[3:];g=p.parent/'g0';v=json.loads((g/'receipt.json').read_bytes())
        assert v['git']['head']==HEAD and v['git']['diffBytes']==0 and not v['git']['modifiedFiles'] and not v['git']['untrackedFiles']
        assert v['slot'] is None and v['scope']=='full' and v['runKind']=='diagnostic' and v['verdict']=='PASS'
        assert not v['reasons'] and not v['firstFailures'] and not v['unexpectedSkips']
        assert all(s['code']==0 and s['signal'] is None and not s['timedOut'] for s in v['steps'])
        for line in (g/'SHA256SUMS').read_text().splitlines():
            h,q=line.split('  ',1);assert sha((g/q).read_bytes())==h
        passed=skipped=0
        expected=json.loads((R/'lab/config/g0-expected-skips.json').read_bytes())['skips']
        for f in (g/'raw').glob('vitest-*.json'):
            report=json.loads(f.read_bytes());assert report['success'] and report['numFailedTests']==0
            pkg=f.stem.removeprefix('vitest-')
            for suite in report['testResults']:
                assert suite['status']!='failed';rel=str(pathlib.Path(suite['name']).relative_to(R))
                for t in suite['assertionResults']:
                    if t['status']=='passed':passed+=1
                    else:assert rel+' :: '+t['fullName'] in expected[pkg];skipped+=1
        for f in (g/'raw').glob('node-test-*.stdout.txt'):
            s=f.read_text()
            for key in ['fail','skipped','cancelled','todo']:assert re.search(r'^# '+key+' 0$',s,re.M)
            passed+=int(re.search(r'^# pass (\d+)$',s,re.M)[1])
        oracle=json.loads((g/'raw/oracle-validate-workloads.stdout.txt').read_bytes());assert oracle['result']=='PASS' and oracle['checked_cases']==71;passed+=71
        unit=(g/'raw/oracle-unittest.stderr.txt').read_text();assert re.search(r'^OK$',unit,re.M);passed+=int(re.search(r'Ran (\d+) tests',unit)[1])
        assert v['counts']=={'executed':passed,'pass':passed,'fail':0,'skip':skipped,'expectedSkip':skipped,'unexpectedSkip':0}
        assert (passed,skipped)=={'xtdb':(1223,140),'datomic':(1258,66),'qlever':(1415,79)}[lane]
        summary[label]['g0']={'runId':v['runId'],'counts':v['counts']}
record={'verdict':'FIX-FIRST','testedHead':HEAD,'reviewedTip':'651fdb77','checkedAtEpoch':time.time(),'currentMainMerged':False,'attemptedMain':merge['main'],'findings':['F3: adding Datomic domain breaks the existing integration codec matrix','B1: current main acceptance merge conflicts block current-main Q87'],'executions':summary}
(E/'SUMMARY.json').write_text(json.dumps(record,indent=2)+'\n')
(E/'DURABLE-SHA256SUMS').write_text(''.join(sha(f.read_bytes())+'  '+str(f.relative_to(D))+'\n' for f in sorted(D.rglob('*')) if f.is_file() and not f.is_symlink()))
print(json.dumps({'verdict':record['verdict'],'executionsChecked':len(summary),'currentMainMerged':False,'testedHead':HEAD}))

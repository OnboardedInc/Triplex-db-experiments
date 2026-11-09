"""[CX-VA01-0314] Why: recheck content, freshness and source binding before reporting. Rejected: trusting exit codes or gate PASS strings alone."""
import hashlib, json, pathlib, re, subprocess, time
R = pathlib.Path(__file__).resolve().parents[4]
D = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0314')
E = R/'lab/verify/A01/0314'
HEAD = '549cb5c94644a1dc4b8075d711242cc18f8ae80f'
MAIN = '6ce5adb1f2228cae24d4bb20b5c681dd954d2c8f'
sha = lambda b: hashlib.sha256(b).hexdigest()
for ref in [MAIN,'bed67f1f']:
    subprocess.check_call(['git','merge-base','--is-ancestor',ref,HEAD],cwd=R)
frozen_at = int(subprocess.check_output(['git','show','-s','--format=%ct',HEAD],cwd=R))
labels = ['verify-frozen','contract-tests-frozen','mutations-frozen','evaluator','g0-xtdb','g0-datomic','g0-qlever','audit-frozen','value-domain-frozen','envelope-probe']
executions = {}
for label in labels:
    found = [p for p in D.glob('*/execution.json') if json.loads(p.read_bytes())['label']==label]
    assert len(found)==1,(label,found)
    p = found[0]; x = json.loads(p.read_bytes()); log = (p.parent/'command.log').read_bytes()
    assert x['head']==HEAD and x['main']==MAIN
    assert x['startEpoch']>=frozen_at and x['endEpoch']>x['startEpoch']
    assert x['sourceUnchanged'] and x['sourceBefore']==x['sourceAfter']
    assert all(sha((R/q).read_bytes())==h for q,h in x['sourceAfter'].items())
    assert x['logSha256']==sha(log) and x['offlineSlot'] is None
    assert x['diskFreeBefore']>=5*1024**3
    assert x['exitCode']==(1 if label in ['value-domain-frozen','envelope-probe'] else 0)
    executions[label] = {'directory':str(p.parent),'executionSha256':sha(p.read_bytes()),'logSha256':sha(log),'exitCode':x['exitCode'],'head':x['head'],'startEpoch':x['startEpoch'],'endEpoch':x['endEpoch']}
    text = log.decode()
    if label=='verify-frozen':
        assert len(re.findall(r'^verify (?!transitive)',text,re.M))==6 and 'second regeneration byte-identical' in text
        assert '266e66f537cd27f462a01f6bf18c9ee7be3f3915bc5bdb61c03554a41d55a718' in text
    elif label=='contract-tests-frozen': assert re.search(r'Ran 23 tests in .*\n\nOK',text)
    elif label=='mutations-frozen':
        assert 'total 607 run 519 caught 519 missed: [] retired (anchor gone): 88' in text
        for rid in ['Q96a','Q96b','Q96c','Q96d','Q97a','Q97b','Q97c']:
            for kind in ['literal weakened','consumer missing','compiled row absent']: assert 'CAUGHT '+rid+' '+kind+':' in text
    elif label=='evaluator':
        for k,n in [('tests',108),('pass',108),('fail',0),('skipped',0),('cancelled',0),('todo',0)]: assert re.search(r'^# '+k+' '+str(n)+'$',text,re.M)
    elif label=='value-domain-frozen':
        assert 'expected WriteError: Invalid QLever assertion' in text and 'to be an instance of InvalidTripleError' in text
        obs=json.loads((p.parent/'p2q/observations.json').read_bytes())
        assert obs['a0Domain']=='qlever' and obs['brokerDomain'] is None
        assert len(obs['observations'])==2
        for o in obs['observations']:
            assert o['before']==o['after'] and o['receipt'] is None and not o['result']['ok']
            assert o['result']['error']['_tag']=='WriteError' and o['result']['error']['cause']['_tag']=='InvalidTripleError'
    elif label=='envelope-probe':
        obs=json.loads((p.parent/'p2q/envelope-observations.json').read_bytes())
        source=(p.parent/'p2q/probe-source.ts').read_bytes()
        assert sha(source)==obs['sourceSha256'] and source==(E/'broker-envelope.test.ts').read_bytes()
        assert obs['domain']['maxDepth']==128 and obs['domain']['journalDepthAllowance']==16
        shallow,deep=obs['observations']
        assert shallow['depth']==120 and shallow['result']['ok'] and shallow['receiptFound']
        assert deep['depth']==128 and not deep['result']['ok'] and not deep['receiptFound'] and deep['after']==deep['before']
        assert deep['result']['error']['_tag']=='WriteError'
        cause=deep['result']['error']['cause']
        assert cause['_tag']=='InvalidTripleError' and cause['value']['type']=='json'
        assert cause['value']['value']['op']=='assert' and cause['value']['value']['attribute']==':review/json'
    if label.startswith('g0-'):
        lane=label[3:]; g=p.parent/'g0'; receipt=json.loads((g/'receipt.json').read_bytes())
        assert receipt['git']['head']==HEAD and receipt['slot'] is None and receipt['experiment']=='CX-VA01-0314'
        assert receipt['git']['diffBytes']==0 and not receipt['git']['modifiedFiles'] and not receipt['git']['untrackedFiles']
        assert receipt['verdict']=='PASS' and receipt['scope']=='full' and receipt['runKind']=='diagnostic'
        assert not receipt['reasons'] and not receipt['firstFailures'] and not receipt['unexpectedSkips']
        assert all(s['code']==0 and s['signal'] is None and not s['timedOut'] for s in receipt['steps'])
        for line in (g/'SHA256SUMS').read_text().splitlines():
            h,q=line.split('  ',1); assert sha((g/q).read_bytes())==h
        passed=skipped=0
        expected=json.loads((R/'lab/config/g0-expected-skips.json').read_bytes())['skips']
        for f in (g/'raw').glob('vitest-*.json'):
            v=json.loads(f.read_bytes()); assert v['success'] and v['numFailedTests']==0
            package=f.stem.removeprefix('vitest-')
            for suite in v['testResults']:
                assert suite['status']!='failed'
                rel=str(pathlib.Path(suite['name']).relative_to(R))
                for test in suite['assertionResults']:
                    if test['status']=='passed': passed+=1
                    else:
                        assert test['status'] in ['pending','skipped','todo']
                        assert rel+' :: '+test['fullName'] in expected[package]
                        skipped+=1
        for f in (g/'raw').glob('node-test-*.stdout.txt'):
            s=f.read_text()
            for key in ['fail','skipped','cancelled','todo']: assert re.search(r'^# '+key+' 0$',s,re.M)
            passed+=int(re.search(r'^# pass (\d+)$',s,re.M)[1])
        oracle=json.loads((g/'raw/oracle-validate-workloads.stdout.txt').read_bytes())
        assert oracle['result']=='PASS' and oracle['checked_cases']==71
        passed+=71
        unit=(g/'raw/oracle-unittest.stderr.txt').read_text()
        assert re.search(r'^OK$',unit,re.M); passed+=int(re.search(r'Ran (\d+) tests',unit)[1])
        assert receipt['counts']=={'executed':passed,'pass':passed,'fail':0,'skip':skipped,'expectedSkip':skipped,'unexpectedSkip':0}
        assert (passed,skipped)=={'xtdb':(1223,140),'datomic':(1258,66),'qlever':(1396,79)}[lane]
        executions[label]['g0']={'runId':receipt['runId'],'counts':receipt['counts'],'slot':None}

summary={'checkedAtEpoch':time.time(),'testedHead':HEAD,'mergedMain':MAIN,'verdict':'FIX-FIRST','findings':['F1: merged broker loses GS12F typed QLever range refusal','F2: merged broker rejects valid maximum-depth JSON while packing its journal envelope'],'executions':executions}
(E/'SUMMARY.json').write_text(json.dumps(summary,indent=2)+'\n')
(E/'DURABLE-SHA256SUMS').write_text(''.join(sha(f.read_bytes())+'  '+str(f.relative_to(D))+'\n' for f in sorted(D.rglob('*')) if f.is_file() and not f.is_symlink()))
print(json.dumps({'verdict':summary['verdict'],'executionsChecked':len(executions),'testedHead':HEAD,'durableRoot':str(D)}))

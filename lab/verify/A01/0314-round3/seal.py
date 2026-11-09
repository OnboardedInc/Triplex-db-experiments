"""[CX-VA01-0314-R3] Why: derive the review from fresh content and exact inputs. Rejected: adopting builder PASS labels or hiding setup failures."""
import hashlib, json, pathlib, re, shutil, subprocess, time
R = pathlib.Path(__file__).resolve().parents[4]
E = pathlib.Path(__file__).parent
D = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0314/round3')
HEAD = 'c4eedaa5ccad4655a66db9b807de77e20d0c028e'
MAIN = 'bb36862daf55b4f46a3cbf763f757c6341de4575'
TIP = 'd117cdb349b100fe4451bfcfb422cb95b2db3d58'
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *a: subprocess.check_output(['git', *a], cwd=R)
assert git('rev-parse', 'HEAD').decode().strip() == HEAD
for ref in [MAIN, TIP]: subprocess.check_call(['git', 'merge-base', '--is-ancestor', ref, HEAD], cwd=R)
assert not git('diff', TIP, HEAD, '--', 'packages', 'test/integration', 'lab/acceptance', 'lab/bin', 'lab/config')
frozen = int(git('show', '-s', '--format=%ct', HEAD))
executions = {}
for p in sorted(D.glob('*/execution.json')):
    x = json.loads(p.read_bytes()); label = x['label']
    assert label not in executions
    assert x['sourceUnchanged'] and x['sourceBefore'] == x['sourceAfter']
    assert x['logSha256'] == sha((p.parent/'command.log').read_bytes())
    assert x['endEpoch'] > x['startEpoch'] and x['diskFreeBefore'] >= 5*1024**3
    assert x['offlineSlot'] is None
    if x['head'] == HEAD:
        assert x['startEpoch'] >= frozen
        assert all(sha((R/q).read_bytes()) == h for q,h in x['sourceAfter'].items())
    executions[label] = (p, x, (p.parent/'command.log').read_text())
required = ['verify', 'contract-tests', 'mutations', 'evaluator', 'g0-xtdb', 'g0-datomic', 'g0-qlever', 'f1-f2', 'domain-omission', 'inventory', 'pins', 'integration-types-final', 'integration-value-domains', 'integration-datomic-only', 'timeout-main-3', 'timeout-historical-3', 'timeout-branch-2', 'completion-historical-30s', 'completion-branch-30s']
summary = {}
for label in required:
    p,x,log = executions[label]
    assert x['head'] == HEAD
    expected_exit = 1 if label.startswith('timeout-') or label == 'integration-value-domains' else 0
    assert x['exitCode'] == expected_exit, (label, x['exitCode'])
    summary[label] = {'directory':str(p.parent), 'executionSha256':sha(p.read_bytes()), 'logSha256':x['logSha256'], 'exitCode':x['exitCode'], 'head':x['head'], 'observedMain':x['main'], 'startedAtEpoch':x['startEpoch'], 'endedAtEpoch':x['endEpoch']}
    if label == 'verify':
        assert len(re.findall(r'^verify (?!transitive)', log, re.M)) == 6
        assert 'second regeneration byte-identical (RULINGS Q34e)' in log
    elif label == 'contract-tests': assert re.search(r'Ran 24 tests in .*\n\nOK', log)
    elif label == 'mutations':
        assert 'total 608 run 520 caught 520 missed: [] retired (anchor gone): 88' in log
        for rid in ['Q96a','Q96b','Q96c','Q96d','Q97a','Q97b','Q97c']:
            for kind in ['literal weakened','consumer missing','compiled row absent']:
                assert 'CAUGHT '+rid+' '+kind+':' in log
    elif label == 'evaluator':
        for key,n in [('tests',108),('pass',108),('fail',0),('cancelled',0),('skipped',0),('todo',0)]:
            assert re.search(r'^# '+key+' '+str(n)+'$', log, re.M)
        summary[label]['qualifiesMergedMainQ87'] = True
    elif label == 'f1-f2':
        obs = json.loads((p.parent/'p2q/observations.json').read_bytes())
        assert obs['a0Domain'] == obs['brokerDomain'] == 'qlever'
        assert len(obs['observations']) == 2
        for o in obs['observations']:
            assert not o['result']['ok'] and o['result']['error']['_tag'] == 'InvalidTripleError'
            assert o['before'] == o['after'] and o['receipt'] is None
        obs = json.loads((p.parent/'p2q/envelope-observations.json').read_bytes())
        assert [v['depth'] for v in obs['observations']] == [120,128]
        assert all(v['result']['ok'] and v['receiptFound'] for v in obs['observations'])
        assert obs['sourceSha256'] == sha((E/'broker-envelope.test.ts').read_bytes())
    elif label == 'domain-omission':
        obs = json.loads((p.parent/'p2q/domain-required.json').read_bytes())
        assert obs['sourceUnchanged'] and obs['sourceSha256'] == sha((R/'packages/core/src/storage/StorageAdapter.ts').read_bytes())
        assert obs['cases']['baseline']['exit'] == 0 and obs['cases']['omission']['exit'] != 0
        assert 'TS2741' in (p.parent/'p2q/omission.log').read_text()
        assert "Property 'valueDomain' is missing" in (p.parent/'p2q/omission.log').read_text()
        for case,row in obs['cases'].items():
            assert sha((p.parent/f'p2q/{case}.ts').read_bytes()) == row['fixtureSha256']
            assert sha((p.parent/f'p2q/{case}.log').read_bytes()) == row['outputSha256']
    elif label == 'pins':
        obs = json.loads((p.parent/'p2q/pins.json').read_bytes())
        assert obs['pins'] == 247 and not obs['wholeHashHitsForChangedSource'] and obs['inputCount'] == 35
        assert {r['path'] for r in obs['movedContractInputs']} == {'lab/acceptance/RULINGS-PENDING.md','lab/acceptance/build_contract.py'}
        for row in obs['movedContractInputs']: assert row['expected'] == [row['after']]
        summary[label]['movedContractInputs'] = obs['movedContractInputs']
        summary[label]['pendingRequired'] = obs['pendingRequired']
        summary[label]['contractHash'] = obs['contractHash']
    elif label == 'inventory':
        obs = json.loads((p.parent/'p2q/inventory.json').read_bytes())
        assert obs['files'] == 1052 and len(obs['declarations']) == 19 and len(obs['providers']) == 65
        declarations = {r['file']:r['value'] for r in obs['declarations']}
        for file,domain in {
            'packages/xtdb/src/XtdbStorageAdapter.ts':'xtdb',
            'packages/qlever/src/QleverStorageAdapter.ts':'qlever',
            'packages/qlever/src/broker/BrokerStorageAdapter.ts':'qlever',
            'packages/datomic/src/DatomicStorageAdapter.ts':'datomic',
            'packages/duckdb/src/effect-storage.ts':'duckdb',
            'packages/sqlite/src/SqliteAdapter.ts':'sqlite',
            'packages/postgres/src/PostgresqlAdapter.ts':'postgres',
            'packages/cloudflare/src/storage/CloudflareAdapter.ts':'cloudflare',
        }.items(): assert declarations[file] == 'ValueDomains.'+domain
        assert '...ValueDomains.foundationdb' in declarations['packages/foundationdb/src/FdbKvBackend.ts']
        summary[label]['facts'] = {'trackedTypeScriptFiles':obs['files'],'domainDeclarations':19,'adapterProviders':65}
    elif label == 'integration-types-final': assert 'error TS' not in log
    elif label == 'integration-value-domains':
        assert '1 failed | 38 passed (39)' in log
        assert 'memory accepted endpoints survive journal, callback, get and receipt without conversion' in log
        assert 'Test timed out in 5000ms' in log and 'codecs[key] is not a function' not in log
    elif label == 'integration-datomic-only':
        assert '4 passed | 35 skipped (39)' in log and 'timed out' not in log
    if label.startswith('timeout-'):
        assert '1 failed (1)' in log
        if label == 'timeout-main-3':
            assert 'WriteError: KV runtime does not support integer values' in log
            assert 'Test timed out in 5000ms' not in log
        else: assert 'Test timed out in 5000ms' in log
        assert 'memory accepted endpoints survive journal, callback, get and receipt without conversion' in log
        obs = json.loads((p.parent/'p2q/comparison-binding.json').read_bytes())
        assert obs['exitCode'] == 1 and obs['before'] == obs['after']
        assert obs['fixtureSha256'] == sha((E/'memory-fixture.test.ts').read_bytes())
        summary[label]['baselineCommit'] = obs['baselineCommit']
    if label.startswith('completion-'):
        assert '1 passed (1)' in log and 'timed out' not in log
        assert '--testTimeout' in x['command'][2] and '30000' in x['command'][2]
        obs = json.loads((p.parent/'p2q/comparison-binding.json').read_bytes())
        assert obs['exitCode'] == 0 and obs['before'] == obs['after']
        assert obs['fixtureSha256'] == sha((E/'memory-fixture.test.ts').read_bytes())
        summary[label]['meaning'] = 'Completion diagnostic with explicit 30 s CLI limit; does not replace the failed unchanged 5 s test.'
        summary[label]['baselineCommit'] = obs['baselineCommit']
    if label.startswith('g0-'):
        lane = label[3:]; g = p.parent/'g0'; v = json.loads((g/'receipt.json').read_bytes())
        assert v['git']['head'] == HEAD and v['git']['diffBytes'] == 0
        assert not v['git']['modifiedFiles'] and not v['git']['untrackedFiles']
        assert v['slot'] is None and v['scope'] == 'full' and v['runKind'] == 'diagnostic' and v['verdict'] == 'PASS'
        assert not v['reasons'] and not v['firstFailures'] and not v['unexpectedSkips']
        assert all(s['code'] == 0 and s['signal'] is None and not s['timedOut'] for s in v['steps'])
        for line in (g/'SHA256SUMS').read_text().splitlines():
            h,q = line.split('  ',1); assert sha((g/q).read_bytes()) == h
        passed = skipped = 0
        expected = json.loads((R/'lab/config/g0-expected-skips.json').read_bytes())['skips']
        for f in (g/'raw').glob('vitest-*.json'):
            report = json.loads(f.read_bytes()); assert report['success'] and report['numFailedTests'] == 0
            pkg = f.stem.removeprefix('vitest-')
            for suite in report['testResults']:
                assert suite['status'] != 'failed'; rel = str(pathlib.Path(suite['name']).relative_to(R))
                for t in suite['assertionResults']:
                    if t['status'] == 'passed': passed += 1
                    else:
                        assert t['status'] in ['pending','skipped','todo']
                        assert rel+' :: '+t['fullName'] in expected[pkg]; skipped += 1
        for f in (g/'raw').glob('node-test-*.stdout.txt'):
            text = f.read_text()
            for key in ['fail','skipped','cancelled','todo']: assert re.search(r'^# '+key+' 0$', text, re.M)
            passed += int(re.search(r'^# pass (\d+)$', text, re.M)[1])
        oracle = json.loads((g/'raw/oracle-validate-workloads.stdout.txt').read_bytes())
        assert oracle['result'] == 'PASS' and oracle['checked_cases'] == 71; passed += 71
        unit = (g/'raw/oracle-unittest.stderr.txt').read_text(); assert re.search(r'^OK$', unit, re.M)
        passed += int(re.search(r'Ran (\d+) tests', unit)[1])
        assert v['counts'] == {'executed':passed,'pass':passed,'fail':0,'skip':skipped,'expectedSkip':skipped,'unexpectedSkip':0}
        assert (passed,skipped) == {'xtdb':(1223,140),'datomic':(1277,66),'qlever':(1415,79)}[lane]
        if lane == 'datomic':
            report = json.loads((g/'raw/vitest-datomic.json').read_bytes())
            boundary = [s for s in report['testResults'] if s['name'].endswith('/test/value-domain.test.ts')]
            assert len(boundary) == 1 and len(boundary[0]['assertionResults']) == 19
            assert all(t['status'] == 'passed' for t in boundary[0]['assertionResults'])
        summary[label]['g0'] = {'runId':v['runId'],'counts':v['counts']}
gates = [executions['g0-'+lane] for lane in ['xtdb','datomic','qlever']]
for (p,a,_),(q,b,_) in zip(gates,gates[1:]): assert a['endEpoch'] < b['startEpoch']
setup = json.loads(next(D.glob('prepare-timeout-*/p2q/comparison-source.json')).read_bytes())
assert setup['main'] == MAIN and setup['testBodySha256'] == '071c2e9b56e4667eca1d58dfdbce832bdb565f82dc88a7a66c425c0e8728f09d'
assert setup['baselines']['main']['originalHasTest'] is False
assert setup['baselines']['historical']['originalHasTest'] is True
for label,b in setup['baselines'].items():
    archive = next(D.glob('prepare-timeout-*/p2q/'+label+'-source.tar'))
    assert sha(archive.read_bytes()) == b['sourceArchiveSha256']
    obs = json.loads((executions['timeout-'+label+'-3'][0].parent/'p2q/comparison-binding.json').read_bytes())
    for q,h in obs['after'].items(): assert sha((pathlib.Path(b['snapshot'])/q).read_bytes()) == h
    assert obs['baselineCommit'] == b['commit']
all_rows = []
for label,(p,x,log) in executions.items():
    all_rows.append({'label':label,'directory':str(p.parent),'head':x['head'],'exitCode':x['exitCode'],'executionSha256':sha(p.read_bytes()),'logSha256':x['logSha256'],'requiredGate':label in required})
latest_main = git('rev-parse','main').decode().strip()
record = {'verdict':'ACCEPT','testedHead':HEAD,'reviewedTip':TIP,'includedMain':MAIN,'frozenMainMerged':True,'latestMainObservedAtSeal':latest_main,'latestMainMerged':subprocess.run(['git','merge-base','--is-ancestor',latest_main,HEAD],cwd=R).returncode == 0,'checkedAtEpoch':time.time(),'closedFindings':['F1','F2','F3','B1 at frozen main'],'timeout':'The unchanged 5 s test times out on its historical GS12F runtime and the reviewed branch. Main lacks the original file/domain module and the transplanted workload fails on unsupported integers; literal same-file main timeout comparison is unavailable. The separate 30 s diagnostics do not replace the original FAIL, 38/39.','executions':summary,'allAttempts':all_rows,'sealerSha256':sha(pathlib.Path(__file__).read_bytes())}
(D/'review-tools').mkdir(exist_ok=True)
shutil.copyfile(__file__, D/'review-tools/seal.py')
for name,ref in [('main',MAIN),('historical',setup['historical']),('reviewed',HEAD)]:
    (D/'review-tools'/f'{name}-pnpm-workspace.yaml').write_bytes(git('show',ref+':pnpm-workspace.yaml'))
    if name != 'main':
        (D/'review-tools'/f'{name}-value-domains.test.ts').write_bytes(git('show',ref+':'+setup['testPath']))
assert git('show',MAIN+':pnpm-workspace.yaml') == git('show',setup['historical']+':pnpm-workspace.yaml') == git('show',HEAD+':pnpm-workspace.yaml')
files = [f for f in sorted(D.rglob('*')) if f.is_file() and not f.is_symlink()]
(E/'DURABLE-SHA256SUMS').write_text(''.join(sha(f.read_bytes())+'  '+str(f.relative_to(D))+'\n' for f in files))
record['durableFiles'] = len(files); record['durableBytes'] = sum(f.stat().st_size for f in files)
record['durableManifestSha256'] = sha((E/'DURABLE-SHA256SUMS').read_bytes())
(E/'SUMMARY.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:record[k] for k in ['verdict','testedHead','includedMain','durableFiles','durableBytes']}))

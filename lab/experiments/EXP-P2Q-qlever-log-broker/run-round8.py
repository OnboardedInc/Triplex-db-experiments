# [EXP-P2Q] Why: accept a gate only after fresh assertion content, exact source and heavy-slot ownership checks.
# Rejected: recording exit zero as PASS (does not prove any assertion ran or bind it to this attempt).
import hashlib, json, os, pathlib, shutil, subprocess, time, uuid
root = pathlib.Path.cwd()
experiment = root / 'lab/experiments/EXP-P2Q-qlever-log-broker'
name = os.environ.get('P2Q_ATTEMPT', 'final')
label = os.environ.get('P2Q_HEAVY_LABEL', 'CX-P2Q-R8-final')
out = experiment / 'evidence-round8' / name
out.mkdir(parents=True, exist_ok=False)
attempt_id = str(uuid.uuid4())
locks = pathlib.Path(os.environ.get('TX2_LOCKS_DIR', '/Users/sam/projects/triplex-db-2/lab/locks')) / 'heavy'
def slot():
    matches = []
    for path in locks.glob('*/owner.json'):
        try:
            raw = path.read_bytes(); owner = json.loads(raw)
        except FileNotFoundError:
            continue
        if owner['pid'] == os.getppid() and owner['label'] == label:
            matches.append({'path': str(path), 'owner': owner, 'sha256': hashlib.sha256(raw).hexdigest()})
    assert len(matches) == 1, matches
    return matches[0]
owner = slot()
files = subprocess.check_output(['git', 'ls-files', 'packages/qlever', 'packages/core/src', 'packages/core/test', 'lab/verify/P2Q', '.changeset/p2q-exact-journal-snapshot.md', 'lab/bin/heavy.mjs', 'lab/bin/heavy-lock.mjs', 'lab/bin/lib.mjs', 'pnpm-lock.yaml', 'package.json', 'vitest.workspace-aliases.ts', 'tsconfig.base.json', 'tsconfig.node.json'], text=True).splitlines()
files += ['lab/experiments/EXP-P2Q-qlever-log-broker/run-round8.py', 'lab/experiments/EXP-P2Q-qlever-log-broker/summarize-round8.py']
files += [str(p.relative_to(root)) for p in (root/'node_modules/.pnpm').glob('undici@*/node_modules/undici/lib/core/errors.js')]
files = sorted(set(f for f in files if '/evidence' not in f))
def hashes():
    return {f: hashlib.sha256((root/f).read_bytes()).hexdigest() for f in files}
env = os.environ.copy()
for key in ['QLEVER_COMMIT_PATH','QLEVER_INTEGRATION','V_P2Q_LIVE']:
    env.pop(key, None)
env.update(V_P2Q_RUNS=str(root/'runs/broker'/('CX-P2Q-R8-'+name+'-'+attempt_id)), V_P2Q_SEEDS='60', P2Q_ATTEMPT_ID=attempt_id)
verify = ['node_modules/.bin/vitest','run','--config','lab/verify/P2Q/vitest.config.ts']
tasks = [
 ('earlier-offline', verify+['tests/'+f+'.test.ts' for f in ['round4','round5','round5-delta','round6','round6-codes','round7-q89c','round7-q89c-empty','round7-basis']], 802),
 ('new-offline', verify+['tests/'+f+'.test.ts' for f in ['round8-basis','round8-pin-page-corrected','round8-policy','round8-history']], 12),
 ('foundation', verify+['tests/'+f+'.test.ts' for f in ['check1-durability','check1-lock-process','check2-ack','check3-outage-scale','check3-probe-load','check3-routing','check4-feed','check5-q31c','check6-a0-guard','q55c-native','round3']], 42),
 ('package', ['node_modules/.bin/vitest','run','--root','packages/qlever'], 224),
 ('core-focused', ['node_modules/.bin/vitest','run','--root','packages/core','test/runtime/read-basis.test.ts','test/kv/layers/KvTriples.store.test.ts','test/kv/layers/KvTriples.query.test.ts','--maxWorkers','1','--no-file-parallelism'], 28),
 ('qlever-typecheck', ['node_modules/.bin/tsc','--noEmit','-p','packages/qlever/tsconfig.json'], None),
 ('core-typecheck', ['node_modules/.bin/tsc','--noEmit','-p','packages/core/tsconfig.json'], None),
 ('new-live', verify+['tests/round8-basis.test.ts','tests/round8-pin-page-corrected.test.ts','tests/round8-history.test.ts','-t','round8 live'], 7),
 ('earlier-live', verify+['tests/round4.test.ts','tests/round7-basis.test.ts','-t','round4 live|round7 live'], 14),
]
results=[]
for gate, command, expected in tasks:
    disk_free=shutil.disk_usage(root).free
    assert disk_free >= 5*1024**3
    before = hashes(); started = time.time(); owned_before = slot(); assert owned_before == owner
    gate_out=out/gate
    runenv=env.copy();runenv['V_P2Q_OUT']=str(gate_out)
    if gate.endswith('-live'):
        runenv.update(V_P2Q_LIVE='1', QLEVER_INTEGRATION='1', QLEVER_URL='http://127.0.0.1:7070')
    report = out/(gate+'-vitest.json')
    is_test='vitest' in command[0]
    if is_test:
        command=command+['--reporter=default','--reporter=json','--outputFile.json='+str(report)]
    record=dict(attemptId=attempt_id, gate=gate, head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(), command=command,
                startedAt=started, hostFreeBytesBefore=disk_free, sourceHashes=before, heavySlot=owner, cwd=str(root), node=subprocess.check_output(['node','--version'],text=True).strip(),
                env={key:runenv.get(key) for key in ['V_P2Q_OUT','V_P2Q_RUNS','V_P2Q_SEEDS','V_P2Q_LIVE','QLEVER_INTEGRATION','QLEVER_URL','P2Q_ATTEMPT_ID']})
    print('START',gate,flush=True)
    log=out/(gate+'.log')
    with log.open('w') as stream:
        record['exitCode']=subprocess.call(command,env=runenv,stdout=stream,stderr=subprocess.STDOUT)
    finished=time.time()
    record.update(finishedAt=finished, sourceStillMatches=hashes()==before, heavySlotStillMatches=slot()==owner,
                  logSha256=hashlib.sha256(log.read_bytes()).hexdigest())
    content=False
    if is_test and report.exists():
        data=json.loads(report.read_text())
        cases=[case for suite in data['testResults'] for case in suite['assertionResults']]
        passed=sum(case['status']=='passed' for case in cases)
        content=data['success'] is True and data['numFailedTests']==0 and passed>0 and passed==data['numPassedTests'] and (expected is None or passed==expected)
        requested=[item for item in command if item.endswith('.test.ts')]
        if requested:
            content=content and len(data['testResults'])==len(requested) and all(any(suite['name'].endswith(file) for suite in data['testResults']) for file in requested)
        content=content and all(case['status'] in ['passed','pending','skipped','todo'] for case in cases)
        if gate in ['foundation','core-focused']:
            content=content and all(case['status']=='passed' for case in cases)
        expected_total={'earlier-offline':816,'new-offline':18,'foundation':42,'package':250,'core-focused':28,'new-live':14,'earlier-live':46}[gate]
        content=content and len(cases)==expected_total
        fresh=started <= data['startTime']/1000 <= finished and started <= report.stat().st_mtime <= finished
        record.update(vitestPassed=passed, vitestTotal=len(cases), expectedPassed=expected,
                      resultFresh=fresh, resultSha256=hashlib.sha256(report.read_bytes()).hexdigest())
    elif not is_test:
        content=log.read_bytes()==b''
        fresh=True
        record.update(resultFresh=True, expectedCompilerOutput='empty successful --noEmit diagnostics')
    else:
        fresh=False
        record.update(resultFresh=False)
    record['contentMatches']=bool(content)
    record['accepted']=record['exitCode']==0 and bool(content) and fresh and record['sourceStillMatches'] and record['heavySlotStillMatches']
    (out/(gate+'.json')).write_text(json.dumps(record,indent=2)+'\n')
    results.append(record['accepted'])
    print('END',gate,'exit='+str(record['exitCode']),'accepted='+str(record['accepted']),flush=True)
raise SystemExit(0 if all(results) else 1)

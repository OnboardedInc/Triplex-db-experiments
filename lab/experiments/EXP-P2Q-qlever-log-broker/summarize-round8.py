# [EXP-P2Q] Why: derive the final result from current source-bound assertions and raw content, not stored PASS flags.
# Rejected: trusting the runner's accepted/equal booleans or reusing an earlier attempt's outputs.
import hashlib, json, os, pathlib, time
root=pathlib.Path.cwd()
base=root/'lab/experiments/EXP-P2Q-qlever-log-broker/evidence-round8'
name=os.environ.get('P2Q_ATTEMPT','final'); out=base/name
labels=['earlier-offline','new-offline','foundation','package','core-focused','qlever-typecheck','core-typecheck','new-live','earlier-live']
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
receipts=[]; head=None; attempt=None; slot=None
for label in labels:
    r=json.loads((out/(label+'.json')).read_text())
    head=head or r['head']; attempt=attempt or r['attemptId']; slot=slot or r['heavySlot']
    assert r['head']==head and r['attemptId']==attempt and r['heavySlot']==slot
    assert r['env']['P2Q_ATTEMPT_ID']==attempt and r['env']['V_P2Q_OUT']==str(out/label)
    assert r['hostFreeBytesBefore']>=5*1024**3
    assert r['startedAt']<r['finishedAt'] and r['exitCode']==0 and r['accepted'] is True
    assert r['sourceStillMatches'] and r['heavySlotStillMatches'] and r['resultFresh'] and r['contentMatches']
    assert sha(out/(label+'.log'))==r['logSha256']
    for file,digest in r['sourceHashes'].items(): assert sha(root/file)==digest, file
    if 'resultSha256' in r:
        p=out/(label+'-vitest.json'); data=json.loads(p.read_text())
        cases=[c for suite in data['testResults'] for c in suite['assertionResults']]
        passed=sum(c['status']=='passed' for c in cases)
        assert sha(p)==r['resultSha256'] and data['success'] is True and data['numFailedTests']==0
        assert passed==data['numPassedTests']==r['vitestPassed'] and passed>0
        assert len(cases)==r['vitestTotal']
        assert all(c['status'] in ['passed','pending','skipped','todo'] for c in cases)
        if r['expectedPassed'] is not None: assert passed==r['expectedPassed']
        if label in ['foundation','core-focused']: assert passed==len(cases)
        assert r['startedAt'] <= data['startTime']/1000 <= r['finishedAt']
    else:
        assert (out/(label+'.log')).read_bytes()==b''
    if label.endswith('-live'): assert r['env']['QLEVER_URL']=='http://127.0.0.1:7070' and r['env']['V_P2Q_LIVE']=='1'
    receipts.append({k:r[k] for k in ['gate','head','exitCode','startedAt','finishedAt','sourceStillMatches','heavySlotStillMatches','contentMatches'] } | {'passed':r.get('vitestPassed'),'total':r.get('vitestTotal')})

def load(gate,file):
    path=out/gate/file; r=next(row for row in receipts if row['gate']==gate)
    assert r['startedAt'] <= path.stat().st_mtime <= r['finishedAt'], str(path)
    return json.loads(path.read_text())

def same(record):
    assert isinstance(record['before'],str) and record['before']==record['after'], record
    assert json.loads(record['before'])==json.loads(record['after'])

counts={'offlineSnapshotByteComparisons':0,'liveSnapshotByteComparisons':0,'futurePublicCases':0,'policyRouteChecks':0,'liveHttpCases':0}
for kind in ['overlay','log','replica']:
    rows=load('new-offline',f'round8-{kind}-immutable.json');assert len(rows)==12
    assert len({(r['route'],r['transaction']) for r in rows})==12
    for row in rows: same(row);counts['offlineSnapshotByteComparisons']+=1
for gate,kind in [('new-offline','model'),('new-live','live')]:
    rows=load(gate,f'round8-{kind}-implicit-pin.json'); assert {r['route'] for r in rows}=={'get','getById'}
    for row in rows: same(row)
    same(load(gate,f'round8-{kind}-entity-page.json'))
    counts['offlineSnapshotByteComparisons' if gate=='new-offline' else 'liveSnapshotByteComparisons']+=3
for kind in ['standard','fresh']:
    rows=load('new-live',f'round8-{kind}-immutable.json'); assert len(rows)==28
    assert len({(r['route'],r['transaction']) for r in rows})==28
    supported=0
    for row in rows:
        if row.get('supported') is False:
            assert row['route']=='queryAll' and row['transaction'] is True
            assert row['beforeError']['_tag']==row['error']['_tag']=='DatalogValidationError'
        else: same(row);supported+=1
    assert supported==27
    counts['liveSnapshotByteComparisons']+=supported
    journal=load('new-live',f'round8-{kind}-journal-immutable.json')
    same(journal); assert journal['before']==journal['transaction']
    assert [tx['position'] for tx in json.loads(journal['before'])['transactions']]==[journal['first']]
    assert journal['before']==journal['afterMetadata']==journal['transactionAfterMetadata']
    counts['liveSnapshotByteComparisons']+=4
for gate,kind,n in [('new-offline','offline',6),('new-live','standard',10),('new-live','fresh',10)]:
    rows=load(gate,f'round8-{kind}-public-future.json');assert len(rows)==n
    assert len({(r['route'],r['transaction']) for r in rows})==n
    for row in rows:
        error=row['error']; pin=row['pin']
        assert row['ok'] is False and error['_tag']=='ReadError' and error['reason']=='basis-not-reached'
        assert error['required']==row['future'] and error['observed']==(pin if row['transaction'] else pin+1023)
        assert error['replica']==('the transaction snapshot' if row['transaction'] else "the broker's resolved prefix")
        assert row['elapsedMs']>=39 and error['waitedMs']>=39
    counts['futurePublicCases']+=n
rows=load('new-offline','round8-policy-journal-future.json');assert len(rows)==4
for row in rows:
    error=row['error']; assert row['ok'] is False
    assert (error['reason'],error['required'],error['observed'])==('basis-not-reached',6144,2048 if row['transaction'] else 3071)
    assert error['replica']==('the transaction snapshot' if row['transaction'] else "the broker's resolved prefix")
    assert error['waitedMs']>=39
journal_control=load('new-offline','round8-journal-stable-page.json')
same(journal_control)
assert journal_control['queried']==journal_control['loaded']==[2048,2048]
cut_control=load('new-offline','round8-journal-cut-binding.json')
assert cut_control['calledPosition']==cut_control['error']['required']==6144
assert cut_control['error']['reason']=='basis-not-reached' and cut_control['error']['replica']=='test pin'
staged=load('new-offline','round8-policy-staged-mask.json')
assert staged['bytes']==staged['after'] and staged['history'][0]['retract_tx_id']=='pending'
coverage=load('new-offline','round8-policy-coverage.json');assert len(coverage)==48
assert len({(r['name'],r['transaction']) for r in coverage})==48
for row in coverage:
    assert row['checkedRequired']==row['expectedRequired']
    assert row['checkCalls']>0 and row['error']['replica']=='policy sentinel' and row['error']['reason']=='basis-not-reached'
counts['policyRouteChecks']=len(coverage)
for path in sorted((out/'earlier-live').glob('round4-live-*.json')):
    row=load('earlier-live',path.name);error=row['error']
    assert row['upstream']=='http://127.0.0.1:7070' and row['ok'] is False
    assert (error['reason'],error['required'],error['observed'],error['replica'])==('replica-unreachable',2048,4095,'the QLever replica')
    counts['liveHttpCases']+=1
assert counts['liveHttpCases']==12
summary=dict(attemptId=attempt,head=head,heavySlot=slot,gates=receipts,contentCounts=counts,
             accepted=True,scope='P2Q default-off correctness only; independent review pending',summarizedAt=time.time())
(base/'SUMMARY.json').write_text(json.dumps(summary,indent=2)+'\n')
manifest={str(p.relative_to(base)):sha(p) for p in sorted(base.rglob('*')) if p.is_file() and p.name!='MANIFEST.json'}
(base/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'head':head,'contentCounts':counts,'gates':[(r['gate'],r['passed']) for r in receipts],'accepted':True},indent=2))

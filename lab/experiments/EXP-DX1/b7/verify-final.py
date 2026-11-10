# [DX-B7-S4] Why: a union needs fresh completed exits, exact source bytes and the entire original scenario stream.
# Rejected: a successful process alone, a sampled denominator or adopting a different step's cache observations.
import hashlib,json,pathlib,re,sys
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7')
attempt=sys.argv[1] if len(sys.argv)>1 else 'c'
assert re.fullmatch(r'[a-z0-9-]+',attempt)
prefixes=['tx2-dxb7-step4-legacy-a',f'tx2-dxb7-step4-lean-{attempt}',f'tx2-dxb7-step4-diff-{attempt}','tx2-dxb7-step4-pull-c']
captures={}
for prefix in prefixes:
    cleanup=json.loads((root/f'{prefix}-cleanup.json').read_text())
    assert cleanup['prefix']==prefix and cleanup['childExitCode']==0 and cleanup['inventoryEmpty']
    assert cleanup['heldSeconds']<=900
    capture=json.loads((root/f'{prefix}-source/CAPTURE.json').read_text())['files']
    selected={p:v['sha256'] for p,v in capture.items() if p.startswith(('packages/core/','packages/datomic/'))}
    for p,h in selected.items():
        assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h,(prefix,p)
    captures[prefix]=selected
assert all(v==next(iter(captures.values())) for v in captures.values())
for prefix in prefixes[:2]:
    log=(root/f'{prefix}.log').read_text()
    assert re.search(r'Test Files\s+6 passed \(6\)',log),prefix
    assert re.search(r'Tests\s+21 passed \(21\)',log),prefix
    proxy=json.loads((root/f'{prefix}-proxy.json').read_text());assert proxy['peakConnections']<=64
prefix=prefixes[2];ranges=[]
for first in [0,100,200]:
    assert (root/f'{prefix}-diff-{first}.exit-code').read_text().strip()=='0'
    log=(root/f'{prefix}-diff-{first}.log').read_text()
    assert re.search(r'Tests\s+2 passed \(2\)',log)
    rows=[json.loads(line) for line in log.splitlines() if line.startswith('{"firstScenario":')]
    assert len(rows)==1
    row=rows[0];assert row['firstScenario']==first and row['scenarios']==100
    assert row['drawsPerScenario']==121 and row['randomDraws']==121*(first+100)
    assert row['fast']>0 and row['rowClosures']==row['fast']
    if ranges:assert row['inputRandomState']==ranges[-1]['finalRandomState']
    ranges.append(row)
assert ranges[0]['inputRandomState']==428278297 and ranges[-1]['finalRandomState']==-1699957524
assert sum(x['comparisons'] for x in ranges)==95028
cache=json.loads((root/f'{prefix}-diff-stats.json').read_text())['entityCache']
assert cache['verify'] and cache['hits']>0 and cache['revisionHits']>0
assert cache['verified']>=cache['hits']+cache['revisionHits']
assert cache['verificationErrors']==0 and cache['bytes']<=cache['budgetBytes']
for prefix in prefixes[1:]:
    assert json.loads((root/f'{prefix}-environment.json').read_text())['keepAwake']
    for suffix in ['keep-awake-status.txt','keep-awake-final-status.txt']:
        lines=(root/f'{prefix}-{suffix}').read_text().splitlines();assert lines[0]=='running 8'
        assert json.loads(lines[1])['onePerCpu']
    assert 'remaining 0' in (root/f'{prefix}-keep-awake-stop.txt').read_text()
load=json.loads((root/f'{prefixes[3]}/driver/pull-load.json').read_text())
mixed=json.loads((root/f'{prefixes[3]}/driver/mixed.json').read_text())
samples=[x for phase in load['phases'].values() for x in phase['samples']]
samples+=mixed['phases']['readPoisson']['readers']['samples']
for sample in samples:
    d=sample['diagnostics'];assert d['declines']=={} and d['faults']==0 and d['fullRetries']==0
for phase in mixed['phases'].values():
    assert phase['rows'] and all(r['position'] is not None and r['delivered'] is not None for r in phase['rows'])
    assert len({r['txId'] for r in phase['rows']})==len(phase['rows'])
result={'purpose':'source-bound developer diagnostic gates; no acceptance promotion','prefixes':prefixes,'scenarios':300,
        'ranges':ranges,'entityCache':cache,'packageSourceSha256':captures[prefixes[0]],'loadSamples':sum(len(s['times']) for s in samples)}
(root/'step4-gate-union.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'scenarios':300,'comparisons':95028,'cache':cache,'sourceFiles':len(result['packageSourceSha256'])}))

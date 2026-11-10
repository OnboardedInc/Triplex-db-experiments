# [DX-B9-A] Why: compare both repeat ranges, retaining overlap as inconclusive.
# Rejected: choosing the fastest sample or borrowing historical cells.
import json,pathlib,sys,hashlib
root=pathlib.Path(sys.argv[1]); rows=[]
exit_info=json.loads((root/'exit.json').read_text())
assert exit_info['exit']==0 and exit_info['heldSeconds']<=1200, 'failed or overlong hold cannot qualify a comparison'
warm_reference=None
source_by_arm={}; container_ids=set()
stage=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else None
assert (root/'driver-before.sha256').read_bytes()==(root/'driver-after.sha256').read_bytes(), 'driver drift during hold'
if stage is not None:
    for line in (root/'driver-before.sha256').read_text().splitlines():
        digest,name=line.split(maxsplit=1)
        assert hashlib.sha256((stage/'source'/name.strip()).read_bytes()).hexdigest()==digest, ('driver preimage mismatch',name)
for arm in ['A1','B1','A2','B2']:
    files=list((root/arm).glob('tx2-*/driver/pull-load.json'))
    assert len(files)==1,(arm,files)
    p=files[0]; report=json.loads(p.read_text())
    assert report['arm']==arm and report['keepAwake'] is False
    assert int(report['headAfterFill']['position']['v'])>=50000
    stacks=list((root/arm).glob('tx2-*/stack.json'))
    assert len(stacks)==1
    stack=json.loads(stacks[0].read_text())
    manifest=stacks[0].parent/'gateway-files.json'
    assert hashlib.sha256(manifest.read_bytes()).hexdigest()==stack['gatewaySourceSha256']
    source=json.loads(manifest.read_text());letter=arm[0]
    if letter in source_by_arm:assert source==source_by_arm[letter], 'repeat gateway source drift'
    else:source_by_arm[letter]=source
    if stage is not None:
        for name,digest in source.items():assert hashlib.sha256((stage/letter/name).read_bytes()).hexdigest()==digest,(arm,name,'captured source mismatch')
    assert len(stack['containers'])==4 and len({c['id'] for c in stack['containers']})==4
    ids={c['id'] for c in stack['containers']};assert not container_ids.intersection(ids), 'reused stack identity'
    container_ids.update(ids)
    if 'warmAnswers' in report:
        actual=report['warmAnswers']
        assert len(actual)==4 and all(x['answers']==2000 and x['bytes']>0 for x in actual)
        if warm_reference is None:warm_reference=actual
        else:assert actual==warm_reference, 'changed warm SDK answer bytes' 
    assert all(c['name'].startswith('tx2-dxb9-') for c in stack['containers'])
    for name,phase in report['phases'].items():
        assert phase['latency']['n']>0
        rows.append(dict(arm=arm,phase=name,pullsPerSecond=phase['pullsPerSecond'],readP50=phase['latency']['p50'],readP99=phase['latency']['p99'],gatewayCores=phase['readGatewayCores'],pullsPerCpuSecond=phase['latency']['n']/phase['readGatewayCpuSeconds'],keepAwake=False,source=stack['gatewaySourceSha256']))
    mixed=p.parent/'mixed.json'
    if mixed.exists():
        for name,phase in json.loads(mixed.read_text())['phases'].items():
            assert phase['commit']['n']>0
            r=dict(arm=arm,phase=name,commitP50=phase['commit']['p50'],commitP99=phase['commit']['p99'],commits=phase['commit']['n'],keepAwake=False,source=stack['gatewaySourceSha256'])
            if phase.get('readGatewayCpuSeconds') is not None:
                r['gatewayCores']=phase['readGatewayCpuSeconds']/30
            if phase.get('readers'):
                d=phase['readers']; seconds=30
                r.update(pullsPerSecond=d['pullsPerSecond'],readP50=d['latency']['p50'],readP99=d['latency']['p99'],gatewayCores=phase['readGatewayCpuSeconds']/seconds,pullsPerCpuSecond=d['latency']['n']/phase['readGatewayCpuSeconds'])
            rows.append(r)
comparisons=[]
for phase in sorted({r['phase'] for r in rows}):
    cells=[r for r in rows if r['phase']==phase]
    assert len(cells)==4
    for metric in ['pullsPerSecond','readP99','pullsPerCpuSecond','commitP50','commitP99']:
        if metric not in cells[0]:continue
        a=[r[metric] for r in cells if r['arm'].startswith('A')]; b=[r[metric] for r in cells if r['arm'].startswith('B')]
        direction='higher' if metric in ['pullsPerSecond','pullsPerCpuSecond'] else 'lower'
        relation='overlap'
        if max(b)<min(a):relation='B-lower'
        if min(b)>max(a):relation='B-higher'
        comparisons.append(dict(phase=phase,metric=metric,A=[min(a),max(a)],B=[min(b),max(b)],relation=relation,better=direction))
print(json.dumps({'classification':'diagnostic-not-acceptance','holdOutcome':exit_info,'rows':rows,'comparisons':comparisons},indent=2))

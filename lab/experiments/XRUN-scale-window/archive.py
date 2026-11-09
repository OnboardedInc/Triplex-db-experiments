# [CX-XRUN] Why: retain and read back the exact receipt object closure durably. Rejected: git-adding bulky raw logs.
import pathlib, json, hashlib, shutil
root=pathlib.Path.cwd()
out=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-XRUN')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
paths=['lab/runs/G1/G1-xtdb-20261109T033339Z-61d306.json','lab/runs/G2/G2-xtdb-20261109T033820Z-12808b.json','lab/runs/G1/G1-xtdb-20261109T034051Z-ab5e08.json']
checks=[]
for rel in paths:
    p=root/rel;r=json.loads(p.read_text());raw=root/r['rawDir']
    shutil.copytree(raw,out/r['rawDir'],dirs_exist_ok=True)
    target=out/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
    for obj in r['objects']:
        if not obj.get('sha256'): continue
        src=root/'runs/objects'/obj['sha256']
        assert digest(src)==obj['sha256'],str(src)
        target=out/'runs/objects'/src.name;target.parent.mkdir(parents=True,exist_ok=True)
        if not target.exists(): shutil.copy2(src,target)
        assert digest(target)==obj['sha256']
    report=json.loads((raw/(r['gate'].lower()+'-report.json')).read_text())
    c=r['counts'];assert r['verdict']=='PASS' and c['fail']==0 and c['skip']==0
    assert c['executed']==(88 if r['gate']=='G1' else 142)
    if r['gate']=='G1':
        assert len(report['executions'])==88 and all(e['status']=='PASS' for e in report['executions'])
        assert report['suite']['status']=='PASS' and report['endpoint']==r['engine']['endpoint']
    else:
        cases=[c for w in report['workloads'] for c in w['cases']]
        assert len(cases)==142 and all(c['status']=='PASS' for c in cases)
        assert r['readPathEngineWrites']['writes']==0 and r['readPathEngineWrites']['unparsed']==0
    assert r['git']['diffBytes']==0 and not r['git']['modifiedFiles'] and not r['git']['untrackedFiles']
    assert r['git']['head']=='e90c15846a7fb0b93f7d4debdef3dcb76a4f24d4'
    label='CX-XRUN-J01-G1' if r['runId'].endswith('ab5e08') else 'CX-XRUN-XC-'+r['gate']
    envelope=json.loads((out/(label+'-launch.json')).read_text());outcome=json.loads((out/(label+'-outcome.json')).read_text())
    assert outcome['outcome']['code']==0 and outcome['launch']['sha256']==digest(out/(label+'-launch.json'))
    assert envelope['before']['at']<=r['startedAt']<=r['endedAt']<=outcome['after']['at']
    assert envelope['before']['container']['Id']==r['engine']['containerId']==outcome['after']['container']['Id']
    assert envelope['before']['ownerSha256']==r['engine']['ownerSha256']==outcome['after']['ownerSha256']
    assert outcome['links'][0]['sha256']==digest(p)
    assert sorted(c['name'] for c in outcome['after']['residentSet'])==['tx2-qlever-dev','tx2-xtdb-dev','tx2-xtdb-s1']
    checks.append({'receipt':rel,'sha256':digest(p),'counts':c,'rawReportSha256':digest(raw/(r['gate'].lower()+'-report.json')),'slot':r['slot'],'containerId':r['engine']['containerId'],'volume':r['engine']['effectiveConfig']['volume'],'volumeBytes':r['volumeBytes'],'environment':envelope['env'],'sourceTreeId':r['git']['sourceTreeId'],'objectReferencesChecked':len(r['objects'])})
(out/'archive-audit.json').write_text(json.dumps({'checks':checks,'modeCollectorExit':1,'modeQualified':False},indent=2)+'\n')
files=sorted(p for p in out.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
(out/'SHA256SUMS').write_text(''.join(f'{digest(p)}  {p.relative_to(out)}\n' for p in files))
print(json.dumps({'receipts':len(checks),'files':len(files),'bytes':sum(p.stat().st_size for p in files)}))

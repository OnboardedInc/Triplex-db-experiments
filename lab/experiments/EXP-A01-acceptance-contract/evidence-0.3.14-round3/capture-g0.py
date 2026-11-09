"""Capture exact G0 raw/object/build preimages; byte retention never grants engine acceptance."""
import hashlib,json,pathlib,shutil,sys,time
R=pathlib.Path(__file__).resolve().parents[4]
E=pathlib.Path(__file__).resolve().parent
lane,rid=sys.argv[1:]
snap=json.loads((E/'source-and-hashes.json').read_text())
p=R/'lab/runs/G0'/f'{rid}.json';x=json.loads(p.read_text())
assert x['lane']==lane and x['gate']=='G0' and x['runId']==rid
assert x['experiment']=='CX-A01-0314-R3' and x['git']['head']==snap['testedSource']
assert x['slot'] is None and x['git']['diffBytes']==0
assert not x['git']['modifiedFiles'] and not x['git']['untrackedFiles']
D=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-0314/round3/g0')/rid
D.mkdir(parents=True,exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
records=[]
def save(relative,b,expected=None):
    assert expected is None or sha(b)==expected,relative
    out=D/relative;assert out.is_relative_to(D)
    out.parent.mkdir(parents=True,exist_ok=True)
    if out.exists():assert out.read_bytes()==b,relative
    else:
        with out.open('xb') as f:f.write(b)
    assert out.read_bytes()==b,relative
    records.append({'path':relative,'bytes':len(b),'sha256':sha(b)})
save('receipt.json',p.read_bytes())
raw=R/x['rawDir'];assert raw==R/'runs/G0'/rid
for f in sorted(raw.rglob('*')):
    if f.is_file():save('raw/'+str(f.relative_to(raw)),f.read_bytes())
for o in x['objects']:
    b=(R/'runs/objects'/o['sha256']).read_bytes();assert len(b)==o['bytes'],o['path'];save('objects/'+o['sha256'],b,o['sha256'])
m=json.loads((R/x['build']['manifest']).read_text());assert sha((R/x['build']['manifest']).read_bytes())==x['build']['manifestSha256']
built=0
for name,pkg in m['packages'].items():
    assert pkg['files']==len(pkg['list']) and pkg['bytes']==sum(f['bytes'] for f in pkg['list'])
    assert sha(''.join(f['sha256']+'  '+f['path']+'\n' for f in pkg['list']).encode())==pkg['sha256']
    assert x['build']['packages'][name]['sha256']==pkg['sha256']
    for f in pkg['list']:
        source=R/f['path'];assert source.resolve().is_relative_to(R)
        b=source.read_bytes();assert len(b)==f['bytes'],f['path'];save('build/'+f['path'],b,f['sha256']);built+=1
records=list({f['path']:f for f in records}.values())
manifest=''.join(f['sha256']+'  '+f['path']+'\n' for f in sorted(records,key=lambda f:f['path']))
(D/'SHA256SUMS').write_text(manifest)
summary={'runId':rid,'lane':lane,'source':snap['testedSource'],'verdict':x['verdict'],'counts':x['counts'],'previous':x['previous'],'capturedAtEpoch':time.time(),'durableRoot':str(D),'files':len(records),'bytes':sum(f['bytes'] for f in records),'builtFiles':built,'objects':len(x['objects']),'manifestSha256':sha(manifest.encode()),'sourceDiffBytes':x['git']['diffBytes'],'slot':x['slot'],'startedAt':x['startedAt'],'endedAt':x['endedAt']}
(E/f'G0-{lane}-capture.json').write_text(json.dumps(summary,indent=2)+'\n')
(E/f'G0-{lane}-SHA256SUMS').write_text(manifest)
shutil.copyfile(p,E/f'G0-{lane}-receipt.json')
print(json.dumps(summary))

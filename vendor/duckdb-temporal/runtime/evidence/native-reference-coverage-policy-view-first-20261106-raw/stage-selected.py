from pathlib import Path
import datetime, hashlib, json, os, subprocess
ROOT=Path(__file__).resolve().parents[2]
QUAL=Path(__file__).resolve().parent
INPUT=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/qualification-reference-coverage-20261106-01/stage-before-first.json')
COMMIT='d1e5e30d64d2c5fdaf8efbd06694cd04ad5cefe2'
PREFIX='projects/temporal-datalog/runtime/'
CHANGED={'native/catalog.sql'}
def sha(data): return hashlib.sha256(data).hexdigest()
def digest(path): return sha(Path(path).read_bytes())
def save(path,value):
    with Path(path).open('x') as f: json.dump(value,f,indent=2);f.write('\n')
d=json.loads(INPUT.read_text());source=Path(d['dependencySource'])
assert not (ROOT/'node_modules').exists(), 'fresh node_modules required'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==COMMIT
assert not subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()
assert len(d['dependencies'])==395 and len(d['sourcePins'])==43
assert [len(d['external'][k]) for k in ('routes','selectedEntries','headers')]==[5,7,36]
sourcePins={};different=set()
for name,old in d['sourcePins'].items():
    actual=digest(ROOT/name)
    committed=sha(subprocess.check_output(['git','show',COMMIT+':'+PREFIX+name],cwd=ROOT))
    assert actual==committed, ('source Git mismatch',name)
    sourcePins[name]=actual
    if actual!=old: different.add(name)
assert different==CHANGED, ('unexpected source changes',different)
for name,expected in d['dependencies'].items():
    p=Path(name);assert p.parts[0]=='node_modules' and '..' not in p.parts
    assert digest(source/name)==expected, ('dependency mismatch',name)
for entry in d['external']['selectedEntries'].values():
    assert digest(entry['resolved'])==entry['sha256'], ('external mismatch',entry['resolved'])
for entry in d['external']['headers'].values():
    assert digest(entry['file'])==entry['sha256'], ('header mismatch',entry['file'])
assert digest(d['node']['file'])==d['node']['sha256']
for name,route in d['external']['routes'].items():
    assert str(Path(route['literalTarget']).resolve(strict=True))==route['resolvedTarget']
(ROOT/'node_modules').mkdir()
for name,expected in d['dependencies'].items():
    target=ROOT/name;target.parent.mkdir(parents=True,exist_ok=True)
    data=(source/name).read_bytes();assert sha(data)==expected
    with target.open('xb') as f: f.write(data)
    target.chmod((source/name).stat().st_mode & 0o777)
    assert digest(target)==expected, ('copied mismatch',name)
for name,route in d['external']['routes'].items():
    target=ROOT/'node_modules'/name;target.parent.mkdir(parents=True,exist_ok=True)
    target.symlink_to(route['literalTarget'])
    assert os.readlink(target)==route['literalTarget']
    assert str(target.resolve(strict=True))==route['resolvedTarget']
for name,entry in d['external']['selectedEntries'].items():
    assert (ROOT/'node_modules'/name).resolve(strict=True)==Path(entry['resolved'])
report={**d,'schema':'td.reference-coverage-policy-view-stage/1','createdAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'sourceCommit':COMMIT,'originalMapSha256':digest(INPUT),'originalMap':str(INPUT),'sourcePins':sourcePins,
 'sourceGitExact':True,'approvedChangedSources':sorted(CHANGED),'stagingHelperSha256':digest(__file__),
 'scope':'Fresh typed-policy-view native build. Copied only395 selected dependencies;5 read-only routes;7 refs/36 headers/Node verified. No old native artifacts, adapters, headers or databases copied.'}
save(QUAL/'stage-before-first.json',report)
print(json.dumps({'status':'PASS','source':COMMIT,'dependencies':395,'routes':5,'refs':7,'headers':36,'sourcePins':43,'reportSha256':digest(QUAL/'stage-before-first.json')}))

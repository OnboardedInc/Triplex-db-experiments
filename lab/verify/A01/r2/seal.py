"""[CX-VA01-040-R2] Why: adopt fresh content-bound results and seal only closed logs.
Rejected: counting builder summaries as independent execution or hashing live stdout.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess as sp

R = Path(__file__).resolve().parents[4]
E = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040/r2')
V = R / 'lab/verify/A01/evidence-0.4.0-r2'
assert shutil.disk_usage(R).free >= 5 * 1024**3
V.mkdir(exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads((E / p).read_text())
head = sp.check_output(['git', 'rev-parse', 'HEAD'], cwd=R, text=True).strip()
assert head == '8fd292918694f31eb970312ee600c8dad3d1b84a'
assert not sp.check_output(['git', 'diff', '35cb04b5', 'HEAD', '--', '.', ':(exclude)lab/verify/A01'], cwd=R)
records = {}
for label in ['verify', 'evaluator', 'tests', 'mutations', 'audit-attempt2', 'fresh-g0']:
    r = read(label + '.json')
    assert r['head'] == head and r['exitCode'] == 0 and r['inputsUnchanged'] and r['trackedDiffEmpty']
    assert sha((E / (label + '.log')).read_bytes()) == r['logSha256']
    assert r['heavy']['owner']['label'] == 'CX-VA01-040-r2-' + label
    assert sha((E / (label + '-heavy-owner.json')).read_bytes()) == r['heavy']['sha256']
    assert sha((E / 'tools' / (r['toolSha256'] + '.py')).read_bytes()) == r['toolSha256']
    for p, digest in r['inputs'].items(): assert sha((R / p).read_bytes()) == digest, p
    records[label] = {k: v for k, v in r.items() if k != 'inputs'}
tap = (E / 'evaluator.log').read_text()
counts = {k: int(v) for k, v in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$', tap, re.M)}
assert counts == {'tests':108, 'pass':108, 'fail':0, 'cancelled':0, 'skipped':0, 'todo':0}
assert 'second regeneration byte-identical' in (E / 'verify.log').read_text()
assert 'Ran 16 tests' in (E / 'tests.log').read_text() and (E / 'tests.log').read_text().rstrip().endswith('OK')
mutants = read('mutation-results.json')
assert len(mutants) == 7 and all(m['caught'] and m['expectedReason'] in m['stdout'] and m['exitCode'] != 0 for m in mutants)
history = read('history-audit.json')
assert not history['badSemanticReferences'] and not history['reusedDefectiveReceipts']
assert len(history['historicalGateReceipts']) == 8 and len(history['evidenceInputsAuthoredInInterval']) == 13
doc = json.loads((R / 'lab/acceptance/obligations.json').read_text())
assert {s for o in doc['obligations'] for s in o['status'].values()} == {'OPEN'}
assert doc['buildSpec']['argv'] is None
empty = read('w0-empty-before.json')
assert empty['head'] == head and empty['files'] == []
rid, = re.findall(r'raw output runs/G0/(G0-[\w-]+)', (E / 'fresh-g0.log').read_text())
p = R / 'lab/runs/G0' / (rid + '.json')
gate = json.loads(p.read_text())
assert gate['experiment'] == 'CX-VA01-040-R2' and gate['git']['head'] == head
assert gate['verdict'] == 'PASS' and not gate['reasons'] and gate['slot'] is None
assert gate['git']['diffBytes'] == 0 and gate['git']['modifiedFiles'] == []
assert gate['counts'] == {'executed':1289, 'pass':1289, 'fail':0, 'skip':140, 'expectedSkip':140, 'unexpectedSkip':0}
assert all(s['code'] == 0 for s in gate['steps'])
assert gate['build']['packages']['w0']['files'] == 52
assert gate['contract']['sha256'] == sha((R / 'lab/acceptance/obligations.json').read_bytes())
stamp = lambda s: dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
assert stamp(empty['at']) < stamp(gate['startedAt']) < stamp(gate['endedAt']) <= stamp(records['fresh-g0']['endedAt'])
grants = [s['parentGrant'] for s in gate['steps'] if 'parentGrant' in s]
assert len(grants) == 9 and all(g['owner']['label'] == 'CX-VA01-040-r2-fresh-g0' for g in grants)
for obj in gate['objects']:
    original = R / 'runs/objects' / obj['sha256']
    raw = original.read_bytes()
    assert sha(raw) == obj['sha256'] and len(raw) == obj['bytes']
    target = E / 'gate/runs/objects' / obj['sha256']
    target.parent.mkdir(parents=True, exist_ok=True)
    # [CX-VA01-040-R2] Why: repeated content addresses share read-only evidence.
    # Rejected: overwriting immutable copies merely because a receipt lists them twice.
    if target.exists(): assert target.read_bytes() == raw
    else: shutil.copy2(original, target)
shutil.copytree(R / gate['rawDir'], E / 'gate' / gate['rawDir'])
shutil.copy2(p, E / (rid + '.json'))
shutil.copy2(p, V / p.name)
assert p.read_bytes() == (V / p.name).read_bytes() == (E / p.name).read_bytes()
manifest = json.loads((R / gate['build']['manifest']).read_text())
for entry in manifest['packages']['w0']['list']:
    source = R / entry['path']
    assert sha(source.read_bytes()) == entry['sha256']
    target = E / 'w0-built' / entry['path']
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
builder_root = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/A01-040-R2')
builder_index = R / 'lab/experiments/EXP-A01-acceptance-contract/evidence-0.4.0/r2'
verified = 0
for line in (builder_index / 'SHA256SUMS').read_text().splitlines():
    digest, name = line.split('  ', 1)
    assert sha((builder_root / name).read_bytes()) == digest, name
    verified += 1
builder = []
for f in sorted(builder_index.glob('G0-*.json')):
    b = json.loads(f.read_text())
    assert b['git']['head'] == 'a2b1271f7c302368c5a9b0eb12f597f04f17184d' and b['verdict'] == 'PASS'
    assert b['build']['packages']['w0'] == gate['build']['packages']['w0']
    builder.append({'runId': b['runId'], 'counts': b['counts'], 'source': b['git']['head'], 'independentlyRerun': False})
summary = {'verdict':'ACCEPT', 'head':head, 'candidate':'35cb04b5', 'candidateProductBytesIdentical':True,
    'checkedAt':dt.datetime.now(dt.timezone.utc).isoformat(), 'commands':records, 'evaluator':counts,
    'contractTests':16, 'newMutationsRejected':7, 'freshG0':{'runId':rid,'counts':gate['counts'],'w0':gate['build']['packages']['w0'],'heavyParentGrants':len(grants)},
    'mainPendingRowsPreserved':100, 'compiledRulings':read('static-audit.json')['compiledExactly'],
    'history':{'unreferencedOldGateReceipts':8,'stillPinnedProvenanceFiles':13,'badSemanticCommitReferences':0,'reusedOldGateReceipts':0,'allObligationStatuses':'OPEN'},
    'builderManifestFilesVerified':verified, 'builderGatesReadOnly':builder,
    'scope':'independent fix verification and one fresh offline G0; no live or performance qualification'}
(E / 'artifact-audit.json').write_text(json.dumps(summary,indent=2)+'\n')
for name in ['artifact-audit.json','history-audit.json','static-audit.json','mutation-results.json','w0-empty-before.json']:
    shutil.copy2(E / name, V / name)
shutil.copy2(Path(__file__), E / 'seal.py')
shutil.copy2(R / 'lab/verify/A01/r2/review.py', E / 'review-final.py')
entries = [(str(f.relative_to(E)), sha(f.read_bytes()), f.stat().st_size) for f in sorted(E.rglob('*')) if f.is_file()]
payload = ''.join(h+'  '+p+'\n' for p,h,_ in entries).encode()
(V/'SHA256SUMS').write_bytes(payload)
for path,digest,size in entries: assert sha((E/path).read_bytes()) == digest and (E/path).stat().st_size == size
small = {'files':len(entries),'bytes':sum(size for _,_,size in entries),'manifestSha256':sha(payload),'allEntriesReread':True}
(V/'manifest-summary.json').write_text(json.dumps(small,indent=2)+'\n')
p.unlink()
print(json.dumps(small))

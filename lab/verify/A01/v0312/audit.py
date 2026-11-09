"""Independent exact-row, source-pin and registry-provenance audit."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import runpy
import subprocess
HERE = Path(__file__).resolve().parent
ROOT = HERE / 'scratch'
ACC = ROOT / 'lab/acceptance'
def git(*a): return subprocess.check_output(['git', *a], cwd=ROOT)
def digest(b): return hashlib.sha256(b).hexdigest()
def rows(b):
    return [(re.match(rb'^\| (Q\d+[a-z]?)\b', x)[1].decode(), x.decode()) for x in b.splitlines() if re.match(rb'^\| (Q\d+[a-z]?)\b', x)]
m = runpy.run_path(str(ACC / 'build_contract.py'))
d = json.loads((ACC / 'obligations.json').read_bytes())
expected = {'Q72'+x for x in 'abcdeg'} | {'Q79e','Q79f','Q87'} | {'Q80'+x for x in 'abc'} | {'Q82'+x for x in 'abcde'} | {'Q83'+x for x in 'abcde'} | {'Q84'+x for x in 'abcde'} | {'Q85'+x for x in 'abcd'} | {'Q86'+x for x in 'abcdef'}
assert set(m['RULES_0312']) == expected and len(expected) == 37
before = rows(git('show','3aaac6eb:lab/acceptance/RULINGS-PENDING.md'))
after = rows((ACC/'RULINGS.md').read_bytes())
latest_before = rows(git('show','95db6153:lab/acceptance/RULINGS-PENDING.md'))
records = []
for rid in sorted(expected):
    raw = [r for k,r in before if k == rid]
    assert len(raw) == 1 and [r for k,r in after if k == rid] == raw == [r for k,r in latest_before if k == rid], rid
    text = raw[0]
    match = re.match(r'^\| (Q\d+[a-z]?)\b([^|]*)\| (.*?) \| (.*?) \|$', text)
    literal = {'topic':match[2].strip(),'rule':match[3],'basis':match[4]}
    dest = m['RULE_TARGETS_0312'][rid[:3]][0]
    assert d[dest][rid] == literal, rid
    records.append({'id':rid,'sourceRow':text,'generatedConsumer':dest,'literalEqual':True})
pending_before = Counter((k,r) for k,r in rows(git('show','95db6153:lab/acceptance/RULINGS-PENDING.md')) if k not in expected)
pending_after = Counter(rows((ACC/'RULINGS-PENDING.md').read_bytes()))
assert pending_before == pending_after
pending_ids = sorted({k for k,r in pending_after})
assert {'Q78e','Q86g',*('Q88'+x for x in 'abc'),*('Q89'+x for x in 'abcdefgh')} <= set(pending_ids)
assert not set(pending_ids) & {r['id'] for r in d['rulings']}
# [CX-VA01-0312] Why: duplicate pending IDs must survive; a dict silently discards one Q78e source row. Rejected: comparing only unique IDs.
assert sum(n for (k,r),n in pending_after.items() if k=='Q78e') == 2
pin = d['oraclePins']['O-OBS']
manifest = dict(line.split('  ',1)[::-1] for line in (ACC/'pins/O-OBS-23e2273-SHA256SUMS').read_text().splitlines())
assert manifest == pin['sha256'] and set(manifest) == set(d['oracleRunners']['O-OBS']['files']) and len(manifest)==30
pins = []
for path,h in manifest.items():
    ref = pin['commit'] if path.endswith('/observe.py') else pin['dependencies']['O-REPLAY']
    assert digest(git('show',f'{ref}:{path}')) == h == digest((ROOT/path).read_bytes()), path
    pins.append({'path':path,'sourceCommit':ref,'sha256':h})
merge = '4b7b37002ab75ed77b247e18a6137a82f8b8eb1c'
parents = git('show','-s','--format=%P',merge).decode().strip().split()
assert len(parents)==2 and parents[1]==pin['commit']
for ref in (parents[0],merge):
    b=json.loads(git('show',f'{ref}:lab/acceptance/obligations.json'))['oraclePins'].get('O-OBS')
    if ref==parents[0]: assert b is None or b.get('commit') != pin['commit']
    else: assert b['commit']==pin['commit']
assert digest(git('show',merge+':lab/acceptance/oracle/observe.py')) == pin['sha256']['lab/acceptance/oracle/observe.py']
for path in ('lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs'):
    cur=(ROOT/path).read_bytes()
    cur=b'\n'.join(x for x in cur.split(b'\n') if not x.startswith(b'// [EXP-A01-0312] Why:'))
    assert cur.replace(b', maxBuffer: 8 << 20',b'') == git('show',f'3aaac6eb:{path}')
e=d['verifierRegistry']['entries']['V-O05-round4']
brief=(ROOT/e['brief']).read_bytes()
assert digest(brief)==e['briefSha256']
assert brief==git('show',e['commit']+':lab/verify/O05/VERIFY-round4.md')
brief_paths=[x for x in git('ls-tree','-r','--name-only',e['commit'],'--','lab/verify/O05').decode().splitlines() if re.search(r'brief|prompt|instructions',x,re.I)]
assert not brief_paths
out={'rulings':records,'pendingIds':pending_ids,'pendingRowCount':sum(pending_after.values()),'duplicateQ78eCount':2,
     'runnerHashes':pins,'atomicMerge':{'commit':merge,'parents':parents,'pinMovedWithOracle':True},
     'evaluatorAssertionsUnchanged':True,'brief':{'entry':e,'actualFileIsReview':True,'savedInstructionPaths':brief_paths,
     'q59cRow':next(r for k,r in after if k=='Q59c'),'compliant':False}}
(HERE/'audit.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
print('37 literal consumers exact; 19 pending rows (18 IDs) preserved; 30 source hashes match; atomic pin merge; assertions unchanged; Q59c instructions absent')

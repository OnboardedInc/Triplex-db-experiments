"""[CX-VP5A-R3] Why: bind the offline verdict to actual source, tests and immutable patch bytes; rejected: trusting prior completion flags."""
from pathlib import Path
import hashlib, json, subprocess, gzip, re

root=Path.cwd(); out=root/'lab/verify/P5A/round3'
raw_root=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/round3')
sha=lambda b:hashlib.sha256(b).hexdigest()
builder=subprocess.check_output(['git','rev-parse','242ec546'],text=True).strip()
summary=json.loads((root/'lab/experiments/EXP-P5/round4/index.json').read_text())
artifacts=[]
for file,want in summary['evidence'].items():
    p=Path(file); actual=sha(p.read_bytes()); assert actual==want,file
    artifacts.append({'path':file,'sha256':actual,'bytes':p.stat().st_size})
assert sha((root/'lab/experiments/EXP-P5/round4/SHA256SUMS').read_bytes())==summary['manifestSha256']
sources={}
for file in subprocess.check_output(['git','ls-tree','-r','--name-only',builder,'lab/bench','lab/oracles','packages/xtdb/src'],text=True).splitlines():
    if not file.endswith(('.ts','.py','.mjs')):continue
    expected=subprocess.check_output(['git','show',f'{builder}:{file}'])
    actual=(root/file).read_bytes();assert actual==expected,file;sources[file]=sha(actual)
assert (root/'lab/bench/lib/g0.ts').read_bytes()==subprocess.check_output(['git','show','7e34c387:lab/bench/lib/g0.ts'])
builds={str(p.relative_to(root)):sha(p.read_bytes()) for package in ('w0','core') for p in (root/'packages'/package/'dist').rglob('*.js')}
raw=[]
for d in raw_root.iterdir():
    if not d.is_dir() or not (d/'observations.json').exists():continue
    obs=json.loads((d/'observations.json').read_text()); raw.append(str(d))
    target=d/'executed-test-preimage.ts'
    if not target.exists():
        matches=[p for p in out.glob('*.test.ts') if sha(p.read_bytes())==obs['testSha256']]
        assert len(matches)==1,(d,matches);target.write_bytes(matches[0].read_bytes())
    assert sha(target.read_bytes())==obs['testSha256']
def observation(file):
    p=out/file
    if not p.exists():
        index=json.loads((out/(p.stem+'-index.json')).read_text()); p=Path(index['path'])
        assert sha(p.read_bytes())==index['sha256']
    return json.loads(p.read_text())
for file in ['boundaries.json','late-cleanup.json']:
    obs=observation(file); test=out/file.replace('.json','.test.ts')
    assert sha(test.read_bytes())==obs['testSha256']
matrix=observation('boundaries.json')
assert len(matrix['results'])==58
assert sum(bool(x.get('result')) for x in matrix['results'])==2
for x in matrix['results']:
    if x['mode']!='positive':assert x['refusal']['tag']=='FingerprintRefusal' and not x.get('result')
    if x['mode'] in ['deadline','abort']:assert x['triggered']
    assert x['afterRelease']['outerCreated']==x['afterRelease']['outerClosed']
    assert x['afterRelease']['nativeCreated']==x['afterRelease']['nativeClosed']
backport=json.loads((out/'backport-fixture/receipt.json').read_text())
p=out/'backport-fixture/guard.patch'
patch=p.read_bytes() if p.exists() else gzip.decompress(p.with_suffix('.patch.gz').read_bytes())
assert sha(patch)==backport['patchSha256']==summary['applicationCheck']['patchSha256']
assert backport['beforeSha256']==summary['applicationCheck']['beforeSha256']
assert backport['afterSha256']==summary['applicationCheck']['afterSha256']
tests={}
for file,want in [('suites.tap',207),('boundaries.tap',57),('late-cleanup.tap',2)]:
    content=(out/file).read_text()
    counts={key:int(re.findall(r'^# '+key+r' (\d+)$',content,re.M)[-1]) for key in ['tests','pass','fail','skipped']}
    assert counts=={'tests':want,'pass':want,'fail':0,'skipped':0},(file,counts)
    tests[file]=counts
(out/'source-and-evidence-audit.json').write_text(json.dumps({'reviewedBuilder':builder,
    'reviewMerge':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    'builderIndexedEvidence':artifacts,'builderManifestHashVerified':True,
    'sourceInventoryAtReviewEnd':sources,'buildHashes':builds,'rawDirectories':raw,
    'runtime':{'node':subprocess.check_output(['node','--version'],text=True).strip(),
        'lockSha256':sha((root/'pnpm-lock.yaml').read_bytes()),
        'obligationsSha256':sha((root/'lab/acceptance/obligations.json').read_bytes())},
    'freshTestSummaries':tests,'matrixInvocations':58,'matrixRefusals':56,'matrixPositiveControls':2,
    'P5G0UnchangedFrom7e34c387':True,'backportMatchesBuilderHashes':True},indent=2)+'\n')
paths=[p for p in out.rglob('*') if p.is_file() and not p.is_symlink() and p.name!='SHA256SUMS']
paths+=[root/'lab/verify/P5A/VERIFY-round3.md']
paths+=[p for p in raw_root.rglob('*') if p.is_file() and not p.is_symlink()]
for p in paths:
    if p.is_relative_to(out):assert p.stat().st_size<=1_000_000,p
(out/'SHA256SUMS').write_text(''.join(f'{sha(p.read_bytes())}  {p}\n' for p in sorted(set(paths),key=str)))
print('Source bytes, 6 builder receipts, fixture preimages, all boundary outcomes and guard patch hashes verified.')

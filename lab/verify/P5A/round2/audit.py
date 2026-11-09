"""[CX-VP5A-R2] Why: retain exact input/source hashes; rejected: adopting report status as a fresh test."""
from pathlib import Path
import hashlib, json, subprocess

root = Path.cwd()
out = root / 'lab/verify/P5A/round2'
sha = lambda b: hashlib.sha256(b).hexdigest()
head = subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
base = subprocess.check_output(['git','rev-parse','7e34c38'],text=True).strip()
summary = json.loads((root/'lab/experiments/EXP-P5/round3/index.json').read_text())
artifacts = []
for file, want in summary['evidence'].items():
    p=Path(file); got=sha(p.read_bytes()); assert got==want, file
    artifacts.append({'path':file,'sha256':got,'bytes':p.stat().st_size})
manifest=root/'lab/experiments/EXP-P5/round3/SHA256SUMS'
assert sha(manifest.read_bytes()) == summary['durableManifest']['sha256']
sources={}
for file in subprocess.check_output(['git','ls-tree','-r','--name-only',base,'lab/bench','lab/oracles','packages/xtdb/src'],text=True).splitlines():
    if not file.endswith(('.ts','.py','.mjs')): continue
    expected=subprocess.check_output(['git','show',f'{base}:{file}'])
    actual=(root/file).read_bytes(); assert actual==expected,file
    sources[file]=sha(actual)
builds={str(p.relative_to(root)):sha(p.read_bytes()) for package in ('w0','core') for p in (root/'packages'/package/'dist').rglob('*.js')}
k01={}
for name in ('g0.ts','g0-schema.ts','g0-values.ts','g0-normalize.ts','g0-wire.ts','g0-xtdb.ts'):
    b=subprocess.check_output(['git','show',f'245a496:lab/bench/lib/{name}'])
    current=(root/'lab/bench/lib'/name).read_bytes()
    k01[name]={'importedSha256':sha(b),'currentSha256':sha(current),'byteEqual':b==current}
raw=[]
raw_root=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/round2')
for d in raw_root.iterdir():
    if not d.is_dir() or not (d/'observations.json').exists(): continue
    raw.append(str(d))
    obs=json.loads((d/'observations.json').read_text())
    target=d/'executed-test-preimage.ts'
    if not target.exists():
        matches=[p for p in out.glob('*.test.ts') if sha(p.read_bytes())==obs['testSha256']]
        assert len(matches)==1,(d,matches)
        target.write_bytes(matches[0].read_bytes())
    assert sha(target.read_bytes())==obs['testSha256']
(out/'source-and-evidence-audit.json').write_text(json.dumps({'reviewHead':head,'reviewedBuilder':base,
    'indexedBuilderEvidence':artifacts,'manifestHashVerified':True,'sourceInventoryAtReviewEnd':sources,
    'currentBuildHashes':builds,'K01SelectedFiles':k01,'rawDirectories':raw},indent=2)+'\n')
print('Seven builder evidence hashes, manifest hash, reviewed source bytes and executed reviewer preimages match.')
manifest_paths=[p for p in out.rglob('*') if p.is_file() and not p.is_symlink() and p.name!='SHA256SUMS']
manifest_paths.append(root/'lab/verify/P5A/VERIFY-round2.md')
manifest_paths += [p for p in raw_root.rglob('*') if p.is_file() and not p.is_symlink()]
for p in manifest_paths:
    if p.is_relative_to(out): assert p.stat().st_size <= 1_000_000,p
(out/'SHA256SUMS').write_text(''.join(f'{sha(p.read_bytes())}  {p}\n' for p in sorted(set(manifest_paths),key=str)))

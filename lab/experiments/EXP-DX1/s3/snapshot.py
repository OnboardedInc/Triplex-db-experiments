#!/usr/bin/env python3
# [DX-S3] Why: retain the measured source/build bytes without dependencies or caches. Rejected: hashes alone with no preimages.
import pathlib,subprocess,hashlib,json,shutil
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3/source-build')
root.mkdir(parents=True,exist_ok=False)
paths=set(subprocess.check_output(['git','ls-files','packages/core','packages/datomic','packages/testkit','lab/bench/lib'],text=True).splitlines())
for package in ['core','datomic','testkit']:
    paths.update(str(p) for p in pathlib.Path('packages',package,'dist').rglob('*') if p.is_file())
paths.update(str(p) for p in pathlib.Path('lab/experiments/EXP-DX1/s3').glob('*') if p.is_file())
paths.add('lab/experiments/EXP-DX1/stack/up.sh')
hashes={}
for name in sorted(paths):
    p=pathlib.Path(name)
    if not p.is_file():continue
    dest=root/p;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
    hashes[name]=hashlib.sha256(p.read_bytes()).hexdigest()
(root/'files.json').write_text(json.dumps(hashes,indent=2))
(root/'head.txt').write_bytes(subprocess.check_output(['git','rev-parse','HEAD']))
print(len(hashes),'source/build files retained')

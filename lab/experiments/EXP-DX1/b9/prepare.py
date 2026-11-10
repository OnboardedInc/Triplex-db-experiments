# [DX-B9-A] Why: immutable preimages bind each gateway arm and the shared load generator.
# Rejected: measuring live source or resolving an abbreviated revision after execution.
import hashlib,json,pathlib,shutil,subprocess,sys
root=pathlib.Path.cwd(); out=pathlib.Path(sys.argv[1]); out.mkdir(parents=True,exist_ok=False)
for arm,rev in [('A','19f5422d'),('B','HEAD')]:
    revision=subprocess.check_output(['git','rev-parse',rev],text=True).strip()
    dest=out/arm; dest.mkdir()
    paths=subprocess.check_output(['git','ls-tree','-r','--name-only',revision,'packages/datomic/gateway'],text=True).splitlines()
    for name in paths:
        rel=pathlib.Path(name).relative_to('packages/datomic/gateway'); target=dest/rel
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(subprocess.check_output(['git','show',revision+':'+name]))
    (dest/'codec-spec.json').write_bytes(subprocess.check_output(['git','show',revision+':packages/datomic/src/codec-spec.json']))
    (out/(arm+'-revision.txt')).write_text(revision+'\n')
    if arm=='B' and '--working' in sys.argv[2:]:
        shutil.rmtree(dest); shutil.copytree(root/'packages/datomic/gateway',dest)
        shutil.copyfile(root/'packages/datomic/src/codec-spec.json',dest/'codec-spec.json')
        (out/(arm+'-revision.txt')).write_text(revision+' plus captured working-tree gateway bytes\n')
for name in ['packages/core/src','packages/core/dist','packages/datomic/src','packages/datomic/dist','packages/datomic/test','packages/w0/src','packages/w0/dist','packages/testkit/src','packages/testkit/dist','lab/oracles/replay','lab/oracles/domain','lab/experiments/EXP-DX1/b5','lab/bin','lab/experiments/EXP-DX1/b9','lab/experiments/EXP-DX1/b8','lab/experiments/EXP-DX1/stack','lab/bench/lib']:
    shutil.copytree(root/name,out/'source'/name)
for name in ['pnpm-lock.yaml','pnpm-workspace.yaml','package.json','vitest.workspace-aliases.ts','tsconfig.base.json']:
    if (root/name).exists():shutil.copyfile(root/name,out/'source'/name)
files={str(p.relative_to(out)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.rglob('*')) if p.is_file()}
(out/'CAPTURE.json').write_text(json.dumps(files,indent=2)+'\n')

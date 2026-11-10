# [DX-B6] Why: retain actual measured source/build preimages before execution, not only working-tree hashes.
# Rejected: retroactively labelling a later checkout as the execution source.
import pathlib,shutil,hashlib,json,sys,subprocess
root=pathlib.Path.cwd(); dest=pathlib.Path(sys.argv[1]);dest.mkdir(parents=True,exist_ok=False)
files=[]
for name in ['packages/core/src','packages/core/dist','packages/datomic/src','packages/datomic/dist','packages/datomic/gateway','packages/datomic/test','lab/experiments/EXP-DX1/b6','lab/experiments/EXP-DX1/b7']:
 for p in sorted((root/name).rglob('*')):
  if p.is_file():files.append(p)
files += [root/p for p in ['pnpm-lock.yaml','lab/bench/lib/commands.ts','lab/bench/lib/world.ts','lab/bench/lib/trace.ts','lab/bench/lib/rng.ts','lab/experiments/EXP-DX1/stack/up.sh','lab/experiments/EXP-DX1/stack/run-in-vm.sh','lab/experiments/EXP-DX1/b5/layout-setup.ts','vitest.workspace-aliases.ts'] if (root/p).exists()]
index={}
for p in files:
 rel=p.relative_to(root);target=dest/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target);index[str(rel)]={'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
(dest/'CAPTURE.json').write_text(json.dumps({'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':index},indent=2)+'\n')

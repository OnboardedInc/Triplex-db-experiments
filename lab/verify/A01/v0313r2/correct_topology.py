"""Reproduce the retained clone-topology correction without changing source bytes."""
from pathlib import Path
import json,subprocess
H=Path(__file__).resolve().parent;S=json.loads((H/'source.json').read_bytes());RAW=Path(S['raw']);R=H/'scratch';OLD=H/'failed-clone'
assert (R/'.git').is_dir() and not OLD.exists()
for p in list(RAW.glob('G0-xtdb*')):p.rename(p.with_name(p.name.replace('G0-xtdb','G0-xtdb-first',1)))
subprocess.run(['git','fetch','--no-tags','--no-write-fetch-head',str(R),S['testHead']],cwd=H.parents[3],check=True)
R.rename(OLD)
subprocess.run(['git','worktree','add','-b','verify/A01-0313-r2-snapshot',str(R),S['testHead']],cwd=H.parents[3],check=True)
# [CX-VA01-0313-R2] Why: preserve the installed dependency bytes at their original paths while restoring actual lab common-dir/store/lock derivation. Rejected: weakening the reviewed owned-store check or privately bypassing admission.
mods=[]
for parent in [OLD,*[p for p in (OLD/'packages').iterdir() if p.is_dir()]]:
 p=parent/'node_modules'
 if p.exists():
  dest=R/p.relative_to(OLD);assert not dest.exists();p.rename(dest);mods.append(str(dest.relative_to(R)))
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()==S['testHead']
assert subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=R,text=True).strip()==''
common=subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],cwd=R,text=True).strip()
assert common=='/Users/sam/projects/triplex-db-2/.git'
meta={'cause':'Normal clone MAIN derives clone-local store and locks; strict store refusal is expected. First G0 failed and is not qualified.','firstRunId':'G0-xtdb-20261109T041735Z-a76820','testHead':S['testHead'],'linkedCommonDir':common,'movedInstalledDependencyDirs':mods,'trackedSourceDiff':'empty','noReviewedFileChanged':True}
(H/'topology-correction.json').write_text(json.dumps(meta,indent=2)+'\n')

"""Retain the failed clone's exact observations before deleting only that private clone."""
import hashlib,json,shutil,subprocess
from pathlib import Path
H=Path(__file__).resolve().parent;S=json.loads((H/'source.json').read_bytes());RAW=Path(S['raw']);OLD=H/'failed-clone';tag='G0-xtdb-first'
g=json.loads((RAW/(tag+'-receipt.json')).read_bytes());assert g['verdict']=='FAIL' and g['counts']['fail']==1
original=OLD/'runs/G0'/g['runId'];copied=RAW/(tag+'-raw');n=0
for p in original.rglob('*'):
 if p.is_file():assert p.read_bytes()==(copied/p.relative_to(original)).read_bytes();n+=1
for o in g['objects']:
 data=(RAW/(tag+'-objects')/o['sha256']).read_bytes();assert len(data)==o['bytes'] and hashlib.sha256(data).hexdigest()==o['sha256']
proof={'runId':g['runId'],'verdict':g['verdict'],'counts':g['counts'],'rawFilesMatched':n,'immutableObjectsMatched':len(g['objects']),'sourceHead':g['git']['head'],'trackedDiff':subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=OLD,text=True),'oldCloneRemovedAfterCapture':True,'excludedFromAcceptedGates':True}
assert proof['trackedDiff']==''
(RAW/'first-G0-failure-retention.json').write_text(json.dumps(proof,indent=2)+'\n')
# [CX-VA01-0313-R2] Why: keep the real failure and immutable bytes while removing only the known clone whose topology was wrong. Rejected: adopting its test counts as a qualified shared-admission result.
assert OLD.parent==H and (OLD/'.git').is_dir();shutil.rmtree(OLD)

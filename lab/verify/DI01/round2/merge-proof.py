"""[CX-VDI01-R2] Why: compare the actual three Git blobs, not the merge report.
Rejected: accepting an asserted additive conflict resolution without byte equality.
"""
import subprocess,hashlib,json,pathlib,datetime
rows=[]
for p in ['packages/host/src/feed/ConsumerStore.ts','packages/host/src/feed/index.ts']:
    hashes={ref:hashlib.sha256(subprocess.check_output(['git','show',ref+':'+p])).hexdigest() for ref in ['aa34513a','13949e3a','HEAD']}
    assert len(set(hashes.values()))==1
    rows.append(dict(path=p,hashes=hashes))
changed=subprocess.check_output(['git','diff','--name-only','aa34513a','13949e3a','--','packages','lab/bench','lab/scenarios'],text=True)
assert not changed
fix_paths=subprocess.check_output(['git','diff','--name-only','aa34513a','HEAD','--','packages','lab/bench','lab/scenarios','pnpm-lock.yaml'],text=True).splitlines()
assert fix_paths==['lab/bench/di01-refusal.test.ts','lab/bench/lib/di01-refs.ts']
assert not subprocess.check_output(['git','diff','e09c2ff4','HEAD','--','lab/acceptance'],text=True)
proof=dict(head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),conflictFiles=rows,mergeCodeDeltaFromReviewerResolution=[],round2CodePaths=fix_paths,acceptanceDeltaFromAcceptedMain=False,pinsMoved=[],scriptSha256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),observed=datetime.datetime.now(datetime.timezone.utc).isoformat())
pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/round2-review/merge-proof-recipe.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof))

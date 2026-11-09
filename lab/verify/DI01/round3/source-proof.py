"""[CX-VDI01-R3] Why: bind the merged review to actual committed code and unchanged contract pins.
Rejected: relying on the builder's report of which implementation files changed.
"""
import pathlib,hashlib,subprocess,json,datetime
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/round3-review')
sha=lambda b:hashlib.sha256(b).hexdigest()
assert not subprocess.check_output(['git','diff','b256d60c','HEAD','--','packages','lab/bench','lab/scenarios','lab/acceptance'],text=True)
assert not subprocess.check_output(['git','diff','HEAD','--','packages','lab/bench','lab/acceptance'],text=True)
assert not subprocess.check_output(['git','diff','e09c2ff4','HEAD','--','lab/acceptance'],text=True)
paths=subprocess.check_output(['git','diff','--name-only','b040f16b','HEAD','--','packages','lab/bench','lab/scenarios','pnpm-lock.yaml'],text=True).splitlines()
assert paths==['lab/bench/di01-refusal.test.ts','lab/bench/di01.test.ts','lab/bench/lib/di01-refs.ts','packages/host/src/feed/DependencyIndex.ts']
acceptance=''.join(p.read_text(errors='replace') for p in pathlib.Path('lab/acceptance').rglob('*') if p.is_file())
changes=[]
for p in paths:
    raw=pathlib.Path(p).read_bytes(); committed=subprocess.check_output(['git','show','HEAD:'+p]);assert raw==committed
    (root/'source'/sha(raw)).write_bytes(raw)
    changes.append(dict(path=p,oldSha256=sha(subprocess.check_output(['git','show','b040f16b:'+p])),newSha256=sha(raw),mentionedInAcceptance=p in acceptance))
assert not any(r['mentionedInAcceptance'] for r in changes)
unchanged={}
for p in ['packages/host/src/feed/ConsumerStore.ts','packages/host/src/feed/index.ts']:
    hashes={r:sha(subprocess.check_output(['git','show',r+':'+p])) for r in ['aa34513a','HEAD']};assert len(set(hashes.values()))==1;unchanged[p]=hashes
proof=dict(head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),target='b256d60c',codeDeltaFromTarget=[],changesSinceRound2=changes,unchangedConflictFiles=unchanged,pinsMoved=[],acceptanceChanged=False,scriptSha256=sha(pathlib.Path(__file__).read_bytes()),observed=datetime.datetime.now(datetime.timezone.utc).isoformat())
(root/'source-proof.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))

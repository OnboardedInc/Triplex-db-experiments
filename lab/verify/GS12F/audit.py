# [CX-VGS12F] Why: intersect direct published pins with actual branch changes, not the builder's inventory.
# Rejected: trusting the report's one-row list without inspecting obligations.json.
import hashlib, json, pathlib, subprocess
out = pathlib.Path('lab/verify/GS12F/evidence')
def git(*args): return subprocess.check_output(['git', *args])
def sha(b): return hashlib.sha256(b).hexdigest()
base, head, main = (git('rev-parse', x).decode().strip() for x in ['8d098718', '5610572', 'main'])
changed = git('diff', '--name-only', base, head).decode().splitlines()
contract = json.loads(git('show', head+':lab/acceptance/obligations.json'))
pins = {}
def walk(v):
    if isinstance(v, dict):
        if isinstance(v.get('path'), str) and isinstance(v.get('sha256'), str): pins[v['path']] = v['sha256']
        for k,w in v.items():
            if isinstance(w,str) and len(w)==64 and '/' in k: pins[k] = w
            walk(w)
    elif isinstance(v,list):
        for w in v: walk(w)
walk(contract)
rows=[]
for p in sorted(set(changed) & pins.keys()):
    old = sha(git('show',base+':'+p)); new = sha(git('show',head+':'+p))
    rows.append(dict(path=p,baseSha256=old,headSha256=new,pinnedSha256=pins[p],matchesPublishedPin=new==pins[p],mainSha256=sha(git('show',main+':'+p))))
acceptance_diff=git('diff',main,head,'--','lab/acceptance/').decode()
report=git('show',head+':lab/experiments/EXP-GS12F/REPORT.md').decode()
result=dict(base=base,head=head,main=main,acceptanceEqualsMain=not acceptance_diff,changedPins=rows,allChangedPinPathsMentionedInReport=all(r['path'] in report for r in rows))
(out/'contract-audit.json').write_text(json.dumps(result,indent=2)+'\n')
# Source preimages are immutable Git blobs; live files must equal them before reviewer tests run.
paths=[p for p in git('ls-files').decode().splitlines() if p.startswith(('packages/core/src/', 'packages/xtdb/src/', 'packages/qlever/src/')) or p in ['pnpm-lock.yaml','vitest.workspace-aliases.ts','packages/testkit/src/valueLimits.ts','packages/core/test/value-limits.test.ts','packages/qlever/test/value-limits-offline.test.ts','packages/xtdb/test/value-limits.test.ts']]
files={p:sha(pathlib.Path(p).read_bytes()) for p in paths}
assert all(sha(git('show',head+':'+p))==h for p,h in files.items()), 'review target drift'
for p in pathlib.Path('lab/verify/GS12F').glob('*'):
    if p.is_file(): files[str(p)]=sha(p.read_bytes())
(out/'execution-sources.json').write_text(json.dumps(dict(head=head,files=files),indent=2)+'\n')
print(json.dumps(result,indent=2))

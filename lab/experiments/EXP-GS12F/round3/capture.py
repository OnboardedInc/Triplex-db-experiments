# [EXP-GS12F-R3] Why: bind a fresh offline attempt to exact local source bytes and pinned preimages.
# Rejected: promoting historical engine logs or rewriting the acceptance contract.
import hashlib, json, pathlib, subprocess, sys, time
root = pathlib.Path('.')
output = pathlib.Path(sys.argv[1])
def git(*args): return subprocess.check_output(['git',*args])
def sha(data): return hashlib.sha256(data).hexdigest()
changed = set(git('diff','--name-only','5610572e').decode().splitlines())
changed.update(git('ls-files','--others','--exclude-standard').decode().splitlines())
sources = sorted(p for p in changed if not p.startswith('lab/experiments/EXP-GS12F/round3/evidence/') and p != 'lab/experiments/EXP-GS12F/REPORT.md' and pathlib.Path(p).is_file())
rows = []
for path in sources:
    try: old = sha(git('show','8d098718:'+path))
    except subprocess.CalledProcessError: old = None
    rows.append({'path':path,'oldBase8d098718':old,'currentSha256':sha(pathlib.Path(path).read_bytes())})
assert not git('diff','5610572e','--','lab/acceptance/'), 'unexpected acceptance edit'
for original, name in [('adversarial.test.ts.original.txt','adversarial.test.ts'),('controls.test.ts.original.txt','controls.test.ts')]:
    assert pathlib.Path('lab/experiments/EXP-GS12F/round3/'+original).read_bytes() == git('show','6bab84e:lab/verify/GS12F/'+name), 'review probe copy changed'
obligations=json.loads(pathlib.Path('lab/acceptance/obligations.json').read_text())
pins=[]
def visit(node):
    if isinstance(node,dict):
        if 'path' in node and isinstance(node['path'],str):
            hashes={k:v for k,v in node.items() if isinstance(v,str) and len(v)==64 and all(c in '0123456789abcdef' for c in v)}
            if hashes and pathlib.Path(node['path']).is_file():
                current=sha(pathlib.Path(node['path']).read_bytes())
                for key,old in hashes.items():
                    if current!=old: pins.append({'path':node['path'],'publishedSha256':old,'currentSha256':current,'hashField':key})
        for k,v in node.items():
            if isinstance(v,str) and len(v)==64 and pathlib.Path(k).is_file():
                current=sha(pathlib.Path(k).read_bytes())
                if current!=v: pins.append({'path':k,'publishedSha256':v,'currentSha256':current,'hashField':'inputs'})
            visit(v)
    elif isinstance(node,list):
        for v in node: visit(v)
visit(obligations)
unique={ (p['path'],p['publishedSha256']):p for p in pins }
output.write_text(json.dumps({'startedAtUnix':time.time(),'baseHead':git('rev-parse','HEAD').decode().strip(),'reviewCommit':'6bab84e','offlineOnly':True,'physicalSlot':None,'sourceFiles':rows,'publishedPinDrift':list(unique.values()),'acceptanceUnchangedSinceRound2':True},indent=2)+'\n')

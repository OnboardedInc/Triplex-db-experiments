#!/usr/bin/env python3
"""Read back complete immutable attempts before indexing offline qualification."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT=Path(__file__).resolve().parents[4]
DEST=Path(__file__).resolve().parent
EVIDENCE=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/ER01-S-round3')
REVIEW=Path('/Users/sam/projects/triplex-db-2/.claude/worktrees/verify-er01s/lab/verify/ER01-S')
def sha(raw):return hashlib.sha256(raw).hexdigest()

def main():
    if shutil.disk_usage(ROOT).free<5*1024**3:raise RuntimeError('disk floor')
    readbacks=[]
    for name in ('diagnostic01','diagnostic02','final01'):
        directory=EVIDENCE/name;manifest=(directory/'SHA256SUMS').read_bytes();seen=set();size=0
        for line in manifest.decode().splitlines():
            pin,relative=line.split('  ',1);p=(directory/relative).resolve()
            assert p.is_relative_to(directory) and p not in seen
            seen.add(p);raw=p.read_bytes();assert sha(raw)==pin,relative;size+=len(raw)
        assert seen=={p.resolve() for p in directory.rglob('*') if p.is_file() and p!=directory/'SHA256SUMS'}
        result=json.loads((directory/'RESULT.json').read_bytes())
        assert result['status']==('FAILED' if name=='diagnostic01' else 'PASS')
        readbacks.append({'path':str(directory),'status':result['status'],'files':len(seen),'bytes':size,'manifestSha256':sha(manifest)})
    final=EVIDENCE/'final01';result=json.loads((final/'RESULT.json').read_bytes());moves=[]
    for relative,pin in result['sourceSha256'].items():
        path=ROOT/'lab/observer/erasure'/relative
        assert sha(path.read_bytes())==pin,relative
        assert sha((final/'source'/relative).read_bytes())==pin
        old=subprocess.run(['git','show','4750d83:'+str(path.relative_to(ROOT))],cwd=ROOT,capture_output=True)
        old_pin=sha(old.stdout) if old.returncode==0 else None
        if old_pin!=pin:moves.append({'path':str(path.relative_to(ROOT)),'oldSha256':old_pin,'newSha256':pin})
    for path in (ROOT/'lab/observer/erasure/qa_round2').iterdir():
        src=REVIEW/path.name if path.name=='VERIFY-round2.md' else REVIEW/'round2'/path.name
        assert path.read_bytes()==src.read_bytes(),path.name
    summary=json.loads((final/'qa-14/summary.json').read_bytes())
    assert len(summary['scenarios'])==14
    index={'format':'er01-s-round3-index/1','baseCommit':'4750d83b64d8b098ea0cad41dd47893e1a6fab26',
        'reviewCommit':'b816ae2','finalRun':str(final),'manifestSha256':readbacks[-1]['manifestSha256'],
        'status':'PASS','claim':'offline fixture qualification only; no live engine erasure acceptance',
        'unitTests':35,'historicalScenarios':45,'secondBlockFsstControl':True,'readbacks':readbacks,
        'sourcePinMovements':moves,'reviewScenarios':[{'group':r['group'],'name':r['name'],'status':r['status']} for r in summary['scenarios']]}
    (DEST/'INDEX.json').write_text(json.dumps(index,sort_keys=True)+'\n')
    lines=[r['manifestSha256']+'  '+r['path']+'/SHA256SUMS' for r in readbacks]
    for name in ('INDEX.json','retain.py'):lines.append(sha((DEST/name).read_bytes())+'  '+str((DEST/name).relative_to(ROOT)))
    (DEST/'SHA256SUMS').write_text('\n'.join(lines)+'\n')
    report=ROOT/'lab/experiments/EXP-ER01-S/REPORT.md'
    with report.open('a') as stream:
        stream.write('\n### Round 3 final receipt and pin movements (9b/9c)\n\n')
        stream.write('Final `final01`: **PASS**, 8 format + 27 scanner tests, 31 previous + 14 new historical cases, second-block FSST control. Complete readback: '+str(readbacks[-1]['files'])+' files, '+str(readbacks[-1]['bytes'])+' bytes. Manifest SHA256 `'+readbacks[-1]['manifestSha256']+'`. [Index](round3/INDEX.json), [checksums](round3/SHA256SUMS), [readback tool](round3/retain.py). Bulky raw files are only in `'+str(EVIDENCE)+'`; all three attempts remain retained.\n\n')
        stream.write('No acceptance file/contract version changed; searches of both worktree and main acceptance directories found no explicit pin to a modified erasure path. The evaluator source pins below move from `4750d83`; historical parsers/preimages remain unchanged, with newly compiled parsers in new paths.\n\n| Path | Old SHA256 | New SHA256 |\n| --- | --- | --- |\n')
        for move in moves:stream.write('| `'+move['path']+'` | '+('`'+move['oldSha256']+'`' if move['oldSha256'] else 'new path')+' | `'+move['newSha256']+'` |\n')
    print(json.dumps({'status':index['status'],'final':readbacks[-1],'sourcePinMovements':len(moves)},sort_keys=True))
if __name__=='__main__':main()

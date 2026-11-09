"""Replay all additional pinned round-three reviewer CLI cohorts, read-only."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile

HERE=Path(__file__).resolve().parent
REVIEW='a036359'
BASE='lab/verify/O05/round3'

def sha(data): return hashlib.sha256(data).hexdigest()

def main():
    revision=subprocess.check_output(['git','rev-parse',REVIEW],text=True).strip()
    paths=[BASE+'/'+group for group in ('general-evidence','context-evidence','coverage-evidence')]
    paths+=['lab/verify/O05/round2/normalize.py','lab/acceptance/obligations.json']
    archive=subprocess.check_output(['git','archive',revision,*paths])
    results=[]
    with tempfile.TemporaryDirectory(prefix='obs-r4-review-') as tmp:
        snapshot=Path(tmp).resolve()
        with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
            for entry in tar:
                if not entry.isfile(): continue
                dest=(snapshot/entry.name).resolve()
                if not dest.is_relative_to(snapshot): raise ValueError('external archive path')
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(tar.extractfile(entry).read())
        for group in ('general-evidence','context-evidence','coverage-evidence'):
            root=snapshot/BASE/group
            rows=json.loads((root/'results.json').read_bytes()) if group=='general-evidence' else json.loads((root/'summary.json').read_bytes())['results']
            for row in rows:
                oldroot=row['command'][3].removesuffix('/lab/acceptance/oracle/observe.py')
                args=[str(snapshot)+arg[len(oldroot):] if arg.startswith(oldroot+'/') else arg for arg in row['command'][4:]]
                directory=Path(args[2]).parent
                retained={p.name:sha(p.read_bytes()) for p in directory.glob('*.json')}
                context=Path(args[args.index('--context')+1])
                # [EXP-O05-R4] Why: preserve malformed input bytes while relocating the retained parser. Rejected: decoding and repairing contexts before evaluation.
                alias=directory/'relocated-context.json'
                alias.write_bytes(context.read_bytes().replace((oldroot+'/').encode(),(str(snapshot)+'/').encode()))
                args[args.index('--context')+1]=str(alias)
                proc=subprocess.run([sys.executable,'-I','-B',str(HERE/'observe.py'),*args],capture_output=True,text=True,timeout=30)
                try: report=json.loads(proc.stdout)
                except ValueError: report=dict(verdict='CRASH',reasons=[proc.stdout,proc.stderr])
                expected=row['expected']
                ok=(proc.returncode==0 and report['verdict']=='PASS') if expected=='PASS' else (
                    proc.returncode in (1,2) and report['verdict'] in ('FAIL','REFUSED'))
                if group=='context-evidence':
                    ok=ok and proc.returncode==2 and any('obligation does not select O-OBS' in reason for reason in report['reasons'])
                intended=row.get('expectedReason')
                guard=intended is None or any(intended in reason for reason in report['reasons'])
                if group=='coverage-evidence':
                    reason={'original':'cover uncertain','cadence-only':'cover uncertain','last-edge-only':'coverage gap'}.get(row['id'])
                    guard=reason is None or any(reason in r for r in report['reasons'])
                stable=all(sha((directory/name).read_bytes())==digest for name,digest in retained.items())
                results.append(dict(id=row['id'],group=group,expected=expected,code=proc.returncode,
                                    ok=ok and guard and stable,intendedGuard=guard,inputStable=stable,result=report,
                                    retainedInputSha256=retained,path=str(directory.relative_to(snapshot))))
    report=dict(reviewRevision=revision,archiveSha256=sha(archive),total=len(results),passed=sum(r['ok'] for r in results),results=results)
    print(json.dumps(report,sort_keys=True))
    return 0 if report['passed']==report['total'] else 1

if __name__=='__main__': sys.exit(main())

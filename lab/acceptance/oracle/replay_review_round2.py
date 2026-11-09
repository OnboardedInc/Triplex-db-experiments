"""Read-only replay of the pinned review's retained inputs against the current CLI."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile

HERE = Path(__file__).resolve().parent
REVIEW = 'fc4cfb6'
PREFIX = 'lab/verify/O05/round2'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    revision = subprocess.check_output(['git','rev-parse',REVIEW], text=True).strip()
    archive = subprocess.check_output(['git','archive',revision,PREFIX])
    results = []
    with tempfile.TemporaryDirectory(prefix='obs-r3-review-') as tmp:
        snapshot = Path(tmp).resolve()
        with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
            for entry in tar:
                if not entry.isfile(): continue
                dest = (snapshot/entry.name).resolve()
                if not dest.is_relative_to(snapshot): raise ValueError('external archive path')
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(tar.extractfile(entry).read())
        root = snapshot/PREFIX
        rows = json.loads((root/'evidence/results.json').read_bytes()) + json.loads((root/'supplement-evidence/results.json').read_bytes())
        for row in rows:
            directory = root/row['path']
            original = {p.name:sha(p.read_bytes()) for p in directory.glob('*.json')}
            protocol = row['result']['protocol']
            cmd = [sys.executable,'-I','-B',str(HERE/'observe.py'),'check',protocol,str(directory/'evidence.json'),
                   '--contract',str(directory/'contract.json')]
            if row.get('group') != 'legacy':
                # [EXP-O05-R3] Why: relocate local paths without decoding or repairing intentionally malformed contexts. Rejected: indexing context.streams (missing-context cases must reach the CLI).
                original_prefix = row['command'][3].split('/'+PREFIX+'/subject/')[0] + '/' + PREFIX + '/'
                context_bytes = (directory/'context.json').read_bytes().replace(original_prefix.encode(), (str(root)+'/').encode())
                relocated = directory/'relocated-context.json'
                relocated.write_bytes(context_bytes)
                cmd += ['--context',str(relocated),'--bundle',str(directory/'bundle'),'--key-file',str(directory/'run.key')]
            proc = subprocess.run(cmd,capture_output=True,text=True,timeout=30)
            try: report = json.loads(proc.stdout)
            except ValueError: report = {'verdict':'CRASH','reasons':[proc.stdout,proc.stderr]}
            expected = row['expected']
            # [EXP-O05-R3] Why: this old drain-positive also has 1000 ms sample gaps with 1 ms independent uncertainty and no endpoint slack. Rejected: assuming undeclared clock correlation.
            tightened = row['id'] == 'CANCEL/clock-margin-positive'
            if tightened: expected = 'REJECT'
            ok = (proc.returncode == 0 and report['verdict']=='PASS') if expected == 'PASS' else (
                proc.returncode in (1,2) and report['verdict'] in ('FAIL','REFUSED'))
            if row.get('group') == 'legacy': ok = proc.returncode == 2 and report['verdict']=='REFUSED'
            results.append(dict(id=row['id'],path=row['path'],group=row.get('group','supplement'),
                                expected=expected,reviewExpected=row['expected'],tightenedTiming=tightened,
                                code=proc.returncode,ok=ok,result=report,retainedInputSha256=original))
    report = dict(reviewRevision=revision,archiveSha256=sha(archive),total=len(results),
                  passed=sum(r['ok'] for r in results),results=results)
    print(json.dumps(report,sort_keys=True))
    return 0 if report['passed']==report['total'] else 1

if __name__ == '__main__': sys.exit(main())

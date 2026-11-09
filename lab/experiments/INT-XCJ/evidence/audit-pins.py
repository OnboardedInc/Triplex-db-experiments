"""Compare generated contract pins without writing authoritative contract artifacts."""
import difflib
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

label = sys.argv[1]
output = Path('lab/experiments/INT-XCJ/evidence') / label
output.mkdir(exist_ok=False)
spec = importlib.util.spec_from_file_location('contract', 'lab/acceptance/build_contract.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
parent = subprocess.check_output(['git', 'rev-parse', 'HEAD^'], text=True).strip()

def differences(a, b, at=''):
    if type(a) is not type(b): return [{'pointer': at, 'before': a, 'after': b}]
    if isinstance(a, dict):
        return [d for k in sorted(a.keys() | b.keys()) for d in differences(a.get(k), b.get(k), at + '/' + str(k))]
    if isinstance(a, list) and len(a) == len(b):
        return [d for i, (x, y) in enumerate(zip(a, b)) for d in differences(x, y, at + '/' + str(i))]
    return [] if a == b else [{'pointer': at, 'before': a, 'after': b}]

def pin_records(value, at=''):
    out = []
    if isinstance(value, dict):
        if isinstance(value.get('path'), str) and isinstance(value.get('sha256'), str):
            p = Path(value['path'])
            if p.is_file(): out.append({'pointer': at, 'path': str(p), 'pinnedSha256': value['sha256']})
        for k,v in value.items():
            if isinstance(v, str) and len(v) == 64 and Path(k).is_file():
                out.append({'pointer': at+'/'+k, 'path': k, 'pinnedSha256': v})
            out.extend(pin_records(v, at+'/'+k))
    elif isinstance(value, list):
        for i,v in enumerate(value): out.extend(pin_records(v, at+'/'+str(i)))
    return out

def trace(frame, event, arg):
    if frame.f_code.co_name == 'main' and event == 'line' and 'outputs' in frame.f_locals:
        sys.settrace(None)
        changes = {}
        for name, generated in frame.f_locals['outputs']:
            original = (module.HERE / name).read_text()
            if original != generated:
                (output / (name+'.diff')).write_text(''.join(difflib.unified_diff(original.splitlines(True), generated.splitlines(True), fromfile='committed/'+name, tofile='generated/'+name)))
                if name == 'obligations.json': changes = differences(json.loads(original), json.loads(generated))
        pinned = pin_records(json.loads((module.HERE/'obligations.json').read_text()))
        changed = []
        for r in pinned:
            r['actualSha256'] = hashlib.sha256(Path(r['path']).read_bytes()).hexdigest()
            if r['actualSha256'] != r['pinnedSha256']:
                try: prior = subprocess.check_output(['git','show',parent+':'+r['path']])
                except subprocess.CalledProcessError: prior = b''
                r['parentSha256'] = hashlib.sha256(prior).hexdigest()
                changed.append(r)
        (output/'audit.json').write_text(json.dumps({'head':head,'parent':parent,'generatedDifferences':changes,'changedPinOccurrences':changed},indent=2)+'\n')
        for p in sorted({r['path'] for r in changed}):
            diff = subprocess.check_output(['git','diff','e4864683',head,'--',p],text=True)
            (output/(p.replace('/','__')+'.diff')).write_text(diff)
        print('Changed pinned files:', ', '.join(sorted({r['path'] for r in changed})))
        return None
    return trace
sys.argv = ['build_contract.py','--verify']
sys.settrace(trace)
module.main()

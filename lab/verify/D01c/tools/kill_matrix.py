"""V-D01c: run the proposed cases against the unmutated oracle (BASE) and every mutant copy. python3 -I.
usage: kill_matrix.py <repo worktree> <V-D01c out dir>  -> <out>/kills.json"""
import json
import os
import subprocess
import sys

repo, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
cases = os.path.join(repo, 'lab', 'verify', 'D01c', 'proposed-cases')
targets = {'BASE': os.path.join(repo, 'lab', 'oracles', 'domain')}
mroot = os.path.join(out, 'mutants')
for m in sorted(os.listdir(mroot)):
    targets[m] = os.path.join(mroot, m, 'lab', 'oracles', 'domain')
kills = {}
for name, oracle in targets.items():
    r = subprocess.run([sys.executable, '-I', os.path.join(here, 'kill_one.py'), oracle, cases, targets['BASE']],
                       capture_output=True, text=True, timeout=600)
    try:
        kills[name] = json.loads(r.stdout.strip().splitlines()[-1])
    except (IndexError, ValueError):
        kills[name] = {'_error': (r.stdout + r.stderr)[-300:]}
with open(os.path.join(out, 'kills.json'), 'w') as fh:
    json.dump(kills, fh, indent=1, sort_keys=True)
base = kills['BASE']
for name in kills:
    if name == 'BASE':
        continue
    k = sorted(c for c, v in kills[name].items() if v != 'pass' and base.get(c) == 'pass')
    print(name, 'killed by proposed:', ' '.join(k) or 'none')

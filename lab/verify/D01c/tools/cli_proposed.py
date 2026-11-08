"""V-D01c: run every proposed case through the O-DOMAIN command line (python3 -I).
`cli.py run <file>` for cases with `input`; `cli.py <op> -` with the decoded bytes on stdin for `inputBase64` cases.
usage: cli_proposed.py <repo>"""
import base64
import json
import os
import subprocess
import sys

repo = sys.argv[1]
cli = os.path.join(repo, 'lab', 'oracles', 'domain', 'cli.py')
d = os.path.join(repo, 'lab', 'verify', 'D01c', 'proposed-cases')
ok = 0
names = sorted(f for f in os.listdir(d) if f.startswith('P') and f.endswith('.json'))
for f in names:
    path = os.path.join(d, f)
    case = json.load(open(path, encoding='utf-8'), parse_float=str, parse_int=str)
    if 'inputBase64' in case:
        r = subprocess.run([sys.executable, '-I', cli, case['op'], '-'], input=base64.b64decode(case['inputBase64']),
                           capture_output=True)
        good = r.returncode == 0 and json.loads(r.stdout) == {k: v for k, v in case['expected'].items()}
    else:
        r = subprocess.run([sys.executable, '-I', cli, 'run', path, '--quiet'], capture_output=True)
        good = r.returncode == 0
    ok += good
    if not good:
        print('FAIL', f, r.returncode, r.stdout[:200], r.stderr[-300:])
print('%d/%d proposed cases pass through the CLI' % (ok, len(names)))

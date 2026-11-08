# [CX-VE01-4] Why: retain literal command exits and separate stdout/stderr against the exact target. Rejected: merging output into a claimed PASS summary (hides obsolete negative assertions).
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

TARGET = Path('/private/tmp/tx2-ve01-target-388209d-CX-VE01-4')
OUT = Path(__file__).resolve().parent
NODE = shutil.which('node')
REV = '388209d8f4ee23ab4a8ef8fd0ebafadfbdee0f79'

def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')

def integrity():
    paths = subprocess.check_output(['git', 'ls-files', 'lab/bin', 'lab/oracles', 'lab/acceptance'], cwd=TARGET, text=True).splitlines()
    records = {}
    for p in paths:
        actual = (TARGET / p).read_bytes()
        expected = subprocess.check_output(['git', 'show', f'{REV}:{p}'], cwd=TARGET)
        records[p] = {'sha256': hashlib.sha256(actual).hexdigest(), 'matchesTarget': actual == expected}
    return records

jobs = [
    ('all', ['--test', *[str(p.relative_to(TARGET)) for p in sorted((TARGET/'lab/bin/test').glob('*.test.mjs'))]]),
    ('prior', ['--test', 'lab/verify/E01/v-e01.test.mjs']),
    ('delta', ['--test', 'lab/verify/E01/round2/delta.test.mjs']),
    ('supplement', ['--test', 'lab/verify/E01/round2/supplement.test.mjs']),
    ('fallback-routes', ['--test', '--test-name-pattern=check 3 T[124] ', 'lab/verify/E01/round2/fallback-routes.test.mjs']),
    ('reference', ['lab/verify/E01/reference-replay.mjs']),
    ('input-variations', ['--test', 'lab/verify/E01/round3/input-variations.test.mjs']),
]
if len(sys.argv) > 1:
    jobs = [j for j in jobs if j[0] in sys.argv[1:]]

start = utc()
write('source.json', {'reviewer': 'CX-VE01-4', 'target': REV, 'worktree': str(TARGET), 'verifierBase': '9a1f51eb1aed7a8f5ff099dcfde5472eacd0d1ad', 'node': subprocess.check_output([NODE, '--version'], text=True).strip(), 'startedUtc': start, 'freeBytes': shutil.disk_usage(TARGET).free, 'targetFiles': integrity(), 'reviewFiles': {str(p.relative_to(OUT.parent)): hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.parent.rglob('*.mjs')}})

def run(job):
    label, argv = job
    assert shutil.disk_usage(TARGET).free >= 5 * 1024**3, 'disk below admission floor'
    command = [NODE, 'lab/bin/heavy.mjs', '--label', 'CX-VE01-4-' + label, '--', NODE, *argv]
    suffix = 'json' if label == 'reference' else 'tap'
    begin = utc()
    t = time.monotonic()
    print('starting ' + label, flush=True)
    with (OUT/f'{label}.{suffix}').open('w') as stdout, (OUT/f'{label}.stderr').open('w') as stderr:
        proc = subprocess.run(command, cwd=TARGET, stdout=stdout, stderr=stderr)
    rec = {'label': label, 'command': command, 'cwd': str(TARGET), 'startedUtc': begin, 'finishedUtc': utc(), 'secondsIncludingQueue': round(time.monotonic()-t, 3), 'exitCode': proc.returncode}
    for name in ['delta', 'supplement', 'input-variations']:
        if label == name:
            where = 'round3' if name == 'input-variations' else 'round2'
            src = TARGET/f'lab/verify/E01/{where}/{name}-results.json'
            if src.exists():
                shutil.copyfile(src, OUT/src.name)
    write(label+'-command.json', rec)
    print(json.dumps(rec), flush=True)
    return rec

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(run, jobs))
write('command-status.json', {'startedUtc': start, 'finishedUtc': utc(), 'commands': results})
write('final-integrity.json', {'atUtc': utc(), 'target': REV, 'files': integrity(), 'trackedDiff': subprocess.check_output(['git', 'diff', '--stat', REV], cwd=TARGET, text=True), 'freeBytes': shutil.disk_usage(TARGET).free})

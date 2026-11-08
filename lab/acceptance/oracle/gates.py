"""Retain source-bound EXP-O05 builder gate outputs (run through heavy.mjs)."""
import datetime
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'lab/experiments/EXP-O05-observation-oracle/evidence'


def hashes():
    files = list(HERE.glob('*.py')) + [HERE / 'README.md', HERE / 'fixtures.json', HERE.parent / 'obligations.json']
    files += list((ROOT / 'lab/oracles/replay').glob('*.py'))
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}


def main():
    free = shutil.disk_usage(ROOT).free
    if free < 5 * 1024**3:
        raise SystemExit('refusing gate below 5 GiB free')
    before = hashes(); runs = []
    for script in ('test_observe.py', 'test_cli.py', 'selfcheck.py'):
        argv = [sys.executable, '-I', '-B', str(HERE / script)]
        p = subprocess.run(argv, capture_output=True, text=True, timeout=180)
        filename = script.removesuffix('.py') + '.final.txt'
        (OUT / filename).write_text(p.stdout + p.stderr)
        runs.append({'argv': argv, 'exitCode': p.returncode, 'output': str((OUT / filename).relative_to(ROOT))})
    after = hashes()
    result = {'verdict': 'PASS' if before == after and all(r['exitCode'] == 0 for r in runs) else 'FAIL',
              'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'diskFreeBeforeBytes': free,
              'sourceHashesBefore': before, 'sourceHashesAfter': after, 'runs': runs,
              'scope': 'builder gates only; independent review and engine verification not performed'}
    (OUT / 'gates.final.json').write_text(json.dumps(result, sort_keys=True, indent=2) + '\n')
    print(json.dumps({'verdict': result['verdict'], 'runs': runs}, sort_keys=True))
    return 0 if result['verdict'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())

"""CX-VO06 offline, source-bound reruns. Run only through lab/bin/heavy.mjs."""
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = HERE / 'evidence'
BASE = OUT / 'baseline-source'
REV = '4efe962e3faf79b3330973891b4533dae5f83704'
ENV = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def restore():
    prefixes = ['lab/oracles/replay', 'lab/acceptance/golden', 'lab/acceptance/obligations.json',
                'lab/acceptance/RULINGS.md',
                'qualification/capacity/historical-assertion-metadata-v2/oracle.mjs',
                'qualification/capacity/historical-assertion-metadata-v1/oracle.mjs',
                'qualification/capacity/configured-entities-v1/xtdb-tiny-v4/oracle.json',
                'qualification/capacity/configured-entities-v1/CONTRACT.md',
                'qualification/workloads/temporal-workloads.json', 'qualification/workloads/event_oracles.py']
    files = git('ls-tree', '-r', '--name-only', REV, '--', *prefixes).decode().splitlines()
    inventory = []
    for name in files:
        data = git('show', REV + ':' + name)
        dest = BASE / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        inventory.append({'path': name, 'sha256': sha(data), 'bytes': len(data)})
    (OUT / 'baseline-inventory.json').write_text(json.dumps(inventory, indent=2)+'\n')

def launch(label, cmd, env=None):
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with (OUT / (label+'.log')).open('w') as f:
        p = subprocess.run(cmd, cwd=ROOT, env=dict(ENV, **(env or {})), stdout=f, stderr=subprocess.STDOUT)
    r = {'label':label, 'command':cmd, 'env':env or {}, 'started':started,
         'finished':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'exit':p.returncode,
         'logSha256':sha((OUT/(label+'.log')).read_bytes())}
    print(label, p.returncode, flush=True)
    return r

def golden():
    # [CX-VO06] Why: reuse the reviewed comparison renderer with explicit source roots.
    # Rejected: builder's retained raw outputs (would not constitute a fresh rerun).
    output = Path(sys.argv[2]).resolve()
    version, corpus = sys.argv[3:5]
    runner = ROOT/'lab/experiments/EXP-O06/golden_runner.py'
    sys.argv = [str(runner), str(output)]
    spec = importlib.util.spec_from_file_location('o06_golden', runner)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.CLI = (BASE if version == 'baseline' else ROOT)/'lab/oracles/replay/cli.py'
    mod.GOLD = (BASE if corpus == 'legacy' else ROOT)/'lab/acceptance/golden'
    mod.main()

if len(sys.argv) > 1 and sys.argv[1] == 'golden':
    golden()
    raise SystemExit(0)
OUT.mkdir(parents=True, exist_ok=True)
if (OUT/'gates.json').exists():
    raise SystemExit('Existing attempt retained; choose a new evidence directory for a rerun')
restore()
commands = []
commands.append(launch('unit-baseline', [sys.executable,'-I',str(BASE/'lab/oracles/replay/cli.py'),'--test']))
commands.append(launch('unit-final', [sys.executable,'-I','lab/oracles/replay/cli.py','--test']))
commands.append(launch('fixtures', [sys.executable,'-I','lab/experiments/EXP-O06/fixture_runner.py']))
commands.append(launch('selfcheck', [sys.executable,'-I','lab/oracles/replay/cli.py','--self-check']))
for lane in ['core','qlever']:
    for version,corpus in [('baseline','legacy'),('final','legacy'),('final','updated')]:
        label = f'{lane}-{version}-{corpus}'
        commands.append(launch(label, [sys.executable,'-I',str(Path(__file__)), 'golden',str(OUT/label),version,corpus], {'O02_LANE':lane}))
(OUT/'gates.json').write_text(json.dumps({'head':git('rev-parse','HEAD').decode().strip(),
    'baseline':REV,'commands':commands},indent=2)+'\n')

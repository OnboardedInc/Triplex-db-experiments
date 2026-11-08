"""V-D01c mutation runner (python3 -I). Copies O-DOMAIN and the W0 folder into <out>/mutants/<id>/lab/..., applies one
mutant, and runs (1) the 87 golden cases (`cli.py cases`), (2) the 119 unit tests (`cli.py --test`), (3) the 100k
fingerprint check (fpcheck.py, early exit on the first differing block) when the population can reach the code.

usage: run_mutants.py <repo worktree> <out dir> <reference receipt> [ids...]
Results: <out>/results.json (rewritten after every mutant).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mutants import MUTANTS  # noqa: E402

repo, out_dir, ref = sys.argv[1], sys.argv[2], sys.argv[3]
only = set(sys.argv[4:])
SRC_ORACLE = os.path.join(repo, 'lab', 'oracles', 'domain')
SRC_WORLD = os.path.join(repo, 'lab', 'world', 'W0')
results_path = os.path.join(out_dir, 'results.json')
results = {}
if os.path.exists(results_path):
    with open(results_path) as fh:
        results = json.load(fh)


def build(m):
    root = os.path.join(out_dir, 'mutants', m['id'])
    if os.path.exists(root):
        shutil.rmtree(root)
    oracle = os.path.join(root, 'lab', 'oracles', 'domain')
    shutil.copytree(SRC_ORACLE, oracle, ignore=shutil.ignore_patterns('__pycache__', 'receipts'))
    shutil.copytree(SRC_WORLD, os.path.join(root, 'lab', 'world', 'W0'))
    path = os.path.join(oracle, m['file'])
    with open(path) as fh:
        text = fh.read()
    for old, new in m['edits']:
        n = text.count(old)
        if n != 1:
            raise SystemExit('%s: edit matches %d times: %r' % (m['id'], n, old[:80]))
        text = text.replace(old, new)
    with open(path, 'w') as fh:
        fh.write(text)
    return oracle


def run_cases(oracle):
    r = subprocess.run([sys.executable, '-I', os.path.join(oracle, 'cli.py'), 'cases'], capture_output=True, text=True,
                       timeout=600)
    last = (r.stdout.strip().splitlines() or [''])[-1]
    failed = re.findall(r'^FAIL (C\d+)', r.stdout, re.M) + re.findall(r'^ERROR (.*)$', r.stdout, re.M)
    if r.returncode not in (0, 1) or 'cases byte-identical' not in last:
        return {'crashed': True, 'rc': r.returncode, 'tail': (r.stdout + r.stderr)[-400:], 'failed': failed}
    return {'failed': failed, 'summary': last}


def run_tests(oracle):
    try:
        r = subprocess.run([sys.executable, '-I', os.path.join(oracle, 'cli.py'), '--test'], capture_output=True, text=True,
                           timeout=900)
    except subprocess.TimeoutExpired:
        return {'crashed': True, 'timeout': True, 'failed': ['TIMEOUT']}
    txt = r.stdout + r.stderr
    bad = re.findall(r'^(FAIL|ERROR): (test_\w+) \(test_domain\.(\w+)', txt, re.M)
    ran = re.search(r'^Ran (\d+) tests', txt, re.M)
    golden = sorted({t for k, t, c in bad if c == 'GoldenCases'})
    other = sorted({'%s.%s' % (c, t) for k, t, c in bad if c != 'GoldenCases'})
    res = {'ran': int(ran.group(1)) if ran else None, 'rc': r.returncode, 'goldenTestsFailed': golden, 'otherTestsFailed': other}
    if not ran:
        res['tail'] = txt[-600:]
    return res


def run_fp(oracle):
    r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'fpcheck.py'), oracle, ref], capture_output=True, text=True,
                       timeout=1200)
    try:
        return json.loads(r.stdout.strip().splitlines()[-1])
    except (IndexError, ValueError):
        return {'caught': True, 'how': 'exception', 'detail': (r.stdout + r.stderr)[-400:]}


for m in MUTANTS:
    if only and m['id'] not in only:
        continue
    t0 = time.time()
    oracle = build(m)
    res = {'file': m['file'], 'spec': m['spec'], 'what': m['what']}
    res['cases'] = run_cases(oracle)
    res['tests'] = run_tests(oracle)
    if m['fp'] == 'run':
        res['fingerprint'] = run_fp(oracle)
    else:
        res['fingerprint'] = {'caught': False, 'how': None, 'na': m['fp']}
    res['seconds'] = round(time.time() - t0, 1)
    results[m['id']] = res
    with open(results_path, 'w') as fh:
        json.dump(results, fh, indent=1, sort_keys=True)
    c = res['cases']
    t = res['tests']
    f = res['fingerprint']
    sys.stdout.write('%-5s cases:%-3d tests(other):%-3d fp:%s  %.0fs  %s\n' % (
        m['id'], len(c.get('failed', [])), len(t.get('otherTestsFailed', [])),
        ('caught/' + str(f.get('how'))) if f.get('caught') else ('NA' if f.get('na') else 'missed'), res['seconds'], m['what']))
    sys.stdout.flush()

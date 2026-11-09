"""Run the frozen fixtures against planted executable mutants, rejecting crash kills."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent


def run(path):
    p = subprocess.run([sys.executable, '-I', str(HERE / 'test_observe.py'), '--oracle', str(path)],
                       capture_output=True, text=True, timeout=60)
    if p.returncode not in (0, 1):
        return None
    try:
        return json.loads(p.stdout)
    except ValueError:
        return None


def main():
    baseline = run(HERE / 'observe.py')
    if baseline is None or baseline['passed'] != baseline['total']:
        print(json.dumps({'verdict': 'FAIL', 'baseline': baseline})); return 1
    original = (HERE / 'observe.py').read_text()
    anchor = "        getattr(judge, key.lower().replace('-', '_'))(evidence)"
    assert original.count(anchor) == 1
    mutants = []
    cases = json.loads((HERE / 'fixtures.json').read_text())
    protocols = sorted({c['protocol'].removeprefix('OBS-') for c in cases})
    positive_ids = {c['id'] for c in cases if c['expected'] == 'PASS'}
    # [EXP-O05] Why: each removed protocol rule must accept an actual failing witness. Rejected: exit/crash-based mutant kills.
    with tempfile.TemporaryDirectory(prefix='o-obs-mutants-') as tmp:
        for key in protocols:
            replacement = "        if key != " + repr(key) + ":\n    " + anchor
            mutant = original.replace(anchor, replacement).replace(
                'ROOT = Path(__file__).resolve().parents[3]', 'ROOT = Path(' + repr(str(HERE.parents[2])) + ')')
            path = Path(tmp) / (key + '.py'); path.write_text(mutant)
            result = run(path)
            positives_ok = result is not None and all(r['ok'] for r in result['results'] if r['id'] in positive_ids)
            semantic = result is not None and any(r['id'] == key + '/boundary' and r.get('verdict') == 'PASS'
                                                 and r.get('code') == 0 for r in result['results'])
            no_crash = result is not None and not any('error' in r for r in result['results'])
            mutants.append({'mutant': 'omit-' + key, 'killed': positives_ok and semantic and no_crash,
                            'positiveControlsPass': positives_ok, 'semanticFalsePass': semantic, 'noCrash': no_crash})
    report = {'verdict': 'PASS' if all(m['killed'] for m in mutants) else 'FAIL',
              'baseline': {'passed': baseline['passed'], 'total': baseline['total']}, 'mutants': mutants}
    print(json.dumps(report, sort_keys=True)); return 0 if report['verdict'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())

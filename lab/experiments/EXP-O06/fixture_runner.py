"""EXP-O06: compare oracle answers with authored partial observations; no product imports."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from lab.oracles.replay import run, values


def matches(actual, expected):
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(k in actual and matches(actual[k], v) for k, v in expected.items())
    if isinstance(expected, list):
        return isinstance(actual, list) and len(actual) == len(expected) and all(map(lambda ab: matches(*ab), zip(actual, expected)))
    return actual == expected


def check(fixture):
    report = json.loads(values.dumps(run.evaluate_text(json.dumps(fixture['case']).encode())))
    actual = {q['id']: q for q in report['queries']}
    ok = report['verdict'] != 'FAIL' and all(matches(actual[k], v) for k, v in fixture.get('observedQueries', {}).items())
    return {'id': fixture['id'], 'rule': fixture['rule'], 'verdict': 'PASS' if ok else 'FAIL',
            'wanted': fixture['wanted'], 'oracleVerdict': report['verdict'],
            'violations': report['receiptConsistency']['violations']}


def main():
    root = Path(__file__).parent
    results = [check(json.loads(p.read_text())) for p in sorted((root / 'fixtures').glob('*.json'))]
    out = {'status': 'PASS' if all(r['verdict'] == r['wanted'] for r in results) else 'FAIL', 'fixtures': results,
           'sourceSha256': dict(run.source_hashes())}
    print(json.dumps(out, indent=2))
    return 0 if out['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())

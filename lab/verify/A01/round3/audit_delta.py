"""Audit the narrowly scoped round-3 source and assertion-file delta."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASE = '3b46c8a07ff3c6285252736cc10e04267f7dbe1d'
REV = 'b3af37514d48c68e481d301276a4b818cc10872b'


def blob(rev, path):
    return subprocess.check_output(['git', 'show', f'{rev}:{path}'], cwd=ROOT)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def ids(raw):
    return re.findall(r'^\| (Q\d+[a-z]?)\b', raw.decode(), re.M)


def main():
    assertions = []
    for path in ('lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs', 'lab/bin/test/claim_ref.py'):
        a, b = blob(BASE, path), blob(REV, path)
        assertions.append({'path': path, 'baselineSha256': sha(a), 'reviewedSha256': sha(b), 'byteIdentical': a == b})
    before = json.loads(blob(BASE, 'lab/acceptance/obligations.json'))
    after = json.loads(blob(REV, 'lab/acceptance/obligations.json'))
    selected = {f'Q{n}{c}' for n, letters in ((70, 'abcdefghijklmno'), (74, 'abcdefg'), (75, 'abcdefghij'),
                (76, 'abcdef'), (77, 'abc'), (78, 'abcd'), (79, 'abcd'), (81, 'a')) for c in letters}
    main_pending = ids(blob('ab3eafc^2', 'lab/acceptance/RULINGS-PENDING.md'))
    baseline_tap = blob(REV, 'lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.11-round3/evaluator-baseline.tap').decode()
    failures = [{'number': int(n), 'name': name} for n, name in re.findall(r'^not ok (\d+) - (.*)', baseline_tap, re.M)]
    for path, out in (('lab/bin/claim.mjs', 'evaluator-delta.patch'), ('lab/bin/test/claim-fixtures.mjs', 'fixture-delta.patch')):
        diff = subprocess.check_output(['git', 'diff', BASE, REV, '--', path], cwd=ROOT)
        (HERE / out).write_bytes(diff)
    result = {
        'baseline': BASE, 'reviewedCommit': REV, 'assertionFiles': assertions,
        'originalEightFailures': failures,
        'generatorUnchanged': blob(BASE, 'lab/acceptance/build_contract.py') == blob(REV, 'lab/acceptance/build_contract.py'),
        'generatorSha256': sha(blob(REV, 'lab/acceptance/build_contract.py')),
        'allObligationRecordsUnchanged': before['obligations'] == after['obligations'],
        'allCompiledRulingsUnchanged': before['rulings'] == after['rulings'],
        'oracleWorldImageA0PinsUnchanged': all(before[k] == after[k] for k in ('oraclePins', 'w0Pin', 'imagePins', 'a0Registry')),
        'oracleRunnerDeclarationsUnchanged': before['oracleRunners'] == after['oracleRunners'],
        'changedContractTopLevelFields': sorted(k for k in before.keys() | after.keys() if before.get(k) != after.get(k)),
        'pendingEqualsMainMinus50': after['pendingRulings']['ids'] == [i for i in main_pending if i not in selected],
        'pending': after['pendingRulings'], 'pendingCompiledIntersection': sorted(set(after['pendingRulings']['ids']) & set(ids(blob(REV, 'lab/acceptance/RULINGS.md')))),
        'productionOErrHasRunner': 'O-ERR' in after['oracleRunners'],
        'productionOErrPin': after['oraclePins'].get('O-ERR'),
        'transitiveContractSha256': after['transitiveContractSha256'],
        'counts': after['closability']['counts'], 'datomic': after['closability']['perSurface']['datomic-datalog'],
    }
    assert len(failures) == 8
    assert all(a['byteIdentical'] for a in assertions)
    (HERE / 'delta-audit.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'pending'}, indent=2))


if __name__ == '__main__':
    main()

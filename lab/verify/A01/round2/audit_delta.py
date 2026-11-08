"""Source-bound delta/pin/merge audit; reads git blobs, never modifies reviewed code."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REV = '3b46c8a07ff3c6285252736cc10e04267f7dbe1d'


def blob(rev, path):
    return subprocess.check_output(['git', 'show', f'{rev}:{path}'], cwd=ROOT)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def ids(raw):
    return re.findall(r'^\| (Q\d+[a-z])\b', raw.decode(), re.M)


def changed(a, b, prefix=''):
    if isinstance(a, dict) and isinstance(b, dict):
        return [p for k in sorted(a.keys() | b.keys()) for p in
                (changed(a[k], b[k], prefix + '.' + k) if k in a and k in b else [prefix + '.' + k])]
    return [] if a == b else [prefix]


def main():
    path = 'lab/acceptance/obligations.json'
    d = json.loads(blob(REV, path))
    old = json.loads(blob('36d7434', path))
    merged = json.loads(blob('da79107^1', path))
    selected = {f'Q{n}{c}' for n, cs in ((70, 'abcdefghijklmno'), (74, 'abcdefg'), (75, 'abcdefghij'),
                 (76, 'abcdef'), (77, 'abc'), (78, 'abcd'), (79, 'abcd'), (81, 'a')) for c in cs}
    main_pending = ids(blob('da79107^2', 'lab/acceptance/RULINGS-PENDING.md'))
    expected_pending = [i for i in main_pending if i not in selected]
    external = Path('/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/hashes.0.4.9.txt').read_bytes()
    table = {line.split()[1]: line.split()[0] for line in external.decode().splitlines()}
    pin = d['oraclePins']['O-REPLAY']
    oracle_match = all(h == pin['sha256'].get(f) == sha(blob(REV, f)) == sha(blob(pin['commit'], f)) for f, h in table.items())
    imported_paths = subprocess.check_output(['git', 'diff', '--name-only', 'da79107^2', REV, '--',
                                            'lab/bin', 'lab/config'], cwd=ROOT, text=True).splitlines()
    old_script = blob('ae3f091', 'lab/verify/A01/regressions_review0311.py')
    copied_script = blob(REV, 'lab/verify/A01/regressions_review0311.py')
    result = {
        'revision': REV, 'round1Source': '36d74348df2dd224ec15e29856a04a4e8daa4a30',
        'transitiveContractSha256': d['transitiveContractSha256'],
        'topLevelChangedFields': sorted(k for k in old.keys() | d.keys() if old.get(k) != d.get(k)),
        'mergeOnlyJsonDelta': changed(merged, d),
        'allObligationRecordsUnchanged': old['obligations'] == d['obligations'],
        'allOldMatrixCellMapsUnchanged': all(a['cells'] == b['cells'] for a, b in zip(old['capabilityMatrix'], d['capabilityMatrix'])),
        'compiledRulingsUnchanged': old['rulings'] == d['rulings'],
        'oracleAndWorldPinsUnchanged': old['oraclePins'] == d['oraclePins'] and old['w0Pin'] == d['w0Pin'],
        'imagePinsAndA0Unchanged': old['imagePins'] == d['imagePins'] and old['a0Registry'] == d['a0Registry'],
        'pending': d['pendingRulings'], 'pendingEqualsMainMinus50': expected_pending == d['pendingRulings']['ids'],
        'pendingCompiledIntersection': sorted(set(d['pendingRulings']['ids']) & set(ids(blob(REV, 'lab/acceptance/RULINGS.md')))),
        'importedBinConfigDifferentFromMainParent': imported_paths,
        'round1ReproductionsCopiedExactly': copied_script == old_script,
        'round1ReproductionsSha256': sha(copied_script),
        'externalOracleTableSha256': sha(external), 'all29OracleHashesMatch': len(table) == 29 and set(table) == set(pin['sha256']) and oracle_match,
        'knownLimit': d['knownLimits']['KL-CORE-TAIL'],
        'datomicSurfaceCounts': d['closability']['perSurface']['datomic-datalog'],
        'qualificationBlockers': d['qualificationRun']['blockers'],
    }
    (HERE / 'delta-audit.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k not in ('qualificationBlockers', 'pending', 'knownLimit')}, indent=2))


if __name__ == '__main__':
    main()

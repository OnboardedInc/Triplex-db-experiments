"""V-D01c delta check: compare the 276a280 and 5d1fd1a mutation campaigns mutant by mutant. python3 -I.
usage: compare_matrix.py <old out dir> <new out dir>
Compared: golden cases failed; unit tests failed among the 119 that existed at 276a280 (new RobustnessFixes tests are
reported separately); fingerprint verdict and the first differing block; proposed cases that kill the mutant (P01-P03
only count where the base passes them, which is new at 5d1fd1a)."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mutants_5d1 import MUTANTS, PORTED  # noqa: E402

o_dir, n_dir = sys.argv[1], sys.argv[2]
ro = json.load(open(os.path.join(o_dir, 'results.json')))
rn = json.load(open(os.path.join(n_dir, 'results.json')))
ko = json.load(open(os.path.join(o_dir, 'kills.json')))
kn = json.load(open(os.path.join(n_dir, 'kills.json')))


def view(r, k, base):
    old_tests = sorted(t for t in r['tests'].get('otherTestsFailed', []) if not t.startswith('RobustnessFixes.'))
    new_tests = sorted(t for t in r['tests'].get('otherTestsFailed', []) if t.startswith('RobustnessFixes.'))
    f = r['fingerprint']
    fp = 'na' if f.get('na') else ('caught/%s/%s/%s' % (f.get('how'), f.get('stream'), f.get('block')) if f.get('caught')
                                   else 'missed')
    kills = sorted(c for c, v in k.items() if v != 'pass' and base.get(c) == 'pass')
    return {'cases': sorted(r['cases'].get('failed', [])), 'tests': old_tests, 'fp': fp, 'kills': kills}, new_tests


same, diffs, xs = [], [], []
for m in MUTANTS:
    mid = m['id']
    if mid not in rn:
        diffs.append((mid, 'missing in the 5d1fd1a run'))
        continue
    vn, newt = view(rn[mid], kn.get(mid, {}), kn['BASE'])
    if mid not in ro:
        xs.append((mid, m['what'], vn, newt))
        continue
    vo, _ = view(ro[mid], ko.get(mid, {}), ko['BASE'])
    vn_k = dict(vn)
    vn_k['kills'] = [c for c in vn['kills'] if c not in ('P01', 'P02', 'P03')]
    extra = [c for c in vn['kills'] if c in ('P01', 'P02', 'P03')]
    d = {key: (vo[key], vn_k[key]) for key in vo if vo[key] != vn_k[key]}
    tag = ' [ported]' if mid in PORTED else ''
    if d:
        diffs.append((mid + tag, d))
    else:
        same.append(mid + tag + (' (+%s)' % ','.join(extra) if extra else '') + (' (+new tests %s)' % ','.join(
            t.split('.')[-1] for t in newt) if newt else ''))
print('identical on cases, old tests, fingerprint and proposed kills: %d' % len(same))
print('  ' + ' '.join(same))
print('different: %d' % len(diffs))
for d in diffs:
    print('  ', d)
print('X-mutants of the fix: %d' % len(xs))
for mid, what, v, newt in xs:
    print('  %s %s: cases %s; old tests %s; new tests %s; fp %s; proposed %s' % (
        mid, what, ','.join(v['cases']) or 'none', ','.join(t.split('.')[-1] for t in v['tests']) or 'none',
        ','.join(t.split('.')[-1] for t in newt) or 'none', v['fp'], ','.join(v['kills']) or 'none'))
print('control M00 5d1fd1a:', rn['M00']['cases'].get('summary'), '| tests ran', rn['M00']['tests']['ran'],
      'failed', rn['M00']['tests']['otherTestsFailed'] + rn['M00']['tests']['goldenTestsFailed'], '| fp', rn['M00']['fingerprint'])

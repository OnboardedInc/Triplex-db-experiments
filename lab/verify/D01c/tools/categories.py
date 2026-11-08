"""V-D01c: mutant categories from results.json and kills.json. python3 -I.  usage: categories.py <out dir>"""
import json
import os
import sys

out = sys.argv[1]
res = json.load(open(os.path.join(out, 'results.json')))
kills = json.load(open(os.path.join(out, 'kills.json')))
base = kills['BASE']
cat = {'nothing': [], 'tests_or_fp_only': [], 'cases': [], 'nothing_and_no_proposal': [], 'not_cases_no_proposal': []}
for mid, r in sorted(res.items()):
    if mid == 'M00':
        continue
    c = bool(r['cases'].get('failed'))
    t = bool(r['tests'].get('otherTestsFailed'))
    f = bool(r['fingerprint'].get('caught'))
    p = [k for k, v in kills.get(mid, {}).items() if v != 'pass' and base.get(k) == 'pass']
    if c:
        cat['cases'].append(mid)
    elif t or f:
        cat['tests_or_fp_only'].append(mid)
        if not p:
            cat['not_cases_no_proposal'].append(mid)
    else:
        cat['nothing'].append(mid)
        if not p:
            cat['nothing_and_no_proposal'].append(mid)
for k, v in cat.items():
    print('%-26s %2d  %s' % (k, len(v), ' '.join(v)))
print('control M00:', res['M00']['cases']['summary'], '| tests failed:', res['M00']['tests']['otherTestsFailed'],
      res['M00']['tests']['goldenTestsFailed'], '| ran', res['M00']['tests']['ran'], '| fp', res['M00']['fingerprint'])
print('BASE on proposed:', {k: v for k, v in base.items() if v != 'pass'}, 'pass:', sum(v == 'pass' for v in base.values()))

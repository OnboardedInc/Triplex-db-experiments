"""V-D01c: print the mutation table (markdown rows) from results.json and kills.json. python3 -I.
usage: summarize.py <results.json> <kills.json>"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from mutants import MUTANTS  # noqa: E402

res = json.load(open(sys.argv[1]))
kills = json.load(open(sys.argv[2]))
base = kills.get('BASE', {})
order = [m['id'] for m in MUTANTS]
tot = {'cases': 0, 'tests': 0, 'fp': 0, 'none': 0, 'proposed': 0}
for mid in order:
    if mid not in res or mid == 'M00':
        continue
    r = res[mid]
    cf = r['cases'].get('failed', [])
    tf = r['tests'].get('otherTestsFailed', [])
    if r['cases'].get('crashed') and not cf:
        cf = ['(crash)']
    f = r['fingerprint']
    if f.get('na'):
        fps = 'n/a: ' + f['na'][4:]
    elif f.get('caught'):
        fps = 'caught (%s%s)' % (f['how'], (' %s block %s' % (f.get('stream'), f.get('block'))) if f['how'] == 'block' else
                                 (' ' + ','.join(f.get('differs', []))) if f['how'] == 'final' else '')
    else:
        fps = 'not caught'
    k = kills.get(mid, {})
    pk = sorted(c for c, v in k.items() if v != 'pass' and base.get(c) == 'pass')
    caught = bool(cf) or bool(tf) or bool(f.get('caught'))
    tot['cases'] += bool(cf)
    tot['tests'] += bool(tf)
    tot['fp'] += bool(f.get('caught'))
    tot['none'] += not caught
    tot['proposed'] += bool(pk)
    tshort = ', '.join(t.split('.')[-1] for t in tf[:3]) + (' +%d' % (len(tf) - 3) if len(tf) > 3 else '')
    cshort = ', '.join(cf[:6]) + (' +%d' % (len(cf) - 6) if len(cf) > 6 else '')
    print('| %s | %s (%s) | %s | %s | %s | %s |' % (mid, r['what'], r['spec'], cshort or 'none', tshort or 'none', fps,
                                                  ', '.join(pk) or 'none'))
print()
print('mutants:', sum(1 for m in order if m in res and m != 'M00'), tot)

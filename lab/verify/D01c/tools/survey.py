"""V-D01c: survey golden-case features (boundaries the mutation list targets). Reads lab/world/W0/cases only."""
import glob
import json
import os
import sys

d = sys.argv[1]
for p in sorted(glob.glob(os.path.join(d, '*.json'))):
    c = json.load(open(p))
    i = c['input']
    notes = []
    b = i.get('basis')
    if isinstance(b, dict) and b.get('tx') == 0:
        notes.append('basis.tx=0')
    ws = [i['world']] if 'world' in i else i.get('worlds', [])
    for w in ws:
        if not isinstance(w, dict):
            continue
        bt = b['tx']
        mx = max([f['tx'] for f in w['facts'] if isinstance(f.get('tx'), int)] or [0])
        notes.append('maxfact=%s/basis=%s' % (mx, bt))
        for f in w['facts']:
            if f['a'] == 'reverified' and f['v'] is False:
                notes.append('reverified=false')
        decs = [f for f in w['facts'] if f['a'] == 'decisions']
        for dd in decs:
            rec = [f for f in w['facts'] if f['e'] == dd['v']]
            if len(rec) < 3:
                notes.append('incomplete:' + dd['v'])
            elif dd['tx'] > max(r['tx'] for r in rec):
                notes.append('decfact-later:' + dd['v'])
            elif dd['tx'] < max(r['tx'] for r in rec):
                notes.append('recfact-later:' + dd['v'])
    for a in i.get('activations', []):
        notes.append('act(tx=%s,from=%s)' % (a.get('tx'), a.get('from')))
    if 'worlds' in i:
        s = [w['subject'] for w in i['worlds']]
        if s != sorted(s):
            notes.append('worlds-unsorted')
    print(c['id'], c['op'], i.get('release', ''), b.get('validTime') if isinstance(b, dict) else '', notes)

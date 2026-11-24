#!/usr/bin/env python3
"""[DX-XQ2] Summarize paired cost arms: indexed against unindexed saves in the same database, per arm."""
import json, glob, sys, os
out = sys.argv[1]
def q(x, k): return (x.get('applyMs') or {}).get(k)
seeds = {os.path.basename(f)[10:-5]: json.load(open(f)) for f in glob.glob(f'{out}/cost-seed-*.json')}
base = seeds.get('n0')
print('arm | step | k | datoms on/off | reads in apply on/off (diff) | apply p50 on/off (diff) | apply p90 on/off | pair log B/save | pair WAL B/save')
for f in sorted(glob.glob(f'{out}/cost-measure-*.json')):
    d = json.load(open(f)); arm = d['label']
    for step in ['firstTouch', 'secondSave', 'formFirst', 'formSecond', 'hotOneField', 'hotForm20']:
        x = d.get(step)
        if not x: continue
        on, off = x['indexed'], x['unindexed']
        k = (on['datomsPerSave'] - off['datomsPerSave']) / 2
        print(f"{arm} | {step} | {k:g} | {on['datomsPerSave']:g}/{off['datomsPerSave']:g} | "
              f"{on['readsInsideApplyPerSave']:.3f}/{off['readsInsideApplyPerSave']:.3f} ({on['readsInsideApplyPerSave']-off['readsInsideApplyPerSave']:+.3f}) | "
              f"{q(on,'p50')}/{q(off,'p50')} ({q(on,'p50')-q(off,'p50'):+.2f}) | {q(on,'p90')}/{q(off,'p90')} | "
              f"{x['pairKvsBytesPerSave']:.0f} | {x['pairWalBytesPerSave']:.0f}")
    sr = d.get('subjectReads')
    if sr:
        print(f"{arm} | subject reads | " + ' ; '.join(f"{k}: {v['msPerSubject']:.2f} ms, {v['peerReadsPerSubject']:.2f} reads, {v['statuses']}" for k, v in sr.items() if isinstance(v, dict) and 'msPerSubject' in v))
    imp = d['import']
    print(f"{arm} | import {d['importRowsPerCommit']} rows | datoms {imp['datomsPerSave']:g} | reads {imp['readsInsideApplyPerSave']} | apply p50 {q(imp,'p50')} | log B {imp['kvsBytesPerSave']:.0f}")
print()
for arm, s in sorted(seeds.items()):
    entries = sum(v for kk, v in s['xqDatoms'].items() if kk.endswith(('/s', '/n', '/d', '/b', '/i', '/r', '/x'))) if s['xqDatoms'] else 0
    line = f"{arm}: entries {entries}, arm bytes {s['armBytes']}, segments {s['armSegments']}, seed s {s['seedSeconds']:.1f}"
    if base and entries:
        line += f", bytes/entry vs n0 {(s['armBytes']-base['armBytes'])/entries:.1f}, before-index bytes/entry {(s['armLogAndIndexBytesBeforeIndex']-base['armLogAndIndexBytesBeforeIndex'])/entries:.1f}, segments/100k entries {(s['armSegments']-base['armSegments'])/entries*1e5:.0f}"
    print(line)

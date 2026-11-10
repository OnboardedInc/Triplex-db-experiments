# [DX-B5-L6] Why: derive tables from retained current-attempt raw distributions, not transcribed estimates.
# Rejected: inferring a complete matrix when result.json retains an error or a missing phase.
import json
import pathlib
import sys

for arg in sys.argv[1:]:
    root = pathlib.Path(arg)
    result = json.loads((root / 'result.json').read_text())
    steps = result['steps']
    print(f"\n### {result['layout']} — {root.name}\n")
    print(f"Head `{result['head']}`; stack `{result['prefix']}`; retained error: {result.get('error', 'none')}.\n")
    print('| Metric | n | p50 ms | p90 ms | p99 ms | Other |\n| --- | ---: | ---: | ---: | ---: | --- |')
    for key in ['commits', 'openLoop', 'openLoop2', 'openLoop3', 'openLoopWithReaders', 'pulls', 'pulls32', 'ryow']:
        if key not in steps: continue
        s = steps[key]
        other = []
        if 'datoms' in s:
            d = s['datoms']; other.append(f"datoms {d['p50']}/{d['p90']}/{d['p99']}; HTTP/commit {s['httpCallsPerCommit']:.4f}")
            native = s['breakdown'].get('datomicTransactMs')
            if native: other.append('native transact p50/p90/p99 ' + '/'.join(f'{native[p]:.3f}' for p in ['p50','p90','p99']))
        if 'pullsPerCpuSecond' in s: other.append(f"{s['pullsPerCpuSecond']:.2f} pulls/read-gateway CPU-second")
        raw_name = {'openLoop':'step5-open-loop','openLoop2':'step5-open-loop-2','openLoop3':'step5-open-loop-3','openLoopWithReaders':'step5-with-readers'}.get(key)
        if raw_name:
            rows = json.loads((root / (raw_name + '-raw.json')).read_text())
            other.append(f"{sum(r['latencyMs'] > 50 for r in rows)} >50ms; offered {s['offered']} at {s['offeredRate']}/s; conflicts/replays {s['conflicts']}/{s['replays']}")
        print(f"| {key} | {s['n']} | {s['p50']:.3f} | {s['p90']:.3f} | {s['p99']:.3f} | {'; '.join(other)} |")
    print('\n| Seed writers | Commands | Facts | Commands/s | Facts/s |\n| ---: | ---: | ---: | ---: | ---: |')
    for s in steps.get('seedWriters', []):
        print(f"| {s['writers']} | {s['commands']} | {s['facts']} | {s['commandsPerSecond']:.2f} | {s['factsPerSecond']:.2f} |")
    for key in ['rowPage', 'w0Page']:
        if key in steps:
            s = steps[key]
            print(f"\n{key}: {s['elapsedMs']:.3f} ms, {s['httpRequests']} HTTP requests, {s['rows']} rows, {s.get('subjects', s.get('roots'))} subjects/roots.")

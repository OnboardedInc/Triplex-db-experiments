# [DX-H8] Why: assign a sampled stack to its first gateway frame within the actual publication ACK interval.
# Rejected: attributing startup/seed samples to publication, or inventing exclusive CPU from elapsed wall.
import collections, datetime, json, pathlib, sys
root = pathlib.Path(sys.argv[1])
r = json.loads((root / 'driver/receipt.json').read_text())
metrics = r.get('sweep', {}).get('metrics', [])
intervals = [(m['timing']['publicationAckAtEpochMs'] - m['timing']['publishCommitMs'], m['timing']['publicationAckAtEpochMs']) for m in metrics if 'publishCommitMs' in m['timing']]
for role in ['tx', 'gw-w']:
    f = root / (role + '-samples.json')
    if not f.exists():
        print(role, 'NO RECORDING'); continue
    data = json.loads(f.read_text()); counts = collections.Counter(); selected = 0; attributed = 0
    for event in data['recording']['events']:
        v = event['values']
        at = datetime.datetime.fromisoformat(v['startTime'].replace('Z', '+00:00')).timestamp() * 1000
        if not any(a <= at <= b for a, b in intervals): continue
        selected += 1
        for frame in (v.get('stackTrace') or {}).get('frames', []):
            method = frame['method']; typ = method.get('type') or {}; name = typ.get('name', '').replace('/', '.')
            if name.startswith('triplex.gateway'):
                counts[name + '.' + method['name'] + ':' + str(frame.get('lineNumber'))] += 1
                attributed += 1; break
    print(json.dumps({'role':role, 'publicationSamples':selected, 'gatewayAttributed':attributed, 'top10':counts.most_common(10)}))
for m in metrics:
    print(json.dumps({'page':m['page'], 'subjects':m['subjects'], **{k:v for k,v in m['timing'].items() if k.startswith(('buildOutbox', 'publish', 'state', 'command'))}}))

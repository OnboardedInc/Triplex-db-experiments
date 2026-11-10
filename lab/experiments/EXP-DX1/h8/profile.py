# [DX-H8] Why: assign a sampled stack to its first gateway frame within the actual publication ACK interval.
# Rejected: attributing startup/seed samples to publication, or inventing exclusive CPU from elapsed wall.
import collections, datetime, json, pathlib, sys, re, gzip

def events(file):
    decoder = json.JSONDecoder()
    with (gzip.open(file, "rt") if file.suffix == ".gz" else file.open()) as stream:
        buffer = ""
        while True:
            buffer += stream.read(65536)
            match = re.search(r'"events"\s*:\s*\[', buffer)
            if match:
                buffer = buffer[match.end():]; break
            if len(buffer) > 1000000: raise ValueError("JFR events array missing")
        while True:
            buffer = buffer.lstrip()
            if buffer.startswith(","): buffer = buffer[1:].lstrip()
            if buffer.startswith("]"): return
            try: event, end = decoder.raw_decode(buffer)
            except json.JSONDecodeError:
                part = stream.read(65536)
                if not part: raise
                buffer += part; continue
            yield event
            buffer = buffer[end:]

root = pathlib.Path(sys.argv[1])
r = json.loads((root / 'driver/receipt.json').read_text())
metrics = r.get('sweep', {}).get('metrics', [])
intervals = [(m['timing'].get('publicationStartedAtEpochMs', m['timing']['publicationAckAtEpochMs'] - m['timing']['publishCommitMs']), m['timing']['publicationAckAtEpochMs']) for m in metrics if 'publishCommitMs' in m['timing']]
for role in ['tx', 'gw-w']:
    f = root / (role + '-samples.json')
    if not f.exists(): f = f.with_suffix(f.suffix + '.gz')
    if not f.exists():
        print(role, 'NO RECORDING'); continue
    counts = collections.Counter(); selected = 0; attributed = 0
    for event in events(f):
        v = event['values']
        at = datetime.datetime.fromisoformat(v['startTime'].replace('Z', '+00:00')).timestamp() * 1000
        if not any(a <= at <= b for a, b in intervals): continue
        selected += 1
        for frame in (v.get('stackTrace') or {}).get('frames', []):
            method = frame.get('method') or {}; typ = method.get('type') or {}; name = typ.get('name', '').replace('/', '.')
            if name.startswith('triplex.gateway'):
                counts[name + '.' + method['name'] + ':' + str(frame.get('lineNumber'))] += 1
                attributed += 1; break
    print(json.dumps({'role':role, 'publicationSamples':selected, 'gatewayAttributed':attributed, 'top10':counts.most_common(10)}))
for m in metrics:
    print(json.dumps({'page':m['page'], 'subjects':m['subjects'], **{k:v for k,v in m['timing'].items() if k.startswith(('buildOutbox', 'publish', 'state', 'command'))}}))

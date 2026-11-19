"""Independent publication and receiver history, starting at the first live publication."""
import sys
from pathlib import Path
lab = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(lab / 'oracles/domain'))
import jsontok
import w0
releases = w0.Releases(str(lab / 'world/W0'))
items, receivers = {}, {}
for line in sys.stdin.buffer:
    msg = jsontok.parse_bytes(line)
    arg = msg['input']
    if msg['op'] == 'inspect':
        result = [{'items': items.get(s, []), 'receiver': receivers.get(s, {'effects': [], 'projection': []})} for s in arg]
    else:
        assert msg['op'] == 'fold'
        result = []
        for world in arg['worlds']:
            s = world['subject']
            out = w0.run_op('evaluate', {'basis': arg['basis'], 'release': arg['release'], 'world': world}, releases)
            assert 'error' not in out, out
            record = {k: out[k] for k in ('basis', 'release', 'subject', 'workItems')}
            pub = w0.run_op('publish', {'state': {'items': items.get(s, []), 'subjects': [], 'pending': []}, 'evaluations': [record]}, releases)
            items[s] = pub['state']['items']
            recv = w0.run_op('receive', {'state': receivers.get(s, {'effects': [], 'projection': []}), 'deliveries': pub['deliveries']}, releases)
            assert recv['applied']['effects'] == pub['deliveries']
            receivers[s] = recv['state']
            result.extend(pub['deliveries'])
    print(jsontok.canonical(result), flush=True)

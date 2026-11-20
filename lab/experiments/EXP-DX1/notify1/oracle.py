"""Independent publication and receiver history, starting at the first live publication."""
import copy
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
        assert msg['op'] in ('fold', 'coverage')
        result = []
        affected = []
        policy = releases
        if 'document' in arg:
            actual = w0.Release(arg['document'])
            assert actual.name == arg['release']
            policy = copy.copy(releases)
            policy.by_name = {**releases.by_name, actual.name: actual}
            policy.by_hash = {**releases.by_hash, actual.hash: actual}
        for world in arg['worlds']:
            s = world['subject']
            out = w0.run_op('evaluate', {'basis': arg['basis'], 'release': arg['release'], 'world': world}, policy)
            assert 'error' not in out, out
            record = {k: out[k] for k in ('basis', 'release', 'subject', 'workItems')}
            before = items.get(s, [])
            pub = w0.run_op('publish', {'state': {'items': before, 'subjects': [], 'pending': []}, 'evaluations': [record]}, releases)
            if before != pub['state']['items']:
                affected.append(s)
            items[s] = pub['state']['items']
            recv = w0.run_op('receive', {'state': receivers.get(s, {'effects': [], 'projection': []}), 'deliveries': pub['deliveries']}, releases)
            assert recv['applied']['effects'] == pub['deliveries']
            receivers[s] = recv['state']
            result.extend(pub['deliveries'])
        if msg['op'] == 'coverage':
            result = {'affected': affected, 'deliveries': result}
    print(jsontok.canonical(result), flush=True)

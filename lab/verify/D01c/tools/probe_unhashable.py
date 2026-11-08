"""V-D01c probe: a JSON array or object as the value of a date, instant or other non-PII attribute must be W0.E_VALUE
(SPEC 4.4 step 3.2: "a fact's v may be any JSON kind here; its type is checked in step 3"). Runs the O-DOMAIN CLI."""
import json
import os
import subprocess
import sys

cli = os.path.join(sys.argv[1], 'lab', 'oracles', 'domain', 'cli.py')
B = {'tx': 10, 'validTime': '2026-11-04T12:00:00.000000Z'}
probes = [
    ('pl:a', 'startDate', []), ('pl:a', 'startDate', {}), ('pl:a', 'startDate', ['2026-11-02']),
    ('pl:a', 'section1AttestedAt', []), ('pl:a', 'section1AttestedAt', {'erasedAt': '2026-11-01T00:00:00.000000Z'}),
    ('pl:a/doc:1', 'expiresOn', {}), ('pl:a', 'everifyStatusAt', [1]),
    ('pl:a', 'payRateCents', []), ('pl:a', 'payRateCents', {}), ('pl:a', 'everifyStatus', []), ('pl:a', 'ssn', []),
    ('pl:a', 'location', {}), ('pl:a/doc:1', 'reverified', []),
]
for e, a, v in probes:
    inp = {'basis': B, 'release': 'R1', 'world': {'subject': 'pl:a', 'facts': [{'a': a, 'e': e, 'tx': 1, 'v': v}]}}
    r = subprocess.run([sys.executable, '-I', cli, 'evaluate', '-'], input=json.dumps(inp).encode(), capture_output=True)
    out = r.stdout.decode().strip() or ('<no stdout> rc=%d %s' % (r.returncode, r.stderr.decode().strip().splitlines()[-1]))
    print('%-28s v=%-48s -> %s' % (e + ' ' + a, json.dumps(v), out[:90]))
# activation `from` and basis validTime are typed strings by step 1, so they cannot reach the caches unhashable.

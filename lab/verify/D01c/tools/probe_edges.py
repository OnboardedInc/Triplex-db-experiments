"""V-D01c probe: inputs SPEC.md defines an answer for that might not reach it in O-DOMAIN. Runs the O-DOMAIN CLI on raw bytes."""
import os
import subprocess
import sys

cli = os.path.join(sys.argv[1], 'lab', 'oracles', 'domain', 'cli.py')
B = '{"tx":10,"validTime":"2026-11-04T12:00:00.000000Z"}'


def ev(facts, basis=B, op='evaluate', extra='"release":"R1",'):
    return ('{"basis":%s,%s"world":{"subject":"pl:a","facts":[%s]}}' % (basis, extra, facts)).encode()


def fact(e, a, v, tx='1'):
    return '{"a":"%s","e":"%s","tx":%s,"v":%s}' % (a, e, tx, v)


big = '9' * 5000
probes = [
    ('erased marker whose erasedAt is an array (ssn)', ev(fact('pl:a', 'ssn', '{"erasedAt":[]}')), 'W0.E_VALUE'),
    ('erased marker whose erasedAt is an object (ssn)', ev(fact('pl:a', 'ssn', '{"erasedAt":{}}')), 'W0.E_VALUE'),
    ('payRateCents as a 5000-digit integer token', ev(fact('pl:a', 'payRateCents', big)), 'W0.E_VALUE'),
    ('fact tx as a 5000-digit integer token', ev(fact('pl:a', 'payRateCents', '1650', tx=big)), 'W0.E_BASIS'),
    ('basis.tx as a 5000-digit integer token', ev('', basis='{"tx":%s,"validTime":"2026-11-04T12:00:00.000000Z"}' % big), 'W0.E_BASIS'),
    ('fact v nested 600 arrays deep (startDate)', ev(fact('pl:a', 'startDate', '[' * 600 + ']' * 600)), 'W0.E_VALUE'),
    ('fact v nested 5000 arrays deep (startDate)', ev(fact('pl:a', 'startDate', '[' * 5000 + ']' * 5000)), 'W0.E_VALUE'),
]
for name, data, want in probes:
    r = subprocess.run([sys.executable, '-I', cli, 'evaluate', '-'], input=data, capture_output=True)
    got = r.stdout.decode().strip()
    if not got:
        got = '<crash rc=%d: %s>' % (r.returncode, (r.stderr.decode().strip().splitlines() or [''])[-1][:100])
    print('%-48s SPEC: %-12s O-DOMAIN: %s' % (name, want, got))

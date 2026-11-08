"""EXP-X05: turn vm-cpu-sample.sh output into per-vCPU utilisation (percent busy per 5 s) beside container CPU%."""
import re
import sys

prev = None
for line in open(sys.argv[1]):
    if '|' not in line:
        continue
    ts, rest = line.rstrip().split(' ', 1)
    stats, cpus = rest.split('|')
    c = {m.group(1): (int(m.group(2)), int(m.group(3))) for m in re.finditer(r'(cpu\d):(\d+)/(\d+)', cpus)}
    if prev:
        util = {k: round(100 * (c[k][0] - prev[k][0]) / max(1, c[k][1] - prev[k][1])) for k in c}
        s = dict(x.split('=') for x in stats.split())
        print(ts, ' '.join(f"{k[3:]}:{v:3d}" for k, v in util.items()), '|', ' '.join(f"{n.replace('tx2-', '')}={s[n]}" for n in sorted(s)))
    prev = c

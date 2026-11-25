"""[DX-S5 third review] Compare two s5/logdigest.clj outputs datom by datom.
usage: python3 -I logdiff.py <a.log> <b.log>
Prints the digests, the count of datoms that differ, and the first differing datoms of each side (their attribute
and first characters), grouped by attribute. Exit 0 when the logs are identical, 1 otherwise."""
import collections
import re
import sys


def load(path):
    rows, digest = [], None
    for line in open(path, encoding="utf-8"):
        if line.startswith("DX-S5R3_DATOM "):
            _, n, h, text = line.rstrip("\n").split(" ", 3)
            rows.append((int(n), h, text))
        elif line.startswith("DX-S5R3_LOG "):
            digest = re.search(r'"digest":"([0-9a-f]+)"', line).group(1)
    return rows, digest


def attr(text):
    m = re.match(r"\[\S+ (:\S+)", text)
    return m.group(1) if m else "?"


a, da = load(sys.argv[1])
b, db = load(sys.argv[2])
print(f"digests {da} {db}; datoms {len(a)} {len(b)}")
differ = [(x, y) for x, y in zip(a, b) if x[1] != y[1]]
print(f"differing datoms at the same place: {len(differ)}")
by_attr = collections.Counter(attr(x[2]) for x, _ in differ)
for k, v in by_attr.most_common():
    print(f"  {v:6d} {k}")
for x, y in differ[:12]:
    print(f"  #{x[0]} A {x[2][:150]}")
    print(f"  #{y[0]} B {y[2][:150]}")
sys.exit(0 if da == db else 1)

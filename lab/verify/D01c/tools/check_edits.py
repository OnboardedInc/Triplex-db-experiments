"""V-D01c: confirm every mutant edit matches exactly once in the 276a280 source (no files written)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mutants import MUTANTS  # noqa: E402

src = os.path.join(sys.argv[1], 'lab', 'oracles', 'domain')
ids = [m['id'] for m in MUTANTS]
assert len(ids) == len(set(ids)), 'duplicate ids'
bad = 0
for m in MUTANTS:
    text = open(os.path.join(src, m['file'])).read()
    for old, new in m['edits']:
        n = text.count(old)
        if n != 1:
            bad += 1
            print(m['id'], 'matches', n, repr(old[:70]))
        text = text.replace(old, new)
print(len(MUTANTS), 'mutants;', bad, 'bad edits')

"""V-D01c fingerprint check for one mutant (run with python3 -I).

Runs the MUTANT's own population.run at the 100k rung with stats off, and compares every completed 1,000-world block
digest of the four streams (worlds, R1, R2, R3) with the reference receipt's blockDigests as the run goes. The first
differing block ends the run early: the full SPEC 12.7 fingerprint differs exactly when some block's bytes differ.
A run that completes compares the six fingerprint values with the reference.

usage: fpcheck.py <mutant oracle dir> <reference receipt json>
prints one JSON line: {"caught": bool, "how": "block"|"final"|"exception"|null, ...}
"""
import json
import sys
import time

mut_dir, ref_path = sys.argv[1], sys.argv[2]
sys.path.insert(0, mut_dir)
with open(ref_path) as fh:
    ref = json.load(fh)
REF_BLOCKS = ref['blockDigests']
REF_FP = ref['fingerprint']
TAGS = ['worlds', 'R1', 'R2', 'R3']

t0 = time.time()
try:
    import population  # noqa: E402  (the mutant's)
except Exception as exc:  # an import-time failure is a catch
    print(json.dumps({'caught': True, 'how': 'exception', 'detail': '%s: %s' % (type(exc).__name__, exc)}))
    sys.exit(0)


class Diverged(Exception):
    pass


_orig = population.Stream
_count = [0]


class CheckedStream(_orig):
    def __init__(self, block):
        super().__init__(block)
        self.tag = TAGS[_count[0]] if _count[0] < 4 else 'extra%d' % _count[0]
        _count[0] += 1

    def add(self, s):
        n = len(self.blocks)
        super().add(s)
        if len(self.blocks) > n:
            k = len(self.blocks) - 1
            if self.blocks[k] != REF_BLOCKS[self.tag][k]:
                raise Diverged({'stream': self.tag, 'block': k, 'worlds': '%d-%d' % (k * 1000, k * 1000 + 999)})


population.Stream = CheckedStream
try:
    summary = population.run(100000, None, stats=False, progress=None)
except Diverged as d:
    out = {'caught': True, 'how': 'block'}
    out.update(d.args[0])
except Exception as exc:
    out = {'caught': True, 'how': 'exception', 'detail': '%s: %s' % (type(exc).__name__, str(exc)[:200])}
else:
    fp = summary['fingerprint']
    diff = sorted(k for k in REF_FP if fp.get(k) != REF_FP[k])
    out = {'caught': bool(diff), 'how': 'final' if diff else None, 'differs': diff}
out['seconds'] = round(time.time() - t0, 1)
print(json.dumps(out, sort_keys=True))

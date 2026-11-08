"""O-DOMAIN population generator and fingerprint (SPEC 12.3 and 12.7, W0-1.1.1), streamed one placement at a time.

Memory stays flat: a world is built, hashed, validated, evaluated under R1, R2 and R3, measured and dropped. The only
state carried across worlds is running digests, counters and the 2,000-entry Zipf table.
"""

import bisect
import hashlib
import itertools
import json
import math
import os
import resource
import sys
import time

import w0
from jsontok import canonical

SPEC_VERSION = w0.SPEC_VERSION
SEED = 'W0-pop-1'                               # SPEC 12.3 "Seed and draws"
BASE = '2026-11-04'                             # SPEC 12.3: the basis date, a Wednesday
VALID_TIME = '2026-11-04T12:00:00.000000Z'      # SPEC 12.3 "Basis and valid time"
RUNGS = {'10k': 10000, '100k': 100000, '1m': 1000000, '10m': 10000000}

# The accepted fingerprint (lab/verify/D01/VERIFY.md, delta check of W0-1.1.1). Used only to report match or mismatch.
EXPECTED_100K = {
    'basisTx': 4338757,
    'facts': 44537987,
    'worlds': 'sha256:fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760',
    'R1': 'sha256:c1b2d410244121d64b476c2f99c32830ea1b1f536928c9d12b0e886132351a79',
    'R2': 'sha256:551bbbc479eecd15d4f5eb13698f61d20c09a900b7f83a2b10858fb2ba13b562',
    'R3': 'sha256:a595092272c16343b0dfe9c9db57fbcdd7556fbf8be40afbaed014710fceee2f',
}

_PREFIX = (SEED + '/').encode('ascii')


def draw(f, i, m):
    """SPEC 12.3: first 8 bytes of SHA-256 over ASCII `W0-pop-1/` + f + `/` + decimal(i), big-endian, modulo m."""
    h = hashlib.sha256(_PREFIX + f.encode('ascii') + b'/' + str(i).encode('ascii')).digest()
    return int.from_bytes(h[:8], 'big') % m


def weighted(f, i, options):
    """SPEC 12.3 weighted choice: x = draw(f, i, 10000); the first option whose running total exceeds x."""
    x = draw(f, i, 10000)
    run = 0
    for w, val in options:
        run += w
        if run > x:
            return val
    raise AssertionError('weights of %s sum to %d' % (f, run))


def uniform(f, i, a, b):
    """SPEC 12.3 uniform integer in [a, b]: a + draw(f, i, b - a + 1)."""
    return a + draw(f, i, b - a + 1)


def pick(f, fu, i, options):
    """A weighted choice whose option may be a range (a, b) drawn uniformly with field fu."""
    val = weighted(f, i, options)
    if isinstance(val, tuple):
        return uniform(fu, i, val[0], val[1])
    return val


class Rung:
    """SPEC 12.3 "Sizes" and "Ids": N placements, L = N / 50 locations, K = 4 x ceil(L / 80) jurisdictions."""

    def __init__(self, n):
        if n % 50:
            raise ValueError('N must be a multiple of 50')
        self.N = n
        self.L = n // 50
        self.K = 4 * -(-self.L // 80)
        self.loc_digits = len(str(self.L))
        self.jur_digits = max(3, len(str(self.K)))
        # Zipf rank over L locations with s = 0.5: w_r = isqrt(10^24 div r) (SPEC 12.3).
        self.weights = [math.isqrt(10 ** 24 // r) for r in range(1, self.L + 1)]
        self.cum = list(itertools.accumulate(self.weights))
        self.T = self.cum[-1]

    def loc_id(self, r):
        return 'loc:l' + str(r).zfill(self.loc_digits)

    def jur_id(self, q):
        return 'jur:j' + str(q).zfill(self.jur_digits)

    def jur_of_rank(self, r):
        return ((r - 1) % self.K) + 1               # SPEC 12.3: jurisdiction ((r - 1) mod K) + 1

    @staticmethod
    def state_floor(q):
        return (1200, 1500, 1650, 1800)[q % 4]      # SPEC 12.3: q mod 4 = 0, 1, 2, 3

    @staticmethod
    def has_local_floor(r):
        return r % 4 == 2                           # SPEC 12.3: localMinWageCents 1850 exactly when r mod 4 = 2

    def zipf_rank(self, i):
        x = draw('loc.rank', i, self.T)
        return bisect.bisect_right(self.cum, x) + 1  # the first r whose running total exceeds x


# ---- SPEC 12.3 "Per-placement choices": option tables (weights in basis points, in table order) ----
START = [(200, None), (1800, (1, 14)), (2000, (-4, 0)), (6000, (-365, -5))]
S1 = [(8500, True), (1500, False)]
SSN = [(1000, 'absent'), (8730, 'valid'), (180, 'dashed'), (90, 'erased')]
EV = [(3000, None), (4000, 'pending'), (500, 'tnc'), (2200, 'authorized'), (300, 'fnc')]
EVRES = [(2000, 'accepted'), (500, 'rejected'), (7500, None)]
BGC = [(2000, None), (2000, 'pending'), (5000, 'clear'), (1000, 'consider')]
BGCDEC = [(4000, None), (4000, ('person', 'approve')), (1000, ('person', 'reject')), (1000, ('agent', 'approve'))]
I9DEC = [(3400, ()), (4800, (('person', 'approve'),)), (300, (('person', 'waive'),)), (400, (('person', 'reject'),)),
         (600, (('agent', 'approve'),)), (300, (('person', 'approve'), ('person', 'reject'))),
         (200, (('person', 'approve'), ('agent', 'reject')))]
LOC = [(100, False), (9900, True)]
PAY = [(100, False), (9900, True)]
PAYD = [(600, -1), (1000, 0), (2400, (1, 199)), (6000, (200, 2000))]
CHG = [(8000, 0), (600, (1, 500)), (1000, (501, 1000)), (400, (-1000, -501))]
CHGDEC = [(5500, None), (3000, ('person', 'approve', 'after')), (500, ('person', 'approve', 'before')),
          (500, ('person', 'reject', 'after')), (500, ('agent', 'approve', 'after'))]
FUT = [(200, True), (9800, False)]
WM = [(500, None), (7800, (600, 2400)), (1700, (2401, 3600))]
DOC = [(500, None), (5000, 'passport'), (3000, 'ead'), (1500, 'visa')]
DOCEXP = [(200, None), (1470, (-30, -1)), (2450, (0, 89)), (5880, (90, 730))]
DOCREV = [(1000, True), (9000, False)]
SIZE = [(5000, (50, 200)), (3500, (201, 800)), (1500, (801, 2000))]
HOPS = [(4000, 3), (3500, 4), (2500, 6)]
SECTION1_AT = '2026-11-01T15:00:00.000000Z'
ERASED_AT = '2026-11-01T00:00:00.000000Z'
MANY_ATTRS = frozenset(('documents', 'decisions', 'answers'))


class Placement:
    """The draws and W0 commands of placement i, before positions are assigned."""

    __slots__ = ('i', 'S', 'cmds', 'rank', 'T', 'bucket', 'h', 'fut', 'F', 'n', 'chains')


def gen_placement(i, rung):
    """SPEC 12.3: draw every choice of placement i and build its W0 commands in plan order (items 2 to 10)."""
    p = Placement()
    p.i = i
    S = p.S = 'pl:s%08d' % i
    base = BASE

    k = pick('start', 'start.u', i, START)
    start = None if k is None else w0.add_days(base, k)
    s1 = weighted('s1', i, S1)
    ssn_opt = weighted('ssn', i, SSN)
    digits = str(100000000 + i)
    ssn = {'absent': None, 'valid': digits, 'dashed': digits[0:3] + '-' + digits[3:5] + '-' + digits[5:9],
           'erased': {'erasedAt': ERASED_AT}}[ssn_opt]
    ev = weighted('ev', i, EV)
    ev_at = None if ev is None else w0.start_of(w0.add_days(base, -uniform('ev.u', i, 0, 20)))
    evres = weighted('evres', i, EVRES) if (ev is None and ssn_opt == 'valid') else None
    bgc = weighted('bgc', i, BGC)
    bgcdec = weighted('bgcdec', i, BGCDEC) if bgc == 'consider' else None
    i9dec = weighted('i9dec', i, I9DEC)
    located = weighted('loc', i, LOC)
    rank = rung.zipf_rank(i) if located else None
    has_pay = weighted('pay', i, PAY)
    pay = c = chgdec = None
    fut = False
    if has_pay:
        d = pick('pay.d', 'pay.d.u', i, PAYD)
        floor = rung.state_floor(rung.jur_of_rank(rank)) if located else 1650
        pay = floor + d                                     # the location jurisdiction's state floor + d
        c = pick('chg', 'chg.u', i, CHG)                    # only when pay is present
        if abs(c) > 500:
            chgdec = weighted('chgdec', i, CHGDEC)
        fut = weighted('fut', i, FUT)
    wm = pick('wm', 'wm.u', i, WM)
    doc = weighted('doc', i, DOC)
    expires = None
    reverified = False
    if doc in ('ead', 'visa'):
        e = pick('doc.exp', 'doc.exp.u', i, DOCEXP)
        expires = None if e is None else w0.add_days(base, e)
        reverified = weighted('doc.rev', i, DOCREV)
    elif doc == 'passport':
        expires = w0.add_days(base, uniform('doc.pexp.u', i, 365, 3650))
    bucket = weighted('size', i, SIZE)
    p.T = uniform('size.u', i, bucket[0], bucket[1])
    p.bucket = bucket
    p.h = weighted('hops', i, HOPS)
    p.fut = fut
    p.rank = rank

    cmds = []
    # 2. Hire: startDate, location, baselinePayRateCents, payRateCents equal to the baseline, weeklyMinutes.
    hire = []
    if start is not None:
        hire.append((S, 'startDate', start))
    if located:
        hire.append((S, 'location', rung.loc_id(rank)))
    if has_pay:
        baseline = pay - c                                  # baselinePayRateCents = payRateCents - c
        hire.append((S, 'baselinePayRateCents', baseline))
        hire.append((S, 'payRateCents', baseline))
    if wm is not None:
        hire.append((S, 'weeklyMinutes', wm))
    cmds.append(hire)
    # 3. Section 1.
    sec1 = []
    if s1:
        sec1.append((S, 'section1AttestedAt', SECTION1_AT))
    if ssn is not None:
        sec1.append((S, 'ssn', ssn))
    cmds.append(sec1)
    # 4. Background check.
    cmds.append([(S, 'bgcStatus', bgc)] if bgc is not None else [])
    # 5. E-Verify.
    cmds.append([(S, 'everifyStatus', ev), (S, 'everifyStatusAt', ev_at)] if ev is not None else [])
    # 6. Runtime outcome.
    cmds.append([(S, 'everifySubmitResult', evres)] if evres is not None else [])
    # 7. Documents.
    docs = []
    if doc is not None:
        D = S + '/doc:1'
        docs.append((S, 'documents', D))
        docs.append((D, 'docType', doc))
        if expires is not None:
            docs.append((D, 'expiresOn', expires))
        if reverified:
            docs.append((D, 'reverified', True))
    cmds.append(docs)

    # 8. Decision records, one command each: Section 2 records in option order, dec:b1, a "before" pay-change record.
    def record(local, target, author, verdict):
        D = S + '/dec:' + local
        return [(S, 'decisions', D), (D, 'target', target), (D, 'verdict', verdict), (D, 'author', author)]

    for n_, (author, verdict) in enumerate(i9dec, start=1):
        cmds.append(record('i' + str(n_), 'i9.section2', author, verdict))
    if bgcdec is not None:
        cmds.append(record('b1', 'bgc.adjudication', bgcdec[0], bgcdec[1]))
    if chgdec is not None and chgdec[2] == 'before':
        cmds.append(record('p1', 'pay.change', chgdec[0], chgdec[1]))
    # 9. When c != 0, the pay change: payRateCents re-asserted at its final value.
    if has_pay and c != 0:
        cmds.append([(S, 'payRateCents', pay)])
    # 10. A pay-change record drawn "after the change".
    if chgdec is not None and chgdec[2] == 'after':
        cmds.append(record('p1', 'pay.change', chgdec[0], chgdec[1]))
    p.cmds = [cm for cm in cmds if cm]                      # a command with no facts takes no position

    # F: the W0 facts of the world at B (own, documents', decisions', location's and jurisdiction's facts).
    one_pairs = set()
    many_count = 0
    for cm in p.cmds:
        for e, a, _v in cm:
            if a in MANY_ATTRS:
                many_count += 1
            else:
                one_pairs.add((e, a))
    loc_facts = 0
    if located:
        loc_facts = 2 + (1 if rung.has_local_floor(rank) else 0)
    p.F = len(one_pairs) + many_count + loc_facts
    p.n = (p.T - p.F) // 3 if p.T > p.F else 0             # n = floor((T - F) / 3)
    p.chains = -(-p.n // p.h)
    return p


def positions_used(p):
    """Commands of placement p that take a position: W0 commands, one per ballast chain, and the scheduled raise."""
    return len(p.cmds) + p.chains + (1 if p.fut else 0)


def world_facts(p, first_pos, rung):
    """SPEC 12.7 world_i facts as (e, a, v, tx): the last assertion of each one-cardinality pair in plan order,
    every documents/decisions/answers fact, the location's and jurisdiction's facts, and the ballast."""
    S = p.S
    one = {}
    facts = []
    pos = first_pos
    for cm in p.cmds:
        for e, a, v in cm:
            if a in MANY_ATTRS:
                facts.append((e, a, v, pos))
            else:
                one[(e, a)] = (v, pos)
        pos += 1
    for (e, a), (v, tx) in one.items():
        facts.append((e, a, v, tx))
    if p.rank is not None:
        r = p.rank
        q = rung.jur_of_rank(r)
        L = rung.loc_id(r)
        J = rung.jur_id(q)
        facts.append((L, 'jurisdiction', J, rung.K + r))
        if rung.has_local_floor(r):
            facts.append((L, 'localMinWageCents', 1850, rung.K + r))
        facts.append((J, 'stateMinWageCents', rung.state_floor(q), q))
    assert len(facts) == p.F, (p.i, len(facts), p.F)
    # 11. Ballast: one command per chain of h answers; answer k has field "q<k>" and value "a<k>".
    h, n = p.h, p.n
    for c in range(1, p.chains + 1):
        lo = (c - 1) * h + 1
        hi = min(c * h, n)
        facts.append((S, 'answers', S + '/ans:' + str(lo), pos))
        for k in range(lo, hi + 1):
            A = S + '/ans:' + str(k)
            facts.append((A, 'field', 'q' + str(k), pos))
            facts.append((A, 'value', 'a' + str(k), pos))
            if k < hi:
                facts.append((A, 'next', S + '/ans:' + str(k + 1), pos))
        pos += 1
    # 12. The scheduled raise takes a position but is in no world at B.
    if p.fut:
        pos += 1
    return facts, pos


def fact_json(e, a, v, tx):
    """Canonical JSON (SPEC 9) of one population fact, written directly; checked against jsontok.canonical."""
    t = type(v)
    if t is str:
        vs = '"' + v + '"'
    elif v is True:
        vs = 'true'
    elif t is int:
        vs = str(v)
    else:
        vs = '{"erasedAt":"' + v['erasedAt'] + '"}'
    return '{"a":"' + a + '","e":"' + e + '","tx":' + str(tx) + ',"v":' + vs + '}'


def world_json(subject, fact_strs):
    """canonicalJson({"facts": [...], "subject": S}) with facts sorted by their canonical JSON bytes (SPEC 12.7)."""
    fact_strs.sort()
    return '{"facts":[' + ','.join(fact_strs) + '],"subject":"' + subject + '"}'


class Stream:
    """SHA-256 over `[` x0 `,` x1 ... `]` (SPEC 12.7), plus per-block digests to localize a mismatch."""

    def __init__(self, block):
        self.h = hashlib.sha256(b'[')
        self.count = 0
        self.block = block
        self.bh = None
        self.blocks = []

    def add(self, s):
        b = s.encode('ascii')
        if self.count:
            self.h.update(b',')
        self.h.update(b)
        if self.count % self.block == 0:
            if self.bh is not None:
                self.bh.update(b']')
                self.blocks.append(self.bh.hexdigest())
            self.bh = hashlib.sha256(b'[')
        else:
            self.bh.update(b',')
        self.bh.update(b)
        self.count += 1

    def finish(self):
        if self.bh is not None:
            self.bh.update(b']')
            self.blocks.append(self.bh.hexdigest())
            self.bh = None
        self.h.update(b']')
        return 'sha256:' + self.h.hexdigest()


def projection(out, rule=None):
    """SPEC 12.1 item 3: tasks, obligations and flags plus the set of (rule, kind, key, payload) of work items."""
    def keep(x):
        return rule is None or x['rule'] == rule
    return canonical([
        [t for t in out['tasks'] if keep(t)],
        [o for o in out['obligations'] if keep(o)],
        [f for f in out['flags'] if keep(f)],
        sorted(canonical([x['rule'], x['kind'], x['key'], x['payload']]) for x in out['workItems'] if keep(x)),
    ])


def fired(out):
    """SPEC 12.1 item 2: the rules that emit at least one task, obligation (incl. due), work item or flag."""
    rules = set()
    for arr in ('tasks', 'obligations', 'flags', 'workItems'):
        for x in out[arr]:
            rules.add(x['rule'])
    return rules


def source_hashes():
    """sha256 of every O-DOMAIN source file, so a receipt names the exact code that produced it."""
    here = os.path.dirname(os.path.abspath(__file__))
    out = {}
    for name in sorted(os.listdir(here)):
        if name.endswith('.py'):
            with open(os.path.join(here, name), 'rb') as fh:
                out[name] = hashlib.sha256(fh.read()).hexdigest()
    return out


def run(n, world_dir=None, stats=True, progress=sys.stderr, block=1000, check_every=997):
    rung = Rung(n)
    releases = w0.Releases(world_dir)
    rels = [releases.by_name[r] for r in w0.RELEASE_NAMES]
    r1, r2, r3 = rels
    diff12 = w0.diff(r1, r2)
    r3_scope = set(r3.entries['OT']['scope']['jurisdictions'])
    t0 = time.time()

    # Pass 1: positions only (basis.tx is the last reference position, SPEC 12.3 "Reference positions").
    total = rung.K + rung.L
    for i in range(n):
        total += positions_used(gen_placement(i, rung))
    basis_tx = total
    t1 = time.time()
    if progress:
        progress.write('[D01c] pass 1: N=%d L=%d K=%d basis.tx=%d (%.1fs)\n' % (n, rung.L, rung.K, basis_tx, t1 - t0))

    worlds = Stream(block)
    outs = {r.name: Stream(block) for r in rels}
    fact_count = 0
    invalid = []
    st = {
        'fires': {r.name: dict.fromkeys(w0.RULE_ORDER, 0) for r in rels},
        'wi3': dict.fromkeys(w0.RELEASE_NAMES, 0),
        'r2Changed': 0, 'r2ChangedByRule': dict.fromkeys(diff12, 0),
        'r3Reached': 0, 'r3Changed': 0, 'r3ChangedNotReached': 0,
        'locCounts': [0] * (rung.L + 1), 'unlocated': 0,
        'buckets': {}, 'hops': {3: 0, 4: 0, 6: 0}, 'maxF': 0, 'minF': 10 ** 9,
        'fastPathChecks': 0,
    }
    pos = rung.K + rung.L + 1
    for i in range(n):
        p = gen_placement(i, rung)
        facts, pos = world_facts(p, pos, rung)
        strs = [fact_json(*f) for f in facts]
        if i < 200 or i % check_every == 0:
            # The direct writer must equal SPEC 9 canonical JSON byte for byte.
            for f, s in zip(facts, strs):
                assert canonical({'a': f[1], 'e': f[0], 'tx': f[3], 'v': f[2]}) == s, (i, f, s)
            st['fastPathChecks'] += 1
        wj = world_json(p.S, strs)
        if i < 200 or i % check_every == 0:
            plain = {'facts': [json.loads(s) for s in strs], 'subject': p.S}
            assert canonical(plain) == wj, i
        worlds.add(wj)
        fact_count += len(facts)
        try:
            iw = w0.validate_facts(p.S, facts, basis_tx)
            res = [w0.evaluate_indexed(iw, r, basis_tx, VALID_TIME) for r in rels]
        except w0.W0Error as err:
            if len(invalid) < 20:
                invalid.append({'i': i, 'subject': p.S, 'error': err.code})
            res = [{'error': err.code}] * 3
        for r, o in zip(rels, res):
            outs[r.name].add(canonical(o))
        if stats and 'error' not in res[0]:
            o1, o2, o3 = res
            for r, o in zip(rels, res):
                for rule in fired(o):
                    st['fires'][r.name][rule] += 1
                if len(o['workItems']) >= 3:
                    st['wi3'][r.name] += 1
            if projection(o1) != projection(o2):
                st['r2Changed'] += 1
            for rule in diff12:
                if projection(o1, rule) != projection(o2, rule):
                    st['r2ChangedByRule'][rule] += 1
            deps3 = o3['dependencies']
            reached = any(d[1] == 'stateMinWageCents' and d[0] in r3_scope for d in deps3)
            changed = projection(o2) != projection(o3)
            st['r3Reached'] += reached
            st['r3Changed'] += changed
            st['r3ChangedNotReached'] += changed and not reached
        if p.rank is None:
            st['unlocated'] += 1
        else:
            st['locCounts'][p.rank] += 1
        bk = '%d-%d' % p.bucket
        b = st['buckets'].setdefault(bk, {'worlds': 0, 'facts': 0, 'min': 10 ** 9, 'max': 0})
        b['worlds'] += 1
        b['facts'] += len(facts)
        b['min'] = min(b['min'], len(facts))
        b['max'] = max(b['max'], len(facts))
        st['hops'][p.h] += 1
        st['maxF'] = max(st['maxF'], p.F)
        st['minF'] = min(st['minF'], p.F)
        if progress and (i + 1) % 10000 == 0:
            rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            progress.write('[D01c] %d/%d worlds, %d facts, %.0fs, max RSS %.0f MiB\n'
                           % (i + 1, n, fact_count, time.time() - t1, rss / (1 << 20 if sys.platform == 'darwin' else 1 << 10)))
    if pos - 1 != basis_tx:
        raise AssertionError('pass 2 ended at position %d, pass 1 at %d' % (pos - 1, basis_tx))

    fp = {
        'basisTx': basis_tx,
        'facts': fact_count,
        'worlds': worlds.finish(),
    }
    for r in rels:
        fp[r.name] = outs[r.name].finish()
    locs = st['locCounts'][1:]
    located = n - st['unlocated']
    summary = {
        'format': 'triplex-db-2/o-domain-population/1',
        'specVersion': SPEC_VERSION,
        'python': sys.version.split()[0],
        'sources': source_hashes(),
        'seed': SEED,
        'rung': {'N': n, 'L': rung.L, 'K': rung.K},
        'basis': {'tx': basis_tx, 'validTime': VALID_TIME},
        'releases': {r.name: r.hash for r in rels},
        'fingerprint': fp,
        'invalidWorlds': invalid,
        'seconds': round(time.time() - t0, 1),
        'blockSize': block,
        'blockDigests': {'worlds': worlds.blocks, **{r.name: outs[r.name].blocks for r in rels}},
    }
    if stats:
        pct = lambda x: round(100.0 * x / n, 3)  # noqa: E731
        summary['measured'] = {
            'floor1R2ChangedPct': pct(st['r2Changed']),
            'floor1ByRulePct': {k: pct(v) for k, v in st['r2ChangedByRule'].items()},
            'floor2FiresPct': {r: {k: pct(v) for k, v in st['fires'][r].items()} for r in w0.RELEASE_NAMES},
            'floor2LowestPct': {r: min((pct(v), k) for k, v in st['fires'][r].items()) for r in w0.RELEASE_NAMES},
            'floor3Locations': {'largest': max(locs), 'rank2': locs[1] if len(locs) > 1 else None,
                                'smallest': min(locs), 'mean': round(located / rung.L, 2), 'unlocated': st['unlocated']},
            'floor4ThreePlusWorkItemsPct': {k: pct(v) for k, v in st['wi3'].items()},
            'r3': {'reached': st['r3Reached'], 'changed': st['r3Changed'],
                   'changedNotReached': st['r3ChangedNotReached']},
            'buckets': {k: {'worlds': v['worlds'], 'sharePct': pct(v['worlds']),
                            'meanFacts': round(v['facts'] / v['worlds'], 1), 'minFacts': v['min'],
                            'maxFacts': v['max']} for k, v in sorted(st['buckets'].items(), key=lambda kv: int(kv[0].split('-')[0]))},
            'hopsPct': {str(k): pct(v) for k, v in st['hops'].items()},
            'w0FactsPerWorld': {'min': st['minF'], 'max': st['maxF']},
            'fastPathChecks': st['fastPathChecks'],
        }
    return summary


def main(rung_name, world_dir, out_path, expect, stats):
    n = RUNGS.get(rung_name)
    if n is None:
        try:
            n = int(rung_name)
        except ValueError:
            sys.stderr.write('o-domain: unknown rung %r (use %s or an N divisible by 50)\n' % (rung_name, ', '.join(RUNGS)))
            return 2
    summary = run(n, world_dir, stats=stats)
    fp = summary['fingerprint']
    rc = 0
    if expect:
        if n != 100000:
            sys.stderr.write('o-domain: --expect holds values for the 100k rung only\n')
            return 2
        cmp = {k: {'got': fp[k], 'expected': v, 'match': fp[k] == v} for k, v in EXPECTED_100K.items()}
        summary['expected'] = cmp
        summary['match'] = all(c['match'] for c in cmp.values())
        rc = 0 if summary['match'] else 1
    text = json.dumps(summary, indent=1, sort_keys=True)
    if out_path:
        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        with open(out_path, 'w') as fh:
            fh.write(text + '\n')
    sys.stdout.write(json.dumps({'fingerprint': fp, 'match': summary.get('match'), 'measured': summary.get('measured')},
                                indent=1, sort_keys=True) + '\n')
    return rc

"""O-DOMAIN unit tests (W0-1.1.1). Run: python3 -I lab/oracles/domain/cli.py --test

1. Every golden case is byte-identical (SPEC 11.1), one test per case.
2. SPEC worked examples: release hashes (5.2), release diffs (5.3), addBusinessDays (6.1), work item ids (8.4).
3. The embedded SPEC 3 attribute table equals schema.json.
4. Token-level JSON (SPEC 2, 9, 14 items 1, 2, 34).
5. Validation order beyond the golden cases (SPEC 4.4).
6. The SPEC 13 invariants, checked on every valid golden evaluate case.
7. The SPEC 12 generator at a small rung: sizes, positions, ballast neutrality, the direct canonical writer.
"""

import copy
import os
import random
import subprocess
import sys
import unittest

import jsontok
import population
import w0
from jsontok import JNum, canonical, parse_bytes, to_plain

WORLD_DIR = w0.default_world_dir()
HERE = os.path.dirname(os.path.abspath(__file__))
_RELEASES = None


def releases():
    global _RELEASES
    if _RELEASES is None:
        _RELEASES = w0.Releases(WORLD_DIR)
    return _RELEASES


def case_paths():
    d = os.path.join(WORLD_DIR, 'cases')
    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.endswith('.json'))


def load(path):
    with open(path, 'rb') as fh:
        return parse_bytes(fh.read())


def ev(inp, op='evaluate'):
    return w0.run_op(op, inp, releases())


def strip_basis(out):
    o = dict(out)
    o.pop('basis', None)
    return canonical(o)


class GoldenCases(unittest.TestCase):
    """SPEC 11.1: a conforming implementation produces bytes equal to canonicalJson(expected)."""

    def test_case_count(self):
        self.assertEqual(len(case_paths()), 87)


def _make_case_test(path):
    def t(self):
        case = load(path)
        got = canonical(w0.run_op(case['op'], case['input'], releases()))
        want = canonical(to_plain(case['expected']))
        self.assertEqual(got, want, os.path.basename(path))
        if 'identicalTo' in case:
            other = [p for p in case_paths() if os.path.basename(p).startswith(case['identicalTo'] + '-')]
            self.assertEqual(len(other), 1)
            self.assertEqual(canonical(to_plain(load(other[0])['expected'])), want)
    return t


for _p in case_paths():
    _cid = os.path.basename(_p).split('-')[0]
    setattr(GoldenCases, 'test_%s' % _cid, _make_case_test(_p))


class SpecExamples(unittest.TestCase):
    def test_release_hashes(self):
        # SPEC 5.2 and README: R1 = fd57551a...b031, R2 = 7d2f4008...07a9, R3 = f345d9fe...312e.
        r = releases().by_name
        self.assertTrue(r['R1'].hash.startswith('sha256:fd57551a') and r['R1'].hash.endswith('b031'))
        self.assertTrue(r['R2'].hash.startswith('sha256:7d2f4008') and r['R2'].hash.endswith('07a9'))
        self.assertTrue(r['R3'].hash.startswith('sha256:f345d9fe') and r['R3'].hash.endswith('312e'))

    def test_release_diff(self):
        r = releases().by_name
        self.assertEqual(w0.diff(r['R1'], r['R2']), ['I9S2', 'DOCEXP', 'MINWAGE'])  # SPEC 5.3
        self.assertEqual(w0.diff(r['R2'], r['R3']), ['OT'])
        self.assertEqual(w0.diff(r['R1'], r['R3']), ['I9S2', 'DOCEXP', 'MINWAGE', 'OT'])

    def test_r3_scope(self):
        # SPEC 5.1: ten ids jur:j010 ... jur:j100, scope.params thresholdMinutes 2700, params as R2.
        ot = releases().by_name['R3'].entries['OT']
        self.assertEqual(ot['scope']['jurisdictions'], ['jur:j%03d' % q for q in range(10, 101, 10)])
        self.assertEqual(ot['scope']['params'], {'thresholdMinutes': 2700})
        self.assertEqual(ot['params'], releases().by_name['R2'].entries['OT']['params'])

    def test_add_business_days(self):
        # SPEC 6.1 examples.
        self.assertEqual(w0.add_business_days('2026-11-02', 3), '2026-11-05')
        self.assertEqual(w0.add_business_days('2026-11-06', 3), '2026-11-11')
        self.assertEqual(w0.add_business_days('2026-11-07', 3), '2026-11-11')
        self.assertEqual(w0.add_business_days('2026-11-04', 8), '2026-11-16')

    def test_date_functions(self):
        self.assertEqual(w0.end_of_day('2026-11-02'), '2026-11-03T00:00:00.000000Z')
        self.assertEqual(w0.add_days('2099-12-31', 1), '2100-01-01')        # derived instants may leave 2000-2099
        self.assertEqual(w0.add_days('2000-01-01', -1), '1999-12-31')
        self.assertTrue(w0.is_date('2028-02-29'))
        self.assertFalse(w0.is_date('2027-02-29'))
        self.assertFalse(w0.is_date('2100-01-01'))
        self.assertFalse(w0.is_date('1999-12-31'))
        self.assertTrue(w0.is_instant('2026-11-04T23:59:59.999999Z'))
        self.assertFalse(w0.is_instant('2026-11-04T24:00:00.000000Z'))
        self.assertFalse(w0.is_instant('2026-11-04T12:00:60.000000Z'))
        self.assertFalse(w0.is_instant('2026-11-04T12:00:00.00000Z'))
        self.assertFalse(w0.is_instant('2026-11-04T12:00:00.000000+00:00'))
        self.assertFalse(w0.is_instant('２026-11-04T12:00:00.000000Z'))     # ASCII digits only

    def test_resolve_release_tie(self):
        # SPEC 5.4 step 3: greatest from, then tx, then release string.
        r = releases()
        h1, h2 = r.by_name['R1'].hash, r.by_name['R2'].hash
        f = '2026-11-01T00:00:00.000000Z'
        self.assertIs(w0.resolve_release([(f, 8, h2), (f, 9, h1)], '2026-11-04T00:00:00.000000Z', r), r.by_name['R1'])
        self.assertIs(w0.resolve_release([(f, 9, h1), (f, 9, h2)], '2026-11-04T00:00:00.000000Z', r),
                      r.by_name[max((h1, 'R1'), (h2, 'R2'))[1]])
        with self.assertRaises(w0.W0Error):
            w0.resolve_release([(f, 9, h1)], '2026-10-31T23:59:59.999999Z', r)
        unknown = 'sha256:' + '0' * 64
        # The picked hash is unknown: W0.E_NO_RELEASE, with no fall back to an older candidate (SPEC-AMBIGUITY A06).
        with self.assertRaises(w0.W0Error):
            w0.resolve_release([(f, 9, h1), ('2026-11-02T00:00:00.000000Z', 1, unknown)],
                               '2026-11-04T00:00:00.000000Z', r)


class SchemaCrossCheck(unittest.TestCase):
    """The SPEC 3 table embedded in w0.py must equal lab/world/W0/schema.json, which holds the same table as data."""

    def test_attributes(self):
        with open(os.path.join(WORLD_DIR, 'schema.json'), 'rb') as fh:
            schema = to_plain(parse_bytes(fh.read()))
        self.assertEqual(schema['specVersion'], w0.SPEC_VERSION)
        self.assertEqual(set(schema['entityKinds']), set(w0.ATTRS))
        for kind, ks in schema['entityKinds'].items():
            self.assertEqual(set(ks['attributes']), set(w0.ATTRS[kind]), kind)
            for a, s in ks['attributes'].items():
                typ, card, pii, extra = w0.ATTRS[kind][a]
                self.assertEqual((s['type'], s['cardinality'], s['pii']), (typ, card, pii), (kind, a))
                if typ == 'enum':
                    self.assertEqual(tuple(s['values']), extra, (kind, a))
                if typ == 'ref':
                    self.assertEqual(s['refKind'], extra[0], (kind, a))
        self.assertEqual(tuple(schema['ruleOrder']), w0.RULE_ORDER)
        self.assertEqual(schema['releases'], list(w0.RELEASE_NAMES))


class TokenJSON(unittest.TestCase):
    def test_number_tokens(self):
        x = parse_bytes(b'[1650, 1650.0, 1.65e3, -1, -0, 9007199254740992]')
        self.assertEqual([type(v) for v in x], [JNum] * 6)
        self.assertEqual([jsontok.int_token_value(v) for v in x], [1650, None, None, -1, 0, 9007199254740992])
        self.assertIsNone(jsontok.int_token_value(True))
        self.assertIsNone(jsontok.int_token_value('1650'))

    def test_duplicate_keys(self):
        self.assertTrue(jsontok.has_duplicate_key(parse_bytes(b'{"a":[{"v":{"x":1,"x":2}}]}')))
        self.assertFalse(jsontok.has_duplicate_key(parse_bytes(b'{"a":[{"v":{"x":1,"y":2}}]}')))

    def test_syntax(self):
        for bad in (b'', b'{', b'{"a":1,}', b'[1 2]', b'01', b'1.', b'.5', b'"\x01"', b'{"a":1} x', b'\xff', b'nul'):
            with self.assertRaises(ValueError, msg=bad):
                parse_bytes(bad)
        self.assertEqual(parse_bytes(b' {"a" : "\\u00e9\\"\\\\\\/"} '), {'a': 'é"\\/'})
        self.assertEqual(parse_bytes(b'"\\ud83d\\ude00"'), '\U0001F600')

    def test_canonical(self):
        # SPEC 9: sorted keys, no whitespace, only \" and \\ escapes in printable ASCII.
        self.assertEqual(canonical({'b': [1, True, None], 'a': 'x"\\y'}), '{"a":"x\\"\\\\y","b":[1,true,null]}')
        self.assertEqual(canonical(parse_bytes(b'{"z":-0,"y":{"b":3,"a":1.5e1}}')), '{"y":{"a":1.5e1,"b":3},"z":0}')

    def test_error_on_bad_bytes(self):
        self.assertEqual(w0.run_op_bytes('evaluate', b'{"basis":', releases()), {'error': w0.E_SHAPE})


class ValidationOrder(unittest.TestCase):
    """SPEC 4.4 orderings not pinned by a golden case."""

    BASIS = {'tx': 10, 'validTime': '2026-11-04T12:00:00.000000Z'}

    def world(self, subject, facts):
        return {'subject': subject, 'facts': [{'e': e, 'a': a, 'v': v, 'tx': tx} for e, a, v, tx in facts]}

    def test_affected_world_by_world(self):
        # World 1's cardinality error (3.3) is found before world 2's unknown subject (3.1): SPEC-AMBIGUITY A04.
        w1 = self.world('pl:a', [('pl:a', 'startDate', '2026-11-02', 1), ('pl:a', 'startDate', '2026-11-03', 1)])
        w2 = self.world('xx:b', [])
        out = ev({'basis': self.BASIS, 'release': 'R1', 'worlds': [w1, w2], 'writes': []}, 'affected')
        self.assertEqual(out, {'error': w0.E_CARDINALITY})

    def test_cardinality_after_every_fact(self):
        # 3.3 runs after every fact passed 3.2: a later unknown attribute wins over an earlier duplicate (A03).
        w = self.world('pl:a', [('pl:a', 'startDate', '2026-11-02', 1), ('pl:a', 'startDate', '2026-11-03', 1),
                                ('pl:a', 'nickname', 'x', 1)])
        self.assertEqual(ev({'basis': self.BASIS, 'release': 'R1', 'world': w}), {'error': w0.E_UNKNOWN})

    def test_many_cardinality(self):
        w = self.world('pl:a', [('pl:a', 'documents', 'pl:a/doc:1', 1), ('pl:a', 'documents', 'pl:a/doc:1', 2)])
        self.assertEqual(ev({'basis': self.BASIS, 'release': 'R1', 'world': w}), {'error': w0.E_CARDINALITY})
        w = self.world('pl:a', [('pl:a', 'documents', 'pl:a/doc:1', 1), ('pl:a', 'documents', 'pl:a/doc:2', 1)])
        self.assertNotIn('error', ev({'basis': self.BASIS, 'release': 'R1', 'world': w}))

    def test_activation_order(self):
        # Step 4 per activation in array order; within one activation E_VALUE before E_BASIS (A05).
        w = self.world('pl:a', [])
        h = releases().by_name['R1'].hash
        bad_tx = {'from': '2026-11-01T00:00:00.000000Z', 'release': h, 'tx': 11}
        bad_hash = {'from': '2026-11-01T00:00:00.000000Z', 'release': 'R1', 'tx': 11}
        self.assertEqual(ev({'activations': [bad_tx, bad_hash], 'basis': self.BASIS, 'world': w}, 'reconcile'),
                         {'error': w0.E_BASIS})
        self.assertEqual(ev({'activations': [bad_hash, bad_tx], 'basis': self.BASIS, 'world': w}, 'reconcile'),
                         {'error': w0.E_VALUE})
        # A world error (step 3) wins over an activation error (step 4).
        w = self.world('pl:a', [('pl:a', 'weeklyMinutes', 10081, 1)])
        self.assertEqual(ev({'activations': [bad_hash], 'basis': self.BASIS, 'world': w}, 'reconcile'),
                         {'error': w0.E_VALUE})

    def test_values(self):
        def one(a, v, e='pl:a'):
            return ev({'basis': self.BASIS, 'release': 'R1', 'world': self.world('pl:a', [(e, a, v, 1)])})
        self.assertEqual(one('ssn', {'erasedAt': '2026-11-01T00:00:00.000000Z', 'x': 1}), {'error': w0.E_VALUE})
        self.assertEqual(one('ssn', {'erasedAt': '2026-11-01'}), {'error': w0.E_VALUE})
        self.assertNotIn('error', one('ssn', {'erasedAt': '2026-11-01T00:00:00.000000Z'}))
        self.assertEqual(one('ssn', ''), {'error': w0.E_VALUE})
        self.assertEqual(one('ssn', 'x' * 65), {'error': w0.E_VALUE})
        self.assertEqual(one('ssn', 'tab\there'), {'error': w0.E_VALUE})
        self.assertEqual(one('payRateCents', True), {'error': w0.E_VALUE})
        self.assertEqual(one('payRateCents', JNum('-0')), one('payRateCents', 0))  # SPEC-AMBIGUITY A02
        self.assertEqual(one('location', 'jur:ny'), {'error': w0.E_VALUE})
        self.assertEqual(one('documents', 'pl:b/doc:1'), {'error': w0.E_VALUE})
        self.assertEqual(one('documents', 'pl:a/dec:1'), {'error': w0.E_VALUE})
        self.assertEqual(one('next', 'pl:a/ans:2', e='pl:a/ans:1'), one('next', 'pl:a/ans:3', e='pl:a/ans:1'))
        self.assertEqual(one('next', 'pl:b/ans:2', e='pl:a/ans:1'), {'error': w0.E_VALUE})
        self.assertEqual(one('reverified', 'true', e='pl:a/doc:1'), {'error': w0.E_VALUE})
        self.assertEqual(one('docType', 'Passport', e='pl:a/doc:1'), {'error': w0.E_VALUE})
        self.assertEqual(one('startDate', '2026-11-02', e='pl:ab/doc:1'), {'error': w0.E_UNKNOWN})
        self.assertEqual(one('startDate', '2026-11-02', e='pl:a/doc:1'), {'error': w0.E_UNKNOWN})
        self.assertEqual(one('startDate', '2026-11-02', e='pl:a/xyz:1'), {'error': w0.E_UNKNOWN})

    def test_basis(self):
        w = self.world('pl:a', [])
        self.assertEqual(ev({'basis': {'tx': -1, 'validTime': self.BASIS['validTime']}, 'release': 'R1', 'world': w}),
                         {'error': w0.E_BASIS})
        self.assertEqual(ev({'basis': {'tx': 0, 'validTime': '2026-11-04'}, 'release': 'R1', 'world': w}),
                         {'error': w0.E_BASIS})
        self.assertEqual(ev({'basis': {'tx': 0, 'validTime': 7}, 'release': 'R1', 'world': w}), {'error': w0.E_SHAPE})
        self.assertEqual(ev({'basis': self.BASIS, 'release': 'R4', 'world': w}), {'error': w0.E_SHAPE})
        self.assertEqual(ev({'basis': self.BASIS, 'release': 'R1', 'world': w, 'x': 1}), {'error': w0.E_SHAPE})


def _valid_evaluate_cases():
    out = []
    for p in case_paths():
        c = load(p)
        if c['op'] == 'evaluate' and 'error' not in c['expected']:
            out.append((os.path.basename(p), c))
    return out


class Invariants(unittest.TestCase):
    """SPEC 13 on every valid golden evaluate case (and their release variants)."""

    @classmethod
    def setUpClass(cls):
        cls.cases = _valid_evaluate_cases()

    def test_determinism_under_shuffle(self):  # 13.1
        rnd = random.Random(7)
        for name, c in self.cases:
            base = canonical(ev(c['input']))
            for _ in range(3):
                inp = copy.deepcopy(c['input'])
                rnd.shuffle(inp['world']['facts'])
                self.assertEqual(canonical(ev(inp)), base, name)

    def test_boundary_completeness(self):  # 13.2
        late = '2099-12-31T23:59:59.999999Z'
        for name, c in self.cases:
            out = ev(c['input'])
            for o in out['obligations']:
                inp = copy.deepcopy(c['input'])
                inp['basis']['validTime'] = o['boundary']
                self.assertNotEqual(strip_basis(ev(inp)), strip_basis(out), (name, o['id']))
            if not out['obligations']:
                inp = copy.deepcopy(c['input'])
                inp['basis']['validTime'] = late
                self.assertEqual(strip_basis(ev(inp)), strip_basis(out), name)
            else:
                first = min(o['boundary'] for o in out['obligations'])
                if first[:10] > out['basis']['validTime'][:10]:
                    inp = copy.deepcopy(c['input'])
                    inp['basis']['validTime'] = w0.add_days(first[:10], -1) + 'T23:59:59.999999Z'
                    if inp['basis']['validTime'] > out['basis']['validTime']:
                        self.assertEqual(strip_basis(ev(inp)), strip_basis(out), name)

    def test_proposal_isolation(self):  # 13.3
        seen = 0
        for name, c in self.cases:
            inp = copy.deepcopy(c['input'])
            facts = inp['world']['facts']
            S = inp['world']['subject']
            props = {f['e'] for f in facts if f['a'] == 'author' and f['v'] == 'agent'}
            props = {d for d in props if any(f['e'] == S and f['a'] == 'decisions' and f['v'] == d for f in facts)}
            if not props:
                continue
            seen += 1
            inp['world']['facts'] = [f for f in facts if f['e'] not in props
                                     and not (f['a'] == 'decisions' and f['v'] in props)]
            a, b = ev(c['input']), ev(inp)
            for o in (a, b):
                o['trace'] = [t for t in o['trace'] if t['rule'] != 'PROP']
                o['tasks'] = [t for t in o['tasks'] if t['rule'] != 'PROP']
                o.pop('dependencies')
            self.assertEqual(canonical(a), canonical(b), name)
        self.assertGreater(seen, 3)

    def test_erasure(self):  # 13.4
        seen = 0
        mark = {'erasedAt': '2026-11-01T00:00:00.000000Z'}
        for name, c in self.cases:
            inp = copy.deepcopy(c['input'])
            ssn = [f for f in inp['world']['facts'] if f['a'] == 'ssn' and isinstance(f['v'], str)]
            if not ssn:
                continue
            seen += 1
            original = ssn[0]['v']
            ssn[0]['v'] = mark
            a, b = ev(c['input']), ev(inp)
            self.assertNotIn(original, canonical(a), name)   # no output ever contains a PII value
            ra = [t for t in a['trace'] if t['rule'] == 'EVSUB'][0]['row']
            rb = [t for t in b['trace'] if t['rule'] == 'EVSUB'][0]['row']
            self.assertEqual(rb, 1 if ra == 1 else 3, name)
            for o in (a, b):
                for arr in ('tasks', 'obligations', 'workItems', 'flags', 'trace'):
                    o[arr] = [x for x in o[arr] if x['rule'] != 'EVSUB']
            self.assertEqual(canonical(a), canonical(b), name)
        self.assertGreater(seen, 10)

    def test_release_isolation(self):  # 13.5
        changeable = {('R1', 'R2'): {'I9S2', 'DOCEXP', 'MINWAGE'}, ('R2', 'R3'): {'OT'}}
        for name, c in self.cases:
            outs = {}
            for r in w0.RELEASE_NAMES:
                inp = copy.deepcopy(c['input'])
                inp['release'] = r
                outs[r] = ev(inp)
            for (x, y), rules in changeable.items():
                a, b = copy.deepcopy(outs[x]), copy.deepcopy(outs[y])
                self.assertEqual([w['id'] for w in a['workItems'] if w['rule'] not in rules],
                                 [w['id'] for w in b['workItems'] if w['rule'] not in rules], name)
                for o in (a, b):
                    o.pop('release')
                    o.pop('dependencies')
                    for arr in ('tasks', 'obligations', 'workItems', 'flags', 'trace'):
                        o[arr] = [z for z in o[arr] if z['rule'] not in rules]
                    for z in o['workItems']:
                        z.pop('version')
                self.assertEqual(canonical(a), canonical(b), (name, x, y))

    def test_ballast_neutrality(self):  # 13.6
        for name, c in self.cases:
            inp = copy.deepcopy(c['input'])
            inp['world']['facts'] = [f for f in inp['world']['facts']
                                     if f['a'] != 'answers' and '/ans:' not in f['e']]
            self.assertEqual(canonical(ev(inp)), canonical(ev(c['input'])), name)


class PublishReceive(unittest.TestCase):
    """SPEC 13.7 and 13.8 over randomized streams built from golden work items."""

    def test_sequences(self):
        recs = []
        for p in case_paths():
            c = load(p)
            if c['op'] == 'publish':
                recs.extend(c['input']['evaluations'])
        rnd = random.Random(11)
        for trial in range(30):
            stream = [copy.deepcopy(rnd.choice(recs)) for _ in range(12)]
            for k, r in enumerate(stream):
                if rnd.random() < 0.7:
                    r['basis']['tx'] = JNum(str(100 + k))
            state = {'items': [], 'pending': [], 'subjects': []}
            allv = []
            for r in stream:
                out = ev({'evaluations': [r], 'state': state}, 'publish')
                self.assertNotIn('error', out)
                state = out['state']
                allv.extend(out['deliveries'])
            per = {}
            for d in allv:
                per.setdefault(d['id'], []).append(d['seq'])
            for seqs in per.values():
                self.assertEqual(seqs, list(range(1, len(seqs) + 1)))       # 13.7
            # 13.8: any arrival order with duplicates processes each sequence exactly once, in order.
            arrivals = allv + rnd.sample(allv, min(5, len(allv)))
            rnd.shuffle(arrivals)
            out = ev({'deliveries': arrivals, 'state': {'effects': [], 'projection': []}}, 'receive')
            got = {}
            for d in out['applied']['effects']:
                got.setdefault(d['id'], []).append(d['seq'])
            self.assertEqual(got, per)
            proj = {p['id']: p['seq'] for p in out['state']['projection']}
            self.assertEqual(proj, {k: max(v) for k, v in per.items()})


class Population(unittest.TestCase):
    """SPEC 12.3 and 12.7 at a 1,000-placement rung (L = 20, K = 4)."""

    N = 1000

    def test_rung_sizes(self):
        for n, L, K in ((10000, 200, 12), (100000, 2000, 100), (1000000, 20000, 1000), (10000000, 200000, 10000)):
            r = population.Rung(n)
            self.assertEqual((r.L, r.K), (L, K))
        r = population.Rung(100000)
        self.assertEqual((r.loc_id(1), r.jur_id(1), r.jur_id(100)), ('loc:l0001', 'jur:j001', 'jur:j100'))
        self.assertEqual(population.Rung(10000).jur_id(10), 'jur:j010')
        self.assertEqual(r.weights[0], 10 ** 12)
        self.assertEqual(r.weights[3], 5 * 10 ** 11)

    def test_draw(self):
        import hashlib
        h = hashlib.sha256(b'W0-pop-1/start/0').digest()
        self.assertEqual(population.draw('start', 0, 10000), int.from_bytes(h[:8], 'big') % 10000)

    def test_worlds(self):
        rung = population.Rung(self.N)
        pos = rung.K + rung.L + 1
        rel = releases().by_name
        rnd = random.Random(3)
        for i in range(self.N):
            p = population.gen_placement(i, rung)
            first = pos
            facts, pos = population.world_facts(p, pos, rung)
            self.assertEqual(pos - first, population.positions_used(p))
            self.assertTrue(p.T - 2 <= len(facts) <= p.T, (i, len(facts), p.T))   # SPEC 12.3 ballast
            iw = w0.validate_facts(p.S, facts, 10 ** 9)
            self.assertEqual(iw.nfacts, len(facts))
            if rnd.random() < 0.05:   # SPEC 13.6 ballast neutrality on generated worlds, all releases
                bare = [f for f in facts if f[1] != 'answers' and '/ans:' not in f[0]]
                self.assertEqual(len(bare), p.F)
                iwb = w0.validate_facts(p.S, bare, 10 ** 9)
                for r in rel.values():
                    self.assertEqual(canonical(w0.evaluate_indexed(iw, r, 5, population.VALID_TIME)),
                                     canonical(w0.evaluate_indexed(iwb, r, 5, population.VALID_TIME)))
            # the chain depth: the deepest answer is h hops from the placement
            if p.n >= p.h:
                nxt = {f[0]: f[2] for f in facts if f[1] == 'next'}
                firsts = [f[2] for f in facts if f[1] == 'answers']
                depth = 1
                a = firsts[0]
                while a in nxt:
                    a = nxt[a]
                    depth += 1
                self.assertEqual(depth, p.h)

    def test_run_small(self):
        s = population.run(self.N, WORLD_DIR, stats=True, progress=None)
        self.assertEqual(s['invalidWorlds'], [])
        self.assertEqual(s['measured']['r3']['changedNotReached'], 0)
        self.assertEqual(len(s['blockDigests']['worlds']), 1)


class RobustnessFixes(unittest.TestCase):
    """V-D01c F1 to F3: every invalid input gets its SPEC error; nothing crashes (RULINGS-PENDING Q57b, Q57c)."""

    BASIS = '{"tx":10,"validTime":"2026-11-04T12:00:00.000000Z"}'

    def evaluate_text(self, facts_json, basis=None):
        text = '{"basis":%s,"release":"R1","world":{"subject":"pl:a","facts":[%s]}}' % (basis or self.BASIS, facts_json)
        return w0.run_op_bytes('evaluate', text.encode(), releases())

    def fact(self, a, v_json, tx='1', e='pl:a'):
        return '{"e":"%s","a":"%s","v":%s,"tx":%s}' % (e, a, v_json, tx)

    # ---- F1: arrays and objects on date and instant attributes are W0.E_VALUE ----
    def test_f1_containers_on_dates_and_instants(self):
        attrs = [('pl:a', 'startDate'), ('pl:a', 'section1AttestedAt'), ('pl:a', 'everifyStatusAt'),
                 ('pl:a/doc:1', 'expiresOn')]
        for e, a in attrs:
            for v in ('[]', '{}', '["2026-11-02"]', '[1]', '{"erasedAt":"2026-11-01T00:00:00.000000Z"}'):
                self.assertEqual(self.evaluate_text(self.fact(a, v, e=e)), {'error': w0.E_VALUE}, (a, v))
        for v in ('{"erasedAt":[]}', '{"erasedAt":{}}', '{"erasedAt":["2026-11-01T00:00:00.000000Z"]}'):
            self.assertEqual(self.evaluate_text(self.fact('ssn', v)), {'error': w0.E_VALUE}, v)
        # The same values as activation `from` and basis validTime keep their step-1 kinds (strings only).
        self.assertEqual(self.evaluate_text('', basis='{"tx":10,"validTime":[]}'), {'error': w0.E_SHAPE})

    def test_f1_cases_runner_reports_a_crash_as_fail(self):
        import contextlib
        import io
        import shutil
        import tempfile
        import cli
        src = [p for p in case_paths() if os.path.basename(p)[:4] in ('C01-', 'C02-')]
        real = cli.w0.run_op

        def boom(op, inp, rels):
            if inp['release'] == 'R1':
                raise TypeError('planted crash')
            return real(op, inp, rels)

        with tempfile.TemporaryDirectory() as d:
            for p in src:
                shutil.copy(p, d)
            buf = io.StringIO()
            cli.w0.run_op = boom
            try:
                with contextlib.redirect_stdout(buf):
                    rc = cli.cmd_cases(d, releases())
            finally:
                cli.w0.run_op = real
        text = buf.getvalue()
        self.assertEqual(rc, 1)
        self.assertIn('FAIL C01 (C01-base-r1.json) crashed: TypeError: planted crash', text)
        self.assertIn('PASS C02', text)
        self.assertIn('1/2 cases byte-identical; failed: C01', text)

    # ---- F2: integer tokens of any length ----
    def test_f2_long_integer_tokens(self):
        big = '9' * 5000
        self.assertEqual(self.evaluate_text(self.fact('payRateCents', big)), {'error': w0.E_VALUE})
        self.assertEqual(self.evaluate_text(self.fact('payRateCents', '-' + big)), {'error': w0.E_VALUE})
        self.assertEqual(self.evaluate_text(self.fact('weeklyMinutes', big)), {'error': w0.E_VALUE})
        self.assertEqual(self.evaluate_text(self.fact('payRateCents', '10000000000000000')), {'error': w0.E_VALUE})
        self.assertEqual(self.evaluate_text(self.fact('payRateCents', '9007199254740992')), {'error': w0.E_VALUE})
        self.assertNotIn('error', self.evaluate_text(self.fact('payRateCents', '9007199254740991')))
        self.assertEqual(self.evaluate_text(self.fact('startDate', '"2026-11-02"', tx=big)), {'error': w0.E_BASIS})
        self.assertEqual(self.evaluate_text(self.fact('startDate', '"2026-11-02"', tx='-' + big)), {'error': w0.E_BASIS})
        self.assertEqual(self.evaluate_text('', basis='{"tx":%s,"validTime":"2026-11-04T12:00:00.000000Z"}' % big),
                         {'error': w0.E_BASIS})
        h = releases().by_name['R1'].hash
        text = ('{"activations":[{"from":"2026-11-01T00:00:00.000000Z","release":"%s","tx":%s}],"basis":%s,'
                '"world":{"subject":"pl:a","facts":[]}}' % (h, big, self.BASIS))
        self.assertEqual(w0.run_op_bytes('reconcile', text.encode(), releases()), {'error': w0.E_BASIS})
        self.assertEqual(jsontok.ranged_int_token_value(JNum(big)), 10 ** 16)
        self.assertEqual(jsontok.ranged_int_token_value(JNum('-' + big)), -(10 ** 16))
        self.assertEqual(jsontok.ranged_int_token_value(JNum('9007199254740991')), 9007199254740991)

    def test_f2_publish_and_receive_stay_exact(self):
        # SPEC sets no range on publish and receive integers: they are compared and incremented exactly.
        big = '9' * 5000
        wid = 'wi:' + 'a' * 64
        item = '{"id":"%s","payload":{"n":1},"retired":false,"seq":%s,"subject":"pl:a"}' % (wid, big)
        wi = '{"id":"%s","inputs":[%s],"key":"","kind":"bgc.order","payload":{"n":%s},"rule":"BGC","version":"wv:x"}' % (
            wid, big, big)
        text = ('{"evaluations":[{"basis":{"tx":%s,"validTime":"2026-11-04T12:00:00.000000Z"},"release":"r",'
                '"subject":"pl:a","workItems":[%s]}],"state":{"items":[%s],"pending":[],"subjects":[]}}' % (big, wi, item))
        out = canonical(w0.run_op_bytes('publish', text.encode(), releases()))
        nxt = '1' + '0' * 5000
        self.assertIn('"seq":%s,"subject":"pl:a","version":"wv:x"' % nxt, out)
        self.assertIn('"payload":{"n":%s}' % big, out)
        self.assertIn('"basis":{"tx":%s,' % big, out)
        dl = '{"id":"%s","key":"","kind":"k","payload":{},"rule":"BGC","seq":%s,"subject":"pl:a","version":"v"}'
        text = '{"deliveries":[%s],"state":{"effects":[{"done":%s,"id":"%s","waiting":[]}],"projection":[]}}' % (
            dl % (wid, nxt), big, wid)
        out = w0.run_op_bytes('receive', text.encode(), releases())
        self.assertEqual(len(out['applied']['effects']), 1)
        self.assertIn('"done":%s' % nxt, canonical(out))

    # ---- F3: any nesting depth is a JSON value ----
    def test_f3_deep_values(self):
        for depth in (600, 5000, 100000):
            v = '[' * depth + '"2026-11-02"' + ']' * depth
            self.assertEqual(self.evaluate_text(self.fact('startDate', v)), {'error': w0.E_VALUE}, depth)
        v = '{"a":' * 50000 + '{"k":1,"k":2}' + '}' * 50000
        self.assertEqual(self.evaluate_text(self.fact('startDate', v)), {'error': w0.E_SHAPE})   # duplicate key, deep
        with self.assertRaises(ValueError):
            parse_bytes(b'[' * 100000 + b']' * 99999)
        x = parse_bytes(b'[' * 100000 + b'7' + b']' * 100000)
        for _ in range(100000):
            self.assertEqual(len(x), 1)
            x = x[0]
        self.assertEqual(x, JNum('7'))

    def test_f3_deep_payload_round_trip(self):
        depth = 300000                        # past the json module's recursion guard: the iterative writer takes over
        payload = '{"d":' * depth + '[-0,1.5e1,"\\u00e9"]' + '}' * depth
        wid = 'wi:' + 'b' * 64
        wi = '{"id":"%s","inputs":[],"key":"","kind":"bgc.order","payload":%s,"rule":"BGC","version":"wv:y"}' % (wid, payload)
        text = ('{"evaluations":[{"basis":{"tx":1,"validTime":"2026-11-04T12:00:00.000000Z"},"release":"r",'
                '"subject":"pl:a","workItems":[%s]}],"state":{"items":[],"pending":[],"subjects":[]}}' % wi)
        out = canonical(w0.run_op_bytes('publish', text.encode(), releases()))
        want = '{"d":' * depth + '[0,1.5e1,"\\u00e9"]' + '}' * depth
        self.assertEqual(out.count(want), 3)  # the delivery, the pending copy and the item state

    def test_writer_paths_agree(self):
        # The iterative writer and the json module give the same bytes for every golden expected output (V-D01c N1).
        for p in case_paths():
            exp = load(p)['expected']
            self.assertEqual(jsontok._canon(exp), canonical(to_plain(exp)), p)
        self.assertEqual(canonical('é'), '"\\u00e9"')                  # SPEC 9 via ensure_ascii; never raw UTF-8
        self.assertEqual(canonical({'é': 1, 'e': 2}), '{"e":2,"\\u00e9":1}')
        self.assertEqual(jsontok._canon({'é': 1, 'e': 2}), '{"e":2,"\\u00e9":1}')


class CommandLine(unittest.TestCase):
    def test_run_case(self):
        cli = os.path.join(HERE, 'cli.py')
        path = case_paths()[0]
        res = subprocess.run([sys.executable, '-I', cli, 'run', path, '--quiet'], capture_output=True)
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertEqual(res.stdout.decode().strip(), canonical(to_plain(load(path)['expected'])))

    def test_op_stdin(self):
        cli = os.path.join(HERE, 'cli.py')
        c = load([p for p in case_paths() if os.path.basename(p).startswith('C34-')][0])
        res = subprocess.run([sys.executable, '-I', cli, 'affected', '-'],
                             input=canonical(to_plain(c['input'])).encode(), capture_output=True)
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertEqual(res.stdout.decode().strip(), canonical(to_plain(c['expected'])))


def main(world_dir=None):
    global WORLD_DIR, _RELEASES
    if world_dir:
        WORLD_DIR = world_dir
        _RELEASES = None
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=1, stream=sys.stdout).run(suite)
    return 0 if result.wasSuccessful() else 1

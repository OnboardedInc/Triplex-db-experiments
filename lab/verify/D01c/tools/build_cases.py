"""V-D01c: build the proposed W0-1.1.2 golden cases (SPEC 11.1 format) into <repo>/lab/verify/D01c/proposed-cases/.

Each case has a hand derivation in `notes`. `expected` is either
- `spec`: written here by hand from SPEC.md (used where O-DOMAIN crashes, so its output cannot be the expectation), or
- `oracle`: O-DOMAIN's output at 276a280, accepted only after `check(out)` confirms every decisive field derived by hand
  (the builder fails if O-DOMAIN disagrees with the hand derivation).
Raw number tokens (-0, 1.65e3, 2^53 + 1) are spliced into the file text, so the case files keep them byte for byte.
usage: build_cases.py <repo worktree>
"""
import base64
import copy
import hashlib
import json
import os
import sys

REPO = sys.argv[1]
sys.path.insert(0, os.path.join(REPO, 'lab', 'oracles', 'domain'))
import w0  # noqa: E402  (O-DOMAIN at 276a280)
from jsontok import canonical, parse_bytes, to_plain  # noqa: E402

CASES = os.path.join(REPO, 'lab', 'world', 'W0', 'cases')
OUT = os.path.join(REPO, 'lab', 'verify', 'D01c', 'proposed-cases')
REL = w0.Releases()
H = {n: REL.by_name[n].hash for n in ('R1', 'R2', 'R3')}
V = '2026-11-04T12:00:00.000000Z'
B10 = {'tx': 10, 'validTime': V}


def case(cid):
    name = [f for f in os.listdir(CASES) if f.startswith(cid + '-')][0]
    with open(os.path.join(CASES, name)) as fh:
        return json.load(fh)


C01 = case('C01')
C01F = C01['input']['world']['facts']


def facts(base=C01F, drop=(), set_=None, add=(), subject=None):
    """Copy a fact list: drop (e, a) pairs, set {(e, a): (v, tx)}, append (e, a, v, tx) tuples."""
    out = []
    for f in base:
        k = (f['e'], f['a'])
        if k in drop:
            continue
        f = dict(f)
        if set_ and k in set_:
            f['v'], f['tx'] = set_[k]
        out.append(f)
    for e, a, v, tx in add:
        out.append({'e': e, 'a': a, 'v': v, 'tx': tx})
    if subject:
        out = [json.loads(json.dumps(f).replace('"pl:a', '"' + subject)) for f in out]
    return out


def world(fs, subject='pl:a'):
    return {'subject': subject, 'facts': fs}


def wi_id(S, rule, kind, key=''):
    return 'wi:' + hashlib.sha256(canonical({'key': key, 'kind': kind, 'rule': rule, 'subject': S}).encode()).hexdigest()


def wi_ver(inputs, payload_text, release):
    """Version over a payload given as canonical text (so A07 payloads keep their tokens)."""
    pre = '{"inputs":%s,"payload":%s,"release":"%s"}' % (json.dumps(inputs, separators=(',', ':')), payload_text, release)
    return 'wv:' + hashlib.sha256(pre.encode()).hexdigest()


def row(out, rule, key=''):
    return [t['row'] for t in out['trace'] if t['rule'] == rule and t['key'] == key][0]


def ids(out, arr):
    return [x['id'] for x in out[arr]]


def strip_basis(o):
    o = dict(o)
    o.pop('basis')
    return o


def record(out):
    return {k: out[k] for k in ('basis', 'release', 'subject', 'workItems')}


def evaluate(fs, rel='R1', basis=B10, subject='pl:a'):
    return w0.run_op('evaluate', {'basis': basis, 'release': rel, 'world': world(fs, subject)}, REL)


SPECS = []


def add(cid, slug, title, op, inp, notes, checks=(), expected=None, check=None, identical=None, pins='', raw=None,
        input_b64=None):
    SPECS.append(dict(id=cid, slug=slug, title=title, op=op, inp=inp, notes=notes, checks=list(checks), expected=expected,
                      check=check, identical=identical, pins=pins, raw=raw or {}, input_b64=input_b64))


# ------------------------------------------------------------------------------------------------------------------
# O-DOMAIN defects (FIX-FIRST): inputs SPEC answers with W0.E_VALUE where O-DOMAIN crashes.
# ------------------------------------------------------------------------------------------------------------------
add('P01', 'err-erased-marker-on-instant', 'An erased marker on a non-PII instant attribute (section1AttestedAt): W0.E_VALUE',
    'evaluate', {'basis': B10, 'release': 'R1', 'world': world(facts(set_={
        ('pl:a', 'section1AttestedAt'): ({'erasedAt': '2026-11-01T00:00:00.000000Z'}, 3)}))},
    ['SPEC 2: erased is allowed only on attributes marked PII; section1AttestedAt is not PII (SPEC 3), so the value is not a',
     'valid instant: 4.4 step 3.2 W0.E_VALUE. C64 pins the same rule on a cents attribute only.',
     'O-DOMAIN 276a280 raises TypeError (lru_cache on is_instant hashes the object) and prints nothing.'],
    expected={'error': 'W0.E_VALUE'}, pins='V-D01c F1')
add('P02', 'err-array-on-date', 'A JSON array as a startDate value: W0.E_VALUE', 'evaluate',
    {'basis': B10, 'release': 'R1', 'world': world(facts(set_={('pl:a', 'startDate'): (['2026-11-02'], 2)}))},
    ['4.4 step 1: a fact\'s v may be any JSON kind. Step 3.2: ["2026-11-02"] is not a date: W0.E_VALUE.',
     'O-DOMAIN 276a280 raises TypeError (unhashable list in the is_date cache).'],
    expected={'error': 'W0.E_VALUE'}, pins='V-D01c F1')
add('P03', 'err-cents-5000-digit-token', 'payRateCents as a 5,000-digit integer token: W0.E_VALUE', 'evaluate',
    {'basis': B10, 'release': 'R1', 'world': world([{'e': 'pl:a', 'a': 'payRateCents', 'v': '@BIG@', 'tx': 1}])},
    ['SPEC 2: an integer token outside 0 to 2^53 - 1 is W0.E_VALUE, whatever its length.',
     'O-DOMAIN 276a280 raises ValueError (Python\'s 4,300-digit int conversion limit) and prints nothing.'],
    expected={'error': 'W0.E_VALUE'}, pins='V-D01c F2', raw={'"@BIG@"': '9' * 5000})

# ------------------------------------------------------------------------------------------------------------------
# A01 to A10 (Q53b: one golden case per reading)
# ------------------------------------------------------------------------------------------------------------------
c01_bytes = json.dumps(C01['input'], separators=(',', ':')).encode()
add('P04', 'err-bytes-bom', 'A01: input bytes with a UTF-8 byte order mark before the object: W0.E_SHAPE', 'evaluate', None,
    ['A01: bytes that are not one JSON value are W0.E_SHAPE. EF BB BF + C01\'s input object.',
     'RFC 8259 8.1 lets a parser ignore a BOM, so SPEC must say it: W0-1.1.2 states the input is one JSON text in UTF-8 with no BOM.',
     'Needs a bytes form of the case file (here inputBase64), since a JSON case cannot carry a BOM or a non-UTF-8 byte.'],
    expected={'error': 'W0.E_SHAPE'}, pins='A01', input_b64=base64.b64encode(b'\xef\xbb\xbf' + c01_bytes).decode())
add('P05', 'err-bytes-not-utf8', 'A01: a 0xFF byte inside a string: W0.E_SHAPE', 'evaluate', None,
    ['A01: not UTF-8, so not a JSON text: W0.E_SHAPE (Node\'s Buffer.toString would silently substitute U+FFFD).'],
    expected={'error': 'W0.E_SHAPE'}, pins='A01',
    input_b64=base64.b64encode(c01_bytes.replace(b'"123456789"', b'"12345678\xff"')).decode())
add('P06', 'cents-negative-zero', 'A02: payRateCents written -0 is the integer 0 (below the floor), written 0 in outputs',
    'evaluate', {'basis': B10, 'release': 'R1', 'world': world(facts(set_={('pl:a', 'payRateCents'): ('@NEG0@', 2)}))},
    ['A02: -0 matches -?(0|[1-9][0-9]*) and its value 0 is in the cents domain; SPEC 9 item 5 writes 0.',
     'MINWAGE row 5: pay 0 < floor 1650 (jur:ny, two hops): task pay.below-minimum due startOf(2026-11-02), overdue;',
     'work item notify.pay-below-minimum with payload {"floorCents":1650,"payRateCents":0}. PAYCHG row 1 (no baseline).'],
    checks=[{'rule': 'MINWAGE', 'polarity': 'positive'}], pins='A02', raw={'"@NEG0@"': '-0'},
    check=lambda o: row(o, 'MINWAGE') == 5 and o['workItems'][0]['payload'] == {'floorCents': 1650, 'payRateCents': 0}
    and ids(o, 'tasks') == ['pl:a#pay.below-minimum'] and o['tasks'][0]['overdue'] is True)
add('P07', 'err-fact-tx-negative-zero', 'A02: a fact tx written -0 is the integer 0: W0.E_BASIS (not W0.E_SHAPE)', 'evaluate',
    {'basis': B10, 'release': 'R1', 'world': world(facts(set_={('loc:nyc', 'jurisdiction'): ('jur:ny', '@NEG0@')}))},
    ['A02: -0 is an integer token (step 1 passes); its value 0 is below 1: 4.4 step 3.2 W0.E_BASIS.'],
    expected={'error': 'W0.E_BASIS'}, pins='A02', raw={'"@NEG0@"': '-0'})
add('P08', 'err-cardinality-after-unknown', 'A03: a duplicate startDate before an unknown attribute: W0.E_UNKNOWN', 'evaluate',
    {'basis': B10, 'release': 'R1', 'world': world([
        {'e': 'pl:a', 'a': 'startDate', 'v': '2026-11-02', 'tx': 1}, {'e': 'pl:a', 'a': 'startDate', 'v': '2026-11-03', 'tx': 1},
        {'e': 'pl:a', 'a': 'nickname', 'v': 'x', 'tx': 1}])},
    ['4.4 step 3.2 runs over every fact before step 3.3: fact 2 has an attribute outside SPEC 3, W0.E_UNKNOWN, before the',
     'cardinality clash of facts 0 and 1 is looked at (A03).'], expected={'error': 'W0.E_UNKNOWN'}, pins='A03')
add('P09', 'err-affected-world-by-world', 'A04: affected with world 1 a cardinality clash and world 2 a bad subject: W0.E_CARDINALITY',
    'affected', {'basis': B10, 'release': 'R1', 'writes': [], 'worlds': [
        world([{'e': 'pl:a', 'a': 'startDate', 'v': '2026-11-02', 'tx': 1},
               {'e': 'pl:a', 'a': 'startDate', 'v': '2026-11-03', 'tx': 1}]), world([], subject='xx:b')]},
    ['4.4 step 3 runs sub-steps 1 to 3 for each world in array order: world 1 fails 3.3 before world 2 is checked (A04).'],
    expected={'error': 'W0.E_CARDINALITY'}, pins='A04')
add('P10', 'err-activation-value-before-basis', 'A05: one activation with a bad release and a bad tx: W0.E_VALUE', 'reconcile',
    {'activations': [{'from': '2026-11-01T00:00:00.000000Z', 'release': 'R1', 'tx': 11}], 'basis': B10, 'world': world(facts())},
    ['4.4 step 4, within one activation: W0.E_VALUE (release R1 is not sha256:...) before W0.E_BASIS (tx 11 > 10) (A05).'],
    expected={'error': 'W0.E_VALUE'}, pins='A05')
add('P11', 'err-world-before-activations', 'A05: a world value error and an activation basis error: the world (step 3) wins',
    'reconcile', {'activations': [{'from': '2026-11-01T00:00:00.000000Z', 'release': H['R1'], 'tx': 11}], 'basis': B10,
                  'world': world([{'e': 'pl:a', 'a': 'weeklyMinutes', 'v': 10081, 'tx': 1}])},
    ['Step 3: weeklyMinutes 10081 > 10080 is W0.E_VALUE. Step 4 (activation tx 11 > 10, W0.E_BASIS) never runs (A05).',
     'The O-DOMAIN unit test pairs two E_VALUE errors, so it cannot see the order; this pair can.'],
    expected={'error': 'W0.E_VALUE'}, pins='A05')
add('P12', 'err-no-release-no-fallback', 'A06: the picked activation names an unknown hash: W0.E_NO_RELEASE, no fall back', 'reconcile',
    {'activations': [{'from': '2026-11-01T00:00:00.000000Z', 'release': H['R1'], 'tx': 8},
                     {'from': '2026-11-02T00:00:00.000000Z', 'release': 'sha256:' + '0' * 64, 'tx': 9}],
     'basis': B10, 'world': world(facts())},
    ['5.4: both from <= v; the greatest from (11-02) is picked; its well-formed hash is none of R1, R2, R3: step 4',
     'W0.E_NO_RELEASE. The older R1 activation is not used (A06).'], expected={'error': 'W0.E_NO_RELEASE'}, pins='A06')

pay_wi = wi_id('pl:a', 'MINWAGE', 'notify.pay-below-minimum')
p13_text1 = '{"floorCents":1.65e3,"note":"\\u00e9","payRateCents":0}'
p13_text2 = '{"floorCents":1650,"note":"\\u00e9","payRateCents":0}'
add('P13', 'publish-opaque-payload-tokens', 'A07: opaque payload tokens: 1.65e3 is kept as written and differs from 1650; -0 is 0; non-ASCII is escaped',
    'publish', {'evaluations': [
        {'basis': {'tx': 20, 'validTime': V}, 'release': H['R1'], 'subject': 'pl:a', 'workItems': [
            {'id': pay_wi, 'inputs': [1, 2], 'key': '', 'kind': 'notify.pay-below-minimum', 'payload': '@P1@', 'rule': 'MINWAGE',
             'version': wi_ver([1, 2], p13_text1, H['R1'])}]},
        {'basis': {'tx': 21, 'validTime': V}, 'release': H['R1'], 'subject': 'pl:a', 'workItems': [
            {'id': pay_wi, 'inputs': [1, 2], 'key': '', 'kind': 'notify.pay-below-minimum', 'payload': '@P2@', 'rule': 'MINWAGE',
             'version': wi_ver([1, 2], p13_text2, H['R1'])}]}],
        'state': {'items': [], 'pending': [], 'subjects': []}},
    ['A07: publish and receive pass payloads through unchecked (4.4 step 1). Canonical form of an opaque payload: an integer token',
     'as its integer (-0 -> 0), any other number token as its source text (1.65e3), strings with \\uXXXX escapes for non-ASCII.',
     'Record 1 carries {"floorCents":1.65e3,"note":<e-acute as raw UTF-8>,"payRateCents":-0} and publishes seq 1, written',
     '{"floorCents":1.65e3,"note":"\\u00e9","payRateCents":0}. Record 2 carries {"floorCents":1650,"note":"\\u00e9","payRateCents":0}:',
     'the notes and the pay compare equal, but 1.65e3 and 1650 differ as written, so seq 2 is published (8.8 step 2).',
     'A JSON.parse/JSON.stringify kernel sees 1650 twice and publishes nothing for record 2, and writes the e-acute raw: it must',
     'keep number tokens and escape non-ASCII, or W0-1.1.2 must make such payloads W0.E_SHAPE instead.'],
    pins='A07', raw={'"@P1@"': '{"floorCents":1.65e3,"note":"é","payRateCents":-0}',
                     '"@P2@"': '{"floorCents":1650,"note":"\\u00e9","payRateCents":0}'},
    check=lambda o: [d['seq'] for d in o['deliveries']] == [1, 2])

wi_a = wi_id('pl:a', 'BGC', 'bgc.order')
wi_b = wi_id('pl:a', 'MINWAGE', 'notify.pay-below-minimum')
first, second = sorted([wi_a, wi_b])
add('P14', 'publish-state-out-of-order-repeats', 'A08: input state out of order with a repeated id and a repeated subject: later entries win, outputs re-sorted',
    'publish', {'evaluations': [
        {'basis': {'tx': 6, 'validTime': V}, 'release': H['R1'], 'subject': 'pl:a', 'workItems': []},
        {'basis': {'tx': 8, 'validTime': V}, 'release': H['R1'], 'subject': 'pl:a', 'workItems': [
            {'id': second, 'inputs': [1], 'key': '', 'kind': 'k', 'payload': {'q': 2}, 'rule': 'MINWAGE', 'version': 'wv:x'}]}],
        'state': {'items': [
            {'id': second, 'payload': {'q': 1}, 'retired': False, 'seq': 1, 'subject': 'pl:a'},
            {'id': first, 'payload': {}, 'retired': False, 'seq': 4, 'subject': 'pl:a'},
            {'id': second, 'payload': {'q': 2}, 'retired': False, 'seq': 3, 'subject': 'pl:a'}],
            'pending': [], 'subjects': [
            {'basis': {'tx': 9, 'validTime': V}, 'subject': 'pl:b'},
            {'basis': {'tx': 5, 'validTime': V}, 'subject': 'pl:a'},
            {'basis': {'tx': 7, 'validTime': V}, 'subject': 'pl:a'}]}},
    ['A08: input states are indexed by id and by subject, a later entry replacing an earlier one; output arrays are re-sorted.',
     'pl:a\'s stored basis is tx 7 (the later entry). Record 1 (tx 6) is older: skipped. (First-wins, tx 5, would apply it',
     'and retire both items.) Record 2 (tx 8) applies: item ' + second[:10] + '... has payload {"q":2} (later entry, seq 3), equal',
     'to the record\'s, so nothing is published; item ' + first[:10] + '... is not in the record and is retired (seq 4 stays).',
     'Output items ascending by id, subjects ascending by subject (pl:a tx 8, pl:b tx 9), deliveries [].'],
    pins='A08', check=lambda o: o['deliveries'] == [] and [(i['id'], i['seq'], i['retired']) for i in o['state']['items']]
    == [(first, 4, True), (second, 3, False)] and [s['subject'] for s in o['state']['subjects']] == ['pl:a', 'pl:b']
    and o['state']['subjects'][0]['basis']['tx'] == 8)
add('P15', 'publish-duplicate-id-in-record', 'A09: one record carries two work items with one id: processed in input order within the id, the second compared with the first',
    'publish', {'evaluations': [
        {'basis': {'tx': 20, 'validTime': V}, 'release': H['R1'], 'subject': 'pl:a', 'workItems': [
            {'id': pay_wi, 'inputs': [1], 'key': '', 'kind': 'notify.pay-below-minimum', 'payload': {'floorCents': 1650,
             'payRateCents': 1600}, 'rule': 'MINWAGE', 'version': 'wv:p1'},
            {'id': pay_wi, 'inputs': [1], 'key': '', 'kind': 'notify.pay-below-minimum', 'payload': {'floorCents': 1700,
             'payRateCents': 1600}, 'rule': 'MINWAGE', 'version': 'wv:p2'}]}],
        'state': {'items': [], 'pending': [], 'subjects': []}},
    ['A09 (evaluate never produces this): 8.8 step 2 walks the work items in id order; equal ids keep their input order (stable).',
     'The first publishes seq 1 (floor 1650); the second is compared with the state the first set, differs, and publishes seq 2',
     '(floor 1700). The item ends at seq 2 with floor 1700.'],
    pins='A09', check=lambda o: [(d['seq'], d['payload']['floorCents']) for d in o['deliveries']] == [(1, 1650), (2, 1700)])

# ------------------------------------------------------------------------------------------------------------------
# Mutants no golden case kills (some are killed only by O-DOMAIN's own unit tests or the fingerprint, which do not
# judge the TypeScript kernel)
# ------------------------------------------------------------------------------------------------------------------
add('P16', 'reconcile-equal-from-tx-beats-release', 'Equal from: the greater tx wins even when its release string is smaller (C61 cannot tell the two orders apart)',
    'reconcile', {'activations': [{'from': '2026-11-01T00:00:00.000000Z', 'release': H['R1'], 'tx': 8},
                                  {'from': '2026-11-01T00:00:00.000000Z', 'release': H['R2'], 'tx': 9}],
                  'basis': B10, 'world': world(facts())},
    ['5.4 step 3: equal from, so the greater tx (9, R2) wins. R2\'s hash sha256:7d2f... is smaller than R1\'s sha256:fd57...,',
     'so ordering by release string before tx would pick R1. In C61 the greater tx also has the greater string.',
     'C01\'s world and basis under R2: the bytes equal C02\'s.'], identical='C02', pins='M04')
add('P17', 'reconcile-equal-tx-release-string', 'Equal from and equal tx: the greater release string wins', 'reconcile',
    {'activations': [{'from': '2026-11-01T00:00:00.000000Z', 'release': H['R2'], 'tx': 9},
                     {'from': '2026-11-01T00:00:00.000000Z', 'release': H['R1'], 'tx': 9}], 'basis': B10, 'world': world(facts())},
    ['5.4 step 3, third tie-break: sha256:fd57... (R1) > sha256:7d2f... (R2) in byte order: R1. Bytes equal C01\'s.'],
    identical='C01', pins='M05')
add('P18', 'reconcile-from-equals-valid-time', 'An activation whose from equals the basis valid time is in force', 'reconcile',
    {'activations': [{'from': V, 'release': H['R1'], 'tx': 8}], 'basis': B10, 'world': world(facts())},
    ['5.4 step 1: from <= v by string comparison, equality included. Bytes equal C01\'s.'], identical='C01', pins='M06')
add('P19', 'reconcile-activation-at-basis-tx', 'An activation committed at basis.tx itself is visible', 'reconcile',
    {'activations': [{'from': '2026-11-01T00:00:00.000000Z', 'release': H['R1'], 'tx': 10}], 'basis': B10, 'world': world(facts())},
    ['4.4 step 4: W0.E_BASIS only when tx > basis.tx; 10 = 10 is valid. Bytes equal C01\'s.'], identical='C01', pins='M07')
add('P20', 'fact-at-basis-tx', 'A fact committed at basis.tx itself is in the world', 'evaluate',
    {'basis': {'tx': 7, 'validTime': V}, 'release': 'R1', 'world': world(facts())},
    ['4.4 step 3.2: W0.E_BASIS only when tx > basis.tx. C01\'s world (largest fact tx 7) at basis tx 7: C01\'s output with',
     'basis.tx 7. No golden case has a fact at basis.tx (every valid case has basis.tx 10 or 20 and facts at most 9).'],
    pins='M08', check=lambda o: strip_basis(o) == strip_basis(to_plain(C01['expected'])) and o['basis']['tx'] == 7)
add('P21', 'basis-tx-zero', 'basis.tx 0 with an empty world is valid', 'evaluate',
    {'basis': {'tx': 0, 'validTime': V}, 'release': 'R1', 'world': world([])},
    ['4.1: basis.tx is 0 to 2^53 - 1. An empty world: LIFE row 1 (start-unknown), I9S1 row 2, I9S2 row 4, EVSUB row 2 with null',
     'due times, BGC row 1 (bgc.order), MINWAGE row 1, OT row 1, PAYCHG row 1, DOCEXP and PROP row 0. basis echoed with tx 0.'],
    pins='M09', check=lambda o: o['basis']['tx'] == 0 and row(o, 'LIFE') == 1 and row(o, 'BGC') == 1)
add('P22', 'basis-tx-max-safe', 'basis.tx 2^53 - 1 is valid', 'evaluate',
    {'basis': {'tx': 9007199254740991, 'validTime': V}, 'release': 'R1', 'world': world(facts())},
    ['4.1: 9007199254740991 is in range. C01\'s output with that basis.tx.'],
    pins='M10', check=lambda o: strip_basis(o) == strip_basis(to_plain(C01['expected'])))
add('P23', 'err-basis-tx-2pow53', 'basis.tx 2^53: W0.E_BASIS', 'evaluate',
    {'basis': {'tx': 9007199254740992, 'validTime': V}, 'release': 'R1', 'world': world(facts())},
    ['4.4 step 2: 9007199254740992 is outside 0 to 2^53 - 1. (JavaScript parses it exactly; Number.isSafeInteger is false.)'],
    expected={'error': 'W0.E_BASIS'}, pins='M10b')
add('P24', 'err-fact-tx-2pow53-plus-1', 'A fact tx of 2^53 + 1 (JavaScript parses it as 2^53): W0.E_BASIS', 'evaluate',
    {'basis': {'tx': 9007199254740991, 'validTime': V}, 'release': 'R1',
     'world': world([{'e': 'pl:a', 'a': 'startDate', 'v': '2026-11-02', 'tx': '@BIGTX@'}])},
    ['4.4 step 3.2: tx 9007199254740993 > basis.tx 9007199254740991: W0.E_BASIS; a JavaScript reader that rounds it to 2^53',
     'still fails the same check, so the answer does not depend on rounding.'],
    expected={'error': 'W0.E_BASIS'}, pins='check 6', raw={'"@BIGTX@"': '9007199254740993'})
add('P25', 'err-value-before-basis-in-one-fact', 'One fact with an invalid date and tx after the basis: W0.E_VALUE', 'evaluate',
    {'basis': B10, 'release': 'R1', 'world': world([{'e': 'pl:a', 'a': 'startDate', 'v': '2026-02-30', 'tx': 11}])},
    ['4.4 step 3.2, within one fact: unknown, then value, then basis. 2026-02-30 is not a date: W0.E_VALUE before the tx check.',
     'C43 pins the order across two facts only.'], expected={'error': 'W0.E_VALUE'}, pins='M11')
add('P26', 'minwage-local-floor-below-state-r2', 'R2 with a local floor below the state floor: the greater (state) floor applies', 'evaluate',
    {'basis': B10, 'release': 'R2', 'world': world(facts(set_={('pl:a', 'payRateCents'): (1600, 2)},
                                                          add=[('loc:nyc', 'localMinWageCents', 1500, 1)]))},
    ['7.8: floor = the greatest present value among (J, stateMinWageCents) 1650 and (L, localMinWageCents) 1500: 1650.',
     'Pay 1600 < 1650: row 5, task pay.below-minimum (due 2026-11-02T00, overdue) and notify.pay-below-minimum',
     '{"floorCents":1650,"payRateCents":1600}. "The local floor overrides" would give 1600 >= 1500, row 4.',
     'The population never has a local floor below the state floor (every local floor is 1850 over a state floor of 1650).'],
    checks=[{'rule': 'MINWAGE', 'polarity': 'positive'}], pins='M18',
    check=lambda o: row(o, 'MINWAGE') == 5 and o['workItems'][0]['payload'] == {'floorCents': 1650, 'payRateCents': 1600})
add('P27', 'paychg-position-from-decisions-fact', "pos(D) counts the subject's decisions fact: a record linked after the pay change is a fresh approval",
    'evaluate', {'basis': B10, 'release': 'R1', 'world': world(facts(set_={('pl:a', 'payRateCents'): (1650, 5)}, add=[
        ('pl:a', 'baselinePayRateCents', 1000, 2), ('pl:a', 'decisions', 'pl:a/dec:p1', 6),
        ('pl:a/dec:p1', 'target', 'pay.change', 4), ('pl:a/dec:p1', 'verdict', 'approve', 4),
        ('pl:a/dec:p1', 'author', 'person', 4)]))},
    ['6.2 item 2: pos(dec:p1) = max(6, 4, 4, 4) = 6, the (pl:a, decisions, dec:p1) fact included.',
     '7.10: |1650 - 1000| = 650 > 500; f = final(pay.change, tx(payRateCents) = 5): pos 6 >= 5, approve: row 3, no task.',
     'Without the decisions fact pos would be 4 < 5 (stale): row 5. Every golden case and every population record asserts the',
     'decisions fact in the same transaction as the record, so nothing else can tell these apart.'],
    checks=[{'rule': 'PAYCHG', 'polarity': 'negative'}], pins='M23',
    check=lambda o: row(o, 'PAYCHG') == 3 and not [t for t in o['tasks'] if t['rule'] == 'PAYCHG'])
add('P28', 'i9s2-incomplete-record', 'An incomplete Section 2 record (no verdict fact) is read but never counts', 'evaluate',
    {'basis': B10, 'release': 'R1', 'world': world(facts(drop=[('pl:a/dec:1', 'verdict')]))},
    ['6.2 item 1: dec:1 has target and author but no verdict: incomplete, never a decision. I9S2 f = none: row 4, task',
     'i9.section2 due endOfDay(addBusinessDays(2026-11-02, 3)) = 2026-11-06T00, not overdue, with its due obligation.',
     'The pair (dec:1, verdict) stays in the dependencies; PROP row 0 inputs keep dec:1\'s remaining facts (SPEC 14 item 18).',
     'No golden case or population world holds an incomplete record.'],
    checks=[{'rule': 'I9S2', 'polarity': 'positive'}], pins='M25',
    check=lambda o: row(o, 'I9S2') == 4 and ['pl:a/dec:1', 'verdict'] in o['dependencies']
    and [t for t in o['trace'] if t['rule'] == 'PROP'][0]['inputs'] == [6])
add('P29', 'prop-latest-proposal-counts', 'Two proposals on one target with a human decision between them: the latest proposal is still pending',
    'evaluate', {'basis': B10, 'release': 'R1', 'world': world(facts(add=[
        ('pl:a', 'decisions', 'pl:a/dec:2', 4), ('pl:a/dec:2', 'target', 'i9.section2', 4), ('pl:a/dec:2', 'verdict', 'approve', 4),
        ('pl:a/dec:2', 'author', 'agent', 4), ('pl:a', 'decisions', 'pl:a/dec:3', 8), ('pl:a/dec:3', 'target', 'i9.section2', 8),
        ('pl:a/dec:3', 'verdict', 'reject', 8), ('pl:a/dec:3', 'author', 'agent', 8)]))},
    ['7.11: proposals on i9.section2 at pos 4 (dec:2) and 8 (dec:3); p = 8. The person approve dec:1 has pos 6 < 8: row 2,',
     'task review.proposal key i9.section2. With p taken as the earliest proposal (4), dec:1 would resolve it.',
     'I9S2 still row 1: proposals never count. PROP inputs [4, 6, 8].'],
    checks=[{'rule': 'PROP', 'polarity': 'positive'}, {'rule': 'I9S2', 'polarity': 'negative'}], pins='M26',
    check=lambda o: row(o, 'PROP', 'i9.section2') == 2 and row(o, 'I9S2') == 1
    and 'pl:a#review.proposal#i9.section2' in ids(o, 'tasks'))
add('P30', 'docexp-reverified-false', 'An expired ead with reverified = false is not reverified', 'evaluate',
    {'basis': B10, 'release': 'R1', 'world': world(facts(add=[
        ('pl:a', 'documents', 'pl:a/doc:1', 8), ('pl:a/doc:1', 'docType', 'ead', 8), ('pl:a/doc:1', 'expiresOn', '2026-10-31', 8),
        ('pl:a/doc:1', 'reverified', False, 8)]))},
    ['7.7 row 2 needs d.reverified = true; false falls through. expiresOn 2026-10-31, lead 0: B = W = 2026-11-01T00 <= v: row 6,',
     'task doc.reverify key pl:a/doc:1 due B (overdue) and notify.document-expired {"docType":"ead","expiresOn":"2026-10-31"}.',
     'No golden case or population world writes reverified false.'],
    checks=[{'rule': 'DOCEXP', 'polarity': 'positive'}], pins='M28',
    check=lambda o: row(o, 'DOCEXP', 'pl:a/doc:1') == 6 and o['workItems'][0]['payload'] == {'docType': 'ead', 'expiresOn': '2026-10-31'})
add('P31', 'r3-scope-listed-jurisdiction-without-facts', 'R3: a listed jurisdiction with no facts is in scope (ids only); 2,700 minutes is not overtime',
    'evaluate', {'basis': B10, 'release': 'R3', 'world': world(facts(
        drop=[('jur:ny', 'stateMinWageCents'), ('loc:nyc', 'jurisdiction'), ('pl:a', 'location')],
        set_={('pl:a', 'weeklyMinutes'): (2700, 7)},
        add=[('loc:x', 'jurisdiction', 'jur:j010', 1), ('pl:a', 'location', 'loc:x', 2)]))},
    ['5.1: the scope test compares ids only. jur(S) = jur:j010 (listed), although the world has no jur:j010 fact: threshold',
     '2,700; 2,700 is not > 2,700: OT row 3, no flag, inputs [1, 2, 7] (location facts included, 6.3).',
     'MINWAGE (R3 reads both floor sources, as R2): (jur:j010, stateMinWageCents) and (loc:x, localMinWageCents) are',
     'dependencies but absent: row 3, task pay.floor-unknown. V-D01 note N1 asked for this case.'],
    checks=[{'rule': 'OT', 'polarity': 'negative'}, {'rule': 'MINWAGE', 'polarity': 'positive'}], pins='M35 (V-D01 N1)',
    check=lambda o: row(o, 'OT') == 3 and not o['flags'] and row(o, 'MINWAGE') == 3
    and [t for t in o['trace'] if t['rule'] == 'OT'][0]['inputs'] == [1, 2, 7])
add('P32', 'life-at-start-instant', 'The basis exactly at the start instant: no pre-start flag, no start obligation', 'evaluate',
    {'basis': {'tx': 10, 'validTime': '2026-11-02T00:00:00.000000Z'}, 'release': 'R1', 'world': world(facts())},
    ['7.1 row 2 needs v < startOf(startDate); v = startOf(2026-11-02): row 3. Every other rule as in C01 (no due time falls in',
     'between), so the output is C01\'s with the new basis.'],
    checks=[{'rule': 'LIFE', 'polarity': 'negative'}], pins='M31',
    check=lambda o: strip_basis(o) == strip_basis(to_plain(C01['expected'])))
add('P33', 'evsub-dashed-ssn-with-accepted-result', 'EVSUB: a dashed SSN beats an accepted submit result (row 4 before row 5)', 'evaluate',
    {'basis': B10, 'release': 'R1', 'world': world(facts(
        drop=[('pl:a', 'everifyStatus'), ('pl:a', 'everifyStatusAt')], set_={('pl:a', 'ssn'): ('123-45-6789', 3)},
        add=[('pl:a', 'everifySubmitResult', 'accepted', 8)]))},
    ['7.4: status absent; SSN present, not erased, not nine digits: row 4, task everify.fix-ssn due',
     'endOfDay(addBusinessDays(2026-11-02, 3)) = 2026-11-06T00 (not overdue, due obligation). Row 5 (accepted) is never reached.',
     'The population draws a submit result only for a valid SSN (A10), so only O-DOMAIN\'s 13.4 invariant test sees this.'],
    checks=[{'rule': 'EVSUB', 'polarity': 'positive'}], pins='M37', check=lambda o: row(o, 'EVSUB') == 4)
add('P34', 'affected-worlds-unsorted', 'affected: worlds given in descending subject order; the answer is ascending', 'affected',
    None, ['Section 10: the affected subjects are listed ascending, whatever the order of worlds. C34\'s input with its',
           'worlds reversed: the bytes equal C34\'s.'], identical='C34', pins='M41')
c73 = case('C73')
r0, r1 = c73['input']['evaluations'][0], c73['input']['evaluations'][1]
r1_earlier = copy.deepcopy(r1)
r1_earlier['basis'] = {'tx': 20, 'validTime': '2026-11-04T11:00:00.000000Z'}
add('P35', 'publish-equal-tx-earlier-valid-time-skipped', 'publish: equal tx with an earlier validTime is an older basis and is skipped',
    'publish', {'evaluations': [r0, r1_earlier], 'state': {'items': [], 'pending': [], 'subjects': []}},
    ['8.8 step 1: older means a smaller tx, or an equal tx with an earlier validTime. Record 1 (tx 20, 12:00) publishes both ids',
     'with seq 1. Record 2 (tx 20, 11:00, floor 1700) is older: skipped, so the pay notice stays at seq 1, floor 1650.',
     'Every golden publish record has validTime 12:00, so no case reaches the validTime half of the guard.'],
    pins='M43', check=lambda o: [d['seq'] for d in o['deliveries']] == [1, 1])
r1_equal = copy.deepcopy(r1)
r1_equal['basis'] = {'tx': 20, 'validTime': V}
add('P36', 'publish-equal-basis-applied', 'publish: an equal basis is not older, so a second record at that basis is applied (low priority)',
    'publish', {'evaluations': [r0, r1_equal], 'state': {'items': [], 'pending': [], 'subjects': []}},
    ['8.8 step 1: an equal basis is not older. Record 2 has the same basis as record 1 but floor 1700: applied, the pay notice',
     'publishes seq 2. SPEC 14 item 40 notes consistent records cannot show this; these two records are inconsistent on',
     'purpose, which publish as a pure function still answers.'],
    pins='M44', check=lambda o: [d['seq'] for d in o['deliveries']] == [1, 1, 2])
out_b = evaluate(facts(drop=[('pl:a', 'bgcStatus')], subject='pl:b'), subject='pl:b')
rec_b = record(out_b)
r0_later = copy.deepcopy(r0)
r0_later['basis'] = {'tx': 21, 'validTime': V}
add('P37', 'publish-retirement-per-subject', "publish: a record retires only its own subject's items", 'publish',
    {'evaluations': [r0, rec_b, r0_later], 'state': {'items': [], 'pending': [], 'subjects': []}},
    ['Record 1 (pl:a, tx 20) publishes its two ids with seq 1. Record 2 (pl:b, tx 10, its bgc.order) publishes seq 1 for',
     'pl:b\'s id; step 3 retires only pl:b\'s items not in the record (none). Record 3 (pl:a, tx 21) repeats record 1\'s payloads:',
     'nothing is published. Retiring pl:a\'s items on pl:b\'s record would make record 3 republish both with seq 2 (Q40h).',
     'Every golden publish case has one subject.'],
    pins='M45', check=lambda o: [(d['subject'], d['seq']) for d in o['deliveries']] == [('pl:a', 1), ('pl:a', 1), ('pl:b', 1)])
r3_r2 = copy.deepcopy(c73['input']['evaluations'][1])
r3_r2['basis'] = {'tx': 23, 'validTime': V}
pub4 = w0.run_op('publish', {'evaluations': c73['input']['evaluations'] + [r3_r2],
                             'state': {'items': [], 'pending': [], 'subjects': []}}, REL)
pay4 = [d for d in pub4['deliveries'] if d['id'] == pay_wi]
assert [d['seq'] for d in pay4] == [1, 2, 3, 4]
add('P38', 'receive-two-waiting-released', 'receive: arrivals 1, 4, 3, 2: seq 2 releases both waiting deliveries', 'receive',
    {'deliveries': [pay4[0], pay4[3], pay4[2], pay4[1]], 'state': {'effects': [], 'projection': []}},
    ['The pay notice of C73 plus a fourth record (R2 at tx 23): seq 1 to 4. Arrivals 1, 4, 3, 2.',
     'Projection: applies 1, then 4 (4 > 1); ignores 3 and 2 (not > 4). Effects: 1 processed (done 1); 4 waits; 3 waits;',
     '2 processed, then waiting 3, then waiting 4, repeatedly (8.9): effects 1, 2, 3, 4; done 4, waiting [].',
     'Golden receive cases release at most one waiting delivery.'],
    pins='M47', check=lambda o: [d['seq'] for d in o['applied']['effects']] == [1, 2, 3, 4]
    and [d['seq'] for d in o['applied']['projection']] == [1, 4])
add('P39', 'i9s2-saturday-start', 'A Saturday start: Section 2 due counts from Monday (Sat + 3 business days = Wed)', 'evaluate',
    {'basis': {'tx': 10, 'validTime': '2026-11-06T09:00:00.000000Z'}, 'release': 'R1', 'world': world(facts(
        drop=[('pl:a/dec:1', 'target'), ('pl:a/dec:1', 'verdict'), ('pl:a/dec:1', 'author'), ('pl:a', 'decisions')],
        set_={('pl:a', 'startDate'): ('2026-11-07', 2)}))},
    ['6.1: addBusinessDays(2026-11-07 Sat, 3) = 2026-11-11 Wed (the SPEC example); I9S2 row 4 due endOfDay = 2026-11-12T00.',
     'C01\'s world without its Section 2 record. v 2026-11-06T09 < startOf(2026-11-07): LIFE row 2, pre-start flag and start',
     'obligation; I9S1 row 1 (attested, SSN present).',
     'Only O-DOMAIN\'s unit test and the population pin a weekend start; no golden case does.'],
    checks=[{'rule': 'I9S2', 'polarity': 'positive'}], pins='M03',
    check=lambda o: [t['dueAt'] for t in o['tasks'] if t['kind'] == 'i9.section2'] == ['2026-11-12T00:00:00.000000Z'])


add('P40', 'facts-reversed-two-documents', "C19's world with its facts in reverse order: identical bytes (DOCEXP keys ascending)",
    'evaluate', None,
    ['4.2 item 5 and 13.1: fact order carries no meaning. C19 has two tracked documents; with the facts reversed the DOCEXP',
     'trace entries must still be ascending by key (8.7), so the bytes equal C19\'s. Only O-DOMAIN\'s shuffle test pins this;',
     'every population world has at most one document.'], identical='C19', pins='M40')


def serialize(obj, raw):
    text = json.dumps(obj, indent=1)
    for k, v in raw.items():
        n = text.count(k)
        assert n >= 1, k
        text = text.replace(k, v)
    return text


def main():
    os.makedirs(OUT, exist_ok=True)
    index = []
    c34 = case('C34')
    for s in SPECS:
        if s['id'] == 'P34':
            s['inp'] = copy.deepcopy(c34['input'])
            s['inp']['worlds'] = list(reversed(s['inp']['worlds']))
        if s['id'] == 'P40':
            s['inp'] = copy.deepcopy(case('C19')['input'])
            s['inp']['world']['facts'] = list(reversed(s['inp']['world']['facts']))
        doc = {'id': s['id'], 'slug': s['slug'], 'title': s['title'], 'op': s['op'], 'checks': s['checks']}
        if s['identical']:
            doc['identicalTo'] = s['identical']
        doc['notes'] = s['notes']
        if s['input_b64'] is not None:
            doc['inputBase64'] = s['input_b64']
            data = base64.b64decode(s['input_b64'])
            got = w0.run_op_bytes(s['op'], data, REL)
        else:
            doc['input'] = s['inp']
            text = serialize({'input': s['inp']}, s['raw'])
            try:
                got = w0.run_op(s['op'], parse_bytes(text.encode())['input'], REL)
            except Exception as exc:  # only allowed where the expectation is written from SPEC
                assert s['expected'] is not None, (s['id'], exc)
                got = None
        if s['expected'] is not None:
            expected, source = s['expected'], 'spec'
        elif s['identical']:
            expected, source = to_plain(case(s['identical'])['expected']), 'identicalTo ' + s['identical']
            assert canonical(got) == canonical(expected), (s['id'], 'O-DOMAIN differs from the identical case')
        else:
            assert 'error' not in got and s['check'](to_plain(got)), (s['id'], 'O-DOMAIN differs from the hand derivation', got)
            expected, source = got, 'oracle, hand-checked'
        doc['expected'] = '@EXPECTED@'
        text = serialize(doc, s['raw'])
        exp_text = canonical(expected) if not isinstance(expected, dict) or 'error' in expected else canonical(expected)
        text = text.replace('"@EXPECTED@"', exp_text)
        path = os.path.join(OUT, '%s-%s.json' % (s['id'], s['slug']))
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(text + '\n')
        # re-read the file and confirm what O-DOMAIN does with it
        back = parse_bytes(open(path, 'rb').read())
        if 'inputBase64' in back:
            o = w0.run_op_bytes(back['op'], base64.b64decode(back['inputBase64']), REL)
        else:
            try:
                o = w0.run_op(back['op'], back['input'], REL)
            except Exception as exc:  # O-DOMAIN crash (the FIX-FIRST defects)
                o = {'crash': type(exc).__name__}
        ok = canonical(o) == canonical(to_plain(back['expected'])) if 'crash' not in o else False
        index.append({'id': s['id'], 'file': os.path.basename(path), 'op': s['op'], 'pins': s['pins'], 'expectedFrom': source,
                      'oDomainAt276a280': 'pass' if ok else ('CRASH ' + o['crash'] if 'crash' in o else 'FAIL')})
        print('%s %-48s %-14s %-28s O-DOMAIN: %s' % (s['id'], s['slug'][:48], s['pins'], source, index[-1]['oDomainAt276a280']))
    with open(os.path.join(OUT, 'INDEX.json'), 'w') as fh:
        json.dump(index, fh, indent=1)
        fh.write('\n')


main()

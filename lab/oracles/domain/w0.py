"""O-DOMAIN core: the six pure W0 operations of lab/world/W0/SPEC.md (W0-1.1.1), written from SPEC.md alone.

evaluate, resolveRelease/reconcile, affected, publish and receive (SPEC 1). Every function here is pure: no clock, no
randomness, no environment (SPEC 1). Comments name the SPEC section each rule implements. Readings of places where
SPEC.md leaves room are marked SPEC-AMBIGUITY Axx and listed in README.md.
"""

import datetime
import functools
import hashlib
import os
import re

from jsontok import canonical, has_duplicate_key, int_token_value, parse_bytes, to_plain

SPEC_VERSION = 'W0-1.1.1'
MAX_SAFE = 9007199254740991  # SPEC 2: 2^53 - 1

E_SHAPE = 'W0.E_SHAPE'
E_BASIS = 'W0.E_BASIS'
E_UNKNOWN = 'W0.E_UNKNOWN'
E_VALUE = 'W0.E_VALUE'
E_CARDINALITY = 'W0.E_CARDINALITY'
E_NO_RELEASE = 'W0.E_NO_RELEASE'


class W0Error(Exception):
    """An invalid input: the operation's whole output is {"error": code} (SPEC 4.4)."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


# ---------------------------------------------------------------------------------------------------------------
# SPEC 2: value types
# ---------------------------------------------------------------------------------------------------------------

_DATE_RE = re.compile(r'([0-9]{4})-([0-9]{2})-([0-9]{2})')
_INSTANT_RE = re.compile(r'([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})\.[0-9]{6}Z')
_TEXT_RE = re.compile(r'[ -~]{1,64}')  # SPEC 2 text: 1 to 64 characters, each U+0020 to U+007E
_SSN_RE = re.compile(r'[0-9]{9}')      # SPEC 7.4 row 4: exactly 9 characters each in 0 to 9
_HASH_RE = re.compile(r'sha256:[0-9a-f]{64}')  # SPEC 4.4 step 4


@functools.lru_cache(maxsize=65536)
def is_date(s):
    """SPEC 2 date: `YYYY-MM-DD`, a real proleptic Gregorian date with year 2000 to 2099."""
    if type(s) is not str or len(s) != 10:
        return False
    m = _DATE_RE.fullmatch(s)
    if m is None:
        return False
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not 2000 <= y <= 2099:
        return False
    try:
        datetime.date(y, mo, d)
    except ValueError:
        return False
    return True


@functools.lru_cache(maxsize=65536)
def is_instant(s):
    """SPEC 2 instant: exactly 27 characters `YYYY-MM-DDTHH:MM:SS.ffffffZ`; date part a `date`; 00-23, 00-59, 00-59."""
    if type(s) is not str or len(s) != 27:
        return False
    m = _INSTANT_RE.fullmatch(s)
    if m is None or not is_date(m.group(1)):
        return False
    return int(m.group(2)) <= 23 and int(m.group(3)) <= 59 and int(m.group(4)) <= 59


class Erased:
    """SPEC 2 `erased`: the marker {"erasedAt": <instant>} that replaces a PII value after an erasure."""

    __slots__ = ('at',)

    def __init__(self, at):
        self.at = at

    def __eq__(self, other):
        return type(other) is Erased and other.at == self.at

    def __hash__(self):
        return hash(('Erased', self.at))


# ---------------------------------------------------------------------------------------------------------------
# SPEC 3: entities and attributes
# ---------------------------------------------------------------------------------------------------------------

_LOCAL = r'[a-z0-9-]{1,32}'
_PLACEMENT_RE = re.compile(r'pl:' + _LOCAL)
_OWNED_RE = re.compile(r'(pl:' + _LOCAL + r')/(doc|dec|ans):' + _LOCAL)
_LOCATION_RE = re.compile(r'loc:' + _LOCAL)
_JURISDICTION_RE = re.compile(r'jur:' + _LOCAL)
_OWNED_KIND = {'doc': 'document', 'dec': 'decision', 'ans': 'answer'}


def is_placement_id(s):
    return type(s) is str and _PLACEMENT_RE.fullmatch(s) is not None


def entity_kind(e, subject):
    """SPEC 3 id grammar and SPEC 4.2 item 3: the kind of an allowed entity of `subject`'s world, else None.

    Allowed: the subject; documents, decisions and answers whose id starts with `<subject>/`; locations; jurisdictions.
    """
    if e == subject:
        return 'placement'
    m = _OWNED_RE.fullmatch(e)
    if m is not None:
        return _OWNED_KIND[m.group(2)] if m.group(1) == subject else None
    if _LOCATION_RE.fullmatch(e) is not None:
        return 'location'
    if _JURISDICTION_RE.fullmatch(e) is not None:
        return 'jurisdiction'
    return None


# (type, cardinality, pii, extra). extra: enum values, or (ref kind, ownership) for refs.
# Ownership: 'owned' = id starts with this placement's id + '/<kind tag>:' (SPEC 3 placement table);
# 'same-owner' = an answer owned by the same placement as the answer that names it (SPEC 3 answer attributes).
ONE, MANY = 'one', 'many'
ATTRS = {
    'placement': {
        'startDate': ('date', ONE, False, None),
        'section1AttestedAt': ('instant', ONE, False, None),
        'ssn': ('text', ONE, True, None),
        'everifyStatus': ('enum', ONE, False, ('pending', 'tnc', 'authorized', 'fnc')),
        'everifyStatusAt': ('instant', ONE, False, None),
        'everifySubmitResult': ('enum', ONE, False, ('accepted', 'rejected')),
        'bgcStatus': ('enum', ONE, False, ('pending', 'clear', 'consider')),
        'payRateCents': ('cents', ONE, False, None),
        'baselinePayRateCents': ('cents', ONE, False, None),
        'weeklyMinutes': ('minutes', ONE, False, None),
        'location': ('ref', ONE, False, ('location', None)),
        'documents': ('ref', MANY, False, ('document', 'owned')),
        'decisions': ('ref', MANY, False, ('decision', 'owned')),
        'answers': ('ref', MANY, False, ('answer', 'owned')),  # ballast (SPEC 3, RULINGS Q40a)
    },
    'document': {
        'docType': ('enum', ONE, False, ('passport', 'ead', 'visa')),
        'expiresOn': ('date', ONE, False, None),
        'reverified': ('boolean', ONE, False, None),
    },
    'decision': {
        'target': ('enum', ONE, False, ('i9.section2', 'bgc.adjudication', 'pay.change')),
        'verdict': ('enum', ONE, False, ('approve', 'waive', 'reject')),
        'author': ('enum', ONE, False, ('person', 'system', 'agent')),
    },
    'answer': {  # ballast: read by no rule (SPEC 3)
        'field': ('text', ONE, False, None),
        'value': ('text', ONE, False, None),
        'next': ('ref', ONE, False, ('answer', 'same-owner')),
    },
    'location': {
        'jurisdiction': ('ref', ONE, False, ('jurisdiction', None)),
        'localMinWageCents': ('cents', ONE, False, None),
    },
    'jurisdiction': {
        'stateMinWageCents': ('cents', ONE, False, None),
    },
}
_KIND_TAG = {'document': 'doc', 'decision': 'dec', 'answer': 'ans'}

_BAD = object()


def _ref_ok(v, refkind, ownership, e):
    """SPEC 3: a ref is an entity id of the stated kind, with the stated owner."""
    if type(v) is not str:
        return False
    if refkind == 'location':
        return _LOCATION_RE.fullmatch(v) is not None
    if refkind == 'jurisdiction':
        return _JURISDICTION_RE.fullmatch(v) is not None
    m = _OWNED_RE.fullmatch(v)
    if m is None or m.group(2) != _KIND_TAG[refkind]:
        return False
    if ownership == 'owned':        # e is the placement that names it
        return m.group(1) == e
    if ownership == 'same-owner':   # e is an answer; same owning placement
        return m.group(1) == e.split('/', 1)[0]
    return False


def check_value(spec, v, e):
    """SPEC 2 and 3: the normalized value of v for this attribute, or _BAD (W0.E_VALUE)."""
    typ, _card, pii, extra = spec
    if pii and isinstance(v, dict):
        # SPEC 2 erased: an object with exactly the one key erasedAt holding an instant; allowed only on PII.
        if len(v) == 1 and 'erasedAt' in v and is_instant(v['erasedAt']):
            return Erased(v['erasedAt'])
        return _BAD
    if typ == 'date':
        return v if is_date(v) else _BAD
    if typ == 'instant':
        return v if is_instant(v) else _BAD
    if typ == 'cents' or typ == 'minutes':
        n = int_token_value(v)  # SPEC 2: an integer token, never 1650.0, 1.65e3 or "1650"
        if n is None:
            return _BAD
        hi = MAX_SAFE if typ == 'cents' else 10080
        return n if 0 <= n <= hi else _BAD
    if typ == 'boolean':
        return v if (v is True or v is False) else _BAD
    if typ == 'text':
        return v if (type(v) is str and _TEXT_RE.fullmatch(v) is not None) else _BAD
    if typ == 'enum':
        return v if (type(v) is str and v in extra) else _BAD
    if typ == 'ref':
        return v if _ref_ok(v, extra[0], extra[1], e) else _BAD
    raise AssertionError(typ)


# ---------------------------------------------------------------------------------------------------------------
# SPEC 4.4 step 1: shapes
# ---------------------------------------------------------------------------------------------------------------

def _is_obj(x, keys):
    return isinstance(x, dict) and len(x) == len(keys) and all(k in x for k in keys)


def _is_int_token(x):
    return int_token_value(x) is not None


def _shape_basis(b):
    return _is_obj(b, ('tx', 'validTime')) and _is_int_token(b['tx']) and type(b['validTime']) is str


def _shape_world(w):
    if not (_is_obj(w, ('facts', 'subject')) and type(w['subject']) is str and isinstance(w['facts'], list)):
        return False
    for f in w['facts']:
        # A fact's v may be any JSON kind here; its type is checked in step 3.
        if not (_is_obj(f, ('a', 'e', 'tx', 'v')) and type(f['e']) is str and type(f['a']) is str
                and _is_int_token(f['tx'])):
            return False
    return True


def _shape_activation(a):
    return (_is_obj(a, ('from', 'release', 'tx')) and type(a['from']) is str and type(a['release']) is str
            and _is_int_token(a['tx']))


def _shape_write(w):
    return isinstance(w, list) and len(w) == 2 and type(w[0]) is str and type(w[1]) is str


RELEASE_NAMES = ('R1', 'R2', 'R3')


def _shape_input(op, inp):
    """SPEC 4.3 and 4.4 step 1 for evaluate, reconcile and affected. Returns False on any E_SHAPE condition."""
    if op == 'evaluate':
        if not _is_obj(inp, ('basis', 'release', 'world')):
            return False
        if type(inp['release']) is not str or inp['release'] not in RELEASE_NAMES:
            return False
        return _shape_basis(inp['basis']) and _shape_world(inp['world'])
    if op == 'reconcile':
        if not _is_obj(inp, ('activations', 'basis', 'world')):
            return False
        if not isinstance(inp['activations'], list) or not all(_shape_activation(a) for a in inp['activations']):
            return False
        return _shape_basis(inp['basis']) and _shape_world(inp['world'])
    if op == 'affected':
        if not _is_obj(inp, ('basis', 'release', 'worlds', 'writes')):
            return False
        if type(inp['release']) is not str or inp['release'] not in RELEASE_NAMES:
            return False
        if not _shape_basis(inp['basis']):
            return False
        if not isinstance(inp['worlds'], list) or not all(_shape_world(w) for w in inp['worlds']):
            return False
        subjects = [w['subject'] for w in inp['worlds']]
        if len(set(subjects)) != len(subjects):  # two worlds with one subject (case C67)
            return False
        return isinstance(inp['writes'], list) and all(_shape_write(w) for w in inp['writes'])
    raise AssertionError(op)


# ---------------------------------------------------------------------------------------------------------------
# SPEC 4.4 steps 2 and 3: basis, world validation and the indexed world
# ---------------------------------------------------------------------------------------------------------------

def check_basis(b):
    """SPEC 4.4 step 2 (W0.E_BASIS). Returns (tx, validTime)."""
    tx = int_token_value(b['tx'])
    if not is_instant(b['validTime']) or not 0 <= tx <= MAX_SAFE:
        raise W0Error(E_BASIS)
    return tx, b['validTime']


class IWorld:
    """A validated world indexed by pair (SPEC 4.2): one[(e, a)] = (v, tx); many[(e, a)] = [(v, tx), ...]."""

    __slots__ = ('subject', 'one', 'many', 'nfacts')

    def __init__(self, subject):
        self.subject = subject
        self.one = {}
        self.many = {}
        self.nfacts = 0


def validate_world(w, basis_tx):
    """SPEC 4.4 step 3 for one world (shape already checked in step 1). Returns an IWorld or raises W0Error."""
    return validate_facts(w['subject'], ((f['e'], f['a'], f['v'], f['tx']) for f in w['facts']), basis_tx)


def validate_facts(subject, facts, basis_tx):
    """SPEC 4.4 step 3 over (e, a, v, tx) tuples in array order; tx is an integer token (JNum or int)."""
    if not is_placement_id(subject):           # 3.1
        raise W0Error(E_UNKNOWN)
    iw = IWorld(subject)
    one, many = iw.one, iw.many
    seen_many = set()
    card_error = False
    n = 0
    for e, a, raw, txtok in facts:             # 3.2: per fact in array order: unknown, then value, then basis
        n += 1
        kind = entity_kind(e, subject)
        spec = ATTRS[kind].get(a) if kind is not None else None
        if spec is None:
            raise W0Error(E_UNKNOWN)
        v = check_value(spec, raw, e)
        if v is _BAD:
            raise W0Error(E_VALUE)
        tx = int_token_value(txtok)
        if tx < 1 or tx > basis_tx:
            raise W0Error(E_BASIS)
        key = (e, a)
        if spec[1] == ONE:
            if key in one:
                card_error = True              # reported only after every fact passed 3.2 (3.3 follows 3.2)
            one[key] = (v, tx)
        else:
            k3 = (e, a, v)
            if k3 in seen_many:
                card_error = True
            seen_many.add(k3)
            lst = many.get(key)
            if lst is None:
                many[key] = [(v, tx)]
            else:
                lst.append((v, tx))
    if card_error:                             # 3.3
        raise W0Error(E_CARDINALITY)
    iw.nfacts = n
    return iw


# ---------------------------------------------------------------------------------------------------------------
# SPEC 5: releases
# ---------------------------------------------------------------------------------------------------------------

RULE_ORDER = ('LIFE', 'I9S1', 'I9S2', 'EVSUB', 'EVSTAT', 'BGC', 'DOCEXP', 'MINWAGE', 'OT', 'PAYCHG', 'PROP')


class Release:
    __slots__ = ('name', 'hash', 'doc', 'entries', 'order')

    def __init__(self, doc):
        plain = to_plain(doc)
        self.doc = plain
        self.name = plain['name']
        # SPEC 5.2: "sha256:" + hex SHA-256 over the UTF-8 bytes of canonicalJson(release).
        self.hash = 'sha256:' + hashlib.sha256(canonical(plain).encode('utf-8')).hexdigest()
        self.entries = {}
        self.order = []
        for ent in plain['rules']:
            self.entries[ent['id']] = ent
            self.order.append(ent['id'])
        if tuple(self.order) != RULE_ORDER:   # SPEC 5.1: eleven entries in this fixed order
            raise ValueError('release %s: rule order %r' % (self.name, self.order))

    def params_for(self, rule, jur):
        """SPEC 5.1 scoped entry: scope.params when jur(S) is listed (ids only), else the entry's params."""
        ent = self.entries[rule]
        sc = ent.get('scope')
        if sc is not None and jur is not None and jur in sc['jurisdictions']:
            return sc['params']
        return ent['params']

    def scoped(self, rule):
        return 'scope' in self.entries[rule]


def default_world_dir():
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(os.path.join(here, '..', '..', 'world', 'W0'))


class Releases:
    """R1, R2 and R3 loaded from <world dir>/releases, each hash recomputed and checked against index.json (SPEC 5.2)."""

    def __init__(self, world_dir=None):
        world_dir = world_dir or default_world_dir()
        rel_dir = os.path.join(world_dir, 'releases')
        with open(os.path.join(rel_dir, 'index.json'), 'rb') as fh:
            index = to_plain(parse_bytes(fh.read()))
        self.by_name = {}
        self.by_hash = {}
        for name in RELEASE_NAMES:
            with open(os.path.join(rel_dir, name + '.json'), 'rb') as fh:
                doc = parse_bytes(fh.read())
            if has_duplicate_key(doc):
                raise ValueError('release %s has a duplicate key' % name)
            r = Release(doc)
            if r.name != name:
                raise ValueError('release file %s names %s' % (name, r.name))
            if index.get(name) != r.hash:
                raise ValueError('release %s hash %s != index.json %s' % (name, r.hash, index.get(name)))
            self.by_name[name] = r
            self.by_hash[r.hash] = r


def diff(a, b):
    """SPEC 5.3: rule ids, in release order, whose entries have different canonical JSON."""
    return [rid for rid in RULE_ORDER if canonical(a.entries[rid]) != canonical(b.entries[rid])]


def resolve_release(activations, v, releases):
    """SPEC 5.4 resolveRelease: greatest from <= v, then greatest tx, then greatest release string."""
    cands = [a for a in activations if a[0] <= v]
    if not cands:
        raise W0Error(E_NO_RELEASE)
    best = max(cands)  # tuples (from, tx, release): exactly the 5.4 step 3 order
    r = releases.by_hash.get(best[2])
    if r is None:
        raise W0Error(E_NO_RELEASE)
    return r


# ---------------------------------------------------------------------------------------------------------------
# SPEC 6.1: date functions (calendar arithmetic only, proleptic Gregorian)
# ---------------------------------------------------------------------------------------------------------------

def _d(s):
    return datetime.date(int(s[0:4]), int(s[5:7]), int(s[8:10]))


def start_of(d):
    return d + 'T00:00:00.000000Z'


@functools.lru_cache(maxsize=65536)
def add_days(d, n):
    return (_d(d) + datetime.timedelta(days=n)).isoformat()


def end_of_day(d):
    return start_of(add_days(d, 1))


def date_of(t):
    return t[:10]


@functools.lru_cache(maxsize=65536)
def add_business_days(d, n):
    """SPEC 6.1: step forward from d one day at a time, counting weekdays 1 to 5; d itself is never counted."""
    day = _d(d)
    one = datetime.timedelta(days=1)
    count = 0
    while True:
        day += one
        if day.isoweekday() <= 5:
            count += 1
            if count == n:
                return day.isoformat()


# ---------------------------------------------------------------------------------------------------------------
# SPEC 6 to 8: evaluate
# ---------------------------------------------------------------------------------------------------------------

_DEC_ATTRS = ('target', 'verdict', 'author')
_DOC_ATTRS = ('docType', 'expiresOn', 'reverified')


def _sha_hex(obj):
    return hashlib.sha256(canonical(obj).encode('utf-8')).hexdigest()


def evaluate_indexed(w, rel, basis_tx, v):
    """SPEC 7 and 8: the output object of evaluate(world, release, basis) for a validated world."""
    S = w.subject
    one = w.one
    many = w.many
    get = one.get

    def val(e, a):
        f = get((e, a))
        return None if f is None else f[0]

    deps = set()
    trace = []
    tasks = []
    obligations = []
    flags = []
    pending_wis = []  # (rule, kind, key, payload)

    def task(rule, kind, key, due):
        # SPEC 8.2: id S#kind, or S#kind#key for keyed rules; overdue when dueAt is not null and v >= dueAt.
        tid = S + '#' + kind if key == '' else S + '#' + kind + '#' + key
        tasks.append({'dueAt': due, 'id': tid, 'kind': kind, 'overdue': due is not None and v >= due, 'rule': rule})

    def entry(rule, key, row, txs):
        trace.append({'inputs': sorted(txs), 'key': key, 'row': row, 'rule': rule})

    # ---- shared facts ----
    sd_f = get((S, 'startDate'))
    sd = None if sd_f is None else sd_f[0]
    loc_f = get((S, 'location'))
    L = None if loc_f is None else loc_f[0]
    ljur_f = get((L, 'jurisdiction')) if L is not None else None
    J = None if ljur_f is None else ljur_f[0]  # SPEC 6.3 jur(S)

    # ---- SPEC 6.2: decisions, proposals and commit order ----
    dec_facts = many.get((S, 'decisions'), ())
    dec_pairs = [(S, 'decisions')]
    dec_all_txs = set()       # every fact whose pair is in the decision read set (PROP row 0)
    counting = []             # (pos, D, target, verdict, four txs)
    proposals = []            # (pos, D, target, four txs)
    for D, dtx in dec_facts:
        dec_all_txs.add(dtx)
        fs = []
        for a in _DEC_ATTRS:
            dec_pairs.append((D, a))
            f = get((D, a))
            fs.append(f)
            if f is not None:
                dec_all_txs.add(f[1])
        tf, vf, af = fs
        if tf is None or vf is None or af is None:   # 6.2 item 1: incomplete records never count
            continue
        txs4 = (dtx, tf[1], vf[1], af[1])
        pos = max(txs4)                              # 6.2 item 2
        if af[0] == 'agent':                         # 6.2 item 4: proposal
            proposals.append((pos, D, tf[0], txs4))
        else:                                        # 6.2 item 3: person or system
            counting.append((pos, D, tf[0], vf[0], txs4))

    def counting_txs(T):                             # 6.2 item 6
        out = set()
        for c in counting:
            if c[2] == T:
                out.update(c[4])
        return out

    def final(T, m):                                 # 6.2 item 5: greatest pos, then greatest entity id
        best = None
        for c in counting:
            if c[2] == T and c[0] >= m and (best is None or (c[0], c[1]) > (best[0], best[1])):
                best = c
        return None if best is None else best[3]    # the verdict, or None for `none`

    def txs_of(*facts):
        return {f[1] for f in facts if f is not None}

    rel_order = rel.order
    for rule in rel_order:
        params = rel.params_for(rule, J)

        if rule == 'LIFE':  # SPEC 7.1
            deps.add((S, 'startDate'))
            txs = txs_of(sd_f)
            if sd is None:
                entry(rule, '', 1, txs)
                flags.append({'name': 'start-unknown', 'rule': rule})
            elif v < start_of(sd):
                entry(rule, '', 2, txs)
                flags.append({'name': 'pre-start', 'rule': rule})
                obligations.append({'boundary': start_of(sd), 'id': S + '#start', 'kind': 'start', 'rule': rule})
            else:
                entry(rule, '', 3, txs)

        elif rule == 'I9S1':  # SPEC 7.2
            deps.update(((S, 'startDate'), (S, 'section1AttestedAt'), (S, 'ssn')))
            s1_f = get((S, 'section1AttestedAt'))
            ssn_f = get((S, 'ssn'))
            txs = txs_of(sd_f, s1_f, ssn_f)
            if s1_f is not None and ssn_f is not None:  # an erased marker counts as present
                entry(rule, '', 1, txs)
            else:
                entry(rule, '', 2, txs)
                task(rule, 'i9.section1', '', None if sd is None else end_of_day(sd))

        elif rule == 'I9S2':  # SPEC 7.3
            deps.add((S, 'startDate'))
            deps.update(dec_pairs)
            txs = txs_of(sd_f) | counting_txs('i9.section2')
            due = None if sd is None else end_of_day(add_business_days(sd, params['businessDays']))
            fv = final('i9.section2', 0)
            if fv == 'approve':
                entry(rule, '', 1, txs)
            elif fv == 'waive':
                entry(rule, '', 2, txs)
                flags.append({'name': 'i9-section2-waived', 'rule': rule})
            elif fv == 'reject':
                entry(rule, '', 3, txs)
                task(rule, 'i9.section2', '', due)
            else:
                entry(rule, '', 4, txs)
                task(rule, 'i9.section2', '', due)

        elif rule == 'EVSUB':  # SPEC 7.4
            deps.update(((S, 'startDate'), (S, 'ssn'), (S, 'everifyStatus'), (S, 'everifySubmitResult')))
            ssn_f = get((S, 'ssn'))
            st_f = get((S, 'everifyStatus'))
            res_f = get((S, 'everifySubmitResult'))
            txs = txs_of(sd_f, ssn_f, st_f, res_f)
            due = None if sd is None else end_of_day(add_business_days(sd, params['businessDays']))
            ssn = None if ssn_f is None else ssn_f[0]
            res = None if res_f is None else res_f[0]
            if st_f is not None:
                entry(rule, '', 1, txs)
            elif ssn is None:
                entry(rule, '', 2, txs)
                task(rule, 'everify.collect-ssn', '', due)
            elif type(ssn) is Erased:
                entry(rule, '', 3, txs)
                task(rule, 'everify.ssn-erased', '', due)
            elif _SSN_RE.fullmatch(ssn) is None:
                entry(rule, '', 4, txs)
                task(rule, 'everify.fix-ssn', '', due)
            elif res == 'accepted':
                entry(rule, '', 5, txs)
            elif res == 'rejected':
                entry(rule, '', 6, txs)
                task(rule, 'everify.submit-rejected', '', due)
            else:
                entry(rule, '', 7, txs)
                pending_wis.append((rule, 'everify.submit-case', '', {'startDate': sd}))  # SPEC 8.4 payload

        elif rule == 'EVSTAT':  # SPEC 7.5
            deps.update(((S, 'everifyStatus'), (S, 'everifyStatusAt')))
            st_f = get((S, 'everifyStatus'))
            at_f = get((S, 'everifyStatusAt'))
            txs = txs_of(st_f, at_f)
            st = None if st_f is None else st_f[0]
            if st is None or st == 'pending':
                entry(rule, '', 1, txs)
            elif st == 'tnc':
                entry(rule, '', 2, txs)
                due = None if at_f is None else end_of_day(
                    add_business_days(date_of(at_f[0]), params['tncBusinessDays']))
                task(rule, 'everify.tnc', '', due)
                pending_wis.append((rule, 'notify.everify-tnc', '', {'dueAt': due}))
            elif st == 'authorized':
                entry(rule, '', 3, txs)
                flags.append({'name': 'everify-authorized', 'rule': rule})
            else:  # fnc
                entry(rule, '', 4, txs)
                task(rule, 'everify.fnc', '', None)
                pending_wis.append((rule, 'notify.everify-fnc', '', {}))

        elif rule == 'BGC':  # SPEC 7.6
            deps.add((S, 'bgcStatus'))
            deps.update(dec_pairs)
            bg_f = get((S, 'bgcStatus'))
            txs = txs_of(bg_f) | counting_txs('bgc.adjudication')
            bg = None if bg_f is None else bg_f[0]
            if bg is None:
                entry(rule, '', 1, txs)
                pending_wis.append((rule, 'bgc.order', '', {}))
            elif bg == 'pending' or bg == 'clear':
                entry(rule, '', 2, txs)
            else:  # consider
                fv = final('bgc.adjudication', 0)
                if fv == 'approve' or fv == 'waive':
                    entry(rule, '', 3, txs)
                elif fv == 'reject':
                    entry(rule, '', 4, txs)
                    task(rule, 'bgc.adverse-action', '', None)
                    pending_wis.append((rule, 'notify.pre-adverse-action', '', {}))
                else:
                    entry(rule, '', 5, txs)
                    task(rule, 'bgc.adjudicate', '', None)

        elif rule == 'DOCEXP':  # SPEC 7.7, keyed by document
            deps.add((S, 'documents'))
            docs = many.get((S, 'documents'), ())
            if not docs:
                entry(rule, '', 0, ())
            lead_days = params['leadDays']
            for d, dtx in sorted(docs):
                for a in _DOC_ATTRS:
                    deps.add((d, a))
                ty_f = get((d, 'docType'))
                ex_f = get((d, 'expiresOn'))
                rv_f = get((d, 'reverified'))
                txs = {dtx} | txs_of(ty_f, ex_f, rv_f)
                ty = None if ty_f is None else ty_f[0]
                if ty is None or ty not in lead_days:
                    entry(rule, d, 1, txs)
                elif rv_f is not None and rv_f[0] is True:
                    entry(rule, d, 2, txs)
                elif ex_f is None:
                    entry(rule, d, 3, txs)
                    task(rule, 'doc.expiry-missing', d, None)
                else:
                    ex = ex_f[0]
                    lead = lead_days[ty]
                    B = end_of_day(ex)                      # valid through its expiry date
                    W = start_of(add_days(ex, 1 - lead))    # window start; lead 0 gives W = B
                    if v < W:
                        entry(rule, d, 4, txs)
                        obligations.append({'boundary': W, 'id': S + '#doc.window#' + d, 'kind': 'doc.window',
                                            'rule': rule})
                    elif v < B:
                        entry(rule, d, 5, txs)
                        task(rule, 'doc.reverify', d, B)
                    else:
                        entry(rule, d, 6, txs)
                        task(rule, 'doc.reverify', d, B)
                        pending_wis.append((rule, 'notify.document-expired', d, {'docType': ty, 'expiresOn': ex}))

        elif rule == 'MINWAGE':  # SPEC 7.8, two hops
            sources = params['floorSources']
            pairs = [(S, 'startDate'), (S, 'payRateCents'), (S, 'location')]
            floor_facts = []
            if L is not None:
                if 'jurisdiction.stateMinWageCents' in sources:
                    pairs.append((L, 'jurisdiction'))
                    if J is not None:
                        pairs.append((J, 'stateMinWageCents'))
                        floor_facts.append(get((J, 'stateMinWageCents')))
                if 'location.localMinWageCents' in sources:
                    pairs.append((L, 'localMinWageCents'))
                    floor_facts.append(get((L, 'localMinWageCents')))
            deps.update(pairs)
            txs = txs_of(*[get(p) for p in pairs])  # input facts: every fact whose pair is in the read set
            pay_f = get((S, 'payRateCents'))
            due = None if sd is None else start_of(sd)
            present = [f[0] for f in floor_facts if f is not None]
            if pay_f is None:
                entry(rule, '', 1, txs)
                task(rule, 'pay.rate-missing', '', due)
            elif L is None:
                entry(rule, '', 2, txs)
                task(rule, 'pay.location-missing', '', due)
            elif not present:
                entry(rule, '', 3, txs)
                task(rule, 'pay.floor-unknown', '', due)
            else:
                floor = max(present)  # the greatest present value; equality passes
                if pay_f[0] >= floor:
                    entry(rule, '', 4, txs)
                else:
                    entry(rule, '', 5, txs)
                    task(rule, 'pay.below-minimum', '', due)
                    pending_wis.append((rule, 'notify.pay-below-minimum', '',
                                        {'floorCents': floor, 'payRateCents': pay_f[0]}))

        elif rule == 'OT':  # SPEC 7.9; scoped entry adds S.location and L.jurisdiction (SPEC 5.1, 6.3)
            deps.add((S, 'weeklyMinutes'))
            wm_f = get((S, 'weeklyMinutes'))
            txs = txs_of(wm_f)
            if rel.scoped(rule):
                deps.add((S, 'location'))
                if L is not None:
                    deps.add((L, 'jurisdiction'))
                txs |= txs_of(loc_f, ljur_f)
            threshold = params['thresholdMinutes']
            if wm_f is None:
                entry(rule, '', 1, txs)
            elif wm_f[0] > threshold:
                entry(rule, '', 2, txs)
                flags.append({'name': 'overtime', 'rule': rule})
            else:
                entry(rule, '', 3, txs)

        elif rule == 'PAYCHG':  # SPEC 7.10
            deps.update(((S, 'payRateCents'), (S, 'baselinePayRateCents')))
            deps.update(dec_pairs)
            pay_f = get((S, 'payRateCents'))
            base_f = get((S, 'baselinePayRateCents'))
            txs = txs_of(pay_f, base_f) | counting_txs('pay.change')
            if pay_f is None or base_f is None:
                entry(rule, '', 1, txs)
            elif abs(pay_f[0] - base_f[0]) <= params['thresholdCents']:
                entry(rule, '', 2, txs)
            else:
                fv = final('pay.change', pay_f[1])  # fresh approval only: pos >= tx(S.payRateCents)
                if fv == 'approve' or fv == 'waive':
                    entry(rule, '', 3, txs)
                elif fv == 'reject':
                    entry(rule, '', 4, txs)
                    task(rule, 'pay.change-rejected', '', None)
                else:
                    entry(rule, '', 5, txs)
                    task(rule, 'pay.change-approval', '', None)
                    pending_wis.append((rule, 'notify.pay-change-approval', '',
                                        {'baselinePayRateCents': base_f[0], 'payRateCents': pay_f[0]}))

        elif rule == 'PROP':  # SPEC 7.11, keyed by target
            deps.update(dec_pairs)
            if not proposals:
                entry(rule, '', 0, dec_all_txs)
            else:
                targets = sorted({p[2] for p in proposals})
                for T in targets:
                    ps = [p for p in proposals if p[2] == T]
                    txs = set()
                    for p in ps:
                        txs.update(p[3])
                    txs |= counting_txs(T)
                    pmax = max(p[0] for p in ps)
                    if any(c[2] == T and c[0] >= pmax for c in counting):
                        entry(rule, T, 1, txs)
                    else:
                        entry(rule, T, 2, txs)
                        task(rule, 'review.proposal', T, None)
        else:
            raise AssertionError(rule)

    # ---- SPEC 8.3: due obligations for every task with dueAt != null and v < dueAt ----
    for t in tasks:
        if t['dueAt'] is not None and v < t['dueAt']:
            obligations.append({'boundary': t['dueAt'], 'id': t['id'] + '@due', 'kind': 'due', 'rule': t['rule']})

    # ---- SPEC 8.4: work items ----
    trace_inputs = {(t['rule'], t['key']): t['inputs'] for t in trace}
    work_items = []
    for rule, kind, key, payload in pending_wis:
        inputs = trace_inputs[(rule, key)]
        wid = 'wi:' + _sha_hex({'key': key, 'kind': kind, 'rule': rule, 'subject': S})
        ver = 'wv:' + _sha_hex({'inputs': inputs, 'payload': payload, 'release': rel.hash})
        work_items.append({'id': wid, 'inputs': inputs, 'key': key, 'kind': kind, 'payload': payload,
                           'rule': rule, 'version': ver})

    # ---- SPEC 8.7: order of every array (trace is already in release order, keys ascending) ----
    tasks.sort(key=lambda t: t['id'])
    obligations.sort(key=lambda o: o['id'])
    work_items.sort(key=lambda x: x['id'])
    flags.sort(key=lambda f: f['name'])
    return {
        'basis': {'tx': basis_tx, 'validTime': v},
        'dependencies': [list(p) for p in sorted(deps)],
        'flags': flags,
        'obligations': obligations,
        'release': rel.hash,
        'subject': S,
        'tasks': tasks,
        'trace': trace,
        'workItems': work_items,
    }


def dependencies_indexed(w, rel):
    """SPEC 10: the dependency pairs of a validated world under a release (as evaluate's `dependencies`)."""
    out = evaluate_indexed(w, rel, 0, '2000-01-01T00:00:00.000000Z')
    return {tuple(p) for p in out['dependencies']}


# ---------------------------------------------------------------------------------------------------------------
# The operations on parsed inputs (SPEC 1, 4.3)
# ---------------------------------------------------------------------------------------------------------------

def op_evaluate(inp, releases):
    if has_duplicate_key(inp) or not _shape_input('evaluate', inp):   # step 1
        raise W0Error(E_SHAPE)
    basis_tx, v = check_basis(inp['basis'])                             # step 2
    w = validate_world(inp['world'], basis_tx)                          # step 3
    return evaluate_indexed(w, releases.by_name[inp['release']], basis_tx, v)


def op_reconcile(inp, releases):
    if has_duplicate_key(inp) or not _shape_input('reconcile', inp):  # step 1
        raise W0Error(E_SHAPE)
    basis_tx, v = check_basis(inp['basis'])                             # step 2
    w = validate_world(inp['world'], basis_tx)                          # step 3
    acts = []
    for a in inp['activations']:                                        # step 4, in array order
        if type(a['release']) is not str or _HASH_RE.fullmatch(a['release']) is None or not is_instant(a['from']):
            raise W0Error(E_VALUE)
        tx = int_token_value(a['tx'])
        if tx < 1 or tx > basis_tx:
            raise W0Error(E_BASIS)
        acts.append((a['from'], tx, a['release']))
    rel = resolve_release(acts, v, releases)                            # W0.E_NO_RELEASE
    return evaluate_indexed(w, rel, basis_tx, v)


def op_affected(inp, releases):
    if has_duplicate_key(inp) or not _shape_input('affected', inp):   # step 1
        raise W0Error(E_SHAPE)
    basis_tx, _v = check_basis(inp['basis'])                            # step 2
    rel = releases.by_name[inp['release']]
    worlds = [validate_world(w, basis_tx) for w in inp['worlds']]      # step 3, each world in array order
    writes = {(x[0], x[1]) for x in inp['writes']}                     # not checked beyond their shape
    out = []
    for w in worlds:
        if dependencies_indexed(w, rel) & writes:
            out.append(w.subject)
    return {'affected': sorted(out)}


# ---- SPEC 8.8 publish and 8.9 receive; SPEC 4.4 step 1 (RULINGS Q44a) for their shapes ----

def _shape_rec_basis(b):
    return _is_obj(b, ('tx', 'validTime')) and _is_int_token(b['tx']) and type(b['validTime']) is str


def _shape_work_item(x):
    return (_is_obj(x, ('id', 'inputs', 'key', 'kind', 'payload', 'rule', 'version'))
            and all(type(x[k]) is str for k in ('id', 'key', 'kind', 'rule', 'version'))
            and isinstance(x['inputs'], list) and all(_is_int_token(i) for i in x['inputs'])
            and isinstance(x['payload'], dict))


def _shape_record(r):
    return (_is_obj(r, ('basis', 'release', 'subject', 'workItems')) and _shape_rec_basis(r['basis'])
            and type(r['release']) is str and type(r['subject']) is str
            and isinstance(r['workItems'], list) and all(_shape_work_item(x) for x in r['workItems']))


def _seq_ok(x, least):
    n = int_token_value(x)
    return n is not None and n >= least


def _shape_delivery(d):
    return (_is_obj(d, ('id', 'key', 'kind', 'payload', 'rule', 'seq', 'subject', 'version'))
            and all(type(d[k]) is str for k in ('id', 'key', 'kind', 'rule', 'subject', 'version'))
            and isinstance(d['payload'], dict) and _seq_ok(d['seq'], 1))


def _shape_item_state(s):
    return (_is_obj(s, ('id', 'payload', 'retired', 'seq', 'subject')) and type(s['id']) is str
            and type(s['subject']) is str and isinstance(s['payload'], dict)
            and (s['retired'] is True or s['retired'] is False) and _seq_ok(s['seq'], 1))


def _shape_subject_state(s):
    return _is_obj(s, ('basis', 'subject')) and _shape_rec_basis(s['basis']) and type(s['subject']) is str


def _shape_publish(inp):
    if not _is_obj(inp, ('evaluations', 'state')):
        return False
    ev, st = inp['evaluations'], inp['state']
    if not isinstance(ev, list) or not all(_shape_record(r) for r in ev):
        return False
    if not _is_obj(st, ('items', 'pending', 'subjects')):
        return False
    return (isinstance(st['items'], list) and all(_shape_item_state(s) for s in st['items'])
            and isinstance(st['pending'], list) and all(_shape_delivery(d) for d in st['pending'])
            and isinstance(st['subjects'], list) and all(_shape_subject_state(s) for s in st['subjects']))


def _shape_effect_state(s):
    return (_is_obj(s, ('done', 'id', 'waiting')) and _seq_ok(s['done'], 0) and type(s['id']) is str
            and isinstance(s['waiting'], list) and all(_shape_delivery(d) for d in s['waiting']))


def _shape_projection(p):
    return (_is_obj(p, ('id', 'payload', 'seq')) and type(p['id']) is str and isinstance(p['payload'], dict)
            and _seq_ok(p['seq'], 1))


def _shape_receive(inp):
    if not _is_obj(inp, ('deliveries', 'state')):
        return False
    dl, st = inp['deliveries'], inp['state']
    if not isinstance(dl, list) or not all(_shape_delivery(d) for d in dl):
        return False
    if not _is_obj(st, ('effects', 'projection')):
        return False
    return (isinstance(st['effects'], list) and all(_shape_effect_state(s) for s in st['effects'])
            and isinstance(st['projection'], list) and all(_shape_projection(p) for p in st['projection']))


def _basis_key(b):
    return int_token_value(b['tx']), b['validTime']


def op_publish(inp, releases=None):
    """SPEC 8.8 publish(state, evaluations) -> {deliveries, state}. Runs no step after 4.4 step 1."""
    if has_duplicate_key(inp) or not _shape_publish(inp):
        raise W0Error(E_SHAPE)
    st = inp['state']
    items = {}
    for s in st['items']:
        items[s['id']] = {'id': s['id'], 'payload': s['payload'], 'retired': s['retired'] is True,
                          'seq': int_token_value(s['seq']), 'subject': s['subject']}
    pending = list(st['pending'])
    subjects = {s['subject']: s['basis'] for s in st['subjects']}
    deliveries = []
    for rec in inp['evaluations']:
        subj = rec['subject']
        b = rec['basis']
        # Step 1, basis order (Q40d): skip a record whose basis is older than the subject's stored basis
        # (smaller tx, or equal tx and an earlier validTime). An equal basis is not older.
        a = subjects.get(subj)
        if a is not None:
            atx, av = _basis_key(a)
            btx, bv = _basis_key(b)
            if btx < atx or (btx == atx and bv < av):
                continue
        subjects[subj] = b
        # Step 2, publication (Q38f, Q40c), in id order.
        wis = sorted(rec['workItems'], key=lambda x: x['id'])
        ids = set()
        for wi in wis:
            ids.add(wi['id'])
            cur = items.get(wi['id'])
            if cur is None:
                seq = 1
            elif cur['retired']:
                seq = cur['seq'] + 1                      # Q40h: even when the payload is equal (C78)
            elif canonical(wi['payload']) != canonical(cur['payload']):
                seq = cur['seq'] + 1
            else:
                continue
            d = {'id': wi['id'], 'key': wi['key'], 'kind': wi['kind'], 'payload': wi['payload'], 'rule': wi['rule'],
                 'seq': seq, 'subject': subj, 'version': wi['version']}  # subject from the record (Q44c)
            deliveries.append(d)
            pending.append(d)
            items[wi['id']] = {'id': wi['id'], 'payload': wi['payload'], 'retired': False, 'seq': seq,
                               'subject': subj}
        # Step 3, retirement (Q40h): seq and payload stay.
        for it in items.values():
            if it['subject'] == subj and not it['retired'] and it['id'] not in ids:
                it['retired'] = True
    return {
        'deliveries': deliveries,
        'state': {
            'items': [items[k] for k in sorted(items)],
            'pending': pending,
            'subjects': [{'basis': subjects[k], 'subject': k} for k in sorted(subjects)],
        },
    }


def op_receive(inp, releases=None):
    """SPEC 8.9 receive(state, deliveries) -> {applied: {effects, projection}, state}. Runs no step after 4.4 step 1."""
    if has_duplicate_key(inp) or not _shape_receive(inp):
        raise W0Error(E_SHAPE)
    st = inp['state']
    effects = {}
    for s in st['effects']:
        effects[s['id']] = {'done': int_token_value(s['done']), 'id': s['id'],
                            'waiting': sorted(s['waiting'], key=lambda d: int_token_value(d['seq']))}
    projection = {}
    for p in st['projection']:
        projection[p['id']] = {'id': p['id'], 'payload': p['payload'], 'seq': int_token_value(p['seq'])}
    applied_eff = []
    applied_proj = []
    for d in inp['deliveries']:
        did = d['id']
        seq = int_token_value(d['seq'])
        # Projection step: apply only a greater seq (or a new id); never regress (C79).
        p = projection.get(did)
        if p is None or seq > p['seq']:
            projection[did] = {'id': did, 'payload': d['payload'], 'seq': seq}
            applied_proj.append(d)
        # Effects step: every transition in order; duplicates by (id, seq) ignored; wait at a gap (C80, C81, C83).
        e = effects.get(did)
        if e is None:
            e = effects[did] = {'done': 0, 'id': did, 'waiting': []}
        waiting_seqs = {int_token_value(x['seq']) for x in e['waiting']}
        if seq <= e['done'] or seq in waiting_seqs:
            continue
        if seq == e['done'] + 1:
            applied_eff.append(d)
            e['done'] = seq
            while True:
                nxt = None
                for x in e['waiting']:
                    if int_token_value(x['seq']) == e['done'] + 1:
                        nxt = x
                        break
                if nxt is None:
                    break
                e['waiting'].remove(nxt)
                applied_eff.append(nxt)
                e['done'] += 1
        else:
            e['waiting'].append(d)
            e['waiting'].sort(key=lambda x: int_token_value(x['seq']))
    return {
        'applied': {'effects': applied_eff, 'projection': applied_proj},
        'state': {
            'effects': [effects[k] for k in sorted(effects)],
            'projection': [projection[k] for k in sorted(projection)],
        },
    }


OPS = {
    'evaluate': op_evaluate,
    'reconcile': op_reconcile,
    'affected': op_affected,
    'publish': op_publish,
    'receive': op_receive,
}


def run_op(op, inp, releases):
    """Run one operation on a parsed input; an invalid input gives {"error": code} and nothing else (SPEC 4.4)."""
    try:
        return OPS[op](inp, releases)
    except W0Error as err:
        return {'error': err.code}


def run_op_bytes(op, data, releases):
    """Run one operation on raw input bytes. Bytes that are not one JSON value are W0.E_SHAPE (SPEC-AMBIGUITY A01)."""
    try:
        inp = parse_bytes(data)
    except ValueError:
        return {'error': E_SHAPE}
    return run_op(op, inp, releases)

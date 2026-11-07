"""Owned value/cut/limit boundary for the new aggregate planned-query helper.

Source implementation only. Runtime admission belongs to the exact reviewed
execution profile, not to this data module or a caller-provided JSON claim.
"""
from __future__ import annotations

from dataclasses import dataclass
import struct


MIN_I64, MAX_I64 = -(1 << 63), (1 << 63)-1
TAGS = {'str': 1, 'bool': 2, 'i64': 3, 'f64': 4}
TYPES = ('UTINYINT', 'BLOB', 'BOOLEAN', 'BIGINT', 'DOUBLE')
SUFFIXES = ('t', 's', 'b', 'i', 'f')
VALUE_TYPE = 'STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE)'
FACT_TYPE = ('STRUCT(e VARCHAR,a VARCHAR,v ' + VALUE_TYPE
             + ',valid_from BIGINT,valid_to BIGINT,tx_from BIGINT,tx_to BIGINT)[]')


class PlanError(ValueError):
    pass


class IRDecodeError(PlanError):
    pass


def exact_int(value, low, high, label):
    if type(value) is not int or not low <= value <= high:
        raise PlanError(label + ' must be an exact integer in the supported range')
    return value


def text(value, maximum=16384):
    if type(value) is not str or '\x00' in value:
        raise PlanError('text must be a NUL-free string')
    data = value.encode('utf-8', errors='strict')
    if len(data) > maximum:
        raise PlanError('text exceeds the supported UTF8 byte limit')
    return value


@dataclass(frozen=True, slots=True)
class Value:
    tag: str
    wire: str | bool

    def __post_init__(self):
        if type(self.tag) is not str or self.tag not in TAGS:
            raise PlanError('unsupported explicit value tag')
        wire = self.wire
        if self.tag == 'bool':
            if type(wire) is not bool:
                raise PlanError('boolean wire must be exactly bool')
        elif self.tag == 'str':
            text(wire)
        elif self.tag == 'i64':
            if type(wire) is not str or not 1 <= len(wire) <= 20:
                raise PlanError('i64 wire must be canonical decimal text')
            digits = wire[1:] if wire.startswith('-') else wire
            if (not digits or any(c not in '0123456789' for c in digits)
                    or (len(digits) > 1 and digits[0] == '0') or wire == '-0'):
                raise PlanError('i64 wire must be canonical decimal text')
            exact_int(int(wire), MIN_I64, MAX_I64, 'i64 value')
        else:
            if (type(wire) is not str or len(wire) != 16
                    or any(c not in '0123456789abcdefABCDEF' for c in wire)):
                raise PlanError('f64 wire must have exactly16 hexadecimal bit digits')
            bits = int(wire, 16)
            if bits & 0x7ff0000000000000 == 0x7ff0000000000000:
                raise PlanError('f64 value must be finite')
            wire = '0000000000000000' if bits & 0x7fffffffffffffff == 0 else wire.lower()
            object.__setattr__(self, 'wire', wire)

    def order_key(self):
        if self.tag == 'str':
            local = self.wire.encode('utf-8')
        elif self.tag == 'bool':
            local = int(self.wire)
        elif self.tag == 'i64':
            local = int(self.wire)
        else:
            bits = int(self.wire, 16)
            local = (~bits & ((1 << 64)-1)) if bits >> 63 else bits ^ (1 << 63)
        return TAGS[self.tag], local

    def to_wire(self):
        return {'t': self.tag, 'v': self.wire}


def row_key(row):
    return tuple(cell.order_key() for cell in row)


def canonical_rows(rows):
    return tuple(sorted(set(tuple(row) for row in rows), key=row_key))


@dataclass(frozen=True, slots=True)
class Fact:
    e: str
    a: str
    value: Value
    valid_from: int
    valid_to: int
    tx_from: int
    tx_to: int

    def __post_init__(self):
        text(self.e, 512); text(self.a, 512)
        if type(self.value) is not Value:
            raise PlanError('fact value must be an explicit owned Value')
        owned = Value(self.value.tag, self.value.wire)
        if owned.tag == 'str':
            text(owned.wire, 512)
        object.__setattr__(self, 'value', owned)
        for name in ('valid_from','valid_to','tx_from','tx_to'):
            exact_int(getattr(self, name), MIN_I64, MAX_I64, name)
        if not self.valid_from < self.valid_to or not self.tx_from < self.tx_to:
            raise PlanError('fact intervals must be nonempty and half-open')

    def active(self, valid_at, known_at):
        return self.valid_from <= valid_at < self.valid_to and self.tx_from <= known_at < self.tx_to

    def triple(self):
        return Value('str', self.e), Value('str', self.a), self.value


@dataclass(frozen=True, slots=True)
class Limits:
    max_facts: int = 100000
    max_rounds: int = 2000
    max_work: int = 50000000
    max_candidate_bindings: int = 65536
    max_intermediate_rows: int = 65536
    max_output_rows: int = 16384

    def __post_init__(self):
        for name, maximum in (('max_facts',100000),('max_rounds',2000),('max_work',50000000),
                              ('max_candidate_bindings',65536),('max_intermediate_rows',65536),
                              ('max_output_rows',16384)):
            exact_int(getattr(self, name), 1, maximum, name)


def prepare(facts, valid_at, known_at, limits):
    if type(facts) not in (list, tuple) or len(facts) > 100000:
        raise PlanError('native input must be an owned list/tuple with at most100000 rows')
    exact_int(valid_at, MIN_I64, MAX_I64, 'valid_at')
    exact_int(known_at, MIN_I64, MAX_I64, 'known_at')
    if type(limits) is not Limits:
        raise PlanError('limits must be explicit Limits')
    limits = Limits(*(getattr(limits, name) for name in
        ('max_facts','max_rounds','max_work','max_candidate_bindings','max_intermediate_rows','max_output_rows')))
    owned = []
    for fact in facts:
        if type(fact) is not Fact:
            raise PlanError('every retained row must be a Fact')
        # Validate/copy every retained field before activity selection.
        owned.append(Fact(fact.e, fact.a, fact.value, fact.valid_from, fact.valid_to, fact.tx_from, fact.tx_to))
    return tuple(owned), valid_at, known_at, limits


def float_from_bits(wire, guard):
    guard()
    try:
        return struct.unpack('>d', bytes.fromhex(wire))[0]
    finally:
        guard()


def float_wire(number, guard):
    if type(number) is not float:
        raise PlanError('active f64 payload must be exactly float')
    guard()
    try:
        bits = struct.pack('>d', number).hex()
    finally:
        guard()
    return Value('f64', bits)


def sql_slots(value, guard):
    payload = [None, None, None, None]
    index = TAGS[value.tag]-1
    if value.tag == 'str':
        active = value.wire.encode('utf-8')
    elif value.tag == 'bool':
        active = value.wire
    elif value.tag == 'i64':
        active = int(value.wire)
    else:
        active = float_from_bits(value.wire, guard)
    payload[index] = active
    return (TAGS[value.tag], *payload)


def native_carrier(facts, guard):
    result = []
    for fact in facts:
        slots = sql_slots(fact.value, guard)
        result.append({'e':fact.e, 'a':fact.a,
            'v':{'tag':slots[0], 's':fact.value.wire if fact.value.tag == 'str' else None,
                 'b':slots[2], 'i':slots[3], 'f':slots[4]},
            'valid_from':fact.valid_from, 'valid_to':fact.valid_to,
            'tx_from':fact.tx_from, 'tx_to':fact.tx_to})
    return result


def decode_slots(slots, guard, *, strings_are_blobs):
    if type(slots) not in (tuple,list) or len(slots) != 5:
        raise PlanError('malformed complete typed SQL cell')
    tag = exact_int(slots[0], 1, 4, 'result tag')
    if any(slots[i] is not None for i in range(1,5) if i != tag):
        raise PlanError('inactive result payloads must be NULL')
    active = slots[tag]
    if tag == 1:
        if strings_are_blobs:
            if type(active) is not bytes:
                raise PlanError('SQL string identity must be an owned BLOB')
            active = active.decode('utf-8', errors='strict')
        return Value('str', text(active))
    if tag == 2:
        return Value('bool', active)
    if tag == 3:
        return Value('i64', str(exact_int(active, MIN_I64, MAX_I64, 'result i64')))
    return float_wire(active, guard)


def decode_sql(raw, arity, maximum, guard):
    if type(raw) is not list or len(raw) > maximum:
        raise PlanError('SQL result exceeds the proved complete row bound')
    result = []
    for row in raw:
        if type(row) is not tuple or len(row) != arity*5:
            raise PlanError('malformed SQL result arity')
        result.append(tuple(decode_slots(row[i*5:i*5+5], guard, strings_are_blobs=True)
                            for i in range(arity)))
    if len(set(result)) != len(result):
        raise PlanError('SQL result must be a set of full tuples')
    return canonical_rows(result)


def decode_native(raw, guard):
    if (type(raw) is not list or len(raw) != 1 or type(raw[0]) is not tuple
            or len(raw[0]) != 1 or type(raw[0][0]) is not dict):
        raise PlanError('malformed native scalar envelope')
    envelope = raw[0][0]
    if set(envelope) != {'rows','rounds','derived_facts','work'} or type(envelope['rows']) is not list:
        raise PlanError('malformed native result fields')
    counters = tuple(exact_int(envelope[k], 0, (1 << 63)-1, k) for k in ('rounds','derived_facts','work'))
    rows = []
    for row in envelope['rows']:
        if type(row) is not list or not 0 <= len(row) <= 8:
            raise PlanError('malformed native row')
        cells = []
        for cell in row:
            if type(cell) is not dict or set(cell) != {'tag','s','b','i','f'}:
                raise PlanError('malformed native typed cell')
            cells.append(decode_slots(tuple(cell[k] for k in ('tag','s','b','i','f')),
                                      guard, strings_are_blobs=False))
        rows.append(tuple(cells))
    canonical = canonical_rows(rows)
    if len(canonical) != len(rows) or tuple(rows) != canonical:
        raise PlanError('native complete rows must have canonical set order')
    return canonical, counters

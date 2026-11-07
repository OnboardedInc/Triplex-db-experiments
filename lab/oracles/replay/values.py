"""Exact Triplex value domain for O-REPLAY (Python standard library only).

Nothing here is copied from Triplex source. The shapes come from the public type
declarations (packages/core/src/Value.ts field names) and docs; every semantic
choice is written down in RULES.md with its rule id (R-VAL-*).

Representations (RULES.md R-VAL-1):
  string    Python str (a codepoint sequence); lone surrogates are invalid
  integer   Python int, range-checked to int64
  number    IEEE binary64 kept as its 64 raw bits; finite only
  boolean   Python bool
  datetime  binary64 bits (JS number) with an exact Fraction for ordering
  ref       Python str entity id
  json      original structure (key order kept, JS duplicate-key semantics)
            plus its canonical text
  blob      (hash, mimeType, size, filename)

Number lexemes from case files are kept as text (``Lex``) until converted, so
nothing is ever routed through an inexact path.
"""

from __future__ import annotations

import json
import math
import re
import struct
from fractions import Fraction

INT64_MIN = -(2 ** 63)
INT64_MAX = 2 ** 63 - 1

FAMILIES = ("integer", "number", "datetime", "boolean", "string", "ref", "json", "blob")
# R-ORD-2: family rank used when values of different families meet in one ordered list.
FAMILY_RANK = {name: index for index, name in enumerate(FAMILIES)}

_CANONICAL_INT64 = re.compile(r"(?:0|-[1-9][0-9]*|[1-9][0-9]*)\Z")


class OracleInputError(Exception):
    """The case file itself is malformed (not a system-under-test outcome)."""


class InvalidValue(Exception):
    """A value outside the Triplex value domain (expected outcome invalid-value)."""

    def __init__(self, family, reason):
        super().__init__(f"{family}: {reason}")
        self.family = family
        self.reason = reason


# --------------------------------------------------------------------------- JSON input


class Lex(str):
    """A JSON number lexeme exactly as written in the case file."""


class Obj(dict):
    """A JSON object that remembers its pairs in order (for json-typed values)."""

    def __init__(self, pairs):
        super().__init__()
        self.pairs = list(pairs)
        self.duplicate = False
        for key, value in self.pairs:
            if key in self:
                self.duplicate = True
            self[key] = value


def _reject_constant(name):
    raise OracleInputError(f"non-JSON constant {name} in case file")


def loads(text):
    """Parse case JSON keeping number lexemes and object pair order."""
    return json.loads(text, parse_float=Lex, parse_int=Lex,
                      parse_constant=_reject_constant, object_pairs_hook=Obj)


def has_lone_surrogate(text):
    return any(0xD800 <= ord(ch) <= 0xDFFF for ch in text)


# --------------------------------------------------------------------------- binary64


def f64_bits(value: float) -> int:
    return struct.unpack(">Q", struct.pack(">d", value))[0]


def bits_f64(bits: int) -> float:
    return struct.unpack(">d", struct.pack(">Q", bits))[0]


def is_negative_zero(value: float) -> bool:
    return value == 0.0 and math.copysign(1.0, value) < 0


def lexeme_to_f64(lexeme) -> float:
    """Correctly rounded decimal-to-binary64 conversion (CPython float() of text)."""
    text = str(lexeme)
    if not re.fullmatch(r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?", text):
        raise OracleInputError(f"not a JSON number lexeme: {text!r}")
    return float(text)


def es_number_to_string(value: float) -> str:
    """ECMAScript Number::toString(value) for finite binary64; -0 is written "-0".

    repr() gives the shortest round-tripping digit string (same digit selection as
    ECMAScript); only the layout differs, and that is redone here per ECMA-262
    section 6.1.6.1.20.
    """
    if not math.isfinite(value):
        raise ValueError("non-finite")
    if value == 0.0:
        return "-0" if is_negative_zero(value) else "0"
    sign = "-" if value < 0 else ""
    text = repr(abs(value))
    if "e" in text:
        mantissa, exponent = text.split("e")
        exponent = int(exponent)
    else:
        mantissa, exponent = text, 0
    if "." in mantissa:
        whole, frac = mantissa.split(".")
    else:
        whole, frac = mantissa, ""
    digits = (whole + frac).lstrip("0")
    # position of the decimal point relative to the start of `digits`
    point = len(whole) + exponent - (len(whole + frac) - len((whole + frac).lstrip("0")))
    digits = digits.rstrip("0")
    k, n = len(digits), point
    if k <= n <= 21:
        out = digits + "0" * (n - k)
    elif 0 < n <= 21:
        out = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        out = "0." + "0" * (-n) + digits
    else:
        e = n - 1
        exp = ("+" if e >= 0 else "-") + str(abs(e))
        out = digits[0] + ("." + digits[1:] if k > 1 else "") + "e" + exp
    return sign + out


class Num:
    """An exact JS number used as a coordinate (instant, validFrom, datetime value)."""

    __slots__ = ("bits", "frac")

    def __init__(self, value: float):
        if not math.isfinite(value):
            raise ValueError("non-finite number")
        self.bits = f64_bits(value)
        self.frac = Fraction(value)

    @classmethod
    def parse(cls, raw, what="number"):
        if isinstance(raw, bool) or not isinstance(raw, Lex):
            raise OracleInputError(f"{what} must be a JSON number, got {raw!r}")
        value = lexeme_to_f64(raw)
        if not math.isfinite(value):
            raise InvalidValue(what, "non-finite")
        return cls(value)

    @property
    def float(self):
        return bits_f64(self.bits)

    def lexeme(self):
        return es_number_to_string(self.float)

    def __eq__(self, other):
        return isinstance(other, Num) and self.bits == other.bits

    def __hash__(self):
        return hash(self.bits)

    def __repr__(self):
        return f"Num({self.lexeme()})"


# --------------------------------------------------------------------------- canonical json


def _utf16_key(text):
    return text.encode("utf-16-be", "surrogatepass")


def js_json_string(text):
    """JSON.stringify for a string (well-formed JSON.stringify, ES2019)."""
    out = ['"']
    for ch in text:
        code = ord(ch)
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif ch == "\b":
            out.append("\\b")
        elif ch == "\f":
            out.append("\\f")
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\r":
            out.append("\\r")
        elif ch == "\t":
            out.append("\\t")
        elif code < 0x20 or 0xD800 <= code <= 0xDFFF:
            out.append("\\u%04x" % code)
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


class JsonDoc:
    """A json-typed value as JavaScript would hold it after JSON.parse.

    ``node`` is a tree of: None, bool, float (binary64), str, list, and
    ``JsonObject`` (ordered pairs with JS duplicate-key semantics: first
    position, last value).
    """

    def __init__(self, node):
        self.node = node
        self.canonical = canonical_json(node)


class JsonObject:
    def __init__(self, pairs):
        order, values = [], {}
        for key, value in pairs:
            if key not in values:
                order.append(key)
            values[key] = value
        self.pairs = [(key, values[key]) for key in order]


def json_from_case(raw, path="json"):
    """Convert a parsed case JSON subtree into JS JSON.parse semantics (R-VAL-7)."""
    if raw is None or isinstance(raw, bool):
        return raw
    if isinstance(raw, Lex):
        value = lexeme_to_f64(raw)
        if not math.isfinite(value):
            raise InvalidValue("json", f"{path}: number outside binary64 range")
        return value
    if isinstance(raw, str):
        if has_lone_surrogate(raw):
            raise InvalidValue("json", f"{path}: lone surrogate")
        return raw
    if isinstance(raw, list):
        return [json_from_case(item, f"{path}[{i}]") for i, item in enumerate(raw)]
    if isinstance(raw, Obj):
        for key, _ in raw.pairs:
            if has_lone_surrogate(key):
                raise InvalidValue("json", f"{path}: lone surrogate in key")
        return JsonObject([(key, json_from_case(value, f"{path}.{key}")) for key, value in raw.pairs])
    raise OracleInputError(f"unexpected json node {raw!r}")


def canonical_json(node):
    """RFC 8785 style: keys by UTF-16 code units, no whitespace, ES numbers (R-VAL-8)."""
    if node is None:
        return "null"
    if node is True:
        return "true"
    if node is False:
        return "false"
    if isinstance(node, float):
        text = es_number_to_string(node)
        return "0" if text == "-0" else text
    if isinstance(node, str):
        return js_json_string(node)
    if isinstance(node, list):
        return "[" + ",".join(canonical_json(item) for item in node) + "]"
    if isinstance(node, JsonObject):
        items = sorted(node.pairs, key=lambda pair: _utf16_key(pair[0]))
        return "{" + ",".join(js_json_string(k) + ":" + canonical_json(v) for k, v in items) + "}"
    raise TypeError(node)


def json_to_output(node):
    """Original (key-ordered) structure for expected-answer output."""
    if isinstance(node, float):
        return RawNumber(es_number_to_string(node))
    if isinstance(node, list):
        return [json_to_output(item) for item in node]
    if isinstance(node, JsonObject):
        return OrderedOut((key, json_to_output(value)) for key, value in node.pairs)
    return node


# --------------------------------------------------------------------------- typed values


class Value:
    """One exact typed Triplex value. Equality and hashing are by identity key."""

    __slots__ = ("family", "payload", "extra")

    def __init__(self, family, payload, extra=None):
        self.family = family
        self.payload = payload
        self.extra = extra

    # identity (R-VAL-3): family plus exact payload; binary64 compares by bits
    def identity(self):
        return (self.family, self.payload)

    def __eq__(self, other):
        return isinstance(other, Value) and self.identity() == other.identity()

    def __hash__(self):
        return hash(self.identity())

    def __repr__(self):
        return f"Value({self.family}, {self.payload!r})"

    # canonical value order (R-ORD-1 / R-ORD-2)
    def order_key(self):
        family = self.family
        if family == "integer":
            inner = (self.payload,)
        elif family in ("number", "datetime"):
            value = bits_f64(self.payload)
            inner = (Fraction(value), 0 if is_negative_zero(value) else 1)
        elif family == "boolean":
            inner = (1 if self.payload else 0,)
        elif family in ("string", "ref"):
            inner = (self.payload,)
        elif family == "json":
            inner = (self.payload,)
        elif family == "blob":
            hash_, mime, size_bits, filename = self.payload
            inner = (hash_, mime, Fraction(bits_f64(size_bits)), filename is not None, filename or "")
        else:
            raise AssertionError(family)
        return (FAMILY_RANK[family], inner)

    def as_float(self):
        return bits_f64(self.payload)

    def exact(self):
        """Exact numeric value for integer/number/datetime."""
        if self.family == "integer":
            return Fraction(self.payload)
        if self.family in ("number", "datetime"):
            return Fraction(bits_f64(self.payload))
        raise TypeError(self.family)

    def to_output(self):
        family = self.family
        if family == "string":
            return OrderedOut([("type", "string"), ("value", self.payload)])
        if family == "ref":
            return OrderedOut([("type", "ref"), ("value", self.payload)])
        if family == "integer":
            return OrderedOut([("type", "integer"), ("value", str(self.payload))])
        if family in ("number", "datetime"):
            return OrderedOut([("type", family), ("value", RawNumber(es_number_to_string(bits_f64(self.payload)))),
                               ("bits", "0x%016x" % self.payload)])
        if family == "boolean":
            return OrderedOut([("type", "boolean"), ("value", self.payload)])
        if family == "json":
            return OrderedOut([("type", "json"), ("value", json_to_output(self.extra.node)),
                               ("canonical", self.payload)])
        if family == "blob":
            hash_, mime, size_bits, filename = self.payload
            out = [("type", "blob"), ("value", hash_), ("mimeType", mime),
                   ("size", RawNumber(es_number_to_string(bits_f64(size_bits))))]
            if filename is not None:
                out.append(("filename", filename))
            return OrderedOut(out)
        raise AssertionError(family)


def integer(value: int) -> Value:
    if not INT64_MIN <= value <= INT64_MAX:
        raise InvalidValue("integer", "outside int64")
    return Value("integer", int(value))


def number(value: float) -> Value:
    if not math.isfinite(value):
        raise InvalidValue("number", "non-finite")
    return Value("number", f64_bits(value))


def string(value: str) -> Value:
    if has_lone_surrogate(value):
        raise InvalidValue("string", "lone surrogate")
    return Value("string", value)


def boolean(value: bool) -> Value:
    return Value("boolean", bool(value))


def ref(value: str) -> Value:
    if not isinstance(value, str) or value == "" or has_lone_surrogate(value):
        raise InvalidValue("ref", "entity id must be a non-empty well-formed string")
    return Value("ref", value)


def _require_lex(raw, family):
    if isinstance(raw, bool) or not isinstance(raw, Lex):
        raise InvalidValue(family, "value must be a JSON number")
    return raw


def decode_value(raw, *, datetime_range=None) -> Value:
    """Decode a case-file TripleValue. Raises InvalidValue for out-of-domain input.

    Wire shape follows packages/core/src/Value.ts field names:
    {type, value} plus mimeType/size/filename for blob. A binary64 may also be
    given as {"type": "number", "bits": "0x..."}.
    """
    if not isinstance(raw, Obj):
        raise OracleInputError(f"typed value must be an object, got {raw!r}")
    if raw.duplicate:
        raise OracleInputError("duplicate key in typed value")
    family = raw.get("type")
    if family not in FAMILIES:
        raise InvalidValue(str(family), "unknown value type")
    allowed = {"type", "value"}
    if family == "blob":
        allowed |= {"mimeType", "size", "filename"}
    if family == "number":
        allowed |= {"bits"}
    extra_keys = set(raw) - allowed
    if extra_keys:
        raise InvalidValue(family, f"unexpected fields {sorted(extra_keys)}")
    if family == "number" and "bits" in raw:
        if "value" in raw:
            raise OracleInputError("number: give value or bits, not both")
        bits_text = raw["bits"]
        if not isinstance(bits_text, str) or not re.fullmatch(r"0x[0-9a-fA-F]{16}", bits_text):
            raise OracleInputError("number bits must be 0x + 16 hex digits")
        return number(bits_f64(int(bits_text, 16)))
    if "value" not in raw:
        raise InvalidValue(family, "missing value")
    payload = raw["value"]
    if family == "string":
        if not isinstance(payload, str) or isinstance(payload, Lex):
            raise InvalidValue(family, "value must be a string")
        return string(payload)
    if family == "ref":
        if not isinstance(payload, str) or isinstance(payload, Lex):
            raise InvalidValue(family, "value must be a string")
        return ref(payload)
    if family == "integer":
        if not isinstance(payload, str) or isinstance(payload, Lex):
            raise InvalidValue(family, "int64 travels as canonical decimal text")
        if not _CANONICAL_INT64.match(payload):
            raise InvalidValue(family, "non-canonical int64 text")
        return integer(int(payload))
    if family == "number":
        value = lexeme_to_f64(_require_lex(payload, family))
        return number(value)
    if family == "boolean":
        if not isinstance(payload, bool):
            raise InvalidValue(family, "value must be a boolean")
        return boolean(payload)
    if family == "datetime":
        value = lexeme_to_f64(_require_lex(payload, family))
        if not math.isfinite(value):
            raise InvalidValue(family, "non-finite")
        if datetime_range is not None:
            low, high = datetime_range
            if (low is not None and Fraction(value) < low) or (high is not None and Fraction(value) > high):
                raise InvalidValue(family, "outside the declared datetime range")
        return Value("datetime", f64_bits(value))
    if family == "json":
        doc = JsonDoc(json_from_case(payload))
        return Value("json", doc.canonical, doc)
    if family == "blob":
        if not isinstance(payload, str) or isinstance(payload, Lex):
            raise InvalidValue(family, "blob value (content id) must be a string")
        mime = raw.get("mimeType")
        if not isinstance(mime, str) or isinstance(mime, Lex):
            raise InvalidValue(family, "mimeType must be a string")
        if "size" not in raw:
            raise InvalidValue(family, "missing size")
        size = lexeme_to_f64(_require_lex(raw["size"], family))
        if not math.isfinite(size) or size < 0 or is_negative_zero(size):
            raise InvalidValue(family, "size must be a finite non-negative number")
        if size != math.floor(size):
            raise InvalidValue(family, "size must be a whole number")
        filename = raw.get("filename")
        if filename is not None and (not isinstance(filename, str) or isinstance(filename, Lex)):
            raise InvalidValue(family, "filename must be a string")
        for text in (payload, mime, filename or ""):
            if has_lone_surrogate(text):
                raise InvalidValue(family, "lone surrogate")
        return Value("blob", (payload, mime, f64_bits(size), filename))
    raise AssertionError(family)


# --------------------------------------------------------------------------- predicates


def comparable(a: Value, b: Value, mode="typed") -> bool:
    """R-CMP-1: values compare only inside one family (typed mode)."""
    if a.family == b.family:
        return True
    if mode == "datalog":
        numeric = {"number", "datetime"}
        return a.family in numeric and b.family in numeric
    return False


def compare(a: Value, b: Value, mode="typed"):
    """Return -1/0/1 for comparable values (R-CMP-2 numeric equality for binary64)."""
    if not comparable(a, b, mode):
        raise TypeError("incomparable families")
    if a.family in ("number", "datetime") or b.family in ("number", "datetime"):
        x, y = a.exact(), b.exact()
    else:
        x, y = a.order_key()[1], b.order_key()[1]
    return (x > y) - (x < y)


def predicate(op, actual: Value, expected, mode="typed") -> bool:
    """Evaluate eq/ne/lt/lte/gt/gte/in against one present value (R-CMP-3)."""
    if op == "in":
        return any(predicate("eq", actual, item, mode) for item in expected)
    if not comparable(actual, expected, mode):
        return op == "ne"
    c = compare(actual, expected, mode)
    return {"eq": c == 0, "ne": c != 0, "lt": c < 0, "lte": c <= 0, "gt": c > 0, "gte": c >= 0}[op]


# --------------------------------------------------------------------------- deterministic output


class RawNumber(str):
    """A JSON number lexeme to emit verbatim."""


class OrderedOut(list):
    """An output object as an ordered list of pairs."""

    def __init__(self, pairs=()):
        super().__init__(pairs)

    def get(self, key, default=None):
        for k, v in self:
            if k == key:
                return v
        return default


def dumps(node, indent=1, _level=0):
    """Deterministic JSON emitter: insertion order, ASCII-escaped, raw number lexemes."""
    pad = "\n" + " " * (indent * (_level + 1)) if indent else ""
    end = "\n" + " " * (indent * _level) if indent else ""
    sep = "," if indent else ","
    if node is None:
        return "null"
    if node is True:
        return "true"
    if node is False:
        return "false"
    if isinstance(node, RawNumber):
        return str(node)
    if isinstance(node, Lex):
        return str(node)
    if isinstance(node, int):
        return str(node)
    if isinstance(node, Fraction):
        raise TypeError("Fraction must be converted explicitly")
    if isinstance(node, float):
        raise TypeError("float must be converted explicitly")
    if isinstance(node, str):
        return json.dumps(node, ensure_ascii=True)
    if isinstance(node, OrderedOut):
        if not node:
            return "{}"
        items = [json.dumps(k, ensure_ascii=True) + ": " + dumps(v, indent, _level + 1) for k, v in node]
        return "{" + pad + (sep + pad).join(items) + end + "}"
    if isinstance(node, dict):
        return dumps(OrderedOut(node.items()), indent, _level)
    if isinstance(node, (list, tuple)):
        if not node:
            return "[]"
        items = [dumps(v, indent, _level + 1) for v in node]
        return "[" + pad + (sep + pad).join(items) + end + "]"
    raise TypeError(f"cannot emit {type(node).__name__}")


def frac_out(value: Fraction):
    """Exact rational as text p/q (or p)."""
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"

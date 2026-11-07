"""Exact Triplex value domain for O-REPLAY (Python standard library only).

Nothing here is copied from Triplex source. The shapes come from the public type
declarations (packages/core/src/Value.ts field names) and docs; every semantic
choice is written down in RULES.md with its rule id (R-VAL-*).

Representations (RULES.md R-VAL-1):
  string    Python str (a codepoint sequence); lone surrogates are invalid
  integer   Python int, range-checked to the core integer type [-2^63, 2^63-1]
            (lane ranges are applied at write, replay.py LANE_INTEGER_RANGE)
  number    IEEE binary64 kept as its 64 raw bits; finite only
  decimal   exact Fraction plus the declared (scale, precision) (ACC 4.0, Q18)
  boolean   Python bool
  datetime  binary64 bits (JS number) with an exact Fraction for ordering
  ref       Python str entity id
  json      original structure (key order kept, JS duplicate-key semantics)
            plus its canonical text
  blob      (hash, mimeType, size, filename)

Number lexemes from case files are kept as text (``Lex``) until converted, so
nothing is ever routed through an inexact path; a lexeme that binary64 cannot hold
without changing what it reads back as is a case error (R-VAL-7).
"""

from __future__ import annotations

import json
import math
import re
import struct
from fractions import Fraction

INT64_MIN = -(2 ** 63)
INT64_MAX = 2 ** 63 - 1

# R-ORD-2 (ACC 4.5 CARD_MANY_ORDER; RULINGS Q14a, with decimal placed between number and
# datetime by Q18): the family rank used whenever values of different families meet in one
# ordered list (card-many sets, sortValues, find orderBy, aggregate group order).
FAMILIES = ("boolean", "integer", "number", "decimal", "datetime", "string", "ref", "json", "blob")
FAMILY_RANK = {name: index for index, name in enumerate(FAMILIES)}

# Q14b / CMP-NEGZERO / AMB-08: -0.0 and +0.0 are one value for identity, grouping and set
# membership; the stored bits are kept for output (single reads return the stored sign).
NEG_ZERO_BITS = 0x8000000000000000

_CANONICAL_INT64 = re.compile(r"(?:0|-[1-9][0-9]*|[1-9][0-9]*)\Z")


class OracleInputError(Exception):
    """The case file itself is malformed (not a system-under-test outcome)."""


class InvalidValue(Exception):
    """A value outside the Triplex value domain. ACC 4.7 / AMB-14: a write carrying it is
    rejected with E-INVALID-VALUE (InvalidTripleError / invalid-value)."""

    error_id = "E-INVALID-VALUE"

    def __init__(self, family, reason):
        super().__init__(f"{family}: {reason}")
        self.family = family
        self.reason = reason


class DecimalUnrepresentable(InvalidValue):
    """ACC 4.0 decimal / Q18: more fractional digits than the declared scale, or more
    integer digits than precision - scale. Never rounded: E-DECIMAL-UNREPRESENTABLE."""

    error_id = "E-DECIMAL-UNREPRESENTABLE"


class MixedFamily(Exception):
    """ACC 4.3 CMP-INT-FLOAT (Q14d) and CMP-DECIMAL-CROSS (Q18): a comparison the
    contract makes a preflight E-MIXED-FAMILY error."""

    def __init__(self, left, right, op):
        super().__init__(f"{op} between {left} and {right} needs an explicit conversion")
        self.left, self.right, self.op = left, right, op


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


_JSON_NUMBER = re.compile(r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\Z")


def lexeme_to_f64(lexeme, what="number") -> float:
    """Decimal-to-binary64 conversion that refuses silent precision loss (R-VAL-7).

    CPython float() of text is correctly rounded. The brief's corrected numeric rule says a
    JSON number that binary64 cannot hold is an input error, never rounded. A lexeme is
    accepted when its decimal value equals the binary64 exactly, or equals the shortest
    ECMAScript spelling of that binary64 (Number.prototype.toString), so the value reads
    back as written: "0.1" and "0.30000000000000004" are accepted (ACC 4.1 N-F-ARITH uses
    them as binary64 literals), "9007199254740993" (reads back ...992) and "1e-400" (reads
    back 0) are case errors. Non-finite results are left to the caller, which reports the
    value-domain rejection (R-VAL-4).
    """
    text = str(lexeme)
    if not _JSON_NUMBER.match(text):
        raise OracleInputError(f"not a JSON number lexeme: {text!r}")
    value = float(text)
    if not math.isfinite(value):
        return value
    if value == 0.0:
        exact = not re.search(r"[1-9]", text.split("e")[0].split("E")[0])
    else:
        written = Fraction(text)
        exact = written == Fraction(value) or written == Fraction(es_number_to_string(value))
    if not exact:
        raise OracleInputError(
            f"{what}: JSON number {text} is not exactly a binary64 value and reads back as "
            f"{es_number_to_string(value)} (R-VAL-7: give the exact lexeme or bits)")
    return value


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
        value = lexeme_to_f64(raw, what)
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
        # R-VAL-7: a json number that JSON.parse would silently round is a case error
        value = lexeme_to_f64(raw, f"json {path}")
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

    def identity(self):
        """R-VAL-3 (Q14b, CMP-NEGZERO, AMB-08): family plus exact payload, except that
        binary64 -0.0 and +0.0 are one value (number and datetime alike: datetime -0 and
        0 are the same instant). Decimal identity is the exact numeric value, so 1.50 and
        1.5 are one value (ACC 4.0 decimal; 4.5). Python sets and dicts keep the first
        inserted member of an identity class, so callers that iterate supports in
        (recordedPosition, op index) order get Q14b's representative."""
        if self.family in ("number", "datetime") and self.payload == NEG_ZERO_BITS:
            return (self.family, 0)
        return (self.family, self.payload)

    def __eq__(self, other):
        return isinstance(other, Value) and self.identity() == other.identity()

    def __hash__(self):
        return hash(self.identity())

    def __repr__(self):
        return f"Value({self.family}, {self.payload!r})"

    def order_key(self):
        """ACC 4.5 CARD_MANY_ORDER: family rank (R-ORD-2), then value inside the family.
        number: numeric IEEE with -0.0 and +0.0 tied (they collapse, CMP-NEGZERO);
        decimal: exact numeric value; json: codepoint order of the canonical text; blob:
        content id first (the other descriptor fields only make ties deterministic)."""
        family = self.family
        if family == "integer":
            inner = (self.payload,)
        elif family in ("number", "datetime"):
            inner = (Fraction(bits_f64(self.payload)),)
        elif family == "decimal":
            inner = (self.payload,)
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
        """Exact numeric value for integer/number/decimal/datetime."""
        if self.family == "integer":
            return Fraction(self.payload)
        if self.family in ("number", "datetime"):
            return Fraction(bits_f64(self.payload))
        if self.family == "decimal":
            return self.payload
        raise TypeError(self.family)

    def to_output(self):
        family = self.family
        if family == "string":
            return OrderedOut([("type", "string"), ("value", self.payload)])
        if family == "ref":
            return OrderedOut([("type", "ref"), ("value", self.payload)])
        if family == "integer":
            # AMB-10: integers project as IntegerValue with canonical decimal text, never a JS number
            return OrderedOut([("type", "integer"), ("value", str(self.payload))])
        if family in ("number", "datetime"):
            return OrderedOut([("type", family), ("value", RawNumber(es_number_to_string(bits_f64(self.payload)))),
                               ("bits", "0x%016x" % self.payload)])
        if family == "decimal":
            scale, precision = self.extra
            out = [("type", "decimal"), ("value", decimal_text(self.payload, scale)),
                   ("scale", natural_scale(self.payload) if scale is None else scale)]
            if precision is not None:
                out.append(("precision", precision))
                # ACC 4.0 decimal storage: p <= 15 -> scaled integer value * 10^s (|scaled| < 10^15 < 2^53);
                # p > 15 -> order-preserving decimal string (its byte spelling is not fixed by the contract)
                if precision <= 15:
                    out.append(("storage", OrderedOut([("kind", "scaled-integer"),
                                                       ("scaled", str(int(self.payload * 10 ** scale)))])))
                else:
                    out.append(("storage", OrderedOut([("kind", "order-preserving-string")])))
            return OrderedOut(out)
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


def identity_text(value: Value) -> str:
    """Stable text of a value identity (Unique claimants, reports). -0.0 and +0.0 share
    one text (R-VAL-3); decimals by exact value (1.50 and 1.5 share one text)."""
    family = value.family
    if family in ("number", "datetime"):
        bits = 0 if value.payload == NEG_ZERO_BITS else value.payload
        return f"{family}:0x{bits:016x}"
    if family == "decimal":
        return "decimal:" + decimal_text(value.payload, None)
    if family == "json":
        return "json:" + value.payload
    if family == "blob":
        return "blob:" + dumps(value.to_output(), indent=0)
    if family == "integer":
        return f"integer:{value.payload}"
    if family == "boolean":
        return f"boolean:{'true' if value.payload else 'false'}"
    return f"{family}:{value.payload}"


def integer(value: int) -> Value:
    if not INT64_MIN <= value <= INT64_MAX:
        raise InvalidValue("integer", "outside the core integer type [-2^63, 2^63-1]")
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


# --------------------------------------------------------------------------- decimal (ACC 4.0, RULINGS Q18)

# R-DEC-1: decimals travel as decimal text: optional '-', integer digits without leading zeros,
# optional '.' and at least one fractional digit. No '+', no exponent, no '.5' or '5.'.
_DECIMAL_TEXT = re.compile(r"(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?\Z")


def natural_scale(value: Fraction) -> int:
    """Fewest fractional digits that write `value` exactly (decimal text has a 2^a 5^b
    denominator, so this terminates)."""
    k, scaled = 0, value
    while scaled.denominator != 1:
        scaled *= 10
        k += 1
        if k > 100000:
            raise OracleInputError("decimal without a terminating expansion")
    return k


def decimal_text(value: Fraction, scale) -> str:
    """Exact decimal text with exactly `scale` fractional digits (natural scale when
    None). The value must be representable at that scale."""
    if scale is None:
        scale = natural_scale(value)
    scaled = value * (10 ** scale)
    if scaled.denominator != 1:
        raise AssertionError("decimal not representable at its scale")
    n = int(scaled)
    sign = "-" if n < 0 else ""
    digits = str(abs(n)).rjust(scale + 1, "0")
    if scale == 0:
        return sign + digits
    return sign + digits[:-scale] + "." + digits[-scale:]


def _declaration(precision, scale, where):
    """ACC 4.0 decimal declaration: precision p (total significant digits) and scale s
    (fractional digits), 0 <= s <= p, p >= 1. A malformed declaration is a case error."""
    out = []
    for name, v in (("precision", precision), ("scale", scale)):
        if isinstance(v, bool) or not isinstance(v, (int, str)) or not re.fullmatch(r"[0-9]+", str(v)):
            raise OracleInputError(f"{where}: decimal {name} must be a non-negative integer, got {v!r}")
        out.append(int(str(v)))
    p, s = out
    if p < 1 or s > p:
        raise OracleInputError(f"{where}: decimal declaration needs 0 <= scale <= precision and precision >= 1")
    return p, s


def declare_decimal(value: Value, precision, scale, where="decimal") -> Value:
    """Bind a decimal to its attribute declaration (Q18). A value with more fractional
    digits than s, or more integer digits than p - s, fails with
    E-DECIMAL-UNREPRESENTABLE; it is never rounded or truncated. Fractional digits are
    counted on the value, so trailing zeros carry no digit (1.500 is 1.5 and fits scale 2;
    R-DEC-3, DERIVED from 'a value with more fractional digits than the scale')."""
    p, s = _declaration(precision, scale, where)
    frac = value.payload
    if natural_scale(frac) > s:
        raise DecimalUnrepresentable("decimal", f"{decimal_text(frac, None)} has more than {s} fractional digits")
    whole = abs(frac.numerator) // frac.denominator
    whole_digits = 0 if whole == 0 else len(str(whole))
    if whole_digits > p - s:
        raise DecimalUnrepresentable(
            "decimal", f"{decimal_text(frac, None)} has more than {p - s} integer digits (precision {p}, scale {s})")
    return Value("decimal", frac, (s, p))


def decimal(text, precision=None, scale=None) -> Value:
    if not isinstance(text, str) or isinstance(text, Lex):
        raise InvalidValue("decimal", "decimals travel as decimal text")
    m = _DECIMAL_TEXT.match(text)
    if not m:
        raise InvalidValue("decimal", f"non-canonical decimal text {text!r}")
    frac = Fraction(text)
    if m.group(1) and frac == 0:
        # R-DEC-2 (RULING-NEEDED): decimal has no signed zero; '-0' / '-0.00' is refused like the
        # integer text '-0' (CS-TYPES8-NEG, CV-T2I) instead of being normalized silently
        raise InvalidValue("decimal", f"negative zero text {text!r} is not canonical")
    # an undeclared decimal keeps its written scale for output (identity is the exact value)
    value = Value("decimal", frac, (len(m.group(3) or ""), None))
    if precision is not None or scale is not None:
        if precision is None or scale is None:
            raise OracleInputError("decimal: give both precision and scale, or neither")
        value = declare_decimal(value, precision, scale)
    return value


def decimal_from_fraction(frac: Fraction, scale=None) -> Value:
    """A computed decimal (kernel arithmetic, conversions): exact, with the result scale."""
    natural_scale(frac)
    return Value("decimal", frac, (scale, None))


def _require_lex(raw, family):
    if isinstance(raw, bool) or not isinstance(raw, Lex):
        raise InvalidValue(family, "value must be a JSON number")
    return raw


def decode_value(raw, *, datetime_range=None) -> Value:
    """Decode a case-file TripleValue. Raises InvalidValue for out-of-domain input.

    Wire shape follows the documented TripleValue field names: {type, value} plus
    mimeType/size/filename for blob. A binary64 may also be given as
    {"type": "number", "bits": "0x..."}. A decimal is {"type": "decimal", "value":
    "16.50"} with optional inline "precision" and "scale" (normally the attribute's
    declaration supplies them, replay.py)."""
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
    if family == "decimal":
        allowed |= {"precision", "scale"}
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
            raise InvalidValue(family, "integers travel as canonical decimal text")
        if not _CANONICAL_INT64.match(payload):
            raise InvalidValue(family, "non-canonical integer text")
        return integer(int(payload))
    if family == "decimal":
        return decimal(payload, raw.get("precision"), raw.get("scale"))
    if family == "number":
        value = lexeme_to_f64(_require_lex(payload, family), "number value")
        return number(value)
    if family == "boolean":
        if not isinstance(payload, bool):
            raise InvalidValue(family, "value must be a boolean")
        return boolean(payload)
    if family == "datetime":
        value = lexeme_to_f64(_require_lex(payload, family), "datetime value")
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
        size = lexeme_to_f64(_require_lex(raw["size"], family), "blob size")
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


# --------------------------------------------------------------------------- untyped constants


class Untyped:
    """An untyped query constant (a bare JSON string or number in a predicate), as a JS
    caller passes 'red' or 7 without a TripleValue wrapper. ACC 4.3 CMP-UNTYPED-STRING
    (an untyped string matches string and ref values; a typed ref matches only refs) and
    CMP-NUMERIC-CONST (an untyped number compares by numeric value with number and
    datetime values; text '7' is not equal). Never stored."""

    __slots__ = ("kind", "payload")

    def __init__(self, kind, payload):
        self.kind, self.payload = kind, payload

    def __repr__(self):
        return f"Untyped({self.kind}, {self.payload!r})"


def decode_constant(raw, *, datetime_range=None):
    """Predicate constant: a typed value object, or an untyped bare JSON scalar."""
    if isinstance(raw, Obj):
        return decode_value(raw, datetime_range=datetime_range)
    if isinstance(raw, bool):
        return boolean(raw)
    if isinstance(raw, Lex):
        value = lexeme_to_f64(raw, "untyped numeric constant")
        if not math.isfinite(value):
            raise InvalidValue("number", "non-finite")
        return Untyped("number", value)
    if isinstance(raw, str):
        if has_lone_surrogate(raw):
            raise InvalidValue("string", "lone surrogate")
        return Untyped("string", raw)
    raise OracleInputError(f"bad predicate constant {raw!r}")


# --------------------------------------------------------------------------- predicates

ORDERED_OPS = ("lt", "lte", "gt", "gte")


def _cmp(x, y):
    return (x > y) - (x < y)


def _same_family_cmp(a: Value, b: Value):
    """ACC 4.3 CMP-SAME: integer as integers, binary64 by IEEE value (-0.0 = +0.0),
    decimal by exact value, text and refs by codepoint sequence, datetime by instant,
    boolean false < true, json by canonical text, blob by descriptor."""
    if a.family in ("integer", "number", "datetime", "decimal"):
        return _cmp(a.exact(), b.exact())
    return _cmp(a.order_key()[1], b.order_key()[1])


def relation(op, actual: Value, expected, mode="typed"):
    """Truth of `actual op expected` for one present value, or MixedFamily.

    Cross-family rules, in contract order:
      CMP-DECIMAL-CROSS (Q18): decimal versus integer or number -> any comparison is
        preflight E-MIXED-FAMILY unless converted (never equal, never one group).
      CMP-INT-FLOAT (Q8d, Q14d): integer versus number -> equality false, != true, an
        ordered comparison is preflight E-MIXED-FAMILY.
      CMP-NUMERIC-CONST: an untyped numeric constant compares by numeric value with
        number and datetime values; against an integer it is a JS number, so CMP-INT-FLOAT
        applies; against decimal, CMP-DECIMAL-CROSS.
      CMP-UNTYPED-STRING: an untyped string matches string and ref values by codepoints.
      Otherwise (R-CMP-3, CMP-IDENTITY, CMP-BOOL-INT): different families are never
        equal, != is true, and ordered comparisons are false. `datalog` mode keeps the old
        oracle switch that merges number and datetime for typed values.
    """
    if op == "in":
        return any(relation("eq", actual, item, mode) for item in expected)
    if op not in ("eq", "ne") + ORDERED_OPS:
        raise OracleInputError(f"unknown predicate op {op!r}")
    if isinstance(expected, Untyped):
        if expected.kind == "string":
            if actual.family in ("string", "ref"):
                c = _cmp(actual.payload, expected.payload)
                return _truth(op, c)
            return op == "ne"
        expected = Value("number", f64_bits(expected.payload))
        if actual.family == "datetime":
            return _truth(op, _cmp(actual.exact(), expected.exact()))
    fa, fb = actual.family, expected.family
    if fa == fb:
        return _truth(op, _same_family_cmp(actual, expected))
    pair = {fa, fb}
    if "decimal" in pair and pair & {"integer", "number"}:
        raise MixedFamily(fa, fb, op)
    if pair == {"integer", "number"}:
        if op in ORDERED_OPS:
            raise MixedFamily(fa, fb, op)
        return op == "ne"
    if mode == "datalog" and pair <= {"number", "datetime"}:
        return _truth(op, _cmp(actual.exact(), expected.exact()))
    return op == "ne"


def _truth(op, c):
    return {"eq": c == 0, "ne": c != 0, "lt": c < 0, "lte": c <= 0, "gt": c > 0, "gte": c >= 0}[op]


def predicate(op, actual: Value, expected, mode="typed") -> bool:
    """Evaluate eq/ne/lt/lte/gt/gte/in against one present value (raises MixedFamily)."""
    return relation(op, actual, expected, mode)


def comparable(a: Value, b, mode="typed") -> bool:
    """True when an ordered comparison has a defined answer inside one family (or the
    `datalog` number/datetime merge); used only for reporting."""
    if isinstance(b, Untyped):
        return (b.kind == "string" and a.family in ("string", "ref")) or \
            (b.kind == "number" and a.family in ("number", "datetime"))
    if a.family == b.family:
        return True
    return mode == "datalog" and {a.family, b.family} <= {"number", "datetime"}

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

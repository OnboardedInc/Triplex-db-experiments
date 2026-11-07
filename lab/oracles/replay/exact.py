"""Exact arithmetic, conversions and aggregates (ACC 0.3.1 sections 4.1, 4.2, 4.4;
RULES.md R-NUM-*, R-AGG-*).

Integer arithmetic uses unbounded Python ints with an explicit range check on each
scalar result (the core integer type [-2^63, 2^63-1]; lane ranges apply only at write).
binary64 arithmetic uses CPython float operations, which are IEEE 754 binary64
round-to-nearest-even, one rounding per operation; results are checked for finiteness.
Decimal arithmetic is exact (Fractions with decimal denominators). Exact sums use Python
ints / Fractions and round once (int / int true division and Fraction.__float__ are
correctly rounded in CPython). Every typed failure carries its ACC 4.7 error id.
"""

from __future__ import annotations

import math
from fractions import Fraction

from . import errors as ERR
from . import values as V


class TypedError(Exception):
    """An expected typed failure. `error_id` is an ACC 4.7 id (E-...) or a non-table id
    (X-...) that carries its own tag/reason and the ruling that leaves it open."""

    def __init__(self, error_id, message="", *, reason=None, alternatives=None, tag=None, ruling=None, **detail):
        super().__init__(f"{error_id}: {message}")
        self.code = error_id
        self.message = message
        self.reason = reason
        self.alternatives = alternatives
        self.tag = tag
        self.ruling = ruling
        self.detail = detail

    def to_output(self):
        out = ERR.fields(self.code, self.reason, self.alternatives, self.tag, self.ruling)
        if self.message:
            out.append(("message", self.message))
        for key, value in self.detail.items():
            out.append((key, value))
        return V.OrderedOut(out)


def mixed(error: V.MixedFamily):
    """CMP-INT-FLOAT / CMP-DECIMAL-CROSS / N-MIXED -> preflight E-MIXED-FAMILY."""
    return TypedError("E-MIXED-FAMILY", str(error), left=error.left, right=error.right, op=error.op)


def check_int64(value: int) -> int:
    """N-I-ADD / N-I-NEG / N-I-DIV: a result outside [-2^63, 2^63-1] is E-INTEGER-OVERFLOW."""
    if not V.INT64_MIN <= value <= V.INT64_MAX:
        raise TypedError("E-INTEGER-OVERFLOW", "result outside the core integer range [-2^63, 2^63-1]",
                         result=str(value))
    return value


def check_f64(value: float) -> float:
    """N-F-ARITH: an infinite result is E-NUMBER-OVERFLOW (NaN cannot arise: inputs are
    finite and division by zero is refused first)."""
    if not math.isfinite(value):
        raise TypedError("E-NUMBER-OVERFLOW", "binary64 result is not finite")
    return value


# --------------------------------------------------------------------------- scalar ops


def _binary_family(op, a: V.Value, b: V.Value):
    """N-MIXED / CV-NONE: no implicit conversion between families. integer with number,
    and decimal with integer or number, are preflight E-MIXED-FAMILY unless the query
    converts one operand explicitly. A non-numeric operand is also E-MIXED-FAMILY
    (R-NUM-7, RULING-NEEDED: 4.7 has no other typed preflight reason for it)."""
    if a.family != b.family or a.family not in ("integer", "number", "decimal"):
        raise TypedError("E-MIXED-FAMILY", f"{op} needs two operands of one numeric family "
                         "(convert explicitly with toNumber / toInteger / toDecimal)",
                         left=a.family, right=b.family)
    return a.family


def _decimal_scale(*values):
    scales = [v.extra[0] if v.extra[0] is not None else V.natural_scale(v.payload) for v in values]
    return scales


def add(a, b):
    family = _binary_family("add", a, b)
    if family == "integer":
        return V.integer(check_int64(a.payload + b.payload))
    if family == "decimal":
        # Q18 kernel arithmetic: exact; result scale max(sa, sb) (R-DEC-4, DERIVED)
        return V.decimal_from_fraction(a.payload + b.payload, max(_decimal_scale(a, b)))
    return V.number(check_f64(a.as_float() + b.as_float()))


def sub(a, b):
    family = _binary_family("sub", a, b)
    if family == "integer":
        return V.integer(check_int64(a.payload - b.payload))
    if family == "decimal":
        return V.decimal_from_fraction(a.payload - b.payload, max(_decimal_scale(a, b)))
    return V.number(check_f64(a.as_float() - b.as_float()))


def mul(a, b):
    family = _binary_family("mul", a, b)
    if family == "integer":
        return V.integer(check_int64(a.payload * b.payload))
    if family == "decimal":
        # exact; result scale sa + sb (R-DEC-4, DERIVED)
        return V.decimal_from_fraction(a.payload * b.payload, sum(_decimal_scale(a, b)))
    return V.number(check_f64(a.as_float() * b.as_float()))


def _trunc_div(n, d):
    q = abs(n) // abs(d)
    return -q if (n < 0) != (d < 0) else q


def div(a, b):
    """N-I-DIV: integer quotient truncated toward zero; divisor 0 is E-DIVISION-BY-ZERO;
    -2^63 / -1 is E-INTEGER-OVERFLOW. N-F-ARITH: binary64 division by +0.0 or -0.0 is
    E-DIVISION-BY-ZERO (Q8c: no NaN or Infinity results)."""
    family = _binary_family("div", a, b)
    if family == "integer":
        if b.payload == 0:
            raise TypedError("E-DIVISION-BY-ZERO", "integer division by zero")
        return V.integer(check_int64(_trunc_div(a.payload, b.payload)))
    if family == "decimal":
        raise V.OracleInputError("decimal division is not modeled: its result scale and rounding are not frozen "
                                 "(R-DEC-5, ORCHESTRATOR-RULING-NEEDED)")
    if b.as_float() == 0.0:
        raise TypedError("E-DIVISION-BY-ZERO", "binary64 division by zero")
    return V.number(check_f64(a.as_float() / b.as_float()))


def rem(a, b):
    """N-I-REM: a - trunc(a/b)*b (sign of the dividend); divisor 0 is E-DIVISION-BY-ZERO.
    -2^63 % -1 = 0 (no overflow: the remainder is always inside the range)."""
    family = _binary_family("rem", a, b)
    if family != "integer":
        raise V.OracleInputError(f"rem over {family} is not in ACC 4.1 (R-NUM-8, ORCHESTRATOR-RULING-NEEDED)")
    if b.payload == 0:
        raise TypedError("E-DIVISION-BY-ZERO", "integer remainder by zero")
    return V.integer(check_int64(a.payload - _trunc_div(a.payload, b.payload) * b.payload))


def neg(a):
    """N-I-NEG: -(-2^63) overflows. N-F-NEGZERO: -(0.0) = -0.0, -(-0.0) = +0.0."""
    if a.family == "integer":
        return V.integer(check_int64(-a.payload))
    if a.family == "number":
        return V.number(-a.as_float())
    if a.family == "decimal":
        return V.decimal_from_fraction(-a.payload, a.extra[0])
    raise TypedError("E-MIXED-FAMILY", "neg needs a numeric operand", operand=a.family)


def abs_(a):
    """N-I-NEG: ABS(-2^63) overflows; ABS(-5) = 5."""
    if a.family == "integer":
        return V.integer(check_int64(abs(a.payload)))
    if a.family == "number":
        return V.number(abs(a.as_float()))
    if a.family == "decimal":
        return V.decimal_from_fraction(abs(a.payload), a.extra[0])
    raise TypedError("E-MIXED-FAMILY", "abs needs a numeric operand", operand=a.family)


# --------------------------------------------------------------------------- conversions (ACC 4.2)


def to_number(a):
    """CV-I2F (AMB-11's explicit conversion): toNumber(integer) rounds to the nearest
    binary64, ties to even, once (CPython int -> float is correctly rounded). toNumber of a
    number is the number; of a decimal, the correctly rounded binary64 of its exact value
    (DERIVED from CV-I2F). Other families: E-INVALID-CONVERSION."""
    if a.family == "number":
        return a
    if a.family in ("integer", "decimal"):
        try:
            return V.number(check_f64(float(a.exact())))
        except OverflowError:
            raise TypedError("E-NUMBER-OVERFLOW", "value is outside the binary64 range")
    raise TypedError("E-INVALID-CONVERSION", f"toNumber of {a.family}", operand=a.family)


def to_integer(a):
    """CV-F2I: toInteger(number) only explicitly; the value must be integral and inside
    the core integer range, else E-INVALID-CONVERSION; -0.0 converts to 0. Integers pass
    through; a decimal follows the same rule (DERIVED)."""
    if a.family == "integer":
        return a
    if a.family in ("number", "decimal"):
        x = a.exact()
        if x.denominator != 1 or not V.INT64_MIN <= x.numerator <= V.INT64_MAX:
            raise TypedError("E-INVALID-CONVERSION", "toInteger needs an integral value inside [-2^63, 2^63-1]",
                             operand=V.dumps(a.to_output(), indent=0))
        return V.integer(x.numerator)
    raise TypedError("E-INVALID-CONVERSION", f"toInteger of {a.family}", operand=a.family)


def to_decimal(a):
    """Explicit conversion into the decimal family (DEC-CONVERTED-COMPARE): an integer
    or a decimal converts exactly; a binary64 converts to its exact binary expansion
    (finite, so exact; R-DEC-6, DERIVED). Other families: E-INVALID-CONVERSION."""
    if a.family == "decimal":
        return a
    if a.family == "integer":
        return V.decimal_from_fraction(Fraction(a.payload), 0)
    if a.family == "number":
        return V.decimal_from_fraction(a.exact())
    raise TypedError("E-INVALID-CONVERSION", f"toDecimal of {a.family}", operand=a.family)


def cast_integer(a):
    """CV-T2I: CAST text to integer accepts canonical decimal only (optional leading '-',
    no '+', no leading zeros except '0', no '-0'); canonical text outside the core range is
    E-INTEGER-OVERFLOW, every other text E-INVALID-CONVERSION. Integers pass through."""
    if a.family == "integer":
        return a
    if a.family != "string":
        raise TypedError("E-INVALID-CONVERSION", "CAST to integer needs text", operand=a.family)
    text = a.payload
    if not V._CANONICAL_INT64.match(text):
        raise TypedError("E-INVALID-CONVERSION", "not canonical decimal integer text", text=text)
    return V.integer(check_int64(int(text)))


OPS = {"add": (add, 2), "sub": (sub, 2), "mul": (mul, 2), "div": (div, 2), "rem": (rem, 2),
       "neg": (neg, 1), "abs": (abs_, 1),
       "cast-int64": (cast_integer, 1), "cast-integer": (cast_integer, 1),
       "to-number": (to_number, 1), "toNumber": (to_number, 1),
       "to-int64": (to_integer, 1), "toInt64": (to_integer, 1), "to-integer": (to_integer, 1),
       "toInteger": (to_integer, 1),
       "to-decimal": (to_decimal, 1), "toDecimal": (to_decimal, 1)}


def evaluate(expr):
    """Evaluate ["op", arg, ...] where args are Values or nested lists."""
    if isinstance(expr, V.Value):
        return expr
    if not isinstance(expr, list) or not expr or expr[0] not in OPS:
        raise V.OracleInputError(f"bad expression {expr!r}")
    fn, arity = OPS[expr[0]]
    if len(expr) != arity + 1:
        raise V.OracleInputError(f"{expr[0]} takes {arity} operands")
    return fn(*[evaluate(arg) for arg in expr[1:]])


# --------------------------------------------------------------------------- aggregates (ACC 4.4)


def _families(items):
    return {item.family for item in items}


def agg_count(items):
    """AG-COUNT: COUNT over a variable counts distinct flattened values of that variable,
    so two entities with value 10 count 1 while SUM counts 20 (identity per R-VAL-3)."""
    return V.integer(len(set(items)))


def agg_sum(items):
    """AG-SUM-I (Q8a, Q20): exact total over the solution rows; E-INTEGER-OVERFLOW only
    when the final total is outside the integer range; partial sums never wrap.
    AG-SUM-F (Q14c): the correctly rounded value of the exact sum, one rounding,
    independent of order; an all-(-0.0) input sums to -0.0 (IEEE sign rule for an exact
    zero sum of negative zeros, N-F-NEGZERO). Decimal sums are exact (Q18 kernel)."""
    if not items:
        return None
    families = _families(items)
    if len(families) != 1:
        raise TypedError("E-MIXED-FAMILY", "sum over several value families", families=sorted(families))
    family = families.pop()
    if family == "integer":
        return V.integer(check_int64(sum(item.payload for item in items)))
    if family == "number":
        floats = [item.as_float() for item in items]
        if all(V.is_negative_zero(x) for x in floats):
            return V.number(-0.0)
        total = sum((Fraction(x) for x in floats), Fraction(0))
        try:
            return V.number(check_f64(float(total)))
        except OverflowError:
            raise TypedError("E-NUMBER-OVERFLOW", "binary64 sum is not finite")
    if family == "decimal":
        return V.decimal_from_fraction(sum((item.payload for item in items), Fraction(0)),
                                       max(_decimal_scale(*items)))
    raise TypedError("E-MIXED-FAMILY", f"sum over the non-numeric family {family}", family=family)


def agg_avg(items, *, convert=None):
    """AG-AVG-I (Q8b): AVG over integers without explicit conversion is the preflight
    E-INTEGER-AVG (raised even for empty input). AG-AVG-CONV (AMB-11: the conversion is
    toNumber(?v)): binary64 of the exact sum divided by the count, rounded once. AVG over
    number: the exact mean rounded once."""
    families = _families(items)
    if convert is None and "integer" in families:
        raise TypedError("E-INTEGER-AVG", "AVG over integers requires an explicit conversion (toNumber)")
    if convert is None and "decimal" in families:
        raise V.OracleInputError("decimal AVG without conversion is not modeled (R-DEC-7, ORCHESTRATOR-RULING-NEEDED)")
    if convert not in (None, "toNumber"):
        raise V.OracleInputError(f"unknown AVG conversion {convert!r}")
    if not items:
        return None
    if len(families) != 1:
        raise TypedError("E-MIXED-FAMILY", "avg over several value families", families=sorted(families))
    family = families.pop()
    if family not in ("integer", "number", "decimal"):
        raise TypedError("E-MIXED-FAMILY", f"avg over the non-numeric family {family}", family=family)
    total = sum((item.exact() for item in items), Fraction(0))
    mean = total / len(items)
    try:
        return V.number(check_f64(float(mean)))
    except OverflowError:
        raise TypedError("E-NUMBER-OVERFLOW", "binary64 mean is not finite")


def agg_minmax(items, which):
    """AG-MINMAX-TIES: MIN/MAX return the extreme value inside one family (CV-NONE: no
    implicit conversion, so mixed families are E-MIXED-FAMILY)."""
    if not items:
        return None
    families = _families(items)
    if len(families) != 1:
        raise TypedError("E-MIXED-FAMILY", f"{which} over several value families", families=sorted(families))
    ordered = sorted(items, key=lambda item: item.order_key())
    return ordered[0] if which == "min" else ordered[-1]


def aggregate(op, items, **options):
    if op == "count":
        return agg_count(items)
    if op == "sum":
        return agg_sum(items)
    if op == "avg":
        return agg_avg(items, convert=options.get("convert"))
    if op in ("min", "max"):
        return agg_minmax(items, op)
    raise V.OracleInputError(f"unknown aggregate {op}")

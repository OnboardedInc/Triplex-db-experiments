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
        # a query-time error of a two-phase row (E-DECIMAL-OVERFLOW) is a computed result: execution
        phases = ERR.ERROR_TABLE.get(self.code, (None, None, None))[2]
        phase = "execution" if isinstance(phases, tuple) else None
        out = ERR.fields(self.code, self.reason, self.alternatives, self.tag, self.ruling, phase)
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
    """N-MIXED / CV-NONE / DC-IMPLICIT: no implicit conversion between families. integer
    with number, and decimal with integer or number, are preflight E-MIXED-FAMILY unless
    the query converts one operand explicitly. A non-numeric operand is also E-MIXED-FAMILY
    (R-NUM-7, ruled by Q33e)."""
    if a.family != b.family or a.family not in ("integer", "number", "decimal"):
        raise TypedError("E-MIXED-FAMILY", f"{op} needs two operands of one numeric family "
                         "(convert explicitly with toNumber / toInteger / toDecimal)",
                         left=a.family, right=b.family)
    return a.family


def _dtype(v):
    """(scale, precision) of a decimal value (R-DEC-8, RULINGS Q43c)."""
    return v.extra[0], v.extra[1]


def decimal_checked(frac, scale, precision, what):
    """Q22 / DO-*: the result type's precision is capped at the 38-digit kernel maximum
    (no target is declared inside an expression, R-DEC-10, RULINGS Q43e); a result whose integer digits
    exceed precision - scale is E-DECIMAL-OVERFLOW, never rounded."""
    p = min(precision, V.KERNEL_MAX_DIGITS)
    if V.integer_digits(frac) > p - scale:
        raise TypedError("E-DECIMAL-OVERFLOW", f"{what}: the result has more than {p - scale} integer digits "
                         f"(precision {p}, scale {scale})", result=V.decimal_text(frac, scale))
    return V.decimal_result(frac, scale, p)


def _decimal_addsub(a, b, frac, what):
    """DO-ADD: scale max(s1, s2); precision max(p1 - s1, p2 - s2) + scale + 1."""
    (s1, p1), (s2, p2) = _dtype(a), _dtype(b)
    s = max(s1, s2)
    return decimal_checked(frac, s, max(p1 - s1, p2 - s2) + s + 1, what)


def add(a, b):
    family = _binary_family("add", a, b)
    if family == "integer":
        return V.integer(check_int64(a.payload + b.payload))
    if family == "decimal":
        return _decimal_addsub(a, b, a.payload + b.payload, "add")
    return V.number(check_f64(a.as_float() + b.as_float()))


def sub(a, b):
    family = _binary_family("sub", a, b)
    if family == "integer":
        return V.integer(check_int64(a.payload - b.payload))
    if family == "decimal":
        return _decimal_addsub(a, b, a.payload - b.payload, "sub")
    return V.number(check_f64(a.as_float() - b.as_float()))


def mul(a, b):
    family = _binary_family("mul", a, b)
    if family == "integer":
        return V.integer(check_int64(a.payload * b.payload))
    if family == "decimal":
        # DO-MUL: scale s1 + s2, precision p1 + p2
        (s1, p1), (s2, p2) = _dtype(a), _dtype(b)
        return decimal_checked(a.payload * b.payload, s1 + s2, p1 + p2, "mul")
    return V.number(check_f64(a.as_float() * b.as_float()))


def _trunc_div(n, d):
    q = abs(n) // abs(d)
    return -q if (n < 0) != (d < 0) else q


def div(a, b):
    """N-I-DIV: integer quotient truncated toward zero; divisor 0 is E-DIVISION-BY-ZERO;
    -2^63 / -1 is E-INTEGER-OVERFLOW. N-F-ARITH: binary64 division by +0.0 or -0.0 is
    E-DIVISION-BY-ZERO (Q8c: no NaN or Infinity results). DO-BARE-DIV (Q22): a bare `/`
    with a decimal operand is preflight E-DECIMAL-BARE-DIVIDE; use divide(a, b, scale,
    rounding)."""
    if "decimal" in (a.family, b.family):
        raise TypedError("E-DECIMAL-BARE-DIVIDE", "bare / on decimals; use divide(a, b, scale, rounding)")
    family = _binary_family("div", a, b)
    if family == "integer":
        if b.payload == 0:
            raise TypedError("E-DIVISION-BY-ZERO", "integer division by zero")
        return V.integer(check_int64(_trunc_div(a.payload, b.payload)))
    if b.as_float() == 0.0:
        raise TypedError("E-DIVISION-BY-ZERO", "binary64 division by zero")
    return V.number(check_f64(a.as_float() / b.as_float()))


def _param_int(raw, what, low=0, high=V.KERNEL_MAX_DIGITS):
    """A scale / precision parameter: a bare JSON integer or a typed integer."""
    if isinstance(raw, V.Value) and raw.family == "integer":
        n = raw.payload
    elif isinstance(raw, int) and not isinstance(raw, bool):   # direct kernel calls
        n = raw
    elif isinstance(raw, V.Lex) and str(raw).lstrip("-").isdigit():
        n = int(str(raw))
    else:
        raise V.OracleInputError(f"{what} must be an integer, got {raw!r}")
    if not low <= n <= high:
        raise V.OracleInputError(f"{what} must be in {low}..{high}, got {n}")
    return n


def _param_mode(raw):
    if isinstance(raw, V.Value) and raw.family == "string":
        raw = raw.payload
    if not isinstance(raw, str) or isinstance(raw, V.Lex):
        raise V.OracleInputError(f"rounding must be a string, got {raw!r}")
    if raw not in V.ROUNDING_MODES:
        raise V.OracleInputError(f"rounding must be one of {V.ROUNDING_MODES}, got {raw!r}")
    return raw


def divide(a, b, scale, rounding):
    """DO-DIV (Q22): divide(a, b, scale, rounding), rounding one of half-even, half-up,
    down: the exact quotient rounded once at the named scale, the one place rounding
    happens. b = 0 is E-DIVISION-BY-ZERO; a result beyond the precision (no declared target
    inside an expression: 38 digits) is E-DECIMAL-OVERFLOW. `a` is a decimal; `b` is a
    decimal or an integer, so Q33b's divide(SUM, COUNT, scale, rounding) is expressible
    (R-DEC-7; integer operands are exact)."""
    s, mode = _param_int(scale, "divide scale"), _param_mode(rounding)
    if a.family != "decimal" or b.family not in ("decimal", "integer"):
        raise TypedError("E-MIXED-FAMILY", "divide needs a decimal dividend and a decimal or integer divisor",
                         left=a.family, right=b.family)
    if b.exact() == 0:
        raise TypedError("E-DIVISION-BY-ZERO", "decimal division by zero")
    quotient = V.round_fraction(a.payload / b.exact(), s, mode)
    return decimal_checked(quotient, s, V.KERNEL_MAX_DIGITS, "divide")


def round_(x, scale, rounding):
    """DO-ROUND (Q22): round(x, s, rounding) on a decimal: result scale s, precision
    p - (s_x - s) when s < s_x; E-DECIMAL-OVERFLOW only when a carry exceeds that precision.
    s = s_x returns x. R-DEC-11 (RULINGS Q43f): s > s_x is exact, x at scale s with zeros
    appended, subject only to the 38-digit limit; its precision is p + (s - s_x) so x's
    integer digits still fit (DO-ROUND's "else p" would drop them; DERIVED from Q43f's
    "never refused")."""
    s, mode = _param_int(scale, "round scale"), _param_mode(rounding)
    if x.family != "decimal":
        raise TypedError("E-MIXED-FAMILY", "round needs a decimal operand", operand=x.family)
    sx, px = _dtype(x)
    if s == sx:
        return x
    if s > sx:
        return decimal_checked(x.payload, s, px + (s - sx), "round")
    return decimal_checked(V.round_fraction(x.payload, s, mode), s, px - (sx - s), "round")


def rem(a, b):
    """N-I-REM: a - trunc(a/b)*b (sign of the dividend); divisor 0 is E-DIVISION-BY-ZERO.
    -2^63 % -1 = 0 (no overflow). R-NUM-8 (ruled by Q33e): rem is integer-only; a binary64
    or decimal operand is a preflight error (E-MIXED-FAMILY, the 4.7 preflight row for an
    operand of the wrong family)."""
    if a.family != "integer" or b.family != "integer":
        raise TypedError("E-MIXED-FAMILY", "rem is defined for integers only (Q33e)", left=a.family,
                         right=b.family)
    if b.payload == 0:
        raise TypedError("E-DIVISION-BY-ZERO", "integer remainder by zero")
    return V.integer(check_int64(a.payload - _trunc_div(a.payload, b.payload) * b.payload))


def neg(a):
    """N-I-NEG: -(-2^63) overflows. N-F-NEGZERO: -(0.0) = -0.0, -(-0.0) = +0.0. A decimal
    keeps its type (decimal zero has no sign)."""
    if a.family == "integer":
        return V.integer(check_int64(-a.payload))
    if a.family == "number":
        return V.number(-a.as_float())
    if a.family == "decimal":
        return V.decimal_result(-a.payload, *_dtype(a))
    raise TypedError("E-MIXED-FAMILY", "neg needs a numeric operand", operand=a.family)


def abs_(a):
    """N-I-NEG: ABS(-2^63) overflows; ABS(-5) = 5."""
    if a.family == "integer":
        return V.integer(check_int64(abs(a.payload)))
    if a.family == "number":
        return V.number(abs(a.as_float()))
    if a.family == "decimal":
        return V.decimal_result(abs(a.payload), *_dtype(a))
    raise TypedError("E-MIXED-FAMILY", "abs needs a numeric operand", operand=a.family)


# --------------------------------------------------------------------------- conversions (ACC 4.2, decimalConversions)


def to_number(a):
    """CV-I2F (AMB-11's explicit conversion): toNumber(integer) rounds to the nearest
    binary64, ties to even, once (CPython int -> float is correctly rounded). toNumber of a
    number is the number. DC-D2N: decimal to number only through toNumber, one correctly
    rounded binary64. Other families: E-INVALID-CONVERSION."""
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
    the core integer range, else E-INVALID-CONVERSION; -0.0 converts to 0. DC-D2I (Q22): a
    decimal converts only when its fraction is zero, else E-DECIMAL-FRACTION (write
    round(x, 0, rounding) first); a whole decimal outside the core range is
    E-INTEGER-OVERFLOW (R-DEC-12, RULINGS Q43g). Integers pass through."""
    if a.family == "integer":
        return a
    if a.family == "decimal":
        x = a.payload
        if x.denominator != 1:
            raise TypedError("E-DECIMAL-FRACTION", "decimal to integer with a non-zero fraction; "
                             "use round(x, 0, rounding) first", operand=V.decimal_text(x, a.extra[0]))
        return V.integer(check_int64(x.numerator))
    if a.family == "number":
        x = a.exact()
        if x.denominator != 1 or not V.INT64_MIN <= x.numerator <= V.INT64_MAX:
            raise TypedError("E-INVALID-CONVERSION", "toInteger needs an integral value inside [-2^63, 2^63-1]",
                             operand=V.dumps(a.to_output(), indent=0))
        return V.integer(x.numerator)
    raise TypedError("E-INVALID-CONVERSION", f"toInteger of {a.family}", operand=a.family)


def to_decimal(a, precision=None, scale=None, rounding=None):
    """Conversions into the decimal family (decimalConversions):
      DC-I2D: toDecimal(integer[, p, s]) is exact when the integer fits p - s digits, else
        E-DECIMAL-OVERFLOW; without (p, s) its type is (digits, 0).
      DC-N2D: toDecimal(number, p, s, rounding) only: the exact binary expansion (R-DEC-6,
        Q33b) rounded once at scale s with the named mode; more than p - s integer digits
        is E-DECIMAL-OVERFLOW (R-DEC-13, RULINGS Q43a).
      a decimal with (p, s) is re-declared exactly: excess fraction digits E-DECIMAL-FRACTION,
        excess integer digits E-DECIMAL-OVERFLOW (Q43a).
      DR-JSON-CONVERT: toDecimal(json, p, s) validates the JSON value (`_json_to_decimal`).
    """
    if a.family == "json":
        return _json_to_decimal(a, precision, scale, rounding)
    if a.family == "number":
        if precision is None or scale is None or rounding is None:
            raise V.OracleInputError("DC-N2D: a number converts to decimal only through toDecimal(x, p, s, rounding)")
        p, s = _param_int(precision, "toDecimal precision", 1), _param_int(scale, "toDecimal scale")
        frac = V.round_fraction(a.exact(), s, _param_mode(rounding))
        return _declared(V.Value("decimal", frac, (s, max(1, V.integer_digits(frac) + s), False)), p, s)
    if rounding is not None:
        raise V.OracleInputError("rounding applies to toDecimal(number, p, s, rounding) only")
    if a.family == "integer":
        value = V.Value("decimal", Fraction(a.payload), (0, max(1, V.integer_digits(Fraction(a.payload))), False))
    elif a.family == "decimal":
        value = a
    else:
        raise TypedError("E-INVALID-CONVERSION", f"toDecimal of {a.family}", operand=a.family)
    if precision is None and scale is None:
        return value
    if precision is None or scale is None:
        raise V.OracleInputError("toDecimal takes (x) or (x, p, s)")
    return _declared(value, _param_int(precision, "toDecimal precision", 1), _param_int(scale, "toDecimal scale"))


def _json_decimal_outcome(frac, p, s):
    """The answer toDecimal gives for one exact value: ("ok", value) or (error id,)."""
    try:
        return ("ok", V.declare_decimal(V.Value("decimal", frac, (0, 1, False)), p, s, "toDecimal"))
    except V.DecimalFraction:
        return ("E-DECIMAL-FRACTION",)
    except V.DecimalOverflow:
        return ("E-DECIMAL-OVERFLOW",)


def _json_to_decimal(a, precision, scale, rounding):
    """DR-JSON-CONVERT (ACC decimalRouting, Q38d): an explicit toDecimal(json, p, s) with a
    declared precision and scale validates the JSON value, never rounding it: a JSON number
    becomes decimal(p, s), with E-DECIMAL-FRACTION for excess fraction digits and
    E-DECIMAL-OVERFLOW beyond p - s integer digits (or 38); a JSON boolean, null, array,
    object or non-decimal string is E-INVALID-VALUE (toDecimal(json 1.5, 2, 1) = 1.5;
    json 1.55 at scale 1 is E-DECIMAL-FRACTION; json "abc" is E-INVALID-VALUE).

    R-DEC-18 (ORCHESTRATOR-RULING-NEEDED): a JSON number is a binary64 that reads back as
    written (Q33a), so its decimal value has two readings, the number as written (its
    shortest rendering) and its exact binary expansion, and the contract names neither. The
    oracle answers when both readings give the same answer and refuses (X-NOT-MODELED) when
    they differ (json 0.1 at scale 1: 0.1 as written, E-DECIMAL-FRACTION as binary). A JSON
    string holding decimal text ("1.50") is refused the same way: the contract does not say
    whether the conversion reads text inside a JSON string. A rounding argument is refused:
    DR-JSON-CONVERT names none."""
    if rounding is not None:
        raise TypedError("X-NOT-MODELED", "toDecimal(json, p, s, rounding)",
                         ruling="R-DEC-18: DR-JSON-CONVERT names no rounding (ORCHESTRATOR-RULING-NEEDED)")
    if precision is None or scale is None:
        raise V.OracleInputError("DR-JSON-CONVERT: toDecimal of a json value needs a declared precision and scale")
    p, s = _param_int(precision, "toDecimal precision", 1), _param_int(scale, "toDecimal scale")
    node = a.extra.node
    if isinstance(node, str):
        if V._DECIMAL_TEXT.match(node):
            raise TypedError("X-NOT-MODELED", "toDecimal of a json string holding decimal text",
                             ruling="R-DEC-18: whether DR-JSON-CONVERT reads decimal text inside a JSON string is "
                             "not ruled (ORCHESTRATOR-RULING-NEEDED)")
        raise TypedError("E-INVALID-VALUE", "toDecimal of a json string that is not a number", json=a.payload)
    if isinstance(node, bool) or not isinstance(node, float):
        raise TypedError("E-INVALID-VALUE", "toDecimal of a json value that is not a number", json=a.payload)
    as_written = _json_decimal_outcome(Fraction(V.es_number_to_string(node)), p, s)
    as_binary = _json_decimal_outcome(Fraction(node), p, s)
    if as_written != as_binary:
        raise TypedError("X-NOT-MODELED", f"toDecimal(json {a.payload}, {p}, {s}): the number as written and its "
                         "binary64 expansion give different answers", ruling="R-DEC-18: which decimal value a JSON "
                         "number converts from is not ruled (ORCHESTRATOR-RULING-NEEDED)")
    if as_written[0] != "ok":
        raise TypedError(as_written[0], f"toDecimal(json {a.payload}, {p}, {s})")
    return as_written[1]


def _declared(value, p, s):
    try:
        return V.declare_decimal(value, p, s, "toDecimal")
    except (V.DecimalOverflow, V.DecimalFraction) as error:
        raise TypedError(error.error_id, str(error))


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


# name: (function, allowed operand counts)
OPS = {"add": (add, (2,)), "sub": (sub, (2,)), "mul": (mul, (2,)), "div": (div, (2,)), "rem": (rem, (2,)),
       "neg": (neg, (1,)), "abs": (abs_, (1,)),
       "divide": (divide, (4,)), "round": (round_, (3,)),
       "cast-int64": (cast_integer, (1,)), "cast-integer": (cast_integer, (1,)),
       "to-number": (to_number, (1,)), "toNumber": (to_number, (1,)),
       "to-int64": (to_integer, (1,)), "toInt64": (to_integer, (1,)), "to-integer": (to_integer, (1,)),
       "toInteger": (to_integer, (1,)),
       "to-decimal": (to_decimal, (1, 3, 4)), "toDecimal": (to_decimal, (1, 3, 4))}
# operand positions that are parameters (bare JSON integers / strings), not values
PARAMS = {"divide": (2, 3), "round": (1, 2), "to-decimal": (1, 2, 3), "toDecimal": (1, 2, 3)}


def evaluate(expr):
    """Evaluate ["op", arg, ...] where args are Values, nested lists, or (in parameter
    positions) bare JSON integers and strings."""
    if isinstance(expr, V.Value):
        return expr
    if not isinstance(expr, list) or not expr or expr[0] not in OPS:
        raise V.OracleInputError(f"bad expression {expr!r}")
    fn, arities = OPS[expr[0]]
    if len(expr) - 1 not in arities:
        raise V.OracleInputError(f"{expr[0]} takes {' or '.join(map(str, arities))} operands")
    params = PARAMS.get(expr[0], ())
    args = [arg if i in params else evaluate(arg) for i, arg in enumerate(expr[1:])]
    return fn(*args)

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
    zero sum of negative zeros, N-F-NEGZERO). DO-SUM (Q22): a decimal sum is exact, scale =
    the inputs' maximum scale, precision 38; E-DECIMAL-OVERFLOW when the exact total exceeds
    38 digits."""
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
        return decimal_checked(sum((item.payload for item in items), Fraction(0)),
                               max(item.extra[0] for item in items), V.KERNEL_MAX_DIGITS, "sum")
    raise TypedError("E-MIXED-FAMILY", f"sum over the non-numeric family {family}", family=family)


def agg_avg(items, *, convert=None):
    """AG-AVG-I (Q8b): AVG over integers without explicit conversion is the preflight
    E-INTEGER-AVG (raised even for empty input). AG-AVG-CONV (AMB-11: the conversion is
    toNumber(?v)): binary64 of the exact sum divided by the count, rounded once. AVG over
    number: the exact mean rounded once. R-DEC-7 (ruled by Q33b): AVG over decimals is a
    preflight error unless written divide(SUM, COUNT, scale, rounding); the error is
    E-DECIMAL-AVG (R-DEC-14, RULINGS Q43b; the id contract 0.3.4 created).
    AVG(toNumber(?v)) over decimals is AVG over numbers (DC-D2N)."""
    families = _families(items)
    if convert is None and "integer" in families:
        raise TypedError("E-INTEGER-AVG", "AVG over integers requires an explicit conversion (toNumber)")
    if convert is None and "decimal" in families:
        raise TypedError("E-DECIMAL-AVG", "AVG over decimals; write divide(SUM, COUNT, scale, rounding)")
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

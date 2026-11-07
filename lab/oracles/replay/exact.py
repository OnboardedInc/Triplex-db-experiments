"""Exact int64 / binary64 arithmetic and aggregates (RULES.md R-NUM-*, R-AGG-*).

int64 arithmetic uses unbounded Python ints with an explicit range check on each
scalar result. binary64 arithmetic uses CPython float operations, which are IEEE
754 binary64 round-to-nearest-even; results are checked for finiteness. Exact
sums use Python ints / Fractions and round once (int / int true division and
Fraction.__float__ are correctly rounded in CPython).
"""

from __future__ import annotations

import math
from fractions import Fraction

from . import values as V


class TypedError(Exception):
    """An expected typed failure (aggregate / expression / query semantics)."""

    def __init__(self, code, message="", **detail):
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message
        self.detail = detail

    def to_output(self):
        out = [("error", self.code)]
        if self.message:
            out.append(("message", self.message))
        for key, value in self.detail.items():
            out.append((key, value))
        return V.OrderedOut(out)


def check_int64(value: int) -> int:
    if not V.INT64_MIN <= value <= V.INT64_MAX:
        raise TypedError("integer-overflow", "result outside int64", result=str(value))
    return value


def check_f64(value: float) -> float:
    if not math.isfinite(value):
        raise TypedError("number-overflow", "binary64 result is not finite")
    return value


# --------------------------------------------------------------------------- scalar ops


def _same_family(op, a: V.Value, b: V.Value):
    if a.family != b.family or a.family not in ("integer", "number"):
        raise TypedError("type-mismatch", f"{op} needs two integer or two number operands",
                         left=a.family, right=b.family)
    return a.family


def add(a, b):
    if _same_family("add", a, b) == "integer":
        return V.integer(check_int64(a.payload + b.payload))
    return V.number(check_f64(a.as_float() + b.as_float()))


def sub(a, b):
    if _same_family("sub", a, b) == "integer":
        return V.integer(check_int64(a.payload - b.payload))
    return V.number(check_f64(a.as_float() - b.as_float()))


def mul(a, b):
    if _same_family("mul", a, b) == "integer":
        return V.integer(check_int64(a.payload * b.payload))
    return V.number(check_f64(a.as_float() * b.as_float()))


def div(a, b):
    """R-NUM-4: int64 division truncates toward zero (ORCHESTRATOR-RULING-NEEDED)."""
    family = _same_family("div", a, b)
    if family == "integer":
        if b.payload == 0:
            raise TypedError("division-by-zero")
        q = abs(a.payload) // abs(b.payload)
        if (a.payload < 0) != (b.payload < 0):
            q = -q
        return V.integer(check_int64(q))
    if b.as_float() == 0.0:
        raise TypedError("division-by-zero")
    return V.number(check_f64(a.as_float() / b.as_float()))


def neg(a):
    if a.family == "integer":
        return V.integer(check_int64(-a.payload))
    if a.family == "number":
        return V.number(-a.as_float())
    raise TypedError("type-mismatch", "neg needs a number", operand=a.family)


def abs_(a):
    if a.family == "integer":
        return V.integer(check_int64(abs(a.payload)))
    if a.family == "number":
        return V.number(abs(a.as_float()))
    raise TypedError("type-mismatch", "abs needs a number", operand=a.family)


def cast_int64(a):
    """R-NUM-5: CAST text -> int64 accepts optional sign and decimal digits."""
    if a.family == "integer":
        return a
    if a.family != "string":
        raise TypedError("type-mismatch", "cast-int64 needs text", operand=a.family)
    text = a.payload
    if not text or not all(c in "0123456789" for c in text.lstrip("+-")) or text.count("-") + text.count("+") > 1 \
            or (text[0] not in "+-0123456789") or text in ("+", "-"):
        raise TypedError("invalid-cast", "not decimal integer text", text=text)
    return V.integer(check_int64(int(text)))


OPS = {"add": (add, 2), "sub": (sub, 2), "mul": (mul, 2), "div": (div, 2),
       "neg": (neg, 1), "abs": (abs_, 1), "cast-int64": (cast_int64, 1)}


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


# --------------------------------------------------------------------------- aggregates


def _families(items):
    return {item.family for item in items}


def agg_count(items):
    """R-AGG-1: count counts distinct source values (by identity)."""
    return V.integer(len(set(items)))


def agg_sum(items):
    """R-AGG-2 (Q8a): exact total; integer-overflow only on the final result.

    binary64 sums are the exact rational sum rounded once (R-AGG-3,
    ORCHESTRATOR-RULING-NEEDED); an all-negative-zero input sums to -0.0.
    """
    if not items:
        return None
    families = _families(items)
    if len(families) != 1:
        raise TypedError("mixed-families", "sum over several value families", families=sorted(families))
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
            raise TypedError("number-overflow", "binary64 sum is not finite")
    raise TypedError("non-numeric-aggregate", f"sum over {family}")


def agg_avg(items, *, integer_avg="preflight-error"):
    """R-AGG-4 (Q8b): AVG over int64 is a typed preflight error, as core's Datalog
    compiler rejects it ("Exact integer AVG requires an explicit conversion to
    number", packages/core/src/datalog/compiler.ts:1397). With an explicit
    conversion (integer_avg="convert") the answer is binary64 of the exact
    sum / count rounded once. binary64 AVG is the exact mean rounded once.
    """
    families = _families(items)
    if "integer" in families and integer_avg == "preflight-error":
        raise TypedError("DatalogValidationError", "Exact integer AVG requires an explicit conversion to number")
    if not items:
        return None
    if len(families) != 1:
        raise TypedError("mixed-families", "avg over several value families", families=sorted(families))
    family = families.pop()
    if family not in ("integer", "number"):
        raise TypedError("non-numeric-aggregate", f"avg over {family}")
    total = sum((item.exact() for item in items), Fraction(0))
    mean = total / len(items)
    try:
        return V.number(check_f64(float(mean)))
    except OverflowError:
        raise TypedError("number-overflow", "binary64 mean is not finite")


def agg_minmax(items, which):
    """R-AGG-5: min/max inside one family by canonical value order."""
    if not items:
        return None
    families = _families(items)
    if len(families) != 1:
        raise TypedError("mixed-families", f"{which} over several value families", families=sorted(families))
    ordered = sorted(items, key=lambda item: item.order_key())
    return ordered[0] if which == "min" else ordered[-1]


def aggregate(op, items, **options):
    if op == "count":
        return agg_count(items)
    if op == "sum":
        return agg_sum(items)
    if op == "avg":
        return agg_avg(items, integer_avg=options.get("integerAvg", "preflight-error"))
    if op in ("min", "max"):
        return agg_minmax(items, op)
    raise V.OracleInputError(f"unknown aggregate {op}")

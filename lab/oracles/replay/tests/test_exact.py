"""R-NUM-*, R-AGG-*: CS-NUMERIC int64 scalar and aggregate rows, binary64 facts."""

import unittest

from lab.oracles.replay import exact as X
from lab.oracles.replay import values as V

I = V.integer
N = V.number


class Int64Scalar(unittest.TestCase):
    def overflow(self, fn, *args):
        with self.assertRaises(X.TypedError) as ctx:
            fn(*args)
        self.assertEqual(ctx.exception.code, "E-INTEGER-OVERFLOW")

    def test_cs_numeric_scalar_rows(self):
        self.overflow(X.add, I(2 ** 62), I(2 ** 62))
        self.overflow(X.add, I(2 ** 63 - 1), I(1))
        self.overflow(X.sub, I(-2 ** 63), I(1))
        self.overflow(X.abs_, I(-2 ** 63))
        self.overflow(X.neg, I(-2 ** 63))
        self.overflow(X.mul, I(2 ** 32), I(2 ** 31))
        self.assertEqual(X.mul(I(3037000499), I(3037000499)).payload, 3037000499 ** 2)
        self.overflow(X.mul, I(3037000500), I(3037000500))
        self.overflow(X.cast_integer, V.string("9223372036854775808"))
        self.assertEqual(X.cast_integer(V.string("-9223372036854775808")).payload, -2 ** 63)
        self.assertEqual(X.add(I(2 ** 59 - 1), I(1)).payload, 2 ** 59)

    def test_division(self):
        with self.assertRaises(X.TypedError) as ctx:
            X.div(I(1), I(0))
        self.assertEqual(ctx.exception.code, "E-DIVISION-BY-ZERO")
        with self.assertRaises(X.TypedError):
            X.div(N(1.0), N(0.0))
        self.assertEqual(X.div(I(-7), I(2)).payload, -3)
        self.overflow(X.div, I(-2 ** 63), I(-1))

    def test_mixed_family_arithmetic_is_typed_error(self):
        with self.assertRaises(X.TypedError) as ctx:
            X.add(I(1), N(1.0))
        self.assertEqual(ctx.exception.code, "E-MIXED-FAMILY")

    def test_expression_tree(self):
        expr = ["add", ["mul", I(2 ** 31), I(2)], I(-1)]
        self.assertEqual(X.evaluate(expr).payload, 2 ** 32 - 1)


class Binary64Facts(unittest.TestCase):
    def test_signed_zero_ieee(self):
        self.assertEqual(X.add(N(-0.0), N(0.0)).payload, V.f64_bits(0.0))       # -0 + 0 = +0
        self.assertEqual(X.mul(N(-0.0), N(-1.0)).payload, V.f64_bits(0.0))      # -0 * -1 = +0
        self.assertEqual(X.mul(N(0.0), N(-1.0)).payload, V.f64_bits(-0.0))      # +0 * -1 = -0
        self.assertEqual(X.add(N(-0.0), N(-0.0)).payload, V.f64_bits(-0.0))
        self.assertEqual(X.neg(N(0.0)).payload, V.f64_bits(-0.0))

    def test_ieee_rounding_not_reduced_precision(self):
        self.assertEqual(X.add(N(0.1), N(0.2)).as_float(), 0.30000000000000004)
        self.assertEqual(X.add(N(1.0), N(2.0 ** -52)).as_float(), 1.0000000000000002)

    def test_overflow_to_infinity_is_typed(self):
        with self.assertRaises(X.TypedError) as ctx:
            X.mul(N(1.7976931348623157e308), N(2.0))
        self.assertEqual(ctx.exception.code, "E-NUMBER-OVERFLOW")


class Aggregates(unittest.TestCase):
    def test_sum_exact_total_overflow_only_on_final_result(self):
        with self.assertRaises(X.TypedError):
            X.agg_sum([I(2 ** 62), I(2 ** 62)])
        self.assertEqual(X.agg_sum([I(2 ** 62), I(2 ** 62), I(-2 ** 62)]).payload, 2 ** 62)
        self.assertEqual(X.agg_sum([I(2 ** 58)] * 3).payload, 3 * 2 ** 58)

    def test_count_distinct_and_empty(self):
        self.assertEqual(X.agg_count([]).payload, 0)
        self.assertEqual(X.agg_count([I(1), I(1), N(1.0)]).payload, 2)
        self.assertIsNone(X.agg_sum([]))
        self.assertIsNone(X.agg_minmax([], "min"))

    def test_integer_avg_is_preflight_error_unless_converted(self):
        with self.assertRaises(X.TypedError) as ctx:
            X.agg_avg([I(1), I(2)])
        self.assertEqual(ctx.exception.code, "E-INTEGER-AVG")
        self.assertEqual(X.agg_avg([I(1), I(2)], convert="toNumber").as_float(), 1.5)
        big = [I(2 ** 63 - 1), I(2 ** 63 - 1), I(2 ** 63 - 2)]
        self.assertEqual(X.agg_avg(big, convert="toNumber").as_float(), float(2 ** 63))

    def test_binary64_sum_rounded_once(self):
        items = [N(1e16), N(1.0), N(1.0)]
        self.assertEqual(X.agg_sum(items).as_float(), 1.0000000000000002e16)   # sequential would give 1e16
        self.assertEqual(X.agg_sum([N(-0.0), N(-0.0)]).payload, V.f64_bits(-0.0))
        self.assertEqual(X.agg_sum([N(-0.0), N(0.0)]).payload, V.f64_bits(0.0))

    def test_mixed_families_do_not_aggregate(self):
        with self.assertRaises(X.TypedError) as ctx:
            X.agg_sum([I(1), N(1.0)])
        self.assertEqual(ctx.exception.code, "E-MIXED-FAMILY")

    def test_min_max_int64_exact(self):
        items = [I(2 ** 63 - 1), I(2 ** 63 - 2), I(-2 ** 63)]
        self.assertEqual(X.agg_minmax(items, "max").payload, 2 ** 63 - 1)
        self.assertEqual(X.agg_minmax(items, "min").payload, -2 ** 63)


if __name__ == "__main__":
    unittest.main()

"""R-VAL-*, R-ORD-*, R-CMP-*: exact value domain, order and comparison."""

import unittest

from lab.oracles.replay import values as V
from lab.oracles.replay.tests.helpers import val


class Int64(unittest.TestCase):
    def test_exact_edges_survive(self):
        for text in ["0", "1", "-1", "9007199254740991", "9007199254740993", "576460752303423487",
                     "576460752303423488", "-576460752303423488", "-576460752303423489",
                     "9223372036854775807", "-9223372036854775808"]:
            v = val('{"type":"integer","value":"%s"}' % text)
            self.assertEqual(v.payload, int(text))
            self.assertEqual(v.to_output().get("value"), text)

    def test_non_canonical_and_out_of_range_rejected(self):
        for text in ["01", "+1", "1.0", "-0", "", " 1", "9223372036854775808", "-9223372036854775809"]:
            with self.assertRaises(V.InvalidValue, msg=text):
                val('{"type":"integer","value":"%s"}' % text)

    def test_int64_is_not_a_json_number(self):
        with self.assertRaises(V.InvalidValue):
            val('{"type":"integer","value":1}')

    def test_no_rounding_through_binary64(self):
        a = val('{"type":"integer","value":"9007199254740993"}')
        b = val('{"type":"integer","value":"9007199254740992"}')
        self.assertNotEqual(a, b)


class Binary64(unittest.TestCase):
    def test_negative_zero_bits_survive(self):
        v = val('{"type":"number","value":-0.0}')
        self.assertEqual(v.payload, 0x8000000000000000)
        self.assertEqual(v.to_output().get("bits"), "0x8000000000000000")
        self.assertEqual(str(v.to_output().get("value")), "-0")
        self.assertNotEqual(v, val('{"type":"number","value":0.0}'))

    def test_bits_input_and_subnormal(self):
        v = val('{"type":"number","bits":"0x0000000000000001"}')
        self.assertEqual(V.es_number_to_string(v.as_float()), "5e-324")
        self.assertEqual(val('{"type":"number","value":5e-324}'), v)

    def test_non_finite_rejected(self):
        for text in ['1e400', '-1e400']:
            with self.assertRaises(V.InvalidValue):
                val('{"type":"number","value":%s}' % text)
        with self.assertRaises(V.OracleInputError):
            V.loads('{"type":"number","value":NaN}')
        with self.assertRaises(V.InvalidValue):
            val('{"type":"number","bits":"0x7ff8000000000000"}')

    def test_three_stays_number_family(self):
        self.assertEqual(val('{"type":"number","value":3.0}').family, "number")
        self.assertNotEqual(val('{"type":"number","value":1}'), val('{"type":"integer","value":"1"}'))

    def test_es_number_to_string(self):
        cases = {0.1: "0.1", 0.30000000000000004: "0.30000000000000004", 1e21: "1e+21", 1e20: "100000000000000000000",
                 1.7976931348623157e308: "1.7976931348623157e+308", 2.2250738585072014e-308: "2.2250738585072014e-308",
                 1e-7: "1e-7", 1.5e-6: "0.0000015", 123456789012345680000.0: "123456789012345680000",
                 -1.5: "-1.5", 1700000000000.0: "1700000000000", 1000.25: "1000.25", 2.0 ** 53: "9007199254740992"}
        for x, text in cases.items():
            self.assertEqual(V.es_number_to_string(x), text)


class Text(unittest.TestCase):
    def test_lone_surrogate_rejected(self):
        with self.assertRaises(V.InvalidValue):
            val('{"type":"string","value":"\\ud800"}')

    def test_nfc_nfd_distinct_and_no_casefold(self):
        self.assertNotEqual(val('{"type":"string","value":"\\u00e9"}'), val('{"type":"string","value":"e\\u0301"}'))
        self.assertNotEqual(val('{"type":"string","value":"A"}'), val('{"type":"string","value":"a"}'))

    def test_codepoint_order_not_utf16_or_locale(self):
        texts = ["z", "c", "E", "A", "", "\U00010000", "\U0001F600", ""]
        ordered = sorted((V.string(t) for t in texts), key=lambda v: v.order_key())
        self.assertEqual([v.payload for v in ordered], ["", "A", "E", "c", "z", "", "\U00010000", "\U0001F600"])

    def test_surrogate_pair_escape_is_one_codepoint(self):
        self.assertEqual(val('{"type":"string","value":"\\ud83d\\ude00"}').payload, "\U0001F600")


class JsonAndBlob(unittest.TestCase):
    def test_original_key_order_and_canonical(self):
        v = val('{"type":"json","value":{"b":1,"a":[2,{"d":null,"c":true}],"\\u00e9":"x"}}')
        self.assertEqual(v.payload, '{"a":[2,{"c":true,"d":null}],"b":1,"é":"x"}')
        out = v.to_output().get("value")
        self.assertEqual([k for k, _ in out], ["b", "a", "é"])

    def test_js_duplicate_keys_first_position_last_value(self):
        v = val('{"type":"json","value":{"a":1,"b":2,"a":3}}')
        self.assertEqual(v.payload, '{"a":3,"b":2}')
        self.assertEqual([k for k, _ in v.to_output().get("value")], ["a", "b"])

    def test_json_numbers_are_binary64(self):
        self.assertEqual(val('{"type":"json","value":1e300}').payload, "1e+300")
        self.assertEqual(val('{"type":"json","value":-0}').payload, "0")
        self.assertEqual(val('{"type":"json","value":9007199254740993}').payload, "9007199254740992")
        with self.assertRaises(V.InvalidValue):
            val('{"type":"json","value":1e400}')

    def test_canonical_keys_sort_by_utf16_code_units(self):
        v = val('{"type":"json","value":{"\\ud83d\\ude00":1,"\\uffff":2}}')
        self.assertTrue(v.payload.startswith('{"\U0001F600"'))

    def test_blob(self):
        v = val('{"type":"blob","value":"sha256:x","mimeType":"a/b","size":4294967297}')
        self.assertEqual(str(v.to_output().get("size")), "4294967297")
        self.assertIsNone(v.to_output().get("filename"))
        self.assertEqual(val('{"type":"blob","value":"h","mimeType":"m","size":0,"filename":"f"}').to_output().get("filename"), "f")
        with self.assertRaises(V.InvalidValue):
            val('{"type":"blob","value":"h","mimeType":"m","size":-1}')


class DatetimeAndOrder(unittest.TestCase):
    def test_fractional_and_negative_datetime_exact(self):
        a = val('{"type":"datetime","value":1000.25}')
        b = val('{"type":"datetime","value":-86400000}')
        self.assertLess(b.order_key(), a.order_key())
        self.assertEqual(str(a.to_output().get("value")), "1000.25")

    def test_family_rank_and_card_many_canonical_order(self):
        vals = [val(t) for t in ['{"type":"string","value":"b"}', '{"type":"integer","value":"2"}',
                                 '{"type":"number","value":-1.5}', '{"type":"boolean","value":true}',
                                 '{"type":"integer","value":"-3"}', '{"type":"string","value":"a"}']]
        ordered = sorted(vals, key=lambda v: v.order_key())
        self.assertEqual([v.family for v in ordered], ["integer", "integer", "number", "boolean", "string", "string"])

    def test_negative_zero_orders_before_positive_zero(self):
        z, nz = val('{"type":"number","value":0}'), val('{"type":"number","value":-0.0}')
        self.assertLess(nz.order_key(), z.order_key())


class Comparison(unittest.TestCase):
    def test_cross_family_never_equal(self):
        pairs = [('{"type":"integer","value":"9007199254740993"}', '{"type":"number","value":9007199254740992}'),
                 ('{"type":"integer","value":"1"}', '{"type":"number","value":1.0}'),
                 ('{"type":"boolean","value":true}', '{"type":"integer","value":"1"}'),
                 ('{"type":"string","value":"1"}', '{"type":"integer","value":"1"}')]
        for left, right in pairs:
            a, b = val(left), val(right)
            self.assertFalse(V.predicate("eq", a, b))
            self.assertTrue(V.predicate("ne", a, b))
            self.assertFalse(V.predicate("lt", a, b))
            self.assertFalse(V.predicate("gt", a, b))

    def test_numeric_predicate_equality_of_signed_zero(self):
        self.assertTrue(V.predicate("eq", val('{"type":"number","value":-0.0}'), val('{"type":"number","value":0}')))

    def test_datalog_mode_merges_number_and_datetime_only(self):
        n, d = val('{"type":"number","value":5}'), val('{"type":"datetime","value":5}')
        self.assertFalse(V.predicate("eq", n, d))
        self.assertTrue(V.predicate("eq", n, d, "datalog"))
        self.assertFalse(V.predicate("eq", val('{"type":"integer","value":"5"}'), n, "datalog"))


if __name__ == "__main__":
    unittest.main()

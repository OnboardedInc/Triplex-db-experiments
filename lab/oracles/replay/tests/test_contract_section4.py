"""ACCEPTANCE 0.3.1 section 4 (frozen semantic tables), one test per table row.

Each test is named after its contract row id (test_N_I_ADD for N-I-ADD). The coverage
tests read lab/acceptance/obligations.json (the contract's only machine authority) and
fail when a section 4 row has no test or when a contract example is not evaluated, so
the oracle cannot drift from a later contract version silently. Examples are evaluated
exactly as the contract writes them (left column) and compared with the contract's
answer (right column).
"""

import json
import unittest
from pathlib import Path

from lab.oracles.replay import errors as ERR
from lab.oracles.replay import exact as X
from lab.oracles.replay import values as V
from lab.oracles.replay.tests.helpers import assert_op, case, evaluate, i64, outcome, result, s

ROOT = Path(__file__).resolve().parents[4]
CONTRACT = json.loads((ROOT / "lab/acceptance/obligations.json").read_text())

I, N = V.integer, V.number
NZ = -0.0


def dec(text, precision=None, scale=None):
    return V.decimal(text, precision, scale)


def num(x):
    return {"type": "number", "value": x}


def nbits(b):
    return {"type": "number", "bits": b}


def decimal_value(text):
    return {"type": "decimal", "value": text}


# Every example of sections 4.1, 4.2 and 4.4, keyed by the contract's own example text.
EXAMPLES = {
    "N-I-ADD": {
        "2^62 + 2^62": lambda: X.add(I(2 ** 62), I(2 ** 62)),
        "(2^63-1) + 1": lambda: X.add(I(2 ** 63 - 1), I(1)),
        "-2^63 - 1": lambda: X.sub(I(-2 ** 63), I(1)),
        "2^32 * 2^31": lambda: X.mul(I(2 ** 32), I(2 ** 31)),
        "3037000499 * 3037000499": lambda: X.mul(I(3037000499), I(3037000499)),
        "3037000500 * 3037000500": lambda: X.mul(I(3037000500), I(3037000500)),
        "(2^59-1) + 1": lambda: X.add(I(2 ** 59 - 1), I(1)),
    },
    "N-I-DIV": {
        "7 / 2": lambda: X.div(I(7), I(2)),
        "-7 / 2": lambda: X.div(I(-7), I(2)),
        "7 / 0": lambda: X.div(I(7), I(0)),
        "-2^63 / -1": lambda: X.div(I(-2 ** 63), I(-1)),
    },
    "N-I-REM": {
        "7 % 3": lambda: X.rem(I(7), I(3)),
        "-7 % 3": lambda: X.rem(I(-7), I(3)),
        "7 % -3": lambda: X.rem(I(7), I(-3)),
        "1 % 0": lambda: X.rem(I(1), I(0)),
    },
    "N-I-NEG": {
        "-(-2^63)": lambda: X.neg(I(-2 ** 63)),
        "ABS(-2^63)": lambda: X.abs_(I(-2 ** 63)),
        "ABS(-5)": lambda: X.abs_(I(-5)),
    },
    "N-MIXED": {
        "integer 1 + number 1.5": lambda: X.add(I(1), N(1.5)),
        "toNumber(integer 1) + number 1.5": lambda: X.add(X.to_number(I(1)), N(1.5)),
    },
    "N-F-ARITH": {
        "0.1 + 0.2": lambda: X.add(N(0.1), N(0.2)),
        "1.7976931348623157e308 * 2": lambda: X.mul(N(1.7976931348623157e308), N(2.0)),
        "1.0 / 0.0": lambda: X.div(N(1.0), N(0.0)),
        "1.0 / -0.0": lambda: X.div(N(1.0), N(NZ)),
    },
    "N-F-NEGZERO": {
        "-0.0 + 0.0": lambda: X.add(N(NZ), N(0.0)),
        "-0.0 + -0.0": lambda: X.add(N(NZ), N(NZ)),
        "0.0 - 0.0": lambda: X.sub(N(0.0), N(0.0)),
        "-0.0 - 0.0": lambda: X.sub(N(NZ), N(0.0)),
        "-0.0 * -1.0": lambda: X.mul(N(NZ), N(-1.0)),
        "-0.0 * 1.0": lambda: X.mul(N(NZ), N(1.0)),
        "0.0 * -1.0": lambda: X.mul(N(0.0), N(-1.0)),
        "-(0.0)": lambda: X.neg(N(0.0)),
        "-(-0.0)": lambda: X.neg(N(NZ)),
        "stored -0.0 read back": lambda: _stored_negative_zero(),
    },
    "CV-I2F": {
        "toNumber(2^53+1)": lambda: X.to_number(I(2 ** 53 + 1)),
        "toNumber(2^63-1)": lambda: X.to_number(I(2 ** 63 - 1)),
    },
    "CV-F2I": {
        "toInteger(3.0)": lambda: X.to_integer(N(3.0)),
        "toInteger(3.5)": lambda: X.to_integer(N(3.5)),
        "toInteger(9223372036854775808.0)": lambda: X.to_integer(N(9223372036854775808.0)),
    },
    "CV-T2I": {
        "'9223372036854775808'": lambda: X.cast_integer(V.string("9223372036854775808")),
        "'-9223372036854775808'": lambda: X.cast_integer(V.string("-9223372036854775808")),
        "'01'": lambda: X.cast_integer(V.string("01")),
        "'+1'": lambda: X.cast_integer(V.string("+1")),
    },
    "AG-SUM-I": {
        "[2^62, 2^62]": lambda: X.agg_sum([I(2 ** 62), I(2 ** 62)]),
        "[2^62, 2^62, -2^62]": lambda: X.agg_sum([I(2 ** 62), I(2 ** 62), I(-2 ** 62)]),
        "[2^58, 2^58, 2^58]": lambda: X.agg_sum([I(2 ** 58)] * 3),
    },
    "AG-SUM-F": {
        "[1e16, 1.0, -1e16]": lambda: X.agg_sum([N(1e16), N(1.0), N(-1e16)]),
    },
    "AG-SUM-ONE-ENTITY": {
        "SUM(:conf/amount) with 10 asserted twice on entity agg:c": lambda: _one_entity(["agg:c", "agg:c"], "sum"),
        "COUNT with the same fixture": lambda: _one_entity(["agg:c", "agg:c"], "count"),
        "SUM with 10 on agg:a and 10 on agg:b": lambda: _one_entity(["agg:a", "agg:b"], "sum"),
    },
}


def _one_entity(entities, op):
    """AG-SUM-ONE-ENTITY fixture (Q21 AMB-09): integer 10 on :conf/amount per listed entity."""
    ops = [assert_op(f"m{i}", e, ":conf/amount", i64(10)) for i, e in enumerate(entities)]
    rep = evaluate(case([{"clock": 1, "operations": ops}],
                        [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1},
                          "match": {"attributes": {"amount": ":conf/amount"}},
                          "aggregates": [{"op": op, "var": "amount", "as": "x"}]}]))
    return V.integer(int(result(rep, "q")["rows"][0]["x"]["value"]))


def _stored_negative_zero():
    rep = evaluate(case([{"clock": 1, "operations": [assert_op("z", "e", ":x/n", nbits("0x8000000000000000"))]}],
                        [{"id": "m", "kind": "match", "cut": {"validAt": 1}}]))
    out = result(rep, "m")["raw"][0]["value"]
    return V.Value("number", int(out["bits"], 16))


def run_example(thunk):
    """('ok', Value) or ('error', error id)."""
    try:
        return "ok", thunk()
    except X.TypedError as error:
        return "error", error.code


def matches_contract(kind, got, expected_text):
    """Compare an oracle answer with the contract's answer text."""
    if expected_text.startswith("E-"):
        return kind == "error" and got == expected_text
    if kind != "ok":
        return False
    text = expected_text.split(" (")[0]
    if got.family == "integer":
        return str(got.payload) == text
    if got.family == "number":
        # "+0.0" / "-0.0" name the sign; other answers are binary64 lexemes, compared by bits
        if text in ("+0.0", "-0.0"):
            return got.payload == (V.NEG_ZERO_BITS if text == "-0.0" else 0)
        return got.payload == V.f64_bits(float(text))
    raise AssertionError(got.family)


def contract_row(table, row_id):
    return next(r for r in CONTRACT[table] if r["id"] == row_id)


class ExampleMixin:
    def check_examples(self, table, row_id):
        row = contract_row(table, row_id)
        for text, answer in row.get("examples") or []:
            kind, got = run_example(EXAMPLES[row_id][text])
            self.assertTrue(matches_contract(kind, got, answer), f"{row_id} {text}: expected {answer}, got {kind} "
                            f"{got if kind == 'error' else got.to_output()}")


def err_fields(node):
    """(_tag, reason) of a query error or a rejected command outcome."""
    return node.get("_tag", node.get("errorTag")), node.get("reason")


# --------------------------------------------------------------------------- coverage


class Coverage(unittest.TestCase):
    TABLES = {"numericOps": "NumericOps", "conversionRules": "Conversions", "comparisonRules": "Comparisons",
              "aggregateRules": "Aggregates", "constraintRules": "Constraints", "errorTable": "Errors"}

    def test_every_section4_row_has_a_named_test(self):
        classes = {cls.__name__: cls for cls in (NumericOps, Conversions, Comparisons, Aggregates, Constraints, Errors)}
        for table, cls in self.TABLES.items():
            for row in CONTRACT[table]:
                name = "test_" + row["id"].replace("-", "_")
                self.assertTrue(hasattr(classes[cls], name), f"{table} {row['id']} has no {cls}.{name}")
        for row in CONTRACT["valueKinds"]:
            self.assertTrue(hasattr(ValueKinds, "test_kind_" + row["kind"]), row["kind"])
        for engine in CONTRACT["laneIntegerRange"]:
            self.assertTrue(hasattr(LaneRanges, "test_lane_" + engine), engine)
        for key in ("declaration", "storage", "reject", "family", "comparison", "arithmetic"):
            self.assertTrue(hasattr(DecimalRules, "test_decimal_" + key), key)
        self.assertTrue(hasattr(CardManyOrder, "test_card_many_order"))

    def test_every_contract_example_is_evaluated(self):
        for table in ("numericOps", "conversionRules", "aggregateRules"):
            for row in CONTRACT[table]:
                texts = {t for t, _ in row.get("examples") or []}
                self.assertEqual(texts, set(EXAMPLES.get(row["id"], {})), row["id"])


# --------------------------------------------------------------------------- 4.1


class NumericOps(ExampleMixin, unittest.TestCase):
    def test_N_I_ADD(self):
        self.check_examples("numericOps", "N-I-ADD")
        # "a result the target lane cannot store fails at write with E-VALUE-OUT-OF-RANGE"
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x/v", i64(2 ** 59))]}], lane="qlever"))
        self.assertEqual(outcome(rep, 0)["error"], "E-VALUE-OUT-OF-RANGE")

    def test_N_I_DIV(self):
        self.check_examples("numericOps", "N-I-DIV")

    def test_N_I_REM(self):
        self.check_examples("numericOps", "N-I-REM")
        self.assertEqual(X.rem(I(-2 ** 63), I(-1)).payload, 0)

    def test_N_I_NEG(self):
        self.check_examples("numericOps", "N-I-NEG")

    def test_N_MIXED(self):
        self.check_examples("numericOps", "N-MIXED")
        with self.assertRaises(X.TypedError) as ctx:
            X.add(N(1.5), I(1))
        out = ctx.exception.to_output()
        self.assertEqual((out.get("_tag"), out.get("reason"), out.get("phase")),
                         ("DatalogValidationError", "mixed-family", "preflight"))

    def test_N_F_ARITH(self):
        self.check_examples("numericOps", "N-F-ARITH")
        self.assertEqual(X.add(N(0.1), N(0.2)).to_output().get("bits"), "0x3fd3333333333334")

    def test_N_F_NEGZERO(self):
        self.check_examples("numericOps", "N-F-NEGZERO")


# --------------------------------------------------------------------------- 4.2


class Conversions(ExampleMixin, unittest.TestCase):
    def test_CV_I2F(self):
        self.check_examples("conversionRules", "CV-I2F")
        # ties to even: 2^53 + 3 is halfway between 2^53+2 and 2^53+4 and rounds to ...+4
        self.assertEqual(X.to_number(I(2 ** 53 + 3)).as_float(), float(2 ** 53 + 4))

    def test_CV_F2I(self):
        self.check_examples("conversionRules", "CV-F2I")
        self.assertEqual(X.to_integer(N(NZ)).to_output().get("value"), "0")      # -0.0 converts to 0
        self.assertEqual(X.to_integer(N(-9223372036854775808.0)).payload, -2 ** 63)

    def test_CV_T2I(self):
        self.check_examples("conversionRules", "CV-T2I")
        for text in ("-0", "", " 1", "1.0", "abc", "00"):          # "no '-0'", canonical decimal only
            with self.assertRaises(X.TypedError) as ctx:
                X.cast_integer(V.string(text))
            self.assertEqual(ctx.exception.code, "E-INVALID-CONVERSION", text)
        self.assertEqual(X.cast_integer(V.string("0")).payload, 0)

    def test_CV_NONE(self):
        """No implicit conversion between families in filters, group keys or aggregates."""
        cmds = [{"clock": 1, "operations": [assert_op("a", "e1", ":x/v", i64(1)), assert_op("b", "e2", ":x/v", num(1.0)),
                                            assert_op("c", "e3", ":x/v", decimal_value("1.0"))]}]
        q = [{"id": "filter", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":x/v"}},
              "where": [{"var": "v", "op": "eq", "value": i64(1)}], "aggregates": [{"op": "count", "var": "$entity"}]},
             {"id": "groups", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":x/v"}},
              "groupBy": ["v"], "aggregates": [{"op": "count", "var": "$entity", "as": "n"}]},
             {"id": "sum", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":x/v"}},
              "aggregates": [{"op": "sum", "var": "v"}]}]
        rep = evaluate(case(cmds, q, attributeDeclarations={":x/v": {"type": "decimal", "precision": 5, "scale": 1}}))
        self.assertEqual(result(rep, "filter")["error"], "E-MIXED-FAMILY")     # the decimal row cannot be compared
        self.assertEqual([r["v"]["type"] for r in result(rep, "groups")["rows"]], ["integer", "number", "decimal"])
        self.assertEqual(result(rep, "sum")["error"], "E-MIXED-FAMILY")


# --------------------------------------------------------------------------- 4.3


class Comparisons(unittest.TestCase):
    def cmp(self, left, right, mode="typed"):
        rep = evaluate(case([], [{"id": "c", "kind": "compare", "left": left, "right": right, "compare": mode}]))
        return result(rep, "c")

    def test_CMP_SAME(self):
        self.assertTrue(self.cmp(i64(-3), i64(2))["lt"])
        self.assertTrue(self.cmp(nbits("0x8000000000000000"), num(0.0))["eq"])        # IEEE value
        self.assertTrue(self.cmp(s(""), s("\U00010000"))["lt"])                   # codepoints, not UTF-16
        self.assertTrue(self.cmp({"type": "datetime", "value": -5}, {"type": "datetime", "value": 1000.25})["lt"])
        self.assertTrue(self.cmp({"type": "boolean", "value": False}, {"type": "boolean", "value": True})["lt"])
        self.assertTrue(self.cmp({"type": "ref", "value": "a"}, {"type": "ref", "value": "b"})["lt"])
        self.assertTrue(self.cmp(decimal_value("16.50"), decimal_value("16.5"))["eq"])

    def test_CMP_NUMERIC_CONST(self):
        self.assertTrue(self.cmp(num(7), 7)["eq"])
        self.assertTrue(self.cmp({"type": "datetime", "value": 7}, 7)["eq"])
        self.assertFalse(self.cmp(s("7"), 7)["eq"])                          # text '7' is not equal
        self.assertTrue(self.cmp(num(7.5), 7)["gt"])

    def test_CMP_INT_FLOAT(self):
        r = self.cmp(i64(1), num(2.0))
        self.assertFalse(r["eq"])
        self.assertTrue(r["ne"])
        self.assertEqual(err_fields(r["lt"]), ("DatalogValidationError", "mixed-family"))
        self.assertEqual(err_fields(r["gt"]), ("DatalogValidationError", "mixed-family"))
        self.assertFalse(r["sameGroup"])

    def test_CMP_DECIMAL_CROSS(self):
        for other in (i64(16), num(16.5)):
            r = self.cmp(decimal_value("16.50"), other)
            for op in ("eq", "ne", "lt", "gt"):
                self.assertEqual(err_fields(r[op]), ("DatalogValidationError", "mixed-family"), op)
            self.assertFalse(r["sameGroup"])
        # "unless the query converts explicitly"
        self.assertTrue(self.cmp(decimal_value("16.50"), ["to-decimal", i64(16)])["gt"])

    def test_CMP_IDENTITY(self):
        r = self.cmp({"type": "ref", "value": "e:1"}, i64(1))
        self.assertFalse(r["eq"])
        self.assertTrue(r["ne"])
        self.assertFalse(self.cmp({"type": "ref", "value": "true"}, {"type": "boolean", "value": True})["eq"])

    def test_CMP_UNTYPED_STRING(self):
        self.assertTrue(self.cmp({"type": "ref", "value": "x"}, "x")["eq"])          # untyped matches ref
        self.assertTrue(self.cmp(s("x"), "x")["eq"])                                  # and string
        self.assertFalse(self.cmp(s("x"), {"type": "ref", "value": "x"})["eq"])       # typed ref: refs only

    def test_CMP_BOOL_INT(self):
        r = self.cmp({"type": "boolean", "value": True}, i64(1))
        self.assertFalse(r["eq"])
        self.assertFalse(r["sameGroup"])

    def test_CMP_NEGZERO(self):
        r = self.cmp(nbits("0x8000000000000000"), num(0.0))
        self.assertTrue(r["eq"] and r["identical"] and r["sameGroup"])
        schema = [{"version": 1, "entityTypes": {"T": {"attributes": {
            "n": {"attribute": ":t/n", "type": "number"}, "m": {"attribute": ":t/m", "type": "number",
                                                                "cardinality": "many"}}}}}]
        cmds = [{"clock": 1, "operations": [
            assert_op("z1", "t:1", ":t/n", nbits("0x8000000000000000"), entity_type="T"),
            assert_op("z2", "t:1", ":t/n", num(0.0), entity_type="T"),
            assert_op("y1", "t:2", ":t/n", num(0.0), entity_type="T"),
            assert_op("y2", "t:2", ":t/n", nbits("0x8000000000000000"), entity_type="T")]},
            {"clock": 2, "operations": [assert_op("lone", "t:3", ":t/n", nbits("0x8000000000000000"), entity_type="T")]}]
        q = [{"id": f"g{k}", "kind": "get", "entityType": "T", "entityId": f"t:{k}", "cut": {"validAt": 1}}
             for k in (1, 2, 3)]
        q.append({"id": "grp", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"n": ":t/n"}},
                  "groupBy": ["n"], "aggregates": [{"op": "count", "var": "$entity", "as": "c"}]})
        rep = evaluate(case(cmds, q, schemas=schema))
        one = result(rep, "g1")["properties"]["n"]           # one value, not a conflict
        self.assertEqual((one["value"]["bits"], one["supports"]), ("0x8000000000000000", ["z1", "z2"]))
        two = result(rep, "g2")["properties"]["n"]           # representative: lowest (position, op index)
        self.assertEqual((two["value"]["bits"], two["supports"]), ("0x0000000000000000", ["y1", "y2"]))
        self.assertEqual(result(rep, "g3")["properties"]["n"]["value"]["bits"], "0x8000000000000000")
        self.assertEqual([r["c"]["value"] for r in result(rep, "grp")["rows"]], ["3"])   # one group


# --------------------------------------------------------------------------- 4.4


class Aggregates(ExampleMixin, unittest.TestCase):
    CMDS = [{"clock": 1, "operations": [assert_op("a", "e1", ":s/v", i64(10)), assert_op("b", "e2", ":s/v", i64(10)),
                                        assert_op("c", "e3", ":s/v", i64(7))]}]

    def agg(self, aggregates, cmds=None, **kw):
        q = dict({"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":s/v"}},
                  "aggregates": aggregates}, **kw)
        return result(evaluate(case(self.CMDS if cmds is None else cmds, [q])), "q")

    def test_AG_SUM_I(self):
        self.check_examples("aggregateRules", "AG-SUM-I")
        self.assertEqual(X.agg_sum([I(2 ** 63 - 1), I(1), I(-1)]).payload, 2 ** 63 - 1)   # partial sums never wrap

    def test_AG_SUM_ONE_ENTITY(self):
        self.check_examples("aggregateRules", "AG-SUM-ONE-ENTITY")

    def test_AG_INT_RESULT(self):
        """Q21 AMB-10: integer results are IntegerValue canonical decimal text, never a JS number."""
        big = [{"clock": 1, "operations": [assert_op("k", "e", ":s/v", i64(2 ** 62 + 1))]}]
        out = self.agg([{"op": "sum", "var": "v", "as": "s"}], cmds=big)["rows"][0]["s"]
        self.assertEqual((out["type"], out["value"]), ("integer", str(2 ** 62 + 1)))
        self.assertEqual(X.add(I(2 ** 53), I(1)).to_output().get("value"), str(2 ** 53 + 1))

    def test_AG_SUM_F(self):
        self.check_examples("aggregateRules", "AG-SUM-F")
        self.assertEqual(X.agg_sum([N(-1e16), N(1e16), N(1.0)]).as_float(), 1.0)          # order independent

    def test_AG_AVG_I(self):
        self.assertEqual(self.agg([{"op": "avg", "var": "v"}])["error"], "E-INTEGER-AVG")
        empty = self.agg([{"op": "avg", "var": "v"}], cmds=[], varTypes={"v": "integer"})   # preflight: no rows
        self.assertEqual(err_fields(empty), ("DatalogValidationError", "integer-avg-requires-conversion"))

    def test_AG_AVG_CONV(self):
        big = [{"clock": 1, "operations": [assert_op(f"k{i}", f"e{i}", ":s/v", i64(x)) for i, x in
                                           enumerate([9007199254740993, 9007199254740993, 9007199254740994])]}]
        r = self.agg([{"op": "avg", "var": "v", "convert": "toNumber"}], cmds=big)
        self.assertEqual(r["rows"][0]["avg"]["bits"], "0x4340000000000001")    # exact sum / count, rounded once
        self.assertEqual(X.agg_avg([N(1.0), N(2.0)]).as_float(), 1.5)

    def test_AG_COUNT(self):
        r = self.agg([{"op": "count", "var": "v", "as": "c"}, {"op": "sum", "var": "v", "as": "s"}],
                     cmds=[{"clock": 1, "operations": [assert_op("a", "e1", ":s/v", i64(10)),
                                                       assert_op("b", "e2", ":s/v", i64(10))]}])
        self.assertEqual((r["rows"][0]["c"]["value"], r["rows"][0]["s"]["value"]), ("1", "20"))

    def test_AG_EMPTY_UNGROUPED(self):
        r = self.agg([{"op": "count", "var": "v", "as": "c"}, {"op": "sum", "var": "v", "as": "s"},
                      {"op": "min", "var": "v", "as": "lo"}, {"op": "max", "var": "v", "as": "hi"}], cmds=[])
        self.assertEqual(r["rows"], [{"c": {"type": "integer", "value": "0"}, "s": None, "lo": None, "hi": None}])
        self.assertIsNone(X.agg_avg([N(1.0)][:0]))

    def test_AG_EMPTY_GROUPED(self):
        self.assertEqual(self.agg([{"op": "sum", "var": "v"}], cmds=[], groupBy=["v"])["rows"], [])

    def test_AG_MINMAX_TIES(self):
        r = self.agg([{"op": "max", "var": "v", "as": "m"}])
        self.assertEqual(r["rows"][0]["m"]["value"], "10")
        witness = {"id": "w", "kind": "valueSupports", "cut": {"validAt": 1}, "pattern": {"attribute": ":s/v",
                                                                                          "value": i64(10)}}
        rows = result(evaluate(case(self.CMDS, [witness])), "w")["supports"]
        self.assertEqual([x["entityId"] for x in rows], ["e1", "e2"])           # every tied entity kept

    def test_AG_PACKET_COALESCE(self):
        r = self.agg([{"op": "sum", "var": "v", "as": "s"}], cmds=[], emptyAs=i64(0))
        self.assertEqual(r["rows"][0]["s"], {"type": "integer", "value": "0"})


# --------------------------------------------------------------------------- 4.5


class CardManyOrder(unittest.TestCase):
    def test_card_many_order(self):
        self.assertEqual(list(V.FAMILIES), CONTRACT["cardManyOrder"]["familyOrder"])
        values = [s("b"), {"type": "blob", "value": "h", "mimeType": "m", "size": 1}, {"type": "json", "value": {"a": 1}},
                  {"type": "ref", "value": "r"}, {"type": "datetime", "value": 5}, decimal_value("1.50"), num(2.5),
                  i64(3), {"type": "boolean", "value": True}, {"type": "boolean", "value": False}, decimal_value("1.5"),
                  nbits("0x8000000000000000"), num(0.0), s("\U00010000"), s(""), i64(-3)]
        rep = evaluate(case([], [{"id": "o", "kind": "sortValues", "values": values}]))
        got = [(v["type"], v.get("bits", v["value"])) for v in result(rep, "o")]
        self.assertEqual(got, [("boolean", False), ("boolean", True), ("integer", "-3"), ("integer", "3"),
                               ("number", "0x8000000000000000"), ("number", "0x4004000000000000"),
                               ("decimal", "1.50"), ("datetime", "0x4014000000000000"), ("string", "b"),
                               ("string", ""), ("string", "\U00010000"), ("ref", "r"),
                               ("json", {"a": 1}), ("blob", "h")])


# --------------------------------------------------------------------------- 4.6


class Constraints(unittest.TestCase):
    RULES = [{"_tag": "Required", "v": 1, "entityType": "P", "attribute": ":p/name"},
             {"_tag": "Cardinality", "v": 1, "entityType": "P", "attribute": ":p/name", "max": 1}]

    def run_cmds(self, cmds, queries=(), **kw):
        return evaluate(case(cmds, queries, **kw))

    def enforce(self, ops, clock):
        return {"clock": clock, "meta": {"enforce": {"constraints": self.RULES}}, "operations": ops}

    def test_CN_NEW_OR_WORSENED(self):
        cmds = [{"clock": 1, "operations": [assert_op("a", "p1", ":p/name", s("A"), entity_type="P"),
                                            assert_op("b", "p1", ":p/name", s("B"), entity_type="P")]},   # pre-existing
                self.enforce([assert_op("c", "p2", ":p/name", s("C"), entity_type="P")], 2),          # unrelated
                self.enforce([assert_op("d", "p1", ":p/name", s("D"), entity_type="P")], 3)]          # worsens
        rep = self.run_cmds(cmds)
        self.assertEqual(outcome(rep, 1)["outcome"], "committed")
        self.assertEqual((outcome(rep, 2)["errorTag"], outcome(rep, 2)["reason"]),
                         ("ConstraintViolationError", "cardinality"))

    def test_CN_CARD_COUNT(self):
        rep = self.run_cmds([self.enforce([assert_op("a", "p1", ":p/name", s("A"), entity_type="P"),
                                           assert_op("b", "p1", ":p/name", s("A"), entity_type="P")], 1)])
        self.assertEqual(outcome(rep, 0)["error"], "E-CONSTRAINT")

    def test_CN_PREEXISTING_CONFLICT(self):
        schema = [{"version": 1, "entityTypes": {"P": {"attributes": {"name": {"attribute": ":p/name", "type": "string"},
                                                                        "age": {"attribute": ":p/age", "type": "integer"}}}}}]
        cmds = [{"clock": 1, "operations": [assert_op("a", "p1", ":p/name", s("A"), entity_type="P"),
                                            assert_op("b", "p1", ":p/name", s("B"), entity_type="P")]},
                self.enforce([assert_op("c", "p1", ":p/age", i64(3), entity_type="P")], 2)]
        rep = self.run_cmds(cmds, [{"id": "g", "kind": "get", "entityType": "P", "entityId": "p1", "cut": {"validAt": 1}}],
                            schemas=schema)
        self.assertEqual(outcome(rep, 1)["outcome"], "committed")
        self.assertEqual(result(rep, "g")["error"], "E-CONFLICTING-VALUES")    # still a conflict, read per C5.3


# --------------------------------------------------------------------------- 4.0


class ValueKinds(unittest.TestCase):
    def write(self, value, lane=None, **kw):
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x/v", value)]}],
                            [{"id": "m", "kind": "match", "cut": {"validAt": 1}}], lane=lane, **kw))
        return rep

    def test_kind_string(self):
        rep = evaluate(None, raw_text=json.dumps(case([{"clock": 1, "operations": [
                           assert_op("a", "e", ":x/v", s("PLACEHOLDER"))]}])).replace("PLACEHOLDER", "\\ud800"))
        self.assertEqual(err_fields(outcome(rep, 0)), ("InvalidTripleError", "invalid-value"))

    def test_kind_integer(self):
        rep = self.write(i64(2 ** 63 - 1))
        self.assertEqual(result(rep, "m")["raw"][0]["value"], {"type": "integer", "value": str(2 ** 63 - 1)})
        rep = self.write(i64(2 ** 59), lane="qlever")
        self.assertEqual(err_fields(outcome(rep, 0)), ("InvalidTripleError", "value-out-of-range"))
        self.assertEqual(result(rep, "m")["raw"], [])                                       # no residue
        self.assertEqual(outcome(self.write(i64(2 ** 53 - 1), lane="qlever"), 0)["outcome"], "committed")

    def test_kind_number(self):
        rep = self.write(num(0.30000000000000004))
        self.assertEqual(result(rep, "m")["raw"][0]["value"]["bits"], "0x3fd3333333333334")
        text = json.dumps(case([{"clock": 1, "operations": [assert_op("a", "e", ":x/v", num(9.5))]}]))
        rep = evaluate(None, raw_text=text.replace("9.5", "1e400"))                                     # Infinity
        self.assertEqual(outcome(rep, 0)["error"], "E-INVALID-VALUE")
        self.assertEqual(outcome(self.write(nbits("0x7ff8000000000000")), 0)["error"], "E-INVALID-VALUE")   # NaN

    def test_kind_decimal(self):
        decl = {":x/v": {"type": "decimal", "precision": 4, "scale": 2}}
        rep = self.write(decimal_value("16.5"), attributeDeclarations=decl)
        v = result(rep, "m")["raw"][0]["value"]
        self.assertEqual((v["value"], v["scale"], v["storage"]), ("16.50", 2, {"kind": "scaled-integer", "scaled": "1650"}))
        rep = self.write(decimal_value("16.505"), attributeDeclarations=decl)
        self.assertEqual(err_fields(outcome(rep, 0)), ("InvalidTripleError", "decimal-unrepresentable"))

    def test_kind_boolean(self):
        self.assertEqual(result(self.write({"type": "boolean", "value": False}), "m")["raw"][0]["value"]["value"], False)

    def test_kind_datetime(self):
        rep = self.write({"type": "datetime", "value": 1700000000000.5})
        self.assertEqual(result(rep, "m")["raw"][0]["value"]["value"], 1700000000000.5)

    def test_kind_ref(self):
        self.assertEqual(result(self.write({"type": "ref", "value": "e:2"}), "m")["raw"][0]["value"]["value"], "e:2")

    def test_kind_json(self):
        v = result(self.write({"type": "json", "value": {"b": 1, "a": 2}}), "m")["raw"][0]["value"]
        self.assertEqual((list(v["value"]), v["canonical"]), (["b", "a"], '{"a":2,"b":1}'))

    def test_kind_blob(self):
        v = result(self.write({"type": "blob", "value": "h", "mimeType": "m/t", "size": 4294967297}), "m")["raw"][0]
        self.assertEqual((v["value"]["mimeType"], v["value"]["size"]), ("m/t", 4294967297))


class LaneRanges(unittest.TestCase):
    def outcome_for(self, value, lane):
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x/v", i64(value))]}], lane=lane))
        return outcome(rep, 0)

    def test_lane_xtdb(self):
        for v in (2 ** 63 - 1, -2 ** 63):
            self.assertEqual(self.outcome_for(v, "xtdb")["outcome"], "committed")

    def test_lane_qlever(self):
        for v in (2 ** 59 - 1, -2 ** 59, 2 ** 53 - 1, -(2 ** 53 - 1)):
            self.assertEqual(self.outcome_for(v, "qlever-sparql")["outcome"], "committed", v)
        for v in (2 ** 59, -2 ** 59 - 1, 2 ** 63 - 1):
            self.assertEqual(self.outcome_for(v, "qlever")["error"], "E-VALUE-OUT-OF-RANGE", v)

    def test_every_lane_accepts_at_least_2_53(self):
        with self.assertRaises(V.OracleInputError):
            evaluate(case([], laneIntegerRanges={"qlever": [str(-2 ** 52), str(2 ** 52)]}))


class DecimalRules(unittest.TestCase):
    """ACC 4.0 DECIMAL_RULES (RULINGS Q18) and the six named CS-DECIMAL cases."""

    def run_writes(self, values, decl, queries=()):
        ops = [assert_op(f"a{k}", f"e{k}", ":pay/rate", v) for k, v in enumerate(values)]
        extra = {} if decl is None else {"attributeDeclarations": {":pay/rate": dict(decl, type="decimal")}}
        return evaluate(case([{"clock": 1, "operations": [op]} for op in ops], queries, **extra))

    def test_decimal_declaration(self):
        rep = self.run_writes([decimal_value("1.5")], None)
        self.assertEqual(outcome(rep, 0)["error"], "E-INVALID-VALUE")              # undeclared decimal
        with self.assertRaises(V.OracleInputError):
            self.run_writes([decimal_value("1.5")], {"precision": 2, "scale": 3})   # s <= p

    def test_decimal_storage(self):
        """DEC-P15-SCALED and DEC-P16-STRING."""
        small = self.run_writes([decimal_value("1000000000.00")], {"precision": 15, "scale": 2},
                                [{"id": "m", "kind": "match", "cut": {"validAt": 1}}])
        v = result(small, "m")["raw"][0]["value"]
        self.assertEqual(v["storage"], {"kind": "scaled-integer", "scaled": "100000000000"})   # 1e11 cents
        big = self.run_writes([decimal_value("-12345678901234567.89")], {"precision": 19, "scale": 2},
                              [{"id": "m", "kind": "match", "cut": {"validAt": 1}}])
        v = result(big, "m")["raw"][0]["value"]
        self.assertEqual((v["value"], v["storage"]["kind"]), ("-12345678901234567.89", "order-preserving-string"))

    def test_decimal_reject(self):
        """DEC-SCALE-EXCESS and DEC-PRECISION-EXCESS: never rounded, no residue."""
        rep = self.run_writes([decimal_value("16.499"), decimal_value("100.00"), decimal_value("16.500")],
                              {"precision": 4, "scale": 2}, [{"id": "all", "kind": "assertions"}])
        self.assertEqual(outcome(rep, 0)["error"], "E-DECIMAL-UNREPRESENTABLE")
        self.assertEqual(outcome(rep, 1)["error"], "E-DECIMAL-UNREPRESENTABLE")
        self.assertEqual(outcome(rep, 2)["outcome"], "committed")                # 16.500 is 16.5: fits scale 2
        self.assertEqual([a["value"]["value"] for a in result(rep, "all")["assertions"]], ["16.50"])

    def test_decimal_family(self):
        rep = self.run_writes([decimal_value("1.50"), decimal_value("1.5")], {"precision": 4, "scale": 2},
                              [{"id": "v", "kind": "valueSupports", "cut": {"validAt": 1},
                                "pattern": {"attribute": ":pay/rate"}},
                               {"id": "o", "kind": "sortValues", "values": [{"type": "datetime", "value": 0},
                                                                            decimal_value("9"), num(9.5)]}])
        self.assertEqual([x["value"]["value"] for x in result(rep, "v")["supports"]], ["1.50", "1.50"])
        self.assertTrue(V.decimal("1.50") == V.decimal("1.5"))                         # one value
        self.assertEqual([x["type"] for x in result(rep, "o")], ["number", "decimal", "datetime"])

    def test_decimal_comparison(self):
        """DEC-CROSS-FAMILY-PREFLIGHT and DEC-CONVERTED-COMPARE; a range rule in exact order."""
        schema = [{"version": 1, "entityTypes": {"W": {"attributes": {
            "rate": {"attribute": ":pay/rate", "type": "decimal", "precision": 6, "scale": 2}}}}}]
        ops = [assert_op(f"w{k}", f"w:{k}", ":pay/rate", decimal_value(t), entity_type="W")
               for k, t in enumerate(["16.49", "16.50", "17", "9.99"])]
        q = [{"id": "rule", "kind": "find", "entityType": "W", "cut": {"validAt": 1},
              "where": [{"prop": "rate", "op": "gte", "value": decimal_value("16.50")}]},
             {"id": "cross", "kind": "find", "entityType": "W", "cut": {"validAt": 1},
              "where": [{"prop": "rate", "op": "gte", "value": num(16.5)}]},
             {"id": "cross-eq", "kind": "count", "entityType": "W", "cut": {"validAt": 1},
              "where": [{"prop": "rate", "op": "eq", "value": i64(17)}]},
             {"id": "conv", "kind": "compare", "left": ["to-number", decimal_value("16.50")], "right": num(16.5)}]
        rep = evaluate(case([{"clock": 1, "operations": ops}], q, schemas=schema))
        self.assertEqual(result(rep, "rule")["pages"][0]["ids"], ["w:1", "w:2"])
        self.assertEqual(err_fields(result(rep, "cross")), ("DatalogValidationError", "mixed-family"))
        self.assertEqual(result(rep, "cross-eq")["error"], "E-MIXED-FAMILY")
        self.assertTrue(result(rep, "conv")["eq"])

    def test_decimal_arithmetic(self):
        """Kernel arithmetic over decimals is exact (Q18)."""
        a, b = dec("0.10"), dec("0.20")
        self.assertEqual(X.add(a, b).to_output().get("value"), "0.30")
        self.assertEqual(X.mul(dec("16.50"), dec("40")).to_output().get("value"), "660.00")
        self.assertEqual(X.agg_sum([dec("0.1")] * 3).to_output().get("value"), "0.3")
        with self.assertRaises(X.TypedError):
            X.add(dec("1"), I(1))                                                        # E-MIXED-FAMILY


# --------------------------------------------------------------------------- 4.7


def _scenarios():
    """For every error id the oracle produces: a case whose expected answer is that error,
    and where to read it ('q' query error or 'c' command outcome)."""
    sch = [{"version": 1, "entityTypes": {"P": {"attributes": {
        "name": {"attribute": ":p/name", "type": "string"}, "tags": {"attribute": ":p/tag", "type": "string",
                                                                     "cardinality": "many"}}}}}]
    two_names = [{"clock": 1, "operations": [assert_op("a", "p1", ":p/name", s("A"), entity_type="P"),
                                             assert_op("b", "p1", ":p/name", s("B"), entity_type="P")]}]
    pages = [{"clock": 1, "operations": [assert_op(f"x{k}", f"e{k}", ":p/name", s("x"), entity_type="P")
                                         for k in range(3)]}]
    return {
        "E-INTEGER-OVERFLOW": ("q", case([], [{"id": "q", "kind": "expr", "expr": ["add", i64(2 ** 62), i64(2 ** 62)]}])),
        "E-VALUE-OUT-OF-RANGE": ("c", case([{"clock": 1, "operations": [assert_op("a", "e", ":v", i64(2 ** 60))]}],
                                           lane="qlever")),
        "E-DECIMAL-UNREPRESENTABLE": ("c", case([{"clock": 1, "operations": [
            assert_op("a", "e", ":v", {"type": "decimal", "value": "1.234", "precision": 3, "scale": 2})]}])),
        "E-NUMBER-OVERFLOW": ("q", case([], [{"id": "q", "kind": "expr", "expr": ["mul", num(1e308), num(10.0)]}])),
        "E-DIVISION-BY-ZERO": ("q", case([], [{"id": "q", "kind": "expr", "expr": ["div", i64(7), i64(0)]}])),
        "E-INVALID-CONVERSION": ("q", case([], [{"id": "q", "kind": "expr", "expr": ["cast-int64", s("01")]}])),
        "E-MIXED-FAMILY": ("q", case([], [{"id": "q", "kind": "expr", "expr": ["add", i64(1), num(1.5)]}])),
        "E-INTEGER-AVG": ("q", case([], [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "varTypes": {"v": "integer"},
                                          "match": {"attributes": {"v": ":v"}}, "aggregates": [{"op": "avg", "var": "v"}]}])),
        "E-INVALID-QUERY": ("q", case(pages, [{"id": "q", "kind": "find", "entityType": "P", "cut": {"validAt": 1},
                                               "orderBy": [{"prop": "tags"}]}], schemas=sch)),
        "E-UNAVAILABLE-CUT": ("q", case([], [{"id": "q", "kind": "match", "cut": {"position": 3, "validAt": 1}}])),
        "E-CONFLICTING-VALUES": ("q", case(two_names, [{"id": "q", "kind": "get", "entityType": "P", "entityId": "p1",
                                                        "cut": {"validAt": 1}}], schemas=sch)),
        "E-CURSOR": ("q", case(pages, [{"id": "q", "kind": "entityPage", "entityType": "P", "cursor": "o-replay-cursor/1:x.y",
                                        "cut": {"validAt": 1}}])),
        "E-COMMAND-COMMITTED": ("c", case([{"clock": 1, "meta": {"commandId": "k"}, "operations": []},
                                           {"clock": 2, "meta": {"commandId": "k"}, "operations": []}])),
        "E-TX-CONFLICT": ("c", case([{"clock": 1, "operations": [assert_op("a", "e", ":v", s("x"))]},
                                     {"clock": 2, "operations": [{"op": "retract", "target": "a"}]},
                                     {"clock": 3, "operations": [{"op": "retract", "target": "a"}],
                                      "meta": {"preconditions": [{"_tag": "TripleLive", "target": "a"}]}}])),
        "E-CONSTRAINT": ("c", case([{"clock": 1, "meta": {"enforce": {"constraints": [
            {"_tag": "Required", "v": 1, "entityType": "P", "attribute": ":p/name"}]}},
            "operations": [assert_op("a", "p1", ":p/age", i64(1), entity_type="P")]}])),
        "E-INVALID-VALUE": ("c", case([{"clock": 1, "operations": [assert_op("a", "e", ":v", i64("01"))]}])),
        "E-RESERVED": ("c", case([{"clock": 1, "operations": [assert_op("a", "_triplex/x", ":v", s("x"))]}])),
    }


SCENARIOS = _scenarios()


class Errors(unittest.TestCase):
    """One test per ERROR_TABLE row: the oracle's table equals the contract's row, and an
    error the oracle produces carries exactly that tag and reason."""


def _error_test(row):
    def test(self):
        tag, reasons, phase = ERR.ERROR_TABLE[row["id"]]
        contract_reasons = tuple(row["reason"].split("|")) if "|" in row["reason"] else row["reason"]
        self.assertEqual((tag, reasons, phase), (row["tag"], contract_reasons, row["phase"]))
        if row["id"] not in ERR.PRODUCED:
            return
        where, c = SCENARIOS[row["id"]]
        rep = evaluate(c)
        node = result(rep, "q") if where == "q" else outcome(rep, len(c["commands"]) - 1)
        self.assertEqual(node["error"], row["id"])
        got_tag, got_reason = err_fields(node)
        self.assertEqual(got_tag, row["tag"])
        allowed = contract_reasons if isinstance(contract_reasons, tuple) else (contract_reasons,)
        self.assertIn(got_reason, allowed)
    return test


for _row in CONTRACT["errorTable"]:
    setattr(Errors, "test_" + _row["id"].replace("-", "_"), _error_test(_row))


if __name__ == "__main__":
    unittest.main()

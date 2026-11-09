"""ACCEPTANCE section 4 (frozen semantic tables) and the tables added through 0.3.5
(decimalOps, decimalConversions, decimalScaleEvolution, wireRules, temporalRules,
readShapeRules, journalRules, q33Rules, positionDenseCases, positionRequiredCases), one test
per table row.

Each test is named after its contract row id (test_N_I_ADD for N-I-ADD). The coverage
tests read lab/acceptance/obligations.json (the contract's only machine authority) and
fail when a section 4 row has no test or when a contract example is not evaluated, so
the oracle cannot drift from a later contract version silently. Examples are evaluated
exactly as the contract writes them (left column) and compared with the contract's
answer (right column).
"""

import json
import importlib
import re
import struct
import unittest
from pathlib import Path

from lab.oracles.replay import errors as ERR
from lab.oracles.replay import exact as X
from lab.oracles.replay import values as V
from lab.oracles.replay.tests import test_rulings as T
from lab.oracles.replay.tests.helpers import assert_op, case, committed_receipts, evaluate, i64, outcome, ref, result, s

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
              "aggregateRules": "Aggregates", "constraintRules": "Constraints", "errorTable": "Errors",
              # tables added by contracts 0.3.3 to 0.3.5 (EXP-O03)
              "decimalOps": "DecimalOps", "decimalConversions": "DecimalConversions",
              "decimalScaleEvolution": "DecimalScaleEvolution", "wireRules": "WireRules",
              "temporalRules": "TemporalRules", "readShapeRules": "ReadShapeRules", "journalRules": "JournalRules",
              # contract 0.3.5 (EXP-O03 alignment)
              "q33Rules": "Q33Rules",
              # decimalRouting (V-O03 F2: its absence let DR-JSON-CONVERT drift unnoticed)
              "decimalRouting": "DecimalRouting",
              # contract 0.3.6 (EXP-O04)
              "q43Rules": "Q43Rules",
              # contract 0.3.9 (EXP-O04b): DECIMAL_ROUTING_Q52 (RULINGS Q52f)
              "decimalRoutingQ52": "DecimalRouting"}

    def test_every_section4_row_has_a_named_test(self):
        classes = {cls.__name__: cls for cls in (NumericOps, Conversions, Comparisons, Aggregates, Constraints, Errors,
                                                 DecimalOps, DecimalConversions, DecimalScaleEvolution, WireRules,
                                                 TemporalRules, ReadShapeRules, JournalRules, Q33Rules,
                                                 DecimalRouting, Q43Rules)}
        for table, cls in self.TABLES.items():
            for row in CONTRACT[table]:
                name = "test_" + re.sub(r"[^A-Za-z0-9]", "_", row["id"])
                self.assertTrue(hasattr(classes[cls], name), f"{table} {row['id']} has no {cls}.{name}")
        for row in CONTRACT["valueKinds"]:
            self.assertTrue(hasattr(ValueKinds, "test_kind_" + row["kind"]), row["kind"])
        for engine in CONTRACT["laneIntegerRange"]:
            self.assertTrue(hasattr(LaneRanges, "test_lane_" + engine), engine)
        for key in CONTRACT["decimalRules"]:
            if key != "source":
                self.assertTrue(hasattr(DecimalRules, "test_decimal_" + key), key)
        for case_id in CONTRACT["caseSets"]["CS-ERASURE"]["requiredCases"] + CONTRACT["erasure"]["tests"]:
            # [EXP-O06] Why: expose every missing mapping. Rejected: first-failure short circuit (hides 16 further gaps).
            with self.subTest(erasureCase=case_id):
                method = "test_" + case_id.replace("-", "_")
                if not hasattr(Erasure, method):
                    self.assertIn(case_id, CONTRACT_TEST_MAPPINGS, f"CS-ERASURE {case_id}")
                    for target in CONTRACT_TEST_MAPPINGS[case_id]:
                        module, cls, name = target.rsplit(".", 2)
                        self.assertTrue(callable(getattr(getattr(importlib.import_module(module), cls), name)), target)
        for key in ("positionDenseCases", "positionRequiredCases"):
            for case_id in CONTRACT[key]:
                self.assertTrue(hasattr(Positions, "test_" + case_id.replace("-", "_")), f"{key} {case_id}")
        self.assertTrue(hasattr(CardManyOrder, "test_card_many_order"))

    def test_oracle_error_table_has_no_row_the_contract_dropped(self):
        """0.3.5 removed E-DECIMAL-UNREPRESENTABLE (Q35e, RULINGS Q43a): the oracle may emit
        only contract ids or the explicitly mapped, behavior-tested legacy future-position error."""
        # [EXP-O06] Why: map the tested legacy future-position error explicitly. Rejected: changing its id (breaks 341 golden verdicts).
        with self.subTest(mapping="legacy future-position compatibility"):
            self.assertEqual(set(ERR.ERROR_TABLE) - {r["id"] for r in CONTRACT["errorTable"]}, {"E-UNAVAILABLE-CUT"})
            self.assertEqual(ERR.ERROR_TABLE["E-UNAVAILABLE-CUT"], ("ReadError", "unavailable-cut", "preflight"))
            self.assertTrue(callable(getattr(importlib.import_module(
                "lab.oracles.replay.tests.test_views").Visibility, "test_cut_validation")))
        with self.subTest(mapping="produced errors"):
            self.assertLessEqual(ERR.PRODUCED, set(ERR.ERROR_TABLE))

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

    def test_CMP_CROSS_FAMILY_ORDERED(self):
        """Q33d: every ordered comparison across families is preflight E-MIXED-FAMILY, never
        false; equality across families is false (decimal pairs are errors, CMP-DECIMAL-CROSS)."""
        pairs = [(V.string("a"), I(1)), (V.boolean(True), I(1)), (I(1), N(1.0)), (V.ref("e:1"), V.string("e:1"))]
        for a, b in pairs:
            self.assertFalse(V.predicate("eq", a, b), (a.family, b.family))
            for op in ("lt", "lte", "gt", "gte"):
                with self.assertRaises(V.MixedFamily):
                    V.predicate(op, a, b)
        with self.assertRaises(V.MixedFamily):
            V.predicate("eq", dec("1"), I(1))

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
        self.assertEqual(v, {"type": "decimal", "value": "16.50", "scale": 2, "precision": 4})
        rep = self.write(decimal_value("16.505"), attributeDeclarations=decl)
        self.assertEqual(err_fields(outcome(rep, 0)), ("InvalidTripleError", "decimal-fraction"))   # Q43a

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

    def test_lane_datomic(self):
        # [EXP-O06] Why: test the declared long range without engine evidence. Rejected: a named empty test (false coverage).
        for v in (-2 ** 63, -(2 ** 53), 2 ** 53, 2 ** 63 - 1):
            self.assertEqual(self.outcome_for(v, "datomic")["outcome"], "committed")
        for v in (-2 ** 63 - 1, 2 ** 63):
            self.assertEqual(self.outcome_for(v, "datomic")["error"], "E-INVALID-VALUE")

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
        """Values read back exactly on both sides of the old p = 15 boundary. The oracle makes no
        storage claim: the storage row is the TDK1 key for every declaration (Q35b, compiled in
        0.3.5), a lane-side form, not an expected answer."""
        small = self.run_writes([decimal_value("1000000000.00")], {"precision": 15, "scale": 2},
                                [{"id": "m", "kind": "match", "cut": {"validAt": 1}}])
        v = result(small, "m")["raw"][0]["value"]
        self.assertEqual(v, {"type": "decimal", "value": "1000000000.00", "scale": 2, "precision": 15})
        big = self.run_writes([decimal_value("-12345678901234567.89")], {"precision": 19, "scale": 2},
                              [{"id": "m", "kind": "match", "cut": {"validAt": 1}}])
        v = result(big, "m")["raw"][0]["value"]
        self.assertEqual((v["value"], v["precision"], "storage" in v), ("-12345678901234567.89", 19, False))

    def test_decimal_reject(self):
        """DEC-SCALE-EXCESS and DEC-PRECISION-EXCESS: never rounded, no residue."""
        rep = self.run_writes([decimal_value("16.499"), decimal_value("100.00"), decimal_value("16.500")],
                              {"precision": 4, "scale": 2}, [{"id": "all", "kind": "assertions"}])
        self.assertEqual(outcome(rep, 0)["error"], "E-DECIMAL-FRACTION")              # Q43a: excess fraction
        self.assertEqual((outcome(rep, 1)["error"], outcome(rep, 1)["phase"]),
                         ("E-DECIMAL-OVERFLOW", "preflight"))                          # beyond p - s, at write
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

    def test_decimal_inputCapture(self):
        """The writer's input capture is an engine obligation (DEC-INPUT-CAPTURE); the oracle's
        part is that its expected answer comes from the caller's typed input before any
        rounding: 16.505 at scale 2 is rejected, never stored as 16.50 or 16.51."""
        rep = self.run_writes([decimal_value("16.505")], {"precision": 4, "scale": 2}, [{"id": "all", "kind": "assertions"}])
        self.assertEqual((outcome(rep, 0)["error"], result(rep, "all")["assertions"]), ("E-DECIMAL-FRACTION", []))

    def test_decimal_oneRepresentation(self):
        """Q35b (compiled in 0.3.5): one stored representation; the expected answer is the
        value at the declared scale, never a storage form (no scaled-integer path)."""
        rep = self.run_writes([decimal_value("12.5")], {"precision": 4, "scale": 2},
                              [{"id": "m", "kind": "match", "cut": {"validAt": 1}}])
        self.assertEqual(result(rep, "m")["raw"][0]["value"], {"type": "decimal", "value": "12.50", "scale": 2,
                                                               "precision": 4})

    def test_decimal_wireShape(self):
        """R-DEC-1 / R-DEC-3: {"type":"decimal","value":"16.50"}; 16.500 reads back as 16.50."""
        rep = self.run_writes([decimal_value("16.500")], {"precision": 4, "scale": 2}, [{"id": "all", "kind": "assertions"}])
        self.assertEqual(result(rep, "all")["assertions"][0]["value"]["value"], "16.50")

    def test_decimal_toDecimal(self):
        """R-DEC-6: toDecimal(number, p, s, rounding) starts from the exact binary expansion."""
        self.assertEqual(X.to_decimal(N(2.675), 5, 2, "half-up").to_output().get("value"), "2.67")
        self.assertEqual(X.to_decimal(N(0.5), 3, 0, "half-even").to_output().get("value"), "0")

    def test_decimal_avg(self):
        """R-DEC-7 (Q43b): AVG over decimal is preflight E-DECIMAL-AVG."""
        with self.assertRaises(X.TypedError) as ctx:
            X.agg_avg([dec("1.50"), dec("2.50")])
        self.assertEqual(ctx.exception.code, "E-DECIMAL-AVG")

    def test_decimal_kernelMaxDigits(self):
        self.assertEqual(V.KERNEL_MAX_DIGITS, CONTRACT["decimalRules"]["kernelMaxDigits"])
        with self.assertRaises(V.OracleInputError):
            X.divide(dec("1"), dec("3"), CONTRACT["decimalRules"]["kernelMaxDigits"] + 1, "down")


# --------------------------------------------------------------------------- contract 0.3.3 to 0.3.5 tables (EXP-O03)


def kernel(thunk):
    """('ok', output as plain JSON) or ('error', error id) for a direct kernel call."""
    kind, got = run_example(thunk)
    return (kind, json.loads(V.dumps(got.to_output()))) if kind == "ok" else (kind, got)


def bits(x):
    """binary64 bits by struct, independent of the oracle's own encoder."""
    return "0x%016x" % struct.unpack("<Q", struct.pack("<d", x))[0]


def dec_out(node):
    """(value text, scale, precision) of a decimal output."""
    return node["value"], node["scale"], node["precision"]


def q_expr(expr):
    """One expression through the case text path: its output or its error node."""
    return result(evaluate(case([], [{"id": "q", "kind": "expr", "expr": expr}])), "q")


def nines(n):
    return "9" * n


class DecimalOps(unittest.TestCase):
    """decimalOps (RULINGS Q22, Q33b): each row's result scale and precision, rounding only
    where the caller names it, and E-DECIMAL-OVERFLOW instead of rounding or widening. No
    target is declared inside an expression, so "the target's declared precision" is the
    38-digit kernel maximum (R-DEC-10)."""

    def test_DO_ADD(self):
        a, b = dec("1.25", 4, 2), dec("10.5", 3, 1)            # p - s = 2 for both
        self.assertEqual(dec_out(kernel(lambda: X.add(a, b))[1]), ("11.75", 2, 5))     # max(2, 2) + 2 + 1
        self.assertEqual(dec_out(kernel(lambda: X.sub(b, a))[1]), ("9.25", 2, 5))
        big, one = dec(nines(38), 38, 0), dec("1", 1, 0)
        self.assertEqual(kernel(lambda: X.add(big, one)), ("error", "E-DECIMAL-OVERFLOW"))   # 10^38: 39 digits
        node = q_expr(["add", decimal_value(nines(38)), decimal_value("1")])
        self.assertEqual((node["error"], node["_tag"], node["phase"]), ("E-DECIMAL-OVERFLOW", "InvalidTripleError",
                                                                        "execution"))   # a computed result
        self.assertEqual(kernel(lambda: X.sub(dec("-" + nines(38), 38, 0), one)), ("error", "E-DECIMAL-OVERFLOW"))
        self.assertEqual(dec_out(kernel(lambda: X.sub(big, one))[1]), (nines(37) + "8", 0, 38))
        self.assertEqual(dec_out(q_expr(["add", decimal_value("0.10"), decimal_value("0.20")])), ("0.30", 2, 3))

    def test_DO_MUL(self):
        self.assertEqual(dec_out(kernel(lambda: X.mul(dec("1.5", 2, 1), dec("2.25", 3, 2)))[1]), ("3.375", 3, 5))
        self.assertEqual(dec_out(kernel(lambda: X.mul(dec(nines(19)), dec(nines(19))))[1]),
                         (str((10 ** 19 - 1) ** 2), 0, 38))                          # 38 digits: fits
        e20, e19 = dec("1" + "0" * 20), dec("1" + "0" * 19)
        self.assertEqual(kernel(lambda: X.mul(e20, e19)), ("error", "E-DECIMAL-OVERFLOW"))   # 10^39: 40 digits

    def test_DO_DIV(self):
        one, three, eight = dec("1", 1, 0), dec("3", 1, 0), dec("8", 1, 0)
        cases = [(one, "half-even", "0.12"), (one, "half-up", "0.13"), (one, "down", "0.12"),
                 (three, "half-even", "0.38"), (three, "half-up", "0.38"), (three, "down", "0.37"),
                 (dec("-1", 1, 0), "half-even", "-0.12"), (dec("-1", 1, 0), "half-up", "-0.13"),
                 (dec("-1", 1, 0), "down", "-0.12")]
        for a, mode, want in cases:
            self.assertEqual(dec_out(kernel(lambda: X.divide(a, eight, 2, mode))[1]), (want, 2, 38), (mode, want))
        self.assertEqual(dec_out(kernel(lambda: X.divide(dec("10.00"), I(4), 1, "half-even"))[1]), ("2.5", 1, 38))
        self.assertEqual(kernel(lambda: X.divide(one, dec("0.00"), 2, "down")), ("error", "E-DIVISION-BY-ZERO"))
        self.assertEqual(kernel(lambda: X.divide(dec("1" + "0" * 37, 38, 0), dec("0.1", 1, 1), 0, "down")),
                         ("error", "E-DECIMAL-OVERFLOW"))
        with self.assertRaises(V.OracleInputError):
            X.divide(one, eight, 2, "ceiling")                       # only the three named modes
        node = q_expr(["divide", decimal_value("1"), decimal_value("3"), 2, "half-up"])
        self.assertEqual(dec_out(node), ("0.33", 2, 38))
        # R-DEC-7 (Q33b): AVG over decimal is written divide(SUM, COUNT, scale, rounding)
        # (distinct values: AG-COUNT counts distinct values of the variable)
        items = [dec("1.00"), dec("2.00"), dec("4.00")]
        avg = X.divide(X.agg_sum(items), X.agg_count(items), 2, "half-even")
        self.assertEqual(dec_out(json.loads(V.dumps(avg.to_output()))), ("2.33", 2, 38))

    def test_DO_BARE_DIV(self):
        self.assertEqual(kernel(lambda: X.div(dec("1"), dec("2"))), ("error", "E-DECIMAL-BARE-DIVIDE"))
        self.assertEqual(kernel(lambda: X.div(dec("1"), I(2))), ("error", "E-DECIMAL-BARE-DIVIDE"))
        node = q_expr(["div", decimal_value("1"), decimal_value("2")])
        self.assertEqual((node["error"],) + err_fields(node),
                         ("E-DECIMAL-BARE-DIVIDE", "DatalogValidationError", "decimal-divide-requires-scale"))

    def test_DO_ROUND(self):
        x = dec("2.345", 5, 3)
        for mode, want in (("half-even", "2.34"), ("half-up", "2.35"), ("down", "2.34")):
            self.assertEqual(dec_out(kernel(lambda: X.round_(x, 2, mode))[1]), (want, 2, 4), mode)   # 5 - (3 - 2)
        self.assertEqual(dec_out(kernel(lambda: X.round_(dec("-2.345", 5, 3), 2, "half-up"))[1]), ("-2.35", 2, 4))
        self.assertEqual(dec_out(kernel(lambda: X.round_(dec("2.5", 2, 1), 0, "half-even"))[1]), ("2", 0, 1))
        # a carry beyond the precision: 9.99 (3, 2) at scale 1 is 10.0, which needs 2 integer digits of 1
        self.assertEqual(kernel(lambda: X.round_(dec("9.99", 3, 2), 1, "half-up")), ("error", "E-DECIMAL-OVERFLOW"))
        self.assertEqual(dec_out(kernel(lambda: X.round_(dec("9.99", 3, 2), 1, "down"))[1]), ("9.9", 1, 2))
        self.assertIs(X.round_(x, 3, "down"), x)                                       # s = s_x: x itself
        # R-DEC-11 (Q43f): s > s_x is exact, zeros appended; integer digits keep their room
        self.assertEqual(dec_out(kernel(lambda: X.round_(x, 5, "down"))[1]), ("2.34500", 5, 7))
        self.assertEqual(dec_out(kernel(lambda: X.round_(dec("123", 3, 0), 2, "half-up"))[1]), ("123.00", 2, 5))
        self.assertEqual(kernel(lambda: X.round_(dec(nines(37), 37, 0), 2, "down")),
                         ("error", "E-DECIMAL-OVERFLOW"))                              # only the 38-digit limit

    def test_DO_CMP(self):
        self.assertTrue(V.predicate("eq", dec("1.50"), dec("1.5")))
        self.assertTrue(V.predicate("lt", dec("1.49"), dec("1.5")))
        self.assertTrue(V.predicate("gt", dec("-1.49"), dec("-1.5")))
        rep = evaluate(case([], [{"id": "c", "kind": "compare", "left": decimal_value("1.50"),
                                  "right": decimal_value("1.5")}]))
        c = result(rep, "c")
        self.assertEqual((c["eq"], c["lt"], c["gt"]), (True, False, False))

    def test_DO_SUM(self):
        self.assertEqual(dec_out(kernel(lambda: X.agg_sum([dec("0.1", 2, 1), dec("0.25", 3, 2)]))[1]),
                         ("0.35", 2, 38))                                              # max scale, precision 38
        big = dec(nines(38), 38, 0)
        self.assertEqual(kernel(lambda: X.agg_sum([big, big])), ("error", "E-DECIMAL-OVERFLOW"))
        self.assertEqual(dec_out(kernel(lambda: X.agg_sum([big, big, dec("-" + nines(38), 38, 0)]))[1]),
                         (nines(38), 0, 38))                                           # exact total fits


class DecimalConversions(unittest.TestCase):
    """decimalConversions (RULINGS Q22, Q33b)."""

    def test_DC_I2D(self):
        self.assertEqual(dec_out(kernel(lambda: X.to_decimal(I(123), 5, 2))[1]), ("123.00", 2, 5))
        self.assertEqual(kernel(lambda: X.to_decimal(I(1234), 5, 2)), ("error", "E-DECIMAL-OVERFLOW"))   # Q43a
        self.assertEqual(dec_out(kernel(lambda: X.to_decimal(I(-7)))[1]), ("-7", 0, 1))

    def test_DC_D2I(self):
        self.assertEqual(kernel(lambda: X.to_integer(dec("1.50"))), ("error", "E-DECIMAL-FRACTION"))
        self.assertEqual(kernel(lambda: X.to_integer(dec("2.00"))), ("ok", {"type": "integer", "value": "2"}))
        self.assertEqual(kernel(lambda: X.to_integer(X.round_(dec("1.50"), 0, "half-even"))),
                         ("ok", {"type": "integer", "value": "2"}))
        self.assertEqual(kernel(lambda: X.to_integer(X.round_(dec("2.50"), 0, "half-even"))),
                         ("ok", {"type": "integer", "value": "2"}))
        node = q_expr(["toInteger", decimal_value("1.50")])
        self.assertEqual((node["error"],) + err_fields(node),
                         ("E-DECIMAL-FRACTION", "InvalidTripleError", "decimal-fraction"))

    def test_DC_D2N(self):
        self.assertEqual(kernel(lambda: X.to_number(dec("0.1")))[1]["bits"], "0x3fb999999999999a")
        # one correctly rounded binary64, ties to even: 2^53 + 1 -> 2^53
        self.assertEqual(kernel(lambda: X.to_number(dec(str(2 ** 53 + 1))))[1]["bits"], "0x4340000000000000")

    def test_DC_N2D(self):
        self.assertEqual(dec_out(kernel(lambda: X.to_decimal(N(0.1), 5, 2, "half-even"))[1]), ("0.10", 2, 5))
        # R-DEC-6: from the exact binary expansion; 2.675 is 2.67499999999999982236431605997495353221893310546875
        for mode in ("half-even", "half-up"):
            self.assertEqual(dec_out(kernel(lambda: X.to_decimal(N(2.675), 5, 2, mode))[1]), ("2.67", 2, 5), mode)
        self.assertEqual(dec_out(kernel(lambda: X.to_decimal(N(0.125), 5, 2, "half-even"))[1]), ("0.12", 2, 5))
        self.assertEqual(dec_out(kernel(lambda: X.to_decimal(N(0.125), 5, 2, "half-up"))[1]), ("0.13", 2, 5))
        self.assertEqual(kernel(lambda: X.to_decimal(N(1e20), 5, 2, "down")), ("error", "E-DECIMAL-OVERFLOW"))  # Q43a
        with self.assertRaises(V.OracleInputError):
            X.to_decimal(N(0.1))                              # only toDecimal(x, p, s, rounding)

    def test_DC_T2D(self):
        decl = {"attributeDeclarations": {":pay/rate": {"type": "decimal", "precision": 4, "scale": 2}}}
        texts = ["16.505", "100.00", "16.500", "1e2", "+1.5", ".5"]
        rep = evaluate(case([{"clock": 1, "operations": [assert_op(f"a{k}", f"e{k}", ":pay/rate", decimal_value(t))]}
                             for k, t in enumerate(texts)], [{"id": "all", "kind": "assertions"}], **decl))
        self.assertEqual([outcome(rep, k).get("error") for k in range(len(texts))],
                         ["E-DECIMAL-FRACTION", "E-DECIMAL-OVERFLOW", None,
                          "E-INVALID-VALUE", "E-INVALID-VALUE", "E-INVALID-VALUE"])
        self.assertEqual([a["value"]["value"] for a in result(rep, "all")["assertions"]], ["16.50"])   # R-DEC-3

    def test_DC_IMPLICIT(self):
        self.assertEqual(kernel(lambda: X.add(dec("1"), I(1))), ("error", "E-MIXED-FAMILY"))
        self.assertEqual(kernel(lambda: X.mul(dec("1"), N(1.0))), ("error", "E-MIXED-FAMILY"))
        for op in ("eq", "lt"):
            with self.assertRaises(V.MixedFamily):
                V.predicate(op, dec("1"), I(1))               # CMP-DECIMAL-CROSS: every comparison


def jsonv(x):
    return {"type": "json", "value": x}


PAY_SCHEMA = [{"version": 1, "entityTypes": {"Pay": {"attributes": {
    "rate": {"attribute": ":pay/rate", "type": "decimal", "precision": 9, "scale": 6, "cardinality": "one"}}}}}]
PAY_RATES = ("16.5", "16.499999", "-0.5", "-0.55", "12.25")


def pay_case(queries):
    ops = [assert_op(f"r{k}", f"w{k}", ":pay/rate", decimal_value(v), entity_type="Pay") for k, v in enumerate(PAY_RATES)]
    return evaluate(case([{"clock": 1, "operations": ops}], queries, schemas=PAY_SCHEMA))


class DecimalRouting(unittest.TestCase):
    """decimalRouting (Q38d). The key channel (decimal_order_v1, TDK1) is the lanes' and
    O-TDK1's; the oracle pins the exact value order and the exact results every route must
    reproduce, and the value-side rules (key arithmetic, JSON opacity, JSON conversion)."""

    def test_DR_REPO_ORDER(self):
        rep = pay_case([{"id": "asc", "kind": "find", "entityType": "Pay", "cut": {"validAt": 1},
                         "orderBy": [{"prop": "rate", "direction": "asc"}]},
                        {"id": "gte", "kind": "find", "entityType": "Pay", "cut": {"validAt": 1},
                         "where": [{"prop": "rate", "op": "gte", "value": decimal_value("16.50")}]}])
        self.assertEqual(result(rep, "asc")["pages"][0]["ids"], ["w3", "w2", "w4", "w1", "w0"])   # exact, not lexical
        self.assertEqual(result(rep, "gte")["pages"][0]["ids"], ["w0"])

    def test_DR_NATIVE_ORDER(self):
        rep = evaluate(case([], [{"id": "o", "kind": "sortValues", "values": [decimal_value(v) for v in PAY_RATES]}]))
        self.assertEqual([v["value"] for v in result(rep, "o")], ["-0.55", "-0.5", "12.25", "16.499999", "16.5"])

    def test_DR_RAW_ORDER(self):
        rep = pay_case([{"id": "lt", "kind": "find", "entityType": "Pay", "cut": {"validAt": 1},
                         "where": [{"prop": "rate", "op": "lt", "value": decimal_value("12.25")}],
                         "orderBy": [{"prop": "rate", "direction": "desc"}]}])
        self.assertEqual(result(rep, "lt")["pages"][0]["ids"], ["w2", "w3"])        # -0.5 then -0.55

    def test_DR_DERIVED(self):
        rep = evaluate(case([], [{"id": "c", "kind": "compare", "left": ["mul", decimal_value("1.25"), decimal_value("13.2")],
                                  "right": decimal_value("16.5")}]))
        c = result(rep, "c")
        self.assertEqual((c["eq"], c["lt"], c["gt"]), (True, False, False))         # 16.500 = 16.5, computed exactly

    def test_DR_AGGREGATE(self):
        rep = pay_case([{"id": "a", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"r": ":pay/rate"}},
                         "aggregates": [{"op": "sum", "var": "r", "as": "sum"}, {"op": "min", "var": "r", "as": "lo"},
                                        {"op": "max", "var": "r", "as": "hi"}]}])
        row = result(rep, "a")["rows"][0]
        self.assertEqual((row["sum"]["value"], row["lo"]["value"], row["hi"]["value"]),
                         ("44.199999", "-0.550000", "16.500000"))

    def test_DR_KEY_ARITHMETIC(self):
        node = result(evaluate(case([], [{"id": "q", "kind": "expr", "expr": ["add", s("p0212"), s("p011")]}])), "q")
        self.assertEqual(node["error"], "E-MIXED-FAMILY")

    def test_DR_JSON_OPAQUE(self):
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e1", ":x/j", jsonv(1.5)),
                                                         assert_op("b", "e2", ":x/j", jsonv(2.5))]}],
                            [{"id": "c", "kind": "compare", "left": jsonv(1.5), "right": decimal_value("1.5")},
                             {"id": "sum", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":x/j"}},
                              "aggregates": [{"op": "sum", "var": "v", "as": "x"}]}]))
        c = result(rep, "c")
        self.assertEqual((c["eq"], c["lt"]["error"]), (False, "E-MIXED-FAMILY"))
        self.assertEqual(result(rep, "sum")["error"], "E-MIXED-FAMILY")

    def test_DR_JSON_CONVERT(self):
        """V-O03 F2: the contract's three answers; Q49e (R-DEC-18): the as-written reading."""
        def conv(value, *params):
            return q_expr(["toDecimal", jsonv(value)] + list(params))
        self.assertEqual(dec_out(conv(1.5, 2, 1)), ("1.5", 1, 2))
        self.assertEqual(dec_out(conv(12, 4, 2)), ("12.00", 2, 4))
        node = conv(1.55, 2, 1)
        self.assertEqual((node["error"],) + err_fields(node), ("E-DECIMAL-FRACTION", "InvalidTripleError", "decimal-fraction"))
        node = conv("abc", 2, 1)
        self.assertEqual((node["error"],) + err_fields(node), ("E-INVALID-VALUE", "InvalidTripleError", "invalid-value"))
        for other in (True, None, [1.5], {"a": 1.5}):
            self.assertEqual(conv(other, 2, 1)["error"], "E-INVALID-VALUE", other)
        self.assertEqual(conv(1234.5, 4, 1)["error"], "E-DECIMAL-OVERFLOW")
        # Q49e: a JSON number converts from its as-written reading, never its binary64 expansion
        self.assertEqual(dec_out(conv(0.1, 2, 1)), ("0.1", 1, 2))
        self.assertEqual(dec_out(conv(0.30000000000000004, 17, 17)), ("0.30000000000000004", 17, 17))
        self.assertEqual(conv(0.1, 2, 0)["error"], "E-DECIMAL-FRACTION")
        self.assertEqual(conv("1.50", 3, 2)["error"], "E-INVALID-VALUE")   # decimal text inside a JSON string
        with self.assertRaises(V.OracleInputError):
            conv(1.5)

    def test_DR_JSON_STRING_TEXT(self):
        """Q49e: decimal text inside a JSON string is E-INVALID-VALUE where a decimal is
        required (toDecimal of the JSON value, with or without a rounding mode); JSON stays
        opaque to decimal comparison (DR-JSON-OPAQUE). The oracle's expression set has no
        text-to-decimal conversion (toDecimal of a string is E-INVALID-CONVERSION), so the
        explicitly converted route is the lanes' and is not answered here."""
        def conv(value, *params):
            return q_expr(["toDecimal", jsonv(value)] + list(params))
        for params in ((3, 2), (3, 2, "half-even"), (4, 0, "down")):
            node = conv("1.50", *params)
            self.assertEqual((node["error"],) + err_fields(node), ("E-INVALID-VALUE", "InvalidTripleError", "invalid-value"))
        self.assertEqual(dec_out(conv(1.5, 3, 2)), ("1.50", 2, 3))           # the same digits as a JSON number convert
        rep = evaluate(case([], [{"id": "c", "kind": "compare", "left": jsonv("1.50"), "right": decimal_value("1.50")}]))
        self.assertEqual((result(rep, "c")["eq"], result(rep, "c")["lt"]["error"]), (False, "E-MIXED-FAMILY"))

    def test_DR_JSON_CONVERT_ROUNDING(self):
        """Q52f: toDecimal(json, p, s, rounding) rounds the as-written reading (Q49e) once at
        scale s with the named mode (Q22); without a mode excess digits are E-DECIMAL-FRACTION.
        2.675 and 0.15 are below their written value in binary64, so rounding the binary
        expansion would give 2.67 and 0.1."""
        def conv(value, *params):
            return q_expr(["toDecimal", jsonv(value)] + list(params))
        cases = [((2.675, 3, 2, "half-up"), ("2.68", 2, 3)), ((2.675, 3, 2, "half-even"), ("2.68", 2, 3)),
                 ((2.665, 3, 2, "half-even"), ("2.66", 2, 3)), ((0.15, 2, 1, "half-up"), ("0.2", 1, 2)),
                 ((0.25, 2, 1, "half-even"), ("0.2", 1, 2)), ((0.25, 2, 1, "half-up"), ("0.3", 1, 2)),
                 ((0.25, 2, 1, "down"), ("0.2", 1, 2)), ((-0.25, 2, 1, "half-up"), ("-0.3", 1, 2)),
                 ((-1.29, 3, 1, "down"), ("-1.2", 1, 3)), ((12, 4, 2, "down"), ("12.00", 2, 4)),
                 ((1.5, 2, 1, "half-even"), ("1.5", 1, 2))]
        for args, want in cases:
            self.assertEqual(dec_out(conv(*args)), want, args)
        self.assertEqual(conv(2.675, 3, 2)["error"], "E-DECIMAL-FRACTION")          # no mode: never rounded
        self.assertEqual(conv(9.96, 2, 1, "half-up")["error"], "E-DECIMAL-OVERFLOW")  # 10.0 after rounding
        self.assertEqual(conv("2.675", 3, 2, "half-up")["error"], "E-INVALID-VALUE")
        with self.assertRaises(V.OracleInputError):
            conv(2.675, 3, 2, "ceiling")


class DecimalScaleEvolution(unittest.TestCase):
    """decimalScaleEvolution (Q22, Q31g, Q35b): a schema release that redeclares a decimal
    attribute is a widening or a migration, which the oracle does not model yet. It refuses
    the case (X-NOT-MODELED) instead of answering under either declaration."""

    def evolve(self, first, second):
        def release(version, p, s_):
            return {"version": version, "entityTypes": {"W": {"attributes": {
                "rate": {"attribute": ":pay/rate", "type": "decimal", "precision": p, "scale": s_}}}}}
        with self.assertRaises(V.OracleInputError) as ctx:
            evaluate(case([], schemas=[release(1, *first), release(2, *second)]))
        self.assertIn("X-NOT-MODELED", str(ctx.exception))

    def test_DS_WIDEN(self):
        self.evolve((6, 2), (7, 3))           # integer digits stay 4

    def test_DS_WIDEN_MIGRATE(self):
        self.evolve((6, 2), (6, 3))           # integer digits would shrink

    def test_DS_NARROW(self):
        self.evolve((6, 2), (5, 1))


def json_write(raw_json_text):
    """One json-valued assert whose value text is spliced in verbatim (keeps lexemes such as
    1e400, and duplicate keys, that Python's json module would not emit)."""
    c = case([{"clock": 1, "operations": [assert_op("a", "e", ":x/j", {"type": "json", "value": "__RAW__"})]}],
             [{"id": "all", "kind": "assertions"}])
    return evaluate(None, raw_text=json.dumps(c).replace('"__RAW__"', raw_json_text))


class WireRules(unittest.TestCase):
    """wireRules (RULINGS Q30, Q33a, Q34c). WR-JSON and WR-INSTANT are write-route guards the
    oracle models. WR-X-ENCODINGS, WR-Q-SHADOW and WR-INTEGER-RANGE fix engine encodings; the
    oracle's part is the exact values those encodings must reproduce."""

    def test_WR_JSON(self):
        cases = {"WIRE-JSON-NEGZERO": "-0", "WIRE-JSON-NONFINITE": "1e400", "WIRE-JSON-INEXACT": "9007199254740993",
                 "WIRE-JSON-NESTED-LIST": "[1, [2, -0.0]]", "WIRE-JSON-NESTED-STRUCT": '{"a": {"b": -0}}',
                 # the guard runs before CanonicalJson: the last-wins key rule would drop the -0
                 "WIRE-JSON-BEFORE-CANONICAL": '{"a": -0, "a": 1}'}
        for name, raw in cases.items():
            rep = json_write(raw)
            o = outcome(rep, 0)
            self.assertEqual((o["error"], o["errorTag"], o["reason"], o.get("detail")),
                             ("E-INEXACT-JSON-NUMBER", "InvalidTripleError", "invalid-value", "inexact-json-number"),
                             name)
            self.assertEqual(result(rep, "all")["assertions"], [], name)                # no residue
        rep = json_write('{"b": [0.1, 1e300, 0], "a": 1.50}')
        self.assertEqual(outcome(rep, 0)["outcome"], "committed")
        self.assertEqual(result(rep, "all")["assertions"][0]["value"]["canonical"], '{"a":1.5,"b":[0.1,1e+300,0]}')

    def test_WR_INSTANT(self):
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("x"), valid_from=NZ)]},
                             {"clock": 2, "operations": [assert_op("b", "e", ":x/d", {"type": "datetime", "value": NZ})]},
                             {"clock": 3, "operations": [assert_op("c", "e", ":x/s", s("y"), valid_from=0)]}]))
        for k in (0, 1):
            o = outcome(rep, k)
            self.assertEqual((o["error"], o["errorTag"], o["reason"], o.get("detail")),
                             ("E-NEGATIVE-ZERO-INSTANT", "InvalidTripleError", "invalid-value", "no-negative-zero"))
        self.assertEqual(outcome(rep, 2)["outcome"], "committed")

    def test_WR_X_ENCODINGS(self):
        ops = [assert_op(f"d{k}", "e", ":x/d", num(x)) for k, x in enumerate((0.1, 1e300, NZ))] + \
              [assert_op(f"i{k}", "e", ":x/i", i64(x)) for k, x in enumerate((2 ** 53 - 1, -(2 ** 53 - 1)))] + \
              [assert_op("t", "e", ":x/t", {"type": "datetime", "value": 1700000000000.5})]
        rep = evaluate(case([{"clock": 1, "operations": ops}], [{"id": "all", "kind": "assertions"}], lane="xtdb"))
        got = {a["id"]: a["value"] for a in result(rep, "all")["assertions"]}
        self.assertEqual([got[f"d{k}"]["bits"] for k in range(3)], [bits(0.1), bits(1e300), bits(NZ)])
        self.assertEqual([got[f"i{k}"]["value"] for k in range(2)], [str(2 ** 53 - 1), str(-(2 ** 53 - 1))])
        self.assertEqual(got["t"]["bits"], bits(1700000000000.5))

    def test_WR_Q_SHADOW(self):
        ops = [assert_op("z", "e", ":x/n", num(NZ)), assert_op("t", "e", ":x/n", num(0.30000000000000004)),
               assert_op("m", "e", ":x/i", i64(2 ** 59 - 1))]
        rep = evaluate(case([{"clock": 1, "operations": ops},
                             {"clock": 2, "operations": [assert_op("o", "e", ":x/i", i64(2 ** 59))]}],
                            [{"id": "all", "kind": "assertions"}], lane="qlever"))
        values = [a["value"] for a in result(rep, "all")["assertions"]]
        # the lexical channel is authoritative: -0 and a value whose %.13g shadow is inexact read back exactly
        self.assertEqual([v.get("bits") for v in values[:2]], ["0x8000000000000000", "0x3fd3333333333334"])
        self.assertEqual(values[2]["value"], str(2 ** 59 - 1))
        self.assertEqual(outcome(rep, 1)["error"], "E-VALUE-OUT-OF-RANGE")

    def test_WR_INTEGER_RANGE(self):
        for lane in ("xtdb", "qlever"):
            ops = [assert_op(f"a{k}", "e", ":x/i", i64(x)) for k, x in enumerate((2 ** 53 - 1, -(2 ** 53 - 1)))]
            rep = evaluate(case([{"clock": 1, "operations": ops}], lane=lane))
            self.assertEqual(outcome(rep, 0)["outcome"], "committed", lane)


class TemporalRules(unittest.TestCase):
    """temporalRules (handoff README 46-48, Q21 AMB-12)."""

    def test_TM_HALF_OPEN(self):
        cmds = [{"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("x"), valid_from=10, valid_to=20),
                                            assert_op("b", "f", ":x/s", s("y"), valid_from=10)]}]
        q = [{"id": f"v{t}", "kind": "match", "cut": {"validAt": t}, "pattern": {"attribute": ":x/s"}}
             for t in (9.5, 10, 19.5, 20, 1e15)]
        rep = evaluate(case(cmds, q))
        self.assertEqual([result(rep, f"v{t}")["count"] for t in (9.5, 10, 19.5, 20, 1e15)], [0, 2, 2, 1, 1])

    def test_TM_EMPTY_REJECTED(self):
        T.Q21.test_AMB_12(self)


class ReadShapeRules(unittest.TestCase):
    """readShapeRules restate Q21 AMB rulings; each row runs the AMB test that encodes it."""

    def test_RS_RAW_LIFETIME(self):
        T.Q21.test_AMB_01(self)

    def test_RS_RETIREMENT_CONTENT(self):
        T.Q21.test_AMB_02(self)

    def test_RS_TIMELINE(self):
        T.Q21.test_AMB_03(self)

    def test_RS_FIND_RANGE(self):
        T.Q21.test_AMB_16(self)

    def test_RS_FIND_CONFLICT(self):
        T.Q21.test_AMB_17(self)

    def test_RS_ENTITY_ORDER(self):
        T.Q21.test_AMB_15(self)


class JournalRules(unittest.TestCase):
    """journalRules (Q21 AMB-04 to 07) and the Q34c pairing of the JSON guard with the
    journal."""

    def test_JN_NEGZERO(self):
        T.Q21.test_AMB_04(self)
        # Q34c paired test: user JSON with -0 is rejected; a number -0 commits, journals and
        # reads back bit-exact, and its generated :_tx/change JSON never meets the user guard
        self.assertEqual(outcome(json_write("-0"), 0)["error"], "E-INEXACT-JSON-NUMBER")
        cmds = [{"clock": 1, "operations": [assert_op("z", "z:1", ":z/n", nbits("0x8000000000000000"))]}]
        q = [{"id": "m", "kind": "match", "cut": {"validAt": 1}, "pattern": {"attribute": ":z/n"}},
             {"id": "chg", "kind": "match", "cut": {"validAt": 1e15},
              "pattern": {"entityId": "tx:0", "attribute": ":_tx/change"}},
             {"id": "tx", "kind": "transaction", "txId": "tx:0"}]
        rep = evaluate(case(cmds, q))
        self.assertEqual(outcome(rep, 0)["outcome"], "committed")
        self.assertEqual(result(rep, "m")["raw"][0]["value"]["bits"], "0x8000000000000000")
        self.assertEqual(result(rep, "chg")["count"], 1)
        self.assertEqual(result(rep, "tx")["changes"][0]["value"]["bits"], "0x8000000000000000")

    def test_JN_FIELDS(self):
        T.Q21.test_AMB_05(self)

    def test_JN_STAGED(self):
        T.Q21.test_AMB_06(self)

    def test_JN_ORDER(self):
        T.Q21.test_AMB_07(self)


def coord(offset, ordinal=0, epoch=1, stream="log"):
    return {"stream": stream, "epoch": epoch, "offset": offset, "ordinal": ordinal}


class Positions(unittest.TestCase):
    """ACC POSITION and positionDenseCases (RULINGS Q31c, Q32e): receipt positions are
    totally ordered coordinates, not necessarily dense; the oracle sorts them and assigns its
    own dense ordinals for cuts; aborted offsets are accounted and take no ordinal."""

    def run_positions(self, positions, cuts=(), groups=None, aborted=None, queries=()):
        cmds = [{"clock": k + 1, "operations": [assert_op(f"r{k}", f"e{k}", ":p/v", i64(k))]}
                for k in range(len(positions))]
        for k, group in enumerate(groups or []):
            cmds[k]["physicalGroup"] = group
        queries = [{"id": "cat", "kind": "cutCatalog"}] + [
            {"id": f"cut{k}", "kind": "match", "cut": {"position": p, "validAt": 1}, "pattern": {"attribute": ":p/v"}}
            for k, p in enumerate(cuts)] + list(queries)
        extra = {} if aborted is None else {"abortedPositions": {"s": aborted}}
        c = case(cmds, queries, **extra)
        c["receipts"] = committed_receipts(c)
        for rec, position in zip(c["receipts"], positions):
            rec["position"] = position
        rep = evaluate(c)
        return rep, [result(rep, f"cut{k}")["count"] for k in range(len(cuts))]

    def test_PO_LEXICOGRAPHIC_ORDER(self):
        positions = [coord(5), coord(12), coord(1, epoch=2)]
        rep, counts = self.run_positions(positions, cuts=[{"coordinate": coord(12)}, {"coordinate": coord(11, 7)},
                                                          {"coordinate": coord(0, epoch=2)}, "latest"])
        self.assertEqual(counts, [2, 1, 2, 3])          # offset 12 > 5 as numbers; epoch 2 after every epoch 1
        self.assertEqual([(r["position"], r["coordinate"]) for r in result(rep, "cat")],
                         list(zip([1, 2, 3], positions)))
        rc = rep["receiptConsistency"]
        self.assertEqual((rc["status"], rc["positions"]),
                         ("PASS", [{"scope": "s", "coordinates": "tuple", "dense": None, "aborted": []}]))
        listed, _ = self.run_positions([["log", 1, 5, 0], ["log", 1, 12, 0]])        # list form is the same
        self.assertEqual([r["coordinate"] for r in result(listed, "cat")], [coord(5), coord(12)])
        backwards, _ = self.run_positions([coord(12), coord(5)])                      # not a race group
        self.assertEqual(backwards["receiptConsistency"]["status"], "FAIL")
        with self.assertRaises(V.OracleInputError):
            self.run_positions([1, coord(5)])                                         # one scope, one kind
        with self.assertRaises(V.OracleInputError):
            self.run_positions([1, 2], cuts=[{"coordinate": coord(5)}])              # cut kind = receipt kind

    def test_PO_ORACLE_DENSE_ORDINALS(self):
        rep, counts = self.run_positions([coord(10), coord(30)], aborted=[coord(20)],
                                         cuts=[{"coordinate": coord(10)}, {"coordinate": coord(20)},
                                               {"coordinate": coord(30)}])
        self.assertEqual(counts, [1, 1, 2])             # FX-ABORT-GAP: a cut in the gap equals the cut before it
        self.assertEqual([r["position"] for r in result(rep, "cat")], [1, 2])
        rc = rep["receiptConsistency"]
        self.assertEqual((rc["status"], rc["positions"][0]["aborted"]), ("PASS", [coord(20)]))
        bad, _ = self.run_positions([coord(10), coord(20)], aborted=[coord(20)])     # committed on an aborted offset
        self.assertEqual(bad["receiptConsistency"]["status"], "FAIL")
        gaps, counts = self.run_positions([1, 3], cuts=[2, 3])                        # integer gaps are allowed
        self.assertEqual((gaps["receiptConsistency"]["status"], counts), ("PASS", [1, 2]))
        reused, _ = self.run_positions([coord(10), coord(10)])
        self.assertEqual(reused["receiptConsistency"]["status"], "FAIL")

    def test_PO_NESTED_CUTS_DENSE(self):
        nested = [coord(7, 0), coord(7, 1), coord(7, 2)]
        rep, counts = self.run_positions(nested, groups=["g"] * 3, cuts=[{"coordinate": c} for c in nested])
        self.assertEqual((rep["receiptConsistency"]["status"], counts), ("PASS", [1, 2, 3]))   # FX-NESTED-CUTS
        dense, counts = self.run_positions([1, 2, 3], groups=["g"] * 3, cuts=[1, 2, 3])
        self.assertEqual((dense["receiptConsistency"]["status"], counts), ("PASS", [1, 2, 3]))
        self.assertNotIn("positions", dense["receiptConsistency"])                  # dense integers: 0.2.0 shape
        for broken in ([coord(7, 0), coord(7, 2)], [coord(7, 0), coord(8, 1)]):
            rep, _ = self.run_positions(broken, groups=["g", "g"])
            self.assertEqual([v["rule"] for v in rep["receiptConsistency"]["violations"]], ["R-RCP-5"], broken)


    # positionRequiredCases (0.3.5): the oracle's side of the four position falsifiers

    def test_FX_NESTED_CUTS(self):
        """Cuts at every interior ordinal of one engine transaction holding several transacts."""
        nested = [coord(7, k) for k in range(4)]
        rep, counts = self.run_positions(nested, groups=["g"] * 4, cuts=[{"coordinate": c} for c in nested])
        self.assertEqual((rep["receiptConsistency"]["status"], counts), ("PASS", [1, 2, 3, 4]))

    def test_FX_ABORT_GAP(self):
        """An aborted offset between two committed ones: cuts on both sides of it and the
        resolution-stream entry (abortedPositions)."""
        cuts = [{"coordinate": coord(19, 9)}, {"coordinate": coord(20)}, {"coordinate": coord(21)},
                {"coordinate": coord(30)}]
        rep, counts = self.run_positions([coord(10), coord(30)], aborted=[coord(20)], cuts=cuts)
        self.assertEqual(counts, [1, 1, 1, 2])
        self.assertEqual(rep["receiptConsistency"]["positions"][0]["aborted"], [coord(20)])

    def test_FX_CRASH_APPEND_RESOLUTION(self):
        """A crash between append and resolution leaves the receipt `unknown`. Resolved as
        committed it binds at its coordinate; left unresolved it is an R-RCP-6 violation. The
        aborted resolution is an aborted position with no committed receipt (FX-ABORT-GAP,
        PO-ABORTED-LISTED)."""
        def run(resolved):
            cmds = [{"clock": k + 1, "operations": [assert_op(f"r{k}", f"e{k}", ":p/v", i64(k))]} for k in range(2)]
            c = case(cmds, [{"id": "cut", "kind": "match", "cut": {"position": {"coordinate": coord(11)}, "validAt": 1},
                             "pattern": {"attribute": ":p/v"}}])
            c["receipts"] = committed_receipts(c)
            for rec, position in zip(c["receipts"], [coord(10), coord(11)]):
                rec["position"] = position
            c["receipts"][1]["outcome"] = "unknown"
            if resolved:
                c["receipts"][1]["resolvedOutcome"] = "committed"
            return evaluate(c)
        ok = run(True)
        self.assertEqual((ok["receiptConsistency"]["status"], result(ok, "cut")["count"]), ("PASS", 2))
        unresolved = run(False)
        self.assertIn("R-RCP-6", [v["rule"] for v in unresolved["receiptConsistency"]["violations"]])

    def test_FX_RESUME_AT_ABORT_GAP(self):
        """A feed consumer whose checkpoint sits at an abort gap resumes with exactly the
        commits after the gap: the checkpoint resolves to the ordinal before the gap, and
        transactions(after=that ordinal) lists the rest."""
        rep, counts = self.run_positions([coord(10), coord(30), coord(40)], aborted=[coord(20)],
                                         cuts=[{"coordinate": coord(20)}],
                                         queries=[{"id": "feed", "kind": "transactions", "after": 1}])
        self.assertEqual(counts, [1])
        self.assertEqual([r["position"] for r in result(rep, "feed")["transactions"]], [2, 3])

    def test_PO_ABORTED_LISTED(self):
        """Aborted offsets are accounted: receiptConsistency lists the case's aborted positions
        per scope, and they take no ordinal."""
        rep, _ = self.run_positions([coord(10), coord(40)], aborted=[coord(20), coord(30)])
        self.assertEqual(rep["receiptConsistency"]["positions"][0]["aborted"], [coord(20), coord(30)])
        self.assertEqual([r["position"] for r in result(rep, "cat")], [1, 2])


class Q33Rules(unittest.TestCase):
    """q33Rules (contract 0.3.5): the Q33 rulings on oracle rules, one test per row."""

    PAGES = T.BriefFacts.PAGES      # for the delegated brief-fact tests
    DECL = {":x/d": {"type": "decimal", "precision": 4, "scale": 2}}

    def write_decimals(self, texts):
        ops = [{"clock": 1, "operations": [assert_op(f"a{k}", f"e{k}", ":x/d", decimal_value(t))]}
               for k, t in enumerate(texts)]
        return evaluate(case(ops, [{"id": "all", "kind": "assertions"}], attributeDeclarations=self.DECL))

    def test_R_VAL_7a(self):
        self.assertEqual(outcome(json_write("9007199254740993"), 0)["error"], "E-INEXACT-JSON-NUMBER")
        self.assertEqual(outcome(json_write("0.1"), 0)["outcome"], "committed")

    def test_R_DEC_0(self):
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x/u", decimal_value("1.5"))]}]))
        self.assertEqual(outcome(rep, 0)["error"], "E-INVALID-VALUE")

    def test_R_DEC_1(self):
        rep = self.write_decimals(["16.50", "+1.5", "1e2", "01.5"])
        self.assertEqual(result(rep, "all")["assertions"][0]["value"],
                         {"type": "decimal", "value": "16.50", "scale": 2, "precision": 4})
        self.assertEqual([outcome(rep, k)["error"] for k in (1, 2, 3)], ["E-INVALID-VALUE"] * 3)

    def test_R_DEC_2(self):
        rep = self.write_decimals(["-0.00", "-0"])
        self.assertEqual([outcome(rep, k)["error"] for k in (0, 1)], ["E-INVALID-VALUE"] * 2)

    def test_R_DEC_3(self):
        rep = self.write_decimals(["16.500"])
        self.assertEqual([a["value"]["value"] for a in result(rep, "all")["assertions"]], ["16.50"])

    def test_R_DEC_5(self):
        self.assertEqual(dec_out(kernel(lambda: X.divide(dec("1"), dec("3"), 2, "half-even"))[1]), ("0.33", 2, 38))

    def test_R_DEC_6(self):
        self.assertEqual(dec_out(kernel(lambda: X.to_decimal(N(2.675), 5, 2, "half-up"))[1]), ("2.67", 2, 5))

    def test_R_DEC_7(self):
        """AVG over decimals is E-DECIMAL-AVG (RULINGS Q43b), from the data or from varTypes."""
        ops = [{"clock": 1, "operations": [assert_op("a", "e1", ":x/d", decimal_value("1.50")),
                                           assert_op("b", "e2", ":x/d", decimal_value("2.50"))]}]
        q = {"id": "avg", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":x/d"}},
             "aggregates": [{"op": "avg", "var": "v"}]}
        rep = evaluate(case(ops, [q], attributeDeclarations=self.DECL))
        node = result(rep, "avg")
        self.assertEqual((node["error"],) + err_fields(node),
                         ("E-DECIMAL-AVG", "DatalogValidationError", "decimal-avg-requires-divide"))
        self.assertEqual(kernel(lambda: X.agg_avg([dec("1.50")])), ("error", "E-DECIMAL-AVG"))

    def test_R_LANE_2(self):
        op = {"op": "retract-pattern", "pattern": {"attribute": ":x/i", "value": i64(2 ** 60)}}
        rep = evaluate(case([{"clock": 1, "operations": [op]}], lane="qlever"))
        self.assertEqual(outcome(rep, 0)["error"], "E-VALUE-OUT-OF-RANGE")

    def test_R_CMP_3(self):
        c = result(evaluate(case([], [{"id": "c", "kind": "compare", "left": s("a"), "right": i64(1)}])), "c")
        self.assertEqual((c["eq"], c["lt"]["error"]), (False, "E-MIXED-FAMILY"))

    def test_R_NUM_7(self):
        self.assertEqual(kernel(lambda: X.add(V.string("a"), V.string("b"))), ("error", "E-MIXED-FAMILY"))

    def test_R_NUM_8(self):
        self.assertEqual(kernel(lambda: X.rem(N(7.0), N(2.0))), ("error", "E-MIXED-FAMILY"))

    def test_R_AGG_5(self):
        self.assertEqual(kernel(lambda: X.agg_sum([V.string("a")])), ("error", "E-MIXED-FAMILY"))
        self.assertEqual(kernel(lambda: X.agg_avg([V.string("a")])), ("error", "E-MIXED-FAMILY"))

    def test_R_CMD_9(self):
        T.OracleChanges.test_R_CMD_9(self)

    def test_R_CMD_12(self):
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("x"))]},
                             {"clock": 2, "operations": [{"op": "retract-pattern", "pattern": {"entityId": "tx:0"}}]}]))
        self.assertEqual(outcome(rep, 1)["error"], "E-RESERVED")

    def test_R_JNL_5(self):
        T.BriefFacts.test_fact_4_journal_facts_are_queryable(self)

    def test_R_JNL_6(self):
        cmds = [{"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("x"))]}]
        rep = evaluate(case(cmds, [{"id": "env", "kind": "match", "cut": {"validAt": 1e15},
                                    "pattern": {"entityId": "tx:0"}}]))
        self.assertEqual(result(rep, "env")["error"], "X-NOT-MODELED")

    def test_R_JNL_7(self):
        node = result(evaluate(case([], [{"id": "t", "kind": "transactions", "limit": 0}])), "t")
        self.assertEqual(err_fields(node), ("PaginationCursorError", "malformed"))

    def test_R_CUT_3(self):
        node = result(evaluate(case([], [{"id": "c", "kind": "match", "cut": {"position": -1, "validAt": 1}}])), "c")
        self.assertEqual((node["error"],) + err_fields(node), ("E-INVALID-VALUE", "InvalidTripleError", "invalid-value"))

    def test_R_PAGE_3(self):
        T.BriefFacts.test_fact_3_entity_page_limits(self)

    def test_R_PAGE_4(self):
        T.BriefFacts.test_fact_3_cursor_sequence_and_errors(self)


class Q43Rules(unittest.TestCase):
    """q43Rules (contract 0.3.6): the Q43 rulings on EXP-O03's decisions, one test per row."""

    def test_R_DEC_13_16(self):
        self.assertEqual(kernel(lambda: X.to_decimal(N(1e20), 5, 2, "down")), ("error", "E-DECIMAL-OVERFLOW"))
        self.assertEqual(kernel(lambda: X.to_decimal(dec("1.234"), 5, 2)), ("error", "E-DECIMAL-FRACTION"))
        self.assertNotIn("E-DECIMAL-UNREPRESENTABLE", ERR.ERROR_TABLE)

    def test_R_DEC_14(self):
        self.assertEqual(kernel(lambda: X.agg_avg([dec("1.50")])), ("error", "E-DECIMAL-AVG"))

    def test_R_DEC_8(self):
        self.assertEqual(dec_out(json.loads(V.dumps(dec("12.50").to_output()))), ("12.50", 2, 4))
        self.assertEqual(dec_out(json.loads(V.dumps(dec("0.5").to_output()))), ("0.5", 1, 1))

    def test_R_DEC_9(self):
        ties = [("2.5", "half-even", "2"), ("3.5", "half-even", "4"), ("-2.5", "half-up", "-3"),
                ("2.5", "half-up", "3"), ("-2.9", "down", "-2"), ("2.9", "down", "2")]
        for text, mode, want in ties:
            self.assertEqual(dec_out(kernel(lambda: X.round_(dec(text), 0, mode))[1])[0], want, (text, mode))

    def test_R_DEC_10(self):
        self.assertEqual(kernel(lambda: X.add(dec(nines(38), 38, 0), dec("1", 1, 0))), ("error", "E-DECIMAL-OVERFLOW"))

    def test_R_DEC_11(self):
        self.assertEqual(dec_out(kernel(lambda: X.round_(dec("1.5", 2, 1), 3, "half-even"))[1]), ("1.500", 3, 4))

    def test_R_DEC_12(self):
        self.assertEqual(kernel(lambda: X.to_integer(dec(str(2 ** 63), 19, 0))), ("error", "E-INTEGER-OVERFLOW"))

    def test_R_CUT_4(self):
        node = result(evaluate(case([], [{"id": "q", "kind": "match", "cut": {"validAt": NZ}}])), "q")
        self.assertEqual((node["error"], node["detail"]), ("E-NEGATIVE-ZERO-INSTANT", "no-negative-zero"))


# --------------------------------------------------------------------------- erasure (EXP-O04; TARGETS 7, Q24, Q31f)

SSN, NAME = ":person/ssn", ":person/name"
PLAIN = "123-45-6789"
PERSON_SCHEMA = [{"version": 1, "entityTypes": {"Person": {"attributes": {
    "ssn": {"attribute": SSN, "type": "string"}, "name": {"attribute": NAME, "type": "string"}}}}}]


def marker(at):
    return {"_tag": "ErasedValue", "erasedAt": at}


def erasure_commands(erase=True):
    """P1 (clock 100): ssn1 and name1 on person:1, name2 on person:2; P2 (clock 200): ssn1
    retracted, ssn2 asserted; P3 (clock 300): the erasure of person:1's ssn (or, as the
    control, an empty command at the same position)."""
    return [{"clock": 100, "operations": [assert_op("ssn1", "person:1", SSN, s(PLAIN), entity_type="Person"),
                                          assert_op("name1", "person:1", NAME, s("Ann"), entity_type="Person"),
                                          assert_op("name2", "person:2", NAME, s("Bo"), entity_type="Person")]},
            {"clock": 200, "operations": [{"op": "retract", "target": "ssn1"},
                                          assert_op("ssn2", "person:1", SSN, s("987-65-4321"), entity_type="Person")]},
            {"clock": 300, "operations": [{"op": "erase", "entityId": "person:1", "attribute": SSN}] if erase else []}]


def erasure_eval(queries, extra=(), erase=True, **kw):
    return evaluate(case(erasure_commands(erase) + list(extra), queries, schemas=PERSON_SCHEMA, **kw))


def match_q(qid, position="latest", attribute=SSN, **cut):
    c = {"position": position, "validAt": 1e15}
    c.update(cut)
    return {"id": qid, "kind": "match", "cut": c, "pattern": {"attribute": attribute}}


class Erasure(unittest.TestCase):
    """CS-ERASURE required cases, the oracle's side of each (ACC 8.8 ERASURE; RULES.md
    R-ERA-*). A read without `readStart` starts after the case's erasures published; one with
    it lists the whole answers of Q52e for the erasure commits in flight."""

    def test_ER_AFTER_PUBLICATION_ALL_BASES(self):
        rep = erasure_eval([match_q("p1", 1), match_q("p2", 2), match_q("now"),
                            {"id": "h", "kind": "history", "entityId": "person:1"}, match_q("name", 1, NAME)])
        self.assertEqual(outcome(rep, 2)["outcome"], "committed")
        self.assertEqual([r["value"] for r in result(rep, "p1")["raw"]], [marker(300)])   # a basis before the erasure
        self.assertEqual([r["value"] for r in result(rep, "p2")["raw"]], [marker(300)])
        self.assertEqual([r["value"] for r in result(rep, "now")["raw"]], [marker(300)])
        self.assertEqual([(r["id"], r["value"]) for r in result(rep, "h")["rawLifetime"] if r["attribute"] == SSN],
                         [("ssn1", marker(300)), ("ssn2", marker(300))])
        self.assertEqual(result(rep, "name")["raw"][0]["value"], s("Ann"))               # only the named values

    def test_ER_SHAPE_KEPT(self):
        """Identities, valid and record intervals and retirement fields are unchanged; only the
        value is the marker (control: the same stream with an empty command at P3)."""
        q = [{"id": "all", "kind": "assertions"}]
        erased, control = erasure_eval(q), erasure_eval(q, erase=False)
        rows = {r["id"]: r for r in result(erased, "all")["assertions"]}
        for r in result(control, "all")["assertions"]:
            got = dict(rows[r["id"]])
            self.assertEqual(got.pop("value"), marker(300) if r["attribute"] == SSN else r["value"])
            self.assertEqual(got, {k: v for k, v in r.items() if k != "value"})

    def test_ER_INFLIGHT_READ(self):
        """A read that started before the erasure published may return the old value or the
        marker (R-ERA-6); for a commit erasing one value Q49d and Q52e agree, and the oracle
        lists the two whole answers. One that started after it gets the marker."""
        rep = erasure_eval([dict(match_q("before", 1), readStart={"afterCommand": 1}),
                            dict(match_q("after", 1), readStart={"afterCommand": 2})])
        node = result(rep, "before")
        self.assertTrue(node["rule"].startswith("ER-INFLIGHT-ALL-OR-NONE"))
        self.assertEqual([(a["erasuresSeen"], [r["value"] for r in a["result"]["raw"]]) for a in node["acceptable"]],
                         [([], [s(PLAIN)]), (["tx:2"], [marker(300)])])
        self.assertEqual(result(rep, "after")["raw"][0]["value"], marker(300))

    def test_ER_PINNED_READER(self):
        """A cursor pinned at P2 before the erasure: every page read after the erasure
        published shows the marker, at the pinned basis."""
        rep = erasure_eval([{"id": "p", "kind": "entityPage", "entityType": "Person", "limit": 1,
                             "cut": {"position": 2, "validAt": 1e15}},
                            {"id": "c", "kind": "entityPage", "entityType": "Person", "limit": 1,
                             "cursorFrom": {"query": "p"}}])
        first = result(rep, "p")["pages"][0]["entities"][0]
        self.assertEqual({t["id"]: t["value"] for t in first["triples"]}, {"name1": s("Ann"), "ssn2": marker(300)})
        self.assertEqual(result(rep, "c")["cut"]["position"], 2)

    def test_ER_REBUILD(self):
        """The oracle has no rebuild step: after a rebuild the expected answers are the
        post-erasure answers (the ledger erases the same assertions by identity), and a value
        written after the erasure is not erased."""
        later = [{"clock": 400, "operations": [assert_op("ssn3", "person:1", SSN, s("555-00-1111"), entity_type="Person")]}]
        rep = erasure_eval([{"id": "all", "kind": "assertions"}], extra=later)
        values = {r["id"]: r["value"] for r in result(rep, "all")["assertions"] if r["attribute"] == SSN}
        self.assertEqual(values, {"ssn1": marker(300), "ssn2": marker(300), "ssn3": s("555-00-1111")})

    def test_ER_RESTORE_PRE_BACKUP(self):
        """Restore from a pre-erasure backup replays the ledger: the expected answer at the
        backup's basis (P2) is the marker, never the backed-up value."""
        rep = erasure_eval([match_q("backup", 2, recordedAt=250)])
        self.assertEqual(result(rep, "backup")["raw"][0]["value"], marker(300))

    def test_ER_ORACLE_POST(self):
        rep = erasure_eval([{"id": "g", "kind": "get", "entityType": "Person", "entityId": "person:1",
                             "cut": {"validAt": 1e15}}])
        props = result(rep, "g")["properties"]
        self.assertEqual((props["ssn"]["value"], props["ssn"]["supports"]), (marker(300), ["ssn2"]))
        self.assertEqual(props["name"]["value"], s("Ann"))

    def test_ER_ORDER_KEY_CHANNEL(self):
        """Q49c: ordering and ranges never read an erased value: a range neither selects nor
        rejects by it, and ORDER BY puts the marker after readable values whatever the
        direction (by assertion id), before missing values (Q52b)."""
        ssn_p2 = [{"clock": 400, "operations": [assert_op("ssn3", "person:2", SSN, s("222"), entity_type="Person")]}]
        find = lambda qid, **kw: dict({"id": qid, "kind": "find", "entityType": "Person", "cut": {"validAt": 1e15}}, **kw)
        rep = erasure_eval([find("asc", orderBy=[{"prop": "ssn"}]), find("desc", orderBy=[{"prop": "ssn", "direction": "desc"}]),
                            find("gt", where=[{"prop": "ssn", "op": "gt", "value": s("0")}]),
                            find("ne", where=[{"prop": "ssn", "op": "ne", "value": s("x")}]),
                            find("has", where=[{"prop": "ssn", "op": "exists"}]),
                            find("plain", where=[{"prop": "name", "op": "eq", "value": s("Ann")}])], extra=ssn_p2)
        for qid, want in (("asc", ["person:2", "person:1"]), ("desc", ["person:2", "person:1"]), ("gt", ["person:2"]),
                          ("ne", ["person:2"]), ("has", ["person:1", "person:2"]), ("plain", ["person:1"])):
            self.assertEqual(result(rep, qid)["pages"][0]["ids"], want, qid)
        self.assertEqual(result(rep, "plain")["pages"][0]["entities"][0]["properties"]["ssn"]["value"], marker(300))
        both = erasure_eval([find("o", orderBy=[{"prop": "ssn"}])])      # person:2 has no ssn at all
        self.assertEqual(result(both, "o")["pages"][0]["ids"], ["person:1", "person:2"])   # Q52b: marker, then missing

    def test_ER_LEXICAL_CHANNEL(self):
        """No expected answer carries a copy of the erased value: value patterns over it are
        refused and the complete output document holds no plaintext (M-ERASURE-LEAK)."""
        q = [{"id": "byvalue", "kind": "match", "cut": {"validAt": 1e15},
              "pattern": {"attribute": SSN, "value": s(PLAIN)}},
             {"id": "all", "kind": "assertions"}, {"id": "tx0", "kind": "transaction", "txId": "tx:0"},
             {"id": "h", "kind": "history", "entityId": "person:1"},
             {"id": "chg", "kind": "match", "cut": {"validAt": 1e15}, "pattern": {"attribute": ":_tx/change"}},
             {"id": "jf", "kind": "journalFacts"}]
        rep = erasure_eval(q)
        self.assertEqual(result(rep, "byvalue")["count"], 0)         # Q49c: an erased value matches no pattern
        self.assertNotIn(PLAIN, json.dumps(rep))                     # journal change facts included (Q49a)

    def test_ER_KEY_EXCLUSIVE(self):
        """Key-destruction evidence is O-OBS's; the oracle's side is that the post-erasure
        answer is the same whatever route erased the value: every read shows the marker,
        including the state summary and the journal changes."""
        rep = erasure_eval([])
        state = rep["state"][0]
        self.assertEqual({a["id"]: a["value"] for a in state["assertions"] if a["attribute"] == SSN},
                         {"ssn1": marker(300), "ssn2": marker(300)})
        self.assertEqual(state["transactions"][2]["changes"],
                         [{"op": "erase", "entityId": "person:1", "attribute": SSN, "assertionIds": ["ssn1", "ssn2"]}])

    def test_ER_CURSOR_MODULO(self):
        rep = erasure_eval([{"id": "p", "kind": "entityPage", "entityType": "Person", "limit": 1, "cut": {"validAt": 1e15}},
                            {"id": "c", "kind": "entityPage", "entityType": "Person", "limit": 1,
                             "cursorFrom": {"query": "p"}}])
        control = erasure_eval([{"id": "p", "kind": "entityPage", "entityType": "Person", "limit": 1,
                                 "cut": {"validAt": 1e15}}], erase=False)
        pages = [result(rep, "p")["pages"][0], result(rep, "c")["pages"][0]]
        self.assertEqual([[e["entityId"] for e in p["entities"]] for p in pages], [["person:1"], ["person:2"]])
        # modulo erasure: the page equals the control page with the erased value replaced by its marker
        ctl = result(control, "p")["pages"][0]["entities"][0]["triples"]
        got = pages[0]["entities"][0]["triples"]
        self.assertEqual([dict(t, value=marker(300)) if t["attribute"] == SSN else t for t in ctl], got)

    def test_ER_EXPLAIN_MODULO(self):
        """Explain at a pre-erasure basis shows the marker, not the value (Q24, provisional):
        the as-of rows at P1 and the snapshot helper both carry the marker."""
        rep = erasure_eval([{"id": "h", "kind": "history", "entityId": "person:1", "cut": {"position": 1}},
                            {"id": "snap", "kind": "assertionSnapshot", "mode": "known-at-valid",
                             "cut": {"position": 1, "validAt": 5}, "pattern": {"attribute": SSN}},
                            {"id": "sup", "kind": "valueSupports", "cut": {"position": 1, "validAt": 5},
                             "pattern": {"attribute": SSN}}])
        self.assertEqual([r["value"] for r in result(rep, "h")["asOfSnapshot"] if r["attribute"] == SSN], [marker(300)])
        self.assertEqual([r["value"] for r in result(rep, "snap")["assertions"]], [marker(300)])
        # Q49c: supports group the erased values of the attribute under the marker
        self.assertEqual(result(rep, "sup")["supports"], [{"entityId": "person:1", "attribute": SSN, "value": marker(300),
                                                           "count": 1, "assertionIds": ["ssn1"]}])

    def test_ER_FRONTIER_OLD_BASIS(self):
        """An old-basis read never passes on the strength of its basis alone."""
        rep = erasure_eval([match_q("old", 1, recordedAt=100), match_q("older", 1, recordedAt=150)])
        self.assertEqual([result(rep, k)["raw"][0]["value"] for k in ("old", "older")], [marker(300)] * 2)

    def test_ER_CACHE_INVALIDATION(self):
        """The same old-basis read: answered before the erasure published (it may be the old
        value), then after it (always the marker)."""
        rep = erasure_eval([dict(match_q("cached", 1), readStart={"afterCommand": 0}), match_q("fresh", 1)])
        self.assertEqual([a["result"]["raw"][0]["value"] for a in result(rep, "cached")["acceptable"]],
                         [s(PLAIN), marker(300)])
        self.assertEqual(result(rep, "fresh")["raw"][0]["value"], marker(300))

    def test_ER_JOURNAL_MODULO(self):
        """Q49a: the erasure commit is an ordinary journaled transaction whose changes list
        identities only; earlier changes and their :_tx/change facts show the marker, so the
        whole journal equals the control journal with erased values replaced by markers."""
        qs = [{"id": "all", "kind": "transactions"}, {"id": "tx2", "kind": "transactionByCommand", "commandId": "erase-1"},
              {"id": "chg", "kind": "match", "cut": {"validAt": 1e15}, "pattern": {"attribute": ":_tx/change"}},
              {"id": "ent", "kind": "transactionsForEntity", "entityId": "person:1"},
              {"id": "jf", "kind": "journalFacts", "txId": "tx:2"}]
        cmds = erasure_commands()
        cmds[2]["meta"] = {"commandId": "erase-1"}
        rep = evaluate(case(cmds, qs, schemas=PERSON_SCHEMA))
        control = erasure_eval([{"id": "all", "kind": "transactions"}], erase=False)
        records = result(rep, "all")["transactions"]
        erase_change = {"op": "erase", "entityId": "person:1", "attribute": SSN, "assertionIds": ["ssn1", "ssn2"]}
        self.assertEqual((records[2]["txId"], records[2]["changes"], records[2]["changedEntities"]),
                         ("tx:2", [erase_change], ["person:1"]))
        self.assertEqual(result(rep, "tx2")["changes"], [erase_change])

        def modulo(record):
            return dict(record, changes=[dict(c, value=marker(300)) if c.get("attribute") == SSN else c
                                         for c in record["changes"]])
        self.assertEqual(records[:2], [modulo(r) for r in result(control, "all")["transactions"][:2]])
        facts = result(rep, "chg")["raw"]
        self.assertEqual(len(facts), 6)                                 # 3 + 2 + the erasure's one change
        ssn_facts = [f["value"]["value"] for f in facts if f["value"]["value"].get("attribute") == SSN
                     and f["value"]["value"]["op"] != "erase"]
        self.assertEqual([v["value"] for v in ssn_facts], [marker(300)] * 3)
        self.assertEqual([r["txId"] for r in result(rep, "ent")["transactions"]], ["tx:2", "tx:1", "tx:0"])
        self.assertEqual(sorted(f["attribute"] for f in result(rep, "jf")["facts"]), [":_tx/change", ":_tx/changed-entity"])

    def test_ER_RAW_NATIVE_MODULO(self):
        rep = erasure_eval([{"id": "et", "kind": "entityTriples", "entityId": "person:1", "cut": {"validAt": 1e15}},
                            {"id": "snap", "kind": "assertionSnapshot", "cut": {"validAt": 1e15},
                             "pattern": {"entityId": "person:1"}}])
        self.assertEqual({r["id"]: r["value"] for r in result(rep, "et")["raw"]}, {"name1": s("Ann"), "ssn2": marker(300)})
        self.assertEqual({r["id"]: r["value"] for r in result(rep, "snap")["assertions"]},
                         {"name1": s("Ann"), "ssn2": marker(300)})

    def test_ER_SDK_MODULO(self):
        rep = erasure_eval([{"id": "tl", "kind": "timeline", "entityType": "Person", "prop": "ssn",
                             "entityId": "person:1", "cut": {}},
                            {"id": "many", "kind": "getMany", "entityType": "Person",
                             "entityIds": ["person:1", "person:2"], "cut": {"validAt": 1e15}},
                            {"id": "n", "kind": "count", "entityType": "Person", "cut": {"validAt": 1e15},
                             "where": [{"prop": "name", "op": "exists"}]}])
        self.assertEqual([(r["identity"], r["value"]) for r in result(rep, "tl")["assertions"]],
                         [("ssn1", marker(300)), ("ssn2", marker(300))])
        self.assertEqual(result(rep, "many")[0]["properties"]["ssn"]["value"], marker(300))
        self.assertEqual(result(rep, "n")["total"], 2)

    # rules of the erase command itself (R-ERA-2, R-ERA-3)

    def test_erase_op_forms_and_validation(self):
        cmds = [{"clock": 100, "operations": [assert_op("a", "e1", ":x/s", s("one")), assert_op("b", "e1", ":x/t", s("two")),
                                              assert_op("c", "e2", ":x/s", s("three"))]},
                {"clock": 200, "operations": [{"op": "erase", "target": "a"}]},
                {"clock": 300, "operations": [{"op": "erase", "entityId": "e2"}]},
                {"clock": 400, "operations": [{"op": "erase", "entityId": "e1"}]},      # a already erased at 200
                {"clock": 500, "operations": [{"op": "erase", "entityId": "nobody"}]},  # nothing to erase: commits
                {"clock": 600, "operations": [{"op": "erase", "entityId": "_triplex/x"}]},
                {"clock": 700, "operations": [{"op": "erase", "entityId": "e1", "value": s("x")}]},
                {"clock": 800, "operations": [{"op": "erase", "id": "missing"}]}]
        rep = evaluate(case(cmds, [{"id": "all", "kind": "assertions"}, {"id": "cat", "kind": "cutCatalog"}]))
        self.assertEqual([outcome(rep, k).get("error") for k in range(8)],
                         [None, None, None, None, None, "E-RESERVED", "E-INVALID-VALUE", "E-INVALID-VALUE"])
        self.assertEqual({r["id"]: r["value"] for r in result(rep, "all")["assertions"]},
                         {"a": marker(200), "b": marker(400), "c": marker(300)})    # the first erasure names erasedAt
        self.assertEqual([r.get("erasure", False) for r in result(rep, "cat")], [False, True, True, True, True])

    def test_ER_ERASE_COMMAND_SHAPE(self):
        """Q52g: the op is spelled `erase`; `erasure` is a typed invalid-command error, and so
        is an erase mixed with other operations or given preconditions (E-INVALID-VALUE, the
        ACC 4.7 row for an operation fault, R-CMD-9 / Q33f). A rejected command changes nothing."""
        write = {"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("v"))]}
        bad = [{"clock": 2, "operations": [assert_op("b", "e", ":x/t", s("w")), {"op": "erase", "target": "a"}]},
               {"clock": 3, "operations": [{"op": "erasure", "entityId": "e"}]},
               {"clock": 4, "operations": [{"op": "erase", "entityId": "e"}],
                "meta": {"preconditions": [{"_tag": "EntityState", "entityId": "e", "targets": ["a"]}]}},
               {"clock": 5, "operations": [{"op": "erase", "entityId": "e"}, {"op": "erase", "target": "a"}]}]
        rep = evaluate(case([write] + bad, [{"id": "all", "kind": "assertions"}]))
        for k in (1, 2, 3):
            got = outcome(rep, k)
            self.assertEqual((got["outcome"], got["error"]) + err_fields(got),
                             ("rejected", "E-INVALID-VALUE", "InvalidTripleError", "invalid-value"), k)
        self.assertEqual(outcome(rep, 4)["outcome"], "committed")            # erase operations only: one command
        self.assertEqual([(r["id"], r["value"]) for r in result(rep, "all")["assertions"]], [("a", marker(5))])

    def test_writes_after_erasure(self):
        """Identity-based writes still work; Q49c: an erased value matches no retract pattern."""
        rep = erasure_eval([{"id": "tx3", "kind": "transaction", "txId": "tx:3"}, {"id": "tx4", "kind": "transaction",
                                                                                     "txId": "tx:4"}], extra=[
            {"clock": 400, "operations": [{"op": "retract", "target": "ssn2"}]},
            {"clock": 500, "operations": [{"op": "retract-pattern", "pattern": {"attribute": SSN, "value": s(PLAIN)}}]},
            {"clock": 600, "operations": [assert_op("n2", "person:1", NAME, s("Ann B"), entity_type="Person")],
             "meta": {"enforce": {"constraints": [{"_tag": "Required", "v": 1, "entityType": "Person",
                                                   "attribute": NAME}]}}}])
        self.assertEqual([outcome(rep, k)["outcome"] for k in (3, 4, 5)], ["committed"] * 3)
        self.assertEqual(result(rep, "tx3")["changes"][0]["value"], marker(300))
        self.assertEqual(result(rep, "tx4")["changes"], [])            # the pattern matched nothing

    def test_value_dependent_reads_follow_q49c(self):
        """Q49c on models, aggregates, timelines and reachability."""
        later = [{"clock": 400, "operations": [assert_op("ssn3", "person:1", SSN, s("555"), entity_type="Person")]}]
        rep = erasure_eval([{"id": "g", "kind": "get", "entityType": "Person", "entityId": "person:1",
                             "cut": {"validAt": 1e15}},
                            {"id": "agg", "kind": "aggregate", "cut": {"validAt": 1e15},
                             "match": {"attributes": {"v": SSN}}, "aggregates": [{"op": "count", "var": "v", "as": "n"},
                                                                                {"op": "min", "var": "v", "as": "lo"}]},
                            {"id": "grp", "kind": "aggregate", "cut": {"validAt": 1e15},
                             "match": {"attributes": {"v": SSN}}, "groupBy": ["v"],
                             "aggregates": [{"op": "count", "var": "$entity", "as": "n"}]},
                            {"id": "mt", "kind": "modelTimeline", "entityType": "Person", "entityId": "person:1",
                             "cut": {"validAt": 1e15}},
                            {"id": "reach", "kind": "reachability", "cut": {"validAt": 1e15}, "attribute": SSN,
                             "from": "person:1"}], extra=later)
        # a readable value and the marker group are two values of a cardinality-one attribute: a conflict
        self.assertEqual(result(rep, "g")["error"], "E-CONFLICTING-VALUES")
        row = result(rep, "agg")["rows"][0]
        self.assertEqual((row["n"]["value"], row["lo"]["value"]), ("2", "555"))     # COUNT counts it; MIN skips it
        self.assertEqual([r["v"] for r in result(rep, "grp")["rows"]], [s("555"), marker(300)])
        self.assertEqual([e["position"] for e in result(rep, "mt")], [1, 2, 3, 4])   # the erasure is an entry
        self.assertEqual(result(rep, "mt")[2]["model"]["properties"]["ssn"]["value"], marker(300))
        self.assertEqual(result(rep, "reach")["closure"], ["555"])                   # the erased edge is not followed

    def test_ER_AGGREGATE_SKIP_COUNT(self):
        """Q49c: SUM, AVG, MIN and MAX skip an erased value while COUNT counts it; a value
        filter neither selects nor rejects it."""
        pay = [{"clock": 1, "operations": [assert_op(f"p{k}", f"w{k}", ":w/pay", i64(v)) for k, v in enumerate((10, 20, 30))]},
               {"clock": 2, "operations": [{"op": "erase", "target": "p2"}]}]
        q = {"id": "a", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":w/pay"}},
             "aggregates": [{"op": "sum", "var": "v", "as": "sum"}, {"op": "max", "var": "v", "as": "hi"},
                            {"op": "count", "var": "v", "as": "n"}]}
        row = result(evaluate(case(pay, [q])), "a")["rows"][0]
        self.assertEqual((row["sum"]["value"], row["hi"]["value"], row["n"]["value"]), ("30", "20", "3"))
        where = dict(q, id="w", where=[{"var": "v", "op": "gte", "value": i64(0)}],
                     aggregates=[{"op": "sum", "var": "v", "as": "sum"}])
        self.assertEqual(result(evaluate(case(pay, [where])), "w")["rows"][0]["sum"]["value"], "30")

    def test_ER_REFERENCE_MARKER(self):
        """Q49c: an erased reference cannot be followed; an include returns the marker and a
        reverse include does not find the referring entity."""
        schema = [{"version": 1, "entityTypes": {"P": {"attributes": {"org": {"attribute": ":p/org", "type": "ref",
                                                                              "target": "Org"}}},
                                                 "Org": {"attributes": {"name": {"attribute": ":o/name", "type": "string"}}}}}]
        cmds = [{"clock": 1, "operations": [assert_op("o", "p1", ":p/org", ref("org:1"), entity_type="P"),
                                            assert_op("n", "org:1", ":o/name", s("Acme"), entity_type="Org")]},
                {"clock": 2, "operations": [{"op": "erase", "target": "o"}]}]
        rep = evaluate(case(cmds, [{"id": "g", "kind": "get", "entityType": "P", "entityId": "p1", "include": ["org"],
                                    "cut": {"validAt": 1}},
                                   {"id": "rev", "kind": "get", "entityType": "Org", "entityId": "org:1",
                                    "include": [{"reverse": {"type": "P", "prop": "org", "name": "members"}}],
                                    "cut": {"validAt": 1}}], schemas=schema))
        self.assertEqual(result(rep, "g")["includes"]["org"], marker(2))
        self.assertEqual(result(rep, "rev")["includes"]["members"], [])

    def test_ER_IDEMPOTENT_REERASE(self):
        """Q49b: the first erasure of an identity sets erasedAt; erasing it again commits and
        changes nothing (an empty change list, the marker keeps the first instant)."""
        cmds = [{"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("v"))]},
                {"clock": 2, "operations": [{"op": "erase", "target": "a"}]},
                {"clock": 3, "operations": [{"op": "erase", "target": "a"}]},
                {"clock": 4, "operations": [{"op": "erase", "entityId": "e"}]}]
        rep = evaluate(case(cmds, [{"id": "all", "kind": "transactions"}, {"id": "m", "kind": "assertions"}]))
        self.assertEqual([outcome(rep, k)["outcome"] for k in (2, 3)], ["committed"] * 2)
        self.assertEqual([r["changes"] for r in result(rep, "all")["transactions"][1:]],
                         [[{"op": "erase", "entityId": "e", "attribute": ":x/s", "assertionIds": ["a"]}], [], []])
        self.assertEqual(result(rep, "m")["assertions"][0]["value"], marker(2))

    def test_ER_EMPTY_ERASURE_RECORD(self):
        """Q49b / Q56a: an erase whose well-formed selector matches nothing still commits a
        journal record with an empty change list."""
        cmds = [{"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("v"))]},
                {"clock": 2, "operations": [{"op": "erase", "entityId": "nobody"}]},
                {"clock": 3, "operations": [{"op": "erase", "entityId": "e", "attribute": ":x/none"}]}]
        rep = evaluate(case(cmds, [{"id": "all", "kind": "transactions"}, {"id": "cat", "kind": "cutCatalog"}]))
        self.assertEqual([outcome(rep, k)["outcome"] for k in (1, 2)], ["committed"] * 2)
        records = result(rep, "all")["transactions"]
        self.assertEqual([(r["txId"], r["changes"]) for r in records[1:]], [("tx:1", []), ("tx:2", [])])
        self.assertEqual([r.get("erasure", False) for r in result(rep, "cat")], [False, True, True])

    def test_inflight_computed_answers_are_whole(self):
        """Q52e (replacing 0.4.1's refusals): a computed answer over an in-flight value is one
        of the two whole answers, never a mix, so a value pattern and value supports list both."""
        rep = erasure_eval([dict(match_q("pat", 1), readStart={"afterCommand": 1},
                                 pattern={"attribute": SSN, "value": s(PLAIN)}),
                            {"id": "sup", "kind": "valueSupports", "cut": {"position": 1, "validAt": 5},
                             "pattern": {"attribute": SSN}, "readStart": {"afterCommand": 1}}])
        self.assertEqual([a["result"]["count"] for a in result(rep, "pat")["acceptable"]], [1, 0])
        self.assertEqual([a["result"]["supports"][0]["value"] for a in result(rep, "sup")["acceptable"]],
                         [s(PLAIN), marker(300)])

    # CS-ERASURE cases added by contracts 0.3.7 to 0.3.9 (RULINGS Q49, Q52, Q56)

    def test_ER_LOG_CRYPTO_SHRED(self):
        """Crypto-shredding evidence is O-OBS's (Q58e); the oracle's side is the post-erasure
        answer, which holds no copy of the value anywhere in the output document."""
        rep = erasure_eval([{"id": "all", "kind": "assertions"}, {"id": "jf", "kind": "journalFacts"},
                            {"id": "h", "kind": "history", "entityId": "person:1"}])
        self.assertNotIn(PLAIN, json.dumps(rep))
        self.assertEqual({a["id"]: a["value"] for a in rep["state"][0]["assertions"] if a["attribute"] == SSN},
                         {"ssn1": marker(300), "ssn2": marker(300)})

    def test_ER_COMMIT_JOURNAL_IDENTITY_ONLY(self):
        """Q49a: an erasure commit has a position, a txId, a record in transactions() and its own
        :_tx/ facts, and its changes list identities only, never values."""
        rep = erasure_eval([{"id": "all", "kind": "transactions"}, {"id": "jf", "kind": "journalFacts", "txId": "tx:2"},
                            {"id": "cat", "kind": "cutCatalog"}])
        record = result(rep, "all")["transactions"][2]
        self.assertEqual((record["txId"], record["position"]), ("tx:2", 3))
        self.assertEqual(record["changes"], [{"op": "erase", "entityId": "person:1", "attribute": SSN,
                                              "assertionIds": ["ssn1", "ssn2"]}])
        changes = [f["value"]["value"] for f in result(rep, "jf")["facts"] if f["attribute"] == ":_tx/change"]
        self.assertEqual(changes, [{"op": "erase", "entityId": "person:1", "attribute": SSN, "assertionIds": ["ssn1", "ssn2"]}])
        self.assertEqual(result(rep, "cat")[-1].get("erasure"), True)

    def test_ER_COMMIT_LEDGER(self):
        """Q49a: the erasure is also written to the erasure ledger, which restore and rebuild
        replay. The oracle replays the command stream, so the expected answers after a restore
        or rebuild are the post-erasure answers: the commit is found by its command id and
        every basis, those before it included, shows the marker."""
        cmds = erasure_commands()
        cmds[2]["meta"] = {"commandId": "erase-1"}
        rep = evaluate(case(cmds, [{"id": "tx", "kind": "transactionByCommand", "commandId": "erase-1"},
                                   match_q("p1", 1), match_q("p2", 2)], schemas=PERSON_SCHEMA))
        self.assertEqual((result(rep, "tx")["txId"], result(rep, "tx")["position"]), ("tx:2", 3))
        self.assertEqual([result(rep, k)["raw"][0]["value"] for k in ("p1", "p2")], [marker(300)] * 2)

    def test_ER_EARLIER_CHANGE_MARKER(self):
        """Q49a: earlier transactions' changes and :_tx/change facts for erased values show the
        marker; other values are unchanged."""
        rep = erasure_eval([{"id": "tx0", "kind": "transaction", "txId": "tx:0"},
                            {"id": "chg", "kind": "match", "cut": {"validAt": 1e15}, "pattern": {"attribute": ":_tx/change"}}])
        values ={(c["attribute"], c["entityId"]): c["value"] for c in result(rep, "tx0")["changes"]}
        self.assertEqual(values, {(SSN, "person:1"): marker(300), (NAME, "person:1"): s("Ann"), (NAME, "person:2"): s("Bo")})
        ssn = [f["value"]["value"]["value"] for f in result(rep, "chg")["raw"]
               if f["value"]["value"].get("attribute") == SSN and f["value"]["value"]["op"] != "erase"]
        self.assertEqual(ssn, [marker(300)] * 3)

    def test_ER_PREDICATE_NO_MATCH(self):
        """Q49c: an erased value matches no value predicate (equality, inequality, range,
        pattern), so a filter never selects or rejects a subject by it."""
        find = lambda qid, op, v: {"id": qid, "kind": "find", "entityType": "Person", "cut": {"validAt": 1e15},
                                   "where": [{"prop": "ssn", "op": op, "value": s(v)}]}
        rep = erasure_eval([dict(match_q("pat"), pattern={"attribute": SSN, "value": s("987-65-4321")}),
                            find("eq", "eq", "987-65-4321"), find("ne", "ne", "x"), find("gt", "gt", "0"),
                            {"id": "tx3", "kind": "transaction", "txId": "tx:3"}],
                           extra=[{"clock": 400, "operations": [{"op": "retract-pattern",
                                                                 "pattern": {"attribute": SSN, "value": s("987-65-4321")}}]}])
        self.assertEqual(result(rep, "pat")["count"], 0)
        self.assertEqual([result(rep, k)["pages"][0]["ids"] for k in ("eq", "ne", "gt")], [[], [], []])
        self.assertEqual(result(rep, "tx3")["changes"], [])

    def test_ER_ORDER_MARKERS_LAST(self):
        """Q49c: ORDER BY puts erased markers after the readable values in both directions,
        in assertion id order among themselves."""
        extra = [{"clock": 400, "operations": [assert_op("ssn3", "person:3", SSN, s("333"), entity_type="Person"),
                                               assert_op("ssn4", "person:4", SSN, s("444"), entity_type="Person"),
                                               assert_op("ssn0", "person:0", SSN, s("000"), entity_type="Person")]},
                 {"clock": 500, "operations": [{"op": "erase", "target": "ssn0"}]}]
        find = lambda qid, d: {"id": qid, "kind": "find", "entityType": "Person", "cut": {"validAt": 1e15},
                               "where": [{"prop": "ssn", "op": "exists"}], "orderBy": [{"prop": "ssn", "direction": d}]}
        rep = erasure_eval([find("asc", "asc"), find("desc", "desc")], extra=extra)
        self.assertEqual(result(rep, "asc")["pages"][0]["ids"], ["person:3", "person:4", "person:0", "person:1"])
        self.assertEqual(result(rep, "desc")["pages"][0]["ids"], ["person:4", "person:3", "person:0", "person:1"])

    def test_ER_GROUP_ONE_MARKER(self):
        """Q49c: grouping puts all erased values of an attribute in one group keyed by the
        marker, across entities."""
        extra = [{"clock": 400, "operations": [assert_op("ssn3", "person:2", SSN, s("555"), entity_type="Person"),
                                               assert_op("ssn4", "person:3", SSN, s("444"), entity_type="Person")]},
                 {"clock": 500, "operations": [{"op": "erase", "target": "ssn4"}]}]
        rep = erasure_eval([{"id": "grp", "kind": "aggregate", "cut": {"validAt": 1e15}, "match": {"attributes": {"v": SSN}},
                             "groupBy": ["v"], "aggregates": [{"op": "count", "var": "$entity", "as": "n"}]}], extra=extra)
        self.assertEqual([(r["v"], r["n"]["value"]) for r in result(rep, "grp")["rows"]],
                         [(s("555"), "1"), (marker(300), "2")])

    def test_ER_UNIQUE_IGNORES(self):
        """Q49c: Unique ignores erased values: a write equal to the erased value commits (the
        control without the erasure is a unique violation)."""
        unique = {"enforce": {"constraints": [{"_tag": "Unique", "v": 1, "entityType": "Person", "attribute": SSN}]}}
        extra = [{"clock": 700, "operations": [assert_op("ssn9", "person:2", SSN, s("987-65-4321"), entity_type="Person")],
                  "meta": unique}]
        self.assertEqual(outcome(erasure_eval([], extra=extra), 3)["outcome"], "committed")
        control = outcome(erasure_eval([], extra=extra, erase=False), 3)
        self.assertEqual((control["outcome"], control["error"], control["reason"]), ("rejected", "E-CONSTRAINT", "unique"))

    def test_ER_ERASE_UNKNOWN_TARGET(self):
        """Q56a: an erase naming an unknown assertion target or an unknown id is E-INVALID-VALUE,
        as for retract; a well-formed selector with nothing to erase commits (Q49b)."""
        cmds = [{"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("v"))]},
                {"clock": 2, "operations": [{"op": "erase", "target": "missing"}]},
                {"clock": 3, "operations": [{"op": "erase", "id": "missing"}]},
                {"clock": 4, "operations": [{"op": "retract", "target": "missing"}]},
                {"clock": 5, "operations": [{"op": "erase", "entityId": "nobody"}]}]
        rep = evaluate(case(cmds))
        self.assertEqual([outcome(rep, k).get("error") for k in (1, 2, 3)], ["E-INVALID-VALUE"] * 3)
        self.assertEqual(outcome(rep, 4)["outcome"], "committed")

    def test_ER_ERASE_BY_ID(self):
        """Q56f: erase accepts retract's `{"id": ...}` selector (the system-generated assertion
        id) and erases that one assertion."""
        cmds = [{"clock": 1, "operations": [assert_op("a", "e1", ":x/s", s("one")), assert_op("b", "e1", ":x/t", s("two"))]},
                {"clock": 2, "operations": [{"op": "erase", "id": "b"}]}]
        rep = evaluate(case(cmds, [{"id": "all", "kind": "assertions"}, {"id": "tx", "kind": "transaction", "txId": "tx:1"}]))
        self.assertEqual({r["id"]: r["value"] for r in result(rep, "all")["assertions"]}, {"a": s("one"), "b": marker(2)})
        self.assertEqual(result(rep, "tx")["changes"], [{"op": "erase", "entityId": "e1", "attribute": ":x/t",
                                                         "assertionIds": ["b"]}])

    def test_ER_RETRACT_AFTER_ERASE(self):
        """Q56g: retracting an erased assertion by target commits; history shows the marker
        with the retraction's time, so erase then delete is a supported flow."""
        rep = erasure_eval([{"id": "h", "kind": "history", "entityId": "person:1"},
                            {"id": "tx3", "kind": "transaction", "txId": "tx:3"}],
                           extra=[{"clock": 400, "operations": [{"op": "retract", "target": "ssn2"}]}])
        self.assertEqual(outcome(rep, 3)["outcome"], "committed")
        row = [r for r in result(rep, "h")["rawLifetime"] if r["id"] == "ssn2"][0]
        self.assertEqual((row["value"], row["retractedAt"]), (marker(300), 400))
        self.assertEqual(result(rep, "tx3")["changes"][0]["value"], marker(300))

    def test_ER_CARD_ONE_READABLE_AND_ERASED(self):
        """Q56b: an erased value is still a present assertion, so a card-one attribute with a
        readable and an erased value conflicts; retracting the erased assertion is the remedy."""
        later = [{"clock": 400, "operations": [assert_op("ssn3", "person:1", SSN, s("555"), entity_type="Person")]}]
        get = {"id": "g", "kind": "get", "entityType": "Person", "entityId": "person:1", "cut": {"validAt": 1e15}}
        self.assertEqual(result(erasure_eval([get], extra=later), "g")["error"], "E-CONFLICTING-VALUES")
        fixed = later + [{"clock": 500, "operations": [{"op": "retract", "target": "ssn2"}]}]
        props = result(erasure_eval([get], extra=fixed), "g")["properties"]
        self.assertEqual((props["ssn"]["value"], props["ssn"]["supports"]), (s("555"), ["ssn3"]))

    def test_ER_EQUAL_SUPPORT_ERASED_CONFLICTS(self):
        """Q56c: answers after an erasure never depend on the erased value: with a readable
        "SAME" and an erased support the read conflicts, though it read "SAME" before."""
        cmds = [{"clock": 1, "operations": [assert_op("a", "person:1", NAME, s("SAME"), entity_type="Person"),
                                            assert_op("b", "person:1", NAME, s("SAME"), entity_type="Person")]},
                {"clock": 2, "operations": [{"op": "erase", "target": "b"}]}]
        get = {"id": "g", "kind": "get", "entityType": "Person", "entityId": "person:1", "cut": {"validAt": 1}}
        self.assertEqual(result(evaluate(case(cmds, [get], schemas=PERSON_SCHEMA)), "g")["error"], "E-CONFLICTING-VALUES")
        before = result(evaluate(case(cmds[:1], [get], schemas=PERSON_SCHEMA)), "g")["properties"]["name"]
        self.assertEqual((before["value"], before["supports"]), (s("SAME"), ["a", "b"]))

    def test_ER_CARD_MANY_MARKERS_LAST(self):
        """Q56d: in a card-many value list the erased marker comes after the readable elements;
        the attribute's erased values are one marker group (Q49c) with the earliest erasedAt."""
        schema = [{"version": 1, "entityTypes": {"Person": {"attributes": {
            "tags": {"attribute": ":person/tag", "type": "string", "cardinality": "many"}}}}}]
        cmds = [{"clock": 1, "operations": [assert_op(f"t{k}", "person:1", ":person/tag", s(v), entity_type="Person")
                                            for k, v in enumerate(("b", "a", "c", "d"))]},
                {"clock": 2, "operations": [{"op": "erase", "target": "t2"}]},
                {"clock": 3, "operations": [{"op": "erase", "target": "t0"}]}]
        rep = evaluate(case(cmds, [{"id": "g", "kind": "get", "entityType": "Person", "entityId": "person:1",
                                    "cut": {"validAt": 1}}], schemas=schema))
        self.assertEqual(result(rep, "g")["properties"]["tags"]["values"],
                         [{"value": s("a"), "supports": ["t1"]}, {"value": s("d"), "supports": ["t3"]},
                          {"value": marker(2), "supports": ["t0", "t2"]}])

    def test_ER_REQUIRED_SATISFIED(self):
        """Q56e: Required is satisfied by an erased value, because the assertion is present: a
        command that makes person:9 a Person, whose only ssn is erased, commits (the control
        without the ssn is a required violation)."""
        required = {"enforce": {"constraints": [{"_tag": "Required", "v": 1, "entityType": "Person", "attribute": SSN}]}}
        typed = {"clock": 3, "operations": [assert_op("n9", "person:9", NAME, s("Cy"), entity_type="Person")], "meta": required}
        cmds = [{"clock": 1, "operations": [assert_op("s9", "person:9", SSN, s("000-00-0000"))]},
                {"clock": 2, "operations": [{"op": "erase", "target": "s9"}]}, typed]
        self.assertEqual(outcome(evaluate(case(cmds)), 2)["outcome"], "committed")
        control = outcome(evaluate(case([{"clock": 1, "operations": []}, {"clock": 2, "operations": []}, typed])), 2)
        self.assertEqual((control["outcome"], control["error"], control["reason"]), ("rejected", "E-CONSTRAINT", "required"))

    # G9.erasure.residual-shapes (RULINGS Q52, compiled in 0.3.8; Q59a)

    def test_ER_COUNT_DISTINCT_MARKER(self):
        """Q52a: a count of distinct values counts an attribute's erased values as one value
        (the marker group, the same as GROUP BY); a count of assertions counts each erased
        assertion (raw rows, value supports)."""
        cmds = [{"clock": 1, "operations": [assert_op("p0", "w0", ":w/pay", i64(10)), assert_op("p1", "w1", ":w/pay", i64(20)),
                                            assert_op("p2", "w2", ":w/pay", i64(30)), assert_op("p3", "w0", ":w/pay", i64(40))]},
                {"clock": 2, "operations": [{"op": "erase", "target": "p2"}]},
                {"clock": 3, "operations": [{"op": "erase", "entityId": "w0"}]}]
        rep = evaluate(case(cmds, [
            {"id": "n", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":w/pay"}},
             "aggregates": [{"op": "count", "var": "v", "as": "n"}, {"op": "sum", "var": "v", "as": "sum"}]},
            {"id": "raw", "kind": "match", "cut": {"validAt": 1}, "pattern": {"attribute": ":w/pay"}},
            {"id": "sup", "kind": "valueSupports", "cut": {"validAt": 1}, "pattern": {"attribute": ":w/pay"}}]))
        row = result(rep, "n")["rows"][0]
        self.assertEqual((row["n"]["value"], row["sum"]["value"]), ("2", "20"))     # 20 and the marker group
        self.assertEqual(result(rep, "raw")["count"], 4)
        self.assertEqual([(r["entityId"], r["value"], r["count"], r["assertionIds"]) for r in result(rep, "sup")["supports"]],
                         [("w0", marker(3), 2, ["p0", "p3"]), ("w1", i64(20), 1, ["p1"]), ("w2", marker(2), 1, ["p2"])])

    def test_ER_ORDER_ERASED_THEN_MISSING(self):
        """Q52b: ORDER BY puts readable values first, then erased markers by assertion id, then
        missing values, in both directions."""
        extra = [{"clock": 400, "operations": [assert_op("ssn3", "person:3", SSN, s("333"), entity_type="Person"),
                                               assert_op("ssn5", "person:5", SSN, s("555"), entity_type="Person"),
                                               assert_op("ssn4", "person:4", SSN, s("444"), entity_type="Person")]},
                 {"clock": 500, "operations": [{"op": "erase", "target": "ssn4"}]}]
        find = lambda qid, d: {"id": qid, "kind": "find", "entityType": "Person", "cut": {"validAt": 1e15},
                               "orderBy": [{"prop": "ssn", "direction": d}]}
        rep = erasure_eval([find("asc", "asc"), find("desc", "desc")], extra=extra)
        # person:1's marker group is {ssn2} (ssn1 is retracted at the latest basis), person:4's {ssn4}
        self.assertEqual(result(rep, "asc")["pages"][0]["ids"], ["person:3", "person:5", "person:1", "person:4", "person:2"])
        self.assertEqual(result(rep, "desc")["pages"][0]["ids"], ["person:5", "person:3", "person:1", "person:4", "person:2"])

    def test_ER_GROUP_EARLIEST_ERASEDAT(self):
        """Q52c: a marker group reports the earliest erasedAt among its members: across
        entities (GROUP BY), within one entity (value supports, a card-one model)."""
        schema = [{"version": 1, "entityTypes": {"T": {"attributes": {"s": {"attribute": ":x/s", "type": "string"}}}}}]
        cmds = [{"clock": 1, "operations": [assert_op("a", "e1", ":x/s", s("one"), entity_type="T"),
                                            assert_op("d", "e1", ":x/s", s("uno"), entity_type="T"),
                                            assert_op("b", "e2", ":x/s", s("two"), entity_type="T"),
                                            assert_op("c", "e3", ":x/s", s("three"), entity_type="T")]},
                {"clock": 2, "operations": [{"op": "erase", "target": "b"}]},
                {"clock": 3, "operations": [{"op": "erase", "target": "d"}]},
                {"clock": 4, "operations": [{"op": "erase", "target": "a"}]}]
        rep = evaluate(case(cmds, [
            {"id": "grp", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":x/s"}},
             "groupBy": ["v"], "aggregates": [{"op": "count", "var": "$entity", "as": "n"}]},
            {"id": "sup", "kind": "valueSupports", "cut": {"validAt": 1}, "pattern": {"entityId": "e1"}},
            {"id": "g", "kind": "get", "entityType": "T", "entityId": "e1", "cut": {"validAt": 1}}], schemas=schema))
        self.assertEqual([(r["v"], r["n"]["value"]) for r in result(rep, "grp")["rows"]],
                         [(s("three"), "1"), (marker(2), "2")])
        self.assertEqual([(r["value"], r["assertionIds"]) for r in result(rep, "sup")["supports"]], [(marker(3), ["a", "d"])])
        prop = result(rep, "g")["properties"]["s"]
        self.assertEqual((prop["value"], prop["supports"]), (marker(3), ["a", "d"]))

    def test_ER_REFERENCE_CONSTRAINT_SKIPPED(self):
        """Q52d: an erased reference takes no part in reference constraints: removing the
        target's membership commits under ReferenceTarget although an erased reference points
        at it, while a readable reference to it still rejects. (The oracle models no delete
        cascade or restrict rules, so those halves of Q52d are the lanes'.)"""
        schema = [{"version": 1, "entityTypes": {"P": {"attributes": {"org": {"attribute": ":p/org", "type": "ref"}}},
                                                 "Org": {"attributes": {"name": {"attribute": ":o/name", "type": "string"}}}}}]
        rule = {"enforce": {"constraints": [{"_tag": "ReferenceTarget", "v": 1, "entityType": "P", "attribute": ":p/org",
                                             "targetEntityType": "Org"}]}}
        setup = {"clock": 1, "operations": [assert_op("o", "p1", ":p/org", ref("org:1"), entity_type="P"),
                                            assert_op("n", "org:1", ":o/name", s("Acme"), entity_type="Org")]}
        drop = {"clock": 3, "operations": [{"op": "retract", "target": "n"}], "meta": rule}
        erased = evaluate(case([setup, {"clock": 2, "operations": [{"op": "erase", "target": "o"}]}, drop], schemas=schema))
        self.assertEqual(outcome(erased, 2)["outcome"], "committed")
        control = outcome(evaluate(case([setup, {"clock": 2, "operations": []}, drop], schemas=schema)), 2)
        self.assertEqual((control["outcome"], control["error"], control["reason"]), ("rejected", "E-CONSTRAINT", "reference-target"))
        readable = {"clock": 1, "operations": setup["operations"] + [assert_op("o2", "p2", ":p/org", ref("org:1"), entity_type="P")]}
        both = outcome(evaluate(case([readable, {"clock": 2, "operations": [{"op": "erase", "target": "o"}]}, drop],
                                     schemas=schema)), 2)
        self.assertEqual((both["outcome"], both["reason"]), ("rejected", "reference-target"))
        self.assertEqual([v["subject"] for v in both["violations"]], ["p2"])          # p1's erased reference is skipped
        # a write under the rule with an erased dangling reference in the pre-state commits too
        dangling = [{"clock": 1, "operations": [assert_op("o", "p1", ":p/org", ref("org:9"), entity_type="P")]},
                    {"clock": 2, "operations": [{"op": "erase", "target": "o"}]},
                    {"clock": 3, "operations": [assert_op("x", "p3", ":p/org", ref("org:1"), entity_type="P"),
                                                assert_op("y", "org:1", ":o/name", s("Acme"), entity_type="Org")], "meta": rule}]
        self.assertEqual(outcome(evaluate(case(dangling, schemas=schema)), 2)["outcome"], "committed")

    def test_ER_INFLIGHT_ALL_OR_NONE(self):
        """Q52e: an erasure commit is atomic for readers. A read that started before a commit
        erasing several values published lists exactly two whole answers, all old or all
        markers, never a mix; a read the commit does not change has one answer; with two
        commits in flight each is seen whole and in position order, so the answers are the
        three prefixes (Q66a)."""
        cmds = erasure_commands()
        cmds[2]["operations"] = [{"op": "erase", "entityId": "person:1"}]        # ssn1, ssn2 and name1 in one commit
        before = {"readStart": {"afterCommand": 1}}
        rows = dict(match_q("rows"), pattern={"entityId": "person:1"}, **before)
        find = dict({"id": "find", "kind": "find", "entityType": "Person", "cut": {"validAt": 1e15},
                     "where": [{"prop": "name", "op": "eq", "value": s("Ann")}]}, **before)
        other = dict(match_q("other"), pattern={"entityId": "person:2"}, **before)
        rep = evaluate(case(cmds, [rows, find, other], schemas=PERSON_SCHEMA))
        node = result(rep, "rows")
        self.assertTrue(node["rule"].startswith("ER-INFLIGHT-ALL-OR-NONE"))
        self.assertEqual([(a["erasuresSeen"], [r["value"] for r in a["result"]["raw"]]) for a in node["acceptable"]],
                         [([], [s("Ann"), s("987-65-4321")]), (["tx:2"], [marker(300), marker(300)])])
        self.assertEqual([a["result"]["pages"][0]["ids"] for a in result(rep, "find")["acceptable"]], [["person:1"], []])
        self.assertEqual([r["value"] for r in result(rep, "other")["raw"]], [s("Bo")])     # one answer: a plain result
        two = cmds + [{"clock": 400, "operations": [{"op": "erase", "entityId": "person:2"}]}]
        names = dict(match_q("names", attribute=NAME), **before)
        node = result(evaluate(case(two, [names], schemas=PERSON_SCHEMA)), "names")
        self.assertEqual([(a["erasuresSeen"], [r["value"] for r in a["result"]["raw"]]) for a in node["acceptable"]],
                         [([], [s("Ann"), s("Bo")]), (["tx:2"], [marker(300), s("Bo")]),
                          (["tx:2", "tx:3"], [marker(300), marker(400)])])

    def test_Q66a_inflight_prefixes_only(self):
        """Q66a (V-O04d F5): erasure commits become visible in position order, so a read that
        started before n of them has the n + 1 prefixes as its answers, never another subset;
        a read that started after the first has the prefixes of the rest."""
        base = [{"clock": 100, "operations": [assert_op(f"e{k}", f"p{k}", ":w/pay", i64(v)) for k, v in ((1, 1), (2, 2), (3, 4))]}]
        erases = [{"clock": 200 + 10 * k, "operations": [{"op": "erase", "entityId": f"p{k}", "attribute": ":w/pay"}]}
                  for k in (1, 2, 3)]

        def sums(n, after):
            q = {"id": "sum", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":w/pay"}},
                 "aggregates": [{"op": "sum", "var": "v", "as": "x"}], "readStart": {"afterCommand": after}}
            node = result(evaluate(case(base + erases[:n], [q])), "sum")
            return [(a["erasuresSeen"], a["result"]["rows"][0]["x"] and a["result"]["rows"][0]["x"]["value"])
                    for a in node["acceptable"]]
        self.assertEqual(sums(2, 0), [([], "7"), (["tx:1"], "6"), (["tx:1", "tx:2"], "4")])
        self.assertEqual(sums(3, 0), [([], "7"), (["tx:1"], "6"), (["tx:1", "tx:2"], "4"), (["tx:1", "tx:2", "tx:3"], None)])
        self.assertEqual(sums(3, 1), [([], "6"), (["tx:2"], "4"), (["tx:2", "tx:3"], None)])

    def test_Q66b_cursor_continues_per_prefix(self):
        """Q66b (V-O04d F6): a continuation cursor carries the erasure prefix its page was
        computed with, so `cursorFrom` on a read with commits in flight is answered per prefix,
        from that prefix's page, at the pinned basis; the plain result stands when every prefix
        agrees. A continuation of a read with nothing in flight keeps its own read view (the
        other entityPage and cursor tests)."""
        page = lambda qid, **kw: dict({"id": qid, "kind": "entityPage", "entityType": "Person", "limit": 1}, **kw)
        first = page("a", cut={"position": 2, "validAt": 1e15}, readStart={"afterCommand": 1})
        rep = erasure_eval([first, page("b", cursorFrom={"query": "a"})])     # erases person:1's ssn
        triples = [{t["id"]: t["value"] for t in alt["result"]["pages"][0]["entities"][0]["triples"]}
                   for alt in result(rep, "a")["acceptable"]]
        self.assertEqual(triples, [{"name1": s("Ann"), "ssn2": s("987-65-4321")}, {"name1": s("Ann"), "ssn2": marker(300)}])
        b = result(rep, "b")                                              # person:2 does not depend on the erasure
        self.assertEqual(([e["entityId"] for e in b["pages"][0]["entities"]], b["cut"]["position"]), (["person:2"], 2))
        cmds = erasure_commands()
        cmds[2]["operations"] = [{"op": "erase", "target": "name2"}]           # erases person:2's name instead
        rep = evaluate(case(cmds, [first, page("b", cursorFrom={"query": "a"})], schemas=PERSON_SCHEMA))
        self.assertEqual(len(result(rep, "a")["acceptable"]), 2)          # its second page holds person:2's name
        node = result(rep, "b")
        self.assertTrue(node["rule"].startswith("ER-INFLIGHT-ALL-OR-NONE"))
        self.assertEqual([(alt["erasuresSeen"], alt["result"]["pages"][0]["entities"][0]["triples"][0]["value"])
                          for alt in node["acceptable"]], [([], s("Bo")), (["tx:2"], marker(300))])
        self.assertEqual([alt["result"]["cut"]["position"] for alt in node["acceptable"]], [2, 2])
        with self.assertRaises(V.OracleInputError):                       # past the last page: no cursor under any prefix
            evaluate(case(cmds, [first, page("b", cursorFrom={"query": "a"}), page("c", cursorFrom={"query": "b"})],
                          schemas=PERSON_SCHEMA))

    def test_Q70a_continuation_answers_from_the_source_read(self):
        """Q70a (V-O04e F7): every `cursorFrom` continuation answers from the read it continues,
        whether or not that read had commits in flight; its own readStart is never consulted, so
        a page 2 with an earlier readStart cannot reopen a value page 1's read saw erased."""
        cmds = erasure_commands()
        cmds[2]["operations"] = [{"op": "erase", "target": "name2"}]           # person:2's name, on page 2
        page = lambda qid, **kw: dict({"id": qid, "kind": "entityPage", "entityType": "Person", "limit": 1}, **kw)
        rep = evaluate(case(cmds, [page("a", cut={"position": 2, "validAt": 1e15}),
                                   page("b", cursorFrom={"query": "a"}, readStart={"afterCommand": 1})],
                            schemas=PERSON_SCHEMA))
        self.assertNotIn("acceptable", result(rep, "a"))                    # nothing in flight for a
        b = result(rep, "b")
        self.assertNotIn("acceptable", b)                                   # one answer: a's view
        self.assertEqual(b["pages"][0]["entities"][0]["triples"][0]["value"], marker(300))
        self.assertNotIn('"Bo"', json.dumps(b))

    def test_Q70b_literal_token_from_an_in_flight_read(self):
        """Q70b (V-O04e F8): a literal `cursor` token equal to a nextCursor that a read with
        commits in flight issued earlier in the case continues that read per prefix (its own
        readStart is not consulted); the token bytes are unchanged. A token issued by a read
        with nothing in flight keeps the query's own read view."""
        cmds = erasure_commands()
        cmds[2]["operations"] = [{"op": "erase", "target": "name2"}]
        page = lambda qid, **kw: dict({"id": qid, "kind": "entityPage", "entityType": "Person", "limit": 1}, **kw)
        first = page("a", cut={"position": 2, "validAt": 1e15}, readStart={"afterCommand": 1})
        source = evaluate(case(cmds, [first], schemas=PERSON_SCHEMA))
        tokens = {alt["result"]["pages"][0]["nextCursor"] for alt in result(source, "a")["acceptable"]}
        self.assertEqual(len(tokens), 1)                                    # the token cannot tell prefixes apart
        token = tokens.pop()

        def names(rep, qid):
            return [(alt["erasuresSeen"], alt["result"]["pages"][0]["entities"][0]["triples"][0]["value"])
                    for alt in result(rep, qid)["acceptable"]]
        rep = evaluate(case(cmds, [first, page("b", cursor=token), page("c", cursor=token, readStart={"afterCommand": 2})],
                            schemas=PERSON_SCHEMA))
        self.assertEqual(names(rep, "b"), [([], s("Bo")), (["tx:2"], marker(300))])
        self.assertEqual(names(rep, "c"), names(rep, "b"))
        self.assertEqual([alt["result"]["pages"][0].get("nextCursor") for alt in result(rep, "b")["acceptable"]], [None, None])
        plain = page("a", cut={"position": 2, "validAt": 1e15})               # the same token from a plain read
        rep = evaluate(case(cmds, [plain, page("b", cursor=token)], schemas=PERSON_SCHEMA))
        self.assertEqual(result(rep, "a")["pages"][0]["nextCursor"], token)
        self.assertEqual(result(rep, "b")["pages"][0]["entities"][0]["triples"][0]["value"], marker(300))

    def test_Q70c_literal_token_from_a_plain_read(self):
        """Q70c: a literal token issued by any earlier read continues that read, in flight or
        not, so a page with an earlier readStart cannot reopen a value the issuing read saw
        erased."""
        cmds = erasure_commands()
        cmds[2]["operations"] = [{"op": "erase", "target": "name2"}]
        page = lambda qid, **kw: dict({"id": qid, "kind": "entityPage", "entityType": "Person", "limit": 1}, **kw)
        plain = page("a", cut={"position": 2, "validAt": 1e15})
        token = result(evaluate(case(cmds, [plain], schemas=PERSON_SCHEMA)), "a")["pages"][0]["nextCursor"]
        rep = evaluate(case(cmds, [plain, page("b", cursor=token, readStart={"afterCommand": 1})], schemas=PERSON_SCHEMA))
        b = result(rep, "b")
        self.assertNotIn("acceptable", b)                                   # the plain read's one view
        self.assertEqual(b["pages"][0]["entities"][0]["triples"][0]["value"], marker(300))
        self.assertNotIn('"Bo"', json.dumps(b))

    def test_Q70f_ambiguous_literal_token(self):
        """Q70f (V-O04f F9): when the earlier reads that issued a literal token disagree in start,
        scope or per-prefix answers, the continuation fails closed with a typed X-NOT-MODELED,
        whichever issued last; Q70d: issuers with identical views continue the latest."""
        cmds = erasure_commands()
        cmds[2]["operations"] = [{"op": "erase", "target": "name2"}]
        page = lambda qid, **kw: dict({"id": qid, "kind": "entityPage", "entityType": "Person", "limit": 1}, **kw)
        cut = {"position": 2, "validAt": 1e15}
        plain, in_flight = page("a", cut=cut), page("f", cut=cut, readStart={"afterCommand": 1})
        token = result(evaluate(case(cmds, [plain], schemas=PERSON_SCHEMA)), "a")["pages"][0]["nextCursor"]
        cont = page("b", cursor=token)
        for order in ([in_flight, plain, cont], [plain, in_flight, cont]):
            node = result(evaluate(case(cmds, order, schemas=PERSON_SCHEMA)), "b")
            self.assertEqual(node["error"], "X-NOT-MODELED")
            self.assertIn("ambiguous literal token", node["message"])
        twice = evaluate(case(cmds, [in_flight, dict(in_flight, id="g"), cont], schemas=PERSON_SCHEMA))
        self.assertEqual([alt["erasuresSeen"] for alt in result(twice, "b")["acceptable"]], [[], ["tx:2"]])
        same = evaluate(case(cmds, [plain, dict(plain, id="g"), cont], schemas=PERSON_SCHEMA))
        self.assertEqual(result(same, "b")["pages"][0]["entities"][0]["triples"][0]["value"], marker(300))

    def test_Q70g_journal_pagination(self):
        """Q70g (V-O04f F10): a `transactions` call whose `after` equals a `next` an earlier
        transactions page of the case issued continues that read, one answer per prefix; an
        `after` no earlier page issued keeps the call's own read view."""
        cmds = [{"clock": 100, "operations": [assert_op("s1", "p1", ":w/pay", i64(1))]},
                {"clock": 110, "operations": [assert_op("s2", "p2", ":w/pay", i64(2))]},
                {"clock": 200, "operations": [{"op": "erase", "entityId": "p1"}, {"op": "erase", "entityId": "p2"}]}]
        first = {"id": "t1", "kind": "transactions", "after": 0, "limit": 1, "readStart": {"afterCommand": 1}}
        second = {"id": "t2", "kind": "transactions", "after": 1, "limit": 1}

        def values(node):
            alts = node["acceptable"] if "acceptable" in node else [{"erasuresSeen": "plain", "result": node}]
            return [(a["erasuresSeen"], [c["value"] for tx in a["result"]["transactions"] for c in tx["changes"]],
                     a["result"].get("next")) for a in alts]
        rep = evaluate(case(cmds, [first, second]))
        self.assertEqual(values(result(rep, "t1")), [([], [i64(1)], 1), (["tx:2"], [marker(200)], 1)])
        self.assertEqual(values(result(rep, "t2")), [([], [i64(2)], 2), (["tx:2"], [marker(200)], 2)])
        own = evaluate(case(cmds, [second]))                                  # no issuing page: its own view
        self.assertEqual(values(result(own, "t2")), [("plain", [marker(200)], 2)])
        plain = evaluate(case(cmds, [dict(first, id="t1", readStart=None), dict(second, readStart={"afterCommand": 1})]))
        self.assertEqual(values(result(plain, "t2")), [("plain", [marker(200)], 2)])     # continues the plain page

    def test_Q70j_journal_read_scope(self):
        """Q70j: a `transactions` read decides which erasures are in flight from its own `scope`
        field: an erasure in flight on scope t gives the t journal read its two prefixes, and an
        erasure on the default scope does not count for it."""
        def cmd(ref_, entity, value, clock, scope=None, erase=False):
            ops = [{"op": "erase", "target": ref_}] if erase else [assert_op(ref_, entity, ":w/pay", i64(value))]
            return dict({"clock": clock, "operations": ops}, **({"scope": scope} if scope else {}))
        journal = {"id": "j", "kind": "transactions", "scope": "t", "readStart": {"afterCommand": 1}}
        both = [cmd("d1", "p1", 1, 100), cmd("t1", "q1", 2, 110, "t"), cmd("t1", None, None, 200, "t", erase=True),
                cmd("d1", None, None, 210, erase=True)]
        node = result(evaluate(case(both, [journal])), "j")
        t_erasure = [r for r in result(evaluate(case(both, [{"id": "all", "kind": "transactions", "scope": "t"}])), "all")
                     ["transactions"] if r["changes"] and r["changes"][0]["op"] == "erase"][0]["txId"]
        self.assertEqual([(a["erasuresSeen"], a["result"]["transactions"][0]["changes"][0]["value"]) for a in node["acceptable"]],
                         [([], i64(2)), ([t_erasure], marker(200))])        # only scope t's erasure is in flight
        default_only = [cmd("d1", "p1", 1, 100), cmd("t1", "q1", 2, 110, "t"), cmd("d1", None, None, 210, erase=True)]
        node = result(evaluate(case(default_only, [journal])), "j")
        self.assertNotIn("acceptable", node)                                # nothing in flight on t
        self.assertEqual(node["transactions"][0]["changes"][0]["value"], i64(2))

    def test_Q70l_entity_journal_pages(self):
        """Q70l (V-O04g F11): transactionsForEntity continues through the continuation table: a
        `beforePosition` equal to the `nextBeforePosition` an earlier page of the same entity,
        scope and snapshotPosition issued continues that page's read per prefix; a different
        snapshotPosition is not a continuation of it."""
        cmds = [{"clock": 100, "operations": [assert_op("s1", "p1", ":w/pay", i64(1))]},
                {"clock": 110, "operations": [assert_op("s2", "p1", ":w/pay", i64(2))]},
                {"clock": 200, "operations": [{"op": "erase", "entityId": "p1"}]}]
        first = {"id": "e1", "kind": "transactionsForEntity", "entityId": "p1", "limit": 1, "snapshotPosition": 2,
                 "readStart": {"afterCommand": 1}}
        second = {"id": "e2", "kind": "transactionsForEntity", "entityId": "p1", "limit": 1, "snapshotPosition": 2,
                  "beforePosition": 2}

        def values(node):
            alts = node["acceptable"] if "acceptable" in node else [{"erasuresSeen": "plain", "result": node}]
            return [(a["erasuresSeen"], [c["value"] for tx in a["result"]["transactions"] for c in tx["changes"]],
                     a["result"].get("nextBeforePosition")) for a in alts]
        rep = evaluate(case(cmds, [first, second]))
        self.assertEqual(values(result(rep, "e1")), [([], [i64(2)], 2), (["tx:2"], [marker(200)], 2)])
        self.assertEqual(values(result(rep, "e2")), [([], [i64(1)], None), (["tx:2"], [marker(200)], None)])
        other = evaluate(case(cmds, [first, dict(second, snapshotPosition=3)]))   # another snapshot: own view
        self.assertEqual(values(result(other, "e2")), [("plain", [marker(200)], None)])

    def test_Q70m_typed_continuation_values(self):
        """Q70m (V-O04g F12, F13): integer continuation parameters must be JSON integers >= 0;
        a string, a float or a negative value makes the case malformed (exit 2), never a crash
        and never a skipped continuation."""
        cmds = [{"clock": 100, "operations": [assert_op("s1", "p1", ":w/pay", i64(1))]},
                {"clock": 110, "operations": [assert_op("s2", "p1", ":w/pay", i64(2))]}]
        page1 = {"id": "t1", "kind": "transactions", "after": 0, "limit": 1}
        bad = [{"kind": "transactions", "after": "1"}, {"kind": "transactions", "after": 1.0},
               {"kind": "transactions", "after": -1},
               {"kind": "transactionsForEntity", "entityId": "p1", "beforePosition": "2"},
               {"kind": "transactionsForEntity", "entityId": "p1", "beforePosition": 2.5},
               {"kind": "transactionsForEntity", "entityId": "p1", "snapshotPosition": 2.0}]
        for q in bad:
            with self.assertRaises(V.OracleInputError, msg=q) as ctx:
                evaluate(case(cmds, [page1, dict(q, id="t2", limit=1)]))
            self.assertIn("Q70m", str(ctx.exception))
        rep = evaluate(case(cmds, [page1, {"id": "t2", "kind": "transactions", "after": 1, "limit": 1}]))
        self.assertEqual([r["txId"] for r in result(rep, "t2")["transactions"]], ["tx:1"])

    def test_erase_receipts(self):
        c = case(erasure_commands(), [match_q("m")], schemas=PERSON_SCHEMA)
        c["receipts"] = committed_receipts(c)
        rep = evaluate(c)
        self.assertEqual((rep["verdict"], rep["receiptConsistency"]["status"]), ("PASS", "PASS"))
        self.assertEqual(result(rep, "m")["raw"][0]["value"], marker(300))


class Rulings033(unittest.TestCase):
    """Rulings compiled into 0.3.3 to 0.3.5 that have no table row of their own."""

    def test_Q33d_ordered_cross_family_is_mixed_family(self):
        rep = evaluate(case([], [{"id": "c", "kind": "compare", "left": s("a"), "right": i64(1)}]))
        c = result(rep, "c")
        self.assertEqual((c["eq"], c["lt"]["error"], c["gt"]["error"]), (False, "E-MIXED-FAMILY", "E-MIXED-FAMILY"))

    def test_Q33e_rem_is_integer_only_and_sum_needs_numbers(self):
        self.assertEqual(kernel(lambda: X.rem(N(7.0), N(2.0))), ("error", "E-MIXED-FAMILY"))
        self.assertEqual(kernel(lambda: X.rem(I(7), N(2.0))), ("error", "E-MIXED-FAMILY"))
        self.assertEqual(kernel(lambda: X.agg_sum([V.string("a")])), ("error", "E-MIXED-FAMILY"))   # R-AGG-5

    def test_Q33h_invalid_basis(self):
        q = [{"id": "p", "kind": "match", "cut": {"position": -1, "validAt": 1}},
             {"id": "r", "kind": "match", "cut": {"recordedAt": -1, "validAt": 1}},
             {"id": "z", "kind": "match", "cut": {"validAt": NZ}}]
        rep = evaluate(case([], q))
        self.assertEqual([result(rep, k)["error"] for k in "prz"],
                         ["E-INVALID-VALUE", "E-INVALID-VALUE", "E-NEGATIVE-ZERO-INSTANT"])   # Q43h for z
        self.assertEqual(result(rep, "z")["detail"], "no-negative-zero")

    def test_Q24_Q31f_erasure_is_modeled(self):
        """EXP-O04: the `erase` op commits and reads show the marker (the Erasure class has
        one test per CS-ERASURE case); Q52g: the `erasure` spelling is a typed invalid-command
        error (E-INVALID-VALUE)."""
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("x"))]},
                             {"clock": 2, "operations": [{"op": "erase", "target": "a"}]}],
                            [{"id": "m", "kind": "match", "cut": {"validAt": 1}}]))
        self.assertEqual(result(rep, "m")["raw"][0]["value"], {"_tag": "ErasedValue", "erasedAt": 2})
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x/s", s("x"))]},
                             {"clock": 2, "operations": [{"op": "erasure", "target": "a"}]}]))
        self.assertEqual((outcome(rep, 1)["outcome"], outcome(rep, 1)["error"]), ("rejected", "E-INVALID-VALUE"))

    def test_Q35_order_keys_are_refused(self):
        with self.assertRaises(V.OracleInputError) as ctx:
            evaluate(case([], [{"id": "k", "kind": "orderKey", "value": decimal_value("1.50")}]))
        self.assertIn("X-NOT-MODELED", str(ctx.exception))


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
        # contract 0.3.3 to 0.3.5 rows (EXP-O03)
        "E-INEXACT-JSON-NUMBER": ("c", case([{"clock": 1, "operations": [
            assert_op("a", "e", ":v", {"type": "json", "value": {"a": [1, NZ]}})]}])),
        "E-NEGATIVE-ZERO-INSTANT": ("c", case([{"clock": 1, "operations": [
            assert_op("a", "e", ":v", s("x"), valid_from=NZ)]}])),
        "E-DECIMAL-OVERFLOW": ("q", case([], [{"id": "q", "kind": "expr", "expr": [
            "mul", decimal_value("1" + "0" * 20), decimal_value("1" + "0" * 20)]}])),
        "E-DECIMAL-BARE-DIVIDE": ("q", case([], [{"id": "q", "kind": "expr", "expr": [
            "div", decimal_value("1"), decimal_value("2")]}])),
        "E-DECIMAL-FRACTION": ("q", case([], [{"id": "q", "kind": "expr", "expr": ["toInteger", decimal_value("1.50")]}])),
        "E-DECIMAL-AVG": ("q", case([], [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "varTypes": {"v": "decimal"},
                                          "match": {"attributes": {"v": ":v"}}, "aggregates": [{"op": "avg", "var": "v"}]}])),
    }


SCENARIOS = _scenarios()


class Errors(unittest.TestCase):
    """One test per ERROR_TABLE row: the oracle's table equals the contract's row, and an
    error the oracle produces carries exactly that tag and reason."""


def _error_test(row):
    def test(self):
        tag, reasons, phase = ERR.ERROR_TABLE[row["id"]]
        contract_reasons = tuple(row["reason"].split("|")) if "|" in row["reason"] else row["reason"]
        contract_phase = tuple(row["phase"].split(" or ")) if " or " in row["phase"] else row["phase"]
        self.assertEqual((tag, reasons, phase), (row["tag"], contract_reasons, contract_phase))
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
        self.assertIn(node["phase"], contract_phase if isinstance(contract_phase, tuple) else (contract_phase,))
    return test


for _row in CONTRACT["errorTable"]:
    setattr(Errors, "test_" + _row["id"].replace("-", "_"), _error_test(_row))


if __name__ == "__main__":
    unittest.main()


# [EXP-O06] Why: map contract ids to executed behavioral tests. Rejected: empty aliases that only satisfy naming.
CONTRACT_TEST_MAPPINGS = {'CONTRACT-Q70A': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q70a_continuation_answers_from_the_source_read'],
 'CONTRACT-Q70B': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q70b_literal_token_from_an_in_flight_read'],
 'CONTRACT-Q70C': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q70c_literal_token_from_a_plain_read'],
 'CONTRACT-Q70D': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q70f_ambiguous_literal_token'],
 'CONTRACT-Q70E': ['lab.oracles.replay.tests.test_q70_coverage.Q70Coverage.test_Q70E_only_issuing_prefixes'],
 'CONTRACT-Q70F': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q70f_ambiguous_literal_token'],
 'CONTRACT-Q70G': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q70g_journal_pagination'],
 'CONTRACT-Q70H': ['lab.oracles.replay.tests.test_q70_coverage.Q70Coverage.test_Q70H_equal_view_different_bodies'],
 'CONTRACT-Q70I': ['lab.oracles.replay.tests.test_q70_coverage.Q70Coverage.test_Q70I_journal_ambiguity_and_scope'],
 'CONTRACT-Q70J': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q70j_journal_read_scope'],
 'CONTRACT-Q70K': ['lab.oracles.replay.tests.test_q70_coverage.Q70Coverage.test_Q70K_scope_on_every_scope_surface'],
 'CONTRACT-Q70L': ['lab.oracles.replay.tests.test_q70_coverage.Q70Coverage.test_Q70L_entity_and_scope_key',
                   'lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q70l_entity_journal_pages'],
 'CONTRACT-Q70M': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q70m_typed_continuation_values'],
 'CONTRACT-Q70N': ['lab.oracles.replay.tests.test_scale_and_selfcheck.SelfChecks.test_continuation_table_check_detects_a_missing_paged_kind',
                   'lab.oracles.replay.tests.test_scale_and_selfcheck.SelfChecks.test_execution_detects_computed_cross_module_and_nested_plants',
                   'lab.oracles.replay.tests.test_scale_and_selfcheck.SelfChecks.test_unexercisable_kind_fails_closed'],
 'CONTRACT-Q70O': ['lab.oracles.replay.tests.test_views.ReferencePageInput.test_reference_page_malformed_inputs_exit_two',
                   'lab.oracles.replay.tests.test_views.ReferencePageInput.test_reference_page_valid_indices_and_terminal_page'],
 'ER-CURSOR-ERASURE-PREFIX': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q66b_cursor_continues_per_prefix'],
 'ER-INFLIGHT-PREFIXES': ['lab.oracles.replay.tests.test_contract_section4.Erasure.test_Q66a_inflight_prefixes_only']}

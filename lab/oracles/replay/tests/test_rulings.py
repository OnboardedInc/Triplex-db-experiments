"""RULINGS.md Q1 to Q21 as the oracle encodes them: one test per Q21 AMB ruling, per
oracle-side RULING-NEEDED change listed under Q21, per numeric ruling (Q8a-f, Q14a-d,
Q18, Q20, NUMERIC lane profile) and per implementation fact stated in the EXP-O02 brief.
The coverage test reads RULINGS.md so a new AMB row without a test fails."""

import re
import unittest
from pathlib import Path

from lab.oracles.replay import values as V
from lab.oracles.replay.tests.helpers import assert_op, case, evaluate, i64, outcome, ref, result, s

ROOT = Path(__file__).resolve().parents[4]
RULINGS = (ROOT / "lab/acceptance/RULINGS.md").read_text()
ORACLE_CHANGES = ["R-VAL-3", "R-ORD-2", "R-CMP-3", "R-NUM-5", "R-NUM-6", "R-CMD-6", "R-CMD-9", "R-JNL-1",
                  "R-ENT-6", "R-ENT-7"]

HIST = [{"version": 1, "entityTypes": {"H": {"attributes": {
    "status": {"attribute": ":h/status", "type": "string"}}}}}]


def num(x):
    return {"type": "number", "value": x}


def nbits(b):
    return {"type": "number", "bits": b}


def retire_case(queries):
    """A1 asserted at 100 (P1), retracted at 200 (P2) and replaced by A2."""
    cmds = [{"clock": 100, "operations": [assert_op("A1", "h:1", ":h/status", s("open"), entity_type="H")]},
            {"clock": 200, "operations": [{"op": "retract", "target": "A1"},
                                          assert_op("A2", "h:1", ":h/status", s("closed"), entity_type="H")]}]
    return evaluate(case(cmds, queries, schemas=HIST))


class Coverage(unittest.TestCase):
    def test_every_q21_ruling_and_oracle_change_has_a_test(self):
        ambs = sorted(set(re.findall(r"^\| (AMB-\d\d) \|", RULINGS, re.M)))
        self.assertEqual(len(ambs), 17)
        for amb in ambs:
            self.assertTrue(hasattr(Q21, "test_" + amb.replace("-", "_")), amb)
        for rid in ORACLE_CHANGES:
            self.assertIn(rid, RULINGS)
            self.assertTrue(hasattr(OracleChanges, "test_" + rid.replace("-", "_")), rid)


class Q21(unittest.TestCase):
    def test_AMB_01(self):
        """A: ordinary match / entity / entityPage keep the raw lifetime at an explicit R."""
        rep = retire_case([{"id": "m", "kind": "match", "cut": {"recordedAt": 150, "validAt": 10},
                            "pattern": {"entityId": "h:1"}},
                           {"id": "e", "kind": "entityTriples", "entityId": "h:1", "cut": {"recordedAt": 150, "validAt": 10}},
                           {"id": "p", "kind": "entityPage", "entityType": "H", "cut": {"recordedAt": 150, "validAt": 10}}])
        m = result(rep, "m")
        self.assertEqual(m["contract"], "raw-lifetime (AMB-01 A)")
        self.assertEqual([(r["id"], r["retractedAt"], r["retractTxId"]) for r in m["raw"]], [("A1", 200, "tx:1")])
        self.assertEqual(result(rep, "e")["raw"][0]["retractedAt"], 200)
        self.assertEqual(result(rep, "p")["pages"][0]["entities"][0]["triples"][0]["retractedAt"], 200)

    def test_AMB_02(self):
        """Logical content {identity, value, recordedAt, knownRetirement: {retractedAt, retractTxId}};
        native rows add retractedPosition."""
        rep = retire_case([{"id": "t", "kind": "timeline", "entityType": "H", "entityId": "h:1", "prop": "status",
                            "cut": {"recordedAt": 200, "validAt": 10}},
                           {"id": "n", "kind": "assertionSnapshot", "mode": "known-at-valid",
                            "cut": {"validAt": 10}, "pattern": {"entityId": "h:1"}}])
        rows = result(rep, "t")["assertions"]
        self.assertEqual([(r["identity"], r["value"]["value"], r["recordedAt"], r["knownRetirement"]) for r in rows],
                         [("A1", "open", 100, {"retractedAt": 200, "retractTxId": "tx:1", "retractedPosition": 2}),
                          ("A2", "closed", 200, None)])
        self.assertEqual(result(rep, "n")["assertions"][0]["knownRetirement"],
                         {"retractedAt": 200, "retractTxId": "tx:1", "retractedPosition": 2})

    def test_AMB_03(self):
        """timeline lists every assertion recorded at (P, R) with no V filter."""
        cmds = [{"clock": 100, "operations": [assert_op("A1", "h:1", ":h/status", s("past"), valid_from=0, valid_to=5,
                                                        entity_type="H"),
                                              assert_op("A2", "h:1", ":h/status", s("now"), valid_from=5,
                                                        entity_type="H")]}]
        rep = evaluate(case(cmds, [{"id": "t", "kind": "timeline", "entityType": "H", "entityId": "h:1",
                                    "prop": "status", "cut": {"validAt": 10}},
                                   {"id": "n", "kind": "assertionSnapshot", "mode": "known-at-valid",
                                    "cut": {"validAt": 10}}], schemas=HIST))
        self.assertEqual([r["identity"] for r in result(rep, "t")["assertions"]], ["A1", "A2"])
        self.assertEqual([r["id"] for r in result(rep, "n")["assertions"]], ["A2"])   # the V-filtered helper

    def test_AMB_04(self):
        """The journal change value of a -0.0 assertion is bit-exact -0.0."""
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("z", "z:1", ":z/n", nbits("0x8000000000000000"))]}],
                            [{"id": "tx", "kind": "transaction", "txId": "tx:0"}]))
        self.assertEqual(result(rep, "tx")["changes"][0]["value"]["bits"], "0x8000000000000000")

    def test_AMB_05(self):
        """assert: value, validFrom, assertionTxId; retract: value, recordedAt, retractedAt, retractionTxId."""
        rep = retire_case([{"id": "tx", "kind": "transaction", "txId": "tx:1"}])
        retract, assert_ = result(rep, "tx")["changes"]
        self.assertEqual({k: retract[k] for k in ("op", "tripleId", "recordedAt", "retractedAt", "assertionTxId",
                                                  "retractionTxId")},
                         {"op": "retract", "tripleId": "A1", "recordedAt": 100, "retractedAt": 200,
                          "assertionTxId": "tx:0", "retractionTxId": "tx:1"})
        self.assertEqual((assert_["op"], assert_["validFrom"], assert_["assertionTxId"]), ("assert", 0, "tx:1"))

    def test_AMB_06(self):
        """A: retract-pattern sees same-command assertions; both changes, assert first."""
        cmds = [{"clock": 100, "operations": [assert_op("A1", "p:1", ":p/a", s("temp")),
                                              {"op": "retract-pattern", "pattern": {"entityId": "p:1", "attribute": ":p/a"}}]}]
        rep = evaluate(case(cmds, [{"id": "m", "kind": "match", "cut": {"validAt": 10}, "pattern": {"entityId": "p:1"}},
                                   {"id": "h", "kind": "history", "entityId": "p:1"},
                                   {"id": "tx", "kind": "transaction", "txId": "tx:0"}]))
        self.assertEqual(result(rep, "m")["raw"], [])
        h = result(rep, "h")["rawLifetime"][0]
        self.assertEqual((h["txId"], h["retractTxId"], h["retractedAt"]), ("tx:0", "tx:0", 100))
        self.assertEqual([(c["op"], c["tripleId"]) for c in result(rep, "tx")["changes"]],
                         [("assert", "A1"), ("retract", "A1")])
        retract = result(rep, "tx")["changes"][1]
        self.assertEqual((retract["assertionTxId"], retract["retractionTxId"]), ("tx:0", "tx:0"))

    def test_AMB_07(self):
        """Creation order (recordedPosition, then operation index)."""
        cmds = [{"clock": 1, "operations": [assert_op("b", "q:1", ":q/a", s("y"))]},
                {"clock": 2, "operations": [assert_op("a2", "q:1", ":q/a", s("x")), assert_op("a1", "q:1", ":q/a", s("w"))]},
                {"clock": 3, "operations": [{"op": "retract-pattern", "pattern": {"entityId": "q:1"}}]}]
        rep = evaluate(case(cmds, [{"id": "tx", "kind": "transaction", "txId": "tx:2"}]))
        self.assertEqual([c["tripleId"] for c in result(rep, "tx")["changes"]], ["b", "a2", "a1"])

    def test_AMB_08(self):
        """-0.0 and +0.0 are one value; representative: lowest (recordedPosition, op index)."""
        schema = [{"version": 1, "entityTypes": {"Card": {"attributes": {
            "nums": {"attribute": ":card/nums", "type": "number", "cardinality": "many"}}}}}]
        cmds = [{"clock": 100, "operations": [
            assert_op("Z1", "card:5", ":card/nums", nbits("0x8000000000000000"), entity_type="Card"),
            assert_op("Z2", "card:5", ":card/nums", num(0.0), entity_type="Card")]},
            {"clock": 200, "operations": [assert_op("Z3", "card:6", ":card/nums", num(0.0), entity_type="Card")]},
            {"clock": 300, "operations": [assert_op("Z4", "card:6", ":card/nums", nbits("0x8000000000000000"),
                                                    entity_type="Card")]}]
        q = [{"id": c, "kind": "get", "entityType": "Card", "entityId": c, "cut": {"validAt": 10}}
             for c in ("card:5", "card:6")]
        rep = evaluate(case(cmds, q, schemas=schema))
        five = result(rep, "card:5")["properties"]["nums"]["values"]
        self.assertEqual([(v["value"]["bits"], v["supports"]) for v in five], [("0x8000000000000000", ["Z1", "Z2"])])
        six = result(rep, "card:6")["properties"]["nums"]["values"]
        self.assertEqual([(v["value"]["bits"], v["supports"]) for v in six], [("0x0000000000000000", ["Z3", "Z4"])])

    def test_AMB_09(self):
        """B: two equal-valued assertions on one entity are one binding row: SUM 10, COUNT 1."""
        def run(entities):
            ops = [assert_op(f"m{k}", e, ":conf/amount", num(10)) for k, e in enumerate(entities)]
            rep = evaluate(case([{"clock": 100, "operations": ops}], [
                {"id": "q", "kind": "aggregate", "cut": {"validAt": 10}, "match": {"attributes": {"a": ":conf/amount"}},
                 "aggregates": [{"op": "sum", "var": "a", "as": "sum"}, {"op": "count", "var": "a", "as": "count"}]}]))
            row = result(rep, "q")["rows"][0]
            return row["sum"]["value"], row["count"]["value"]
        self.assertEqual(run(["agg:c", "agg:c"]), (10, "1"))
        self.assertEqual(run(["agg:a", "agg:b"]), (20, "1"))       # equal values on distinct entities

    def test_AMB_10(self):
        """Integer results project as IntegerValue with canonical decimal text."""
        ops = [assert_op("a", "e1", ":s/v", i64(9007199254740993)), assert_op("b", "e2", ":s/v", i64(1))]
        rep = evaluate(case([{"clock": 1, "operations": ops}], [
            {"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":s/v"}},
             "aggregates": [{"op": "sum", "var": "v", "as": "t"}]}]))
        self.assertEqual(result(rep, "q")["rows"][0]["t"], {"type": "integer", "value": "9007199254740994"})

    def test_AMB_11(self):
        """The explicit conversion before AVG is toNumber(?v)."""
        ops = [assert_op("a", "e1", ":s/v", i64(1)), assert_op("b", "e2", ":s/v", i64(2))]
        q = {"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":s/v"}},
             "aggregates": [{"op": "avg", "var": "v", "as": "avg", "convert": "toNumber"}]}
        rep = evaluate(case([{"clock": 1, "operations": ops}], [q, dict(q, id="raw", aggregates=[{"op": "avg", "var": "v"}])]))
        self.assertEqual(result(rep, "q")["rows"][0]["avg"]["bits"], "0x3ff8000000000000")
        self.assertEqual(result(rep, "raw")["error"], "E-INTEGER-AVG")

    def test_AMB_12(self):
        """B: validTo <= validFrom is rejected with E-INVALID-VALUE."""
        for vt in (10, 5):
            rep = evaluate(case([{"clock": 1, "operations": [assert_op("z", "iv:1", ":iv/z", s("x"), valid_from=10,
                                                                       valid_to=vt)]}]))
            o = outcome(rep, 0)
            self.assertEqual((o["error"], o["errorTag"], o["reason"]), ("E-INVALID-VALUE", "InvalidTripleError",
                                                                        "invalid-value"))

    def test_AMB_13(self):
        """Compare _tag ConflictingValuesError, reason conflicting-values and the {entityId, attribute} set."""
        cmds =[{"clock": 1, "operations": [assert_op("a", "h:1", ":h/status", s("x"), entity_type="H"),
                                            assert_op("b", "h:1", ":h/status", s("y"), entity_type="H")]}]
        rep = evaluate(case(cmds, [{"id": "g", "kind": "get", "entityType": "H", "entityId": "h:1",
                                    "cut": {"validAt": 1}}], schemas=HIST))
        e = result(rep, "g")
        self.assertEqual((e["_tag"], e["reason"], e["conflicts"]),
                         ("ConflictingValuesError", "conflicting-values", [{"entityId": "h:1", "attribute": ":h/status"}]))

    def test_AMB_14(self):
        """Invalid integer text: InvalidTripleError / invalid-value; reserved: WriteError / reserved-namespace."""
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "n:1", ":n/v", i64("01"))]},
                             {"clock": 2, "operations": [assert_op("b", "_triplex/application/x", ":name", s("r"))]}]))
        self.assertEqual((outcome(rep, 0)["errorTag"], outcome(rep, 0)["reason"]), ("InvalidTripleError", "invalid-value"))
        self.assertEqual((outcome(rep, 1)["errorTag"], outcome(rep, 1)["reason"]), ("WriteError", "reserved-namespace"))

    def test_AMB_15(self):
        """Codepoint order; non-BMP entityPage vector U+E000 against U+10000."""
        ops = [assert_op("x", "\U00010000", ":p/l", s("x"), entity_type="P"),
               assert_op("y", "", ":p/l", s("y"), entity_type="P")]
        rep = evaluate(case([{"clock": 1, "operations": ops}],
                            [{"id": "p", "kind": "entityPage", "entityType": "P", "cut": {"validAt": 1}}]))
        self.assertEqual([e["entityId"] for e in result(rep, "p")["pages"][0]["entities"]], ["", "\U00010000"])

    def test_AMB_16(self):
        """A: range predicates on integer attributes are required in Repository.find."""
        schema = [{"version": 1, "entityTypes": {"Num": {"attributes": {"v": {"attribute": ":n/v", "type": "integer"}}}}}]
        vals = {"n:max": 2 ** 63 - 1, "n:p59": 2 ** 59, "n:p59m1": 2 ** 59 - 1, "n:p53p1": 2 ** 53 + 1}
        ops = [assert_op(k, k, ":n/v", i64(v), entity_type="Num") for k, v in vals.items()]
        rep = evaluate(case([{"clock": 1, "operations": ops}], [
            {"id": "gt", "kind": "find", "entityType": "Num", "cut": {"validAt": 10},
             "where": [{"prop": "v", "op": "gt", "value": i64(2 ** 59 - 1)}]},
            {"id": "lte", "kind": "find", "entityType": "Num", "cut": {"validAt": 10},
             "where": [{"prop": "v", "op": "lte", "value": i64(2 ** 53 + 1)}]}], schemas=schema))
        self.assertEqual(result(rep, "gt")["pages"][0]["ids"], ["n:max", "n:p59"])
        self.assertEqual(result(rep, "lte")["pages"][0]["ids"], ["n:p53p1"])

    def test_AMB_17(self):
        """A: find fails with ConflictingValuesError when a returned document contains a conflicted
        attribute; a projection that omits that attribute succeeds."""
        schema = [{"version": 1, "entityTypes": {"Item": {"attributes": {
            "name": {"attribute": ":item/name", "type": "string"}, "color": {"attribute": ":item/color", "type": "string"}}}}}]
        ops = [assert_op("A1", "item:3", ":item/color", s("red"), entity_type="Item"),
               assert_op("A2", "item:3", ":item/color", s("blue"), entity_type="Item"),
               assert_op("A3", "item:3", ":item/name", s("three"), entity_type="Item")]
        where = [{"prop": "name", "op": "eq", "value": s("three")}]
        rep = evaluate(case([{"clock": 1, "operations": ops}], [
            {"id": "find", "kind": "find", "entityType": "Item", "cut": {"validAt": 10}, "where": where},
            {"id": "proj", "kind": "find", "entityType": "Item", "cut": {"validAt": 10}, "where": where,
             "select": ["name"]},
            {"id": "count", "kind": "count", "entityType": "Item", "cut": {"validAt": 10}, "where": where}], schemas=schema))
        self.assertEqual(result(rep, "find")["conflicts"], [{"entityId": "item:3", "attribute": ":item/color"}])
        self.assertEqual(list(result(rep, "proj")["pages"][0]["entities"][0]["properties"]), ["name"])
        self.assertEqual(result(rep, "count")["total"], 1)


class OracleChanges(unittest.TestCase):
    """The ten oracle defaults RULINGS Q21 says change in EXP-O02."""

    def test_R_VAL_3(self):
        """-0/+0 one value for identity, conflicts, grouping, distinct count and Unique."""
        rules = [{"_tag": "Unique", "v": 1, "entityType": "T", "attribute": ":t/n"}]
        cmds = [{"clock": 1, "operations": [assert_op("a", "t:1", ":t/n", num(0.0), entity_type="T")]},
                {"clock": 2, "meta": {"enforce": {"constraints": rules}},
                 "operations": [assert_op("b", "t:2", ":t/n", nbits("0x8000000000000000"), entity_type="T")]}]
        rep = evaluate(case(cmds, [{"id": "c", "kind": "aggregate", "cut": {"validAt": 1},
                                    "match": {"attributes": {"n": ":t/n"}},
                                    "aggregates": [{"op": "count", "var": "n", "as": "c"}]}]))
        self.assertEqual(outcome(rep, 1)["reason"], "unique")        # -0 claims the same value as +0
        self.assertEqual(result(rep, "c")["rows"][0]["c"]["value"], "1")

    def test_R_ORD_2(self):
        self.assertEqual(V.FAMILIES, ("boolean", "integer", "number", "decimal", "datetime", "string", "ref", "json",
                                      "blob"))

    def test_R_CMP_3(self):
        with self.assertRaises(V.MixedFamily):
            V.predicate("lt", V.integer(1), V.number(2.0))
        self.assertFalse(V.predicate("lt", V.string("a"), V.integer(1)))   # other families: false (R-CMP-3 rest)

    def test_R_NUM_5(self):
        rep = evaluate(case([], [{"id": t, "kind": "expr", "expr": ["cast-int64", s(t)]} for t in ("+1", "01", "-0")]))
        for t in ("+1", "01", "-0"):
            self.assertEqual(result(rep, t)["error"], "E-INVALID-CONVERSION", t)

    def test_R_NUM_6(self):
        rep = evaluate(case([], [{"id": "q", "kind": "expr", "expr": ["add", i64(1), num(1.5)]}]))
        e = result(rep, "q")
        self.assertEqual((e["_tag"], e["reason"]), ("DatalogValidationError", "mixed-family"))

    def test_R_CMD_6(self):
        cases = [assert_op("a", "_triplex/application/forbidden", ":name", s("x")),
                 assert_op("a", "e", ":triplex/config", s("x")),
                 assert_op("a", "e", ":name", s("x"), entity_type="triplex.Config"),
                 assert_op("a", "e", ":_tx/actor", s("x")),
                 assert_op("a", "e", ":name", s("x"), entity_type="_Transaction"),
                 {"op": "retract-pattern", "pattern": {"entityType": "_Transaction"}}]
        for op in cases:
            rep = evaluate(case([{"clock": 1, "operations": [op]}]))
            self.assertEqual(outcome(rep, 0)["error"], "E-RESERVED", op)
        ok = evaluate(case([{"clock": 1, "operations": [assert_op("a", "_app/x", ":_mine/y", s("x"), entity_type="_T")]}]))
        self.assertEqual(outcome(ok, 0)["outcome"], "committed")          # only the documented namespaces

    def test_R_CMD_9(self):
        rep = evaluate(case([{"clock": 1, "hostAbort": True, "operations": []},
                             {"clock": 2, "operations": [{"op": "frobnicate"}]}]))
        self.assertEqual((outcome(rep, 0)["error"], outcome(rep, 0)["errorTag"]), ("host-abort", None))
        self.assertEqual((outcome(rep, 1)["errorTag"], outcome(rep, 1)["reason"]), ("InvalidTripleError", "invalid-value"))

    def test_R_JNL_1(self):
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x", s("v"))]}],
                            [{"id": "tx", "kind": "transaction", "txId": "tx:0"}]))
        self.assertEqual(result(rep, "tx")["changes"][0]["assertionTxId"], "tx:0")

    def test_R_ENT_6(self):
        """find orderBy: present before missing, Q14a family rank, then value, then entity id."""
        schema = [{"version": 1, "entityTypes": {"T": {"attributes": {"v": {"attribute": ":t/v", "type": "string"},
                                                                       "w": {"attribute": ":t/w", "type": "string"}}}}}]
        ops = [assert_op("a", "t:a", ":t/v", s("x"), entity_type="T"),
               assert_op("b", "t:b", ":t/v", i64(5), entity_type="T"),
               assert_op("c", "t:c", ":t/v", {"type": "boolean", "value": True}, entity_type="T"),
               assert_op("d", "t:d", ":t/w", s("no v"), entity_type="T")]
        rep = evaluate(case([{"clock": 1, "operations": ops}], [
            {"id": "o", "kind": "find", "entityType": "T", "cut": {"validAt": 1}, "orderBy": [{"prop": "v"}]}],
            schemas=schema))
        self.assertEqual(result(rep, "o")["pages"][0]["ids"], ["t:c", "t:b", "t:a", "t:d"])

    def test_R_ENT_7(self):
        rep = retire_case([{"id": "t", "kind": "timeline", "entityType": "H", "entityId": "h:1", "prop": "status",
                            "cut": {"recordedAt": 150, "validAt": 10}}])
        self.assertEqual([(r["identity"], r["knownRetirement"]) for r in result(rep, "t")["assertions"]],
                         [("A1", None)])     # AMB-02/03: recorded at R=150 the retirement is not yet known


class NumericRulings(unittest.TestCase):
    def test_Q8a_Q20_exact_sum_final_overflow(self):
        ops = [assert_op(f"v{k}", f"s:{k}", ":s/v", i64(x)) for k, x in enumerate([2 ** 63 - 1, 1, -1])]
        rep = evaluate(case([{"clock": 1, "operations": ops}], [
            {"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":s/v"}},
             "aggregates": [{"op": "sum", "var": "v", "as": "t"}]}]))
        self.assertEqual(result(rep, "q")["rows"][0]["t"]["value"], str(2 ** 63 - 1))

    def test_Q8c_division_by_zero_typed(self):
        rep = evaluate(case([], [{"id": "q", "kind": "expr", "expr": ["div", num(1.0), nbits("0x8000000000000000")]}]))
        self.assertEqual(result(rep, "q")["error"], "E-DIVISION-BY-ZERO")

    def test_Q8e_equal_valued_card_one_duplicates(self):
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "h:1", ":h/status", s("x"), entity_type="H"),
                                                         assert_op("b", "h:1", ":h/status", s("x"), entity_type="H")]}],
                            [{"id": "g", "kind": "get", "entityType": "H", "entityId": "h:1", "cut": {"validAt": 1}}],
                            schemas=HIST))
        self.assertEqual(result(rep, "g")["properties"]["status"]["supports"], ["a", "b"])

    def test_Q14c_binary64_sum(self):
        ops = [assert_op(f"a{k}", f"e{k}", ":x", num(x)) for k, x in enumerate([1e16, 1.0, -1e16])]
        rep = evaluate(case([{"clock": 1, "operations": ops}], [
            {"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"x": ":x"}},
             "aggregates": [{"op": "sum", "var": "x", "as": "s"}]}]))
        self.assertEqual(result(rep, "q")["rows"][0]["s"]["value"], 1)

    def test_Q14d_find_preflight_integer_vs_number_range(self):
        schema = [{"version": 1, "entityTypes": {"Num": {"attributes": {"v": {"attribute": ":n/v", "type": "integer"}}}}}]
        rep = evaluate(case([], [{"id": "f", "kind": "find", "entityType": "Num", "cut": {"validAt": 1},
                                  "where": [{"prop": "v", "op": "gt", "value": num(1.5)}]}], schemas=schema))
        self.assertEqual(result(rep, "f")["error"], "E-MIXED-FAMILY")          # preflight: no rows needed

    def test_NUMERIC_lane_profile_per_command(self):
        """Q1 as re-scoped: QLever integers beyond +/-2^59 are rejected at write (atomic), XTDB keeps them."""
        cmd = {"clock": 1, "operations": [assert_op("ok", "n:ok", ":n/v", i64(1)), assert_op("big", "n:big", ":n/v",
                                                                                           i64(2 ** 63 - 1))]}
        q = [{"id": "m", "kind": "match", "cut": {"validAt": 1}, "pattern": {"attribute": ":n/v"}}]
        qlever = evaluate(case([cmd], q, lane="qlever-sparql"))
        self.assertEqual(outcome(qlever, 0)["error"], "E-VALUE-OUT-OF-RANGE")
        self.assertEqual(result(qlever, "m")["raw"], [])
        self.assertEqual(qlever["lane"], {"name": "qlever-sparql", "integerRange": [str(-2 ** 59), str(2 ** 59 - 1)]})
        xtdb = evaluate(case([cmd], q, lane="xtdb-xtql"))
        self.assertEqual(len(result(xtdb, "m")["raw"]), 2)


class BriefFacts(unittest.TestCase):
    """Implementation facts stated in the EXP-O02 brief (not read from packages/)."""

    PAGES = [{"clock": 1, "operations": [assert_op(f"x{k}", f"page:{c}", ":page/label", s(c.upper()), entity_type="Page")
                                         for k, c in enumerate("abcde")]}]

    def test_fact_3_entity_page_limits(self):
        q = [{"id": f"l{n}", "kind": "entityPage", "entityType": "Page", "limit": n, "cut": {"validAt": 1}}
             for n in (0, 201, 200, 1)] + [{"id": "default", "kind": "entityPage", "entityType": "Page",
                                             "cut": {"validAt": 1}}]
        rep = evaluate(case(self.PAGES, q))
        for n in (0, 201):
            e = result(rep, f"l{n}")
            self.assertEqual((e["_tag"], e["reason"]), ("PaginationCursorError", "malformed"))
        self.assertEqual(result(rep, "l200")["pageSize"], 200)
        self.assertEqual(len(result(rep, "l1")["pages"]), 5)
        self.assertEqual(result(rep, "default")["pageSize"], 50)

    def test_fact_3_cursor_sequence_and_errors(self):
        """G10.cursor.stable: continuation reads the first page's cut; CURSOR_TRANSITIONS errors."""
        cmds = self.PAGES + [{"clock": 2, "operations": [
            assert_op("bb", "page:bb", ":page/label", s("BB"), entity_type="Page"), {"op": "retract", "target": "x3"}]}]
        first = {"id": "S1", "kind": "entityPage", "entityType": "Page", "limit": 2,
                 "cut": {"position": {"afterCommand": 0}, "recordedAt": 1000, "validAt": 50}}
        q = [first,
             {"id": "S2", "kind": "entityPage", "entityType": "Page", "limit": 2, "cursorFrom": {"query": "S1"}},
             {"id": "E1", "kind": "entityPage", "entityType": "Page", "limit": 2, "cursorFrom": {"query": "S1"},
              "cut": {"validAt": 51}},
             {"id": "E2", "kind": "entityPage", "entityType": "Other", "limit": 2, "cursorFrom": {"query": "S1"}},
             {"id": "E4", "kind": "entityPage", "entityType": "Page", "limit": 2, "cursorFrom": {"query": "S1"},
              "cut": {"scope": "elsewhere"}}]
        rep = evaluate(case(cmds, q))
        s2 = result(rep, "S2")
        self.assertEqual([[e["entityId"] for e in p["entities"]] for p in s2["pages"]],
                         [["page:c", "page:d"], ["page:e"]])           # page:bb absent, page:d still present
        self.assertEqual(s2["cut"]["position"], 1)
        self.assertEqual(result(rep, "E1")["reason"], "other-query")
        self.assertEqual(result(rep, "E2")["reason"], "other-query")
        self.assertEqual(result(rep, "E4")["reason"], "other-scope")
        token = result(rep, "S1")["pages"][0]["nextCursor"]
        tampered = evaluate(case(cmds, [{"id": "T", "kind": "entityPage", "entityType": "Page",
                                         "cursor": token[:-1] + ("0" if token[-1] != "0" else "1")}]))
        self.assertEqual(result(tampered, "T")["reason"], "malformed")

    def test_fact_4_journal_facts_are_queryable(self):
        cmds = [{"clock": 100, "operations": [assert_op("A1", "j:1", ":j/a", s("one")), assert_op("A2", "j:1", ":j/b", s("two"))]},
                {"clock": 200, "operations": [assert_op("A3", "j:2", ":j/a", s("three")), {"op": "retract", "target": "A2"},
                                              assert_op("A4", "j:1", ":j/a", s("four")), {"op": "retract", "target": "A1"}]}]
        q = [{"id": "chg", "kind": "match", "cut": {"validAt": 1e15}, "pattern": {"entityId": "tx:1", "attribute": ":_tx/change"}},
             {"id": "ent", "kind": "match", "cut": {"validAt": 1e15},
              "pattern": {"entityId": "tx:1", "attribute": ":_tx/changed-entity"}},
             {"id": "all", "kind": "match", "cut": {"validAt": 1e15}, "pattern": {"entityId": "tx:1"}},
             {"id": "app", "kind": "match", "cut": {"validAt": 1e15}, "pattern": {"attribute": ":j/a"}}]
        rep = evaluate(case(cmds, q))
        self.assertEqual(result(rep, "chg")["count"], 4)
        self.assertEqual(sorted(r["value"]["value"] for r in result(rep, "ent")["raw"]), ["j:1", "j:2"])
        self.assertEqual(result(rep, "all")["error"], "X-NOT-MODELED")      # other envelope facts (R-JNL-6)
        self.assertTrue(all(r["entityType"] is None for r in result(rep, "app")["raw"]))
        # journal facts cannot be retracted (TK-JOURNAL-RETRACT)
        jid = result(rep, "chg")["raw"][0]["id"]
        rep2 = evaluate(case(cmds + [{"clock": 300, "operations": [{"op": "retract", "id": jid}]},
                                     {"clock": 400, "operations": [{"op": "retract-pattern",
                                                                    "pattern": {"entityId": "tx:1"}}]}]))
        self.assertEqual(outcome(rep2, 2)["error"], "E-RESERVED")
        self.assertEqual(outcome(rep2, 3)["error"], "E-RESERVED")

    def test_fact_1_assert_changes_carry_assertion_tx_id(self):
        rep = evaluate(case([{"clock": 1, "operations": [assert_op("a", "e", ":x", ref("e2"))]}],
                            [{"id": "tx", "kind": "transactions"}]))
        self.assertEqual(result(rep, "tx")["transactions"][0]["changes"][0]["assertionTxId"], "tx:0")


if __name__ == "__main__":
    unittest.main()

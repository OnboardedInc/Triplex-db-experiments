"""R-CUT-*, R-HIST-*, R-PAGE-*, R-SUP-*, R-AGG-0: reads at a cut."""

import unittest

from lab.oracles.replay.tests.helpers import assert_op, case, committed_receipts, evaluate, i64, ref, result, s

A = ":x/a"


def ids(rows):
    return [r["id"] for r in rows]


class Visibility(unittest.TestCase):
    def test_half_open_valid_interval(self):
        cmds = [{"clock": 1, "operations": [assert_op("a", "e", A, s("v"), valid_from=10.125, valid_to=30.5)]}]
        q = [{"id": str(v), "kind": "match", "cut": {"validAt": v}} for v in (10.124, 10.125, 20.25, 30.4999, 30.5)]
        rep = evaluate(case(cmds, q))
        self.assertEqual([len(result(rep, str(v))["raw"]) for v in (10.124, 10.125, 20.25, 30.4999, 30.5)],
                         [0, 1, 1, 1, 0])

    def test_recorded_time_is_independent_of_position(self):
        """Orchestrator correction 1: P1 at R=2000, P2 at R=1000; R=1500 sees P2 only."""
        cmds = [{"operations": [assert_op("p1fact", "e1", A, s("one"))]},
                {"operations": [assert_op("p2fact", "e2", A, s("two"))]}]
        q = [{"id": "r1500", "kind": "match", "cut": {"recordedAt": 1500, "validAt": 0}},
             {"id": "r2000", "kind": "match", "cut": {"recordedAt": 2000, "validAt": 0}},
             {"id": "p1r2000", "kind": "match", "cut": {"position": 1, "recordedAt": 2000, "validAt": 0}},
             {"id": "latest", "kind": "match", "cut": {"validAt": 0}}]
        c = case(cmds, q)
        c["receipts"] = committed_receipts(c, instants=[2000, 1000])
        rep = evaluate(c)
        self.assertEqual(rep["verdict"], "PASS")
        self.assertEqual(ids(result(rep, "r1500")["raw"]), ["id-p2fact"])
        self.assertEqual(ids(result(rep, "r2000")["raw"]), ["id-p1fact", "id-p2fact"])
        self.assertEqual(ids(result(rep, "p1r2000")["raw"]), ["id-p1fact"])
        self.assertEqual(len(result(rep, "latest")["raw"]), 2)

    def test_retirement_under_decreasing_clock(self):
        """A retraction at a later position but an earlier instant is known at that R."""
        cmds = [{"operations": [assert_op("a", "e", A, s("v"))]},
                {"operations": [{"op": "retract", "target": "a"}]}]
        q = [{"id": "r1500", "kind": "match", "cut": {"recordedAt": 1500, "validAt": 0}},
             {"id": "h1500", "kind": "history", "entityId": "e", "cut": {"recordedAt": 1500}},
             {"id": "h2500", "kind": "history", "entityId": "e", "cut": {"recordedAt": 2500}}]
        c = case(cmds, q)
        c["receipts"] = committed_receipts(c, instants=[2000, 1000])
        rep = evaluate(c)
        self.assertEqual(result(rep, "r1500")["raw"], [])      # arrival (R=2000) not yet known
        self.assertEqual(result(rep, "h1500")["rawLifetime"], [])
        snap = result(rep, "h2500")["asOfSnapshot"][0]
        self.assertEqual((snap["retractedPosition"], snap["retractedAt"]), (2, 1000))

    def test_snapshot_mask_versus_raw_lifetime(self):
        cmds = [{"clock": 1000.25, "operations": [assert_op("a", "e", A, s("A"))]},
                {"clock": 1001.25, "operations": [{"op": "retract", "target": "a"}, assert_op("b", "e", A, s("B"))]}]
        q = [{"id": "old", "kind": "history", "entityId": "e", "cut": {"recordedAt": 1000.25}},
             {"id": "p1", "kind": "history", "entityId": "e", "cut": {"position": 1}},
             {"id": "all", "kind": "history", "entityId": "e"},
             {"id": "m", "kind": "match", "cut": {"recordedAt": 1000.25, "validAt": 0}}]
        rep = evaluate(case(cmds, q))
        old = result(rep, "old")
        self.assertEqual(ids(old["rawLifetime"]), ["a"])
        self.assertEqual(old["rawLifetime"][0]["retractedAt"], 1001.25)      # raw keeps future retirement
        self.assertIsNone(old["asOfSnapshot"][0]["retractedAt"])             # snapshot masks it
        self.assertIsNone(result(rep, "p1")["asOfSnapshot"][0]["retractTxId"])
        self.assertEqual(result(rep, "all")["asOfSnapshot"][0]["retractTxId"], "tx:1")
        m = result(rep, "m")
        self.assertEqual(m["raw"][0]["retractedPosition"], 2)
        self.assertIsNone(m["snapshot"][0]["retractedPosition"])

    def test_cut_validation(self):
        cmds = [{"clock": 1, "operations": [assert_op("a", "e", A, s("A"))]}]
        q = [{"id": "neg", "kind": "match", "cut": {"validAt": -1}},
             {"id": "far", "kind": "match", "cut": {"position": 5, "validAt": 0}}]
        rep = evaluate(case(cmds, q))
        self.assertEqual(result(rep, "neg")["error"], "X-INVALID-BASIS")
        self.assertEqual(result(rep, "far")["error"], "E-UNAVAILABLE-CUT")
        self.assertEqual((result(rep, "far")["_tag"], result(rep, "far")["reason"]), ("ReadError", "unavailable-cut"))


class Pages(unittest.TestCase):
    def test_entity_page_codepoint_order(self):
        ents = ["b", "a", "", "\U00010000", "A"]
        cmds = [{"clock": 1, "operations": [assert_op(f"r{k}", e, A, s(e), entity_type="T") for k, e in enumerate(ents)]}]
        rep = evaluate(case(cmds, [{"id": "pg", "kind": "entityPage", "entityType": "T", "limit": 2,
                                    "cut": {"validAt": 0}}]))
        pages = result(rep, "pg")["pages"]
        self.assertEqual([[e["entityId"] for e in p["entities"]] for p in pages],
                         [["A", "a"], ["b", ""], ["\U00010000"]])
        self.assertEqual([p["hasMore"] for p in pages], [True, True, False])

    def test_transaction_limit_bounds(self):
        rep = evaluate(case([], [{"id": "bad", "kind": "transactions", "limit": 1001}]))
        self.assertEqual(result(rep, "bad")["_tag"], "ReadError")


class Supports(unittest.TestCase):
    def test_value_supports_count_equal_duplicates(self):
        cmds = [{"clock": 1, "operations": [assert_op("a", "e", A, s("v")), assert_op("b", "e", A, s("v")),
                                            assert_op("c", "e", A, s("w"))]},
                {"clock": 2, "operations": [{"op": "retract", "target": "a"}]}]
        q = [{"id": f"p{p}", "kind": "valueSupports", "cut": {"position": p, "validAt": 0}} for p in (1, 2)]
        rep = evaluate(case(cmds, q))
        self.assertEqual([(x["value"]["value"], x["count"]) for x in result(rep, "p1")["supports"]], [("v", 2), ("w", 1)])
        self.assertEqual([(x["value"]["value"], x["assertionIds"]) for x in result(rep, "p2")["supports"]],
                         [("v", ["b"]), ("w", ["c"])])

    def test_reachability_supports_and_cycle(self):
        edges = [("ab", "A", "B"), ("ac", "A", "C"), ("bd", "B", "D"), ("cd", "C", "D")]
        cmds = [{"clock": 1, "operations": [assert_op(r, f, ":g/edge", ref(t)) for r, f, t in edges]},
                {"clock": 2, "operations": [{"op": "retract", "target": "bd"}]},
                {"clock": 3, "operations": [assert_op("ca", "C", ":g/edge", ref("A"))]}]
        q = [{"id": f"p{p}", "kind": "reachability", "attribute": ":g/edge", "from": "A", "to": "D",
              "cut": {"position": p, "validAt": 0}} for p in (1, 2, 3)]
        rep = evaluate(case(cmds, q))
        self.assertEqual(result(rep, "p1")["supportCount"], 2)
        self.assertEqual(result(rep, "p2")["supportCount"], 1)
        self.assertEqual(result(rep, "p2")["paths"][0]["edgeAssertionIds"], [["ac", "cd"]])
        self.assertEqual(result(rep, "p3")["error"], "X-CYCLE")


class Aggregates(unittest.TestCase):
    def setUp(self):
        rows = [("p1", "acct", "USD", i64(2 ** 62)), ("p2", "acct", "USD", i64(2 ** 62)),
                ("p3", "acct", "USD", i64(-2 ** 62)), ("p4", "acct", "EUR", {"type": "number", "value": 1.0}),
                ("p5", "acct", "EUR", i64(1))]
        ops = []
        for e, a, c, amt in rows:
            ops += [assert_op(e + "a", e, ":p/account", s(a)), assert_op(e + "c", e, ":p/currency", s(c)),
                    assert_op(e + "m", e, ":p/amount", amt)]
        self.cmds = [{"clock": 1, "operations": ops}]
        self.match = {"attributes": {"acct": ":p/account", "cur": ":p/currency", "amt": ":p/amount"}}

    def q(self, **kw):
        base = {"kind": "aggregate", "cut": {"validAt": 0}, "match": self.match}
        base.update(kw)
        return base

    def test_grouped_exact_sum_and_mixed_family_group(self):
        rep = evaluate(case(self.cmds, [
            self.q(id="usd", where=[{"var": "cur", "op": "eq", "value": s("USD")}],
                   aggregates=[{"op": "sum", "var": "amt", "as": "total"}]),
            self.q(id="eur", where=[{"var": "cur", "op": "eq", "value": s("EUR")}],
                   aggregates=[{"op": "sum", "var": "amt", "as": "total"}]),
            self.q(id="none", where=[{"var": "cur", "op": "eq", "value": s("GBP")}],
                   aggregates=[{"op": "sum", "var": "amt"}, {"op": "count", "var": "$entity"}]),
            self.q(id="grouped-none", where=[{"var": "cur", "op": "eq", "value": s("GBP")}], groupBy=["cur"],
                   aggregates=[{"op": "count", "var": "$entity"}]),
            self.q(id="avg", aggregates=[{"op": "avg", "var": "amt"}]),
            self.q(id="by-amount", groupBy=["amt"], aggregates=[{"op": "count", "var": "$entity", "as": "n"}])]))
        self.assertEqual(result(rep, "usd")["rows"][0]["total"]["value"], str(2 ** 62))
        self.assertEqual(result(rep, "eur")["error"], "E-MIXED-FAMILY")
        self.assertEqual(result(rep, "none")["rows"], [{"sum": None, "count": {"type": "integer", "value": "0"}}])
        self.assertEqual(result(rep, "grouped-none")["rows"], [])
        self.assertEqual(result(rep, "avg")["_tag"], "DatalogValidationError")
        groups = [(r["amt"]["type"], r["n"]["value"]) for r in result(rep, "by-amount")["rows"]]
        self.assertEqual(groups, [("integer", "1"), ("integer", "1"), ("integer", "2"), ("number", "1")])


if __name__ == "__main__":
    unittest.main()

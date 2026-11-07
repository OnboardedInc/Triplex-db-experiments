"""R-ENT-*: entity models, conflicts (C5), includes, find, cursors, timelines."""

import unittest

from lab.oracles.replay.tests.helpers import assert_op, case, evaluate, i64, ref, result, s

SCHEMA = [{"version": 1, "entityTypes": {
    "Person": {"attributes": {
        "name": {"attribute": ":person/name", "type": "string", "required": True},
        "age": {"attribute": ":person/age", "type": "integer"},
        "nick": {"attribute": ":person/nick", "type": "string"},
        "tags": {"attribute": ":person/tag", "type": "string", "cardinality": "many"},
        "org": {"attribute": ":person/org", "type": "ref", "target": "Org"}}},
    "Org": {"attributes": {"name": {"attribute": ":org/name", "type": "string"}}},
    "Membership": {"attributes": {"person": {"attribute": ":m/person", "type": "ref", "target": "Person"}}}}}]


def P(r, e, attr, value, **kw):
    return assert_op(r, e, attr, value, entity_type="Person", **kw)


def build(extra_ops=(), queries=()):
    ops = [P("n1", "p1", ":person/name", s("Ann")), P("a1", "p1", ":person/age", i64(30)),
           P("t1", "p1", ":person/tag", s("b")), P("t2", "p1", ":person/tag", s("a")), P("t3", "p1", ":person/tag", s("b")),
           P("o1", "p1", ":person/org", ref("org1")),
           P("n2", "p2", ":person/name", s("Bob")), P("a2", "p2", ":person/age", i64(25)),
           P("n3", "p3", ":person/name", s("Cy")),
           assert_op("on", "org1", ":org/name", s("Acme"), entity_type="Org"),
           assert_op("m1", "m1", ":m/person", ref("p1"), entity_type="Membership")]
    return evaluate(case([{"clock": 1, "operations": ops + list(extra_ops)}], queries, schemas=SCHEMA))


def cut():
    return {"validAt": 0}


class Models(unittest.TestCase):
    def test_card_one_card_many_missing_optional(self):
        rep = build(queries=[{"id": "g", "kind": "get", "entityType": "Person", "entityId": "p1", "cut": cut()}])
        m = result(rep, "g")
        props = m["properties"]
        self.assertEqual(props["name"]["value"]["value"], "Ann")
        self.assertEqual([v["value"]["value"] for v in props["tags"]["values"]], ["a", "b"])   # set, canonical order
        self.assertEqual(props["tags"]["values"][1]["supports"], ["t1", "t3"])
        self.assertNotIn("nick", props)                                                    # absent optional

    def test_equal_duplicates_are_not_a_conflict(self):
        rep = build([P("n1b", "p1", ":person/name", s("Ann"))],
                    [{"id": "g", "kind": "get", "entityType": "Person", "entityId": "p1", "cut": cut()}])
        self.assertEqual(result(rep, "g")["properties"]["name"]["supports"], ["n1", "n1b"])

    def test_conflict_fails_get_and_getmany_with_every_conflict(self):
        rep = build([P("n1x", "p1", ":person/name", s("Anne")), P("a2x", "p2", ":person/age", i64(26))],
                    [{"id": "g", "kind": "getMany", "entityType": "Person", "entityIds": ["p1", "p2", "nobody"],
                      "cut": cut()},
                     {"id": "g3", "kind": "getMany", "entityType": "Person", "entityIds": ["p3", "nobody"], "cut": cut()}])
        err = result(rep, "g")
        self.assertEqual((err["error"], err["_tag"], err["reason"]),
                         ("E-CONFLICTING-VALUES", "ConflictingValuesError", "conflicting-values"))
        self.assertEqual(err["conflicts"], [{"entityId": "p1", "attribute": ":person/name"},
                                            {"entityId": "p2", "attribute": ":person/age"}])
        many = result(rep, "g3")
        self.assertEqual(many[0]["entityId"], "p3")
        self.assertIsNone(many[1])

    def test_int64_and_binary64_one_are_distinct_values(self):
        rep = build([P("ax", "p3", ":person/age", i64(1)), P("ay", "p3", ":person/age", {"type": "number", "value": 1.0})],
                    [{"id": "g", "kind": "get", "entityType": "Person", "entityId": "p3", "cut": cut()}])
        self.assertEqual(result(rep, "g")["_tag"], "ConflictingValuesError")

    def test_includes_and_reverse_refs(self):
        rep = build(queries=[{"id": "g", "kind": "get", "entityType": "Person", "entityId": "p1", "cut": cut(),
                              "include": ["org", {"reverse": {"name": "memberships", "type": "Membership",
                                                              "prop": "person"}}]}])
        inc = result(rep, "g")["includes"]
        self.assertEqual(inc["org"]["properties"]["name"]["value"]["value"], "Acme")
        self.assertEqual([m["entityId"] for m in inc["memberships"]], ["m1"])

    def test_missing_required_reported(self):
        rep = build([P("x", "p4", ":person/age", i64(1))],
                    [{"id": "g", "kind": "get", "entityType": "Person", "entityId": "p4", "cut": cut()}])
        self.assertEqual(result(rep, "g")["missingRequired"], ["name"])


class Find(unittest.TestCase):
    def test_predicates_order_limit_pages(self):
        rep = build(queries=[
            {"id": "range", "kind": "find", "entityType": "Person", "cut": cut(),
             "where": [{"prop": "age", "op": "gte", "value": i64(25)}], "orderBy": [{"prop": "age"}]},
            {"id": "desc", "kind": "find", "entityType": "Person", "cut": cut(),
             "orderBy": [{"prop": "age", "direction": "desc"}], "pageSize": 2},
            {"id": "tag", "kind": "find", "entityType": "Person", "cut": cut(),
             "where": [{"prop": "tags", "op": "eq", "value": s("a")}]},
            {"id": "in", "kind": "find", "entityType": "Person", "cut": cut(),
             "where": [{"prop": "name", "op": "in", "values": [s("Bob"), s("Cy")]}], "limit": 1},
            {"id": "ref", "kind": "find", "entityType": "Person", "cut": cut(),
             "where": [{"prop": "org", "op": "eq", "value": ref("org1")}]},
            {"id": "cross", "kind": "find", "entityType": "Person", "cut": cut(),
             "where": [{"prop": "age", "op": "eq", "value": {"type": "number", "value": 30}}]},
            {"id": "missing", "kind": "find", "entityType": "Person", "cut": cut(),
             "where": [{"prop": "age", "op": "missing"}]}])
        self.assertEqual(result(rep, "range")["pages"][0]["ids"], ["p2", "p1"])
        desc = result(rep, "desc")["pages"]
        self.assertEqual([p["ids"] for p in desc], [["p1", "p2"], ["p3"]])          # missing sorts last
        self.assertEqual([p["hasMore"] for p in desc], [True, False])
        self.assertEqual(result(rep, "tag")["pages"][0]["ids"], ["p1"])
        self.assertEqual(result(rep, "in")["pages"][0]["ids"], ["p2"])
        self.assertEqual(result(rep, "ref")["pages"][0]["ids"], ["p1"])
        self.assertEqual(result(rep, "cross")["total"], 0)
        self.assertEqual(result(rep, "missing")["pages"][0]["ids"], ["p3"])

    def test_conflict_only_fails_queries_that_reference_it(self):
        extra = [P("n2x", "p2", ":person/name", s("Robert"))]
        rep = build(extra, [
            {"id": "by-age", "kind": "count", "entityType": "Person", "cut": cut(),
             "where": [{"prop": "age", "op": "gt", "value": i64(0)}]},
            {"id": "docs", "kind": "find", "entityType": "Person", "cut": cut(),
             "where": [{"prop": "age", "op": "gt", "value": i64(0)}]},
            {"id": "projected", "kind": "find", "entityType": "Person", "cut": cut(), "select": ["age"],
             "where": [{"prop": "age", "op": "gt", "value": i64(0)}]},
            {"id": "by-name", "kind": "find", "entityType": "Person", "cut": cut(),
             "where": [{"prop": "age", "op": "eq", "value": i64(30)}], "orderBy": [{"prop": "name"}]}])
        self.assertEqual(result(rep, "by-age")["total"], 2)     # count returns no documents (C5.3)
        # Q21 AMB-17 A: a returned document containing the conflicted attribute fails the find ...
        self.assertEqual(result(rep, "docs")["conflicts"], [{"entityId": "p2", "attribute": ":person/name"}])
        # ... and a projection that omits it succeeds
        self.assertEqual(result(rep, "projected")["pages"][0]["ids"], ["p1", "p2"])
        self.assertEqual(result(rep, "by-name")["conflicts"], [{"entityId": "p2", "attribute": ":person/name"}])


class Timelines(unittest.TestCase):
    def test_recorded_and_valid_timelines(self):
        cmds = [{"clock": 1, "operations": [P("a", "p1", ":person/name", s("A"), valid_from=0, valid_to=10),
                                            P("b", "p1", ":person/name", s("B"), valid_from=10)]},
                {"clock": 2, "operations": [{"op": "retract", "target": "b"},
                                            P("c", "p1", ":person/name", s("C"), valid_from=10)]},
                {"clock": 3, "operations": [assert_op("z", "other", ":x/y", s("z"))]}]
        q = [{"id": "tl", "kind": "modelTimeline", "entityType": "Person", "entityId": "p1", "cut": {"validAt": 15}},
             {"id": "vt", "kind": "validTimeline", "entityType": "Person", "entityId": "p1", "cut": {"position": 1}}]
        rep = evaluate(case(cmds, q, schemas=SCHEMA))
        tl = result(rep, "tl")
        self.assertEqual([(t["position"], t["model"]["properties"]["name"]["value"]["value"]) for t in tl],
                         [(1, "B"), (2, "C")])
        vt = result(rep, "vt")
        self.assertEqual([(x["validFrom"], x["validTo"], x["model"]["properties"]["name"]["value"]["value"]) for x in vt],
                         [(0, 10, "A"), (10, None, "B")])


if __name__ == "__main__":
    unittest.main()

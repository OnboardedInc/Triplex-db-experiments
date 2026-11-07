"""R-CMD-*, R-RCP-*, R-CON-*, R-JNL-*: command outcomes, receipts, constraints, journal."""

import unittest

from lab.oracles.replay.tests.helpers import (assert_op, case, committed_receipts, evaluate, i64, outcome, ref,
                                              result, s)

NAME = ":person/name"


def person(ref_, entity, name, **kw):
    return assert_op(ref_, entity, NAME, s(name), entity_type="Person", **kw)


class Outcomes(unittest.TestCase):
    def test_duplicate_command_id_returns_original_txid(self):
        cmds = [{"clock": 1, "meta": {"commandId": "c1"}, "operations": [person("a", "p1", "A")]},
                {"clock": 2, "meta": {"commandId": "c1"}, "operations": [person("b", "p1", "B")]}]
        rep = evaluate(case(cmds))
        self.assertEqual(outcome(rep, 1)["error"], "E-COMMAND-COMMITTED")
        self.assertEqual(outcome(rep, 1)["errorTag"], "CommandAlreadyCommittedError")
        self.assertEqual(outcome(rep, 1)["transactionId"], "tx:0")
        self.assertEqual(rep["state"][0]["lastPosition"], 1)   # rejected commands hold no position

    def test_triple_live_conflict_and_missing_retract(self):
        cmds = [{"clock": 1, "operations": [person("a", "p1", "A")]},
                {"clock": 2, "operations": [{"op": "retract", "target": "a"}, person("b", "p1", "B")],
                 "meta": {"preconditions": [{"_tag": "TripleLive", "target": "a"}]}},
                {"clock": 3, "operations": [{"op": "retract", "target": "a"}, person("c", "p1", "C")],
                 "meta": {"preconditions": [{"_tag": "TripleLive", "target": "a"}]}},
                {"clock": 4, "operations": [person("d", "p1", "D")],
                 "meta": {"preconditions": [{"_tag": "TripleLive", "target": "b"}]}}]
        rep = evaluate(case(cmds))
        self.assertEqual(outcome(rep, 1)["outcome"], "committed")
        self.assertEqual(outcome(rep, 2)["errorTag"], "TransactionConflictError")
        self.assertEqual(outcome(rep, 3)["error"], "E-INVALID-VALUE")

    def test_entity_state_precondition(self):
        cmds = [{"clock": 1, "operations": [person("a", "p1", "A")]},
                {"clock": 2, "operations": [person("b", "p1", "B")],
                 "meta": {"preconditions": [{"_tag": "EntityState", "entityId": "p1", "targets": ["a"]}]}},
                {"clock": 3, "operations": [person("c", "p1", "C")],
                 "meta": {"preconditions": [{"_tag": "EntityState", "entityId": "p1", "targets": ["a"]}]}}]
        rep = evaluate(case(cmds))
        self.assertEqual(outcome(rep, 1)["outcome"], "committed")
        self.assertEqual(outcome(rep, 2)["error"], "E-TX-CONFLICT")

    def test_invalid_value_rejects_whole_command(self):
        cmds = [{"clock": 1, "operations": [person("a", "p1", "A"),
                                            assert_op("b", "p1", ":person/age", {"type": "integer", "value": "01"})]}]
        rep = evaluate(case(cmds, [{"id": "all", "kind": "assertions"}]))
        self.assertEqual(outcome(rep, 0)["error"], "E-INVALID-VALUE")
        self.assertEqual(result(rep, "all")["assertions"], [])

    def test_reserved_namespace(self):
        for op in (assert_op("a", "t", ":_tx/actor", s("x")),
                   assert_op("a", "t", ":x/y", s("x"), entity_type="_Transaction"),
                   {"op": "retract-pattern", "pattern": {"entityType": "_Transaction"}}):
            rep = evaluate(case([{"clock": 1, "operations": [op]}]))
            self.assertEqual(outcome(rep, 0)["error"], "E-RESERVED")

    def test_retract_pattern_and_retract_non_live(self):
        cmds = [{"clock": 1, "operations": [person("a", "p1", "A"), person("b", "p1", "A"), person("c", "p2", "A")]},
                {"clock": 2, "operations": [{"op": "retract-pattern", "pattern": {"entityId": "p1"}}]},
                {"clock": 3, "operations": [{"op": "retract", "target": "a"}]}]
        rep = evaluate(case(cmds, [{"id": "tx", "kind": "transactions"}]))
        changes = result(rep, "tx")["transactions"][1]["changes"]
        self.assertEqual([c["tripleId"] for c in changes], ["a", "b"])
        self.assertEqual(outcome(rep, 2)["error"], "E-TX-CONFLICT")

    def test_host_abort_and_empty_interval(self):
        cmds = [{"clock": 1, "hostAbort": True, "operations": [person("a", "p1", "A")]},
                {"clock": 2, "operations": [person("b", "p1", "B", valid_from=5, valid_to=5)]}]
        rep = evaluate(case(cmds))
        self.assertEqual(outcome(rep, 0)["error"], "host-abort")
        self.assertEqual(outcome(rep, 1)["error"], "E-INVALID-VALUE")

    def test_valid_from_defaults_to_transaction_instant(self):
        op = person("a", "p1", "A")
        del op["validFrom"]
        rep = evaluate(case([{"clock": 1234.5, "operations": [op]}], [{"id": "all", "kind": "assertions"}]))
        self.assertEqual(result(rep, "all")["assertions"][0]["validFrom"], 1234.5)


class Receipts(unittest.TestCase):
    def base(self):
        return case([{"clock": 1, "operations": [person("a", "p1", "A")]},
                     {"clock": 2, "operations": [person("b", "p2", "B")]}])

    def test_consistent_receipts_pass(self):
        c = self.base()
        c["receipts"] = committed_receipts(c)
        rep = evaluate(c)
        self.assertEqual(rep["verdict"], "PASS")
        self.assertEqual(rep["receiptConsistency"]["status"], "PASS")

    def test_gap_reuse_and_rejected_with_position(self):
        c = self.base()
        c["receipts"] = committed_receipts(c)
        c["receipts"][1]["position"] = 3          # Q31c: positions need not be dense
        rc = evaluate(c)["receiptConsistency"]
        self.assertEqual(rc["status"], "PASS")
        self.assertEqual(rc["positions"], [{"scope": "s", "coordinates": "integer", "dense": False, "aborted": []}])
        c["receipts"][1]["position"] = 1          # a reused position
        self.assertEqual(evaluate(c)["receiptConsistency"]["status"], "FAIL")
        c["receipts"] = committed_receipts(c)
        c["receipts"][1]["txId"] = "T0"
        self.assertEqual(evaluate(c)["receiptConsistency"]["status"], "FAIL")
        c["receipts"] = committed_receipts(c)
        c["receipts"][1]["assertionIds"] = ["id-a"]
        self.assertEqual(evaluate(c)["receiptConsistency"]["status"], "FAIL")
        c["receipts"] = committed_receipts(c)
        c["receipts"][1].update(outcome="rejected", error={"_tag": "X"})
        rep = evaluate(c)
        self.assertEqual(rep["receiptConsistency"]["status"], "FAIL")
        self.assertEqual(rep["commandOutcomes"][1]["verdict"], "FAIL")

    def test_decreasing_clocks_are_consistent(self):
        """Orchestrator correction 1: instants need not be non-decreasing in position order."""
        c = case([{"operations": [person("a", "p1", "A")]}, {"operations": [person("b", "p2", "B")]}])
        c["receipts"] = committed_receipts(c, instants=[2000, 1000])
        rep = evaluate(c)
        self.assertEqual(rep["receiptConsistency"]["status"], "PASS")

    def test_receipt_cannot_make_an_invalid_command_commit(self):
        """Orchestrator correction 3: outcome authority stays with the oracle."""
        c = case([{"clock": 1, "meta": {"commandId": "k"}, "operations": [person("a", "p1", "A")]},
                  {"clock": 2, "meta": {"commandId": "k"}, "operations": [person("b", "p1", "B")]}],
                 [{"id": "m", "kind": "match", "cut": {"validAt": 0}, "pattern": {"entityId": "p1"}}])
        c["receipts"] = committed_receipts(c)
        rep = evaluate(c)
        self.assertEqual(rep["verdict"], "FAIL")
        self.assertEqual(rep["commandOutcomes"][1]["expected"]["outcome"], "rejected")
        self.assertEqual([r["id"] for r in result(rep, "m")["raw"]], ["id-a"])

    def test_receipt_rejection_matching_expected(self):
        c = case([{"clock": 1, "meta": {"commandId": "k"}, "operations": [person("a", "p1", "A")]},
                  {"clock": 2, "meta": {"commandId": "k"}, "operations": [person("b", "p1", "B")]}])
        c["receipts"] = committed_receipts(c)[:1] + [
            {"command": 1, "outcome": "rejected",
             "error": {"_tag": "CommandAlreadyCommittedError", "transactionId": "T0"}}]
        self.assertEqual(evaluate(c)["verdict"], "PASS")
        c["receipts"][1]["error"]["transactionId"] = "T9"
        self.assertEqual(evaluate(c)["verdict"], "FAIL")

    def test_unknown_outcome_must_be_resolved(self):
        c = self.base()
        c["receipts"] = committed_receipts(c)
        c["receipts"][1]["outcome"] = "unknown"
        self.assertEqual(evaluate(c)["verdict"], "FAIL")
        c["receipts"][1]["resolvedOutcome"] = "committed"
        self.assertEqual(evaluate(c)["verdict"], "PASS")

    def test_declared_clock_must_match_receipt_instant(self):
        c = self.base()
        c["receipts"] = committed_receipts(c, instants=[1, 3])
        self.assertEqual(evaluate(c)["receiptConsistency"]["status"], "FAIL")


class NestedAndInternal(unittest.TestCase):
    def test_each_nested_position_is_a_cut(self):
        cmds = [{"clock": 1, "physicalGroup": "g", "operations": [person("a", "p1", "A")]},
                {"clock": 1, "physicalGroup": "g", "operations": [{"op": "retract", "target": "a"},
                                                                  person("b", "p1", "B")]},
                {"kind": "internal", "clock": 2}]
        q = [{"id": f"P{p}", "kind": "match", "cut": {"position": p, "validAt": 0}, "pattern": {"entityId": "p1"}}
             for p in (1, 2, 3)] + [{"id": "tx", "kind": "transactions"}]
        c = case(cmds, q)
        c["receipts"] = committed_receipts(c)
        rep = evaluate(c)
        self.assertEqual(rep["verdict"], "PASS")
        self.assertEqual([r["value"]["value"] for r in result(rep, "P1")["raw"]], ["A"])
        self.assertEqual([r["value"]["value"] for r in result(rep, "P2")["raw"]], ["B"])
        self.assertEqual([t["position"] for t in result(rep, "tx")["transactions"]], [1, 2, 3])
        self.assertTrue(result(rep, "tx")["transactions"][2]["internal"])

    def test_non_consecutive_physical_group_flagged(self):
        cmds = [{"clock": 1, "physicalGroup": "g", "operations": [person("a", "p1", "A")]},
                {"clock": 1, "operations": [person("x", "p9", "X")]},
                {"clock": 1, "physicalGroup": "g", "operations": [person("b", "p2", "B")]}]
        c = case(cmds)
        c["receipts"] = committed_receipts(c)
        self.assertEqual(evaluate(c)["receiptConsistency"]["status"], "FAIL")

    def test_failed_child_rejected_alone(self):
        cmds = [{"clock": 1, "physicalGroup": "g", "operations": [person("a", "p1", "A")]},
                {"clock": 1, "physicalGroup": "g", "operations": [{"op": "retract", "id": "nope"}]},
                {"clock": 1, "physicalGroup": "g", "operations": [person("b", "p2", "B")]}]
        rep = evaluate(case(cmds))
        self.assertEqual([o["expected"]["outcome"] for o in rep["commandOutcomes"]], ["committed", "rejected", "committed"])
        self.assertEqual(rep["state"][0]["lastPosition"], 2)


class Races(unittest.TestCase):
    def race_case(self):
        cmds = [{"clock": 1, "operations": [person("a", "p1", "A")]}]
        for k in range(3):
            cmds.append({"clock": 2, "race": "r", "operations": [{"op": "retract", "target": "a"},
                                                                  person(f"w{k}", "p1", f"W{k}")],
                         "meta": {"preconditions": [{"_tag": "TripleLive", "target": "a"}]}})
        return case(cmds)

    def test_exactly_one_winner_any_order(self):
        c = self.race_case()
        rec = committed_receipts(c)[:1]
        rec.append({"command": 2, "outcome": "committed", "txId": "TW", "position": 2, "instant": 2,
                    "assertionIds": [None, "id-w1"]})
        rec += [{"command": k, "outcome": "rejected", "error": {"_tag": "TransactionConflictError"}} for k in (1, 3)]
        c["receipts"] = rec
        rep = evaluate(c)
        self.assertEqual(rep["verdict"], "PASS")

    def test_two_winners_is_a_failure(self):
        c = self.race_case()
        rec = committed_receipts(c)[:1]
        rec.append({"command": 1, "outcome": "committed", "txId": "T1", "position": 2, "instant": 2,
                    "assertionIds": [None, "id-w0"]})
        rec.append({"command": 2, "outcome": "committed", "txId": "T2", "position": 3, "instant": 2,
                    "assertionIds": [None, "id-w1"]})
        rec.append({"command": 3, "outcome": "rejected", "error": {"_tag": "TransactionConflictError"}})
        c["receipts"] = rec
        self.assertEqual(evaluate(c)["verdict"], "FAIL")

    def test_rejected_member_that_could_never_fail_is_a_failure(self):
        cmds = [{"clock": 1, "race": "r", "operations": [person("a", "p1", "A")]},
                {"clock": 1, "race": "r", "operations": [person("b", "p2", "B")]}]
        c = case(cmds)
        c["receipts"] = [committed_receipts(c)[0], {"command": 1, "outcome": "rejected", "error": {"_tag": "X"}}]
        self.assertEqual(evaluate(c)["verdict"], "FAIL")


class Constraints(unittest.TestCase):
    RULES = [{"_tag": "Required", "v": 1, "entityType": "Person", "attribute": NAME},
             {"_tag": "Cardinality", "v": 1, "entityType": "Person", "attribute": NAME, "max": 1},
             {"_tag": "Unique", "v": 1, "entityType": "Person", "attribute": NAME}]

    def run_cmds(self, cmds):
        for c in cmds:
            c.setdefault("meta", {}).setdefault("enforce", {"constraints": self.RULES})
        return evaluate(case(cmds))

    def test_cardinality_counts_equal_duplicates(self):
        rep = self.run_cmds([{"clock": 1, "operations": [person("a", "p1", "A"), person("b", "p1", "A")]}])
        self.assertEqual(outcome(rep, 0)["codes"], ["cardinality"])

    def test_unique_and_required(self):
        rep = self.run_cmds([{"clock": 1, "operations": [person("a", "p1", "A"),
                                                         assert_op("g", "p1", ":person/age", i64(3),
                                                                   entity_type="Person")]},
                             {"clock": 2, "operations": [person("b", "p2", "A")]},
                             {"clock": 3, "operations": [{"op": "retract", "target": "a"}]},
                             {"clock": 4, "operations": [assert_op("x", "p3", ":person/age", i64(3),
                                                                   entity_type="Person")]}])
        self.assertEqual(outcome(rep, 1)["codes"], ["unique"])
        self.assertEqual(outcome(rep, 2)["codes"], ["required"])
        self.assertEqual(outcome(rep, 3)["codes"], ["required"])

    def test_retracting_every_fact_leaves_no_typed_entity(self):
        """R-CON-2: type membership comes from live typed assertions, so removing the
        entity's last fact is not a Required violation."""
        rep = self.run_cmds([{"clock": 1, "operations": [person("a", "p1", "A")]},
                             {"clock": 2, "operations": [{"op": "retract", "target": "a"}]}])
        self.assertEqual(outcome(rep, 1)["outcome"], "committed")

    def test_future_effective_boundary_checked(self):
        rep = self.run_cmds([{"clock": 1, "operations": [person("a", "p1", "A", valid_from=0, valid_to=100)]},
                             {"clock": 2, "operations": [person("b", "p1", "B", valid_from=50)]}])
        self.assertEqual(outcome(rep, 1)["codes"], ["cardinality"])
        self.assertEqual(outcome(rep, 1)["violations"][0]["validAt"], 50)

    def test_pre_existing_violation_does_not_block_unrelated_write_or_repair(self):
        cmds = [{"clock": 1, "operations": [person("a", "p1", "A"), person("b", "p1", "B")]},   # enforcement off
                {"clock": 2, "operations": [person("c", "p2", "C")],
                 "meta": {"enforce": {"constraints": self.RULES}}},
                {"clock": 3, "operations": [{"op": "retract", "target": "b"}],
                 "meta": {"enforce": {"constraints": self.RULES}}},
                {"clock": 4, "operations": [person("d", "p2", "D")],
                 "meta": {"enforce": {"constraints": self.RULES}}}]
        rep = evaluate(case(cmds))
        self.assertEqual([o["expected"]["outcome"] for o in rep["commandOutcomes"]],
                         ["committed", "committed", "committed", "rejected"])

    def test_worsening_an_existing_violation_is_rejected(self):
        cmds = [{"clock": 1, "operations": [person("a", "p1", "A"), person("b", "p1", "B")]},
                {"clock": 2, "operations": [person("c", "p1", "C")], "meta": {"enforce": {"constraints": self.RULES}}}]
        rep = evaluate(case(cmds))
        self.assertEqual(outcome(rep, 1)["codes"], ["cardinality"])
        self.assertEqual(outcome(rep, 1)["violations"][0]["actual"], 3)

    def test_reference_target(self):
        rule = [{"_tag": "ReferenceTarget", "v": 1, "entityType": "Membership", "attribute": ":m/org",
                 "targetEntityType": "Org"}]
        cmds = [{"clock": 1, "operations": [assert_op("o", "org1", ":org/name", s("O"), entity_type="Org")]},
                {"clock": 2, "meta": {"enforce": {"constraints": rule}},
                 "operations": [assert_op("m", "m1", ":m/org", ref("org1"), entity_type="Membership")]},
                {"clock": 3, "meta": {"enforce": {"constraints": rule}},
                 "operations": [assert_op("n", "m2", ":m/org", ref("nobody"), entity_type="Membership")]},
                {"clock": 4, "meta": {"enforce": {"constraints": rule}},
                 "operations": [assert_op("k", "m3", ":m/org", ref("m9"), entity_type="Membership"),
                                assert_op("k2", "m9", ":org/name", s("new"), entity_type="Org")]}]
        rep = evaluate(case(cmds))
        self.assertEqual([o["expected"]["outcome"] for o in rep["commandOutcomes"]],
                         ["committed", "committed", "rejected", "committed"])

    def test_schema_derived_rules(self):
        schemas = [{"version": 1, "entityTypes": {"Person": {"attributes": {
            "name": {"attribute": NAME, "type": "string", "required": True, "unique": True}}}}}]
        cmds = [{"clock": 1, "operations": [person("a", "p1", "A"), person("b", "p1", "B")]}]
        rep = evaluate(case(cmds, schemas=schemas, enforcement={"mode": "on", "fromSchema": 1}))
        self.assertEqual(outcome(rep, 0)["codes"], ["cardinality"])


class Journal(unittest.TestCase):
    def test_record_fields_and_change_order(self):
        cmds = [{"clock": 1, "meta": {"actor": "u", "commandId": "c1", "correlationId": "r", "causationId": "e",
                                      "configSnapshot": "snap"},
                 "operations": [person("a", "p1", "A"), assert_op("b", "p2", ":x/y", i64(5))]},
                {"clock": 2, "operations": [person("c", "p1", "C"), {"op": "retract", "target": "a"}]}]
        q = [{"id": "page", "kind": "transactions", "after": 0, "limit": 1},
             {"id": "page2", "kind": "transactions", "after": 1},
             {"id": "cmd", "kind": "transactionByCommand", "commandId": "c1"},
             {"id": "none", "kind": "transactionByCommand", "commandId": "zz"},
             {"id": "ent", "kind": "transactionsForEntity", "entityId": "p1", "limit": 1}]
        rep = evaluate(case(cmds, q))
        page = result(rep, "page")
        self.assertEqual(page["next"], 1)
        rec = page["transactions"][0]
        self.assertEqual([rec[k] for k in ("actor", "commandId", "correlationId", "causationId", "configSnapshot")],
                         ["u", "c1", "r", "e", "snap"])
        self.assertEqual(rec["changedEntities"], ["p1", "p2"])
        ch = result(rep, "page2")["transactions"][0]["changes"]
        self.assertEqual([(c["op"], c["tripleId"]) for c in ch], [("assert", "c"), ("retract", "a")])
        self.assertEqual(ch[1]["assertionTxId"], "tx:0")
        self.assertEqual(ch[1]["retractionTxId"], "tx:1")
        self.assertEqual(result(rep, "cmd")["txId"], "tx:0")
        self.assertIsNone(result(rep, "none"))
        ent = result(rep, "ent")
        self.assertEqual(([t["position"] for t in ent["transactions"]], ent["snapshotPosition"],
                          ent["nextBeforePosition"]), ([2], 2, 2))

    def test_identity_not_collapsed(self):
        rep = evaluate(case([{"clock": 1, "operations": [person("a", "p1", "A"), person("b", "p1", "A")]}],
                            [{"id": "all", "kind": "assertions"}]))
        self.assertEqual([a["id"] for a in result(rep, "all")["assertions"]], ["a", "b"])


if __name__ == "__main__":
    unittest.main()

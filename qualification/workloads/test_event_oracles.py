"""Pure contract tests. No database connection, engine imports or timing claims."""
import copy
import json
from pathlib import Path
import unittest

from event_oracles import event_oracle_checks, reachable


class EventOracleTests(unittest.TestCase):
    def setUp(self):
        packet = json.loads((Path(__file__).parent / "temporal-workloads.json").read_text())
        self.workloads = packet["workloads"]

    def test_first_ten_workloads_without_normalized_assertions(self):
        for workload in self.workloads:
            workload.pop("assertions")
        checked = event_oracle_checks(self.workloads[:10])
        self.assertEqual(len(checked), 35)
        self.assertEqual({case_id.split("/")[0] for case_id in checked},
                         {f"{index:02}" for index in range(1, 11)})

    def test_relational_workloads_without_normalized_assertions(self):
        workloads = self.workloads[10:16]
        for workload in workloads:
            workload.pop("assertions")
        checked = event_oracle_checks(workloads)
        self.assertEqual(len(checked), 20)
        self.assertEqual({case_id.split("/")[0] for case_id in checked},
                         {f"{index:02}" for index in range(11, 17)})

    def test_remaining_temporal_joins_without_normalized_assertions(self):
        workloads = [item for item in self.workloads if item["id"] in {"17", "18", "19", "20"}]
        for workload in workloads:
            workload.pop("assertions")
        checked = event_oracle_checks(workloads)
        self.assertEqual(len(checked), 16)
        self.assertEqual({case_id.split("/")[0] for case_id in checked}, {"17", "18", "19", "20"})

    def test_event_list_order_is_not_knowledge_order(self):
        baseline = event_oracle_checks(self.workloads)
        for workload in self.workloads:
            workload["events"].reverse()
        self.assertEqual(event_oracle_checks(self.workloads), baseline)

    def test_reachability_deduplicates_diamonds_and_terminates_cycles(self):
        edges = {("X", "Y"), ("X", "W"), ("Y", "Z"), ("W", "Z"), ("Z", "Y")}
        self.assertEqual(reachable(edges, "X"), {"Y", "W", "Z"})
        self.assertEqual(reachable(edges, "Y"), {"Y", "Z"})
        self.assertEqual(reachable(edges, "absent"), set())

    def test_domain_event_changes_invalidate_original_answers(self):
        # One counterfactual per domain. Expected rows and projected assertions
        # stay fixed, so each failure proves the event input affects the result.
        mutations = [("01", "shipped", "status", "held"),
                     ("02", "address-b", "address", "C"),
                     ("03", "price120", "price", "121"),
                     ("04", "coverage-fix", "valid_to", "35"),
                     ("05", "E", "revision", "4"),
                     ("06", "reverse-p1", "amount", "-499"),
                     ("07", "release", "delta", "-2"),
                     ("08", "refund2", "amount", "201"),
                     ("09", "entitlement", None, "40"),
                     ("10", "watermark20", "through", "19"),
                     ("11", "member", "valid_to", "49"),
                     ("12", "edges", "resource", "other"),
                     ("13", "move-B", "to", "pallet"),
                     ("14", "input-fix", "new_input", "A"),
                     ("14", "manufacture", "contaminated_input", False),
                     ("15", "vuln", "valid_to", "10"),
                     ("16", "add-C", "input", "D"),
                     ("17", "S-1", "at", "30"),
                     ("18", "bridge", "to", "9"),
                     ("19", "prediction", "feature_known_at", "3"),
                     ("20", "remove-BD", "target", "C")]
        for workload_id, event_id, field, changed in mutations:
            with self.subTest(workload=workload_id):
                workloads = copy.deepcopy(self.workloads)
                workload = next(item for item in workloads if item["id"] == workload_id)
                event = next(item for item in workload["events"] if item["id"] == event_id)
                if field is None:
                    event["occurred_at"] = changed
                else:
                    event["payload"][field]["value"] = changed
                    if workload_id == "17" and field == "at":
                        event["occurred_at"] = changed
                with self.assertRaisesRegex(ValueError, workload_id + "/.*immutable-event oracle disagrees"):
                    event_oracle_checks(workloads)

    def test_delivery_retries_do_not_contribute_business_events(self):
        baseline = event_oracle_checks(self.workloads)
        for workload in self.workloads:
            workload["deliveries"] = workload.get("deliveries", []) * 5
        self.assertEqual(event_oracle_checks(self.workloads), baseline)

    def test_typed_answer_identity_is_preserved(self):
        case = self.workloads[5]["cases"][-1]
        case["expected_rows"][0][0] = {"tag": "bool", "value": False}
        with self.assertRaisesRegex(ValueError, "06/empty-currency"):
            event_oracle_checks(self.workloads)


if __name__ == "__main__":
    unittest.main()

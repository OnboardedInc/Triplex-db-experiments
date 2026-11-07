"""Validate synthetic contracts without loading a database or measuring an engine."""
import json
from pathlib import Path
import re

from event_oracles import event_oracle_checks


ROOT = Path(__file__).resolve().parent
I64_MIN = -(2 ** 63)
I64_MAX = 2 ** 63 - 1


def require(condition, message):
    if not condition:
        raise ValueError(message)


def integer(value, context):
    require(isinstance(value, str) and re.fullmatch(r"0|-?[1-9][0-9]*", value), context + ": noncanonical i64")
    result = int(value)
    require(I64_MIN <= result <= I64_MAX, context + ": out-of-range i64")
    return result


def typed(value, context):
    require(isinstance(value, dict) and set(value) == {"tag", "value"}, context + ": malformed typed value")
    tag, payload = value["tag"], value["value"]
    if tag == "i64":
        return integer(payload, context)
    if tag == "str":
        require(isinstance(payload, str) and "\0" not in payload, context + ": invalid string")
        payload.encode("utf-8")
        return payload
    require(tag == "bool" and isinstance(payload, bool), context + ": invalid scalar tag/value")
    return payload


def payload(value, context):
    if value is None:
        return
    if isinstance(value, list):
        for index, child in enumerate(value):
            payload(child, context + "[" + str(index) + "]")
    elif isinstance(value, dict) and "tag" not in value:
        for key, child in value.items():
            payload(child, context + "." + key)
    else:
        typed(value, context)


def in_interval(bounds, point):
    return int(bounds[0]) <= point and (bounds[1] is None or point < int(bounds[1]))


def visible(workload, case):
    cut = case["cut"]
    return [fact for fact in workload["assertions"]
            if in_interval(fact["known"], int(cut["known_at"]))
            and in_interval(fact["valid"], int(cut["valid_at"]))]


def decoded_rows(case):
    return [tuple(typed(cell, case["id"]) for cell in row) for row in case["expected_rows"]]


def check_rows(case, rows):
    # Fixtures in these small checks have no cross-tag equal scalar values.
    require(set(decoded_rows(case)) == set(rows), case["id"] + ": hand-checkable oracle disagrees")


def parameters(case):
    return {key: typed(value, case["id"]) for key, value in case["parameters"].items()}


def grouped_facts(facts):
    result = {}
    for fact in facts:
        result.setdefault(fact["entity"], {})[fact["attribute"]] = typed(fact["value"], fact["id"])
    return result


def structural_checks(packet):
    require(packet["format"] == "temporal-workloads/1", "unexpected contract format")
    require(packet["status"] == "synthetic_correctness_contracts_unexecuted", "contracts must remain unexecuted")
    workloads = packet["workloads"]
    require([workload["id"] for workload in workloads] == [f"{index:02}" for index in range(1, 21)],
            "expected the twenty ordered handoff workloads")
    cases = 0
    for workload in workloads:
        context = workload["id"]
        require(workload["requires"] and workload["projection"], context + ": missing capability/projection contract")
        require(workload["completeness"]["sources"] and workload["completeness"]["domain"], context + ": missing source scope")
        events = {event["id"]: event for event in workload["events"]}
        require(len(events) == len(workload["events"]), context + ": duplicate event ID")
        for event in events.values():
            integer(event["occurred_at"], context)
            require(integer(event["recorded_at"], context) > 0, context + ": invalid event position")
            require(event["semantics"] in {"business_event", "assertion_change", "correction"}, context + ": unknown event semantics")
            if event["semantics"] == "correction":
                target = events.get(event.get("corrects"))
                require(target is not None, context + ": missing correction target")
                require(int(target["recorded_at"]) < int(event["recorded_at"]), context + ": correction precedes target")
            payload(event["payload"], context + "." + event["id"])
        fact_ids = set()
        for fact in workload["assertions"]:
            require(fact["id"] not in fact_ids, context + ": duplicate assertion ID")
            fact_ids.add(fact["id"])
            require(fact["source_event"] in events, context + ": missing assertion source event")
            require(fact["meaning"] in {"state", "event", "relation", "watermark"}, context + ": missing assertion meaning")
            typed(fact["value"], context + "." + fact["id"])
            for dimension in ("valid", "known"):
                bounds = fact[dimension]
                require(len(bounds) == 2, context + ": malformed interval")
                start = integer(bounds[0], context)
                if bounds[1] is not None:
                    require(integer(bounds[1], context) > start, context + ": empty or reversed interval")
            require(int(fact["known"][0]) >= int(events[fact["source_event"]]["recorded_at"]),
                    context + ": assertion predates its source event")
        for delivery in workload.get("deliveries", []):
            require(delivery["event"] in events, context + ": unknown delivery event")
            require(integer(delivery["receipt_position"], context) == int(events[delivery["event"]]["recorded_at"]),
                    context + ": duplicate delivery changed its receipt")
            require(integer(delivery["received_order"], context) > 0, context + ": invalid delivery order")
        case_ids = set()
        require(any(case["kind"] == "edge" for case in workload["cases"]), context + ": missing edge case")
        for case in workload["cases"]:
            require(case["id"] not in case_ids, context + ": duplicate case ID")
            case_ids.add(case["id"])
            require(case["kind"] in {"baseline", "edge"}, context + ": invalid case kind")
            require(re.fullmatch(r"[a-z][a-z_]*", case["operation"]), context + ": invalid operation")
            require(integer(case["cut"]["known_at"], context) >= 0, context + ": negative knowledge cut")
            if "valid_at" in case["cut"]:
                integer(case["cut"]["valid_at"], context)
            payload(case["parameters"], context + "." + case["id"])
            require(case["columns"] and len(set(case["columns"])) == len(case["columns"]), context + ": invalid columns")
            rows = set()
            for row in case["expected_rows"]:
                require(len(row) == len(case["columns"]), context + ": expected row width differs")
                for cell in row:
                    typed(cell, context + "." + case["id"])
                identity = json.dumps(row, sort_keys=True)
                require(identity not in rows, context + ": duplicate expected set row")
                rows.add(identity)
            cases += 1
    return cases


def small_oracle_checks(workloads, checked_case_ids=None):
    """Check selected simple invariants, not arbitrary Datalog or every operation."""
    checks = 0
    for workload in workloads:
        for case in workload["cases"]:
            operation = case["operation"]
            if operation == "state_at":
                params = parameters(case)
                rows = [(typed(fact["value"], fact["id"]),) for fact in visible(workload, case)
                        if fact["entity"] == params["entity"] and fact["attribute"] == params["attribute"]]
                check_rows(case, rows)
            elif operation == "relation_exists":
                params = parameters(case)
                found = any(fact["entity"] == params["entity"] and fact["attribute"] == params["attribute"]
                            and typed(fact["value"], fact["id"]) == params["target"] for fact in visible(workload, case))
                check_rows(case, [(found,)])
            elif operation == "accepted_event_count":
                params = parameters(case)
                count = sum(event["subject"] == params["subject"]
                            and int(event["recorded_at"]) <= int(case["cut"]["known_at"])
                            and int(event["occurred_at"]) <= int(case["cut"]["valid_at"])
                            for event in workload["events"])
                check_rows(case, [(count,)])
            elif operation == "account_balance":
                params = parameters(case)
                postings = grouped_facts(visible(workload, case))
                total = sum(post["amount"] for post in postings.values()
                            if post["account"] == params["account"] and post["currency"] == params["currency"])
                check_rows(case, [(total,)])
            elif operation == "inventory_balance":
                movements = grouped_facts(visible(workload, case))
                physical = sum(move["delta"] for move in movements.values() if move["ledger"] == "physical")
                reserved = sum(move["delta"] for move in movements.values() if move["ledger"] == "reservation")
                check_rows(case, [(physical, reserved, physical - reserved)])
            elif operation == "uptime_duration":
                params = parameters(case)
                ranges = sorted((max(int(fact["valid"][0]), params["from"]),
                                 min(int(fact["valid"][1]), params["to"]))
                                for fact in workload["assertions"]
                                if fact["entity"] == params["machine"]
                                and in_interval(fact["known"], int(case["cut"]["known_at"])))
                total = 0
                end = params["from"]
                for start, stop in ranges:
                    if stop > max(start, end):
                        total += stop - max(start, end)
                    end = max(end, stop)
                check_rows(case, [(total,)])
            elif operation == "reachability_supports":
                params = parameters(case)
                edges = {}
                for fact in visible(workload, case):
                    edges.setdefault(fact["entity"], set()).add(typed(fact["value"], fact["id"]))
                def paths(node, visited):
                    if node == params["to"]:
                        return 1
                    return sum(paths(target, visited | {target}) for target in edges.get(node, set()) if target not in visited)
                count = paths(params["from"], {params["from"]})
                check_rows(case, [(count > 0, count)])
            else:
                continue
            if checked_case_ids is not None:
                checked_case_ids.add(workload["id"] + "/" + case["id"])
            checks += 1
    return checks


def main():
    packet = json.loads((ROOT / "temporal-workloads.json").read_text())
    cases = structural_checks(packet)
    small_case_ids = set()
    checked = small_oracle_checks(packet["workloads"], small_case_ids)
    event_case_ids = event_oracle_checks(packet["workloads"])
    all_case_ids = {workload["id"] + "/" + case["id"]
                    for workload in packet["workloads"] for case in workload["cases"]}
    print(json.dumps({"workloads": len(packet["workloads"]), "cases": cases,
                      "small_oracle_checks": checked, "event_oracle_checks": len(event_case_ids),
                      "checked_cases": len(small_case_ids | event_case_ids),
                      "assertion_only_case_ids": sorted(small_case_ids - event_case_ids),
                      "unchecked_case_ids": sorted(all_case_ids - small_case_ids - event_case_ids),
                      "new_event_checked_case_ids": sorted(event_case_ids - small_case_ids), "result": "PASS",
                      "scope": "synthetic contract validation; no database execution or benchmark"}))


if __name__ == "__main__":
    main()

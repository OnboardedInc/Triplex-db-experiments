"""Small event-derived oracles for the selected synthetic workload contracts.

Only immutable input events, case parameters and two-time cuts determine answers.
Normalized assertions are deliberately unused. These are domain-specific contract
checks, not a Datalog evaluator or evidence of database execution.
"""


def value(cell):
    return int(cell["value"]) if cell["tag"] == "i64" else cell["value"]


def scalar(tag, payload):
    return {"tag": tag, "value": str(payload) if tag == "i64" else payload}


def identity(rows):
    # Preserve tags, including the distinction between bool true and i64 one.
    return {tuple((cell["tag"], cell["value"]) for cell in row) for row in rows}


def known_events(workload, case):
    events = [event for event in workload["events"]
              if int(event["recorded_at"]) <= int(case["cut"]["known_at"])]
    replaced = {event["corrects"] for event in events if event["semantics"] == "correction"}
    return [event for event in events if event["id"] not in replaced]


def occurred(events, case):
    return [event for event in events if int(event["occurred_at"]) <= int(case["cut"]["valid_at"])]


def contains(event, point):
    fields = event["payload"]
    return value(fields["valid_from"]) <= point and (
        fields["valid_to"] is None or point < value(fields["valid_to"]))


def state_rows(events, case, revision_order=False):
    params = case["parameters"]
    entity, attribute = value(params["entity"]), value(params["attribute"])
    candidates = [event for event in occurred(events, case)
                  if event["subject"] == entity and attribute in event["payload"]]
    if not candidates:
        return []
    if revision_order:
        latest = max(candidates, key=lambda event: value(event["payload"]["revision"]))
    else:
        latest = max(candidates, key=lambda event: (int(event["occurred_at"]), int(event["recorded_at"])))
    return [[latest["payload"][attribute]]]


def price_rows(events, case):
    prices = [event for event in events if event["kind"] == "price_interval"]
    params = case["parameters"]
    if case["operation"] == "state_at":
        if value(params["attribute"]) != "price":
            return []
        return [[event["payload"]["price"]] for event in prices
                if event["subject"] == value(params["entity"])
                and contains(event, int(case["cut"]["valid_at"]))]
    selected = {value(item) for item in params["purchase_ids"]}
    rows = []
    for purchase in occurred(events, case):
        fields = purchase["payload"]
        if purchase["kind"] != "purchase" or purchase["subject"] not in selected:
            continue
        if value(fields["product"]) != value(params["product"]):
            continue
        for price in prices:
            if price["subject"] == value(fields["product"]) and contains(price, value(fields["purchased_at"])):
                rows.append([scalar("str", purchase["subject"]), price["payload"]["price"]])
    return rows


def coverage_rows(events, case):
    params = case["parameters"]
    coverages = [event for event in events if event["kind"] in {"coverage_asserted", "coverage_corrected"}]
    if case["operation"] == "relation_exists":
        covered = value(params["attribute"]) == "covers" and any(event["subject"] == value(params["entity"])
                      and event["payload"]["customer"] == params["target"]
                      and contains(event, int(case["cut"]["valid_at"])) for event in coverages)
    else:
        claims = [event for event in occurred(events, case)
                  if event["kind"] == "claim" and event["subject"] == value(params["claim"])]
        covered = any(coverage["subject"] == value(params["policy"])
                      and coverage["payload"]["customer"] == claim["payload"]["customer"]
                      and contains(coverage, value(claim["payload"]["claim_at"]))
                      for coverage in coverages for claim in claims)
    return [[scalar("bool", covered)]]


def account_rows(events, case):
    params = case["parameters"]
    # Business reversals remain independent signed postings, just like their originals.
    amount = sum(value(event["payload"]["amount"]) for event in occurred(events, case)
                 if event["kind"] == "posting"
                 and event["payload"]["account"] == params["account"]
                 and event["payload"]["currency"] == params["currency"])
    return [[scalar("i64", amount)]]


def inventory_rows(events, case):
    movements = [event["payload"] for event in occurred(events, case)
                 if event["kind"] == "inventory_movement"
                 and event["payload"]["sku"] == case["parameters"]["sku"]]
    physical = sum(value(fields["delta"]) for fields in movements if value(fields["ledger"]) == "physical")
    reserved = sum(value(fields["delta"]) for fields in movements if value(fields["ledger"]) == "reservation")
    return [[scalar("i64", amount) for amount in (physical, reserved, physical - reserved)]]


def revenue_rows(events, case):
    events = occurred(events, case)
    params = case["parameters"]
    captures = {event["id"]: event for event in events if event["kind"] == "capture"
                and event["payload"]["customer"] == params["customer"]
                and event["payload"]["currency"] == params["currency"]}
    gross = sum(value(event["payload"]["amount"]) for event in captures.values())
    refunds = sum(value(event["payload"]["amount"]) for event in events if event["kind"] == "refund"
                  and value(event["payload"]["capture"]) in captures
                  and event["payload"]["currency"] == params["currency"])
    return [[scalar("i64", gross - refunds)]]


def unprovisioned_rows(events, case):
    events = occurred(events, case)
    paid = {value(event["payload"]["subscription"]) for event in events
            if event["kind"] == "payment" and value(event["payload"]["paid"])}
    entitled = {event["subject"] for event in events
                if event["kind"] == "entitlement" and value(event["payload"]["entitled"])}
    return [[scalar("str", subscription)] for subscription in paid - entitled]


def workflow_rows(events, case):
    workflow = value(case["parameters"]["workflow"])
    valid_events = occurred(events, case)
    starts = [event for event in valid_events if event["kind"] == "workflow_started"
              and event["subject"] == workflow]
    if not starts:
        return []
    if len(starts) != 1:
        raise ValueError("workflow oracle requires one start per workflow")
    start = starts[0]["payload"]
    deadline = value(start["deadline"])
    completions = [value(event["payload"]["completed_at"]) for event in valid_events
                   if event["kind"] == "workflow_completed" and event["subject"] == workflow
                   and event["payload"]["source"] == start["source"]]
    # A source watermark is knowledge about its feed, not a business event to
    # exclude when its certified horizon is later than the requested valid time.
    watermarks = [value(event["payload"]["through"]) for event in events
                  if event["kind"] == "watermark" and event["subject"] == value(start["source"])]
    if completions:
        status = "completed_late" if min(completions) > deadline else "completed"
    elif int(case["cut"]["valid_at"]) < deadline:
        status = "in_progress"
    elif watermarks and max(watermarks) >= deadline:
        status = "overdue"
    else:
        status = "pending_knowledge"
    return [[scalar("str", status)]]


def reference(cell):
    if cell["tag"] != "str":
        raise ValueError("graph fixture references must be strings")
    return cell["value"]


def relation_events(events, case):
    point = int(case["cut"]["valid_at"])
    return [event for event in occurred(events, case)
            if event["payload"].get("valid_to") is None
            or point < value(event["payload"]["valid_to"])]


def reachable(edges, origin):
    """Positive-length reachability. Each node is visited once despite cycles."""
    adjacent = {}
    for source, target in edges:
        adjacent.setdefault(source, set()).add(target)
    seen = set()
    pending = list(adjacent.get(origin, set()))
    while pending:
        node = pending.pop()
        if node not in seen:
            seen.add(node)
            pending.extend(adjacent.get(node, set()) - seen)
    return seen


def inherited_access_rows(events, case):
    events = relation_events(events, case)
    params = case["parameters"]
    memberships = {(event["subject"], reference(event["payload"]["member_of"]))
                   for event in events if event["kind"] == "membership"}
    parents = {(event["subject"], reference(event["payload"]["parent"]))
               for event in events if event["kind"] == "resource_parent"}
    grants = {(event["subject"], reference(event["payload"]["can_read"]))
              for event in events if event["kind"] == "grant"}
    user, resource = reference(params["user"]), reference(params["resource"])
    principals = {user} | reachable(memberships, user)
    ancestors = {resource} | reachable(parents, resource)
    allowed = reference(params["action"]) == "read" and any(
        principal in principals and target in ancestors for principal, target in grants)
    return [[scalar("bool", allowed)]]


def access_with_deny_rows(events, case):
    events = relation_events(events, case)
    params = case["parameters"]
    user, resource = reference(params["user"]), reference(params["resource"])
    # This fixture's access_edges event declares both user-to-team memberships
    # and one resource grant for each of its two named teams.
    grants = {(reference(event["payload"][team]), reference(event["payload"]["resource"]))
              for event in events if event["kind"] == "access_edges" and event["subject"] == user
              for team in ("team_a", "team_b")}
    removed = {(event["subject"], reference(event["payload"]["resource"]))
               for event in events if event["kind"] == "grant_retracted"}
    blocked = any(event["subject"] == user and reference(event["payload"]["blocked_resource"]) == resource
                  for event in events if event["kind"] == "access_block")
    allowed = not blocked and any(target == resource for _, target in grants - removed)
    return [[scalar("bool", allowed)]]


def container_rows(events, case):
    edges = set()
    for event in sorted(relation_events(events, case),
                        key=lambda event: (int(event["occurred_at"]), int(event["recorded_at"]))):
        fields = event["payload"]
        if event["kind"] == "containment_asserted":
            edges.update((reference(edge["from"]), reference(edge["to"])) for edge in fields["edges"])
        elif event["kind"] == "item_moved":
            edges.discard((reference(fields["from"]), event["subject"]))
            edges.add((reference(fields["to"]), event["subject"]))
    descendants = reachable(edges, reference(case["parameters"]["container"]))
    containers = {source for source, _ in edges}
    return [[scalar("str", item)] for item in descendants - containers]


def recall_rows(workload, case):
    # input_corrected changes the production edge only. The original event's
    # contamination declaration and the separate shipment remain meaningful.
    events = [event for event in workload["events"]
              if int(event["recorded_at"]) <= int(case["cut"]["known_at"])]
    edges, contaminated = set(), set()
    shipments = []
    for event in sorted(relation_events(events, case), key=lambda event: int(event["recorded_at"])):
        fields = event["payload"]
        if event["kind"] == "production_record":
            source, output = reference(fields["input"]), reference(fields["output"])
            edges.add((source, output))
            if value(fields["contaminated_input"]):
                contaminated.add(source)
        elif event["kind"] == "input_corrected":
            edges.discard((reference(fields["old_input"]), event["subject"]))
            edges.add((reference(fields["new_input"]), event["subject"]))
        elif event["kind"] == "shipment":
            shipments.append(event)
    origin = reference(case["parameters"]["contaminated_lot"])
    affected = {origin} | reachable(edges, origin) if origin in contaminated else set()
    return [[event["payload"]["customer"]] for event in shipments if event["subject"] in affected]


def dependency_rows(events, case):
    events = relation_events(events, case)
    edges = {(reference(edge["from"]), reference(edge["to"]))
             for event in events if event["kind"] == "dependency_snapshot"
             for edge in event["payload"]["edges"]}
    if case["operation"] == "dependency_closure":
        return [[scalar("str", dependency)]
                for dependency in reachable(edges, reference(case["parameters"]["application"]))]
    vulnerable = {event["subject"] for event in events
                  if event["kind"] == "vulnerability_interval" and value(event["payload"]["vulnerable"])}
    applications = {event["subject"] for event in events if event["kind"] == "deployment"
                    and event["payload"]["environment"] == case["parameters"]["environment"]}
    return [[scalar("str", application)] for application in applications
            if ({application} | reachable(edges, application)) & vulnerable]


def lineage_rows(events, case):
    events = occurred(events, case)
    rows = []
    for run in events:
        fields = run["payload"]
        if run["kind"] != "run_completed" or fields["output"] != case["parameters"]["output"]:
            continue
        inputs = [fields["input_a"], fields["input_b"]]
        inputs.extend(event["payload"]["input"] for event in events
                      if event["kind"] == "lineage_metadata_added" and event["subject"] == run["subject"])
        rows.extend([item, fields["code_version"]] for item in inputs)
    return rows


def funnel_rows(events, case):
    params = case["parameters"]
    start, stop = value(params["from"]), value(params["to"])
    sessions = {}
    for event in occurred(events, case):
        fields = event["payload"]
        point = value(fields["at"])
        if start <= point < stop:
            session = reference(fields["session"])
            sessions.setdefault(session, {}).setdefault(reference(fields["step"]), set()).add(point)
    qualified = {session for session, steps in sessions.items()
                 if any(view < checkout < payment for view in steps.get("view", set())
                        for checkout in steps.get("checkout", set()) for payment in steps.get("payment", set()))}
    if case["operation"] == "session_conversion":
        return [[scalar("bool", reference(params["session"]) in qualified)]]
    return [[scalar("str", session)] for session in qualified]


def training_rows(workload, case):
    if case["operation"] == "state_at":
        events = relation_events(known_events(workload, case), case)
        return [[event["payload"][reference(case["parameters"]["attribute"])]] for event in events
                if event["kind"] in {"feature_interval", "feature_corrected"}
                and event["subject"] == reference(case["parameters"]["entity"])]
    events = occurred(known_events(workload, case), case)
    predictions = [event for event in events if event["kind"] == "prediction"
                   and event["subject"] == reference(case["parameters"]["prediction"])]
    rows = []
    for prediction in predictions:
        fields = prediction["payload"]
        # A later correction is applied only if it was known at the prediction's
        # captured feature cut. Labels independently use the caller's cut.
        feature_case = {"cut": {"known_at": str(value(fields["feature_known_at"])),
                                "valid_at": str(value(fields["predicted_at"]))}}
        features = [event for event in relation_events(known_events(workload, feature_case), feature_case)
                    if event["kind"] in {"feature_interval", "feature_corrected"}
                    and event["subject"] == reference(fields["customer"])]
        labels = [event["payload"]["fraud"] for event in events
                  if event["kind"] == "outcome_label" and event["subject"] == prediction["subject"]]
        rows.extend([scalar("str", prediction["subject"]),
                     feature["payload"][reference(case["parameters"]["feature"])], label]
                    for feature in features for label in labels)
    return rows


def support_rows(events, case):
    # This packet explicitly uses an acyclic graph. Recompute from immutable
    # assertion/retraction events at each cut rather than decrementing answers.
    edges = set()
    for event in sorted(occurred(events, case), key=lambda event: int(event["recorded_at"])):
        if event["kind"] == "edges_asserted":
            edges.update((reference(edge["from"]), reference(edge["to"])) for edge in event["payload"]["edges"])
        elif event["kind"] == "edge_retracted":
            edges.discard((event["subject"], reference(event["payload"]["target"])))
    origin = reference(case["parameters"]["from"])
    if case["operation"] == "reachability_closure":
        return [[scalar("str", target)] for target in reachable(edges, origin)]
    target = reference(case["parameters"]["to"])

    def count_paths(node, visited):
        count = 0
        for source, destination in edges:
            if source == node and destination not in visited:
                count += 1 if destination == target else count_paths(destination, visited | {destination})
        return count

    count = count_paths(origin, {origin})
    return [[scalar("bool", count > 0), scalar("i64", count)]]


def uptime_rows(events, case):
    params = case["parameters"]
    machine = value(params["machine"])
    start, end = value(params["from"]), value(params["to"])
    deltas = {}
    for event in events:
        if event["kind"] != "uptime_observed" or event["subject"] != machine:
            continue
        lo = max(start, value(event["payload"]["from"]))
        hi = min(end, value(event["payload"]["to"]))
        if lo < hi:
            deltas[lo] = deltas.get(lo, 0) + 1
            deltas[hi] = deltas.get(hi, 0) - 1
    previous, covered, duration = start, 0, 0
    for boundary, delta in sorted(deltas.items()):
        if covered:
            duration += boundary - previous
        previous, covered = boundary, covered + delta
    return [[scalar("i64", duration)]]


def event_rows(workload, case):
    """Return a supported answer or None for an intentionally unchecked workload."""
    workload_id = workload["id"]
    supported = {
        "01": {"state_at"}, "02": {"state_at"},
        "03": {"state_at", "price_at_purchase"},
        "04": {"relation_exists", "coverage_at_claim"},
        "05": {"accepted_event_count", "state_at"}, "06": {"account_balance"},
        "07": {"inventory_balance"}, "08": {"customer_net_revenue"},
        "09": {"paid_without_entitlement"}, "10": {"workflow_status"},
        "11": {"inherited_access"}, "12": {"access_with_deny"}, "13": {"container_items"},
        "14": {"recalled_customers"}, "15": {"vulnerable_deployments", "dependency_closure"},
        "16": {"output_lineage"}, "17": {"conversion_funnel", "session_conversion"}, "18": {"uptime_duration"},
        "19": {"training_example", "state_at"}, "20": {"reachability_supports", "reachability_closure"},
    }
    if workload_id not in supported:
        return None
    if case["operation"] not in supported[workload_id]:
        raise ValueError(workload_id + "/" + case["id"] + ": unsupported event-oracle operation")
    if workload_id == "14":
        return recall_rows(workload, case)
    if workload_id == "19":
        return training_rows(workload, case)
    events = known_events(workload, case)
    if workload_id in {"01", "02"}:
        return state_rows(events, case)
    if workload_id == "03":
        return price_rows(events, case)
    if workload_id == "04":
        return coverage_rows(events, case)
    if workload_id == "05":
        if case["operation"] == "accepted_event_count":
            count = sum(event["subject"] == value(case["parameters"]["subject"])
                        for event in occurred(events, case))
            return [[scalar("i64", count)]]
        return state_rows(events, case, revision_order=True)
    readers = {"06": account_rows, "07": inventory_rows, "08": revenue_rows,
               "09": unprovisioned_rows, "10": workflow_rows,
               "11": inherited_access_rows, "12": access_with_deny_rows,
               "13": container_rows, "15": dependency_rows, "16": lineage_rows,
               "17": funnel_rows, "18": uptime_rows, "20": support_rows}
    reader = readers.get(workload_id)
    return None if reader is None else reader(events, case)


def event_oracle_checks(workloads):
    checked = set()
    for workload in workloads:
        for case in workload["cases"]:
            rows = event_rows(workload, case)
            if rows is None:
                continue
            case_id = workload["id"] + "/" + case["id"]
            if identity(rows) != identity(case["expected_rows"]):
                raise ValueError(case_id + ": immutable-event oracle disagrees")
            checked.add(case_id)
    return checked

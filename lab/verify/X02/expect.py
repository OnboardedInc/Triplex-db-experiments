#!/usr/bin/env python3
"""V-X02 independent expectation model for the 71 G2 logical tasks (stdlib only).

Source: the packet's declared bitemporal assertions (qualification/workloads/temporal-workloads.json,
`assertions`, each with half-open valid and known intervals) plus each case's parameters and cut.
It never reads `expected_rows`, any engine output, the native task library or event_oracles.py.
Each operation's semantics is written from the workload's own `projection` text.

Usage: python3 -I lab/verify/X02/expect.py <packet.json>  -> JSON {logicalTaskId: [row, ...]} on stdout,
rows in the runner's wire form ([{"tag": ..., "value": ...}, ...]), as a sorted set.
"""
import json
import sys

INF = None


def num(x):
    return int(x)


def tv(v):
    """Typed value -> python value used for comparison/joins."""
    if v["tag"] == "i64":
        return int(v["value"])
    return v["value"]


def wire(x):
    if isinstance(x, bool):
        return {"tag": "bool", "value": x}
    if isinstance(x, int):
        return {"tag": "i64", "value": str(x)}
    return {"tag": "str", "value": x}


def within(interval, point):
    lo, hi = interval
    return num(lo) <= point and (hi is None or point < num(hi))


class World:
    def __init__(self, workload):
        self.a = workload["assertions"]

    def at(self, K, V=None):
        """Assertions visible at knowledge cut K (and valid time V unless None)."""
        return [
            a for a in self.a
            if within(a["known"], K) and (V is None or within(a["valid"], V))
        ]

    def vals(self, K, V, e, attr):
        return [tv(a["value"]) for a in self.at(K, V) if a["entity"] == e and a["attribute"] == attr]

    def ents(self, K, V, attr, value):
        return sorted({a["entity"] for a in self.at(K, V) if a["attribute"] == attr and tv(a["value"]) == value})

    def edges(self, K, V, attr):
        return {(a["entity"], tv(a["value"])) for a in self.at(K, V) if a["attribute"] == attr}


def closure(edges, src):
    """Nodes reachable from src in one or more hops (cycles allowed)."""
    seen, frontier = set(), {t for (s, t) in edges if s == src}
    while frontier:
        seen |= frontier
        frontier = {t for (s, t) in edges if s in frontier} - seen
    return seen


def one(xs):
    xs = list(dict.fromkeys(xs))
    assert len(xs) <= 1, xs
    return xs[0] if xs else None


def evaluate(wid, w, case):
    W = World(w)
    P = {k: (tv(v) if isinstance(v, dict) else [tv(x) for x in v]) for k, v in case["parameters"].items()}
    K = num(case["cut"]["known_at"])
    V = num(case["cut"]["valid_at"]) if case["cut"].get("valid_at") is not None else None
    op = case["operation"]
    rows = []
    if op == "state_at":
        rows = [[x] for x in W.vals(K, V, P["entity"], P["attribute"])]
    elif op == "price_at_purchase":
        for purchase in W.ents(K, V, "product", P["product"]):
            if purchase not in P["purchase_ids"]:
                continue
            for t in W.vals(K, V, purchase, "purchased_at"):
                for price in W.vals(K, t, P["product"], "price"):
                    rows.append([purchase, price])
    elif op == "coverage_at_claim":
        customer = one(W.vals(K, V, P["claim"], "customer"))
        at = one(W.vals(K, V, P["claim"], "claim_at"))
        covered = customer is not None and at is not None and customer in W.vals(K, at, P["policy"], "covers")
        rows = [[covered]]
    elif op == "relation_exists":
        rows = [[P["target"] in W.vals(K, V, P["entity"], P["attribute"])]]
    elif op == "accepted_event_count":
        rows = [[len(W.ents(K, V, "object", P["subject"]))]]
    elif op == "account_balance":
        total = 0
        for p in W.ents(K, V, "account", P["account"]):
            if P["currency"] in W.vals(K, V, p, "currency"):
                total += sum(W.vals(K, V, p, "amount"))
        rows = [[total]]
    elif op == "inventory_balance":
        physical = reserved = 0
        for e in W.ents(K, V, "sku", P["sku"]):
            ledger = one(W.vals(K, V, e, "ledger"))
            delta = sum(W.vals(K, V, e, "delta"))
            if ledger == "physical":
                physical += delta
            elif ledger == "reservation":
                reserved += delta
        rows = [[physical, reserved, physical - reserved]]
    elif op == "customer_net_revenue":
        captures = [c for c in W.ents(K, V, "customer", P["customer"]) if P["currency"] in W.vals(K, V, c, "currency")]
        net = sum(sum(W.vals(K, V, c, "amount")) for c in captures)
        refunds = {r for c in captures for r in W.ents(K, V, "capture", c) if P["currency"] in W.vals(K, V, r, "currency")}
        net -= sum(sum(W.vals(K, V, r, "amount")) for r in refunds)
        rows = [[net]]
    elif op == "paid_without_entitlement":
        for s in W.ents(K, V, "paid", True):
            if True not in W.vals(K, V, s, "entitled"):
                rows.append([s])
    elif op == "workflow_status":
        wf = P["workflow"]
        deadline = one(W.vals(K, V, wf, "deadline"))
        feed = one(W.vals(K, V, wf, "source"))
        if deadline is None:
            rows = []
        else:
            done = W.vals(K, V, wf, "completed_at")
            if done:
                rows = [["completed_late" if min(done) > deadline else "completed"]]
            elif V < deadline:
                rows = [["in_progress"]]
            else:
                marks = W.vals(K, V, feed, "watermark")
                rows = [["overdue" if marks and max(marks) >= deadline else "pending_knowledge"]]
    elif op == "inherited_access":
        principals = {P["user"]} | closure(W.edges(K, V, "member_of"), P["user"])
        resources = {P["resource"]} | closure(W.edges(K, V, "parent"), P["resource"])
        grants = W.edges(K, V, "can_read")
        rows = [[any((p, r) in grants for p in principals for r in resources)]]
    elif op == "access_with_deny":
        principals = {P["user"]} | closure(W.edges(K, V, "member_of"), P["user"])
        allowed = any((p, P["resource"]) in W.edges(K, V, "can_read") for p in principals)
        blocked = (P["user"], P["resource"]) in W.edges(K, V, "blocked")
        rows = [[allowed and not blocked]]
    elif op == "container_items":
        contains = W.edges(K, V, "contains")
        parents = {s for (s, _) in contains}
        rows = [[x] for x in closure(contains, P["container"]) if x not in parents]
    elif op == "recalled_customers":
        lot = P["contaminated_lot"]
        if True in W.vals(K, V, lot, "contaminated"):
            lots = closure(W.edges(K, V, "input_of"), lot)
            rows = [[c] for (l, c) in W.edges(K, V, "shipped_to") if l in lots]
    elif op == "vulnerable_deployments":
        deps = W.edges(K, V, "depends_on")
        for app in W.ents(K, V, "deployed_in", P["environment"]):
            if any(True in W.vals(K, V, z, "vulnerable") for z in closure(deps, app)):
                rows.append([app])
    elif op == "dependency_closure":
        rows = [[x] for x in closure(W.edges(K, V, "depends_on"), P["application"])]
    elif op == "output_lineage":
        for run in W.ents(K, V, "output", P["output"]):
            for version in W.vals(K, V, run, "code_version"):
                for source in W.vals(K, V, run, "input"):
                    rows.append([source, version])
    elif op in ("conversion_funnel", "session_conversion"):
        lo, hi = P["from"], P["to"]
        times = {}
        for e in {a["entity"] for a in W.at(K, V) if a["attribute"] == "session"}:
            for s in W.vals(K, V, e, "session"):
                for step in W.vals(K, V, e, "step"):
                    for t in W.vals(K, V, e, "at"):
                        if lo <= t < hi:
                            times.setdefault(s, {}).setdefault(step, set()).add(t)
        def qualifies(s):
            st = times.get(s, {})
            return any(a < b < c for a in st.get("view", ()) for b in st.get("checkout", ()) for c in st.get("payment", ()))
        if op == "conversion_funnel":
            rows = [[s] for s in times if qualifies(s)]
        else:
            rows = [[qualifies(P["session"])]]
    elif op == "uptime_duration":
        lo, hi = P["from"], P["to"]
        spans = []
        for a in W.at(K):
            if a["entity"] == P["machine"] and a["attribute"] == "up" and tv(a["value"]) is True:
                s = max(num(a["valid"][0]), lo)
                e = hi if a["valid"][1] is None else min(num(a["valid"][1]), hi)
                if s < e:
                    spans.append((s, e))
        covered, end = 0, None
        for s, e in sorted(spans):
            if end is None or s > end:
                covered += e - s
                end = e
            elif e > end:
                covered += e - end
                end = e
        rows = [[covered]]
    elif op == "training_example":
        pred = P["prediction"]
        for customer in W.vals(K, V, pred, "customer"):
            for t in W.vals(K, V, pred, "predicted_at"):
                for k in W.vals(K, V, pred, "feature_known_at"):
                    for label in W.vals(K, V, pred, "fraud"):
                        for feature in W.vals(k, t, customer, P["feature"]):
                            rows.append([pred, feature, label])
    elif op == "reachability_supports":
        edges = W.edges(K, V, "edge")
        paths = 0
        frontier = [(P["from"],)]
        for _ in range(3):
            frontier = [path + (t,) for path in frontier for (s, t) in sorted(edges) if s == path[-1]]
            paths += sum(1 for path in frontier if path[-1] == P["to"])
        rows = [[paths > 0, paths]]
    elif op == "reachability_closure":
        rows = [[x] for x in closure(W.edges(K, V, "edge"), P["from"])]
    else:
        raise SystemExit(f"unmodelled operation {op}")
    canon = sorted({json.dumps([wire(x) for x in row], separators=(",", ":")) for row in rows})
    return [json.loads(r) for r in canon]


def main():
    packet = json.load(open(sys.argv[1]))
    out = {}
    for w in packet["workloads"]:
        for case in w["cases"]:
            out[f"{w['id']}/{case['id']}"] = evaluate(w["id"], w, case)
    json.dump(out, sys.stdout, indent=1, sort_keys=True)
    print()


if __name__ == "__main__":
    main()

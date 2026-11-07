"""Shape validator for lab/world/W0 (stdlib only; run with `python3 -I validate.py`).

It checks JSON shape, value types, canonical ordering, release hashes, work item id and
version hashes, payload keys and the output-assembly consistency rules of SPEC.md section 8 (overdue flags,
due obligations, trace order).
It holds no rule logic: it never decides which tasks, obligations, work items or flags a world produces.
"""
import datetime
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAX = 9007199254740991
ERRORS = []


class FloatToken(str):
    """A number token with a fraction or exponent, kept as its source text."""


def err(where, msg):
    ERRORS.append(f"{where}: {msg}")


def load(path):
    def pairs(items):
        keys = [k for k, _ in items]
        if len(keys) != len(set(keys)):
            raise ValueError(f"duplicate key in {path}")
        return dict(items)

    def bad_constant(name):
        raise ValueError(f"non-JSON constant {name} in {path}")

    with open(path, encoding="utf-8") as fh:
        return json.loads(fh.read(), object_pairs_hook=pairs, parse_float=FloatToken, parse_constant=bad_constant)


def canon(x):
    return json.dumps(x, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def sha(x):
    return hashlib.sha256(canon(x).encode("utf-8")).hexdigest()


def has_float(x):
    if isinstance(x, FloatToken):
        return True
    if isinstance(x, dict):
        return any(has_float(v) for v in x.values())
    if isinstance(x, list):
        return any(has_float(v) for v in x)
    return False


def is_int(x):
    return isinstance(x, int) and not isinstance(x, bool) and not isinstance(x, FloatToken)


def valid_date(s):
    if not isinstance(s, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", s):
        return False
    try:
        d = datetime.date.fromisoformat(s)
    except ValueError:
        return False
    return 2000 <= d.year <= 2099


def valid_instant(s, derived=False):
    if not isinstance(s, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z", s):
        return False
    try:
        d = datetime.date.fromisoformat(s[:10])
    except ValueError:
        return False
    hh, mm, ss = int(s[11:13]), int(s[14:16]), int(s[17:19])
    if hh > 23 or mm > 59 or ss > 59:
        return False
    return derived or 2000 <= d.year <= 2099


SCHEMA = load(os.path.join(HERE, "schema.json"))
KINDS = SCHEMA["entityKinds"]
RULES = SCHEMA["ruleOrder"]
KEYED = set(SCHEMA["keyedRules"])
FLAGS = SCHEMA["flagNames"]


def kind_of(entity):
    for name, k in KINDS.items():
        if re.fullmatch(k["idPattern"], entity):
            return name
    return None


def check_value(where, subject, entity, attr, spec, v):
    t = spec["type"]
    if isinstance(v, dict):
        if not (spec["pii"] and list(v) == ["erasedAt"] and valid_instant(v["erasedAt"])):
            err(where, f"bad erased marker or erased non-PII value on {attr}")
        return
    ok = {
        "date": lambda: valid_date(v),
        "instant": lambda: valid_instant(v),
        "cents": lambda: is_int(v) and 0 <= v <= MAX,
        "minutes": lambda: is_int(v) and 0 <= v <= 10080,
        "boolean": lambda: isinstance(v, bool),
        "text": lambda: isinstance(v, str) and 1 <= len(v) <= 64 and all(32 <= ord(c) <= 126 for c in v),
        "enum": lambda: isinstance(v, str) and v in spec["values"],
        "ref": lambda: isinstance(v, str) and kind_of(v) == spec["refKind"]
        and (not spec.get("owned") or v.startswith(entity + "/")),
    }[t]()
    if not ok:
        err(where, f"value {v!r} is not a valid {t} for {attr}")


def check_world(where, world, basis):
    if set(world) != {"facts", "subject"} or not isinstance(world["facts"], list):
        return err(where, "world must be {subject, facts[]}")
    s = world["subject"]
    if kind_of(s) != "placement":
        return err(where, "subject is not a placement id")
    seen = set()
    txs = set()
    for n, f in enumerate(world["facts"]):
        w = f"{where} fact {n}"
        if not isinstance(f, dict) or set(f) != {"a", "e", "tx", "v"}:
            err(w, "fact must have exactly e, a, v, tx")
            continue
        e, a, v, tx = f["e"], f["a"], f["v"], f["tx"]
        k = kind_of(e) if isinstance(e, str) else None
        if k is None or (k in ("document", "decision") and not e.startswith(s + "/")) or (k == "placement" and e != s):
            err(w, f"entity {e!r} not allowed in this world")
            continue
        spec = KINDS[k]["attributes"].get(a)
        if spec is None:
            err(w, f"unknown attribute {a!r} for {k}")
            continue
        check_value(w, s, e, a, spec, v)
        if not is_int(tx) or tx < 1 or tx > basis["tx"]:
            err(w, f"tx {tx!r} outside 1..basis.tx")
        key = (e, a) if spec["cardinality"] == "one" else (e, a, canon(v))
        if key in seen:
            err(w, f"cardinality violation on {key}")
        seen.add(key)
        txs.add(tx)
    return txs


def check_basis(where, b):
    if not isinstance(b, dict) or set(b) != {"tx", "validTime"} or not valid_instant(b["validTime"]) \
            or not is_int(b["tx"]) or not 0 <= b["tx"] <= MAX:
        err(where, "bad basis")
        return False
    return True


def sorted_unique(xs):
    return all(xs[i] < xs[i + 1] for i in range(len(xs) - 1))


def check_releases():
    index = load(os.path.join(HERE, "releases", "index.json"))
    out = {}
    for name in ("R1", "R2"):
        r = load(os.path.join(HERE, "releases", f"{name}.json"))
        w = f"releases/{name}.json"
        if set(r) != {"name", "rules", "world"} or r["name"] != name or r["world"] != "W0":
            err(w, "bad top-level keys")
        if [e["id"] for e in r["rules"]] != RULES:
            err(w, "rule ids or order differ from schema.ruleOrder")
        for e in r["rules"]:
            if set(e) != {"id", "params"} or set(e["params"]) != set(SCHEMA["releaseParams"].get(e["id"], {})):
                err(w, f"bad entry for {e.get('id')}")
        h = "sha256:" + sha(r)
        if index.get(name) != h:
            err("releases/index.json", f"{name} hash should be {h}")
        out[name] = (r, h)
    return out


def check_output(where, out, world, basis, release, txs):
    keys = {"basis", "dependencies", "flags", "obligations", "release", "subject", "tasks", "trace", "workItems"}
    if set(out) != keys:
        return err(where, f"output keys {sorted(out)}")
    s, v = world["subject"], basis["validTime"]
    rel, rhash = release
    if out["subject"] != s or out["basis"] != basis or out["release"] != rhash:
        err(where, "subject, basis or release echo is wrong")
    deps = out["dependencies"]
    if not all(isinstance(p, list) and len(p) == 2 for p in deps) or not sorted_unique(deps):
        err(where, "dependencies must be distinct [e, a] pairs in ascending order")
    for e, a in deps:
        k = kind_of(e)
        if k is None or a not in KINDS[k]["attributes"]:
            err(where, f"dependency {e} {a} is not a schema pair")
    for a in KINDS["placement"]["attributes"]:
        if [s, a] not in deps:
            err(where, f"dependency {s} {a} missing (every placement attribute is read)")
    for name in ("flags", "obligations", "tasks", "workItems"):
        ids = [x.get("name" if name == "flags" else "id") for x in out[name]]
        if not sorted_unique(ids):
            err(where, f"{name} not in ascending distinct order")
    for f in out["flags"]:
        if set(f) != {"name", "rule"} or FLAGS.get(f["name"]) != f["rule"]:
            err(where, f"bad flag {f}")
    due_from_tasks = {}
    for t in out["tasks"]:
        if set(t) != {"dueAt", "id", "kind", "overdue", "rule"} or t["rule"] not in RULES:
            err(where, f"bad task {t}")
            continue
        prefix = f"{s}#{t['kind']}"
        if not (t["id"] == prefix or (t["rule"] in KEYED and t["id"].startswith(prefix + "#"))):
            err(where, f"task id {t['id']} does not match subject, kind and rule")
        if t["dueAt"] is not None and not valid_instant(t["dueAt"], derived=True):
            err(where, f"task {t['id']} dueAt is not an instant")
        overdue = t["dueAt"] is not None and v >= t["dueAt"]
        if t["overdue"] is not overdue:
            err(where, f"task {t['id']} overdue should be {overdue}")
        if t["dueAt"] is not None and not overdue:
            due_from_tasks[t["id"] + "@due"] = (t["rule"], t["dueAt"])
    due_obl = {}
    for o in out["obligations"]:
        if set(o) != {"boundary", "id", "kind", "rule"} or o["kind"] not in SCHEMA["obligationKinds"]:
            err(where, f"bad obligation {o}")
            continue
        if not valid_instant(o["boundary"], derived=True) or not o["boundary"] > v:
            err(where, f"obligation {o['id']} boundary must be an instant after the basis")
        if o["kind"] == "due":
            due_obl[o["id"]] = (o["rule"], o["boundary"])
        elif o["kind"] == "start" and (o["id"] != f"{s}#start" or o["rule"] != "LIFE"):
            err(where, f"bad start obligation {o}")
        elif o["kind"] == "doc.window" and (not o["id"].startswith(f"{s}#doc.window#{s}/doc:") or o["rule"] != "DOCEXP"):
            err(where, f"bad doc.window obligation {o}")
    if due_obl != due_from_tasks:
        err(where, f"due obligations {sorted(due_obl)} do not match open tasks {sorted(due_from_tasks)}")
    trace = out["trace"]
    order = [(RULES.index(x["rule"]), x["key"]) for x in trace if x.get("rule") in RULES]
    if len(order) != len(trace) or not sorted_unique(order):
        err(where, "trace not in release order then key order")
    entries = {}
    for x in trace:
        if set(x) != {"inputs", "key", "row", "rule"} or not is_int(x["row"]):
            err(where, f"bad trace entry {x}")
            continue
        if not sorted_unique(x["inputs"]) or any(not is_int(i) or i not in txs for i in x["inputs"]):
            err(where, f"trace {x['rule']} {x['key']!r} inputs must be ascending tx values present in the world")
        if (x["rule"] not in KEYED and (x["key"] != "" or x["row"] < 1)) or (x["rule"] in KEYED and (x["key"] == "") != (x["row"] == 0)):
            err(where, f"trace {x['rule']} key {x['key']!r} row {x['row']} breaks the key rules of 8.6")
        entries[(x["rule"], x["key"])] = x["inputs"]
    for r in RULES:
        n = sum(1 for x in trace if x.get("rule") == r)
        if n == 0 or (r not in KEYED and n != 1):
            err(where, f"trace has {n} entries for {r}")
    for wi in out["workItems"]:
        if set(wi) != {"id", "inputs", "key", "kind", "payload", "rule", "version"}:
            err(where, f"bad work item {wi}")
            continue
        if entries.get((wi["rule"], wi["key"])) != wi["inputs"]:
            err(where, f"work item {wi['kind']} inputs differ from its trace entry")
        keys = SCHEMA["workItemPayloadKeys"].get(wi["kind"])
        if not isinstance(wi["payload"], dict) or keys is None or sorted(wi["payload"]) != sorted(keys):
            err(where, f"work item {wi['kind']} payload keys {sorted(wi['payload'])} should be {keys}")
        want = "wi:" + sha({"key": wi["key"], "kind": wi["kind"], "rule": wi["rule"], "subject": s})
        if wi["id"] != want:
            err(where, f"work item {wi['kind']} key {wi['key']!r} id should be {want}")
        want_v = "wv:" + sha({"inputs": wi["inputs"], "payload": wi["payload"], "release": rhash})
        if wi["version"] != want_v:
            err(where, f"work item {wi['kind']} key {wi['key']!r} version should be {want_v}")


def emitted_rules(out):
    rules = set()
    for name in ("flags", "obligations", "tasks", "workItems"):
        rules |= {x["rule"] for x in out[name]}
    return rules


def check_case(path, releases, by_hash, cases):
    c = load(path)
    w = os.path.basename(path)
    need = {"id", "slug", "title", "op", "checks", "notes", "input", "expected"}
    if not need <= set(c) or not set(c) <= need | {"identicalTo"}:
        return err(w, f"case keys {sorted(c)}")
    if not w.startswith(c["id"] + "-" + c["slug"]):
        err(w, "file name must be <id>-<slug>.json")
    exp, inp, op = c["expected"], c["input"], c["op"]
    is_error = isinstance(exp, dict) and set(exp) == {"error"}
    if has_float(exp) or (has_float(inp) and not is_error):
        err(w, "float tokens are allowed only in the input of an error case")
    cases[c["id"]] = c
    if is_error:
        if exp["error"] not in SCHEMA["errorCodes"]:
            err(w, f"unknown error code {exp['error']}")
        if c["checks"]:
            err(w, "error cases carry no rule checks")
        return
    basis = inp.get("basis")
    if not check_basis(w, basis):
        return
    if op == "affected":
        if set(inp) != {"basis", "release", "worlds", "writes"} or set(exp) != {"affected"}:
            return err(w, "bad affected case shape")
        subjects = [x["subject"] for x in inp["worlds"]]
        for n, world in enumerate(inp["worlds"]):
            check_world(f"{w} world {n}", world, basis)
        if not sorted_unique(exp["affected"]) or not set(exp["affected"]) <= set(subjects):
            err(w, "affected must be ascending, distinct subjects of the worlds")
        if not all(isinstance(p, list) and len(p) == 2 and all(isinstance(q, str) for q in p) for p in inp["writes"]):
            err(w, "writes must be [entity, attribute] string pairs")
        return
    if op == "evaluate":
        if set(inp) != {"basis", "release", "world"} or inp["release"] not in releases:
            return err(w, "bad evaluate input")
        release = releases[inp["release"]]
    elif op == "reconcile":
        if set(inp) != {"activations", "basis", "world"}:
            return err(w, "bad reconcile input")
        for a in inp["activations"]:
            if set(a) != {"from", "release", "tx"} or not valid_instant(a["from"]) or not is_int(a["tx"]) \
                    or not 1 <= a["tx"] <= basis["tx"]:
                err(w, f"bad activation {a}")
        if exp.get("release") not in by_hash:
            return err(w, "reconcile output release is not a known hash")
        release = by_hash[exp["release"]]
    else:
        return err(w, f"unknown op {op}")
    txs = check_world(w, inp["world"], basis) or set()
    check_output(w, exp, inp["world"], basis, release, txs)
    fired = emitted_rules(exp)
    for chk in c["checks"]:
        r, pol = chk.get("rule"), chk.get("polarity")
        if r not in RULES or pol not in ("positive", "negative"):
            err(w, f"bad check {chk}")
        elif (pol == "positive") != (r in fired):
            err(w, f"check {r} {pol} contradicts the expected outputs")


def main():
    releases = check_releases()
    by_hash = {h: (r, h) for r, h in releases.values()}
    cases = {}
    files = sorted(f for f in os.listdir(os.path.join(HERE, "cases")) if f.endswith(".json"))
    for f in files:
        check_case(os.path.join(HERE, "cases", f), releases, by_hash, cases)
    for c in cases.values():
        other = c.get("identicalTo")
        if other and (other not in cases or canon(cases[other]["expected"]) != canon(c["expected"])):
            err(c["id"], f"expected bytes differ from {other}")
    cover = {r: set() for r in RULES}
    for c in cases.values():
        for chk in c["checks"]:
            if chk.get("rule") in cover:
                cover[chk["rule"]].add(chk["polarity"])
    for r, pols in cover.items():
        if pols != {"positive", "negative"}:
            err("coverage", f"{r} has {sorted(pols)}; needs a positive and a negative case")
    for e in ERRORS:
        print("FAIL", e)
    print(f"{len(files)} cases, releases {', '.join(n + '=' + h for n, (_, h) in releases.items())}")
    print("OK" if not ERRORS else f"{len(ERRORS)} problems")
    return 1 if ERRORS else 0


if __name__ == "__main__":
    sys.exit(main())

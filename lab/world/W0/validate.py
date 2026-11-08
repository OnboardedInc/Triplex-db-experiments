"""Shape validator for lab/world/W0 (stdlib only; run with `python3 -I validate.py`).

It checks JSON shape, value types, canonical ordering, release hashes and scopes, work item id and version hashes, payload
keys and the output-assembly consistency rules of SPEC.md section 8 (overdue flags, due obligations, trace order, ballast never
in dependencies, publish deliveries copied from their work items and appended to pending). Every delivery, item state and
projection entry anywhere in the cases must name a work item some case's record carries: its id is recomputed from (key, kind,
rule, subject) and its (id, version) must match a record. Every numeric-error case must hold its raw token text unchanged.
Two case forms need care (SPEC 11.1): an `inputBase64` case carries its input as bytes, and a `synthetic` case holds records
that evaluate never produces (readings A07 to A09, A14, A15), so only its shapes and output order are checked; the flag is
allowed only on the seven cases SPEC 11.1 lists. expected-sha256.json, input-sha256.json and SHA256SUMS are recomputed and
compared with the files. Integer tokens of
any length and values nested to any depth are read without hitting Python's default limits (readings A12, A13).
It holds no rule logic: it never decides which tasks, obligations, work items, flags or deliveries a world produces.
"""
import base64
import datetime
import hashlib
import json
import os
import re
import sys

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)  # integer tokens of any length (A12; cases C90, C129 to C131)
sys.setrecursionlimit(20000)  # values nested to any depth (A13; case C132)

HERE = os.path.dirname(os.path.abspath(__file__))
MAX = 9007199254740991
ERRORS = []
RECORDS = {}       # (work item id, version) -> the work item with its subject, from every evaluation output and record
DELIVERIES = []    # (where, delivery) from every publish and receive case, checked against RECORDS at the end
ITEM_REFS = []     # (where, id, subject or None, payload) of item states and projection entries

# The raw token text of every numeric-error case (SPEC 2, 4.4; RULINGS Q44a G1). A JSON round trip would normalize 1.65e3 to
# 1650.0 or 1650, so the validator reads the token as written in the file.
NUMERIC_ERROR_TOKENS = {
    "C37": ("fact.v", "weeklyMinutes", "10081"),
    "C38": ("fact.v", "payRateCents", "1650.0"),
    "C39": ("fact.v", "payRateCents", "9007199254740992"),
    "C45": ("fact.tx", None, "3.0"),
    "C68": ("fact.v", "payRateCents", "1.65e3"),
    "C69": ("fact.v", "payRateCents", "-1"),
    "C70": ("fact.v", "payRateCents", '"1650"'),
    "C71": ("basis.tx", None, "10.0"),
    "C72": ("activation.tx", None, "9.0"),
}

# Raw text that must stay in a case file as written (W0-1.1.2): tokens a JSON round trip would rewrite or that Python reads as
# something else (-0 as 0, NaN as a float, 1.65e3 as 1650.0, raw UTF-8 as an escape, a long or deep token as anything shorter).
SYNTHETIC_IDS = {"C100", "C101", "C102", "C133", "C134", "C135", "C136"}  # SPEC 11.1; the flag is rejected anywhere else

RAW_TEXT = {
    "C90": ['"v": ' + "9" * 5000 + ","],
    "C93": ['"v": -0,'],
    "C94": ['"tx": -0}'],
    "C100": ['"payload": {"floorCents": 1.65e3, "note": "é", "payRateCents": -0}',
             '"payload": {"floorCents": 1.65e3, "note": "\\u00e9", "payRateCents": 0}'],
    "C129": ['"tx": ' + "9" * 5000 + ","],
    "C130": ['"seq": ' + "9" * 5000 + ",", '"seq": 1' + "0" * 5000 + ","],
    "C132": ['"v": ' + "[" * 2000 + "]" * 2000 + ","],
    "C136": ['"n": [-0, 1E3, 1.50, 123456789012345678901234567890]'],
}


class FloatToken(str):
    """A number token with a fraction or exponent, kept as its source text."""


class ConstToken(str):
    """NaN, Infinity or -Infinity: not JSON (A11); read only so the validator can reject a case file that holds one."""


class DuplicateKey(Exception):
    pass


def err(where, msg):
    ERRORS.append(f"{where}: {msg}")


def load(path, allow_duplicates=False):
    def pairs(items):
        keys = [k for k, _ in items]
        if len(keys) != len(set(keys)) and not allow_duplicates:
            raise DuplicateKey(f"duplicate key in {path}")
        return dict(items)

    with open(path, encoding="utf-8") as fh:
        return json.loads(fh.read(), object_pairs_hook=pairs, parse_float=FloatToken, parse_constant=ConstToken)


def canon(x):
    """SPEC 9 with item 7 (A07): integers as integers, other number tokens as source text, strings with \\u escapes."""
    if isinstance(x, (FloatToken, ConstToken)):
        return str(x)
    if x is True or x is False or x is None:
        return json.dumps(x)
    if isinstance(x, int):
        return str(x)
    if isinstance(x, str):
        return json.dumps(x, ensure_ascii=True)
    if isinstance(x, list):
        return "[" + ",".join(canon(v) for v in x) + "]"
    return "{" + ",".join(json.dumps(k, ensure_ascii=True) + ":" + canon(x[k]) for k in sorted(x)) + "}"


def sha(x):
    return hashlib.sha256(canon(x).encode("utf-8")).hexdigest()


def has_float(x, kinds=(FloatToken,)):
    if isinstance(x, kinds):
        return True
    if isinstance(x, dict):
        return any(has_float(v, kinds) for v in x.values())
    if isinstance(x, list):
        return any(has_float(v, kinds) for v in x)
    return False


def is_int(x):
    return isinstance(x, int) and not isinstance(x, bool)


def token_text(x):
    """The JSON token as written: FloatToken keeps its source text; an integer token has exactly one spelling."""
    if isinstance(x, FloatToken):
        return str(x)
    return json.dumps(x)


def check_numeric_tokens(w, cid, inp, raw):
    if cid not in NUMERIC_ERROR_TOKENS:
        if has_float(inp):
            err(w, "an error case with a float token must be listed in NUMERIC_ERROR_TOKENS")
        return
    where, attr, want = NUMERIC_ERROR_TOKENS[cid]
    facts = inp.get("world", {}).get("facts", []) if isinstance(inp.get("world"), dict) else []
    if where == "fact.v":
        found = [token_text(f["v"]) for f in facts if isinstance(f, dict) and f.get("a") == attr]
    elif where == "fact.tx":
        found = [token_text(f["tx"]) for f in facts if isinstance(f, dict) and "tx" in f]
    elif where == "basis.tx":
        found = [token_text(inp.get("basis", {}).get("tx"))]
    else:
        found = [token_text(a.get("tx")) for a in inp.get("activations", []) if isinstance(a, dict)]
    if want not in found or want not in raw:
        err(w, f"numeric-error token must be written exactly as {want} ({where} {attr or ''}); found {found}")


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
OWNED = {"document", "decision", "answer"}
BALLAST = {(k, a) for k, spec in KINDS.items() for a, s in spec["attributes"].items() if s.get("ballast")}


def kind_of(entity):
    for name, k in KINDS.items():
        if re.fullmatch(k["idPattern"], entity):
            return name
    return None


def check_value(where, entity, attr, spec, v):
    t = spec["type"]
    if isinstance(v, dict):
        if not (spec["pii"] and list(v) == ["erasedAt"] and valid_instant(v["erasedAt"])):
            err(where, f"bad erased marker or erased non-PII value on {attr}")
        return
    owner = entity.split("/")[0]
    ok = {
        "date": lambda: valid_date(v),
        "instant": lambda: valid_instant(v),
        "cents": lambda: is_int(v) and 0 <= v <= MAX,
        "minutes": lambda: is_int(v) and 0 <= v <= 10080,
        "boolean": lambda: isinstance(v, bool),
        "text": lambda: isinstance(v, str) and 1 <= len(v) <= 64 and all(32 <= ord(c) <= 126 for c in v),
        "enum": lambda: isinstance(v, str) and v in spec["values"],
        "ref": lambda: isinstance(v, str) and kind_of(v) == spec["refKind"]
        and (not spec.get("owned") or v.startswith(entity + "/"))
        and (not spec.get("sameOwner") or v.startswith(owner + "/")),
    }[t]()
    if not ok:
        err(where, f"value {v!r} is not a valid {t} for {attr}")


def check_world(where, world, basis):
    if set(world) != {"facts", "subject"} or not isinstance(world["facts"], list):
        err(where, "world must be {subject, facts[]}")
        return set()
    s = world["subject"]
    if kind_of(s) != "placement":
        err(where, "subject is not a placement id")
        return set()
    seen = set()
    txs = set()
    for n, f in enumerate(world["facts"]):
        w = f"{where} fact {n}"
        if not isinstance(f, dict) or set(f) != {"a", "e", "tx", "v"}:
            err(w, "fact must have exactly e, a, v, tx")
            continue
        e, a, v, tx = f["e"], f["a"], f["v"], f["tx"]
        k = kind_of(e) if isinstance(e, str) else None
        if k is None or (k in OWNED and not e.startswith(s + "/")) or (k == "placement" and e != s):
            err(w, f"entity {e!r} not allowed in this world")
            continue
        spec = KINDS[k]["attributes"].get(a)
        if spec is None:
            err(w, f"unknown attribute {a!r} for {k}")
            continue
        check_value(w, e, a, spec, v)
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
    for name in SCHEMA["releases"]:
        r = load(os.path.join(HERE, "releases", f"{name}.json"))
        w = f"releases/{name}.json"
        if set(r) != {"name", "rules", "world"} or r["name"] != name or r["world"] != "W0":
            err(w, "bad top-level keys")
        if [e["id"] for e in r["rules"]] != RULES:
            err(w, "rule ids or order differ from schema.ruleOrder")
        for e in r["rules"]:
            pkeys = set(SCHEMA["releaseParams"].get(e["id"], {}))
            if set(e) - {"scope"} != {"id", "params"} or set(e["params"]) != pkeys:
                err(w, f"bad entry for {e.get('id')}")
            if "scope" in e:
                sc = e["scope"]
                js = sc.get("jurisdictions") if isinstance(sc, dict) else None
                if set(sc) != set(SCHEMA["releaseScope"]["keys"]) or not isinstance(js, list) or not js \
                        or not sorted_unique(js) or any(kind_of(j) != "jurisdiction" for j in js) \
                        or set(sc["params"]) != pkeys:
                    err(w, f"bad scope on {e['id']}: jurisdictions must be ascending distinct jurisdiction ids and params "
                           "must have the rule's param keys")
        h = "sha256:" + sha(r)
        if index.get(name) != h:
            err("releases/index.json", f"{name} hash should be {h}")
        out[name] = (r, h)
    return out


def check_work_item(where, wi, subject, rhash):
    if set(wi) != {"id", "inputs", "key", "kind", "payload", "rule", "version"}:
        err(where, f"bad work item {wi}")
        return False
    keys = SCHEMA["workItemPayloadKeys"].get(wi["kind"])
    if not isinstance(wi["payload"], dict) or keys is None or sorted(wi["payload"]) != sorted(keys):
        err(where, f"work item {wi['kind']} payload keys should be {keys}")
    want = "wi:" + sha({"key": wi["key"], "kind": wi["kind"], "rule": wi["rule"], "subject": subject})
    if wi["id"] != want:
        err(where, f"work item {wi['kind']} key {wi['key']!r} id should be {want}")
    want_v = "wv:" + sha({"inputs": wi["inputs"], "payload": wi["payload"], "release": rhash})
    if wi["version"] != want_v:
        err(where, f"work item {wi['kind']} key {wi['key']!r} version should be {want_v}")
    RECORDS[(wi["id"], wi["version"])] = dict(wi, subject=subject)
    return True


def delivery_id(d):
    return "wi:" + sha({"key": d["key"], "kind": d["kind"], "rule": d["rule"], "subject": d["subject"]})


def check_references():
    """Every delivery, item state and projection entry names a work item that some case's record carries."""
    for where, d in DELIVERIES:
        if d["id"] != delivery_id(d):
            err(where, f"delivery {d['kind']} seq {d['seq']} id should be {delivery_id(d)}")
        src = RECORDS.get((d["id"], d["version"]))
        if src is None or any(src[k] != d[k] for k in ("key", "kind", "payload", "rule", "subject")):
            err(where, f"delivery {d['kind']} seq {d['seq']} version {d['version']} matches no record's work item")
    for where, wid, subject, payload in ITEM_REFS:
        if not any(i == wid and (subject is None or src["subject"] == subject) and canon(src["payload"]) == canon(payload)
                   for (i, _), src in RECORDS.items()):
            err(where, f"item {wid} with payload {payload} matches no record's work item")


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
        if k is None or a not in KINDS[k]["attributes"] or (k, a) in BALLAST:
            err(where, f"dependency {e} {a} is not a rule-relevant schema pair")
    for a in KINDS["placement"]["attributes"]:
        if ("placement", a) not in BALLAST and [s, a] not in deps:
            err(where, f"dependency {s} {a} missing (every non-ballast placement attribute is read)")
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
        if check_work_item(where, wi, s, rhash) and entries.get((wi["rule"], wi["key"])) != wi["inputs"]:
            err(where, f"work item {wi['kind']} inputs differ from its trace entry")


def check_publish(where, inp, exp, by_hash):
    if set(inp) != {"evaluations", "state"} or set(exp) != {"deliveries", "state"}:
        return err(where, "publish input must be {evaluations, state} and output {deliveries, state}")
    published = {}
    for n, ev in enumerate(inp["evaluations"]):
        w = f"{where} evaluation {n}"
        if set(ev) != {"basis", "release", "subject", "workItems"} or ev["release"] not in by_hash:
            err(w, "evaluation record must be {basis, release, subject, workItems} with a known release")
            continue
        check_basis(w, ev["basis"])
        ids = [wi.get("id") for wi in ev["workItems"]]
        if not sorted_unique(ids):
            err(w, "workItems not in ascending id order")
        for wi in ev["workItems"]:
            if check_work_item(w, wi, ev["subject"], ev["release"]):
                published[(wi["id"], wi["version"])] = dict(wi, subject=ev["subject"])
    for st_name, st in (("input state", inp["state"]), ("output state", exp["state"])):
        if set(st) != {"items", "pending", "subjects"}:
            err(where, f"{st_name} must be {{items, pending, subjects}}")
            continue
        if not sorted_unique([i["id"] for i in st["items"]]) or not sorted_unique([x["subject"] for x in st["subjects"]]):
            err(where, f"{st_name} items or subjects not in ascending order")
        for i in st["items"]:
            if set(i) != {"id", "payload", "retired", "seq", "subject"} or not is_int(i["seq"]) or i["seq"] < 1 \
                    or not isinstance(i["retired"], bool):
                err(where, f"{st_name} bad item state {i}")
                continue
            ITEM_REFS.append((f"{where} {st_name}", i["id"], i["subject"], i["payload"]))
        for x in st["subjects"]:
            if set(x) != {"basis", "subject"}:
                err(where, f"{st_name} bad subject state {x}")
    dkeys = {"id", "key", "kind", "payload", "rule", "seq", "subject", "version"}
    for d in exp["deliveries"] + inp["state"]["pending"] + exp["state"].get("pending", []):
        if set(d) != dkeys or not is_int(d["seq"]) or d["seq"] < 1:
            err(where, f"bad delivery {d}")
            continue
        DELIVERIES.append((where, d))
    for d in exp["deliveries"]:
        src = published.get((d.get("id"), d.get("version")))
        if src is None or any(src[k] != d[k] for k in ("key", "kind", "payload", "rule", "subject")):
            err(where, f"delivery {d.get('kind')} seq {d.get('seq')} is not a copy of a work item in the evaluations")
    if exp["state"].get("pending") != inp["state"]["pending"] + exp["deliveries"]:
        err(where, "output pending must be input pending followed by this call's deliveries")


def check_receive(where, inp, exp):
    dkeys = {"id", "key", "kind", "payload", "rule", "seq", "subject", "version"}
    if set(inp) != {"deliveries", "state"} or set(exp) != {"applied", "state"} \
            or set(exp["applied"]) != {"effects", "projection"}:
        return err(where, "receive input must be {deliveries, state} and output {applied: {effects, projection}, state}")
    for st_name, st in (("input state", inp["state"]), ("output state", exp["state"])):
        if set(st) != {"effects", "projection"}:
            err(where, f"{st_name} must be {{effects, projection}}")
            continue
        if not sorted_unique([e["id"] for e in st["effects"]]) or not sorted_unique([p["id"] for p in st["projection"]]):
            err(where, f"{st_name} effects or projection not in ascending id order")
        waiting = []
        for e in st["effects"]:
            if set(e) != {"done", "id", "waiting"} or not is_int(e["done"]) or e["done"] < 0 \
                    or not sorted_unique([x["seq"] for x in e["waiting"]]) or any(x["seq"] <= e["done"] + 1 for x in e["waiting"]) \
                    or any(x.get("id") != e["id"] for x in e["waiting"]):
                err(where, f"{st_name} bad effect state {e}")
                continue
            waiting += e["waiting"]
        for p in st["projection"]:
            if set(p) != {"id", "payload", "seq"} or not is_int(p["seq"]) or p["seq"] < 1:
                err(where, f"{st_name} bad projection entry {p}")
                continue
            ITEM_REFS.append((f"{where} {st_name}", p["id"], None, p["payload"]))
        for dl in waiting:
            if set(dl) != dkeys or not is_int(dl["seq"]):
                err(where, f"{st_name} bad waiting delivery {dl}")
                continue
            DELIVERIES.append((where, dl))
    for dl in inp["deliveries"] + exp["applied"]["effects"] + exp["applied"]["projection"]:
        if set(dl) != dkeys or not is_int(dl["seq"]) or dl["seq"] < 1:
            err(where, f"bad delivery {dl}")
            continue
        DELIVERIES.append((where, dl))


def check_synthetic(where, op, inp, exp):
    """A synthetic case (SPEC 11.1): the 4.4 step 1 shapes and the output order only, no provenance, id or version check."""
    dkeys = {"id", "key", "kind", "payload", "rule", "seq", "subject", "version"}

    def delivery_ok(d):
        return isinstance(d, dict) and set(d) == dkeys and is_int(d["seq"]) and d["seq"] >= 1 and isinstance(d["payload"], dict) \
            and all(isinstance(d[k], str) for k in ("id", "key", "kind", "rule", "subject", "version"))

    def basis_ok(b):
        return isinstance(b, dict) and set(b) == {"tx", "validTime"} and is_int(b["tx"]) and isinstance(b["validTime"], str)

    if op == "publish":
        if set(inp) != {"evaluations", "state"} or set(exp) != {"deliveries", "state"}:
            return err(where, "publish input must be {evaluations, state} and output {deliveries, state}")
        wkeys = {"id", "inputs", "key", "kind", "payload", "rule", "version"}
        for ev in inp["evaluations"]:
            if set(ev) != {"basis", "release", "subject", "workItems"} or not basis_ok(ev["basis"]) \
                    or not all(set(w) == wkeys and isinstance(w["payload"], dict) and all(is_int(i) for i in w["inputs"])
                               for w in ev["workItems"]):
                err(where, f"bad evaluation record shape {ev.get('subject')}")
        for st_name, st in (("input state", inp["state"]), ("output state", exp["state"])):
            if set(st) != {"items", "pending", "subjects"} \
                    or any(set(i) != {"id", "payload", "retired", "seq", "subject"} or not is_int(i["seq"]) or i["seq"] < 1
                           or not isinstance(i["retired"], bool) for i in st["items"]) \
                    or any(set(x) != {"basis", "subject"} or not basis_ok(x["basis"]) for x in st["subjects"]) \
                    or not all(delivery_ok(d) for d in st["pending"]):
                err(where, f"{st_name} has a bad shape")
        out = exp["state"]
        if not sorted_unique([i["id"] for i in out["items"]]) or not sorted_unique([x["subject"] for x in out["subjects"]]):
            err(where, "output items or subjects not in ascending code-point order")
        if not all(delivery_ok(d) for d in exp["deliveries"]) or out["pending"] != inp["state"]["pending"] + exp["deliveries"]:
            err(where, "output pending must be input pending followed by this call's deliveries")
        return
    if set(inp) != {"deliveries", "state"} or set(exp) != {"applied", "state"} or set(exp["applied"]) != {"effects", "projection"}:
        return err(where, "receive input must be {deliveries, state} and output {applied: {effects, projection}, state}")
    for st_name, st in (("input state", inp["state"]), ("output state", exp["state"])):
        if set(st) != {"effects", "projection"} \
                or any(set(e) != {"done", "id", "waiting"} or not is_int(e["done"]) or e["done"] < 0
                       or not all(delivery_ok(d) for d in e["waiting"]) for e in st["effects"]) \
                or any(set(p) != {"id", "payload", "seq"} or not is_int(p["seq"]) or p["seq"] < 1 for p in st["projection"]):
            err(where, f"{st_name} has a bad shape")
    out = exp["state"]
    if not sorted_unique([e["id"] for e in out["effects"]]) or not sorted_unique([p["id"] for p in out["projection"]]) \
            or any([x["seq"] for x in e["waiting"]] != sorted(x["seq"] for x in e["waiting"]) for e in out["effects"]):
        err(where, "output effects, projection or waiting not in order")
    if not all(delivery_ok(d) for d in inp["deliveries"] + exp["applied"]["effects"] + exp["applied"]["projection"]):
        err(where, "bad delivery shape")


def check_bytes_case(w, c):
    """An inputBase64 case (SPEC 11.1): its bytes must not be one JSON text in UTF-8 without a BOM (A01), so W0.E_SHAPE."""
    if c["expected"] != {"error": "W0.E_SHAPE"}:
        return err(w, "an inputBase64 case must expect W0.E_SHAPE")
    data = base64.b64decode(c["inputBase64"], validate=True)
    try:
        if data.startswith(b"\xef\xbb\xbf"):
            raise ValueError("BOM")
        json.loads(data.decode("utf-8", errors="strict"), parse_constant=lambda s: (_ for _ in ()).throw(ValueError(s)))
    except ValueError:
        return
    err(w, "inputBase64 decodes to one JSON text, so it is not a byte-level E_SHAPE case")


def emitted_rules(out):
    rules = set()
    for name in ("flags", "obligations", "tasks", "workItems"):
        rules |= {x["rule"] for x in out[name]}
    return rules


INPUT_BYTES = {}  # case id -> the input bytes a harness hands over (SPEC 11.1)


def top_level_value_text(text, key):
    """The text of a top-level member's value exactly as written, from its first to its last character."""
    dec, ws = json.JSONDecoder(), re.compile(r"[ \t\n\r]*")
    i = ws.match(text, 0).end()
    if text[i:i + 1] != "{":
        return None
    i += 1
    while True:
        i = ws.match(text, i).end()
        if text[i:i + 1] == "}":
            return None
        name, i = dec.raw_decode(text, i)
        i = ws.match(text, i).end() + 1  # the colon
        start = ws.match(text, i).end()
        _, i = dec.raw_decode(text, start)
        if name == key:
            return text[start:i]
        i = ws.match(text, i).end() + 1  # the comma


def check_hash_files(cases):
    """expected-sha256.json, input-sha256.json (V-D01e N3) and SHA256SUMS (V-D01e N2)."""
    for name, want_of in (("expected-sha256.json", lambda c: canon(c["expected"]).encode("utf-8")),
                          ("input-sha256.json", lambda c: INPUT_BYTES[c["id"]])):
        table = load(os.path.join(HERE, name))
        if set(table) != set(cases):
            err(name, "must list exactly the case ids")
        for cid, c in cases.items():
            want = hashlib.sha256(want_of(c)).hexdigest()
            if table.get(cid) != want:
                err(name, f"{cid} should be {want}")
    listed = {}
    with open(os.path.join(HERE, "SHA256SUMS"), encoding="utf-8") as fh:
        for line in fh:
            m = re.fullmatch(r"([0-9a-f]{64})  (lab/world/W0/\S+)\n", line)
            if not m:
                err("SHA256SUMS", f"bad line {line!r}")
                continue
            listed[m.group(2)[len("lab/world/W0/"):]] = m.group(1)
    present = set()
    for dirpath, dirnames, filenames in os.walk(HERE):
        dirnames[:] = [d for d in dirnames if d != "__pycache__" and not d.startswith(".")]
        for fn in filenames:
            rel = os.path.relpath(os.path.join(dirpath, fn), HERE).replace(os.sep, "/")
            if rel != "SHA256SUMS" and not fn.startswith("."):
                present.add(rel)
    for rel in sorted(present ^ set(listed)):
        err("SHA256SUMS", f"{rel} is {'not listed' if rel in present else 'listed but missing'}")
    for rel in sorted(present & set(listed)):
        with open(os.path.join(HERE, rel), "rb") as fh:
            if hashlib.sha256(fh.read()).hexdigest() != listed[rel]:
                err("SHA256SUMS", f"{rel} does not match its hash")


def check_case(path, releases, by_hash, cases):
    try:
        c = load(path)
    except DuplicateKey:
        c = load(path, allow_duplicates=True)
        if c.get("expected") != {"error": "W0.E_SHAPE"}:
            return err(os.path.basename(path), "duplicate keys are allowed only in an E_SHAPE case's input")
    with open(path, encoding="utf-8") as fh:
        raw = fh.read()
    INPUT_BYTES[c.get("id")] = base64.b64decode(c["inputBase64"]) if "inputBase64" in c else \
        (top_level_value_text(raw, "input") or "").encode("utf-8")
    w = os.path.basename(path)
    need = {"id", "slug", "title", "op", "checks", "notes", "expected"} | ({"inputBase64"} if "inputBase64" in c else {"input"})
    if not need <= set(c) or not set(c) <= need | {"identicalTo", "synthetic"}:
        return err(w, f"case keys {sorted(c)}")
    if not w.startswith(c["id"] + "-" + c["slug"]):
        err(w, "file name must be <id>-<slug>.json")
    for text in RAW_TEXT.get(c["id"], []):
        if text not in raw:
            err(w, f"raw text {text[:40]!r} must stay in the file as written")
    cases[c["id"]] = c
    if "inputBase64" in c:
        return check_bytes_case(w, c)
    exp, inp, op = c["expected"], c["input"], c["op"]
    is_error = isinstance(exp, dict) and set(exp) == {"error"}
    synthetic = c.get("synthetic", False)
    if ("synthetic" in c) != (c["id"] in SYNTHETIC_IDS):
        return err(w, f"synthetic: true is allowed exactly on the cases SPEC 11.1 lists ({', '.join(sorted(SYNTHETIC_IDS))})")
    if synthetic is not True and "synthetic" in c or synthetic and (is_error or op not in ("publish", "receive") or c["checks"]):
        return err(w, "synthetic is true only on a valid publish or receive case without checks")
    if has_float(c, (ConstToken,)):
        err(w, "NaN and Infinity are not JSON: a case with them in its input uses inputBase64")
    if not synthetic and (has_float(exp) or (has_float(inp) and not is_error)):
        err(w, "float tokens are allowed only in the input of an error case or in a synthetic case")
    if synthetic:
        return check_synthetic(w, op, inp, exp)
    if is_error:
        if exp["error"] not in SCHEMA["errorCodes"]:
            err(w, f"unknown error code {exp['error']}")
        if c["checks"]:
            err(w, "error cases carry no rule checks")
        if op not in ("evaluate", "reconcile", "affected", "publish", "receive"):
            err(w, f"unknown op {op}")
        check_numeric_tokens(w, c["id"], inp, raw)
        return
    if op == "publish":
        if c["checks"]:
            err(w, "publish cases carry no rule checks")
        return check_publish(w, inp, exp, by_hash)
    if op == "receive":
        return check_receive(w, inp, exp)
    basis = inp.get("basis")
    if not check_basis(w, basis):
        return
    if op == "affected":
        if set(inp) != {"basis", "release", "worlds", "writes"} or set(exp) != {"affected"} or inp["release"] not in releases:
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
    check_references()
    for cid in list(NUMERIC_ERROR_TOKENS) + list(RAW_TEXT):
        if cid not in cases:
            err("NUMERIC_ERROR_TOKENS or RAW_TEXT", f"{cid} is listed but missing")
    check_hash_files(cases)
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

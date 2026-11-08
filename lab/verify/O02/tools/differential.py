"""V-O04b: does O-REPLAY 0.4.1 change any answer outside erasure and JSON-to-decimal? Runs the same case files through two
oracle trees (old, new) and compares their whole output documents (the `oracle` block and caseSha256 excluded; two exit-2
refusals count as equal). Cases come from existing probe directories and from a seeded random generator that never uses
`erase` and never converts JSON to decimal.

  python3 -I differential.py OLD_ROOT NEW_ROOT WORKDIR N_RANDOM SEED CASE_DIR... -> lab/verify/O02/v-o04b/results/differential.json
"""
import json
import random
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
ARGS = [a for a in sys.argv[1:] if not a.startswith("--out=")]
OLD, NEW, WORK = Path(ARGS[0]), Path(ARGS[1]), Path(ARGS[2])
N, SEED = int(ARGS[3]), int(ARGS[4])
DIRS = [Path(d) for d in ARGS[5:]]
OUT = Path(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--out=")), ROOT / "lab/verify/O02/v-o04b/results/differential.json"))


def features(case_path):
    """V-O04d: the case features a 0.4.1 -> 0.4.2 difference may come from (Q52 shapes, Q56f selector); none = UNEXPLAINED."""
    try:
        c = json.loads(case_path.read_text())
    except ValueError:
        return ["unparsed"]
    found = set()
    for command in c.get("commands") or []:
        ops = command.get("operations") or []
        names = {o.get("op") for o in ops if isinstance(o, dict)}
        if "erasure" in names:
            found.add("Q52g erasure spelling")
        if "erase" in names:
            found.add("erase")
            if len(names) > 1 or len(ops) > len([o for o in ops if o.get("op") == "erase"]):
                found.add("Q52g erase mixed")
            if (command.get("meta") or {}).get("preconditions"):
                found.add("Q52g erase preconditions")
            if any("id" in o for o in ops if o.get("op") == "erase"):
                found.add("Q56f id selector")
    text = json.dumps(c.get("queries") or [])
    if '"readStart"' in text and "erase" in found:
        found.add("Q52e in flight")
    if re.search(r'\["toDecimal", \{"type": "json", "value": [^}]*\}, -?\d+, -?\d+, "', text):
        found.add("Q52f toDecimal(json) rounding")
    return sorted(found)


def run(root, case_path, out_path):
    if out_path.exists():
        out_path.unlink()
    proc = subprocess.run([sys.executable, "-I", str(root / "lab/oracles/replay/cli.py"), str(case_path), "-o", str(out_path)],
                          capture_output=True, text=True)
    if proc.returncode == 2:
        return {"refused": True}
    if proc.returncode not in (0, 1):
        return {"crashed": proc.returncode, "stderr": proc.stderr[-400:]}
    doc = json.loads(out_path.read_text())
    doc.pop("oracle", None)
    doc.pop("caseSha256", None)
    return doc


def first_diff(a, b, path="$"):
    if type(a) is not type(b):
        return path, a, b
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                return f"{path}.{k}", a.get(k, "<absent>"), b.get(k, "<absent>")
            d = first_diff(a[k], b[k], f"{path}.{k}")
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return path + ".len", len(a), len(b)
        for i, (x, y) in enumerate(zip(a, b)):
            d = first_diff(x, y, f"{path}[{i}]")
            if d:
                return d
        return None
    return None if a == b else (path, a, b)


# ------------------------------------------------------------------ random cases (no erase, no JSON-to-decimal)
rng = random.Random(SEED)
SCHEMA = [{"version": 1, "entityTypes": {
    "A": {"attributes": {
        "s": {"attribute": ":a/s", "type": "string", "cardinality": "one"},
        "i": {"attribute": ":a/i", "type": "integer", "cardinality": "one"},
        "n": {"attribute": ":a/n", "type": "number", "cardinality": "one"},
        "b": {"attribute": ":a/b", "type": "boolean", "cardinality": "one"},
        "d": {"attribute": ":a/d", "type": "decimal", "cardinality": "one", "precision": 9, "scale": 2},
        "t": {"attribute": ":a/t", "type": "datetime", "cardinality": "one"},
        "j": {"attribute": ":a/j", "type": "json", "cardinality": "one"},
        "tags": {"attribute": ":a/tags", "type": "string", "cardinality": "many"},
        "r": {"attribute": ":a/r", "type": "ref", "cardinality": "one", "target": "B"}}},
    "B": {"attributes": {"l": {"attribute": ":b/l", "type": "string", "cardinality": "one"}}}}}]
ATTRS = {":a/s": "string", ":a/i": "integer", ":a/n": "number", ":a/b": "boolean", ":a/d": "decimal", ":a/t": "datetime",
         ":a/j": "json", ":a/tags": "string", ":a/r": "ref", ":b/l": "string"}
PROPS = {"s": ":a/s", "i": ":a/i", "n": ":a/n", "b": ":a/b", "d": ":a/d", "t": ":a/t", "tags": ":a/tags", "r": ":a/r"}
A_ENT, B_ENT = ["a1", "a2", "a3", "a4"], ["b1", "b2"]


def value(fam):
    if fam == "string":
        return {"type": "string", "value": rng.choice(["x", "y", "z", "", "é", "\U00010000"])}
    if fam == "integer":
        return {"type": "integer", "value": rng.choice(["0", "1", "-1", "7", "9007199254740993", "-9223372036854775808", "01"])}
    if fam == "number":
        return rng.choice([{"type": "number", "value": x} for x in (0.0, 1.5, -2.25, 0.1, 1e16)] + [{"type": "number", "bits": "0x8000000000000000"}])
    if fam == "boolean":
        return {"type": "boolean", "value": rng.random() < 0.5}
    if fam == "decimal":
        return {"type": "decimal", "value": rng.choice(["1.50", "16.5", "-0.55", "12345678.00", "1.005", "0", "16.500"])}
    if fam == "datetime":
        return {"type": "datetime", "value": rng.choice([0, 10, 20.5, 1e12])}
    if fam == "json":
        return {"type": "json", "value": rng.choice([{"k": 1}, [1, 2], "s", None, {"b": [True, 0.5]}, {"z": 1, "a": 2}])}
    if fam == "ref":
        return {"type": "ref", "value": rng.choice(B_ENT)}
    raise AssertionError(fam)


def random_case(k):
    cmds, refs = [], []
    for c in range(rng.randint(2, 7)):
        ops = []
        for o in range(rng.randint(1, 4)):
            roll = rng.random()
            if roll < 0.72 or not refs:
                attr = rng.choice(list(ATTRS))
                ent = rng.choice(B_ENT) if attr == ":b/l" else rng.choice(A_ENT)
                ref = f"r{c}_{o}"
                op = {"op": "assert", "ref": ref, "entityId": ent, "attribute": attr, "value": value(ATTRS[attr]),
                      "entityType": "B" if attr == ":b/l" else "A", "validFrom": rng.choice([0, 0, 5, 10])}
                if rng.random() < 0.2:
                    op["validTo"] = op["validFrom"] + rng.choice([5, 15])
                ops.append(op)
                refs.append(ref)
            elif roll < 0.88:
                ops.append({"op": "retract", "target": rng.choice(refs)})
            else:
                attr = rng.choice(list(ATTRS))
                pat = {"attribute": attr}
                if rng.random() < 0.5:
                    pat["value"] = value(ATTRS[attr])
                ops.append({"op": "retract-pattern", "pattern": pat})
        meta = {"commandId": f"k{k}c{c}" if rng.random() < 0.9 else f"k{k}dup"}
        if rng.random() < 0.25:
            meta["enforce"] = {"fromSchema": 1}
        cmds.append({"clock": 100 + 10 * c, "meta": meta, "operations": ops})
    cut = lambda: {"validAt": rng.choice([0, 1, 7, 12, 30]), **({"position": {"afterCommand": rng.randrange(len(cmds))}} if rng.random() < 0.3 else {}),  # noqa: E731
                   **({"recordedAt": rng.choice([100, 115, 1000])} if rng.random() < 0.3 else {})}
    qs = []
    for qi in range(rng.randint(4, 10)):
        kind = rng.choice(["match", "get", "getMany", "find", "count", "aggregate", "valueSupports", "history", "timeline", "entityPage",
                           "transactions", "journalFacts", "assertionSnapshot", "compare", "expr", "cutCatalog", "reachability", "assertions"])
        q = {"id": f"q{qi}", "kind": kind}
        if kind in ("match", "valueSupports", "assertionSnapshot"):
            attr = rng.choice(list(ATTRS))
            pat = {"attribute": attr}
            if rng.random() < 0.4:
                pat["value"] = value(ATTRS[attr])
            if rng.random() < 0.3:
                pat = {"entityId": rng.choice(A_ENT)}
            q.update(cut=cut(), pattern=pat)
            if kind == "assertionSnapshot":
                q["mode"] = rng.choice(["live-at-valid", "known-at-valid"])
        elif kind == "get":
            q.update(entityType="A", entityId=rng.choice(A_ENT), cut=cut(), include=rng.choice([[], ["r"]]))
        elif kind == "getMany":
            q.update(entityType="A", entityIds=rng.sample(A_ENT, 2), cut=cut())
        elif kind in ("find", "count"):
            prop = rng.choice(list(PROPS))
            opn = rng.choice(["eq", "ne", "lt", "gte", "exists", "missing"])
            w = {"prop": prop, "op": opn}
            if opn not in ("exists", "missing"):
                w["value"] = value(ATTRS[PROPS[prop]])
            q.update(entityType="A", cut=cut(), where=[w] if rng.random() < 0.8 else [])
            if kind == "find" and rng.random() < 0.5:
                q["orderBy"] = [{"prop": rng.choice(["s", "i", "n", "d", "t", "b"]), "direction": rng.choice(["asc", "desc"])}]
        elif kind == "aggregate":
            var = rng.choice([":a/i", ":a/n", ":a/d", ":a/s"])
            agg = rng.choice(["sum", "min", "max", "count", "avg"])
            a = {"op": agg, "var": "v", "as": "x"}
            if agg == "avg" and rng.random() < 0.6:
                a["convert"] = "toNumber"
            q.update(cut=cut(), match={"attributes": {"v": var, **({"g": ":a/s"} if rng.random() < 0.4 else {})}}, aggregates=[a])
            if "g" in q["match"]["attributes"]:
                q["groupBy"] = ["g"]
        elif kind == "history":
            q.update(entityId=rng.choice(A_ENT))
        elif kind == "timeline":
            q.update(entityType="A", entityId=rng.choice(A_ENT), attribute=rng.choice(list(PROPS.values())), cut={})
        elif kind == "entityPage":
            q.update(entityType="A", limit=rng.choice([1, 2, 50]), cut=cut())
        elif kind == "transactions":
            q.update(after=rng.choice([0, 1, 2]), limit=rng.choice([1, 100]))
        elif kind == "compare":
            fa, fb = rng.choice(list(ATTRS.values())), rng.choice(list(ATTRS.values()))
            q.update(left=value(fa), right=value(fb))
        elif kind == "expr":
            fam = rng.choice(["integer", "number", "decimal"])
            q.update(expr=[rng.choice(["add", "sub", "mul", "div", "rem"]), value(fam), value(rng.choice([fam, fam, "integer"]))])
        elif kind == "reachability":
            q.update(cut=cut(), attribute=":a/r", **{"from": rng.choice(A_ENT)})
        qs.append(q)
    c = {"format": "triplex-db-2/o-replay-case/1", "caseId": f"v-o04b/fuzz/{k}", "defaultScope": "s", "schemas": SCHEMA,
         "commands": cmds, "queries": qs}
    if rng.random() < 0.15:
        c["lane"] = "qlever"
    return c


WORK.mkdir(parents=True, exist_ok=True)
cases = []
for d in DIRS:
    cases += sorted(d.glob("*.case.json"))
for k in range(N):
    p = WORK / f"fuzz-{k:04d}.case.json"
    p.write_text(json.dumps(random_case(k)) + "\n")
    cases.append(p)
rows, same, both_refused = [], 0, 0
for p in cases:
    a = run(OLD, p, WORK / "old.out.json")
    b = run(NEW, p, WORK / "new.out.json")
    if a.get("refused") and b.get("refused"):
        both_refused += 1
        continue
    d = first_diff(a, b)
    if d is None:
        same += 1
        continue
    rows.append({"case": str(p), "path": d[0], "old": d[1], "new": d[2], "features": features(p),
                 "oldRefused": bool(a.get("refused")), "newRefused": bool(b.get("refused"))})
by_feature = {}
for r in rows:
    key = " + ".join(f for f in r["features"] if f != "erase") or ("erase (Q49-Q52 erasure)" if "erase" in r["features"] else "UNEXPLAINED")
    by_feature[key] = by_feature.get(key, 0) + 1
out = {"old": str(OLD), "new": str(NEW), "cases": len(cases), "random": N, "seed": SEED, "identical": same, "bothRefused": both_refused,
       "different": len(rows), "differentByFeature": by_feature, "rows": rows}
OUT.write_text(json.dumps(out, indent=1, default=str) + "\n")
print(json.dumps({k: v for k, v in out.items() if k != "rows"}))
for r in rows:
    print(Path(r["case"]).name, r["features"], r["path"], json.dumps(r["old"], default=str)[:120], "->", json.dumps(r["new"], default=str)[:120])

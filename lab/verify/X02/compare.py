#!/usr/bin/env python3
"""V-X02: compare G2 runs (XTQL and SQL) per execution against the verifier's own expectations.

Usage: python3 -I compare.py <expect.json> <packet.json> <xtql-report.json> <sql-report.json> [out.json]

Per execution (71 logical tasks x current/reopen): status, rows, whether rows equal the verifier's expectation
(expect.py) and the packet's expected_rows, every language seen in the trace (answers and substeps), the set of
recorded positions the task's calls read at (one cut per task), call count and elapsed time.
"""
import json
import sys


def canon(rows):
    return sorted({json.dumps(r, separators=(",", ":"), sort_keys=True) for r in rows}) if rows is not None else None


def execs(report):
    out = {}
    for w in report["workloads"]:
        for c in w["cases"]:
            trace = [t for t in c.get("queryTrace", []) if t.get("operation") == "public-native-query"]
            langs = sorted({t.get("language") for t in trace} | {s.get("language") for t in trace for s in t.get("steps", [])})
            positions = sorted({(t.get("basis") or {}).get("recordedPosition") for t in trace})
            out[(c["logicalTaskId"], c["reopen"])] = {
                "status": c["status"],
                "rows": canon(c.get("actualRows")),
                "languages": langs,
                "positions": positions,
                "calls": len(trace),
                "elapsedMs": round(c.get("elapsedMsDiagnostic", 0)),
                "timeout": "TimeoutError" in str(c.get("error", "")),
                "error": str(c.get("error", ""))[:200] if c["status"] != "PASS" else None,
                "maxQueryChars": max([len(str(t.get("query", ""))) for t in trace] or [0]),
            }
    return out


def main():
    mine = json.load(open(sys.argv[1]))
    packet = json.load(open(sys.argv[2]))
    xtql_report, sql_report = json.load(open(sys.argv[3])), json.load(open(sys.argv[4]))
    print("nativeLanguage recorded in runner reports:", xtql_report.get("nativeLanguage"), sql_report.get("nativeLanguage"))
    xq, sq = execs(xtql_report), execs(sql_report)
    expected = {f"{w['id']}/{c['id']}": canon(c["expected_rows"]) for w in packet["workloads"] for c in w["cases"]}
    table = []
    for task in sorted(mine):
        for reopen in (False, True):
            x, s = xq.get((task, reopen)), sq.get((task, reopen))
            me = canon(mine[task])
            row = {
                "task": task, "reopen": reopen, "mine": me,
                "mineEqualsPacket": me == expected[task],
                "xtql": x, "sql": s,
                "xtqlEqualsMine": x is not None and x["rows"] == me,
                "sqlEqualsMine": s is not None and s["rows"] == me,
                "xtqlEqualsSql": x is not None and s is not None and x["rows"] is not None and x["rows"] == s["rows"],
                "xtqlPure": x is not None and x["languages"] == ["xtql"],
                "sqlPure": s is not None and s["languages"] == ["xtdb-sql"],
                "xtqlOneCut": x is not None and len(x["positions"]) == 1,
                "sqlOneCut": s is not None and len(s["positions"]) == 1,
            }
            table.append(row)
    n = len(table)
    def count(key):
        return sum(1 for r in table if r[key])
    summary = {k: count(k) for k in ["mineEqualsPacket", "xtqlEqualsMine", "sqlEqualsMine", "xtqlEqualsSql", "xtqlPure", "sqlPure", "xtqlOneCut", "sqlOneCut"]}
    summary["executions"] = n
    summary["xtqlStatus"] = {}
    summary["sqlStatus"] = {}
    for r in table:
        for lang in ("xtql", "sql"):
            st = r[lang]["status"] if r[lang] else "MISSING"
            summary[lang + "Status"][st] = summary[lang + "Status"].get(st, 0) + 1
    summary["xtqlTimeouts"] = [f"{r['task']}{' (reopen)' if r['reopen'] else ''}" for r in table if r["xtql"] and r["xtql"]["timeout"]]
    summary["sqlTimeouts"] = [f"{r['task']}{' (reopen)' if r['reopen'] else ''}" for r in table if r["sql"] and r["sql"]["timeout"]]
    summary["xtqlWrongNotTimeout"] = [r["task"] for r in table if r["xtql"] and not r["xtqlEqualsMine"] and not r["xtql"]["timeout"]]
    summary["sqlWrongNotTimeout"] = [r["task"] for r in table if r["sql"] and not r["sqlEqualsMine"] and not r["sql"]["timeout"]]
    summary["impure"] = [f"{r['task']} {lang}" for r in table for lang in ("xtql", "sql") if r[lang] and r[lang]["calls"] and not r[lang + "Pure"]]
    summary["multiCut"] = [f"{r['task']} {lang} {r[lang]['positions']}" for r in table for lang in ("xtql", "sql") if r[lang] and len(r[lang]["positions"]) > 1]
    print(json.dumps(summary, indent=1))
    print()
    print("| task | mode | expected (verifier) | XTQL | SQL | XTQL calls / ms | SQL calls / ms |")
    print("| --- | --- | --- | --- | --- | --- | --- |")
    def short(rows):
        if rows is None:
            return "-"
        vals = [",".join(str(v["value"]) for v in json.loads(r)) for r in rows]
        text = "; ".join(vals) if vals else "(empty)"
        return text if len(text) < 60 else text[:57] + "..."
    for r in table:
        x, s = r["xtql"] or {}, r["sql"] or {}
        xs = ("= " if r["xtqlEqualsMine"] else ("TIMEOUT" if x.get("timeout") else "WRONG ")) if x else "MISSING"
        ss = ("= " if r["sqlEqualsMine"] else ("TIMEOUT" if s.get("timeout") else "WRONG ")) if s else "MISSING"
        print(f"| {r['task']} | {'reopen' if r['reopen'] else 'current'} | {short(r['mine'])} | {xs.strip()} | {ss.strip()} | {x.get('calls')} / {x.get('elapsedMs')} | {s.get('calls')} / {s.get('elapsedMs')} |")
    if len(sys.argv) > 5:
        json.dump({"summary": summary, "table": table}, open(sys.argv[5], "w"), indent=1)


if __name__ == "__main__":
    main()

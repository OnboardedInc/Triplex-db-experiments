"""Recount the full groups, native guard work and VM pressure from the managed SQL slot."""

from bisect import bisect_right
from collections import Counter, defaultdict
import base64
import json
from pathlib import Path
from statistics import median
import sys

from read_probe import managed_events, sha


def scoped_db(attempt, arm):
    scope = json.dumps(["triplex-scope-v1", "test", "prep1", f"{attempt}-{arm}", 0], separators=(",", ":"))
    return scope, "s2-" + base64.urlsafe_b64encode(scope.encode()).decode().rstrip("=")


def distribution(samples):
    return {"min": min(samples), "median": median(samples), "max": max(samples)}


def ms(ns):
    return ns / 1e6


def read(out):
    inputs, terminal, events = managed_events(out)
    attempt = inputs["attempt"]
    mode = inputs["mode"]
    assert mode in ("profile", "cheap")
    assert mode == (out / "stage/lab/config/datomic/mode").read_text().strip()
    raw = (out / terminal["log"]).read_text().splitlines()
    lease, = [json.loads(l[12:]) for l in raw if l.startswith("PREP1_LEASE ")]
    pressure = sorted(events("PREP1_CPU "), key=lambda r: r["at"])
    sample_clock = [p["at"] for p in pressure]
    assert len(pressure) == len(set(sample_clock))

    def cpu_window(begin, finish):
        left = bisect_right(sample_clock, begin) - 1
        right = bisect_right(sample_clock, finish)
        assert left >= 0 and right < len(pressure)
        before, after = pressure[left], pressure[right]
        window = after["at"] - before["at"]
        deltas = {k: int(after["cgroup"][k]) - int(before["cgroup"][k])
                  for k in ("usage_usec", "nr_periods", "nr_throttled", "throttled_usec")}
        totals = [dict(k.split("=") for k in p["pressure"]["some"].split()) for p in (before, after)]
        assert window > 0 and min(deltas.values()) >= 0
        return {"vmSomeAvg10": float(totals[0]["avg10"]), "windowNs": window,
                "vmSomeIntervalPercent": 1e5 * (int(totals[1]["total"]) - int(totals[0]["total"])) / window,
                "fromNs": before["at"], "toNs": after["at"], **deltas}

    native = {}
    for append in events("PREP1_NATIVE "):
        for member in append["members"]:
            key = append["db"], str(member["t"])
            assert key not in native
            native[key] = (member, append)

    profile = {}
    if mode == "profile":
        for entry in events("PREP1_GUARD "):
            key = entry["scope"], entry["operation"]
            assert key not in profile
            profile[key] = entry

    by_arm = defaultdict(list)
    for entry in events("PREP1_PROBE "):
        by_arm[entry["arm"]].append((entry["kind"], entry["data"]))
    if mode == "profile":
        assert list(by_arm) == ["reference", "guard", "time", "reads"]
    else:
        assert list(by_arm) == ["reference", "guard", "cheap", "cheap2"]
    results = {}
    for arm, observations in by_arm.items():
        assert [kind for kind, _ in observations] == ["seed", "block", "finished"]
        seed, block, finished = (value for _, value in observations)
        scope, db = scoped_db(attempt, arm)
        assert (seed["db"], seed["scope"], seed["subjects"], seed["facts"], seed["position"]) == (db, scope, 96, 15360, 12)
        assert (block["db"], block["head"], block["outstanding"], finished["db"], finished["head"]) == (db, 12, 32, db, 108)
        assert {e["index"] for e in block["rows"]} == set(range(96))
        groups = defaultdict(list)
        for i, e in enumerate(block["rows"], 13):
            ack = e["ack"]
            assert ack["operationId"] == f"edit-{e['index']}" and int(ack["position"]["v"]) == i
            groups[ack["t"]["v"]].append(e)
        samples, physical, checks = [], [], defaultdict(list)
        for t, rows in groups.items():
            member, append = native[db, t]
            applied_start, applied_end = member["started-at"], member["applied-at"]
            first = min(int(row["begin"]) for row in rows)
            last = max(int(row["end"]) for row in rows)
            assert int(block["start"]) <= first <= member["read-at"] <= applied_start <= applied_end <= append["start"] <= append["end"] <= last
            ack = rows[-1]["ack"]
            assert all(r["ack"]["groupSize"] == len(rows) and r["ack"]["datoms"] == member["datom-count"] for r in rows)
            stats = ack.get("preparedStats")
            variant = stats["path"] if stats else "reference"
            physical.append({"t": t, "size": len(rows), "path": variant, "variant": stats.get("guard") if stats else None,
                             "replays": stats["replays"] if stats else 0})
            observed = profile.pop((scope, ack["operationId"]), None)
            if observed:
                assert arm == observed["mode"] and variant == "prepared" and observed["members"] == len(rows)
                assert observed["basis"] < int(t)
                assert applied_start <= observed["start"] <= observed["end"] <= applied_end
                assert 0 <= observed["cpuNs"] <= observed["end"] - observed["start"]
                measured = Counter((s["check"], s["member"]) for s in observed["checks"])
                for tag in ("scope", "head"):
                    assert measured[tag, None] == 1
                for i in range(len(rows)):
                    for tag in ("function", "revisions", "retirements", "history", "journal"):
                        assert measured[tag, i] == 1
            elif arm in ("time", "reads"):
                assert variant == "reference"
            if len(rows) != 8:
                continue
            sample = {"t": t, "firstPosition": int(rows[0]["ack"]["position"]["v"]),
                      "operations": [e["ack"]["operationId"] for e in rows],
                      "path": variant, "guardMode": stats.get("guard") if stats else None,
                      "applyMs": ms(applied_end - applied_start), "appendMs": ms(append["end"] - append["start"]),
                      "pressure": cpu_window(applied_start, applied_end)}
            if observed:
                sample["guardMs"] = ms(observed["end"] - observed["start"])
                sample["guardCpuMs"] = ms(observed["cpuNs"])
                sample["checks"] = observed["checks"]
                by_check = defaultdict(list)
                for section in observed["checks"]:
                    assert section["start"] <= section["end"] <= applied_end
                    assert 0 <= section["cpuNs"] <= section["end"] - section["start"]
                    by_check[section["check"]].append(section)
                for key, sections in by_check.items():
                    reads = Counter()
                    for s in sections:
                        if s["io"]:
                            reads.update({k: v for k, v in s["io"].get("reads", {}).items()
                                          if isinstance(v, (int, float))})
                    checks[key].append({"count": len(sections),
                                        "wallMs": sum(ms(s["end"] - s["start"]) for s in sections),
                                        "cpuMs": sum(ms(s["cpuNs"]) for s in sections),
                                        "reads": reads})
            samples.append(sample)
        assert samples
        results[arm] = {
            "groups": len(samples), "applyMs": distribution([s["applyMs"] for s in samples]),
            "appendMs": distribution([s["appendMs"] for s in samples]),
            "vmSomeAvg10": distribution([s["pressure"]["vmSomeAvg10"] for s in samples]),
            "vmSomeIntervalPercent": distribution([s["pressure"]["vmSomeIntervalPercent"] for s in samples]),
            "throttledUsec": distribution([s["pressure"]["throttled_usec"] for s in samples]),
            "byCheck": {k: {"groups": len(v), "calls": median(s["count"] for s in v),
                            "wallMs": median(s["wallMs"] for s in v), "cpuMs": median(s["cpuMs"] for s in v),
                            "wallPerCallMs": median(s["wallMs"] / s["count"] for s in v),
                            "reads": {a: median(s["reads"].get(a, 0) for s in v)
                                      for a in sorted({a for s in v for a in s["reads"]})}}
                        for k, v in checks.items()},
            "physical": physical, "samples": samples,
        }
    assert not profile
    return {"attempt": attempt, "source": inputs["head"], "inputSha256": sha(out / "inputs.json"),
            "image": terminal["image"], "slot": terminal["slot"], "rawSha256": terminal["sha256"],
            "verifierSha256": sha(Path(__file__)), "lease": lease, "arms": results}


if __name__ == "__main__":
    if not __debug__:
        raise SystemExit("Verification requires enabled assertions")
    out = Path(sys.argv[1])
    data = read(out)
    with (out / "guard-summary.json").open("x") as stream:
        json.dump(data, stream, indent=2)
        stream.write("\n")

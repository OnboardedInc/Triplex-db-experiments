"""Recount the existing full-size trace without retaining an expanded archive."""

import hashlib
from bisect import bisect_left, bisect_right
from collections import Counter
from datetime import datetime
import json
import math
import re
import statistics
import sys
import tarfile
from pathlib import Path

ARCHIVE = "5c31f5a9512634d92144baff84edd2c3aad8300a06bd281ca9cba8231c00b4ad"
SOURCE = "92f8e6c30db1084b3c00a93d57fed0e8f612e67e"


def pauses(raw):
    result = []
    reasons = Counter()
    for line in raw.decode().splitlines():
        found = re.search(r'Safepoint "([^"]+)".* Total: (\d+) ns', line)
        if found:
            hi = datetime.fromisoformat(line[1:line.index("]")]).timestamp() * 1000
            ms = int(found[2]) / 1_000_000
            reasons[found[1]] += ms
            result.append((hi - ms, hi))
    combined = []
    for lo, hi in sorted(result):
        if combined and lo <= combined[-1][1]:
            combined[-1] = (combined[-1][0], max(hi, combined[-1][1]))
        else:
            combined.append((lo, hi))
    return combined, reasons


def metrics(rows, pauses_and_reasons):
    gc, reasons = pauses_and_reasons
    prepare = sorted(row["stage"]["timeline"]["payloadPrepared"] / 1000 for row in rows)
    cut = prepare[math.ceil(0.99 * len(rows)) - 1]
    tables = {}
    ends = [end for _, end in gc]
    starts = [start for start, _ in gc]
    assert ends == sorted(ends)
    for name, group in (
        ("all", rows),
        ("slowPrepare", [r for r in rows if r["stage"]["timeline"]["payloadPrepared"] / 1000 >= cut]),
    ):
        reads = [r["stage"]["nativeIoStats"]["reads"] for r in group]
        def overlap(lo, hi):
            if hi <= lo:
                return 0
            count = bisect_left(ends, lo)
            return sum(max(0, min(hi, b) - max(lo, a))
                       for a, b in gc[count:bisect_right(starts, hi)])
        possible = [overlap(r["sent"] - 1, r["end"] + 1) for r in group]
        certain = []
        for row in group:
            # [DX-W1] Why: the latest possible parse is the ACK minus the gateway's own elapsed time.
            # Rejected: attributing the complete HTTP overlap to preparation or picking a cross-clock midpoint.
            timeline = row["stage"]["timeline"]
            earliest = row["sent"] - 1
            latest = row["end"] + 1 - timeline["responsePrepared"] / 1000
            certain.append(overlap(latest, earliest + timeline["payloadPrepared"] / 1000)
                           if latest >= earliest else 0)
        tables[name] = {
            "n": len(group),
            "prepareMeanMs": statistics.mean(r["stage"]["timeline"]["payloadPrepared"] / 1000 for r in group),
            "sqlMisses": sum(r.get("sql", 0) for r in reads),
            "zeroSqlSaves": sum(not r.get("sql", 0) for r in reads),
            "meanWidth": statistics.mean(r["width"] for r in group),
            "httpIntervalsIntersectingGatewaySafepoint": sum(x > 0 for x in possible),
            "possiblePauseMsInWholeHttp": sum(possible),
            "minimumPauseMsInsidePrepare": sum(certain),
            "preparesWithMinimumPause": sum(x > 0 for x in certain),
            "meanCounters": {
                key: statistics.mean(r.get(key, 0) for r in reads)
                for key in ("sql", "sql-ms", "deserialize-ms", "ocache", "aevt-load", "eavt-load", "avet-load")
            },
        }
    return {"p99PrepareMs": cut, "gatewaySafepointMsByCause": reasons, **tables}


def main(archive):
    with archive.open("rb") as stream:
        assert hashlib.file_digest(stream, "sha256").hexdigest() == ARCHIVE
    roots = {"headline": "campaign", "default": "campaign/server-default/campaign"}
    wanted = {"custody.json"}
    for root in roots.values():
        wanted |= {f"{root}/loaded/attempt.json", f"{root}/loaded/pgdata.json",
                   f"{root}/p6-394-loaded/arm.json", f"{root}/p6-394-loaded/operations.json"}
    result, seen, info = {}, set(), {}
    with tarfile.open(archive, "r|gz") as tar:
        for member in tar:
            name = member.name
            if name not in wanted and not name.endswith((
                "/prep1-native.ndjson", "/tx-native-settings.json", "/prep1-gc-gw-w.log"
            )):
                continue
            assert member.isfile()
            raw = tar.extractfile(member).read()
            if name == "custody.json":
                custody = json.loads(raw)
                assert custody["source"] == SOURCE and custody["tag"] == "score-v01-fresh-tuned"
                assert custody["result"] == "success"
                continue
            expected = custody["files"][name]
            assert len(raw) == expected["bytes"] and hashlib.sha256(raw).hexdigest() == expected["sha256"]
            if name.endswith("/prep1-native.ndjson"):
                first, *_, last = raw.splitlines()
                event, terminal = json.loads(first), json.loads(last)
                assert terminal == {"attempt": event["attempt"], "dropped": 0, "end": True}
                info[name] = {"eventFields": sorted(event), "memberFields": sorted(event["members"][0]),
                              "attempt": event["attempt"]}
            elif name.endswith("/prep1-gc-gw-w.log"):
                info[name] = pauses(raw)
            elif name.endswith("/operations.json"):
                header = info[name.removesuffix("operations.json") + "arm.json"]
                assert header["observationsSha256"] == expected["sha256"]
                assert header["source"] == SOURCE
                ops = json.loads(raw)
                same = [r for r in ops["writes"] if r["status"] == "acked"]
                assert same and len({(r["db"], r["receipt"]["t"]) for r in same}) == len(same)
                root = name.split("/p6-394-loaded/", 1)[0]
                gc = info[f"{root}/loaded/engines/{header['slot']}/trace/raw/prep1-gc-gw-w.log"]
                result[name] = {"attempt": header["attempt"], "slot": header["slot"], **metrics(same, gc)}
            else:
                info[name] = json.loads(raw)
            seen.add(name)
    assert wanted - seen == {"custody.json"}
    for name, root in roots.items():
        attempt = info[f"{root}/loaded/attempt.json"]
        value = result[f"{root}/p6-394-loaded/operations.json"]
        prefix = f"{root}/loaded/engines/{attempt['slot']}/trace/raw/"
        trace = info[prefix + "prep1-native.ndjson"]
        assert value["attempt"] == trace["attempt"] == attempt["nonce"] and value["slot"] == attempt["slot"]
        settings = info[prefix + "tx-native-settings.json"]
        value["trace"] = trace
        value["storageFields"] = sorted(info[f"{root}/loaded/pgdata.json"])
        value["cacheFlags"] = {
            "jvm": settings.get("jvm", {}).get("objectCacheMax"),
            "sections": sorted(settings),
        }
    return {"source": SOURCE, "archive": ARCHIVE, "arms": {
        name: result[f"{root}/p6-394-loaded/operations.json"] for name, root in roots.items()
    }}


if __name__ == "__main__":
    assert __debug__
    print(json.dumps(main(Path(sys.argv[1])), indent=2))

#!/usr/bin/env python3
"""Compare matched Mac observations. Every timing in the output is host-specific."""

from pathlib import Path
import json
import sys


def ratio(a, b):
    return b / a if a and b is not None else None


root = Path(sys.argv[1])
cells = ["01-present", "02-candidate", "03-present", "04-candidate"]
measurements = [json.loads((root / name / "measurement.json").read_text()) for name in cells]
rows = []
for left, right in zip(measurements[::2], measurements[1::2]):
    assert left["jvmArm"] == "present" and right["jvmArm"] == "candidate"
    assert left["identity"]["source"] == right["identity"]["source"]
    assert left["identity"]["nonce"] != right["identity"]["nonce"]
    assert left["archive"] == right["archive"] and left["seconds"] == right["seconds"] == 240
    assert left["driverStatus"] == right["driverStatus"] == "DONE"
    roles = {}
    for role in left["gc"]:
        a, b = (m["gc"][role]["window"] for m in (left, right))
        a_growth, b_growth = (m["betweenGcHeapGrowth"][role] or {} for m in (left, right))
        roles[role] = {
            "heapGrowthPerAckRatio": ratio(a_growth.get("bytesPerCoveredAck"),
                                          b_growth.get("bytesPerCoveredAck")),
            "heapGrowthCoveredAcks": [a_growth.get("coveredAcks"), b_growth.get("coveredAcks")],
            "counts": [a["count"], b["count"]],
            "countRatio": ratio(a["count"], b["count"]),
            "macPauseP99Ms": [a["ms"]["p99"], b["ms"]["p99"]],
            "macPauseP99Ratio": ratio(a["ms"]["p99"], b["ms"]["p99"]),
        }
    rows.append({
        "present": left["identity"],
        "candidate": right["identity"],
        "saves": [left["saves"], right["saves"]],
        "pauseRatiosCandidateOverPresent": roles,
        "writerAllocationSampleRatio": ratio(left["allocationSampleWeightBytesPerSave"],
                                             right["allocationSampleWeightBytesPerSave"]),
        "macRestartToFirstAckMs": [left["restart"]["firstAckMs"], right["restart"]["firstAckMs"]],
        "macIndexWindows": [left["explicitIndex"], right["explicitIndex"]],
    })
with (root / "comparison.json").open("x") as file:
    json.dump({"platform": "shared Mac; timings are host-specific", "adjacentPairs": rows}, file, indent=2)
    file.write("\n")

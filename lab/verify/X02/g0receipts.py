#!/usr/bin/env python3
"""V-X02: summarize recent G0 xtdb receipts (verdict, experiment, counts, source head)."""
import glob
import json
import sys

for path in sorted(glob.glob(sys.argv[1] + "/G0-xtdb-*.json"))[-8:]:
    r = json.load(open(path))
    src = r.get("source") or {}
    print(path.split("/")[-1], r.get("verdict"), r.get("experiment"), json.dumps(r.get("counts", {}))[:260], src.get("head"), src.get("branch"))

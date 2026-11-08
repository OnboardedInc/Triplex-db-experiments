#!/usr/bin/env python3
"""V-X02: print the source identity block of a gate receipt (commit, dirty files)."""
import json
import sys

r = json.load(open(sys.argv[1]))
src = r["git"]
print({k: (v if not isinstance(v, (list, dict)) else (len(v), str(v)[:300])) for k, v in src.items()})

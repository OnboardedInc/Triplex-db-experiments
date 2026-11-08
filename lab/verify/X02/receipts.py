#!/usr/bin/env python3
"""V-X02: summarize G2 xtdb receipts (verdict, pass count, language tally, whether the native language is recorded)."""
import glob
import json
import sys

for path in sorted(glob.glob(sys.argv[1] + "/G2-xtdb-*.json")):
    r = json.load(open(path))
    text = json.dumps(r)
    counts = r.get("counts") or r.get("result", {}).get("counts", {})
    langs = r.get("languages") or r.get("result", {}).get("languages")
    print(path.split("/")[-1], r.get("verdict"), r.get("experiment"), "pass", counts.get("pass"),
          "fail", counts.get("fail"), "| nativeLanguage recorded:", "nativeLanguage" in text or "TRIPLEX_XTDB_NATIVE_LANGUAGE" in text)
    if langs:
        print("   languages:", json.dumps({k: v for k, v in langs.items() if k != "rule"})[:400])

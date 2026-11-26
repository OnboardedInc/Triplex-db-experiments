#!/usr/bin/env python3
"""[DX-ERA6 eighth pass] The save line's gates pass only when exactly the listed tests fail.

Usage: expected_save_line.py OUT_DIR RULE   (RULE 1 when the gates ran with RULE=1, else 0)

era6/expected-save-line.json lists each failing test with the settings it fails in, its kind (an open finding, a
case a review rates by design, a test artefact a review explains, or a finding no review covers) and the review's
own words. For every setting whose log is in OUT_DIR, the tests that fail (clojure.test `FAIL in` or `ERROR in`)
must be exactly the listed ones; a listed test with `must_contain` must also print that text in that setting's log.
Every log must carry its result line. Exit 1 on any difference."""
import glob, json, os, re, sys

out, rule = sys.argv[1], ("on" if sys.argv[2] == "1" else "off")
entries = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "expected-save-line.json")))
ok = True
logs = {os.path.basename(f)[:-4]: open(f, errors="replace").read() for f in sorted(glob.glob(os.path.join(out, "*.log")))}
if not logs:
    print("SAVE_LINE_EXPECTED MISMATCH: no logs"); sys.exit(1)
failed = set()
for s, text in logs.items():
    if not re.search(r"^DX-S[56](R2|R3)?_RESULT ", text, re.M):
        ok = False; print(f"SAVE_LINE_EXPECTED MISMATCH: {s} has no result line")
    for m in re.finditer(r"(?:FAIL|ERROR) in \(([^)]+)\)", text):
        failed.add((m.group(1), s))
expected = {}
for e in entries:
    if e["rule"] in ("*", rule):
        for s in e["settings"]:
            if s in logs:
                expected[(e["test"], s)] = e
for key in sorted(failed - set(expected)):
    ok = False; print(f"SAVE_LINE_EXPECTED UNEXPECTED: {key[0]} in {key[1]}")
for key in sorted(set(expected) - failed):
    ok = False; print(f"SAVE_LINE_EXPECTED PASSED-UNEXPECTEDLY [{expected[key]['id']}]: {key[0]} in {key[1]}")
for key in sorted(failed & set(expected)):
    e = expected[key]
    missing = [t for t in e.get("must_contain", []) if t not in logs[key[1]]]
    if missing:
        ok = False; print(f"SAVE_LINE_EXPECTED WRONG-DETAIL [{e['id']}]: {key[0]} in {key[1]} lacks {missing}")
by_id = {}
for key in sorted(failed & set(expected)):
    by_id.setdefault(expected[key]["id"], []).append(key[1])
for i, ss in by_id.items():
    e = next(x for x in entries if x["id"] == i)
    print(f"SAVE_LINE_EXPECTED LISTED [{i}] ({e['kind']}): {e['test']} in {len(ss)} settings")
print(f"SAVE_LINE_EXPECTED {'OK' if ok else 'MISMATCH'}: {len(logs)} logs, {len(failed)} failing test-settings, "
      f"{len(expected)} listed" + (", every other test passed" if ok else ""))
sys.exit(0 if ok else 1)

#!/usr/bin/env python3
"""[DX-ERA6 eighth pass] A review run passes only when exactly the listed checks fail.

Usage: expected.py RUN_LOG MAIN MODE "PHASES" PG [RULE]
  RUN_LOG  the run's log (ERA3_VIOLATION and ERA3_SUMMARY lines)
  MAIN     ERA3_MAIN of the run (r7, r7b, 7, 8, ...; gate-e9 for era2/gate.sh's E9 arm)
  MODE     the run's mode (off, on, subject, commit)
  PHASES   the run's ERA3_PHASES
  PG       1 for the PostgreSQL authority, else the file authority
  RULE     1 when the replay rule runs (per account, or TX2_REMOVAL_REPLAY_RULE=1), 0 when not: an entry whose detail
           has a form for each (form_when_rule_on, form_when_rule_off) must fail in that form

The checks listed in era3/expected-failures.json (each with the review's own words) are the only ones allowed to
fail, and each listed check whose case this run ran must fail, with the detail the review describes. The run fails
(exit 1) when:
- a check not on the list fails (a real finding);
- a listed check passes, or fails without the review's detail (it is then not the case the review rated);
- the summary is missing, or a builder check failed.
Each listed failure is printed with its id and kind, so a reader never has to interpret a count.
"""
import json, os, re, sys
from collections import Counter

log, main, mode, phases, pg = sys.argv[1], sys.argv[2], sys.argv[3], set(sys.argv[4].split()), sys.argv[5] == "1"
rule = sys.argv[6] if len(sys.argv) > 6 else None
here = os.path.dirname(os.path.abspath(__file__))
entries = json.load(open(os.path.join(here, "expected-failures.json")))
text = open(log, errors="replace").read().splitlines()

summary = [l for l in text if l.startswith("ERA3_SUMMARY ")]
if not summary:
    print("EXPECTED_FAILURES MISMATCH: no ERA3_SUMMARY line"); sys.exit(1)
label = summary[-1].split(" ", 2)[1]
builder_failed = re.search(r":builder-checks-failed (\d+)", summary[-1])

viol = []
for l in text:
    if not l.startswith("ERA3_VIOLATION "):
        continue
    m = re.match(r'ERA3_VIOLATION (\S+) \{:case "((?:[^"\\]|\\.)*)", :message "((?:[^"\\]|\\.)*)"(.*)$', l)
    if not m:
        print("EXPECTED_FAILURES MISMATCH: unparsed violation line:", l[:300]); sys.exit(1)
    viol.append((m.group(2), m.group(3), m.group(4)))

def applies(e):
    # rule_state "on" or "off": the entry applies only when the run's replay rule is in that state (RULE)
    if e.get("rule_state") in ("on", "off") and rule in ("0", "1") and e["rule_state"] != ("on" if rule == "1" else "off"):
        return False
    return (e["main"] == main and e["phase"] in phases
            and ("*" in e["modes"] or mode in e["modes"])
            and (e["authority"] == "*" or (e["authority"] == "postgresql") == pg))

expected = {}
for e in entries:
    if applies(e):
        expected[(e["case"].replace("{label}", label), e["message"])] = e

ok = True
seen = Counter((c, m) for c, m, _ in viol)
for key, n in seen.items():
    if key not in expected:
        ok = False
        print(f"EXPECTED_FAILURES UNEXPECTED ({n}x): {key[0]} | {key[1]}")
    elif n != 1:
        ok = False
        print(f"EXPECTED_FAILURES REPEATED ({n}x, expected once): {key[0]}")
for key, e in expected.items():
    if key not in seen:
        ok = False
        print(f"EXPECTED_FAILURES PASSED-UNEXPECTEDLY [{e['id']}]: {key[0]} (listed as failing: {e['kind']})")
        continue
    detail = next(d for c, m, d in viol if (c, m) == key)
    forms = [i for i, form in enumerate(e["detail"]) if all(s in detail for s in form)]
    want = e.get("form_when_rule_on" if rule == "1" else "form_when_rule_off") if rule in ("0", "1") else None
    if want is not None:
        forms = [i for i in forms if i + 1 == want]
    if not forms:
        ok = False
        print(f"EXPECTED_FAILURES WRONG-DETAIL [{e['id']}]: {key[0]} fails, but not as the review describes: {detail[:400]}")
    else:
        print(f"EXPECTED_FAILURES LISTED [{e['id']}] ({e['kind']}; detail form {forms[0] + 1}): {key[0]}")
if builder_failed and int(builder_failed.group(1)) != 0:
    ok = False
    print(f"EXPECTED_FAILURES MISMATCH: {builder_failed.group(1)} builder checks failed")
oracles = re.search(r":oracles (\d+)", summary[-1])
print(f"EXPECTED_FAILURES {'OK' if ok else 'MISMATCH'} {label}: {oracles.group(1) if oracles else '?'} oracles, "
      f"{len(viol)} failed, {len(expected)} listed for this run, every other check passed" if ok else
      f"EXPECTED_FAILURES MISMATCH {label}: see the lines above")
sys.exit(0 if ok else 1)

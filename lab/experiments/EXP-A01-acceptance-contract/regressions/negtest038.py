"""EXP-A01 regression harness for contract 0.3.8: every deliberate regression must make the generator report CONTRACT INVALID.
Runs from any directory; operates on the worktree that contains this file. tests-through-037.json holds the earlier mutations
(entries whose anchors no longer exist are reported as retired, not run)."""
import json, pathlib, subprocess, sys
HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[3]
GEN = REPO / "lab/acceptance/build_contract.py"
src = GEN.read_text()
mut = REPO / "lab/acceptance/_negtest_tmp.py"
tests = json.loads((HERE / "tests-through-037.json").read_text())
T = lambda *pairs: [list(p) for p in pairs]
tests.update({
 # item 1: pin move (Q56i, Q46d)
 "Q56i hash wrong": T(('"lab/oracles/replay/RULES.md": "949ad8751e515bfb21a0bb811364146a21b330c7051f01ff1ff8dd801abbb67c"', '"lab/oracles/replay/RULES.md": "949ad875"')),
 "Q56i commit back": T(('"commit": "a9c1327d4e1d6756696db6844e17008671d4a193", "oracleVersion": "0.4.1"', '"commit": "8cc2c26f6f17ed627a3ed608f1252fe0e240bb5b", "oracleVersion": "0.4.1"')),
 "Q56i unregistered receipt": T(('"verifierEntry": "V-O04c", "excludes": []', '"verifierEntry": "V-O05", "excludes": []')),
 "Q56i excludes kept": T(('"verifierEntry": "V-O04c", "excludes": [], "excludesWhy": {}', '"verifierEntry": "V-O04c", "excludes": ["G1.decimal.channel-routing"], "excludesWhy": {}')),
 "Q56i blanket refusal back": T(('    "q52-shapes": {"sets": [],', '    "erasure": {"sets": ["CS-ERASURE"], "cases": [], "until": "x"},\n    "q52-shapes": {"sets": [],')),
 "Q56i residual refusal emptied": T(('    "q52-shapes": {"sets": [], "cases": [["CS-ERASURE", c] for c in ERASURE_RESIDUAL_CASES] + [["CS-DECIMAL-ROUTING", "DR-JSON-CONVERT-ROUNDING"]],', '    "q52-shapes": {"sets": [], "cases": [],')),
 "Q56i tdk1 refusal dropped": T(('    "tdk1-keys": {"sets": [], "cases": [["CS-DECIMAL", "DEC-SMALL-PRECISION-TDK1"], ', '    "tdk1-keys": {"sets": [], "cases": [')),
 "Q56i scope diff unrecorded": T(('PIN_SCOPE_EXPECTED_DIFF = {"onlyGeneratorBlocked": ["G1.types.storage-widening-safe",', 'PIN_SCOPE_EXPECTED_DIFF = {"onlyGeneratorBlocked": ["X", "G1.types.storage-widening-safe",')),
 "Q56i old hash table": T(('    hv = json.loads((REPO / "lab/verify/O02/v-o04b/results/hashes.a9c1327.json").read_text())', '    hv = json.loads((REPO / "lab/verify/O02/v-o03/hashes.8cc2c26.json").read_text())')),
 # item 3: Q55a
 "Q55a brief hash wrong": T(('"briefSha256": "8fbdaaf67d2cbc1ae000d780ce7fcc45825ec6ba81edbbc9ed179ce517b5df88"', '"briefSha256": "8fbdaaf6"')),
 "Q55a verdict not accept": T(('"verdict": "ACCEPT for pinning O-REPLAY 0.4.1 unchanged"', '"verdict": "FIX-FIRST"')),
 "Q55a subject commit wrong": T(('"V-O04c": {"verifier": "V-O02 verifier, resumed for the V-O04b and V-O04c re-checks", "subject": {"kind": "oracle", "id": "O-REPLAY", "commit": "a9c1327d4e1d6756696db6844e17008671d4a193"', '"V-O04c": {"verifier": "V-O02 verifier, resumed for the V-O04b and V-O04c re-checks", "subject": {"kind": "oracle", "id": "O-REPLAY", "commit": "8cc2c26f6f17ed627a3ed608f1252fe0e240bb5b"')),
 "Q55a records qualify": T(('    if ev is None:\n        return "DIAGNOSTIC"', '    if ev is None:\n        return "QUALIFIED" if claim.get("receipts") else "DIAGNOSTIC"')),
 "Q55a manifest unchecked": T((' or hashlib.sha256(raw).hexdigest() != want:', ':')),
 "Q55a unpinned manifest used": T(('        raw = ev["manifest"](c["set"]) if want else None\n        if not want or not isinstance(raw, bytes) or hashlib.sha256(raw).hexdigest() != want:', '        raw = ev["manifest"](c["set"])\n        if not isinstance(raw, bytes) or (want and hashlib.sha256(raw).hexdigest() != want):')),
 "Q55a empty selection ok": T(('            if not hit:\n                return None', '            if not hit:\n                continue')),
 "Q55a one mode": T(('        for mode in o["closure"]["modes"]:\n            for _ in range(reps):', '        for mode in o["closure"]["modes"][:1]:\n            for _ in range(reps):')),
 "Q55a one repetition": T(('    reps = THRESHOLDS["T-FAULT-REPS"]["value"] if "CR-FAULT" in o["closure"]["rules"] else 1', '    reps = 1')),
 "Q55a refusal accepted": T(('        if not isinstance(expected, dict) or expected.get("exit") != 0 or expected.get("code") is not None:', '        if not isinstance(expected, dict):')),
 "Q55a comparator ignored": T(('                if not ev["compare"](x["comparator"], expected.get("output"), ev["sut"](binary, comp, x, mode)):', '                if ev["sut"](binary, comp, x, mode) is None:')),
 "Q55a A0 rebuild trusted": T((' or ev["build"](entry["sourceTreeSha256"], entry["commit"]) != entry.get("binarySha256"):', ':')),
 "Q55a slot unchecked": T((' or any(comp[k]["slot"] not in ev.get("slots", ()) for k in comp):', ':')),
 "Q55a measure unchecked": T((' or m_.get("workload") != wl or c_.get("workload") != wl:', ':')),
 "Q55a claim verification ignored": T(('        if not any(registered_acceptance(v, "obligation", o["id"], commit, verifiers) for v in verifiers):', '        if False:')),
 "Q55a pin verification ignored": T((' or not registered_acceptance(pins[x].get("verifierEntry"), "oracle", x, pins[x].get("commit"), verifiers):', ':')),
 "Q55a W0 verification ignored": T((' or not registered_acceptance(w0.get("verifierEntry"), "world", "W0", w0.get("commit"), verifiers) or w0.get("deltaCheck") is None', ' or w0.get("deltaCheck") is None')),
 "Q55a CX dropped": T(('    {"id": "CX-R7-RELABELLED-CONTROL",', '    {"id": "CX-R7-RELABELLED",')),
 "Q55a steps changed": T(('        ["control", "run one evaluator-chosen workload', '        ["compare-control", "run one evaluator-chosen workload')),
 # item 4: Q55b
 "Q55b QT4 merged": T(('{"id": "QT4s-SOURCE-PUBLISHED", "evidence"', '{"id": "QT4-PUBLISHED", "evidence"')),
 "Q55b success after replica": T(("valid only if its timestamp is after the group's QT4s-SOURCE-PUBLISHED evidence", "valid only if its timestamp is after the group's QT4r-REPLICA-APPLIED evidence")),
 "Q55b old table kept": T(('    "variantRule": "every composition declares', '    "qlever": {},\n    "variantRule": "every composition declares')),
 "Q55b variant optional": T(('            if a.get("variant") not in SOURCE_VARIANT_FIELDS:\n                return False\n            extra = ("variant",) + SOURCE_VARIANT_FIELDS[a["variant"]]', '            extra = tuple(x for x in ("variant",) if x in a) + SOURCE_VARIANT_FIELDS.get(a.get("variant"), ())')),
 "Q55b durability unchecked": T(('        if "log" in extra and not (isinstance(a["log"], dict) and set(a["log"]) == set(LOG_FIELDS) and all(_typed(a["log"][f], t) for f, t in LOG_FIELDS.items())):', '        if False:')),
 "Q55b fault case dropped": T(('FAULT_Q55_CASES = ["C2-SOURCE-PUBLISHED-REPLICA-BEHIND", ', 'FAULT_Q55_CASES = [')),
 "Q55b receipt binding": T(("and, for log-source, log {implementationSha256, fsyncMode, fullFsync, device} (RULINGS Q55b)", "(RULINGS Q55b)")),
 "Q55b statement": T(("match the transition table of the composition's declared protocol variant", "match COMMIT_OUTCOMES")),
 # item 5: Q55c, Q55d, Q55e
 "Q55c not provisional": T(('        "status": "PROVISIONAL, flagged for Sam (RULINGS Q55c, superseding Q50b)",', '        "status": "accepted (RULINGS Q55c, superseding Q50b)",')),
 "Q55c no typed wait": T(("then fails with the typed E-BASIS-NOT-AVAILABLE", "then answers at the watermark")),
 "Q55c cases dropped": T(('CO-CROSS-LANGUAGE-RECIPE-IDENTITY," + ",".join(READ_GUARANTEE_CASES)], oracle=["O-REPLAY", "O-OBS", "O-ERR"],', 'CO-CROSS-LANGUAGE-RECIPE-IDENTITY"], oracle=["O-REPLAY", "O-OBS", "O-ERR"],')),
 "Q55c NS.P2 stand-in": T(("repository read-your-own-write never stands in for a native-surface guarantee", "repository read-your-own-write covers every surface")),
 "Q55c error dropped": T(('    {"id": "E-REPLICA-UNAVAILABLE",', '    {"id": "E-REPLICA-DOWN",')),
 "Q55c replica-down fallback": T(("with the replica unreachable they fall back to the source (RULINGS Q50a)", "with the replica unreachable they wait (RULINGS Q50a)")),
 "Q55d ack clock": T(("stamped by the source on the host monotonic clock the driver also reads, recorded independently of ACK delivery (RULINGS Q55d)", "stamped at ACK delivery (RULINGS Q55d)")),
 "Q55d accounting": T(("a position with no consumer record is counted and fails the run (RULINGS Q55d)", "a position with no consumer record is skipped (RULINGS Q55d)")),
 "Q55d case dropped": T((', "NS-P3-DOMAIN-AFFECTED-SET", "NS-P3-EVERY-POSITION-ACCOUNTED"],', ', "NS-P3-DOMAIN-AFFECTED-SET"],')),
 "Q55e claim fingerprint honoured": T(('    w0 = W0_PIN if w0 is None else w0\n    a0 = A0_REGISTRY["entries"] if a0 is None else a0\n    verifiers', '    w0 = W0_PIN if w0 is None else w0\n    if claim.get("oDomainFingerprint"):\n        w0 = dict(w0, oDomainFingerprint=claim["oDomainFingerprint"])\n    a0 = A0_REGISTRY["entries"] if a0 is None else a0\n    verifiers')),
 "Q55e fingerprint pinned": T(('"oDomainFingerprint": None, "fingerprintCandidate"', '"oDomainFingerprint": "F", "fingerprintCandidate"')),
 "Q55e ownership text": T(("the evaluator owns the W0 pin it passes to admission and a claim can never supply it", "a claim may supply it")),
 # item 2: Q52, Q56
 "Q52e per value back": T(('    "inFlight": "an erasure commit is atomic for readers:', '    "inFlight": "each erased value may be the old value or the marker; formerly: an erasure commit is atomic for readers:')),
 "Q52 residual leaks into queries": T(('ERASURE_QUERY_CASES = ["ER-PREDICATE-NO-MATCH",', 'ERASURE_QUERY_CASES = ["ER-COUNT-DISTINCT-MARKER", "ER-PREDICATE-NO-MATCH",')),
 "Q52f routing reaches rounding": T(('  cases=["CS-DECIMAL-ROUTING:repository,native,raw,derived,aggregate,json", "CS-DECIMAL-ROUTING:"', '  cases=["CS-DECIMAL-ROUTING", "CS-DECIMAL-ROUTING:"')),
 "Q52 residual case dropped": T(('"ER-INFLIGHT-ALL-OR-NONE", "ER-ERASE-COMMAND-SHAPE"]\nORACLE_REFUSALS', '"ER-INFLIGHT-ALL-OR-NONE"]\nORACLE_REFUSALS')),
 "Q52c earliest": T(("a marker group reports the earliest erasedAt among its members (Q52c)", "a marker group reports any erasedAt (Q52c)")),
 "Q56a unknown target commits": T(("an erase naming an unknown assertion target or an unknown id is E-INVALID-VALUE, as for retract (Q56a)", "an erase naming an unknown assertion target or id commits (Q56a)")),
 "Q56b no conflict": T(("a card-one attribute holding a readable and an erased value conflicts with E-CONFLICTING-VALUES as two readable values would", "a card-one attribute holding a readable and an erased value reads the readable value")),
 "Q56 case dropped": T((', "ER-CARD-MANY-MARKERS-LAST", "ER-REQUIRED-SATISFIED"]  # RULINGS Q56b to Q56e', ', "ER-CARD-MANY-MARKERS-LAST"]  # RULINGS Q56b to Q56e')),
 "Q56h synthetic": T(("uses synthetic values only; no real personal data enters the lab", "may use any values")),
 # item 6: Q50, Q51, Q53, Q54
 "Q50d gate dropped": T(('GATES["GATE-BROKER-HARDENING"] = {', 'GATES["GATE-BROKER"] = {')),
 "Q50d case dropped": T(('BROKER_HARDENING_CASES = ["BR-OVERLAY-BOUND-OVERLOADED", ', 'BROKER_HARDENING_CASES = [')),
 "Q50a index note": T(("a broker-side current-entity index (the per-subject current document", "an index (the per-subject current document")),
 "Q50e run queue": T(('"qleverExclusiveFirst": "A0 and candidate at delta 0, 100k and 500k; persist-updates off;', '"qleverExclusiveFirst": "A0 and candidate at delta 0, 100k and 500k;')),
 "Q51a driver queue": T(("the queue is part of the candidate, never the driver (RULINGS Q51a)", "the queue may be in the driver (RULINGS Q51a)")),
 "Q51a case dropped": T((', "NS-P2-RYOW-PER-SURFACE", "NS-P2-HOT-SUBJECT-QUEUE"],', ', "NS-P2-RYOW-PER-SURFACE"],')),
 "Q51c in gate": T(('POSITION_REQUIRED_CASES = list(POSITION_DENSE_CASES) + list(POSITION["falsifiers"]) + ["PO-ABORTED-LISTED"]', 'POSITION_REQUIRED_CASES = list(POSITION_DENSE_CASES) + list(POSITION["falsifiers"]) + ["PO-ABORTED-LISTED", "PO-NO-PLACEHOLDER"]')),
 "Q51c binding text": T(("a position is an opaque, totally ordered value (bigint)", "a position is a packed value")),
 "Q51d storage bar": T(('"storagePerCommit": "reported, never a bar:', '"storagePerCommit": "a bar:')),
 "Q51e rung": T(('"xtdb100kRung": "deferred until EXP-J01 lands;', '"xtdb100kRung": "runs now;')),
 "Q51f error dropped": T(('    {"id": "E-DUAL-COMMIT-PATH",', '    {"id": "E-DUAL-PATH",')),
 "Q53 readings": T(("readings A01 to A10 in EXP-D01c's report", "readings in EXP-D01c's report")),
 "Q53b next edit": T(("which V-D01c checks (RULINGS Q53b)", "which V-D01c checks")),
 "Q54b reach added": T(('"reachedThrough": [["CS-DECIMAL", "scale-evolution"], ["CS-MIGRATION", "*"], ["CS-WIDEN", "*"]],', '"reachedThrough": [["CS-DECIMAL", "scale-evolution"], ["CS-MIGRATION", "*"], ["CS-WIDEN", "*"], ["CS-REQ", "no-silent-precision-loss"]],')),
})
run, caught, missed, retired = 0, 0, [], []
for name, pairs in tests.items():
    if any(src.count(a) < 1 for a, _ in pairs):
        retired.append(name)
        continue
    t = src
    for a, b in pairs:
        t = t.replace(a, b, 1)
    t = t.replace("        (HERE / name).write_text(text)", "        pass")
    mut.write_text(t)
    r = subprocess.run([sys.executable, "-I", str(mut)], capture_output=True, text=True, cwd=str(REPO))
    msg = (r.stdout + r.stderr).strip().splitlines()
    ok = r.returncode != 0 and bool(msg) and msg[0].startswith("CONTRACT INVALID")
    run += 1
    caught += ok
    print(("CAUGHT " if ok else "MISSED ") + name + ": " + (msg[1] if len(msg) > 1 else (msg[0] if msg else ""))[:140])
    if not ok:
        missed.append(name)
mut.unlink()
print(f"total {len(tests)} run {run} caught {caught} missed: {missed} retired (anchor gone): {len(retired)} {retired}")
sys.exit(1 if missed else 0)

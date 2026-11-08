import pathlib, subprocess, sys
src = pathlib.Path("/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py").read_text()
mut = pathlib.Path("/Users/sam/projects/triplex-db-2/lab/acceptance/_negtest_tmp.py")
ns = {}
exec(pathlib.Path("negtest034.tests.py").read_text(), ns)
tests = dict(ns["tests"])
tests.update({
 "Q38a A0 exempt": ('    return list(POSITION_REQUIRED_CASES)\n', '    return list(POSITION_DENSE_CASES) if composition.get("source") in ("xtdb", "qlever") and "why" in composition else list(POSITION_REQUIRED_CASES)\n'),
 "Q38a declared density": ('    return list(POSITION_REQUIRED_CASES)\n', '    return list(POSITION_DENSE_CASES) if composition.get("positionsDense") else list(POSITION_REQUIRED_CASES)\n'),
 "Q38a static dense": ('cases=["CS-POSITION:" + ",".join(POSITION_REQUIRED_CASES)]', 'cases=["CS-POSITION:" + ",".join(POSITION_DENSE_CASES)]'),
 "Q38a mutant dropped": ('  mutants=["M-WITHTRANSACTION-REBIND"], closure=("CR-PASS-ALL", "CR-FAULT", "CR-MUTANT-KILL"),', '  closure=("CR-PASS-ALL", "CR-FAULT"),'),
 "Q38a allowlist back": ('POSITION_REQUIRED_CASES = list(POSITION_DENSE_CASES)', 'A0_ALLOCATOR_ALLOWLIST = {}\nPOSITION_REQUIRED_CASES = list(POSITION_DENSE_CASES)'),
 "Q38b pins ignored": ('    for x in oracles:\n        if x in pins:', '    for x in []:\n        if x in pins:'),
 "Q38b booleans": ('    pins = ORACLE_PINS if pins is None else pins\n', '    pins = ORACLE_PINS if pins is None else pins\n    if claim.get("compositionBound"):\n        return "QUALIFIED"\n'),
 "Q38b other tree": ('    if r.get("sourceTreeSha256") != claim.get("sourceTreeSha256") or r.get("composition") != claim.get("composition"):', '    if r.get("composition") != claim.get("composition"):'),
 "Q38b W0 skipped": ('    if domain and (any(v is None for v in w0["files"].values()) or w0.get("reviewReceipt") is None):', '    if False:'),
 "Q38c ruling uncompiled": ('    {"id": "Q39", "topic": "EXP-X02 (Q39a, Q39b)",', '    {"id": "Q39x", "topic": "EXP-X02 (Q39a, Q39b)",'),
 "Q38d mutant dropped": ('  mutants=["M-DECIMAL-LEXICAL-ORDER"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["RULINGS Q38d"', '  sources=["RULINGS Q38d"'),
 "Q38d SUM encode": ('"rule": "SUM over decimals decodes the keys or canonical text, computes exactly, and encodes any decimal result used for ordering;', '"rule": "SUM over decimals sums the keys;'),
 "Q38d JSON convert": ('validates it (E-DECIMAL-FRACTION, E-DECIMAL-OVERFLOW or E-INVALID-VALUE) and encodes the TDK1 key', 'passes it through'),
 "Q38e status": ('"O-TDK1": {"status": "BUILT",', '"O-TDK1": {"status": "TO-BUILD",'),
 "Q38e reference hash": ('"lab/oracles/decimal/tdk1_reference.py": "73467589480deb93fb700cdaf856cccb8f67b9a24d1963e26744a0ac4754bf33"', '"lab/oracles/decimal/tdk1_reference.py": "923f7577"'),
 "Q38e vector pinned unreviewed": ('TDK1_VECTOR_PIN = {"file": "lab/oracles/decimal/tdk1-vectors.json", "sha256": None,', 'TDK1_VECTOR_PIN = {"file": "lab/oracles/decimal/tdk1-vectors.json", "sha256": "0a699f59e16821ddf00c82319569a7e727fa1042e6d36a95fc577a6a4213d2a5",'),
 "Q38e candidate wrong": ('"candidateSha256": "0a699f59e16821ddf00c82319569a7e727fa1042e6d36a95fc577a6a4213d2a5"', '"candidateSha256": "29a4fc95"'),
 "Q38f version key": ('    "deliveryKey": "(id, publication sequence)",', '    "deliveryKey": "(id, version)",'),
 "Q38f GS19b": ("the receiver deduplicates by the delivery key (id, publication sequence) of OUTBOX", "the receiver deduplicates by the delivery key (id, version) of OUTBOX"),
 "Q38f GS10": ("work items publish under the delivery key (id, publication sequence) with early cutoff (OUTBOX, RULINGS Q38f).", "work items publish with early cutoff."),
 "Q38f mutant dropped": ('  mutants=["M-OUTBOX-VERSION-DEDUP"], closure=("CR-PASS-ALL", "CR-FAULT", "CR-MUTANT-KILL"),', '  closure=("CR-PASS-ALL", "CR-FAULT"),'),
 "Q39a hazard": ('    "KL-X9": ("XTDB 2.2.0",', '    "KL-X9X": ("XTDB 2.2.0",'),
 "Q39a cast": ("read as text and never cast back to BIGINT or any numeric client type", "cast to BIGINT"),
 "C1 gate dropped v2": ('    if set(o["oracles"]) & set(ORACLE_PINS):\n        g.append("GATE-ORACLE-PIN")', '    if False:\n        g.append("GATE-ORACLE-PIN")'),
 "Q38e O-TDK1 unpinned": ('ORACLE_PINS = {"O-TDK1": {', 'ORACLE_PINS = {"O-TDK1-X": {'),
 "Q45a status": ('"O-REPLAY": {"status": "BUILT-ACCEPTED",', '"O-REPLAY": {"status": "BUILT-PENDING-PIN",'),
 "Q45a hash wrong": ('"lab/oracles/replay/RULES.md": "60e745ee8733271cede926a6f55e1f473d2b3c7a9a721500f9d277438971d54c"', '"lab/oracles/replay/RULES.md": "60e745ee"'),
 "Q45a exclusion dropped": ('"excludes": ["G1.decimal.channel-routing"],', '"excludes": [],'),
 "Q45a refusal dropped": ('    "erasure": {"sets": ["CS-ERASURE"],', '    "erasure-x": {"sets": [],'),
 "Q45a scope diff unrecorded": ('PIN_SCOPE_EXPECTED_DIFF = {"onlyGeneratorBlocked": [],', 'PIN_SCOPE_EXPECTED_DIFF = {"onlyGeneratorBlocked": ["X"],'),
 "Q45b rule": ("never treated as a case-authoring error and never skipped", "may be skipped as a case-authoring error"),
 "Q45c key bytes back": ('DECIMAL_CASES = ["DEC-CROSS-SCALE-COMPARE",', 'DECIMAL_CASES = ["DEC-SMALL-PRECISION-TDK1", "DEC-CROSS-SCALE-COMPARE",'),
 "Q45d round": ("p + (s - s_x), capped at 38, when s > s_x", "p when s > s_x"),
 "Q43 avg id": ('"rule": "AVG over decimals is E-DECIMAL-AVG, not E-DECIMAL-BARE-DIVIDE", "error": "E-DECIMAL-AVG",', '"rule": "AVG over decimals is E-DECIMAL-AVG, not E-DECIMAL-BARE-DIVIDE", "error": "E-DECIMAL-BARE-DIVIDE",'),
 "Q43 round refused": ("x at scale s by appending zeros, never refused;", "refused;"),
 "Q43 toInteger": ('"rule": "toInteger of a whole decimal outside the integer range", "error": "E-INTEGER-OVERFLOW"', '"rule": "toInteger of a whole decimal outside the integer range", "error": "E-DECIMAL-OVERFLOW"'),
 "Q43 negzero basis": ('"rule": "a read basis given as -0", "error": "E-NEGATIVE-ZERO-INSTANT"', '"rule": "a read basis given as -0", "error": "E-INVALID-VALUE"'),
 "Q40 retirement": ("a later reappearance publishes a new sequence even if the payload equals the last published one", "a later reappearance publishes nothing if the payload is unchanged"),
 "Q40 basis order": ("an older-basis evaluation publishes nothing (RULINGS Q40d)", "evaluations publish in arrival order"),
 "Q40 two hop": ("S.location -> L.jurisdiction -> J.stateMinWageCents", "S.location -> L.minWageCents"),
 "Q44 live only": ("previews (GS.11) and past-valid-time audit evaluations never are", "previews may be"),
 "Q44 fingerprint gate": ('    if domain and (any(v is None for v in w0["files"].values()) or w0.get("reviewReceipt") is None or w0.get("deltaCheck") is None or w0.get("oDomainFingerprint") is None):', '    if domain and (any(v is None for v in w0["files"].values()) or w0.get("reviewReceipt") is None):'),
 "Q42a hashes not opened": ('    return isinstance(h, str) and h in store and hashlib.sha256(store[h]).hexdigest() == h', '    return isinstance(h, str) and len(h) == 64'),
 "Q42a manifest ignored": ('    if man.get("sourceTreeSha256") != tree or man.get("binarySha256") != r.get("executedBinarySha256"):', '    if False:'),
 "Q42a freshness ignored": ('    if r.get("commit") != commit or not isinstance(r.get("producedAt"), int) or r["producedAt"] <= env.get("dependencyClosureChangedAt", 10 ** 18):', '    if False:'),
 "Q42a no control needed": ('        if not matched:\n            return "DIAGNOSTIC"', '        if False:\n            return "DIAGNOSTIC"'),
 "Q42a unknown dropped": ('    if not ids or any(i not in obl for i in ids):', '    ids = [i for i in ids if i in obl]\n    if not ids:'),
 "Q42a fault reps ignored": ('    if "CR-FAULT" in obligation["closure"]["rules"] and r.get("faultReps", 0) < THRESHOLDS["T-FAULT-REPS"]["value"]:', '    if False:'),
 "Q42b regress mutant": ('  mutants=["M-RECEIVER-REGRESS"], closure=("CR-PASS-ALL", "CR-FAULT", "CR-MUTANT-KILL"),', '  closure=("CR-PASS-ALL", "CR-FAULT"),'),
 "Q42b receivers rule": ("records the highest sequence applied and ignores any lower one (never regresses)", "applies deliveries in arrival order"),
 "Q42c pair dropped": ('ATOMIC_UNIT_PARTS = ["basis-guard", "retirement-state", "publication-sequence", "latest-published-payload", "outbox-records"]', 'ATOMIC_UNIT_PARTS = ["basis-guard", "publication-sequence", "latest-published-payload", "outbox-records"]'),
 "Q42c receiver uses replay": ('  scope="engine", cases=["CS-RECEIVER", "CS-RECEIVER:" + ",".join(RECEIVER_CASES)], oracle=["O-DOMAIN"],', '  scope="engine", cases=["CS-RECEIVER", "CS-RECEIVER:" + ",".join(RECEIVER_CASES)], oracle=["O-DOMAIN", "O-REPLAY"],'),
 "Pending reads rows": ('    pend = (REPO / "lab/acceptance/RULINGS-PENDING.md").read_text()', '    pend = (REPO / "lab/acceptance/RULINGS.md").read_text()'),
 "Q38b other tree v2": ('    if r.get("sourceTreeSha256") != tree or r.get("composition") != comp:', '    if r.get("composition") != comp:'),
 "Q38b pins ignored v2": ('    for x in {x for o in claimed + [obl[i] for i in prereq] for x in o["oracles"]}:', '    for x in []:'),
 "Q38f GS10 v2": ("work items publish under the delivery key (id, publication sequence) with early cutoff (OUTBOX, RULINGS Q38f); only live", "work items publish with early cutoff (OUTBOX, RULINGS Q38f); only live"),
 "Q38f mutant dropped v2": ('mutants=["M-OUTBOX-VERSION-DEDUP", "M-OUTBOX-RETIREMENT-IGNORED"]', 'mutants=["M-OUTBOX-RETIREMENT-IGNORED"]'),
 "Q38c uncompiled Q45": ('    {"id": "Q45", "topic": "O-REPLAY pin and V-O03 findings (Q45a to Q45e)",', '    {"id": "Q45x", "topic": "O-REPLAY pin and V-O03 findings (Q45a to Q45e)",'),
 "Q39b language key": ('        o["closure"]["params"]["keyByNativeLanguage"] = True', '        pass'),
})

tests.update({
 "Q31f journal modulo v2": ('C6-SLIM-BYTE-IDENTICAL), modulo erasure: an erasure commit', 'C6-SLIM-BYTE-IDENTICAL), and: an erasure commit'),
 "Q31i pin bogus v2": ('"lab/world/W0/SPEC.md": "c93fcbd1f5ef145a0b1ab468482fb74ac6357bc318bc00ce948cd9bfac5d00a0"', '"lab/world/W0/SPEC.md": "00"'),
 "Q32f no bump v2": ('"rule": "pinned at a contract version bump only', '"rule": "pinned'),
 "Q38d JSON convert v2": ('validates the result (E-DECIMAL-FRACTION, E-DECIMAL-OVERFLOW or E-INVALID-VALUE) and encodes the TDK1 key', 'passes it through'),
 "Q45a scope diff unrecorded v2": ('PIN_SCOPE_EXPECTED_DIFF = {"onlyGeneratorBlocked": ["G1.types.storage-widening-safe",', 'PIN_SCOPE_EXPECTED_DIFF = {"onlyGeneratorBlocked": ["X", "G1.types.storage-widening-safe",'),
 "Q42a manifest ignored v2": ('    if man is None or man["sourceTreeSha256"] != tree or man["binarySha256"] != r.get("executedBinarySha256") or not _obj_ok(man["binarySha256"], store):\n        return False', '    if man is None:\n        return False'),
 "Q47d pending ids ignored": ('    return ruling_row_ids((REPO / PENDING_RULINGS_FILE).read_text() if text is None else text)', '    return []'),
 "Q47d pending gains authority": ('    _compiled_ids = {r["id"] for r in RULINGS}', '    _compiled_ids = {r["id"] for r in RULINGS} | {"Q99z"}'),
 "Q47d pending not hashed": ('"lab/acceptance/RULINGS.md", "lab/acceptance/RULINGS-PENDING.md",', '"lab/acceptance/RULINGS.md",'),
 "Q47a binary not retained": (' or man["binarySha256"] != r.get("executedBinarySha256") or not _obj_ok(man["binarySha256"], store):', ' or man["binarySha256"] != r.get("executedBinarySha256"):'),
 "Q47a modules ignored": ('    if not all(isinstance(x, dict) and set(x) == {"path", "sha256"} and _typed(x["path"], "str") and _obj_ok(x["sha256"], store) for x in man["modules"]):', '    if False:'),
 "Q47a verifier unchecked": ('    if vr is None or vr["obligation"] != obligation["id"] or vr["definitionSha256"] != obligation_hash(obligation) or vr["verdict"] != "ACCEPT":', '    if not _obj_ok(r.get("verifierObjectSha256"), store):'),
 "Q47a schema ignored": ('    if not isinstance(rec, dict) or set(rec) != set(spec) or rec.get("schema") != schema or not all(_typed(rec[k], t) for k, t in spec.items()):', '    if not isinstance(rec, dict) or rec.get("schema") != schema:'),
 "Q47a verdict trusted": ('        if case_verdict(rec, store) != "PASS" or x.get("verdict") != "PASS":', '        if x.get("verdict") != "PASS":'),
 "Q47a refusal counts": ('        return "REFUSED"', '        return "PASS"'),
 "Q47a observation unchecked": ('    return "PASS" if rec["expectedSha256"] == rec["observedSha256"] else "FAIL"', '    return "PASS"'),
 "Q47c extra cases skipped": ('        if case_verdict(rec, store) != "PASS" or x.get("verdict") != "PASS":\n            return False', '        if case_verdict(rec, store) != "PASS" or x.get("verdict") != "PASS":\n            continue'),
 "Q47c reach dropped": ('                        "reachedThrough": [["CS-DECIMAL", "scale-evolution"], ["CS-MIGRATION", "*"], ["CS-WIDEN", "*"]],\n', ''),
 "Q47c reach ignored": ('            or any((s in sets) if t == "*" else ((s, t) in pairs) for s, t in ref.get("reachedThrough", [])))', '            or False)'),
 "Q47b none matches none": [('evidence_ok(r, o, tree, comp, commit, env) and workload_ok(r.get("workload"), comp)]', 'evidence_ok(r, o, tree, comp, commit, env)]'), ('                   and workload_ok(c.get("workload"), entry["composition"]) and any(c["workload"] == m["workload"] for m in own)]', '                   and any(c.get("workload") == m.get("workload") for m in own)]')],
 "Q47b claimant control": ('    entry = a0.get(A0_REGISTRY["byEngine"].get((comp.get("source") or {}).get("engine")))', '    entry = claim.get("control") or a0.get(A0_REGISTRY["byEngine"].get((comp.get("source") or {}).get("engine")))'),
 "Q47b registry filled": ('    "entries": {"A0-XTDB": None, "A0-QLEVER": None},', '    "entries": {"A0-XTDB": {"commit": "x", "sourceTreeSha256": "t0", "composition": {}, "measuredBy": "x"}, "A0-QLEVER": None},'),
 "Q47b slot unchecked": (' and all(_typed(w[k], t) for k, t in f.items()) and w["slot"] == ((comp or {}).get("source") or {}).get("slot")', ' and all(_typed(w[k], t) for k, t in f.items())'),
 "Q47b types unchecked": ('    return isinstance(w, dict) and set(w) == set(f) and all(_typed(w[k], t) for k, t in f.items()) and', '    return isinstance(w, dict) and set(w) == set(f) and'),
 "Q47 CX dropped": ('    {"id": "CX-R6-UNOPENED-MEANING",', '    {"id": "CX-R6-UNOPENED",'),
 "Q46d pin note": ('with PIN_SCOPE_EXPECTED_DIFF updated (RULINGS Q45e, Q46d)', 'with PIN_SCOPE_EXPECTED_DIFF updated (RULINGS Q45e)'),
 "Q48a fingerprint pinned": ('"oDomainFingerprint": None, "fingerprintCandidate"', '"oDomainFingerprint": "F", "fingerprintCandidate"'),
 "Q48a hash dropped": ('    "lab/world/W0/README.md": "891af156079bac5fc3dab7614a6070f76580f0d97d9f8e400d41417c81b93052",\n', ''),
 "Q48a fingerprint wrong": ('"worldsSha256": "fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760"', '"worldsSha256": "948ba617"'),
 "Q48a W0 gate dropped": ('    if domain and (any(v is None for v in w0["files"].values()) or w0.get("reviewReceipt") is None or w0.get("deltaCheck") is None or w0.get("oDomainFingerprint") is None):', '    if domain and w0.get("reviewReceipt") is None:'),
 "Q48b rung": ('"scopedRelease": {"rung": "100k",', '"scopedRelease": {"rung": "1M",'),
 "Q48b statement": ('and its receipt binds the reached-subject list and that list\'s hash instead of every placement', 'and its receipt binds every placement'),
 "Q48c next edit": ('records measured R3 counts (9,497 reached, 418 changed) beside the expected ones; it changes', 'records measured R3 counts beside the expected ones; it changes'),
 "Q49a identities": ('and its changes list only identities (entity, attribute, assertion ids), never values; it is also written to the erasure ledger kept apart from the data, which restore and rebuild replay; earlier', 'and its changes list the values; it is also written to the erasure ledger kept apart from the data, which restore and rebuild replay; earlier'),
 "Q49a journal case dropped": ('"CS-ERASURE:ER-JOURNAL-MODULO,ER-COMMIT-JOURNAL-IDENTITY-ONLY,ER-EARLIER-CHANGE-MARKER"', '"CS-ERASURE:ER-JOURNAL-MODULO"'),
 "Q49b empty commit": ('an erase that matches nothing still commits, as a journal record with an empty change list (RULINGS Q49b)', 'an erase that matches nothing commits nothing (RULINGS Q49b)'),
 "Q49c count": ('SUM, AVG, MIN and MAX skip it while COUNT of assertions counts it; ORDER BY places erased markers last in a deterministic order by assertion id;', 'SUM, AVG, MIN, MAX and COUNT skip it; ORDER BY places erased markers last in a deterministic order by assertion id;'),
 "Q49c case dropped": ('"ER-GROUP-ONE-MARKER", "ER-UNIQUE-IGNORES", "ER-REFERENCE-MARKER"]  # RULINGS Q49c', '"ER-GROUP-ONE-MARKER", "ER-REFERENCE-MARKER"]  # RULINGS Q49c'),
 "Q49c obligation off replay": ('  cases=["CS-ERASURE:queries", "CS-ERASURE:" + ",".join(ERASURE_QUERY_CASES)], oracle=["O-REPLAY"],', '  cases=["CS-ERASURE:queries", "CS-ERASURE:" + ",".join(ERASURE_QUERY_CASES)], oracle=["O-HAND"],'),
 "Q49d in-flight": ('    "inFlight": "for a read that started before the erasure published, each erased value may be the old value or the marker (RULINGS Q49d)",', '    "inFlight": "for a read that started before the erasure published, each erased value is the old value (RULINGS Q49d)",'),
 "Q49e as written": ('never its exact binary64 expansion, so toDecimal(json 0.1, 2, 1) = 0.1;', 'from its exact binary64 expansion;'),
 "Q49e string row": ('    {"id": "DR-JSON-STRING-TEXT",', '    {"id": "DR-JSON-STRING-TEXT-X",'),
})
missed, anchors = [], []
for name, spec in tests.items():
    pairs = spec if isinstance(spec, list) else [spec]
    if any(src.count(a) < 1 for a, _ in pairs):
        anchors.append(name); continue
    t = src
    for a, b in pairs:
        t = t.replace(a, b, 1)
    t = t.replace("        (HERE / name).write_text(text)", "        pass")
    mut.write_text(t)
    r = subprocess.run([sys.executable, "-I", str(mut)], capture_output=True, text=True, cwd="/Users/sam/projects/triplex-db-2")
    msg = (r.stdout + r.stderr).strip().splitlines()
    ok = r.returncode != 0 and msg and msg[0].startswith("CONTRACT INVALID")
    print(("CAUGHT " if ok else "MISSED ") + name + ": " + (msg[1] if len(msg) > 1 else (msg[0] if msg else ""))[:140])
    if not ok:
        missed.append(name)
mut.unlink()
print("total", len(tests), "run", len(tests) - len(anchors), "missed:", missed, "anchor missing:", anchors)

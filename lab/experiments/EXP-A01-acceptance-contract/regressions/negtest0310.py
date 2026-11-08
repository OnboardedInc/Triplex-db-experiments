"""EXP-A01 regression harness for contract 0.3.10: every deliberate regression must make the generator report CONTRACT INVALID.
Runs from any directory; operates on the worktree that contains this file. tests-through-039.json holds the earlier mutations
(entries whose anchors no longer exist are reported as retired, not run)."""
import json, pathlib, subprocess, sys
HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[3]
GEN = REPO / "lab/acceptance/build_contract.py"
src = GEN.read_text()
mut = REPO / "lab/acceptance/_negtest_tmp.py"
tests = json.loads((HERE / "tests-through-039.json").read_text())
T = lambda *pairs: [list(p) for p in pairs]
tests.update({
 # W0-1.1.2 pin
 "W0 hash wrong": T(('"lab/world/W0/SPEC.md": "23ca6eb157e07f352495bdfd9d86ce4dedc490d5795264c8662681722c352807"', '"lab/world/W0/SPEC.md": "23ca6eb1"')),
 "W0 table digest wrong": T(('"hashTableSha256": "b5941569402865a52149ed0116efa60eb5b489dc9a27d15f8591e2daa51b051c"', '"hashTableSha256": "b5941569"')),
 "W0 commit back": T(('"version": "W0-1.1.2", "commit": "fedfcdaee6f3ea188e96d9eec9671cbb0c623f5c"', '"version": "W0-1.1.2", "commit": "ada2e90337b7ab210dc302df01c81896fe546bcf"')),
 "W0 verifier old": T(('"verifierEntry": "V-D01e-W0-1.1.2",', '"verifierEntry": "V-D01-W0-1.1.1",')),
 "W0 frozen dropped": T(('"frozenHashes": ["lab/world/W0/expected-sha256.json", "lab/world/W0/input-sha256.json"]', '"frozenHashes": ["lab/world/W0/expected-sha256.jsonx"]')),
 "W0 registry brief": T(('"briefSha256": "6df85539b0dd6c5a66b524c3c106fff3b8866f6afb3f581737e3a13ddd263dca"', '"briefSha256": "6df85539"')),
 "W0 fingerprint dropped": T(('    "oDomainFingerprint": dict(W0_FINGERPRINT_CANDIDATE,', '    "oDomainFingerprint": None and dict(W0_FINGERPRINT_CANDIDATE,')),
 "W0 fingerprint wrong": T(('"worldsSha256": "fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760"', '"worldsSha256": "fec1d7ce00000000000000000000000000000000000000000000000000000000"')),
 # O-DOMAIN
 "OD hash wrong": T(('"lab/oracles/domain/w0.py": "841f7d9d2e175e09474fdf23969bfddda77851995335828ed1c97b34d9167f00"', '"lab/oracles/domain/w0.py": "841f7d9d"')),
 "OD file dropped": T(('    "lab/oracles/domain/test_domain.py": "9103d227207999538ddba6e19bb8c6e64397ddfcf6a585bf42890538416b5f08",\n', '')),
 "OD commit wrong": T(('"O-DOMAIN": {"files": "lab/oracles/domain/**", "commit": "5d1fd1a3a60c01e5b5fc5d210ea0b3098074e3b9"', '"O-DOMAIN": {"files": "lab/oracles/domain/**", "commit": "276a280000000000000000000000000000000000"')),
 "OD unregistered": T(('"verifierEntry": "V-D01c-O-DOMAIN", "excludes": []', '"verifierEntry": "V-D01d", "excludes": []')),
 "OD status": T(('"O-DOMAIN": {"status": "BUILT-ACCEPTED",', '"O-DOMAIN": {"status": "TO-BUILD",')),
 "OD runner note": T(('"decodedInputRule": "O-DOMAIN 5d1fd1a\'s case loader does not read the inputBase64 form', '"decodedInputRule": "O-DOMAIN 5d1fd1a\'s case loader reads every form')),
 # Q65a O-CONTRACT runner
 "Q65a runner disagrees": T(('    pinned = isinstance(comp, dict) and not unbound and all(', '    pinned = isinstance(comp, dict) and all(')),
 "Q65a log unchecked": T(('            if ok and "log" in extra:', '            if False:')),
 "Q65a runner dropped": T(('    "O-CONTRACT": {"argv": ["python3", "-I", "-B", "lab/acceptance/build_contract.py", "--oracle", "O-CONTRACT", "{case}"],', '    "O-CONTRACTX": {"argv": ["python3", "-I", "-B", "lab/acceptance/build_contract.py", "--oracle", "O-CONTRACT", "{case}"],')),
 # Q57
 "Q57 reading dropped": T(("A13 any nesting depth is a valid JSON value, then E_VALUE, and implementations must not fail on recursion limits; ", "")),
 "Q57 N1 dropped": T(("Beside A12 (V-D01e N1): publish and receive integers have no upper bound; ", "")),
 # Q63
 "Q63d sql": T(("seeders and appliers on XTDB use parameterised statements only;", "seeders and appliers on XTDB may use literal statements;")),
 "Q63a follower": T(('"sharedVolumeFollower": "rejected for promotion:', '"sharedVolumeFollower": "accepted:')),
 "Q63b direction": T(("read scaling on both lanes comes from replicas fed by the broker (Q58b)", "read scaling comes from shared-log followers")),
 # Q64
 "Q64f clash unchecked": T(('    return sorted(set(pending_ids) & set(md_ids))', '    return []')),
 "Q64b series dropped": T(('"screening-r4": {"sha256": None, "seed": None, "offerScheduleSha256": None}, "rule": "each screening series', '"rule": "each screening series')),
 # Q65
 "Q65b spec hash": T(('    return hashlib.sha256(json.dumps({k: spec.get(k) for k in ("format", "argv", "outputs", "run")}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()', '    return hashlib.sha256(json.dumps({k: spec.get(k) for k in ("argv", "outputs", "run")}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()')),
 "Q65c selection": T(("a case reached by several select entries records the first select entry in contract order", "a case reached by several select entries records any of them")),
 "Q65e pinned early": T(('    "format": "triplex-db-2/build-spec/1", "argv": None,', '    "format": "triplex-db-2/build-spec/1", "argv": ["pnpm"],')),
 "Q65f blockers": T(('"rule": "every blocker stays until EXP-G03\'s executing gate exists;', '"rule": "blockers may be waived;')),
 # Q66
 "Q66a prefixes": T(("the acceptable answers are the n + 1 prefixes, never all 2^n subsets (RULINGS Q66a)", "any subset is acceptable (RULINGS Q66a)")),
 "Q66 case dropped": T(('ERASURE_Q66_CASES = ["ER-INFLIGHT-PREFIXES", "ER-CURSOR-ERASURE-PREFIX"]', 'ERASURE_Q66_CASES = ["ER-INFLIGHT-PREFIXES"]')),
 "Q66 not refused": T(('"cases": [["CS-ERASURE", c] for c in ERASURE_RESIDUAL_CASES + ERASURE_Q66_CASES]', '"cases": [["CS-ERASURE", c] for c in ERASURE_RESIDUAL_CASES]')),
 "Q66d lane": T(("the explicitly converted half is a lane obligation, because O-REPLAY does not model text-to-decimal conversion (RULINGS Q66d)", "O-REPLAY models it")),
 # Q67
 "Q67b identity": T(("executions are keyed by instance, never by output hash (RULINGS Q67b)", "executions are keyed by output hash (RULINGS Q67b)")),
 "Q67c fencing": T(("an answer is accepted only if (incarnation, marker) is equal before and after (RULINGS Q67c)", "an answer is accepted (RULINGS Q67c)")),
 "Q67c case dropped": T(('Q67_CASES = ["CO-RESET-DURING-QUERY", "CO-TYPED-ERROR-SHAPE"]', 'Q67_CASES = ["CO-TYPED-ERROR-SHAPE"]')),
 "Q67d enumeration": T(("ACK records are reconciled afterwards; a late or lost ACK is never a feed defect (RULINGS Q67d)", "a lost ACK is a feed defect (RULINGS Q67d)")),
 "Q67e isolation": T(("oracle bytes run from an evaluator-owned read-only copy re-hashed before every invocation", "oracle bytes run from the claimed commit")),
 "Q67f any rounds": T(('    if not (_typed(m.get("rounds"), "int") and m["rounds"] in d["looks"]):', '    if not (_typed(m.get("rounds"), "int") and d["rounds"]["min"] <= m["rounds"] <= d["rounds"]["max"]):')),
 "Q67f per-round unchecked": T(('    if not isinstance(per, list) or len(per) != m["rounds"] or not all(', '    if not isinstance(per, list) or not all(')),
 "Q67f RED admitted": T(('    if m.get("window") != "GREEN" or m.get("accounting") != "all-offered":', '    if m.get("accounting") != "all-offered":')),
 "Q67f committed-only admitted": T(('    if m.get("window") != "GREEN" or m.get("accounting") != "all-offered":', '    if m.get("window") != "GREEN":')),
 "Q67g overlap allowed": T((' or _cpuset(pl["candidate"]["cpuset"]) & _cpuset(pl["A0"]["cpuset"]) or pl["candidate"]["slot"] == pl["A0"]["slot"]):', ' or pl["candidate"]["slot"] == pl["A0"]["slot"]):')),
 "Q67g capacity unchecked": T(('    if m["design"] == "duet" and (pl["candidate"]["cpus"] != pl["A0"]["cpus"] or ', '    if m["design"] == "duet" and (')),
 "Q67g denominator unchecked": T(('    if any(len(_cpuset(pl[k]["cpuset"])) != pl[k]["cpus"] for k in pl):', '    if False:')),
 "Q67g arm slot unchecked": T((' or mp["placement"]["candidate"]["slot"] != comp["source"]["slot"] or mp["placement"]["A0"]["slot"] != entry["composition"]["source"]["slot"]:', ':')),
 "Q67g slot back": T(('"window": "window"},\n    "placement":', '"window": "window", "slot": "str"},\n    "placement":')),
 "Q67h shape dropped": T(('"shape": "{_tag: ReplicaUnavailable, required, observed, replica, cause?} (RULINGS Q67h)",', '')),
 "Q67i hash equality": T(('    if rec.get("schema") == "case-result/2":\n        return "PASS" if reference_compare(', '    if False:\n        return "PASS" if reference_compare(')),
 "Q67i bag as ordered": T(('    if comparator == "CMP-BAG-ROWS":\n        return isinstance(e_, list) and isinstance(o_, list) and sorted(key(x) for x in e_) == sorted(key(x) for x in o_)', '    if comparator == "CMP-BAG-ROWS":\n        return isinstance(e_, list) and isinstance(o_, list) and [key(x) for x in e_] == [key(x) for x in o_]')),
 "Q67i unknown passes": T(('        return isinstance(e_, dict) and isinstance(o_, dict) and e_.get("_tag") is not None and e_.get("_tag") == o_.get("_tag") and e_.get("reason") == o_.get("reason") and not o_.get("rows")\n    return False', '        return isinstance(e_, dict) and isinstance(o_, dict) and e_.get("_tag") is not None and e_.get("_tag") == o_.get("_tag") and e_.get("reason") == o_.get("reason") and not o_.get("rows")\n    return key(e_) == key(o_)')),
 "Q67j promotion admitted": T(('    if claim.get("kind", "comparison") not in ("comparison", "screening"):', '    if claim.get("kind", "comparison") not in ("comparison", "screening", "promotion"):')),
 # Q68
 "Q68b horizon": T(("the broker refuses a new pin that would make H trail head by more than 24 hours", "the broker accepts any pin")),
 "Q68c frame size": T(('"sweepFrameMaxResults": 64,', '"sweepFrameMaxResults": 640,')),
 "Q68d host reads": T(('"hostServedReads": "provisional: reads served from the broker count for the P4 bars when the receipt records route = host', '"hostServedReads": "provisional: reads served from the broker count for the P4 bars')),
 "Q68f current copies": T(("every current copy (the broker's current store, XTDB tx_current, the QLever cur graph) is covered by Q58e's per-subject keys", "current copies are rebuilt on erasure")),
 # Q69
 "Q69e live composition": T(('"liveComposition": "the live A/A uses public-queued, matching EXP-N01\'s A0 (RULINGS Q69e)"', '"liveComposition": "the live A/A uses any composition (RULINGS Q69e)"')),
 "Q69f fallback": T(('"fallback": {"name": "screening-r4",', '"fallback": {"name": "screening-r2",')),
 "Q69 window dropped": T(('    "windowProcedure": "the pool cannot hold', '    "windowProcedureX": "the pool cannot hold')),
 # Q71
 "Q71a list filled": T(('    "installMetadataExclusions": None,', '    "installMetadataExclusions": ["node_modules/.modules.yaml"],')),
 "Q71b toolchain": T(("and the pnpm version when the build or run calls pnpm; the Python version", "; the Python version")),
 "Q71b invocation schema": T(('    "oracle-invocation/1": {', '    "oracle-invocation/0": {')),
 # Q72f
 "Q72f error back": T(('{"id": "CE-FUTURE-BASIS", "error": "E-BASIS-NOT-AVAILABLE", "reason": "basis-not-reached",', '{"id": "CE-FUTURE-BASIS", "error": "E-UNAVAILABLE-CUT", "reason": "unavailable-cut",')),
 "Q72f retired dropped": T(('RETIRED_ERRORS = {"E-UNAVAILABLE-CUT": {"was": "ReadError / unavailable-cut", "replacedBy": "E-BASIS-NOT-AVAILABLE",', 'RETIRED_ERRORS = {"E-UNAVAILABLE-CUT": {"was": "ReadError / unavailable-cut", "replacedBy": "E-READ",')),
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

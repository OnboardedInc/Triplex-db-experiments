"""EXP-A01 regression harness for contract 0.3.9: every deliberate regression must make the generator report CONTRACT INVALID.
Runs from any directory; operates on the worktree that contains this file. tests-through-038.json holds the earlier mutations
(entries whose anchors no longer exist are reported as retired, not run)."""
import json, pathlib, subprocess, sys
HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[3]
GEN = REPO / "lab/acceptance/build_contract.py"
src = GEN.read_text()
mut = REPO / "lab/acceptance/_negtest_tmp.py"
tests = json.loads((HERE / "tests-through-038.json").read_text())
T = lambda *pairs: [list(p) for p in pairs]
tests.update({
 # Q58a
 "Q58a facade dropped": T(("go through a Triplex facade; engine ports are not a public surface.", "may use engine ports directly.")),
 "Q58a at token dropped": T(("or at: position (exact; the engine must also reconstruct it, else the typed E-BASIS-NOT-RECONSTRUCTIBLE)", "")),
 "Q58a no basis range": T(("Every answer carries {basis: {low, high}, route}.", "Answers report a position.")),
 "Q58a deadline": T(('        "nativeDeadlineMs": 2000,', '        "nativeDeadlineMs": 10,')),
 "Q58a error dropped": T(('    {"id": "E-BASIS-NOT-RECONSTRUCTIBLE",', '    {"id": "E-BASIS-NOT-AT",')),
 "Q58a cases unselected": T(('",".join(READ_GUARANTEE_CASES + NATIVE_TOKEN_CASES + P2Q_READ_CASES)', '",".join(READ_GUARANTEE_CASES + P2Q_READ_CASES)')),
 "Q58a case dropped": T(('NATIVE_TOKEN_CASES = ["CO-FACADE-ONLY", ', 'NATIVE_TOKEN_CASES = [')),
 "Q58a not provisional": T(('"native": "PROVISIONAL, flagged for Sam (RULINGS Q58a,', '"native": "accepted (RULINGS Q58a,')),
 # Q58b-e
 "Q58b direction": T(("the marker row is the eligibility authority", "the system time is the eligibility authority")),
 "Q58c pragma": T(("WAL, synchronous=FULL, fullfsync=ON, checkpoint_fullfsync=ON, locking_mode=EXCLUSIVE, application-driven PASSIVE checkpoints, a worker thread", "WAL, synchronous=NORMAL, application-driven PASSIVE checkpoints, a worker thread")),
 "Q58c flock back": T(('BROKER_HARDENING_CASES = ["BR-OVERLAY-BOUND-OVERLOADED", ', 'BROKER_HARDENING_CASES = ["BR-OVERLAY-BOUND-OVERLOADED", "BR-KERNEL-FLOCK", ')),
 "Q58c crc dropped": T(('"BR-CRC-CHAIN-MID-WAL", "BR-COMMITTED-AT",', '"BR-COMMITTED-AT",')),
 "Q58c statement": T(("a CRC32C prev-chain column detects mid-WAL corruption plain SQLite misses", "a checksum detects corruption")),
 "Q58d overlay merges all": T(("the overlay merge is allowed for entity pulls only, keyed by id with the greater LSN winning", "the overlay merge is allowed for every read, keyed by id with the later arrival winning")),
 "Q58d obligation dropped": T(('O("G7.composition.overlay-rules", ["G7"],', 'O("G7.composition.overlay-rulez", ["G7"],')),
 "Q58d tombstones": T(("frames carry explicit tombstones, so erasure and deletes cannot resurrect replica rows (RULINGS Q58d)", "deletes are applied on replay (RULINGS Q58d)")),
 "Q58e log erasure": T(("value payloads in frames are encrypted per subject and erasure destroys the key (crypto-shredding)", "values in frames are rewritten on erasure")),
 "Q58e inventory": T(('"QLever broker log of record", "broker recent_rows overlay", "caches"', '"QLever broker log of record", "caches"')),
 "Q58e case unselected": T(('"CS-ERASURE:ER-ORDER-KEY-CHANNEL,ER-LEXICAL-CHANNEL,ER-KEY-EXCLUSIVE,ER-LOG-CRYPTO-SHRED"]', '"CS-ERASURE:ER-ORDER-KEY-CHANNEL,ER-LEXICAL-CHANNEL,ER-KEY-EXCLUSIVE"]')),
 # Q62
 "Q62a case dropped": T(('P2Q_READ_CASES = ["CO-EXECUTOR-IN-TX-WAITS-OR-TYPED", ', 'P2Q_READ_CASES = [')),
 "Q62a cases unselected": T(('",".join(READ_GUARANTEE_CASES + NATIVE_TOKEN_CASES + P2Q_READ_CASES)', '",".join(READ_GUARANTEE_CASES + NATIVE_TOKEN_CASES)')),
 "Q62a two brokers unselected": T(('"CS-FAULT:" + ",".join(FAULT_Q55_CASES + FAULT_Q62_CASES)]', '"CS-FAULT:" + ",".join(FAULT_Q55_CASES)]')),
 "Q62b default-off": T(("merging it behind a default-off option needs only the Q62a fixes, independently re-verified", "merging it needs the hardening too")),
 "Q62c 750 back": T(("QLever A0 653 triples per 10-fact command as V-P2Q measured it", "QLever A0 about 750 triples per 10-fact command")),
 # Q60
 "Q60a rounds": T(('"rounds": {"min": 8, "default": 12, "max": 24}', '"rounds": {"min": 1, "default": 12, "max": 24}')),
 "Q60a single run ok": T(("a single run never decides a bar (RULINGS Q60a)", "a single run may decide a bar (RULINGS Q60a)")),
 "Q60b margin": T(('"superiorityRatioDefault": 1.25,', '"superiorityRatioDefault": 1.05,')),
 "Q60b hold p99": T(('"holdP99Max": 1.15,', '"holdP99Max": 1.5,')),
 "Q60c regime unrecorded": T(('        "slotRegime": "{cpuMax, cpuset, cpuWeight}: the effective cgroup values of every measurement slot (RULINGS Q60c)",\n', '')),
 "Q60d committed only": T(("latency histograms include every offered command (expired, failed and rejected ones at their censor time) next to the committed-only view", "latency histograms include committed commands")),
 "Q60e windows": T(("outside them an absolute bar is reported unjudged, which never counts as met", "outside them an absolute bar is judged anyway")),
 "Q60f modes": T(('NS_MODES = ["single-execution", "paired-rounds"]', 'NS_MODES = ["single-execution"]')),
 "Q60f CR-NS": T(("an absolute bar only from GREEN windows (an unjudged bar is never met)", "an absolute bar from any window")),
 "Q60g burst": T(('"burstEveryS": 180},', '"burstEveryS": 600},')),
 "Q60h lease": T(("a measurement window takes every heavy token and freezes pool admission for its duration", "a measurement window shares the pool")),
 "Q60i A0 single run": T(('    "measurement": "A0 numbers for comparisons come from paired rounds under PAIR_0;', '    "measurement": "A0 numbers for comparisons come from any run;')),
 "Q60 paired not checked": T(('            if not paired_ok(ev["measure_pair"](binary, comp, entry["binarySha256"], entry["composition"], wl), wl):', '            if False:')),
 "Q60 rounds unchecked": T(('    if not (_typed(m.get("rounds"), "int") and d["rounds"]["min"] <= m["rounds"] <= d["rounds"]["max"]):', '    if False:')),
 "Q60 regimes unchecked": T(('    if not isinstance(regs, dict) or set(regs) != {"candidate", "A0"} or regs["candidate"] != regs["A0"]:\n        return False', '    if not isinstance(regs, dict):\n        return False')),
 "Q60 quota allowed": T((' and r["cpuMax"] == "max" and', ' and')),
 "Q60 CX dropped": T(('    {"id": "CX-PAIR0-REGIME-MISMATCH",', '    {"id": "CX-PAIR0-REGIME",')),
 # Q61
 "Q61c argv": T(('"O-REPLAY": {"argv": ["python3", "-I", "lab/oracles/replay/cli.py", "{case}"], "files": None,', '"O-REPLAY": {"argv": ["python3", "lab/oracles/replay/cli.py", "{case}"], "files": None,')),
 "Q61c runner ignored": T(('        if orc not in o["oracles"] or orc not in runners:', '        if orc not in o["oracles"]:')),
 "Q61c answer members": T(('ANSWER_MEMBERS = {"O-REPLAY": ["commandOutcomes", "state", "queries"]}', 'ANSWER_MEMBERS = {"O-REPLAY": ["commandOutcomes", "state", "queries", "verdict"]}')),
 "Q61d field unpinned": T(('    "required": ["id", "tags", "input", "contentSha256", "comparator"], "optional": ["oracle", "faultPoint"],', '    "required": ["id", "tags", "input", "comparator"], "optional": ["oracle", "faultPoint", "contentSha256"],')),
 "Q61d input hash unchecked": T(('    return raw if isinstance(raw, bytes) and hashlib.sha256(raw).hexdigest() == x["contentSha256"] else None', '    return raw if isinstance(raw, bytes) else None')),
 "Q61e mode dropped": T(('"observedSha256": "hex64", "mode": "str", "rep": "int", "comparator": "str", "inputSha256": "hex64"},', '"observedSha256": "hex64", "rep": "int", "comparator": "str", "inputSha256": "hex64"},')),
 "Q61f spec filled": T(('    "format": "triplex-db-2/build-spec/1", "argv": None,', '    "format": "triplex-db-2/build-spec/1", "argv": ["make"],')),
 "Q61f spec unchecked": T(('    if any(cfg["buildSpec"].get(k) is None for k in ("argv", "outputs", "run")):\n        return "DIAGNOSTIC"', '    if False:\n        return "DIAGNOSTIC"')),
 "Q61g workload everywhere": T(('        if set(o["closure"]["rules"]) & {"CR-NS", "CR-GS"}:\n            wl = ev["workload"](o)', '        if True:\n            wl = ev["workload"](o)')),
 "Q61h frozen filled": T(('        "frozen": {"sha256": None, "seed": None,', '        "frozen": {"sha256": "a" * 64, "seed": None,')),
 "Q61h frozen unchecked": T(('            if (wl["generatorSourceSha256"], wl["seed"], wl["offerScheduleSha256"]) != (frozen["sha256"], frozen["seed"], frozen["offerScheduleSha256"]):\n                return "DIAGNOSTIC"', '            if False:\n                return "DIAGNOSTIC"')),
 "Q61i image unchecked": T(('    if any(comp[k]["imageDigest"] != (cfg["imagePins"].get(comp[k]["engine"]) or {}).get("imageId") for k in comp):\n        return "DIAGNOSTIC"', '    if False:\n        return "DIAGNOSTIC"')),
 "Q61i image wrong": T(('"imageId": "sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec"},\n}', '"imageId": "sha256:37d5ede1"},\n}')),
 "Q61j witness unchecked": T(('                if reps > 1 and not fault_witness_ok(', '                if False and not fault_witness_ok(')),
 "Q61j witness point unchecked": T((' and w["rep"] == rep and w["faultPointId"] == x["id"])', ' and w["rep"] == rep)')),
 "Q61k measuredBy unchecked": T(('    if not registered_acceptance(entry.get("measuredBy"), "a0", a0key, entry["commit"], verifiers):\n        return "DIAGNOSTIC"', '    if False:\n        return "DIAGNOSTIC"')),
 "Q61a source": T(('from the authority ref (main), never from the claimed commit (RULINGS Q61a)', 'from the claimed commit (RULINGS Q61a)')),
 "Q59e unpinned allowed": T(('        elif ORACLES[x]["status"] != "COMPILED":\n            return "DIAGNOSTIC"  # RULINGS Q59e', '        elif ORACLES[x]["status"] not in ("EXISTS", "COMPILED", "ACCEPTED", "BUILT-ACCEPTED"):\n            return "DIAGNOSTIC"  # RULINGS Q59e')),
 "Q59c brief rule": T(('"briefRule": "every verification and re-check saves its own BRIEF file', '"briefRule": "verifications may share a brief')),
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

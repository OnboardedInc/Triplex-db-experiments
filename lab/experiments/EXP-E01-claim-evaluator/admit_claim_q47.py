"""Proposed reference model for claim admission (RULINGS Q42a; held Q46b, Q47a to Q47c), for the orchestrator to compile into
lab/acceptance/build_contract.py at 0.3.7 in place of admit_claim / evidence_ok.

Why: Q41d makes the generator's admit_claim the reference the lab evaluator (lab/bin/claim.mjs) implements as a minimum, and
Q47a says the reference "mirrors" EXP-E01. The 0.3.6 model checks receipt fields it is handed (Codex round 6 qualified a claim
with no retained binary, a verifier object {"notAVerifierRecord":true}, oracle exit 2 labelled PASS, a control with no trace or
window, and an indirect CS-MIGRATION refusal), and requires control receipts at the claim's commit while Q46b pins A0's own commit.
This model is pure (no git, no file system): the caller passes what I/O found.

    admit_claim_q47(claim, contract, load_contract, ctx) -> (verdict, reasons)
    contract, load_contract: the JSON at the claimed commit (the generator passes its own documents)
    ctx = {"objects": {sha256: bytes}, "homes": {commit: {"tree": id, "time": committer seconds, "files": {path: bytes}}}}

Rules mirrored from the lab evaluator (same names): run binding in every object; schema of every record; executed modules
retained and bound to the home tree; pinned case manifests; every case verdict recomputed from the retained oracle run; refusals
reject; frozen A0 registry; validated workload identity; verifier evidence on every receipt. Lab-only (Q41d allows the lab to be
stricter): the contract must equal the authority ref's, image pins (VA4), endpoints (VA5), admission (VA10), lockfile and identity
completeness (VA2), counts (VA8), and oracle and W0 files equal to their pins (VA6).
"""
import hashlib
import json
import re

FORMATS = {"claim": "triplex-db-2/claim/1", "receipt": "triplex-db-2/receipt/2", "manifest": "triplex-db-2/build-manifest/1",
           "case-manifest": "triplex-db-2/case-manifest/1", "case-result": "triplex-db-2/case-result/1", "oracle-run": "triplex-db-2/oracle-run/1",
           "fault-witness": "triplex-db-2/fault-witness/1", "ns-run": "triplex-db-2/ns-run/1", "verifier-record": "triplex-db-2/verifier-record/1",
           "recomputed-verdicts": "triplex-db-2/recomputed-verdicts/1", "a0-registry": "triplex-db-2/a0-registry/1", "run-ledger": "triplex-db-2/run-ledger/1"}
PREREQ = ("G7.position.coordinates", "G10.composition.identity-bound", "W0.coverage-floors")
FIELDS = ("engine", "imageDigest", "configSha256", "slot")
ACCEPTED = ("EXISTS", "COMPILED", "ACCEPTED", "BUILT-ACCEPTED")
SHA = re.compile(r"[0-9a-f]{64}")
_MISSING = object()


def _sha(b):
    return hashlib.sha256(b).hexdigest()


def _is_sha(v):
    return isinstance(v, str) and SHA.fullmatch(v) is not None


def _str(v):
    return isinstance(v, str) and len(v) > 0


def _text(v):
    """Canonical text, as lab/bin/claim.mjs canonText (JSON.stringify of key-sorted values)."""
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _safe(p):
    """One file, one spelling: relative, no empty, "." or ".." segments, no control characters, no pathspec magic."""
    return isinstance(p, str) and p and not p.startswith((":", "-")) and not re.search(r"[\x00-\x1f\x7f\\]", p) and all(s not in ("", ".", "..") for s in p.split("/"))


def _agent(a):
    return a.strip().lower() if isinstance(a, str) else None


def _listing(rows):
    return _sha("".join(f"{h}  {p}\n" for p, h in rows).encode())


def _iso(s):
    from datetime import datetime
    try:
        return datetime.fromisoformat(s).timestamp() if isinstance(s, str) else None
    except ValueError:
        return None


def binding_of(r):
    """The run binding (keys absent from the receipt are absent here too, matching JSON.stringify's undefined)."""
    def get(o, k):
        return o.get(k, _MISSING) if isinstance(o, dict) else _MISSING
    pid = get(r, "profileIdentity")
    pid = pid if isinstance(pid, dict) else {}
    ident = {k: pid[k] for k in ("sourceTreeSha256", "lockfileSha256", "node", "pnpm") if k in pid}
    b = {"receiptId": get(r, "receiptId"), "runKind": get(r, "runKind"), "profile": get(r, "profile"), "obligations": get(r, "obligations"),
         "contract": get(r, "contract"), "composition": get(r, "composition"), "git": get(r, "git"), "start": get(get(r, "timing"), "start"), "endpoint": get(r, "endpoint"),
         "admission": get(r, "admission"), "producer": get(r, "producer"), "identity": ident}
    return _sha(_text({k: v for k, v in b.items() if v is not _MISSING}).encode())


def canonical_answer(b):
    """Canonical JSON only (as claim.mjs canonicalAnswer): strict UTF-8, the bytes of its own key-sorted serialisation, safe
    integers as the only numbers, at most 64 levels. Returns (ok, value)."""
    def no(_):
        raise ValueError("number or constant not allowed")

    def pairs(kv):
        if len({k for k, _ in kv}) != len(kv):
            raise ValueError("duplicate key")
        return dict(kv)
    try:
        text = b.decode("utf-8")
        v = json.loads(text, parse_float=no, parse_constant=no, object_pairs_hook=pairs)
    except (ValueError, UnicodeDecodeError, RecursionError):
        return False, None

    def fits(x, d):
        if d > 64:
            return False
        if x is None or isinstance(x, (str, bool)):
            return True
        if isinstance(x, int):
            return abs(x) <= 2 ** 53 - 1
        if isinstance(x, list):
            return all(fits(y, d + 1) for y in x)
        return isinstance(x, dict) and all(fits(y, d + 1) for y in x.values())
    return (fits(v, 0) and _text(v) == text), v


def recompute(comparator, expected, observed):
    """Q47a: the verdict from the retained expected answer and observed result (canonical JSON forms)."""
    ok_e, e = canonical_answer(expected)
    ok_o, o = canonical_answer(observed)
    if not ok_e or not ok_o:
        return "UNCOMPARABLE"
    rows = lambda x: [_text(y) for y in x] if isinstance(x, list) else None
    v = lambda ok: "PASS" if ok else "FAIL"
    if comparator == "CMP-EXACT-VALUE":
        return v(expected == observed)
    if comparator in ("CMP-ORDERED-ROWS", "CMP-PAGES", "CMP-BAG-ROWS", "CMP-SET-ROWS", "CMP-DIAGNOSTICS"):
        a, b = rows(e), rows(o)
        if a is None or b is None:
            return "UNCOMPARABLE"
        return v(a == b if comparator in ("CMP-ORDERED-ROWS", "CMP-PAGES") else sorted(a) == sorted(b) if comparator == "CMP-BAG-ROWS" else sorted(set(a)) == sorted(set(b)))
    if comparator == "CMP-ERROR":
        reasons = e.get("reasons") if isinstance(e, dict) and isinstance(e.get("reasons"), list) else [e.get("reason") if isinstance(e, dict) else None]
        if not isinstance(e, dict) or not isinstance(o, dict) or not _str(e.get("_tag")) or not reasons or not all(_str(x) for x in reasons):
            return "UNCOMPARABLE"
        return v(o.get("_tag") == e["_tag"] and o.get("reason") in reasons and o.get("cause") is not None and ("rows" not in o or o["rows"] == []))
    return "UNCOMPARABLE"


def admit_claim_q47(claim, contract, load_contract, ctx):
    try:
        return _admit(claim, contract, load_contract, ctx)
    except Exception as error:  # fail closed, as the lab evaluator
        return "DIAGNOSTIC", [f"evaluator error: {error!r}"]


def _admit(claim, contract, load_contract, ctx):
    why = []
    objs, homes = ctx["objects"], ctx["homes"]
    obl = {o["id"]: o for o in contract["obligations"]}
    if not isinstance(claim, dict) or claim.get("format") != FORMATS["claim"]:
        return "DIAGNOSTIC", ["claim format"]
    if claim.get("kind") not in ("comparative", "promotion"):
        why.append("claim kind")
    promo = claim.get("kind") == "promotion"
    commit = claim.get("commit")
    if commit not in homes:
        return "DIAGNOSTIC", ["claim commit unknown"]

    def home(c):
        h = homes[c]
        # lib.sourceTreeIdOf: JSON.stringify of {headTree, diffSha256, untracked} in that key order (not sorted), clean tree
        label = _sha(json.dumps({"headTree": h["tree"], "diffSha256": _sha(b""), "untracked": []}, separators=(",", ":")).encode())
        return {"commit": c, "tree": h["tree"], "label": label, "time": h["time"], "files": h["files"]}
    cand = home(commit)
    files = cand["files"]
    if claim.get("sourceTreeSha256") != cand["label"]:
        why.append("claim source label")
    ids = claim.get("obligations") if isinstance(claim.get("obligations"), list) else []
    if not ids:
        why.append("no obligation")
    why += [f"unknown obligation {i!r}" for i in ids if not isinstance(i, str) or i not in obl]   # Q42a
    why += [f"{i} is a prerequisite" for i in ids if i in PREREQ]
    claimed = [obl[i] for i in ids if isinstance(i, str) and i in obl]
    measured = lambda o: bool({"CR-NS", "CR-GS"} & set(o["closure"]["rules"]))
    domain = any("O-DOMAIN" in o["oracles"] for o in claimed)
    prereq = list(PREREQ[:2]) + ([PREREQ[2]] if domain else [])
    used = claimed + [obl[p] for p in prereq if p in obl]
    assignments = contract["composition"]["assignments"]

    def bound(c):
        return isinstance(c, dict) and sorted(c) == sorted(assignments) and all(
            isinstance(c[k], dict) and sorted(c[k]) == sorted(FIELDS) and all(_str(c[k][f]) for f in FIELDS) and _is_sha(c[k]["configSha256"]) for k in assignments)
    comp = claim.get("composition")
    if not bound(comp):
        why.append("claim composition unbound")

    # Q46b, Q47b: the A0 control from the frozen registry the contract pins, never from the claim
    a0, a0_home = None, None
    pin = contract.get("a0Registry")
    cid = claim.get("control", {}).get("id") if isinstance(claim.get("control"), dict) else None
    if not isinstance(pin, dict) or not _safe(pin.get("path")) or not _is_sha(pin.get("sha256")):
        why.append("no pinned A0 registry")
    else:
        raw = files.get(pin["path"])
        try:
            reg = json.loads(raw) if raw is not None and _sha(raw) == pin["sha256"] else None
        except ValueError:
            reg = None
        entry = (reg.get("controls") or {}).get(cid) if isinstance(reg, dict) and reg.get("format") == FORMATS["a0-registry"] and isinstance(cid, str) else None
        if not reg or cid not in (contract.get("a0Controls") or {}) or not isinstance(entry, dict) or not bound(entry.get("composition")) or entry.get("commit") not in homes \
                or entry["composition"]["source"]["engine"] != contract["a0Controls"][cid]["source"] or homes[entry["commit"]]["tree"] != entry.get("tree"):
            why.append("A0 control not in the pinned registry")
        else:
            a0, a0_home = entry["composition"], home(entry["commit"])
            if a0 == comp:
                why.append("the claim is the A0 control")

    # Q47c: pinned case manifests and resolved selections
    manifests = {}
    for name in {c["set"] for o in used for c in o["cases"]}:
        cs = contract["caseSets"].get(name) or {}
        if not _safe(cs.get("manifest")) or not _is_sha(cs.get("manifestSha256")):
            continue
        raw = files.get(cs["manifest"])
        try:
            m = json.loads(raw) if raw is not None and _sha(raw) == cs["manifestSha256"] else None
        except ValueError:
            m = None
        ok = lambda c: isinstance(c, dict) and _str(c.get("id")) and isinstance(c.get("tags"), list) and all(_str(t) for t in c["tags"]) and _is_sha(c.get("contentSha256")) and _str(c.get("comparator")) and c.get("faultPoint", False) in (True, False)
        if isinstance(m, dict) and m.get("format") == FORMATS["case-manifest"] and m.get("set") == name and isinstance(m.get("cases"), list) and all(ok(c) for c in m["cases"]) and len({c["id"] for c in m["cases"]}) == len(m["cases"]):
            manifests[name] = m
        else:
            why.append(f"manifest {name} not the pinned one")
    selection = {}
    for o in used:
        cases = {}
        for sel in o["cases"]:
            cs, m = contract["caseSets"].get(sel["set"]), manifests.get(sel["set"])
            if not cs or not m:
                why.append(f"{o['id']}: {sel['set']} has no pinned manifest")
                continue
            byid = {c["id"] for c in m["cases"]}
            if any(i not in byid for i in cs.get("requiredCases", [])):
                why.append(f"{sel['set']} manifest lacks required cases")
            hit = 0
            for t in sel["select"]:
                if t not in cs.get("requiredTags", []) and t not in cs.get("requiredCases", []):
                    why.append(f"{sel['set']} select {t} not required")
                for c in m["cases"]:
                    if t == "all" or c["id"] == t or t in c["tags"]:
                        cases[(sel["set"], c["id"])] = c
                        hit += 1
            if not hit:
                why.append(f"{o['id']} selects nothing from {sel['set']}")
        if o["id"] == PREREQ[0] and any(("CS-POSITION", i) not in cases for i in contract.get("positionRequiredCases", [])):
            why.append("position selection lacks a required case (Q38a)")
        selection[o["id"]] = cases

    # oracle pins, excludes and the advisory refusal list (Q37b, Q38b, Q45a, Q45b); W0 (GATE-W0)
    for x in sorted({x for o in used for x in o["oracles"]}):
        p = (contract.get("oraclePins") or {}).get(x)
        users = [o for o in used if x in o["oracles"]]
        if p:
            h = p.get("sha256")
            if p.get("acceptReceipt") is None or h is None or (isinstance(h, dict) and (not h or any(v is None for v in h.values()))):
                why.append(f"oracle {x} unpinned")
            why += [f"{o['id']} excluded from {x}" for o in users if o["id"] in p.get("excludes", [])]
        elif contract["oracles"].get(x, {}).get("status") not in ACCEPTED:
            why.append(f"oracle {x} unaccepted")
        for name, ref in ((contract.get("oracleRefusals") or {}).get(x) or {}).items():
            for o in users:
                pairs = {(c["set"], t) for c in o["cases"] for t in c["select"]} | set(selection.get(o["id"], {}))
                if any(c["set"] in ref.get("sets", []) for c in o["cases"]) or any(tuple(c) in pairs for c in ref.get("cases", [])):
                    why.append(f"{o['id']} selects cases {x} refuses ({name})")
    if domain:
        w = contract.get("w0Pin") or {}
        if w.get("reviewReceipt") is None or not w.get("files") or any(v is None for v in w["files"].values()) or ("deltaCheck" in w and w["deltaCheck"] is None) or ("oDomainFingerprint" in w and w["oDomainFingerprint"] is None):
            why.append("W0 pin null")

    def obj(h):
        b = objs.get(h) if _is_sha(h) else None
        return b if b is not None and _sha(b) == h else None

    def record(h, fmt, binding):
        b = obj(h)
        try:
            v = json.loads(b) if b is not None else None
        except ValueError:
            v = None
        return v if isinstance(v, dict) and v.get("format") == fmt and v.get("binding") == binding else None

    frozen = (load_contract.get("writerTrace") or {}).get("generator", {}).get("frozen")
    reps = contract["thresholds"]["T-FAULT-REPS"]["value"]
    sides = [("candidate", comp, cand)] + ([("A0", a0, a0_home)] if a0 else [])
    roles, seen = [], set()
    for r in claim.get("receipts") or []:
        if not isinstance(r, dict) or r.get("format") != FORMATS["receipt"] or not _str(r.get("receiptId")) or r["receiptId"] in seen:
            why.append("malformed receipt")
            continue
        seen.add(r["receiptId"])
        obs = r.get("obligations")
        if not isinstance(obs, list) or len(obs) != 1 or not isinstance(obs[0], dict) or obs[0].get("id") not in obl:
            why.append(f"{r['receiptId']}: one known obligation")
            continue
        o = obl[obs[0]["id"]]
        side = next((s for s in sides if s[1] == r.get("composition")), None)
        role = None
        if side:
            if r.get("runKind") == "verifier":
                role = "verifier" if o["id"] in ids or o["id"] in prereq else None
            elif o["id"] in prereq:
                role = None if o["id"] == PREREQ[2] and side[0] != "candidate" else "prereq"
            elif o["id"] in ids:
                role = "measurement" if side[0] == "candidate" else "control"
        if role is None:
            why.append(f"{r['receiptId']} is not evidence for this claim")
            continue
        h = side[2]
        x = {"r": r, "role": role, "o": o, "side": side[0], "binding": binding_of(r), "cases": {}, "ns": [], "rec": None, "verdicts": None, "ok": True}
        roles.append(x)
        bad = []
        prod = r.get("producer") if isinstance(r.get("producer"), dict) else {}
        if (r.get("contract") or {}).get("version") != contract["version"] or (r.get("contract") or {}).get("transitiveSha256") != contract["transitiveContractSha256"] or obs[0].get("definitionSha256") != o["definitionSha256"]:
            bad.append("contract or definition")
        if not _str(prod.get("tool")) or not prod["tool"].startswith("lab/bin/") or not _str(prod.get("agentId")) or (role != "verifier" and not (isinstance(prod.get("authorsOfCodeUnderTest"), list) and prod["authorsOfCodeUnderTest"] and all(_str(a) for a in prod["authorsOfCodeUnderTest"]))):
            bad.append("producer")
        kinds = ("verifier",) if role == "verifier" else ("acceptance",) if role == "prereq" or promo else ("acceptance", "candidate") if role == "measurement" else ("acceptance", "control")
        if r.get("runKind") not in kinds:
            bad.append("run kind")
        screening = r.get("profile") in contract.get("screeningProfiles", [])
        if role != "verifier" and not (r.get("profile") in o["profiles"] or (screening and not promo and role in ("measurement", "control"))):
            bad.append("profile")
        if not bound(r.get("composition")):
            bad.append("composition")
        g, pid, tm = r.get("git") or {}, r.get("profileIdentity") or {}, r.get("timing") or {}
        start, end = _iso(tm.get("start")), _iso(tm.get("end"))
        if g.get("commit") != h["commit"] or g.get("tree") != h["tree"] or pid.get("sourceTreeSha256") != h["label"] or start is None or end is None or end < start or start < h["time"]:
            bad.append("not fresh")
        # the build/import manifest (Q42a, Q47a)
        m = record(pid.get("buildManifestSha256"), FORMATS["manifest"], x["binding"])
        mods = m.get("modules") if m and isinstance(m.get("modules"), list) else []
        if not m or m.get("commit") != h["commit"] or m.get("tree") != h["tree"] or m.get("sourceTreeSha256") != h["label"] or not mods or not all(isinstance(y, dict) and _safe(y.get("path")) and _is_sha(y.get("sha256")) for y in mods) \
                or not (isinstance(m.get("entrypoints"), list) and m["entrypoints"] and all(e in {y["path"] for y in mods} for e in m["entrypoints"])) \
                or m.get("binarySha256") != _listing([(y["path"], y["sha256"]) for y in mods]) or pid.get("executedBinarySha256") != m.get("binarySha256"):
            bad.append("manifest")
        else:
            hf = h["files"]
            pkgs = [p for p in hf if re.search(r"(^|/)package\.json$", p) and "node_modules" not in p.split("/")]
            names = [n.lower() for n in (json.loads(hf[p]).get("name") for p in pkgs) if _str(n)]
            lock = hf.get("pnpm-lock.yaml", b"").decode("utf-8", "replace")
            builds = [b for b in m.get("builds") or [] if isinstance(b, dict)]
            for y in mods:
                if obj(y["sha256"]) is None:
                    bad.append("module not retained")
                o_ = y.get("origin")
                seg = y["path"].split("/")
                if o_ == "tree" and (y["path"] not in hf or _sha(hf[y["path"]]) != y["sha256"]):
                    bad.append("module stale")
                elif o_ == "build" and not any(b.get("id") == y.get("build") and any(isinstance(z, dict) and z.get("path") == y["path"] and z.get("sha256") == y["sha256"] for z in b.get("outputs") or []) for b in builds):
                    bad.append("module not built")
                elif o_ == "dependency":
                    at = len(seg) - 1 - seg[::-1].index("node_modules") if "node_modules" in seg else -1
                    name = (seg[at + 1] + "/" + (seg[at + 2] if at + 2 < len(seg) else "") if seg[at + 1].startswith("@") else seg[at + 1]) if 0 <= at < len(seg) - 1 else ""
                    first = name.lower() in names or any(s.lower().startswith(n.replace("/", "+") + "@") or s.lower() == n.replace("/", "+") for s in seg for n in names)
                    listed = bool(name) and re.search(r"^\s+'?" + re.escape(name) + "@", lock, re.M) is not None
                    if seg[0] != "node_modules" or first or not listed or m.get("lockfileSha256") != (_sha(hf["pnpm-lock.yaml"]) if "pnpm-lock.yaml" in hf else None):
                        bad.append("dependency")
                elif o_ not in ("tree", "build", "dependency"):
                    bad.append("module origin")
            for b in builds:
                pkg, inputs = b.get("package"), [z for z in b.get("inputs") or [] if isinstance(z, dict)]
                if not _safe(pkg) or f"{pkg}/package.json" not in hf or b.get("sourceRoots") != [pkg]:
                    bad.append("build roots")
                    continue
                listed = sorted(p for p in hf if p.startswith(pkg + "/"))
                if sorted(z.get("path") for z in inputs) != listed or any(_sha(hf[z["path"]]) != z.get("sha256") for z in inputs) \
                        or any(not isinstance(z, dict) or not _safe(z.get("path")) or not z["path"].startswith(pkg + "/dist/") for z in b.get("outputs") or []):
                    bad.append("build inputs or outputs")
        # the run ledger: the evidence list, counts and end time as the run recorded them
        led = record(r.get("ledgerSha256"), FORMATS["run-ledger"], x["binding"])
        ekey = lambda lst: sorted(f"{e.get('kind')} {e.get('objectSha256')}" for e in (lst if isinstance(lst, list) else []) if isinstance(e, dict))
        if not led or ekey(led.get("evidence")) != ekey(r.get("evidence")) or led.get("counts") != r.get("counts") or led.get("end") != (r.get("timing") or {}).get("end"):
            bad.append("run ledger")
        # evidence records
        sel = selection.get(o["id"], {})
        faults = {}
        ev = r.get("evidence") if isinstance(r.get("evidence"), list) else []
        if not ev:
            bad.append("no evidence")
        for e in ev:
            if not isinstance(e, dict) or not _str(e.get("kind")):
                bad.append("evidence entry")
                continue
            k = e["kind"]
            if k not in ("case-result", "fault-witness", "ns-run", "verifier-record"):
                if obj(e.get("objectSha256")) is None:
                    bad.append(f"object {k}")
                continue
            v = record(e.get("objectSha256"), FORMATS[k], x["binding"])
            if v is None:
                bad.append(f"object {k}")
                continue
            if k == "case-result":
                key = (v.get("caseSet"), v.get("caseId"))
                c = sel.get(key)
                if (v.get("caseSet"), v.get("caseId"), v.get("mode"), v.get("verdict")) != (e.get("caseSet"), e.get("caseId"), e.get("mode"), e.get("verdict")) or not c \
                        or v.get("caseSha256") != c["contentSha256"] or obj(v.get("caseSha256")) is None or v.get("comparator") != c["comparator"]:
                    bad.append("case object")
                    continue
                run = record(v.get("oracleRunObject"), FORMATS["oracle-run"], x["binding"])
                if not run or run.get("oracleId") not in o["oracles"] or (run.get("caseSet"), run.get("caseId"), run.get("caseSha256")) != (v["caseSet"], v["caseId"], v["caseSha256"]):
                    bad.append("oracle run")
                    continue
                if run.get("exit") != 0 or run.get("refusal") is not None:
                    bad.append("oracle refused (Q45b, Q47c)")
                    x["cases"][key + (v["mode"],)] = "REFUSED"
                    continue
                exp, got = obj(run.get("expectedObject")), obj(v.get("rawResultObject"))
                if exp is None or got is None:
                    bad.append("expected or raw object")
                    continue
                verdict = recompute(v["comparator"], exp, got)
                x["cases"][key + (v["mode"],)] = verdict
                if verdict != v["verdict"] or verdict != "PASS":
                    bad.append("verdict")
            elif k == "fault-witness":
                inj = v.get("injections") if isinstance(v.get("injections"), list) else []
                dur = {i.get("durableEvidenceObject") for i in inj if isinstance(i, dict) and obj(i.get("durableEvidenceObject")) is not None}
                if not _str(v.get("caseSet")) or not _str(v.get("caseId")) or len(dur) != len(inj):
                    bad.append("fault witness")
                faults[(v.get("caseSet"), v.get("caseId"))] = max(faults.get((v.get("caseSet"), v.get("caseId")), 0), len(dur))
            elif k == "ns-run":
                t, slot, wins = v.get("trace"), v.get("slot"), v.get("windows")
                ok_w = isinstance(wins, list) and wins and all(isinstance(w, dict) and isinstance(w.get("from"), (int, float)) and isinstance(w.get("to"), (int, float)) and not isinstance(w.get("from"), bool) and w["from"] >= 0 and w["to"] > w["from"] and _str(w.get("burstPhase")) for w in wins)
                ok_t = isinstance(t, dict) and _safe(t.get("generatorPath")) and _is_sha(t.get("generatorSourceSha256")) and isinstance(t.get("seed"), int) and not isinstance(t.get("seed"), bool) and _is_sha(t.get("offerScheduleSha256"))
                ok_s = isinstance(slot, dict) and _str(slot.get("name")) and _str(slot.get("host")) and slot["name"] == ((r.get("composition") or {}).get("source") or {}).get("slot")
                want = o["closure"]["params"].get("evidenceMeasurement") or ("secondary" if o["id"].startswith("NS.SEC.") else o["id"].split(".")[1])
                if not (ok_w and ok_t and ok_s):
                    bad.append("ns-run workload identity (Q47b)")
                elif v.get("measurement") != want or obj(v.get("rawEventsObject")) is None or obj(t["offerScheduleSha256"]) is None:
                    bad.append("ns-run measurement or objects")
                elif t["generatorPath"] not in h["files"] or _sha(h["files"][t["generatorPath"]]) != t["generatorSourceSha256"] or not isinstance(frozen, dict) \
                        or (t["generatorPath"], t["generatorSourceSha256"], t["seed"], t["offerScheduleSha256"]) != (frozen.get("path"), frozen.get("sha256"), frozen.get("seed"), frozen.get("offerScheduleSha256")):
                    bad.append("trace not the frozen one (VA15)")
                else:
                    x["ns"].append(_text({"g": t["generatorSourceSha256"], "seed": t["seed"], "schedule": t["offerScheduleSha256"], "windows": [[w["from"], w["to"], w["burstPhase"]] for w in wins], "slot": [slot["name"], slot["host"]], "profile": r.get("profile")}))
            elif k == "verifier-record":
                okv = isinstance(v.get("verifies"), list) and v["verifies"] and all(isinstance(z, dict) and _str(z.get("receiptId")) and _is_sha(z.get("binding")) for z in v["verifies"])
                rv = record(v.get("recomputedVerdictsObject"), FORMATS["recomputed-verdicts"], x["binding"])
                okr = rv is not None and isinstance(rv.get("verdicts"), list) and all(isinstance(z, dict) and all(_str(z.get(f)) for f in ("receiptId", "caseSet", "caseId", "mode", "verdict")) for z in rv["verdicts"])
                if not okv or v.get("mode") != o["verifierMode"] or not isinstance(v.get("mismatches"), list) or v["mismatches"] or not isinstance(v.get("spotRerunReceiptIds"), list) \
                        or (v["mode"] == "re-evaluate-and-spot" and not (v["spotRerunReceiptIds"] and all(_str(s) for s in v["spotRerunReceiptIds"]))) or not okr:
                    bad.append("verifier record schema (Q47a)")
                else:
                    x["rec"], x["verdicts"] = v, rv["verdicts"]
        modes = o["closure"]["modes"]
        if role == "verifier":
            ids_ = {y.get("receiptId") for y in claim.get("receipts") or [] if isinstance(y, dict)}
            if not x["rec"]:
                bad.append("no verifier record")
            elif not sel or not (all if x["rec"]["mode"] == "rerun" else any)(all(x["cases"].get(key + (md,)) == "PASS" for md in modes) for key in sel):
                bad.append("verifier shows no rerun (VV3)")
            elif any(s_ != r["receiptId"] and s_ not in ids_ for s_ in x["rec"]["spotRerunReceiptIds"]):
                bad.append("spot rerun receipts not carried")
        else:
            if not modes or any(x["cases"].get(key + (md,)) != "PASS" for key in sel for md in modes):
                bad.append("cases x modes (VA8, Q47c)")
            if "CR-FAULT" in o["closure"]["rules"]:
                points = [key for key, c in sel.items() if c.get("faultPoint")]
                if not points or any(faults.get(p, 0) < reps for p in points):
                    bad.append("fault repetitions")
            if measured(o) and not x["ns"]:
                bad.append("no valid ns-run")
        if bad:
            x["ok"] = False
            why.append(f"{r['receiptId']}: {', '.join(sorted(set(bad)))}")

    for s, _, _ in sides:  # prerequisites per compared composition, A0 included (Q34d, Q38a, Q38b)
        for p in prereq:
            if p == PREREQ[2] and s != "candidate":
                continue
            if not any(x["role"] == "prereq" and x["o"]["id"] == p and x["side"] == s for x in roles):
                why.append(f"no {p} receipt for {s}")
    for o in claimed:  # own measurement and matched control (Q42a, Q47b)
        mine = [x for x in roles if x["role"] == "measurement" and x["o"]["id"] == o["id"]]
        theirs = [x for x in roles if x["role"] == "control" and x["o"]["id"] == o["id"]]
        if not mine:
            why.append(f"no {o['id']} measurement")
        if not theirs:
            why.append(f"no {o['id']} control")
        if mine and theirs and measured(o):
            keys = {k for x in theirs for k in x["ns"]}
            if any(k not in keys for x in mine for k in x["ns"]):
                why.append(f"{o['id']} control unmatched")
    for x in [y for y in roles if y["role"] != "verifier"]:  # verifier evidence on every receipt (VV1, VV2, VV4)
        cover = [v for v in roles if v["role"] == "verifier" and v["ok"] and v["rec"] and v["o"]["id"] == x["o"]["id"] and v["side"] == x["side"]
                 and any(z["receiptId"] == x["r"]["receiptId"] and z["binding"] == x["binding"] for z in v["rec"]["verifies"])]
        if not cover:
            why.append(f"{x['r']['receiptId']} has no verifier")
        for v in cover:
            authors, agent = (x["r"].get("producer") or {}).get("authorsOfCodeUnderTest"), (v["r"].get("producer") or {}).get("agentId")
            theirs = {(z["caseSet"], z["caseId"], z["mode"]): z["verdict"] for z in v["verdicts"] if z["receiptId"] == x["r"]["receiptId"]}
            if v["r"].get("profile") != x["r"].get("profile") or not _str(agent) or not isinstance(authors, list) or _agent(agent) in [_agent(a) for a in authors] or _agent(agent) == _agent((x["r"].get("producer") or {}).get("agentId")) \
                    or any(theirs.get(k) != verdict for k, verdict in x["cases"].items()):
                why.append(f"{v['r']['receiptId']} is not an independent, agreeing verifier of {x['r']['receiptId']}")
    return ("DIAGNOSTIC" if why else "QUALIFIED"), why

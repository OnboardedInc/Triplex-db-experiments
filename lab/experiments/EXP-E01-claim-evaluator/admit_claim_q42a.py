"""Proposed reference model for RULINGS Q42a (EXP-E01), to replace admit_claim in lab/acceptance/build_contract.py at 0.3.6.

Why a new reference model: Q41d makes the generator's admit_claim the reference the lab evaluator implements "as a minimum", and
Q42a says admission opens and verifies the evidence. The 0.3.5 model reads a structural projection only, so on Codex's fabricated
receipt, a stale binary, an earlier-commit receipt relabelled, a claim with prerequisites but no measurement, a missing matched
control and an unknown id beside a known one it returns QUALIFIED while lab/bin/claim.mjs returns DIAGNOSTIC. This model stays
pure (no git, no file system): the caller passes what I/O found as `ctx`, so the generator can keep its fixtures as data:

    ctx = {"commit": claimed commit id, "tree": its tree id, "label": lib.sourceTreeIdOf(tree) (the clean source label),
           "time": the commit's committer time in seconds, "files": {path: sha256 of the blob at the commit},
           "objects": {sha256: bytes} (the content-addressed store)}

It covers Q42a and the 0.3.5 rules. The lab evaluator adds the VA rules that need more than this (contract read from the authority
ref, image pins VA4, endpoints VA5, counts VA8, admission VA10, identity completeness and lockfile VA2, oracle and W0 files equal
their pins VA6); on those fixtures this model may say QUALIFIED where the lab says DIAGNOSTIC, which Q41d permits. To compile it:
replace `g.` with the generator's globals and `frozen` with WRITER_TRACE["generator"]["frozen"] once that pin exists.
"""
import hashlib
import json
from datetime import datetime

FORMATS = {"claim": "triplex-db-2/claim/1", "receipt": "triplex-db-2/receipt/2", "manifest": "triplex-db-2/build-manifest/1",
           "case-result": "triplex-db-2/case-result/1", "fault-witness": "triplex-db-2/fault-witness/1", "ns-run": "triplex-db-2/ns-run/1",
           "verifier-record": "triplex-db-2/verifier-record/1"}
PREREQ = ("G7.position.coordinates", "G10.composition.identity-bound", "W0.coverage-floors")
FIELDS = ("engine", "imageDigest", "configSha256", "slot")


def _sha(b):
    return hashlib.sha256(b).hexdigest()


def _t(s):
    try:
        return datetime.fromisoformat(s).timestamp()
    except (TypeError, ValueError):
        return None


def admit_claim_q42a(claim, ctx, g, pins=None, w0=None, frozen=None):
    """Returns (verdict, reasons). g is the generator module (OBL, ORACLES, A0_CONTROLS, POSITION_REQUIRED_CASES, THRESHOLDS,
    SCREENING_PROFILES, COMPOSITION, obligation_hash). Supplied names and Booleans are never read (Q38b)."""
    pins = g.ORACLE_PINS if pins is None else pins
    w0 = g.W0_PIN if w0 is None else w0
    why = []
    obl = {o["id"]: o for o in g.OBL}
    if not isinstance(claim, dict) or claim.get("format") != FORMATS["claim"] or claim.get("kind") not in ("comparative", "promotion"):
        return "DIAGNOSTIC", ["claim format or kind"]
    promo = claim["kind"] == "promotion"
    if claim.get("commit") != ctx["commit"] or claim.get("sourceTreeSha256") != ctx["label"]:
        why.append("claim not bound to the clean tree of its commit")
    ids = claim.get("obligations") or []
    if not ids:
        why.append("no obligation")
    why += [f"unknown obligation {i}" for i in ids if i not in obl]                       # Q42a: rejected, never dropped
    why += [f"{i} is a prerequisite, not a claim" for i in ids if i in PREREQ]
    claimed = [obl[i] for i in ids if i in obl]
    measured = lambda o: bool({"CR-NS", "CR-GS"} & set(o["closure"]["rules"]))
    domain = any("O-DOMAIN" in o["oracles"] for o in claimed)
    prereq = list(PREREQ[:2]) + ([PREREQ[2]] if domain else [])

    def bound(c):  # VA14, as receipt_valid
        return isinstance(c, dict) and set(c) == set(g.COMPOSITION["assignments"]) and all(
            isinstance(c[k], dict) and set(c[k]) == set(FIELDS) and all(c[k][f] for f in FIELDS) for k in c)
    comp, control = claim.get("composition"), claim.get("control")
    if not bound(comp):
        why.append("claim composition unbound")
    if any(measured(o) for o in claimed) and not control:
        why.append("NS/GS claim without a matched A0 control")                              # Q42a
    if control:
        a0 = g.A0_CONTROLS.get(control.get("id"))
        cc = control.get("composition")
        if not a0 or not bound(cc) or cc["source"]["engine"] != a0["source"] or cc == comp:
            why.append("control is not a bound A0 composition distinct from the claim's")
    comps = [comp] + ([control.get("composition")] if control else [])
    # 0.3.5 rules kept: W0 pin for domain claims (GATE-W0), accepted oracle pins for the claim and its prerequisites (Q37b, Q38b)
    if domain and (any(v is None for v in w0["files"].values()) or w0.get("reviewReceipt") is None):
        why.append("W0 pin null")
    for x in sorted({x for o in claimed + [obl[p] for p in prereq] for x in o["oracles"]}):
        if x in pins:
            sha = pins[x].get("sha256")
            if pins[x].get("acceptReceipt") is None or sha is None or (isinstance(sha, dict) and any(v is None for v in sha.values())):
                why.append(f"oracle {x} unpinned")
        elif g.ORACLES[x]["status"] not in ("EXISTS", "COMPILED", "ACCEPTED"):
            why.append(f"oracle {x} unaccepted")

    objs, files = ctx["objects"], ctx["files"]

    def obj(sha):  # Q42a: the object exists in the store and its bytes hash to the recorded value
        b = objs.get(sha) if isinstance(sha, str) else None
        return b if b is not None and _sha(b) == sha else None

    def jobj(sha, fmt, r, oid):  # ... and describes this receipt (a real object of another case or commit never stands in)
        b = obj(sha)
        try:
            v = json.loads(b) if b is not None else None
        except ValueError:
            v = None
        ok = isinstance(v, dict) and v.get("format") == fmt and v.get("receiptId") == r["receiptId"] and v.get("commit") == ctx["commit"] and v.get("obligation") == oid
        return v if ok else None

    def manifest_ok(r):  # Q42a: executed binary and modules bound to the claimed tree through a manifest object
        m = jobj_plain(r.get("profileIdentity", {}).get("buildManifestSha256"))
        if not m or m.get("format") != FORMATS["manifest"] or m.get("receiptId") != r["receiptId"] or m.get("commit") != ctx["commit"] or m.get("tree") != ctx["tree"]:
            return False
        mods, builds = m.get("modules") or [], {b.get("id"): b for b in m.get("builds") or []}
        if not m.get("entrypoints") or any(e not in {x.get("path") for x in mods} for e in m["entrypoints"]):
            return False
        for x in mods:
            o = x.get("origin")
            if o == "tree" and files.get(x.get("path")) != x.get("sha256"):
                return False
            if o == "build" and not any(y.get("path") == x.get("path") and y.get("sha256") == x.get("sha256") for y in (builds.get(x.get("build")) or {}).get("outputs") or []):
                return False
            if o == "dependency" and (not str(x.get("path")).startswith("node_modules/") or ".." in str(x.get("path")).split("/") or m.get("lockfileSha256") != files.get("pnpm-lock.yaml")):
                return False
            if o not in ("tree", "build", "dependency"):
                return False
        for b in builds.values():
            roots = b.get("sourceRoots") or []
            listed = sorted(p for p in files if any(p == rt or p.startswith(rt.rstrip("/") + "/") for rt in roots))
            if not listed or sorted(x.get("path") for x in b.get("inputs") or []) != listed or any(files.get(x["path"]) != x.get("sha256") for x in b["inputs"]):
                return False
        return True

    def jobj_plain(sha):
        b = obj(sha)
        try:
            return json.loads(b) if b is not None else None
        except ValueError:
            return None

    roles, seen = [], set()
    for r in claim.get("receipts") or []:
        if not isinstance(r, dict) or r.get("format") != FORMATS["receipt"] or not r.get("receiptId") or r["receiptId"] in seen or len(r.get("obligations") or []) != 1:
            why.append("malformed receipt")
            continue
        seen.add(r["receiptId"])
        oid = r["obligations"][0].get("id")
        if oid not in obl:
            why.append(f"receipt for unknown obligation {oid}")
            continue
        o = obl[oid]
        role = ("verifier" if oid in ids else None) if r.get("runKind") == "verifier" else "prereq" if oid in prereq else (
            "measurement" if r.get("composition") == comp else "control" if control and r.get("composition") == control.get("composition") else None) if oid in ids else None
        if role is None or (role == "prereq" and r.get("composition") not in comps):
            why.append(f"{r['receiptId']} is not evidence for this claim")
            continue
        bad = []
        # every receipt the claim carries must verify (Q42a); 0.3.5's receipt_valid checks first
        if r["obligations"][0].get("definitionSha256") != g.obligation_hash(o):
            bad.append("definition hash")
        if not bound(r.get("composition")):
            bad.append("composition unbound")
        if not str((r.get("producer") or {}).get("tool", "")).startswith("lab/bin/"):
            bad.append("producer")
        kinds = ("verifier",) if role == "verifier" else ("acceptance",) if role == "prereq" or promo else ("acceptance", "candidate", "control")
        if r.get("runKind") not in kinds:
            bad.append("run kind")
        if r.get("profile") in g.SCREENING_PROFILES and (role == "prereq" or promo):          # VA16, ACCEPTANCE 5.7, Q34d
            bad.append("screening profile")
        # freshness (Q42a): at the claimed commit, on its clean tree, started after the commit existed
        start = _t((r.get("timing") or {}).get("start"))
        if (r.get("git") or {}).get("commit") != ctx["commit"] or (r.get("git") or {}).get("tree") != ctx["tree"] or (r.get("profileIdentity") or {}).get("sourceTreeSha256") != ctx["label"] or start is None or start < ctx["time"]:
            bad.append("not fresh")
        if not manifest_ok(r):
            bad.append("manifest")
        passed, ns, faults, rec = set(), [], [], None
        ev = r.get("evidence") or []
        for e in ev:
            k = e.get("kind")
            v = jobj(e.get("objectSha256"), FORMATS.get(k, ""), r, oid) if k in ("case-result", "fault-witness", "ns-run", "verifier-record") else obj(e.get("objectSha256"))
            if v is None:
                bad.append(f"object {k}")
                continue
            if k == "case-result":
                if (v.get("caseId"), v.get("mode"), v.get("verdict")) != (e.get("caseId"), e.get("mode"), e.get("verdict")) or ("rawResultObject" in v and obj(v["rawResultObject"]) is None):
                    bad.append("case object")
                elif e.get("verdict") != "PASS":
                    bad.append("case not PASS")
                else:
                    passed.add((e["caseId"], e["mode"]))
            elif k == "fault-witness":
                inj = v.get("injections") or []
                if any(obj((i or {}).get("durableEvidenceObject")) is None for i in inj):
                    bad.append("fault evidence")
                faults.append(len(inj))
            elif k == "ns-run":
                if obj(v.get("rawEventsObject")) is None:
                    bad.append("raw events")
                ns.append(v)
            elif k == "verifier-record":
                if obj(v.get("recomputedVerdictsObject")) is None:
                    bad.append("recomputed verdicts")
                rec = v
        if not ev:
            bad.append("no evidence")
        if role == "verifier":
            vids = rec.get("verifiesReceiptIds") if rec else None
            verified = [x for x in claim.get("receipts") or [] if isinstance(x, dict) and vids and x.get("receiptId") in vids]
            agent = (r.get("producer") or {}).get("agentId")
            if not rec or not vids or len(verified) != len(vids) or rec.get("mismatches") != [] or not agent or any(
                    agent in ((x.get("producer") or {}).get("authorsOfCodeUnderTest") or []) or agent == (x.get("producer") or {}).get("agentId") for x in verified):
                bad.append("verifier record or independence (VV1, VV4)")
        else:
            need = g.POSITION_REQUIRED_CASES if oid == PREREQ[0] else list(dict.fromkeys(t for c in o["cases"] for t in c["select"]))
            modes = o["closure"]["modes"]
            if not modes or any((c, m) not in passed for c in need for m in modes):           # Q42a modes; VA8
                bad.append("cases x modes")
            if "CR-FAULT" in o["closure"]["rules"] and (not faults or min(faults) < g.THRESHOLDS["T-FAULT-REPS"]["value"]):
                bad.append("fault repetitions")                                               # Q42a fault repetitions
            if measured(o):
                want = o["closure"]["params"].get("evidenceMeasurement") or ("secondary" if oid.startswith("NS.SEC.") else oid.split(".")[1])
                if not ns:
                    bad.append("no ns-run")
                for v in ns:
                    t = v.get("trace") or {}
                    if v.get("measurement") != want or not v.get("slot") or not v.get("windows") or files.get(t.get("generatorPath")) != t.get("generatorSourceSha256") or not frozen or (
                            t.get("generatorPath"), t.get("generatorSourceSha256"), t.get("seed")) != (frozen.get("path"), frozen.get("sha256"), frozen.get("seed")):
                        bad.append("ns-run measurement or frozen trace (VA15, CX-GS-WRONG-SCENARIO)")
        if bad:
            why.append(f"{r['receiptId']}: {', '.join(sorted(set(bad)))}")
        roles.append({"r": r, "role": role, "oid": oid, "ns": ns, "rec": rec, "ok": not bad})

    for i, c in enumerate(comps):  # prerequisites per compared composition, A0 included (Q34d, Q38a, Q38b)
        for p in prereq:
            if p == PREREQ[2] and i > 0:
                continue
            if not any(x["role"] == "prereq" and x["oid"] == p and x["r"].get("composition") == c for x in roles):
                why.append(f"no {p} receipt for composition {i}")
    for o in claimed:  # the claim's own evidence and its matched control (Q42a)
        mine = [x for x in roles if x["role"] == "measurement" and x["oid"] == o["id"]]
        if not mine:
            why.append(f"no {o['id']} measurement")
            continue
        if measured(o):
            theirs = [x for x in roles if x["role"] == "control" and x["oid"] == o["id"]]
            key = lambda v: json.dumps({"slot": v.get("slot"), "g": (v.get("trace") or {}).get("generatorSourceSha256"), "seed": (v.get("trace") or {}).get("seed"), "w": v.get("windows")}, sort_keys=True)
            keys = {key(v) for x in theirs for v in x["ns"]}
            if not theirs or any(key(v) not in keys for x in mine for v in x["ns"]):
                why.append(f"{o['id']} has no matched control run")
        if promo:  # verifier evidence (Q42a), VV1 to VV4
            verified = {i for x in roles if x["role"] == "verifier" and x["oid"] == o["id"] and x["ok"] for i in x["rec"]["verifiesReceiptIds"]}
            if any(x["r"]["receiptId"] not in verified for x in roles if x["role"] in ("measurement", "control") and x["oid"] == o["id"]):
                why.append(f"{o['id']} lacks independent verifier evidence")
    return ("DIAGNOSTIC" if why else "QUALIFIED"), why

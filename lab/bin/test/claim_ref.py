"""Runs both reference models over the claim fixtures (EXP-E01). Usage: python3 -I -B claim_ref.py <input.json>

input = {"objects": store dir, "fixtures": [{"id", "repo", "claim"}]}; prints {id: {"ref035": verdict, "refQ42a": verdict, "q42aReasons": [...]}}.

ref035 is the generator's admit_claim exactly as compiled in contract 0.3.5, fed the structural projection of each lab receipt
(the fields receipt_valid reads; the projection adds nothing and drops nothing it reads). refQ42a is the proposed replacement in
lab/experiments/EXP-E01-claim-evaluator/admit_claim_q42a.py, fed what I/O found (this runner does the git and store reads).
Pins, the W0 pin and the frozen trace pair come from the contract files at the claimed commit, as the lab evaluator reads them.
"""
import hashlib
import importlib.util
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


bc = load("build_contract", REPO / "lab/acceptance/build_contract.py")
q42a = load("admit_claim_q42a", REPO / "lab/experiments/EXP-E01-claim-evaluator/admit_claim_q42a.py")


def git(repo, *args, data=None):
    return subprocess.run(["git", *args], cwd=repo, input=data, capture_output=True, check=True).stdout


def tree_files(repo, commit):
    """{path: sha256 of blob bytes} for every tracked file at the commit."""
    entries = [line.split("\t", 1) for line in git(repo, "ls-tree", "-r", "-z", commit).decode().split("\0") if line]
    blobs = [(meta.split()[2], p) for meta, p in entries if meta.split()[1] == "blob"]
    out = git(repo, "cat-file", "--batch", data="".join(f"{oid}\n" for oid, _ in blobs).encode())
    files, at = {}, 0
    for oid, p in blobs:
        nl = out.index(b"\n", at)
        size = int(out[at:nl].split()[2])
        files[p] = hashlib.sha256(out[nl + 1:nl + 1 + size]).hexdigest()
        at = nl + 1 + size + 1
    return files


def project(r):
    """The structural receipt the 0.3.5 reference reads, one per obligation entry."""
    out = []
    for ob in r.get("obligations") or []:
        out.append({"obligation": ob.get("id"), "definitionSha256": ob.get("definitionSha256"),
                    "sourceTreeSha256": (r.get("profileIdentity") or {}).get("sourceTreeSha256"), "composition": r.get("composition"),
                    "caseResults": [{"case": e.get("caseId"), "verdict": e.get("verdict"), "objectSha256": e.get("objectSha256")}
                                    for e in r.get("evidence") or [] if e.get("kind") == "case-result"]})
    return out


def main():
    spec = json.loads(pathlib.Path(sys.argv[1]).read_text())
    store = pathlib.Path(spec["objects"])
    objects = {p.name: p.read_bytes() for p in store.iterdir() if p.is_file()}
    results, cache = {}, {}
    for fx in spec["fixtures"]:
        claim, repo = fx["claim"], fx["repo"]
        commit = claim["commit"]
        key = (repo, commit)
        if key not in cache:
            tree = git(repo, "rev-parse", f"{commit}^{{tree}}").decode().strip()
            label = hashlib.sha256(json.dumps({"headTree": tree, "diffSha256": hashlib.sha256(b"").hexdigest(), "untracked": []}, separators=(",", ":")).encode()).hexdigest()
            contract = json.loads(git(repo, "show", f"{commit}:lab/acceptance/obligations.json"))
            load_contract = json.loads(git(repo, "show", f"{commit}:lab/acceptance/load-contract.json"))
            cache[key] = ({"commit": commit, "tree": tree, "label": label, "time": int(git(repo, "show", "-s", "--format=%ct", commit)),
                           "files": tree_files(repo, commit), "objects": objects}, contract, load_contract)
        ctx, contract, load_contract = cache[key]
        pins, w0 = contract["oraclePins"], contract["w0Pin"]
        ref_claim = {k: claim[k] for k in ("obligations", "sourceTreeSha256", "composition", "profile", "positionCasesClosed", "compositionBound") if k in claim}
        ref_claim["receipts"] = [p for r in claim.get("receipts") or [] if isinstance(r, dict) for p in project(r)]
        verdict, reasons = q42a.admit_claim_q42a(claim, ctx, bc, pins=pins, w0=w0, frozen=load_contract["writerTrace"]["generator"].get("frozen"))
        results[fx["id"]] = {"ref035": bc.admit_claim(ref_claim, pins=pins, w0=w0), "refQ42a": verdict, "q42aReasons": reasons}
    json.dump(results, sys.stdout)


if __name__ == "__main__":
    main()

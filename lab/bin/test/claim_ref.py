"""Runs the proposed reference model over the claim fixtures (EXP-E01). Usage: python3 -I -B claim_ref.py <input.json>

input = {"objects": store dir, "fixtures": [{"id", "repo", "claim"}]}; prints {id: {"verdict", "reasons"}}.

The model is lab/experiments/EXP-E01-claim-evaluator/admit_claim_q47.py (pure). This runner does the I/O it needs and nothing
else: the contract and load contract at the claimed commit, every tracked file at the claimed commit and at each commit the
contract's A0 registry names, and the object store. It passes no judgement of its own.
"""
import importlib.util
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
spec = importlib.util.spec_from_file_location("admit_claim_q47", REPO / "lab/experiments/EXP-E01-claim-evaluator/admit_claim_q47.py")
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)


def git(repo, *args, data=None, check=True):
    return subprocess.run(["git", *args], cwd=repo, input=data, capture_output=True, check=check).stdout


def home(repo, commit):
    """{"tree", "time", "files": {path: bytes}} for a commit, or None if it does not resolve."""
    r = subprocess.run(["git", "rev-parse", "--verify", "--quiet", f"{commit}^{{commit}}"], cwd=repo, capture_output=True)
    if r.returncode != 0 or r.stdout.decode().strip() != commit:
        return None
    entries = [line.split("\t", 1) for line in git(repo, "ls-tree", "-r", "-z", commit).decode().split("\0") if line]
    blobs = [(meta.split()[2], p) for meta, p in entries if meta.split()[1] == "blob"]
    out = git(repo, "cat-file", "--batch", data="".join(f"{oid}\n" for oid, _ in blobs).encode())
    files, at = {}, 0
    for _, p in blobs:
        nl = out.index(b"\n", at)
        size = int(out[at:nl].split()[2])
        files[p] = out[nl + 1:nl + 1 + size]
        at = nl + 1 + size + 1
    return {"tree": git(repo, "rev-parse", f"{commit}^{{tree}}").decode().strip(), "time": int(git(repo, "show", "-s", "--format=%ct", commit)), "files": files}


def main():
    spec_ = json.loads(pathlib.Path(sys.argv[1]).read_text())
    objects = {p.name: p.read_bytes() for p in pathlib.Path(spec_["objects"]).iterdir() if p.is_file()}
    homes_cache, results = {}, {}
    for fx in spec_["fixtures"]:
        claim, repo = fx["claim"], fx["repo"]
        get = lambda c: homes_cache.setdefault((repo, c), home(repo, c))
        h = get(claim["commit"])
        if h is None:
            results[fx["id"]] = {"verdict": "DIAGNOSTIC", "reasons": ["claim commit unknown"]}
            continue
        if "parsed" not in h:
            h["parsed"] = (json.loads(h["files"]["lab/acceptance/obligations.json"]), json.loads(h["files"]["lab/acceptance/load-contract.json"]))
        contract, load_contract = h["parsed"]
        homes = {claim["commit"]: h}
        pin = contract.get("a0Registry")
        if isinstance(pin, dict) and pin.get("path") in h["files"]:
            try:
                for entry in json.loads(h["files"][pin["path"]]).get("controls", {}).values():
                    c = entry.get("commit") if isinstance(entry, dict) else None
                    if isinstance(c, str) and get(c) is not None:
                        homes[c] = get(c)
            except ValueError:
                pass
        verdict, reasons = model.admit_claim_q47(claim, contract, load_contract, {"objects": objects, "homes": homes})
        results[fx["id"]] = {"verdict": verdict, "reasons": reasons}
    json.dump(results, sys.stdout)


if __name__ == "__main__":
    main()

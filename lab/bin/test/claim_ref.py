"""The contract's reference model over the claim fixtures (EXP-E01). Usage: python3 -I -B claim_ref.py <input.json>

input = {"objects": store dir, "fixtures": [{"id", "repo", "claim"}]}. Prints
  {"documents": {id: {"verdict"}},           lab/acceptance/build_contract.py admit_claim (contract 0.3.7) on each document fixture
   "contractFixtures": [{...}]}              every admit_claim call the contract's own self-check (ruling_checks) makes, with its
                                             exact inputs and verdict, so lab/bin/claim.mjs admitCore can be checked against the
                                             contract's fixtures without retyping them

The runner passes no judgement of its own. For a document fixture it supplies what the reference takes from the evaluator: the
object store (runs/objects), dependencyClosureChangedAt (the claimed commit's commit time: nothing at the commit changed after it
was committed), and the pins, W0 pin and A0 registry of the contract at the claimed commit.
"""
import base64
import importlib.util
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
spec = importlib.util.spec_from_file_location("build_contract", REPO / "lab/acceptance/build_contract.py")
bc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bc)
ADMIT = bc.admit_claim


def git(repo, *args):
    r = subprocess.run(["git", *args], cwd=repo, capture_output=True)
    return r.stdout if r.returncode == 0 else None


def contract_fixtures():
    """Run the contract's self-check with admit_claim wrapped, recording each call. The store grows during the self-check, so
    each call records how many of the store's (insertion-ordered) objects existed when it was made."""
    calls, stores = [], {}

    def recorder(claim, env=None, pins=None, w0=None, a0=None):
        verdict = ADMIT(claim, env=env, pins=pins, w0=w0, a0=a0)
        frame = sys._getframe(1)
        while frame.f_code.co_name != "ruling_checks" and frame.f_back is not None:  # label by the self-check line, not the _adm helper
            frame = frame.f_back
        store = (env or {}).get("store", {})
        stores[id(store)] = store
        line = pathlib.Path(bc.__file__).read_text().splitlines()[frame.f_lineno - 1].strip()
        calls.append({"line": frame.f_lineno, "label": frame.f_locals["cx"] if "cx" in line and "cx" in frame.f_locals else line[:160], "claim": json.loads(json.dumps(claim)),
                      "storeId": id(store), "storeLen": len(store), "dependencyClosureChangedAt": (env or {}).get("dependencyClosureChangedAt"),
                      "pins": json.loads(json.dumps(bc.ORACLE_PINS if pins is None else pins)), "w0": json.loads(json.dumps(bc.W0_PIN if w0 is None else w0)),
                      "a0": json.loads(json.dumps(bc.A0_REGISTRY["entries"] if a0 is None else a0)), "verdict": verdict})
        return verdict
    bc.admit_claim = recorder
    try:
        errors = [e for e in bc.ruling_checks() if any(k in e for k in ("Q38b", "Q42a", "Q47", "Q45a", "Q45b", "Q48a", "Q31i"))]
    finally:
        bc.admit_claim = ADMIT
    out = []
    for c in calls:
        items = list(stores[c.pop("storeId")].items())[:c.pop("storeLen")]
        out.append(dict(c, store=[[h, base64.b64encode(b).decode()] for h, b in items]))
    return out, errors


def main():
    spec_ = json.loads(pathlib.Path(sys.argv[1]).read_text())
    objects = {p.name: p.read_bytes() for p in pathlib.Path(spec_["objects"]).iterdir() if p.is_file()}
    cache, documents = {}, {}
    for fx in spec_["fixtures"]:
        claim, repo = fx["claim"], fx["repo"]
        commit = claim.get("commit")
        key = (repo, commit)
        if key not in cache:
            resolved = git(repo, "rev-parse", "--verify", "--quiet", f"{commit}^{{commit}}") if isinstance(commit, str) else None
            if resolved is None or resolved.decode().strip() != commit:
                cache[key] = None
            else:
                cache[key] = (json.loads(git(repo, "show", f"{commit}:lab/acceptance/obligations.json")), int(git(repo, "show", "-s", "--format=%ct", commit)))
        if cache[key] is None:
            documents[fx["id"]] = {"verdict": "DIAGNOSTIC"}
            continue
        contract, at = cache[key]
        verdict = ADMIT(claim, env={"store": objects, "dependencyClosureChangedAt": at}, pins=contract["oraclePins"], w0=contract["w0Pin"], a0=contract["a0Registry"]["entries"])
        documents[fx["id"]] = {"verdict": verdict}
    fixtures, errors = contract_fixtures()
    json.dump({"documents": documents, "contractFixtures": fixtures, "selfCheckErrors": errors}, sys.stdout)


if __name__ == "__main__":
    main()
